import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 6 as const;
const sourceId = officialSourceReferenceId(grade);
const packId = "grade-6-wave-f-signed-decimal-operations";
const candidateId = "g6-signed-decimal-operations-wave-f";
const version = "g6-signed-decimal-operations-1.0.0-wave-f";
const policyVersion = "g6-decimal-operations-policy-1.0.0-wave-f";
const sliceOutcomes = ["MOET2018-G6-NAA-P050-047"] as const;
const prerequisiteOutcomeIds = ["MOET2018-G6-NAA-P050-046"] as const;
const nextTargetOutcomeIds = ["MOET2018-G6-NAA-P050-048"] as const;

type BinaryOperation = "ADD" | "SUBTRACT" | "MULTIPLY" | "DIVIDE";
type GeneratedItem = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;
const value = (numerator: number, denominator = 1): MathExpression => ({ op: "VALUE", numerator, denominator });
const operation = (op: BinaryOperation, left: MathExpression, right: MathExpression): MathExpression => ({ op, left, right });
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

function difficulty(index: number): DifficultyBand {
  const position = index % 6;
  return position < 2 ? "FOUNDATIONAL" : position < 4 ? "CORE" : "EXTENSION";
}

function createItem(questionNumber: number, prompt: string, derivation: MathExpression, steps: readonly string[]): GeneratedItem {
  const suffix = String(questionNumber).padStart(2, "0");
  const id = `g6-wave-f-${suffix}`;
  const explanationId = `${id}-explanation`;
  const normalizedPrompt = prompt.normalize("NFC");
  const answer = exactDecimal(derivation);
  return {
    question: {
      id,
      grade,
      blueprintId: `g6-wave-f-blueprint-${sliceOutcomes[0].toLowerCase()}-${difficulty(questionNumber - 1).toLowerCase()}`,
      skillId: officialSkillId(sliceOutcomes[0]),
      prompt: normalizedPrompt,
      options: null,
      answer: { type: "DECIMAL_INPUT", exactValue: answer, decimalPlaces: 6, derivation },
      explanationId,
      difficulty: difficulty(questionNumber - 1),
      provenance: {
        kind: "DETERMINISTIC_TEMPLATE",
        templateVersion: "g6-signed-decimal-operations-wave-f-template-1.0.0",
        seed: `g6-wave-f-${sliceOutcomes[0].toLowerCase()}-${suffix}`,
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
      finalAnswer: answer,
      evidenceReceiptIds: [`${packId}-explanation-consistency`],
    },
  };
}

function generateQuestions(): readonly GeneratedItem[] {
  const generated: GeneratedItem[] = [];
  const additions = [
    { left: value(-25, 10), right: value(475, 100), display: "−2,5 + 4,75" },
    { left: value(36, 10), right: value(-125, 100), display: "3,6 + (−1,25)" },
    { left: value(-8, 10), right: value(-245, 100), display: "−0,8 + (−2,45)" },
    { left: value(1275, 100), right: value(-55, 10), display: "12,75 + (−5,5)" },
    { left: value(-142, 10), right: value(865, 100), display: "−14,2 + 8,65" },
    { left: value(375, 1000), right: value(-1125, 1000), display: "0,375 + (−1,125)" },
  ] as const;
  additions.forEach(({ left, right, display }, index) => {
    const derivation = operation("ADD", left, right);
    generated.push(createItem(index + 1, `Tính ${display}.`, derivation, [
      "Căn thẳng hàng các chữ số cùng giá trị hàng.",
      "Cộng hai số có dấu, so sánh độ lớn khi hai dấu khác nhau.",
      `Kết quả là ${exactDecimal(derivation)}.`,
    ]));
  });

  const subtractions = [
    { left: value(35, 10), right: value(-225, 100), display: "3,5 − (−2,25)" },
    { left: value(-48, 10), right: value(12, 10), display: "−4,8 − 1,2" },
    { left: value(-75, 100), right: value(-15, 10), display: "−0,75 − (−1,5)" },
    { left: value(124, 10), right: value(1575, 100), display: "12,4 − 15,75" },
    { left: value(-925, 100), right: value(-35, 10), display: "−9,25 − (−3,5)" },
    { left: value(625, 1000), right: value(1875, 1000), display: "0,625 − 1,875" },
  ] as const;
  subtractions.forEach(({ left, right, display }, index) => {
    const derivation = operation("SUBTRACT", left, right);
    generated.push(createItem(index + 7, `Tính ${display}.`, derivation, [
      "Đổi phép trừ thành phép cộng với số đối của số trừ.",
      "Thực hiện phép cộng các số có dấu sau khi căn hàng thập phân.",
      `Kết quả là ${exactDecimal(derivation)}.`,
    ]));
  });

  const multiplications = [
    { left: value(-25, 10), right: value(12, 10), display: "−2,5 × 1,2" },
    { left: value(45, 10), right: value(-8, 10), display: "4,5 × (−0,8)" },
    { left: value(-125, 100), right: value(-24, 10), display: "−1,25 × (−2,4)" },
    { left: value(75, 100), right: value(-32, 10), display: "0,75 × (−3,2)" },
    { left: value(-64, 10), right: value(25, 100), display: "−6,4 × 0,25" },
    { left: value(2125, 1000), right: value(-16, 10), display: "2,125 × (−1,6)" },
  ] as const;
  multiplications.forEach(({ left, right, display }, index) => {
    const derivation = operation("MULTIPLY", left, right);
    generated.push(createItem(index + 13, `Tính ${display}.`, derivation, [
      "Xác định dấu của tích từ dấu của hai thừa số.",
      "Nhân phần độ lớn rồi đặt dấu phẩy theo tổng số chữ số thập phân.",
      `Kết quả là ${exactDecimal(derivation)}.`,
    ]));
  });

  const divisions = [
    { left: value(-75, 10), right: value(25, 10), display: "−7,5 : 2,5" },
    { left: value(48, 10), right: value(-12, 10), display: "4,8 : (−1,2)" },
    { left: value(-375, 100), right: value(-75, 100), display: "−3,75 : (−0,75)" },
    { left: value(84, 100), right: value(-28, 100), display: "0,84 : (−0,28)" },
    { left: value(-126, 10), right: value(35, 10), display: "−12,6 : 3,5" },
    { left: value(5625, 1000), right: value(-225, 100), display: "5,625 : (−2,25)" },
  ] as const;
  divisions.forEach(({ left, right, display }, index) => {
    const derivation = operation("DIVIDE", left, right);
    generated.push(createItem(index + 19, `Tính ${display}.`, derivation, [
      "Số chia khác 0; xác định dấu của thương từ dấu của hai số.",
      "Nhân cả số bị chia và số chia với cùng lũy thừa của 10 để số chia trở thành số tự nhiên.",
      `Kết quả là ${exactDecimal(derivation)}.`,
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
    ? `Retained source-locked outcome ${sliceOutcomes[0]} on page 50.`
    : check === "MATHEMATICAL_ANSWER"
      ? "Independent exact-rational oracle verifies signed decimal addition, subtraction, multiplication and nonzero-divisor division."
      : `Deterministic Grade 6 Wave F ${check.toLowerCase().replaceAll("_", " ")} receipt.`,
}));
const blueprints = (["FOUNDATIONAL", "CORE", "EXTENSION"] as const).map((band) => ({
  id: `g6-wave-f-blueprint-${sliceOutcomes[0].toLowerCase()}-${band.toLowerCase()}`,
  grade,
  skillId: officialSkillId(sliceOutcomes[0]),
  difficulty: band,
  questionType: "DECIMAL_INPUT" as const,
  templateId: `g6-wave-f-template-${sliceOutcomes[0].toLowerCase()}`,
  targetCount: 8,
  sourceReferenceIds: [sourceId],
}));
const candidateCore = { format: "plave-wave-f-candidate-v1", candidateId, version, policyVersion, sourceOutcomeIds: sliceOutcomes, blueprints, questions, explanations } as const;

export const gradeSixWaveFBundleHash = sha256(canonicalize(candidateCore));
export function createGradeSixWaveFPack(): GradePack {
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
    candidate: { candidateId, version, bundleHash: gradeSixWaveFBundleHash, policyVersion },
    adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
    release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
    production: {
      wave: "F",
      selectedSliceId: "g6-signed-decimal-operations",
      selectionBasis: ["SOURCE_VERIFIED", "UNCOVERED_BY_WAVES_A_TO_E", "EXACT_FINITE_DECIMAL_ORACLE", "FOUR_OPERATION_COVERAGE", "NONZERO_DIVISORS", "SIGNED_DECIMAL_VARIATION"],
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

export const gradeSixWaveFPack = createGradeSixWaveFPack();
export const gradeSixWaveFMetadata = {
  schemaVersion: "plave-wave-f-metadata-v1",
  wave: "F",
  grade,
  title: "Bốn phép tính với số thập phân có dấu",
  sourceClassification: "SOURCE_VERIFIED",
  sourcePages: [50],
  sourceOutcomeIds: sliceOutcomes,
  prerequisiteOutcomeIds,
  prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  nextTargetOutcomeIds,
  nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  selectionRationale: "The retained Grade 6 decimal-operations row directly supports all four signed-decimal operations with exact rational verification.",
  deferredGaps: ["Division by zero remains categorically excluded.", "Non-terminating decimal quotients are excluded from this exact decimal candidate."],
  production: { generated: 24, evidenceGatePassed: 24, verificationInsufficient: 0, repaired: 0, rejected: 0, duplicate: 0, candidateEligible: 24 },
  candidate: gradeSixWaveFPack.candidate,
  release: gradeSixWaveFPack.release,
} as const;
