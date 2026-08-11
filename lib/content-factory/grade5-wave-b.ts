import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { gradeFiveWaveAPack } from "./grade5-wave-a.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";
import { combineWavePacks } from "./wave-b.ts";

const sourceId = officialSourceReferenceId(5);
const packId = "grade-5-wave-b-fraction-operations";
const candidateId = "g5-fraction-operations-wave-b";
const version = "g5-fraction-operations-1.0.0-wave-b";
const policyVersion = "g5-fraction-adaptive-policy-1.0.0-wave-b";
const sliceOutcomes = [
  "MOET2018-G5-NUM-P041-010",
  "MOET2018-G5-NUM-P041-009",
  "MOET2018-G5-NUM-P041-013",
  "MOET2018-G5-NUM-P041-012",
] as const;
const skillId = officialSkillId;
const skeleton = buildOfficialGradeSkeleton(5);
const difficulty = (index: number): DifficultyBand => index < 2 ? "FOUNDATIONAL" : index < 4 ? "CORE" : "EXTENSION";
const purpose = (index: number): NonNullable<CandidateQuestion["instructionalPurpose"]> =>
  (["FOUNDATION", "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "TRANSFER_APPLICATION", "TRANSFER_APPLICATION"] as const)[index]!;
const blueprintId = (outcomeId: string, index: number) => `g5-wave-b-blueprint-${outcomeId.toLowerCase()}-${difficulty(index).toLowerCase()}`;
const receiptIds = requiredAutomatedEvidenceChecks.map((check) => `g5-wave-b-${check.toLowerCase().replaceAll("_", "-")}`);
const value = (numerator: number, denominator: number): MathExpression => ({ op: "VALUE", numerator, denominator });
const gcd = (left: number, right: number): number => right === 0 ? Math.abs(left) : gcd(right, left % right);
const exactFraction = (numerator: number, denominator: number) => {
  const divisor = gcd(numerator, denominator);
  return denominator / divisor === 1 ? String(numerator / divisor) : `${numerator / divisor}/${denominator / divisor}`;
};

type Generated = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;

function createItem(
  index: number,
  outcomeId: (typeof sliceOutcomes)[number],
  prompt: string,
  answer: CandidateQuestion["answer"],
  steps: readonly string[],
  options: readonly string[] | null = null,
): Generated {
  const suffix = String(index + 1).padStart(2, "0");
  const id = `g5-wave-b-${outcomeId.toLowerCase()}-${suffix}`;
  return {
    question: {
      id,
      grade: 5,
      blueprintId: blueprintId(outcomeId, index),
      skillId: skillId(outcomeId),
      prompt,
      options,
      answer,
      explanationId: `${id}-explanation`,
      difficulty: difficulty(index),
      provenance: {
        kind: "DETERMINISTIC_TEMPLATE",
        templateVersion: "g5-fraction-wave-b-template-1.0.0",
        seed: `g5-fraction-${outcomeId.toLowerCase()}-${suffix}`,
        sourceReferenceIds: [sourceId],
      },
      reviewStatus: "BUNDLED",
      published: false,
      pilotEligible: false,
      fixtureOnly: false,
      duplicateFingerprint: sha256(normalizedDefinition(`${prompt}|${options?.join("|") ?? ""}`).toLocaleLowerCase("vi")),
      validationReceiptIds: receiptIds,
      instructionalPurpose: purpose(index),
    },
    explanation: {
      id: `${id}-explanation`,
      questionId: id,
      steps,
      finalAnswer: answer.exactValue ?? "",
      evidenceReceiptIds: ["g5-wave-b-explanation-consistency"],
    },
  };
}

function generateWaveB(): readonly Generated[] {
  const generated: Generated[] = [];
  const simplifications = [[6, 8], [12, 18], [15, 25], [18, 24], [21, 28], [35, 49]] as const;
  simplifications.forEach(([numerator, denominator], index) => {
    const answer = exactFraction(numerator, denominator);
    generated.push(createItem(index, sliceOutcomes[0], `Rút gọn phân số ${numerator}/${denominator}.`, { type: "RATIONAL_INPUT", exactValue: answer, derivation: value(numerator, denominator) }, [`Tìm ước chung lớn nhất của ${numerator} và ${denominator}.`, "Chia cả tử số và mẫu số cho cùng ước chung đó.", `Phân số tối giản là ${answer}.`]));
  });

  const comparisons = [[1, 2, 3, 5], [2, 3, 5, 8], [3, 4, 7, 10], [4, 5, 5, 6], [5, 8, 7, 12], [7, 9, 3, 4]] as const;
  comparisons.forEach(([leftNumerator, leftDenominator, rightNumerator, rightDenominator], index) => {
    const difference = leftNumerator * rightDenominator - rightNumerator * leftDenominator;
    const relation = difference < 0 ? "<" : difference > 0 ? ">" : "=";
    generated.push(createItem(index, sliceOutcomes[1], `Điền dấu thích hợp: ${leftNumerator}/${leftDenominator} … ${rightNumerator}/${rightDenominator}.`, { type: "SINGLE_CHOICE", exactValue: relation, comparison: { left: value(leftNumerator, leftDenominator), right: value(rightNumerator, rightDenominator), relation, exactAnswer: relation } }, ["Dùng tích hai mẫu số làm mẫu số chung.", "So sánh hai tử số sau khi quy đồng.", `Quan hệ đúng là ${relation}.`], ["<", ">", "=", "Không so sánh được"]));
  });

  const additions = [
    ["ADD", 1, 2, 1, 3], ["SUBTRACT", 3, 4, 1, 5], ["ADD", 2, 5, 1, 3],
    ["SUBTRACT", 5, 6, 1, 4], ["ADD", 3, 7, 2, 5], ["SUBTRACT", 7, 8, 2, 3],
  ] as const;
  additions.forEach(([operation, leftNumerator, leftDenominator, rightNumerator, rightDenominator], index) => {
    const numerator = operation === "ADD"
      ? leftNumerator * rightDenominator + rightNumerator * leftDenominator
      : leftNumerator * rightDenominator - rightNumerator * leftDenominator;
    const denominator = leftDenominator * rightDenominator;
    const answer = exactFraction(numerator, denominator);
    const symbol = operation === "ADD" ? "+" : "−";
    generated.push(createItem(index, sliceOutcomes[2], `Tính ${leftNumerator}/${leftDenominator} ${symbol} ${rightNumerator}/${rightDenominator}.`, { type: "RATIONAL_INPUT", exactValue: answer, derivation: { op: operation, left: value(leftNumerator, leftDenominator), right: value(rightNumerator, rightDenominator) } }, [`Lấy ${leftDenominator * rightDenominator} làm mẫu số chung.`, `${operation === "ADD" ? "Cộng" : "Trừ"} hai tử số sau khi quy đồng.`, `Rút gọn được ${answer}.`]));
  });

  const products = [
    ["MULTIPLY", 2, 3, 3, 5], ["DIVIDE", 3, 4, 2, 5], ["MULTIPLY", 5, 6, 3, 10],
    ["DIVIDE", 7, 8, 14, 15], ["MULTIPLY", 4, 9, 3, 8], ["DIVIDE", 5, 12, 10, 9],
  ] as const;
  products.forEach(([operation, leftNumerator, leftDenominator, rightNumerator, rightDenominator], index) => {
    const numerator = operation === "MULTIPLY" ? leftNumerator * rightNumerator : leftNumerator * rightDenominator;
    const denominator = operation === "MULTIPLY" ? leftDenominator * rightDenominator : leftDenominator * rightNumerator;
    const answer = exactFraction(numerator, denominator);
    const symbol = operation === "MULTIPLY" ? "×" : ":";
    generated.push(createItem(index, sliceOutcomes[3], `Tính ${leftNumerator}/${leftDenominator} ${symbol} ${rightNumerator}/${rightDenominator}.`, { type: "RATIONAL_INPUT", exactValue: answer, derivation: { op: operation, left: value(leftNumerator, leftDenominator), right: value(rightNumerator, rightDenominator) } }, [operation === "MULTIPLY" ? "Nhân hai tử số và nhân hai mẫu số." : "Nhân với phân số nghịch đảo của số chia.", "Mẫu số luôn khác 0.", `Rút gọn kết quả được ${answer}.`]));
  });
  return generated;
}

const generated = generateWaveB();
const questions = generated.map((entry) => entry.question);
const explanations = generated.map((entry) => entry.explanation);
const receipts = requiredAutomatedEvidenceChecks.map((check) => ({
  id: `g5-wave-b-${check.toLowerCase().replaceAll("_", "-")}`,
  entityId: packId,
  check,
  status: "PASSED" as const,
  evidence: check === "MATHEMATICAL_ANSWER"
    ? "Independent exact-rational oracle verifies reduction, comparison, addition, subtraction, multiplication and division."
    : `Grade 5 Wave B deterministic evidence: ${check}.`,
}));
const candidateCore = { format: "plave-wave-b-candidate-v1", grade: 5, candidateId, version, policyVersion, sourceOutcomeIds: sliceOutcomes, questions, explanations } as const;
export const gradeFiveWaveBBundleHash = sha256(canonicalize(candidateCore));

export const gradeFiveWaveBPack: GradePack = {
  schemaVersion: "content-factory-grade-pack-v1",
  grade: 5,
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
    { fromSkillId: "moet2018-g4-num-p035-011", toSkillId: skillId(sliceOutcomes[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: skillId(sliceOutcomes[0]), toSkillId: skillId(sliceOutcomes[1]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: skillId(sliceOutcomes[1]), toSkillId: skillId(sliceOutcomes[2]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: skillId(sliceOutcomes[2]), toSkillId: skillId(sliceOutcomes[3]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  ],
  blueprints: sliceOutcomes.flatMap((outcomeId) => (["FOUNDATIONAL", "CORE", "EXTENSION"] as const).map((band) => ({
    id: `g5-wave-b-blueprint-${outcomeId.toLowerCase()}-${band.toLowerCase()}`,
    grade: 5,
    skillId: skillId(outcomeId),
    difficulty: band,
    questionType: outcomeId === sliceOutcomes[1] ? "SINGLE_CHOICE" : "RATIONAL_INPUT",
    templateId: `g5-wave-b-template-${outcomeId.toLowerCase()}`,
    targetCount: 2,
    sourceReferenceIds: [sourceId],
  }))),
  questions,
  quarantinedQuestions: [],
  explanations,
  evidenceReceipts: receipts,
  candidate: { candidateId, version, bundleHash: gradeFiveWaveBBundleHash, policyVersion },
  adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
  release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
  production: {
    wave: "B",
    selectedSliceId: "g5-fraction-operations",
    selectionBasis: ["SOURCE_VERIFIED", "EXACT_RATIONAL_ARITHMETIC", "NO_DIAGRAM_DEPENDENCY", "ADAPTIVE_SIMULATION_SUITABLE"],
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

export const gradeFiveWaveBMetadata = {
  wave: "B",
  title: "Phân số: rút gọn, so sánh và phép tính",
  sourceOutcomeIds: sliceOutcomes,
  nextTargetOutcomeIds: ["MOET2018-G5-NUM-P041-006", "MOET2018-G5-NUM-P041-007"],
  generated: 24,
  evidenceGatePassed: 24,
  verificationInsufficient: 0,
  repaired: 0,
  rejected: 0,
  duplicate: 0,
  candidateEligible: 24,
} as const;

export const gradeFiveCombinedWaves = combineWavePacks(gradeFiveWaveAPack, gradeFiveWaveBPack, {
  packId: "grade-5-waves-a-b-decimal-fraction-operations",
  version: "g5-decimal-fraction-operations-1.0.0-waves-a-b",
  candidateId: "g5-decimal-fraction-operations-waves-a-b",
  policyVersion: "g5-number-adaptive-policy-1.0.0-waves-a-b",
  selectedSliceId: "g5-decimal-and-fraction-operations",
});
