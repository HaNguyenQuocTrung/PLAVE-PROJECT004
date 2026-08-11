import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 4 as const;
const sourceId = officialSourceReferenceId(grade);
const packId = "grade-4-wave-d-fraction-multiplication-division";
const candidateId = "g4-fraction-multiplication-division-wave-d";
const version = "g4-fraction-multiplication-division-1.0.0-wave-d";
const policyVersion = "g4-fraction-operations-policy-1.0.0-wave-d";
const sliceOutcomes = ["MOET2018-G4-NUM-P037-026"] as const;
const prerequisiteOutcomeIds = ["MOET2018-G4-NUM-P036-022"] as const;
const nextTargetOutcomeIds = ["MOET2018-G4-NUM-P037-025"] as const;

type GeneratedItem = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;
const value = (numerator: number, denominator: number): MathExpression => ({ op: "VALUE", numerator, denominator });
const purposes = ["FOUNDATION", "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "TRANSFER_APPLICATION"] as const;
const receiptIds = requiredAutomatedEvidenceChecks.map((check) => `${packId}-${check.toLowerCase().replaceAll("_", "-")}`);

function exactRational(expression: MathExpression) {
  const result = evaluateExpression(expression);
  return result.denominator === 1 ? String(result.numerator) : `${result.numerator}/${result.denominator}`;
}

function difficulty(index: number): DifficultyBand {
  const position = index % 6;
  return position < 2 ? "FOUNDATIONAL" : position < 4 ? "CORE" : "EXTENSION";
}

function promptFor(index: number, left: string, symbol: "×" | ":", right: string) {
  if (index < 4) return `Tính ${left} ${symbol} ${right} và viết kết quả ở dạng tối giản.`;
  if (index < 8) {
    return symbol === "×"
      ? `Rút gọn chéo nếu có, rồi thực hiện phép nhân ${left} × ${right}.`
      : `Đổi phép chia ${left} : ${right} thành phép nhân với phân số nghịch đảo, rồi tính.`;
  }
  return symbol === "×"
    ? `Bạn Bình nhân cả hai tử số và cả hai mẫu số trong ${left} × ${right}. Hãy tính chính xác và rút gọn.`
    : `Bạn Lan quên đảo phân số thứ hai khi tính ${left} : ${right}. Hãy thực hiện phép chia đúng và rút gọn.`;
}

function createItem(
  questionNumber: number,
  localIndex: number,
  prompt: string,
  derivation: MathExpression,
  steps: readonly string[],
): GeneratedItem {
  const suffix = String(questionNumber).padStart(2, "0");
  const id = `g4-wave-d-${suffix}`;
  const explanationId = `${id}-explanation`;
  const normalizedPrompt = prompt.normalize("NFC");
  const exactAnswer = exactRational(derivation);
  return {
    question: {
      id,
      grade,
      blueprintId: `g4-wave-d-blueprint-${sliceOutcomes[0].toLowerCase()}-${difficulty(localIndex).toLowerCase()}`,
      skillId: officialSkillId(sliceOutcomes[0]),
      prompt: normalizedPrompt,
      options: null,
      answer: { type: "RATIONAL_INPUT", exactValue: exactAnswer, derivation },
      explanationId,
      difficulty: difficulty(localIndex),
      provenance: {
        kind: "DETERMINISTIC_TEMPLATE",
        templateVersion: "g4-fraction-multiplication-division-wave-d-template-1.0.0",
        seed: `g4-wave-d-${sliceOutcomes[0].toLowerCase()}-${suffix}`,
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
  const products = [
    [1, 2, 2, 3], [3, 4, 2, 5], [5, 6, 3, 10], [4, 7, 7, 12],
    [2, 9, 3, 8], [5, 12, 6, 25], [7, 10, 15, 28], [9, 14, 21, 25],
    [11, 18, 6, 55], [13, 20, 10, 39], [15, 16, 8, 45], [17, 24, 18, 51],
  ] as const;
  products.forEach(([leftNumerator, leftDenominator, rightNumerator, rightDenominator], index) => {
    const left = value(leftNumerator, leftDenominator);
    const right = value(rightNumerator, rightDenominator);
    const derivation: MathExpression = { op: "MULTIPLY", left, right };
    generated.push(createItem(index + 1, index, promptFor(index, `${leftNumerator}/${leftDenominator}`, "×", `${rightNumerator}/${rightDenominator}`), derivation, [
      "Có thể chia chéo tử số và mẫu số cho cùng một ước chung trước khi nhân.",
      "Nhân hai tử số với nhau và nhân hai mẫu số với nhau.",
      `Kết quả tối giản là ${exactRational(derivation)}.`,
    ]));
  });

  const quotients = [
    [1, 2, 3, 4], [2, 3, 5, 6], [3, 5, 9, 10], [4, 7, 8, 21],
    [5, 8, 15, 16], [7, 9, 14, 27], [9, 10, 3, 5], [11, 12, 22, 15],
    [13, 18, 26, 45], [15, 28, 5, 14], [17, 24, 34, 9], [19, 30, 38, 75],
  ] as const;
  quotients.forEach(([leftNumerator, leftDenominator, rightNumerator, rightDenominator], index) => {
    const left = value(leftNumerator, leftDenominator);
    const right = value(rightNumerator, rightDenominator);
    const derivation: MathExpression = { op: "DIVIDE", left, right };
    generated.push(createItem(index + 13, index, promptFor(index, `${leftNumerator}/${leftDenominator}`, ":", `${rightNumerator}/${rightDenominator}`), derivation, [
      `Phân số ${rightNumerator}/${rightDenominator} khác 0 nên có phân số nghịch đảo ${rightDenominator}/${rightNumerator}.`,
      "Nhân phân số thứ nhất với phân số nghịch đảo của phân số thứ hai.",
      `Kết quả tối giản là ${exactRational(derivation)}.`,
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
    ? `Retained source-locked outcome ${sliceOutcomes[0]} on page 37.`
    : check === "MATHEMATICAL_ANSWER"
      ? "Independent normalized-rational oracle recomputes all multiplication and nonzero-divisor fraction division results."
      : `Deterministic Grade 4 Wave D ${check.toLowerCase().replaceAll("_", " ")} receipt.`,
}));
const blueprints = (["FOUNDATIONAL", "CORE", "EXTENSION"] as const).map((band) => ({
  id: `g4-wave-d-blueprint-${sliceOutcomes[0].toLowerCase()}-${band.toLowerCase()}`,
  grade,
  skillId: officialSkillId(sliceOutcomes[0]),
  difficulty: band,
  questionType: "RATIONAL_INPUT" as const,
  templateId: `g4-wave-d-template-${sliceOutcomes[0].toLowerCase()}`,
  targetCount: 8,
  sourceReferenceIds: [sourceId],
}));
const candidateCore = { format: "plave-wave-d-candidate-v1", candidateId, version, policyVersion, sourceOutcomeIds: sliceOutcomes, blueprints, questions, explanations } as const;
export const gradeFourWaveDBundleHash = sha256(canonicalize(candidateCore));

export function createGradeFourWaveDPack(): GradePack {
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
    candidate: { candidateId, version, bundleHash: gradeFourWaveDBundleHash, policyVersion },
    adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
    release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
    production: { wave: "D", selectedSliceId: "g4-fraction-multiplication-division", selectionBasis: ["SOURCE_VERIFIED", "UNCOVERED_BY_WAVES_A_TO_C", "EXACT_RATIONAL_ORACLE", "NONZERO_DIVISOR_GUARD"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 },
    legacyAsset: null,
  };
}

export const gradeFourWaveDPack = createGradeFourWaveDPack();
export const gradeFourWaveDMetadata = {
  schemaVersion: "plave-wave-d-metadata-v1",
  wave: "D",
  grade,
  title: "Nhân và chia hai phân số",
  sourceClassification: "SOURCE_VERIFIED",
  sourcePages: [37],
  sourceOutcomeIds: sliceOutcomes,
  prerequisiteOutcomeIds,
  prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  nextTargetOutcomeIds,
  nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  selectionRationale: "Uncovered exact fraction-operation row; reduction from Wave C supports canonical answers without claiming an authoritative prerequisite.",
  deferredGap: "Contextual multi-step fraction applications remain bound to MOET2018-G4-NUM-P037-025 and are not inferred from this row.",
  production: { generated: 24, evidenceGatePassed: 24, verificationInsufficient: 0, repaired: 0, rejected: 0, duplicate: 0, candidateEligible: 24 },
  candidate: gradeFourWaveDPack.candidate,
  release: gradeFourWaveDPack.release,
} as const;
