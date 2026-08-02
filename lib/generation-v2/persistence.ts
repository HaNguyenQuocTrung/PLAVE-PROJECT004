import { createHash } from "node:crypto";

import type { GeneratedProductQuestion, ProductDifficulty } from "./types.ts";

type LegacyAnswerType = "MULTIPLE_CHOICE" | "NUMBER_INPUT" | "TEXT_INPUT";
type LegacyDifficulty = "UNDERSTAND" | "APPLY" | "REASON";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const difficultyMap: Record<ProductDifficulty, LegacyDifficulty> = {
  EASY: "UNDERSTAND",
  MEDIUM: "APPLY",
  HARD: "REASON",
};

function encodeResponse(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : JSON.stringify(value);
}

function normalize0041Answer(value: string) {
  return value
    .trim()
    .replace(/\s+/gu, "")
    .replaceAll(",", ".")
    .toLocaleLowerCase("vi");
}

/**
 * Lossless V2-to-0041 adapter. Rich interaction data remains public inside the
 * visual JSON envelope; 0041's three answer transports are only storage/wire
 * transports. This does not silently downgrade the product interaction.
 */
export function to0041Question(
  question: GeneratedProductQuestion,
  input: Readonly<{
    position: number;
    releaseId: string;
    unitId: string;
    skillId: string;
    skillTitle: string;
    contentReleaseHash: string;
  }>,
) {
  const interaction = question.publicSnapshot.interaction;
  const choiceTransport =
    (interaction.type === "SINGLE_CHOICE" || interaction.type === "CONSTRUCTION_OR_VISUAL_SELECTION") &&
    interaction.options?.length === 4;
  const numericTransport = typeof question.privateSolution.correctResponse === "number" &&
    ["INTEGER_INPUT", "DECIMAL_INPUT", "TABLE_OR_CHART_RESPONSE"].includes(interaction.type);
  const answerType: LegacyAnswerType = choiceTransport ? "MULTIPLE_CHOICE" : numericTransport ? "NUMBER_INPUT" : "TEXT_INPUT";
  const keyById = new Map<string, string>();
  const options = choiceTransport
    ? interaction.options!.map((option, index) => {
        const key = ["A", "B", "C", "D"][index]!;
        keyById.set(option.id, key);
        return { key, label: option.label };
      })
    : null;
  const rawCorrect = encodeResponse(question.privateSolution.correctResponse);
  const correctAnswer = choiceTransport ? keyById.get(rawCorrect) : rawCorrect;
  if (!correctAnswer) throw new Error("GENERATION_V2:0041_CORRECT_OPTION_MISSING");
  const publicPayload = {
    questionId: question.publicSnapshot.questionId,
    position: input.position,
    contract: {
      contractVersion: "on-demand-curriculum-v1",
      grade: question.publicSnapshot.grade,
      unitId: input.unitId,
      releaseId: input.releaseId,
      outcomeId: question.publicSnapshot.outcomeId,
      skillId: input.skillId,
      skillTitle: input.skillTitle,
      difficulty: difficultyMap[question.publicSnapshot.difficulty],
      evidenceForm: question.publicSnapshot.variantId === "DATA_ERROR_REASONING" ? "ERROR_ANALYSIS" : "PERFORM",
      seed: `v2-${question.provenance.seedFingerprint}`,
      generatorVersion: "vertical-preview-v1",
      contentReleaseHash: input.contentReleaseHash,
    },
    prompt: question.publicSnapshot.publicPrompt,
    answerType,
    options,
    visual: {
      ...question.publicSnapshot.visual,
      productContract: {
        questionSource: "GENERATED_V2",
        grade: question.publicSnapshot.grade,
        outcomeId: question.publicSnapshot.outcomeId,
        productFamilyId: question.publicSnapshot.productFamilyId,
        variantId: question.publicSnapshot.variantId,
        variantVersion: question.publicSnapshot.variantVersion,
        difficulty: question.publicSnapshot.difficulty,
        interaction,
        accessibility: question.publicSnapshot.accessibility,
        publicData: question.publicSnapshot.publicData,
      },
    },
    misconceptionTags: Object.values(question.privateSolution.optionMisconceptions).length
      ? Object.values(question.privateSolution.optionMisconceptions)
      : ["NEEDS_STEP_REVIEW"],
    provenance: {
      semanticVariantId: question.publicSnapshot.variantId,
      semanticVariantVersion: question.publicSnapshot.variantVersion,
      solverVersion: question.provenance.solverVersion,
      solverReceiptHash: question.provenance.solverReceiptHash,
      difficultyPolicyVersion: question.provenance.difficultyPolicyVersion,
      seedFingerprint: question.provenance.seedFingerprint,
      astHash: question.provenance.normalizedModelHash,
      visualHash: question.provenance.visualHash,
    },
  };
  return {
    question: {
      ...publicPayload,
      publicPayloadHash: sha256(JSON.stringify(publicPayload)),
    },
    solution: {
      questionId: question.publicSnapshot.questionId,
      normalizedCorrectAnswer: normalize0041Answer(correctAnswer),
      correctAnswer,
      solutionSteps: question.privateSolution.solutionSteps,
      feedback: question.privateSolution.nextStep,
      privatePayloadHash: sha256(JSON.stringify({ correctAnswer, steps: question.privateSolution.solutionSteps })),
    },
  };
}
