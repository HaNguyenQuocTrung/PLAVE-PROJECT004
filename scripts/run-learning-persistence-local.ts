import { randomBytes, randomUUID } from "node:crypto";

import { createServerClient } from "@supabase/ssr";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

import {
  type LearningPersistenceScope,
  type LearningPersistenceStack,
  withLearningPersistenceStack,
} from "./learning-persistence-local-harness.ts";
import { classifyLearningPersistenceSchema } from "./learning-persistence-schema-compatibility.ts";
import { assertProject004Workspace } from "./project004-identity.ts";

type JsonRecord = Record<string, unknown>;
type Role = "STUDENT" | "PARENT" | "TEACHER";
type Account = {
  role: Role;
  grade?: number;
  email: string;
  password: string;
  client: SupabaseClient;
  session: Session;
  studentCode?: string;
};
type GradeEvidence = {
  grade: number;
  unitId: string;
  attemptId: string;
  answerCount: number;
};
type LearningContext = {
  students: Map<number, Account>;
  evidence: Map<number, GradeEvidence>;
  parent: Account;
  unrelatedParent: Account;
  connectionIds: Map<number, string>;
};

assertProject004Workspace();

function fail(message: string): never {
  throw new Error(message);
}

function check(value: unknown, message: string): asserts value {
  if (!value) fail(message);
}

function record(value: unknown): JsonRecord {
  check(value !== null && typeof value === "object" && !Array.isArray(value), "Expected an object response.");
  return value as JsonRecord;
}

function records(value: unknown): JsonRecord[] {
  check(Array.isArray(value), "Expected an array response.");
  return value.map(record);
}

function noPreSubmitLeak(value: unknown, label: string) {
  check(
    !/correct_answer|solution_steps|explanation|"hint"/iu.test(JSON.stringify(value)),
    `${label} exposed answer material before submission.`,
  );
}

function noAggregateLeak(value: unknown, label: string) {
  check(
    !/correct_answer|solution_steps|submitted_answer|question_sequence/iu.test(JSON.stringify(value)),
    `${label} exposed private answer detail.`,
  );
}

function answerFor(question: JsonRecord) {
  const options = question.options;
  if (options && typeof options === "object" && !Array.isArray(options)) {
    const firstKey = Object.keys(options)[0];
    if (firstKey) return firstKey;
  }
  if (Array.isArray(options) && options.length > 0) {
    const first = options[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      const option = first as JsonRecord;
      for (const key of ["key", "id", "value", "code"]) {
        if (typeof option[key] === "string") return option[key] as string;
      }
    }
  }
  return "0";
}

function client(stack: LearningPersistenceStack) {
  return createClient(stack.apiUrl, stack.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function rpc(account: Account, name: string, args?: JsonRecord) {
  const result = await account.client.rpc(name, args);
  if (result.error) fail(`${name} failed with a sanitized local contract error.`);
  return result.data;
}

async function register(
  stack: LearningPersistenceStack,
  role: Role,
  label: string,
  grade?: number,
) {
  const accountClient = client(stack);
  const email = `round2i-${label}-${randomBytes(7).toString("hex")}@plave.test.invalid`;
  const password = `R2I!${randomBytes(24).toString("base64url")}`;
  const { data, error } = await accountClient.auth.signUp({
    email,
    password,
    options: { data: role === "STUDENT" ? { role, grade } : { role } },
  });
  check(!error && data.user && data.session, `Synthetic ${role} registration failed.`);
  let studentCode: string | undefined;
  if (role !== "TEACHER") {
    const { error: onboardingError } = await accountClient.rpc("complete_onboarding", {
      p_full_name: `Round 2I ${role}`,
      p_grade: role === "STUDENT" ? grade : null,
      p_birth_date: null,
    });
    check(!onboardingError, `Synthetic ${role} onboarding failed.`);
  }
  if (role === "STUDENT") {
    const { data: profile, error: profileError } = await accountClient
      .from("student_profiles")
      .select("student_code, grade")
      .single();
    check(
      !profileError && profile?.grade === grade && typeof profile.student_code === "string",
      "Synthetic Student canonical profile failed.",
    );
    studentCode = profile.student_code;
  }
  return {
    role,
    grade,
    email,
    password,
    client: accountClient,
    session: data.session,
    studentCode,
  } satisfies Account;
}

async function freshLogin(stack: LearningPersistenceStack, account: Account) {
  const freshClient = client(stack);
  const { data, error } = await freshClient.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });
  check(!error && data.session && data.user, "Fresh synthetic login failed.");
  const { data: profile, error: profileError } = await freshClient
    .from("profiles")
    .select("role, onboarding_completed")
    .single();
  check(
    !profileError && profile?.role === account.role && profile.onboarding_completed === true,
    "Canonical profile changed between sessions.",
  );
  if (account.grade) {
    const { data: student, error: studentError } = await freshClient
      .from("student_profiles")
      .select("grade")
      .single();
    check(!studentError && student?.grade === account.grade, "Student schoolGrade changed.");
  }
  return { ...account, client: freshClient, session: data.session };
}

async function cookieHeader(stack: LearningPersistenceStack, session: Session) {
  let jar: Array<{ name: string; value: string }> = [];
  const serverClient = createServerClient(stack.apiUrl, stack.publishableKey, {
    cookies: {
      getAll: () => jar,
      setAll: (items) => {
        for (const item of items) {
          jar = jar.filter((cookie) => cookie.name !== item.name);
          if (item.value) jar.push({ name: item.name, value: item.value });
        }
      },
    },
  });
  const { error } = await serverClient.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  check(!error && jar.length > 0, "Application cookie session creation failed.");
  return jar.map((item) => `${item.name}=${item.value}`).join("; ");
}

async function appRequest(
  stack: LearningPersistenceStack,
  session: Session,
  path: string,
  options?: { method?: "GET" | "POST"; body?: JsonRecord; expectJson?: boolean },
) {
  check(stack.appOrigin, "Application runtime was not started for an application regression.");
  const response = await fetch(`${stack.appOrigin}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      Cookie: await cookieHeader(stack, session),
      Origin: stack.appOrigin,
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
    redirect: "manual",
  });
  if (options?.expectJson === false) {
    const body = await response.text();
    check(response.status === 200, `Application page ${path} returned ${String(response.status)}.`);
    return body;
  }
  const body = await response.json().catch(() => null);
  check(
    response.status === 200 && record(body).ok === true,
    `Application API ${path} returned ${String(response.status)}.`,
  );
  return record(body);
}

async function appPage(
  stack: LearningPersistenceStack,
  account: Account,
  path: string,
) {
  const body = await appRequest(stack, account.session, path, {
    expectJson: false,
  });
  check(typeof body === "string", `Application page ${path} did not return HTML.`);
  return body;
}

function requirePageMatch(page: string, pattern: RegExp, message: string) {
  check(pattern.test(page), message);
}

function requireProfileMenuClosed(page: string, label: string) {
  requirePageMatch(
    page,
    /aria-controls="profile-menu"[\s\S]{0,240}aria-expanded="false"/u,
    `${label} profile menu was not initially closed.`,
  );
  check(
    !/class="profile-menu"/u.test(page),
    `${label} profile menu content was rendered while closed.`,
  );
}

async function proveGrade1(
  stack: LearningPersistenceStack,
  student: Account,
  verifyApplication: boolean,
) {
  const { data: units, count, error } = await student.client
    .from("learning_units")
    .select("slug", { count: "exact" })
    .eq("grade", 1)
    .eq("published", true)
    .order("display_order");
  check(!error && units && count === 13, "Grade 1 ordinary inventory failed.");
  const unitId = units[0].slug;
  if (verifyApplication) {
    for (const path of [
      "/dashboard",
      "/lessons",
      "/learning-progress",
      "/learning-history",
      "/results",
    ]) {
      await appPage(stack, student, path);
    }
  }
  const started = verifyApplication
    ? record(
        (await appRequest(stack, student.session, "/api/practice/start", {
          method: "POST",
          body: { unitSlug: unitId },
        })).data,
      )
    : record(await rpc(student, "start_or_resume_practice", { p_unit_slug: unitId }));
  noPreSubmitLeak(started, "Grade 1 start");
  const attemptId = started.id ?? started.attempt_id;
  const order = started.questionOrder ?? started.question_order;
  check(typeof attemptId === "string" && Array.isArray(order) && order.length === 24, "Grade 1 start state failed.");
  const repeated = record(await rpc(student, "start_or_resume_practice", { p_unit_slug: unitId }));
  check(repeated.attempt_id === attemptId, "Grade 1 repeat start created another attempt.");
  const { data: questions, error: questionError } = await student.client
    .from("questions")
    .select("code, question_type, options")
    .in("code", order as string[]);
  check(!questionError && questions?.length === 24, "Grade 1 canonical questions failed.");
  const byCode = new Map(questions.map((question) => [question.code, question as JsonRecord]));
  for (const questionId of (order as string[]).slice(0, 2)) {
    const answer = answerFor(byCode.get(questionId) ?? {});
    if (verifyApplication) {
      await appRequest(stack, student.session, "/api/practice/answer", {
        method: "POST",
        body: { attemptId, questionId, answer },
      });
    } else {
      await rpc(student, "submit_practice_answer", {
        p_attempt_id: attemptId,
        p_question_id: questionId,
        p_answer: answer,
      });
    }
  }
  const partialHistory = record(await rpc(student, "get_student_curriculum_history"));
  check(
    records(partialHistory.attempts).some(
      (item) => item.attempt_id === attemptId && item.status === "IN_PROGRESS" && item.answered_count === 2,
    ),
    "Grade 1 partial History failed.",
  );
  if (verifyApplication) {
    const [lessonsPage, historyPage, resultsPage] = await Promise.all([
      appPage(stack, student, "/lessons"),
      appPage(stack, student, "/learning-history"),
      appPage(stack, student, "/results"),
    ]);
    requirePageMatch(lessonsPage, /Tiếp tục/u, "Grade 1 Lessons did not expose resume.");
    for (const page of [historyPage, resultsPage]) {
      requirePageMatch(
        page,
        /data-attempt-status="IN_PROGRESS"/u,
        "Grade 1 partial History projection failed.",
      );
    }
  }
  await student.client.auth.signOut();
  const fresh = await freshLogin(stack, student);
  const resumed = record(await rpc(fresh, "start_or_resume_practice", { p_unit_slug: unitId }));
  check(resumed.attempt_id === attemptId && resumed.answered_count === 2, "Grade 1 fresh-session resume failed.");
  const replayQuestion = (order as string[])[0];
  await rpc(fresh, "submit_practice_answer", {
    p_attempt_id: attemptId,
    p_question_id: replayQuestion,
    p_answer: answerFor(byCode.get(replayQuestion) ?? {}),
  });
  for (const questionId of (order as string[]).slice(2)) {
    const answer = answerFor(byCode.get(questionId) ?? {});
    if (verifyApplication) {
      await appRequest(stack, fresh.session, "/api/practice/answer", {
        method: "POST",
        body: { attemptId, questionId, answer },
      });
    } else {
      await rpc(fresh, "submit_practice_answer", {
        p_attempt_id: attemptId,
        p_question_id: questionId,
        p_answer: answer,
      });
    }
  }
  const history = record(await rpc(fresh, "get_student_curriculum_history"));
  const historyItems = records(history.attempts).filter((item) => item.attempt_id === attemptId);
  check(
    historyItems.length === 1 && historyItems[0].status === "COMPLETED" && historyItems[0].answered_count === 24,
    "Grade 1 completion History failed.",
  );
  const progress = record(await rpc(fresh, "get_student_curriculum_progress"));
  const unit = records(progress.units).find((item) => item.unit_id === unitId);
  check(unit?.status === "COMPLETED" && Number(unit.evidence_count) === 24, "Grade 1 completed Progress failed.");
  const review = record(await rpc(fresh, "get_practice_review", { p_attempt_id: attemptId }));
  check(review.status === "COMPLETED" && records(review.answers).length === 24, "Grade 1 result failed.");
  if (verifyApplication) {
    const [dashboardPage, progressPage, historyPage, resultsPage] =
      await Promise.all([
        appPage(stack, fresh, "/dashboard"),
        appPage(stack, fresh, "/learning-progress"),
        appPage(stack, fresh, "/learning-history"),
        appPage(stack, fresh, "/results"),
      ]);
    for (const page of [dashboardPage, progressPage]) {
      requirePageMatch(
        page,
        /data-completed-count="1"/u,
        "Grade 1 completed projection count disagreed.",
      );
    }
    for (const page of [historyPage, resultsPage]) {
      requirePageMatch(
        page,
        /data-attempt-status="COMPLETED"/u,
        "Grade 1 completed History projection failed.",
      );
    }
  }
  return { grade: 1, unitId, attemptId, answerCount: 24 } satisfies GradeEvidence;
}

async function proveUniversalGrade(
  stack: LearningPersistenceStack,
  student: Account,
  useApplication: boolean,
) {
  check(student.grade && student.grade >= 2, "Universal grade was invalid.");
  const initialProgress = record(await rpc(student, "get_student_curriculum_progress"));
  const units = records(initialProgress.units);
  check(units.length > 0 && initialProgress.grade === student.grade, "Universal ordinary inventory failed.");
  const unitId = units[0].unit_id;
  check(typeof unitId === "string", "Universal unit identifier failed.");
  if (useApplication) {
    for (const path of [
      "/dashboard",
      "/lessons",
      "/learning-progress",
      "/learning-history",
      "/results",
    ]) {
      const page = await appPage(stack, student, path);
      requireProfileMenuClosed(page, `Grade ${String(student.grade)} Student`);
    }
  }
  let state: JsonRecord;
  if (useApplication) {
    const response = await appRequest(stack, student.session, "/api/curriculum-runtime/start", {
      method: "POST",
      body: { unitSlug: unitId, idempotencyKey: randomUUID() },
    });
    state = record(response.data);
  } else {
    state = record(await rpc(student, "start_or_resume_curriculum_unit", {
      p_unit_slug: unitId,
      p_idempotency_key: randomUUID(),
    }));
  }
  noPreSubmitLeak(state, `Grade ${String(student.grade)} start`);
  const attemptId = state.attemptId ?? state.attempt_id;
  check(typeof attemptId === "string", "Universal attempt identifier failed.");
  const repeated = record(await rpc(student, "start_or_resume_curriculum_unit", {
    p_unit_slug: unitId,
    p_idempotency_key: randomUUID(),
  }));
  check(repeated.attempt_id === attemptId, "Universal repeat start created another active attempt.");

  for (let index = 0; index < 2; index += 1) {
    const question = record(state.currentQuestion ?? state.current_question);
    if (useApplication) {
      const response = await appRequest(stack, student.session, "/api/curriculum-runtime/answer", {
        method: "POST",
        body: {
          attemptId,
          questionId: question.questionId ?? question.question_id,
          answer: answerFor(question),
          expectedRevision: state.revision,
          idempotencyKey: randomUUID(),
        },
      });
      state = record(response.data);
    } else {
      state = record(await rpc(student, "submit_curriculum_answer", {
        p_attempt_id: attemptId,
        p_question_id: question.question_id,
        p_answer: answerFor(question),
        p_expected_revision: state.revision,
        p_idempotency_key: randomUUID(),
      }));
    }
  }
  const partialState = record(await rpc(student, "get_curriculum_attempt_state", { p_attempt_id: attemptId }));
  check(
    partialState.status === "IN_PROGRESS" && partialState.revision === 2 && partialState.answered_count === 2,
    "Universal partial persistence failed.",
  );
  const partialHistory = record(await rpc(student, "get_student_curriculum_history"));
  check(
    records(partialHistory.attempts).some(
      (item) => item.attempt_id === attemptId && item.status === "IN_PROGRESS" && item.answered_count === 2,
    ),
    "Universal partial History failed.",
  );
  await student.client.auth.signOut();
  const fresh = await freshLogin(stack, student);
  const resumed = record(await rpc(fresh, "get_curriculum_attempt_state", { p_attempt_id: attemptId }));
  const restarted = record(await rpc(fresh, "start_or_resume_curriculum_unit", {
    p_unit_slug: unitId,
    p_idempotency_key: randomUUID(),
  }));
  check(
    resumed.revision === 2 && resumed.answered_count === 2 && restarted.attempt_id === attemptId,
    "Universal fresh-session resume failed.",
  );
  noPreSubmitLeak(resumed, `Grade ${String(student.grade)} resume`);
  if (useApplication) {
    const appState = await appRequest(
      stack,
      fresh.session,
      `/api/curriculum-runtime/state?attemptId=${attemptId}`,
    );
    const appHistory = await appRequest(stack, fresh.session, "/api/curriculum-runtime/history");
    const appProgress = await appRequest(stack, fresh.session, "/api/curriculum-runtime/progress");
    check(record(appState.data).attemptId === attemptId, "Grade 3 application state resume failed.");
    check(
      records(record(appHistory.data).attempts).some(
        (item) => item.attemptId === attemptId && item.status === "IN_PROGRESS",
      ),
      "Grade 3 application partial History failed.",
    );
    check(
      record(appProgress.data).grade === student.grade,
      `Grade ${String(student.grade)} application Progress failed.`,
    );
    const [dashboardPage, lessonsPage, progressPage, historyPage, resultsPage] =
      await Promise.all([
        appPage(stack, fresh, "/dashboard"),
        appPage(stack, fresh, "/lessons"),
        appPage(stack, fresh, "/learning-progress"),
        appPage(stack, fresh, "/learning-history"),
        appPage(stack, fresh, "/results"),
      ]);
    requirePageMatch(
      dashboardPage,
      /Tiếp tục bài này/u,
      `Grade ${String(student.grade)} Dashboard did not expose resume.`,
    );
    requirePageMatch(
      lessonsPage,
      /Tiếp tục học/u,
      `Grade ${String(student.grade)} Lessons did not expose resume.`,
    );
    for (const page of [historyPage, resultsPage]) {
      requirePageMatch(
        page,
        /data-attempt-status="IN_PROGRESS"/u,
        `Grade ${String(student.grade)} partial History projection failed.`,
      );
      check(
        !/đang được chuẩn bị|Em chưa có lượt học nào/iu.test(page),
        `Grade ${String(student.grade)} partial History became false empty content.`,
      );
    }
    requirePageMatch(
      progressPage,
      /data-completed-count="0"/u,
      `Grade ${String(student.grade)} partial Progress completion count failed.`,
    );
  }

  state = resumed;
  let finalReplay: { questionId: string; answer: string; revision: number; key: string } | null = null;
  while (state.status === "IN_PROGRESS") {
    const question = record(state.currentQuestion ?? state.current_question);
    const key = randomUUID();
    const revision = Number(state.revision);
    const answer = answerFor(question);
    const questionId = String(question.questionId ?? question.question_id);
    const submission = {
      attemptId,
      questionId,
      answer,
      expectedRevision: revision,
      idempotencyKey: key,
    };
    const result = useApplication
      ? record(
          (await appRequest(
            stack,
            fresh.session,
            "/api/curriculum-runtime/answer",
            { method: "POST", body: submission },
          )).data,
        )
      : record(await rpc(fresh, "submit_curriculum_answer", {
          p_attempt_id: attemptId,
          p_question_id: questionId,
          p_answer: answer,
          p_expected_revision: revision,
          p_idempotency_key: key,
        }));
    const replay = useApplication
      ? record(
          (await appRequest(
            stack,
            fresh.session,
            "/api/curriculum-runtime/answer",
            { method: "POST", body: submission },
          )).data,
        )
      : record(await rpc(fresh, "submit_curriculum_answer", {
          p_attempt_id: attemptId,
          p_question_id: questionId,
          p_answer: answer,
          p_expected_revision: revision,
          p_idempotency_key: key,
        }));
    check(
      (replay.attemptId ?? replay.attempt_id) ===
        (result.attemptId ?? result.attempt_id) &&
        replay.revision === result.revision,
      "Universal answer replay changed state.",
    );
    finalReplay = { questionId, answer, revision, key };
    state = result;
  }
  const completedAnsweredCount = Number(
    state.answeredCount ?? state.answered_count,
  );
  const completedTotalQuestions = Number(
    state.totalQuestions ?? state.total_questions,
  );
  check(
    state.status === "COMPLETED" &&
      completedAnsweredCount === completedTotalQuestions,
    "Universal completion failed.",
  );
  check(finalReplay, "Universal completion replay evidence was unavailable.");
  const replayCompletion = useApplication
    ? record(
        (await appRequest(
          stack,
          fresh.session,
          "/api/curriculum-runtime/answer",
          {
            method: "POST",
            body: {
              attemptId,
              questionId: finalReplay.questionId,
              answer: finalReplay.answer,
              expectedRevision: finalReplay.revision,
              idempotencyKey: finalReplay.key,
            },
          },
        )).data,
      )
    : record(await rpc(fresh, "submit_curriculum_answer", {
        p_attempt_id: attemptId,
        p_question_id: finalReplay.questionId,
        p_answer: finalReplay.answer,
        p_expected_revision: finalReplay.revision,
        p_idempotency_key: finalReplay.key,
      }));
  check(replayCompletion.status === "COMPLETED", "Universal completion replay failed.");
  const history = record(await rpc(fresh, "get_student_curriculum_history"));
  const items = records(history.attempts).filter((item) => item.attempt_id === attemptId);
  check(items.length === 1 && items[0].status === "COMPLETED", "Universal completed History failed.");
  const progress = record(await rpc(fresh, "get_student_curriculum_progress"));
  const unitProgress = records(progress.units).find((item) => item.unit_id === unitId);
  check(
    unitProgress?.status === "COMPLETED" &&
      Number(unitProgress.evidence_count) === completedTotalQuestions,
    "Universal completed Progress failed.",
  );
  const scoring = record(await rpc(fresh, "get_my_score_xp_mastery"));
  check(
    records(scoring.attempts).some(
      (item) => item.attempt_id === attemptId && item.lesson_completed === true && typeof item.score_percent === "number",
    ),
    "Universal result/scoring failed.",
  );
  if (useApplication) {
    const completedHistory = await appRequest(stack, fresh.session, "/api/curriculum-runtime/history");
    check(
      records(record(completedHistory.data).attempts).some(
        (item) => item.attemptId === attemptId && item.status === "COMPLETED",
      ),
      "Grade 3 application completed History failed.",
    );
    const [dashboardPage, lessonsPage, progressPage, historyPage, resultsPage] =
      await Promise.all([
        appPage(stack, fresh, "/dashboard"),
        appPage(stack, fresh, "/lessons"),
        appPage(stack, fresh, "/learning-progress"),
        appPage(stack, fresh, "/learning-history"),
        appPage(stack, fresh, "/results"),
      ]);
    for (const page of [dashboardPage, lessonsPage, progressPage]) {
      requirePageMatch(
        page,
        /data-completed-count="1"/u,
        `Grade ${String(student.grade)} completed projection count disagreed.`,
      );
    }
    for (const page of [historyPage, resultsPage]) {
      requirePageMatch(
        page,
        /data-attempt-status="COMPLETED"/u,
        `Grade ${String(student.grade)} completed History projection failed.`,
      );
      check(
        !/đang được chuẩn bị|Em chưa có lượt học nào/iu.test(page),
        `Grade ${String(student.grade)} completed History became false empty content.`,
      );
    }
  }
  return {
    grade: student.grade,
    unitId,
    attemptId,
    answerCount: completedTotalQuestions,
  } satisfies GradeEvidence;
}

async function approveParentLink(
  stack: LearningPersistenceStack,
  parent: Account,
  student: Account,
) {
  const activeStudent = await freshLogin(stack, student);
  check(student.studentCode, "Student code was unavailable for Parent consent.");
  const request = record(await rpc(parent, "send_parent_connection_request", {
    p_student_code: student.studentCode,
  }));
  check(request.created === true && request.status === "PENDING", "Parent request failed.");
  const state = record(await rpc(activeStudent, "get_my_parent_student_connections"));
  const pending = records(state.connections).find((item) => item.status === "PENDING");
  check(typeof pending?.connection_id === "string", "Student consent request was unavailable.");
  const connectionId = pending.connection_id;
  const approval = record(await rpc(activeStudent, "respond_parent_connection_request", {
    p_connection_id: connectionId,
    p_decision: "APPROVED",
  }));
  check(approval.status === "APPROVED", "Student consent approval failed.");
  return { connectionId, student: activeStudent };
}

async function verifyParent(
  parent: Account,
  unrelated: Account,
  connectionId: string,
) {
  for (const name of [
    "get_parent_child_learning_dashboard",
    "get_parent_child_universal_progress",
    "get_parent_child_score_xp_mastery",
    "get_parent_child_motivation_v1",
  ]) {
    const aggregate = await rpc(parent, name, { p_connection_id: connectionId });
    check(aggregate !== null, `Approved Parent ${name} returned no aggregate.`);
    noAggregateLeak(aggregate, `Approved Parent ${name}`);
  }
  for (const name of ["get_parent_child_learning_dashboard", "get_parent_child_universal_progress"]) {
    const denied = await unrelated.client.rpc(name, { p_connection_id: connectionId });
    check(Boolean(denied.error), `Unrelated Parent was allowed by ${name}.`);
  }
}

async function proveLearningLifecycle(
  stack: LearningPersistenceStack,
  grades: number[],
  applicationGrade3: boolean,
) {
  const students = new Map<number, Account>();
  const evidence = new Map<number, GradeEvidence>();
  for (const grade of grades) {
    const student = await register(stack, "STUDENT", `student-g${String(grade)}`, grade);
    students.set(grade, student);
    evidence.set(
      grade,
      grade === 1
        ? await proveGrade1(stack, student, applicationGrade3)
        : await proveUniversalGrade(stack, student, applicationGrade3),
    );
  }
  const parent = await register(stack, "PARENT", "parent");
  const unrelatedParent = await register(stack, "PARENT", "unrelated-parent");
  const connectionIds = new Map<number, string>();
  for (const grade of grades) {
    const student = students.get(grade);
    check(student, "Synthetic Student context disappeared.");
    const linked = await approveParentLink(stack, parent, student);
    const connectionId = linked.connectionId;
    students.set(grade, linked.student);
    connectionIds.set(grade, connectionId);
    await verifyParent(parent, unrelatedParent, connectionId);
    if (applicationGrade3 && grade === 3) {
      const page = await appRequest(
        stack,
        parent.session,
        `/parent/children/${connectionId}`,
        { expectJson: false },
      );
      check(
        typeof page === "string" &&
          !/Dữ liệu học tập chưa sẵn sàng|PARENT_PROGRESS_UNAVAILABLE/iu.test(page),
        "Grade 3 application Parent progress was unavailable.",
      );
      requireProfileMenuClosed(page, "Parent");
    }
  }
  const foreignGrade = grades.find((grade) => grade >= 2);
  const targetGrade = grades.find((grade) => grade >= 3) ?? foreignGrade;
  if (foreignGrade && targetGrade && foreignGrade !== targetGrade) {
    const reader = students.get(foreignGrade);
    const target = evidence.get(targetGrade);
    check(reader && target, "Cross-Student probe context failed.");
    const denied = await reader.client.rpc("get_curriculum_attempt_state", {
      p_attempt_id: target.attemptId,
    });
    check(Boolean(denied.error), "Student read another Student attempt.");
    const wrongGrade = await reader.client.rpc("start_or_resume_curriculum_unit", {
      p_unit_slug: target.unitId,
      p_idempotency_key: randomUUID(),
    });
    check(Boolean(wrongGrade.error), "Cross-grade unit start was allowed.");
  }
  if (grades.some((grade) => grade >= 2)) {
    const target = evidence.get(grades.find((grade) => grade >= 2) as number);
    check(target, "Anonymous probe target failed.");
    const anonymous = client(stack);
    const denied = await anonymous.rpc("start_or_resume_curriculum_unit", {
      p_unit_slug: target.unitId,
      p_idempotency_key: randomUUID(),
    });
    check(Boolean(denied.error), "Anonymous attempt creation was allowed.");
  }
  for (const grade of grades) {
    const expected = grade === 1 ? 24 : 12;
    const tablePrefix = grade === 1 ? "practice" : "curriculum";
    const counts = stack.query(`
      select concat_ws('|', count(distinct attempt.id), max(attempt.answered_count),
        count(distinct answer.question_id),
        count(distinct attempt.id) filter (where attempt.status = 'COMPLETED'))
      from public.${tablePrefix}_attempts attempt
      left join public.${tablePrefix}_answers answer on answer.attempt_id = attempt.id
      join public.student_profiles student on student.user_id = attempt.student_id
      where student.grade = ${String(grade)};
    `);
    check(counts === `1|${String(expected)}|${String(expected)}|1`, `Grade ${String(grade)} canonical row count failed.`);
  }
  const adaptive = stack.query(`
    select concat_ws('|',
      count(*) filter (where publication_status <> 'DRAFT' or student_visibility <> 'HIDDEN' or controlled_pilot_enabled),
      (select count(*) from public.adaptive_practice_attempts))
    from public.adaptive_practice_releases;
  `);
  check(adaptive === "0|0", "Grade 2 adaptive pilot boundary changed.");
  return { students, evidence, parent, unrelatedParent, connectionIds } satisfies LearningContext;
}

function sqlText(value: string) {
  check(/^[A-Z0-9!-]+$/u.test(value), "Generated local invitation value was unsafe.");
  return `'${value.replaceAll("'", "''")}'`;
}

async function activateSyntheticTeacher(stack: LearningPersistenceStack, label: string) {
  const invitation = `PLV-TCH-${randomBytes(16).toString("hex").toUpperCase()}`;
  stack.query(`
    insert into public.teacher_invitations (code_hash, status, expires_at)
    values (extensions.digest(${sqlText(invitation)}, 'sha256'), 'AVAILABLE', now() + interval '1 hour');
    select count(*) from public.teacher_invitations where status = 'AVAILABLE';
  `);
  const teacher = await register(stack, "TEACHER", label);
  const activation = record(await rpc(teacher, "activate_teacher_invitation", {
    p_code: invitation,
    p_full_name: "Round 2I Teacher",
  }));
  check(activation.activated === true, "Teacher activation failed.");
  const profile = record(await rpc(teacher, "get_my_teacher_profile"));
  check(profile.activation_status === "ACTIVE", "Teacher did not become ACTIVE.");
  return teacher;
}

async function proveTeacherAssignment(
  stack: LearningPersistenceStack,
  context?: LearningContext,
) {
  let student = context?.students.get(3);
  let parent = context?.parent;
  let unrelatedParent = context?.unrelatedParent;
  let connectionId = context?.connectionIds.get(3);
  if (!student || !parent || !unrelatedParent || !connectionId) {
    student = await register(stack, "STUDENT", "assignment-student-g3", 3);
    parent = await register(stack, "PARENT", "assignment-parent");
    unrelatedParent = await register(stack, "PARENT", "assignment-unrelated-parent");
    const linked = await approveParentLink(stack, parent, student);
    connectionId = linked.connectionId;
    student = linked.student;
  }
  const teacher = await activateSyntheticTeacher(stack, "assignment-teacher");
  const unrelatedTeacher = await activateSyntheticTeacher(stack, "assignment-unrelated-teacher");
  if (stack.appOrigin) {
    requireProfileMenuClosed(
      await appPage(stack, teacher, "/teacher"),
      "Teacher",
    );
  }
  const classroom = record(await rpc(teacher, "create_teacher_classroom", {
    p_name: "Round 2I Grade 3",
    p_grade: 3,
    p_request_id: randomUUID(),
  }));
  check(typeof classroom.classroom_id === "string" && typeof classroom.class_code === "string", "Teacher classroom creation failed.");
  const membershipRequest = record(await rpc(student, "request_classroom_membership", {
    p_class_code: classroom.class_code,
  }));
  check(membershipRequest.status === "PENDING", "Student classroom request failed.");
  const classroomState = record(await rpc(teacher, "get_teacher_classroom", {
    p_classroom_id: classroom.classroom_id,
  }));
  const pendingMember = records(classroomState.memberships).find((item) => item.status === "PENDING");
  check(typeof pendingMember?.membership_id === "string", "Teacher could not resolve pending membership.");
  const membership = record(await rpc(teacher, "respond_classroom_membership", {
    p_membership_id: pendingMember.membership_id,
    p_decision: "APPROVED",
  }));
  check(membership.status === "APPROVED", "Teacher membership approval failed.");
  const questionIds: string[] = [];
  for (let index = 0; index < 2; index += 1) {
    const question = record(await rpc(teacher, "create_teacher_question", {
      p_grade: 3,
      p_question_type: "MULTIPLE_CHOICE",
      p_prompt: `Round 2I synthetic question ${String(index + 1)}`,
      p_options: { A: "One", B: "Two", C: "Three", D: "Four" },
      p_correct_answer: "A",
      p_solution_steps: ["Review the local test prompt.", "Select the first option."],
      p_explanation: "Synthetic local-only explanation.",
      p_request_id: randomUUID(),
    }));
    check(typeof question.question_id === "string", "Teacher question creation failed.");
    questionIds.push(question.question_id);
  }
  const assignment = record(await rpc(teacher, "publish_teacher_assignment", {
    p_classroom_id: classroom.classroom_id,
    p_title: "Round 2I assignment",
    p_instructions: "Complete both local test questions.",
    p_due_at: null,
    p_question_ids: questionIds,
    p_request_id: randomUUID(),
  }));
  check(typeof assignment.assignment_id === "string" && assignment.status === "PUBLISHED", "Assignment publish failed.");
  const started = record(await rpc(student, "start_or_resume_assignment_submission", {
    p_assignment_id: assignment.assignment_id,
  }));
  const repeated = record(await rpc(student, "start_or_resume_assignment_submission", {
    p_assignment_id: assignment.assignment_id,
  }));
  check(
    typeof started.submission_id === "string" && repeated.submission_id === started.submission_id,
    "Assignment start/resume idempotency failed.",
  );
  let state = record(await rpc(student, "get_assignment_submission_state", {
    p_assignment_id: assignment.assignment_id,
  }));
  noPreSubmitLeak(state, "Teacher assignment state");
  const firstSaveKey = randomUUID();
  const firstSave = record(await rpc(student, "save_assignment_draft_answer_v2", {
    p_submission_id: started.submission_id,
    p_question_id: questionIds[0],
    p_answer: "A",
    p_expected_revision: 0,
    p_idempotency_key: firstSaveKey,
  }));
  check(firstSave.revision === 1 && firstSave.answered_count === 1, "Assignment first draft save failed.");
  const replaySave = record(await rpc(student, "save_assignment_draft_answer_v2", {
    p_submission_id: started.submission_id,
    p_question_id: questionIds[0],
    p_answer: "A",
    p_expected_revision: 0,
    p_idempotency_key: firstSaveKey,
  }));
  check(replaySave.replayed === true && replaySave.revision === 1, "Assignment draft replay failed.");
  const stale = await student.client.rpc("save_assignment_draft_answer_v2", {
    p_submission_id: started.submission_id,
    p_question_id: questionIds[1],
    p_answer: "A",
    p_expected_revision: 0,
    p_idempotency_key: randomUUID(),
  });
  check(stale.error?.message === "ASSIGNMENT:STATE_CONFLICT", "Assignment CAS conflict did not fail closed.");
  await student.client.auth.signOut();
  student = await freshLogin(stack, student);
  state = record(await rpc(student, "get_assignment_submission_state", {
    p_assignment_id: assignment.assignment_id,
  }));
  check(
    state.revision === 1 && state.answered_count === 1 &&
      records(state.questions).some((item) => item.question_id === questionIds[0] && item.draft_answer === "A"),
    "Assignment fresh-session draft resume failed.",
  );
  const secondSave = record(await rpc(student, "save_assignment_draft_answer_v2", {
    p_submission_id: started.submission_id,
    p_question_id: questionIds[1],
    p_answer: "A",
    p_expected_revision: 1,
    p_idempotency_key: randomUUID(),
  }));
  check(secondSave.revision === 2 && secondSave.answered_count === 2, "Assignment second draft save failed.");
  const submitKey = randomUUID();
  const submitted = record(await rpc(student, "submit_assignment_submission_v2", {
    p_submission_id: started.submission_id,
    p_expected_revision: 2,
    p_idempotency_key: submitKey,
  }));
  const replaySubmit = record(await rpc(student, "submit_assignment_submission_v2", {
    p_submission_id: started.submission_id,
    p_expected_revision: 2,
    p_idempotency_key: submitKey,
  }));
  check(
    submitted.status === "SUBMITTED" && replaySubmit.status === "SUBMITTED" && replaySubmit.replayed === true,
    "Assignment final submission idempotency failed.",
  );
  const immutable = await student.client.rpc("save_assignment_draft_answer_v2", {
    p_submission_id: started.submission_id,
    p_question_id: questionIds[0],
    p_answer: "B",
    p_expected_revision: Number(submitted.revision),
    p_idempotency_key: randomUUID(),
  });
  check(Boolean(immutable.error), "Submitted assignment remained mutable.");
  const parentAggregate = record(await rpc(parent, "get_parent_child_universal_progress", {
    p_connection_id: connectionId,
  }));
  const assignmentSummary = record(parentAggregate.assignment_summary);
  check(
    Number(assignmentSummary.attempt_count) === 1 && Number(assignmentSummary.completed_count) === 1,
    "Parent assignment aggregate evidence failed.",
  );
  noAggregateLeak(parentAggregate, "Parent assignment aggregate");
  const unrelatedParentRead = await unrelatedParent.client.rpc("get_parent_child_universal_progress", {
    p_connection_id: connectionId,
  });
  check(Boolean(unrelatedParentRead.error), "Unrelated Parent read assignment evidence.");
  const unrelatedTeacherRead = await unrelatedTeacher.client.rpc("get_teacher_assignment_roster", {
    p_assignment_id: assignment.assignment_id,
  });
  check(
    Boolean(unrelatedTeacherRead.error) || unrelatedTeacherRead.data === null,
    "Unrelated Teacher read assignment roster.",
  );
  const curriculumHistory = record(await rpc(student, "get_student_curriculum_history"));
  check(
    !records(curriculumHistory.attempts).some(
      (item) => item.attempt_id === assignment.assignment_id || item.source === "TEACHER_ASSIGNMENT",
    ),
    "Teacher assignment was incorrectly included in curriculum History.",
  );
  const counts = stack.query(`
    select concat_ws('|',
      (select count(*) from public.assignment_submissions),
      (select count(*) from public.assignment_answers),
      (select count(*) from private.assignment_submission_mutations),
      (select count(*) from public.assignment_submissions where status = 'SUBMITTED'));
  `);
  check(counts === "1|2|3|1", "Teacher assignment canonical row counts failed.");
  process.stdout.write("TEACHER_ASSIGNMENT_PERSISTENCE=PASS\n");
}

async function proveSchemaSkew(stack: LearningPersistenceStack) {
  const student = await register(stack, "STUDENT", "schema-skew-student-g3", 3);
  const progress = record(await rpc(student, "get_student_curriculum_progress"));
  const unitId = records(progress.units)[0]?.unit_id;
  check(typeof unitId === "string", "Schema-skew Grade 3 unit was unavailable.");
  let state = record(await rpc(student, "start_or_resume_curriculum_unit", {
    p_unit_slug: unitId,
    p_idempotency_key: randomUUID(),
  }));
  for (let index = 0; index < 2; index += 1) {
    const question = record(state.current_question);
    state = record(await rpc(student, "submit_curriculum_answer", {
      p_attempt_id: state.attempt_id,
      p_question_id: question.question_id,
      p_answer: answerFor(question),
      p_expected_revision: state.revision,
      p_idempotency_key: randomUUID(),
    }));
  }
  const history = record(await rpc(student, "get_student_curriculum_history"));
  check(records(history.attempts).length === 1 && state.answered_count === 2, "Base 0038 persistence failed under schema skew.");
  const parent = await register(stack, "PARENT", "schema-skew-parent");
  const unrelated = await register(stack, "PARENT", "schema-skew-unrelated-parent");
  const connectionId = (await approveParentLink(stack, parent, student)).connectionId;
  const baseParent = await rpc(parent, "get_parent_child_universal_progress", {
    p_connection_id: connectionId,
  });
  check(baseParent !== null, "Base Parent progress failed under schema skew.");
  const denied = await unrelated.client.rpc("get_parent_child_universal_progress", {
    p_connection_id: connectionId,
  });
  check(Boolean(denied.error), "Schema-skew unrelated Parent was allowed.");
  const [historyApi, progressApi] = await Promise.all([
    appRequest(stack, student.session, "/api/curriculum-runtime/history"),
    appRequest(stack, student.session, "/api/curriculum-runtime/progress"),
  ]);
  check(
    records(record(historyApi.data).attempts).some(
      (item) => item.status === "IN_PROGRESS" && item.answeredCount === 2,
    ),
    "Schema-skew application History erased base evidence.",
  );
  check(
    record(progressApi.data).grade === 3,
    "Schema-skew application Progress erased base evidence.",
  );
  const [lessonsPage, historyPage, resultsPage, parentPage] = await Promise.all([
    appPage(stack, student, "/lessons"),
    appPage(stack, student, "/learning-history"),
    appPage(stack, student, "/results"),
    appPage(stack, parent, `/parent/children/${connectionId}`),
  ]);
  requirePageMatch(
    lessonsPage,
    /Tiếp tục học/u,
    "Schema-skew Lessons did not expose the active attempt.",
  );
  for (const page of [historyPage, resultsPage]) {
    requirePageMatch(
      page,
      /data-attempt-status="IN_PROGRESS"/u,
      "Schema-skew History page erased the active attempt.",
    );
    requirePageMatch(
      page,
      /Lịch sử cơ bản vẫn được giữ nguyên/u,
      "Schema-skew History did not disclose missing enrichment safely.",
    );
    check(
      !/đang được chuẩn bị|Em chưa có lượt học nào/iu.test(page),
      "Schema-skew History reported false empty content.",
    );
  }
  requirePageMatch(
    parentPage,
    /Tiến độ cơ bản vẫn được giữ nguyên/u,
    "Schema-skew Parent progress did not degrade to base evidence.",
  );
  check(
    !/Dữ liệu học tập chưa sẵn sàng|PARENT_PROGRESS_UNAVAILABLE/iu.test(parentPage),
    "Schema-skew Parent progress remained unavailable.",
  );
  requireProfileMenuClosed(lessonsPage, "Schema-skew Student");
  requireProfileMenuClosed(parentPage, "Schema-skew Parent");
  const capabilityRow = stack.query(`
    select concat_ws('|',
      (to_regprocedure('public.start_or_resume_curriculum_unit(text,uuid)') is not null)::int,
      (to_regprocedure('public.get_student_curriculum_history()') is not null)::int,
      (to_regprocedure('public.get_parent_child_universal_progress(uuid)') is not null)::int,
      (to_regprocedure('public.get_my_score_xp_mastery()') is not null)::int,
      (to_regprocedure('public.get_parent_child_score_xp_mastery(uuid)') is not null)::int,
      (to_regprocedure('public.get_my_motivation_v1()') is not null)::int,
      (to_regprocedure('public.get_parent_child_motivation_v1(uuid)') is not null)::int);
  `);
  check(capabilityRow === "1|1|1|0|0|0|0", "Schema-skew capability fingerprint failed.");
  const compatibility = classifyLearningPersistenceSchema({
    baseAttemptWrite: true,
    baseHistoryRead: true,
    baseParentProgressRead: true,
    scoringRead: false,
    parentScoringRead: false,
    motivationRead: false,
    parentMotivationRead: false,
  });
  check(
    compatibility.classification === "BASE_PERSISTENCE_WITHOUT_ENRICHMENT" &&
      compatibility.studentHistory === "AVAILABLE_BASE_ONLY" &&
      compatibility.parentProgress === "AVAILABLE_BASE_ONLY" &&
      compatibility.safeCode === "SCHEMA_ENRICHMENT_UNAVAILABLE",
    "Schema-skew diagnostic classification failed.",
  );
  check(
    !/(?:postgres|sql|supabase|http|uuid|provider|password|token|secret)/iu.test(compatibility.safeMessage),
    "Schema-skew diagnostic exposed infrastructure detail.",
  );
  const scoring = await student.client.rpc("get_my_score_xp_mastery");
  const parentScoring = await parent.client.rpc("get_parent_child_score_xp_mastery", {
    p_connection_id: connectionId,
  });
  check(Boolean(scoring.error) && Boolean(parentScoring.error), "Missing enrichment RPCs did not fail closed.");
  process.stdout.write(`SCHEMA_SKEW_DIAGNOSTIC=PASS code:${compatibility.safeCode}\n`);
}

function parseScope(): LearningPersistenceScope {
  const value = process.argv.find((argument) => argument.startsWith("--scope="))?.slice("--scope=".length) ?? "all";
  if (!["all", "learning", "grade3", "teacher", "schema-skew"].includes(value)) {
    fail("Round 2I scope is invalid.");
  }
  return value as LearningPersistenceScope;
}

const scope = parseScope();
if (scope === "all" || scope === "schema-skew") {
  await withLearningPersistenceStack({
    boundary: 42,
    startApp: true,
    operation: proveSchemaSkew,
  });
}
if (scope !== "schema-skew") {
  await withLearningPersistenceStack({
    boundary: 44,
    startApp: scope === "all" || scope === "grade3",
    operation: async (stack) => {
      let context: LearningContext | undefined;
      if (scope === "all" || scope === "learning") {
        context = await proveLearningLifecycle(
          stack,
          [1, 2, 3, 4, 5, 6, 7, 8, 9],
          scope === "all",
        );
        process.stdout.write("GRADES_1_9_LEARNING_PERSISTENCE=PASS\n");
      } else if (scope === "grade3") {
        context = await proveLearningLifecycle(stack, [3], true);
        process.stdout.write("GRADE3_APPLICATION_HISTORY=PASS\n");
      }
      if (scope === "all" || scope === "teacher") {
        await proveTeacherAssignment(stack, context);
      }
    },
  });
}
process.stdout.write(`ROUND2I_LOCAL_PERSISTENCE_SCOPE_${scope.toUpperCase()}=PASS\n`);
