import { strict as assert } from "node:assert";
import test from "node:test";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import { gradeSevenWaveBPack, gradeSevenWavesAB } from "../lib/content-factory/grade7-wave-b.ts";
import { gradeEightWaveBPack, gradeEightWavesAB } from "../lib/content-factory/grade8-wave-b.ts";
import { gradeNineWaveBPack, gradeNineWavesAB } from "../lib/content-factory/grade9-wave-b.ts";
import { simulateCandidate } from "../lib/content-factory/simulation.ts";
import type { MathExpression } from "../lib/content-factory/types.ts";
import { validateCrossPackDuplicates, validateGradePack } from "../lib/content-factory/validation.ts";

type Fraction = Readonly<{ numerator: bigint; denominator: bigint }>;
const gcd = (left: bigint, right: bigint): bigint => right === 0n ? (left < 0n ? -left : left) : gcd(right, left % right);
const fraction = (numerator: bigint, denominator: bigint): Fraction => {
  if (denominator === 0n) throw new Error("ZERO_DENOMINATOR");
  const sign = denominator < 0n ? -1n : 1n;
  const divisor = gcd(numerator, denominator);
  return { numerator: sign * numerator / divisor, denominator: sign * denominator / divisor };
};
function independentEvaluate(expression: MathExpression): Fraction {
  if (expression.op === "VALUE") return fraction(BigInt(expression.numerator), BigInt(expression.denominator));
  if (expression.op === "SQRT") {
    const operand = independentEvaluate(expression.value);
    const numerator = BigInt(Math.sqrt(Number(operand.numerator)));
    const denominator = BigInt(Math.sqrt(Number(operand.denominator)));
    if (numerator * numerator !== operand.numerator || denominator * denominator !== operand.denominator) throw new Error("NON_EXACT_ROOT");
    return fraction(numerator, denominator);
  }
  const left = independentEvaluate(expression.left);
  const right = independentEvaluate(expression.right);
  if (expression.op === "ADD") return fraction(left.numerator * right.denominator + right.numerator * left.denominator, left.denominator * right.denominator);
  if (expression.op === "SUBTRACT") return fraction(left.numerator * right.denominator - right.numerator * left.denominator, left.denominator * right.denominator);
  if (expression.op === "MULTIPLY") return fraction(left.numerator * right.numerator, left.denominator * right.denominator);
  return fraction(left.numerator * right.denominator, left.denominator * right.numerator);
}
function parseDeclared(value: string): Fraction {
  const match = /^(-?\d+)(?:\/([1-9]\d*))?$/u.exec(value);
  assert.ok(match, value);
  return fraction(BigInt(match[1]!), BigInt(match[2] ?? "1"));
}

const packs = [gradeSevenWaveBPack, gradeEightWaveBPack, gradeNineWaveBPack] as const;
const expectedCandidates = [
  ["g7-finite-probability-wave-b-rc1", "g7-finite-probability-1.0.0-wave-b", "af84d222ace058dc75bfe766c486ecfae77c60922d459635587c2f9dacc16b21", "g7-finite-probability-policy-1.0.0-wave-b"],
  ["g8-pythagorean-wave-b-rc1", "g8-pythagorean-1.0.0-wave-b", "ccb8275d32a744a2387624339f82746efcafd385f27db37e1d7d9f0482954a0e", "g8-pythagorean-policy-1.0.0-wave-b"],
  ["g9-finite-probability-frequency-wave-b-rc1", "g9-finite-probability-frequency-1.0.0-wave-b", "fd8d624b16adcb20c6513c8bcab4ed117e87369d8ebb15e19bbba1c77b8c3151", "g9-finite-probability-frequency-policy-1.0.0-wave-b"],
] as const;

test("Grades 7-9 Wave B candidates are source verified, exact, diverse and hidden", () => {
  for (const [index, pack] of packs.entries()) {
    const [candidateId, version, bundleHash, policyVersion] = expectedCandidates[index]!;
    assert.deepEqual(pack.candidate, { candidateId, version, bundleHash, policyVersion });
    assert.equal(pack.questions.length, 24);
    assert.equal(pack.explanations.length, 24);
    assert.equal(pack.quarantinedQuestions?.length, 0);
    assert.deepEqual(pack.production && {
      wave: pack.production.wave,
      generated: pack.production.generated,
      evidenceGatePassed: pack.production.evidenceGatePassed,
      verificationInsufficient: pack.production.verificationInsufficient,
      rejected: pack.production.rejected,
      duplicate: pack.production.duplicate,
    }, { wave: "B", generated: 24, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0 });
    assert.deepEqual(validateGradePack(pack).filter((diagnostic) => diagnostic.severity !== "INFO"), []);
    assert.deepEqual(pack.release, { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false });
    assert.equal(new Set(pack.questions.map((question) => question.duplicateFingerprint)).size, 24);
    assert.deepEqual(new Set(pack.questions.map((question) => question.instructionalPurpose)), new Set(["FOUNDATION", "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "TRANSFER_APPLICATION"]));
    assert.ok(pack.questions.every((question) => question.provenance.sourceReferenceIds.every((sourceId) => pack.sources.some((source) => source.id === sourceId && source.status === "VERIFIED_REPOSITORY_SOURCE"))));
  }
  assert.deepEqual(validateCrossPackDuplicates(packs), []);
});

test("an oracle independent of content-factory math reproduces every Wave B answer", () => {
  for (const pack of packs) for (const question of pack.questions) {
    assert.ok(question.answer.derivation);
    const derived = independentEvaluate(question.answer.derivation);
    const declared = parseDeclared(question.answer.exactValue ?? "");
    assert.deepEqual(derived, declared, question.id);
  }
  for (const question of gradeEightWaveBPack.questions) {
    const sides = question.answer.geometry?.sides;
    assert.ok(sides);
    const [a, b, c] = [...sides].sort((left, right) => left - right);
    assert.equal(a * a + b * b, c * c, question.id);
    assert.ok([a, b, c].includes(Number(question.answer.exactValue)), question.id);
  }
});

test("Wave B source outcomes and narrower titles match the locked inventory boundary", () => {
  assert.deepEqual(new Set(gradeSevenWaveBPack.questions.map((question) => question.skillId)), new Set(["moet2018-g7-sta-p062-010"]));
  assert.deepEqual(new Set(gradeEightWaveBPack.questions.map((question) => question.skillId)), new Set(["moet2018-g8-geo-p065-006", "moet2018-g8-geo-p066-007"]));
  assert.deepEqual(new Set(gradeNineWaveBPack.questions.map((question) => question.skillId)), new Set(["moet2018-g9-sta-p076-011", "moet2018-g9-sta-p077-020", "moet2018-g9-sta-p077-021"]));
  assert.ok(gradeEightWaveBPack.prerequisites.some((edge) => edge.fromSkillId === "moet2018-g8-geo-p065-002" && edge.toSkillId === "moet2018-g8-geo-p065-006"));
  assert.ok(gradeNineWaveBPack.prerequisites.some((edge) => edge.fromSkillId === "moet2018-g9-sta-p077-015" && edge.toSkillId === "moet2018-g9-sta-p077-020"));
});

test("combined A+B exports preserve Wave A and expose deterministic Wave B independently", () => {
  for (const combined of [gradeSevenWavesAB, gradeEightWavesAB, gradeNineWavesAB]) {
    assert.equal(combined.packs.length, 2);
    assert.match(combined.packs[0].packId, /wave-a$/u);
    assert.match(combined.packs[1].packId, /wave-b$/u);
    assert.equal(combined.packs[0].questions.length, 24);
    assert.equal(combined.packs[1].questions.length, 24);
    assert.ok(combined.nextTargetOutcomeIds.length > 0);
    assert.deepEqual(validateCrossPackDuplicates(combined.packs), []);
  }
  const forward = buildDeterministicBundle(packs);
  const reverse = buildDeterministicBundle([...packs].reverse());
  assert.equal(canonicalize(forward), canonicalize(reverse));
});

test("every Grade 7-9 Wave B candidate supports deterministic adaptive behavior without leakage", () => {
  for (const pack of packs) {
    const policy = { version: pack.adaptivePolicy.version, minimumQuestions: 4, maximumQuestions: 8, masteryCorrect: 4 };
    const answers = pack.questions.slice(0, 8).map((question, index) => ({ submissionId: `wave-b-${pack.grade}-${index}`, questionId: question.id, correct: index < 4 }));
    const report = simulateCandidate(pack.grade, pack.questions, policy, [answers[0]!, answers[0]!, ...answers.slice(1)]);
    assert.equal(report.status, "MASTERED_EARLY");
    assert.equal(report.duplicateSubmits, 1);
    assert.equal(report.casConflictsRejected, 1);
    assert.equal(report.solutionLeakage, false);
    assert.ok(report.scoring.xp > 0 && report.scoring.masteryEvidence >= 4);
  }
});

test("Wave B validators fail closed on oracle, isolation and security mutations", () => {
  for (const pack of packs) {
    const question = pack.questions[0]!;
    const broken = { ...question, prompt: `${question.prompt}<script>x</script>`, published: true, answer: { ...question.answer, exactValue: "999" } };
    const diagnostics = validateGradePack({ ...pack, questions: [broken, ...pack.questions.slice(1)] });
    for (const code of ["UNSAFE_MARKUP", "UNSAFE_CANDIDATE_DEFAULT", "CORRECT_ANSWER_DERIVATION", "DUPLICATE_FINGERPRINT_DRIFT"]) assert.ok(diagnostics.some((diagnostic) => diagnostic.code === code), `${pack.grade}:${code}`);
  }
});
