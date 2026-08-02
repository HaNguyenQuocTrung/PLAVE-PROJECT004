import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PRODUCT_VARIANT_REGISTRY,
  assertPublicBoundary,
  generateQuestion,
  publicQuestionOnly,
  to0041Question,
  validateStudentResponse,
  verifyQuestionIntegrity,
  type GeneratedProductQuestion,
  type CanonicalResponse,
} from "../lib/generation-v2/index.ts";
import { serializeGeneratorV2DatabaseAnswer } from "../lib/generation-v2/answer-transport.ts";

type TamperTarget = {
  publicSnapshot: {
    publicPrompt: string;
    publicData: Record<string, unknown>;
    visual: { data: Record<string, unknown> };
    difficulty: string;
    variantId: string;
    interaction: { options?: Array<{ label: string }> };
  };
  privateSolution: { acceptedResponses: CanonicalResponse[] };
};

const outcomeInventory = JSON.parse(
  readFileSync("docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json", "utf8"),
) as { outcomes: readonly { id: string; grade: number; mappedUnitIds: readonly string[] }[] };

const inputFor = (entry: (typeof PRODUCT_VARIANT_REGISTRY)[number], difficulty: "EASY" | "MEDIUM" | "HARD" = "MEDIUM", seed = "sprint8b-contract-001") => ({
  outcomeId: entry.outcomeId,
  grade: entry.grade,
  difficulty,
  seed,
  locale: "vi-VN" as const,
});

test("canonical registry has exactly 12 real outcomes and covers Grades 1-9", () => {
  assert.equal(PRODUCT_VARIANT_REGISTRY.length, 12);
  assert.deepEqual([...new Set(PRODUCT_VARIANT_REGISTRY.map((item) => item.grade))].sort(), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (const entry of PRODUCT_VARIANT_REGISTRY) {
    const official = outcomeInventory.outcomes.find((outcome) => outcome.id === entry.outcomeId);
    assert.ok(official, entry.outcomeId);
    assert.equal(official.grade, entry.grade);
    assert.ok(official.mappedUnitIds.includes(entry.unitId));
  }
});

test("entry point fails closed for unknown outcomes, wrong grades and unsupported interaction", () => {
  const entry = PRODUCT_VARIANT_REGISTRY[0];
  assert.throws(() => generateQuestion({ ...inputFor(entry), outcomeId: "synthetic-proof" }), /GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED/u);
  assert.throws(() => generateQuestion({ ...inputFor(entry), grade: 9 }), /GRADE_MISMATCH/u);
  assert.throws(() => generateQuestion({ ...inputFor(entry), interactionType: "MATCHING" }), /INTERACTION_UNSUPPORTED/u);
});

test("all variants are deterministic, independently validated and private before submit", () => {
  for (const entry of PRODUCT_VARIANT_REGISTRY) {
    for (const difficulty of ["EASY", "MEDIUM", "HARD"] as const) {
      const seed = `sprint8b-${entry.variantId.toLowerCase().replaceAll("_", "-")}-${difficulty.toLowerCase()}-001`;
      const first = generateQuestion(inputFor(entry, difficulty, seed));
      const second = generateQuestion(inputFor(entry, difficulty, seed));
      assert.deepEqual(first, second);
      assert.match(first.publicSnapshot.questionId, /^v2-[a-z0-9-]+-[0-9a-f]{16}$/u);
      assert.equal(first.publicSnapshot.questionId.startsWith("g2-"), false);
      assert.equal(verifyQuestionIntegrity(first), true);
      assert.equal(assertPublicBoundary(publicQuestionOnly(first)), true);
      const publicJson = JSON.stringify(publicQuestionOnly(first));
      for (const forbidden of ["correctResponse", "acceptedResponses", "seedFingerprint", "solverReceipt", "privateSolution", "validation"]) {
        assert.equal(publicJson.includes(forbidden), false, `${entry.variantId}:${forbidden}`);
      }
      assert.equal(validateStudentResponse(first, first.privateSolution.correctResponse).isCorrect, true);
    }
  }
});

test("0041 adapter is explicit and preserves V2 interaction in public JSON", () => {
  for (const entry of PRODUCT_VARIANT_REGISTRY) {
    const generated = generateQuestion(inputFor(entry, "HARD", `sprint8b-adapter-${entry.grade}-${entry.variantId.toLowerCase().replaceAll("_", "-")}`));
    const persisted = to0041Question(generated, {
      position: 1,
      releaseId: "plave-math-grades-1-9-v1",
      unitId: entry.unitId,
      skillId: `G${entry.grade}_V2_SLICE`,
      skillTitle: "Kĩ năng Toán trong vertical slice",
      contentReleaseHash: "a".repeat(64),
    });
    assert.equal(persisted.question.visual.productContract.questionSource, "GENERATED_V2");
    assert.equal(persisted.question.visual.productContract.interaction.type, generated.publicSnapshot.interaction.type);
    assert.match(persisted.question.contract.seed, /^v2-[0-9a-f]{16}$/u);
    assert.match(persisted.question.publicPayloadHash, /^[0-9a-f]{64}$/u);
    assert.match(persisted.solution.privatePayloadHash, /^[0-9a-f]{64}$/u);
    assert.equal(JSON.stringify(persisted.question).includes("correctResponse"), false);
  }
});

test("0041 adapter mirrors database normalization for structured interactions", () => {
  for (const variantId of ["PLACE_VALUE_COMPARE", "LINEAR_SYSTEM", "EXPERIMENTAL_PROBABILITY"] as const) {
    const entry = PRODUCT_VARIANT_REGISTRY.find((item) => item.variantId === variantId)!;
    const question = generateQuestion({ outcomeId: entry.outcomeId, grade: entry.grade, difficulty: "HARD", seed: `structured-${variantId.toLowerCase().replaceAll("_", "-")}`, locale: "vi-VN" });
    const persisted = to0041Question(question, {
      position: 1,
      releaseId: "plave-math-grades-1-9-v1",
      unitId: entry.unitId,
      skillId: "test-skill",
      skillTitle: "Kỹ năng kiểm chứng",
      contentReleaseHash: "a".repeat(64),
    });
    const databaseNormalized = persisted.solution.correctAnswer.trim().replace(/\s+/gu, "").replaceAll(",", ".").toLocaleLowerCase("vi");
    assert.equal(persisted.solution.normalizedCorrectAnswer, databaseNormalized);
  }
});

test("database answer transport is stable across an exact HTTP retry", () => {
  for (const variantId of ["ADD_SUB_MEANING", "PLACE_VALUE_COMPARE", "LINEAR_SYSTEM"] as const) {
    const entry = PRODUCT_VARIANT_REGISTRY.find((item) => item.variantId === variantId)!;
    const question = generateQuestion(inputFor(entry, "HARD", `transport-${variantId.toLowerCase().replaceAll("_", "-")}`));
    const first = serializeGeneratorV2DatabaseAnswer(
      question.publicSnapshot.interaction,
      question.privateSolution.correctResponse,
    );
    const retry = serializeGeneratorV2DatabaseAnswer(
      question.publicSnapshot.interaction,
      question.privateSolution.correctResponse,
    );
    assert.notEqual(first, null);
    assert.equal(retry, first);
  }
});

test("fraction prompts and immutable visuals share the segmented-bar model", () => {
  const entry = PRODUCT_VARIANT_REGISTRY.find((item) => item.variantId === "FRACTION_PART_WHOLE")!;
  for (let index = 0; index < 100; index += 1) {
    const question = generateQuestion(inputFor(entry, "HARD", `fraction-visual-contract-${index}`));
    assert.equal(question.publicSnapshot.publicData.visualModel, "SEGMENTED_BAR");
    assert.equal(question.publicSnapshot.visual.data.modelType, "SEGMENTED_BAR");
    assert.doesNotMatch(question.publicSnapshot.publicPrompt, /(?:hình|vòng) tròn|ô vuông/iu);
  }
});

test("mixed-time prompts and immutable visuals carry both minute and second values", () => {
  const entry = PRODUCT_VARIANT_REGISTRY.find((item) => item.variantId === "UNIT_CONVERSION")!;
  for (let index = 0; index < 100; index += 1) {
    const question = generateQuestion(inputFor(entry, "HARD", `mixed-time-visual-contract-${index}`));
    const data = question.publicSnapshot.publicData;
    const expected = `${data.value} phút ${data.remainder} giây`;
    assert.equal(data.sourceDisplay, expected);
    assert.equal(question.publicSnapshot.visual.data.sourceDisplay, expected);
    assert.match(question.publicSnapshot.publicPrompt, new RegExp(expected));
    assert.match(question.publicSnapshot.visual.description, new RegExp(expected));
  }
});

test("hard applied problems solve the stated total of both groups and reserve", () => {
  const entry = PRODUCT_VARIANT_REGISTRY.find((item) => item.variantId === "APPLIED_TWO_STEP")!;
  for (let index = 0; index < 100; index += 1) {
    const question = generateQuestion(inputFor(entry, "HARD", `applied-total-contract-${index}`));
    const quantities = question.publicSnapshot.publicData.quantities;
    assert.ok(Array.isArray(quantities));
    const [groupA, difference, reserve] = quantities.map(Number);
    const expected = groupA + (groupA + difference) + reserve;
    const correctOption = question.publicSnapshot.interaction.options?.find(
      (option) => option.id === String(question.privateSolution.correctResponse),
    );
    assert.equal(correctOption?.label, String(expected));
    assert.match(question.privateSolution.solutionSteps.at(-1) ?? "", new RegExp(`= ${expected}\\.$`));
  }
});

test("negative controls reject tampered prompt, ambiguity, invalid math, mismatched visual, relabel and grade bounds", () => {
  const by = (variantId: string) => PRODUCT_VARIANT_REGISTRY.find((entry) => entry.variantId === variantId)!;
  const clone = (value: GeneratedProductQuestion) => structuredClone(value) as unknown as TamperTarget;
  const cases: [string, GeneratedProductQuestion, (value: TamperTarget) => void][] = [
    ["PROMPT_SOLVER_MISMATCH", generateQuestion(inputFor(by("ADD_SUB_MEANING"))), (value) => { value.publicSnapshot.publicPrompt = "Tính một bài toán khác."; }],
    ["TWO_VALID_ANSWERS", generateQuestion(inputFor(by("ADD_SUB_MEANING"))), (value) => { value.privateSolution.acceptedResponses.push("another-answer"); }],
    ["DIVIDE_BY_ZERO", generateQuestion(inputFor(by("FRACTION_PART_WHOLE"))), (value) => { value.publicSnapshot.publicData.totalParts = 0; }],
    ["FRACTION_NOT_NORMALIZED", generateQuestion(inputFor(by("FRACTION_PART_WHOLE"))), (value) => { value.privateSolution.acceptedResponses.push("2/4"); }],
    ["UNIT_MISMATCH", generateQuestion(inputFor(by("UNIT_CONVERSION"))), (value) => { value.publicSnapshot.visual.data.target = "kg"; }],
    ["GEOMETRY_VISUAL_MISMATCH", generateQuestion(inputFor(by("GEOMETRY_PROPERTIES"))), (value) => { value.publicSnapshot.visual.data.shape = "TRIANGLE"; }],
    ["CHART_LABEL_MISMATCH", generateQuestion(inputFor(by("CHART_DATA_INTERPRETATION"))), (value) => { value.publicSnapshot.visual.data.labels = ["Khác"]; }],
    ["DIFFICULTY_RELABEL", generateQuestion(inputFor(by("PLACE_VALUE_COMPARE"), "EASY")), (value) => { value.publicSnapshot.difficulty = "HARD"; }],
    ["FAMILY_RELABEL", generateQuestion(inputFor(by("PERIMETER_AREA"))), (value) => { value.publicSnapshot.variantId = "LINEAR_SYSTEM"; }],
    ["OUT_OF_GRADE_PARAMETER", generateQuestion(inputFor(by("ADD_SUB_MEANING"))), (value) => { value.publicSnapshot.publicData.initial = 999; }],
    ["DUPLICATE_DISTRACTOR", generateQuestion(inputFor(by("DATA_ERROR_REASONING"))), (value) => {
      const options = value.publicSnapshot.interaction.options;
      assert.ok(options?.[0] && options[1]);
      options[1].label = options[0].label;
    }],
  ];
  for (const [name, original, mutate] of cases) {
    const tampered = clone(original);
    mutate(tampered);
    assert.throws(() => verifyQuestionIntegrity(tampered as unknown as GeneratedProductQuestion), /GENERATION_V2:INTEGRITY/u, name);
  }
});
