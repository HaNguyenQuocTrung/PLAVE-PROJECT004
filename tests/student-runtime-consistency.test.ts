import assert from "node:assert/strict";
import test from "node:test";

import { buildStudentCompetencyDashboard } from "../lib/competency/student-adapter.ts";
import type {
  CurriculumProgressUnit,
  StudentCurriculumProgress,
  StudentScoringSummary,
} from "../lib/curriculum-runtime/contracts.ts";
import { reconcileStudentLearningEnrichment } from "../lib/curriculum-runtime/enrichment-consistency.ts";
import type { MotivationSummary } from "../lib/motivation/contracts.ts";
import {
  MOTIVATION_TIMEZONE,
  PLAVE_MOTIVATION_POLICY_V1,
} from "../lib/motivation/policy-v1.ts";

const now = new Date("2026-08-14T00:00:00.000Z");

function unit(
  unitId: string,
  status: CurriculumProgressUnit["status"] = "NOT_STARTED",
  overrides: Partial<CurriculumProgressUnit> = {},
): CurriculumProgressUnit {
  return {
    unitId,
    title: `Bài ${unitId}`,
    status,
    evidenceCount: 0,
    correctCount: 0,
    bestScorePercent: null,
    masteryLabel: status === "IN_PROGRESS" ? "IN_PROGRESS" : "NOT_STARTED",
    lastActivityAt: null,
    source: "LEGACY_GRADE1",
    ...overrides,
  };
}

function progress(
  grade: number,
  units: readonly CurriculumProgressUnit[],
): StudentCurriculumProgress {
  return {
    grade,
    compatibilityMode:
      grade === 1 ? "LEGACY_GRADE1_AGGREGATED" : "UNIVERSAL_CURRICULUM",
    masteryPolicyVersion: "test-policy",
    masteryExplanation: "Dữ liệu tổng hợp tổng hợp dùng cho test.",
    units,
    outcomes: [],
    skills: [],
  };
}

test("recommendations are created only from the database-authorized runtime inventory", () => {
  const authorized = unit("grade-1-basic-geometry-and-position");
  const dashboard = buildStudentCompetencyDashboard({
    progress: progress(1, [authorized]),
    now,
    adaptivePilotEnabled: false,
  });

  assert.ok(dashboard);
  assert.equal(dashboard.skills.length, 1);
  assert.equal(dashboard.recommendation?.candidateId, authorized.unitId);
  assert.equal(dashboard.recommendedUnit?.unitId, authorized.unitId);
  assert.equal(
    dashboard.skills.some((skill) => skill.skillId === "grade-1-shapes"),
    false,
  );
});

test("empty authorized inventory yields an exact empty recommendation state", () => {
  const dashboard = buildStudentCompetencyDashboard({
    progress: progress(5, []),
    now,
    adaptivePilotEnabled: false,
  });

  assert.ok(dashboard);
  assert.equal(dashboard.recommendation, null);
  assert.equal(dashboard.recommendedUnit, null);
  assert.deepEqual(dashboard.skills, []);
});

test("database-authorized but prerequisite-locked units cannot become recommendations", () => {
  const available = unit("grade-1-numbers-to-10");
  const locked = unit("grade-1-addition-within-10");
  const dashboard = buildStudentCompetencyDashboard({
    progress: progress(1, [available, locked]),
    now,
    adaptivePilotEnabled: false,
    runtimeEligibleUnitIds: new Set([available.unitId]),
  });

  assert.ok(dashboard);
  assert.equal(dashboard.skills.length, 1);
  assert.equal(dashboard.recommendation?.candidateId, available.unitId);
  assert.equal(dashboard.recommendedUnit?.unitId, available.unitId);
});

test("in-progress authorized runtime is preferred and remains grade-isolated", () => {
  const fresh = unit("grade-4-fresh", "NOT_STARTED", {
    source: "UNIVERSAL_CURRICULUM",
  });
  const active = unit("grade-4-active", "IN_PROGRESS", {
    source: "UNIVERSAL_CURRICULUM",
    lastActivityAt: "2026-08-13T00:00:00.000Z",
  });
  const dashboard = buildStudentCompetencyDashboard({
    progress: progress(4, [fresh, active]),
    now,
    adaptivePilotEnabled: false,
  });

  assert.ok(dashboard?.recommendation);
  assert.equal(dashboard.recommendation.candidateId, active.unitId);
  assert.equal(dashboard.recommendedUnit?.status, "IN_PROGRESS");
  assert.equal(dashboard.recommendation.schoolGrade, 4);
});

function scoring(totalXp: number): StudentScoringSummary {
  return {
    policyVersion: "PLAVE_SCORING_POLICY_V1",
    totalXp,
    recentXp: [],
    masterySummary: { started: 0, mastered: 0, needsReview: 0 },
    outcomes: [],
    attempts: [],
  };
}

function motivation(totalXp: number): MotivationSummary {
  return {
    policyVersion: PLAVE_MOTIVATION_POLICY_V1,
    timezone: MOTIVATION_TIMEZONE,
    level: {
      level: 1,
      totalXp,
      currentThreshold: 0,
      nextThreshold: 100,
      xpRemaining: Math.max(0, 100 - totalXp),
      maxLevel: false,
    },
    streak: {
      currentStreakDays: 0,
      longestStreakDays: 0,
      lastQualifyingDate: null,
      qualifiedToday: false,
      timezone: MOTIVATION_TIMEZONE,
    },
    goals: {
      daily: {},
      weekly: {},
      dailyCompleted: false,
      weeklyCompleted: false,
    },
    achievements: [],
  };
}

test("the immutable-ledger scoring projection is the canonical XP aggregate", () => {
  const canonical = scoring(25);
  const consistent = reconcileStudentLearningEnrichment({
    scoring: canonical,
    motivation: motivation(25),
  });
  assert.equal(consistent.consistency, "CONSISTENT");
  assert.equal(consistent.scoring?.totalXp, 25);
  assert.equal(consistent.motivation?.level.totalXp, 25);

  const conflicting = reconcileStudentLearningEnrichment({
    scoring: canonical,
    motivation: motivation(0),
  });
  assert.equal(conflicting.consistency, "XP_MISMATCH");
  assert.equal(conflicting.scoring?.totalXp, 25);
  assert.equal(conflicting.motivation, null);
});

test("motivation cannot fabricate XP when canonical scoring is unavailable", () => {
  const result = reconcileStudentLearningEnrichment({
    scoring: null,
    motivation: motivation(25),
  });
  assert.equal(result.consistency, "SCORING_UNAVAILABLE");
  assert.equal(result.scoring, null);
  assert.equal(result.motivation, null);
});
