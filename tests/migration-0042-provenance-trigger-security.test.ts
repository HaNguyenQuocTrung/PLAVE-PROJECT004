import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration0041 = readFileSync("supabase/migrations/0041_generated_practice_semantic_provenance.sql", "utf8");
const migration0042 = readFileSync("supabase/migrations/0042_fix_generated_question_provenance_trigger_security.sql", "utf8");

test("0041 checksum remains byte-identical", () => {
  assert.equal(createHash("sha256").update(migration0041).digest("hex"), "ddead90b474185686d859d9ba88aea969bebd7fc8e8fcff66fc38eea61f83e67");
});

test("0042 fixes the internal trigger privilege context in one transaction", () => {
  assert.match(migration0042, /^begin;/u);
  assert.match(migration0042, /commit;\s*$/u);
  assert.match(migration0042, /alter function private[.]enforce_generated_question_provenance\(\)[\s\S]*owner to postgres/u);
  assert.match(migration0042, /alter function private[.]enforce_generated_question_provenance\(\)[\s\S]*security definer/u);
  assert.match(migration0042, /set search_path = ''/u);
  assert.match(migration0042, /revoke all on function private[.]enforce_generated_question_provenance\(\)[\s\S]*from public, anon, authenticated/u);
});

test("0042 closes post-lock public snapshot mutation without weakening the pending transition", () => {
  assert.match(migration0042, /create or replace function private[.]prevent_generated_provenance_mutation\(\)[\s\S]*if old[.]semantic_provenance_locked then[\s\S]*new is distinct from old[\s\S]*IMMUTABLE_SEMANTIC_PROVENANCE/u);
  for (const field of ["prompt", "answer_type", "options", "visual", "misconception_tags", "public_payload_hash", "created_at"]) {
    assert.match(migration0042, new RegExp(`new[.]${field} is distinct from old[.]${field}`, "u"));
  }
  assert.match(migration0042, /old[.]question_source <> 'PENDING_SEMANTIC_V1'[\s\S]*new[.]question_source <> 'SEMANTIC_GENERATED_V1'/u);
  assert.match(migration0042, /revoke all on function private[.]prevent_generated_provenance_mutation\(\)[\s\S]*from public, anon, authenticated/u);
});

test("0042 does not weaken tables, trigger timing, provenance or RPC grants", () => {
  assert.doesNotMatch(migration0042, /grant\s+(?:select|insert|update|delete|all)\s+on\s+(?:table\s+)?/iu);
  assert.doesNotMatch(migration0042, /disable\s+trigger|drop\s+trigger|drop\s+constraint|alter\s+table/iu);
  assert.match(migration0042, /create function public[.]start_or_resume_semantic_generated_curriculum[\s\S]*security definer[\s\S]*set search_path = ''/u);
  assert.match(migration0042, /pg_catalog[.]pg_advisory_xact_lock[\s\S]*pg_catalog[.]hashtextextended/u);
  assert.match(migration0042, /set schema private/u);
  assert.match(migration0042, /revoke all on function[\s\S]*private[.]start_or_resume_semantic_generated_curriculum_0041_impl[\s\S]*from public, anon, authenticated/u);
  assert.match(migration0042, /grant execute on function[\s\S]*public[.]start_or_resume_semantic_generated_curriculum[\s\S]*to authenticated/u);
  assert.doesNotMatch(migration0042, /grant execute[\s\S]*start_or_resume_semantic_generated_curriculum_0041_impl/iu);
  assert.match(migration0041, /deferrable initially deferred/u);
  for (const field of ["semantic_variant_id", "semantic_variant_version", "solver_version", "solver_receipt_hash", "difficulty_policy_version", "seed_fingerprint", "ast_hash", "visual_hash"]) assert.match(migration0041, new RegExp(field, "u"));
});
