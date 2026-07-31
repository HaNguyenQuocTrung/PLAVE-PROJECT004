import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationPath = new URL(
  "../supabase/migrations/0038_universal_curriculum_runtime_draft.sql",
  import.meta.url,
);
const sql = readFileSync(migrationPath, "utf8");
const verificationSql = readFileSync(
  new URL(
    "../supabase/operations/verify_0038_universal_curriculum_local.sql",
    import.meta.url,
  ),
  "utf8",
);

test("0038 creates release-bound public/private runtime tables", () => {
  for (const table of [
    "public.curriculum_releases",
    "public.curriculum_release_units",
    "public.curriculum_release_questions",
    "private.curriculum_release_solutions",
    "public.curriculum_attempts",
    "public.curriculum_answers",
    "public.student_curriculum_unit_progress",
    "public.student_curriculum_outcome_progress",
    "public.student_curriculum_skill_progress",
  ]) {
    assert.match(sql, new RegExp(`create table ${table.replace(".", "\\.")}`));
  }
  assert.match(sql, /content_version text not null/);
  assert.match(sql, /curriculum_source_fingerprint text not null/);
  assert.match(sql, /generator_version text not null/);
  assert.match(sql, /question_sequence text\[\] not null/);
  assert.match(sql, /unique \(attempt_id, submission_id\)/);
  assert.match(sql, /expected_revision integer not null/);
  assert.match(sql, /revision integer not null default 0/);
  assert.match(
    sql,
    /foreign key \(\s*release_id,\s*content_version,\s*curriculum_source_fingerprint,\s*generator_version,\s*deterministic_seed\s*\)/,
  );
  assert.match(
    sql,
    /foreign key \(release_id, unit_id, question_id\)/,
  );
});

test("all five public RPCs are authenticated SECURITY DEFINER contracts", () => {
  for (const signature of [
    "start_or_resume_curriculum_unit",
    "get_curriculum_attempt_state",
    "submit_curriculum_answer",
    "get_student_curriculum_progress",
    "get_student_curriculum_history",
  ]) {
    const start = sql.indexOf(`create or replace function public.${signature}`);
    assert.notEqual(start, -1, signature);
    const body = sql.slice(start, start + 1600);
    assert.match(body, /security definer/);
    assert.match(body, /set search_path = ''/);
    assert.match(body, /auth\.uid\(\)/);
    assert.match(sql, new RegExp(`grant execute[\\s\\S]{0,220}${signature}`));
  }
  assert.match(sql, /revoke all[\s\S]+from public, anon/);
});

test("authoritative values cannot be directly mutated by browser roles", () => {
  assert.match(
    sql,
    /revoke all on table private\.curriculum_release_solutions from public, anon, authenticated/,
  );
  assert.match(
    sql,
    /revoke all on table public\.curriculum_answers from public, anon, authenticated/,
  );
  assert.match(
    sql,
    /revoke all on table public\.student_curriculum_outcome_progress[\s\S]+from public, anon, authenticated/,
  );
  assert.match(sql, /v_is_correct := v_normalized = v_solution\.normalized_correct_answer/);
  assert.equal(/service_role|SUPABASE_SERVICE_ROLE/i.test(sql), false);
});

test("RLS/FORCE RLS, ownership, grade, CAS and idempotency fail closed", () => {
  for (const table of [
    "curriculum_attempts",
    "curriculum_answers",
    "student_curriculum_unit_progress",
    "student_curriculum_outcome_progress",
    "student_curriculum_skill_progress",
  ]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
  }
  assert.match(sql, /attempt\.student_id = v_user_id/);
  assert.match(sql, /student\.grade = unit\.grade/);
  assert.match(sql, /v_attempt\.revision <> p_expected_revision/);
  assert.match(sql, /CURRICULUM:REVISION_CONFLICT/);
  assert.match(sql, /CURRICULUM:IDEMPOTENCY_CONFLICT/);
  assert.match(sql, /CURRICULUM:DUPLICATE_SUBMISSION/);
  assert.match(
    sql,
    /v_existing\.expected_revision <> p_expected_revision/,
  );
  assert.match(
    sql,
    /v_normalized <> v_existing\.normalized_answer/,
  );
});

test("idempotent replay uses valid rowtype targets and has a live SQL regression", () => {
  assert.doesNotMatch(
    sql,
    /select\s+question,\s*solution\s+into\s+v_question,\s*v_solution/i,
  );
  assert.match(
    sql,
    /select question\.\*\s+into v_question[\s\S]+select solution\.\*\s+into v_solution/,
  );
  assert.match(
    verificationSql,
    /v_resumed := public\.submit_curriculum_answer\([\s\S]+CURRICULUM:IDEMPOTENT_REPLAY_STATE_MISMATCH/,
  );
});

test("mastery is versioned and one correct answer cannot produce MASTERED", () => {
  assert.match(sql, /mastery_policy_version text not null/);
  assert.match(sql, /p_evidence_count >= 6[\s\S]+then 'MASTERED'/);
  assert.match(sql, /p_evidence_count >= 4[\s\S]+then 'PROFICIENT'/);
  assert.match(sql, /p_evidence_count >= 3[\s\S]+then 'NEEDS_PRACTICE'/);
});

test("legacy Grade 1 rows are read but never altered by 0038", () => {
  assert.equal(
    /(?:insert into|update|delete from|alter table) public\.practice_attempts/i.test(
      sql,
    ),
    false,
  );
  assert.equal(
    /(?:insert into|update|delete from|alter table) public\.practice_answers/i.test(
      sql,
    ),
    false,
  );
  assert.match(sql, /LEGACY_GRADE1_AGGREGATED/);
  assert.match(sql, /LEGACY_UNIT_ALIGNED/);
});

test("0035-0037 remain byte-identical to the verified baseline", () => {
  const expected: Record<string, string> = {
    "0035_grade2_numbers_to_1000_release_candidate_draft.sql":
      "67bef151f4a8744c107835ce98ab5a5c30372cf76ff0328e02c1ca8649c7f206",
    "0036_adaptive_practice_runtime_draft.sql":
      "d88b21c866c5d19708dc544faaa2c5828e3127844c50f0d7e76a3716c07fc6f1",
    "0037_adaptive_controlled_pilot_eligibility_draft.sql":
      "91e2a4bb918bf894903f313d65d93bd80d8be98fad4fa2a1ca7c59cbbfe1b070",
  };
  for (const [file, hash] of Object.entries(expected)) {
    const contents = readFileSync(
      new URL(`../supabase/migrations/${file}`, import.meta.url),
    );
    assert.equal(createHash("sha256").update(contents).digest("hex"), hash);
  }
});
