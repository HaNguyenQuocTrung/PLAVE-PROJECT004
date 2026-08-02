import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GENERATOR_V2_OUTCOME_REGISTRY,
  WAVE_A_OUTCOME_CONTRACTS,
  WAVE_B_ENGINE_VERSION,
  WAVE_B_OUTCOME_CONTRACTS,
  __waveBNegativeControl,
  assertPublicBoundary,
  generateQuestion,
  publicQuestionOnly,
  validateStudentResponse,
  verifyQuestionIntegrity,
} from "../lib/generation-v2/index.ts";

const fullMatrix = JSON.parse(readFileSync("artifacts/generator-v2-full-coverage/outcome-matrix.json", "utf8")) as { rows: readonly { outcomeId: string; wave: string }[] };
const waveBMatrix = JSON.parse(readFileSync("artifacts/generator-v2-wave-b/outcome-matrix.json", "utf8")) as { count: number; rows: readonly { outcomeId: string; grade: number; strand: string; domain: string; implementationStatus: string }[] };
const diversity = JSON.parse(readFileSync("artifacts/generator-v2-wave-b/diversity.json", "utf8")) as { result: string; audit: { generatedSamples: number }; summary: { maximumExactDuplicateRate: number; maximumNearDuplicatePairRate: number; failedBatches: number } };
const report = JSON.parse(readFileSync("artifacts/generator-v2-wave-b/report.json", "utf8")) as { result: string; coverage: Record<string, number | boolean | readonly string[]>; browserAcceptance: { status: string } };

test("Wave B exact inventory matches all 61 current matrix rows", () => {
  const expected = fullMatrix.rows.filter((row) => row.wave === "B").map((row) => row.outcomeId).sort();
  const actual = WAVE_B_OUTCOME_CONTRACTS.map((contract) => contract.outcomeId).sort();
  assert.equal(expected.length, 61);
  assert.deepEqual(actual, expected);
  assert.equal(waveBMatrix.count, 61);
  assert.deepEqual([...new Set(waveBMatrix.rows.map((row) => row.grade))].sort(), [2, 3, 4, 5, 6, 7]);
  assert.ok(waveBMatrix.rows.every((row) => row.strand.length > 0 && row.domain.length > 0));
});

test("61 explicit contracts use 30 canonical capabilities without keyword routing", () => {
  assert.equal(WAVE_A_OUTCOME_CONTRACTS.length, 98);
  assert.equal(WAVE_B_OUTCOME_CONTRACTS.length, 61);
  assert.equal(new Set(WAVE_B_OUTCOME_CONTRACTS.map((contract) => contract.canonicalVariantId)).size, 30);
  assert.equal(WAVE_B_OUTCOME_CONTRACTS.filter((contract) => contract.engineVersion === WAVE_B_ENGINE_VERSION).length, 60);
  assert.equal(WAVE_B_OUTCOME_CONTRACTS.filter((contract) => contract.engineVersion === "PROVEN_V2_BASELINE").length, 1);
  assert.equal(GENERATOR_V2_OUTCOME_REGISTRY.length, 546);
  for (const contract of WAVE_B_OUTCOME_CONTRACTS) {
    assert.equal(contract.contractType, "PLAVE_PRODUCT_ASSESSMENT_CONTRACT_V2");
    assert.equal(contract.contractVersion, "wave-b-v2.1");
    assert.equal(contract.uniquenessPolicy, "EXACTLY_ONE_NORMALIZED_ANSWER");
    assert.ok(contract.measurableIntent.length > 20);
    assert.ok(contract.independentSolver.length > 10);
    assert.ok(contract.independentValidator.length > 10);
    assert.ok(contract.interactionPolicy.length > 0);
  }
});

test("every Wave B outcome generates deterministic EASY/MEDIUM/HARD questions with public provenance", () => {
  const interactions = new Set<string>();
  const visuals = new Set<string>();
  for (const contract of WAVE_B_OUTCOME_CONTRACTS) {
    for (const difficulty of ["EASY", "MEDIUM", "HARD"] as const) {
      const input = { outcomeId: contract.outcomeId, grade: contract.grade, difficulty, seed: `wave-b-test-${contract.grade}-${difficulty.toLowerCase()}-${contract.outcomeId.toLowerCase()}`, locale: "vi-VN" as const };
      const generated = generateQuestion(input);
      const replay = generateQuestion(input);
      assert.deepEqual(generated, replay);
      assert.equal(verifyQuestionIntegrity(generated), true);
      assert.equal(assertPublicBoundary(publicQuestionOnly(generated)), true);
      assert.equal(generated.provenance.questionSource, "GENERATED_V2");
      assert.equal(generated.publicSnapshot.outcomeId, contract.outcomeId);
      interactions.add(generated.publicSnapshot.interaction.type);
      visuals.add(generated.publicSnapshot.visual.type);
      assert.equal(validateStudentResponse(generated, generated.privateSolution.correctResponse).isCorrect, true);
    }
  }
  for (const interaction of ["SINGLE_CHOICE", "MULTI_SELECT", "INTEGER_INPUT", "DECIMAL_INPUT", "FRACTION_INPUT", "ORDERING", "TABLE_OR_CHART_RESPONSE", "CONSTRUCTION_OR_VISUAL_SELECTION"]) assert.ok(interactions.has(interaction), interaction);
  for (const visual of ["FRACTION_MODEL", "NUMBER_LINE", "DATA_TABLE", "PLACE_VALUE_CHART", "SHAPE_DIAGRAM"]) assert.ok(visuals.has(visual), visual);
});

test("unknown mappings, wrong grades and unsupported interactions fail closed", () => {
  const contract = WAVE_B_OUTCOME_CONTRACTS.find((item) => item.engineVersion === WAVE_B_ENGINE_VERSION)!;
  const input = { outcomeId: contract.outcomeId, grade: contract.grade, difficulty: "MEDIUM" as const, seed: "wave-b-fail-closed", locale: "vi-VN" as const };
  assert.throws(() => generateQuestion({ ...input, outcomeId: "MOET2018-WAVE-B-UNKNOWN" }), /GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED/u);
  assert.throws(() => generateQuestion({ ...input, grade: contract.grade + 1 }), /GRADE_MISMATCH/u);
  assert.throws(() => generateQuestion({ ...input, interactionType: "SHORT_STRUCTURED_RESPONSE" }), /INTERACTION_UNSUPPORTED/u);
});

test("fraction equivalence normalizes mathematically and decimals use integer-scaled models", () => {
  const fractionContract = WAVE_B_OUTCOME_CONTRACTS.find((item) => item.taskKind === "FRACTION_EQUIVALENCE")!;
  const fraction = generateQuestion({ outcomeId: fractionContract.outcomeId, grade: fractionContract.grade, difficulty: "HARD", seed: "wave-b-equivalent-fraction", locale: "vi-VN" });
  const answer = fraction.privateSolution.correctResponse;
  assert.ok(typeof answer === "object" && !Array.isArray(answer) && "numerator" in answer && "denominator" in answer);
  assert.equal(validateStudentResponse(fraction, { numerator: answer.numerator * 3, denominator: answer.denominator * 3 }).isCorrect, true);
  assert.equal(validateStudentResponse(fraction, { numerator: answer.numerator, denominator: 0 }).isCorrect, false);

  const decimalContract = WAVE_B_OUTCOME_CONTRACTS.find((item) => item.taskKind === "DECIMAL_OPERATIONS")!;
  const inspected = __waveBNegativeControl.inspect(decimalContract, { outcomeId: decimalContract.outcomeId, grade: decimalContract.grade, difficulty: "HARD", seed: "wave-b-decimal-scale", locale: "vi-VN" });
  assert.ok(inspected.normalizedModel.values.every(Number.isInteger));
  assert.ok([10, 100, 1_000].includes(inspected.normalizedModel.scale));
  assert.doesNotMatch(inspected.prompt, /undefined|NaN/iu);
});

test("recover-whole ratio table renders the same percentage named by the prompt model", () => {
  const contract = WAVE_B_OUTCOME_CONTRACTS.find((item) => item.taskKind === "RATIO_AND_PERCENT")!;
  const inspected = __waveBNegativeControl.inspect(contract, { outcomeId: contract.outcomeId, grade: contract.grade, difficulty: "HARD", seed: "recover-whole-visual-contract", locale: "vi-VN" });
  assert.equal(inspected.normalizedModel.operation, "RECOVER_WHOLE");
  const rows = inspected.visual.data.rows as readonly { name: string; value: string | number }[];
  assert.deepEqual(rows, [
    { name: "Phần đã biết", value: inspected.normalizedModel.values[0] },
    { name: "Tỉ lệ phần trăm", value: `${inspected.normalizedModel.values[1]}%` },
    { name: "Toàn thể", value: "?" },
  ]);
  assert.match(inspected.prompt, new RegExp(`${inspected.normalizedModel.values[1]}%`, "u"));
});

test("independent validator rejects denominator, prompt, solution and decimal-scale tampering", () => {
  const fractionContract = WAVE_B_OUTCOME_CONTRACTS.find((item) => item.taskKind === "FRACTION_OPERATIONS")!;
  const fraction = __waveBNegativeControl.inspect(fractionContract, { outcomeId: fractionContract.outcomeId, grade: fractionContract.grade, difficulty: "HARD", seed: "wave-b-negative-fraction", locale: "vi-VN" });
  const badModel = structuredClone(fraction.normalizedModel);
  (badModel as unknown as { fractions: { numerator: number; denominator: number }[] }).fractions[0] = { numerator: 1, denominator: 0 };
  assert.throws(() => __waveBNegativeControl.validate(fractionContract, badModel, fraction.solution, fraction.prompt, fraction.interaction, fraction.visual), /VALIDATION_FAILED/u);
  assert.throws(() => __waveBNegativeControl.validate(fractionContract, fraction.normalizedModel, fraction.solution, "Prompt sai", fraction.interaction, fraction.visual), /VALIDATION_FAILED/u);

  const decimalContract = WAVE_B_OUTCOME_CONTRACTS.find((item) => item.taskKind === "DECIMAL_OPERATIONS")!;
  const decimal = __waveBNegativeControl.inspect(decimalContract, { outcomeId: decimalContract.outcomeId, grade: decimalContract.grade, difficulty: "HARD", seed: "wave-b-negative-decimal", locale: "vi-VN" });
  assert.throws(() => __waveBNegativeControl.validate(decimalContract, { ...decimal.normalizedModel, scale: 3 }, decimal.solution, decimal.prompt, decimal.interaction, decimal.visual), /VALIDATION_FAILED/u);
});

test("3,660-sample diversity audit passes exact and near-duplicate thresholds", () => {
  assert.equal(diversity.result, "PASS");
  assert.equal(diversity.audit.generatedSamples, 3_660);
  assert.equal(diversity.summary.maximumExactDuplicateRate, 0);
  assert.ok(diversity.summary.maximumNearDuplicatePairRate <= 0.12);
  assert.equal(diversity.summary.failedBatches, 0);
  assert.equal(report.coverage.waveBTotal, 61);
  assert.equal(report.coverage.blocked, 0);
  assert.equal(report.coverage.fallbackCount, 0);
  assert.equal(report.coverage.keywordRoutingCount, 0);
  assert.deepEqual(report.coverage.mathematicallyUnsolvableOutcomes, []);
});

test("final Wave B artifact requires real local browser acceptance", () => {
  assert.equal(report.result, "PASS_BROWSER_VALIDATED");
  assert.equal(report.browserAcceptance.status, "PASS");
});
