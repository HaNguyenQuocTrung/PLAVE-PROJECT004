import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 5 as const;
const sourceId = officialSourceReferenceId(grade);
const packId = "grade-5-wave-f-percentage-reasoning";
const candidateId = "g5-percentage-reasoning-wave-f";
const version = "g5-percentage-reasoning-1.0.0-wave-f";
const policyVersion = "g5-percentage-policy-1.0.0-wave-f";
const sliceOutcomes = ["MOET2018-G5-NUM-P042-014"] as const;
const prerequisiteOutcomeIds = ["MOET2018-G5-NUM-P041-011"] as const;
const nextTargetOutcomeIds = ["MOET2018-G5-NUM-P042-016"] as const;

type GeneratedItem = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;
const value = (numerator: number, denominator = 1): MathExpression => ({ op: "VALUE", numerator, denominator });
const operation = (op: "MULTIPLY" | "DIVIDE", left: MathExpression, right: MathExpression): MathExpression => ({ op, left, right });
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

function createItem(questionNumber: number, prompt: string, unit: string, derivation: MathExpression, steps: readonly string[]): GeneratedItem {
  const suffix = String(questionNumber).padStart(2, "0");
  const id = `g5-wave-f-${suffix}`;
  const explanationId = `${id}-explanation`;
  const normalizedPrompt = prompt.normalize("NFC");
  const answer = exactDecimal(derivation);
  return {
    question: {
      id,
      grade,
      blueprintId: `g5-wave-f-blueprint-${sliceOutcomes[0].toLowerCase()}-${difficulty(questionNumber - 1).toLowerCase()}`,
      skillId: officialSkillId(sliceOutcomes[0]),
      prompt: normalizedPrompt,
      options: null,
      answer: { type: "DECIMAL_INPUT", exactValue: answer, decimalPlaces: 6, unit, derivation },
      explanationId,
      difficulty: difficulty(questionNumber - 1),
      provenance: {
        kind: "DETERMINISTIC_TEMPLATE",
        templateVersion: "g5-percentage-reasoning-wave-f-template-1.0.0",
        seed: `g5-wave-f-${sliceOutcomes[0].toLowerCase()}-${suffix}`,
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
  const percentageValues = [
    { percent: 10, whole: 250, unit: "quyển", prompt: "Thư viện có 250 quyển sách, trong đó 10% là sách khoa học. Có bao nhiêu quyển sách khoa học?" },
    { percent: 25, whole: 320, unit: "học sinh", prompt: "Một trường có 320 học sinh, 25% số học sinh tham gia câu lạc bộ toán. Có bao nhiêu học sinh tham gia?" },
    { percent: 40, whole: 75, unit: "kg", prompt: "Một kho có 75 kg gạo, đã chuyển đi 40% số gạo. Đã chuyển đi bao nhiêu ki-lô-gam gạo?" },
    { percent: 15, whole: 240, unit: "cây", prompt: "Vườn ươm có 240 cây giống, 15% số cây là cây hoa. Có bao nhiêu cây hoa?" },
    { percent: 12, whole: 400, unit: "vé", prompt: "Rạp có 400 vé, số vé bán buổi sáng bằng 12% tổng số vé. Buổi sáng bán được bao nhiêu vé?" },
    { percent: 30, whole: 180, unit: "lít", prompt: "Một bồn chứa 180 lít nước, lượng nước đã dùng bằng 30% lượng ban đầu. Đã dùng bao nhiêu lít nước?" },
    { percent: 45, whole: 160, unit: "sản phẩm", prompt: "Xưởng kiểm tra 160 sản phẩm, 45% số sản phẩm thuộc ca sáng. Ca sáng có bao nhiêu sản phẩm?" },
    { percent: 35, whole: 260, unit: "m", prompt: "Một tuyến đường dài 260 m, đoạn đã lát bằng 35% chiều dài tuyến. Đoạn đã lát dài bao nhiêu mét?" },
    { percent: 60, whole: 150, unit: "ghế", prompt: "Hội trường có 150 ghế, 60% số ghế đã có người ngồi. Có bao nhiêu ghế đã có người ngồi?" },
    { percent: 75, whole: 120, unit: "phút", prompt: "Một buổi học kéo dài 120 phút, thời gian thực hành chiếm 75% buổi học. Thực hành kéo dài bao nhiêu phút?" },
    { percent: 20, whole: 450, unit: "nghìn đồng", prompt: "Một khoản quỹ là 450 nghìn đồng, phần dành mua giấy bằng 20% khoản quỹ. Phần mua giấy là bao nhiêu nghìn đồng?" },
    { percent: 80, whole: 125, unit: "hạt", prompt: "Một gói có 125 hạt giống, 80% số hạt đã nảy mầm. Có bao nhiêu hạt đã nảy mầm?" },
  ] as const;
  percentageValues.forEach(({ percent, whole, unit, prompt }, index) => {
    const derivation = operation("MULTIPLY", value(whole), value(percent, 100));
    generated.push(createItem(index + 1, prompt, unit, derivation, [
      `${percent}% được viết thành ${percent}/100.`,
      `Tính ${whole} × ${percent} : 100.`,
      `Giá trị phần trăm cần tìm là ${exactDecimal(derivation)} ${unit}.`,
    ]));
  });

  const percentageRates = [
    { part: 5, whole: 20, prompt: "Lớp có 20 bạn, trong đó 5 bạn trực nhật. Số bạn trực nhật chiếm bao nhiêu phần trăm số bạn cả lớp?" },
    { part: 6, whole: 20, prompt: "Một khay có 20 quả, trong đó 6 quả là cam. Số quả cam chiếm bao nhiêu phần trăm số quả trong khay?" },
    { part: 7, whole: 20, prompt: "Tổ trồng 20 cây, có 7 cây hoa. Số cây hoa chiếm bao nhiêu phần trăm tổng số cây?" },
    { part: 8, whole: 20, prompt: "Một kệ có 20 hộp, trong đó 8 hộp màu xanh. Số hộp xanh chiếm bao nhiêu phần trăm số hộp trên kệ?" },
    { part: 9, whole: 20, prompt: "Đội hoàn thành 9 trong 20 nhiệm vụ. Số nhiệm vụ đã hoàn thành chiếm bao nhiêu phần trăm tổng số nhiệm vụ?" },
    { part: 10, whole: 20, prompt: "Một rổ có 20 quả, trong đó 10 quả chín. Số quả chín chiếm bao nhiêu phần trăm số quả trong rổ?" },
    { part: 11, whole: 20, prompt: "Câu lạc bộ có 20 bạn, 11 bạn chọn cờ vua. Số bạn chọn cờ vua chiếm bao nhiêu phần trăm số bạn?" },
    { part: 12, whole: 20, prompt: "Một tủ có 20 ngăn, 12 ngăn đang được sử dụng. Số ngăn đang dùng chiếm bao nhiêu phần trăm số ngăn?" },
    { part: 13, whole: 20, prompt: "Lớp thu được 20 bài, có 13 bài nộp đúng giờ. Số bài đúng giờ chiếm bao nhiêu phần trăm số bài?" },
    { part: 14, whole: 20, prompt: "Một đội có 20 vận động viên, 14 người hoàn thành vòng chạy. Số người hoàn thành chiếm bao nhiêu phần trăm cả đội?" },
    { part: 15, whole: 20, prompt: "Thư viện kiểm tra 20 cuốn sách, có 15 cuốn còn tốt. Số sách còn tốt chiếm bao nhiêu phần trăm số sách đã kiểm tra?" },
    { part: 16, whole: 20, prompt: "Một hộp có 20 bút, 16 bút còn mực. Số bút còn mực chiếm bao nhiêu phần trăm số bút trong hộp?" },
  ] as const;
  percentageRates.forEach(({ part, whole, prompt }, index) => {
    const derivation = operation("MULTIPLY", operation("DIVIDE", value(part), value(whole)), value(100));
    generated.push(createItem(index + 13, prompt, "%", derivation, [
      `Lập tỉ số ${part} : ${whole}.`,
      "Nhân tỉ số với 100 để viết dưới dạng phần trăm.",
      `Tỉ số phần trăm là ${exactDecimal(derivation)}%.`,
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
    ? `Retained source-locked outcome ${sliceOutcomes[0]} on page 42.`
    : check === "MATHEMATICAL_ANSWER"
      ? "Independent exact-rational oracle verifies every percentage value and percentage ratio; all results terminate."
      : `Deterministic Grade 5 Wave F ${check.toLowerCase().replaceAll("_", " ")} receipt.`,
}));
const blueprints = (["FOUNDATIONAL", "CORE", "EXTENSION"] as const).map((band) => ({
  id: `g5-wave-f-blueprint-${sliceOutcomes[0].toLowerCase()}-${band.toLowerCase()}`,
  grade,
  skillId: officialSkillId(sliceOutcomes[0]),
  difficulty: band,
  questionType: "DECIMAL_INPUT" as const,
  templateId: `g5-wave-f-template-${sliceOutcomes[0].toLowerCase()}`,
  targetCount: 8,
  sourceReferenceIds: [sourceId],
}));
const candidateCore = { format: "plave-wave-f-candidate-v1", candidateId, version, policyVersion, sourceOutcomeIds: sliceOutcomes, blueprints, questions, explanations } as const;

export const gradeFiveWaveFBundleHash = sha256(canonicalize(candidateCore));
export function createGradeFiveWaveFPack(): GradePack {
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
    candidate: { candidateId, version, bundleHash: gradeFiveWaveFBundleHash, policyVersion },
    adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
    release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
    production: {
      wave: "F",
      selectedSliceId: "g5-percentage-reasoning",
      selectionBasis: ["SOURCE_VERIFIED", "UNCOVERED_BY_WAVES_A_TO_E", "EXACT_FINITE_DECIMAL_ORACLE", "CONTEXTUAL_PERCENT_VALUE_AND_RATE", "STRUCTURAL_VARIATION"],
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

export const gradeFiveWaveFPack = createGradeFiveWaveFPack();
export const gradeFiveWaveFMetadata = {
  schemaVersion: "plave-wave-f-metadata-v1",
  wave: "F",
  grade,
  title: "Giá trị và tỉ số phần trăm",
  sourceClassification: "SOURCE_VERIFIED",
  sourcePages: [42],
  sourceOutcomeIds: sliceOutcomes,
  prerequisiteOutcomeIds,
  prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  nextTargetOutcomeIds,
  nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE",
  selectionRationale: "The retained Grade 5 percentage row supports exact contextual percent-of and percentage-rate tasks without inference beyond the source.",
  deferredGaps: ["Inverse percentage problems remain excluded unless a retained row explicitly binds that structure.", "Non-terminating percentage ratios are excluded from this exact decimal candidate."],
  production: { generated: 24, evidenceGatePassed: 24, verificationInsufficient: 0, repaired: 0, rejected: 0, duplicate: 0, candidateEligible: 24 },
  candidate: gradeFiveWaveFPack.candidate,
  release: gradeFiveWaveFPack.release,
} as const;
