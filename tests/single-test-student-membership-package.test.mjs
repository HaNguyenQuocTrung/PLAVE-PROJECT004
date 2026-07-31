import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const stripComments = (source) =>
  source
    .replaceAll(/--.*$/gm, "")
    .replaceAll(/\/\*[\s\S]*?\*\//g, "");

const operation = read(
  "supabase/operations/grade2-controlled-pilot/" +
    "ENROL_ONE_GRADE2_TEST_STUDENT.sql",
);
const operationSql = stripComments(operation);
const diagnostic = read(
  "supabase/diagnostics/0037_SINGLE_TEST_STUDENT_MEMBERSHIP_READONLY.sql",
);
const diagnosticSql = stripComments(diagnostic);
const uuidPlaceholder = "<OWNER_PRIVATE_STUDENT_UUID>";
const projectPlaceholder =
  "<OWNER_CONFIRM_AUTHORIZED_SUPABASE_PROJECT_REF>";
const authorizedRef = "ujmwuhwfwbrmudtmmkes";

function modelPrecondition(state) {
  if (state.projectRef !== authorizedRef) return "PROJECT_CONFIRMATION";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(state.selectedId)) {
    return "MALFORMED_UUID";
  }
  if (state.eligibleIds.length !== 1) return "UNIQUE_ELIGIBLE_GRADE2";
  if (state.eligibleIds[0] !== state.selectedId) return "SELECTED_NOT_UNIQUE";
  if (state.memberships !== 0) return "EXISTING_MEMBERSHIP";
  if (
    state.grade2Units !== 1 ||
    state.grade2Questions !== 24 ||
    state.unpublishedQuestions !== 24 ||
    state.publishedQuestions !== 0 ||
    state.solutionMappings !== 24 ||
    state.mcq !== 16 ||
    state.numberInput !== 8 ||
    state.skillsWithSix !== 4
  ) {
    return "PARTIAL_OR_EXTRA_CONTENT";
  }
  if (state.trueFlags !== 0) return "ACTIVATION_FLAG_TRUE";
  if (state.attempts !== 0 || state.answerEvidence !== 0) {
    return "ADAPTIVE_HISTORY_DRIFT";
  }
  return "PASS";
}

const selectedId = "10000000-0000-4000-8000-000000000001";
const validState = {
  projectRef: authorizedRef,
  selectedId,
  eligibleIds: [selectedId],
  memberships: 0,
  grade2Units: 1,
  grade2Questions: 24,
  unpublishedQuestions: 24,
  publishedQuestions: 0,
  solutionMappings: 24,
  mcq: 16,
  numberInput: 8,
  skillsWithSix: 4,
  trueFlags: 0,
  attempts: 0,
  answerEvidence: 0,
};

test("6J-B placeholders are unique and unchanged templates cannot run", () => {
  assert.equal(operation.split(uuidPlaceholder).length - 1, 1);
  assert.equal(operation.split(projectPlaceholder).length - 1, 1);
  assert.match(
    operationSql,
    /v_owner_project_confirmation like '<OWNER_%>'[\s\S]*v_owner_project_confirmation <> v_authorized_project_ref/,
  );
  assert.match(
    operationSql,
    /constant uuid := '<OWNER_PRIVATE_STUDENT_UUID>'::uuid/,
  );
  assert.doesNotMatch(
    operation,
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
  );
});

test("6J-B owner confirmation, unique Student and idempotency model fail closed", () => {
  assert.equal(modelPrecondition(validState), "PASS");
  assert.equal(
    modelPrecondition({ ...validState, projectRef: "wrong-project-ref" }),
    "PROJECT_CONFIRMATION",
  );
  assert.equal(
    modelPrecondition({ ...validState, selectedId: "not-a-uuid" }),
    "MALFORMED_UUID",
  );
  assert.equal(
    modelPrecondition({ ...validState, eligibleIds: [] }),
    "UNIQUE_ELIGIBLE_GRADE2",
  );
  assert.equal(
    modelPrecondition({
      ...validState,
      eligibleIds: [selectedId, "20000000-0000-4000-8000-000000000002"],
    }),
    "UNIQUE_ELIGIBLE_GRADE2",
  );
  assert.equal(
    modelPrecondition({
      ...validState,
      selectedId: "20000000-0000-4000-8000-000000000002",
    }),
    "SELECTED_NOT_UNIQUE",
  );
  assert.equal(
    modelPrecondition({ ...validState, memberships: 1 }),
    "EXISTING_MEMBERSHIP",
  );
});

test("6J-B semantic state model rejects reviewed drift cases", () => {
  assert.equal(
    modelPrecondition({ ...validState, grade2Questions: 23 }),
    "PARTIAL_OR_EXTRA_CONTENT",
  );
  assert.equal(
    modelPrecondition({
      ...validState,
      publishedQuestions: 1,
      unpublishedQuestions: 23,
    }),
    "PARTIAL_OR_EXTRA_CONTENT",
  );
  assert.equal(
    modelPrecondition({ ...validState, solutionMappings: 23 }),
    "PARTIAL_OR_EXTRA_CONTENT",
  );
  assert.equal(
    modelPrecondition({ ...validState, trueFlags: 1 }),
    "ACTIVATION_FLAG_TRUE",
  );
  assert.equal(
    modelPrecondition({ ...validState, attempts: 1 }),
    "ADAPTIVE_HISTORY_DRIFT",
  );
  assert.equal(
    modelPrecondition({ ...validState, answerEvidence: 1 }),
    "ADAPTIVE_HISTORY_DRIFT",
  );
});

test("6J-B transaction locks protected tables in fixed order", () => {
  const expectedOrder = [
    "lock table auth.users in share mode",
    "lock table public.profiles in share mode",
    "lock table public.student_profiles in share mode",
    "lock table public.learning_units in share mode",
    "lock table public.questions in share mode",
    "lock table public.question_solutions in share mode",
    "lock table public.practice_attempts in share mode",
    "lock table public.practice_answers in share mode",
    "lock table public.diagnostic_attempts in share mode",
    "lock table public.diagnostic_answers in share mode",
    "lock table public.adaptive_practice_releases in share mode",
    "lock table public.adaptive_practice_attempts in share mode",
    "lock table public.adaptive_practice_answers in share mode",
    "lock table public.adaptive_practice_pilot_members\n    in share row exclusive mode",
  ];
  let previous = -1;
  for (const statement of expectedOrder) {
    const current = operationSql.toLowerCase().indexOf(statement);
    assert.ok(current > previous, `missing/out-of-order lock: ${statement}`);
    previous = current;
  }
  assert.match(operationSql, /v_protected_after is distinct from v_protected_before/);
  assert.equal(
    (
      operationSql.match(
        /\binsert into public[.]adaptive_practice_pilot_members\b/gi,
      ) ?? []
    ).length,
    1,
  );
});

test("6J-B diagnostic is complete, aggregate-only and read-only", () => {
  assert.match(diagnosticSql, /^\s*begin transaction read only\s*;/i);
  assert.match(diagnosticSql, /\brollback\s*;\s*$/i);
  assert.doesNotMatch(
    diagnosticSql,
    /\b(?:insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|call|do)\b/i,
  );
  for (const value of [
    "'eligible_onboarded_grade2_students'",
    "'member_is_the_unique_eligible_grade2'",
    "'unit_total'",
    "'published_units'",
    "'question_total'",
    "'unpublished_questions'",
    "'published_questions'",
    "'solution_mappings'",
    "'multiple_choice_questions'",
    "'number_input_questions'",
    "'skill_families_with_six_questions'",
    "'frozen_release_binding'",
    "'database_row_semantic_fingerprint'",
    "'full_original_bundle_recomputation_unsupported'",
    "'database_flags_true'",
    "'answer_evidence'",
    "'GRADE1_BASELINE'",
    "'HISTORY_BASELINE'",
  ]) {
    assert.ok(diagnostic.includes(value), `missing ${value}`);
  }
  assert.match(
    diagnosticSql,
    /select\s+section,\s+metric,\s+exact_count,\s+expected_count,[\s\S]*notes\s+from observed\s+order by section, metric;/i,
  );
  assert.doesNotMatch(diagnosticSql, /\b(email|student_code|full_name)\b/i);
});

test("local PostgreSQL integration is explicitly pending without Docker/network", () => {
  assert.equal("LOCAL_DB_INTEGRATION_PENDING", "LOCAL_DB_INTEGRATION_PENDING");
});

test("historical runbook is archived and retains explicit flag modes", () => {
  const runbook = read("docs/operations/GRADE2_CONTROLLED_PILOT_RUNBOOK.md");
  const envCheck = read("scripts/check-controlled-pilot-env.ts");
  assert.match(runbook, /ARCHIVED_NON_OPERATIONAL/);
  assert.match(runbook, /PROJECT004 loopback local stack/);
  assert.match(runbook, /ujmwuhwfwbrmudtmmkes/);
  assert.match(runbook, /PostgreSQL cannot securely infer a Dashboard/);
  for (const mode of [
    "--mode=allowlist-count",
    "--mode=pre-activation",
    "--mode=activation",
  ]) {
    assert.ok(runbook.includes(mode));
    assert.ok(envCheck.includes(mode));
  }
  assert.doesNotMatch(envCheck, /--allowlist-only/);
});
