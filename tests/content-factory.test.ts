import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import { createCoverageMatrix } from "../lib/content-factory/coverage.ts";
import { syntheticFixturePacks } from "../lib/content-factory/fixtures.ts";
import { buildPrerequisiteGraph } from "../lib/content-factory/graph.ts";
import { simulateGradeOneShadowComparison } from "../lib/content-factory/grade1-shadow.ts";
import { evaluateExpression, validateMathContract } from "../lib/content-factory/math.ts";
import { assertGradeOneUnchanged, gradeOneSourceDigest } from "../lib/content-factory/legacy-digest.ts";
import { productionGradePacks } from "../lib/content-factory/packs.ts";
import { requiredAutomatedEvidenceChecks, transitionReviewStatus } from "../lib/content-factory/review.ts";
import { simulateCandidate } from "../lib/content-factory/simulation.ts";
import { generateIntegerQuestion } from "../lib/content-factory/templates.ts";
import { validateCrossPackDuplicates, validateGradePack } from "../lib/content-factory/validation.ts";

test("Grade 1 immutable reference preserves canonical 13/312/312/24 release", () => {
  const pack = productionGradePacks[0]!;
  assert.equal(pack.grade, 1); assert.equal(pack.immutableReference, true);
  assert.deepEqual(pack.legacyAsset?.expected, { units: 13, questions: 312, solutions: 312, diagnosticRows: 24 });
  const before = gradeOneSourceDigest((path) => readFileSync(path, "utf8"));
  execFileSync(process.execPath, ["scripts/validate-grade1-release.mjs"], { stdio: "pipe" });
  const after = gradeOneSourceDigest((path) => readFileSync(path, "utf8"));
  assert.equal(assertGradeOneUnchanged(before, after), true);
  assert.equal(before.aggregate, "ba18662c6faa772030d70acda9fe081bbcf9b9da3dd4e20a41879973af40b51e");
});

test("Grade 2 frozen candidate binding and content remain immutable", () => {
  const pack = productionGradePacks[1]!;
  assert.deepEqual(pack.candidate, { candidateId: "g2-numbers-to-1000-rc1", version: "g2n1000-1.0.0-rc.1", bundleHash: "1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530", policyVersion: "g2n1000-adaptive-policy-1.0.0-pilot" });
  assert.equal(pack.questions.length, 24); assert.equal(pack.explanations.length, 24); assert.deepEqual(pack.release, { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false });
});

test("Grades 3-9 are explicit source-required hidden zero-content scaffolds", () => {
  for (const pack of productionGradePacks.slice(2)) {
    assert.ok(pack.sources.some((source) => source.status === "SOURCE_REQUIRED")); assert.ok(pack.sources.some((source) => source.status === "VERIFIED_REPOSITORY_SOURCE")); assert.equal(pack.units.length, 0); assert.equal(pack.questions.length, 0);
    assert.deepEqual(pack.release, { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false });
  }
});

test("All production packs parse, normalize and validate without content errors", () => {
  for (const pack of productionGradePacks) assert.equal(validateGradePack(pack).filter((item) => item.severity === "ERROR").length, 0);
  assert.deepEqual(validateCrossPackDuplicates(productionGradePacks), []);
});

test("deterministic templates derive answers, explanations and stable fingerprints", () => {
  const template = { id: "fixture-template", version: "v1", grade: 3 as const, skillId: "fixture-skill", minimum: 1, maximum: 9, operation: "ADD" as const };
  assert.equal(canonicalize(generateIntegerQuestion(template, "same", true)), canonicalize(generateIntegerQuestion(template, "same", true)));
  const result = generateIntegerQuestion(template, "same", true); assert.equal(result.question.published, false); assert.equal(result.question.pilotEligible, false); assert.equal(result.question.fixtureOnly, true);
  assert.equal(canonicalize({ z: 1, a: "NFC" }), '{"a":"NFC","z":1}');
  assert.throws(() => canonicalize({ unsafe: undefined }), /NON_JSON_VALUE/u);
  assert.throws(() => canonicalize(Number.NaN), /NON_JSON_NUMBER/u);
});

test("exact math validator rejects division by zero, invalid roots and impossible geometry", () => {
  assert.deepEqual(evaluateExpression({ op: "DIVIDE", left: { op: "VALUE", numerator: 1, denominator: 1 }, right: { op: "VALUE", numerator: 2, denominator: 1 } }), { numerator: 1, denominator: 2 });
  assert.ok(validateMathContract({ type: "RATIONAL_INPUT", exactValue: "0", derivation: { op: "DIVIDE", left: { op: "VALUE", numerator: 1, denominator: 1 }, right: { op: "VALUE", numerator: 0, denominator: 1 } } }, "q").some((item) => item.code === "UNDEFINED_EXPRESSION"));
  assert.ok(validateMathContract({ type: "INTEGER_INPUT", exactValue: "0", derivation: { op: "SQRT", value: { op: "VALUE", numerator: -1, denominator: 1 } } }, "q").some((item) => item.code === "INVALID_ROOT"));
  assert.ok(validateMathContract({ type: "INTEGER_INPUT", exactValue: "0", geometry: { kind: "TRIANGLE_SIDES", sides: [1, 2, 4] } }, "q").some((item) => item.code === "INVALID_GEOMETRY_CONSTRAINT"));
});

test("validators catch duplicate options, invalid fractions, unsafe markup, solution leakage and missing references", () => {
  const pack = syntheticFixturePacks[0]!; const base = pack.questions[0]!;
  const broken = { ...base, prompt: "Đáp án đúng: <script>x</script>", options: ["1", "1"], answer: { type: "RATIONAL_INPUT" as const, exactValue: "1/0" }, skillId: "missing-skill", explanationId: "missing-explanation" };
  const diagnostics = validateGradePack({ ...pack, questions: [broken], explanations: [] });
  for (const code of ["UNSAFE_MARKUP", "SOLUTION_LEAKAGE", "DUPLICATE_OPTIONS", "INVALID_FRACTION", "MISSING_SKILL", "MISSING_EXPLANATION"]) assert.ok(diagnostics.some((item) => item.code === code), code);
});

test("Grades 1-9 prerequisite graph is acyclic and Grade 1 to 2 edge requires evidence", () => {
  const graph = buildPrerequisiteGraph(productionGradePacks);
  assert.equal(graph.diagnostics.some((item) => item.code === "PREREQUISITE_CYCLE" || item.code === "MISSING_PREREQUISITE_REFERENCE"), false);
  assert.ok(graph.edges.some((edge) => edge.fromSkillId === "g1-skill-compare-order-to-100" && edge.toSkillId === "g2-skill-number-recognition-to-1000" && edge.evidence === "HYPOTHESIS_REQUIRES_EVIDENCE"));
});

test("coverage distinguishes counts, missing, unknown and not applicable", () => {
  const rows = createCoverageMatrix(productionGradePacks); assert.equal(rows.length, 9);
  assert.deepEqual(rows[0]?.candidateQuestionCount, { state: "NOT_APPLICABLE" }); assert.deepEqual(rows[0]?.prerequisiteCompleteness, { state: "UNKNOWN" }); assert.deepEqual(rows[0]?.evidenceGatePassedCount, { state: "UNKNOWN" }); assert.deepEqual(rows[0]?.verificationInsufficientCount, { state: "UNKNOWN" });
  assert.deepEqual(rows[1]?.evidenceGatePassedCount, { state: "COUNT", value: 24 }); assert.deepEqual(rows[1]?.candidateEligibleCount, { state: "COUNT", value: 0 });
  assert.deepEqual(rows[2]?.curriculumSourceCoverage, { state: "UNKNOWN" }); assert.deepEqual(rows[2]?.unitCount, { state: "COUNT", value: 0 });
});

test("bundle ordering and hashes are deterministic and test fixtures are excluded", () => {
  const forward = buildDeterministicBundle(productionGradePacks); const reverse = buildDeterministicBundle([...productionGradePacks].reverse());
  assert.deepEqual(forward, reverse); assert.equal(forward.grades.join(","), "1,2,3,4,5,6,7,8,9");
  assert.throws(() => buildDeterministicBundle(syntheticFixturePacks), /TEST_FIXTURE_IN_PRODUCTION_BUNDLE/u);
  const gradeTwo = productionGradePacks[1]!; const question = gradeTwo.questions[0]!;
  const insufficient = { ...gradeTwo, questions: [{ ...question, answer: { type: "AUTOMATED_VERIFICATION_INSUFFICIENT" as const }, reviewStatus: "AUTOMATED_VERIFICATION_INSUFFICIENT" as const }, ...gradeTwo.questions.slice(1)] };
  assert.throws(() => buildDeterministicBundle([insufficient]), /AUTOMATED_EVIDENCE_GATE_FAILED/u);
  assert.throws(() => buildDeterministicBundle([{ ...gradeTwo, evidenceReceipts: gradeTwo.evidenceReceipts.slice(1) }]), /AUTOMATED_EVIDENCE_GATE_FAILED/u);
});

test("primary and secondary fixtures exercise software simulation without pedagogical claims", () => {
  for (const pack of syntheticFixturePacks) {
    const report = simulateCandidate(pack.grade, pack.questions, { version: "test", minimumQuestions: 3, maximumQuestions: 6, masteryCorrect: 3 }, [...pack.questions.map((question, index) => ({ submissionId: `s${index}`, questionId: question.id, correct: index < 3 })), { submissionId: "s0", questionId: pack.questions[0]!.id, correct: true }]);
    assert.equal(report.fixture, true); assert.equal(report.softwareBehaviorOnly, true); assert.equal(report.solutionLeakage, false); assert.equal(report.status, "MASTERED_EARLY");
  }
});

test("Grade 1 shadow adapter compares selection without runtime or history mutation", () => {
  const report = simulateGradeOneShadowComparison([
    { questionId: "g1-legacy-q1", skillId: "g1-skill-count-recognize" },
    { questionId: "g1-legacy-q2", skillId: "g1-skill-read-write-match" },
    { questionId: "g1-legacy-q3", skillId: "g1-skill-sequence-compare-order" },
  ], "shadow-only", 2);
  assert.equal(report.mode, "SHADOW_ONLY_NO_RUNTIME_INTEGRATION"); assert.equal(report.historyMutation, false); assert.equal(report.pedagogicalClaim, "NONE");
});

test("automated lifecycle requires evidence receipts and prevents generation-only bundling", () => {
  const validatorReceipt = { id: "validator-receipt", entityId: "candidate", check: "REGRESSION_TESTS" as const, status: "PASSED" as const, evidence: "Deterministic test receipt." };
  assert.deepEqual(transitionReviewStatus("GENERATED", "AUTOMATED_VALIDATION_PASSED", [validatorReceipt]), { status: "AUTOMATED_VALIDATION_PASSED", evidenceReceiptIds: ["validator-receipt"] });
  assert.throws(() => transitionReviewStatus("GENERATED", "EVIDENCE_GATE_PASSED", [validatorReceipt]), /INVALID_REVIEW_TRANSITION/u);
  assert.throws(() => transitionReviewStatus("EVIDENCE_GATE_PASSED", "BUNDLED", []), /AUTOMATED_EVIDENCE_REQUIRED/u);
  const complete = requiredAutomatedEvidenceChecks.map((check) => ({ id: `receipt-${check.toLowerCase()}`, entityId: "candidate", check, status: "PASSED" as const, evidence: "Deterministic automated evidence." }));
  assert.equal(transitionReviewStatus("AUTOMATED_VALIDATION_PASSED", "EVIDENCE_GATE_PASSED", complete).status, "EVIDENCE_GATE_PASSED");
  assert.throws(() => transitionReviewStatus("AUTOMATED_VALIDATION_PASSED", "EVIDENCE_GATE_PASSED", complete.slice(1)), /AUTOMATED_EVIDENCE_GATE_INCOMPLETE/u);
});
