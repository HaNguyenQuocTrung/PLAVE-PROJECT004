import assert from "node:assert/strict";
import test from "node:test";

import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize, normalizedDefinition, sha256 } from "../lib/content-factory/canonical.ts";
import { gradeFourWaveAPack } from "../lib/content-factory/grade4-wave-a.ts";
import {
  createGradeFourWaveBPack,
  createGradeFourWavesABPack,
  gradeFourWaveBBundleHash,
  gradeFourWaveBMetadata,
  gradeFourWaveBPack,
  gradeFourWaveBProgression,
  gradeFourWavesABBundleHash,
  gradeFourWavesABPack,
} from "../lib/content-factory/grade4-wave-b.ts";
import { simulateCandidate } from "../lib/content-factory/simulation.ts";
import type { MathExpression } from "../lib/content-factory/types.ts";
import { validateCrossPackDuplicates, validateGradePack } from "../lib/content-factory/validation.ts";
import { assertWaveBProgressionContract } from "../lib/content-factory/wave-b.ts";

function oracle(expression: MathExpression): readonly [number, number] {
  const gcd = (left: number, right: number): number => right === 0 ? Math.abs(left) : gcd(right, left % right);
  const normalize = (numerator: number, denominator: number): readonly [number, number] => {
    assert.notEqual(denominator, 0);
    const divisor = gcd(numerator, denominator);
    return [Math.sign(denominator) * numerator / divisor, Math.abs(denominator) / divisor];
  };
  if (expression.op === "VALUE") return normalize(expression.numerator, expression.denominator);
  if (expression.op === "SQRT") assert.fail("Grade 4 Wave B does not permit root expressions");
  const [leftNumerator, leftDenominator] = oracle(expression.left);
  const [rightNumerator, rightDenominator] = oracle(expression.right);
  if (expression.op === "ADD") return normalize(leftNumerator * rightDenominator + rightNumerator * leftDenominator, leftDenominator * rightDenominator);
  if (expression.op === "SUBTRACT") return normalize(leftNumerator * rightDenominator - rightNumerator * leftDenominator, leftDenominator * rightDenominator);
  if (expression.op === "MULTIPLY") return normalize(leftNumerator * rightNumerator, leftDenominator * rightDenominator);
  return normalize(leftNumerator * rightDenominator, leftDenominator * rightNumerator);
}

const rationalString = ([numerator, denominator]: readonly [number, number]) => denominator === 1 ? String(numerator) : `${numerator}/${denominator}`;

test("Grade 4 Wave B uses the narrower source-backed fraction title and exact outcomes", () => {
  assert.equal(gradeFourWaveBMetadata.title, "Nhận biết, phân số bằng nhau và so sánh phân số");
  assert.deepEqual(gradeFourWaveBMetadata.sourceOutcomeIds, [
    "MOET2018-G4-NUM-P036-018",
    "MOET2018-G4-NUM-P036-019",
    "MOET2018-G4-NUM-P036-020",
  ]);
  assert.deepEqual(gradeFourWaveBMetadata.prerequisiteOutcomeIds, ["MOET2018-G3-NUM-P031-023"]);
  assert.deepEqual(gradeFourWaveBMetadata.nextTargetOutcomeIds, ["MOET2018-G4-NUM-P036-021", "MOET2018-G4-NUM-P036-022"]);
  assert.equal(gradeFourWaveBMetadata.prerequisiteEvidence, "HYPOTHESIS_REQUIRES_EVIDENCE");
  assert.equal(gradeFourWaveBMetadata.nextTargetEvidence, "HYPOTHESIS_REQUIRES_EVIDENCE");
  assert.equal(assertWaveBProgressionContract(gradeFourWavesABPack, gradeFourWaveBProgression), true);
});

test("Grade 4 Wave B provides 24 exact fraction questions without duplicates", () => {
  const fingerprints = new Set<string>();
  const purposeCounts = new Map<string, number>();
  const skillCounts = new Map<string, number>();
  assert.equal(gradeFourWaveBPack.questions.length, 24);
  assert.equal(gradeFourWaveBPack.explanations.length, 24);
  assert.equal(gradeFourWaveBPack.quarantinedQuestions?.length, 0);
  for (const question of gradeFourWaveBPack.questions) {
    if (question.answer.derivation) assert.equal(question.answer.exactValue, rationalString(oracle(question.answer.derivation)));
    if (question.answer.comparison) {
      const [leftNumerator, leftDenominator] = oracle(question.answer.comparison.left);
      const [rightNumerator, rightDenominator] = oracle(question.answer.comparison.right);
      const difference = leftNumerator * rightDenominator - rightNumerator * leftDenominator;
      const relation = difference < 0 ? "<" : difference > 0 ? ">" : "=";
      assert.equal(question.answer.exactValue, relation);
      assert.equal(question.answer.comparison.relation, relation);
    }
    const fingerprint = sha256(normalizedDefinition(`${question.prompt}|${question.options?.join("|") ?? ""}`).toLocaleLowerCase("vi"));
    assert.equal(question.duplicateFingerprint, fingerprint);
    assert.equal(fingerprints.has(fingerprint), false);
    fingerprints.add(fingerprint);
    purposeCounts.set(question.instructionalPurpose ?? "", (purposeCounts.get(question.instructionalPurpose ?? "") ?? 0) + 1);
    skillCounts.set(question.skillId, (skillCounts.get(question.skillId) ?? 0) + 1);
    assert.equal(question.unitId, "grade-4-fraction-foundations");
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
  assert.deepEqual(validateGradePack(gradeFourWaveBPack).filter((item) => item.severity !== "INFO"), []);
  assert.deepEqual(validateCrossPackDuplicates([gradeFourWaveAPack, gradeFourWaveBPack]), []);
});

test("Grade 4 comparison items obey the exact permitted denominator relationships", () => {
  const comparisons = gradeFourWaveBPack.questions.filter((question) => question.skillId === "moet2018-g4-num-p036-020");
  assert.equal(comparisons.length, 8);
  for (const question of comparisons) {
    const comparison = question.answer.comparison!;
    assert.equal(comparison.left.op, "VALUE");
    assert.equal(comparison.right.op, "VALUE");
    if (comparison.left.op !== "VALUE" || comparison.right.op !== "VALUE") assert.fail("Unexpected comparison expression");
    const leftDenominator = comparison.left.denominator;
    const rightDenominator = comparison.right.denominator;
    assert.ok(leftDenominator === rightDenominator || leftDenominator % rightDenominator === 0 || rightDenominator % leftDenominator === 0);
  }
});

test("Grade 4 Wave B and cumulative A+B candidates are deterministic and hidden", () => {
  assert.equal(canonicalize(createGradeFourWaveBPack()), canonicalize(createGradeFourWaveBPack()));
  assert.equal(canonicalize(createGradeFourWavesABPack()), canonicalize(createGradeFourWavesABPack()));
  assert.equal(gradeFourWaveBPack.candidate?.bundleHash, gradeFourWaveBBundleHash);
  assert.equal(gradeFourWavesABPack.candidate?.bundleHash, gradeFourWavesABBundleHash);
  assert.equal(gradeFourWavesABPack.questions.length, 48);
  assert.equal(canonicalize(gradeFourWavesABPack.questions.slice(0, 24)), canonicalize(gradeFourWaveAPack.questions));
  assert.deepEqual(validateGradePack(gradeFourWavesABPack).filter((item) => item.severity !== "INFO"), []);
  assert.deepEqual(gradeFourWaveBPack.release, { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false });
  assert.deepEqual(gradeFourWavesABPack.release, gradeFourWaveBPack.release);
  assert.deepEqual(buildDeterministicBundle([gradeFourWavesABPack]), buildDeterministicBundle([createGradeFourWavesABPack()]));
});

test("Grade 4 Wave B is simulation compatible without solution leakage", () => {
  const report = simulateCandidate(4, gradeFourWaveBPack.questions, { version: "g4-wave-b-test", minimumQuestions: 4, maximumQuestions: 8, masteryCorrect: 4 }, gradeFourWaveBPack.questions.slice(0, 4).map((question, index) => ({ submissionId: `g4b-${index}`, questionId: question.id, correct: true })));
  assert.equal(report.status, "MASTERED_EARLY");
  assert.equal(report.startResumeIdempotent, true);
  assert.equal(report.casConflictsRejected, 1);
  assert.equal(report.solutionLeakage, false);
});
