import { strict as assert } from "node:assert";
import test from "node:test";

import {
  gradeTwoNumbersTo1000AdaptivePolicy,
  planAdaptivePractice,
  planDelayedRetentionCheck,
  summarizeSkillMastery,
  validateAdaptivePracticePolicy,
  type AdaptiveAnswerEvidence,
  type AdaptivePracticePolicy,
} from "../lib/content-engine/adaptive-practice.ts";
import {
  generateGradeTwoNumbersTo1000Draft,
} from "../lib/content-engine/grade2-numbers-to-1000.ts";
import {
  createGradeTwoNumbersTo1000ReviewPackage,
  validateGradeTwoNumbersTo1000ReviewPackage,
} from "../lib/content-engine/grade2-numbers-to-1000-review.ts";

const draft = generateGradeTwoNumbersTo1000Draft(
  "adaptive-planner-bank",
);
const questions = draft.bundles.map(({ question }) => question);
const requiredSkills =
  gradeTwoNumbersTo1000AdaptivePolicy.requiredSkillCoverage;

function evidenceForSkill(
  skillFamilyId: string,
  correctness: readonly boolean[],
  suffix: string,
): AdaptiveAnswerEvidence[] {
  return correctness.map((isCorrect, index) => ({
    questionCode: `${suffix}-${skillFamilyId}-${index}`,
    skillFamilyId,
    isCorrect,
  }));
}

function allCorrectEvidence(countPerSkill: number) {
  return requiredSkills.flatMap((skillFamilyId) =>
    evidenceForSkill(
      skillFamilyId,
      Array.from({ length: countPerSkill }, () => true),
      "correct",
    ),
  );
}

test("Sprint 6D 1. Adaptive direction is approved while thresholds remain hypothetical", () => {
  const result = validateAdaptivePracticePolicy(
    gradeTwoNumbersTo1000AdaptivePolicy,
  );
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(
    gradeTwoNumbersTo1000AdaptivePolicy.modeDecisionStatus,
    "PRODUCT_DECISION",
  );
  assert.equal(
    gradeTwoNumbersTo1000AdaptivePolicy.thresholdDecisionStatus,
    "PRODUCT_HYPOTHESIS",
  );
  assert.equal(
    gradeTwoNumbersTo1000AdaptivePolicy.reviewSampleSize,
    24,
  );
  assert.equal(gradeTwoNumbersTo1000AdaptivePolicy.minQuestions, 12);
  assert.equal(gradeTwoNumbersTo1000AdaptivePolicy.maxQuestions, 24);
});

test("Sprint 6D 2. Invalid policy configurations fail closed", () => {
  const insufficientMaximum = {
    ...gradeTwoNumbersTo1000AdaptivePolicy,
    maxQuestions: 4,
  };
  const invalidThreshold = {
    ...gradeTwoNumbersTo1000AdaptivePolicy,
    masteryThreshold: 1.1,
  };
  const duplicatedCoverage = {
    ...gradeTwoNumbersTo1000AdaptivePolicy,
    requiredSkillCoverage: [
      requiredSkills[0] ?? "",
      requiredSkills[0] ?? "",
    ],
  };
  assert.equal(
    validateAdaptivePracticePolicy(insufficientMaximum).valid,
    false,
  );
  assert.equal(
    validateAdaptivePracticePolicy(invalidThreshold).valid,
    false,
  );
  assert.equal(
    validateAdaptivePracticePolicy(duplicatedCoverage).valid,
    false,
  );
});

test("Sprint 6D 3. Same planner state and seed produce the same decision", () => {
  const state = { evidence: [], availableQuestions: questions };
  const first = planAdaptivePractice(
    gradeTwoNumbersTo1000AdaptivePolicy,
    state,
    "same-decision",
  );
  const second = planAdaptivePractice(
    gradeTwoNumbersTo1000AdaptivePolicy,
    state,
    "same-decision",
  );
  assert.deepEqual(first, second);
});

test("Sprint 6D 4. Missing skill coverage is selected before score optimization", () => {
  const firstSkill = requiredSkills[0];
  const secondSkill = requiredSkills[1];
  assert.ok(firstSkill);
  assert.ok(secondSkill);
  const evidence = evidenceForSkill(
    firstSkill,
    [true, true],
    "coverage",
  );
  const decision = planAdaptivePractice(
    gradeTwoNumbersTo1000AdaptivePolicy,
    { evidence, availableQuestions: questions },
    "coverage-seed",
  );
  assert.equal(decision.kind, "SELECT_QUESTION");
  if (decision.kind !== "SELECT_QUESTION") return;
  assert.equal(decision.reason, "MISSING_SKILL_COVERAGE");
  assert.equal(decision.skillFamilyId, secondSkill);
});

test("Sprint 6D 5. A weak skill is prioritized after every skill has evidence", () => {
  const weakSkill = requiredSkills[1];
  assert.ok(weakSkill);
  const evidence = requiredSkills.flatMap((skillFamilyId) =>
    evidenceForSkill(
      skillFamilyId,
      skillFamilyId === weakSkill ? [false, false] : [true, true],
      "weak",
    ),
  );
  const decision = planAdaptivePractice(
    gradeTwoNumbersTo1000AdaptivePolicy,
    { evidence, availableQuestions: questions },
    "weak-seed",
  );
  assert.equal(decision.kind, "SELECT_QUESTION");
  if (decision.kind !== "SELECT_QUESTION") return;
  assert.equal(decision.reason, "WEAK_SKILL_PRIORITY");
  assert.equal(decision.skillFamilyId, weakSkill);
});

test("Sprint 6D 6. Weak-skill priority still prevents skill starvation", () => {
  const firstWeak = requiredSkills[0];
  const secondWeak = requiredSkills[1];
  const third = requiredSkills[2];
  const fourth = requiredSkills[3];
  assert.ok(firstWeak && secondWeak && third && fourth);
  const evidence = [
    ...evidenceForSkill(secondWeak, [true, false], "balance-b"),
    ...evidenceForSkill(third, [true, true], "balance-c"),
    ...evidenceForSkill(fourth, [true, true], "balance-d"),
    ...evidenceForSkill(firstWeak, [false, false], "balance-a"),
  ];
  const decision = planAdaptivePractice(
    gradeTwoNumbersTo1000AdaptivePolicy,
    { evidence, availableQuestions: questions },
    "balance-seed",
  );
  assert.equal(decision.kind, "SELECT_QUESTION");
  if (decision.kind !== "SELECT_QUESTION") return;
  assert.equal(decision.skillFamilyId, secondWeak);
});

test("Sprint 6D 7. Mastery is evaluated per skill, not hidden by an average", () => {
  const weakSkill = requiredSkills[3];
  assert.ok(weakSkill);
  const evidence = requiredSkills.flatMap((skillFamilyId) =>
    evidenceForSkill(
      skillFamilyId,
      skillFamilyId === weakSkill
        ? [false, false, false]
        : [true, true, true],
      "average-guard",
    ),
  );
  const mastery = summarizeSkillMastery(
    gradeTwoNumbersTo1000AdaptivePolicy,
    evidence,
  );
  assert.equal(
    mastery.find((skill) => skill.skillFamilyId === weakSkill)
      ?.mastered,
    false,
  );
  const decision = planAdaptivePractice(
    gradeTwoNumbersTo1000AdaptivePolicy,
    { evidence, availableQuestions: questions },
    "average-guard",
  );
  assert.equal(decision.kind, "SELECT_QUESTION");
  if (decision.kind !== "SELECT_QUESTION") return;
  assert.equal(decision.skillFamilyId, weakSkill);
});

test("Sprint 6D 8. Sufficient per-skill evidence allows early completion", () => {
  const evidence = allCorrectEvidence(3);
  assert.equal(evidence.length, 12);
  const decision = planAdaptivePractice(
    gradeTwoNumbersTo1000AdaptivePolicy,
    { evidence, availableQuestions: questions },
    "early-complete",
  );
  assert.equal(decision.kind, "COMPLETE");
  if (decision.kind !== "COMPLETE") return;
  assert.equal(
    decision.reason,
    "ADAPTIVE_MASTERY_EVIDENCE_MET",
  );
});

test("Sprint 6F planner continues to minQuestions after early per-skill mastery", () => {
  const evidence = allCorrectEvidence(2);
  assert.equal(evidence.length, 8);
  const decision = planAdaptivePractice(
    gradeTwoNumbersTo1000AdaptivePolicy,
    { evidence, availableQuestions: questions },
    "minimum-continuation",
  );
  assert.equal(decision.kind, "SELECT_QUESTION");
  if (decision.kind !== "SELECT_QUESTION") return;
  assert.equal(decision.reason, "BALANCED_MINIMUM_CONTINUATION");
});

test("Sprint 6D 9. Maximum questions stop without infinite extension", () => {
  const evidence = draft.bundles.map(({ question }, index) => ({
    questionCode: question.code,
    skillFamilyId: question.skillFamilyId,
    isCorrect:
      question.skillFamilyId !== requiredSkills[2] || index % 2 === 0,
  }));
  assert.equal(evidence.length, 24);
  const decision = planAdaptivePractice(
    gradeTwoNumbersTo1000AdaptivePolicy,
    { evidence, availableQuestions: questions },
    "maximum-stop",
  );
  assert.equal(decision.kind, "STOP_WITH_REMEDIATION");
  if (decision.kind !== "STOP_WITH_REMEDIATION") return;
  assert.equal(
    decision.reason,
    "MAXIMUM_REACHED_WITHOUT_MASTERY",
  );
  assert.ok(decision.remediationSkillIds.includes(requiredSkills[2] ?? ""));
});

test("Sprint 6D 10. Fixed mode does not end before its explicit target", () => {
  const fixedPolicy: AdaptivePracticePolicy = {
    ...gradeTwoNumbersTo1000AdaptivePolicy,
    mode: "FIXED",
    minQuestions: 12,
    maxQuestions: 12,
  };
  const beforeTarget = planAdaptivePractice(
    fixedPolicy,
    {
      evidence: allCorrectEvidence(2),
      availableQuestions: questions,
    },
    "fixed-before",
  );
  assert.equal(beforeTarget.kind, "SELECT_QUESTION");
  const atTarget = planAdaptivePractice(
    fixedPolicy,
    {
      evidence: allCorrectEvidence(3),
      availableQuestions: questions,
    },
    "fixed-at",
  );
  assert.equal(atTarget.kind, "COMPLETE");
  if (atTarget.kind !== "COMPLETE") return;
  assert.equal(atTarget.reason, "FIXED_QUESTION_TARGET_MET");
});

test("Sprint 6D 11. Delayed retention is scheduled as a separate result", () => {
  const plan = planDelayedRetentionCheck(
    gradeTwoNumbersTo1000AdaptivePolicy,
    "2026-07-29T00:00:00.000Z",
  );
  assert.equal(plan.dueAt, "2026-08-05T00:00:00.000Z");
  assert.equal(plan.questionCount, 4);
  assert.equal(plan.resultIsSeparateFromInitialAttempt, true);
  assert.equal(plan.decisionStatus, "PRODUCT_HYPOTHESIS");
});

test("Sprint 6D 12. Planner question decisions contain no answer or solution", () => {
  const decision = planAdaptivePractice(
    gradeTwoNumbersTo1000AdaptivePolicy,
    { evidence: [], availableQuestions: questions },
    "client-boundary",
  );
  assert.equal(decision.kind, "SELECT_QUESTION");
  if (decision.kind !== "SELECT_QUESTION") return;
  assert.equal("correctAnswer" in decision.question, false);
  assert.equal("solutionSteps" in decision.question, false);
  assert.equal("audit" in decision.question, false);
});

test("Sprint 6D 13. Five-seed content review package is technically valid", () => {
  const reviewPackage = createGradeTwoNumbersTo1000ReviewPackage();
  const result =
    validateGradeTwoNumbersTo1000ReviewPackage(reviewPackage);
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(reviewPackage.seedPackages.length, 5);
  assert.equal(
    reviewPackage.unitDecisionStatus,
    "PRODUCT_DECISION",
  );
  assert.equal(
    reviewPackage.skillFamilyDecisionStatus,
    "PRODUCT_DECISION",
  );
  assert.equal(
    reviewPackage.sampleSizeDecisionStatus,
    "PRODUCT_HYPOTHESIS",
  );
  assert.equal(
    reviewPackage.governance.officialSourceValidation,
    "VALIDATED",
  );
  assert.equal(
    reviewPackage.governance.technicalValidation,
    "PASSED",
  );
  assert.equal(
    reviewPackage.governance.expertReview,
    "OPTIONAL_NOT_OBTAINED",
  );
  assert.equal(
    reviewPackage.governance.publicationStatus,
    "DRAFT",
  );
  assert.equal(
    reviewPackage.seedPackages.reduce(
      (total, seedPackage) => total + seedPackage.samples.length,
      0,
    ),
    120,
  );
  for (const seedPackage of reviewPackage.seedPackages) {
    assert.equal(seedPackage.samples.length, 24);
    for (const sample of seedPackage.samples) {
      assert.ok(sample.correctAnswer.length > 0);
      assert.ok(sample.solutionSteps.length >= 2);
      assert.ok(sample.accessibilityDescription.length >= 12);
    }
  }
});

test("Sprint 6D 14. Generated wording omits meaningless leading zero places", () => {
  const reviewPackage = createGradeTwoNumbersTo1000ReviewPackage();
  for (const seedPackage of reviewPackage.seedPackages) {
    for (const sample of seedPackage.samples) {
      assert.doesNotMatch(
        sample.prompt,
        /Số gồm 0 (?:nghìn|trăm)/i,
      );
    }
  }
});

test("Sprint 6D 15. Duplicate or out-of-policy planner bank fails closed", () => {
  const firstQuestion = questions[0];
  assert.ok(firstQuestion);
  assert.throws(
    () =>
      planAdaptivePractice(
        gradeTwoNumbersTo1000AdaptivePolicy,
        {
          evidence: [],
          availableQuestions: [
            firstQuestion,
            firstQuestion,
          ],
        },
        "duplicate-bank",
      ),
    /question bank không hợp lệ/,
  );
});
