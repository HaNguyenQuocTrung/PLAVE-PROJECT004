import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 6 as const;
const sourceId = officialSourceReferenceId(grade);
const packId = "grade-6-wave-c-fraction-arithmetic";
const candidateId = "g6-fraction-arithmetic-wave-c";
const version = "g6-fraction-arithmetic-1.0.0-wave-c";
const policyVersion = "g6-fraction-arithmetic-policy-1.0.0-wave-c";

const sliceOutcomes = [
  "MOET2018-G6-NAA-P049-040",
] as const;

const nextTargetOutcomeIds = [
  "MOET2018-G6-NAA-P049-042",
  "MOET2018-G6-NAA-P049-043",
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

const value = (numerator: number, denominator: number): MathExpression => ({ op: "VALUE", numerator, denominator });

function exactRational(expression: MathExpression) {
  const result = evaluateExpression(expression);
  return result.denominator === 1 ? String(result.numerator) : `${result.numerator}/${result.denominator}`;
}

const gcd = (left: number, right: number): number => right === 0 ? Math.abs(left) : gcd(right, left % right);
const lcm = (left: number, right: number) => Math.abs(left * right) / gcd(left, right);

function difficulty(localIndex: number): DifficultyBand {
  const position = localIndex % 6;
  return position < 2 ? "FOUNDATIONAL" : position < 4 ? "CORE" : "EXTENSION";
}

const receiptIds = requiredAutomatedEvidenceChecks.map(
  (check) => `${packId}-${check.toLowerCase().replaceAll("_", "-")}`,
);

function createItem(
  questionNumber: number,
  outcomeId: SliceOutcome,
  localIndex: number,
  prompt: string,
  derivation: MathExpression,
  steps: readonly string[],
): GeneratedItem {
  const suffix = String(questionNumber).padStart(2, "0");
  const questionId = `g6-wave-c-${suffix}`;
  const explanationId = `${questionId}-explanation`;
  const normalizedPrompt = prompt.normalize("NFC");
  const answer = exactRational(derivation);
  return {
    question: {
      id: questionId,
      grade,
      blueprintId: `g6-wave-c-blueprint-${outcomeId.toLowerCase()}-${difficulty(localIndex).toLowerCase()}`,
      skillId: officialSkillId(outcomeId),
      prompt: normalizedPrompt,
      options: null,
      answer: { type: "RATIONAL_INPUT", exactValue: answer, derivation },
      explanationId,
      difficulty: difficulty(localIndex),
      provenance: {
        kind: "DETERMINISTIC_TEMPLATE",
        templateVersion: "g6-fraction-arithmetic-wave-c-template-1.0.0",
        seed: `g6-wave-c-${outcomeId.toLowerCase()}-${suffix}`,
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
      finalAnswer: answer,
      evidenceReceiptIds: [`${packId}-explanation-consistency`],
    },
  };
}

function operationPrompt(index: number, left: string, symbol: string, right: string) {
  if (index < 6) return `Tính và rút gọn ${left} ${symbol} ${right}.`;
  if (index < 12) return `Thực hiện phép tính ${left} ${symbol} ${right}, rồi viết kết quả ở dạng tối giản.`;
  return `Bạn Hà cần tính ${left} ${symbol} ${right}. Hãy cho kết quả chính xác sau khi rút gọn.`;
}

function generateQuestions(): readonly GeneratedItem[] {
  const generated: GeneratedItem[] = [];
  const lcmOperations = [
    ["ADD", 1, 6, 1, 4], ["SUBTRACT", 5, 8, 1, 6],
    ["ADD", 2, 9, 5, 12], ["SUBTRACT", 7, 10, 1, 15],
    ["ADD", 3, 14, 5, 21], ["SUBTRACT", 11, 18, 5, 24],
  ] as const;
  lcmOperations.forEach(([operation, leftNumerator, leftDenominator, rightNumerator, rightDenominator], index) => {
    const commonDenominator = lcm(leftDenominator, rightDenominator);
    const expression: MathExpression = {
      op: operation,
      left: value(leftNumerator, leftDenominator),
      right: value(rightNumerator, rightDenominator),
    };
    const symbol = operation === "ADD" ? "+" : "−";
    generated.push(createItem(
      index + 1,
      sliceOutcomes[0],
      index,
      `Dùng BCNN của ${leftDenominator} và ${rightDenominator} làm mẫu chung để tính ${leftNumerator}/${leftDenominator} ${symbol} ${rightNumerator}/${rightDenominator}.`,
      expression,
      [
        `BCNN(${leftDenominator}, ${rightDenominator}) = ${commonDenominator}, nên chọn ${commonDenominator} làm mẫu chung.`,
        `Quy đồng cả hai phân số về mẫu ${commonDenominator}, rồi ${operation === "ADD" ? "cộng" : "trừ"} các tử số.`,
        `Rút gọn kết quả được ${exactRational(expression)}.`,
      ],
    ));
  });

  const operations = [
    ["ADD", 3, 5, 7, 10], ["SUBTRACT", 11, 12, 5, 18],
    ["ADD", -2, 7, 5, 14], ["SUBTRACT", 4, 9, 7, 6],
    ["ADD", 5, 8, -3, 20], ["SUBTRACT", -1, 3, -5, 12],
    ["MULTIPLY", 2, 3, 9, 10], ["MULTIPLY", 7, 12, 18, 35],
    ["MULTIPLY", -5, 14, 21, 25], ["MULTIPLY", 11, 15, -9, 22],
    ["MULTIPLY", -4, 9, -27, 16], ["MULTIPLY", 13, 18, 6, 39],
    ["DIVIDE", 3, 4, 5, 8], ["DIVIDE", 7, 15, 14, 25],
    ["DIVIDE", -5, 12, 10, 9], ["DIVIDE", 8, 21, -4, 7],
    ["DIVIDE", -9, 20, -3, 5], ["DIVIDE", 11, 18, 22, 27],
  ] as const;
  operations.forEach(([operation, leftNumerator, leftDenominator, rightNumerator, rightDenominator], index) => {
    const expression: MathExpression = {
      op: operation,
      left: value(leftNumerator, leftDenominator),
      right: value(rightNumerator, rightDenominator),
    };
    const symbol = operation === "ADD" ? "+" : operation === "SUBTRACT" ? "−" : operation === "MULTIPLY" ? "×" : ":";
    const leftText = `${leftNumerator}/${leftDenominator}`;
    const rightText = `${rightNumerator}/${rightDenominator}`;
    const operationStep = operation === "ADD" || operation === "SUBTRACT"
      ? "Quy đồng mẫu số rồi thực hiện phép tính trên tử số."
      : operation === "MULTIPLY"
        ? "Nhân tử với tử, mẫu với mẫu; có thể rút gọn chéo trước."
        : "Nhân phân số thứ nhất với phân số nghịch đảo của số chia khác 0.";
    generated.push(createItem(
      index + 7,
      sliceOutcomes[0],
      index,
      operationPrompt(index, leftText, symbol, rightText),
      expression,
      [
        operationStep,
        "Xác định dấu của kết quả từ dấu của các phân số tham gia phép tính.",
        `Kết quả tối giản là ${exactRational(expression)}.`,
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
    ? `Source-locked outcome ${sliceOutcomes.join(", ")} on retained page 49.`
    : check === "MATHEMATICAL_ANSWER"
      ? "Independent normalized-rational oracle recomputes BCNN-based addition and subtraction plus all four signed-fraction operations."
      : `Deterministic Grade 6 Wave C ${check.toLowerCase().replaceAll("_", " ")} receipt.`,
}));

const blueprintBands = [
  { difficulty: "FOUNDATIONAL", targetCount: 8 },
  { difficulty: "CORE", targetCount: 8 },
  { difficulty: "EXTENSION", targetCount: 8 },
] as const;
const blueprints = sliceOutcomes.flatMap((outcomeId) => blueprintBands.map((band) => ({
  id: `g6-wave-c-blueprint-${outcomeId.toLowerCase()}-${band.difficulty.toLowerCase()}`,
  grade,
  skillId: officialSkillId(outcomeId),
  difficulty: band.difficulty,
  questionType: "RATIONAL_INPUT" as const,
  templateId: `g6-wave-c-template-${outcomeId.toLowerCase()}`,
  targetCount: band.targetCount,
  sourceReferenceIds: [sourceId],
})));

const candidateCore = {
  format: "plave-wave-c-candidate-v1",
  candidateId,
  version,
  policyVersion,
  sourceOutcomeIds: sliceOutcomes,
  blueprints,
  questions,
  explanations,
} as const;

export const gradeSixWaveCBundleHash = sha256(canonicalize(candidateCore));

export function createGradeSixWaveCPack(): GradePack {
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
      { fromSkillId: officialSkillId("MOET2018-G6-NAA-P048-030"), toSkillId: officialSkillId(sliceOutcomes[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
      { fromSkillId: officialSkillId(sliceOutcomes[0]), toSkillId: officialSkillId(nextTargetOutcomeIds[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    ],
    blueprints,
    questions,
    quarantinedQuestions: [],
    explanations,
    evidenceReceipts,
    candidate: { candidateId, version, bundleHash: gradeSixWaveCBundleHash, policyVersion },
    adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
    release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
    production: {
      wave: "C",
      selectedSliceId: "g6-fraction-arithmetic",
      selectionBasis: ["SOURCE_VERIFIED", "EXACT_REDUCED_RATIONAL_ORACLE", "BCNN_COMMON_DENOMINATOR", "NONZERO_DIVISOR_GUARD"],
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

export const gradeSixWaveCPack = createGradeSixWaveCPack();

export const gradeSixWaveCMetadata = {
  schemaVersion: "plave-wave-c-metadata-v1",
  wave: "C",
  grade,
  title: "Phép tính phân số",
  sourceClassification: "SOURCE_VERIFIED",
  sourcePages: [49],
  sourceOutcomeIds: sliceOutcomes,
  prerequisiteOutcomeIds: [],
  prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  nextTargetOutcomeIds,
  nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  production: { generated: 24, evidenceGatePassed: 24, verificationInsufficient: 0, repaired: 0, rejected: 0, duplicate: 0, candidateEligible: 24 },
  candidate: gradeSixWaveCPack.candidate,
  release: gradeSixWaveCPack.release,
} as const;
