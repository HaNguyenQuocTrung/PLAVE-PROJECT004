import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(
  "supabase/migrations/0043_score_xp_mastery_foundation.sql",
  "utf8",
);

test("0043 is one additive atomic migration and leaves 0001-0042 untouched", () => {
  assert.match(sql, /^begin;/u);
  assert.match(sql, /commit;\s*$/u);
  assert.doesNotMatch(sql, /drop\s+(?:table|column|function|trigger)/iu);
  assert.doesNotMatch(sql, /alter\s+table\s+public[.]practice_/iu);
});
test("attempt score and XP policy are server-owned and range constrained", () => {
  assert.match(sql, /PLAVE_SCORING_POLICY_V1/u);
  assert.match(sql, /score_earned_weight/u);
  assert.match(sql, /score_possible_weight/u);
  assert.match(sql, /score_percent[\s\S]*between 0 and 100/u);
  assert.match(sql, /before insert on public[.]curriculum_attempts/u);
  assert.match(sql, /before update on public[.]curriculum_attempts/u);
  assert.match(sql, /v_earned::numeric \* 100 \/ v_possible/u);
});

test("XP ledger and mastery evidence are append-only and exactly-once", () => {
  assert.match(sql, /create table private[.]student_xp_ledger/u);
  assert.match(sql, /unique \(student_id, attempt_id, question_id, policy_version\)/u);
  assert.match(sql, /SCORING:IMMUTABLE_EVENT/u);
  assert.match(sql, /student_xp_ledger_immutable/u);
  assert.match(sql, /student_mastery_evidence_immutable/u);
  assert.match(sql, /on conflict do nothing/u);
  assert.match(sql, /latest_five/u);
  assert.match(sql, /limit 10/u);
  assert.match(sql, /medium_hard_correct/u);
  assert.match(sql, /NEEDS_REVIEW/u);
});

test("static and GENERATED_V2 answers use the same scoring transaction", () => {
  assert.match(sql, /after insert on public[.]curriculum_answers/u);
  assert.match(sql, /after insert on public[.]curriculum_generated_answers/u);
  assert.match(sql, /record_scoring_evidence_v1/u);
  assert.match(sql, /question_source in \('STATIC', 'GENERATED_V2'\)/u);
  assert.match(sql, /private[.]scoring_difficulty/u);
});

test("authenticated wrappers hide replay XP and direct mutation privileges", () => {
  assert.match(sql, /if not v_replay then[\s\S]*v_xp_delta/u);
  assert.match(sql, /greatest\(p_xp_delta, 0\)/u);
  assert.match(sql, /revoke all on table private[.]student_xp_ledger from public, anon, authenticated/u);
  assert.match(sql, /get_parent_child_score_xp_mastery/u);
  assert.match(sql, /get_teacher_student_score_xp_mastery/u);
  assert.match(sql, /set search_path = ''/u);
});
