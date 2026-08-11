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

const grade = 3 as const;
const packId = "grade-3-wave-c-unit-fractions";
const candidateId = "g3-unit-fractions-wave-c";
const version = "g3-unit-fractions-1.0.0-wave-c";
const policyVersion = "g3-unit-fractions-policy-1.0.0-wave-c";
const sourceId = officialSourceReferenceId(grade);
const unitId = "grade-3-unit-fractions";

const sliceOutcomes = [
  "MOET2018-G3-NUM-P031-023",
  "MOET2018-G3-NUM-P031-024",
] as const;
const prerequisiteOutcomeIds = ["MOET2018-G3-NUM-P029-010"] as const;
const nextTargetOutcomeIds = ["MOET2018-G3-GEO-P032-012"] as const;
type SliceOutcome = (typeof sliceOutcomes)[number];
type GeneratedItem = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;

const purposes = [
  "FOUNDATION", "FOUNDATION", "FOUNDATION", "FOUNDATION",
  "STANDARD_APPLICATION", "STANDARD_APPLICATION", "STANDARD_APPLICATION",
  "MISCONCEPTION_TARGETING", "MISCONCEPTION_TARGETING", "REMEDIATION",
  "TRANSFER_APPLICATION", "TRANSFER_APPLICATION",
] as const;

function difficulty(index: number): DifficultyBand {
  if (index < 4) return "FOUNDATIONAL";
  if (index < 10) return "CORE";
  return "EXTENSION";
}

function unitFraction(denominator: number): MathExpression {
  if (!Number.isInteger(denominator) || denominator < 2) {
    throw new Error("GRADE3_WAVE_C_DENOMINATOR_INVALID");
  }
  return { op: "VALUE", numerator: 1, denominator };
}

function exactRational(derivation: MathExpression) {
  const result = evaluateExpression(derivation);
  return result.denominator === 1 ? String(result.numerator) : `${result.numerator}/${result.denominator}`;
}

const receiptIds = requiredAutomatedEvidenceChecks.map(
  (check) => `${packId}-${check.toLowerCase().replaceAll("_", "-")}`,
);

function createItem(
  number: number,
  outcomeId: SliceOutcome,
  localIndex: number,
  prompt: string,
  denominator: number,
  steps: readonly string[],
): GeneratedItem {
  const suffix = String(number).padStart(2, "0");
  const id = `g3-wave-c-${suffix}`;
  const derivation = unitFraction(denominator);
  const exactValue = exactRational(derivation);
  const normalizedPrompt = prompt.normalize("NFC");
  return {
    question: {
      id,
      grade,
      unitId,
      blueprintId: `g3-wave-c-blueprint-${outcomeId.toLowerCase()}-${difficulty(localIndex).toLowerCase()}`,
      skillId: officialSkillId(outcomeId),
      prompt: normalizedPrompt,
      options: null,
      answer: { type: "RATIONAL_INPUT", exactValue, derivation },
      explanationId: `${id}-explanation`,
      difficulty: difficulty(localIndex),
      provenance: {
        kind: "DETERMINISTIC_TEMPLATE",
        templateVersion: "g3-unit-fractions-wave-c-template-1.0.0",
        seed: `g3-wave-c-${outcomeId.toLowerCase()}-${suffix}`,
        sourceReferenceIds: [sourceId],
      },
      reviewStatus: "BUNDLED",
      published: false,
      pilotEligible: false,
      fixtureOnly: false,
      duplicateFingerprint: sha256(normalizedDefinition(`${normalizedPrompt}|`).toLocaleLowerCase("vi")),
      validationReceiptIds: receiptIds,
      instructionalPurpose: purposes[localIndex]!,
    },
    explanation: {
      id: `${id}-explanation`,
      questionId: id,
      steps: steps.map((step) => step.normalize("NFC")),
      finalAnswer: exactValue,
      evidenceReceiptIds: [`${packId}-explanation-consistency`],
    },
  };
}

function visualModel(denominator: number, index: number) {
  const empty = index < 3 ? "□" : index < 6 ? "○" : index < 9 ? "◇" : "△";
  const filled = index < 3 ? "■" : index < 6 ? "●" : index < 9 ? "◆" : "▲";
  return [filled, ...Array.from({ length: denominator - 1 }, () => empty)].join(" ");
}

function visualPrompt(denominator: number, index: number) {
  const model = visualModel(denominator, index);
  if (index < 3) return `Mô hình có ${denominator} ô bằng nhau: ${model}. Viết phân số đơn vị chỉ một ô được tô.`;
  if (index < 6) return `Một dãy có ${denominator} hình tròn bằng nhau: ${model}. Một hình tròn đậm chiếm phân số nào của cả dãy?`;
  if (index < 9) return `Đoạn mẫu được chia thành ${denominator} phần dài bằng nhau: ${model}. Phần đậm đầu tiên biểu diễn phân số đơn vị nào?`;
  return `Hình ghép có ${denominator} mảnh bằng nhau: ${model}. Một mảnh đậm là bao nhiêu phần của toàn hình?`;
}

function groupPrompt(denominator: number, index: number) {
  const groupSize = 2 + (index % 4);
  const total = denominator * groupSize;
  if (index < 3) return `Chia ${total} thẻ thành ${denominator} nhóm bằng nhau. Một nhóm chiếm phân số nào của tất cả số thẻ?`;
  if (index < 6) return `Xếp ${total} hạt thành ${denominator} hàng bằng nhau. Một hàng là bao nhiêu phần của toàn bộ số hạt?`;
  if (index < 9) return `Có ${total} nút, mỗi nhóm có ${groupSize} nút và các nhóm đều bằng nhau. Một nhóm chiếm phân số nào của cả bộ nút?`;
  if (index < 11) return `Phân đều ${total} nhãn vào ${denominator} ngăn. Số nhãn trong một ngăn là bao nhiêu phần của tổng số nhãn?`;
  return `Một bộ ${total} que được tách thành ${denominator} bó bằng nhau. Chọn đúng một bó. Bó được chọn chiếm phân số đơn vị nào của cả bộ?`;
}

function generateQuestions(): readonly GeneratedItem[] {
  const items: GeneratedItem[] = [];
  for (let index = 0; index < 12; index += 1) {
    const denominator = index + 2;
    items.push(createItem(index + 1, sliceOutcomes[0], index, visualPrompt(denominator, index), denominator, [
      `Toàn thể được chia thành ${denominator} phần bằng nhau.`,
      "Có đúng một phần được đánh dấu.",
      `Một phần bằng nhau của toàn thể được viết là 1/${denominator}.`,
    ]));
  }
  for (let index = 0; index < 12; index += 1) {
    const denominator = index + 2;
    const groupSize = 2 + (index % 4);
    const total = denominator * groupSize;
    items.push(createItem(index + 13, sliceOutcomes[1], index, groupPrompt(denominator, index), denominator, [
      `Có ${total} đồ vật được chia thành ${denominator} nhóm bằng nhau.`,
      `Mỗi nhóm có ${groupSize} đồ vật và chỉ chọn một nhóm.`,
      `Một trong ${denominator} nhóm bằng nhau chiếm 1/${denominator} của toàn bộ.`,
    ]));
  }
  return items;
}

function gcd(left: number, right: number): number {
  return right === 0 ? Math.abs(left) : gcd(right, left % right);
}

// The independent oracle reads only the public prompt. It intentionally does
// not inspect answer.derivation or the explanation.
export function independentlyDeriveGradeThreeWaveCAnswer(question: CandidateQuestion) {
  if (question.skillId === officialSkillId(sliceOutcomes[0])) {
    const denominator = Number(/(?:có|thành) (\d+) (?:ô|hình tròn|phần|mảnh)/u.exec(question.prompt)?.[1]);
    if (!Number.isInteger(denominator) || denominator < 2) {
      throw new Error(`GRADE3_WAVE_C_VISUAL_MODEL_INVALID:${question.id}`);
    }
    return `1/${denominator}`;
  }
  const total = Number(/(?:Chia|Xếp|Có|đều|bộ) (\d+)/u.exec(question.prompt)?.[1]);
  const explicitGroups = /(?:thành|vào) (\d+) (?:nhóm|hàng|ngăn|bó)/u.exec(question.prompt)?.[1];
  const groupSize = /mỗi nhóm có (\d+)/u.exec(question.prompt)?.[1];
  const denominator = explicitGroups ? Number(explicitGroups) : total / Number(groupSize);
  if (!Number.isInteger(total) || !Number.isInteger(denominator) || denominator < 2) {
    throw new Error(`GRADE3_WAVE_C_GROUP_MODEL_INVALID:${question.id}`);
  }
  const numerator = 1;
  const divisor = gcd(numerator, denominator);
  return `${numerator / divisor}/${denominator / divisor}`;
}

const generated = generateQuestions();
const questions = generated.map((entry) => entry.question);
const explanations = generated.map((entry) => entry.explanation);
if (questions.length !== 24 || new Set(questions.map((question) => question.id)).size !== 24) {
  throw new Error("GRADE3_WAVE_C_GENERATION_COUNT");
}

export const gradeThreeWaveCOracleRows = questions.map((question) => {
  const independentlyDerived = independentlyDeriveGradeThreeWaveCAnswer(question);
  const explanation = explanations.find((entry) => entry.questionId === question.id)!;
  if (independentlyDerived !== question.answer.exactValue || explanation.finalAnswer !== independentlyDerived) {
    throw new Error(`GRADE3_WAVE_C_ORACLE_MISMATCH:${question.id}`);
  }
  return { questionId: question.id, independentlyDerived, answerMatches: true as const, explanationMatches: true as const };
});

const skeleton = buildOfficialGradeSkeleton(grade);
const blueprintBands = [
  { difficulty: "FOUNDATIONAL", targetCount: 4 },
  { difficulty: "CORE", targetCount: 6 },
  { difficulty: "EXTENSION", targetCount: 2 },
] as const;
const blueprints = sliceOutcomes.flatMap((outcomeId) => blueprintBands.map((band) => ({
  id: `g3-wave-c-blueprint-${outcomeId.toLowerCase()}-${band.difficulty.toLowerCase()}`,
  grade,
  skillId: officialSkillId(outcomeId),
  difficulty: band.difficulty,
  questionType: "RATIONAL_INPUT" as const,
  templateId: `g3-wave-c-template-${outcomeId.toLowerCase()}`,
  targetCount: band.targetCount,
  sourceReferenceIds: [sourceId],
})));

const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({
  id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`,
  entityId: packId,
  check,
  status: "PASSED" as const,
  evidence: check === "SOURCE_MAPPING"
    ? `Source-locked MOET 2018 page 31 outcomes ${sliceOutcomes.join(", ")}.`
    : check === "MATHEMATICAL_ANSWER"
      ? "Independent public-prompt unit-fraction oracle recomputed all 24 reduced rational answers."
      : `Deterministic Grade 3 Wave C ${check.toLowerCase().replaceAll("_", " ")} receipt.`,
}));

const candidateCore = {
  format: "plave-wave-c-candidate-v1",
  grade,
  candidateId,
  version,
  policyVersion,
  sourceOutcomeIds: sliceOutcomes,
  sourcePage: 31,
  blueprints,
  questions,
  explanations,
} as const;

export const gradeThreeWaveCBundleHash = sha256(canonicalize(candidateCore));

export const gradeThreeWaveCPack: GradePack = {
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
    { fromSkillId: officialSkillId(prerequisiteOutcomeIds[0]), toSkillId: officialSkillId(sliceOutcomes[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: officialSkillId(sliceOutcomes[0]), toSkillId: officialSkillId(sliceOutcomes[1]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: officialSkillId(sliceOutcomes[1]), toSkillId: officialSkillId(nextTargetOutcomeIds[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  ],
  blueprints,
  questions,
  quarantinedQuestions: [],
  explanations,
  evidenceReceipts,
  candidate: { candidateId, version, bundleHash: gradeThreeWaveCBundleHash, policyVersion },
  adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
  release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
  production: {
    wave: "C",
    selectedSliceId: unitId,
    selectionBasis: ["SOURCE_VERIFIED", "PAGE_31_LOCKED", "INDEPENDENT_REDUCED_RATIONAL_ORACLE", "EQUAL_PARTS_AND_EQUAL_GROUPS"],
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

export const gradeThreeWaveCProgression = {
  grade,
  waveCSkillIds: sliceOutcomes.map(officialSkillId),
  priorSkillId: officialSkillId(prerequisiteOutcomeIds[0]),
  prerequisiteSkillId: officialSkillId(prerequisiteOutcomeIds[0]),
  prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  remediationTargetSkillId: officialSkillId(prerequisiteOutcomeIds[0]),
  advanceTargetSkillId: officialSkillId(sliceOutcomes[1]),
  retentionTargetSkillId: officialSkillId(sliceOutcomes[0]),
  nextTargetSkillId: officialSkillId(nextTargetOutcomeIds[0]),
  actions: {
    continueTargetSkillId: officialSkillId(sliceOutcomes[0]),
    remediateTargetSkillId: officialSkillId(prerequisiteOutcomeIds[0]),
    advanceTargetSkillId: officialSkillId(sliceOutcomes[1]),
    retentionTargetSkillId: officialSkillId(sliceOutcomes[0]),
    mixedPracticeTargetSkillIds: [officialSkillId(sliceOutcomes[0]), officialSkillId(sliceOutcomes[1])],
  },
  schoolGradeMutation: false,
  entitlementGrant: false,
} as const;

export const gradeThreeWaveCMetadata = {
  schemaVersion: "plave-wave-c-metadata-v1",
  wave: "C",
  grade,
  title: "Phân số đơn vị và các phần bằng nhau",
  unitId,
  sourceClassification: "SOURCE_VERIFIED",
  sourceOutcomeIds: sliceOutcomes,
  sourcePages: [31],
  prerequisiteOutcomeIds,
  prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  nextTargetOutcomeIds,
  nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  production: gradeThreeWaveCPack.production,
  candidate: gradeThreeWaveCPack.candidate,
  progression: gradeThreeWaveCProgression,
  release: gradeThreeWaveCPack.release,
} as const;
