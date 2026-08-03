import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync("supabase/migrations/0044_motivation_level_streak_goals_achievements.sql", "utf8");

test("0044 is additive, transactional and has exactly-once ledgers", () => {
  assert.match(sql, /^begin;/u);
  assert.match(sql, /commit;\s*$/u);
  assert.match(sql, /student_qualifying_learning_days/u);
  assert.match(sql, /student_goal_completion_ledger/u);
  assert.match(sql, /student_achievement_awards/u);
  assert.match(sql, /unique \(student_id, achievement_id, policy_version\)/u);
  assert.match(sql, /alter table private\.student_achievement_awards enable row level security/u);
  assert.match(sql, /get_my_motivation_v1/u);
  assert.match(sql, /Asia\/Ho_Chi_Minh/u);
  assert.doesNotMatch(sql, /insert into private\.student_xp_ledger/u);
});
