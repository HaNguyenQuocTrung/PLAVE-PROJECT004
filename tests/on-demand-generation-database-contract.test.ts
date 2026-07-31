import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(
  new URL(
    "../supabase/migrations/0040_deterministic_on_demand_curriculum.sql",
    import.meta.url,
  ),
  "utf8",
);

test("0040 is additive and preserves the existing release binding", () => {
  assert.match(sql, /^begin;/);
  assert.match(sql, /\ncommit;\s*$/);
  assert.match(
    sql,
    /alter table public\.curriculum_attempts[\s\S]+generation_mode/,
  );
  assert.doesNotMatch(sql, /alter table public\.practice_attempts/);
  assert.doesNotMatch(sql, /alter table public\.practice_answers/);
  assert.doesNotMatch(sql, /\bservice_role\b|SUPABASE_SERVICE_ROLE/i);
});

test("generated public questions and private solutions are immutable snapshots", () => {
  assert.match(
    sql,
    /create table public\.curriculum_generated_questions/,
  );
  assert.match(
    sql,
    /create table private\.curriculum_generated_solutions/,
  );
  assert.match(sql, /snapshot_hash text/);
  assert.match(sql, /content_release_hash text/);
  assert.match(sql, /generation_contract_version text/);
  assert.match(sql, /question_seed text not null/);
  assert.match(sql, /skill_title text not null/);
  assert.match(sql, /on-demand-curriculum-v1/);
});

test("database verifies the server signature and remains correctness authority", () => {
  assert.match(sql, /extensions\.hmac/);
  assert.match(sql, /auth\.uid\(\)/);
  assert.match(sql, /INVALID_GENERATION_SIGNATURE/);
  assert.match(
    sql,
    /v_is_correct := v_normalized = v_solution\.normalized_correct_answer/,
  );
  assert.match(sql, /private\.curriculum_generated_solutions/);
  assert.doesNotMatch(
    sql,
    /grant (?:select|insert|update|delete)[\s\S]*curriculum_generated_solutions[\s\S]*authenticated/i,
  );
});

test("generated start and submit preserve grade, RLS, CAS and idempotency", () => {
  assert.match(sql, /student\.grade = unit\.grade/);
  assert.match(sql, /v_snapshot_grade <> v_grade/);
  assert.match(sql, /v_attempt\.revision <> p_expected_revision/);
  assert.match(sql, /CURRICULUM:REVISION_CONFLICT/);
  assert.match(sql, /CURRICULUM:IDEMPOTENCY_CONFLICT/);
  assert.match(sql, /CURRICULUM:DUPLICATE_SUBMISSION/);
  for (const table of [
    "curriculum_generated_questions",
    "curriculum_generated_answers",
  ]) {
    assert.match(
      sql,
      new RegExp(
        `alter table public\\.${table} force row level security`,
      ),
    );
  }
});

test("generated progress writes existing unit, outcome and skill evidence", () => {
  assert.match(
    sql,
    /insert into public\.student_curriculum_unit_progress/,
  );
  assert.match(
    sql,
    /insert into public\.student_curriculum_outcome_progress/,
  );
  assert.match(
    sql,
    /insert into public\.student_curriculum_skill_progress/,
  );
  assert.match(sql, /v_question\.skill_title/);
  assert.match(sql, /private\.curriculum_mastery_label/);
});

test("approved parents receive generated evidence without solution access", () => {
  assert.match(
    sql,
    /function public\.get_parent_child_generated_curriculum_progress/,
  );
  assert.match(sql, /connection\.status = 'APPROVED'/);
  assert.match(sql, /message = 'PARENT_PROGRESS:FORBIDDEN'/);
  assert.match(sql, /'grade_one_generated'/);
  const parentFunction = sql.slice(
    sql.indexOf(
      "create or replace function public.get_parent_child_generated_curriculum_progress",
    ),
    sql.indexOf(
      "alter table private.curriculum_generation_runtime_secret",
    ),
  );
  assert.doesNotMatch(
    parentFunction,
    /normalized_correct_answer|correct_answer|solution_steps|feedback/,
  );
});

test("Grade 1 Student progress and history expose generated evidence safely", () => {
  assert.match(
    sql,
    /function public\.get_my_generated_curriculum_evidence\(\)/,
  );
  const studentFunction = sql.slice(
    sql.indexOf(
      "create or replace function public.get_my_generated_curriculum_evidence",
    ),
    sql.indexOf(
      "create or replace function public.get_parent_child_generated_curriculum_progress",
    ),
  );
  assert.match(studentFunction, /attempt\.generation_mode = 'ON_DEMAND'/);
  assert.match(
    studentFunction,
    /'evidence_basis', 'AUTHORITATIVE_QUESTION_MAPPING'/,
  );
  assert.doesNotMatch(
    studentFunction,
    /normalized_correct_answer|correct_answer|solution_steps|feedback/,
  );
});
