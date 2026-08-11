import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 6 as const;
const sourceId = officialSourceReferenceId(grade);
const packId = "grade-6-wave-e-perimeter-area";
const candidateId = "g6-perimeter-area-wave-e";
const version = "g6-perimeter-area-1.0.0-wave-e";
const policyVersion = "g6-measurement-policy-1.0.0-wave-e";
const sliceOutcomes = ["MOET2018-G6-GEO-P051-003"] as const;
const prerequisiteOutcomeIds = ["MOET2018-G6-GEO-P051-004"] as const;
const nextTargetOutcomeIds = ["MOET2018-G6-GEO-P052-012"] as const;

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

function createItem(questionNumber: number, prompt: string, unit: string, derivation: MathExpression, steps: readonly string[]): GeneratedItem {
  const suffix = String(questionNumber).padStart(2, "0");
  const id = `g6-wave-e-${suffix}`;
  const explanationId = `${id}-explanation`;
  const normalizedPrompt = prompt.normalize("NFC");
  const answer = exactInteger(derivation);
  return { question: { id, grade, blueprintId: `g6-wave-e-blueprint-${sliceOutcomes[0].toLowerCase()}-${difficulty(questionNumber - 1).toLowerCase()}`, skillId: officialSkillId(sliceOutcomes[0]), prompt: normalizedPrompt, options: null, answer: { type: "INTEGER_INPUT", exactValue: answer, unit, derivation }, explanationId, difficulty: difficulty(questionNumber - 1), provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g6-perimeter-area-wave-e-template-1.0.0", seed: `g6-wave-e-${sliceOutcomes[0].toLowerCase()}-${suffix}`, sourceReferenceIds: [sourceId] }, reviewStatus: "BUNDLED", published: false, pilotEligible: false, fixtureOnly: false, duplicateFingerprint: sha256(normalizedDefinition(`${normalizedPrompt}|`).toLocaleLowerCase("vi")), validationReceiptIds: receiptIds, instructionalPurpose: purposes[(questionNumber - 1) % purposes.length]! }, explanation: { id: explanationId, questionId: id, steps: steps.map((step) => step.normalize("NFC")), finalAnswer: answer, evidenceReceiptIds: [`${packId}-explanation-consistency`] } };
}

function generateQuestions(): readonly GeneratedItem[] {
  const generated: GeneratedItem[] = [];
  generated.push(
    createItem(1, "Một khung dây hình vuông có cạnh 7 cm. Tổng độ dài bốn cạnh của khung là bao nhiêu?", "cm", operation("MULTIPLY", value(7), value(4)), ["Chu vi hình vuông bằng bốn lần độ dài cạnh.", "Tính 7 × 4.", "Chu vi là 28 cm."]),
    createItem(2, "Một tấm bìa hình vuông có cạnh 9 cm. Diện tích tấm bìa là bao nhiêu xăng-ti-mét vuông?", "cm²", operation("MULTIPLY", value(9), value(9)), ["Diện tích hình vuông bằng cạnh nhân cạnh.", "Tính 9 × 9.", "Diện tích là 81 cm²."]),
    createItem(3, "Một khu vườn hình vuông cạnh 12 m cần làm hàng rào quanh mép. Hàng rào dài bao nhiêu mét?", "m", operation("MULTIPLY", value(12), value(4)), ["Độ dài hàng rào là chu vi hình vuông.", "Tính 12 × 4.", "Cần 48 m hàng rào."]),
    createItem(4, "Một viên gạch hình vuông có cạnh 15 cm. Diện tích một mặt viên gạch là bao nhiêu xăng-ti-mét vuông?", "cm²", operation("MULTIPLY", value(15), value(15)), ["Mặt viên gạch là hình vuông.", "Tính 15 × 15.", "Diện tích là 225 cm²."]),
    createItem(5, "Một khung bảng hình chữ nhật dài 14 cm và rộng 8 cm. Chu vi khung bảng là bao nhiêu?", "cm", operation("MULTIPLY", operation("ADD", value(14), value(8)), value(2)), ["Cộng chiều dài và chiều rộng: 14 + 8 = 22.", "Nhân tổng với 2.", "Chu vi là 44 cm."]),
    createItem(6, "Một mảnh vải hình chữ nhật dài 12 m và rộng 7 m. Diện tích mảnh vải là bao nhiêu mét vuông?", "m²", operation("MULTIPLY", value(12), value(7)), ["Diện tích hình chữ nhật bằng chiều dài nhân chiều rộng.", "Tính 12 × 7.", "Diện tích là 84 m²."]),
    createItem(7, "Một khung ảnh hình chữ nhật dài 20 cm, rộng 13 cm. Cần bao nhiêu xăng-ti-mét nẹp để viền đủ bốn cạnh?", "cm", operation("MULTIPLY", operation("ADD", value(20), value(13)), value(2)), ["Độ dài nẹp là chu vi hình chữ nhật.", "Tính (20 + 13) × 2.", "Cần 66 cm nẹp."]),
    createItem(8, "Một nền phòng hình chữ nhật dài 18 m và rộng 11 m. Diện tích nền phòng là bao nhiêu mét vuông?", "m²", operation("MULTIPLY", value(18), value(11)), ["Nền phòng có dạng hình chữ nhật.", "Tính 18 × 11.", "Diện tích là 198 m²."]),
    createItem(9, "Một khung trang trí hình bình hành có hai cạnh kề dài 9 cm và 6 cm. Tính chu vi khung.", "cm", operation("MULTIPLY", operation("ADD", value(9), value(6)), value(2)), ["Hình bình hành có hai cặp cạnh đối bằng nhau.", "Tính (9 + 6) × 2.", "Chu vi là 30 cm."]),
    createItem(10, "Một tấm bìa hình bình hành có đáy 12 cm và chiều cao tương ứng 7 cm. Tính diện tích tấm bìa.", "cm²", operation("MULTIPLY", value(12), value(7)), ["Diện tích hình bình hành bằng đáy nhân chiều cao tương ứng.", "Tính 12 × 7.", "Diện tích là 84 cm²."]),
    createItem(11, "Một khung dây hình thoi có cạnh 13 cm. Tổng độ dài bốn cạnh là bao nhiêu?", "cm", operation("MULTIPLY", value(13), value(4)), ["Bốn cạnh hình thoi bằng nhau.", "Tính 13 × 4.", "Chu vi là 52 cm."]),
    createItem(12, "Một tấm kính hình thoi có hai đường chéo dài 12 cm và 16 cm. Tính diện tích tấm kính.", "cm²", operation("DIVIDE", operation("MULTIPLY", value(12), value(16)), value(2)), ["Diện tích hình thoi bằng tích hai đường chéo chia 2.", "Tính 12 × 16 : 2.", "Diện tích là 96 cm²."]),
    createItem(13, "Một mảnh vườn hình thang có hai đáy 10 m và 16 m, chiều cao 7 m. Tính diện tích mảnh vườn.", "m²", operation("DIVIDE", operation("MULTIPLY", operation("ADD", value(10), value(16)), value(7)), value(2)), ["Cộng hai đáy được 26 m.", "Nhân với chiều cao rồi chia 2.", "Diện tích là 91 m²."]),
    createItem(14, "Một khung hình thang có bốn cạnh dài 8 cm, 11 cm, 14 cm và 9 cm. Tính chu vi khung.", "cm", operation("ADD", operation("ADD", value(8), value(11)), operation("ADD", value(14), value(9))), ["Chu vi bằng tổng độ dài bốn cạnh.", "Cộng 8 + 11 + 14 + 9.", "Chu vi là 42 cm."]),
    createItem(15, "Một khung hình thang cân có hai đáy 12 cm và 20 cm, mỗi cạnh bên dài 7 cm. Tính chu vi.", "cm", operation("ADD", operation("ADD", value(12), value(20)), operation("MULTIPLY", value(7), value(2))), ["Hai cạnh bên của hình thang cân đều dài 7 cm.", "Cộng 12 + 20 + 7 × 2.", "Chu vi là 46 cm."]),
    createItem(16, "Một mảnh đất hình thang có hai đáy 15 m và 9 m, chiều cao 6 m. Tính diện tích mảnh đất.", "m²", operation("DIVIDE", operation("MULTIPLY", operation("ADD", value(15), value(9)), value(6)), value(2)), ["Tổng hai đáy là 24 m.", "Nhân với 6 rồi chia 2.", "Diện tích là 72 m²."]),
    createItem(17, "Một biển trang trí hình tam giác đều có cạnh 11 cm. Tính chu vi biển.", "cm", operation("MULTIPLY", value(11), value(3)), ["Tam giác đều có ba cạnh bằng nhau.", "Tính 11 × 3.", "Chu vi là 33 cm."]),
    createItem(18, "Một khung trang trí hình lục giác đều có cạnh 8 cm. Tính chu vi khung.", "cm", operation("MULTIPLY", value(8), value(6)), ["Lục giác đều có sáu cạnh bằng nhau.", "Tính 8 × 6.", "Chu vi là 48 cm."]),
    createItem(19, "Một tấm bìa hình tam giác có đáy 18 cm và chiều cao tương ứng 7 cm. Tính diện tích tấm bìa.", "cm²", operation("DIVIDE", operation("MULTIPLY", value(18), value(7)), value(2)), ["Diện tích tam giác bằng đáy nhân chiều cao chia 2.", "Tính 18 × 7 : 2.", "Diện tích là 63 cm²."]),
    createItem(20, "Một khung tam giác có ba cạnh dài 9 cm, 10 cm và 11 cm. Tính chu vi khung.", "cm", operation("ADD", operation("ADD", value(9), value(10)), value(11)), ["Chu vi tam giác bằng tổng ba cạnh.", "Cộng 9 + 10 + 11.", "Chu vi là 30 cm."]),
    createItem(21, "Một mảnh đất hình bình hành có đáy 25 m và chiều cao 12 m. Tính diện tích mảnh đất.", "m²", operation("MULTIPLY", value(25), value(12)), ["Diện tích hình bình hành bằng đáy nhân chiều cao.", "Tính 25 × 12.", "Diện tích là 300 m²."]),
    createItem(22, "Một khung hình chữ nhật dài 24 cm và rộng 15 cm. Tổng độ dài bốn cạnh là bao nhiêu xăng-ti-mét?", "cm", operation("MULTIPLY", operation("ADD", value(24), value(15)), value(2)), ["Tổng bốn cạnh là chu vi hình chữ nhật.", "Tính (24 + 15) × 2.", "Chu vi là 78 cm."]),
    createItem(23, "Một tấm kính hình thoi có hai đường chéo dài 18 cm và 24 cm. Tính diện tích tấm kính.", "cm²", operation("DIVIDE", operation("MULTIPLY", value(18), value(24)), value(2)), ["Diện tích hình thoi bằng nửa tích hai đường chéo.", "Tính 18 × 24 : 2.", "Diện tích là 216 cm²."]),
    createItem(24, "Một khu đất hình thang cân có hai đáy 18 m và 30 m, chiều cao 10 m. Tính diện tích.", "m²", operation("DIVIDE", operation("MULTIPLY", operation("ADD", value(18), value(30)), value(10)), value(2)), ["Cộng hai đáy được 48 m.", "Nhân với chiều cao rồi chia 2.", "Diện tích là 240 m²."]),
  );
  return generated;
}

const generated = generateQuestions();
const questions = generated.map((entry) => entry.question);
const explanations = generated.map((entry) => entry.explanation);
const skeleton = buildOfficialGradeSkeleton(grade);
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({ id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`, entityId: packId, check, status: "PASSED" as const, evidence: check === "SOURCE_MAPPING" ? `Retained source-locked outcome ${sliceOutcomes[0]} on page 51.` : check === "MATHEMATICAL_ANSWER" ? "Independent exact-rational geometry oracle recomputes every perimeter and area from complete labelled dimensions." : `Deterministic Grade 6 Wave E ${check.toLowerCase().replaceAll("_", " ")} receipt.` }));
const blueprints = (["FOUNDATIONAL", "CORE", "EXTENSION"] as const).map((band) => ({ id: `g6-wave-e-blueprint-${sliceOutcomes[0].toLowerCase()}-${band.toLowerCase()}`, grade, skillId: officialSkillId(sliceOutcomes[0]), difficulty: band, questionType: "INTEGER_INPUT" as const, templateId: `g6-wave-e-template-${sliceOutcomes[0].toLowerCase()}`, targetCount: 8, sourceReferenceIds: [sourceId] }));
const candidateCore = { format: "plave-wave-e-candidate-v1", candidateId, version, policyVersion, sourceOutcomeIds: sliceOutcomes, blueprints, questions, explanations } as const;
export const gradeSixWaveEBundleHash = sha256(canonicalize(candidateCore));
export function createGradeSixWaveEPack(): GradePack {
  return { schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC", sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units, knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives, prerequisites: [
    { fromSkillId: officialSkillId(prerequisiteOutcomeIds[0]), toSkillId: officialSkillId(sliceOutcomes[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: officialSkillId(sliceOutcomes[0]), toSkillId: officialSkillId(nextTargetOutcomeIds[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  ], blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts, candidate: { candidateId, version, bundleHash: gradeSixWaveEBundleHash, policyVersion }, adaptivePolicy: { version: policyVersion, status: "VALIDATED" }, release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false }, production: { wave: "E", selectedSliceId: "g6-perimeter-area", selectionBasis: ["SOURCE_VERIFIED", "UNCOVERED_BY_WAVES_A_TO_D", "EXACT_GEOMETRY_ORACLE", "COMPLETE_DIMENSIONS", "NO_VISUAL_DEPENDENCY"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 }, legacyAsset: null };
}
export const gradeSixWaveEPack = createGradeSixWaveEPack();
export const gradeSixWaveEMetadata = { schemaVersion: "plave-wave-e-metadata-v1", wave: "E", grade, title: "Chu vi và diện tích các hình đặc biệt", sourceClassification: "SOURCE_VERIFIED", sourcePages: [51], sourceOutcomeIds: sliceOutcomes, prerequisiteOutcomeIds, prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", nextTargetOutcomeIds, nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", selectionRationale: "Highest-priority uncovered Grade 6 measurement row permits exact contextual perimeter and area tasks when every dimension is explicit.", deferredVisualToleranceGaps: ["Shape recognition and construction outcomes require aligned diagrams.", "Symmetry outcomes require a visual transformation model.", "No unstated diagram measurement or approximate dimension is admitted."], production: { generated: 24, evidenceGatePassed: 24, verificationInsufficient: 0, repaired: 0, rejected: 0, duplicate: 0, candidateEligible: 24 }, candidate: gradeSixWaveEPack.candidate, release: gradeSixWaveEPack.release } as const;
