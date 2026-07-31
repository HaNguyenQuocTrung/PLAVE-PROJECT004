import { randomBytes, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

import { createServerClient } from "@supabase/ssr";

import {
  parseAssignmentRunnerStateApiResponse,
  parseAssignmentStartApiResponse,
  parseAssignmentSubmitApiResponse,
  parseDraftSaveApiResponse,
} from "../lib/assignments/contracts.ts";
import type {
  TeacherCurriculumCatalog,
  TeacherCurriculumDraft,
} from "../lib/assignments/curriculum-contracts.ts";
import { selectAdaptiveCurriculumRecommendation } from "../lib/curriculum/adaptive-selection.ts";
import {
  generateOnDemandAttemptSnapshot,
} from "../lib/curriculum/on-demand-generation.ts";
import type { CurriculumGrade } from "../lib/curriculum/types.ts";
import {
  mergeStudentGeneratedCurriculumProgress,
  parseCurriculumAttemptApiState,
  parseStudentCurriculumProgress,
  parseStudentGeneratedCurriculumEvidence,
  type CurriculumAttemptState,
  type StudentCurriculumProgress,
} from "../lib/curriculum-runtime/contracts.ts";
import {
  parseCreatedClassroomApiResponse,
  parseTeacherClassroomDetail,
} from "../lib/classrooms/contracts.ts";
import {
  parseConnectionState,
} from "../lib/connections/contracts.ts";
import {
  assertOwnerLocalDemoPreflight,
  loadOwnerLocalSupabase,
  queryOwnerLocalDatabase,
  type OwnerLocalSupabase,
} from "./owner-local-demo-support.ts";

if (process.argv.includes("--smoke")) {
  process.stdout.write("LEARNING_PRODUCT_ACCEPTANCE_SMOKE=PASS\n");
} else {
const appOrigin = "http://127.0.0.1:3000";
const grades = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const runTag = randomBytes(8).toString("hex");
const password = `Lp-${randomBytes(18).toString("base64url")}8!`;

const budgets = {
  authMs: 2_000,
  warmNavigationMs: 1_000,
  startMs: 1_500,
  submitMs: 1_500,
  collaborationMs: 2_000,
} as const;

type CookieJar = Map<string, string>;
type Role = "STUDENT" | "PARENT" | "TEACHER";
type SupabaseActorClient = ReturnType<typeof createAuthenticatedClient>;
type Actor = {
  cookieJar: CookieJar;
  supabase: SupabaseActorClient;
  userId: string;
  email: string;
  role: Role;
};
type StudentRecord = {
  grade: CurriculumGrade;
  actor: Actor;
  betaActor: Actor;
  attemptId: string;
  unitId: string;
  unitTitle: string;
};
type HttpResult = {
  status: number;
  payload: unknown;
  text: string;
  durationMs: number;
  serverTiming: string | null;
};

class AcceptanceFailure extends Error {
  readonly check: string;

  constructor(check: string) {
    super(check);
    this.check = check;
  }
}

let config: OwnerLocalSupabase | null = null;

function requireOwnerLocalConfig() {
  if (!config) {
    throw new AcceptanceFailure("PRECONDITION_APP_NOT_RUNNING");
  }
  return config;
}

const authDurations: number[] = [];
const warmNavigationDurations: number[] = [];
const startDurations: number[] = [];
const submitDurations: number[] = [];
const collaborationDurations: number[] = [];
let coldLearnDurationMs = 0;
let representativeStartTiming = "";
let issuedTeacherInvitationCode: string | null = null;

function elapsed(startedAt: number) {
  return Math.round((performance.now() - startedAt) * 10) / 10;
}

function requireCheck(
  condition: unknown,
  check: string,
): asserts condition {
  if (!condition) throw new AcceptanceFailure(check);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dataFromPayload(value: unknown) {
  return isRecord(value) && "data" in value ? value.data : null;
}

function safeCheckName(value: string) {
  return /^[A-Z0-9_:-]{2,100}$/.test(value)
    ? value
    : "UNCLASSIFIED_FAILURE";
}

function printPass(check: string, durationMs?: number) {
  const duration =
    durationMs === undefined ? "" : ` duration_ms=${durationMs}`;
  process.stdout.write(
    `ACCEPTANCE_CHECK ${safeCheckName(check)}=PASS${duration}\n`,
  );
}

function printLatency(name: string, value: number | string) {
  process.stdout.write(
    `ACCEPTANCE_LATENCY ${safeCheckName(name)}=${value}\n`,
  );
}

function assertBudget(
  durationMs: number,
  budgetMs: number,
  check: string,
) {
  requireCheck(durationMs <= budgetMs, check);
}

function cookieHeader(cookieJar: CookieJar) {
  return [...cookieJar]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function createAuthenticatedClient(cookieJar: CookieJar) {
  const local = requireOwnerLocalConfig();
  return createServerClient(local.apiUrl, local.publishableKey, {
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

async function request(
  actor: Pick<Actor, "cookieJar">,
  path: string,
  init: RequestInit = {},
): Promise<HttpResult> {
  const startedAt = performance.now();
  const response = await fetch(`${appOrigin}${path}`, {
    ...init,
    headers: {
      Cookie: cookieHeader(actor.cookieJar),
      Origin: appOrigin,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    redirect: "manual",
    signal: AbortSignal.timeout(12_000),
  });
  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = null;
    }
  }
  return {
    status: response.status,
    payload,
    text,
    durationMs: elapsed(startedAt),
    serverTiming: response.headers.get("Server-Timing"),
  };
}

async function postJson(
  actor: Pick<Actor, "cookieJar">,
  path: string,
  body: unknown,
) {
  return request(actor, path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function createActor(
  role: Role,
  suffix: string,
  grade?: CurriculumGrade,
) {
  const cookieJar: CookieJar = new Map();
  const supabase = createAuthenticatedClient(cookieJar);
  const email =
    `learning-acceptance-${runTag}-${suffix}@plave.local.invalid`;
  const startedAt = performance.now();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        ...(grade ? { grade: String(grade) } : {}),
      },
    },
  });
  const durationMs = elapsed(startedAt);
  authDurations.push(durationMs);
  requireCheck(
    !error && data.session && data.user,
    `AUTH_REGISTER_${role}`,
  );
  const actor: Actor = {
    cookieJar,
    supabase,
    userId: data.user.id,
    email,
    role,
  };
  if (role !== "TEACHER") {
    const onboarding = await postJson(actor, "/api/onboarding", {
      fullName:
        role === "PARENT" ? "Phụ huynh acceptance" : "Học sinh acceptance",
      birthDate: "",
    });
    requireCheck(
      onboarding.status === 200 &&
        isRecord(onboarding.payload) &&
        onboarding.payload.ok === true,
      `AUTH_ONBOARD_${role}`,
    );
  }
  return actor;
}

async function relogin(actor: Actor, check: string) {
  const signOut = await actor.supabase.auth.signOut();
  requireCheck(!signOut.error, `${check}_SIGNOUT`);
  const startedAt = performance.now();
  const login = await actor.supabase.auth.signInWithPassword({
    email: actor.email,
    password,
  });
  const durationMs = elapsed(startedAt);
  authDurations.push(durationMs);
  requireCheck(!login.error && login.data.session, `${check}_LOGIN`);
  assertBudget(durationMs, budgets.authMs, `${check}_LOGIN_BUDGET`);
}

function parseStartPayload(payload: unknown) {
  const state = parseCurriculumAttemptApiState(dataFromPayload(payload));
  const recommendation =
    isRecord(payload) && isRecord(payload.recommendation)
      ? payload.recommendation
      : null;
  return { state, recommendation };
}

async function startOnDemand(
  actor: Actor,
  seed: string,
  idempotencyKey: string,
  check: string,
) {
  const result = await postJson(
    actor,
    "/api/on-demand-curriculum/start",
    { seed, idempotencyKey },
  );
  startDurations.push(result.durationMs);
  requireCheck(result.status === 200, `${check}_HTTP`);
  requireCheck(
    !/correctAnswer|correct_answer|solutionSteps|solution_steps|normalizedCorrectAnswer/.test(
      result.text,
    ),
    `${check}_SOLUTION_BOUNDARY`,
  );
  const parsed = parseStartPayload(result.payload);
  requireCheck(
    parsed.state?.currentQuestion &&
      parsed.recommendation &&
      typeof parsed.recommendation.reasonCode === "string" &&
      typeof parsed.recommendation.explanation === "string",
    `${check}_MAPPING`,
  );
  return { ...result, ...parsed };
}

function generatedSnapshotEvidence(attemptId: string) {
  const row = queryOwnerLocalDatabase(
    requireOwnerLocalConfig(),
    `
      select
        attempt.snapshot_hash,
        question.official_outcome_id
      from public.curriculum_attempts as attempt
      join public.curriculum_generated_questions as question
        on question.attempt_id = attempt.id
        and question.position = 1
      where attempt.id = '${attemptId}'
        and attempt.generation_mode = 'ON_DEMAND';
    `,
  ).split("\t");
  requireCheck(
    row.length === 2 &&
      /^[0-9a-f]{64}$/.test(row[0] ?? "") &&
      (row[1]?.length ?? 0) > 1,
    "GENERATED_SNAPSHOT_DATABASE_EVIDENCE",
  );
  return { snapshotHash: row[0], outcomeId: row[1] };
}

function generatedAnswers(attemptId: string) {
  const output = queryOwnerLocalDatabase(
    requireOwnerLocalConfig(),
    `
      select question.question_id, solution.correct_answer
      from public.curriculum_generated_questions as question
      join private.curriculum_generated_solutions as solution
        on solution.attempt_id = question.attempt_id
        and solution.question_id = question.question_id
      where question.attempt_id = '${attemptId}'
      order by question.position;
    `,
  );
  const answers = new Map<string, string>();
  for (const line of output.split("\n").filter(Boolean)) {
    const separator = line.indexOf("\t");
    requireCheck(separator > 0, "PRIVATE_SOLUTION_TEST_LOOKUP");
    answers.set(line.slice(0, separator), line.slice(separator + 1));
  }
  requireCheck(answers.size === 12, "PRIVATE_SOLUTION_TEST_COUNT");
  return answers;
}

function wrongAnswer(
  state: CurriculumAttemptState,
  correctAnswer: string,
) {
  const question = state.currentQuestion;
  requireCheck(question, "GENERATED_CURRENT_QUESTION_REQUIRED");
  if (question.answerType === "MULTIPLE_CHOICE") {
    return ["A", "B", "C", "D"].find(
      (candidate) =>
        candidate.toLocaleLowerCase("vi") !==
        correctAnswer.trim().toLocaleLowerCase("vi"),
    ) ?? "A";
  }
  return "__plave_intentionally_wrong__";
}

async function completeGeneratedAttempt(
  actor: Actor,
  initialState: CurriculumAttemptState,
) {
  const answers = generatedAnswers(initialState.attemptId);
  let state = initialState;
  let sawCorrect = false;
  let sawIncorrect = false;
  for (let index = 0; index < 12; index += 1) {
    requireCheck(state.currentQuestion, "GENERATED_SEQUENCE_CURRENT");
    const correctAnswer = answers.get(state.currentQuestion.questionId);
    requireCheck(correctAnswer, "GENERATED_SEQUENCE_PRIVATE_PAIR");
    const shouldBeWrong = index < 3;
    const body = {
      attemptId: state.attemptId,
      questionId: state.currentQuestion.questionId,
      answer: shouldBeWrong
        ? wrongAnswer(state, correctAnswer)
        : correctAnswer,
      expectedRevision: state.revision,
      idempotencyKey: randomUUID(),
    };
    const submit = await postJson(
      actor,
      "/api/on-demand-curriculum/answer",
      body,
    );
    submitDurations.push(submit.durationMs);
    requireCheck(submit.status === 200, "GENERATED_SUBMIT_HTTP");
    const nextState = parseCurriculumAttemptApiState(
      dataFromPayload(submit.payload),
    );
    requireCheck(
      nextState?.feedback?.questionId === body.questionId,
      "GENERATED_POST_SUBMIT_SOLUTION",
    );
    if (shouldBeWrong) {
      requireCheck(
        nextState.feedback.isCorrect === false,
        "GENERATED_DATABASE_WRONG_GRADE",
      );
      sawIncorrect = true;
    } else {
      requireCheck(
        nextState.feedback.isCorrect === true,
        "GENERATED_DATABASE_CORRECT_GRADE",
      );
      sawCorrect = true;
    }
    if (index === 0) {
      const replay = await postJson(
        actor,
        "/api/on-demand-curriculum/answer",
        body,
      );
      const replayState = parseCurriculumAttemptApiState(
        dataFromPayload(replay.payload),
      );
      requireCheck(
        replay.status === 200 &&
          replayState?.revision === nextState.revision &&
          replayState.feedback?.isCorrect ===
            nextState.feedback.isCorrect,
        "GENERATED_SUBMIT_IDEMPOTENT",
      );
    }
    state = nextState;
  }
  requireCheck(
    sawCorrect &&
      sawIncorrect &&
      state.status === "COMPLETED" &&
      state.currentQuestion === null &&
      state.answeredCount === 12,
    "GENERATED_ATTEMPT_COMPLETION",
  );
  return state;
}

async function loadAdaptiveProgress(
  student: StudentRecord,
): Promise<StudentCurriculumProgress> {
  const base = await student.actor.supabase.rpc(
    "get_student_curriculum_progress",
  );
  const baseProgress = base.error
    ? null
    : parseStudentCurriculumProgress(base.data);
  requireCheck(baseProgress, `GRADE_${student.grade}_BASE_PROGRESS`);
  if (student.grade !== 1) return baseProgress;
  const supplement = await student.actor.supabase.rpc(
    "get_my_generated_curriculum_evidence",
  );
  const generated = supplement.error
    ? null
    : parseStudentGeneratedCurriculumEvidence(supplement.data);
  const merged = generated
    ? mergeStudentGeneratedCurriculumProgress(baseProgress, generated)
    : null;
  requireCheck(merged, "GRADE_1_GENERATED_PROGRESS_MERGE");
  return merged;
}

async function verifyStudentGrade(
  grade: CurriculumGrade,
): Promise<StudentRecord> {
  const actor = await createActor("STUDENT", `student-${grade}-alpha`, grade);
  const betaActor = await createActor(
    "STUDENT",
    `student-${grade}-beta`,
    grade,
  );
  const coldLearn = await request(actor, "/learn");
  requireCheck(coldLearn.status === 200, `GRADE_${grade}_LEARN_COLD`);
  if (grade === 1) coldLearnDurationMs = coldLearn.durationMs;
  const warmLearn = await request(actor, "/learn");
  requireCheck(warmLearn.status === 200, `GRADE_${grade}_LEARN_WARM`);
  warmNavigationDurations.push(warmLearn.durationMs);
  assertBudget(
    warmLearn.durationMs,
    budgets.warmNavigationMs,
    `GRADE_${grade}_LEARN_BUDGET`,
  );

  const alphaSeed = `grade-${grade}-${runTag}-alpha`;
  const alphaRequest = randomUUID();
  const alpha = await startOnDemand(
    actor,
    alphaSeed,
    alphaRequest,
    `GRADE_${grade}_ALPHA_START`,
  );
  requireCheck(alpha.state, `GRADE_${grade}_ALPHA_STATE`);
  requireCheck(
    alpha.recommendation,
    `GRADE_${grade}_ALPHA_RECOMMENDATION`,
  );
  assertBudget(
    alpha.durationMs,
    budgets.startMs,
    `GRADE_${grade}_START_BUDGET`,
  );
  if (grade === 8) representativeStartTiming = alpha.serverTiming ?? "";
  const replay = await startOnDemand(
    actor,
    alphaSeed,
    alphaRequest,
    `GRADE_${grade}_REPLAY`,
  );
  requireCheck(
    replay.state?.attemptId === alpha.state.attemptId &&
      replay.state.currentQuestion?.questionId ===
        alpha.state.currentQuestion?.questionId,
    `GRADE_${grade}_DETERMINISTIC_REPLAY`,
  );

  const alphaEvidence = generatedSnapshotEvidence(alpha.state.attemptId);
  const recomputed = generateOnDemandAttemptSnapshot({
    grade,
    unitId: alpha.state.unitId,
    seed: alphaSeed,
    selectionReason:
      alpha.recommendation.reasonCode as Parameters<
        typeof generateOnDemandAttemptSnapshot
      >[0]["selectionReason"],
    preferredOutcomeIds: [alphaEvidence.outcomeId],
  });
  requireCheck(
    recomputed.snapshotHash === alphaEvidence.snapshotHash &&
      recomputed.questions[0]?.questionId ===
        alpha.state.currentQuestion?.questionId &&
      recomputed.questions[0]?.prompt ===
        alpha.state.currentQuestion?.prompt,
    `GRADE_${grade}_INDEPENDENT_RECOMPUTATION`,
  );

  const beta = await startOnDemand(
    betaActor,
    `grade-${grade}-${runTag}-beta`,
    randomUUID(),
    `GRADE_${grade}_BETA_START`,
  );
  requireCheck(beta.state, `GRADE_${grade}_BETA_STATE`);
  const betaEvidence = generatedSnapshotEvidence(beta.state.attemptId);
  requireCheck(
    betaEvidence.snapshotHash !== alphaEvidence.snapshotHash,
    `GRADE_${grade}_SEMANTIC_VARIANT`,
  );

  const completed = await completeGeneratedAttempt(actor, alpha.state);
  await relogin(actor, `GRADE_${grade}_PERSISTENCE`);
  const persisted = await request(
    actor,
    `/api/on-demand-curriculum/state?attemptId=${completed.attemptId}`,
  );
  const persistedState = parseCurriculumAttemptApiState(
    dataFromPayload(persisted.payload),
  );
  requireCheck(
    persisted.status === 200 &&
      persistedState?.status === "COMPLETED" &&
      persistedState.answeredCount === 12,
    `GRADE_${grade}_LOGOUT_LOGIN_PERSISTENCE`,
  );

  const progress = await request(
    actor,
    "/api/curriculum-runtime/progress",
  );
  const history = await request(
    actor,
    "/api/curriculum-runtime/history",
  );
  requireCheck(
    progress.status === 200 &&
      history.status === 200 &&
      progress.text.includes(completed.unitId) &&
      history.text.includes(completed.attemptId),
    `GRADE_${grade}_PROGRESS_HISTORY`,
  );
  const progressModel = await loadAdaptiveProgress({
    grade,
    actor,
    betaActor,
    attemptId: completed.attemptId,
    unitId: completed.unitId,
    unitTitle: completed.unitTitle,
  });
  const recommendation = selectAdaptiveCurriculumRecommendation({
    grade,
    progress: progressModel,
  });
  requireCheck(recommendation, `GRADE_${grade}_ADAPTIVE_RECOMMENDATION`);
  const adapted = await startOnDemand(
    actor,
    `grade-${grade}-${runTag}-after-evidence`,
    randomUUID(),
    `GRADE_${grade}_ADAPTIVE_START`,
  );
  requireCheck(
    adapted.recommendation,
    `GRADE_${grade}_ADAPTIVE_RESPONSE_RECOMMENDATION`,
  );
  requireCheck(
    adapted.state?.unitId === recommendation.unitId &&
      adapted.recommendation.reasonCode === recommendation.reasonCode,
    `GRADE_${grade}_ADAPTIVE_USES_REAL_EVIDENCE`,
  );
  printPass(`GRADE_${grade}_ON_DEMAND`);
  return {
    grade,
    actor,
    betaActor,
    attemptId: completed.attemptId,
    unitId: completed.unitId,
    unitTitle: completed.unitTitle,
  };
}

function studentCode(userId: string) {
  const code = queryOwnerLocalDatabase(
    requireOwnerLocalConfig(),
    `
      select student_code
      from public.student_profiles
      where user_id = '${userId}';
    `,
  );
  requireCheck(
    /^PLV-[0-9A-F]{12}$/.test(code),
    "PARENT_STUDENT_CODE_LOOKUP",
  );
  return code;
}

async function requestParentConnection(
  parent: Actor,
  student: Actor,
) {
  const response = await postJson(parent, "/api/connections/request", {
    studentCode: studentCode(student.userId),
  });
  collaborationDurations.push(response.durationMs);
  requireCheck(
    response.status === 200 &&
      isRecord(response.payload) &&
      response.payload.ok === true,
    "PARENT_CONNECTION_REQUEST",
  );
  const stateResult = await student.supabase.rpc(
    "get_my_parent_student_connections",
  );
  const state = stateResult.error
    ? null
    : parseConnectionState(stateResult.data);
  const pending = state?.connections.find(
    (connection) => connection.status === "PENDING",
  );
  requireCheck(pending, "PARENT_CONNECTION_PENDING_STATE");
  return pending.connectionId;
}

async function connectionAction(
  actor: Actor,
  connectionId: string,
  action: "APPROVE" | "REJECT" | "REVOKE",
) {
  const response = await postJson(actor, "/api/connections/action", {
    connectionId,
    action,
  });
  collaborationDurations.push(response.durationMs);
  requireCheck(
    response.status === 200 &&
      isRecord(response.payload) &&
      response.payload.ok === true,
    `PARENT_CONNECTION_${action}`,
  );
}

async function verifyProtectedParentPage(
  parent: Actor,
  connectionId: string,
  check: string,
) {
  const page = await request(
    parent,
    `/parent/children/${connectionId}`,
  );
  requireCheck(
    page.status === 200 &&
      page.text.includes("Không thể mở tiến độ này") &&
      !page.text.includes("Lịch sử luyện tập"),
    check,
  );
}

async function verifyParentJourney(students: readonly StudentRecord[]) {
  const parent = await createActor("PARENT", "parent");
  await relogin(parent, "PARENT_AUTH");
  const approvedConnections = new Map<number, string>();
  for (const student of students) {
    const connectionId = await requestParentConnection(
      parent,
      student.actor,
    );
    await connectionAction(student.actor, connectionId, "APPROVE");
    approvedConnections.set(student.grade, connectionId);
    const page = await request(
      parent,
      `/parent/children/${connectionId}`,
    );
    requireCheck(
      page.status === 200 &&
        page.text.includes("Tiến độ học tập") &&
        page.text.includes(student.unitTitle),
      `PARENT_GRADE_${student.grade}_GENERATED_VISIBILITY`,
    );
  }
  const dashboard = await request(parent, "/dashboard");
  requireCheck(
    dashboard.status === 200,
    "PARENT_MULTI_CHILD_DASHBOARD",
  );
  const parentStateResult = await parent.supabase.rpc(
    "get_my_parent_student_connections",
  );
  const parentState = parentStateResult.error
    ? null
    : parseConnectionState(parentStateResult.data);
  requireCheck(
    parentState?.connections.filter(
      (connection) => connection.status === "APPROVED",
    ).length === 9,
    "PARENT_MULTI_CHILD_SWITCH",
  );

  const pendingId = await requestParentConnection(
    parent,
    students[0].betaActor,
  );
  await verifyProtectedParentPage(
    parent,
    pendingId,
    "PARENT_PENDING_DENIED",
  );
  const rejectedId = await requestParentConnection(
    parent,
    students[1].betaActor,
  );
  await connectionAction(
    students[1].betaActor,
    rejectedId,
    "REJECT",
  );
  await verifyProtectedParentPage(
    parent,
    rejectedId,
    "PARENT_REJECTED_DENIED",
  );
  const revokedId = await requestParentConnection(
    parent,
    students[2].betaActor,
  );
  await connectionAction(
    students[2].betaActor,
    revokedId,
    "APPROVE",
  );
  await connectionAction(parent, revokedId, "REVOKE");
  await verifyProtectedParentPage(
    parent,
    revokedId,
    "PARENT_REVOKED_DENIED",
  );
  printPass("PARENT_HTTP_COOKIE_JOURNEY");
  return { parent, approvedConnections };
}

function parseCatalog(value: unknown, grade: number) {
  if (
    !isRecord(value) ||
    typeof value.releaseId !== "string" ||
    value.grade !== grade ||
    !Array.isArray(value.units) ||
    !Array.isArray(value.questions) ||
    value.units.length === 0 ||
    value.questions.length < 2
  ) {
    return null;
  }
  return value as TeacherCurriculumCatalog;
}

function parseDraft(value: unknown, grade: number) {
  if (
    !isRecord(value) ||
    typeof value.draftId !== "string" ||
    value.status !== "DRAFT" ||
    value.grade !== grade ||
    typeof value.classroomId !== "string" ||
    typeof value.snapshotHash !== "string"
  ) {
    return null;
  }
  return value as TeacherCurriculumDraft;
}

async function createTeacherActor() {
  const invitationCode = queryOwnerLocalDatabase(
    requireOwnerLocalConfig(),
    "select private.issue_teacher_invitation(now() + interval '4 hours');",
  );
  requireCheck(
    /^PLV-TCH-[0-9A-F]{32}$/.test(invitationCode),
    "TEACHER_INVITATION_ISSUED",
  );
  issuedTeacherInvitationCode = invitationCode;
  const teacher = await createActor("TEACHER", "teacher");
  const activation = await postJson(teacher, "/api/teacher/activate", {
    fullName: "Giáo viên acceptance",
    invitationCode,
  });
  requireCheck(
    activation.status === 200 &&
      isRecord(activation.payload) &&
      activation.payload.ok === true,
    "TEACHER_INVITATION_ACTIVATED",
  );
  await relogin(teacher, "TEACHER_AUTH");
  return teacher;
}

async function createClassroom(
  teacher: Actor,
  grade: CurriculumGrade,
) {
  const response = await postJson(teacher, "/api/classrooms/create", {
    name: `Lớp ${grade} acceptance`,
    grade,
    requestId: randomUUID(),
  });
  collaborationDurations.push(response.durationMs);
  const classroom = parseCreatedClassroomApiResponse(response.payload);
  requireCheck(
    response.status === 200 && classroom?.grade === grade,
    `TEACHER_GRADE_${grade}_CLASSROOM_CREATE`,
  );
  return classroom;
}

async function approveStudentClassroom(
  teacher: Actor,
  student: Actor,
  classroom: NonNullable<
    ReturnType<typeof parseCreatedClassroomApiResponse>
  >,
) {
  const requestMembership = await postJson(
    student,
    "/api/classrooms/request",
    { classCode: classroom.classCode },
  );
  requireCheck(
    requestMembership.status === 200 &&
      isRecord(requestMembership.payload) &&
      requestMembership.payload.ok === true,
    "TEACHER_CLASSROOM_STUDENT_REQUEST",
  );
  const detailResult = await teacher.supabase.rpc(
    "get_teacher_classroom",
    { p_classroom_id: classroom.classroomId },
  );
  const detail = detailResult.error
    ? null
    : parseTeacherClassroomDetail(detailResult.data);
  const pending = detail?.memberships.find(
    (membership) => membership.status === "PENDING",
  );
  requireCheck(pending, "TEACHER_CLASSROOM_PENDING_ROSTER");
  const approval = await postJson(teacher, "/api/classrooms/action", {
    membershipId: pending.membershipId,
    action: "TEACHER_APPROVE",
  });
  requireCheck(
    approval.status === 200 &&
      isRecord(approval.payload) &&
      approval.payload.ok === true,
    "TEACHER_CLASSROOM_APPROVE",
  );
}

async function publishCurriculumAssignment(
  teacher: Actor,
  grade: CurriculumGrade,
  classroom: NonNullable<
    ReturnType<typeof parseCreatedClassroomApiResponse>
  >,
) {
  const catalogResponse = await request(
    teacher,
    `/api/teacher/curriculum?classroomId=${classroom.classroomId}`,
  );
  const catalog = parseCatalog(
    dataFromPayload(catalogResponse.payload),
    grade,
  );
  requireCheck(
    catalogResponse.status === 200 &&
      catalog &&
      !/correctAnswer|solutionSteps|normalizedCorrectAnswer/.test(
        catalogResponse.text,
      ),
    `TEACHER_GRADE_${grade}_CATALOG_BOUNDARY`,
  );
  const selectionMode =
    grade % 2 === 0 ? ("MANUAL" as const) : ("DETERMINISTIC" as const);
  const selectedQuestions = catalog.questions.slice(0, 2);
  const body = {
    classroomId: classroom.classroomId,
    title: `Bài luyện lớp ${grade}`,
    instructions: "Làm đủ hai câu.",
    dueAt: null,
    selectionMode,
    unitId:
      selectionMode === "DETERMINISTIC"
        ? selectedQuestions[0]?.unitId ?? null
        : null,
    outcomeId: null,
    skillId: null,
    questionIds:
      selectionMode === "MANUAL"
        ? selectedQuestions.map((question) => question.questionId)
        : null,
    questionCount: 2,
    deterministicSeed: `teacher-grade-${grade}-${runTag}`,
    requestId: randomUUID(),
  };
  const draftResponse = await postJson(
    teacher,
    "/api/teacher/curriculum/drafts",
    body,
  );
  const draft = parseDraft(dataFromPayload(draftResponse.payload), grade);
  requireCheck(
    draftResponse.status === 200 &&
      draft?.selectionMode === selectionMode &&
      draft.itemCount === 2,
    `TEACHER_GRADE_${grade}_${selectionMode}_DRAFT`,
  );
  const publishResponse = await postJson(
    teacher,
    "/api/teacher/curriculum/drafts/publish",
    { draftId: draft.draftId, requestId: randomUUID() },
  );
  const published = dataFromPayload(publishResponse.payload);
  requireCheck(
    publishResponse.status === 200 &&
      isRecord(published) &&
      typeof published.assignmentId === "string",
    `TEACHER_GRADE_${grade}_PUBLISH`,
  );
  return published.assignmentId;
}

function assignmentDraftAnswer(
  type: "MULTIPLE_CHOICE" | "NUMBER_INPUT" | "TEXT_INPUT",
) {
  if (type === "MULTIPLE_CHOICE") return "A";
  if (type === "NUMBER_INPUT") return "0";
  return "x";
}

async function completeTeacherAssignment(
  student: Actor,
  assignmentId: string,
  grade: CurriculumGrade,
) {
  const startResponse = await postJson(
    student,
    "/api/assignments/start",
    { assignmentId },
  );
  const started = parseAssignmentStartApiResponse(startResponse.payload);
  requireCheck(
    startResponse.status === 200 && started,
    `STUDENT_GRADE_${grade}_ASSIGNMENT_START`,
  );
  const stateResponse = await postJson(
    student,
    "/api/assignments/state",
    { assignmentId },
  );
  requireCheck(
    !/correctAnswer|solutionSteps|explanation/.test(stateResponse.text),
    `STUDENT_GRADE_${grade}_ASSIGNMENT_SOLUTION_BOUNDARY`,
  );
  const state = parseAssignmentRunnerStateApiResponse(
    stateResponse.payload,
  );
  requireCheck(
    stateResponse.status === 200 &&
      state &&
      state.questions.length === 2,
    `STUDENT_GRADE_${grade}_ASSIGNMENT_STATE`,
  );
  let revision = state.revision;
  for (const question of state.questions) {
    const saveResponse = await postJson(
      student,
      "/api/assignments/draft",
      {
        submissionId: state.submissionId,
        questionId: question.questionId,
        answer: assignmentDraftAnswer(question.questionType),
        expectedRevision: revision,
        idempotencyKey: randomUUID(),
      },
    );
    const saved = parseDraftSaveApiResponse(saveResponse.payload);
    requireCheck(
      saveResponse.status === 200 && saved,
      `STUDENT_GRADE_${grade}_ASSIGNMENT_SAVE`,
    );
    revision = saved.revision;
  }
  const submitResponse = await postJson(
    student,
    "/api/assignments/submit",
    {
      submissionId: state.submissionId,
      expectedRevision: revision,
      idempotencyKey: randomUUID(),
    },
  );
  const submitted = parseAssignmentSubmitApiResponse(
    submitResponse.payload,
  );
  requireCheck(
    submitResponse.status === 200 &&
      submitted?.status === "SUBMITTED" &&
      submitted.totalCount === 2,
    `STUDENT_GRADE_${grade}_ASSIGNMENT_SUBMIT`,
  );
}

async function verifyTeacherJourney(
  students: readonly StudentRecord[],
  parent: Actor,
  approvedConnections: ReadonlyMap<number, string>,
) {
  const teacher = await createTeacherActor();
  for (const student of students) {
    const classroom = await createClassroom(teacher, student.grade);
    await approveStudentClassroom(
      teacher,
      student.actor,
      classroom,
    );
    const assignmentId = await publishCurriculumAssignment(
      teacher,
      student.grade,
      classroom,
    );
    await completeTeacherAssignment(
      student.actor,
      assignmentId,
      student.grade,
    );
    const gradebook = await request(
      teacher,
      `/api/teacher/assignments/${assignmentId}/gradebook.csv`,
    );
    requireCheck(
      gradebook.status === 200 &&
        gradebook.text.includes("Đã nộp"),
      `TEACHER_GRADE_${student.grade}_GRADEBOOK`,
    );
    const teacherPage = await request(
      teacher,
      `/teacher/assignments/${assignmentId}`,
    );
    requireCheck(
      teacherPage.status === 200,
      `TEACHER_GRADE_${student.grade}_ASSIGNMENT_PAGE`,
    );
    const connectionId = approvedConnections.get(student.grade);
    requireCheck(connectionId, "PARENT_APPROVED_CONNECTION_LOOKUP");
    const parentPage = await request(
      parent,
      `/parent/children/${connectionId}`,
    );
    requireCheck(
      parentPage.status === 200 &&
        parentPage.text.includes("Kết quả assignment riêng biệt") &&
        !parentPage.text.includes("Chưa có bài giáo viên giao được làm."),
      `PARENT_GRADE_${student.grade}_ASSIGNMENT_VISIBILITY`,
    );
    printPass(`GRADE_${student.grade}_TEACHER_ASSIGNMENT`);
  }
  printPass("TEACHER_HTTP_COOKIE_JOURNEY");
}

function cleanupSyntheticData() {
  const invitationCleanup = issuedTeacherInvitationCode
    ? `or code_hash = extensions.digest(
        '${issuedTeacherInvitationCode}', 'sha256'
      )`
    : "";
  queryOwnerLocalDatabase(
    requireOwnerLocalConfig(),
    `
      begin;
      create temporary table learning_acceptance_users on commit drop as
      select id, raw_user_meta_data ->> 'role' as role
      from auth.users
      where email like
        'learning-acceptance-${runTag}-%@plave.local.invalid';

      delete from public.curriculum_generated_answers
      where attempt_id in (
        select attempt.id from public.curriculum_attempts as attempt
        join learning_acceptance_users as actor
          on actor.id = attempt.student_id
      );
      delete from private.curriculum_generated_solutions
      where attempt_id in (
        select attempt.id from public.curriculum_attempts as attempt
        join learning_acceptance_users as actor
          on actor.id = attempt.student_id
      );
      delete from public.curriculum_generated_questions
      where attempt_id in (
        select attempt.id from public.curriculum_attempts as attempt
        join learning_acceptance_users as actor
          on actor.id = attempt.student_id
      );
      delete from public.curriculum_answers
      where attempt_id in (
        select attempt.id from public.curriculum_attempts as attempt
        join learning_acceptance_users as actor
          on actor.id = attempt.student_id
      );
      delete from public.student_curriculum_outcome_progress
      where student_id in (select id from learning_acceptance_users);
      delete from public.student_curriculum_skill_progress
      where student_id in (select id from learning_acceptance_users);
      delete from public.student_curriculum_unit_progress
      where student_id in (select id from learning_acceptance_users);
      delete from public.curriculum_attempts
      where student_id in (select id from learning_acceptance_users);

      delete from public.practice_answers
      where attempt_id in (
        select attempt.id from public.practice_attempts as attempt
        where attempt.student_id in (
          select id from learning_acceptance_users
        )
      );
      delete from public.practice_attempts
      where student_id in (select id from learning_acceptance_users);

      delete from public.student_assignment_outcome_progress
      where student_id in (select id from learning_acceptance_users);
      delete from public.student_assignment_skill_progress
      where student_id in (select id from learning_acceptance_users);
      delete from private.assignment_submission_mutations
      where submission_id in (
        select submission.id
        from public.assignment_submissions as submission
        where submission.student_id in (
          select id from learning_acceptance_users
        )
      );
      delete from public.assignment_answers
      where submission_id in (
        select submission.id
        from public.assignment_submissions as submission
        where submission.student_id in (
          select id from learning_acceptance_users
        )
      );
      delete from public.assignment_submissions
      where student_id in (select id from learning_acceptance_users);

      delete from public.teacher_assignment_items
      where assignment_id in (
        select assignment.id
        from public.teacher_assignments as assignment
        where assignment.teacher_id in (
          select id from learning_acceptance_users
        )
      );
      delete from public.teacher_question_solutions
      where question_id in (
        select question.id
        from public.teacher_questions as question
        where question.teacher_id in (
          select id from learning_acceptance_users
        )
      );
      delete from public.teacher_questions
      where teacher_id in (select id from learning_acceptance_users);
      delete from public.teacher_curriculum_assignment_draft_items
      where draft_id in (
        select draft.id
        from public.teacher_curriculum_assignment_drafts as draft
        where draft.teacher_id in (
          select id from learning_acceptance_users
        )
      );

      set local session_replication_role = replica;
      delete from public.teacher_curriculum_assignment_drafts
      where teacher_id in (select id from learning_acceptance_users);
      delete from public.teacher_assignments
      where teacher_id in (select id from learning_acceptance_users);
      delete from public.classroom_memberships
      where student_id in (select id from learning_acceptance_users)
        or classroom_id in (
          select classroom.id
          from public.classrooms as classroom
          where classroom.teacher_id in (
            select id from learning_acceptance_users
          )
        );
      delete from public.classrooms
      where teacher_id in (select id from learning_acceptance_users);
      delete from public.parent_student_connections
      where parent_user_id in (select id from learning_acceptance_users)
        or student_user_id in (select id from learning_acceptance_users);
      delete from public.teacher_profiles
      where user_id in (select id from learning_acceptance_users);
      delete from public.teacher_invitations
      where teacher_user_id in (select id from learning_acceptance_users)
        ${invitationCleanup};
      set local session_replication_role = origin;

      delete from auth.users
      where id in (select id from learning_acceptance_users);
      commit;
    `,
  );
}

function maximum(values: readonly number[]) {
  return values.length > 0 ? Math.max(...values) : 0;
}

function timingValue(serverTiming: string, name: string) {
  const match = new RegExp(
    `(?:^|, )${name};dur=([0-9]+(?:\\.[0-9]+)?)`,
  ).exec(serverTiming);
  return match ? Number(match[1]) : 0;
}

let failedCheck: string | null = null;
let cleanupRequired = false;
try {
  try {
    if (process.argv.includes("--smoke-precondition")) {
      throw new Error("Simulated unavailable app precondition.");
    }
    config = loadOwnerLocalSupabase();
    await assertOwnerLocalDemoPreflight(config);
  } catch {
    throw new AcceptanceFailure("PRECONDITION_APP_NOT_RUNNING");
  }
  cleanupRequired = true;
  printPass("OWNER_LOCAL_PREFLIGHT");

  const students: StudentRecord[] = [];
  for (const grade of grades) {
    students.push(await verifyStudentGrade(grade));
  }
  const parentJourney = await verifyParentJourney(students);
  await verifyTeacherJourney(
    students,
    parentJourney.parent,
    parentJourney.approvedConnections,
  );

  assertBudget(
    maximum(authDurations),
    budgets.authMs,
    "AUTH_MAX_BUDGET",
  );
  assertBudget(
    maximum(warmNavigationDurations),
    budgets.warmNavigationMs,
    "WARM_NAVIGATION_MAX_BUDGET",
  );
  assertBudget(
    maximum(startDurations),
    budgets.startMs,
    "ON_DEMAND_START_MAX_BUDGET",
  );
  assertBudget(
    maximum(submitDurations),
    budgets.submitMs,
    "ON_DEMAND_SUBMIT_MAX_BUDGET",
  );
  assertBudget(
    maximum(collaborationDurations),
    budgets.collaborationMs,
    "COLLABORATION_MAX_BUDGET",
  );

  printLatency("NEXT_DEV_COLD_LEARN_MS", coldLearnDurationMs);
  printLatency(
    "WARM_LEARN_MAX_MS",
    maximum(warmNavigationDurations),
  );
  printLatency("AUTH_ACTION_MAX_MS", maximum(authDurations));
  printLatency("START_ROUND_TRIP_MAX_MS", maximum(startDurations));
  printLatency("SUBMIT_ROUND_TRIP_MAX_MS", maximum(submitDurations));
  printLatency(
    "START_SERVER_TOTAL_MS",
    timingValue(representativeStartTiming, "total"),
  );
  printLatency(
    "START_SUPABASE_RPC_MS",
    timingValue(representativeStartTiming, "rpc"),
  );
  printLatency(
    "START_GENERATION_MS",
    timingValue(representativeStartTiming, "generation"),
  );
  printPass("LEARNING_PRODUCT_LOCAL_ACCEPTANCE");
} catch (error) {
  failedCheck =
    error instanceof AcceptanceFailure
      ? error.check
      : "UNCLASSIFIED_FAILURE";
} finally {
  if (!cleanupRequired) {
    printPass("SYNTHETIC_CLEANUP_NOT_REQUIRED");
  } else {
    try {
      cleanupSyntheticData();
      printPass("SYNTHETIC_CLEANUP");
    } catch {
      failedCheck ??= "SYNTHETIC_CLEANUP";
    }
  }
}

if (failedCheck) {
  process.stderr.write(
    `ACCEPTANCE_CHECK ${safeCheckName(failedCheck)}=FAIL\n`,
  );
  process.exitCode = 1;
}
}
