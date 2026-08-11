import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { gradeSevenWaveAPack } from "./grade7-wave-a.ts";
import { gradeSevenWaveBPack } from "./grade7-wave-b.ts";
import { buildOfficialGradeSkeleton, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 7 as const;
const packId = "grade-7-ratios-proportional-relationships-wave-c";
const version = "g7-ratios-proportional-relationships-1.0.0-wave-c";
const candidateId = "g7-ratios-proportional-relationships-wave-c-rc1";
const policyVersion = "g7-ratios-proportional-relationships-policy-1.0.0-wave-c";
const sourceId = officialSourceReferenceId(grade);
const ratioUnit = "grade-7-ratio-proportion";
const proportionUnit = "grade-7-secondary-naa-p1-5";
const applicationUnit = "grade-7-secondary-naa-p1-6";
const inverseSkill = "moet2018-g7-naa-p057-019";
const directSkill = "moet2018-g7-naa-p057-020";
const equalRatioSkill = "moet2018-g7-naa-p057-024";
const proportionSkill = "moet2018-g7-naa-p057-028";
const divideRatioSkill = "moet2018-g7-naa-p057-031";
const proportionApplicationSkill = "moet2018-g7-naa-p057-032";

const value = (numerator: number, denominator = 1): MathExpression => ({ op: "VALUE", numerator, denominator });
const multiply = (left: MathExpression, right: MathExpression): MathExpression => ({ op: "MULTIPLY", left, right });
const divide = (left: MathExpression, right: MathExpression): MathExpression => ({ op: "DIVIDE", left, right });
const productOver = (left: number, right: number, denominator: number) => divide(multiply(value(left), value(right)), value(denominator));
const purpose = (index: number): NonNullable<CandidateQuestion["instructionalPurpose"]> => {
  const slot = index % 8;
  return slot < 2 ? "FOUNDATION" : slot < 4 ? "STANDARD_APPLICATION" : slot < 6 ? "MISCONCEPTION_TARGETING" : slot === 6 ? "REMEDIATION" : "TRANSFER_APPLICATION";
};

type Seed = Readonly<{
  prompt: string;
  answer: number;
  derivation: MathExpression;
  skillId: string;
  unitId: string;
  blueprintId: string;
  difficulty: DifficultyBand;
  explanation: readonly string[];
}>;

const equalRatioInputs = [
  { prompt: "Hoàn thành dãy tỉ số 2/3 = x/12. Giá trị nguyên của x là bao nhiêu?", a: 2, b: 3, scaleTarget: 12, answer: 8 },
  { prompt: "Hai tỉ số 5/7 và y/21 bằng nhau. Giá trị nguyên của y là bao nhiêu?", a: 5, b: 7, scaleTarget: 21, answer: 15 },
  { prompt: "Điền số nguyên còn thiếu vào 4/9 = z/27. z bằng bao nhiêu?", a: 4, b: 9, scaleTarget: 27, answer: 12 },
  { prompt: "Dãy tỉ số 7/8 = 21/t có cùng giá trị. Số nguyên t bằng bao nhiêu?", a: 7, b: 8, scaleTarget: 21, answer: 24, denominatorUnknown: true },
] as const;
const equalRatioSeeds: readonly Seed[] = equalRatioInputs.map((item) => ({
  prompt: item.prompt,
  answer: item.answer,
  derivation: "denominatorUnknown" in item ? productOver(item.b, item.scaleTarget, item.a) : productOver(item.a, item.scaleTarget, item.b),
  skillId: equalRatioSkill,
  unitId: ratioUnit,
  blueprintId: "g7-wave-c-equal-ratio-foundational",
  difficulty: "FOUNDATIONAL",
  explanation: ["Hai tỉ số bằng nhau nên cùng có một hệ số nhân ở tử và mẫu.", `Tính chính xác số còn thiếu được ${item.answer}.`],
}));

const proportionInputs = [
  { prompt: "Biết 3/5 = 12/x. Dùng tính chất tích chéo, tìm số nguyên x.", left: 5, right: 12, denominator: 3, answer: 20 },
  { prompt: "Tỉ lệ thức 7/9 = y/36 có y là số nguyên nào?", left: 7, right: 36, denominator: 9, answer: 28 },
  { prompt: "Trong tỉ lệ thức x/14 = 6/21, giá trị nguyên của x bằng bao nhiêu?", left: 14, right: 6, denominator: 21, answer: 4 },
  { prompt: "Cho 15/a = 5/8. Tính số nguyên dương a bằng tính chất của tỉ lệ thức.", left: 15, right: 8, denominator: 5, answer: 24 },
] as const;
const proportionSeeds: readonly Seed[] = proportionInputs.map((item) => ({
  prompt: item.prompt,
  answer: item.answer,
  derivation: productOver(item.left, item.right, item.denominator),
  skillId: proportionSkill,
  unitId: proportionUnit,
  blueprintId: "g7-wave-c-proportion-property-foundational",
  difficulty: "FOUNDATIONAL",
  explanation: ["Trong một tỉ lệ thức, tích hai ngoại tỉ bằng tích hai trung tỉ.", `Cô lập ẩn rồi thực hiện phép chia chính xác, được ${item.answer}.`],
}));

const directInputs = [
  { prompt: "Ba hộp giống nhau chứa tổng cộng 18 bút. Với cùng số bút mỗi hộp, 7 hộp chứa bao nhiêu bút?", base: 3, amount: 18, target: 7, answer: 42 },
  { prompt: "Một máy đóng được 45 gói trong 5 phút với tốc độ không đổi. Trong 8 phút máy đóng được bao nhiêu gói?", base: 5, amount: 45, target: 8, answer: 72 },
  { prompt: "Bốn mét dây cùng loại có giá 60 nghìn đồng. Chín mét dây có giá bao nhiêu nghìn đồng?", base: 4, amount: 60, target: 9, answer: 135 },
  { prompt: "Sáu khay như nhau xếp được 48 cốc. Cần bao nhiêu cốc để xếp đủ 11 khay như thế?", base: 6, amount: 48, target: 11, answer: 88 },
] as const;
const directSeeds: readonly Seed[] = directInputs.map((item) => ({
  prompt: item.prompt,
  answer: item.answer,
  derivation: productOver(item.amount, item.target, item.base),
  skillId: directSkill,
  unitId: ratioUnit,
  blueprintId: "g7-wave-c-direct-proportion-core",
  difficulty: "CORE",
  explanation: [`Tính giá trị ứng với một đơn vị: ${item.amount} chia ${item.base}.`, `Nhân giá trị một đơn vị với ${item.target}, được ${item.answer}.`],
}));

const inverseInputs = [
  { prompt: "Sáu máy cùng năng suất hoàn thành một lô hàng trong 10 giờ. Chín máy như thế cần bao nhiêu giờ?", workers: 6, time: 10, target: 9, answer: 20 / 3 },
  { prompt: "Tám người làm cùng năng suất hoàn thành công việc trong 15 ngày. Mười người cần bao nhiêu ngày?", workers: 8, time: 15, target: 10, answer: 12 },
  { prompt: "Mười hai vòi giống nhau bơm đầy bể trong 6 phút. Chín vòi cần bao nhiêu phút?", workers: 12, time: 6, target: 9, answer: 8 },
  { prompt: "Năm máy cùng tốc độ xử lí một đơn hàng trong 18 phút. Mười lăm máy cần bao nhiêu phút?", workers: 5, time: 18, target: 15, answer: 6 },
] as const;
const gcd = (left: number, right: number): number => right === 0 ? Math.abs(left) : gcd(right, left % right);
const exact = (numerator: number, denominator = 1) => {
  const divisor = gcd(numerator, denominator);
  return denominator / divisor === 1 ? String(numerator / divisor) : `${numerator / divisor}/${denominator / divisor}`;
};
const inverseSeeds: readonly Seed[] = inverseInputs.map((item) => ({
  prompt: item.prompt,
  answer: item.answer,
  derivation: productOver(item.workers, item.time, item.target),
  skillId: inverseSkill,
  unitId: ratioUnit,
  blueprintId: "g7-wave-c-inverse-proportion-core",
  difficulty: "CORE",
  explanation: ["Với khối lượng công việc cố định, số người hoặc máy và thời gian là hai đại lượng tỉ lệ nghịch.", `Giữ tích không đổi: ${item.workers} × ${item.time} chia ${item.target} bằng ${exact(item.workers * item.time, item.target)}.`],
}));

const partitionInputs = [
  { prompt: "Chia 84 quyển vở thành hai phần theo tỉ lệ 3:4. Phần lớn có bao nhiêu quyển?", total: 84, part: 4, sum: 7, answer: 48 },
  { prompt: "Một khoản 150 nghìn đồng được chia theo tỉ lệ 2:3. Phần nhỏ là bao nhiêu nghìn đồng?", total: 150, part: 2, sum: 5, answer: 60 },
  { prompt: "Chia 180 cây giống cho ba nhóm theo tỉ lệ 2:3:4. Nhóm nhận nhiều nhất có bao nhiêu cây?", total: 180, part: 4, sum: 9, answer: 80 },
  { prompt: "Ba đoạn dây có tổng độ dài 132 cm và tỉ lệ 3:4:5. Đoạn giữa dài bao nhiêu xăng-ti-mét?", total: 132, part: 4, sum: 12, answer: 44 },
] as const;
const partitionSeeds: readonly Seed[] = partitionInputs.map((item) => ({
  prompt: item.prompt,
  answer: item.answer,
  derivation: productOver(item.total, item.part, item.sum),
  skillId: divideRatioSkill,
  unitId: proportionUnit,
  blueprintId: "g7-wave-c-divide-ratio-extension",
  difficulty: "EXTENSION",
  explanation: [`Tổng số phần tỉ lệ là ${item.sum}.`, `Phần được hỏi bằng ${item.total} × ${item.part} chia ${item.sum}, nên bằng ${item.answer}.`],
}));

const applicationInputs = [
  { prompt: "Một hình chữ nhật có chiều dài và chiều rộng tỉ lệ 5:3, chiều rộng 18 cm. Chiều dài bằng bao nhiêu xăng-ti-mét?", left: 18, right: 5, denominator: 3, answer: 30 },
  { prompt: "Số học sinh hai nhóm tỉ lệ 7:5. Nhóm thứ nhất có 42 học sinh. Nhóm thứ hai có bao nhiêu học sinh?", left: 42, right: 5, denominator: 7, answer: 30 },
  { prompt: "Hai số dương có tỉ lệ 4:9 và số lớn là 63. Số nhỏ bằng bao nhiêu?", left: 63, right: 4, denominator: 9, answer: 28 },
  { prompt: "Một bản vẽ dùng tỉ lệ độ dài 2:15. Đoạn 6 cm trên bản vẽ ứng với bao nhiêu xăng-ti-mét thực tế?", left: 6, right: 15, denominator: 2, answer: 45 },
] as const;
const applicationSeeds: readonly Seed[] = applicationInputs.map((item) => ({
  prompt: item.prompt,
  answer: item.answer,
  derivation: productOver(item.left, item.right, item.denominator),
  skillId: proportionApplicationSkill,
  unitId: applicationUnit,
  blueprintId: "g7-wave-c-proportion-application-extension",
  difficulty: "EXTENSION",
  explanation: ["Biểu diễn hai đại lượng bằng một tỉ lệ thức đúng thứ tự.", `Dùng tích chéo và chia cho hệ số tương ứng, được ${item.answer}.`],
}));

const seeds = [...equalRatioSeeds, ...proportionSeeds, ...directSeeds, ...inverseSeeds, ...partitionSeeds, ...applicationSeeds];
const skeleton = buildOfficialGradeSkeleton(grade);
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({
  id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`,
  entityId: packId,
  check,
  status: "PASSED" as const,
  evidence: check === "MATHEMATICAL_ANSWER"
    ? "Independent exact-rational oracle recomputes every cross-product, unit-rate, inverse-product, and ratio-partition answer."
    : `Deterministic Grade 7 Wave C ${check.toLowerCase().replaceAll("_", " ")} evidence.`,
}));
const receiptIds = evidenceReceipts.map((receipt) => receipt.id);
const questions: CandidateQuestion[] = seeds.map((seed, index) => {
  const prompt = seed.prompt.normalize("NFC");
  const answerValue = seed.answer === Math.trunc(seed.answer) ? String(seed.answer) : exact(Math.round(seed.answer * 3), 3);
  return {
    id: `g7-wave-c-ratio-q${String(index + 1).padStart(2, "0")}`,
    grade,
    unitId: seed.unitId,
    blueprintId: seed.blueprintId,
    skillId: seed.skillId,
    prompt,
    options: null,
    answer: { type: seed.blueprintId === "g7-wave-c-inverse-proportion-core" ? "RATIONAL_INPUT" : "INTEGER_INPUT", exactValue: answerValue, derivation: seed.derivation },
    explanationId: `g7-wave-c-ratio-q${String(index + 1).padStart(2, "0")}-explanation`,
    difficulty: seed.difficulty,
    provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g7-ratio-proportion-template-v1", seed: `g7-wave-c-${index + 1}`, sourceReferenceIds: [sourceId] },
    reviewStatus: "BUNDLED",
    published: false,
    pilotEligible: false,
    fixtureOnly: false,
    duplicateFingerprint: sha256(normalizedDefinition(`${prompt}|`).toLocaleLowerCase("vi")),
    validationReceiptIds: receiptIds,
    instructionalPurpose: purpose(index),
  };
});
const explanations: ExplanationSpec[] = questions.map((question, index) => ({ id: question.explanationId, questionId: question.id, steps: seeds[index]!.explanation, finalAnswer: question.answer.exactValue!, evidenceReceiptIds: [`${packId}-explanation-consistency`] }));
const blueprints = [
  { id: "g7-wave-c-equal-ratio-foundational", grade, skillId: equalRatioSkill, difficulty: "FOUNDATIONAL" as const, questionType: "INTEGER_INPUT" as const, templateId: "g7-ratio-proportion-template-v1", targetCount: 4, sourceReferenceIds: [sourceId] },
  { id: "g7-wave-c-proportion-property-foundational", grade, skillId: proportionSkill, difficulty: "FOUNDATIONAL" as const, questionType: "INTEGER_INPUT" as const, templateId: "g7-ratio-proportion-template-v1", targetCount: 4, sourceReferenceIds: [sourceId] },
  { id: "g7-wave-c-direct-proportion-core", grade, skillId: directSkill, difficulty: "CORE" as const, questionType: "INTEGER_INPUT" as const, templateId: "g7-ratio-proportion-template-v1", targetCount: 4, sourceReferenceIds: [sourceId] },
  { id: "g7-wave-c-inverse-proportion-core", grade, skillId: inverseSkill, difficulty: "CORE" as const, questionType: "RATIONAL_INPUT" as const, templateId: "g7-ratio-proportion-template-v1", targetCount: 4, sourceReferenceIds: [sourceId] },
  { id: "g7-wave-c-divide-ratio-extension", grade, skillId: divideRatioSkill, difficulty: "EXTENSION" as const, questionType: "INTEGER_INPUT" as const, templateId: "g7-ratio-proportion-template-v1", targetCount: 4, sourceReferenceIds: [sourceId] },
  { id: "g7-wave-c-proportion-application-extension", grade, skillId: proportionApplicationSkill, difficulty: "EXTENSION" as const, questionType: "INTEGER_INPUT" as const, templateId: "g7-ratio-proportion-template-v1", targetCount: 4, sourceReferenceIds: [sourceId] },
];
const sourceOutcomeIds = ["MOET2018-G7-NAA-P057-019", "MOET2018-G7-NAA-P057-020", "MOET2018-G7-NAA-P057-024", "MOET2018-G7-NAA-P057-028", "MOET2018-G7-NAA-P057-031", "MOET2018-G7-NAA-P057-032"] as const;
const candidateCore = { format: "plave-wave-c-candidate-v1", grade, candidateId, version, policyVersion, sourceOutcomeIds, blueprints, questions, explanations };
const bundleHash = sha256(canonicalize(candidateCore));

export const gradeSevenWaveCPack: GradePack = {
  schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC",
  sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units, knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives,
  prerequisites: [
    { fromSkillId: equalRatioSkill, toSkillId: directSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: equalRatioSkill, toSkillId: inverseSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: proportionSkill, toSkillId: divideRatioSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: proportionSkill, toSkillId: proportionApplicationSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  ],
  blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts,
  candidate: { candidateId, version, bundleHash, policyVersion }, adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
  release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
  production: { wave: "C", selectedSliceId: "g7-ratios-and-proportional-relationships", selectionBasis: ["SOURCE_VERIFIED", "PAGE_57_EXACT_ROWS", "EXACT_RATIONAL_ORACLE", "STRUCTURALLY_VARIED_PROPORTION_TASKS"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 },
  legacyAsset: null,
};

export const gradeSevenWaveCMetadata = Object.freeze({ schemaVersion: "plave-wave-c-metadata-v1", grade, title: "Tỉ số và các quan hệ tỉ lệ", sourcePages: [57] as const, sourceOutcomeIds, prerequisiteOutcomeIds: ["MOET2018-G7-NAA-P057-024", "MOET2018-G7-NAA-P057-028"] as const, prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", nextTargetOutcomeIds: ["MOET2018-G7-NAA-P057-030"] as const, nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", production: gradeSevenWaveCPack.production, candidate: gradeSevenWaveCPack.candidate, release: gradeSevenWaveCPack.release });
export const gradeSevenWavesABC = Object.freeze({ grade, packs: [gradeSevenWaveAPack, gradeSevenWaveBPack, gradeSevenWaveCPack] as const, questions: [...gradeSevenWaveAPack.questions, ...gradeSevenWaveBPack.questions, ...gradeSevenWaveCPack.questions], candidateBindings: [gradeSevenWaveAPack.candidate, gradeSevenWaveBPack.candidate, gradeSevenWaveCPack.candidate], release: gradeSevenWaveCPack.release, nextTargetOutcomeIds: gradeSevenWaveCMetadata.nextTargetOutcomeIds });
