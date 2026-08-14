import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const path = "supabase/migrations/0046_unified_grade_1_9_xp.sql";
const migration = readFileSync(path, "utf8");

test("0046 is a forward atomic migration with a stable digest", () => {
  assert.match(migration, /^begin;/u);
  assert.match(migration, /commit;\s*$/u);
  assert.equal(
    createHash("sha256").update(migration).digest("hex"),
    "f72e35e8cc9ed7010ea953398a606867e1c8231f272ccb5cd4f68024bb157d83",
  );
  assert.doesNotMatch(migration, /service_role|next_public|backfill_xp/iu);
});

test("0046 uses one source-discriminated append-only ledger contract", () => {
  assert.match(migration, /create table private\.student_xp_attempts/u);
  assert.match(migration, /PRACTICE_FIXED[\s\S]*CURRICULUM[\s\S]*ADAPTIVE_PILOT/u);
  assert.match(migration, /student_xp_attempt_registry_fkey/u);
  assert.match(migration, /student_xp_runtime_answer_unique/u);
  assert.match(migration, /create or replace function private\.award_student_xp_v1/u);
  assert.match(migration, /on conflict do nothing/u);
  assert.match(migration, /private\.xp_award\(p_difficulty\)/u);
  assert.match(migration, /SCORING:ANSWER_MISMATCH/u);
  assert.doesNotMatch(migration, /update private\.student_xp_ledger|delete from private\.student_xp_ledger/iu);
});

test("historical attempts remain unchanged while new attempts opt into V1", () => {
  assert.match(migration, /update public\.practice_attempts set xp_policy_version = null/u);
  assert.match(migration, /update public\.adaptive_practice_attempts set xp_policy_version = null/u);
  assert.match(migration, /set default 'PLAVE_SCORING_POLICY_V1'/u);
  assert.equal((migration.match(/insert into private\.student_xp_ledger/gu) ?? []).length, 1);
});

test("all four production learning submission RPCs return canonical XP", () => {
  for (const name of [
    "submit_practice_answer",
    "submit_adaptive_practice_answer",
    "submit_curriculum_answer",
    "submit_generated_curriculum_answer",
  ]) {
    assert.match(migration, new RegExp(`create function public[.]${name}\\(`, "u"));
  }
  assert.equal((migration.match(/private\.xp_submission_payload_v1\(/gu) ?? []).length >= 5, true);
  for (const key of [
    "answer_xp_awarded",
    "attempt_xp_earned",
    "total_xp_after",
    "policy_version",
    "eligible",
    "zero_xp_reason",
  ]) assert.match(migration, new RegExp(`'${key}'`, "u"));
});

test("application paths consume server XP and invalidate after commit", () => {
  const practice = readFileSync("app/api/practice/answer/route.ts", "utf8");
  const curriculum = readFileSync("app/api/curriculum-runtime/answer/route.ts", "utf8");
  const generated = readFileSync("app/api/on-demand-curriculum/answer/route.ts", "utf8");
  const adaptive = readFileSync("app/api/adaptive-practice/answer/route.ts", "utf8");
  const contracts = readFileSync("lib/scoring/completion.ts", "utf8");
  assert.match(practice, /buildAnswerXpCompletionProjection\(result\.xp\)/u);
  assert.match(curriculum, /projectCanonicalXpAfterCommit/u);
  assert.match(generated, /requireCanonicalXpCompletion/u);
  assert.match(adaptive, /revalidateStudentLearningProjections/u);
  assert.match(contracts, /parseAnswerXpProjection/u);
  assert.doesNotMatch([practice, curriculum, generated, adaptive].join("\n"), /totalXpAfter:\s*(?:10|15|20|0)/u);
});

test("diagnostic and preview flows are not wired to the XP award function", () => {
  assert.doesNotMatch(migration, /submit_grade1_diagnostic_answer[\s\S]*award_student_xp_v1/iu);
  assert.doesNotMatch(migration, /teacher[\s\S]*award_student_xp_v1/iu);
});
