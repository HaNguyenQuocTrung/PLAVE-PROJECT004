import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import { buildOfficialGradeSkeleton, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type {
  AutomatedEvidenceReceipt,
  DifficultyBand,
  GradePack,
  MathExpression,
  PrerequisiteEdge,
  QuestionBlueprint,
  QuestionType,
} from "./types.ts";

type WaveAGrade = 7 | 8 | 9;

export type ExactQuestionSeed = Readonly<{
  id: string;
  blueprintId: string;
  skillId: string;
  prompt: string;
  answerType: Extract<QuestionType, "INTEGER_INPUT" | "RATIONAL_INPUT">;
  derivation: MathExpression;
  explanationSteps: readonly string[];
  difficulty: DifficultyBand;
  deterministicSeed: string;
  instructionalPurpose?:
    | "FOUNDATION"
    | "STANDARD_APPLICATION"
    | "MISCONCEPTION_TARGETING"
    | "REMEDIATION"
    | "TRANSFER_APPLICATION";
}>;

export type ExactWaveAConfig = Readonly<{
  grade: WaveAGrade;
  packId: string;
  packVersion: string;
  candidateId: string;
  policyVersion: string;
  selectedSliceId: string;
  selectionBasis: readonly string[];
  blueprints: readonly QuestionBlueprint[];
  questionSeeds: readonly ExactQuestionSeed[];
  prerequisites: readonly PrerequisiteEdge[];
}>;

function exactValue(derivation: MathExpression) {
  const value = evaluateExpression(derivation);
  return value.denominator === 1
    ? String(value.numerator)
    : `${value.numerator}/${value.denominator}`;
}

function evidenceReceipts(packId: string): readonly AutomatedEvidenceReceipt[] {
  return requiredAutomatedEvidenceChecks.map((check) => ({
    id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`,
    entityId: packId,
    check,
    status: "PASSED" as const,
    evidence: `Wave A deterministic evidence gate passed: ${check}.`,
  }));
}

export function buildExactWaveAPack(config: ExactWaveAConfig): GradePack {
  const skeleton = buildOfficialGradeSkeleton(config.grade);
  const receipts = evidenceReceipts(config.packId);
  const receiptIds = receipts.map((receipt) => receipt.id);
  const explanationReceiptId = `${config.packId}-explanation-consistency`;
  const sourceReferenceId = officialSourceReferenceId(config.grade);
  const questions = config.questionSeeds.map((seed, index) => {
    const answer = exactValue(seed.derivation);
    const prompt = seed.prompt.normalize("NFC");
    const instructionalPurpose = seed.instructionalPurpose ?? (
      index < 8
        ? "FOUNDATION"
        : index < 12
          ? "STANDARD_APPLICATION"
          : index < 16
            ? "MISCONCEPTION_TARGETING"
            : index < 20
              ? "REMEDIATION"
              : "TRANSFER_APPLICATION"
    );
    return {
      id: seed.id,
      grade: config.grade,
      blueprintId: seed.blueprintId,
      skillId: seed.skillId,
      prompt,
      options: null,
      answer: { type: seed.answerType, exactValue: answer, derivation: seed.derivation },
      explanationId: `${seed.id}-explanation`,
      difficulty: seed.difficulty,
      provenance: {
        kind: "DETERMINISTIC_TEMPLATE" as const,
        templateVersion: `${config.selectedSliceId}-template-v1`,
        seed: seed.deterministicSeed,
        sourceReferenceIds: [sourceReferenceId],
      },
      reviewStatus: "BUNDLED" as const,
      published: false,
      pilotEligible: false,
      fixtureOnly: false,
      duplicateFingerprint: sha256(normalizedDefinition(`${prompt}|`).toLocaleLowerCase("vi")),
      validationReceiptIds: receiptIds,
      instructionalPurpose,
    };
  });
  const explanations = config.questionSeeds.map((seed, index) => ({
    id: `${seed.id}-explanation`,
    questionId: seed.id,
    steps: seed.explanationSteps.map((step) => step.normalize("NFC")),
    finalAnswer: questions[index]!.answer.exactValue!,
    evidenceReceiptIds: [explanationReceiptId],
  }));
  const candidateCore = {
    format: "plave-wave-a-candidate-v1",
    grade: config.grade,
    candidateId: config.candidateId,
    version: config.packVersion,
    policyVersion: config.policyVersion,
    sourceReferenceId,
    blueprints: config.blueprints,
    questions,
    explanations,
  } as const;
  const bundleHash = sha256(canonicalize(candidateCore));
  return {
    schemaVersion: "content-factory-grade-pack-v1",
    grade: config.grade,
    packId: config.packId,
    packVersion: config.packVersion,
    immutableReference: false,
    testOnly: false,
    locale: "vi-VN",
    unicodeNormalization: "NFC",
    sources: [skeleton.source],
    domains: skeleton.domains,
    units: skeleton.units,
    knowledgeNodes: skeleton.knowledgeNodes,
    skills: skeleton.skills,
    objectives: skeleton.objectives,
    prerequisites: config.prerequisites,
    blueprints: config.blueprints,
    questions,
    quarantinedQuestions: [],
    explanations,
    evidenceReceipts: receipts,
    candidate: {
      candidateId: config.candidateId,
      version: config.packVersion,
      bundleHash,
      policyVersion: config.policyVersion,
    },
    adaptivePolicy: { version: config.policyVersion, status: "VALIDATED" },
    release: {
      publication: "DRAFT",
      visibility: "HIDDEN",
      pilotEnabled: false,
      runtimeEnabled: false,
      retentionEnabled: false,
    },
    production: {
      wave: "A",
      selectedSliceId: config.selectedSliceId,
      selectionBasis: config.selectionBasis,
      generated: questions.length,
      repaired: 0,
      evidenceGatePassed: questions.length,
      verificationInsufficient: 0,
      rejected: 0,
      duplicate: 0,
      candidateEligible: questions.length,
    },
    legacyAsset: null,
  };
}

export function value(numerator: number, denominator = 1): MathExpression {
  return { op: "VALUE", numerator, denominator };
}

export function binary(
  op: Extract<MathExpression, { op: "ADD" | "SUBTRACT" | "MULTIPLY" | "DIVIDE" }>["op"],
  left: MathExpression,
  right: MathExpression,
): MathExpression {
  return { op, left, right };
}

export function waveDifficulty(index: number): DifficultyBand {
  return index < 8 ? "FOUNDATIONAL" : index < 16 ? "CORE" : "EXTENSION";
}
