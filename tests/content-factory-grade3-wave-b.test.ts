import assert from "node:assert/strict";
import test from "node:test";

import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize, normalizedDefinition, sha256 } from "../lib/content-factory/canonical.ts";
import { gradeThreeWaveAPack } from "../lib/content-factory/grade3-wave-a.ts";
import {
  createGradeThreeWaveBPack,
  createGradeThreeWavesABPack,
  gradeThreeWaveBBundleHash,
  gradeThreeWaveBMetadata,
  gradeThreeWaveBPack,
  gradeThreeWaveBProgression,
  gradeThreeWavesABBundleHash,
  gradeThreeWavesABPack,
} from "../lib/content-factory/grade3-wave-b.ts";
import { simulateCandidate } from "../lib/content-factory/simulation.ts";
import type { MathExpression } from "../lib/content-factory/types.ts";
import { validateCrossPackDuplicates, validateGradePack } from "../lib/content-factory/validation.ts";
import { assertWaveBProgressionContract } from "../lib/content-factory/wave-b.ts";

function independentOracle(expression: MathExpression): readonly [number, number] {
  const gcd = (left: number, right: number): number => right === 0 ? Math.abs(left) : gcd(right, left % right);
  const normalize = (numerator: number, denominator: number): readonly [number, number] => {
    assert.notEqual(denominator, 0);
    const divisor = gcd(numerator, denominator);
    return [Math.sign(denominator) * numerator / divisor, Math.abs(denominator) / divisor];
  };
  if (expression.op === "VALUE") return normalize(expression.numerator, expression.denominator);
  if (expression.op === "SQRT") assert.fail("Grade 3 Wave B does not permit root expressions");
  const [leftNumerator, leftDenominator] = independentOracle(expression.left);
  const [rightNumerator, rightDenominator] = independentOracle(expression.right);
  if (expression.op === "MULTIPLY") return normalize(leftNumerator * rightNumerator, leftDenominator * rightDenominator);
  if (expression.op === "DIVIDE") return normalize(leftNumerator * rightDenominator, leftDenominator * rightNumerator);
  if (expression.op === "ADD") return normalize(leftNumerator * rightDenominator + rightNumerator * leftDenominator, leftDenominator * rightDenominator);
  return normalize(leftNumerator * rightDenominator - rightNumerator * leftDenominator, leftDenominator * rightDenominator);
}

function carryPositions(multiplicand: number, multiplier: number) {
  const positions: number[] = [];
  let carry = 0;
  String(multiplicand).split("").reverse().forEach((digit, index) => {
    const product = Number(digit) * multiplier + carry;
    carry = Math.floor(product / 10);
    if (carry > 0) positions.push(index);
  });
  return positions;
}

test("Grade 3 Wave B binds the exact multiplication and division source outcomes", () => {
  assert.equal(gradeThreeWaveBMetadata.title, "Bảng nhân chia và phép nhân, chia với số có một chữ số");
  assert.deepEqual(gradeThreeWaveBMetadata.sourceOutcomeIds, [
    "MOET2018-G3-NUM-P029-010",
    "MOET2018-G3-NUM-P030-017",
    "MOET2018-G3-NUM-P030-018",
  ]);
  assert.deepEqual(gradeThreeWaveBMetadata.prerequisiteOutcomeIds, ["MOET2018-G3-NUM-P030-012"]);
  assert.deepEqual(gradeThreeWaveBMetadata.nextTargetOutcomeIds, ["MOET2018-G3-NUM-P030-015", "MOET2018-G3-NUM-P030-016"]);
  assert.equal(gradeThreeWaveBMetadata.prerequisiteEvidence, "HYPOTHESIS_REQUIRES_EVIDENCE");
  assert.equal(gradeThreeWaveBMetadata.nextTargetEvidence, "HYPOTHESIS_REQUIRES_EVIDENCE");
  assert.equal(assertWaveBProgressionContract(gradeThreeWavesABPack, gradeThreeWaveBProgression), true);
});

test("Grade 3 Wave B provides 24 unique questions with independent exact oracles", () => {
  const fingerprints = new Set<string>();
  const purposeCounts = new Map<string, number>();
  const skillCounts = new Map<string, number>();
  assert.equal(gradeThreeWaveBPack.questions.length, 24);
  assert.equal(gradeThreeWaveBPack.explanations.length, 24);
  assert.equal(gradeThreeWaveBPack.quarantinedQuestions?.length, 0);
  for (const question of gradeThreeWaveBPack.questions) {
    assert.ok(question.answer.derivation);
    const [numerator, denominator] = independentOracle(question.answer.derivation!);
    assert.equal(denominator, 1);
    assert.equal(question.answer.exactValue, String(numerator));
    const fingerprint = sha256(normalizedDefinition(`${question.prompt}|${question.options?.join("|") ?? ""}`).toLocaleLowerCase("vi"));
    assert.equal(question.duplicateFingerprint, fingerprint);
    assert.equal(fingerprints.has(fingerprint), false);
    fingerprints.add(fingerprint);
    purposeCounts.set(question.instructionalPurpose ?? "", (purposeCounts.get(question.instructionalPurpose ?? "") ?? 0) + 1);
    skillCounts.set(question.skillId, (skillCounts.get(question.skillId) ?? 0) + 1);
    assert.equal(question.unitId, "grade-3-multiplication-division");
    assert.equal(question.published, false);
    assert.equal(question.pilotEligible, false);
  }
  assert.deepEqual([...skillCounts.values()].sort((left, right) => left - right), [8, 8, 8]);
  assert.deepEqual([...purposeCounts.entries()].sort(), [
    ["FOUNDATION", 6],
    ["MISCONCEPTION_TARGETING", 6],
    ["REMEDIATION", 3],
    ["STANDARD_APPLICATION", 6],
    ["TRANSFER_APPLICATION", 3],
  ]);
  assert.deepEqual(validateGradePack(gradeThreeWaveBPack).filter((item) => item.severity !== "INFO"), []);
  assert.deepEqual(validateCrossPackDuplicates([gradeThreeWaveAPack, gradeThreeWaveBPack]), []);
});

test("Grade 3 one-digit multiplication respects its carry bound independently", () => {
  const multiplicationQuestions = gradeThreeWaveBPack.questions.filter((question) => question.skillId === "moet2018-g3-num-p030-018");
  assert.equal(multiplicationQuestions.length, 8);
  for (const question of multiplicationQuestions) {
    const expression = question.answer.derivation!;
    assert.equal(expression.op, "MULTIPLY");
    if (expression.op !== "MULTIPLY" || expression.left.op !== "VALUE" || expression.right.op !== "VALUE") assert.fail("Unexpected multiplication model");
    const carries = carryPositions(expression.left.numerator, expression.right.numerator);
    assert.ok(carries.length <= 2);
    assert.equal(carries.some((position, index) => index > 0 && position === carries[index - 1]! + 1), false);
  }
});

test("Grade 3 Wave B and cumulative A+B candidates are deterministic and hidden", () => {
  assert.equal(canonicalize(createGradeThreeWaveBPack()), canonicalize(createGradeThreeWaveBPack()));
  assert.equal(canonicalize(createGradeThreeWavesABPack()), canonicalize(createGradeThreeWavesABPack()));
  assert.equal(gradeThreeWaveBPack.candidate?.bundleHash, gradeThreeWaveBBundleHash);
  assert.equal(gradeThreeWavesABPack.candidate?.bundleHash, gradeThreeWavesABBundleHash);
  assert.equal(gradeThreeWavesABPack.questions.length, 48);
  assert.equal(canonicalize(gradeThreeWavesABPack.questions.slice(0, 24)), canonicalize(gradeThreeWaveAPack.questions));
  assert.deepEqual(validateGradePack(gradeThreeWavesABPack).filter((item) => item.severity !== "INFO"), []);
  assert.deepEqual(gradeThreeWaveBPack.release, { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false });
  assert.deepEqual(gradeThreeWavesABPack.release, gradeThreeWaveBPack.release);
  assert.deepEqual(buildDeterministicBundle([gradeThreeWavesABPack]), buildDeterministicBundle([createGradeThreeWavesABPack()]));
});

test("Grade 3 Wave B is simulation compatible without solution leakage", () => {
  const report = simulateCandidate(3, gradeThreeWaveBPack.questions, { version: "g3-wave-b-test", minimumQuestions: 4, maximumQuestions: 8, masteryCorrect: 4 }, gradeThreeWaveBPack.questions.slice(0, 4).map((question, index) => ({ submissionId: `g3b-${index}`, questionId: question.id, correct: true })));
  assert.equal(report.status, "MASTERED_EARLY");
  assert.equal(report.startResumeIdempotent, true);
  assert.equal(report.casConflictsRejected, 1);
  assert.equal(report.solutionLeakage, false);
});
