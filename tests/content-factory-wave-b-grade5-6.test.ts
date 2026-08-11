import { strict as assert } from "node:assert";
import test from "node:test";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import { gradeFiveWaveAPack } from "../lib/content-factory/grade5-wave-a.ts";
import {
  gradeFiveCombinedWaves,
  gradeFiveWaveBBundleHash,
  gradeFiveWaveBMetadata,
  gradeFiveWaveBPack,
} from "../lib/content-factory/grade5-wave-b.ts";
import { gradeSixWaveAPack } from "../lib/content-factory/grade6-wave-a.ts";
import {
  gradeSixCombinedWaves,
  gradeSixWaveBBundleHash,
  gradeSixWaveBMetadata,
  gradeSixWaveBPack,
} from "../lib/content-factory/grade6-wave-b.ts";
import { requiredAutomatedEvidenceChecks } from "../lib/content-factory/review.ts";
import { simulateCandidate } from "../lib/content-factory/simulation.ts";
import { validateCrossPackDuplicates, validateGradePack } from "../lib/content-factory/validation.ts";

const gcd = (left: number, right: number): number => right === 0 ? Math.abs(left) : gcd(right, left % right);
const lcm = (left: number, right: number) => Math.abs(left * right) / gcd(left, right);
const fraction = (numerator: number, denominator: number) => {
  const divisor = gcd(numerator, denominator);
  return denominator / divisor === 1 ? String(numerator / divisor) : `${numerator / divisor}/${denominator / divisor}`;
};
const isPrime = (value: number) => value > 1 && Array.from({ length: Math.max(0, Math.floor(Math.sqrt(value)) - 1) }, (_, index) => index + 2).every((divisor) => value % divisor !== 0);

function expandPrimeFactorization(value: string) {
  let product = 1;
  for (const factor of value.split("×")) {
    const match = /^(\d+)(?:\^(\d+))?$/u.exec(factor);
    if (!match) return null;
    const base = Number(match[1]);
    const exponent = Number(match[2] ?? 1);
    if (!isPrime(base)) return null;
    product *= base ** exponent;
  }
  return product;
}

test("Grade 5 and 6 Wave B packs satisfy source, evidence, hidden-state and diversity contracts", () => {
  for (const pack of [gradeFiveWaveBPack, gradeSixWaveBPack]) {
    assert.equal(pack.questions.length, 24);
    assert.deepEqual(pack.quarantinedQuestions, []);
    assert.deepEqual(pack.release, { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false });
    assert.equal(pack.sources.every((source) => source.status === "VERIFIED_REPOSITORY_SOURCE"), true);
    assert.equal(pack.questions.every((question) => question.reviewStatus === "BUNDLED" && !question.published && !question.pilotEligible), true);
    assert.equal(pack.questions.every((question) => question.validationReceiptIds?.length === requiredAutomatedEvidenceChecks.length), true);
    assert.equal(pack.production?.wave, "B");
    assert.equal(pack.production?.generated, 24);
    assert.equal(pack.production?.candidateEligible, 24);
    assert.equal(new Set(pack.questions.map((question) => question.duplicateFingerprint)).size, 24);
    assert.deepEqual(new Set(pack.questions.map((question) => question.instructionalPurpose)), new Set(["FOUNDATION", "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "TRANSFER_APPLICATION"]));
    assert.deepEqual(validateGradePack(pack).filter((diagnostic) => diagnostic.severity !== "INFO"), []);
  }
  assert.deepEqual(validateCrossPackDuplicates([gradeFiveWaveAPack, gradeFiveWaveBPack, gradeSixWaveAPack, gradeSixWaveBPack]), []);
});

test("Grade 5 fraction Wave B passes an independent exact rational oracle", () => {
  for (const question of gradeFiveWaveBPack.questions.slice(0, 6)) {
    const match = /phân số (\d+)\/(\d+)/u.exec(question.prompt);
    assert.ok(match);
    assert.equal(question.answer.exactValue, fraction(Number(match[1]), Number(match[2])));
  }
  for (const question of gradeFiveWaveBPack.questions.slice(6, 12)) {
    const match = /: (\d+)\/(\d+) … (\d+)\/(\d+)/u.exec(question.prompt);
    assert.ok(match);
    const difference = Number(match[1]) * Number(match[4]) - Number(match[3]) * Number(match[2]);
    assert.equal(question.answer.exactValue, difference < 0 ? "<" : difference > 0 ? ">" : "=");
  }
  for (const question of gradeFiveWaveBPack.questions.slice(12, 18)) {
    const match = /Tính (\d+)\/(\d+) ([+−]) (\d+)\/(\d+)/u.exec(question.prompt);
    assert.ok(match);
    const [leftNumerator, leftDenominator, rightNumerator, rightDenominator] = [Number(match[1]), Number(match[2]), Number(match[4]), Number(match[5])];
    const numerator = match[3] === "+"
      ? leftNumerator * rightDenominator + rightNumerator * leftDenominator
      : leftNumerator * rightDenominator - rightNumerator * leftDenominator;
    assert.equal(question.answer.exactValue, fraction(numerator, leftDenominator * rightDenominator));
  }
  for (const question of gradeFiveWaveBPack.questions.slice(18)) {
    const match = /Tính (\d+)\/(\d+) ([×:]) (\d+)\/(\d+)/u.exec(question.prompt);
    assert.ok(match);
    const [leftNumerator, leftDenominator, rightNumerator, rightDenominator] = [Number(match[1]), Number(match[2]), Number(match[4]), Number(match[5])];
    const numerator = match[3] === "×" ? leftNumerator * rightNumerator : leftNumerator * rightDenominator;
    const denominator = match[3] === "×" ? leftDenominator * rightDenominator : leftDenominator * rightNumerator;
    assert.equal(question.answer.exactValue, fraction(numerator, denominator));
  }
});

test("Grade 6 number-theory Wave B passes independent divisor, prime, factorization, GCD and LCM oracles", () => {
  for (const question of gradeSixWaveBPack.questions.slice(0, 6)) {
    const number = Number(/ước của (\d+)/u.exec(question.prompt)?.[1]);
    assert.equal(Number.isSafeInteger(number), true);
    const valid = question.options!.filter((option) => number % Number(option) === 0);
    assert.deepEqual(valid, [question.answer.exactValue]);
  }
  assert.ok(new Set(gradeSixWaveBPack.questions.slice(0, 6).map((question) => question.options!.indexOf(question.answer.exactValue!))).size > 2);
  for (const question of gradeSixWaveBPack.questions.slice(6, 12)) {
    const number = Number(/Số (\d+)/u.exec(question.prompt)?.[1]);
    assert.equal(question.answer.exactValue, isPrime(number) ? "A" : "B");
    assert.equal(question.options?.[question.answer.exactValue === "A" ? 0 : 1], isPrime(number) ? "số nguyên tố" : "hợp số");
  }
  for (const question of gradeSixWaveBPack.questions.slice(12, 18)) {
    const number = Number(/Phân tích (\d+)/u.exec(question.prompt)?.[1]);
    assert.equal(expandPrimeFactorization(question.answer.exactValue!), number);
    assert.equal(question.options?.filter((option) => expandPrimeFactorization(option) === number).length, 1);
    assert.equal(question.options?.filter((option) => option === question.answer.exactValue).length, 1);
  }
  assert.ok(new Set(gradeSixWaveBPack.questions.slice(12, 18).map((question) => question.options!.indexOf(question.answer.exactValue!))).size > 2);
  for (const question of gradeSixWaveBPack.questions.slice(18)) {
    const match = /Tìm (ƯCLN|BCNN)\((\d+), (\d+)\)/u.exec(question.prompt);
    assert.ok(match);
    const expected = match[1] === "ƯCLN" ? gcd(Number(match[2]), Number(match[3])) : lcm(Number(match[2]), Number(match[3]));
    assert.equal(question.answer.exactValue, String(expected));
  }
});

test("Wave B candidate hashes, titles, prerequisites and next targets remain deterministic", () => {
  assert.equal(gradeFiveWaveBBundleHash, "b9177c788ee070dec73ac2cbec0591dc0a1b853c68baa9dc828d41ea5aca9603");
  assert.equal(gradeSixWaveBBundleHash, "7dd97c48fdb969488594949a5e85fcc6de8211f52b05d6ee61b31db00535e073");
  assert.equal(gradeFiveWaveBMetadata.title, "Phân số: rút gọn, so sánh và phép tính");
  assert.equal(gradeSixWaveBMetadata.title, "Ước, bội, số nguyên tố, phân tích thừa số, ƯCLN và BCNN");
  assert.deepEqual(gradeFiveWaveBMetadata.sourceOutcomeIds, ["MOET2018-G5-NUM-P041-010", "MOET2018-G5-NUM-P041-009", "MOET2018-G5-NUM-P041-013", "MOET2018-G5-NUM-P041-012"]);
  assert.deepEqual(gradeSixWaveBMetadata.sourceOutcomeIds, ["MOET2018-G6-NAA-P047-006", "MOET2018-G6-NAA-P048-018", "MOET2018-G6-NAA-P048-027", "MOET2018-G6-NAA-P048-030"]);
  assert.deepEqual(gradeFiveWaveBMetadata.nextTargetOutcomeIds, ["MOET2018-G5-NUM-P041-006", "MOET2018-G5-NUM-P041-007"]);
  assert.deepEqual(gradeSixWaveBMetadata.nextTargetOutcomeIds, ["MOET2018-G6-NAA-P048-028"]);
  assert.ok(gradeFiveWaveBPack.prerequisites.some((edge) => edge.fromSkillId === "moet2018-g4-num-p035-011"));
  assert.ok(gradeSixWaveBPack.prerequisites.some((edge) => edge.fromSkillId === "moet2018-g6-naa-p047-003"));
  assert.deepEqual(buildDeterministicBundle([gradeFiveWaveBPack, gradeSixWaveBPack]), buildDeterministicBundle([gradeSixWaveBPack, gradeFiveWaveBPack]));
});

test("combined Wave A and B exports preserve Wave A and remain simulation compatible", () => {
  assert.equal(gradeFiveCombinedWaves.questions.length, 48);
  assert.equal(gradeSixCombinedWaves.questions.length, 48);
  assert.equal(canonicalize(gradeFiveCombinedWaves.questions.slice(0, 24)), canonicalize(gradeFiveWaveAPack.questions));
  assert.equal(canonicalize(gradeSixCombinedWaves.questions.slice(0, 24)), canonicalize(gradeSixWaveAPack.questions));
  assert.equal(gradeFiveCombinedWaves.production?.wave, "A+B");
  assert.equal(gradeSixCombinedWaves.production?.wave, "A+B");
  assert.deepEqual(validateGradePack(gradeFiveCombinedWaves).filter((diagnostic) => diagnostic.severity !== "INFO"), []);
  assert.deepEqual(validateGradePack(gradeSixCombinedWaves).filter((diagnostic) => diagnostic.severity !== "INFO"), []);
  for (const combined of [gradeFiveCombinedWaves, gradeSixCombinedWaves]) {
    const answers = combined.questions.slice(0, 4).map((question, index) => ({ submissionId: `wave-b-synthetic-${index}`, questionId: question.id, correct: index < 3 }));
    const result = simulateCandidate(combined.grade, combined.questions, { version: "combined-wave-a-b-simulation", minimumQuestions: 3, maximumQuestions: 8, masteryCorrect: 3 }, answers);
    assert.equal(result.status, "MASTERED_EARLY");
    assert.equal(result.solutionLeakage, false);
    assert.equal(result.startResumeIdempotent, true);
    assert.equal(result.casConflictsRejected, 1);
  }
});
