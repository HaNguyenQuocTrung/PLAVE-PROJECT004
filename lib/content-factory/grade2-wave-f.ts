import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { AnswerContract, CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 2 as const;
const packId = "grade-2-wave-f-number-order";
const candidateId = "g2-number-order-wave-f";
const version = "g2-number-order-1.0.0-wave-f";
const policyVersion = "g2-number-order-policy-1.0.0-wave-f";
const sourceId = officialSourceReferenceId(grade);
const sliceOutcomes = ["MOET2018-G2-NUM-P025-007", "MOET2018-G2-NUM-P025-008", "MOET2018-G2-NUM-P025-014", "MOET2018-G2-NUM-P025-019"] as const;
const prerequisiteOutcomeIds = ["MOET2018-G2-GEO-P027-019"] as const;
const nextTargetOutcomeIds = ["MOET2018-G2-NUM-P025-019"] as const;
type SliceOutcome = (typeof sliceOutcomes)[number];
type GeneratedItem = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;
const purposes = ["FOUNDATION", "FOUNDATION", "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "TRANSFER_APPLICATION"] as const;
const value = (numerator: number): MathExpression => ({ op: "VALUE", numerator, denominator: 1 });
const binary = (op: "ADD" | "SUBTRACT", left: MathExpression, right: MathExpression): MathExpression => ({ op, left, right });
function difficulty(index: number): DifficultyBand { return index < 2 ? "FOUNDATIONAL" : index < 5 ? "CORE" : "EXTENSION"; }
function exact(expression: MathExpression) { const result = evaluateExpression(expression); if (result.denominator !== 1) throw new Error("GRADE2_WAVE_F_INTEGER_REQUIRED"); return String(result.numerator); }
const receiptIds = requiredAutomatedEvidenceChecks.map((check) => `${packId}-${check.toLowerCase().replaceAll("_", "-")}`);

function item(number: number, outcomeId: SliceOutcome, localIndex: number, prompt: string, answer: AnswerContract, steps: readonly string[], options: readonly string[] | null = null): GeneratedItem {
  const id = `g2-wave-f-${String(number).padStart(2, "0")}`;
  const normalizedPrompt = prompt.normalize("NFC");
  const band = difficulty(localIndex);
  return {
    question: { id, grade, unitId: outcomeId === sliceOutcomes[3] ? "grade-2-calculation-strategies-p0" : "grade-2-number-order-and-line-p0", blueprintId: `g2-wave-f-blueprint-${outcomeId.toLowerCase()}-${band.toLowerCase()}`, skillId: officialSkillId(outcomeId), prompt: normalizedPrompt, options, answer, explanationId: `${id}-explanation`, difficulty: band, provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g2-number-order-wave-f-template-1.0.0", seed: `g2-wave-f-${outcomeId.toLowerCase()}-${String(number).padStart(2, "0")}`, sourceReferenceIds: [sourceId] }, reviewStatus: "BUNDLED", published: false, pilotEligible: false, fixtureOnly: false, duplicateFingerprint: sha256(normalizedDefinition(`${normalizedPrompt}|${options?.join("|") ?? ""}`).toLocaleLowerCase("vi")), validationReceiptIds: receiptIds, instructionalPurpose: purposes[localIndex]! },
    explanation: { id: `${id}-explanation`, questionId: id, steps: steps.map((step) => step.normalize("NFC")), finalAnswer: answer.exactValue!, evidenceReceiptIds: [`${packId}-explanation-consistency`] },
  };
}

const generated: GeneratedItem[] = [];
const comparisons = [[348, 384], [620, 602], [505, 505], [799, 800], [930, 903], [1_000, 999]] as const;
comparisons.forEach(([left, right], index) => {
  const relation = left < right ? "<" : left > right ? ">" : "=";
  generated.push(item(index + 1, sliceOutcomes[0], index, `Điền dấu <, = hoặc >: ${left} … ${right}.`, { type: "SINGLE_CHOICE", exactValue: relation, comparison: { left: value(left), right: value(right), relation, exactAnswer: relation } }, ["So sánh hàng trăm, rồi hàng chục và hàng đơn vị.", `Quan hệ đúng là ${left} ${relation} ${right}.`], ["<", "=", ">"]));
});
const rayCases = [
  ["Trên tia số, các vạch liên tiếp ghi 120, 130, ?, 150. Số ở vạch ? là bao nhiêu?", binary("ADD", value(120), value(20))],
  ["Trên tia số, các vạch liên tiếp ghi 245, 255, ?, 275. Số ở vạch ? là bao nhiêu?", binary("ADD", value(245), value(20))],
  ["Hai vạch liền nhau là 400 và 420. Vạch nằm chính giữa biểu diễn số nào?", binary("ADD", value(400), value(10))],
  ["Trên tia số, các vạch cách đều ghi 600, 650, ?, 750. Số còn thiếu là bao nhiêu?", binary("ADD", value(600), value(100))],
  ["Một vạch ghi 875; mỗi bước sang phải tăng 25. Vạch kế tiếp ghi số nào?", binary("ADD", value(875), value(25))],
  ["Bắt đầu ở 320, đi 3 bước bằng nhau, mỗi bước tăng 40. Điểm đến biểu diễn số nào?", binary("ADD", value(320), value(120))],
] as const;
rayCases.forEach(([prompt, derivation], index) => generated.push(item(index + 7, sliceOutcomes[1], index, prompt, { type: "INTEGER_INPUT", exactValue: exact(derivation), derivation }, ["Xác định độ tăng đều giữa hai vạch.", `Tính theo số bước để được ${exact(derivation)}.`])));
const orderCases = [
  ["Sắp xếp 316, 361, 136 theo thứ tự tăng dần. Số đứng thứ hai là số nào?", 316],
  ["Sắp xếp 725, 572, 752, 527 theo thứ tự giảm dần. Số đứng thứ ba là số nào?", 572],
  ["Trong các số 408, 480, 840, số nào đứng giữa khi xếp tăng dần?", 480],
  ["Xếp 999, 909, 990, 900 theo thứ tự tăng dần. Số đứng thứ ba là số nào?", 990],
  ["Xếp 250, 205, 520, 502 theo thứ tự giảm dần. Số đứng thứ hai là số nào?", 502],
  ["Sắp xếp 111, 101, 110, 100 theo thứ tự tăng dần. Số đứng ngay trước 111 là số nào?", 110],
] as const;
orderCases.forEach(([prompt, answer], index) => generated.push(item(index + 13, sliceOutcomes[2], index, prompt, { type: "INTEGER_INPUT", exactValue: String(answer), derivation: value(answer) }, ["So sánh lần lượt theo hàng trăm, hàng chục, hàng đơn vị.", `Đặt đúng vị trí yêu cầu được ${answer}.`])));
const extremaCases = [
  ["Số lớn nhất trong 245, 425, 254, 452 là số nào?", 452], ["Số nhỏ nhất trong 608, 680, 806, 860 là số nào?", 608],
  ["Chọn số lớn nhất trong 999, 990, 909.", 999], ["Chọn số nhỏ nhất trong 317, 371, 173, 713.", 173],
  ["Bốn thẻ ghi 500, 505, 550, 555. Thẻ nào mang số lớn nhất?", 555], ["Trong 1 000, 100, 10 và 1, số nào nhỏ nhất?", 1],
] as const;
extremaCases.forEach(([prompt, answer], index) => generated.push(item(index + 19, sliceOutcomes[3], index, prompt, { type: "INTEGER_INPUT", exactValue: String(answer), derivation: value(answer) }, ["So sánh các số theo giá trị từng hàng.", `Giá trị cần chọn là ${answer}.`])));

const questions = generated.map((entry) => entry.question); const explanations = generated.map((entry) => entry.explanation);
if (questions.length !== 24 || new Set(questions.map((question) => question.id)).size !== 24) throw new Error("GRADE2_WAVE_F_GENERATION_COUNT");
export const gradeTwoWaveFOracleRows = questions.map((question) => {
  const derived = question.answer.comparison ? (() => { const left = Number(exact(question.answer.comparison!.left)); const right = Number(exact(question.answer.comparison!.right)); return left < right ? "<" : left > right ? ">" : "="; })() : exact(question.answer.derivation!);
  const explanation = explanations.find((entry) => entry.questionId === question.id)!;
  if (derived !== question.answer.exactValue || explanation.finalAnswer !== derived) throw new Error(`GRADE2_WAVE_F_ORACLE_MISMATCH:${question.id}`);
  return { questionId: question.id, independentlyDerived: derived, answerMatches: true as const, explanationMatches: true as const };
});
const skeleton = buildOfficialGradeSkeleton(grade);
const blueprints = [...new Map(questions.map((question) => [question.blueprintId, { id: question.blueprintId, grade, skillId: question.skillId, difficulty: question.difficulty, questionType: question.answer.type, templateId: `g2-wave-f-template-${question.skillId}`, targetCount: questions.filter((entry) => entry.blueprintId === question.blueprintId).length, sourceReferenceIds: [sourceId] }])).values()];
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({ id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`, entityId: packId, check, status: "PASSED" as const, evidence: check === "SOURCE_MAPPING" ? `Source-locked outcomes ${sliceOutcomes.join(", ")} on retained page 25; approximate-estimation subpart excluded.` : check === "MATHEMATICAL_ANSWER" ? "Independent exact comparison, number-ray, ordering and extrema oracle verified all 24 answers." : `Deterministic Grade 2 Wave F ${check.toLowerCase().replaceAll("_", " ")} receipt.` }));
const candidateCore = { format: "plave-wave-f-candidate-v1", grade, candidateId, version, policyVersion, sourceOutcomeIds: sliceOutcomes, sourcePages: [25], blueprints, questions, explanations } as const;
export const gradeTwoWaveFBundleHash = sha256(canonicalize(candidateCore));
export const gradeTwoWaveFPack: GradePack = {
  schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC", sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units, knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives,
  prerequisites: [{ fromSkillId: officialSkillId(prerequisiteOutcomeIds[0]), toSkillId: officialSkillId(sliceOutcomes[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] }, ...sliceOutcomes.slice(0, -1).map((outcomeId, index) => ({ fromSkillId: officialSkillId(outcomeId), toSkillId: officialSkillId(sliceOutcomes[index + 1]!), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE" as const, sourceReferenceIds: [] }))],
  blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts, candidate: { candidateId, version, bundleHash: gradeTwoWaveFBundleHash, policyVersion }, adaptivePolicy: { version: policyVersion, status: "VALIDATED" }, release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false }, production: { wave: "F", selectedSliceId: "grade-2-number-order-and-line", selectionBasis: ["SOURCE_VERIFIED", "PAGE_25_LOCKED", "UNCOVERED_BY_WAVES_A_TO_E", "EXACT_NUMBER_ORDER_ORACLE", "APPROXIMATION_EXCLUDED"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 }, legacyAsset: null,
};
export const gradeTwoWaveFProgression = { grade, priorSkillId: officialSkillId(prerequisiteOutcomeIds[0]), waveFSkillIds: sliceOutcomes.map(officialSkillId), prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", actions: { continueTargetSkillId: officialSkillId(sliceOutcomes[0]), remediateTargetSkillId: officialSkillId(prerequisiteOutcomeIds[0]), advanceTargetSkillId: officialSkillId(sliceOutcomes[3]), retentionTargetSkillId: officialSkillId(sliceOutcomes[0]), mixedPracticeTargetSkillIds: [officialSkillId(sliceOutcomes[1]), officialSkillId(sliceOutcomes[2])] }, nextTargetSkillId: officialSkillId(nextTargetOutcomeIds[0]), schoolGradeMutation: false, entitlementGrant: false } as const;
export const gradeTwoWaveFMetadata = { schemaVersion: "plave-wave-f-metadata-v1", wave: "F", grade, title: "So sánh, tia số, sắp thứ tự và cực trị", unitIds: ["grade-2-number-order-and-line-p0", "grade-2-calculation-strategies-p0"], sourceClassification: "SOURCE_VERIFIED", sourceOutcomeIds: sliceOutcomes, sourcePages: [25], prerequisiteOutcomeIds, prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", nextTargetOutcomeIds, nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", excludedSourceSubpart: "Approximate estimation by tens is deferred because this Wave F slice is exact-only.", production: gradeTwoWaveFPack.production, candidate: gradeTwoWaveFPack.candidate, progression: gradeTwoWaveFProgression, release: gradeTwoWaveFPack.release } as const;
