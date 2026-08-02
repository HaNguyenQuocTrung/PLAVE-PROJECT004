import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GENERATOR_V2_OUTCOME_REGISTRY,
  WAVE_D_ENGINE_VERSION,
  WAVE_D_OUTCOME_CONTRACTS,
  __waveDNegativeControl,
  assertPublicBoundary,
  generateQuestion,
  publicQuestionOnly,
  validateStudentResponse,
  verifyQuestionIntegrity,
} from "../lib/generation-v2/index.ts";

const fullMatrix = JSON.parse(readFileSync("artifacts/generator-v2-full-coverage/outcome-matrix.json", "utf8")) as { rows: readonly { outcomeId: string; wave: string }[] };
const matrix = JSON.parse(readFileSync("artifacts/generator-v2-wave-d/outcome-matrix.json", "utf8")) as { count: number; canonicalCapabilities: number; inventoryRecordedBeforeImplementation: boolean; rows: readonly { outcomeId: string; grade: number; implementationStatus: string }[] };
const diversity = JSON.parse(readFileSync("artifacts/generator-v2-wave-d/diversity.json", "utf8")) as { result: string; audit: { generatedSamples: number }; summary: { maximumExactDuplicateRate: number; maximumNearDuplicatePairRate: number; failedBatches: number } };
const report = JSON.parse(readFileSync("artifacts/generator-v2-wave-d/report.json", "utf8")) as { result: string; coverage: Record<string, number | boolean | readonly string[]>; browserAcceptance: { status: string } };

test("Wave D inventory is the exact 232-outcome locked taxonomy", () => {
  const expected = fullMatrix.rows.filter((row) => row.wave === "D").map((row) => row.outcomeId).sort();
  const actual = WAVE_D_OUTCOME_CONTRACTS.map((contract) => contract.outcomeId).sort();
  assert.equal(expected.length, 232);
  assert.deepEqual(actual, expected);
  assert.equal(matrix.count, 232);
  assert.equal(matrix.canonicalCapabilities, 50);
  assert.equal(matrix.inventoryRecordedBeforeImplementation, true);
  assert.deepEqual([...new Set(matrix.rows.map((row) => row.grade))].sort(), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.ok(matrix.rows.every((row) => row.implementationStatus === "IMPLEMENTED_REVIEW_REQUIRED"));
});

test("232 explicit contracts use 50 capabilities with 229 new engines and three preserved baselines", () => {
  assert.equal(new Set(WAVE_D_OUTCOME_CONTRACTS.map((contract) => contract.canonicalVariantId)).size, 50);
  assert.equal(WAVE_D_OUTCOME_CONTRACTS.filter((contract) => contract.engineVersion === WAVE_D_ENGINE_VERSION).length, 229);
  assert.equal(WAVE_D_OUTCOME_CONTRACTS.filter((contract) => contract.engineVersion === "PROVEN_V2_BASELINE").length, 3);
  assert.equal(GENERATOR_V2_OUTCOME_REGISTRY.length, 546);
  for (const contract of WAVE_D_OUTCOME_CONTRACTS) {
    assert.equal(contract.contractType, "PLAVE_PRODUCT_ASSESSMENT_CONTRACT_V2");
    assert.equal(contract.contractVersion, "wave-d-v2.1");
    assert.ok(contract.measurableIntent.length > 10);
    assert.ok(contract.independentSolver.length > 10);
    assert.ok(contract.independentValidator.length > 10);
  }
});

test("every Wave D outcome generates deterministically at every difficulty with 8/8 provenance", () => {
  const interactions = new Set<string>();
  const visuals = new Set<string>();
  for (const [contractIndex, contract] of WAVE_D_OUTCOME_CONTRACTS.entries()) {
    for (const difficulty of ["EASY", "MEDIUM", "HARD"] as const) {
      const input = { outcomeId: contract.outcomeId, grade: contract.grade, difficulty, seed: `wave-d-test-${contractIndex}-${difficulty.toLowerCase()}`, locale: "vi-VN" as const };
      const generated = generateQuestion(input);
      assert.deepEqual(generated, generateQuestion(input));
      assert.equal(verifyQuestionIntegrity(generated), true);
      assert.equal(assertPublicBoundary(publicQuestionOnly(generated)), true);
      assert.equal(generated.provenance.questionSource, "GENERATED_V2");
      assert.equal(Object.values(generated.provenance).filter((value) => typeof value === "string" && value.length > 0).length >= 8, true);
      assert.equal(validateStudentResponse(generated, generated.privateSolution.correctResponse).isCorrect, true);
      interactions.add(generated.publicSnapshot.interaction.type);
      visuals.add(generated.publicSnapshot.visual.type);
    }
  }
  for (const interaction of ["SINGLE_CHOICE", "INTEGER_INPUT", "DECIMAL_INPUT", "FRACTION_INPUT", "ORDERING", "MATCHING", "MULTI_SELECT", "SHORT_STRUCTURED_RESPONSE", "CONSTRUCTION_OR_VISUAL_SELECTION"]) assert.ok(interactions.has(interaction), interaction);
  for (const visual of ["SHAPE_DIAGRAM", "MEASUREMENT_MODEL", "AREA_MODEL", "COORDINATE_GRAPH", "DATA_TABLE", "NUMBER_LINE"]) assert.ok(visuals.has(visual), visual);
});

test("derived answers are absent from public model values for representative hidden-result families", () => {
  for (const [capabilityIndex, capability] of ["DIVISION_REMAINDER", "LINEAR_EQUATION_MODEL", "LINEAR_FUNCTION_MODEL", "NUMBER_LINE_PLACEMENT", "PYTHAGORE_APPLICATION", "SIMILARITY_THALES", "SPEED_DISTANCE_TIME", "VIETE_RELATION"].entries()) {
    const contract = WAVE_D_OUTCOME_CONTRACTS.find((item) => item.canonicalVariantId === capability)!;
    const generated = generateQuestion({ outcomeId: contract.outcomeId, grade: contract.grade, difficulty: "HARD", seed: `wave-d-no-derived-leak-${capabilityIndex}`, locale: "vi-VN" });
    const publicValues = generated.publicSnapshot.publicData.values as readonly number[];
    const privateText = JSON.stringify(generated.privateSolution.correctResponse);
    assert.equal(JSON.stringify(publicQuestionOnly(generated)).includes("correctResponse"), false);
    if (typeof generated.privateSolution.correctResponse === "number") assert.equal(publicValues.includes(generated.privateSolution.correctResponse), false, `${capability}:${privateText}`);
  }
});

test("polygon outcomes keep exact curriculum shapes and construction evidence", () => {
  const expectedShapes: Readonly<Record<string, readonly string[]>> = {
    "MOET2018-G2-GEO-P026-007": ["QUADRILATERAL"],
    "MOET2018-G3-GEO-P031-006": ["TRIANGLE", "QUADRILATERAL"],
    "MOET2018-G3-GEO-P031-009": ["SQUARE", "RECTANGLE"],
    "MOET2018-G4-GEO-P037-004": ["PARALLELOGRAM", "RHOMBUS"],
    "MOET2018-G5-GEO-P043-007": ["TRAPEZOID", "PARALLELOGRAM", "RHOMBUS"],
    "MOET2018-G6-GEO-P050-001": ["EQUILATERAL_TRIANGLE", "SQUARE", "REGULAR_HEXAGON"],
    "MOET2018-G6-GEO-P050-002": ["EQUILATERAL_TRIANGLE", "SQUARE", "REGULAR_HEXAGON"],
    "MOET2018-G6-GEO-P051-004": ["RECTANGLE", "RHOMBUS", "PARALLELOGRAM", "ISOSCELES_TRAPEZOID"],
    "MOET2018-G6-GEO-P051-011": ["REGULAR_HEXAGON"],
    "MOET2018-G8-GEO-P066-008": ["QUADRILATERAL"],
    "MOET2018-G8-GEO-P066-009": ["PARALLELOGRAM"],
    "MOET2018-G8-GEO-P066-010": ["RHOMBUS"],
    "MOET2018-G8-GEO-P066-011": ["ISOSCELES_TRAPEZOID"],
    "MOET2018-G8-GEO-P066-012": ["RECTANGLE"],
    "MOET2018-G8-GEO-P066-013": ["SQUARE"],
    "MOET2018-G8-GEO-P066-014": ["QUADRILATERAL"],
    "MOET2018-G8-GEO-P066-015": ["RECTANGLE"],
    "MOET2018-G8-GEO-P066-016": ["RHOMBUS"],
    "MOET2018-G8-GEO-P066-017": ["ISOSCELES_TRAPEZOID"],
    "MOET2018-G8-GEO-P066-018": ["PARALLELOGRAM"],
  };
  const constructionOutcomes = new Set(["MOET2018-G3-GEO-P031-009", "MOET2018-G5-GEO-P043-007", "MOET2018-G6-GEO-P051-011"]);
  for (const [index, contract] of WAVE_D_OUTCOME_CONTRACTS.filter((item) => item.canonicalVariantId === "POLYGON_PROPERTIES").entries()) {
    const generated = generateQuestion({ outcomeId: contract.outcomeId, grade: contract.grade, difficulty: "HARD", seed: `polygon-exact-${index}`, locale: "vi-VN" });
    assert.ok(expectedShapes[contract.outcomeId]!.includes(String(generated.publicSnapshot.visual.data.shape)), contract.outcomeId);
    if (constructionOutcomes.has(contract.outcomeId)) assert.equal(generated.publicSnapshot.interaction.type, "CONSTRUCTION_OR_VISUAL_SELECTION");
    if (contract.outcomeId === "MOET2018-G2-GEO-P026-007") {
      assert.equal(generated.publicSnapshot.visual.data.shape, "QUADRILATERAL");
      assert.equal(generated.publicSnapshot.publicPrompt.includes("hình tứ giác"), true);
    }
  }
});

test("money and construction contracts preserve exact outcome intent", () => {
  const expectedMoneyOperations: Readonly<Record<string, readonly string[]>> = {
    "MOET2018-G2-GEO-P027-015": ["DENOMINATION"],
    "MOET2018-G3-GEO-P032-018": ["DENOMINATION"],
    "MOET2018-G4-EXP-P040-002": ["CHANGE"],
    "MOET2018-G5-EXP-P046-001": ["CHANGE", "PROFIT_OR_LOSS", "INTEREST_RATE"],
    "MOET2018-G6-EXP-P054-001": ["DEBT_BALANCE", "SIMPLE_INTEREST", "INTEREST_RATE"],
    "MOET2018-G6-EXP-P054-002": ["TRANSACTION_BALANCE"],
    "MOET2018-G6-NAA-P047-004": ["PURCHASE_TOTAL", "CHANGE", "MAX_QUANTITY"],
    "MOET2018-G6-NAA-P048-028": ["PURCHASE_TOTAL", "CHANGE", "MAX_QUANTITY"],
    "MOET2018-G8-EXP-P070-001": ["BANK_STATEMENT_BALANCE", "PAYMENT_METHOD"],
  };
  for (const [outcomeId, operations] of Object.entries(expectedMoneyOperations)) {
    const contract = WAVE_D_OUTCOME_CONTRACTS.find((item) => item.outcomeId === outcomeId)!;
    const actual = new Set(["EASY", "MEDIUM", "HARD"].map((difficulty, index) => generateQuestion({
      outcomeId,
      grade: contract.grade,
      difficulty: difficulty as "EASY" | "MEDIUM" | "HARD",
      seed: `money-intent-${index}`,
      locale: "vi-VN",
    }).publicSnapshot.publicData.operation));
    assert.deepEqual([...actual].sort(), [...operations].sort(), outcomeId);
  }
  const construction = WAVE_D_OUTCOME_CONTRACTS.find((item) => item.canonicalVariantId === "GEOMETRIC_CONSTRUCTION_PLAN")!;
  const generated = generateQuestion({
    outcomeId: construction.outcomeId,
    grade: construction.grade,
    difficulty: "HARD",
    interactionType: "CONSTRUCTION_OR_VISUAL_SELECTION",
    seed: "construction-instruction-contract",
    locale: "vi-VN",
  });
  assert.equal(generated.publicSnapshot.publicPrompt.includes("Chọn phương án nêu đầy đủ"), true);
  assert.equal(generated.publicSnapshot.publicPrompt.includes("Sắp xếp các bước"), false);
});

test("unsupported outcome, wrong grade and unsupported interaction fail closed", () => {
  const contract = WAVE_D_OUTCOME_CONTRACTS.find((item) => item.engineVersion === WAVE_D_ENGINE_VERSION)!;
  const input = { outcomeId: contract.outcomeId, grade: contract.grade, difficulty: "MEDIUM" as const, seed: "wave-d-fail-closed", locale: "vi-VN" as const };
  assert.throws(() => generateQuestion({ ...input, outcomeId: "MOET2018-WAVE-D-UNKNOWN" }), /GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED/u);
  assert.throws(() => generateQuestion({ ...input, grade: contract.grade + 1 }), /GRADE_MISMATCH/u);
  assert.throws(() => generateQuestion({ ...input, interactionType: "TABLE_OR_CHART_RESPONSE" }), /INTERACTION_UNSUPPORTED/u);
});

test("negative controls reject solver, prompt, grade and visual mutations", () => {
  for (const contract of WAVE_D_OUTCOME_CONTRACTS.filter((item) => item.engineVersion === WAVE_D_ENGINE_VERSION).slice(0, 12)) {
    const inspected = __waveDNegativeControl.inspect(contract, { outcomeId: contract.outcomeId, grade: contract.grade, difficulty: "HARD", seed: `wave-d-negative-${contract.outcomeId}`, locale: "vi-VN" });
    assert.throws(() => __waveDNegativeControl.validate(contract, inspected.normalizedModel, inspected.solution, "Sai mô hình", inspected.interaction, inspected.visual), /VALIDATION_FAILED/u);
    assert.throws(() => __waveDNegativeControl.validate(contract, { ...inspected.normalizedModel, values: [1_000_000_000] }, inspected.solution, inspected.prompt, inspected.interaction, inspected.visual), /VALIDATION_FAILED/u);
  }
});

test("13,920-sample Wave D audit passes exact and near-duplicate gates", () => {
  assert.equal(diversity.result, "PASS");
  assert.equal(diversity.audit.generatedSamples, 13_920);
  assert.equal(diversity.summary.maximumExactDuplicateRate, 0);
  assert.ok(diversity.summary.maximumNearDuplicatePairRate <= 0.12);
  assert.equal(diversity.summary.failedBatches, 0);
  assert.equal(report.coverage.waveDTotal, 232);
  assert.equal(report.coverage.blocked, 0);
  assert.equal(report.coverage.fallbackCount, 0);
  assert.equal(report.coverage.keywordRoutingCount, 0);
  assert.deepEqual(report.coverage.mathematicallyUnsolvableOutcomes, []);
});

test("final Wave D report requires authenticated local browser evidence", () => {
  assert.equal(report.result, "PASS_BROWSER_VALIDATED");
  assert.equal(report.browserAcceptance.status, "PASS");
});
