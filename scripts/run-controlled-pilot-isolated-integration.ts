import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { createFrozenAdaptiveQuestionBank } from "../lib/content-engine/adaptive-runtime.ts";

const expectedProjectId = "plave-6j-isolated-20260730";
const expectedWorkdirPrefix = "/tmp/plave-6j-isolated.";
const expectedApiUrl = "http://127.0.0.1:58321";
const expectedDbPort = "58322";
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
  !workdir.startsWith(expectedWorkdirPrefix) ||
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
const dbUrl = new URL(localEnv.get("DB_URL") ?? "");
const anonKey = localEnv.get("ANON_KEY") ?? "";
const jwtSecret = localEnv.get("JWT_SECRET") ?? "";
if (
  apiUrl !== expectedApiUrl ||
  dbUrl.hostname !== "127.0.0.1" ||
  dbUrl.port !== expectedDbPort ||
  dbUrl.pathname !== "/postgres" ||
  anonKey.length < 20 ||
  jwtSecret.length < 20
) {
  fail("Local endpoint contract không hợp lệ.");
}

const psqlEnvironment = {
  ...process.env,
  PGHOST: dbUrl.hostname,
  PGPORT: dbUrl.port,
  PGDATABASE: dbUrl.pathname.slice(1),
  PGUSER: decodeURIComponent(dbUrl.username),
  PGPASSWORD: decodeURIComponent(dbUrl.password),
};

function sql(query: string, expectSuccess = true) {
  const result = spawnSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-At"], {
    input: query,
    encoding: "utf8",
    env: psqlEnvironment,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (expectSuccess && result.status !== 0) {
    fail("Local fixture/admin SQL thất bại.");
  }
  if (!expectSuccess && result.status === 0) {
    fail("SQL được kỳ vọng fail nhưng đã thành công.");
  }
  return {
    ok: result.status === 0,
    stdout: result.stdout.trim(),
  };
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

type RestResult = Readonly<{ status: number; body: unknown }>;

async function rest(
  path: string,
  token: string,
  body?: unknown,
  method = "POST",
): Promise<RestResult> {
  const response = await fetch(`${apiUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      fail("PostgREST trả payload không phải JSON.");
    }
  }
  return { status: response.status, body: parsed };
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("RPC response không phải object.");
  }
  return value as Record<string, unknown>;
}

function expectAdaptiveError(result: RestResult, code: string) {
  assert.ok(result.status >= 400 && result.status < 500);
  const body = record(result.body);
  assert.equal(body.message, `ADAPTIVE:${code}`);
  assert.doesNotMatch(
    JSON.stringify(body),
    /question_solutions|relation |schema |CONTEXT:|SQL statement/i,
  );
}

function uuid(index: number, prefix = "60000000") {
  return `${prefix}-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

const fixtureSql = readFileSync(
  new URL("../tests/fixtures/adaptive-local-users.sql", import.meta.url),
  "utf8",
);
sql(fixtureSql);

const activationSql = readFileSync(
  new URL(
    "../supabase/operations/grade2-controlled-pilot/ACTIVATE_G2_NUMBERS_CONTROLLED_PILOT.sql",
    import.meta.url,
  ),
  "utf8",
);
const deactivationSql = readFileSync(
  new URL(
    "../supabase/operations/grade2-controlled-pilot/DEACTIVATE_G2_NUMBERS_CONTROLLED_PILOT.sql",
    import.meta.url,
  ),
  "utf8",
);

assert.equal(
  sql(
    "select count(*) from public.learning_units where grade=1 and published;" +
      "select count(*) from public.questions q join public.learning_units u " +
      "on u.slug=q.unit_slug where u.grade=1 and q.published;" +
      "select count(*) from public.question_solutions s join public.questions q " +
      "on q.code=s.question_id join public.learning_units u " +
      "on u.slug=q.unit_slug where u.grade=1;",
  ).stdout,
  "13\n312\n312",
);

const failedActivation = sql(activationSql, false);
assert.equal(failedActivation.ok, false);
assert.equal(
  sql(
    `select runtime_enabled::text || '/' || ` +
      `controlled_pilot_enabled::text from ` +
      `public.adaptive_practice_releases where unit_slug='${unitSlug}';`,
  ).stdout,
  "false/false",
);

sql(`
  insert into public.adaptive_practice_pilot_members (
    student_id,
    unit_slug,
    release_candidate_id,
    content_version,
    bundle_sha256,
    policy_version
  ) values (
    '${studentA}',
    '${unitSlug}',
    'g2-numbers-to-1000-rc1',
    'g2n1000-1.0.0-rc.1',
    '1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530',
    'g2n1000-adaptive-policy-1.0.0-pilot'
  );
`);
sql(activationSql);

const tokens = {
  anon: anonKey,
  studentA: createUserToken(studentA),
  studentB: createUserToken(studentB),
  parent: createUserToken(parent),
  teacher: createUserToken(teacher),
};

const availability = await rest(
  "rpc/get_adaptive_controlled_pilot_availability",
  tokens.studentA,
  { p_unit_slug: unitSlug },
);
assert.equal(availability.status, 200);
const availabilityBody = record(availability.body);
assert.deepEqual(Object.keys(availabilityBody).sort(), [
  "available",
  "bundle_sha256",
  "content_version",
  "policy_version",
  "release_candidate_id",
  "unit_slug",
]);
assert.equal(availabilityBody.available, true);

for (const [token, expected] of [
  [tokens.studentB, "UNIT_NOT_AVAILABLE"],
  [tokens.parent, "UNIT_NOT_AVAILABLE"],
  [tokens.teacher, "UNIT_NOT_AVAILABLE"],
] as const) {
  expectAdaptiveError(
    await rest(
      "rpc/get_adaptive_controlled_pilot_availability",
      token,
      { p_unit_slug: unitSlug },
    ),
    expected,
  );
}
const anonymousAvailability = await rest(
  "rpc/get_adaptive_controlled_pilot_availability",
  tokens.anon,
  { p_unit_slug: unitSlug },
);
assert.ok(
  anonymousAvailability.status === 401 ||
    anonymousAvailability.status === 403,
);

const directMembershipRead = await rest(
  "adaptive_practice_pilot_members?select=*",
  tokens.studentA,
  undefined,
  "GET",
);
assert.ok(
  directMembershipRead.status === 401 ||
    directMembershipRead.status === 403,
);

const ineligibleStart = await rest(
  "rpc/start_or_resume_adaptive_practice",
  tokens.studentB,
  { p_unit_slug: unitSlug, p_idempotency_key: uuid(1) },
);
expectAdaptiveError(ineligibleStart, "UNIT_NOT_AVAILABLE");

for (const token of [tokens.parent, tokens.teacher]) {
  expectAdaptiveError(
    await rest("rpc/start_or_resume_adaptive_practice", token, {
      p_unit_slug: unitSlug,
      p_idempotency_key: uuid(2),
    }),
    "FORBIDDEN",
  );
}

const startKey = uuid(10);
const starts = await Promise.all(
  Array.from({ length: 6 }, () =>
    rest("rpc/start_or_resume_adaptive_practice", tokens.studentA, {
      p_unit_slug: unitSlug,
      p_idempotency_key: startKey,
    }),
  ),
);
assert.ok(starts.every((result) => result.status === 200));
const startedBodies = starts.map((result) => record(result.body));
assert.equal(
  new Set(startedBodies.map((body) => body.attempt_id)).size,
  1,
);

const bank = createFrozenAdaptiveQuestionBank();
function solutionFor(questionId: string) {
  const solution = bank.serverSolutions.find(
    (candidate) => candidate.questionId === questionId,
  );
  if (!solution) fail("Thiếu frozen solution.");
  return solution;
}
function wrongAnswer(questionId: string, correctAnswer: string) {
  const question = bank.publicQuestions.find(
    (candidate) => candidate.questionId === questionId,
  );
  if (!question) fail("Thiếu frozen question.");
  if (question.answerType === "NUMBER_INPUT") {
    return correctAnswer === "0" ? "1" : "0";
  }
  return correctAnswer === "A" ? "B" : "A";
}

let masteredState = startedBodies[0] ?? fail("Thiếu start state.");
const firstQuestion = record(masteredState.current_question);
const firstQuestionId = String(firstQuestion.question_id);
const firstSolution = solutionFor(firstQuestionId);
const duplicateKey = uuid(100);
const duplicateSubmits = await Promise.all(
  Array.from({ length: 4 }, () =>
    rest("rpc/submit_adaptive_practice_answer", tokens.studentA, {
      p_attempt_id: masteredState.attempt_id,
      p_question_id: firstQuestionId,
      p_answer: firstSolution.correctAnswer,
      p_expected_revision: masteredState.revision,
      p_idempotency_key: duplicateKey,
    }),
  ),
);
assert.ok(duplicateSubmits.every((result) => result.status === 200));
masteredState = record(duplicateSubmits[0]?.body);
assert.equal(masteredState.answered_count, 1);

const conflictQuestion = record(masteredState.current_question);
const conflictQuestionId = String(conflictQuestion.question_id);
const conflictSolution = solutionFor(conflictQuestionId);
const conflictResults = await Promise.all([
  rest("rpc/submit_adaptive_practice_answer", tokens.studentA, {
    p_attempt_id: masteredState.attempt_id,
    p_question_id: conflictQuestionId,
    p_answer: conflictSolution.correctAnswer,
    p_expected_revision: masteredState.revision,
    p_idempotency_key: uuid(101),
  }),
  rest("rpc/submit_adaptive_practice_answer", tokens.studentA, {
    p_attempt_id: masteredState.attempt_id,
    p_question_id: conflictQuestionId,
    p_answer: conflictSolution.correctAnswer,
    p_expected_revision: masteredState.revision,
    p_idempotency_key: uuid(102),
  }),
]);
assert.equal(conflictResults.filter((result) => result.status === 200).length, 1);
expectAdaptiveError(
  conflictResults.find((result) => result.status !== 200) ??
    fail("Thiếu CAS conflict."),
  "REVISION_CONFLICT",
);
masteredState = record(
  conflictResults.find((result) => result.status === 200)?.body,
);

while (masteredState.status === "IN_PROGRESS") {
  const current = record(masteredState.current_question);
  const questionId = String(current.question_id);
  const result = await rest(
    "rpc/submit_adaptive_practice_answer",
    tokens.studentA,
    {
      p_attempt_id: masteredState.attempt_id,
      p_question_id: questionId,
      p_answer: solutionFor(questionId).correctAnswer,
      p_expected_revision: masteredState.revision,
      p_idempotency_key: uuid(200 + Number(masteredState.answered_count)),
    },
  );
  assert.equal(result.status, 200);
  masteredState = record(result.body);
}
assert.equal(masteredState.status, "MASTERED_EARLY");
assert.equal(masteredState.answered_count, 12);

const remediationStart = await rest(
  "rpc/start_or_resume_adaptive_practice",
  tokens.studentA,
  { p_unit_slug: unitSlug, p_idempotency_key: uuid(400) },
);
assert.equal(remediationStart.status, 200);
let remediationState = record(remediationStart.body);
while (remediationState.status === "IN_PROGRESS") {
  const current = record(remediationState.current_question);
  const questionId = String(current.question_id);
  const solution = solutionFor(questionId);
  const result = await rest(
    "rpc/submit_adaptive_practice_answer",
    tokens.studentA,
    {
      p_attempt_id: remediationState.attempt_id,
      p_question_id: questionId,
      p_answer: wrongAnswer(questionId, solution.correctAnswer),
      p_expected_revision: remediationState.revision,
      p_idempotency_key: uuid(
        500 + Number(remediationState.answered_count),
      ),
    },
  );
  assert.equal(result.status, 200);
  remediationState = record(result.body);
}
assert.equal(remediationState.status, "REMEDIATION_REQUIRED");
assert.equal(remediationState.answered_count, 24);

const syntheticAttemptId = uuid(900);
sql(`
  insert into public.adaptive_practice_attempts (
    id, student_id, unit_slug, start_idempotency_key,
    release_candidate_id, content_version, bundle_sha256,
    policy_version, planner_seed, status, revision,
    current_question_id, answered_count, correct_count,
    min_questions, max_questions, required_skill_ids,
    minimum_evidence_per_skill, mastery_threshold,
    recent_correct_requirement
  )
  select
    '${syntheticAttemptId}', '${studentA}', '${unitSlug}', '${uuid(901)}',
    release.release_candidate_id, release.content_version,
    release.bundle_sha256, release.policy_version, 'max-reached-fixture',
    'IN_PROGRESS', 24, min(question.code), 23, 23,
    release.min_questions, release.max_questions,
    release.required_skill_ids, release.minimum_evidence_per_skill,
    release.mastery_threshold, release.recent_correct_requirement
  from public.adaptive_practice_releases as release
  join public.questions as question on question.unit_slug=release.unit_slug
  where release.unit_slug='${unitSlug}'
  group by release.release_candidate_id, release.content_version,
    release.bundle_sha256, release.policy_version, release.min_questions,
    release.max_questions, release.required_skill_ids,
    release.minimum_evidence_per_skill, release.mastery_threshold,
    release.recent_correct_requirement;
  insert into public.adaptive_practice_answers (
    attempt_id, question_id, submission_id, evidence_sequence,
    normalized_answer, is_correct
  )
  select
    '${syntheticAttemptId}', question.code,
    (
      '70000000-0000-4000-8000-' ||
      lpad(question.display_order::text, 12, '0')
    )::uuid,
    question.display_order,
    case
      when question.question_type='MULTIPLE_CHOICE' then 'A'
      else '0'
    end,
    true
  from public.questions as question
  where question.unit_slug='${unitSlug}';
`);
const maxDecision = JSON.parse(
  sql(
    `select private.plan_adaptive_practice_transition(` +
      `'${syntheticAttemptId}'::uuid)::text;`,
  ).stdout,
) as Record<string, unknown>;
assert.equal(maxDecision.status, "MAX_REACHED");

const attemptsBeforeDeactivation = sql(
  "select count(*) from public.adaptive_practice_attempts;" +
    "select count(*) from public.adaptive_practice_answers;",
).stdout;
sql(deactivationSql);
assert.equal(
  sql(
    "select count(*) from public.adaptive_practice_attempts;" +
      "select count(*) from public.adaptive_practice_answers;",
  ).stdout,
  attemptsBeforeDeactivation,
);

expectAdaptiveError(
  await rest("rpc/start_or_resume_adaptive_practice", tokens.studentA, {
    p_unit_slug: unitSlug,
    p_idempotency_key: uuid(950),
  }),
  "UNIT_NOT_AVAILABLE",
);
const preservedState = await rest(
  "rpc/get_adaptive_practice_state",
  tokens.studentA,
  { p_attempt_id: masteredState.attempt_id },
);
assert.equal(preservedState.status, 200);
assert.equal(record(preservedState.body).status, "MASTERED_EARLY");

assert.equal(
  sql(
    `select published::text from public.learning_units where slug='${unitSlug}';` +
      `select count(*) from public.questions where unit_slug='${unitSlug}' and published;`,
  ).stdout,
  "false\n0",
);

console.log("Controlled pilot isolated database integration: PASS");
console.log("Eligible/ineligible/anonymous/Parent/Teacher boundary: PASS");
console.log("Idempotency/CAS/early mastery/remediation/max model: PASS");
console.log("Deactivation history preservation: PASS");
