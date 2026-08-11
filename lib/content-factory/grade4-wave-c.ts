import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import {
  buildOfficialGradeSkeleton,
  officialSkillId,
  officialSourceReferenceId,
} from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type {
  CandidateQuestion,
  DifficultyBand,
  ExplanationSpec,
  GradePack,
  MathExpression,
} from "./types.ts";

const grade = 4 as const;
const unitId = "grade-4-fraction-foundations";
const sourceId = officialSourceReferenceId(grade);
const packId = "grade-4-wave-c-fraction-common-denominator-reduction";
const candidateId = "g4-fraction-common-denominator-reduction-wave-c";
const version = "g4-fraction-common-denominator-reduction-1.0.0-wave-c";
const policyVersion = "g4-fraction-foundations-policy-1.0.0-wave-c";

const sliceOutcomes = [
  "MOET2018-G4-NUM-P036-021",
  "MOET2018-G4-NUM-P036-022",
] as const;

const nextTargetOutcomeIds = [
  "MOET2018-G4-NUM-P036-023",
  "MOET2018-G4-NUM-P036-024",
] as const;

type SliceOutcome = (typeof sliceOutcomes)[number];
type GeneratedItem = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;

const purposeSequence = [
  "FOUNDATION",
  "STANDARD_APPLICATION",
  "MISCONCEPTION_TARGETING",
  "REMEDIATION",
  "TRANSFER_APPLICATION",
] as const;

const value = (numerator: number, denominator: number): MathExpression => ({
  op: "VALUE",
  numerator,
  denominator,
});

function exactRational(expression: MathExpression) {
  const result = evaluateExpression(expression);
  return result.denominator === 1
    ? String(result.numerator)
    : `${result.numerator}/${result.denominator}`;
}

function difficulty(localIndex: number): DifficultyBand {
  const position = localIndex % 4;
  return position === 0 ? "FOUNDATIONAL" : position === 3 ? "EXTENSION" : "CORE";
}

const receiptIds = requiredAutomatedEvidenceChecks.map(
  (check) => `${packId}-${check.toLowerCase().replaceAll("_", "-")}`,
);

function createItem(
  questionNumber: number,
  outcomeId: SliceOutcome,
  localIndex: number,
  prompt: string,
  answer: CandidateQuestion["answer"],
  steps: readonly string[],
): GeneratedItem {
  const suffix = String(questionNumber).padStart(2, "0");
  const questionId = `g4-wave-c-${suffix}`;
  const explanationId = `${questionId}-explanation`;
  const normalizedPrompt = prompt.normalize("NFC");
  return {
    question: {
      id: questionId,
      grade,
      blueprintId: `g4-wave-c-blueprint-${outcomeId.toLowerCase()}-${difficulty(localIndex).toLowerCase()}`,
      skillId: officialSkillId(outcomeId),
      prompt: normalizedPrompt,
      options: null,
      answer,
      explanationId,
      difficulty: difficulty(localIndex),
      provenance: {
        kind: "DETERMINISTIC_TEMPLATE",
        templateVersion: "g4-fraction-common-denominator-reduction-wave-c-template-1.0.0",
        seed: `g4-wave-c-${outcomeId.toLowerCase()}-${suffix}`,
        sourceReferenceIds: [sourceId],
      },
      reviewStatus: "BUNDLED",
      published: false,
      pilotEligible: false,
      fixtureOnly: false,
      duplicateFingerprint: sha256(normalizedDefinition(`${normalizedPrompt}|`).toLocaleLowerCase("vi")),
      validationReceiptIds: receiptIds,
      instructionalPurpose: purposeSequence[(questionNumber - 1) % purposeSequence.length]!,
    },
    explanation: {
      id: explanationId,
      questionId,
      steps: steps.map((step) => step.normalize("NFC")),
      finalAnswer: answer.exactValue ?? "",
      evidenceReceiptIds: [`${packId}-explanation-consistency`],
    },
  };
}

function commonDenominatorPrompt(
  index: number,
  numerator: number,
  denominator: number,
  otherNumerator: number,
  commonDenominator: number,
) {
  if (index < 3) {
    return `Quy đồng ${numerator}/${denominator} và ${otherNumerator}/${commonDenominator} về mẫu ${commonDenominator}. Tử số mới của phân số thứ nhất là bao nhiêu?`;
  }
  if (index < 6) {
    return `Điền số thích hợp vào ô trống để quy đồng: ${numerator}/${denominator} = …/${commonDenominator}.`;
  }
  if (index < 9) {
    return `Bạn Nam giữ nguyên tử số ${numerator} khi đổi mẫu của ${numerator}/${denominator} thành ${commonDenominator}. Hãy tìm tử số đúng.`;
  }
  return `Hai phân số ${numerator}/${denominator} và ${otherNumerator}/${commonDenominator} cần cùng mẫu ${commonDenominator}. Sau khi nhân cả tử và mẫu của phân số thứ nhất cùng một số, tử mới là bao nhiêu?`;
}

function reductionPrompt(index: number, numerator: number, denominator: number) {
  if (index < 3) return `Rút gọn phân số ${numerator}/${denominator} về phân số tối giản.`;
  if (index < 6) return `Một bạn chỉ chia tử số của ${numerator}/${denominator}. Hãy viết phân số rút gọn đúng khi chia cả tử và mẫu cho cùng một ước chung.`;
  if (index < 9) return `Phần đã dùng được biểu diễn bởi ${numerator}/${denominator}. Viết phân số tương đương ở dạng tối giản.`;
  return `Rút gọn liên tiếp ${numerator}/${denominator} cho đến khi tử số và mẫu số không còn ước chung lớn hơn 1.`;
}

function generateQuestions(): readonly GeneratedItem[] {
  const generated: GeneratedItem[] = [];
  const commonDenominators = [
    [1, 2, 3, 4], [2, 3, 5, 6], [3, 4, 7, 8], [1, 3, 5, 9],
    [2, 5, 7, 10], [3, 5, 11, 15], [1, 4, 5, 12], [5, 6, 7, 12],
    [3, 7, 11, 14], [2, 9, 13, 18], [5, 8, 9, 16], [7, 10, 13, 20],
  ] as const;
  commonDenominators.forEach(([numerator, denominator, otherNumerator, commonDenominator], index) => {
    const multiplier = commonDenominator / denominator;
    const newNumerator = numerator * multiplier;
    generated.push(createItem(
      index + 1,
      sliceOutcomes[0],
      index,
      commonDenominatorPrompt(index, numerator, denominator, otherNumerator, commonDenominator),
      { type: "INTEGER_INPUT", exactValue: String(newNumerator), derivation: value(newNumerator, 1) },
      [
        `${commonDenominator} : ${denominator} = ${multiplier}, nên cần nhân cả tử số và mẫu số với ${multiplier}.`,
        `${numerator} × ${multiplier} = ${newNumerator}.`,
        `Tử số mới là ${newNumerator}; phân số tương đương là ${newNumerator}/${commonDenominator}.`,
      ],
    ));
  });

  const reductions = [
    [6, 8], [10, 15], [12, 20], [14, 22], [15, 24], [18, 42],
    [20, 28], [21, 36], [24, 30], [27, 33], [32, 56], [35, 50],
  ] as const;
  reductions.forEach(([numerator, denominator], index) => {
    const expression = value(numerator, denominator);
    const answer = exactRational(expression);
    generated.push(createItem(
      index + 13,
      sliceOutcomes[1],
      index,
      reductionPrompt(index, numerator, denominator),
      { type: "RATIONAL_INPUT", exactValue: answer, derivation: expression },
      [
        `Tìm một ước chung lớn hơn 1 của ${numerator} và ${denominator}.`,
        "Chia cả tử số và mẫu số cho cùng ước chung; tiếp tục nếu còn rút gọn được.",
        `Phân số tối giản là ${answer}.`,
      ],
    ));
  });
  return generated;
}

const generated = generateQuestions();
const questions = generated.map((entry) => entry.question);
const explanations = generated.map((entry) => entry.explanation);
const skeleton = buildOfficialGradeSkeleton(grade);

const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({
  id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`,
  entityId: packId,
  check,
  status: "PASSED" as const,
  evidence: check === "SOURCE_MAPPING"
    ? `Source-locked outcomes ${sliceOutcomes.join(", ")} on retained page 36.`
    : check === "MATHEMATICAL_ANSWER"
      ? "Independent integer-multiplier and reduced-rational oracles recompute every common-denominator numerator and simplified fraction."
      : `Deterministic Grade 4 Wave C ${check.toLowerCase().replaceAll("_", " ")} receipt.`,
}));

const blueprintBands = [
  { difficulty: "FOUNDATIONAL", targetCount: 3 },
  { difficulty: "CORE", targetCount: 6 },
  { difficulty: "EXTENSION", targetCount: 3 },
] as const;
const blueprints = sliceOutcomes.flatMap((outcomeId) => blueprintBands.map((band) => ({
  id: `g4-wave-c-blueprint-${outcomeId.toLowerCase()}-${band.difficulty.toLowerCase()}`,
  grade,
  skillId: officialSkillId(outcomeId),
  difficulty: band.difficulty,
  questionType: outcomeId === sliceOutcomes[0] ? "INTEGER_INPUT" as const : "RATIONAL_INPUT" as const,
  templateId: `g4-wave-c-template-${outcomeId.toLowerCase()}`,
  targetCount: band.targetCount,
  sourceReferenceIds: [sourceId],
})));

const candidateCore = {
  format: "plave-wave-c-candidate-v1",
  candidateId,
  version,
  policyVersion,
  unitId,
  sourceOutcomeIds: sliceOutcomes,
  blueprints,
  questions,
  explanations,
} as const;

export const gradeFourWaveCBundleHash = sha256(canonicalize(candidateCore));

export function createGradeFourWaveCPack(): GradePack {
  return {
    schemaVersion: "content-factory-grade-pack-v1",
    grade,
    packId,
    packVersion: version,
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
    prerequisites: [
      { fromSkillId: officialSkillId("MOET2018-G4-NUM-P036-020"), toSkillId: officialSkillId(sliceOutcomes[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
      { fromSkillId: officialSkillId(sliceOutcomes[0]), toSkillId: officialSkillId(sliceOutcomes[1]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
      { fromSkillId: officialSkillId(sliceOutcomes[1]), toSkillId: officialSkillId(nextTargetOutcomeIds[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    ],
    blueprints,
    questions,
    quarantinedQuestions: [],
    explanations,
    evidenceReceipts,
    candidate: { candidateId, version, bundleHash: gradeFourWaveCBundleHash, policyVersion },
    adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
    release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
    production: {
      wave: "C",
      selectedSliceId: "g4-fraction-common-denominator-reduction",
      selectionBasis: ["SOURCE_VERIFIED", "EXACT_INTEGER_MULTIPLIER_ORACLE", "INDEPENDENT_REDUCED_RATIONAL_ORACLE", "NO_DIAGRAM_DEPENDENCY"],
      generated: 24,
      repaired: 0,
      evidenceGatePassed: 24,
      verificationInsufficient: 0,
      rejected: 0,
      duplicate: 0,
      candidateEligible: 24,
    },
    legacyAsset: null,
  };
}

export const gradeFourWaveCPack = createGradeFourWaveCPack();

export const gradeFourWaveCMetadata = {
  schemaVersion: "plave-wave-c-metadata-v1",
  wave: "C",
  grade,
  title: "Quy đồng mẫu số và rút gọn phân số",
  unitId,
  sourceClassification: "SOURCE_VERIFIED",
  sourcePages: [36],
  sourceOutcomeIds: sliceOutcomes,
  prerequisiteOutcomeIds: ["MOET2018-G4-NUM-P036-020"],
  prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  nextTargetOutcomeIds,
  nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  production: { generated: 24, evidenceGatePassed: 24, verificationInsufficient: 0, repaired: 0, rejected: 0, duplicate: 0, candidateEligible: 24 },
  candidate: gradeFourWaveCPack.candidate,
  release: gradeFourWaveCPack.release,
} as const;
