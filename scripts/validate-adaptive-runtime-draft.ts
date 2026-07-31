import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  GRADE_TWO_NUMBERS_TO_1000_BUNDLE_SHA256,
  GRADE_TWO_NUMBERS_TO_1000_POLICY_VERSION,
  createFrozenAdaptiveQuestionBank,
} from "../lib/content-engine/adaptive-runtime.ts";
import {
  adaptiveRuntimeFeatureFlags,
  resolvePracticeRuntimeAccess,
} from "../lib/practice/runtime-flags.ts";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const migrationDirectory = new URL(
  "../supabase/migrations/",
  import.meta.url,
);
const contentMigrationName =
  "0035_grade2_numbers_to_1000_release_candidate_draft.sql";
const runtimeMigrationName =
  "0036_adaptive_practice_runtime_draft.sql";
const pilotMigrationName =
  "0037_adaptive_controlled_pilot_eligibility_draft.sql";

function fail(message: string): never {
  throw new Error(message);
}

function read(relativePath: string) {
  return readFileSync(`${projectRoot}${relativePath}`, "utf8");
}

function count(source: string, expression: RegExp) {
  return source.match(expression)?.length ?? 0;
}

function requireAll(
  source: string,
  values: readonly string[],
  label: string,
) {
  for (const value of values) {
    if (!source.includes(value)) {
      fail(`${label} thiếu invariant: ${value}`);
    }
  }
}

function extractFunction(
  source: string,
  qualifiedName: string,
): string {
  const escaped = qualifiedName.replaceAll(".", "[.]");
  const match = new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+${escaped}\\b[\\s\\S]*?\\n\\$\\$;`,
    "i",
  ).exec(source);
  if (!match) {
    fail(`Không tìm thấy function ${qualifiedName}.`);
  }
  return match[0];
}

const migrationNames = readdirSync(migrationDirectory)
  .filter((name) => /^\d{4}_.+[.]sql$/.test(name))
  .sort();
if (
  migrationNames.filter((name) => name.startsWith("0035_")).length !==
    1 ||
  migrationNames.filter((name) => name.startsWith("0036_")).length !==
    1 ||
  migrationNames.filter((name) => name.startsWith("0037_")).length !==
    1 ||
  migrationNames.indexOf(contentMigrationName) + 1 !==
    migrationNames.indexOf(runtimeMigrationName) ||
  migrationNames.indexOf(runtimeMigrationName) + 1 !==
    migrationNames.indexOf(pilotMigrationName)
) {
  fail("0035/0036/0037 phải là ba draft duy nhất và đúng thứ tự.");
}

const contentMigration = read(`supabase/migrations/${contentMigrationName}`);
requireAll(
  contentMigration,
  [
    "g2-numbers-to-1000-rc1",
    "g2n1000-1.0.0-rc.1",
    "g2-review-number-language",
    GRADE_TWO_NUMBERS_TO_1000_BUNDLE_SHA256,
    "published,\n  display_order",
    "24,\n  false,\n  1,",
  ],
  "Frozen migration 0035",
);

const runtimeMigration = read(`supabase/migrations/${runtimeMigrationName}`);
const normalized = runtimeMigration.trim().toLowerCase();
if (
  !normalized.startsWith("begin;") ||
  !normalized.endsWith("commit;") ||
  count(runtimeMigration, /\bbegin\s*;/gi) !== 1 ||
  count(runtimeMigration, /\bcommit\s*;/gi) !== 1
) {
  fail("0036 phải có đúng một BEGIN và một COMMIT.");
}

requireAll(
  runtimeMigration,
  [
    "adaptive_practice_releases",
    "adaptive_practice_attempts",
    "adaptive_practice_answers",
    "release_candidate_id",
    "content_version",
    "bundle_sha256",
    "policy_version",
    "planner_seed",
    "MASTERED_EARLY",
    "REMEDIATION_REQUIRED",
    "MAX_REACHED",
    "ABANDONED",
    "revision",
    "start_idempotency_key",
    "submission_id",
    "evidence_sequence",
    "force row level security",
    "auth.uid()",
    "for update",
    "ADAPTIVE_MASTERY_EVIDENCE_MET",
    "MAXIMUM_REACHED_WITHOUT_MASTERY",
    "QUESTION_BANK_EXHAUSTED",
    "must not seed attempts or answers",
    GRADE_TWO_NUMBERS_TO_1000_BUNDLE_SHA256,
    GRADE_TWO_NUMBERS_TO_1000_POLICY_VERSION,
  ],
  "0036",
);

for (const errorCode of [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "UNIT_NOT_AVAILABLE",
  "CONTENT_VERSION_MISMATCH",
  "ATTEMPT_NOT_FOUND",
  "ATTEMPT_NOT_ACTIVE",
  "QUESTION_MISMATCH",
  "REVISION_CONFLICT",
  "DUPLICATE_SUBMISSION",
  "INVALID_ANSWER",
  "INTEGRITY_FAILURE",
]) {
  if (!runtimeMigration.includes(`ADAPTIVE:${errorCode}`)) {
    fail(`0036 thiếu stable error code ${errorCode}.`);
  }
}

const publicFunctions = [
  "public.start_or_resume_adaptive_practice",
  "public.get_adaptive_practice_state",
  "public.submit_adaptive_practice_answer",
] as const;
const privateFunctions = [
  "private.adaptive_hash_text",
  "private.get_adaptive_skill_mastery",
  "private.plan_adaptive_practice_transition",
  "private.build_adaptive_practice_response",
] as const;
for (const functionName of publicFunctions) {
  const definition = extractFunction(runtimeMigration, functionName);
  if (
    !/\bsecurity\s+definer\b/i.test(definition) ||
    !/\bset\s+search_path\s*=\s*''/i.test(definition)
  ) {
    fail(`${functionName} phải là SECURITY DEFINER với search_path rỗng.`);
  }
}
for (const functionName of privateFunctions) {
  const definition = extractFunction(runtimeMigration, functionName);
  if (
    !/\bsecurity\s+invoker\b/i.test(definition) ||
    !/\bset\s+search_path\s*=\s*''/i.test(definition)
  ) {
    fail(`${functionName} phải là private SECURITY INVOKER an toàn.`);
  }
}

const startFunction = extractFunction(
  runtimeMigration,
  "public.start_or_resume_adaptive_practice",
);
const stateFunction = extractFunction(
  runtimeMigration,
  "public.get_adaptive_practice_state",
);
const submitFunction = extractFunction(
  runtimeMigration,
  "public.submit_adaptive_practice_answer",
);
requireAll(
  startFunction,
  [
    "p_unit_slug text",
    "p_idempotency_key uuid",
    "pg_advisory_xact_lock",
    "runtime_enabled",
    "controlled_pilot_enabled",
    "publication_status = 'PUBLISHED'",
    "student_visibility = 'VISIBLE'",
    "profile.onboarding_completed",
    "v_student_grade <> 2",
    "private.plan_adaptive_practice_transition",
  ],
  "Atomic start RPC",
);
requireAll(
  submitFunction,
  [
    "p_expected_revision integer",
    "p_idempotency_key uuid",
    "for update",
    "attempt.current_question_id <> p_question_id",
    "attempt.revision <> p_expected_revision",
    "join public.question_solutions as solution",
    "v_is_correct := v_normalized_answer = v_correct_answer",
    "insert into public.adaptive_practice_answers",
    "private.plan_adaptive_practice_transition",
    "attempt.revision + 1",
    "attempt.revision = p_expected_revision",
  ],
  "Atomic submit RPC",
);
requireAll(
  stateFunction,
  [
    "attempt.student_id = v_current_user_id",
    "private.build_adaptive_practice_response",
  ],
  "Owned resume RPC",
);

const publicSignaturePrefix = runtimeMigration.slice(
  runtimeMigration.indexOf(
    "create or replace function public.start_or_resume_adaptive_practice",
  ),
  runtimeMigration.indexOf("returns jsonb", runtimeMigration.indexOf(
    "create or replace function public.start_or_resume_adaptive_practice",
  )),
) + runtimeMigration.slice(
  runtimeMigration.indexOf(
    "create or replace function public.get_adaptive_practice_state",
  ),
  runtimeMigration.indexOf("returns jsonb", runtimeMigration.indexOf(
    "create or replace function public.get_adaptive_practice_state",
  )),
) + runtimeMigration.slice(
  runtimeMigration.indexOf(
    "create or replace function public.submit_adaptive_practice_answer",
  ),
  runtimeMigration.indexOf("returns jsonb", runtimeMigration.indexOf(
    "create or replace function public.submit_adaptive_practice_answer",
  )),
);
if (
  /\bp_(?:is_correct|correct_answer|next_question|mastery|terminal|status|student_id|owner_id)\b/i.test(
    publicSignaturePrefix,
  )
) {
  fail("Public RPC signature đang tin planner/scoring/identity từ client.");
}

for (const role of ["public", "anon", "authenticated"]) {
  for (const table of [
    "adaptive_practice_releases",
    "adaptive_practice_attempts",
    "adaptive_practice_answers",
  ]) {
    if (
      !runtimeMigration.includes(
        `revoke all on table public.${table} from ${role};`,
      )
    ) {
      fail(`Thiếu table revoke ${table} / ${role}.`);
    }
  }
}
if (
  count(
    runtimeMigration,
    /grant\s+execute\s+on\s+function\s+public[.](?:start_or_resume_adaptive_practice|get_adaptive_practice_state|submit_adaptive_practice_answer)/gi,
  ) !== 3 ||
  /grant\s+execute[\s\S]{0,220}\bto\s+(?:public|anon)\s*;/i.test(
    runtimeMigration,
  ) ||
  /grant\s+(?:select|insert|update|delete|all)\s+on\s+(?:table\s+)?public[.](?:adaptive_|question_solutions)/i.test(
    runtimeMigration,
  )
) {
  fail("0036 có grant vượt quá ba RPC authenticated tối thiểu.");
}

if (
  /(?:execute|format)\s*\(/i.test(runtimeMigration) ||
  /\bexecute\s+['"]/i.test(runtimeMigration) ||
  /create\s+table\s+public[.]\w*retention/i.test(runtimeMigration) ||
  /\b(?:cron|schedule|notification)\b/i.test(runtimeMigration) ||
  /service[_-]?role/i.test(runtimeMigration) ||
  /(?:update|delete\s+from)\s+public[.]adaptive_practice_answers\b/i.test(
    runtimeMigration,
  ) ||
  /(?:insert\s+into|update|delete\s+from)\s+public[.](?:practice_attempts|practice_answers|diagnostic_attempts|diagnostic_answers)/i.test(
    runtimeMigration,
  ) ||
  /create\s+or\s+replace\s+function\s+public[.](?:start_or_resume_practice|submit_practice_answer|get_practice_review)\b/i.test(
    runtimeMigration,
  )
) {
  fail(
    "0036 không được dùng dynamic SQL, retention job/table, service-role hoặc sửa fixed Grade 1 runtime/history.",
  );
}
if (
  count(
    runtimeMigration,
    /insert\s+into\s+public[.]adaptive_practice_answers\b/gi,
  ) !== 1
) {
  fail("Adaptive evidence phải chỉ được insert tại một atomic submit path.");
}

const responseFunction = extractFunction(
  runtimeMigration,
  "private.build_adaptive_practice_response",
);
for (const forbidden of [
  "audit_source",
  "future_question",
  "question_order",
  "mastery_threshold",
  "minimum_evidence_per_skill",
  "recent_correct_requirement",
  "student_id",
  "bundle_sha256",
]) {
  if (responseFunction.includes(`'${forbidden}'`)) {
    fail(`Sanitized response đang lộ field ${forbidden}.`);
  }
}
if (
  !responseFunction.includes("'feedback', p_feedback") ||
  !submitFunction.includes("'correct_answer', v_correct_answer") ||
  startFunction.includes("'correct_answer'") ||
  stateFunction.includes("'correct_answer'")
) {
  fail("Feedback/solution boundary trước và sau submit không đúng.");
}

for (const disabledBinding of [
  "false,\n  false,\n  false,\n  'DRAFT',\n  'HIDDEN'",
  "and not release.runtime_enabled",
  "and not release.controlled_pilot_enabled",
  "and not release.retention_runtime_enabled",
  "and release.publication_status = 'DRAFT'",
  "and release.student_visibility = 'HIDDEN'",
]) {
  if (!runtimeMigration.includes(disabledBinding)) {
    fail(`Fail-closed release binding thiếu: ${disabledBinding}`);
  }
}

const diagnostic = read(
  "supabase/diagnostics/0036_migration_state_readonly.sql",
);
if (
  /\b(?:insert|update|delete|merge|truncate|alter|create|drop|grant|revoke|call)\b/i.test(
    diagnostic.replaceAll(/--.*$/gm, ""),
  ) ||
  !/read-only manual diagnostic/i.test(diagnostic)
) {
  fail("Migration-state diagnostic phải hoàn toàn read-only.");
}

const bank = createFrozenAdaptiveQuestionBank();
if (
  bank.binding.bundleSha256 !==
    "1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530" ||
  bank.publicQuestions.length !== 24 ||
  bank.serverSolutions.length !== 24
) {
  fail("Runtime adapter không còn bind đúng frozen candidate.");
}
if (
  Object.values(adaptiveRuntimeFeatureFlags).some(Boolean) ||
  resolvePracticeRuntimeAccess("grade-2-numbers-to-1000").kind !==
    "HIDDEN_RELEASE_CANDIDATE"
) {
  fail("Adaptive/Grade 2/controlled-pilot/retention flags phải fail-closed.");
}

const startRoute = read("app/api/practice/start/route.ts");
if (
  !startRoute.includes("resolvePracticeRuntimeAccess") ||
  !startRoute.includes('"FIXED_RUNTIME"') ||
  !startRoute.includes('practiceApiError("UNIT_UNAVAILABLE")')
) {
  fail("Legacy start route chưa chặn direct access tới hidden candidate.");
}

console.log(
  [
    "Adaptive atomic database draft static validation: PASS",
    `Frozen candidate SHA-256: ${bank.binding.bundleSha256}`,
    "Public RPCs: 3 authenticated-only SECURITY DEFINER contracts",
    "Private helpers: 4 ungranted SECURITY INVOKER functions",
    "Feature flags: ALL FALSE",
    "Student visibility: HIDDEN",
    "Remote migration state: NOT ASSERTED BY THIS STATIC VALIDATOR",
    "PostgreSQL execution/concurrency: OUTSIDE THIS STATIC VALIDATOR",
    "Retention persistence: NOT INCLUDED",
  ].join("\n"),
);
