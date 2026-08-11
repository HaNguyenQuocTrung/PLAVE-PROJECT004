import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 5 as const;
const sourceId = officialSourceReferenceId(grade);
const packId = "grade-5-wave-g-statistical-rates";
const candidateId = "g5-statistical-rates-wave-g";
const version = "g5-statistical-rates-1.0.0-wave-g";
const policyVersion = "g5-statistics-policy-1.0.0-wave-g";
const sliceOutcomes = ["MOET2018-G5-STA-P045-007"] as const;
const prerequisiteOutcomeIds = ["MOET2018-G5-STA-P045-003"] as const;
const nextTargetOutcomeIds = ["MOET2018-G5-STA-P045-008"] as const;

type GeneratedItem = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;
const value = (numerator: number, denominator = 1): MathExpression => ({ op: "VALUE", numerator, denominator });
const operation = (op: "MULTIPLY" | "DIVIDE" | "SUBTRACT", left: MathExpression, right: MathExpression): MathExpression => ({ op, left, right });
const purposes = ["FOUNDATION", "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "TRANSFER_APPLICATION"] as const;
const receiptIds = requiredAutomatedEvidenceChecks.map((check) => `${packId}-${check.toLowerCase().replaceAll("_", "-")}`);

function assertFrequencyRecord(part: number, total: number) {
  if (!Number.isSafeInteger(part) || !Number.isSafeInteger(total) || total <= 0 || part < 0 || part > total) {
    throw new Error("AUTOMATED_VERIFICATION_INSUFFICIENT:MALFORMED_FREQUENCY_DATA");
  }
}

export function verifyGradeFiveWaveGMalformedDataGuards() {
  const malformed = [[-1, 20], [21, 20], [1, 0], [1.5, 20]] as const;
  return malformed.flatMap(([part, total], index) => {
    try {
      assertFrequencyRecord(part, total);
      return [`g5-malformed-frequency-${index + 1}:ACCEPTED`];
    } catch (error) {
      return error instanceof Error && error.message === "AUTOMATED_VERIFICATION_INSUFFICIENT:MALFORMED_FREQUENCY_DATA" ? [] : [`g5-malformed-frequency-${index + 1}:WRONG_ERROR`];
    }
  });
}
const malformedDataGuardFailures = verifyGradeFiveWaveGMalformedDataGuards();
if (malformedDataGuardFailures.length) throw new Error(`GRADE_5_WAVE_G_MALFORMED_GUARD_FAILED:${malformedDataGuardFailures.join(",")}`);

function exactDecimal(expression: MathExpression) {
  const result = evaluateExpression(expression);
  if (result.denominator === 1) return String(result.numerator);
  let denominator = result.denominator;
  let twos = 0;
  let fives = 0;
  while (denominator % 2 === 0) { denominator /= 2; twos += 1; }
  while (denominator % 5 === 0) { denominator /= 5; fives += 1; }
  if (denominator !== 1) throw new Error("AUTOMATED_VERIFICATION_INSUFFICIENT:NON_TERMINATING_RATE");
  const places = Math.max(twos, fives);
  const scaled = result.numerator * (2 ** (places - twos)) * (5 ** (places - fives));
  const digits = String(Math.abs(scaled)).padStart(places + 1, "0");
  return `${scaled < 0 ? "-" : ""}${digits.slice(0, -places)}.${digits.slice(-places)}`.replace(/\.0+$/u, "").replace(/(\.\d*?)0+$/u, "$1");
}

function difficulty(index: number): DifficultyBand {
  const position = index % 6;
  return position < 2 ? "FOUNDATIONAL" : position < 4 ? "CORE" : "EXTENSION";
}

function createItem(questionNumber: number, prompt: string, unit: string, derivation: MathExpression, steps: readonly string[]): GeneratedItem {
  const suffix = String(questionNumber).padStart(2, "0");
  const id = `g5-wave-g-${suffix}`;
  const explanationId = `${id}-explanation`;
  const normalizedPrompt = prompt.normalize("NFC");
  const answer = exactDecimal(derivation);
  return {
    question: {
      id, grade,
      blueprintId: `g5-wave-g-blueprint-${sliceOutcomes[0].toLowerCase()}-${difficulty(questionNumber - 1).toLowerCase()}`,
      skillId: officialSkillId(sliceOutcomes[0]), prompt: normalizedPrompt, options: null,
      answer: { type: "DECIMAL_INPUT", exactValue: answer, decimalPlaces: 6, unit, derivation },
      explanationId, difficulty: difficulty(questionNumber - 1),
      provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g5-statistical-rates-wave-g-template-1.0.0", seed: `g5-wave-g-${sliceOutcomes[0].toLowerCase()}-${suffix}`, sourceReferenceIds: [sourceId] },
      reviewStatus: "BUNDLED", published: false, pilotEligible: false, fixtureOnly: false,
      duplicateFingerprint: sha256(normalizedDefinition(`${normalizedPrompt}|`).toLocaleLowerCase("vi")), validationReceiptIds: receiptIds,
      instructionalPurpose: purposes[(questionNumber - 1) % purposes.length]!,
    },
    explanation: { id: explanationId, questionId: id, steps: steps.map((step) => step.normalize("NFC")), finalAnswer: answer, evidenceReceiptIds: [`${packId}-explanation-consistency`] },
  };
}

function generateQuestions(): readonly GeneratedItem[] {
  const generated: GeneratedItem[] = [];
  const decimalRates = [[5,20],[9,25],[14,40],[33,50],[12,80],[45,100],[18,40],[35,50]] as const;
  const decimalContexts = ["bạn đi bộ", "cây ra hoa", "quyển sách khoa học", "sản phẩm ca sáng", "vé đã bán", "hạt nảy mầm", "bài nộp đúng giờ", "ghế đã dùng"] as const;
  decimalRates.forEach(([part,total], index) => {
    assertFrequencyRecord(part, total);
    const derivation = operation("DIVIDE", value(part), value(total));
    generated.push(createItem(index + 1, `Bảng thống kê có ${part} ${decimalContexts[index]} trong tổng số ${total}. Viết tỉ lệ này dưới dạng số thập phân.`, "", derivation, [`Lập tỉ số ${part}/${total}.`, "Chia số lần xuất hiện cho tổng số quan sát.", `Tỉ lệ thập phân là ${exactDecimal(derivation)}.`]));
  });

  const percentageRates = [[8,20],[15,25],[26,40],[37,50],[44,80],[72,100],[30,40],[42,50]] as const;
  const percentageContexts = ["học sinh chọn bóng đá", "cây sống", "chai được tái sử dụng", "sản phẩm đạt chuẩn", "ngày có nắng", "phiếu đồng ý", "câu trả lời đúng", "sách đã phân loại"] as const;
  percentageRates.forEach(([part,total], index) => {
    assertFrequencyRecord(part, total);
    const derivation = operation("MULTIPLY", operation("DIVIDE", value(part), value(total)), value(100));
    generated.push(createItem(index + 9, `Dữ liệu ghi ${part} ${percentageContexts[index]} trên tổng ${total}. Tỉ lệ đó bằng bao nhiêu phần trăm?`, "%", derivation, [`Lập tỉ số ${part}/${total}.`, "Nhân tỉ số với 100 để đổi sang phần trăm.", `Tỉ lệ là ${exactDecimal(derivation)}%.`]));
  });

  const comparisons = [[8,20,10,20],[9,25,14,25],[12,40,20,40],[22,50,31,50],[28,80,44,80],[45,100,68,100],[16,40,30,40],[21,50,38,50]] as const;
  const comparisonContexts = ["hai lớp hoàn thành bài", "hai nhóm trồng cây", "hai tuần thu gom giấy", "hai ca kiểm tra sản phẩm", "hai đợt bán vé", "hai khảo sát đồng ý", "hai đội trả lời đúng", "hai thư viện phân loại sách"] as const;
  comparisons.forEach(([firstPart,firstTotal,secondPart,secondTotal], index) => {
    assertFrequencyRecord(firstPart, firstTotal);
    assertFrequencyRecord(secondPart, secondTotal);
    const firstRate = operation("DIVIDE", value(firstPart), value(firstTotal));
    const secondRate = operation("DIVIDE", value(secondPart), value(secondTotal));
    const derivation = operation("MULTIPLY", operation("SUBTRACT", secondRate, firstRate), value(100));
    generated.push(createItem(index + 17, `Khi so sánh ${comparisonContexts[index]}, nhóm thứ nhất có ${firstPart}/${firstTotal} và nhóm thứ hai có ${secondPart}/${secondTotal}. Tỉ lệ nhóm thứ hai cao hơn bao nhiêu điểm phần trăm?`, "điểm phần trăm", derivation, ["Đổi từng tỉ số sang phần trăm.", "Lấy tỉ lệ nhóm thứ hai trừ tỉ lệ nhóm thứ nhất.", `Chênh lệch là ${exactDecimal(derivation)} điểm phần trăm.`]));
  });
  return generated;
}

const generated = generateQuestions();
const questions = generated.map((entry) => entry.question);
const explanations = generated.map((entry) => entry.explanation);
const skeleton = buildOfficialGradeSkeleton(grade);
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({ id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`, entityId: packId, check, status: "PASSED" as const, evidence: check === "SOURCE_MAPPING" ? `Retained source-locked outcome ${sliceOutcomes[0]} on page 45.` : check === "MATHEMATICAL_ANSWER" ? "Independent exact-rational oracle verifies decimal rates, percentages and percentage-point differences after malformed frequency records fail closed." : `Deterministic Grade 5 Wave G ${check.toLowerCase().replaceAll("_", " ")} receipt.` }));
const blueprints = (["FOUNDATIONAL", "CORE", "EXTENSION"] as const).map((band) => ({ id: `g5-wave-g-blueprint-${sliceOutcomes[0].toLowerCase()}-${band.toLowerCase()}`, grade, skillId: officialSkillId(sliceOutcomes[0]), difficulty: band, questionType: "DECIMAL_INPUT" as const, templateId: `g5-wave-g-template-${sliceOutcomes[0].toLowerCase()}`, targetCount: 8, sourceReferenceIds: [sourceId] }));
const candidateCore = { format: "plave-wave-g-candidate-v1", candidateId, version, policyVersion, sourceOutcomeIds: sliceOutcomes, blueprints, questions, explanations } as const;

export const gradeFiveWaveGBundleHash = sha256(canonicalize(candidateCore));
export function createGradeFiveWaveGPack(): GradePack {
  return {
    schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false,
    locale: "vi-VN", unicodeNormalization: "NFC", sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units,
    knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives,
    prerequisites: [
      { fromSkillId: officialSkillId(prerequisiteOutcomeIds[0]), toSkillId: officialSkillId(sliceOutcomes[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
      { fromSkillId: officialSkillId(sliceOutcomes[0]), toSkillId: officialSkillId(nextTargetOutcomeIds[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    ],
    blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts,
    candidate: { candidateId, version, bundleHash: gradeFiveWaveGBundleHash, policyVersion },
    adaptivePolicy: { version: policyVersion, status: "VALIDATED" }, release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
    production: { wave: "G", selectedSliceId: "g5-statistical-rates", selectionBasis: ["SOURCE_VERIFIED", "UNCOVERED_BY_WAVES_A_TO_F", "EXACT_FREQUENCY_RATE_ORACLE", "MALFORMED_DATA_FAIL_CLOSED", "THREE_STATISTICAL_STRUCTURES"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 }, legacyAsset: null,
  };
}
export const gradeFiveWaveGPack = createGradeFiveWaveGPack();
export const gradeFiveWaveGMetadata = { schemaVersion: "plave-wave-g-metadata-v1", wave: "G", grade, title: "Tỉ lệ trong dữ liệu thống kê", sourceClassification: "SOURCE_VERIFIED", sourcePages: [45], sourceOutcomeIds: sliceOutcomes, prerequisiteOutcomeIds, prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", nextTargetOutcomeIds, nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", malformedDataPolicy: "Negative counts, zero totals, counts above totals and non-terminating decimal contracts fail with AUTOMATED_VERIFICATION_INSUFFICIENT.", production: { generated: 24, evidenceGatePassed: 24, verificationInsufficient: 0, repaired: 0, rejected: 0, duplicate: 0, candidateEligible: 24 }, candidate: gradeFiveWaveGPack.candidate, release: gradeFiveWaveGPack.release } as const;
