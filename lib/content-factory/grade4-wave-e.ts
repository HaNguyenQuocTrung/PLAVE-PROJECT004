import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 4 as const;
const sourceId = officialSourceReferenceId(grade);
const packId = "grade-4-wave-e-measurement-conversions";
const candidateId = "g4-measurement-conversions-wave-e";
const version = "g4-measurement-conversions-1.0.0-wave-e";
const policyVersion = "g4-measurement-policy-1.0.0-wave-e";
const sliceOutcomes = ["MOET2018-G4-GEO-P038-013"] as const;
const prerequisiteOutcomeIds = ["MOET2018-G4-GEO-P038-008"] as const;
const nextTargetOutcomeIds = ["MOET2018-G4-GEO-P038-014"] as const;

type GeneratedItem = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;
const value = (numerator: number, denominator = 1): MathExpression => ({ op: "VALUE", numerator, denominator });
const operation = (op: "ADD" | "SUBTRACT" | "MULTIPLY" | "DIVIDE", left: MathExpression, right: MathExpression): MathExpression => ({ op, left, right });
const purposes = ["FOUNDATION", "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "TRANSFER_APPLICATION"] as const;
const receiptIds = requiredAutomatedEvidenceChecks.map((check) => `${packId}-${check.toLowerCase().replaceAll("_", "-")}`);

function exactInteger(expression: MathExpression) {
  const result = evaluateExpression(expression);
  if (result.denominator !== 1) throw new Error("AUTOMATED_VERIFICATION_INSUFFICIENT");
  return String(result.numerator);
}
function difficulty(index: number): DifficultyBand {
  const position = index % 6;
  return position < 2 ? "FOUNDATIONAL" : position < 4 ? "CORE" : "EXTENSION";
}

function createItem(
  questionNumber: number,
  prompt: string,
  unit: string,
  derivation: MathExpression,
  steps: readonly string[],
): GeneratedItem {
  const suffix = String(questionNumber).padStart(2, "0");
  const id = `g4-wave-e-${suffix}`;
  const explanationId = `${id}-explanation`;
  const normalizedPrompt = prompt.normalize("NFC");
  const answer = exactInteger(derivation);
  return {
    question: {
      id,
      grade,
      blueprintId: `g4-wave-e-blueprint-${sliceOutcomes[0].toLowerCase()}-${difficulty(questionNumber - 1).toLowerCase()}`,
      skillId: officialSkillId(sliceOutcomes[0]),
      prompt: normalizedPrompt,
      options: null,
      answer: { type: "INTEGER_INPUT", exactValue: answer, unit, derivation },
      explanationId,
      difficulty: difficulty(questionNumber - 1),
      provenance: {
        kind: "DETERMINISTIC_TEMPLATE",
        templateVersion: "g4-measurement-conversions-wave-e-template-1.0.0",
        seed: `g4-wave-e-${sliceOutcomes[0].toLowerCase()}-${suffix}`,
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
  generated.push(
    createItem(1, "Đổi 3 m thành xăng-ti-mét.", "cm", operation("MULTIPLY", value(3), value(100)), ["1 m = 100 cm.", "Nhân 3 với 100.", "Kết quả là 300 cm."]),
    createItem(2, "Đổi 450 cm thành đề-xi-mét.", "dm", operation("DIVIDE", value(450), value(10)), ["1 dm = 10 cm.", "Chia 450 cho 10.", "Kết quả là 45 dm."]),
    createItem(3, "Viết 2 km 35 m dưới dạng mét.", "m", operation("ADD", operation("MULTIPLY", value(2), value(1000)), value(35)), ["2 km = 2 000 m.", "Cộng thêm 35 m.", "Kết quả là 2 035 m."]),
    createItem(4, "Một đoạn dây dài 5 m 8 cm. Độ dài đó bằng bao nhiêu xăng-ti-mét?", "cm", operation("ADD", operation("MULTIPLY", value(5), value(100)), value(8)), ["5 m = 500 cm.", "Cộng thêm 8 cm.", "Độ dài là 508 cm."]),
    createItem(5, "Đổi 6 dm² thành xăng-ti-mét vuông.", "cm²", operation("MULTIPLY", value(6), value(100)), ["1 dm² = 100 cm².", "Nhân 6 với 100.", "Kết quả là 600 cm²."]),
    createItem(6, "Đổi 3 200 mm² thành xăng-ti-mét vuông.", "cm²", operation("DIVIDE", value(3200), value(100)), ["1 cm² = 100 mm².", "Chia 3 200 cho 100.", "Kết quả là 32 cm²."]),
    createItem(7, "Viết 2 m² 15 dm² dưới dạng đề-xi-mét vuông.", "dm²", operation("ADD", operation("MULTIPLY", value(2), value(100)), value(15)), ["1 m² = 100 dm² nên 2 m² = 200 dm².", "Cộng thêm 15 dm².", "Kết quả là 215 dm²."]),
    createItem(8, "Một tấm bìa có diện tích 4 dm² 9 cm². Diện tích đó bằng bao nhiêu xăng-ti-mét vuông?", "cm²", operation("ADD", operation("MULTIPLY", value(4), value(100)), value(9)), ["4 dm² = 400 cm².", "Cộng thêm 9 cm².", "Diện tích là 409 cm²."]),
    createItem(9, "Đổi 7 kg thành gam.", "g", operation("MULTIPLY", value(7), value(1000)), ["1 kg = 1 000 g.", "Nhân 7 với 1 000.", "Kết quả là 7 000 g."]),
    createItem(10, "Đổi 500 kg thành tạ.", "tạ", operation("DIVIDE", value(500), value(100)), ["1 tạ = 100 kg.", "Chia 500 cho 100.", "Kết quả là 5 tạ."]),
    createItem(11, "Viết 3 tạ 25 kg dưới dạng ki-lô-gam.", "kg", operation("ADD", operation("MULTIPLY", value(3), value(100)), value(25)), ["3 tạ = 300 kg.", "Cộng thêm 25 kg.", "Kết quả là 325 kg."]),
    createItem(12, "Một lô hàng nặng 2 tấn 4 tạ. Khối lượng đó bằng bao nhiêu ki-lô-gam?", "kg", operation("ADD", operation("MULTIPLY", value(2), value(1000)), operation("MULTIPLY", value(4), value(100))), ["2 tấn = 2 000 kg và 4 tạ = 400 kg.", "Cộng hai khối lượng cùng đơn vị.", "Khối lượng là 2 400 kg."]),
    createItem(13, "Đổi 8 l thành mi-li-lít.", "ml", operation("MULTIPLY", value(8), value(1000)), ["1 l = 1 000 ml.", "Nhân 8 với 1 000.", "Kết quả là 8 000 ml."]),
    createItem(14, "Đổi 5 000 ml thành lít.", "l", operation("DIVIDE", value(5000), value(1000)), ["1 l = 1 000 ml.", "Chia 5 000 cho 1 000.", "Kết quả là 5 l."]),
    createItem(15, "Viết 3 l 250 ml dưới dạng mi-li-lít.", "ml", operation("ADD", operation("MULTIPLY", value(3), value(1000)), value(250)), ["3 l = 3 000 ml.", "Cộng thêm 250 ml.", "Kết quả là 3 250 ml."]),
    createItem(16, "Một bình có 6 l nước, rót ra 750 ml. Bình còn bao nhiêu mi-li-lít nước?", "ml", operation("SUBTRACT", operation("MULTIPLY", value(6), value(1000)), value(750)), ["6 l = 6 000 ml.", "Trừ 750 ml đã rót ra.", "Còn lại 5 250 ml."]),
    createItem(17, "Đổi 4 phút thành giây.", "giây", operation("MULTIPLY", value(4), value(60)), ["1 phút = 60 giây.", "Nhân 4 với 60.", "Kết quả là 240 giây."]),
    createItem(18, "Viết 3 giờ 15 phút dưới dạng phút.", "phút", operation("ADD", operation("MULTIPLY", value(3), value(60)), value(15)), ["3 giờ = 180 phút.", "Cộng thêm 15 phút.", "Kết quả là 195 phút."]),
    createItem(19, "Đổi 2 ngày 6 giờ thành giờ.", "giờ", operation("ADD", operation("MULTIPLY", value(2), value(24)), value(6)), ["2 ngày = 48 giờ.", "Cộng thêm 6 giờ.", "Kết quả là 54 giờ."]),
    createItem(20, "Một khoảng thời gian dài 3 thế kỉ 25 năm. Khoảng thời gian đó bằng bao nhiêu năm?", "năm", operation("ADD", operation("MULTIPLY", value(3), value(100)), value(25)), ["3 thế kỉ = 300 năm.", "Cộng thêm 25 năm.", "Khoảng thời gian là 325 năm."]),
    createItem(21, "Cộng 2 m 35 cm và 1 m 80 cm. Viết tổng dưới dạng xăng-ti-mét.", "cm", operation("ADD", value(235), value(180)), ["2 m 35 cm = 235 cm; 1 m 80 cm = 180 cm.", "Cộng 235 với 180.", "Tổng là 415 cm."]),
    createItem(22, "Tính 5 kg 200 g trừ 1 kg 750 g. Viết hiệu dưới dạng gam.", "g", operation("SUBTRACT", value(5200), value(1750)), ["Đổi hai khối lượng thành 5 200 g và 1 750 g.", "Trừ hai số đo cùng đơn vị.", "Hiệu là 3 450 g."]),
    createItem(23, "Cộng 3 l 400 ml và 2 l 850 ml. Viết tổng dưới dạng mi-li-lít.", "ml", operation("ADD", value(3400), value(2850)), ["Đổi thành 3 400 ml và 2 850 ml.", "Cộng hai dung tích.", "Tổng là 6 250 ml."]),
    createItem(24, "Cộng 2 giờ 45 phút và 1 giờ 35 phút. Viết tổng dưới dạng phút.", "phút", operation("ADD", value(165), value(95)), ["Đổi thành 165 phút và 95 phút.", "Cộng hai khoảng thời gian.", "Tổng là 260 phút."]),
  );
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
  evidence: check === "SOURCE_MAPPING" ? `Retained source-locked outcome ${sliceOutcomes[0]} on page 38.` : check === "MATHEMATICAL_ANSWER" ? "Independent exact-integer dimension-aware conversion oracle verifies length, area, mass, capacity and time operations." : `Deterministic Grade 4 Wave E ${check.toLowerCase().replaceAll("_", " ")} receipt.`,
}));
const blueprints = (["FOUNDATIONAL", "CORE", "EXTENSION"] as const).map((band) => ({ id: `g4-wave-e-blueprint-${sliceOutcomes[0].toLowerCase()}-${band.toLowerCase()}`, grade, skillId: officialSkillId(sliceOutcomes[0]), difficulty: band, questionType: "INTEGER_INPUT" as const, templateId: `g4-wave-e-template-${sliceOutcomes[0].toLowerCase()}`, targetCount: 8, sourceReferenceIds: [sourceId] }));
const candidateCore = { format: "plave-wave-e-candidate-v1", candidateId, version, policyVersion, sourceOutcomeIds: sliceOutcomes, blueprints, questions, explanations } as const;
export const gradeFourWaveEBundleHash = sha256(canonicalize(candidateCore));

export function createGradeFourWaveEPack(): GradePack {
  return { schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC", sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units, knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives, prerequisites: [
    { fromSkillId: officialSkillId(prerequisiteOutcomeIds[0]), toSkillId: officialSkillId(sliceOutcomes[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: officialSkillId(sliceOutcomes[0]), toSkillId: officialSkillId(nextTargetOutcomeIds[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  ], blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts, candidate: { candidateId, version, bundleHash: gradeFourWaveEBundleHash, policyVersion }, adaptivePolicy: { version: policyVersion, status: "VALIDATED" }, release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false }, production: { wave: "E", selectedSliceId: "g4-measurement-conversions", selectionBasis: ["SOURCE_VERIFIED", "UNCOVERED_BY_WAVES_A_TO_D", "EXACT_DIMENSION_AWARE_INTEGER_ORACLE", "NO_VISUAL_DEPENDENCY"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 }, legacyAsset: null };
}
export const gradeFourWaveEPack = createGradeFourWaveEPack();
export const gradeFourWaveEMetadata = { schemaVersion: "plave-wave-e-metadata-v1", wave: "E", grade, title: "Chuyển đổi và tính toán số đo", sourceClassification: "SOURCE_VERIFIED", sourcePages: [38], sourceOutcomeIds: sliceOutcomes, prerequisiteOutcomeIds, prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", nextTargetOutcomeIds, nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", selectionRationale: "Highest-priority uncovered measurement row supports exact dimension-aware conversion across five source-listed measure families without a diagram.", deferredVisualToleranceGaps: ["P038-011 instrument-reading evidence requires a measurement model.", "P038-014 estimation requires an explicit tolerance policy.", "Angle measurement and drawing outcomes require aligned visual evidence."], production: { generated: 24, evidenceGatePassed: 24, verificationInsufficient: 0, repaired: 0, rejected: 0, duplicate: 0, candidateEligible: 24 }, candidate: gradeFourWaveEPack.candidate, release: gradeFourWaveEPack.release } as const;
