import { strict as assert } from "node:assert";
import test from "node:test";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize, normalizedDefinition, sha256 } from "../lib/content-factory/canonical.ts";
import {
  createGradeFiveWaveAPack,
  gradeFiveWaveABundleHash,
  gradeFiveWaveAPack,
  gradeFiveWaveASourceMap,
} from "../lib/content-factory/grade5-wave-a.ts";
import {
  createGradeSixWaveAPack,
  gradeSixWaveABundleHash,
  gradeSixWaveAPack,
  gradeSixWaveASourceMap,
} from "../lib/content-factory/grade6-wave-a.ts";
import { validateOfficialSourceMap } from "../lib/content-factory/official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "../lib/content-factory/review.ts";
import { simulateCandidate } from "../lib/content-factory/simulation.ts";
import type { MathExpression } from "../lib/content-factory/types.ts";
import { validateCrossPackDuplicates, validateGradePack } from "../lib/content-factory/validation.ts";

const packs = [gradeFiveWaveAPack, gradeSixWaveAPack] as const;

const decimalHundredths = (text: string) => Math.round(Number(text.replace(",", ".")) * 100);

function independentInteger(expression: MathExpression): number {
  if (expression.op === "VALUE") {
    assert.equal(expression.denominator, 1);
    return expression.numerator;
  }
  if (expression.op === "SQRT") throw new Error("SQRT_NOT_SUPPORTED_BY_INTEGER_ORACLE");
  const left = independentInteger(expression.left);
  const right = independentInteger(expression.right);
  if (expression.op === "ADD") return left + right;
  if (expression.op === "SUBTRACT") return left - right;
  if (expression.op === "MULTIPLY") return left * right;
  assert.notEqual(right, 0);
  return left / right;
}

test("Grade 5 and 6 source maps are complete mechanical projections of source-locked repository evidence", () => {
  assert.deepEqual(validateOfficialSourceMap(5, gradeFiveWaveASourceMap.entries), []);
  assert.deepEqual(validateOfficialSourceMap(6, gradeSixWaveASourceMap.entries), []);
  assert.deepEqual(gradeFiveWaveASourceMap.structuralCoverage, { domains: 4, units: 16, skills: 52 });
  assert.deepEqual(gradeSixWaveASourceMap.structuralCoverage, { domains: 4, units: 26, skills: 86 });
  assert.deepEqual(gradeFiveWaveASourceMap.sourceGaps, []);
  assert.deepEqual(gradeSixWaveASourceMap.sourceGaps, []);
  assert.equal(gradeFiveWaveASourceMap.remainingContentOutcomeIds.length, 48);
  assert.equal(gradeSixWaveASourceMap.remainingContentOutcomeIds.length, 82);
  assert.equal(gradeFiveWaveASourceMap.entries.every((entry) => entry.sourceClassification === "SOURCE_VERIFIED"), true);
  assert.equal(gradeSixWaveASourceMap.entries.every((entry) => entry.sourceClassification === "SOURCE_VERIFIED"), true);
});

test("Wave A packs contain 24 evidence-gated original questions and explicit empty quarantines", () => {
  for (const pack of packs) {
    assert.equal(pack.questions.length, 24);
    assert.deepEqual(pack.quarantinedQuestions, []);
    assert.deepEqual(pack.production, {
      wave: "A",
      selectedSliceId: pack.grade === 5 ? "g5-decimal-operations" : "g6-integer-operations",
      selectionBasis: pack.grade === 5
        ? ["SOURCE_VERIFIED", "EXACT_ARITHMETIC", "NO_DIAGRAM_DEPENDENCY", "ADAPTIVE_SIMULATION_SUITABLE"]
        : ["SOURCE_VERIFIED", "EXACT_INTEGER_ARITHMETIC", "NO_DIAGRAM_DEPENDENCY", "ADAPTIVE_SIMULATION_SUITABLE"],
      generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24,
    });
    assert.equal(pack.questions.every((question) => question.reviewStatus === "BUNDLED" && !question.published && !question.pilotEligible && !question.fixtureOnly), true);
    assert.equal(pack.questions.every((question) => question.validationReceiptIds?.length === requiredAutomatedEvidenceChecks.length), true);
    assert.deepEqual(new Set(pack.questions.map((question) => question.instructionalPurpose)), new Set(["FOUNDATION", "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "TRANSFER_APPLICATION"]));
    assert.equal(new Set(pack.questions.map((question) => question.duplicateFingerprint)).size, 24);
    assert.deepEqual(validateGradePack(pack).filter((diagnostic) => diagnostic.severity !== "INFO"), []);
  }
  assert.deepEqual(validateCrossPackDuplicates(packs), []);
});

test("Grade 5 decimal questions pass an independent scaled-integer oracle", () => {
  for (const question of gradeFiveWaveAPack.questions.slice(0, 6)) {
    const match = /gồm (\d+) đơn vị, (\d+) phần mười và (\d+) phần trăm/u.exec(question.prompt);
    assert.ok(match);
    assert.equal(question.answer.exactValue, String((Number(match[1]) * 100 + Number(match[2]) * 10 + Number(match[3])) / 100));
  }
  for (const question of gradeFiveWaveAPack.questions.slice(6, 12)) {
    const match = /: ([\d,]+) hay ([\d,]+)\?/u.exec(question.prompt);
    assert.ok(match);
    assert.equal(question.answer.exactValue, decimalHundredths(match[1]!) > decimalHundredths(match[2]!) ? match[1] : match[2]);
  }
  for (const question of gradeFiveWaveAPack.questions.slice(12, 18)) {
    const match = /Tính ([\d,]+) ([+−]) ([\d,]+)\./u.exec(question.prompt);
    assert.ok(match);
    const left = decimalHundredths(match[1]!);
    const right = decimalHundredths(match[3]!);
    assert.equal(question.answer.exactValue, String((match[2] === "+" ? left + right : left - right) / 100));
  }
  for (const question of gradeFiveWaveAPack.questions.slice(18)) {
    const values = [...question.prompt.matchAll(/([\d,]+) m/gu)].map((match) => decimalHundredths(match[1]!));
    assert.equal(values.length, 2);
    assert.equal(question.answer.exactValue, String((values[0]! + values[1]!) / 100));
    assert.equal(question.answer.unit, "m");
  }
});

test("Grade 6 integer questions pass independent number-line, ordering and arithmetic oracles", () => {
  for (const question of gradeSixWaveAPack.questions.slice(0, 6)) {
    const match = /0 (\d+) đơn vị về phía (trái|phải)/u.exec(question.prompt);
    assert.ok(match);
    const distance = Number(match[1]);
    assert.equal(question.answer.exactValue, String(match[2] === "trái" ? -distance : distance));
  }
  for (const question of gradeSixWaveAPack.questions.slice(6, 12)) {
    const match = /: (-?\d+) … (-?\d+)\./u.exec(question.prompt);
    assert.ok(match);
    const left = Number(match[1]);
    const right = Number(match[2]);
    assert.equal(question.answer.exactValue, left === right ? "=" : left > right ? ">" : "<");
  }
  for (const question of gradeSixWaveAPack.questions.slice(12)) {
    assert.ok(question.answer.derivation);
    assert.equal(question.answer.exactValue, String(independentInteger(question.answer.derivation)));
  }
});

test("candidate tuples, source bindings and hidden release state are stable", () => {
  assert.deepEqual(gradeFiveWaveAPack.candidate, { candidateId: "g5-decimal-operations-wave-a", version: "g5-decimal-operations-1.0.0-wave-a", bundleHash: gradeFiveWaveABundleHash, policyVersion: "g5-decimal-adaptive-policy-1.0.0-wave-a" });
  assert.deepEqual(gradeSixWaveAPack.candidate, { candidateId: "g6-integer-operations-wave-a", version: "g6-integer-operations-1.0.0-wave-a", bundleHash: gradeSixWaveABundleHash, policyVersion: "g6-integer-adaptive-policy-1.0.0-wave-a" });
  for (const pack of packs) {
    assert.deepEqual(pack.release, { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false });
    assert.equal(pack.sources.every((source) => source.status === "VERIFIED_REPOSITORY_SOURCE"), true);
    assert.equal(pack.adaptivePolicy.status, "VALIDATED");
  }
  assert.ok(gradeFiveWaveAPack.prerequisites.some((edge) => edge.fromSkillId === "moet2018-g4-num-p035-011" && edge.evidence === "HYPOTHESIS_REQUIRES_EVIDENCE"));
  assert.ok(gradeSixWaveAPack.prerequisites.some((edge) => edge.fromSkillId === "moet2018-g5-num-p040-004" && edge.evidence === "HYPOTHESIS_REQUIRES_EVIDENCE"));
});

test("pack construction, fingerprints and merged bundle are deterministic", () => {
  assert.equal(canonicalize(createGradeFiveWaveAPack()), canonicalize(gradeFiveWaveAPack));
  assert.equal(canonicalize(createGradeSixWaveAPack()), canonicalize(gradeSixWaveAPack));
  assert.equal(gradeFiveWaveABundleHash, "62173fd4fbf22e919beb48f9cced020538fcb833b44f258b56ce48b861f6fbf8");
  assert.equal(gradeSixWaveABundleHash, "f3c1b317afb19a2c189d69516be4948b70d5e7e7270f9c6543db5e186d9bfea4");
  for (const pack of packs) for (const question of pack.questions) {
    assert.equal(question.duplicateFingerprint, sha256(normalizedDefinition(`${question.prompt}|${question.options?.join("|") ?? ""}`).toLocaleLowerCase("vi")));
  }
  const forward = buildDeterministicBundle(packs);
  const reverse = buildDeterministicBundle([...packs].reverse());
  assert.deepEqual(forward, reverse);
});

test("adaptive software simulations cover early mastery, remediation and maximum termination without leakage", () => {
  for (const pack of packs) {
    const policy = { version: pack.adaptivePolicy.version, minimumQuestions: 3, maximumQuestions: 6, masteryCorrect: 3 };
    const earlyAnswers = [
      { submissionId: "synthetic-1", questionId: pack.questions[0]!.id, correct: true },
      { submissionId: "synthetic-1", questionId: pack.questions[0]!.id, correct: true },
      { submissionId: "synthetic-2", questionId: pack.questions[1]!.id, correct: true },
      { submissionId: "synthetic-3", questionId: pack.questions[2]!.id, correct: true },
    ];
    const early = simulateCandidate(pack.grade, pack.questions, policy, earlyAnswers);
    assert.equal(early.status, "MASTERED_EARLY");
    assert.equal(early.duplicateSubmits, 1);
    assert.equal(early.casConflictsRejected, 1);
    assert.equal(early.solutionLeakage, false);
    const remediation = simulateCandidate(pack.grade, pack.questions, policy, [{ submissionId: "synthetic-r1", questionId: pack.questions[0]!.id, correct: false }]);
    assert.equal(remediation.status, "REMEDIATION_REQUIRED");
    const maximum = simulateCandidate(pack.grade, pack.questions, policy, pack.questions.slice(0, 6).map((question, index) => ({ submissionId: `synthetic-m${index}`, questionId: question.id, correct: false })));
    assert.equal(maximum.status, "MAXIMUM_REACHED");
    assert.equal(maximum.scoring.xp, 0);
    assert.equal(maximum.scoring.masteryEvidence, 6);
  }
});
