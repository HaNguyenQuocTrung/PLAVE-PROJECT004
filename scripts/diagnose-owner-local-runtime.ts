import { randomBytes, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

import { createServerClient } from "@supabase/ssr";

import { parseCurriculumAttemptApiState } from "../lib/curriculum-runtime/contracts.ts";
import {
  parseStartPracticeApiResponse,
  parseSubmitPracticeApiResponse,
} from "../lib/practice/contracts.ts";
import {
  loadOwnerLocalSupabase,
  queryOwnerLocalDatabase,
} from "./owner-local-demo-support.ts";

const appOrigin = "http://127.0.0.1:3000";
const config = loadOwnerLocalSupabase();
const runTag = randomBytes(8).toString("hex");
const syntheticPassword = `Rt-${randomBytes(18).toString("base64url")}9!`;
const grades = [1, 5, 8, 9] as const;

const universalUnits = {
  5: {
    unitSlug: "grade-5-decimal-operations",
    lessonPath: "/learn/grade-5/decimal-operations",
  },
  8: {
    unitSlug: "grade-8-linear-functions",
    lessonPath: "/learn/grade-8/linear-functions",
  },
  9: {
    unitSlug: "grade-9-quadratic-functions",
    lessonPath: "/learn/grade-9/quadratic-functions",
  },
} as const;

const budgets = {
  authMs: 2_000,
  lessonMs: 1_000,
  startMs: 1_500,
  submitMs: 1_500,
  progressMs: 1_500,
} as const;

type CookieJar = Map<string, string>;

function elapsed(startedAt: number) {
  return Math.round((performance.now() - startedAt) * 10) / 10;
}

function assertCondition(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(`Runtime acceptance failed: ${label}.`);
}

function assertBudget(durationMs: number, budgetMs: number, label: string) {
  assertCondition(durationMs <= budgetMs, `${label} exceeded local budget`);
}

function cookieHeader(cookieJar: CookieJar) {
  return [...cookieJar]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function safeServerCode(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "object" &&
    value.error !== null &&
    "code" in value.error &&
    typeof value.error.code === "string" &&
    /^[A-Z0-9_]{2,40}$/.test(value.error.code)
  ) {
    return value.error.code;
  }
  return "NONE";
}

function dataFromPayload(value: unknown) {
  return typeof value === "object" && value !== null && "data" in value
    ? value.data
    : null;
}

function printMeasurement(input: {
  path: string;
  status: number;
  durationMs: number;
  serverTiming?: string | null;
  correlationId?: string | null;
  serverErrorCode?: string;
  phase: "cold" | "warm";
}) {
  const timing = input.serverTiming
    ? ` server_timing="${input.serverTiming}"`
    : "";
  const correlation = input.correlationId
    ? ` correlation_id=${input.correlationId}`
    : "";
  const code = input.serverErrorCode
    ? ` server_error_code=${input.serverErrorCode}`
    : "";
  process.stdout.write(
    `RUNTIME_ACCEPTANCE phase=${input.phase} path=${input.path} status=${input.status}${code} duration_ms=${input.durationMs}${timing}${correlation}\n`,
  );
}

async function requestPage(
  cookieJar: CookieJar,
  path: string,
  phase: "cold" | "warm",
) {
  const startedAt = performance.now();
  const response = await fetch(`${appOrigin}${path}`, {
    headers: { Cookie: cookieHeader(cookieJar) },
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
  await response.arrayBuffer();
  const durationMs = elapsed(startedAt);
  printMeasurement({ path, status: response.status, durationMs, phase });
  assertCondition(response.status === 200, `${path} returned non-200`);
  return durationMs;
}

async function requestJson(
  cookieJar: CookieJar,
  path: string,
  init: RequestInit,
  phase: "cold" | "warm",
) {
  const startedAt = performance.now();
  const response = await fetch(`${appOrigin}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader(cookieJar),
      Origin: appOrigin,
      ...init.headers,
    },
    signal: AbortSignal.timeout(10_000),
  });
  const payload = (await response.json()) as unknown;
  const durationMs = elapsed(startedAt);
  printMeasurement({
    path: new URL(path, appOrigin).pathname,
    status: response.status,
    durationMs,
    phase,
    serverErrorCode: safeServerCode(payload),
    serverTiming: response.headers.get("Server-Timing"),
    correlationId: response.headers.get("X-PLAVE-Correlation-ID"),
  });
  return { response, payload, durationMs };
}

function createAuthenticatedClient(cookieJar: CookieJar) {
  return createServerClient(config.apiUrl, config.publishableKey, {
    cookies: {
      getAll: () =>
        [...cookieJar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const cookie of cookies) {
          if (cookie.value) cookieJar.set(cookie.name, cookie.value);
          else cookieJar.delete(cookie.name);
        }
      },
    },
  });
}

async function createStudent(grade: (typeof grades)[number]) {
  const cookieJar: CookieJar = new Map();
  const supabase = createAuthenticatedClient(cookieJar);
  const syntheticEmail =
    `runtime-http-${runTag}-grade-${grade}@plave.local.invalid`;

  const registerStartedAt = performance.now();
  const { data: registration, error: registrationError } =
    await supabase.auth.signUp({
      email: syntheticEmail,
      password: syntheticPassword,
      options: { data: { role: "STUDENT", grade: String(grade) } },
    });
  const registerDuration = elapsed(registerStartedAt);
  assertCondition(
    !registrationError && registration.session,
    "local registration",
  );
  printMeasurement({
    path: "auth/register",
    status: 200,
    durationMs: registerDuration,
    phase: "warm",
  });
  assertBudget(registerDuration, budgets.authMs, "register");

  const { error: onboardingError } = await supabase.rpc(
    "complete_onboarding",
    {
      p_full_name: "Runtime HTTP Student",
      p_grade: grade,
      p_birth_date: null,
    },
  );
  assertCondition(!onboardingError, "local onboarding");

  const { error: signOutError } = await supabase.auth.signOut();
  assertCondition(!signOutError, "pre-login sign out");
  const loginStartedAt = performance.now();
  const { data: login, error: loginError } =
    await supabase.auth.signInWithPassword({
      email: syntheticEmail,
      password: syntheticPassword,
    });
  const loginDuration = elapsed(loginStartedAt);
  assertCondition(!loginError && login.session, "local login");
  printMeasurement({
    path: "auth/login",
    status: 200,
    durationMs: loginDuration,
    phase: "warm",
  });
  assertBudget(loginDuration, budgets.authMs, "login");

  return { cookieJar, supabase, syntheticEmail };
}

async function verifyWarmNavigation(
  cookieJar: CookieJar,
  lessonPath: string,
) {
  await requestPage(cookieJar, "/dashboard", "cold");
  const dashboardWarm = await requestPage(cookieJar, "/dashboard", "warm");
  await requestPage(cookieJar, "/learn", "cold");
  const learnWarm = await requestPage(cookieJar, "/learn", "warm");
  await requestPage(cookieJar, lessonPath, "cold");
  const lessonWarm = await requestPage(cookieJar, lessonPath, "warm");
  assertBudget(dashboardWarm, budgets.lessonMs, "warm dashboard");
  assertBudget(learnWarm, budgets.lessonMs, "warm learn");
  assertBudget(lessonWarm, budgets.lessonMs, "warm lesson");
}

async function verifyUniversalJourney(
  grade: 5 | 8 | 9,
  cookieJar: CookieJar,
  supabase: ReturnType<typeof createAuthenticatedClient>,
) {
  const { unitSlug, lessonPath } = universalUnits[grade];
  await verifyWarmNavigation(cookieJar, lessonPath);

  const startBody = JSON.stringify({
    unitSlug,
    idempotencyKey: randomUUID(),
  });
  const coldStart = await requestJson(
    cookieJar,
    "/api/curriculum-runtime/start",
    { method: "POST", body: startBody },
    "cold",
  );
  assertCondition(coldStart.response.ok, `Grade ${grade} cold start`);
  assertCondition(
    !JSON.stringify(coldStart.payload).includes("solution_steps") &&
      !JSON.stringify(coldStart.payload).includes("correct_answer"),
    `Grade ${grade} pre-submit solution boundary`,
  );
  const warmStart = await requestJson(
    cookieJar,
    "/api/curriculum-runtime/start",
    { method: "POST", body: startBody },
    "warm",
  );
  assertCondition(warmStart.response.ok, `Grade ${grade} warm start`);
  assertBudget(warmStart.durationMs, budgets.startMs, "warm start/resume");
  const startState = parseCurriculumAttemptApiState(
    dataFromPayload(warmStart.payload),
  );
  assertCondition(
    startState?.currentQuestion && startState.grade === grade,
    `Grade ${grade} start response mapping`,
  );

  const answerBody = JSON.stringify({
    attemptId: startState.attemptId,
    questionId: startState.currentQuestion.questionId,
    answer:
      startState.currentQuestion.answerType === "MULTIPLE_CHOICE" ? "A" : "0",
    expectedRevision: startState.revision,
    idempotencyKey: randomUUID(),
  });
  const coldSubmit = await requestJson(
    cookieJar,
    "/api/curriculum-runtime/answer",
    { method: "POST", body: answerBody },
    "cold",
  );
  assertCondition(coldSubmit.response.ok, `Grade ${grade} cold submit`);
  const warmSubmit = await requestJson(
    cookieJar,
    "/api/curriculum-runtime/answer",
    { method: "POST", body: answerBody },
    "warm",
  );
  assertCondition(warmSubmit.response.ok, `Grade ${grade} idempotent submit`);
  assertBudget(warmSubmit.durationMs, budgets.submitMs, "warm submit");
  const submittedState = parseCurriculumAttemptApiState(
    dataFromPayload(warmSubmit.payload),
  );
  assertCondition(
    submittedState?.feedback &&
      submittedState.feedback.questionId ===
        startState.currentQuestion.questionId,
    `Grade ${grade} post-submit feedback`,
  );

  const progress = await requestJson(
    cookieJar,
    "/api/curriculum-runtime/progress",
    { method: "GET" },
    "warm",
  );
  const history = await requestJson(
    cookieJar,
    "/api/curriculum-runtime/history",
    { method: "GET" },
    "warm",
  );
  assertCondition(progress.response.ok, `Grade ${grade} progress`);
  assertCondition(history.response.ok, `Grade ${grade} history`);
  assertBudget(progress.durationMs, budgets.progressMs, "progress");
  assertBudget(history.durationMs, budgets.progressMs, "history");

  await supabase.auth.signOut();
  const loginStartedAt = performance.now();
  const syntheticEmail =
    `runtime-http-${runTag}-grade-${grade}@plave.local.invalid`;
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: syntheticEmail,
    password: syntheticPassword,
  });
  const loginDuration = elapsed(loginStartedAt);
  assertCondition(!loginError, `Grade ${grade} persistence login`);
  assertBudget(loginDuration, budgets.authMs, "persistence login");

  const persistedState = await requestJson(
    cookieJar,
    `/api/curriculum-runtime/state?attemptId=${encodeURIComponent(startState.attemptId)}`,
    { method: "GET" },
    "warm",
  );
  assertCondition(persistedState.response.ok, `Grade ${grade} persisted state`);
  await requestPage(cookieJar, "/learning-progress", "warm");
  await requestPage(cookieJar, "/learning-history", "warm");
}

async function verifyGradeOneJourney(
  cookieJar: CookieJar,
  supabase: ReturnType<typeof createAuthenticatedClient>,
) {
  const unitSlug = "grade-1-numbers-to-10";
  await verifyWarmNavigation(
    cookieJar,
    "/learn/grade-1/numbers-to-10",
  );

  await requestJson(
    cookieJar,
    "/api/practice/start",
    { method: "POST", body: "{}" },
    "cold",
  );
  const start = await requestJson(
    cookieJar,
    "/api/practice/start",
    { method: "POST", body: JSON.stringify({ unitSlug }) },
    "warm",
  );
  assertCondition(start.response.ok, "Grade 1 start");
  assertBudget(start.durationMs, budgets.startMs, "Grade 1 start");
  assertCondition(
    !JSON.stringify(start.payload).includes("solution_steps") &&
      !JSON.stringify(start.payload).includes("correct_answer"),
    "Grade 1 pre-submit solution boundary",
  );
  const parsedStart = parseStartPracticeApiResponse(start.payload);
  assertCondition(parsedStart, "Grade 1 start response mapping");
  const firstQuestionId = parsedStart.data.questionOrder[0];
  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select("question_type")
    .eq("code", firstQuestionId)
    .maybeSingle();
  assertCondition(
    !questionError &&
      (question?.question_type === "MULTIPLE_CHOICE" ||
        question?.question_type === "NUMBER_INPUT"),
    "Grade 1 public question lookup",
  );

  await requestJson(
    cookieJar,
    "/api/practice/answer",
    { method: "POST", body: "{}" },
    "cold",
  );
  const answer = await requestJson(
    cookieJar,
    "/api/practice/answer",
    {
      method: "POST",
      body: JSON.stringify({
        attemptId: parsedStart.data.id,
        questionId: firstQuestionId,
        answer: question.question_type === "MULTIPLE_CHOICE" ? "A" : "0",
      }),
    },
    "warm",
  );
  assertCondition(answer.response.ok, "Grade 1 submit");
  assertBudget(answer.durationMs, budgets.submitMs, "Grade 1 submit");
  assertCondition(
    parseSubmitPracticeApiResponse(answer.payload),
    "Grade 1 feedback mapping",
  );

  await supabase.auth.signOut();
  const syntheticEmail =
    `runtime-http-${runTag}-grade-1@plave.local.invalid`;
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: syntheticEmail,
    password: syntheticPassword,
  });
  assertCondition(!loginError, "Grade 1 persistence login");
  const persisted = await requestJson(
    cookieJar,
    `/api/practice/state?mode=answer&attemptId=${encodeURIComponent(parsedStart.data.id)}&questionId=${encodeURIComponent(firstQuestionId)}`,
    { method: "GET" },
    "warm",
  );
  assertCondition(persisted.response.ok, "Grade 1 persisted answer");
  await requestPage(cookieJar, "/learning-history", "warm");
}

try {
  const health = await fetch(appOrigin, {
    signal: AbortSignal.timeout(3_000),
  });
  assertCondition(health.ok, "Owner local Next server unavailable");

  for (const grade of grades) {
    process.stdout.write(`RUNTIME_ACCEPTANCE_GRADE=${grade} START\n`);
    const { cookieJar, supabase } = await createStudent(grade);
    if (grade === 1) {
      await verifyGradeOneJourney(cookieJar, supabase);
    } else {
      await verifyUniversalJourney(grade, cookieJar, supabase);
    }
    process.stdout.write(`RUNTIME_ACCEPTANCE_GRADE=${grade} PASS\n`);
  }
  process.stdout.write("RUNTIME_ACCEPTANCE_GRADES_1_5_8_9=PASS\n");
} finally {
  queryOwnerLocalDatabase(
    config,
    `delete from auth.users
     where email like 'runtime-http-${runTag}-grade-%@plave.local.invalid';`,
  );
  process.stdout.write("RUNTIME_ACCEPTANCE_SYNTHETIC_CLEANUP=PASS\n");
}
