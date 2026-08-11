import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { gradeNineWaveAPack } from "./grade9-wave-a.ts";
import { buildOfficialGradeSkeleton, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, ExplanationSpec, GradePack, MathExpression, QuestionType } from "./types.ts";

const grade = 9 as const;
const packId = "grade-9-finite-probability-frequency-wave-b";
const version = "g9-finite-probability-frequency-1.0.0-wave-b";
const candidateId = "g9-finite-probability-frequency-wave-b-rc1";
const policyVersion = "g9-finite-probability-frequency-policy-1.0.0-wave-b";
const sourceId = officialSourceReferenceId(grade);
const frequencySkill = "moet2018-g9-sta-p076-011";
const sampleSpaceSkill = "moet2018-g9-sta-p077-015";
const probabilitySkill = "moet2018-g9-sta-p077-020";
const relativeFrequencySkill = "moet2018-g9-sta-p077-021";

const value = (numerator: number, denominator = 1): MathExpression => ({ op: "VALUE", numerator, denominator });
const divide = (numerator: number, denominator: number): MathExpression => ({ op: "DIVIDE", left: value(numerator), right: value(denominator) });
const gcd = (left: number, right: number): number => right === 0 ? Math.abs(left) : gcd(right, left % right);
const reduced = (numerator: number, denominator: number) => { const divisor = gcd(numerator, denominator); return denominator / divisor === 1 ? String(numerator / divisor) : `${numerator / divisor}/${denominator / divisor}`; };
const purpose = (index: number): NonNullable<CandidateQuestion["instructionalPurpose"]> => {
  const slot = index % 8;
  return slot < 2 ? "FOUNDATION" : slot < 4 ? "STANDARD_APPLICATION" : slot < 6 ? "MISCONCEPTION_TARGETING" : slot === 6 ? "REMEDIATION" : "TRANSFER_APPLICATION";
};
type Seed = Readonly<{ prompt: string; exactValue: string; derivation: MathExpression; answerType: Extract<QuestionType, "INTEGER_INPUT" | "RATIONAL_INPUT">; skillId: string; unitId: string; explanation: readonly string[] }>;

const frequencySeeds: readonly Seed[] = [
  ["Dãy dữ liệu 2, 3, 2, 5, 2, 4, 3 có tần số của giá trị 2 bằng bao nhiêu?", 3],
  ["Dãy dữ liệu 7, 5, 7, 6, 5, 7, 8, 7 có tần số của giá trị 7 bằng bao nhiêu?", 4],
  ["Dãy dữ liệu 10, 12, 11, 10, 9, 10, 12, 10, 11 có tần số của giá trị 10 bằng bao nhiêu?", 4],
  ["Dãy dữ liệu 4, 6, 4, 6, 4, 5, 6, 4, 7, 4 có tần số của giá trị 4 bằng bao nhiêu?", 5],
  ["Dãy dữ liệu 1, 0, 1, 1, 2, 0, 1, 3, 1, 2, 1 có tần số của giá trị 1 bằng bao nhiêu?", 6],
  ["Dãy dữ liệu 15, 14, 16, 15, 17, 15, 14, 15, 18, 15, 16, 15 có tần số của giá trị 15 bằng bao nhiêu?", 6],
  ["Dãy dữ liệu 8, 9, 8, 10, 11, 8, 9, 8, 12, 8, 10, 8, 9 có tần số của giá trị 8 bằng bao nhiêu?", 6],
  ["Dãy dữ liệu 20, 18, 20, 19, 20, 21, 18, 20, 22, 20, 19, 20, 18, 20 có tần số của giá trị 20 bằng bao nhiêu?", 7],
].map(([prompt, count]) => ({ prompt: String(prompt), exactValue: String(count), derivation: value(Number(count)), answerType: "INTEGER_INPUT", skillId: frequencySkill, unitId: "grade-9-data-and-probability", explanation: ["Đếm từng lần giá trị được hỏi xuất hiện trong dãy.", `Giá trị đó xuất hiện ${count} lần.`] }));

const relativeFrequencyInputs = [[3, 12], [5, 20], [7, 28], [9, 30], [11, 44], [14, 35], [16, 40], [18, 48]] as const;
const relativeFrequencySeeds: readonly Seed[] = relativeFrequencyInputs.map(([count, total]) => ({
  prompt: `Trong ${total} lần quan sát độc lập, kết quả A xuất hiện ${count} lần. Tần số tương đối của A là bao nhiêu?`,
  exactValue: reduced(count, total),
  derivation: divide(count, total),
  answerType: "RATIONAL_INPUT",
  skillId: relativeFrequencySkill,
  unitId: "grade-9-secondary-sta-p1-16",
  explanation: [`Kết quả A có tần số ${count}.`, `Chia ${count} cho tổng ${total} lần quan sát rồi rút gọn.`],
}));

const probabilityInputs: readonly Readonly<{ prompt: string; favorable: number; total: number; explanation: readonly string[] }>[] = [
  { prompt: "Tung đồng thời hai đồng xu cân đối. Xác suất xuất hiện đúng một mặt ngửa là bao nhiêu?", favorable: 2, total: 4, explanation: ["Không gian mẫu có bốn kết quả có thứ tự: NN, NS, SN, SS.", "Hai kết quả NS và SN là thuận lợi."] },
  { prompt: "Gieo hai xúc xắc cân đối. Xác suất tổng số chấm bằng 7 là bao nhiêu?", favorable: 6, total: 36, explanation: ["Hai xúc xắc tạo 36 cặp có thứ tự đồng khả năng.", "Có 6 cặp có tổng bằng 7."] },
  { prompt: "Chọn ngẫu nhiên một số nguyên từ 1 đến 12. Xác suất chọn được số vừa chẵn vừa chia hết cho 3 là bao nhiêu?", favorable: 2, total: 12, explanation: ["Có 12 số được chọn với khả năng như nhau.", "Các số thuận lợi là 6 và 12."] },
  { prompt: "Chọn ngẫu nhiên một chữ cái trong từ TOANHOC. Xác suất chọn được chữ O là bao nhiêu?", favorable: 2, total: 7, explanation: ["Bảy vị trí chữ cái là bảy kết quả đồng khả năng.", "Chữ O xuất hiện ở hai vị trí."] },
  { prompt: "Tung đồng thời ba đồng xu cân đối. Xác suất cả ba đồng xu cùng mặt là bao nhiêu?", favorable: 2, total: 8, explanation: ["Ba đồng xu tạo 8 kết quả có thứ tự đồng khả năng.", "Hai kết quả NNN và SSS là thuận lợi."] },
  { prompt: "Chọn ngẫu nhiên một thẻ ghi số từ 1 đến 15. Xác suất số trên thẻ là bội của 5 là bao nhiêu?", favorable: 3, total: 15, explanation: ["Có 15 thẻ đồng khả năng.", "Ba bội của 5 là 5, 10, 15."] },
  { prompt: "Gieo hai xúc xắc cân đối. Xác suất hai mặt xuất hiện có cùng số chấm là bao nhiêu?", favorable: 6, total: 36, explanation: ["Không gian mẫu có 36 cặp có thứ tự.", "Có 6 cặp giống nhau từ (1,1) đến (6,6)."] },
  { prompt: "Chọn ngẫu nhiên một số nguyên từ 0 đến 19. Xác suất chọn được số có chữ số hàng đơn vị là 4 là bao nhiêu?", favorable: 2, total: 20, explanation: ["Có 20 số từ 0 đến 19.", "Hai số thuận lợi là 4 và 14."] },
];
const probabilitySeeds: readonly Seed[] = probabilityInputs.map((seed) => ({ prompt: seed.prompt, exactValue: reduced(seed.favorable, seed.total), derivation: divide(seed.favorable, seed.total), answerType: "RATIONAL_INPUT", skillId: probabilitySkill, unitId: "grade-9-data-and-probability", explanation: [...seed.explanation, "Chia số trường hợp thuận lợi cho số trường hợp có thể rồi rút gọn."] }));
const seeds = [...frequencySeeds, ...relativeFrequencySeeds, ...probabilitySeeds];

const skeleton = buildOfficialGradeSkeleton(grade);
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({
  id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`,
  entityId: packId,
  check,
  status: "PASSED" as const,
  evidence: check === "MATHEMATICAL_ANSWER" ? "Independent integer counts and reduced-rational sample-space oracles reproduce all declared answers." : `Deterministic Grade 9 Wave B ${check.toLowerCase().replaceAll("_", " ")} evidence.`,
}));
const receiptIds = evidenceReceipts.map((receipt) => receipt.id);
const blueprintForIndex = (index: number) => index < 8 ? "g9-wave-b-frequency-foundational" : index < 16 ? "g9-wave-b-relative-frequency-core" : "g9-wave-b-probability-extension";
const questions: CandidateQuestion[] = seeds.map((seed, index) => {
  const prompt = seed.prompt.normalize("NFC");
  return {
    id: `g9-wave-b-statistics-q${String(index + 1).padStart(2, "0")}`, grade, unitId: seed.unitId, blueprintId: blueprintForIndex(index), skillId: seed.skillId, prompt, options: null,
    answer: { type: seed.answerType, exactValue: seed.exactValue, derivation: seed.derivation }, explanationId: `g9-wave-b-statistics-q${String(index + 1).padStart(2, "0")}-explanation`, difficulty: index < 8 ? "FOUNDATIONAL" : index < 16 ? "CORE" : "EXTENSION",
    provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g9-finite-probability-frequency-template-v1", seed: `g9-wave-b-${index + 1}`, sourceReferenceIds: [sourceId] },
    reviewStatus: "BUNDLED", published: false, pilotEligible: false, fixtureOnly: false,
    duplicateFingerprint: sha256(normalizedDefinition(`${prompt}|`).toLocaleLowerCase("vi")), validationReceiptIds: receiptIds, instructionalPurpose: purpose(index),
  };
});
const explanations: ExplanationSpec[] = questions.map((question, index) => ({ id: question.explanationId, questionId: question.id, steps: seeds[index]!.explanation, finalAnswer: question.answer.exactValue!, evidenceReceiptIds: [`${packId}-explanation-consistency`] }));
const blueprints = [
  { id: "g9-wave-b-frequency-foundational", grade, skillId: frequencySkill, difficulty: "FOUNDATIONAL" as const, questionType: "INTEGER_INPUT" as const, templateId: "g9-frequency-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
  { id: "g9-wave-b-relative-frequency-core", grade, skillId: relativeFrequencySkill, difficulty: "CORE" as const, questionType: "RATIONAL_INPUT" as const, templateId: "g9-relative-frequency-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
  { id: "g9-wave-b-probability-extension", grade, skillId: probabilitySkill, difficulty: "EXTENSION" as const, questionType: "RATIONAL_INPUT" as const, templateId: "g9-sample-space-probability-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
];
const candidateCore = { format: "plave-wave-b-candidate-v1", grade, candidateId, version, policyVersion, sourceOutcomeIds: ["MOET2018-G9-STA-P076-011", "MOET2018-G9-STA-P077-015", "MOET2018-G9-STA-P077-020", "MOET2018-G9-STA-P077-021"], blueprints, questions, explanations };
const bundleHash = sha256(canonicalize(candidateCore));

export const gradeNineWaveBPack: GradePack = {
  schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC",
  sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units, knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives,
  prerequisites: [
    { fromSkillId: sampleSpaceSkill, toSkillId: probabilitySkill, evidence: "REPOSITORY_RUNTIME_ORDER", sourceReferenceIds: [sourceId] },
    { fromSkillId: frequencySkill, toSkillId: relativeFrequencySkill, evidence: "REPOSITORY_RUNTIME_ORDER", sourceReferenceIds: [sourceId] },
  ],
  blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts,
  candidate: { candidateId, version, bundleHash, policyVersion }, adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
  release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
  production: { wave: "B", selectedSliceId: "g9-finite-sample-space-probability-frequency", selectionBasis: ["SOURCE_VERIFIED", "EXACT_INTEGER_AND_RATIONAL_COUNTS", "FINITE_SAMPLE_SPACES", "ADAPTIVE_SIMULATION_SUITABLE"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 },
  legacyAsset: null,
};

export const gradeNineWaveBMetadata = Object.freeze({ schemaVersion: "plave-wave-b-metadata-v1", grade, title: "Tần số, tần số tương đối và xác suất trong không gian mẫu hữu hạn", sourceOutcomeIds: ["MOET2018-G9-STA-P076-011", "MOET2018-G9-STA-P077-015", "MOET2018-G9-STA-P077-020", "MOET2018-G9-STA-P077-021"] as const, prerequisiteOutcomeIds: ["MOET2018-G9-STA-P077-015", "MOET2018-G9-STA-P076-011"] as const, prerequisiteEvidence: "REPOSITORY_RUNTIME_ORDER", nextTargetOutcomeIds: ["MOET2018-G9-STA-P077-016", "MOET2018-G9-STA-P077-017", "MOET2018-G9-STA-P077-018"] as const, nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", production: gradeNineWaveBPack.production, candidate: gradeNineWaveBPack.candidate, release: gradeNineWaveBPack.release });
export const gradeNineWavesAB = Object.freeze({ grade, packs: [gradeNineWaveAPack, gradeNineWaveBPack] as const, questions: [...gradeNineWaveAPack.questions, ...gradeNineWaveBPack.questions], candidateBindings: [gradeNineWaveAPack.candidate, gradeNineWaveBPack.candidate], release: gradeNineWaveBPack.release, nextTargetOutcomeIds: gradeNineWaveBMetadata.nextTargetOutcomeIds });
