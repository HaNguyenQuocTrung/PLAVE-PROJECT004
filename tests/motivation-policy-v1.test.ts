import assert from "node:assert/strict";
import test from "node:test";
import {
  ACHIEVEMENTS,
  achievementEligibility,
  calculateStreak,
  goalsFromProgress,
  levelThreshold,
  localLearningDate,
  projectLevel,
} from "../lib/motivation/policy-v1.ts";

test("level thresholds and capped projection follow PLAVE_MOTIVATION_POLICY_V1", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 10, 50].map(levelThreshold), [0, 100, 250, 450, 700, 2700, 63700]);
  assert.equal(projectLevel(0).level, 1);
  assert.equal(projectLevel(100).level, 2);
  assert.equal(projectLevel(249).level, 2);
  assert.equal(projectLevel(250).level, 3);
  assert.equal(projectLevel(100000).level, 50);
  assert.equal(projectLevel(100000).maxLevel, true);
});

test("learning dates and streaks use unique local calendar days", () => {
  assert.equal(localLearningDate("2026-08-03T16:59:59.000Z"), "2026-08-03");
  assert.equal(localLearningDate("2026-08-03T17:00:00.000Z"), "2026-08-04");
  const result = calculateStreak(["2026-08-01", "2026-08-02", "2026-08-02", "2026-08-03"], "2026-08-03");
  assert.equal(result.currentStreakDays, 3);
  assert.equal(result.longestStreakDays, 3);
  assert.equal(result.qualifiedToday, true);
  assert.equal(calculateStreak(["2026-08-02"], "2026-08-03").currentStreakDays, 1);
  assert.equal(calculateStreak(["2026-07-30"], "2026-08-03").currentStreakDays, 0);
});

test("goals require both XP and non-empty attempts and cap percentages", () => {
  const goals = goalsFromProgress({ dailyXp: 40, dailyAttempts: 0, weeklyXp: 120, weeklyAttempts: 3 });
  assert.equal(goals.dailyCompleted, false);
  assert.equal(goals.weeklyCompleted, true);
  assert.equal(goals.daily.xp.percentage, 100);
  assert.equal(goals.weekly.xp.percentage, 100);
});

test("daily and weekly goal predicates require both configured dimensions", () => {
  const xpOnly = goalsFromProgress({ dailyXp: 20, dailyAttempts: 0, weeklyXp: 100, weeklyAttempts: 0 });
  const lessonsOnly = goalsFromProgress({ dailyXp: 0, dailyAttempts: 1, weeklyXp: 0, weeklyAttempts: 3 });
  const exact = goalsFromProgress({ dailyXp: 20, dailyAttempts: 1, weeklyXp: 100, weeklyAttempts: 3 });
  const exceeded = goalsFromProgress({ dailyXp: 165, dailyAttempts: 2, weeklyXp: 165, weeklyAttempts: 4 });
  assert.deepEqual(
    [xpOnly.dailyCompleted, xpOnly.weeklyCompleted, lessonsOnly.dailyCompleted, lessonsOnly.weeklyCompleted],
    [false, false, false, false],
  );
  assert.deepEqual(
    [exact.dailyCompleted, exact.weeklyCompleted, exceeded.dailyCompleted, exceeded.weeklyCompleted],
    [true, true, true, true],
  );
});

test("achievement definitions and threshold eligibility are typed and deterministic", () => {
  assert.equal(ACHIEVEMENTS.length, 12);
  const earned = achievementEligibility({ completedAttemptCount: 1, correctAnswerCount: 1, totalXp: 500, longestStreakDays: 7, masteredCount: 5, perfectAttempt: true, dailyGoalCompleted: true, weeklyGoalCompleted: true, comeback: true });
  assert.equal(new Set(earned).size, 12);
  assert.equal(achievementEligibility({ completedAttemptCount: 0, correctAnswerCount: 0, totalXp: 99, longestStreakDays: 2, masteredCount: 0, perfectAttempt: false, dailyGoalCompleted: false, weeklyGoalCompleted: false, comeback: false }).length, 0);
});
