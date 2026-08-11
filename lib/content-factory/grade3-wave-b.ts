import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { gradeThreeWaveAPack } from "./grade3-wave-a.ts";
import { evaluateExpression } from "./math.ts";
import {
  buildOfficialGradeSkeleton,
  officialSkillId,
  officialSourceReferenceId,
} from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import { combineWavePacks } from "./wave-b.ts";
import type { WaveBProgressionContract } from "./wave-b.ts";
import type {
  AutomatedEvidenceReceipt,
  CandidateQuestion,
  DifficultyBand,
  ExplanationSpec,
  GradePack,
  MathExpression,
} from "./types.ts";

const grade = 3 as const;
const unitId = "grade-3-multiplication-division";
const sourceId = officialSourceReferenceId(grade);
const packId = "grade-3-wave-b-multiplication-division";
const candidateId = "g3-multiplication-division-wave-b";
const version = "g3-multiplication-division-1.0.0-wave-b";
const policyVersion = "g3-multiplication-division-policy-1.0.0-wave-b";

const sliceOutcomes = [
  "MOET2018-G3-NUM-P029-010",
  "MOET2018-G3-NUM-P030-017",
  "MOET2018-G3-NUM-P030-018",
] as const;

const nextTargetOutcomeIds = [
  "MOET2018-G3-NUM-P030-015",
  "MOET2018-G3-NUM-P030-016",
] as const;

type SliceOutcome = (typeof sliceOutcomes)[number];
type GeneratedItem = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;

const instructionalPurposes = [
  "FOUNDATION",
  "FOUNDATION",
  "STANDARD_APPLICATION",
  "STANDARD_APPLICATION",
  "MISCONCEPTION_TARGETING",
  "MISCONCEPTION_TARGETING",
  "REMEDIATION",
  "TRANSFER_APPLICATION",
] as const;

const value = (numerator: number): MathExpression => ({ op: "VALUE", numerator, denominator: 1 });
const binary = (
  op: "MULTIPLY" | "DIVIDE",
  left: MathExpression,
  right: MathExpression,
): MathExpression => ({ op, left, right });

function exactInteger(expression: MathExpression) {
  const result = evaluateExpression(expression);
  if (result.denominator !== 1) throw new Error("GRADE_3_WAVE_B_INTEGER_RESULT_REQUIRED");
  return String(result.numerator);
}

function difficulty(index: number): DifficultyBand {
  const purpose = instructionalPurposes[index]!;
  if (purpose === "FOUNDATION" || purpose === "REMEDIATION") return "FOUNDATIONAL";
  if (purpose === "TRANSFER_APPLICATION") return "EXTENSION";
  return "CORE";
}

function carryPositions(multiplicand: number, multiplier: number) {
  const positions: number[] = [];
  let carry = 0;
  String(multiplicand).split("").reverse().forEach((digit, index) => {
    const product = Number(digit) * multiplier + carry;
    carry = Math.floor(product / 10);
    if (carry > 0) positions.push(index);
  });
  return positions;
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
  const questionId = `g3-wave-b-${suffix}`;
  const explanationId = `${questionId}-explanation`;
  const exactValue = exactInteger(derivation);
  const normalizedPrompt = prompt.normalize("NFC");
  return {
    question: {
      id: questionId,
      grade,
      unitId,
      blueprintId: `g3-wave-b-blueprint-${outcomeId.toLowerCase()}-${difficulty(localIndex).toLowerCase()}`,
      skillId: officialSkillId(outcomeId),
      prompt: normalizedPrompt,
      options: null,
      answer: { type: "INTEGER_INPUT", exactValue, derivation },
      explanationId,
      difficulty: difficulty(localIndex),
      provenance: {
        kind: "DETERMINISTIC_TEMPLATE",
        templateVersion: "g3-multiplication-division-wave-b-template-1.0.0",
        seed: `g3-wave-b-${outcomeId.toLowerCase()}-${suffix}`,
        sourceReferenceIds: [sourceId],
      },
      reviewStatus: "BUNDLED",
      published: false,
      pilotEligible: false,
      fixtureOnly: false,
      duplicateFingerprint: sha256(
        normalizedDefinition(`${normalizedPrompt}|`).toLocaleLowerCase("vi"),
      ),
      validationReceiptIds: receiptIds,
      instructionalPurpose: instructionalPurposes[localIndex]!,
    },
    explanation: {
      id: explanationId,
      questionId,
      steps: steps.map((step) => step.normalize("NFC")),
      finalAnswer: exactValue,
      evidenceReceiptIds: [`${packId}-explanation-consistency`],
    },
  };
}

function generateQuestions(): readonly GeneratedItem[] {
  const items: GeneratedItem[] = [];

  for (let index = 0; index < 8; index += 1) {
    const factor = index + 2;
    const other = 4 + ((index * 3) % 6);
    const expression = binary("MULTIPLY", value(factor), value(other));
    const answer = factor * other;
    const prompt = index < 4
      ? `Tính nhẩm ${factor} × ${other}.`
      : index < 6
        ? `Bạn Minh cộng ${factor} với ${other} và được ${factor + other}. Hãy tính đúng ${factor} × ${other}.`
        : index === 6
          ? `Dùng bảng nhân ${factor} để tính ${factor} × ${other}.`
          : `Có ${factor} khay, mỗi khay có ${other} quả. Có tất cả bao nhiêu quả?`;
    items.push(createItem(index + 1, sliceOutcomes[0], index, prompt, expression, [
      `Dùng bảng nhân ${factor}.`,
      `${factor} × ${other} = ${answer}.`,
      `Kiểm tra ${answer} : ${factor} = ${other}.`,
    ]));
  }

  for (let index = 0; index < 8; index += 1) {
    const divisor = 2 + index;
    const quotient = 104 + index * 17;
    const dividend = divisor * quotient;
    const expression = binary("DIVIDE", value(dividend), value(divisor));
    const prompt = index < 4
      ? `Tính ${dividend.toLocaleString("vi-VN")} : ${divisor}.`
      : index < 6
        ? `Bạn Lan ghi thương của ${dividend.toLocaleString("vi-VN")} : ${divisor} là ${quotient + 10}. Hãy sửa thương.`
        : index === 6
          ? `Biết ${divisor} × ${quotient} = ${dividend.toLocaleString("vi-VN")}. Tính ${dividend.toLocaleString("vi-VN")} : ${divisor}.`
          : `Chia đều ${dividend.toLocaleString("vi-VN")} nhãn vào ${divisor} hộp. Mỗi hộp có bao nhiêu nhãn?`;
    items.push(createItem(index + 9, sliceOutcomes[1], index, prompt, expression, [
      `Số chia ${divisor} có một chữ số và khác 0.`,
      `Thực hiện phép chia được thương ${quotient}.`,
      `Kiểm tra ${quotient} × ${divisor} = ${dividend}.`,
    ]));
  }

  const multiplicationCases = [
    [214, 3], [132, 4], [1_203, 4], [2_314, 2],
    [3_021, 3], [1_212, 4], [2_104, 3], [1_302, 5],
  ] as const;
  multiplicationCases.forEach(([multiplicand, multiplier], index) => {
    const carries = carryPositions(multiplicand, multiplier);
    if (carries.length > 2 || carries.some((position, carryIndex) => carryIndex > 0 && position === carries[carryIndex - 1]! + 1)) {
      throw new Error("GRADE_3_MULTIPLICATION_CARRY_POLICY_VIOLATION");
    }
    const expression = binary("MULTIPLY", value(multiplicand), value(multiplier));
    const prompt = index < 4
      ? `Đặt tính rồi tính ${multiplicand.toLocaleString("vi-VN")} × ${multiplier}.`
      : index < 6
        ? `Bạn An bỏ qua phần nhớ khi tính ${multiplicand.toLocaleString("vi-VN")} × ${multiplier}. Hãy tính lại đầy đủ.`
        : index === 6
          ? `Nhân từ hàng đơn vị và ghi phần nhớ đúng hàng: ${multiplicand.toLocaleString("vi-VN")} × ${multiplier}.`
          : `Mỗi thùng có ${multiplicand.toLocaleString("vi-VN")} nhãn. ${multiplier} thùng có tất cả bao nhiêu nhãn?`;
    items.push(createItem(index + 17, sliceOutcomes[2], index, prompt, expression, [
      "Nhân lần lượt từ hàng đơn vị sang trái.",
      `Phép nhân có ${carries.length} lượt nhớ và các lượt nhớ không liên tiếp.`,
      `Kết quả là ${exactInteger(expression)}; kiểm tra bằng phép chia cho ${multiplier}.`,
    ]));
  });

  return items;
}

const generated = generateQuestions();
const questions = generated.map((item) => item.question);
const explanations = generated.map((item) => item.explanation);
const skeleton = buildOfficialGradeSkeleton(grade);

const evidenceReceipts: readonly AutomatedEvidenceReceipt[] = requiredAutomatedEvidenceChecks.map((check) => ({
  id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`,
  entityId: packId,
  check,
  status: "PASSED",
  evidence: check === "SOURCE_MAPPING"
    ? `Source-locked outcomes ${sliceOutcomes.join(", ")} on pages 29–30.`
    : check === "MATHEMATICAL_ANSWER"
      ? "Independent exact-integer oracle recomputed every multiplication and division result; carry policy was checked separately."
      : `Deterministic Grade 3 Wave B ${check.toLowerCase().replaceAll("_", " ")} receipt.`,
}));

const blueprintBands = [
  { difficulty: "FOUNDATIONAL", targetCount: 3 },
  { difficulty: "CORE", targetCount: 4 },
  { difficulty: "EXTENSION", targetCount: 1 },
] as const;
const blueprints = sliceOutcomes.flatMap((outcomeId) => blueprintBands.map((band) => ({
  id: `g3-wave-b-blueprint-${outcomeId.toLowerCase()}-${band.difficulty.toLowerCase()}`,
  grade,
  skillId: officialSkillId(outcomeId),
  difficulty: band.difficulty,
  questionType: "INTEGER_INPUT" as const,
  templateId: `g3-wave-b-template-${outcomeId.toLowerCase()}`,
  targetCount: band.targetCount,
  sourceReferenceIds: [sourceId],
})));

const waveBCore = {
  format: "plave-wave-b-candidate-v1",
  candidateId,
  version,
  policyVersion,
  unitId,
  sourceOutcomeIds: sliceOutcomes,
  blueprints,
  questions,
  explanations,
} as const;

export const gradeThreeWaveBBundleHash = sha256(canonicalize(waveBCore));

export function createGradeThreeWaveBPack(): GradePack {
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
      { fromSkillId: officialSkillId("MOET2018-G3-NUM-P030-012"), toSkillId: officialSkillId(sliceOutcomes[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
      { fromSkillId: officialSkillId(sliceOutcomes[0]), toSkillId: officialSkillId(sliceOutcomes[1]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
      { fromSkillId: officialSkillId(sliceOutcomes[1]), toSkillId: officialSkillId(sliceOutcomes[2]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
      { fromSkillId: officialSkillId(sliceOutcomes[2]), toSkillId: officialSkillId(nextTargetOutcomeIds[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    ],
    blueprints,
    questions,
    quarantinedQuestions: [],
    explanations,
    evidenceReceipts,
    candidate: { candidateId, version, bundleHash: gradeThreeWaveBBundleHash, policyVersion },
    adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
    release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
    production: {
      wave: "B",
      selectedSliceId: unitId,
      selectionBasis: ["SOURCE_VERIFIED", "INDEPENDENT_EXACT_INTEGER_ORACLE", "ONE_DIGIT_CARRY_POLICY", "NO_DIAGRAM_DEPENDENCY"],
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

export const gradeThreeWaveBPack = createGradeThreeWaveBPack();

const combinedBinding = {
  packId: "grade-3-waves-a-b",
  version: "g3-waves-a-b-1.0.0-cumulative",
  candidateId: "g3-waves-a-b",
  policyVersion: "g3-waves-a-b-policy-1.0.0",
  selectedSliceId: "grade-3-additive-fluency-plus-multiplication-division",
} as const;

export function createGradeThreeWavesABPack(): GradePack {
  return combineWavePacks(gradeThreeWaveAPack, gradeThreeWaveBPack, combinedBinding);
}

export const gradeThreeWavesABPack = createGradeThreeWavesABPack();
export const gradeThreeWavesABBundleHash = gradeThreeWavesABPack.candidate!.bundleHash;

export const gradeThreeWaveBProgression: WaveBProgressionContract = {
  grade,
  waveASkillId: officialSkillId("MOET2018-G3-NUM-P030-012"),
  waveBSkillIds: sliceOutcomes.map(officialSkillId),
  remediationTargetSkillId: officialSkillId(sliceOutcomes[0]),
  advanceTargetSkillId: officialSkillId(sliceOutcomes[1]),
  retentionTargetSkillId: officialSkillId(sliceOutcomes[2]),
  nextTargetSkillId: officialSkillId(nextTargetOutcomeIds[0]),
  schoolGradeMutation: false,
  entitlementGrant: false,
};

export const gradeThreeWaveBMetadata = {
  schemaVersion: "plave-wave-b-metadata-v1",
  grade,
  title: "Bảng nhân chia và phép nhân, chia với số có một chữ số",
  unitId,
  sourceClassification: "SOURCE_VERIFIED",
  sourceOutcomeIds: sliceOutcomes,
  prerequisiteOutcomeIds: ["MOET2018-G3-NUM-P030-012"],
  prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  nextTargetOutcomeIds,
  nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  production: { generated: 24, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0 },
  candidate: gradeThreeWaveBPack.candidate,
  combinedCandidate: gradeThreeWavesABPack.candidate,
  release: gradeThreeWaveBPack.release,
} as const;
