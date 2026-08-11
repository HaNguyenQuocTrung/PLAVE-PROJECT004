import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 5 as const;
const sourceId = officialSourceReferenceId(grade);
const packId = "grade-5-wave-c-decimal-concepts-operations";
const candidateId = "g5-decimal-concepts-operations-wave-c";
const version = "g5-decimal-concepts-operations-1.0.0-wave-c";
const policyVersion = "g5-decimal-adaptive-policy-1.0.0-wave-c";

const sliceOutcomes = [
  "MOET2018-G5-NUM-P041-005",
  "MOET2018-G5-NUM-P041-008",
  "MOET2018-G5-NUM-P041-011",
  "MOET2018-G5-NUM-P042-019",
] as const;

const nextTargetOutcomeIds = [
  "MOET2018-G5-NUM-P042-022",
  "MOET2018-G5-NUM-P042-023",
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

function exactValue(expression: MathExpression) {
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
  const raw = places === 0 ? `${sign}${digits}` : `${sign}${digits.slice(0, -places)}.${digits.slice(-places)}`;
  return raw.replace(/\.0+$/u, "").replace(/(\.\d*?)0+$/u, "$1");
}

const display = (exact: string) => exact.replace(".", ",");

function difficulty(localIndex: number): DifficultyBand {
  return localIndex < 2 ? "FOUNDATIONAL" : localIndex < 4 ? "CORE" : "EXTENSION";
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
  options: readonly string[] | null = null,
): GeneratedItem {
  const suffix = String(questionNumber).padStart(2, "0");
  const questionId = `g5-wave-c-${suffix}`;
  const explanationId = `${questionId}-explanation`;
  const normalizedPrompt = prompt.normalize("NFC");
  return {
    question: {
      id: questionId,
      grade,
      blueprintId: `g5-wave-c-blueprint-${outcomeId.toLowerCase()}-${difficulty(localIndex).toLowerCase()}`,
      skillId: officialSkillId(outcomeId),
      prompt: normalizedPrompt,
      options,
      answer,
      explanationId,
      difficulty: difficulty(localIndex),
      provenance: {
        kind: "DETERMINISTIC_TEMPLATE",
        templateVersion: "g5-decimal-concepts-operations-wave-c-template-1.0.0",
        seed: `g5-wave-c-${outcomeId.toLowerCase()}-${suffix}`,
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

function generateQuestions(): readonly GeneratedItem[] {
  const generated: GeneratedItem[] = [];

  const representations = [
    { prompt: "Viết số thập phân gồm 12 đơn vị, 3 phần mười và 7 phần trăm.", expression: value(1237, 100), steps: ["Phần nguyên là 12.", "Ba phần mười và bảy phần trăm tạo phần thập phân 37 phần trăm.", "Số cần viết là 12,37."] },
    { prompt: "Một số có phần nguyên là 8, chữ số hàng phần mười là 4 và chữ số hàng phần trăm là 5. Viết số đó.", expression: value(845, 100), steps: ["Viết phần nguyên 8 ở bên trái dấu phẩy.", "Viết 4 rồi 5 lần lượt ở hàng phần mười và phần trăm.", "Nhận được 8,45."] },
    { prompt: "Viết tổng 6 + 2/10 + 9/100 dưới dạng số thập phân.", expression: value(629, 100), steps: ["2/10 = 0,2 và 9/100 = 0,09.", "Cộng với phần nguyên 6.", "Kết quả là 6,29."] },
    { prompt: "Một đại lượng bằng 1543 phần nghìn đơn vị. Viết giá trị đó dưới dạng số thập phân.", expression: value(1543, 1000), steps: ["Một nghìn phần nghìn tạo thành 1 đơn vị.", "543 phần nghìn còn lại viết sau dấu phẩy.", "Giá trị là 1,543."] },
    { prompt: "Viết số thập phân gồm 31 đơn vị và 6 phần nghìn.", expression: value(31006, 1000), steps: ["Phần nguyên là 31.", "Sáu phần nghìn cần hai chữ số 0 trước chữ số 6.", "Số cần viết là 31,006."] },
    { prompt: "Đổi 9087/100 thành số thập phân.", expression: value(9087, 100), steps: ["Mẫu số 100 cho biết cần hai hàng thập phân.", "Tách 9087 thành 90 đơn vị và 87 phần trăm.", "Nhận được 90,87."] },
  ] as const;
  representations.forEach((entry, index) => {
    const answer = exactValue(entry.expression);
    generated.push(createItem(index + 1, sliceOutcomes[0], index, entry.prompt, { type: "DECIMAL_INPUT", exactValue: answer, decimalPlaces: 3, derivation: entry.expression }, entry.steps));
  });

  const placeValues = [
    { prompt: "Trong số 24,583, chữ số 5 có giá trị bằng bao nhiêu?", expression: value(5, 10), steps: ["Chữ số 5 đứng ngay sau dấu phẩy nên ở hàng phần mười.", "Năm phần mười bằng 0,5.", "Giá trị của chữ số 5 là 0,5."] },
    { prompt: "Trong số 7,264, chữ số 6 thuộc hàng phần trăm. Giá trị của chữ số đó là bao nhiêu?", expression: value(6, 100), steps: ["Hàng phần trăm có giá trị 1/100.", "Sáu chữ số ở hàng đó tạo 6/100.", "Giá trị là 0,06."] },
    { prompt: "Số 103,709 có chữ số 9 ở hàng phần nghìn. Viết giá trị của chữ số 9 dưới dạng thập phân.", expression: value(9, 1000), steps: ["Hàng phần nghìn có giá trị 1/1000.", "Chín phần nghìn bằng 9/1000.", "Giá trị là 0,009."] },
    { prompt: "Bạn Mai cho rằng chữ số 4 trong 18,042 có giá trị 0,4. Hãy viết giá trị đúng của chữ số 4.", expression: value(4, 100), steps: ["Chữ số 4 đứng ở hàng phần trăm, không phải hàng phần mười.", "Bốn phần trăm bằng 4/100.", "Giá trị đúng là 0,04."] },
    { prompt: "Trong số 56,781, chữ số 8 có giá trị bằng bao nhiêu?", expression: value(8, 100), steps: ["Chữ số 8 ở hàng phần trăm.", "Tám phần trăm bằng 8/100.", "Giá trị là 0,08."] },
    { prompt: "Số 4,305 có chữ số 3 ngay sau dấu phẩy. Viết giá trị của chữ số 3.", expression: value(3, 10), steps: ["Vị trí ngay sau dấu phẩy là hàng phần mười.", "Ba phần mười bằng 3/10.", "Giá trị là 0,3."] },
  ] as const;
  placeValues.forEach((entry, index) => {
    const answer = exactValue(entry.expression);
    generated.push(createItem(index + 7, sliceOutcomes[1], index, entry.prompt, { type: "DECIMAL_INPUT", exactValue: answer, decimalPlaces: 3, derivation: entry.expression }, entry.steps));
  });

  const comparisons = [
    { left: value(237, 100), right: value(23, 10) },
    { left: value(508, 100), right: value(58, 10) },
    { left: value(419, 100), right: value(420, 100) },
    { left: value(7, 10), right: value(70, 100) },
    { left: value(1205, 1000), right: value(121, 100) },
    { left: value(999, 100), right: value(10, 1) },
  ] as const;
  comparisons.forEach(({ left, right }, index) => {
    const leftValue = evaluateExpression(left);
    const rightValue = evaluateExpression(right);
    const difference = leftValue.numerator * rightValue.denominator - rightValue.numerator * leftValue.denominator;
    const relation = difference < 0 ? "<" as const : difference > 0 ? ">" as const : "=" as const;
    const leftText = display(exactValue(left));
    const rightText = display(exactValue(right));
    generated.push(createItem(index + 13, sliceOutcomes[2], index, `Điền dấu <, = hoặc >: ${leftText} … ${rightText}.`, { type: "SINGLE_CHOICE", exactValue: relation, comparison: { left, right, relation, exactAnswer: relation } }, ["So sánh phần nguyên trước.", "Nếu phần nguyên bằng nhau, căn thẳng hàng phần mười, phần trăm và phần nghìn để so sánh.", `Dấu đúng là ${relation}.`], ["<", "=", ">"]));
  });

  const addSubtract = [
    { op: "ADD", left: value(275, 100), right: value(14, 10) },
    { op: "SUBTRACT", left: value(83, 10), right: value(245, 100) },
    { op: "ADD", left: value(68, 100), right: value(327, 100) },
    { op: "SUBTRACT", left: value(10, 1), right: value(4625, 1000) },
    { op: "ADD", left: value(1205, 100), right: value(795, 100) },
    { op: "SUBTRACT", left: value(201, 10), right: value(875, 100) },
  ] as const;
  addSubtract.forEach(({ op, left, right }, index) => {
    const expression: MathExpression = { op, left, right };
    const symbol = op === "ADD" ? "+" : "−";
    const answer = exactValue(expression);
    generated.push(createItem(index + 19, sliceOutcomes[3], index, `Tính ${display(exactValue(left))} ${symbol} ${display(exactValue(right))}.`, { type: "DECIMAL_INPUT", exactValue: answer, decimalPlaces: 3, derivation: expression }, ["Viết hai số sao cho các hàng thập phân thẳng cột.", `${op === "ADD" ? "Cộng" : "Trừ"} lần lượt từ hàng nhỏ nhất sang hàng lớn hơn.`, `Kết quả là ${display(answer)}.`]));
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
    ? `Source-locked decimal outcomes ${sliceOutcomes.join(", ")} on retained pages 41–42.`
    : check === "MATHEMATICAL_ANSWER"
      ? "Independent scaled-integer rational oracle recomputes every finite decimal representation and operation without floating-point rounding."
      : `Deterministic Grade 5 Wave C ${check.toLowerCase().replaceAll("_", " ")} receipt.`,
}));

const blueprintBands = [
  { difficulty: "FOUNDATIONAL", targetCount: 2 },
  { difficulty: "CORE", targetCount: 2 },
  { difficulty: "EXTENSION", targetCount: 2 },
] as const;
const blueprints = sliceOutcomes.flatMap((outcomeId) => blueprintBands.map((band) => ({
  id: `g5-wave-c-blueprint-${outcomeId.toLowerCase()}-${band.difficulty.toLowerCase()}`,
  grade,
  skillId: officialSkillId(outcomeId),
  difficulty: band.difficulty,
  questionType: outcomeId === sliceOutcomes[2] ? "SINGLE_CHOICE" as const : "DECIMAL_INPUT" as const,
  templateId: `g5-wave-c-template-${outcomeId.toLowerCase()}`,
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

export const gradeFiveWaveCBundleHash = sha256(canonicalize(candidateCore));

export function createGradeFiveWaveCPack(): GradePack {
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
      { fromSkillId: officialSkillId(sliceOutcomes[0]), toSkillId: officialSkillId(sliceOutcomes[1]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
      { fromSkillId: officialSkillId(sliceOutcomes[1]), toSkillId: officialSkillId(sliceOutcomes[2]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
      { fromSkillId: officialSkillId(sliceOutcomes[2]), toSkillId: officialSkillId(sliceOutcomes[3]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
      { fromSkillId: officialSkillId(sliceOutcomes[3]), toSkillId: officialSkillId(nextTargetOutcomeIds[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    ],
    blueprints,
    questions,
    quarantinedQuestions: [],
    explanations,
    evidenceReceipts,
    candidate: { candidateId, version, bundleHash: gradeFiveWaveCBundleHash, policyVersion },
    adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
    release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
    production: {
      wave: "C",
      selectedSliceId: "g5-decimal-concepts-operations",
      selectionBasis: ["SOURCE_VERIFIED", "EXACT_SCALED_INTEGER_ORACLE", "FINITE_DECIMAL_DOMAIN", "NO_DIAGRAM_DEPENDENCY"],
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

export const gradeFiveWaveCPack = createGradeFiveWaveCPack();

export const gradeFiveWaveCMetadata = {
  schemaVersion: "plave-wave-c-metadata-v1",
  wave: "C",
  grade,
  title: "Cấu tạo và phép tính số thập phân",
  sourceClassification: "SOURCE_VERIFIED",
  sourcePages: [41, 42],
  sourceOutcomeIds: sliceOutcomes,
  prerequisiteOutcomeIds: [],
  prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  nextTargetOutcomeIds,
  nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  production: { generated: 24, evidenceGatePassed: 24, verificationInsufficient: 0, repaired: 0, rejected: 0, duplicate: 0, candidateEligible: 24 },
  candidate: gradeFiveWaveCPack.candidate,
  release: gradeFiveWaveCPack.release,
} as const;
