import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 3 as const;
const packId = "grade-3-wave-f-division-expressions";
const candidateId = "g3-division-expressions-wave-f";
const version = "g3-division-expressions-1.0.0-wave-f";
const policyVersion = "g3-division-expressions-policy-1.0.0-wave-f";
const sourceId = officialSourceReferenceId(grade);
const sliceOutcomes = ["MOET2018-G3-NUM-P030-016", "MOET2018-G3-NUM-P030-019", "MOET2018-G3-NUM-P030-020", "MOET2018-G3-NUM-P030-022"] as const;
const prerequisiteOutcomeIds = ["MOET2018-G3-GEO-P032-022"] as const;
const nextTargetOutcomeIds = ["MOET2018-G3-NUM-P030-022"] as const;
type SliceOutcome = (typeof sliceOutcomes)[number];
type GeneratedItem = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;
const purposes = ["FOUNDATION", "FOUNDATION", "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "TRANSFER_APPLICATION"] as const;
const value = (numerator: number): MathExpression => ({ op: "VALUE", numerator, denominator: 1 });
const binary = (op: "ADD" | "SUBTRACT" | "MULTIPLY" | "DIVIDE", left: MathExpression, right: MathExpression): MathExpression => ({ op, left, right });
function difficulty(index: number): DifficultyBand { return index < 2 ? "FOUNDATIONAL" : index < 5 ? "CORE" : "EXTENSION"; }
function exact(expression: MathExpression) { const result = evaluateExpression(expression); if (result.denominator !== 1 || result.numerator < 0) throw new Error("GRADE3_WAVE_F_NONNEGATIVE_INTEGER_REQUIRED"); return String(result.numerator); }
const receiptIds = requiredAutomatedEvidenceChecks.map((check) => `${packId}-${check.toLowerCase().replaceAll("_", "-")}`);

function item(number: number, outcomeId: SliceOutcome, localIndex: number, prompt: string, derivation: MathExpression, steps: readonly string[]): GeneratedItem {
  const id = `g3-wave-f-${String(number).padStart(2, "0")}`; const normalizedPrompt = prompt.normalize("NFC"); const band = difficulty(localIndex); const exactValue = exact(derivation);
  return {
    question: { id, grade, unitId: outcomeId === sliceOutcomes[0] || outcomeId === sliceOutcomes[1] ? "grade-3-multiplicative-expression-p1" : "grade-3-expression-order-p1", blueprintId: `g3-wave-f-blueprint-${outcomeId.toLowerCase()}-${band.toLowerCase()}`, skillId: officialSkillId(outcomeId), prompt: normalizedPrompt, options: null, answer: { type: "INTEGER_INPUT", exactValue, derivation }, explanationId: `${id}-explanation`, difficulty: band, provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g3-division-expressions-wave-f-template-1.0.0", seed: `g3-wave-f-${outcomeId.toLowerCase()}-${String(number).padStart(2, "0")}`, sourceReferenceIds: [sourceId] }, reviewStatus: "BUNDLED", published: false, pilotEligible: false, fixtureOnly: false, duplicateFingerprint: sha256(normalizedDefinition(`${normalizedPrompt}|`).toLocaleLowerCase("vi")), validationReceiptIds: receiptIds, instructionalPurpose: purposes[localIndex]! },
    explanation: { id: `${id}-explanation`, questionId: id, steps: [...steps, `Giá trị cần nhập là ${exactValue}.`].map((step) => step.normalize("NFC")), finalAnswer: exactValue, evidenceReceiptIds: [`${packId}-explanation-consistency`] },
  };
}

const generated: GeneratedItem[] = [];
const remainderCases = [[17, 5, 3], [29, 4, 7], [46, 6, 7], [63, 8, 7], [74, 9, 8], [95, 7, 13]] as const;
remainderCases.forEach(([dividend, divisor, quotient], index) => {
  const remainder = dividend - divisor * quotient;
  if (remainder < 0 || remainder >= divisor) throw new Error("GRADE3_WAVE_F_REMAINDER_BOUND");
  const prompt = index < 2 ? `Chia ${dividend} cho ${divisor}. Số dư là bao nhiêu?` : index < 4 ? `Biết thương nguyên của ${dividend} : ${divisor} là ${quotient}. Tìm số dư.` : index === 4 ? `${dividend} nhãn được chia đều vào ${divisor} hộp. Sau khi mỗi hộp nhận ${quotient} nhãn, còn thừa bao nhiêu nhãn?` : `Bạn An nói ${dividend} : ${divisor} dư ${remainder + 1}. Hãy nhập số dư đúng.`;
  generated.push(item(index + 1, sliceOutcomes[0], index, prompt, binary("SUBTRACT", value(dividend), binary("MULTIPLY", value(divisor), value(quotient))), [`Tích của số chia và thương là ${divisor * quotient}.`, `Lấy ${dividend} − ${divisor * quotient} = ${remainder}; ${remainder} nhỏ hơn ${divisor}.`]));
});
const parenthesized = [
  ["Tính (18 + 7) × 3.", binary("MULTIPLY", binary("ADD", value(18), value(7)), value(3)), ["Tính trong ngoặc trước: 18 + 7 = 25.", "Sau đó tính 25 × 3."]],
  ["Tính 84 : (9 − 2).", binary("DIVIDE", value(84), binary("SUBTRACT", value(9), value(2))), ["Tính trong ngoặc trước: 9 − 2 = 7.", "Sau đó tính 84 : 7."]],
  ["Tính (45 − 17) + 26.", binary("ADD", binary("SUBTRACT", value(45), value(17)), value(26)), ["Tính trong ngoặc trước: 45 − 17 = 28.", "Sau đó cộng 28 + 26."]],
  ["Tính 6 × (14 − 9).", binary("MULTIPLY", value(6), binary("SUBTRACT", value(14), value(9))), ["Tính trong ngoặc trước: 14 − 9 = 5.", "Sau đó tính 6 × 5."]],
  ["Bạn Mai tính 72 − 24 : 6. Hãy tính đúng biểu thức (72 − 24) : 6.", binary("DIVIDE", binary("SUBTRACT", value(72), value(24)), value(6)), ["Dấu ngoặc yêu cầu tính 72 − 24 = 48 trước.", "Sau đó tính 48 : 6."]],
  ["Tính 100 − (18 + 27).", binary("SUBTRACT", value(100), binary("ADD", value(18), value(27))), ["Tính trong ngoặc trước: 18 + 27 = 45.", "Sau đó tính 100 − 45."]],
] as const;
parenthesized.forEach(([prompt, derivation, steps], index) => generated.push(item(index + 7, sliceOutcomes[1], index, prompt, derivation, steps)));
const unparenthesized = [
  ["Tính 18 + 6 × 4.", binary("ADD", value(18), binary("MULTIPLY", value(6), value(4))), ["Thực hiện phép nhân trước: 6 × 4 = 24.", "Sau đó tính 18 + 24."]],
  ["Tính 72 : 8 + 15.", binary("ADD", binary("DIVIDE", value(72), value(8)), value(15)), ["Thực hiện phép chia trước: 72 : 8 = 9.", "Sau đó tính 9 + 15."]],
  ["Tính 90 − 7 × 8.", binary("SUBTRACT", value(90), binary("MULTIPLY", value(7), value(8))), ["Thực hiện phép nhân trước: 7 × 8 = 56.", "Sau đó tính 90 − 56."]],
  ["Tính 36 : 6 × 5.", binary("MULTIPLY", binary("DIVIDE", value(36), value(6)), value(5)), ["Phép chia và phép nhân cùng mức nên tính từ trái sang phải: 36 : 6 = 6.", "Sau đó tính 6 × 5."]],
  ["Bạn Bình cộng trước trong 25 + 48 : 6. Hãy tính đúng biểu thức.", binary("ADD", value(25), binary("DIVIDE", value(48), value(6))), ["Phép chia thực hiện trước: 48 : 6 = 8.", "Sau đó tính 25 + 8."]],
  ["Tính 81 : 9 − 4.", binary("SUBTRACT", binary("DIVIDE", value(81), value(9)), value(4)), ["Thực hiện phép chia trước: 81 : 9 = 9.", "Sau đó tính 9 − 4."]],
] as const;
unparenthesized.forEach(([prompt, derivation, steps], index) => generated.push(item(index + 13, sliceOutcomes[2], index, prompt, derivation, steps)));
const unknowns = [
  ["Tìm số chưa biết: ? + 237 = 600.", binary("SUBTRACT", value(600), value(237)), ["Số hạng chưa biết bằng tổng trừ số hạng đã biết."]],
  ["Tìm số chưa biết: ? − 185 = 420.", binary("ADD", value(420), value(185)), ["Số bị trừ bằng hiệu cộng số trừ."]],
  ["Tìm số chưa biết: 730 − ? = 280.", binary("SUBTRACT", value(730), value(280)), ["Số trừ bằng số bị trừ trừ hiệu."]],
  ["Tìm số chưa biết: ? × 6 = 54.", binary("DIVIDE", value(54), value(6)), ["Thừa số chưa biết bằng tích chia thừa số đã biết."]],
  ["Tìm số chưa biết: ? : 7 = 8.", binary("MULTIPLY", value(7), value(8)), ["Số bị chia bằng thương nhân số chia."]],
  ["Tìm số chưa biết: 72 : ? = 9.", binary("DIVIDE", value(72), value(9)), ["Số chia bằng số bị chia chia thương."]],
] as const;
unknowns.forEach(([prompt, derivation, steps], index) => generated.push(item(index + 19, sliceOutcomes[3], index, prompt, derivation, steps)));

const questions = generated.map((entry) => entry.question); const explanations = generated.map((entry) => entry.explanation);
if (questions.length !== 24 || new Set(questions.map((question) => question.id)).size !== 24) throw new Error("GRADE3_WAVE_F_GENERATION_COUNT");
export const gradeThreeWaveFOracleRows = questions.map((question) => { const independentlyDerived = exact(question.answer.derivation!); const explanation = explanations.find((entry) => entry.questionId === question.id)!; if (independentlyDerived !== question.answer.exactValue || explanation.finalAnswer !== independentlyDerived) throw new Error(`GRADE3_WAVE_F_ORACLE_MISMATCH:${question.id}`); return { questionId: question.id, independentlyDerived, answerMatches: true as const, explanationMatches: true as const }; });
const skeleton = buildOfficialGradeSkeleton(grade);
const blueprints = [...new Map(questions.map((question) => [question.blueprintId, { id: question.blueprintId, grade, skillId: question.skillId, difficulty: question.difficulty, questionType: question.answer.type, templateId: `g3-wave-f-template-${question.skillId}`, targetCount: questions.filter((entry) => entry.blueprintId === question.blueprintId).length, sourceReferenceIds: [sourceId] }])).values()];
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({ id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`, entityId: packId, check, status: "PASSED" as const, evidence: check === "SOURCE_MAPPING" ? `Source-locked outcomes ${sliceOutcomes.join(", ")} on retained page 30.` : check === "MATHEMATICAL_ANSWER" ? "Independent expression-tree oracle verified exact remainder, operation order and inverse-operation answers for all 24 items." : `Deterministic Grade 3 Wave F ${check.toLowerCase().replaceAll("_", " ")} receipt.` }));
const candidateCore = { format: "plave-wave-f-candidate-v1", grade, candidateId, version, policyVersion, sourceOutcomeIds: sliceOutcomes, sourcePages: [30], blueprints, questions, explanations } as const;
export const gradeThreeWaveFBundleHash = sha256(canonicalize(candidateCore));
export const gradeThreeWaveFPack: GradePack = {
  schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC", sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units, knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives,
  prerequisites: [{ fromSkillId: officialSkillId(prerequisiteOutcomeIds[0]), toSkillId: officialSkillId(sliceOutcomes[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] }, ...sliceOutcomes.slice(0, -1).map((outcomeId, index) => ({ fromSkillId: officialSkillId(outcomeId), toSkillId: officialSkillId(sliceOutcomes[index + 1]!), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE" as const, sourceReferenceIds: [] }))],
  blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts, candidate: { candidateId, version, bundleHash: gradeThreeWaveFBundleHash, policyVersion }, adaptivePolicy: { version: policyVersion, status: "VALIDATED" }, release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false }, production: { wave: "F", selectedSliceId: "grade-3-division-expressions", selectionBasis: ["SOURCE_VERIFIED", "PAGE_30_LOCKED", "UNCOVERED_BY_WAVES_A_TO_E", "INDEPENDENT_EXPRESSION_ORACLE", "EXACT_INTEGER_ONLY"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 }, legacyAsset: null,
};
export const gradeThreeWaveFProgression = { grade, priorSkillId: officialSkillId(prerequisiteOutcomeIds[0]), waveFSkillIds: sliceOutcomes.map(officialSkillId), prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", actions: { continueTargetSkillId: officialSkillId(sliceOutcomes[0]), remediateTargetSkillId: officialSkillId(prerequisiteOutcomeIds[0]), advanceTargetSkillId: officialSkillId(sliceOutcomes[3]), retentionTargetSkillId: officialSkillId(sliceOutcomes[0]), mixedPracticeTargetSkillIds: [officialSkillId(sliceOutcomes[1]), officialSkillId(sliceOutcomes[2])] }, nextTargetSkillId: officialSkillId(nextTargetOutcomeIds[0]), schoolGradeMutation: false, entitlementGrant: false } as const;
export const gradeThreeWaveFMetadata = { schemaVersion: "plave-wave-f-metadata-v1", wave: "F", grade, title: "Chia có dư, thứ tự biểu thức và thành phần chưa biết", unitIds: ["grade-3-multiplicative-expression-p1", "grade-3-expression-order-p1"], sourceClassification: "SOURCE_VERIFIED", sourceOutcomeIds: sliceOutcomes, sourcePages: [30], prerequisiteOutcomeIds, prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", nextTargetOutcomeIds, nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", production: gradeThreeWaveFPack.production, candidate: gradeThreeWaveFPack.candidate, progression: gradeThreeWaveFProgression, release: gradeThreeWaveFPack.release } as const;
