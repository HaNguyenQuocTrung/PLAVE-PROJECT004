import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  adaptiveSelectionHypotheses,
  selectAdaptiveCurriculumRecommendation,
} from "../lib/curriculum/adaptive-selection.ts";
import type {
  CurriculumProgressEvidence,
  StudentCurriculumProgress,
} from "../lib/curriculum-runtime/contracts.ts";

function progress(
  grade: number,
  outcomes: CurriculumProgressEvidence[] = [],
  skills: CurriculumProgressEvidence[] = [],
): StudentCurriculumProgress {
  return {
    grade,
    compatibilityMode:
      grade === 1
        ? "LEGACY_GRADE1_AGGREGATED"
        : "UNIVERSAL_CURRICULUM",
    masteryPolicyVersion: "product-hypothesis-v1",
    masteryExplanation: "PRODUCT_HYPOTHESIS",
    units: [],
    outcomes,
    skills,
  };
}

test("adaptive curriculum chooses a real no-evidence outcome in every Grade 1–9", () => {
  for (let grade = 1; grade <= 9; grade += 1) {
    const recommendation = selectAdaptiveCurriculumRecommendation({
      grade: grade as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
      progress: progress(grade),
      now: new Date("2026-07-31T00:00:00.000Z"),
    });
    assert.ok(recommendation);
    assert.equal(recommendation.grade, grade);
    assert.equal(recommendation.reasonCode, "NO_EVIDENCE");
    assert.equal(
      recommendation.hypothesisStatus,
      "PRODUCT_HYPOTHESIS",
    );
  }
});

test("frequent errors outrank unseen outcomes when error evidence is strong", () => {
  const initial = selectAdaptiveCurriculumRecommendation({
    grade: 8,
    progress: progress(8),
  });
  assert.ok(initial);
  const recommendation = selectAdaptiveCurriculumRecommendation({
    grade: 8,
    progress: progress(8, [
      {
        title: initial.outcomeTitle,
        evidenceCount: 6,
        correctCount: 1,
        masteryLabel: "NEEDS_PRACTICE",
        lastActivityAt: "2026-07-30T00:00:00.000Z",
        evidenceBasis: "AUTHORITATIVE_QUESTION_MAPPING",
      },
    ]),
    now: new Date("2026-07-31T00:00:00.000Z"),
  });
  assert.ok(recommendation);
  assert.equal(recommendation.outcomeId, initial.outcomeId);
  assert.equal(recommendation.reasonCode, "FREQUENT_ERRORS");
});

test("grade mismatch fails closed and thresholds remain hypotheses", () => {
  assert.equal(
    selectAdaptiveCurriculumRecommendation({
      grade: 9,
      progress: progress(8),
    }),
    null,
  );
  assert.deepEqual(adaptiveSelectionHypotheses, {
    frequentErrorMinimumEvidence: 3,
    frequentErrorAccuracy: 0.6,
    weakEvidenceAccuracy: 0.7,
    prerequisiteSecureAccuracy: 0.75,
    retentionDueDays: 21,
  });
});

test("Grades 2–9 catalog explains the evidence-based recommendation", () => {
  const learnPage = readFileSync(
    new URL("../app/learn/page.tsx", import.meta.url),
    "utf8",
  );
  const catalog = readFileSync(
    new URL(
      "../components/UniversalCurriculumCatalog.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(learnPage, /selectAdaptiveCurriculumRecommendation/);
  assert.match(catalog, /Gợi ý từ bằng chứng học tập/);
  assert.match(catalog, /recommendation\.explanation/);
  assert.match(catalog, /Giả thuyết sản phẩm/);
  assert.doesNotMatch(catalog, /schoolGrade|update.*grade/i);
});
