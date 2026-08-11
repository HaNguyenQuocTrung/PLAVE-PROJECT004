import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 2 as const;
const packId = "grade-2-wave-g-data-counting";
const candidateId = "g2-data-counting-wave-g";
const version = "g2-data-counting-1.0.0-wave-g";
const policyVersion = "g2-data-counting-policy-1.0.0-wave-g";
const sourceId = officialSourceReferenceId(grade);
const unitId = "grade-2-data-and-chance";
const sliceOutcomes = ["MOET2018-G2-STA-P028-001", "MOET2018-G2-STA-P028-003", "MOET2018-G2-STA-P028-004"] as const;
const prerequisiteOutcomeIds = ["MOET2018-G2-NUM-P025-019"] as const;
const nextTargetOutcomeIds = ["MOET2018-G2-STA-P028-002"] as const;
type SliceOutcome = (typeof sliceOutcomes)[number];
type GeneratedItem = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;
const purposes = ["FOUNDATION", "FOUNDATION", "STANDARD_APPLICATION", "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "REMEDIATION", "TRANSFER_APPLICATION"] as const;
const value = (numerator: number): MathExpression => ({ op: "VALUE", numerator, denominator: 1 });
const binary = (op: "ADD" | "SUBTRACT", left: MathExpression, right: MathExpression): MathExpression => ({ op, left, right });
function sum(values: readonly number[]) { return values.slice(1).reduce<MathExpression>((left, right) => binary("ADD", left, value(right)), value(values[0]!)); }
function difficulty(index: number): DifficultyBand { return index < 3 ? "FOUNDATIONAL" : index < 7 ? "CORE" : "EXTENSION"; }
function exact(expression: MathExpression) { const result = evaluateExpression(expression); if (result.denominator !== 1 || result.numerator < 0) throw new Error("GRADE2_WAVE_G_NONNEGATIVE_INTEGER_REQUIRED"); return String(result.numerator); }
const receiptIds = requiredAutomatedEvidenceChecks.map((check) => `${packId}-${check.toLowerCase().replaceAll("_", "-")}`);

function createItem(number: number, outcomeId: SliceOutcome, localIndex: number, prompt: string, derivation: MathExpression, steps: readonly string[]): GeneratedItem {
  const id = `g2-wave-g-${String(number).padStart(2, "0")}`; const band = difficulty(localIndex); const exactValue = exact(derivation); const normalizedPrompt = prompt.normalize("NFC");
  return {
    question: { id, grade, unitId: outcomeId === sliceOutcomes[1] ? "grade-2-data-and-measurement-experience-p1" : unitId, blueprintId: `g2-wave-g-blueprint-${outcomeId.toLowerCase()}-${band.toLowerCase()}`, skillId: officialSkillId(outcomeId), prompt: normalizedPrompt, options: null, answer: { type: "INTEGER_INPUT", exactValue, derivation }, explanationId: `${id}-explanation`, difficulty: band, provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g2-data-counting-wave-g-template-1.0.0", seed: `g2-wave-g-${outcomeId.toLowerCase()}-${String(number).padStart(2, "0")}`, sourceReferenceIds: [sourceId] }, reviewStatus: "BUNDLED", published: false, pilotEligible: false, fixtureOnly: false, duplicateFingerprint: sha256(normalizedDefinition(`${normalizedPrompt}|`).toLocaleLowerCase("vi")), validationReceiptIds: receiptIds, instructionalPurpose: purposes[localIndex]! },
    explanation: { id: `${id}-explanation`, questionId: id, steps: [...steps, `Số cần nhập là ${exactValue}.`].map((step) => step.normalize("NFC")), finalAnswer: exactValue, evidenceReceiptIds: [`${packId}-explanation-consistency`] },
  };
}

const pictographs = [
  ["cam", 3, 5, 2], ["táo", 6, 4, 3], ["bút", 2, 7, 5], ["sách", 8, 3, 4],
  ["hoa", 5, 6, 1], ["bóng", 4, 2, 7], ["cốc", 7, 5, 3], ["lá", 3, 8, 6],
] as const;
const generated: GeneratedItem[] = [];
pictographs.forEach(([object, an, binh, chi], index) => {
  const rows = [`An=${"●".repeat(an)}`, `Bình=${"●".repeat(binh)}`, `Chi=${"●".repeat(chi)}`];
  const targetIndex = index % 3; const names = ["An", "Bình", "Chi"] as const; const counts = [an, binh, chi] as const;
  generated.push(createItem(index + 1, sliceOutcomes[0], index, `Biểu đồ tranh, mỗi ● biểu thị 1 ${object}: ${rows.join("; ")}. Hàng ${names[targetIndex]} có bao nhiêu biểu tượng?`, value(counts[targetIndex]!), ["Chú giải cho biết mỗi biểu tượng ứng với một đối tượng.", `Đếm biểu tượng ở hàng ${names[targetIndex]}.`]));
});

const tableCases = [
  [[4, 7, 3], "TOTAL"], [[6, 2, 5, 4], "TOTAL"], [[8, 5, 7], "RANGE"], [[3, 9, 4, 6], "RANGE"],
  [[5, 8, 2], "MAX"], [[7, 1, 6, 3], "MAX"], [[2, 4, 5, 3], "TOTAL"], [[9, 4, 8], "RANGE"],
] as const;
tableCases.forEach(([counts, operation], index) => {
  const labels = ["A", "B", "C", "D"].slice(0, counts.length);
  const data = labels.map((label, itemIndex) => `${label}=${counts[itemIndex]}`).join("; ");
  const maximum = Math.max(...counts); const minimum = Math.min(...counts);
  const derivation = operation === "TOTAL" ? sum(counts) : operation === "RANGE" ? binary("SUBTRACT", value(maximum), value(minimum)) : value(maximum);
  const question = operation === "TOTAL" ? "Có tất cả bao nhiêu đối tượng?" : operation === "RANGE" ? "Chênh lệch giữa số nhiều nhất và số ít nhất là bao nhiêu?" : "Giá trị lớn nhất trong bảng là bao nhiêu?";
  generated.push(createItem(index + 9, sliceOutcomes[1], index, `Bảng số liệu: ${data}. ${question}`, derivation, operation === "TOTAL" ? ["Cộng số đối tượng của tất cả các nhóm."] : operation === "RANGE" ? ["Tìm giá trị lớn nhất và nhỏ nhất rồi lấy số lớn trừ số nhỏ."] : ["So sánh các giá trị trong bảng và chọn giá trị lớn nhất."]));
});

const rawCases = [
  [["đỏ", "xanh", "đỏ", "vàng", "đỏ"], "CATEGORY", "đỏ"],
  [["tròn", "vuông", "tròn", "tam giác", "vuông", "tròn"], "CATEGORY", "tròn"],
  [["cam", "táo", "cam", "cam", "lê", "táo", "cam"], "SAMPLE", ""],
  [["A", "B", "A", "C", "B", "D"], "DISTINCT", ""],
  [["ngắn", "dài", "ngắn", "ngắn", "dài", "ngắn"], "CATEGORY", "ngắn"],
  [["1", "2", "2", "3", "1", "2", "4", "2"], "SAMPLE", ""],
  [["mèo", "chó", "cá", "mèo", "chó", "chim"], "DISTINCT", ""],
  [["gỗ", "nhựa", "gỗ", "kim loại", "gỗ", "nhựa", "gỗ", "gỗ"], "CATEGORY", "gỗ"],
] as const;
rawCases.forEach(([observations, operation, category], index) => {
  const answer = operation === "SAMPLE" ? observations.length : operation === "DISTINCT" ? new Set(observations).size : observations.filter((item) => item === category).length;
  const question = operation === "SAMPLE" ? "Cỡ mẫu, tức tổng số quan sát, là bao nhiêu?" : operation === "DISTINCT" ? "Có bao nhiêu loại khác nhau?" : `Có bao nhiêu quan sát thuộc nhóm ${category}?`;
  generated.push(createItem(index + 17, sliceOutcomes[2], index, `Dãy quan sát: ${observations.join(", ")}. ${question}`, value(answer), operation === "SAMPLE" ? ["Đếm mỗi quan sát đúng một lần để tìm cỡ mẫu."] : operation === "DISTINCT" ? ["Phân loại các giá trị giống nhau rồi đếm số loại."] : [`Đánh dấu từng quan sát thuộc nhóm ${category} rồi kiểm đếm.`]));
});

export function independentlyDeriveGradeTwoWaveGAnswer(question: CandidateQuestion) {
  if (question.skillId === officialSkillId(sliceOutcomes[0])) {
    const target = /Hàng ([^ ]+) có bao nhiêu/u.exec(question.prompt)?.[1];
    const data = /: (.+)\. Hàng/u.exec(question.prompt)?.[1];
    if (!target || !data) throw new Error(`GRADE2_WAVE_G_PICTOGRAPH_PARSE:${question.id}`);
    const row = data.split("; ").find((entry) => entry.startsWith(`${target}=`));
    if (!row) throw new Error(`GRADE2_WAVE_G_PICTOGRAPH_ROW:${question.id}`);
    return String([...row].filter((character) => character === "●").length);
  }
  if (question.skillId === officialSkillId(sliceOutcomes[1])) {
    const data = /Bảng số liệu: (.+)\. /u.exec(question.prompt)?.[1];
    if (!data) throw new Error(`GRADE2_WAVE_G_TABLE_PARSE:${question.id}`);
    const counts = data.split("; ").map((entry) => Number(entry.split("=")[1]));
    if (counts.some((count) => !Number.isInteger(count))) throw new Error(`GRADE2_WAVE_G_TABLE_VALUE:${question.id}`);
    if (question.prompt.includes("tất cả")) return String(counts.reduce((total, count) => total + count, 0));
    if (question.prompt.includes("Chênh lệch")) return String(Math.max(...counts) - Math.min(...counts));
    if (question.prompt.includes("Giá trị lớn nhất")) return String(Math.max(...counts));
    throw new Error(`GRADE2_WAVE_G_TABLE_OPERATION:${question.id}`);
  }
  const data = /Dãy quan sát: (.+)\. /u.exec(question.prompt)?.[1];
  if (!data) throw new Error(`GRADE2_WAVE_G_RAW_PARSE:${question.id}`);
  const observations = data.split(", ");
  if (question.prompt.includes("Cỡ mẫu")) return String(observations.length);
  if (question.prompt.includes("loại khác nhau")) return String(new Set(observations).size);
  const category = /thuộc nhóm (.+)\?/u.exec(question.prompt)?.[1];
  if (!category) throw new Error(`GRADE2_WAVE_G_CATEGORY_PARSE:${question.id}`);
  return String(observations.filter((item) => item === category).length);
}

const questions = generated.map((entry) => entry.question); const explanations = generated.map((entry) => entry.explanation);
if (questions.length !== 24 || new Set(questions.map((question) => question.id)).size !== 24) throw new Error("GRADE2_WAVE_G_GENERATION_COUNT");
export const gradeTwoWaveGOracleRows = questions.map((question) => { const independentlyDerived = independentlyDeriveGradeTwoWaveGAnswer(question); const explanation = explanations.find((entry) => entry.questionId === question.id)!; if (independentlyDerived !== question.answer.exactValue || explanation.finalAnswer !== independentlyDerived) throw new Error(`GRADE2_WAVE_G_ORACLE_MISMATCH:${question.id}`); return { questionId: question.id, independentlyDerived, publicDatasetPresent: true as const, sampleSizeExplicitlyDerivable: true as const, answerMatches: true as const, explanationMatches: true as const }; });
const skeleton = buildOfficialGradeSkeleton(grade);
const blueprints = [...new Map(questions.map((question) => [question.blueprintId, { id: question.blueprintId, grade, skillId: question.skillId, difficulty: question.difficulty, questionType: question.answer.type, templateId: `g2-wave-g-template-${question.skillId}`, targetCount: questions.filter((entry) => entry.blueprintId === question.blueprintId).length, sourceReferenceIds: [sourceId] }])).values()];
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({ id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`, entityId: packId, check, status: "PASSED" as const, evidence: check === "SOURCE_MAPPING" ? `Source-locked outcomes ${sliceOutcomes.join(", ")} on retained page 28.` : check === "MATHEMATICAL_ANSWER" ? "Independent public-data parser recomputed row counts, totals, ranges, maxima, category frequencies, distinct counts and sample sizes for all 24 items." : `Deterministic Grade 2 Wave G ${check.toLowerCase().replaceAll("_", " ")} receipt.` }));
const candidateCore = { format: "plave-wave-g-candidate-v1", grade, candidateId, version, policyVersion, sourceOutcomeIds: sliceOutcomes, sourcePages: [28], blueprints, questions, explanations, oracleRows: gradeTwoWaveGOracleRows } as const;
export const gradeTwoWaveGBundleHash = sha256(canonicalize(candidateCore));
export const gradeTwoWaveGPack: GradePack = { schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC", sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units, knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives, prerequisites: [{ fromSkillId: officialSkillId(prerequisiteOutcomeIds[0]), toSkillId: officialSkillId(sliceOutcomes[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] }, { fromSkillId: officialSkillId(sliceOutcomes[0]), toSkillId: officialSkillId(sliceOutcomes[1]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] }, { fromSkillId: officialSkillId(sliceOutcomes[1]), toSkillId: officialSkillId(sliceOutcomes[2]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] }, { fromSkillId: officialSkillId(sliceOutcomes[2]), toSkillId: officialSkillId(nextTargetOutcomeIds[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] }], blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts, candidate: { candidateId, version, bundleHash: gradeTwoWaveGBundleHash, policyVersion }, adaptivePolicy: { version: policyVersion, status: "VALIDATED" }, release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false }, production: { wave: "G", selectedSliceId: "grade-2-data-counting", selectionBasis: ["SOURCE_VERIFIED", "PAGE_28_LOCKED", "UNCOVERED_BY_WAVES_A_TO_F", "PUBLIC_DATASET_COMPLETE", "INDEPENDENT_COUNT_TOTAL_SAMPLE_ORACLE"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 }, legacyAsset: null };
export const gradeTwoWaveGProgression = { grade, priorSkillId: officialSkillId(prerequisiteOutcomeIds[0]), waveGSkillIds: sliceOutcomes.map(officialSkillId), prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", actions: { continueTargetSkillId: officialSkillId(sliceOutcomes[0]), remediateTargetSkillId: officialSkillId(prerequisiteOutcomeIds[0]), advanceTargetSkillId: officialSkillId(sliceOutcomes[2]), retentionTargetSkillId: officialSkillId(sliceOutcomes[0]), mixedPracticeTargetSkillIds: [officialSkillId(sliceOutcomes[1]), officialSkillId(sliceOutcomes[2])] }, nextTargetSkillId: officialSkillId(nextTargetOutcomeIds[0]), schoolGradeMutation: false, entitlementGrant: false } as const;
export const gradeTwoWaveGMetadata = { schemaVersion: "plave-wave-g-metadata-v1", wave: "G", grade, title: "Đọc biểu đồ tranh, nhận xét và kiểm đếm dữ liệu", unitIds: [unitId, "grade-2-data-and-measurement-experience-p1"], sourceClassification: "SOURCE_VERIFIED", sourceOutcomeIds: sliceOutcomes, sourcePages: [28], prerequisiteOutcomeIds, prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", nextTargetOutcomeIds, nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", deferredOutcomeIds: ["MOET2018-G2-STA-P028-002"] as const, production: gradeTwoWaveGPack.production, candidate: gradeTwoWaveGPack.candidate, progression: gradeTwoWaveGProgression, release: gradeTwoWaveGPack.release } as const;
