import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GENERATOR_V2_OUTCOME_REGISTRY,
  WAVE_A_ENGINE_VERSION,
  WAVE_A_OUTCOME_CONTRACTS,
  assertPublicBoundary,
  generateQuestion,
  publicQuestionOnly,
  to0041Question,
  validateStudentResponse,
  verifyQuestionIntegrity,
} from "../lib/generation-v2/index.ts";
import { serializeGeneratorV2DatabaseAnswer } from "../lib/generation-v2/answer-transport.ts";

const official = JSON.parse(readFileSync("docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json", "utf8")) as { outcomes: readonly { id: string; grade: number; mappedUnitIds: readonly string[] }[] };
const report = JSON.parse(readFileSync("artifacts/generator-v2-wave-a/report.json", "utf8")) as { result: string; coreTechnicalResult: string; coverage: Record<string, number | boolean>; validation: Record<string, number | string> };
const diversity = JSON.parse(readFileSync("artifacts/generator-v2-wave-a/diversity.json", "utf8")) as { result: string; audit: { generatedSamples: number }; summary: { maximumExactDuplicateRate: number; maximumNearDuplicateRate: number; failedBatches: number }; perimeterAreaRegression: { rerun: readonly { difficulty: string; nearDuplicatePairRate: number; result: string }[] } };

test("Wave A has 98 explicit contracts, 39 canonical capabilities and no missing contract", () => {
  assert.equal(WAVE_A_OUTCOME_CONTRACTS.length, 98);
  assert.equal(new Set(WAVE_A_OUTCOME_CONTRACTS.map((contract) => contract.outcomeId)).size, 98);
  assert.equal(new Set(WAVE_A_OUTCOME_CONTRACTS.map((contract) => contract.canonicalVariantId)).size, 39);
  assert.equal(WAVE_A_OUTCOME_CONTRACTS.filter((contract) => contract.engineVersion === WAVE_A_ENGINE_VERSION).length, 95);
  assert.equal(GENERATOR_V2_OUTCOME_REGISTRY.length, 546);
  for (const contract of WAVE_A_OUTCOME_CONTRACTS) {
    assert.equal(contract.contractType, "PLAVE_PRODUCT_ASSESSMENT_CONTRACT_V2");
    assert.equal(contract.uniquenessPolicy, "EXACTLY_ONE_NORMALIZED_ANSWER");
    assert.ok(contract.measurableIntent.length > 20);
    assert.ok(contract.permittedEvidenceForms.length > 0);
    assert.ok(contract.interactionPolicy.length > 0);
    assert.ok(contract.independentSolver.length > 8);
    assert.ok(contract.independentValidator.length > 8);
    const outcome = official.outcomes.find((item) => item.id === contract.outcomeId);
    assert.ok(outcome, contract.outcomeId);
    assert.equal(outcome.grade, contract.grade);
    assert.ok(outcome.mappedUnitIds.length > 0);
  }
});

test("Wave A runtime generation is explicitly routed and interaction-diverse", () => {
  const interactions = new Set<string>();
  for (const contract of WAVE_A_OUTCOME_CONTRACTS) {
    for (const difficulty of ["EASY", "MEDIUM", "HARD"] as const) {
      const generated = generateQuestion({ outcomeId: contract.outcomeId, grade: contract.grade, difficulty, seed: `wave-a-test-${contract.grade}-${difficulty.toLowerCase()}-${contract.outcomeId.toLowerCase()}`, locale: "vi-VN" });
      assert.equal(verifyQuestionIntegrity(generated), true);
      assert.equal(generated.provenance.questionSource, "GENERATED_V2");
      assert.equal(generated.publicSnapshot.outcomeId, contract.outcomeId);
      assert.equal(assertPublicBoundary(publicQuestionOnly(generated)), true);
      interactions.add(generated.publicSnapshot.interaction.type);
    }
  }
  for (const interaction of ["SINGLE_CHOICE", "MULTI_SELECT", "INTEGER_INPUT", "DECIMAL_INPUT", "FRACTION_INPUT", "ORDERING", "MATCHING", "CONSTRUCTION_OR_VISUAL_SELECTION"]) assert.ok(interactions.has(interaction), interaction);
});

test("unknown outcomes, wrong grade and unsupported interaction still fail closed", () => {
  const contract = WAVE_A_OUTCOME_CONTRACTS.find((item) => item.engineVersion === WAVE_A_ENGINE_VERSION)!;
  const input = { outcomeId: contract.outcomeId, grade: contract.grade, difficulty: "MEDIUM" as const, seed: "wave-a-fail-closed", locale: "vi-VN" as const };
  assert.throws(() => generateQuestion({ ...input, outcomeId: "MOET2018-NOT-IMPLEMENTED" }), /GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED/u);
  assert.throws(() => generateQuestion({ ...input, grade: contract.grade + 1 }), /GRADE_MISMATCH/u);
  assert.throws(() => generateQuestion({ ...input, interactionType: "SHORT_STRUCTURED_RESPONSE" }), /INTERACTION_UNSUPPORTED/u);
});

test("three-option visual selection keeps its exact option id through the database text transport", () => {
  const contract = WAVE_A_OUTCOME_CONTRACTS.find((item) => item.canonicalVariantId === "SHAPE_RECOGNITION")!;
  const generated = generateQuestion({ outcomeId: contract.outcomeId, grade: contract.grade, difficulty: "MEDIUM", seed: "wave-a-shape-database-transport", locale: "vi-VN" });
  assert.equal(generated.publicSnapshot.interaction.type, "CONSTRUCTION_OR_VISUAL_SELECTION");
  assert.equal(generated.publicSnapshot.interaction.options?.length, 3);
  assert.equal(
    serializeGeneratorV2DatabaseAnswer(generated.publicSnapshot.interaction, generated.privateSolution.correctResponse),
    generated.privateSolution.correctResponse,
  );
});

test("matching interactions keep unique visible values and stable item ids across seeds", () => {
  const contract = WAVE_A_OUTCOME_CONTRACTS.find((item) => item.canonicalVariantId === "OPERATION_COMPONENTS")!;
  for (let seed = 0; seed < 60; seed += 1) {
    const generated = generateQuestion({ outcomeId: contract.outcomeId, grade: contract.grade, difficulty: (["EASY", "MEDIUM", "HARD"] as const)[seed % 3]!, seed: `wave-a-matching-key-${seed}`, locale: "vi-VN" });
    const interaction = generated.publicSnapshot.interaction;
    assert.equal(interaction.type, "MATCHING");
    assert.equal(new Set(interaction.leftItems?.map((item) => item.id)).size, interaction.leftItems?.length);
    assert.equal(new Set(interaction.rightItems?.map((item) => item.id)).size, interaction.rightItems?.length);
    assert.equal(new Set(interaction.rightItems?.map((item) => item.label)).size, interaction.rightItems?.length);
  }
});

test("browser-reviewed Wave A prompts stay grade-safe, explicit and free of engine labels", () => {
  const placeValueContract = WAVE_A_OUTCOME_CONTRACTS.find((item) => item.canonicalVariantId === "NUMBER_RECOGNITION_REPRESENTATION")!;
  const placeValueQuestion = generateQuestion({ outcomeId: placeValueContract.outcomeId, grade: 1, difficulty: "MEDIUM", seed: "place-value-column-alignment", locale: "vi-VN" });
  const placeValueNumber = Number((placeValueQuestion.publicSnapshot.visual.data.values as readonly number[])[0]);
  const expectedColumnCount = String(Math.abs(placeValueNumber)).length;
  assert.equal((placeValueQuestion.publicSnapshot.visual.data.columns as readonly string[]).length, expectedColumnCount);
  assert.deepEqual((placeValueQuestion.publicSnapshot.visual.data.columns as readonly string[]).slice(-2), ["Chục", "Đơn vị"]);

  const mixedGradeOne = WAVE_A_OUTCOME_CONTRACTS.find((item) => item.outcomeId === "MOET2018-G1-NUM-P022-002")!;
  for (const difficulty of ["EASY", "MEDIUM", "HARD"] as const) {
    const generated = generateQuestion({ outcomeId: mixedGradeOne.outcomeId, grade: 1, difficulty, seed: `grade-one-mixed-${difficulty.toLowerCase()}`, locale: "vi-VN" });
    assert.doesNotMatch(generated.publicSnapshot.publicPrompt, /[×÷^]/u);
  }

  for (const capability of ["APPLIED_ARITHMETIC", "DATA_RELATION_REASONING", "BANKING_FINANCE"] as const) {
    const contract = WAVE_A_OUTCOME_CONTRACTS.find((item) => item.canonicalVariantId === capability)!;
    for (const difficulty of ["EASY", "MEDIUM", "HARD"] as const) {
      const generated = generateQuestion({ outcomeId: contract.outcomeId, grade: contract.grade, difficulty, seed: `reviewed-copy-${capability.toLowerCase().replaceAll("_", "-")}-${difficulty.toLowerCase()}`, locale: "vi-VN" });
      assert.doesNotMatch(generated.publicSnapshot.publicPrompt, /\b(?:one_step|two_step|select_relevant|difference_relation|missing_from_total|add|subtract|multiply_linear)\b/iu);
      assert.doesNotMatch(generated.privateSolution.nextStep, /_/u);
    }
  }

  const sameBase = WAVE_A_OUTCOME_CONTRACTS.find((item) => item.outcomeId === "MOET2018-G6-NAA-P047-009")!;
  for (const difficulty of ["EASY", "MEDIUM", "HARD"] as const) {
    const generated = generateQuestion({ outcomeId: sameBase.outcomeId, grade: 6, difficulty, seed: `same-base-rule-${difficulty.toLowerCase()}`, locale: "vi-VN" });
    assert.match(String(generated.publicSnapshot.publicData.task), /^(?:MULTIPLY|DIVIDE)_SAME_BASE$/u);
    assert.match(generated.publicSnapshot.publicPrompt, /[×:]/u);
  }

  const additionProperty = WAVE_A_OUTCOME_CONTRACTS.find((item) => item.outcomeId === "MOET2018-G4-NUM-P035-014")!;
  const propertyQuestion = generateQuestion({ outcomeId: additionProperty.outcomeId, grade: 4, difficulty: "MEDIUM", seed: "addition-associative-review", locale: "vi-VN" });
  assert.equal(propertyQuestion.publicSnapshot.publicData.task, "ADDITION_ASSOCIATIVE");
  assert.match(propertyQuestion.publicSnapshot.publicPrompt, /kết hợp của phép cộng/u);
  assert.doesNotMatch(propertyQuestion.publicSnapshot.publicPrompt, /phân phối/u);

  const addSubMeaning = WAVE_A_OUTCOME_CONTRACTS.find((item) => item.outcomeId === "MOET2018-G1-NUM-P022-004")!;
  const subtractionQuestion = generateQuestion({ outcomeId: addSubMeaning.outcomeId, grade: 1, difficulty: "MEDIUM", seed: "subtraction-visual-review", locale: "vi-VN" });
  assert.equal(subtractionQuestion.publicSnapshot.visual.data.action, "-");
  assert.deepEqual(subtractionQuestion.publicSnapshot.visual.data.groups, [subtractionQuestion.publicSnapshot.publicData.initial]);
  assert.match(subtractionQuestion.publicSnapshot.publicPrompt, /Còn lại bao nhiêu/u);
  for (let seed = 0; seed < 40; seed += 1) {
    const generated = generateQuestion({ outcomeId: addSubMeaning.outcomeId, grade: 1, difficulty: "HARD", seed: `add-sub-hard-copy-${seed}`, locale: "vi-VN" });
    const action = generated.publicSnapshot.publicData.action;
    assert.match(generated.publicSnapshot.publicPrompt, action === "ADD" ? /tất cả\?/u : /còn lại\?/u);
  }
});

test("feedback, public boundary and immutable persistence adapter work for each capability", () => {
  const seen = new Set<string>();
  const nextSteps = new Set<string>();
  for (const contract of WAVE_A_OUTCOME_CONTRACTS) {
    if (seen.has(contract.canonicalVariantId)) continue;
    seen.add(contract.canonicalVariantId);
    const generated = generateQuestion({ outcomeId: contract.outcomeId, grade: contract.grade, difficulty: "HARD", seed: `wave-a-persistence-${contract.grade}-${contract.canonicalVariantId.toLowerCase().replaceAll("_", "-")}`, locale: "vi-VN" });
    const correct = validateStudentResponse(generated, generated.privateSolution.correctResponse);
    assert.equal(correct.isCorrect, true);
    assert.doesNotMatch(generated.privateSolution.nextStep, /_/u);
    nextSteps.add(generated.privateSolution.nextStep);
    const persisted = to0041Question(generated, { position: 1, releaseId: "plave-math-grades-1-9-v1", unitId: official.outcomes.find((item) => item.id === contract.outcomeId)!.mappedUnitIds[0]!, skillId: `WAVE_A_${contract.canonicalVariantId}`, skillTitle: contract.measurableIntent, contentReleaseHash: "a".repeat(64) });
    assert.equal(persisted.question.visual.productContract.questionSource, "GENERATED_V2");
    assert.equal(JSON.stringify(persisted.question).includes("correctResponse"), false);
    assert.equal(JSON.stringify(publicQuestionOnly(generated)).includes("privateSolution"), false);
  }
  assert.equal(seen.size, 39);
  assert.ok(nextSteps.size >= 20);
});

test("5,880-sample diversity and PERIMETER_AREA regression artifacts pass exact thresholds", () => {
  assert.equal(report.result, "PASS_BROWSER_VALIDATED");
  assert.equal(report.coreTechnicalResult, "PASS_BROWSER_VALIDATED_OWNER_PRODUCT_REVIEW_PACKAGE_READY");
  assert.equal(report.coverage.waveATotal, 98);
  assert.equal(report.coverage.blockedMissingContract, 0);
  assert.equal(report.coverage.generatedSamples, 5_880);
  assert.equal(report.coverage.fallbackCount, 0);
  assert.equal(diversity.result, "PASS");
  assert.equal(diversity.audit.generatedSamples, 5_880);
  assert.equal(diversity.summary.maximumExactDuplicateRate, 0);
  assert.ok(diversity.summary.maximumNearDuplicateRate <= 0.12);
  assert.equal(diversity.summary.failedBatches, 0);
  assert.deepEqual(diversity.perimeterAreaRegression.rerun.map((item) => item.difficulty), ["EASY", "MEDIUM", "HARD"]);
  for (const item of diversity.perimeterAreaRegression.rerun) {
    assert.equal(item.result, "PASS");
    assert.ok(item.nearDuplicatePairRate <= 0.12);
  }
});
