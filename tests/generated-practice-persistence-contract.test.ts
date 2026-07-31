import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration0040 = await readFile(
    "supabase/migrations/0040_deterministic_on_demand_curriculum.sql",
    "utf8",
);
const migration0041 = await readFile(
  "supabase/migrations/0041_generated_practice_semantic_provenance.sql",
  "utf8",
);

test("0040 remains unchanged as the generated persistence baseline", () => {
  const sql = migration0040;
  for (const invariant of [
    "curriculum_generated_questions",
    "curriculum_generated_solutions",
    "curriculum_generated_answers",
    "snapshot_hash",
    "start_or_resume_generated_curriculum",
    "submit_generated_curriculum_answer",
    "p_expected_revision",
    "p_idempotency_key",
  ]) assert.match(sql, new RegExp(invariant, "u"));
  for (const requiredField of [
    "semantic_variant_id",
    "semantic_variant_version",
    "solver_version",
    "solver_receipt_hash",
    "difficulty_policy_version",
    "seed_fingerprint",
    "ast_hash",
    "visual_hash",
  ]) assert.doesNotMatch(sql, new RegExp(`\\b${requiredField}\\b`, "u"));
});

test("0041 additively extends the existing immutable attempt-item table", () => {
  assert.match(migration0041, /^begin;/u);
  assert.match(migration0041, /\ncommit;\s*$/u);
  assert.match(
    migration0041,
    /alter table public\.curriculum_generated_questions/u,
  );
  assert.doesNotMatch(migration0041, /create table/u);
  for (const requiredField of [
    "semantic_variant_id",
    "semantic_variant_version",
    "solver_version",
    "solver_receipt_hash",
    "difficulty_policy_version",
    "seed_fingerprint",
    "ast_hash",
    "visual_hash",
  ]) {
    assert.match(
      migration0041,
      new RegExp(`\\b${requiredField}\\b`, "u"),
    );
  }
});

test("0041 preserves old rows and fail-closes partial semantic provenance", () => {
  assert.match(
    migration0041,
    /question_source text not null default 'LEGACY_GENERATED_V1'/u,
  );
  assert.match(
    migration0041,
    /alter column question_source set default 'PENDING_SEMANTIC_V1'/u,
  );
  assert.match(
    migration0041,
    /question_source = 'SEMANTIC_GENERATED_V1'/u,
  );
  assert.match(
    migration0041,
    /deferrable initially deferred/u,
  );
  assert.match(
    migration0041,
    /INCOMPLETE_SEMANTIC_PROVENANCE/u,
  );
  assert.match(
    migration0041,
    /UNVERIFIED_SEMANTIC_INSERT/u,
  );
  assert.match(
    migration0041,
    /plave\.semantic_provenance_write/u,
  );
  assert.match(
    migration0041,
    /when item\.value -> 'options' = 'null'::jsonb[\s\S]*then item\.value - 'options'/u,
  );
  assert.doesNotMatch(
    migration0041,
    /(?:unknown|placeholder|dummy)[-_ ]?(?:hash|version)/iu,
  );
});

test("0041 locks provenance and public/visual hashes in the database", () => {
  assert.match(migration0041, /before update/u);
  assert.match(migration0041, /IMMUTABLE_SEMANTIC_PROVENANCE/u);
  for (const immutableField of [
    "semantic_variant_id",
    "semantic_variant_version",
    "solver_version",
    "solver_receipt_hash",
    "difficulty_policy_version",
    "seed_fingerprint",
    "ast_hash",
    "public_payload_hash",
    "visual_hash",
  ]) {
    assert.match(
      migration0041,
      new RegExp(
        `new\\.${immutableField} is distinct from[\\s\\S]{0,80}old\\.${immutableField}`,
        "u",
      ),
    );
  }
});

test("0041 exposes only the server-verified semantic start RPC", () => {
  assert.match(
    migration0041,
    /security definer\s+set search_path = ''/u,
  );
  assert.match(
    migration0041,
    /revoke execute on function public\.start_or_resume_generated_curriculum[\s\S]*from authenticated/u,
  );
  assert.match(
    migration0041,
    /grant execute on function[\s\S]*start_or_resume_semantic_generated_curriculum[\s\S]*to authenticated/u,
  );
  assert.doesNotMatch(migration0041, /\bexecute\s+format\b|\bservice_role\b/iu);
});
