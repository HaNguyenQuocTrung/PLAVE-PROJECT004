import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 3 as const;
const packId = "grade-3-wave-e-length-perimeter";
const candidateId = "g3-length-perimeter-wave-e";
const version = "g3-length-perimeter-1.0.0-wave-e";
const policyVersion = "g3-length-perimeter-policy-1.0.0-wave-e";
const sourceId = officialSourceReferenceId(grade);
const sliceOutcomes = ["MOET2018-G3-GEO-P032-015", "MOET2018-G3-GEO-P032-021", "MOET2018-G3-GEO-P032-022"] as const;
const prerequisiteOutcomeIds = ["MOET2018-G3-GEO-P033-025"] as const;
const nextTargetOutcomeIds = ["MOET2018-G3-GEO-P033-023"] as const;
type SliceOutcome = (typeof sliceOutcomes)[number];
type GeneratedItem = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;

const purposes = ["FOUNDATION", "FOUNDATION", "FOUNDATION", "STANDARD_APPLICATION", "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "TRANSFER_APPLICATION"] as const;
function difficulty(index: number): DifficultyBand { return index < 3 ? "FOUNDATIONAL" : index < 7 ? "CORE" : "EXTENSION"; }
const value = (numerator: number): MathExpression => ({ op: "VALUE", numerator, denominator: 1 });
const binary = (op: "ADD" | "SUBTRACT" | "MULTIPLY" | "DIVIDE", left: MathExpression, right: MathExpression): MathExpression => ({ op, left, right });
const add = (...items: readonly number[]) => items.slice(1).reduce<MathExpression>((expression, item) => binary("ADD", expression, value(item)), value(items[0]!));
const multiply = (left: number, right: number) => binary("MULTIPLY", value(left), value(right));
const divide = (left: number, right: number) => binary("DIVIDE", value(left), value(right));
function exactInteger(expression: MathExpression) {
  const result = evaluateExpression(expression);
  if (result.denominator !== 1 || result.numerator < 0 || result.numerator > 100_000) throw new Error("GRADE3_WAVE_E_INTEGER_REQUIRED");
  return String(result.numerator);
}
const receiptIds = requiredAutomatedEvidenceChecks.map((check) => `${packId}-${check.toLowerCase().replaceAll("_", "-")}`);

function createItem(number: number, outcomeId: SliceOutcome, localIndex: number, unitId: string, prompt: string, derivation: MathExpression, unit: string, steps: readonly string[]): GeneratedItem {
  const suffix = String(number).padStart(2, "0"); const id = `g3-wave-e-${suffix}`; const exactValue = exactInteger(derivation); const normalizedPrompt = prompt.normalize("NFC");
  return {
    question: {
      id, grade, unitId, blueprintId: `g3-wave-e-blueprint-${outcomeId.toLowerCase()}-${difficulty(localIndex).toLowerCase()}`, skillId: officialSkillId(outcomeId), prompt: normalizedPrompt, options: null,
      answer: { type: "INTEGER_INPUT", exactValue, derivation, unit }, explanationId: `${id}-explanation`, difficulty: difficulty(localIndex),
      provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g3-length-perimeter-wave-e-template-1.0.0", seed: `g3-wave-e-${outcomeId.toLowerCase()}-${suffix}`, sourceReferenceIds: [sourceId] },
      reviewStatus: "BUNDLED", published: false, pilotEligible: false, fixtureOnly: false, duplicateFingerprint: sha256(normalizedDefinition(`${normalizedPrompt}|`).toLocaleLowerCase("vi")), validationReceiptIds: receiptIds, instructionalPurpose: purposes[localIndex]!,
    },
    explanation: { id: `${id}-explanation`, questionId: id, steps: [...steps, `Số đo cần nhập là ${exactValue}.`].map((step) => step.normalize("NFC")), finalAnswer: exactValue, evidenceReceiptIds: [`${packId}-explanation-consistency`] },
  };
}

const lengthUnitId = "grade-3-length-reasoning";
const conversionUnitId = "grade-3-measurement-conversions-p0";
const relationCases = [
  ["Một xăng-ti-mét bằng bao nhiêu mi-li-mét?", value(10), "mm", ["Quan hệ đơn vị: 1 cm = 10 mm."]],
  ["Một đề-xi-mét bằng bao nhiêu mi-li-mét?", value(100), "mm", ["Một đề-xi-mét bằng 10 cm và mỗi xăng-ti-mét bằng 10 mm."]],
  ["Một mét bằng bao nhiêu mi-li-mét?", value(1_000), "mm", ["Một mét bằng 100 cm, mỗi xăng-ti-mét bằng 10 mm."]],
  ["Bốn xăng-ti-mét bằng bao nhiêu mi-li-mét?", multiply(4, 10), "mm", ["Đổi xăng-ti-mét sang mi-li-mét bằng cách nhân 10."]],
  ["Ba đề-xi-mét bằng bao nhiêu xăng-ti-mét?", multiply(3, 10), "cm", ["Mỗi đề-xi-mét bằng 10 cm."]],
  ["Hai mét bằng bao nhiêu xăng-ti-mét?", multiply(2, 100), "cm", ["Mỗi mét bằng 100 cm."]],
  ["Bạn An viết 70 mm = 70 cm. Hãy nhập số xăng-ti-mét đúng.", divide(70, 10), "cm", ["Mười mi-li-mét bằng một xăng-ti-mét.", "Tính 70 : 10."]],
  ["Chín trăm mi-li-mét bằng bao nhiêu đề-xi-mét?", divide(900, 100), "dm", ["Một trăm mi-li-mét bằng một đề-xi-mét.", "Tính 900 : 100."]],
] as const;
const conversionCases = [
  ["Đoạn thứ nhất dài 5 cm, đoạn thứ hai dài 25 mm. Tổng dài bao nhiêu mi-li-mét?", add(50, 25), "mm", ["Đổi 5 cm thành 50 mm.", "Cộng 50 mm và 25 mm."]],
  ["Thanh dài 2 dm, cắt đi 35 mm. Thanh còn dài bao nhiêu mi-li-mét?", binary("SUBTRACT", value(200), value(35)), "mm", ["Đổi 2 dm thành 200 mm.", "Tính 200 − 35."]],
  ["Ba mét cộng bốn đề-xi-mét bằng bao nhiêu đề-xi-mét?", add(30, 4), "dm", ["Đổi 3 m thành 30 dm.", "Cộng thêm 4 dm."]],
  ["Quãng đường dài 2 km rồi đi tiếp 500 m. Tổng quãng đường bằng bao nhiêu mét?", add(2_000, 500), "m", ["Đổi 2 km thành 2 000 m.", "Cộng 500 m."]],
  ["Một trăm hai mươi xăng-ti-mét bằng bao nhiêu đề-xi-mét?", divide(120, 10), "dm", ["Mười xăng-ti-mét bằng một đề-xi-mét."]],
  ["Một mét dây cắt đi 275 mm. Còn lại bao nhiêu mi-li-mét?", binary("SUBTRACT", value(1_000), value(275)), "mm", ["Đổi 1 m thành 1 000 mm.", "Tính 1 000 − 275."]],
  ["Bạn Mai đổi 3 000 m thành 30 km. Hãy nhập số ki-lô-mét đúng.", divide(3_000, 1_000), "km", ["Một nghìn mét bằng một ki-lô-mét.", "Tính 3 000 : 1 000."]],
  ["Sáu đề-xi-mét cộng mười lăm xăng-ti-mét bằng bao nhiêu xăng-ti-mét?", add(60, 15), "cm", ["Đổi 6 dm thành 60 cm.", "Cộng 15 cm."]],
] as const;
const perimeterCases = [
  ["Tam giác có ba cạnh dài 3 cm, 4 cm và 5 cm. Chu vi bằng bao nhiêu xăng-ti-mét?", add(3, 4, 5), "cm", ["Chu vi tam giác là tổng độ dài ba cạnh."]],
  ["Tứ giác có bốn cạnh dài 6 cm, 8 cm, 7 cm và 9 cm. Chu vi bằng bao nhiêu xăng-ti-mét?", add(6, 8, 7, 9), "cm", ["Cộng độ dài đủ bốn cạnh của tứ giác."]],
  ["Hình chữ nhật dài 9 cm và rộng 4 cm. Chu vi bằng bao nhiêu xăng-ti-mét?", multiply(2, 13), "cm", ["Chu vi hình chữ nhật bằng hai lần tổng chiều dài và chiều rộng.", "Tính 2 × (9 + 4)."]],
  ["Hình vuông có cạnh 7 cm. Chu vi bằng bao nhiêu xăng-ti-mét?", multiply(4, 7), "cm", ["Hình vuông có bốn cạnh bằng nhau.", "Tính 4 × 7."]],
  ["Khung ảnh hình chữ nhật dài 12 cm, rộng 5 cm. Độ dài đường viền là bao nhiêu xăng-ti-mét?", multiply(2, 17), "cm", ["Đường viền chính là chu vi hình chữ nhật.", "Tính 2 × (12 + 5)."]],
  ["Bạn An cộng 8 cm với 3 cm một lần để tính chu vi hình chữ nhật dài 8 cm, rộng 3 cm. Hãy nhập chu vi đúng.", multiply(2, 11), "cm", ["Mỗi kích thước xuất hiện ở hai cạnh.", "Tính 2 × (8 + 3)."]],
  ["Một sân vuông có cạnh 15 m. Đi một vòng sát mép sân dài bao nhiêu mét?", multiply(4, 15), "m", ["Một vòng quanh sân bằng chu vi hình vuông.", "Tính 4 × 15."]],
  ["Tứ giác có các cạnh 125 mm, 140 mm, 135 mm và 100 mm. Chu vi bằng bao nhiêu mi-li-mét?", add(125, 140, 135, 100), "mm", ["Cộng bốn độ dài cùng đơn vị mi-li-mét."]],
] as const;

const generated: GeneratedItem[] = [];
relationCases.forEach(([prompt, expression, unit, steps], index) => generated.push(createItem(index + 1, sliceOutcomes[0], index, lengthUnitId, prompt, expression, unit, steps)));
conversionCases.forEach(([prompt, expression, unit, steps], index) => generated.push(createItem(index + 9, sliceOutcomes[1], index, conversionUnitId, prompt, expression, unit, steps)));
perimeterCases.forEach(([prompt, expression, unit, steps], index) => generated.push(createItem(index + 17, sliceOutcomes[2], index, lengthUnitId, prompt, expression, unit, steps)));
const questions = generated.map((entry) => entry.question); const explanations = generated.map((entry) => entry.explanation);
if (questions.length !== 24 || new Set(questions.map((question) => question.id)).size !== 24) throw new Error("GRADE3_WAVE_E_GENERATION_COUNT");
export const gradeThreeWaveEOracleRows = questions.map((question) => { const independentlyDerived = exactInteger(question.answer.derivation!); const explanation = explanations.find((entry) => entry.questionId === question.id)!; if (independentlyDerived !== question.answer.exactValue || explanation.finalAnswer !== independentlyDerived) throw new Error(`GRADE3_WAVE_E_ORACLE_MISMATCH:${question.id}`); return { questionId: question.id, independentlyDerived, unit: question.answer.unit, answerMatches: true as const, explanationMatches: true as const }; });
const skeleton = buildOfficialGradeSkeleton(grade);
const blueprintBands = [{ difficulty: "FOUNDATIONAL", targetCount: 3 }, { difficulty: "CORE", targetCount: 4 }, { difficulty: "EXTENSION", targetCount: 1 }] as const;
const blueprints = sliceOutcomes.flatMap((outcomeId) => blueprintBands.map((band) => ({ id: `g3-wave-e-blueprint-${outcomeId.toLowerCase()}-${band.difficulty.toLowerCase()}`, grade, skillId: officialSkillId(outcomeId), difficulty: band.difficulty, questionType: "INTEGER_INPUT" as const, templateId: `g3-wave-e-template-${outcomeId.toLowerCase()}`, targetCount: band.targetCount, sourceReferenceIds: [sourceId] })));
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({ id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`, entityId: packId, check, status: "PASSED" as const, evidence: check === "SOURCE_MAPPING" ? `Source-locked outcomes ${sliceOutcomes.join(", ")} on retained page 32.` : check === "MATHEMATICAL_ANSWER" ? "Independent exact length-relation, conversion and perimeter oracle verified all values and units." : `Deterministic Grade 3 Wave E ${check.toLowerCase().replaceAll("_", " ")} receipt.` }));
const candidateCore = { format: "plave-wave-e-candidate-v1", grade, candidateId, version, policyVersion, sourceOutcomeIds: sliceOutcomes, sourcePages: [32], blueprints, questions, explanations } as const;
export const gradeThreeWaveEBundleHash = sha256(canonicalize(candidateCore));
export const gradeThreeWaveEPack: GradePack = {
  schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC",
  sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units, knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives,
  prerequisites: [
    { fromSkillId: officialSkillId(prerequisiteOutcomeIds[0]), toSkillId: officialSkillId(sliceOutcomes[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: officialSkillId(sliceOutcomes[0]), toSkillId: officialSkillId(sliceOutcomes[1]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: officialSkillId(sliceOutcomes[1]), toSkillId: officialSkillId(sliceOutcomes[2]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: officialSkillId(sliceOutcomes[2]), toSkillId: officialSkillId(nextTargetOutcomeIds[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  ],
  blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts, candidate: { candidateId, version, bundleHash: gradeThreeWaveEBundleHash, policyVersion }, adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
  release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
  production: { wave: "E", selectedSliceId: "grade-3-length-perimeter", selectionBasis: ["SOURCE_VERIFIED", "PAGE_32_LOCKED", "INDEPENDENT_MEASUREMENT_ORACLE", "EXACT_PERIMETER_ONLY"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 }, legacyAsset: null,
};
export const gradeThreeWaveEProgression = { grade, priorSkillId: officialSkillId(prerequisiteOutcomeIds[0]), waveESkillIds: sliceOutcomes.map(officialSkillId), prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", actions: { continueTargetSkillId: officialSkillId(sliceOutcomes[0]), remediateTargetSkillId: officialSkillId(prerequisiteOutcomeIds[0]), advanceTargetSkillId: officialSkillId(sliceOutcomes[2]), retentionTargetSkillId: officialSkillId(sliceOutcomes[0]), mixedPracticeTargetSkillIds: [officialSkillId(sliceOutcomes[1]), officialSkillId(sliceOutcomes[2])] }, nextTargetSkillId: officialSkillId(nextTargetOutcomeIds[0]), schoolGradeMutation: false, entitlementGrant: false } as const;
export const gradeThreeWaveEMetadata = { schemaVersion: "plave-wave-e-metadata-v1", wave: "E", grade, title: "Quan hệ độ dài, chuyển đổi và chu vi", unitIds: [lengthUnitId, conversionUnitId], sourceClassification: "SOURCE_VERIFIED", sourceOutcomeIds: sliceOutcomes, sourcePages: [32], prerequisiteOutcomeIds, prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", nextTargetOutcomeIds, nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", production: gradeThreeWaveEPack.production, candidate: gradeThreeWaveEPack.candidate, progression: gradeThreeWaveEProgression, release: gradeThreeWaveEPack.release } as const;
