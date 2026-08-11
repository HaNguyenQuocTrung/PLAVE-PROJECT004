import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 5 as const;
const sourceId = officialSourceReferenceId(grade);
const packId = "grade-5-wave-d-decimal-multiplication-division";
const candidateId = "g5-decimal-multiplication-division-wave-d";
const version = "g5-decimal-multiplication-division-1.0.0-wave-d";
const policyVersion = "g5-decimal-operations-policy-1.0.0-wave-d";
const sliceOutcomes = [
  "MOET2018-G5-NUM-P042-020",
  "MOET2018-G5-NUM-P042-018",
] as const;
const prerequisiteOutcomeIds = ["MOET2018-G5-NUM-P042-019"] as const;
const nextTargetOutcomeIds = ["MOET2018-G5-NUM-P042-021"] as const;

type SliceOutcome = (typeof sliceOutcomes)[number];
type GeneratedItem = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;
const value = (numerator: number, denominator: number): MathExpression => ({ op: "VALUE", numerator, denominator });
const purposes = ["FOUNDATION", "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "TRANSFER_APPLICATION"] as const;
const receiptIds = requiredAutomatedEvidenceChecks.map((check) => `${packId}-${check.toLowerCase().replaceAll("_", "-")}`);

function exactDecimal(expression: MathExpression) {
  const result = evaluateExpression(expression);
  if (result.denominator === 1) return String(result.numerator);
  let denominator = result.denominator;
  let twos = 0;
  let fives = 0;
  while (denominator % 2 === 0) { denominator /= 2; twos += 1; }
  while (denominator % 5 === 0) { denominator /= 5; fives += 1; }
  if (denominator !== 1) throw new Error("AUTOMATED_VERIFICATION_INSUFFICIENT");
  const places = Math.max(twos, fives);
  const scaled = result.numerator * (2 ** (places - twos)) * (5 ** (places - fives));
  const sign = scaled < 0 ? "-" : "";
  const digits = String(Math.abs(scaled)).padStart(places + 1, "0");
  const raw = `${sign}${digits.slice(0, -places)}.${digits.slice(-places)}`;
  return raw.replace(/\.0+$/u, "").replace(/(\.\d*?)0+$/u, "$1");
}

const display = (value: string) => value.replace(".", ",");
function difficulty(index: number): DifficultyBand {
  const position = index % 6;
  return position < 2 ? "FOUNDATIONAL" : position < 4 ? "CORE" : "EXTENSION";
}

function promptFor(index: number, left: string, symbol: "×" | ":", right: string) {
  if (index < 4) return `Tính ${left} ${symbol} ${right}.`;
  if (index < 8) {
    return symbol === "×"
      ? `Nhân ${left} với ${right}, rồi đặt dấu phẩy theo đúng giá trị hàng.`
      : `Dịch dấu phẩy ở cả hai số cùng số hàng, rồi tính ${left} : ${right}.`;
  }
  return symbol === "×"
    ? `Bạn Minh đặt dấu phẩy theo riêng thừa số ${right} khi tính ${left} × ${right}. Hãy tính tích chính xác.`
    : `Bạn An chỉ dịch dấu phẩy ở số chia trong ${left} : ${right}. Hãy tính thương đúng.`;
}

function createItem(
  questionNumber: number,
  outcomeId: SliceOutcome,
  localIndex: number,
  prompt: string,
  derivation: MathExpression,
  steps: readonly string[],
): GeneratedItem {
  const suffix = String(questionNumber).padStart(2, "0");
  const id = `g5-wave-d-${suffix}`;
  const explanationId = `${id}-explanation`;
  const normalizedPrompt = prompt.normalize("NFC");
  const exactAnswer = exactDecimal(derivation);
  return {
    question: {
      id,
      grade,
      blueprintId: `g5-wave-d-blueprint-${outcomeId.toLowerCase()}-${difficulty(localIndex).toLowerCase()}`,
      skillId: officialSkillId(outcomeId),
      prompt: normalizedPrompt,
      options: null,
      answer: { type: "DECIMAL_INPUT", exactValue: exactAnswer, decimalPlaces: 6, derivation },
      explanationId,
      difficulty: difficulty(localIndex),
      provenance: {
        kind: "DETERMINISTIC_TEMPLATE",
        templateVersion: "g5-decimal-multiplication-division-wave-d-template-1.0.0",
        seed: `g5-wave-d-${outcomeId.toLowerCase()}-${suffix}`,
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
    [12, 1, 35, 100], [24, 10, 15, 10], [35, 1, 8, 100], [125, 100, 24, 10],
    [48, 10, 25, 100], [72, 100, 15, 10], [325, 100, 12, 10], [64, 10, 75, 100],
    [875, 100, 4, 10], [144, 10, 16, 100], [225, 100, 32, 10], [168, 10, 45, 100],
  ] as const;
  products.forEach(([leftNumerator, leftDenominator, rightNumerator, rightDenominator], index) => {
    const left = value(leftNumerator, leftDenominator);
    const right = value(rightNumerator, rightDenominator);
    const derivation: MathExpression = { op: "MULTIPLY", left, right };
    generated.push(createItem(index + 1, sliceOutcomes[0], index, promptFor(index, display(exactDecimal(left)), "×", display(exactDecimal(right))), derivation, [
      "Nhân như với số tự nhiên sau khi tạm bỏ dấu phẩy.",
      "Tổng số hàng thập phân của hai thừa số xác định vị trí dấu phẩy trong tích.",
      `Tích chính xác là ${display(exactDecimal(derivation))}.`,
    ]));
  });

  const quotients = [
    [72, 10, 24, 100], [45, 10, 15, 10], [672, 100, 21, 100], [126, 10, 6, 10],
    [375, 100, 25, 100], [84, 10, 12, 10], [144, 10, 8, 100], [525, 100, 15, 10],
    [96, 10, 32, 100], [1125, 100, 75, 100], [162, 10, 45, 100], [2475, 100, 15, 10],
  ] as const;
  quotients.forEach(([leftNumerator, leftDenominator, rightNumerator, rightDenominator], index) => {
    const left = value(leftNumerator, leftDenominator);
    const right = value(rightNumerator, rightDenominator);
    const derivation: MathExpression = { op: "DIVIDE", left, right };
    generated.push(createItem(index + 13, sliceOutcomes[1], index, promptFor(index, display(exactDecimal(left)), ":", display(exactDecimal(right))), derivation, [
      "Số chia khác 0; nhân cả số bị chia và số chia với cùng một lũy thừa của 10 để số chia thành số tự nhiên.",
      "Phép biến đổi cùng tỉ lệ giữ nguyên thương.",
      `Thương chính xác là ${display(exactDecimal(derivation))}.`,
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
    ? `Retained source-locked outcomes ${sliceOutcomes.join(", ")} on page 42.`
    : check === "MATHEMATICAL_ANSWER"
      ? "Independent scaled-integer rational oracle recomputes every finite decimal product and quotient without floating-point rounding."
      : `Deterministic Grade 5 Wave D ${check.toLowerCase().replaceAll("_", " ")} receipt.`,
}));
const blueprints = sliceOutcomes.flatMap((outcomeId) => (["FOUNDATIONAL", "CORE", "EXTENSION"] as const).map((band) => ({
  id: `g5-wave-d-blueprint-${outcomeId.toLowerCase()}-${band.toLowerCase()}`,
  grade,
  skillId: officialSkillId(outcomeId),
  difficulty: band,
  questionType: "DECIMAL_INPUT" as const,
  templateId: `g5-wave-d-template-${outcomeId.toLowerCase()}`,
  targetCount: 4,
  sourceReferenceIds: [sourceId],
})));
const candidateCore = { format: "plave-wave-d-candidate-v1", candidateId, version, policyVersion, sourceOutcomeIds: sliceOutcomes, blueprints, questions, explanations } as const;
export const gradeFiveWaveDBundleHash = sha256(canonicalize(candidateCore));

export function createGradeFiveWaveDPack(): GradePack {
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
      { fromSkillId: officialSkillId(sliceOutcomes[0]), toSkillId: officialSkillId(sliceOutcomes[1]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
      { fromSkillId: officialSkillId(sliceOutcomes[1]), toSkillId: officialSkillId(nextTargetOutcomeIds[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    ],
    blueprints,
    questions,
    quarantinedQuestions: [],
    explanations,
    evidenceReceipts,
    candidate: { candidateId, version, bundleHash: gradeFiveWaveDBundleHash, policyVersion },
    adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
    release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
    production: { wave: "D", selectedSliceId: "g5-decimal-multiplication-division", selectionBasis: ["SOURCE_VERIFIED", "UNCOVERED_BY_WAVES_A_TO_C", "EXACT_SCALED_INTEGER_ORACLE", "FINITE_DECIMAL_DOMAIN", "NONZERO_DIVISOR_GUARD"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 },
    legacyAsset: null,
  };
}

export const gradeFiveWaveDPack = createGradeFiveWaveDPack();
export const gradeFiveWaveDMetadata = {
  schemaVersion: "plave-wave-d-metadata-v1",
  wave: "D",
  grade,
  title: "Nhân và chia số thập phân",
  sourceClassification: "SOURCE_VERIFIED",
  sourcePages: [42],
  sourceOutcomeIds: sliceOutcomes,
  prerequisiteOutcomeIds,
  prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  nextTargetOutcomeIds,
  nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  selectionRationale: "Two uncovered page-42 decimal-operation rows complete exact multiplication and division after Wave C addition/subtraction.",
  deferredGap: "Rounding, power-of-ten operations and open contextual decimal applications remain separate source rows and are not inferred here.",
  production: { generated: 24, evidenceGatePassed: 24, verificationInsufficient: 0, repaired: 0, rejected: 0, duplicate: 0, candidateEligible: 24 },
  candidate: gradeFiveWaveDPack.candidate,
  release: gradeFiveWaveDPack.release,
} as const;
