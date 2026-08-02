import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GENERATOR_V2_OUTCOME_REGISTRY,
  WAVE_C_ENGINE_VERSION,
  WAVE_C_OUTCOME_CONTRACTS,
  __waveCNegativeControl,
  assertPublicBoundary,
  generateQuestion,
  publicQuestionOnly,
  validateStudentResponse,
  verifyQuestionIntegrity,
} from "../lib/generation-v2/index.ts";

const fullMatrix = JSON.parse(readFileSync("artifacts/generator-v2-full-coverage/outcome-matrix.json", "utf8")) as { rows: readonly { outcomeId: string; wave: string }[] };
const waveCMatrix = JSON.parse(readFileSync("artifacts/generator-v2-wave-c/outcome-matrix.json", "utf8")) as { count: number; canonicalCapabilities: number; inventoryRecordedBeforeImplementation: boolean; rows: readonly { outcomeId: string; grade: number; strand: string; domain: string; implementationStatus: string }[] };
const diversity = JSON.parse(readFileSync("artifacts/generator-v2-wave-c/diversity.json", "utf8")) as { result: string; audit: { generatedSamples: number }; summary: { maximumExactDuplicateRate: number; maximumNearDuplicatePairRate: number; failedBatches: number } };
const report = JSON.parse(readFileSync("artifacts/generator-v2-wave-c/report.json", "utf8")) as { result: string; coverage: Record<string, number | boolean | readonly string[]>; browserAcceptance: { status: string } };

test("Wave C exact inventory matches all 57 locked taxonomy rows", () => {
  const expected = fullMatrix.rows.filter((row) => row.wave === "C").map((row) => row.outcomeId).sort();
  const actual = WAVE_C_OUTCOME_CONTRACTS.map((contract) => contract.outcomeId).sort();
  assert.equal(expected.length, 57);
  assert.deepEqual(actual, expected);
  assert.equal(waveCMatrix.count, 57);
  assert.equal(waveCMatrix.canonicalCapabilities, 41);
  assert.equal(waveCMatrix.inventoryRecordedBeforeImplementation, true);
  assert.deepEqual([...new Set(waveCMatrix.rows.map((row) => row.grade))].sort(), [3, 4, 5, 6, 7, 8, 9]);
  assert.ok(waveCMatrix.rows.every((row) => row.strand.length > 0 && row.domain.length > 0 && row.implementationStatus === "IMPLEMENTED_REVIEW_REQUIRED"));
});

test("57 explicit contracts use 41 mathematical capabilities with 56 new engines and one preserved baseline", () => {
  assert.equal(WAVE_C_OUTCOME_CONTRACTS.length, 57);
  assert.equal(new Set(WAVE_C_OUTCOME_CONTRACTS.map((contract) => contract.canonicalVariantId)).size, 41);
  assert.equal(WAVE_C_OUTCOME_CONTRACTS.filter((contract) => contract.engineVersion === WAVE_C_ENGINE_VERSION).length, 56);
  assert.equal(WAVE_C_OUTCOME_CONTRACTS.filter((contract) => contract.engineVersion === "PROVEN_V2_BASELINE").length, 1);
  assert.equal(GENERATOR_V2_OUTCOME_REGISTRY.length, 546);
  for (const contract of WAVE_C_OUTCOME_CONTRACTS) {
    assert.equal(contract.contractType, "PLAVE_PRODUCT_ASSESSMENT_CONTRACT_V2");
    assert.equal(contract.contractVersion, "wave-c-v2.1");
    assert.equal(contract.uniquenessPolicy, "EXACTLY_ONE_NORMALIZED_ANSWER");
    assert.ok(contract.measurableIntent.length > 30);
    assert.ok(contract.independentSolver.length > 10);
    assert.ok(contract.independentValidator.length > 10);
  }
});

test("every Wave C outcome deterministically generates all difficulties with exact provenance and public boundary", () => {
  const interactions = new Set<string>();
  const visuals = new Set<string>();
  for (const contract of WAVE_C_OUTCOME_CONTRACTS) {
    for (const difficulty of ["EASY", "MEDIUM", "HARD"] as const) {
      const input = { outcomeId: contract.outcomeId, grade: contract.grade, difficulty, seed: `wave-c-test-${contract.grade}-${difficulty.toLowerCase()}-${contract.outcomeId.toLowerCase()}`, locale: "vi-VN" as const };
      const generated = generateQuestion(input);
      assert.deepEqual(generated, generateQuestion(input));
      assert.equal(verifyQuestionIntegrity(generated), true);
      assert.equal(assertPublicBoundary(publicQuestionOnly(generated)), true);
      assert.equal(generated.provenance.questionSource, "GENERATED_V2");
      assert.equal(validateStudentResponse(generated, generated.privateSolution.correctResponse).isCorrect, true);
      interactions.add(generated.publicSnapshot.interaction.type);
      visuals.add(generated.publicSnapshot.visual.type);
    }
  }
  for (const interaction of ["SINGLE_CHOICE", "INTEGER_INPUT", "DECIMAL_INPUT", "FRACTION_INPUT", "ORDERING", "MATCHING", "TABLE_OR_CHART_RESPONSE", "CONSTRUCTION_OR_VISUAL_SELECTION", "SHORT_STRUCTURED_RESPONSE"]) assert.ok(interactions.has(interaction), interaction);
  for (const visual of ["FRACTION_MODEL", "PLACE_VALUE_CHART", "DATA_TABLE", "NUMBER_LINE", "COORDINATE_GRAPH"]) assert.ok(visuals.has(visual), visual);
});

test("unknown outcome, wrong grade and unsupported interaction fail closed", () => {
  const contract = WAVE_C_OUTCOME_CONTRACTS.find((item) => item.engineVersion === WAVE_C_ENGINE_VERSION)!;
  const input = { outcomeId: contract.outcomeId, grade: contract.grade, difficulty: "MEDIUM" as const, seed: "wave-c-fail-closed", locale: "vi-VN" as const };
  assert.throws(() => generateQuestion({ ...input, outcomeId: "MOET2018-WAVE-C-UNKNOWN" }), /GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED/u);
  assert.throws(() => generateQuestion({ ...input, grade: contract.grade + 1 }), /GRADE_MISMATCH/u);
  assert.throws(() => generateQuestion({ ...input, interactionType: "MULTI_SELECT" }), /INTERACTION_UNSUPPORTED/u);
});

test("exact rational, decimal-scaled and symbolic models reject mathematical tampering", () => {
  const rationalContract = WAVE_C_OUTCOME_CONTRACTS.find((item) => item.canonicalVariantId === "RATIONAL_OPERATIONS" && item.engineVersion === WAVE_C_ENGINE_VERSION)!;
  const rational = __waveCNegativeControl.inspect(rationalContract, { outcomeId: rationalContract.outcomeId, grade: rationalContract.grade, difficulty: "HARD", seed: "wave-c-rational-negative", locale: "vi-VN" });
  const zeroDenominator = structuredClone(rational.normalizedModel);
  (zeroDenominator as unknown as { rationals: { numerator: number; denominator: number }[] }).rationals[0] = { numerator: 1, denominator: 0 };
  assert.throws(() => __waveCNegativeControl.validate(rationalContract, zeroDenominator, rational.solution, rational.prompt, rational.interaction, rational.visual), /VALIDATION_FAILED/u);

  const systemContract = WAVE_C_OUTCOME_CONTRACTS.find((item) => item.canonicalVariantId === "LINEAR_SYSTEM_SOLUTION_CHECK")!;
  const system = __waveCNegativeControl.inspect(systemContract, { outcomeId: systemContract.outcomeId, grade: 9, difficulty: "HARD", seed: "wave-c-system-negative", locale: "vi-VN" });
  const impossible = { ...system.normalizedModel, values: [1, 1, 2, 2, 2, 5, 0, 0] };
  assert.throws(() => __waveCNegativeControl.validate(systemContract, impossible, system.solution, system.prompt, system.interaction, system.visual), /SOLVER_FAILED|VALIDATION_FAILED/u);
});

test("negative controls reject prompt, solver, domain and grade-bound mutations", () => {
  for (const contract of WAVE_C_OUTCOME_CONTRACTS.filter((item) => item.engineVersion === WAVE_C_ENGINE_VERSION).slice(0, 8)) {
    const inspected = __waveCNegativeControl.inspect(contract, { outcomeId: contract.outcomeId, grade: contract.grade, difficulty: "HARD", seed: `negative-test-${contract.outcomeId.toLowerCase()}`, locale: "vi-VN" });
    assert.throws(() => __waveCNegativeControl.validate(contract, inspected.normalizedModel, inspected.solution, "Sai mô hình", inspected.interaction, inspected.visual), /VALIDATION_FAILED/u);
    assert.throws(() => __waveCNegativeControl.validate(contract, { ...inspected.normalizedModel, values: [1_000_000_000] }, inspected.solution, inspected.prompt, inspected.interaction, inspected.visual), /VALIDATION_FAILED/u);
  }
});

test("3,420-sample multidimensional diversity audit passes all thresholds", () => {
  assert.equal(diversity.result, "PASS");
  assert.equal(diversity.audit.generatedSamples, 3_420);
  assert.equal(diversity.summary.maximumExactDuplicateRate, 0);
  assert.ok(diversity.summary.maximumNearDuplicatePairRate <= 0.12);
  assert.equal(diversity.summary.failedBatches, 0);
  assert.equal(report.coverage.waveCTotal, 57);
  assert.equal(report.coverage.blocked, 0);
  assert.equal(report.coverage.fallbackCount, 0);
  assert.equal(report.coverage.keywordRoutingCount, 0);
  assert.deepEqual(report.coverage.mathematicallyUnsolvableOutcomes, []);
});

test("final Wave C report requires authenticated real-browser evidence", () => {
  assert.equal(report.result, "PASS_BROWSER_VALIDATED");
  assert.equal(report.browserAcceptance.status, "PASS");
});
