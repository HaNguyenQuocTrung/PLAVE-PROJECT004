import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const path = "supabase/migrations/0047_unified_learning_activity_projection.sql";
const sql = readFileSync(path, "utf8");

test("0047 is one forward transaction with a stable reviewed digest", () => {
  assert.match(sql, /^begin;/u);
  assert.match(sql, /commit;\s*$/u);
  assert.equal(
    createHash("sha256").update(sql).digest("hex"),
    "c2dec6564f45f8b377b496c01a7037791d2c9880dc5e71046797a51315a353bb",
  );
  assert.doesNotMatch(sql, /insert into private\.student_xp_ledger/u);
  assert.doesNotMatch(sql, /update public\.(practice|curriculum|adaptive)_/u);
});

test("0047 uses one source-discriminated exactly-once activity registry", () => {
  assert.match(sql, /runtime_source, attempt_id, student_id/u);
  assert.match(sql, /references private\.student_xp_attempts/u);
  assert.match(sql, /primary key \(\s*runtime_source, attempt_id\s*\)/u);
  assert.match(sql, /unique \(\s*student_id, runtime_source, attempt_id\s*\)/u);
  for (const source of ["PRACTICE_FIXED", "CURRICULUM", "ADAPTIVE_PILOT"]) {
    assert.match(sql, new RegExp(`'${source}'`, "u"));
  }
  assert.match(sql, /on conflict do nothing/u);
  assert.match(sql, /pg_advisory_xact_lock/u);
});

test("0047 projects completion time in the canonical timezone independently of XP", () => {
  assert.match(sql, /v_today := \(v_completed_at at time zone 'Asia\/Ho_Chi_Minh'\)::date/u);
  assert.match(sql, /qualifying_date, occurred_at\s*\) values \(\s*p_runtime_source, p_attempt_id, v_student_id, v_today, v_completed_at/su);
  assert.match(sql, /from private\.student_xp_ledger as ledger/u);
  assert.match(sql, /from private\.student_completed_attempt_events as event/u);
  assert.match(sql, /v_daily_completed := v_daily_xp >= 20 and v_daily_attempts >= 1/u);
  assert.match(sql, /v_weekly_completed := v_weekly_xp >= 100 and v_weekly_attempts >= 3/u);
  assert.match(sql, /'FIRST_STEP', v_completed_attempts >= 1/u);
});

test("0047 covers every persisted production completion source and excludes non-learning states", () => {
  assert.match(sql, /after update of status on public\.practice_attempts/u);
  assert.match(sql, /after update of status on public\.curriculum_attempts/u);
  assert.match(sql, /after update of status on public\.adaptive_practice_attempts/u);
  assert.match(sql, /'MASTERED_EARLY', 'REMEDIATION_REQUIRED', 'MAX_REACHED'/u);
  assert.doesNotMatch(sql, /new\.status in \([^)]*ABANDONED/su);
  assert.doesNotMatch(sql, /diagnostic_attempts|placement|teacher_preview|demo_attempt/u);
  assert.match(sql, /generation_mode = 'ON_DEMAND'/u);
  assert.match(sql, /curriculum_generated_answers/u);
  assert.match(sql, /curriculum_answers/u);
});

test("0047 preserves fail-closed ownership and private execution boundaries", () => {
  assert.match(sql, /MOTIVATION:ATTEMPT_MISMATCH/u);
  assert.match(sql, /MOTIVATION:SOURCE_MISMATCH/u);
  assert.match(sql, /security definer\s+set search_path = ''/u);
  assert.match(
    sql,
    /revoke all on function private\.refresh_motivation_for_attempt_v2\(text, uuid\)\s+from public, anon, authenticated, service_role/u,
  );
});

test("every production answer route invalidates the same post-commit surfaces", () => {
  for (const route of [
    "app/api/practice/answer/route.ts",
    "app/api/curriculum-runtime/answer/route.ts",
    "app/api/on-demand-curriculum/answer/route.ts",
    "app/api/adaptive-practice/answer/route.ts",
  ]) {
    const source = readFileSync(route, "utf8");
    assert.match(source, /revalidateStudentLearningProjections\(\)/u, route);
  }
  const revalidation = readFileSync(
    "lib/curriculum-runtime/revalidation.ts",
    "utf8",
  );
  for (const path of [
    "/dashboard",
    "/learning-progress",
    "/learning-history",
    "/results",
  ]) {
    assert.match(revalidation, new RegExp(`"${path}"`, "u"));
  }
});
