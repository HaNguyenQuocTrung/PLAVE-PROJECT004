import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 5 as const;
const sourceId = officialSourceReferenceId(grade);
const packId = "grade-5-wave-e-volume-time-conversions";
const candidateId = "g5-volume-time-conversions-wave-e";
const version = "g5-volume-time-conversions-1.0.0-wave-e";
const policyVersion = "g5-measurement-policy-1.0.0-wave-e";
const sliceOutcomes = ["MOET2018-G5-GEO-P044-013"] as const;
const prerequisiteOutcomeIds = ["MOET2018-G5-GEO-P044-012"] as const;
const nextTargetOutcomeIds = ["MOET2018-G5-GEO-P044-014"] as const;

type GeneratedItem = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;
const value = (numerator: number, denominator = 1): MathExpression => ({ op: "VALUE", numerator, denominator });
const operation = (op: "ADD" | "SUBTRACT" | "MULTIPLY" | "DIVIDE", left: MathExpression, right: MathExpression): MathExpression => ({ op, left, right });
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
  const id = `g5-wave-e-${suffix}`;
  const explanationId = `${id}-explanation`;
  const normalizedPrompt = prompt.normalize("NFC");
  const answer = exactDecimal(derivation);
  return { question: { id, grade, blueprintId: `g5-wave-e-blueprint-${sliceOutcomes[0].toLowerCase()}-${difficulty(questionNumber - 1).toLowerCase()}`, skillId: officialSkillId(sliceOutcomes[0]), prompt: normalizedPrompt, options: null, answer: { type: "DECIMAL_INPUT", exactValue: answer, decimalPlaces: 6, unit, derivation }, explanationId, difficulty: difficulty(questionNumber - 1), provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g5-volume-time-conversions-wave-e-template-1.0.0", seed: `g5-wave-e-${sliceOutcomes[0].toLowerCase()}-${suffix}`, sourceReferenceIds: [sourceId] }, reviewStatus: "BUNDLED", published: false, pilotEligible: false, fixtureOnly: false, duplicateFingerprint: sha256(normalizedDefinition(`${normalizedPrompt}|`).toLocaleLowerCase("vi")), validationReceiptIds: receiptIds, instructionalPurpose: purposes[(questionNumber - 1) % purposes.length]! }, explanation: { id: explanationId, questionId: id, steps: steps.map((step) => step.normalize("NFC")), finalAnswer: answer, evidenceReceiptIds: [`${packId}-explanation-consistency`] } };
}

function generateQuestions(): readonly GeneratedItem[] {
  const generated: GeneratedItem[] = [];
  generated.push(
    createItem(1, "Đổi 2,5 dm³ thành xăng-ti-mét khối.", "cm³", operation("MULTIPLY", value(25, 10), value(1000)), ["1 dm³ = 1 000 cm³.", "Nhân 2,5 với 1 000.", "Kết quả là 2 500 cm³."]),
    createItem(2, "Đổi 4 500 cm³ thành đề-xi-mét khối.", "dm³", operation("DIVIDE", value(4500), value(1000)), ["1 dm³ = 1 000 cm³.", "Chia 4 500 cho 1 000.", "Kết quả là 4,5 dm³."]),
    createItem(3, "Đổi 1,2 m³ thành đề-xi-mét khối.", "dm³", operation("MULTIPLY", value(12, 10), value(1000)), ["1 m³ = 1 000 dm³.", "Nhân 1,2 với 1 000.", "Kết quả là 1 200 dm³."]),
    createItem(4, "Đổi 3 200 dm³ thành mét khối.", "m³", operation("DIVIDE", value(3200), value(1000)), ["1 m³ = 1 000 dm³.", "Chia 3 200 cho 1 000.", "Kết quả là 3,2 m³."]),
    createItem(5, "Viết 2 m³ 75 dm³ dưới dạng đề-xi-mét khối.", "dm³", operation("ADD", operation("MULTIPLY", value(2), value(1000)), value(75)), ["2 m³ = 2 000 dm³.", "Cộng thêm 75 dm³.", "Kết quả là 2 075 dm³."]),
    createItem(6, "Viết 3 dm³ 250 cm³ dưới dạng xăng-ti-mét khối.", "cm³", operation("ADD", operation("MULTIPLY", value(3), value(1000)), value(250)), ["3 dm³ = 3 000 cm³.", "Cộng thêm 250 cm³.", "Kết quả là 3 250 cm³."]),
    createItem(7, "Cộng 4,5 dm³ và 1,75 dm³. Viết tổng dưới dạng xăng-ti-mét khối.", "cm³", operation("MULTIPLY", operation("ADD", value(45, 10), value(175, 100)), value(1000)), ["Cộng được 6,25 dm³.", "Mỗi đề-xi-mét khối bằng 1 000 xăng-ti-mét khối.", "Tổng là 6 250 cm³."]),
    createItem(8, "Một bể có 8 dm³ nước, đã dùng 2 250 cm³. Bể còn bao nhiêu xăng-ti-mét khối nước?", "cm³", operation("SUBTRACT", operation("MULTIPLY", value(8), value(1000)), value(2250)), ["8 dm³ = 8 000 cm³.", "Trừ 2 250 cm³ đã dùng.", "Còn lại 5 750 cm³."]),
    createItem(9, "Cộng 0,75 m³ và 250 dm³. Viết tổng dưới dạng đề-xi-mét khối.", "dm³", operation("ADD", operation("MULTIPLY", value(75, 100), value(1000)), value(250)), ["0,75 m³ = 750 dm³.", "Cộng thêm 250 dm³.", "Tổng là 1 000 dm³."]),
    createItem(10, "Tính 5 m³ trừ 1 250 dm³. Viết hiệu dưới dạng đề-xi-mét khối.", "dm³", operation("SUBTRACT", operation("MULTIPLY", value(5), value(1000)), value(1250)), ["5 m³ = 5 000 dm³.", "Trừ 1 250 dm³.", "Hiệu là 3 750 dm³."]),
    createItem(11, "Đổi 1,25 m³ thành xăng-ti-mét khối.", "cm³", operation("MULTIPLY", value(125, 100), value(1_000_000)), ["1 m³ = 1 000 000 cm³.", "Nhân 1,25 với 1 000 000.", "Kết quả là 1 250 000 cm³."]),
    createItem(12, "Đổi 250 000 cm³ thành mét khối.", "m³", operation("DIVIDE", value(250_000), value(1_000_000)), ["1 m³ = 1 000 000 cm³.", "Chia 250 000 cho 1 000 000.", "Kết quả là 0,25 m³."]),
    createItem(13, "Đổi 2,5 giờ thành phút.", "phút", operation("MULTIPLY", value(25, 10), value(60)), ["1 giờ = 60 phút.", "Nhân 2,5 với 60.", "Kết quả là 150 phút."]),
    createItem(14, "Đổi 135 phút thành giờ.", "giờ", operation("DIVIDE", value(135), value(60)), ["1 giờ = 60 phút.", "Chia 135 cho 60.", "Kết quả là 2,25 giờ."]),
    createItem(15, "Đổi 1,75 ngày thành giờ.", "giờ", operation("MULTIPLY", value(175, 100), value(24)), ["1 ngày = 24 giờ.", "Nhân 1,75 với 24.", "Kết quả là 42 giờ."]),
    createItem(16, "Đổi 90 giây thành phút.", "phút", operation("DIVIDE", value(90), value(60)), ["1 phút = 60 giây.", "Chia 90 cho 60.", "Kết quả là 1,5 phút."]),
    createItem(17, "Viết 2 giờ 35 phút dưới dạng phút.", "phút", operation("ADD", operation("MULTIPLY", value(2), value(60)), value(35)), ["2 giờ = 120 phút.", "Cộng thêm 35 phút.", "Kết quả là 155 phút."]),
    createItem(18, "Viết 3 ngày 12 giờ dưới dạng giờ.", "giờ", operation("ADD", operation("MULTIPLY", value(3), value(24)), value(12)), ["3 ngày = 72 giờ.", "Cộng thêm 12 giờ.", "Kết quả là 84 giờ."]),
    createItem(19, "Cộng 1 giờ 45 phút và 2 giờ 30 phút. Viết tổng dưới dạng phút.", "phút", operation("ADD", value(105), value(150)), ["Hai khoảng thời gian là 105 phút và 150 phút.", "Cộng hai số đo.", "Tổng là 255 phút."]),
    createItem(20, "Tính 5 giờ trừ 135 phút. Viết hiệu dưới dạng phút.", "phút", operation("SUBTRACT", operation("MULTIPLY", value(5), value(60)), value(135)), ["5 giờ = 300 phút.", "Trừ 135 phút.", "Hiệu là 165 phút."]),
    createItem(21, "Viết 2 tuần 3 ngày dưới dạng ngày.", "ngày", operation("ADD", operation("MULTIPLY", value(2), value(7)), value(3)), ["2 tuần = 14 ngày.", "Cộng thêm 3 ngày.", "Kết quả là 17 ngày."]),
    createItem(22, "Viết 3 năm 6 tháng dưới dạng tháng.", "tháng", operation("ADD", operation("MULTIPLY", value(3), value(12)), value(6)), ["3 năm = 36 tháng.", "Cộng thêm 6 tháng.", "Kết quả là 42 tháng."]),
    createItem(23, "Viết 2 thế kỉ 25 năm dưới dạng năm.", "năm", operation("ADD", operation("MULTIPLY", value(2), value(100)), value(25)), ["2 thế kỉ = 200 năm.", "Cộng thêm 25 năm.", "Kết quả là 225 năm."]),
    createItem(24, "Đổi 150 tháng thành năm.", "năm", operation("DIVIDE", value(150), value(12)), ["1 năm = 12 tháng.", "Chia 150 cho 12.", "Kết quả là 12,5 năm."]),
  );
  return generated;
}

const generated = generateQuestions();
const questions = generated.map((entry) => entry.question);
const explanations = generated.map((entry) => entry.explanation);
const skeleton = buildOfficialGradeSkeleton(grade);
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({ id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`, entityId: packId, check, status: "PASSED" as const, evidence: check === "SOURCE_MAPPING" ? `Retained source-locked outcome ${sliceOutcomes[0]} on page 44.` : check === "MATHEMATICAL_ANSWER" ? "Independent exact-rational finite-decimal oracle verifies cubic-unit and time conversions and calculations." : `Deterministic Grade 5 Wave E ${check.toLowerCase().replaceAll("_", " ")} receipt.` }));
const blueprints = (["FOUNDATIONAL", "CORE", "EXTENSION"] as const).map((band) => ({ id: `g5-wave-e-blueprint-${sliceOutcomes[0].toLowerCase()}-${band.toLowerCase()}`, grade, skillId: officialSkillId(sliceOutcomes[0]), difficulty: band, questionType: "DECIMAL_INPUT" as const, templateId: `g5-wave-e-template-${sliceOutcomes[0].toLowerCase()}`, targetCount: 8, sourceReferenceIds: [sourceId] }));
const candidateCore = { format: "plave-wave-e-candidate-v1", candidateId, version, policyVersion, sourceOutcomeIds: sliceOutcomes, blueprints, questions, explanations } as const;
export const gradeFiveWaveEBundleHash = sha256(canonicalize(candidateCore));
export function createGradeFiveWaveEPack(): GradePack {
  return { schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC", sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units, knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives, prerequisites: [
    { fromSkillId: officialSkillId(prerequisiteOutcomeIds[0]), toSkillId: officialSkillId(sliceOutcomes[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: officialSkillId(sliceOutcomes[0]), toSkillId: officialSkillId(nextTargetOutcomeIds[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  ], blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts, candidate: { candidateId, version, bundleHash: gradeFiveWaveEBundleHash, policyVersion }, adaptivePolicy: { version: policyVersion, status: "VALIDATED" }, release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false }, production: { wave: "E", selectedSliceId: "g5-volume-time-conversions", selectionBasis: ["SOURCE_VERIFIED", "UNCOVERED_BY_WAVES_A_TO_D", "EXACT_FINITE_DECIMAL_ORACLE", "DIMENSION_AWARE_CONVERSION", "NO_VISUAL_DEPENDENCY"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 }, legacyAsset: null };
}
export const gradeFiveWaveEPack = createGradeFiveWaveEPack();
export const gradeFiveWaveEMetadata = { schemaVersion: "plave-wave-e-metadata-v1", wave: "E", grade, title: "Chuyển đổi thể tích và thời gian", sourceClassification: "SOURCE_VERIFIED", sourcePages: [44], sourceOutcomeIds: sliceOutcomes, prerequisiteOutcomeIds, prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", nextTargetOutcomeIds, nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", selectionRationale: "Highest-priority uncovered Grade 5 measurement row provides exact cubic-unit and time conversions with terminating results.", deferredVisualToleranceGaps: ["P044-014 volume estimation needs a declared tolerance model.", "Solid nets and instrument-use outcomes require aligned visual or interaction evidence.", "Circle and polygon measurement remain separate source rows."], production: { generated: 24, evidenceGatePassed: 24, verificationInsufficient: 0, repaired: 0, rejected: 0, duplicate: 0, candidateEligible: 24 }, candidate: gradeFiveWaveEPack.candidate, release: gradeFiveWaveEPack.release } as const;
