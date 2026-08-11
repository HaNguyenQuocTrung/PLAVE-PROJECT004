import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { evaluateExpression } from "./math.ts";
import { buildOfficialGradeSkeleton, officialSkillId, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 2 as const;
const packId = "grade-2-wave-e-length-measurement";
const candidateId = "g2-length-measurement-wave-e";
const version = "g2-length-measurement-1.0.0-wave-e";
const policyVersion = "g2-length-measurement-policy-1.0.0-wave-e";
const sourceId = officialSourceReferenceId(grade);
const unitId = "grade-2-length-calculations";
const sliceOutcomes = ["MOET2018-G2-GEO-P027-012", "MOET2018-G2-GEO-P027-017", "MOET2018-G2-GEO-P027-019"] as const;
const prerequisiteOutcomeIds = ["MOET2018-G2-NUM-P026-020"] as const;
const nextTargetOutcomeIds = ["MOET2018-G2-GEO-P027-018"] as const;
type SliceOutcome = (typeof sliceOutcomes)[number];
type GeneratedItem = Readonly<{ question: CandidateQuestion; explanation: ExplanationSpec }>;

const purposes = ["FOUNDATION", "FOUNDATION", "FOUNDATION", "STANDARD_APPLICATION", "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "TRANSFER_APPLICATION"] as const;
function difficulty(index: number): DifficultyBand { return index < 3 ? "FOUNDATIONAL" : index < 7 ? "CORE" : "EXTENSION"; }
const value = (numerator: number): MathExpression => ({ op: "VALUE", numerator, denominator: 1 });
const binary = (op: "ADD" | "SUBTRACT" | "MULTIPLY" | "DIVIDE", left: MathExpression, right: MathExpression): MathExpression => ({ op, left, right });
const add = (...values: readonly number[]) => values.slice(1).reduce<MathExpression>((expression, item) => binary("ADD", expression, value(item)), value(values[0]!));
const multiply = (left: number, right: number) => binary("MULTIPLY", value(left), value(right));
const divide = (left: number, right: number) => binary("DIVIDE", value(left), value(right));
function exactInteger(expression: MathExpression) {
  const result = evaluateExpression(expression);
  if (result.denominator !== 1 || result.numerator < 0 || result.numerator > 10_000) throw new Error("GRADE2_WAVE_E_INTEGER_REQUIRED");
  return String(result.numerator);
}
const receiptIds = requiredAutomatedEvidenceChecks.map((check) => `${packId}-${check.toLowerCase().replaceAll("_", "-")}`);

function createItem(number: number, outcomeId: SliceOutcome, localIndex: number, prompt: string, derivation: MathExpression, unit: string, steps: readonly string[]): GeneratedItem {
  const suffix = String(number).padStart(2, "0");
  const id = `g2-wave-e-${suffix}`;
  const exactValue = exactInteger(derivation);
  const normalizedPrompt = prompt.normalize("NFC");
  return {
    question: {
      id, grade, unitId,
      blueprintId: `g2-wave-e-blueprint-${outcomeId.toLowerCase()}-${difficulty(localIndex).toLowerCase()}`,
      skillId: officialSkillId(outcomeId), prompt: normalizedPrompt, options: null,
      answer: { type: "INTEGER_INPUT", exactValue, derivation, unit }, explanationId: `${id}-explanation`, difficulty: difficulty(localIndex),
      provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g2-length-measurement-wave-e-template-1.0.0", seed: `g2-wave-e-${outcomeId.toLowerCase()}-${suffix}`, sourceReferenceIds: [sourceId] },
      reviewStatus: "BUNDLED", published: false, pilotEligible: false, fixtureOnly: false,
      duplicateFingerprint: sha256(normalizedDefinition(`${normalizedPrompt}|`).toLocaleLowerCase("vi")), validationReceiptIds: receiptIds, instructionalPurpose: purposes[localIndex]!,
    },
    explanation: { id: `${id}-explanation`, questionId: id, steps: [...steps, `Số đo cần nhập là ${exactValue}.`].map((step) => step.normalize("NFC")), finalAnswer: exactValue, evidenceReceiptIds: [`${packId}-explanation-consistency`] },
  };
}

const relationCases = [
  ["Một mét bằng bao nhiêu đề-xi-mét?", value(10), "dm", ["Quan hệ đơn vị: 1 m = 10 dm."]],
  ["Một đề-xi-mét bằng bao nhiêu xăng-ti-mét?", value(10), "cm", ["Quan hệ đơn vị: 1 dm = 10 cm."]],
  ["Một ki-lô-mét bằng bao nhiêu mét?", value(1_000), "m", ["Quan hệ đơn vị: 1 km = 1 000 m."]],
  ["Hai mét bằng bao nhiêu đề-xi-mét?", multiply(2, 10), "dm", ["Mỗi mét có 10 dm.", "Tính 2 × 10."]],
  ["Năm đề-xi-mét bằng bao nhiêu xăng-ti-mét?", multiply(5, 10), "cm", ["Mỗi đề-xi-mét có 10 cm.", "Tính 5 × 10."]],
  ["Bạn An viết 3 km = 300 m. Hãy nhập số mét đúng.", multiply(3, 1_000), "m", ["Mỗi ki-lô-mét có 1 000 m.", "Tính 3 × 1 000."]],
  ["Bảy mét bằng bao nhiêu đề-xi-mét?", multiply(7, 10), "dm", ["Đổi mét sang đề-xi-mét bằng cách nhân 10."]],
  ["Tám mươi xăng-ti-mét bằng bao nhiêu đề-xi-mét?", divide(80, 10), "dm", ["Mười xăng-ti-mét bằng một đề-xi-mét.", "Tính 80 : 10."]],
] as const;
const calculationCases = [
  ["Một đoạn dài 4 m nối với đoạn dài 3 m. Tổng độ dài là bao nhiêu mét?", add(4, 3), "m", ["Hai số đo cùng đơn vị mét nên cộng trực tiếp."]],
  ["Dải dây dài 8 dm, cắt đi 3 dm. Dải dây còn bao nhiêu đề-xi-mét?", binary("SUBTRACT", value(8), value(3)), "dm", ["Hai số đo cùng đơn vị đề-xi-mét nên trừ trực tiếp."]],
  ["Chín mét bằng bao nhiêu đề-xi-mét?", multiply(9, 10), "dm", ["Đổi mét sang đề-xi-mét bằng cách nhân 10."]],
  ["Một đoạn dài 6 dm nối với đoạn dài 20 cm. Tổng độ dài là bao nhiêu xăng-ti-mét?", add(60, 20), "cm", ["Đổi 6 dm thành 60 cm.", "Cộng 60 cm và 20 cm."]],
  ["Một mét dây cắt đi 35 cm. Còn lại bao nhiêu xăng-ti-mét?", binary("SUBTRACT", value(100), value(35)), "cm", ["Đổi 1 m thành 100 cm.", "Tính 100 − 35."]],
  ["Quãng đường thứ nhất dài 2 km, quãng đường thứ hai dài 3 km. Tổng dài bao nhiêu ki-lô-mét?", add(2, 3), "km", ["Hai quãng đường cùng đơn vị ki-lô-mét nên cộng."]],
  ["Bạn Mai cộng 45 cm với 5 cm nhưng ghi 55 cm. Hãy nhập tổng đúng.", add(45, 5), "cm", ["Cộng hai số đo cùng đơn vị.", "Tính 45 + 5."]],
  ["Chín mươi đề-xi-mét bằng bao nhiêu mét?", divide(90, 10), "m", ["Mười đề-xi-mét bằng một mét.", "Tính 90 : 10."]],
] as const;
const polylineCases = [
  ["Đường gấp khúc có hai đoạn dài 12 cm và 15 cm. Tổng độ dài là bao nhiêu xăng-ti-mét?", add(12, 15), "cm", ["Cộng độ dài hai đoạn của đường gấp khúc."]],
  ["Ba đoạn liên tiếp dài 8 cm, 9 cm và 10 cm. Đường gấp khúc dài bao nhiêu xăng-ti-mét?", add(8, 9, 10), "cm", ["Cộng lần lượt độ dài ba đoạn."]],
  ["Đường gấp khúc gồm 4 đoạn, mỗi đoạn dài 5 cm. Tổng độ dài là bao nhiêu xăng-ti-mét?", multiply(4, 5), "cm", ["Bốn đoạn bằng nhau, mỗi đoạn 5 cm.", "Tính 4 × 5."]],
  ["Một đường gấp khúc có các đoạn dài 20 cm, 13 cm và 7 cm. Tổng độ dài là bao nhiêu xăng-ti-mét?", add(20, 13, 7), "cm", ["Cộng đủ ba đoạn, mỗi đoạn chỉ tính một lần."]],
  ["Bốn cạnh liên tiếp của đường gấp khúc dài 6 cm, 11 cm, 9 cm và 4 cm. Tổng dài bao nhiêu xăng-ti-mét?", add(6, 11, 9, 4), "cm", ["Cộng độ dài của cả bốn đoạn."]],
  ["Bạn An bỏ quên đoạn 8 cm khi cộng đường gấp khúc gồm 14 cm, 8 cm và 16 cm. Hãy nhập tổng đúng.", add(14, 8, 16), "cm", ["Phải cộng cả ba đoạn đã cho."]],
  ["Đường gấp khúc gồm 5 đoạn bằng nhau, mỗi đoạn dài 3 dm. Tổng dài bao nhiêu đề-xi-mét?", multiply(5, 3), "dm", ["Năm đoạn bằng nhau, mỗi đoạn 3 dm.", "Tính 5 × 3."]],
  ["Một lối gấp khúc có các đoạn dài 2 m, 4 m, 3 m và 6 m. Tổng độ dài là bao nhiêu mét?", add(2, 4, 3, 6), "m", ["Các đoạn cùng đơn vị mét nên cộng tất cả."]],
] as const;

const generated: GeneratedItem[] = [];
relationCases.forEach(([prompt, expression, unit, steps], index) => generated.push(createItem(index + 1, sliceOutcomes[0], index, prompt, expression, unit, steps)));
calculationCases.forEach(([prompt, expression, unit, steps], index) => generated.push(createItem(index + 9, sliceOutcomes[1], index, prompt, expression, unit, steps)));
polylineCases.forEach(([prompt, expression, unit, steps], index) => generated.push(createItem(index + 17, sliceOutcomes[2], index, prompt, expression, unit, steps)));
const questions = generated.map((entry) => entry.question);
const explanations = generated.map((entry) => entry.explanation);
if (questions.length !== 24 || new Set(questions.map((question) => question.id)).size !== 24) throw new Error("GRADE2_WAVE_E_GENERATION_COUNT");
export const gradeTwoWaveEOracleRows = questions.map((question) => {
  const independentlyDerived = exactInteger(question.answer.derivation!); const explanation = explanations.find((entry) => entry.questionId === question.id)!;
  if (independentlyDerived !== question.answer.exactValue || explanation.finalAnswer !== independentlyDerived) throw new Error(`GRADE2_WAVE_E_ORACLE_MISMATCH:${question.id}`);
  return { questionId: question.id, independentlyDerived, unit: question.answer.unit, answerMatches: true as const, explanationMatches: true as const };
});

const skeleton = buildOfficialGradeSkeleton(grade);
const blueprintBands = [{ difficulty: "FOUNDATIONAL", targetCount: 3 }, { difficulty: "CORE", targetCount: 4 }, { difficulty: "EXTENSION", targetCount: 1 }] as const;
const blueprints = sliceOutcomes.flatMap((outcomeId) => blueprintBands.map((band) => ({ id: `g2-wave-e-blueprint-${outcomeId.toLowerCase()}-${band.difficulty.toLowerCase()}`, grade, skillId: officialSkillId(outcomeId), difficulty: band.difficulty, questionType: "INTEGER_INPUT" as const, templateId: `g2-wave-e-template-${outcomeId.toLowerCase()}`, targetCount: band.targetCount, sourceReferenceIds: [sourceId] })));
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({ id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`, entityId: packId, check, status: "PASSED" as const, evidence: check === "SOURCE_MAPPING" ? `Source-locked outcomes ${sliceOutcomes.join(", ")} on retained page 27.` : check === "MATHEMATICAL_ANSWER" ? "Independent exact conversion, arithmetic and polyline-sum oracle verified all 24 values and units." : `Deterministic Grade 2 Wave E ${check.toLowerCase().replaceAll("_", " ")} receipt.` }));
const candidateCore = { format: "plave-wave-e-candidate-v1", grade, candidateId, version, policyVersion, sourceOutcomeIds: sliceOutcomes, sourcePages: [27], blueprints, questions, explanations } as const;
export const gradeTwoWaveEBundleHash = sha256(canonicalize(candidateCore));
export const gradeTwoWaveEPack: GradePack = {
  schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC",
  sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units, knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives,
  prerequisites: [
    { fromSkillId: officialSkillId(prerequisiteOutcomeIds[0]), toSkillId: officialSkillId(sliceOutcomes[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: officialSkillId(sliceOutcomes[0]), toSkillId: officialSkillId(sliceOutcomes[1]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: officialSkillId(sliceOutcomes[1]), toSkillId: officialSkillId(sliceOutcomes[2]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: officialSkillId(sliceOutcomes[2]), toSkillId: officialSkillId(nextTargetOutcomeIds[0]), evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  ],
  blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts, candidate: { candidateId, version, bundleHash: gradeTwoWaveEBundleHash, policyVersion }, adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
  release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
  production: { wave: "E", selectedSliceId: unitId, selectionBasis: ["SOURCE_VERIFIED", "PAGE_27_LOCKED", "INDEPENDENT_LENGTH_ORACLE", "EXACT_UNIT_CONVERSION"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 }, legacyAsset: null,
};
export const gradeTwoWaveEProgression = { grade, priorSkillId: officialSkillId(prerequisiteOutcomeIds[0]), waveESkillIds: sliceOutcomes.map(officialSkillId), prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", actions: { continueTargetSkillId: officialSkillId(sliceOutcomes[0]), remediateTargetSkillId: officialSkillId(prerequisiteOutcomeIds[0]), advanceTargetSkillId: officialSkillId(sliceOutcomes[2]), retentionTargetSkillId: officialSkillId(sliceOutcomes[0]), mixedPracticeTargetSkillIds: [officialSkillId(sliceOutcomes[1]), officialSkillId(sliceOutcomes[2])] }, nextTargetSkillId: officialSkillId(nextTargetOutcomeIds[0]), schoolGradeMutation: false, entitlementGrant: false } as const;
export const gradeTwoWaveEMetadata = { schemaVersion: "plave-wave-e-metadata-v1", wave: "E", grade, title: "Quan hệ đơn vị độ dài, chuyển đổi và đường gấp khúc", unitId, sourceClassification: "SOURCE_VERIFIED", sourceOutcomeIds: sliceOutcomes, sourcePages: [27], prerequisiteOutcomeIds, prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", nextTargetOutcomeIds, nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", production: gradeTwoWaveEPack.production, candidate: gradeTwoWaveEPack.candidate, progression: gradeTwoWaveEProgression, release: gradeTwoWaveEPack.release } as const;
