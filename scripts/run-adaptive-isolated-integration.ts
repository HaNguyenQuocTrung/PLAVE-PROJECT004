import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import {
  createFrozenAdaptiveQuestionBank,
  startOrResumeAdaptiveAttempt,
} from "../lib/content-engine/adaptive-runtime.ts";

const expectedProjectId = "plave-6gb-isolated-20260729-a";
const expectedPort = "57322";
const studentA = "10000000-0000-4000-8000-000000000001";
const studentB = "10000000-0000-4000-8000-000000000002";
const parent = "10000000-0000-4000-8000-000000000003";
const teacher = "10000000-0000-4000-8000-000000000004";
const unitSlug = "grade-2-numbers-to-1000";
const workdir = process.env.SUPABASE_ISOLATED_WORKDIR ?? "";

function fail(message: string): never {
  throw new Error(message);
}

function parseEnvOutput(output: string) {
  const values = new Map<string, string>();
  for (const line of output.split("\n")) {
    const match = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (!match?.[1] || match[2] === undefined) continue;
    const raw = match[2];
    values.set(
      match[1],
      raw.startsWith('"') && raw.endsWith('"')
        ? raw.slice(1, -1)
        : raw,
    );
  }
  return values;
}

if (
  !workdir.startsWith("/tmp/plave-6gb-isolated.") ||
  !readFileSync(`${workdir}/supabase/config.toml`, "utf8").includes(
    `project_id = "${expectedProjectId}"`,
  )
) {
  fail("Isolated workdir/project ID không hợp lệ.");
}

const statusResult = spawnSync(
  "supabase",
  ["status", "--workdir", workdir, "-o", "env"],
  { encoding: "utf8", maxBuffer: 1024 * 1024 },
);
if (statusResult.status !== 0) fail("Không đọc được local status.");
const localEnv = parseEnvOutput(statusResult.stdout);
const apiUrl = localEnv.get("API_URL") ?? "";
const dbUrlText = localEnv.get("DB_URL") ?? "";
const anonKey = localEnv.get("ANON_KEY") ?? "";
const jwtSecret = localEnv.get("JWT_SECRET") ?? "";
const dbUrl = new URL(dbUrlText);
if (
  apiUrl !== "http://127.0.0.1:57321" ||
  dbUrl.hostname !== "127.0.0.1" ||
  dbUrl.port !== expectedPort ||
  dbUrl.pathname !== "/postgres" ||
  anonKey.length < 20 ||
  jwtSecret.length < 20
) {
  fail("Local endpoint/credential contract không hợp lệ.");
}

const psqlEnvironment = {
  ...process.env,
  PGHOST: dbUrl.hostname,
  PGPORT: dbUrl.port,
  PGDATABASE: dbUrl.pathname.slice(1),
  PGUSER: decodeURIComponent(dbUrl.username),
  PGPASSWORD: decodeURIComponent(dbUrl.password),
};

function sql(query: string) {
  const result = spawnSync(
    "psql",
    ["-X", "-v", "ON_ERROR_STOP=1", "-At"],
    {
      input: query,
      encoding: "utf8",
      env: psqlEnvironment,
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    fail("Local fixture/admin SQL thất bại.");
  }
  return result.stdout.trim();
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("=", "")
    .replaceAll("+", "-")
    .replaceAll("/", "_");
}

function createUserToken(userId: string) {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64Url(
    JSON.stringify({
      aud: "authenticated",
      exp: now + 3600,
      iat: now - 10,
      role: "authenticated",
      sub: userId,
    }),
  );
  const signature = base64Url(
    createHmac("sha256", jwtSecret)
      .update(`${header}.${payload}`)
      .digest(),
  );
  return `${header}.${payload}.${signature}`;
}

type RestResult = Readonly<{
  status: number;
  body: unknown;
  elapsedMs: number;
}>;

const requestLatencies: number[] = [];

async function rest(
  path: string,
  token: string,
  method = "POST",
  body?: unknown,
): Promise<RestResult> {
  const started = performance.now();
  const response = await fetch(`${apiUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const elapsedMs = performance.now() - started;
  requestLatencies.push(elapsedMs);
  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      fail("PostgREST trả payload không phải JSON.");
    }
  }
  return { status: response.status, body: parsed, elapsedMs };
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail("RPC response không phải object.");
  }
  return value as Record<string, unknown>;
}

function expectAdaptiveError(result: RestResult, code: string) {
  assert.ok(result.status >= 400 && result.status < 500);
  const body = record(result.body);
  assert.equal(body.message, `ADAPTIVE:${code}`);
  const serialized = JSON.stringify(body);
  assert.doesNotMatch(
    serialized,
    /question_solutions|relation |schema |SQL statement|CONTEXT:/i,
  );
}

function uuid(index: number, prefix = "20000000") {
  return `${prefix}-0000-4000-8000-${index
    .toString()
    .padStart(12, "0")}`;
}

const fixtureSql = readFileSync(
  new URL("../tests/fixtures/adaptive-local-users.sql", import.meta.url),
  "utf8",
);
sql(fixtureSql);
assert.equal(
  sql(
    "select count(*) from public.student_profiles where user_id in " +
      "('10000000-0000-4000-8000-000000000001'," +
      "'10000000-0000-4000-8000-000000000002');",
  ),
  "2",
);

const tokens = {
  anon: anonKey,
  studentA: createUserToken(studentA),
  studentB: createUserToken(studentB),
  parent: createUserToken(parent),
  teacher: createUserToken(teacher),
};

const hiddenStart = await rest(
  "rpc/start_or_resume_adaptive_practice",
  tokens.studentA,
  "POST",
  {
    p_unit_slug: unitSlug,
    p_idempotency_key: uuid(1),
  },
);
expectAdaptiveError(hiddenStart, "UNIT_NOT_AVAILABLE");

const anonStart = await rest(
  "rpc/start_or_resume_adaptive_practice",
  tokens.anon,
  "POST",
  {
    p_unit_slug: unitSlug,
    p_idempotency_key: uuid(2),
  },
);
assert.ok(anonStart.status === 401 || anonStart.status === 403);

for (const token of [tokens.parent, tokens.teacher]) {
  const denied = await rest(
    "rpc/start_or_resume_adaptive_practice",
    token,
    "POST",
    {
      p_unit_slug: unitSlug,
      p_idempotency_key: uuid(3),
    },
  );
  expectAdaptiveError(denied, "FORBIDDEN");
}

for (const [path, method, body] of [
  ["adaptive_practice_attempts?select=*", "GET", undefined],
  [
    "adaptive_practice_attempts",
    "POST",
    { student_id: studentA, unit_slug: unitSlug },
  ],
  ["question_solutions?select=*", "GET", undefined],
  [
    "rpc/plan_adaptive_practice_transition",
    "POST",
    { p_attempt_id: uuid(99) },
  ],
] as const) {
  const denied = await rest(path, tokens.studentA, method, body);
  assert.ok(denied.status === 401 || denied.status === 403 || denied.status === 404);
}

sql(`
  update public.learning_units
  set published = true
  where slug = '${unitSlug}';
  update public.questions
  set published = true
  where unit_slug = '${unitSlug}';
  update public.adaptive_practice_releases
  set
    runtime_enabled = true,
    controlled_pilot_enabled = true,
    publication_status = 'PUBLISHED',
    student_visibility = 'VISIBLE'
  where unit_slug = '${unitSlug}';
`);

for (const token of [tokens.parent, tokens.teacher]) {
  const denied = await rest(
    "rpc/start_or_resume_adaptive_practice",
    token,
    "POST",
    {
      p_unit_slug: unitSlug,
      p_idempotency_key: uuid(4),
    },
  );
  expectAdaptiveError(denied, "FORBIDDEN");
}

const startKey = uuid(10);
const sameKeyStarts = await Promise.all(
  Array.from({ length: 8 }, () =>
    rest(
      "rpc/start_or_resume_adaptive_practice",
      tokens.studentA,
      "POST",
      {
        p_unit_slug: unitSlug,
        p_idempotency_key: startKey,
      },
    ),
  ),
);
assert.ok(sameKeyStarts.every((result) => result.status === 200));
const startBodies = sameKeyStarts.map((result) => record(result.body));
const attemptIds = new Set(startBodies.map((body) => body.attempt_id));
assert.equal(attemptIds.size, 1);
const attemptId = String(startBodies[0]?.attempt_id);
const startBody = startBodies[0] ?? fail("Thiếu start response.");
assert.equal(startBody.revision, 1);
assert.equal(startBody.answered_count, 0);
assert.equal(startBody.status, "IN_PROGRESS");
assert.equal(startBody.feedback, null);
assert.ok(startBody.current_question);
assert.doesNotMatch(
  JSON.stringify(startBody),
  /correct_answer|solution_steps|audit_source|future_question|mastery_threshold/i,
);

const differentKeyStarts = await Promise.all(
  Array.from({ length: 4 }, (_, index) =>
    rest(
      "rpc/start_or_resume_adaptive_practice",
      tokens.studentA,
      "POST",
      {
        p_unit_slug: unitSlug,
        p_idempotency_key: uuid(20 + index),
      },
    ),
  ),
);
assert.ok(differentKeyStarts.every((result) => result.status === 200));
assert.ok(
  differentKeyStarts.every(
    (result) => record(result.body).attempt_id === attemptId,
  ),
);
assert.equal(
  sql(
    `select count(*) from public.adaptive_practice_attempts ` +
      `where student_id='${studentA}' and status in ('STARTED','IN_PROGRESS');`,
  ),
  "1",
);

const resumed = await rest(
  "rpc/get_adaptive_practice_state",
  tokens.studentA,
  "POST",
  { p_attempt_id: attemptId },
);
assert.equal(resumed.status, 200);
assert.deepEqual(resumed.body, startBody);

const bank = createFrozenAdaptiveQuestionBank();
const expectedStarted = startOrResumeAdaptiveAttempt(bank, {
  attemptId,
  ownerId: studentA,
  plannerSeed: attemptId,
  now: "2026-07-29T00:00:00.000Z",
  existing: null,
});
const current = record(startBody.current_question);
assert.equal(
  current.question_id,
  expectedStarted.state.currentQuestionId,
);

const forbiddenState = await rest(
  "rpc/get_adaptive_practice_state",
  tokens.studentB,
  "POST",
  { p_attempt_id: attemptId },
);
expectAdaptiveError(forbiddenState, "ATTEMPT_NOT_FOUND");

function solutionFor(questionId: string) {
  const solution = bank.serverSolutions.find(
    (candidate) => candidate.questionId === questionId,
  );
  if (!solution) fail("Thiếu frozen solution mapping.");
  return solution;
}

function differentValidAnswer(questionId: string, correctAnswer: string) {
  const question = bank.publicQuestions.find(
    (candidate) => candidate.questionId === questionId,
  );
  if (!question) fail("Thiếu frozen public question mapping.");
  if (question.answerType === "NUMBER_INPUT") {
    return correctAnswer === "0" ? "1" : "0";
  }
  return correctAnswer === "A" ? "B" : "A";
}

let state = startBody;
const firstQuestionId = String(
  record(state.current_question).question_id,
);
const firstSolution = solutionFor(firstQuestionId);
const sameSubmitKey = uuid(100);
const sameSubmits = await Promise.all(
  Array.from({ length: 6 }, () =>
    rest(
      "rpc/submit_adaptive_practice_answer",
      tokens.studentA,
      "POST",
      {
        p_attempt_id: attemptId,
        p_question_id: firstQuestionId,
        p_answer: firstSolution.correctAnswer,
        p_expected_revision: 1,
        p_idempotency_key: sameSubmitKey,
      },
    ),
  ),
);
assert.ok(sameSubmits.every((result) => result.status === 200));
assert.ok(
  sameSubmits.every(
    (result) => record(result.body).revision === 2,
  ),
);
assert.equal(
  sql(
    `select count(*) from public.adaptive_practice_answers ` +
      `where attempt_id='${attemptId}';`,
  ),
  "1",
);
state = record(sameSubmits[0]?.body);
const feedback = record(state.feedback);
assert.deepEqual(
  Object.keys(feedback).sort(),
  [
    "correct_answer",
    "explanation",
    "hint",
    "is_correct",
    "question_id",
    "solution_steps",
  ],
);

const reusedKey = await rest(
  "rpc/submit_adaptive_practice_answer",
  tokens.studentA,
  "POST",
  {
    p_attempt_id: attemptId,
    p_question_id: firstQuestionId,
    p_answer: differentValidAnswer(
      firstQuestionId,
      firstSolution.correctAnswer,
    ),
    p_expected_revision: 1,
    p_idempotency_key: sameSubmitKey,
  },
);
expectAdaptiveError(reusedKey, "DUPLICATE_SUBMISSION");

const secondQuestionId = String(
  record(state.current_question).question_id,
);
const secondSolution = solutionFor(secondQuestionId);
const competing = await Promise.all([
  rest(
    "rpc/submit_adaptive_practice_answer",
    tokens.studentA,
    "POST",
    {
      p_attempt_id: attemptId,
      p_question_id: secondQuestionId,
      p_answer: secondSolution.correctAnswer,
      p_expected_revision: 2,
      p_idempotency_key: uuid(101),
    },
  ),
  rest(
    "rpc/submit_adaptive_practice_answer",
    tokens.studentA,
    "POST",
    {
      p_attempt_id: attemptId,
      p_question_id: secondQuestionId,
      p_answer: secondSolution.correctAnswer,
      p_expected_revision: 2,
      p_idempotency_key: uuid(102),
    },
  ),
]);
assert.equal(competing.filter((result) => result.status === 200).length, 1);
const loser = competing.find((result) => result.status !== 200);
if (!loser) fail("Concurrent submit phải có một request thua.");
expectAdaptiveError(loser, "REVISION_CONFLICT");
state = record(
  competing.find((result) => result.status === 200)?.body,
);
assert.equal(state.revision, 3);
assert.equal(state.answered_count, 2);
assert.equal(
  sql(
    `select count(*) from public.adaptive_practice_answers ` +
      `where attempt_id='${attemptId}';`,
  ),
  "2",
);

const currentQuestionId = String(
  record(state.current_question).question_id,
);
const mismatchQuestion = bank.publicQuestions.find(
  (question) => question.questionId !== currentQuestionId,
);
if (!mismatchQuestion) fail("Thiếu mismatch fixture.");
const mismatch = await rest(
  "rpc/submit_adaptive_practice_answer",
  tokens.studentA,
  "POST",
  {
    p_attempt_id: attemptId,
    p_question_id: mismatchQuestion.questionId,
    p_answer: solutionFor(mismatchQuestion.questionId).correctAnswer,
    p_expected_revision: Number(state.revision),
    p_idempotency_key: uuid(103),
  },
);
expectAdaptiveError(mismatch, "QUESTION_MISMATCH");

const malformed = await rest(
  "rpc/submit_adaptive_practice_answer",
  tokens.studentA,
  "POST",
  {
    p_attempt_id: attemptId,
    p_question_id: currentQuestionId,
    p_answer: "không-phải-số-hay-đáp-án",
    p_expected_revision: Number(state.revision),
    p_idempotency_key: uuid(104),
  },
);
expectAdaptiveError(malformed, "INVALID_ANSWER");

const wrongOwner = await rest(
  "rpc/submit_adaptive_practice_answer",
  tokens.studentB,
  "POST",
  {
    p_attempt_id: attemptId,
    p_question_id: currentQuestionId,
    p_answer: solutionFor(currentQuestionId).correctAnswer,
    p_expected_revision: Number(state.revision),
    p_idempotency_key: uuid(105),
  },
);
expectAdaptiveError(wrongOwner, "ATTEMPT_NOT_FOUND");

const beforeRollback = sql(
  `select revision || '/' || answered_count || '/' || ` +
    `(select count(*) from public.adaptive_practice_answers ` +
    `where attempt_id='${attemptId}') ` +
    `from public.adaptive_practice_attempts where id='${attemptId}';`,
);
sql(`
  create function private.test_fail_adaptive_update()
  returns trigger language plpgsql set search_path = '' as $$
  begin
    raise exception 'fixture forced rollback';
  end;
  $$;
  create trigger test_fail_adaptive_update
  before update on public.adaptive_practice_attempts
  for each row execute function private.test_fail_adaptive_update();
`);
const forcedRollback = await rest(
  "rpc/submit_adaptive_practice_answer",
  tokens.studentA,
  "POST",
  {
    p_attempt_id: attemptId,
    p_question_id: currentQuestionId,
    p_answer: solutionFor(currentQuestionId).correctAnswer,
    p_expected_revision: Number(state.revision),
    p_idempotency_key: uuid(106),
  },
);
expectAdaptiveError(forcedRollback, "INTEGRITY_FAILURE");
sql(`
  drop trigger test_fail_adaptive_update
    on public.adaptive_practice_attempts;
  drop function private.test_fail_adaptive_update();
`);
assert.equal(
  sql(
    `select revision || '/' || answered_count || '/' || ` +
      `(select count(*) from public.adaptive_practice_answers ` +
      `where attempt_id='${attemptId}') ` +
      `from public.adaptive_practice_attempts where id='${attemptId}';`,
  ),
  beforeRollback,
);

while (state.status === "IN_PROGRESS") {
  const questionId = String(record(state.current_question).question_id);
  const result = await rest(
    "rpc/submit_adaptive_practice_answer",
    tokens.studentA,
    "POST",
    {
      p_attempt_id: attemptId,
      p_question_id: questionId,
      p_answer: solutionFor(questionId).correctAnswer,
      p_expected_revision: Number(state.revision),
      p_idempotency_key: uuid(200 + Number(state.answered_count)),
    },
  );
  assert.equal(result.status, 200);
  state = record(result.body);
}
assert.equal(state.status, "MASTERED_EARLY");
assert.equal(state.answered_count, 12);
assert.equal(state.current_question, null);

const terminalSubmit = await rest(
  "rpc/submit_adaptive_practice_answer",
  tokens.studentA,
  "POST",
  {
    p_attempt_id: attemptId,
    p_question_id: firstQuestionId,
    p_answer: firstSolution.correctAnswer,
    p_expected_revision: Number(state.revision),
    p_idempotency_key: uuid(300),
  },
);
expectAdaptiveError(terminalSubmit, "ATTEMPT_NOT_ACTIVE");

const startB = await rest(
  "rpc/start_or_resume_adaptive_practice",
  tokens.studentB,
  "POST",
  {
    p_unit_slug: unitSlug,
    p_idempotency_key: uuid(400),
  },
);
assert.equal(startB.status, 200);
const stateB = record(startB.body);
const attemptB = String(stateB.attempt_id);
sql(`
  update public.learning_units
  set published = false
  where slug = '${unitSlug}';
  update public.questions
  set published = false
  where unit_slug = '${unitSlug}';
  update public.adaptive_practice_releases
  set
    runtime_enabled = false,
    controlled_pilot_enabled = false,
    retention_runtime_enabled = false,
    publication_status = 'DRAFT',
    student_visibility = 'HIDDEN'
  where unit_slug = '${unitSlug}';
`);
const blockedNewStart = await rest(
  "rpc/start_or_resume_adaptive_practice",
  tokens.studentA,
  "POST",
  {
    p_unit_slug: unitSlug,
    p_idempotency_key: uuid(401),
  },
);
expectAdaptiveError(blockedNewStart, "UNIT_NOT_AVAILABLE");

const resumeAfterOff = await rest(
  "rpc/get_adaptive_practice_state",
  tokens.studentB,
  "POST",
  { p_attempt_id: attemptB },
);
assert.equal(resumeAfterOff.status, 200);
assert.equal(record(resumeAfterOff.body).attempt_id, attemptB);
const questionB = String(record(stateB.current_question).question_id);
const submitAfterOff = await rest(
  "rpc/submit_adaptive_practice_answer",
  tokens.studentB,
  "POST",
  {
    p_attempt_id: attemptB,
    p_question_id: questionB,
    p_answer: solutionFor(questionB).correctAnswer,
    p_expected_revision: Number(stateB.revision),
    p_idempotency_key: uuid(402),
  },
);
expectAdaptiveError(submitAfterOff, "CONTENT_VERSION_MISMATCH");
assert.equal(
  sql(
    `select count(*) from public.adaptive_practice_answers ` +
      `where attempt_id='${attemptB}';`,
  ),
  "0",
);

const sortedLatencies = [...requestLatencies].sort((a, b) => a - b);
const percentile = (fraction: number) =>
  sortedLatencies[
    Math.min(
      sortedLatencies.length - 1,
      Math.ceil(sortedLatencies.length * fraction) - 1,
    )
  ] ?? 0;
const deadlocks = sql(
  "select deadlocks from pg_stat_database where datname=current_database();",
);
const activeCount = sql(
  "select count(*) from public.adaptive_practice_attempts;",
);
const answerCount = sql(
  "select count(*) from public.adaptive_practice_answers;",
);

console.log(
  JSON.stringify(
    {
      status: "PASS",
      target: {
        projectId: expectedProjectId,
        host: dbUrl.hostname,
        port: Number(dbUrl.port),
        database: dbUrl.pathname.slice(1),
      },
      fixtures: {
        students: 2,
        parent: 1,
        teacher: 1,
        realUserData: false,
      },
      rlsAndPrivilegeChecks: "PASS",
      hiddenActivationBoundary: "PASS",
      startConcurrencyClients: 8,
      submitConcurrencyClients: 6,
      rollbackCheck: "PASS",
      terminalGuard: "PASS",
      attemptsCreated: Number(activeCount),
      answersCreated: Number(answerCount),
      performance: {
        requests: requestLatencies.length,
        medianMs: Number(percentile(0.5).toFixed(2)),
        p95Ms: Number(percentile(0.95).toFixed(2)),
        deadlocks: Number(deadlocks),
      },
    },
    null,
    2,
  ),
);
