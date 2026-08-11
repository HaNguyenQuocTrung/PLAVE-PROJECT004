import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize, normalizedDefinition, sha256 } from "../lib/content-factory/canonical.ts";
import {
  createGradeThreeWaveAPack,
  gradeThreeWaveABundleHash,
  gradeThreeWaveAPack,
  gradeThreeWaveASourceMap,
} from "../lib/content-factory/grade3-wave-a.ts";
import {
  createGradeFourWaveAPack,
  gradeFourWaveABundleHash,
  gradeFourWaveAPack,
  gradeFourWaveASourceMap,
} from "../lib/content-factory/grade4-wave-a.ts";
import { validateOfficialSourceMap } from "../lib/content-factory/official-source-map.ts";
import { simulateCandidate } from "../lib/content-factory/simulation.ts";
import type { MathExpression } from "../lib/content-factory/types.ts";
import { validateCrossPackDuplicates, validateGradePack } from "../lib/content-factory/validation.ts";

const packs = [gradeThreeWaveAPack, gradeFourWaveAPack] as const;
const sourceMaps = [gradeThreeWaveASourceMap, gradeFourWaveASourceMap] as const;

function independentRationalOracle(expression: MathExpression): readonly [number, number] {
  const gcd = (left: number, right: number): number => right === 0 ? Math.abs(left) : gcd(right, left % right);
  const normalize = (numerator: number, denominator: number): readonly [number, number] => {
    assert.notEqual(denominator, 0);
    const divisor = gcd(numerator, denominator);
    return [Math.sign(denominator) * numerator / divisor, Math.abs(denominator) / divisor];
  };
  if (expression.op === "VALUE") return normalize(expression.numerator, expression.denominator);
  if (expression.op === "SQRT") {
    const [numerator, denominator] = independentRationalOracle(expression.value);
    return normalize(Math.sqrt(numerator), Math.sqrt(denominator));
  }
  const [leftNumerator, leftDenominator] = independentRationalOracle(expression.left);
  const [rightNumerator, rightDenominator] = independentRationalOracle(expression.right);
  if (expression.op === "ADD") return normalize(leftNumerator * rightDenominator + rightNumerator * leftDenominator, leftDenominator * rightDenominator);
  if (expression.op === "SUBTRACT") return normalize(leftNumerator * rightDenominator - rightNumerator * leftDenominator, leftDenominator * rightDenominator);
  if (expression.op === "MULTIPLY") return normalize(leftNumerator * rightNumerator, leftDenominator * rightDenominator);
  return normalize(leftNumerator * rightDenominator, leftDenominator * rightNumerator);
}

test("Grades 3 and 4 source maps are mechanically source locked and structurally complete", () => {
  for (const sourceMap of sourceMaps) {
    assert.deepEqual(validateOfficialSourceMap(sourceMap.grade, sourceMap.entries), []);
    assert.ok(sourceMap.entries.length > 0);
    assert.ok(sourceMap.structuralCoverage.domains >= 4);
    assert.ok(sourceMap.structuralCoverage.units >= 10);
    assert.equal(
      sourceMap.structuralCoverage.skills,
      new Set(sourceMap.entries.map((entry) => entry.skillId)).size,
    );
    assert.ok(sourceMap.entries.every((entry) => entry.sourceClassification === "SOURCE_VERIFIED"));
    assert.ok(sourceMap.entries.every((entry) => entry.sourceReference.documentId === "MOET-MATH-2018"));
    assert.ok(sourceMap.entries.every((entry) => entry.sourceReference.documentSha256 === "f35d34ff84da2ca3f9ab72d5d67482ada414684b611deea98c4b329801b661ab"));
  }
});

test("each Wave A slice contains 24 independently recomputable evidence-gated questions", () => {
  for (const pack of packs) {
    assert.equal(pack.questions.length, 24);
    assert.equal(pack.explanations.length, 24);
    assert.equal(pack.quarantinedQuestions?.length, 0);
    assert.equal(pack.production?.evidenceGatePassed, 24);
    assert.equal(pack.production?.verificationInsufficient, 0);
    assert.equal(pack.production?.rejected, 0);
    assert.equal(pack.production?.duplicate, 0);
    const perSkill = new Map<string, number>();
    const purposes = new Set<string>();
    const fingerprints = new Set<string>();
    for (const question of pack.questions) {
      perSkill.set(question.skillId, (perSkill.get(question.skillId) ?? 0) + 1);
      purposes.add(question.instructionalPurpose ?? "");
      assert.ok(question.answer.derivation);
      const [numerator, denominator] = independentRationalOracle(question.answer.derivation!);
      assert.equal(denominator, 1);
      assert.equal(question.answer.exactValue, String(numerator));
      const expectedFingerprint = sha256(
        normalizedDefinition(`${question.prompt}|${question.options?.join("|") ?? ""}`).toLocaleLowerCase("vi"),
      );
      assert.equal(question.duplicateFingerprint, expectedFingerprint);
      assert.equal(fingerprints.has(expectedFingerprint), false);
      fingerprints.add(expectedFingerprint);
      assert.equal(question.published, false);
      assert.equal(question.pilotEligible, false);
      assert.equal(question.fixtureOnly, false);
    }
    assert.deepEqual([...perSkill.values()].sort((a, b) => a - b), [8, 8, 8]);
    assert.deepEqual([...purposes].sort(), [
      "FOUNDATION",
      "MISCONCEPTION_TARGETING",
      "REMEDIATION",
      "STANDARD_APPLICATION",
      "TRANSFER_APPLICATION",
    ]);
    assert.deepEqual(validateGradePack(pack).filter((diagnostic) => diagnostic.severity !== "INFO"), []);
  }
  assert.deepEqual(validateCrossPackDuplicates(packs), []);
});

test("Grades 3 and 4 candidates are hidden deny-all bundles with stable tuples", () => {
  assert.deepEqual(gradeThreeWaveAPack.candidate, {
    candidateId: "g3-additive-fluency-wave-a",
    version: "g3-additive-fluency-1.0.0-wave-a",
    bundleHash: gradeThreeWaveABundleHash,
    policyVersion: "g3-additive-fluency-policy-1.0.0-wave-a",
  });
  assert.deepEqual(gradeFourWaveAPack.candidate, {
    candidateId: "g4-natural-number-operations-wave-a",
    version: "g4-natural-number-operations-1.0.0-wave-a",
    bundleHash: gradeFourWaveABundleHash,
    policyVersion: "g4-natural-number-operations-policy-1.0.0-wave-a",
  });
  for (const pack of packs) assert.deepEqual(pack.release, {
    publication: "DRAFT",
    visibility: "HIDDEN",
    pilotEnabled: false,
    runtimeEnabled: false,
    retentionEnabled: false,
  });
  for (const pack of packs) {
    const manifest = JSON.parse(
      readFileSync(`content/grade-packs/grade-${pack.grade}/manifest.json`, "utf8"),
    ) as { candidate: unknown; publication: string; visibility: string; pilotEnabled: boolean; runtimeEnabled: boolean; retentionEnabled: boolean };
    assert.deepEqual(manifest.candidate, pack.candidate);
    assert.deepEqual(
      {
        publication: manifest.publication,
        visibility: manifest.visibility,
        pilotEnabled: manifest.pilotEnabled,
        runtimeEnabled: manifest.runtimeEnabled,
        retentionEnabled: manifest.retentionEnabled,
      },
      pack.release,
    );
  }
});

test("candidate construction and merged bundle generation are deterministic", () => {
  assert.equal(canonicalize(createGradeThreeWaveAPack()), canonicalize(createGradeThreeWaveAPack()));
  assert.equal(canonicalize(createGradeFourWaveAPack()), canonicalize(createGradeFourWaveAPack()));
  const first = buildDeterministicBundle(packs);
  const second = buildDeterministicBundle([...packs].reverse());
  assert.deepEqual(first, second);
});

test("adaptive simulations cover mastery, remediation, termination and duplicate submission without leakage", () => {
  for (const pack of packs) {
    const policy = { version: pack.adaptivePolicy.version, minimumQuestions: 4, maximumQuestions: 8, masteryCorrect: 4 };
    const masteryAnswers = pack.questions.slice(0, 5).map((question, index) => ({ submissionId: `mastery-${index}`, questionId: question.id, correct: index < 4 }));
    const mastery = simulateCandidate(pack.grade, pack.questions, policy, masteryAnswers);
    assert.equal(mastery.status, "MASTERED_EARLY");
    assert.equal(mastery.startResumeIdempotent, true);
    assert.equal(mastery.casConflictsRejected, 1);
    assert.equal(mastery.solutionLeakage, false);
    assert.ok(mastery.scoring.xp > 0);
    assert.ok(mastery.scoring.masteryEvidence >= 4);

    const maximumAnswers = pack.questions.slice(0, 8).map((question, index) => ({ submissionId: `maximum-${index}`, questionId: question.id, correct: index % 3 === 0 }));
    const maximum = simulateCandidate(pack.grade, pack.questions, policy, maximumAnswers);
    assert.equal(maximum.status, "MAXIMUM_REACHED");

    const firstQuestion = pack.questions[0]!;
    const duplicate = simulateCandidate(pack.grade, pack.questions, policy, [
      { submissionId: "same", questionId: firstQuestion.id, correct: false },
      { submissionId: "same", questionId: firstQuestion.id, correct: true },
    ]);
    assert.equal(duplicate.status, "REMEDIATION_REQUIRED");
    assert.equal(duplicate.duplicateSubmits, 1);
  }
});
