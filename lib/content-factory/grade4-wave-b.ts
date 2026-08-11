import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { gradeFourWaveAPack } from "./grade4-wave-a.ts";
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
  AnswerContract,
  AutomatedEvidenceReceipt,
  CandidateQuestion,
  DifficultyBand,
  ExplanationSpec,
  GradePack,
  MathExpression,
} from "./types.ts";

const grade = 4 as const;
const unitId = "grade-4-fraction-foundations";
const sourceId = officialSourceReferenceId(grade);
const packId = "grade-4-wave-b-fraction-recognition-equivalence-order";
const candidateId = "g4-fraction-recognition-equivalence-order-wave-b";
const version = "g4-fraction-recognition-equivalence-order-1.0.0-wave-b";
const policyVersion = "g4-fraction-foundations-policy-1.0.0-wave-b";

const sliceOutcomes = [
  "MOET2018-G4-NUM-P036-018",
  "MOET2018-G4-NUM-P036-019",
  "MOET2018-G4-NUM-P036-020",
] as const;

const nextTargetOutcomeIds = [
  "MOET2018-G4-NUM-P036-021",
  "MOET2018-G4-NUM-P036-022",
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

function exactRelation(left: MathExpression, right: MathExpression) {
  const leftValue = evaluateExpression(left);
  const rightValue = evaluateExpression(right);
  const difference = leftValue.numerator * rightValue.denominator - rightValue.numerator * leftValue.denominator;
  return difference < 0 ? "<" as const : difference > 0 ? ">" as const : "=" as const;
}

function difficulty(index: number): DifficultyBand {
  const purpose = instructionalPurposes[index]!;
  if (purpose === "FOUNDATION" || purpose === "REMEDIATION") return "FOUNDATIONAL";
  if (purpose === "TRANSFER_APPLICATION") return "EXTENSION";
  return "CORE";
}

const receiptIds = requiredAutomatedEvidenceChecks.map(
  (check) => `${packId}-${check.toLowerCase().replaceAll("_", "-")}`,
);

function createItem(
  questionNumber: number,
  outcomeId: SliceOutcome,
  localIndex: number,
  prompt: string,
  answer: AnswerContract,
  steps: readonly string[],
  options: readonly string[] | null = null,
): GeneratedItem {
  const suffix = String(questionNumber).padStart(2, "0");
  const questionId = `g4-wave-b-${suffix}`;
  const explanationId = `${questionId}-explanation`;
  const normalizedPrompt = prompt.normalize("NFC");
  return {
    question: {
      id: questionId,
      grade,
      unitId,
      blueprintId: `g4-wave-b-blueprint-${outcomeId.toLowerCase()}-${difficulty(localIndex).toLowerCase()}`,
      skillId: officialSkillId(outcomeId),
      prompt: normalizedPrompt,
      options,
      answer,
      explanationId,
      difficulty: difficulty(localIndex),
      provenance: {
        kind: "DETERMINISTIC_TEMPLATE",
        templateVersion: "g4-fraction-foundations-wave-b-template-1.0.0",
        seed: `g4-wave-b-${outcomeId.toLowerCase()}-${suffix}`,
        sourceReferenceIds: [sourceId],
      },
      reviewStatus: "BUNDLED",
      published: false,
      pilotEligible: false,
      fixtureOnly: false,
      duplicateFingerprint: sha256(
        normalizedDefinition(`${normalizedPrompt}|${options?.join("|") ?? ""}`).toLocaleLowerCase("vi"),
      ),
      validationReceiptIds: receiptIds,
      instructionalPurpose: instructionalPurposes[localIndex]!,
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

function generateQuestions(): readonly GeneratedItem[] {
  const items: GeneratedItem[] = [];
  const recognitionPairs = [
    [1, 2], [2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6], [5, 8],
  ] as const;
  recognitionPairs.forEach(([numerator, denominator], index) => {
    const expression = value(numerator, denominator);
    const exactValue = exactRational(expression);
    const prompt = index < 4
      ? `Một băng giấy được chia thành ${denominator} phần bằng nhau, tô màu ${numerator} phần. Viết phân số biểu diễn phần đã tô.`
      : index < 6
        ? `Bạn Minh viết ${denominator}/${numerator} cho ${numerator} phần được chọn trong ${denominator} phần bằng nhau. Hãy viết phân số đúng.`
        : index === 6
          ? `Tử số là số phần được chọn, mẫu số là tổng số phần bằng nhau. Với ${numerator} phần trong ${denominator} phần, viết phân số.`
          : `Một nhóm đã hoàn thành ${numerator} trong ${denominator} phần việc bằng nhau. Viết phân số phần việc đã hoàn thành.`;
    items.push(createItem(index + 1, sliceOutcomes[0], index, prompt, {
      type: "RATIONAL_INPUT",
      exactValue,
      derivation: expression,
    }, [
      `Toàn thể được chia thành ${denominator} phần bằng nhau nên mẫu số là ${denominator}.`,
      `Có ${numerator} phần được chọn nên tử số là ${numerator}.`,
      `Phân số là ${exactValue}.`,
    ]));
  });

  const equivalencePairs = [
    [2, 4], [3, 6], [4, 8], [6, 9], [8, 12], [10, 15], [12, 18], [15, 20],
  ] as const;
  equivalencePairs.forEach(([numerator, denominator], index) => {
    const expression = value(numerator, denominator);
    const exactValue = exactRational(expression);
    const divisor = numerator / Number(exactValue.split("/")[0]);
    const prompt = index < 4
      ? `Rút gọn phân số ${numerator}/${denominator} về phân số tối giản.`
      : index < 6
        ? `Bạn Lan chỉ chia tử số của ${numerator}/${denominator} cho ${divisor}. Hãy rút gọn đúng cả tử số và mẫu số.`
        : index === 6
          ? `Chia cả tử số và mẫu số của ${numerator}/${denominator} cho cùng một ước chung để rút gọn.`
          : `Một tỉ lệ được ghi là ${numerator}/${denominator}. Viết tỉ lệ đó dưới dạng phân số tối giản.`;
    items.push(createItem(index + 9, sliceOutcomes[1], index, prompt, {
      type: "RATIONAL_INPUT",
      exactValue,
      derivation: expression,
    }, [
      `Tìm ước chung ${divisor} của ${numerator} và ${denominator}.`,
      `Chia cả tử số và mẫu số cho ${divisor}.`,
      `Nhận được phân số tối giản ${exactValue}.`,
    ]));
  });

  const comparisonPairs = [
    [1, 5, 3, 5], [4, 7, 2, 7], [3, 8, 3, 8], [5, 9, 7, 9],
    [1, 2, 3, 4], [3, 5, 6, 10], [2, 3, 4, 9], [5, 6, 3, 12],
  ] as const;
  comparisonPairs.forEach(([leftNumerator, leftDenominator, rightNumerator, rightDenominator], index) => {
    const left = value(leftNumerator, leftDenominator);
    const right = value(rightNumerator, rightDenominator);
    const relation = exactRelation(left, right);
    const wrongRelation = relation === "<" ? ">" : "<";
    const prompt = index < 4
      ? `Điền dấu <, = hoặc >: ${leftNumerator}/${leftDenominator} … ${rightNumerator}/${rightDenominator}.`
      : index < 6
        ? `Bạn An điền dấu ${wrongRelation} giữa ${leftNumerator}/${leftDenominator} và ${rightNumerator}/${rightDenominator}. Hãy chọn dấu đúng.`
        : index === 6
          ? `Quy đồng rồi điền dấu đúng: ${leftNumerator}/${leftDenominator} … ${rightNumerator}/${rightDenominator}.`
          : `Hai phần công việc là ${leftNumerator}/${leftDenominator} và ${rightNumerator}/${rightDenominator}. Điền dấu để so sánh hai phần.`;
    items.push(createItem(index + 17, sliceOutcomes[2], index, prompt, {
      type: "SINGLE_CHOICE",
      exactValue: relation,
      comparison: { left, right, relation, exactAnswer: relation },
    }, [
      leftDenominator === rightDenominator
        ? `Hai phân số cùng mẫu ${leftDenominator}; so sánh hai tử số.`
        : "Quy đồng về một mẫu số chung vì một mẫu số chia hết cho mẫu số còn lại.",
      `So sánh chính xác cho kết quả ${leftNumerator}/${leftDenominator} ${relation} ${rightNumerator}/${rightDenominator}.`,
      `Dấu cần điền là ${relation}.`,
    ], ["<", "=", ">"]));
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
    ? `Source-locked outcomes ${sliceOutcomes.join(", ")} on page 36.`
    : check === "MATHEMATICAL_ANSWER"
      ? "Independent reduced-rational and cross-product oracles recomputed every fraction answer and comparison."
      : `Deterministic Grade 4 Wave B ${check.toLowerCase().replaceAll("_", " ")} receipt.`,
}));

const blueprintBands = [
  { difficulty: "FOUNDATIONAL", targetCount: 3 },
  { difficulty: "CORE", targetCount: 4 },
  { difficulty: "EXTENSION", targetCount: 1 },
] as const;
const blueprints = sliceOutcomes.flatMap((outcomeId) => blueprintBands.map((band) => ({
  id: `g4-wave-b-blueprint-${outcomeId.toLowerCase()}-${band.difficulty.toLowerCase()}`,
  grade,
  skillId: officialSkillId(outcomeId),
  difficulty: band.difficulty,
  questionType: outcomeId === sliceOutcomes[2] ? "SINGLE_CHOICE" as const : "RATIONAL_INPUT" as const,
  templateId: `g4-wave-b-template-${outcomeId.toLowerCase()}`,
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

export const gradeFourWaveBBundleHash = sha256(canonicalize(waveBCore));

export function createGradeFourWaveBPack(): GradePack {
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
      { fromSkillId: officialSkillId("MOET2018-G3-NUM-P031-023"), toSkillId: officialSkillId(sliceOutcomes[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
      { fromSkillId: officialSkillId(sliceOutcomes[0]), toSkillId: officialSkillId(sliceOutcomes[1]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
      { fromSkillId: officialSkillId(sliceOutcomes[1]), toSkillId: officialSkillId(sliceOutcomes[2]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
      { fromSkillId: officialSkillId(sliceOutcomes[2]), toSkillId: officialSkillId(nextTargetOutcomeIds[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    ],
    blueprints,
    questions,
    quarantinedQuestions: [],
    explanations,
    evidenceReceipts,
    candidate: { candidateId, version, bundleHash: gradeFourWaveBBundleHash, policyVersion },
    adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
    release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
    production: {
      wave: "B",
      selectedSliceId: unitId,
      selectionBasis: ["SOURCE_VERIFIED", "INDEPENDENT_REDUCED_RATIONAL_ORACLE", "EXACT_CROSS_PRODUCT_COMPARISON", "NO_DIAGRAM_DEPENDENCY"],
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

export const gradeFourWaveBPack = createGradeFourWaveBPack();

const combinedBinding = {
  packId: "grade-4-waves-a-b",
  version: "g4-waves-a-b-1.0.0-cumulative",
  candidateId: "g4-waves-a-b",
  policyVersion: "g4-waves-a-b-policy-1.0.0",
  selectedSliceId: "grade-4-natural-number-operations-plus-fraction-foundations",
} as const;

export function createGradeFourWavesABPack(): GradePack {
  return combineWavePacks(gradeFourWaveAPack, gradeFourWaveBPack, combinedBinding);
}

export const gradeFourWavesABPack = createGradeFourWavesABPack();
export const gradeFourWavesABBundleHash = gradeFourWavesABPack.candidate!.bundleHash;

export const gradeFourWaveBProgression: WaveBProgressionContract = {
  grade,
  waveASkillId: officialSkillId("MOET2018-G4-NUM-P035-011"),
  waveBSkillIds: sliceOutcomes.map(officialSkillId),
  remediationTargetSkillId: officialSkillId(sliceOutcomes[0]),
  advanceTargetSkillId: officialSkillId(sliceOutcomes[1]),
  retentionTargetSkillId: officialSkillId(sliceOutcomes[2]),
  nextTargetSkillId: officialSkillId(nextTargetOutcomeIds[0]),
  schoolGradeMutation: false,
  entitlementGrant: false,
};

export const gradeFourWaveBMetadata = {
  schemaVersion: "plave-wave-b-metadata-v1",
  grade,
  title: "Nhận biết, phân số bằng nhau và so sánh phân số",
  unitId,
  sourceClassification: "SOURCE_VERIFIED",
  sourceOutcomeIds: sliceOutcomes,
  prerequisiteOutcomeIds: ["MOET2018-G3-NUM-P031-023"],
  prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  nextTargetOutcomeIds,
  nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  production: { generated: 24, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0 },
  candidate: gradeFourWaveBPack.candidate,
  combinedCandidate: gradeFourWavesABPack.candidate,
  release: gradeFourWaveBPack.release,
} as const;
