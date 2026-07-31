import assert from "node:assert/strict";
import test from "node:test";

import {
  generateOnDemandAttemptSnapshot,
  getOnDemandContentReleaseHash,
  isTrueParametricOutcome,
  ON_DEMAND_QUESTION_COUNT,
  serializeOnDemandSnapshotForSigning,
  verifyOnDemandAttemptSnapshot,
} from "../lib/curriculum/on-demand-generation.ts";
import {
  auditOutcomeGenerationCoverage,
} from "../lib/curriculum/generation-coverage.ts";
import { curriculumUnits } from "../lib/curriculum/registry.ts";

const representativeUnits = [
  "grade-1-number-foundations-p0",
  "grade-2-number-order-and-line-p0",
  "grade-3-number-sense-to-100000-p1",
  "grade-4-place-value-millions-p1",
  "grade-5-natural-number-fluency-p1",
  "grade-6-natural-representation-p1",
  "grade-7-rational-number-foundations-p1",
  "grade-8-secondary-geo-p1-6",
  "grade-9-secondary-naa-p1-1",
] as const;

test("on-demand contract generates deterministic immutable snapshots Grades 1–9", () => {
  for (const [index, unitId] of representativeUnits.entries()) {
    const grade = (index + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
    const input = {
      grade,
      unitId,
      seed: `grade-${grade}-acceptance-alpha`,
      selectionReason: "NO_EVIDENCE" as const,
    };
    const first = generateOnDemandAttemptSnapshot(input);
    const replay = generateOnDemandAttemptSnapshot(input);
    const variant = generateOnDemandAttemptSnapshot({
      ...input,
      seed: `grade-${grade}-acceptance-bravo`,
    });

    assert.deepEqual(first, replay);
    assert.notDeepEqual(first.questions, variant.questions);
    assert.equal(first.questions.length, ON_DEMAND_QUESTION_COUNT);
    assert.equal(first.solutions.length, ON_DEMAND_QUESTION_COUNT);
    assert.equal(first.contentReleaseHash, getOnDemandContentReleaseHash());
    assert.equal(verifyOnDemandAttemptSnapshot(first), true);
    assert.equal(
      serializeOnDemandSnapshotForSigning(first),
      serializeOnDemandSnapshotForSigning(replay),
    );
    assert.ok(
      first.questions.every(
        (question) =>
          question.contract.grade === grade &&
          question.contract.unitId === unitId &&
          question.contract.skillTitle.trim().length >= 2 &&
          isTrueParametricOutcome(question.contract.outcomeId) &&
          /^[A-Z][A-Z0-9_]{2,79}$/u.test(
            question.provenance.semanticVariantId,
          ) &&
          question.provenance.semanticVariantVersion ===
            "plave-outcome-variant-v1" &&
          /^[A-Z][A-Z0-9_]{2,79}$/u.test(
            question.provenance.solverVersion,
          ) &&
          /^[0-9a-f]{64}$/u.test(
            question.provenance.solverReceiptHash,
          ) &&
          question.provenance.difficultyPolicyVersion ===
            "HEURISTIC_DIFFICULTY_V1" &&
          /^[0-9a-f]{16}$/u.test(
            question.provenance.seedFingerprint,
          ) &&
          /^[0-9a-f]{64}$/u.test(question.provenance.astHash) &&
          /^[0-9a-f]{64}$/u.test(question.provenance.visualHash),
      ),
    );
  }
});

test("each Grade 1–9 has a safe strategy and unsupported units fail closed", () => {
  const safeUnitCountByGrade = new Map<number, number>();
  let unsupportedUnitCount = 0;
  for (const unit of curriculumUnits) {
    try {
      const snapshot = generateOnDemandAttemptSnapshot({
        grade: unit.grade,
        unitId: unit.slug,
        seed: `unit-${unit.grade}-${unit.slug.slice(-24)}`,
        selectionReason: "STUDENT_UNIT_CHOICE",
      });
      assert.equal(snapshot.questions.length, ON_DEMAND_QUESTION_COUNT);
      safeUnitCountByGrade.set(
        unit.grade,
        (safeUnitCountByGrade.get(unit.grade) ?? 0) + 1,
      );
    } catch (error) {
      assert.match(String(error), /NO_SAFE_STRATEGY/);
      unsupportedUnitCount += 1;
    }
  }
  assert.deepEqual([...safeUnitCountByGrade.keys()].sort(), [
    1, 2, 3, 4, 5, 6, 7, 8, 9,
  ]);
  assert.ok(unsupportedUnitCount > 0);
});

test("unsafe outcomes and grade mismatches fail closed", () => {
  const unit = curriculumUnits.find(
    (candidate) => candidate.slug === "grade-8-secondary-geo-p1-6",
  );
  assert.ok(unit);
  const unsafeOutcome = unit.officialOutcomeIds
    .find((outcomeId) => !isTrueParametricOutcome(outcomeId));
  assert.ok(unsafeOutcome);

  assert.throws(
    () =>
      generateOnDemandAttemptSnapshot({
        grade: 8,
        unitId: unit.slug,
        seed: "unsafe-outcome-check",
        selectionReason: "NO_EVIDENCE",
        preferredOutcomeIds: [unsafeOutcome],
      }),
    /UNSAFE_OUTCOME/,
  );
  assert.throws(
    () =>
      generateOnDemandAttemptSnapshot({
        grade: 7,
        unitId: unit.slug,
        seed: "grade-mismatch-check",
        selectionReason: "NO_EVIDENCE",
      }),
    /GRADE_UNIT_MISMATCH/,
  );
});

test("public question payload never contains solution fields", () => {
  const snapshot = generateOnDemandAttemptSnapshot({
    grade: 8,
    unitId: "grade-8-secondary-geo-p1-6",
    seed: "solution-boundary-check",
    selectionReason: "WEAK_RECENT_EVIDENCE",
  });
  const publicPayload = JSON.stringify(snapshot.questions);
  assert.doesNotMatch(
    publicPayload,
    /correctAnswer|normalizedCorrectAnswer|solutionSteps|privatePayloadHash|solverReceipt(?!Hash)|rawSeed/,
  );
});

test("all 171 classified true-parametric outcomes are callable on demand", () => {
  const outcomes = auditOutcomeGenerationCoverage().outcomes.filter(
    (outcome) => outcome.classification === "TRUE_PARAMETRIC",
  );
  assert.equal(outcomes.length, 171);
  for (const outcome of outcomes) {
    const unitId = outcome.mappedUnitIds.find((candidate) =>
      outcome.questionCodes.some((questionCode) =>
        questionCode.startsWith(`${candidate}-q`),
      ),
    );
    assert.ok(unitId, outcome.outcomeId);
    const snapshot = generateOnDemandAttemptSnapshot({
      grade: outcome.grade as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
      unitId,
      seed: `coverage-g${outcome.grade}-${outcome.outcomeId
        .toLocaleLowerCase("vi")
        .replace(/[^a-z0-9]+/g, "-")
        .slice(-42)}`,
      selectionReason: "NO_EVIDENCE",
      preferredOutcomeIds: [outcome.outcomeId],
    });
    assert.equal(snapshot.questions.length, ON_DEMAND_QUESTION_COUNT);
    assert.equal(
      new Set(
        snapshot.questions.map((question) =>
          JSON.stringify({
            prompt: question.prompt,
            visual: question.visual,
          }),
        ),
      ).size,
      ON_DEMAND_QUESTION_COUNT,
    );
  }
});
