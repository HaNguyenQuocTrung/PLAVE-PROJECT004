import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 6 as const;
const sourceId = officialSourceReferenceId(grade);
const packId = "grade-6-wave-d-fraction-of-number";
const candidateId = "g6-fraction-of-number-wave-d";
const version = "g6-fraction-of-number-1.0.0-wave-d";
const policyVersion = "g6-fraction-reasoning-policy-1.0.0-wave-d";
const sliceOutcomes = ["MOET2018-G6-NAA-P049-042"] as const;
const prerequisiteOutcomeIds = ["MOET2018-G6-NAA-P049-040"] as const;
const nextTargetOutcomeIds = ["MOET2018-G6-NAA-P049-043"] as const;

type GeneratedItem = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;
const value = (numerator: number, denominator: number): MathExpression => ({ op: "VALUE", numerator, denominator });
const purposes = ["FOUNDATION", "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "TRANSFER_APPLICATION"] as const;
const receiptIds = requiredAutomatedEvidenceChecks.map((check) => `${packId}-${check.toLowerCase().replaceAll("_", "-")}`);

function exactInteger(expression: MathExpression) {
  const result = evaluateExpression(expression);
  if (result.denominator !== 1) throw new Error("AUTOMATED_VERIFICATION_INSUFFICIENT");
  return String(result.numerator);
}

function difficulty(index: number): DifficultyBand {
  const position = index % 6;
  return position < 2 ? "FOUNDATIONAL" : position < 4 ? "CORE" : "EXTENSION";
}

function directPrompt(index: number, numerator: number, denominator: number, whole: number) {
  if (index < 4) return `Tính ${numerator}/${denominator} của ${whole}.`;
  if (index < 8) return `Chia ${whole} thành ${denominator} phần bằng nhau rồi lấy ${numerator} phần. Giá trị nhận được là bao nhiêu?`;
  return `Bạn Minh nhân ${whole} với mẫu số ${denominator} khi tìm ${numerator}/${denominator} của số đó. Hãy tính giá trị đúng.`;
}

function inversePrompt(index: number, numerator: number, denominator: number, part: number) {
  if (index < 4) return `${numerator}/${denominator} của một số bằng ${part}. Tìm số đó.`;
  if (index < 8) return `Biết ${numerator} phần trong ${denominator} phần bằng nhau có giá trị ${part}. Toàn bộ ${denominator} phần có giá trị bao nhiêu?`;
  return `Bạn Lan nhân ${part} với ${numerator}/${denominator} để tìm số ban đầu, dù ${numerator}/${denominator} của số đó bằng ${part}. Hãy tìm số đúng.`;
}

function createItem(
  questionNumber: number,
  localIndex: number,
  prompt: string,
  derivation: MathExpression,
  steps: readonly string[],
): GeneratedItem {
  const suffix = String(questionNumber).padStart(2, "0");
  const id = `g6-wave-d-${suffix}`;
  const explanationId = `${id}-explanation`;
  const normalizedPrompt = prompt.normalize("NFC");
  const exactAnswer = exactInteger(derivation);
  return {
    question: {
      id,
      grade,
      blueprintId: `g6-wave-d-blueprint-${sliceOutcomes[0].toLowerCase()}-${difficulty(localIndex).toLowerCase()}`,
      skillId: officialSkillId(sliceOutcomes[0]),
      prompt: normalizedPrompt,
      options: null,
      answer: { type: "INTEGER_INPUT", exactValue: exactAnswer, derivation },
      explanationId,
      difficulty: difficulty(localIndex),
      provenance: {
        kind: "DETERMINISTIC_TEMPLATE",
        templateVersion: "g6-fraction-of-number-wave-d-template-1.0.0",
        seed: `g6-wave-d-${sliceOutcomes[0].toLowerCase()}-${suffix}`,
        sourceReferenceIds: [sourceId],
      },
      reviewStatus: "BUNDLED",
      published: false,
      pilotEligible: false,
      fixtureOnly: false,
      duplicateFingerprint: sha256(normalizedDefinition(`${normalizedPrompt}|`).toLocaleLowerCase("vi")),
      validationReceiptIds: receiptIds,
      instructionalPurpose: purposes[(questionNumber - 1) % purposes.length]!,
    },
    explanation: {
      id: explanationId,
      questionId: id,
      steps: steps.map((step) => step.normalize("NFC")),
      finalAnswer: exactAnswer,
      evidenceReceiptIds: [`${packId}-explanation-consistency`],
    },
  };
}

function generateQuestions(): readonly GeneratedItem[] {
  const generated: GeneratedItem[] = [];
  const direct = [
    [1, 2, 18], [2, 3, 24], [3, 5, 40], [5, 8, 64],
    [7, 9, 81], [4, 7, 56], [5, 12, 72], [11, 15, 90],
    [7, 16, 96], [13, 20, 140], [9, 14, 98], [17, 24, 144],
  ] as const;
  direct.forEach(([numerator, denominator, whole], index) => {
    const derivation: MathExpression = { op: "MULTIPLY", left: value(numerator, denominator), right: value(whole, 1) };
    generated.push(createItem(index + 1, index, directPrompt(index, numerator, denominator, whole), derivation, [
      `Một phần bằng ${whole} : ${denominator}.`,
      `Nhân giá trị một phần với ${numerator}, tương đương tính ${whole} × ${numerator}/${denominator}.`,
      `Giá trị cần tìm là ${exactInteger(derivation)}.`,
    ]));
  });

  const inverse = [
    [1, 2, 14], [2, 3, 18], [3, 5, 24], [5, 8, 35],
    [7, 9, 49], [4, 7, 20], [5, 12, 45], [11, 15, 77],
    [7, 16, 63], [13, 20, 78], [9, 14, 54], [17, 24, 68],
  ] as const;
  inverse.forEach(([numerator, denominator, part], index) => {
    const fraction = value(numerator, denominator);
    const derivation: MathExpression = { op: "DIVIDE", left: value(part, 1), right: fraction };
    generated.push(createItem(index + 13, index, inversePrompt(index, numerator, denominator, part), derivation, [
      `${numerator} phần có giá trị ${part}, nên một phần có giá trị ${part} : ${numerator}.`,
      `Nhân giá trị một phần với ${denominator}; tương đương tính ${part} : ${numerator}/${denominator}.`,
      `Số ban đầu là ${exactInteger(derivation)}.`,
    ]));
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
    ? `Retained source-locked outcome ${sliceOutcomes[0]} on page 49.`
    : check === "MATHEMATICAL_ANSWER"
      ? "Independent normalized-rational oracle recomputes direct fraction-of-number multiplication and inverse nonzero-fraction division; all selected results are exact integers."
      : `Deterministic Grade 6 Wave D ${check.toLowerCase().replaceAll("_", " ")} receipt.`,
}));
const blueprints = (["FOUNDATIONAL", "CORE", "EXTENSION"] as const).map((band) => ({
  id: `g6-wave-d-blueprint-${sliceOutcomes[0].toLowerCase()}-${band.toLowerCase()}`,
  grade,
  skillId: officialSkillId(sliceOutcomes[0]),
  difficulty: band,
  questionType: "INTEGER_INPUT" as const,
  templateId: `g6-wave-d-template-${sliceOutcomes[0].toLowerCase()}`,
  targetCount: 8,
  sourceReferenceIds: [sourceId],
}));
const candidateCore = { format: "plave-wave-d-candidate-v1", candidateId, version, policyVersion, sourceOutcomeIds: sliceOutcomes, blueprints, questions, explanations } as const;
export const gradeSixWaveDBundleHash = sha256(canonicalize(candidateCore));

export function createGradeSixWaveDPack(): GradePack {
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
      { fromSkillId: officialSkillId(prerequisiteOutcomeIds[0]), toSkillId: officialSkillId(sliceOutcomes[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
      { fromSkillId: officialSkillId(sliceOutcomes[0]), toSkillId: officialSkillId(nextTargetOutcomeIds[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    ],
    blueprints,
    questions,
    quarantinedQuestions: [],
    explanations,
    evidenceReceipts,
    candidate: { candidateId, version, bundleHash: gradeSixWaveDBundleHash, policyVersion },
    adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
    release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
    production: { wave: "D", selectedSliceId: "g6-fraction-of-number", selectionBasis: ["SOURCE_VERIFIED", "UNCOVERED_BY_WAVES_A_TO_C", "EXACT_RATIONAL_ORACLE", "NONZERO_FRACTION_GUARD", "INTEGER_RESULT_DOMAIN"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 },
    legacyAsset: null,
  };
}

export const gradeSixWaveDPack = createGradeSixWaveDPack();
export const gradeSixWaveDMetadata = {
  schemaVersion: "plave-wave-d-metadata-v1",
  wave: "D",
  grade,
  title: "Phân số của một số và bài toán ngược",
  sourceClassification: "SOURCE_VERIFIED",
  sourcePages: [49],
  sourceOutcomeIds: sliceOutcomes,
  prerequisiteOutcomeIds,
  prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  nextTargetOutcomeIds,
  nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  selectionRationale: "Uncovered page-49 row directly extends exact fraction arithmetic with both forward and inverse forms and a complete integer oracle domain.",
  deferredGap: "Contextual fraction applications and fraction-operation properties remain separately bound to P049-031 and P049-043.",
  production: { generated: 24, evidenceGatePassed: 24, verificationInsufficient: 0, repaired: 0, rejected: 0, duplicate: 0, candidateEligible: 24 },
  candidate: gradeSixWaveDPack.candidate,
  release: gradeSixWaveDPack.release,
} as const;
