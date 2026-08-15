import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { createServerClient } from "@supabase/ssr";

import { withLocalInstalledChrome, type LocalChromePage } from "./local-installed-chrome.ts";
import { withRealLocalGradesStack, type RealLocalGradesStack } from "./real-local-grades-1-9-stack.ts";

type Json = Record<string, unknown>;
type Role = "STUDENT" | "PARENT" | "TEACHER";
type CookieJar = Map<string, string>;
type Actor = {
  role: Role;
  grade?: number;
  email: string;
  password: string;
  userId: string;
  cookies: CookieJar;
  client: ReturnType<typeof serverClient>;
};
type GradeEvidence = { grade: number; attemptId: string; unitId: string; historyCount: number };

const grades = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function fail(code: string): never { throw new Error(code); }
function check(value: unknown, code: string): asserts value { if (!value) fail(code); }
function record(value: unknown, code = "BROWSER_E2E_EXPECTED_OBJECT"): Json {
  check(value !== null && typeof value === "object" && !Array.isArray(value), code);
  return value as Json;
}
function sql(value: string) { return `'${value.replaceAll("'", "''")}'`; }

function serverClient(stack: RealLocalGradesStack, cookies: CookieJar) {
  return createServerClient(stack.apiUrl, stack.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: (items) => {
        for (const item of items) {
          if (item.value) cookies.set(item.name, item.value);
          else cookies.delete(item.name);
        }
      },
    },
  });
}

function cookieHeader(actor: Pick<Actor, "cookies">) {
  return [...actor.cookies].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function appRequest(stack: RealLocalGradesStack, actor: Pick<Actor, "cookies">, path: string, body?: unknown) {
  const response = await fetch(`${stack.appOrigin}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Cookie: cookieHeader(actor),
      Origin: stack.appOrigin,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  const text = await response.text();
  let payload: unknown = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }
  return { status: response.status, text, payload };
}

async function createActor(stack: RealLocalGradesStack, role: Role, label: string, grade?: number) {
  const cookies: CookieJar = new Map();
  const client = serverClient(stack, cookies);
  const email = `browser-${label}-${randomUUID()}@plave.test.invalid`;
  const password = stack.syntheticPassword;
  const registration = await client.auth.signUp({
    email,
    password,
    options: { data: { role, ...(grade ? { grade: String(grade) } : {}) } },
  });
  check(!registration.error && registration.data.user && registration.data.session, `BROWSER_E2E_${role}_REGISTER`);
  const actor: Actor = { role, grade, email, password, userId: registration.data.user.id, cookies, client };
  if (role !== "TEACHER") {
    const onboarding = await appRequest(stack, actor, "/api/onboarding", { fullName: role === "STUDENT" ? `Học sinh lớp ${String(grade)}` : `Phụ huynh synthetic ${label}`, birthDate: "" });
    check(onboarding.status === 200 && record(onboarding.payload).ok === true, `BROWSER_E2E_${role}_ONBOARD`);
  }
  return actor;
}

async function seedRelationships(stack: RealLocalGradesStack, student: Actor, parent: Actor, teacher: Actor) {
  const code = stack.query(`select student_code from public.student_profiles where user_id=${sql(student.userId)}::uuid;`);
  const connection = await appRequest(stack, parent, "/api/connections/request", { studentCode: code });
  check(connection.status === 200, "BROWSER_E2E_PARENT_CONNECTION_REQUEST");
  const connectionId = stack.query(`select id from public.parent_student_connections where parent_user_id=${sql(parent.userId)}::uuid and student_user_id=${sql(student.userId)}::uuid;`);
  const approved = await appRequest(stack, student, "/api/connections/action", { connectionId, action: "APPROVE" });
  check(approved.status === 200, "BROWSER_E2E_PARENT_CONNECTION_APPROVE");

  const invitation = stack.query("select private.issue_teacher_invitation(now()+interval '2 hours');");
  const activation = await appRequest(stack, teacher, "/api/teacher/activate", { fullName: "Giáo viên synthetic", invitationCode: invitation });
  check(activation.status === 200, "BROWSER_E2E_TEACHER_ACTIVATE");
  const classroomResponse = await appRequest(stack, teacher, "/api/classrooms/create", { name: "Lớp synthetic 2", grade: 2, requestId: randomUUID() });
  const classroom = record(record(classroomResponse.payload).data);
  const joined = await appRequest(stack, student, "/api/classrooms/request", { classCode: classroom.class_code });
  check(joined.status === 200, "BROWSER_E2E_CLASSROOM_JOIN");
  const membershipId = stack.query(`select id from public.classroom_memberships where classroom_id=${sql(String(classroom.classroom_id))}::uuid and student_id=${sql(student.userId)}::uuid;`);
  const membership = await appRequest(stack, teacher, "/api/classrooms/action", { membershipId, action: "TEACHER_APPROVE" });
  check(membership.status === 200, "BROWSER_E2E_CLASSROOM_APPROVE");
  return { connectionId, membershipId };
}

async function waitFor<Value>(page: LocalChromePage, expression: string, code: string, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await page.evaluate<Value>(expression);
    if (value) return value;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  const diagnostic = await page.evaluate<{ path: string; title: string; heading: string; eyebrow: string; cards: number; body: string }>(
    "({path:location.pathname,title:document.title,heading:document.querySelector('h1')?.textContent?.trim()??'',eyebrow:document.querySelector('.eyebrow')?.textContent?.trim()??'',cards:document.querySelectorAll('.real-question-card').length,body:(document.body?.innerText??'').trim().slice(0,160)})",
  );
  fail(`${code}:${JSON.stringify(diagnostic)}`);
}

function nativeFill(selector: string, value: string) {
  return `(() => {
    const element=document.querySelector(${JSON.stringify(selector)});
    if (!(element instanceof HTMLInputElement)) return false;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
    setter?.call(element,${JSON.stringify(value)});
    element.dispatchEvent(new Event('input',{bubbles:true}));
    element.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  })()`;
}

function clickText(text: string) {
  return `(() => {
    const target=[...document.querySelectorAll('button,a')].find((element)=>element.textContent?.trim().includes(${JSON.stringify(text)}));
    if (!(target instanceof HTMLElement)) return false;
    target.click(); return true;
  })()`;
}

async function login(page: LocalChromePage, stack: RealLocalGradesStack, actor: Actor) {
  const destinationExpression = actor.role === "TEACHER"
    ? "location.pathname==='/teacher' || location.pathname==='/teacher/onboarding'"
    : "location.pathname==='/dashboard'";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.navigate(`${stack.appOrigin}/login`);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
    check(await page.evaluate<boolean>("(() => { const input=document.querySelector('#login-email');if(!(input instanceof HTMLInputElement))return false;input.focus();input.select();return true;})()"), "BROWSER_E2E_LOGIN_EMAIL_CONTROL");
    await page.cdp.send("Input.insertText", { text: actor.email });
    check(await page.evaluate<boolean>("(() => { const input=document.querySelector('#login-password');if(!(input instanceof HTMLInputElement))return false;input.focus();input.select();return true;})()"), "BROWSER_E2E_LOGIN_PASSWORD_CONTROL");
    await page.cdp.send("Input.insertText", { text: actor.password });
    check(await page.evaluate<boolean>(`document.querySelector('#login-email')?.value===${JSON.stringify(actor.email)} && document.querySelector('#login-password')?.value===${JSON.stringify(actor.password)}`), "BROWSER_E2E_LOGIN_VALUES");
    check(await page.evaluate<boolean>("(() => { const form=document.querySelector('form');if(!(form instanceof HTMLFormElement))return false;form.requestSubmit();return true;})()"), "BROWSER_E2E_LOGIN_SUBMIT_CONTROL");
    const outcome = await waitFor<"DESTINATION" | "TRANSIENT_AUTH">(
      page,
      `(${destinationExpression})?'DESTINATION':document.body.innerText.includes('Tạm thời chưa thể xác minh đăng nhập')?'TRANSIENT_AUTH':''`,
      `BROWSER_E2E_${actor.role}_LOGIN_DESTINATION`,
      30_000,
    );
    if (outcome === "DESTINATION") return;
    const graceDeadline = Date.now() + 30_000;
    while (Date.now() < graceDeadline) {
      if (await page.evaluate<boolean>(destinationExpression)) return;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
    }
    if (attempt === 0) {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 750));
    }
  }
  fail(`BROWSER_E2E_${actor.role}_LOGIN_TRANSIENT_RETRY_EXHAUSTED`);
}

async function logout(page: LocalChromePage) {
  await page.evaluate<boolean>("(() => { const button=document.querySelector('#profile-menu-trigger');if(!(button instanceof HTMLElement))return false;button.click();return true;})()");
  check(await page.evaluate<boolean>("(() => { const button=document.querySelector('button[aria-label=\"Đăng xuất khỏi PLAVE\"]'); if(!(button instanceof HTMLElement))return false;button.click();return true;})()"), "BROWSER_E2E_LOGOUT_CONTROL");
  await waitFor(page, "location.pathname==='/' || location.pathname==='/login'", "BROWSER_E2E_LOGOUT_DESTINATION", 30_000);
}

function currentQuestion(stack: RealLocalGradesStack, attemptId: string, grade: number) {
  if (grade === 1) {
    return stack.query(`select question_order[answered_count+1] from public.practice_attempts where id=${sql(attemptId)}::uuid;`);
  }
  return stack.query(`select question_sequence[revision+1] from public.curriculum_attempts where id=${sql(attemptId)}::uuid;`);
}

function releasedAnswer(stack: RealLocalGradesStack, attemptId: string, questionId: string) {
  return stack.query(`select solution.correct_answer from public.curriculum_attempts attempt join private.curriculum_release_solutions solution on solution.release_id=attempt.release_id where attempt.id=${sql(attemptId)}::uuid and solution.question_id=${sql(questionId)};`);
}

function gradeOneAnswer(stack: RealLocalGradesStack, questionId: string) {
  return stack.query(`select correct_answer from public.question_solutions where question_id=${sql(questionId)};`);
}

function attemptHistoryCount(stack: RealLocalGradesStack, attemptId: string, studentId: string, grade: number) {
  const table = grade === 1 ? "public.practice_attempts" : "public.curriculum_attempts";
  return Number(stack.query(`select count(*) from ${table} where id=${sql(attemptId)}::uuid and student_id=${sql(studentId)}::uuid;`));
}

function attemptUnitId(stack: RealLocalGradesStack, attemptId: string, grade: number) {
  if (grade === 1) {
    return stack.query(`select unit_slug from public.practice_attempts where id=${sql(attemptId)}::uuid;`);
  }
  return stack.query(`select unit_id from public.curriculum_attempts where id=${sql(attemptId)}::uuid;`);
}

function curriculumAttemptStatus(
  stack: RealLocalGradesStack,
  attemptId: string,
) {
  return stack.query(
    `select status from public.curriculum_attempts where id=${sql(attemptId)}::uuid;`,
  );
}

function curriculumXpSnapshot(
  stack: RealLocalGradesStack,
  attemptId: string,
  studentId: string,
) {
  return stack.query(`
    select concat_ws('|',
      attempt.xp_earned,
      (select coalesce(sum(ledger.xp_amount),0)
       from private.student_xp_ledger as ledger
       where ledger.student_id=${sql(studentId)}::uuid),
      (select count(*)
       from private.student_xp_ledger as ledger
       where ledger.attempt_id=attempt.id))
    from public.curriculum_attempts as attempt
    where attempt.id=${sql(attemptId)}::uuid;
  `);
}

async function visibleTotalXp(page: LocalChromePage) {
  return page.evaluate<number>(`(() => {
    const element=document.querySelector('strong[aria-label$="điểm kinh nghiệm"]');
    if (!(element instanceof HTMLElement)) return -1;
    const value=Number.parseInt(element.textContent??'',10);
    return Number.isFinite(value)?value:-1;
  })()`);
}

async function answerVisibleQuestion(page: LocalChromePage, answer: string, wrong: boolean) {
  await waitFor(
    page,
    `[...document.querySelectorAll('button')].some((button)=>button.textContent?.includes('Kiểm tra câu trả lời') && Object.keys(button).some((key)=>key.startsWith('__reactProps$') && typeof button[key]?.onClick==='function'))`,
    "BROWSER_E2E_ANSWER_CONTROL_HYDRATED",
    30_000,
  );
  const radioValues = await page.evaluate<string[]>("[...document.querySelectorAll('input[type=radio]')].map((input)=>input instanceof HTMLInputElement?input.value:'').filter(Boolean)");
  if (radioValues.length) {
    check(
      await page.evaluate<boolean>(`(() => {
        const inputs=[...document.querySelectorAll('input[type=radio]')].filter((item)=>item instanceof HTMLInputElement && !item.disabled);
        const input=inputs.find((item)=>${wrong ? `item.value.toLocaleLowerCase()!==${JSON.stringify(answer.trim().toLocaleLowerCase())}` : `item.value===${JSON.stringify(answer)}`});
        if(!(input instanceof HTMLInputElement))return false;
        input.click();
        return input.checked;
      })()`),
      "BROWSER_E2E_RADIO_ANSWER",
    );
  } else {
    const selector = await page.evaluate<string>("document.querySelector('#curriculum-answer')?'#curriculum-answer':'#number-answer'");
    const value = wrong ? (selector === "#number-answer" ? "999999" : "__wrong__") : answer;
    check(await page.evaluate<boolean>(nativeFill(selector, value)), "BROWSER_E2E_TEXT_ANSWER");
  }
  check(await page.evaluate<boolean>(clickText("Kiểm tra câu trả lời")), "BROWSER_E2E_CHECK_ANSWER_BUTTON");
  const feedbackExpression = wrong
    ? "document.body.innerText.includes('Chưa chính xác')"
    : "document.body.innerText.includes('Chính xác')";
  const outcome = await waitFor<"FEEDBACK" | "SAFE_RETRY">(
    page,
    `(${feedbackExpression})?'FEEDBACK':document.body.innerText.includes('Yêu cầu mất quá nhiều thời gian')?'SAFE_RETRY':''`,
    wrong ? "BROWSER_E2E_INCORRECT_FEEDBACK" : "BROWSER_E2E_CORRECT_FEEDBACK",
  );
  if (outcome === "SAFE_RETRY") {
    check(await page.evaluate<boolean>(clickText("Kiểm tra câu trả lời")), "BROWSER_E2E_SAFE_RETRY_BUTTON");
    await waitFor(page, feedbackExpression, wrong ? "BROWSER_E2E_INCORRECT_FEEDBACK_AFTER_RETRY" : "BROWSER_E2E_CORRECT_FEEDBACK_AFTER_RETRY");
  }
}

async function saveScreenshot(page: LocalChromePage, path: string) {
  const png = await page.screenshot();
  check(png.subarray(0, 8).toString("hex") === "89504e470d0a1a0a", "BROWSER_E2E_SCREENSHOT_PNG");
  writeFileSync(path, png);
}

async function gradeJourney(
  page: LocalChromePage,
  stack: RealLocalGradesStack,
  actor: Actor,
  screenshotDirectory: string,
) {
  const grade = actor.grade!;
  await login(page, stack, actor);
  await waitFor(
    page,
    `document.body.innerText.toLocaleLowerCase('vi').includes('lớp ${String(grade)}')`,
    `BROWSER_E2E_G${String(grade)}_DASHBOARD_GRADE`,
  );
  if (grade === 2) {
    check(await visibleTotalXp(page) === 0, "BROWSER_E2E_G2_XP_BEFORE_ZERO");
  }
  const recommendationHref = await page.evaluate<string>(`(() => {
    const section=document.querySelector('[aria-labelledby="learning-path-title"]');
    const action=section?.querySelector('a');
    return action instanceof HTMLAnchorElement ? action.getAttribute('href')??'' : '';
  })()`);
  check(recommendationHref.startsWith("/learn/grade-"), `BROWSER_E2E_G${String(grade)}_RECOMMENDATION_CANONICAL_PATH`);
  await page.navigate(`${stack.appOrigin}/lessons`);
  await waitFor(page, `document.body.innerText.toLocaleLowerCase('vi').includes('lớp ${String(grade)}')`, `BROWSER_E2E_G${String(grade)}_CATALOG`);
  if (grade === 1) {
    await saveScreenshot(
      page,
      resolve(screenshotDirectory, "grade-1-catalog.png"),
    );
  }
  check(
    await page.evaluate<boolean>(
      `[...document.querySelectorAll('.unit-card a')].some((link)=>link.getAttribute('href')===${JSON.stringify(recommendationHref)})`,
    ),
    `BROWSER_E2E_G${String(grade)}_RECOMMENDATION_LESSONS_PATH_AGREES`,
  );
  await page.navigate(`${stack.appOrigin}${recommendationHref}`);
  await waitFor(
    page,
    "location.pathname.startsWith('/learn/grade-') && !document.body.innerText.includes('Chưa thể mở nội dung học lúc này.')",
    `BROWSER_E2E_G${String(grade)}_RECOMMENDATION_OPENS`,
  );
  const catalogOverflow = await page.evaluate<boolean>("document.documentElement.scrollWidth<=document.documentElement.clientWidth+1");
  check(catalogOverflow, `BROWSER_E2E_G${String(grade)}_NO_HORIZONTAL_OVERFLOW`);
  if (grade === 1) await saveScreenshot(page, resolve(screenshotDirectory, "grade-1-lesson.png"));
  await waitFor(
    page,
    `[...document.querySelectorAll('button')].some((button)=>/Bắt đầu luyện tập|Tiếp tục luyện tập/u.test(button.textContent??'') && Object.keys(button).some((key)=>key.startsWith('__reactProps$') && typeof button[key]?.onClick==='function'))`,
    `BROWSER_E2E_G${String(grade)}_START_CONTROL_HYDRATED`,
    30_000,
  );
  check(await page.evaluate<boolean>(clickText("Bắt đầu luyện tập")) || await page.evaluate<boolean>(clickText("Tiếp tục luyện tập")), `BROWSER_E2E_G${String(grade)}_START_UI`);
  await waitFor(page, grade === 1 ? "location.pathname.startsWith('/practice/')" : "location.pathname.startsWith('/curriculum-practice/')", `BROWSER_E2E_G${String(grade)}_PRACTICE_ROUTE`, 30_000);
  const practicePath = await page.evaluate<string>("location.pathname");
  const attemptId = practicePath.split("/").at(-1)!;
  const preSubmitHtml = await page.evaluate<string>("document.documentElement.innerHTML");
  check(!/(?:correctAnswer|correct_answer|solutionSteps|solution_steps|Đáp án đúng)/iu.test(preSubmitHtml), `BROWSER_E2E_G${String(grade)}_NO_PRE_SUBMIT_LEAK`);
  const storage = await page.evaluate<string>("JSON.stringify({local:{...localStorage},session:{...sessionStorage}})");
  check(!/(?:correctAnswer|correct_answer|solutionSteps|solution_steps)/iu.test(storage), `BROWSER_E2E_G${String(grade)}_NO_STORAGE_LEAK`);
  await page.reload();
  await waitFor(page, "document.querySelector('.real-question-card')!==null", `BROWSER_E2E_G${String(grade)}_REFRESH_RESUME`);
  await page.navigate(`${stack.appOrigin}/dashboard`);
  await waitFor(page, "document.body.innerText.includes('Bài nên học tiếp')", `BROWSER_E2E_G${String(grade)}_IN_PROGRESS_RECOMMENDATION`);
  check(
    await page.evaluate<boolean>(`(() => {
      const section=document.querySelector('[aria-labelledby="learning-path-title"]');
      const action=[...section?.querySelectorAll('a,button')??[]].find((element)=>element.textContent?.includes('Tiếp tục học'));
      if (!(action instanceof HTMLElement)) return false;
      action.click();
      return true;
    })()`),
    `BROWSER_E2E_G${String(grade)}_IN_PROGRESS_ACTION`,
  );
  await waitFor(
    page,
    grade === 1
      ? `location.pathname===${JSON.stringify(practicePath)}`
      : `location.pathname===${JSON.stringify(practicePath)}`,
    `BROWSER_E2E_G${String(grade)}_IN_PROGRESS_RESUME_ROUTE`,
    30_000,
  );
  await waitFor(page, "document.querySelector('.real-question-card')!==null", `BROWSER_E2E_G${String(grade)}_IN_PROGRESS_RESUMED`);
  let questionId = currentQuestion(stack, attemptId, grade);
  let correctAnswer = grade === 1 ? gradeOneAnswer(stack, questionId) : releasedAnswer(stack, attemptId, questionId);
  await answerVisibleQuestion(page, correctAnswer, true);
  if (grade === 2) {
    await page.evaluate("document.querySelector('.feedback')?.scrollIntoView({block:'center'})");
    await saveScreenshot(page, resolve(screenshotDirectory, "grade-2-adaptive-feedback.png"));
  }
  check(await page.evaluate<boolean>(clickText("Câu tiếp theo")), `BROWSER_E2E_G${String(grade)}_NEXT_ACTION`);
  await waitFor(page, "!document.body.innerText.includes('Đáp án đúng:')", `BROWSER_E2E_G${String(grade)}_NEXT_QUESTION`);
  questionId = currentQuestion(stack, attemptId, grade);
  correctAnswer = grade === 1 ? gradeOneAnswer(stack, questionId) : releasedAnswer(stack, attemptId, questionId);
  await answerVisibleQuestion(page, correctAnswer, false);
  if (grade === 9) await saveScreenshot(page, resolve(screenshotDirectory, "grade-9-correct-feedback.png"));
  check(await page.evaluate<boolean>("[...document.querySelectorAll('button,a')].some((element)=>/Câu tiếp theo|Xem tiến trình/u.test(element.textContent??''))"), `BROWSER_E2E_G${String(grade)}_VALID_NEXT_ACTION`);
  if (grade === 2) {
    let guard = 0;
    while (curriculumAttemptStatus(stack, attemptId) !== "COMPLETED") {
      check(guard < 20, "BROWSER_E2E_G2_COMPLETION_LOOP_BOUNDED");
      guard += 1;
      check(await page.evaluate<boolean>(clickText("Câu tiếp theo")), "BROWSER_E2E_G2_NEXT_TO_COMPLETE");
      await waitFor(page, "document.querySelector('.real-question-card')!==null && !document.body.innerText.includes('Đáp án đúng:')", "BROWSER_E2E_G2_NEXT_QUESTION_TO_COMPLETE");
      questionId = currentQuestion(stack, attemptId, grade);
      correctAnswer = releasedAnswer(stack, attemptId, questionId);
      await answerVisibleQuestion(page, correctAnswer, false);
    }
    const xpSnapshot = curriculumXpSnapshot(stack, attemptId, actor.userId);
    const [attemptXpText, aggregateXpText, eventCountText] = xpSnapshot.split("|");
    const attemptXp = Number(attemptXpText);
    const aggregateXp = Number(aggregateXpText);
    check(attemptXp > 0 && aggregateXp === attemptXp, "BROWSER_E2E_G2_XP_LEDGER_AGGREGATE");
    check(Number(eventCountText) > 0, "BROWSER_E2E_G2_XP_LEDGER_EVENTS");
    await page.reload();
    await waitFor(
      page,
      "document.querySelector('.curriculum-complete-card')!==null",
      "BROWSER_E2E_G2_COMPLETION_RESULT_RELOAD",
    );
    await waitFor(page, `document.body.innerText.includes(${JSON.stringify(`${String(attemptXp)} XP`)})`, "BROWSER_E2E_G2_RESULT_XP");
    check(await page.evaluate<boolean>(clickText("Xem tiến trình")), "BROWSER_E2E_G2_RESULT_TO_PROGRESS");
    await waitFor(page, "location.pathname==='/learning-progress'", "BROWSER_E2E_G2_PROGRESS_AFTER_COMPLETION");
    await waitFor(
      page,
      `document.querySelector(${JSON.stringify(`strong[aria-label="${String(aggregateXp)} điểm kinh nghiệm"]`)})!==null`,
      "BROWSER_E2E_G2_PROGRESS_XP_RENDERED",
    );
    check(await visibleTotalXp(page) === aggregateXp, "BROWSER_E2E_G2_PROGRESS_XP_AGREES");
    await waitFor(
      page,
      `(() => {
        const section=document.querySelector('[aria-labelledby="completion-title"]');
        return section instanceof HTMLElement &&
          section.dataset.completedCount==='1' &&
          Number(section.dataset.totalCount)>1;
      })()`,
      "BROWSER_E2E_G2_PROGRESS_ONE_COMPLETED_FROM_AUTHORIZED_INVENTORY",
    );
    await page.navigate(`${stack.appOrigin}/results`);
    await waitFor(page, `document.body.innerText.includes(${JSON.stringify(`+${String(attemptXp)} XP`)})`, "BROWSER_E2E_G2_RESULTS_XP_AGREES");
    await page.navigate(`${stack.appOrigin}/learning-history`);
    await waitFor(page, `document.body.innerText.includes(${JSON.stringify(`+${String(attemptXp)} XP`)})`, "BROWSER_E2E_G2_HISTORY_XP_AGREES");
    await page.navigate(`${stack.appOrigin}/dashboard`);
    await waitFor(
      page,
      `document.querySelector(${JSON.stringify(`strong[aria-label="${String(aggregateXp)} điểm kinh nghiệm"]`)})!==null`,
      "BROWSER_E2E_G2_DASHBOARD_XP_VISIBLE",
    );
    check(await visibleTotalXp(page) === aggregateXp, "BROWSER_E2E_G2_DASHBOARD_XP_AGREES");
    await page.reload();
    await waitFor(
      page,
      `document.querySelector(${JSON.stringify(`strong[aria-label="${String(aggregateXp)} điểm kinh nghiệm"]`)})!==null`,
      "BROWSER_E2E_G2_DASHBOARD_XP_RELOAD",
    );
    check(await visibleTotalXp(page) === aggregateXp, "BROWSER_E2E_G2_DASHBOARD_XP_RETAINED");
    check(curriculumXpSnapshot(stack, attemptId, actor.userId) === xpSnapshot, "BROWSER_E2E_G2_RELOAD_NO_DUPLICATE_XP");
  }
  await page.navigate(`${stack.appOrigin}/learning-progress`);
  await waitFor(page, "document.body.innerText.includes('Tiến')", `BROWSER_E2E_G${String(grade)}_PROGRESS_VIEW`);
  await page.navigate(`${stack.appOrigin}/learning-history`);
  await waitFor(page, `document.documentElement.innerHTML.includes(${JSON.stringify(attemptId)}) || document.body.innerText.includes('2/')`, `BROWSER_E2E_G${String(grade)}_HISTORY_VIEW`);
  if (grade === 2) await saveScreenshot(page, resolve(screenshotDirectory, "student-progress-history.png"));
  const historyCount = attemptHistoryCount(stack, attemptId, actor.userId, grade);
  check(historyCount === 1, `BROWSER_E2E_G${String(grade)}_HISTORY_EXACTLY_ONCE`);
  await logout(page);
  await login(page, stack, actor);
  await page.navigate(`${stack.appOrigin}/learning-history`);
  await waitFor(page, `document.documentElement.innerHTML.includes(${JSON.stringify(attemptId)}) || document.body.innerText.includes('2/')`, `BROWSER_E2E_G${String(grade)}_RELOGIN_PERSISTENCE`);
  await logout(page);
  process.stdout.write(`BROWSER_UI_GRADE_${String(grade)}=PASS\n`);
  return { grade, attemptId, unitId: attemptUnitId(stack, attemptId, grade), historyCount } satisfies GradeEvidence;
}

async function browserFetch(page: LocalChromePage, path: string, body?: unknown) {
  return page.evaluate<{ status: number; text: string }>(`(async()=>{const response=await fetch(${JSON.stringify(path)},{method:${body === undefined ? "'GET'" : "'POST'"},headers:${body === undefined ? "{}" : "{'Content-Type':'application/json'}"},body:${body === undefined ? "undefined" : JSON.stringify(JSON.stringify(body))}});return {status:response.status,text:await response.text()};})()`);
}

async function fixedSafeProof(page: LocalChromePage, stack: RealLocalGradesStack, students: Map<number, Actor>) {
  const rows = stack.query(`
    select skill.grade||E'\\t'||skill.skill_id||E'\\t'||min(question.unit_id)
    from public.curriculum_release_skills skill
    join public.curriculum_release_questions question on question.release_id=skill.release_id and question.skill_id=skill.skill_id
    where skill.support_mode='FIXED_SAFE' group by skill.grade,skill.skill_id order by skill.grade,skill.skill_id;
  `).split("\n").filter(Boolean).map((row) => row.split("\t"));
  check(rows.length === 13, "BROWSER_E2E_FIXED_SAFE_INVENTORY_13");
  const groups = new Map<string, { grade: number; unitId: string; skillIds: string[] }>();
  for (const [gradeText, skillId, unitId] of rows) {
    const key = `${gradeText}\t${unitId}`;
    const group = groups.get(key) ?? { grade: Number(gradeText), unitId, skillIds: [] };
    group.skillIds.push(skillId);
    groups.set(key, group);
  }
  let activeGrade = 0;
  for (const group of groups.values()) {
    const { grade, unitId, skillIds } = group;
    if (grade !== activeGrade) {
      if (activeGrade) await logout(page);
      await login(page, stack, students.get(grade)!);
      activeGrade = grade;
    }
    const started = await browserFetch(page, "/api/curriculum-runtime/start", { unitSlug: unitId, idempotencyKey: randomUUID() });
    check(started.status === 200, `BROWSER_E2E_FIXED_SAFE_START_G${String(grade)}_${unitId}`);
    const payload = record(JSON.parse(started.text));
    const state = record(payload.data);
    const attemptId = String(state.attemptId);
    const targets = new Map(stack.query(`select question.question_id||E'\\t'||question.skill_id from public.curriculum_attempts attempt join unnest(attempt.question_sequence) with ordinality sequence(question_id,position) on true join public.curriculum_release_questions question on question.release_id=attempt.release_id and question.question_id=sequence.question_id where attempt.id=${sql(attemptId)}::uuid and question.skill_id in (${skillIds.map(sql).join(",")}) and question.support_mode='FIXED_SAFE' order by sequence.position;`).split("\n").filter(Boolean).map((row) => row.split("\t") as [string, string]));
    for (const skillId of skillIds) {
      check([...targets.values()].includes(skillId), `BROWSER_E2E_FIXED_SAFE_SELECTED_${skillId}`);
    }
    const observed = new Set<string>();
    let current = currentQuestion(stack, attemptId, grade);
    while (current && observed.size < skillIds.length) {
      const targetSkill = targets.get(current);
      const answer = releasedAnswer(stack, attemptId, current);
      const revision = Number(stack.query(`select revision from public.curriculum_attempts where id=${sql(attemptId)}::uuid;`));
      const response = await browserFetch(page, "/api/curriculum-runtime/answer", { attemptId, questionId: current, answer, expectedRevision: revision, idempotencyKey: randomUUID() });
      check(response.status === 200, `BROWSER_E2E_FIXED_SAFE_ADVANCE_G${String(grade)}`);
      if (targetSkill) {
        check(/feedback/u.test(response.text), `BROWSER_E2E_FIXED_SAFE_FEEDBACK_${targetSkill}`);
        const next = record(record(JSON.parse(response.text)).data);
        check(next.status === "COMPLETED" || next.currentQuestion, `BROWSER_E2E_FIXED_SAFE_CONTINUATION_${targetSkill}`);
        observed.add(targetSkill);
      }
      current = currentQuestion(stack, attemptId, grade);
    }
    for (const skillId of skillIds) {
      check(observed.has(skillId), `BROWSER_E2E_FIXED_SAFE_TARGET_${skillId}`);
      check(stack.query(`select count(*) from public.student_curriculum_skill_progress where student_id=${sql(students.get(grade)!.userId)}::uuid and skill_id=${sql(skillId)};`) === "0", `BROWSER_E2E_FIXED_SAFE_NO_ADAPTIVE_MASTERY_${skillId}`);
      process.stdout.write(`BROWSER_FIXED_SAFE_SKILL=${skillId} PASS\n`);
    }
  }
  if (activeGrade) await logout(page);
}

async function authorizationProof(
  page: LocalChromePage,
  stack: RealLocalGradesStack,
  students: Map<number, Actor>,
  parent: Actor,
  unapprovedParent: Actor,
  teacher: Actor,
  unauthorizedTeacher: Actor,
  relationship: { connectionId: string; membershipId: string },
  gradeTwoEvidence: GradeEvidence,
  screenshotDirectory: string,
) {
  await page.navigate(`${stack.appOrigin}/login`);
  const anonymous = await browserFetch(page, "/api/curriculum-runtime/start", { unitSlug: gradeTwoEvidence.unitId, idempotencyKey: randomUUID() });
  check(anonymous.status === 401, "BROWSER_E2E_ANONYMOUS_DENIED");
  await page.navigate(`${stack.appOrigin}/curriculum-practice/${gradeTwoEvidence.attemptId}`);
  await waitFor(page, "location.pathname==='/login'", "BROWSER_E2E_ANONYMOUS_DIRECT_URL_DENIED");

  await login(page, stack, students.get(3)!);
  await page.navigate(`${stack.appOrigin}/curriculum-practice/${gradeTwoEvidence.attemptId}`);
  await waitFor(page, "document.body.innerText.includes('không') || document.body.innerText.includes('Không') || document.body.innerText.includes('chưa')", "BROWSER_E2E_CROSS_USER_ATTEMPT_DENIED");
  const gradeTwoLesson = stack.query("select unit_id from public.curriculum_release_units where grade=2 and total_questions>0 order by display_order limit 1;");
  await page.navigate(`${stack.appOrigin}/learn/grade-2/${gradeTwoLesson.replace("grade-2-", "")}`);
  await waitFor(page, "!document.body.innerText.includes('Bắt đầu luyện tập')", "BROWSER_E2E_WRONG_GRADE_DIRECT_URL_DENIED");
  await logout(page);

  await login(page, stack, parent);
  await page.navigate(`${stack.appOrigin}/parent/children/${relationship.connectionId}`);
  await waitFor(page, "document.body.innerText.includes('Tiến độ học tập')", "BROWSER_E2E_APPROVED_PARENT_VIEW");
  await saveScreenshot(page, resolve(screenshotDirectory, "parent-authorized-progress.png"));
  const parentStart = await browserFetch(page, "/api/curriculum-runtime/start", { unitSlug: gradeTwoEvidence.unitId, idempotencyKey: randomUUID() });
  check(parentStart.status === 403, "BROWSER_E2E_PARENT_CANNOT_START");
  await logout(page);

  await login(page, stack, unapprovedParent);
  await page.navigate(`${stack.appOrigin}/parent/children/${relationship.connectionId}`);
  await waitFor(page, "!document.body.innerText.includes('Lịch sử luyện tập')", "BROWSER_E2E_UNAPPROVED_PARENT_DENIED");
  await logout(page);

  await login(page, stack, teacher);
  await page.navigate(`${stack.appOrigin}/teacher/students/${relationship.membershipId}/progress`);
  await waitFor(page, "document.body.innerText.includes('Tiến') || document.body.innerText.includes('Học sinh')", "BROWSER_E2E_AUTHORIZED_TEACHER_VIEW");
  const teacherStart = await browserFetch(page, "/api/curriculum-runtime/start", { unitSlug: gradeTwoEvidence.unitId, idempotencyKey: randomUUID() });
  check(teacherStart.status === 403, "BROWSER_E2E_TEACHER_CANNOT_START");
  await logout(page);

  await login(page, stack, unauthorizedTeacher);
  await page.navigate(`${stack.appOrigin}/teacher/students/${relationship.membershipId}/progress`);
  await waitFor(page, "!document.body.innerText.includes('Lịch sử luyện tập')", "BROWSER_E2E_UNAUTHORIZED_TEACHER_DENIED");
  await logout(page);
}

async function responsiveAccessibilityProof(page: LocalChromePage, stack: RealLocalGradesStack, student: Actor, screenshotDirectory: string) {
  await page.cdp.send("Emulation.setDeviceMetricsOverride", { width: 428, height: 926, deviceScaleFactor: 1, mobile: true });
  await login(page, stack, student);
  await page.navigate(`${stack.appOrigin}/learn`);
  await waitFor(page, "document.body.innerText.includes('Toán lớp 2')", "BROWSER_E2E_MOBILE_LEARN");
  check(await page.evaluate<boolean>("document.documentElement.scrollWidth<=document.documentElement.clientWidth+1"), "BROWSER_E2E_MOBILE_NO_OVERFLOW");
  const unnamed = await page.evaluate<Array<{tag:string;id:string;className:string;type:string;href:string}>>(`[...document.querySelectorAll('button,input,a')].filter((element)=>{
    if(element instanceof HTMLInputElement && element.type==='hidden')return false;
    const labelledBy=element.getAttribute('aria-labelledby');
    const label=element.getAttribute('aria-label')||(labelledBy?document.getElementById(labelledBy)?.textContent?.trim():'')||element.textContent?.trim()||element.querySelector('img[alt]')?.getAttribute('alt')?.trim()||(element instanceof HTMLInputElement?document.querySelector('label[for="'+element.id+'"]')?.textContent?.trim()||element.getAttribute('placeholder')||element.getAttribute('title'):'');
    return !label;
  }).map((element)=>({tag:element.tagName,id:element.id,className:typeof element.className==='string'?element.className:'',type:element instanceof HTMLInputElement?element.type:'',href:element instanceof HTMLAnchorElement?element.getAttribute('href')??'':''}))`);
  check(unnamed.length === 0, `BROWSER_E2E_ACCESSIBLE_NAMES:${JSON.stringify(unnamed)}`);
  await saveScreenshot(page, resolve(screenshotDirectory, "mobile-learn-grade-2.png"));
  await page.cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await page.cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  const focus = await page.evaluate<{ tag: string; outline: string }>("({tag:document.activeElement?.tagName??'',outline:getComputedStyle(document.activeElement??document.body).outlineStyle})");
  check(["A", "BUTTON", "INPUT"].includes(focus.tag), "BROWSER_E2E_KEYBOARD_FOCUS_TARGET");
  await logout(page);
  await page.cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.navigate(`${stack.appOrigin}/login`);
  check(await page.evaluate<boolean>("(() => { const form=document.querySelector('form');if(!(form instanceof HTMLFormElement))return false;form.requestSubmit();return true;})()"), "BROWSER_E2E_EMPTY_FORM_SUBMIT");
  await waitFor(page, "document.body.innerText.includes('Vui lòng nhập email')", "BROWSER_E2E_FORM_VALIDATION");
  check(await page.evaluate<boolean>("document.activeElement?.id==='login-email'"), "BROWSER_E2E_FORM_ERROR_FOCUS");
}

async function deactivationProof(page: LocalChromePage, stack: RealLocalGradesStack, student: Actor, evidence: GradeEvidence) {
  await login(page, stack, student);
  const before = stack.query(`select count(*) from public.curriculum_attempts where id=${sql(evidence.attemptId)}::uuid;`);
  stack.deactivate();
  const otherUnit = stack.query(`select unit_id from public.curriculum_release_units where grade=2 and total_questions>0 and unit_id<>${sql(evidence.unitId)} order by display_order limit 1;`);
  const blocked = await browserFetch(page, "/api/curriculum-runtime/start", { unitSlug: otherUnit, idempotencyKey: randomUUID() });
  check(blocked.status === 404 || blocked.status === 403, "BROWSER_E2E_DEACTIVATION_BLOCKS_NEW_START");
  await page.navigate(`${stack.appOrigin}/learning-history`);
  await waitFor(page, `document.documentElement.innerHTML.includes(${JSON.stringify(evidence.attemptId)}) || document.body.innerText.includes('2/')`, "BROWSER_E2E_DEACTIVATION_HISTORY_VISIBLE");
  check(stack.query(`select count(*) from public.curriculum_attempts where id=${sql(evidence.attemptId)}::uuid;`) === before, "BROWSER_E2E_DEACTIVATION_DATABASE_PRESERVED");
  stack.activate();
  const resumed = await browserFetch(page, "/api/curriculum-runtime/start", { unitSlug: evidence.unitId, idempotencyKey: randomUUID() });
  const reactivatedAttemptId =
    resumed.status === 200
      ? String(record(record(JSON.parse(resumed.text)).data).attemptId)
      : "";
  check(
    resumed.status === 200 &&
      reactivatedAttemptId.length > 0 &&
      reactivatedAttemptId !== evidence.attemptId,
    "BROWSER_E2E_REACTIVATION_NEW_ATTEMPT_AFTER_COMPLETION",
  );
  check(
    stack.query(`select count(*) from public.curriculum_attempts where id=${sql(evidence.attemptId)}::uuid;`) === before,
    "BROWSER_E2E_REACTIVATION_PRESERVES_COMPLETED_ATTEMPT",
  );
  await logout(page);
}

await withRealLocalGradesStack(async (stack) => {
  const students = new Map<number, Actor>();
  for (const grade of grades) students.set(grade, await createActor(stack, "STUDENT", `grade-${String(grade)}`, grade));
  const wrongGradeStudent = await createActor(stack, "STUDENT", "wrong-grade", 2);
  const parent = await createActor(stack, "PARENT", "approved");
  const unapprovedParent = await createActor(stack, "PARENT", "unapproved");
  const teacher = await createActor(stack, "TEACHER", "authorized");
  const unauthorizedTeacher = await createActor(stack, "TEACHER", "unauthorized");
  const relationship = await seedRelationships(stack, students.get(2)!, parent, teacher);
  check(wrongGradeStudent.grade === 2, "BROWSER_E2E_WRONG_GRADE_FIXTURE");

  const screenshotDirectory = resolve(stack.root, "docs/e2e/real-local-screenshots");
  mkdirSync(screenshotDirectory, { recursive: true });
  await withLocalInstalledChrome(async (chrome) => {
    const page = await chrome.newPage();
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    const externalRequests: string[] = [];
    page.cdp.on("Runtime.consoleAPICalled", (params) => {
      if (params.type === "error") consoleErrors.push(JSON.stringify(params.args ?? []));
    });
    page.cdp.on("Log.entryAdded", (params) => {
      const entry = params.entry as { level?: unknown; text?: unknown } | undefined;
      if (entry?.level === "error") consoleErrors.push(String(entry.text ?? ""));
    });
    page.cdp.on("Network.loadingFailed", (params) => {
      if (params.canceled !== true) failedRequests.push(String(params.errorText ?? "FAILED"));
    });
    page.cdp.on("Network.requestWillBeSent", (params) => {
      const request = params.request as { url?: unknown } | undefined;
      if (typeof request?.url === "string" && !request.url.startsWith(stack.appOrigin) && !request.url.startsWith("data:") && !request.url.startsWith("about:")) externalRequests.push(request.url);
    });
    try {
      const evidence = new Map<number, GradeEvidence>();
      for (const grade of grades) {
        process.stdout.write(`BROWSER_UI_GRADE_${String(grade)}=START\n`);
        evidence.set(grade, await gradeJourney(page, stack, students.get(grade)!, screenshotDirectory));
      }
      await fixedSafeProof(page, stack, students);
      await authorizationProof(page, stack, students, parent, unapprovedParent, teacher, unauthorizedTeacher, relationship, evidence.get(2)!, screenshotDirectory);
      await responsiveAccessibilityProof(page, stack, students.get(2)!, screenshotDirectory);
      await deactivationProof(page, stack, students.get(2)!, evidence.get(2)!);

      check(consoleErrors.filter((message) => /hydration|uncaught|fatal/iu.test(message)).length === 0, "BROWSER_E2E_CONSOLE_OR_HYDRATION_ERRORS");
      check(failedRequests.length === 0, "BROWSER_E2E_UNEXPLAINED_FAILED_REQUESTS");
      check(externalRequests.length === 0, "BROWSER_E2E_EXTERNAL_NETWORK_ATTEMPT");
      check(stack.query("select string_agg(grade::text,',' order by grade) from public.student_profiles where user_id in (" + [...students.values()].map((student) => `${sql(student.userId)}::uuid`).join(",") + ");") === "1,2,3,4,5,6,7,8,9", "BROWSER_E2E_SCHOOL_GRADE_IMMUTABLE");
      check(stack.query("select count(*) from public.curriculum_release_pilot_entitlements;") === "0", "BROWSER_E2E_NO_ENTITLEMENT_GRANT");
      process.stdout.write(`BROWSER_EXECUTABLE=${chrome.executable}\n`);
      process.stdout.write(`BROWSER_SCREENSHOTS=${screenshotDirectory}\n`);
      process.stdout.write("BROWSER_CONSOLE_HYDRATION_NETWORK=PASS\n");
    } catch (error) {
      const sanitize = (value: string) => value
        .replace(/https?:\/\/\S+/gu, "[LOCAL_URL]")
        .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/giu, "[SYNTHETIC_ID]")
        .slice(0, 240);
      process.stderr.write(`BROWSER_DIAGNOSTIC_CONSOLE=${JSON.stringify(consoleErrors.slice(-3).map(sanitize))}\n`);
      process.stderr.write(`BROWSER_DIAGNOSTIC_FAILED_REQUESTS=${JSON.stringify(failedRequests.slice(-3).map(sanitize))}\n`);
      process.stderr.write(`BROWSER_DIAGNOSTIC_EXTERNAL_COUNT=${String(externalRequests.length)}\n`);
      throw error;
    }
  });
});

process.stdout.write("PLAVE_BROWSER_GRADES_1_9_ACCEPTANCE=PASS\n");
