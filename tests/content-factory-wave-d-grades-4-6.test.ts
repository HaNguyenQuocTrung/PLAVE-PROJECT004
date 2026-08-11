import assert from "node:assert/strict";
import test from "node:test";

import { canonicalize } from "../lib/content-factory/canonical.ts";
import { gradeFourWaveAPack } from "../lib/content-factory/grade4-wave-a.ts";
import { gradeFourWaveBPack } from "../lib/content-factory/grade4-wave-b.ts";
import { gradeFourWaveCPack } from "../lib/content-factory/grade4-wave-c.ts";
import {
  createGradeFourWaveDPack,
  gradeFourWaveDBundleHash,
  gradeFourWaveDMetadata,
  gradeFourWaveDPack,
} from "../lib/content-factory/grade4-wave-d.ts";
import { gradeFiveWaveAPack } from "../lib/content-factory/grade5-wave-a.ts";
import { gradeFiveWaveBPack } from "../lib/content-factory/grade5-wave-b.ts";
import { gradeFiveWaveCPack } from "../lib/content-factory/grade5-wave-c.ts";
import {
  createGradeFiveWaveDPack,
  gradeFiveWaveDBundleHash,
  gradeFiveWaveDMetadata,
  gradeFiveWaveDPack,
} from "../lib/content-factory/grade5-wave-d.ts";
import { gradeSixWaveAPack } from "../lib/content-factory/grade6-wave-a.ts";
import { gradeSixWaveBPack } from "../lib/content-factory/grade6-wave-b.ts";
import { gradeSixWaveCPack } from "../lib/content-factory/grade6-wave-c.ts";
import {
  createGradeSixWaveDPack,
  gradeSixWaveDBundleHash,
  gradeSixWaveDMetadata,
  gradeSixWaveDPack,
} from "../lib/content-factory/grade6-wave-d.ts";
import { buildPrerequisiteGraph } from "../lib/content-factory/graph.ts";
import type { MathExpression } from "../lib/content-factory/types.ts";
import { validateCrossPackDuplicates, validateGradePack } from "../lib/content-factory/validation.ts";

type Rational = readonly [number, number];
const gcd = (left: number, right: number): number => right === 0 ? Math.abs(left) : gcd(right, left % right);
function normalize(numerator: number, denominator: number): Rational {
  assert.notEqual(denominator, 0);
  const divisor = gcd(numerator, denominator);
  return [Math.sign(denominator) * numerator / divisor, Math.abs(denominator) / divisor];
}
function oracle(expression: MathExpression): Rational {
  if (expression.op === "VALUE") return normalize(expression.numerator, expression.denominator);
  if (expression.op === "SQRT") assert.fail("Wave D Grades 4–6 shard does not permit root expressions");
  const [leftNumerator, leftDenominator] = oracle(expression.left);
  const [rightNumerator, rightDenominator] = oracle(expression.right);
  if (expression.op === "ADD") return normalize(leftNumerator * rightDenominator + rightNumerator * leftDenominator, leftDenominator * rightDenominator);
  if (expression.op === "SUBTRACT") return normalize(leftNumerator * rightDenominator - rightNumerator * leftDenominator, leftDenominator * rightDenominator);
  if (expression.op === "MULTIPLY") return normalize(leftNumerator * rightNumerator, leftDenominator * rightDenominator);
  return normalize(leftNumerator * rightDenominator, leftDenominator * rightNumerator);
}
function parseExact(value: string): Rational {
  const fraction = /^(-?\d+)\/([1-9]\d*)$/u.exec(value);
  if (fraction) return normalize(Number(fraction[1]), Number(fraction[2]));
  const decimal = /^(-?)(\d+)(?:\.(\d+))?$/u.exec(value);
  assert.ok(decimal, `Expected exact numeric answer, received ${value}`);
  const places = decimal[3]?.length ?? 0;
  return normalize(Number(`${decimal[1]}${decimal[2]}${decimal[3] ?? ""}`), 10 ** places);
}

test("Grades 4–6 Wave D source slices are retained, uncovered and narrowly bound", () => {
  assert.deepEqual(gradeFourWaveDMetadata.sourceOutcomeIds, ["MOET2018-G4-NUM-P037-026"]);
  assert.deepEqual(gradeFiveWaveDMetadata.sourceOutcomeIds, ["MOET2018-G5-NUM-P042-020", "MOET2018-G5-NUM-P042-018"]);
  assert.deepEqual(gradeSixWaveDMetadata.sourceOutcomeIds, ["MOET2018-G6-NAA-P049-042"]);
  assert.deepEqual(gradeFourWaveDMetadata.sourcePages, [37]);
  assert.deepEqual(gradeFiveWaveDMetadata.sourcePages, [42]);
  assert.deepEqual(gradeSixWaveDMetadata.sourcePages, [49]);
  assert.match(gradeFourWaveDMetadata.deferredGap, /P037-025/u);
  assert.match(gradeFiveWaveDMetadata.deferredGap, /Rounding/u);
  assert.match(gradeSixWaveDMetadata.deferredGap, /P049-031/u);
});

test("Grades 4–6 Wave D candidates pass hidden-state, evidence and count gates", () => {
  for (const pack of [gradeFourWaveDPack, gradeFiveWaveDPack, gradeSixWaveDPack]) {
    assert.equal(pack.questions.length, 24);
    assert.equal(pack.explanations.length, 24);
    assert.deepEqual(pack.quarantinedQuestions, []);
    assert.deepEqual(pack.release, { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false });
    assert.equal(pack.questions.every((question) => question.reviewStatus === "BUNDLED" && !question.published && !question.pilotEligible), true);
    assert.equal(pack.questions.every((question) => question.answer.derivation !== undefined), true);
    assert.equal(pack.production?.wave, "D");
    assert.equal(pack.production?.generated, 24);
    assert.equal(pack.production?.evidenceGatePassed, 24);
    assert.equal(pack.production?.candidateEligible, 24);
    assert.equal(pack.production?.rejected, 0);
    assert.equal(pack.production?.verificationInsufficient, 0);
    assert.equal(new Set(pack.questions.map((question) => question.duplicateFingerprint)).size, 24);
    assert.deepEqual(validateGradePack(pack).filter((diagnostic) => diagnostic.severity !== "INFO"), []);
  }
});

test("Grades 4–6 Wave D answers pass an independent exact oracle", () => {
  for (const pack of [gradeFourWaveDPack, gradeFiveWaveDPack, gradeSixWaveDPack]) {
    for (const question of pack.questions) {
      assert.ok(question.answer.derivation);
      assert.deepEqual(parseExact(question.answer.exactValue ?? ""), oracle(question.answer.derivation));
    }
  }
  assert.equal(gradeFourWaveDPack.questions.slice(12).every((question) => question.answer.derivation?.op === "DIVIDE"), true);
  assert.equal(gradeFiveWaveDPack.questions.slice(12).every((question) => question.answer.derivation?.op === "DIVIDE"), true);
  assert.equal(gradeSixWaveDPack.questions.slice(12).every((question) => question.answer.derivation?.op === "DIVIDE"), true);
});

test("Grades 4–6 Wave D progression is connected, acyclic and hypothesis-labelled", () => {
  const packs = [gradeFourWaveDPack, gradeFiveWaveDPack, gradeSixWaveDPack];
  const report = buildPrerequisiteGraph(packs);
  assert.deepEqual(report.diagnostics.filter((diagnostic) => diagnostic.severity === "ERROR"), []);
  for (const pack of packs) {
    const selectedSkills = new Set(pack.questions.map((question) => question.skillId));
    const connected = new Set(pack.prerequisites.flatMap((edge) => [edge.fromSkillId, edge.toSkillId]));
    assert.equal([...selectedSkills].every((skillId) => connected.has(skillId)), true);
    assert.equal(pack.prerequisites.every((edge) => edge.evidence === "HYPOTHESIS_REQUIRES_EVIDENCE"), true);
  }
});

test("Grades 4–6 Wave D candidates are deterministic and duplicate-clean across Waves A–D", () => {
  assert.equal(canonicalize(gradeFourWaveDPack), canonicalize(createGradeFourWaveDPack()));
  assert.equal(canonicalize(gradeFiveWaveDPack), canonicalize(createGradeFiveWaveDPack()));
  assert.equal(canonicalize(gradeSixWaveDPack), canonicalize(createGradeSixWaveDPack()));
  assert.equal(gradeFourWaveDBundleHash, "c6d8e45eb0959a0f9103806c9fcc9355a1240f51aefbe6aa71fc6ce596c78b7a");
  assert.equal(gradeFiveWaveDBundleHash, "8a00c0d8e8d697dc3988bf82fc2e8118e3acae2a87aeaf7350180756e9570d88");
  assert.equal(gradeSixWaveDBundleHash, "6e83bf05755259f82aee726169c050eba8a8182a4773fb2a43b499e79403a5f6");
  assert.deepEqual(validateCrossPackDuplicates([
    gradeFourWaveAPack, gradeFourWaveBPack, gradeFourWaveCPack, gradeFourWaveDPack,
    gradeFiveWaveAPack, gradeFiveWaveBPack, gradeFiveWaveCPack, gradeFiveWaveDPack,
    gradeSixWaveAPack, gradeSixWaveBPack, gradeSixWaveCPack, gradeSixWaveDPack,
  ]), []);
});
