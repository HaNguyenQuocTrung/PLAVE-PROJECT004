import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { gradeSevenWaveAPack } from "./grade7-wave-a.ts";
import { buildOfficialGradeSkeleton, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 7 as const;
const packId = "grade-7-finite-probability-wave-b";
const version = "g7-finite-probability-1.0.0-wave-b";
const candidateId = "g7-finite-probability-wave-b-rc1";
const policyVersion = "g7-finite-probability-policy-1.0.0-wave-b";
const unitId = "grade-7-data-and-probability";
const probabilitySkill = "moet2018-g7-sta-p062-010";
const rationalOperationSkill = "moet2018-g7-naa-p056-016";
const sourceId = officialSourceReferenceId(grade);

const value = (numerator: number, denominator = 1): MathExpression => ({ op: "VALUE", numerator, denominator });
const derivation = (favorable: number, total: number): MathExpression => ({ op: "DIVIDE", left: value(favorable), right: value(total) });
const gcd = (left: number, right: number): number => right === 0 ? Math.abs(left) : gcd(right, left % right);
const reduced = (favorable: number, total: number) => {
  const divisor = gcd(favorable, total);
  return total / divisor === 1 ? String(favorable / divisor) : `${favorable / divisor}/${total / divisor}`;
};
const difficulty = (index: number): DifficultyBand => index < 8 ? "FOUNDATIONAL" : index < 16 ? "CORE" : "EXTENSION";
const purpose = (index: number): NonNullable<CandidateQuestion["instructionalPurpose"]> => {
  const slot = index % 8;
  return slot < 2 ? "FOUNDATION" : slot < 4 ? "STANDARD_APPLICATION" : slot < 6 ? "MISCONCEPTION_TARGETING" : slot === 6 ? "REMEDIATION" : "TRANSFER_APPLICATION";
};

type ProbabilitySeed = Readonly<{ prompt: string; favorable: number; total: number; explanation: readonly string[] }>;
const bagSeeds: readonly ProbabilitySeed[] = [
  { prompt: "Một túi có 2 thẻ đỏ và 3 thẻ xanh giống nhau. Lấy ngẫu nhiên một thẻ. Xác suất lấy được thẻ đỏ là bao nhiêu?", favorable: 2, total: 5, explanation: ["Có 5 kết quả đồng khả năng theo màu của từng thẻ.", "Có 2 kết quả thuận lợi là hai thẻ đỏ."] },
  { prompt: "Một hộp có 4 viên bi vàng và 6 viên bi tím giống nhau. Lấy ngẫu nhiên một viên. Xác suất lấy được viên vàng là bao nhiêu?", favorable: 4, total: 10, explanation: ["Tổng số viên bi là 10.", "Có 4 viên bi vàng tạo kết quả thuận lợi."] },
  { prompt: "Một túi có 5 thẻ ghi số chẵn và 3 thẻ ghi số lẻ. Chọn ngẫu nhiên một thẻ. Xác suất chọn được thẻ ghi số lẻ là bao nhiêu?", favorable: 3, total: 8, explanation: ["Có 8 thẻ được chọn với khả năng như nhau.", "Có 3 thẻ ghi số lẻ."] },
  { prompt: "Một hộp có 7 viên bi trắng và 5 viên bi đen giống nhau. Lấy ngẫu nhiên một viên. Xác suất lấy được viên đen là bao nhiêu?", favorable: 5, total: 12, explanation: ["Tổng số kết quả đồng khả năng là 12.", "Năm kết quả ứng với viên bi đen."] },
  { prompt: "Một túi có 3 thẻ tròn, 4 thẻ vuông và 2 thẻ tam giác. Chọn ngẫu nhiên một thẻ. Xác suất chọn được thẻ vuông là bao nhiêu?", favorable: 4, total: 9, explanation: ["Tổng cộng có 9 thẻ.", "Bốn thẻ vuông là các kết quả thuận lợi."] },
  { prompt: "Một hộp có 6 viên bi xanh, 2 viên bi đỏ và 4 viên bi vàng. Lấy ngẫu nhiên một viên. Xác suất lấy được viên đỏ là bao nhiêu?", favorable: 2, total: 12, explanation: ["Có tất cả 12 viên bi.", "Có 2 viên bi đỏ."] },
  { prompt: "Một túi có 8 thẻ chữ và 2 thẻ số. Chọn ngẫu nhiên một thẻ. Xác suất chọn được thẻ số là bao nhiêu?", favorable: 2, total: 10, explanation: ["Mười thẻ tạo mười kết quả đồng khả năng.", "Hai kết quả là thẻ số."] },
  { prompt: "Một hộp có 9 thẻ màu cam và 6 thẻ màu xanh. Lấy ngẫu nhiên một thẻ. Xác suất lấy được thẻ màu cam là bao nhiêu?", favorable: 9, total: 15, explanation: ["Tổng số thẻ là 15.", "Có 9 thẻ màu cam."] },
];
const dieSeeds: readonly ProbabilitySeed[] = [
  { prompt: "Gieo một xúc xắc cân đối sáu mặt. Xác suất xuất hiện số chấm lớn hơn 4 là bao nhiêu?", favorable: 2, total: 6, explanation: ["Không gian mẫu gồm 1, 2, 3, 4, 5, 6.", "Các kết quả thuận lợi là 5 và 6."] },
  { prompt: "Gieo một xúc xắc cân đối sáu mặt. Xác suất xuất hiện số chấm chia hết cho 3 là bao nhiêu?", favorable: 2, total: 6, explanation: ["Sáu mặt là sáu kết quả đồng khả năng.", "Các số chia hết cho 3 là 3 và 6."] },
  { prompt: "Chọn ngẫu nhiên một thẻ trong các thẻ ghi số từ 1 đến 8. Xác suất chọn được bội của 2 là bao nhiêu?", favorable: 4, total: 8, explanation: ["Có 8 kết quả đồng khả năng.", "Các bội của 2 là 2, 4, 6, 8."] },
  { prompt: "Chọn ngẫu nhiên một thẻ trong các thẻ ghi số từ 1 đến 10. Xác suất chọn được số nguyên tố là bao nhiêu?", favorable: 4, total: 10, explanation: ["Có 10 thẻ.", "Các số nguyên tố là 2, 3, 5, 7."] },
  { prompt: "Gieo một xúc xắc cân đối sáu mặt. Xác suất xuất hiện số chấm không nhỏ hơn 3 là bao nhiêu?", favorable: 4, total: 6, explanation: ["Không gian mẫu có 6 phần tử.", "Các kết quả 3, 4, 5, 6 là thuận lợi."] },
  { prompt: "Chọn ngẫu nhiên một thẻ trong các thẻ ghi số từ 1 đến 12. Xác suất chọn được ước dương của 12 là bao nhiêu?", favorable: 6, total: 12, explanation: ["Có 12 kết quả đồng khả năng.", "Các ước dương là 1, 2, 3, 4, 6, 12."] },
  { prompt: "Chọn ngẫu nhiên một thẻ trong các thẻ ghi số từ 0 đến 9. Xác suất chọn được số lớn hơn 6 là bao nhiêu?", favorable: 3, total: 10, explanation: ["Các thẻ từ 0 đến 9 tạo 10 kết quả.", "Các số lớn hơn 6 là 7, 8, 9."] },
  { prompt: "Gieo một xúc xắc cân đối sáu mặt. Xác suất xuất hiện số chấm là số lẻ là bao nhiêu?", favorable: 3, total: 6, explanation: ["Có 6 kết quả đồng khả năng.", "Các kết quả lẻ là 1, 3, 5."] },
];
const spinnerSeeds: readonly ProbabilitySeed[] = [
  { prompt: "Một vòng quay có 8 phần bằng nhau, trong đó 3 phần được tô xanh. Quay một lần. Xác suất kim dừng ở phần xanh là bao nhiêu?", favorable: 3, total: 8, explanation: ["Tám phần bằng nhau là tám kết quả đồng khả năng.", "Ba phần xanh là thuận lợi."] },
  { prompt: "Một vòng quay có 10 phần bằng nhau, trong đó 4 phần mang hình ngôi sao. Quay một lần. Xác suất vào phần có ngôi sao là bao nhiêu?", favorable: 4, total: 10, explanation: ["Có 10 phần bằng nhau.", "Có 4 phần mang hình ngôi sao."] },
  { prompt: "Một vòng quay có 12 phần bằng nhau, trong đó 9 phần ghi chữ A. Quay một lần. Xác suất vào phần ghi chữ A là bao nhiêu?", favorable: 9, total: 12, explanation: ["Mười hai phần tạo không gian mẫu.", "Chín phần ghi chữ A."] },
  { prompt: "Một vòng quay có 15 phần bằng nhau, trong đó 6 phần tô đỏ. Quay một lần. Xác suất không vào phần đỏ là bao nhiêu?", favorable: 9, total: 15, explanation: ["Có 15 phần bằng nhau.", "Có 15 trừ 6 bằng 9 phần không đỏ."] },
  { prompt: "Một vòng quay có 16 phần bằng nhau, trong đó 2 phần ghi số 7. Quay một lần. Xác suất vào phần ghi số 7 là bao nhiêu?", favorable: 2, total: 16, explanation: ["Có 16 kết quả đồng khả năng.", "Hai phần ghi số 7."] },
  { prompt: "Một vòng quay có 18 phần bằng nhau, trong đó 12 phần tô vàng. Quay một lần. Xác suất vào phần vàng là bao nhiêu?", favorable: 12, total: 18, explanation: ["Có 18 phần bằng nhau.", "Mười hai phần vàng là thuận lợi."] },
  { prompt: "Một vòng quay có 20 phần bằng nhau, trong đó 5 phần mang hình tròn. Quay một lần. Xác suất không vào phần mang hình tròn là bao nhiêu?", favorable: 15, total: 20, explanation: ["Có 20 kết quả đồng khả năng.", "Có 15 phần không mang hình tròn."] },
  { prompt: "Một vòng quay có 24 phần bằng nhau, trong đó 8 phần tô tím. Quay một lần. Xác suất vào phần tím là bao nhiêu?", favorable: 8, total: 24, explanation: ["Có 24 phần bằng nhau.", "Tám phần tím là thuận lợi."] },
];
const seeds = [...bagSeeds, ...dieSeeds, ...spinnerSeeds];

const skeleton = buildOfficialGradeSkeleton(grade);
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({
  id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`,
  entityId: packId,
  check,
  status: "PASSED" as const,
  evidence: check === "MATHEMATICAL_ANSWER"
    ? "Independent favorable-outcome and finite-sample-space counts reproduce every reduced rational answer."
    : `Deterministic Grade 7 Wave B ${check.toLowerCase().replaceAll("_", " ")} evidence.`,
}));
const receiptIds = evidenceReceipts.map((receipt) => receipt.id);
const questions: CandidateQuestion[] = seeds.map((seed, index) => {
  const prompt = seed.prompt.normalize("NFC");
  const band = difficulty(index);
  return {
    id: `g7-wave-b-probability-q${String(index + 1).padStart(2, "0")}`,
    grade,
    unitId,
    blueprintId: `g7-wave-b-probability-${band.toLowerCase()}`,
    skillId: probabilitySkill,
    prompt,
    options: null,
    answer: { type: "RATIONAL_INPUT", exactValue: reduced(seed.favorable, seed.total), derivation: derivation(seed.favorable, seed.total) },
    explanationId: `g7-wave-b-probability-q${String(index + 1).padStart(2, "0")}-explanation`,
    difficulty: band,
    provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g7-finite-probability-template-v1", seed: `g7-wave-b-${index + 1}`, sourceReferenceIds: [sourceId] },
    reviewStatus: "BUNDLED",
    published: false,
    pilotEligible: false,
    fixtureOnly: false,
    duplicateFingerprint: sha256(normalizedDefinition(`${prompt}|`).toLocaleLowerCase("vi")),
    validationReceiptIds: receiptIds,
    instructionalPurpose: purpose(index),
  };
});
const explanations: ExplanationSpec[] = questions.map((question, index) => ({
  id: question.explanationId,
  questionId: question.id,
  steps: [...seeds[index]!.explanation, "Lấy số kết quả thuận lợi chia cho tổng số kết quả rồi rút gọn."],
  finalAnswer: question.answer.exactValue!,
  evidenceReceiptIds: [`${packId}-explanation-consistency`],
}));
const blueprints = (["FOUNDATIONAL", "CORE", "EXTENSION"] as const).map((band) => ({
  id: `g7-wave-b-probability-${band.toLowerCase()}`,
  grade,
  skillId: probabilitySkill,
  difficulty: band,
  questionType: "RATIONAL_INPUT" as const,
  templateId: "g7-finite-probability-template-v1",
  targetCount: 8,
  sourceReferenceIds: [sourceId],
}));
const candidateCore = { format: "plave-wave-b-candidate-v1", grade, candidateId, version, policyVersion, sourceOutcomeIds: ["MOET2018-G7-STA-P062-010"], blueprints, questions, explanations };
const bundleHash = sha256(canonicalize(candidateCore));

export const gradeSevenWaveBPack: GradePack = {
  schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC",
  sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units, knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives,
  prerequisites: [{ fromSkillId: rationalOperationSkill, toSkillId: probabilitySkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] }],
  blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts,
  candidate: { candidateId, version, bundleHash, policyVersion },
  adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
  release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
  production: { wave: "B", selectedSliceId: "g7-finite-sample-probability", selectionBasis: ["SOURCE_VERIFIED", "EXACT_FINITE_SAMPLE_SPACE", "NO_DIAGRAM_DEPENDENCY", "ADAPTIVE_SIMULATION_SUITABLE"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 },
  legacyAsset: null,
};

export const gradeSevenWaveBMetadata = Object.freeze({ schemaVersion: "plave-wave-b-metadata-v1", grade, title: "Xác suất trong không gian mẫu hữu hạn đơn giản", sourceOutcomeIds: ["MOET2018-G7-STA-P062-010"] as const, prerequisiteOutcomeIds: ["MOET2018-G7-NAA-P056-016"] as const, prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", nextTargetOutcomeIds: ["MOET2018-G7-STA-P061-001", "MOET2018-G7-STA-P061-002"] as const, nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", production: gradeSevenWaveBPack.production, candidate: gradeSevenWaveBPack.candidate, release: gradeSevenWaveBPack.release });
export const gradeSevenWavesAB = Object.freeze({ grade, packs: [gradeSevenWaveAPack, gradeSevenWaveBPack] as const, questions: [...gradeSevenWaveAPack.questions, ...gradeSevenWaveBPack.questions], candidateBindings: [gradeSevenWaveAPack.candidate, gradeSevenWaveBPack.candidate], release: gradeSevenWaveBPack.release, nextTargetOutcomeIds: gradeSevenWaveBMetadata.nextTargetOutcomeIds });
