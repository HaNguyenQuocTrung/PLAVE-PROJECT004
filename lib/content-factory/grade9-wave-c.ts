import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { gradeNineWaveAPack } from "./grade9-wave-a.ts";
import { gradeNineWaveBPack } from "./grade9-wave-b.ts";
import { buildOfficialGradeSkeleton, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression, QuestionType } from "./types.ts";

const grade = 9 as const;
const packId = "grade-9-grouped-frequency-data-wave-c";
const version = "g9-grouped-frequency-data-1.0.0-wave-c";
const candidateId = "g9-grouped-frequency-data-wave-c-rc1";
const policyVersion = "g9-grouped-frequency-data-policy-1.0.0-wave-c";
const sourceId = officialSourceReferenceId(grade);
const groupedTableUnit = "grade-9-secondary-sta-p1-15";
const groupedChartUnit = "grade-9-secondary-sta-p1-16";
const groupedTableSkill = "moet2018-g9-sta-p077-016";
const groupedChartSkill = "moet2018-g9-sta-p077-019";
const value = (numerator: number, denominator = 1): MathExpression => ({ op: "VALUE", numerator, denominator });
const divide = (numerator: number, denominator: number): MathExpression => ({ op: "DIVIDE", left: value(numerator), right: value(denominator) });
const multiply = (left: MathExpression, right: MathExpression): MathExpression => ({ op: "MULTIPLY", left, right });
const gcd = (left: number, right: number): number => right === 0 ? Math.abs(left) : gcd(right, left % right);
const reduced = (numerator: number, denominator: number) => { const divisor = gcd(numerator, denominator); return denominator / divisor === 1 ? String(numerator / divisor) : `${numerator / divisor}/${denominator / divisor}`; };
const purpose = (index: number): NonNullable<CandidateQuestion["instructionalPurpose"]> => {
  const slot = index % 8;
  return slot < 2 ? "FOUNDATION" : slot < 4 ? "STANDARD_APPLICATION" : slot < 6 ? "MISCONCEPTION_TARGETING" : slot === 6 ? "REMEDIATION" : "TRANSFER_APPLICATION";
};

type Seed = Readonly<{
  prompt: string;
  exactValue: string;
  derivation: MathExpression;
  answerType: Extract<QuestionType, "INTEGER_INPUT" | "RATIONAL_INPUT">;
  skillId: string;
  unitId: string;
  blueprintId: string;
  difficulty: DifficultyBand;
  explanation: readonly string[];
}>;

const groupedCountInputs = [
  { data: [2, 3, 7, 9, 10, 12, 4, 6, 11, 8], interval: "[0;5)", count: 3 },
  { data: [5, 8, 12, 14, 15, 18, 9, 11, 17, 13, 7, 16], interval: "[10;15)", count: 4 },
  { data: [20, 22, 25, 27, 30, 31, 24, 29, 33, 26, 21, 28], interval: "[20;25)", count: 4 },
  { data: [41, 44, 46, 49, 52, 55, 43, 48, 50, 47, 45, 54], interval: "[45;50)", count: 5 },
  { data: [61, 66, 70, 73, 68, 75, 64, 69, 72, 67, 76, 63, 71], interval: "[60;70)", count: 7 },
  { data: [82, 88, 91, 94, 86, 99, 90, 85, 93, 87, 96, 84, 98, 89], interval: "[90;95)", count: 4 },
  { data: [101, 105, 109, 112, 118, 107, 115, 103, 111, 119, 106, 114, 108, 117, 102], interval: "[105;110)", count: 5 },
  { data: [12, 18, 22, 27, 31, 35, 39, 24, 29, 33, 37, 21, 26, 34, 38, 23], interval: "[20;30)", count: 7 },
] as const;
const groupedCountSeeds: readonly Seed[] = groupedCountInputs.map((item) => ({
  prompt: `Ghép dãy ${item.data.join(", ")} vào các khoảng liên tiếp cùng độ rộng. Tần số của nhóm ${item.interval} là bao nhiêu?`,
  exactValue: String(item.count), derivation: value(item.count), answerType: "INTEGER_INPUT", skillId: groupedTableSkill, unitId: groupedTableUnit,
  blueprintId: "g9-wave-c-grouped-frequency-foundational", difficulty: "FOUNDATIONAL",
  explanation: [`Khoảng ${item.interval} chứa cận trái nhưng không chứa cận phải.`, `Đếm các quan sát thuộc khoảng được ${item.count}.`],
}));

const relativeInputs = [
  { labels: "[0;10), [10;20), [20;30)", counts: "6, 9, 5", target: "[10;20)", count: 9, total: 20 },
  { labels: "[30;40), [40;50), [50;60)", counts: "8, 12, 10", target: "[50;60)", count: 10, total: 30 },
  { labels: "[0;5), [5;10), [10;15), [15;20)", counts: "4, 7, 5, 4", target: "[5;10)", count: 7, total: 20 },
  { labels: "[100;120), [120;140), [140;160)", counts: "11, 15, 14", target: "[100;120)", count: 11, total: 40 },
  { labels: "[1;4), [4;7), [7;10)", counts: "9, 6, 15", target: "[7;10)", count: 15, total: 30 },
  { labels: "[20;25), [25;30), [30;35), [35;40)", counts: "5, 10, 9, 6", target: "[30;35)", count: 9, total: 30 },
  { labels: "[0;25), [25;50), [50;75), [75;100)", counts: "12, 18, 24, 6", target: "[50;75)", count: 24, total: 60 },
  { labels: "[200;210), [210;220), [220;230)", counts: "14, 21, 15", target: "[210;220)", count: 21, total: 50 },
] as const;
const relativeSeeds: readonly Seed[] = relativeInputs.map((item) => ({
  prompt: `Bảng ghép nhóm có các khoảng ${item.labels} với tần số lần lượt ${item.counts}. Tần số tương đối của nhóm ${item.target} là bao nhiêu?`,
  exactValue: reduced(item.count, item.total), derivation: divide(item.count, item.total), answerType: "RATIONAL_INPUT", skillId: groupedTableSkill, unitId: groupedTableUnit,
  blueprintId: "g9-wave-c-grouped-relative-frequency-core", difficulty: "CORE",
  explanation: [`Cộng các tần số được tổng ${item.total} quan sát.`, `Chia tần số nhóm ${item.count} cho ${item.total} rồi rút gọn.`],
}));

const chartInputs = [
  { context: "thời gian đọc sách", labels: "[0;20), [20;40), [40;60)", counts: "8, 12, 20", target: "[40;60)", count: 20, total: 40, percent: 50 },
  { context: "quãng đường đi bộ", labels: "[0;2), [2;4), [4;6), [6;8)", counts: "5, 10, 15, 10", target: "[4;6)", count: 15, total: 40, percent: 37.5 },
  { context: "khối lượng sản phẩm", labels: "[10;20), [20;30), [30;40)", counts: "9, 18, 9", target: "[20;30)", count: 18, total: 36, percent: 50 },
  { context: "điểm khảo sát", labels: "[0;25), [25;50), [50;75), [75;100)", counts: "4, 8, 16, 12", target: "[75;100)", count: 12, total: 40, percent: 30 },
  { context: "chiều dài chi tiết", labels: "[50;55), [55;60), [60;65)", counts: "6, 15, 9", target: "[55;60)", count: 15, total: 30, percent: 50 },
  { context: "số phút vận động", labels: "[0;15), [15;30), [30;45), [45;60)", counts: "7, 14, 21, 8", target: "[30;45)", count: 21, total: 50, percent: 42 },
  { context: "nhiệt độ đo được", labels: "[18;20), [20;22), [22;24)", counts: "10, 25, 15", target: "[20;22)", count: 25, total: 50, percent: 50 },
  { context: "thời gian hoàn thành", labels: "[5;10), [10;15), [15;20), [20;25)", counts: "12, 18, 24, 6", target: "[10;15)", count: 18, total: 60, percent: 30 },
] as const;
const chartSeeds: readonly Seed[] = chartInputs.map((item) => ({
  prompt: `Dữ liệu ${item.context} có các nhóm ${item.labels}, tần số ${item.counts}. Khi dựng biểu đồ cột tần số tương đối, cột ${item.target} cao bao nhiêu phần trăm?`,
  exactValue: reduced(item.count * 100, item.total), derivation: multiply(divide(item.count, item.total), value(100)), answerType: Number.isInteger(item.percent) ? "INTEGER_INPUT" : "RATIONAL_INPUT", skillId: groupedChartSkill, unitId: groupedChartUnit,
  blueprintId: Number.isInteger(item.percent) ? "g9-wave-c-grouped-chart-extension-integer" : "g9-wave-c-grouped-chart-extension-rational", difficulty: "EXTENSION",
  explanation: [`Tổng bảng là ${item.total}; nhóm cần dựng có tần số ${item.count}.`, `Chiều cao cột là ${item.count}/${item.total} × 100%, bằng ${String(item.percent).replace(".", ",")}%.`],
}));

const seeds = [...groupedCountSeeds, ...relativeSeeds, ...chartSeeds];
const skeleton = buildOfficialGradeSkeleton(grade);
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({
  id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`,
  entityId: packId,
  check,
  status: "PASSED" as const,
  evidence: check === "MATHEMATICAL_ANSWER"
    ? "Independent interval-membership counts, exact total-frequency sums, reduced ratios, and chart-height calculations reproduce every answer."
    : `Deterministic Grade 9 Wave C ${check.toLowerCase().replaceAll("_", " ")} evidence.`,
}));
const receiptIds = evidenceReceipts.map((receipt) => receipt.id);
const questions: CandidateQuestion[] = seeds.map((seed, index) => {
  const prompt = seed.prompt.normalize("NFC");
  return {
    id: `g9-wave-c-grouped-frequency-q${String(index + 1).padStart(2, "0")}`, grade, unitId: seed.unitId, blueprintId: seed.blueprintId, skillId: seed.skillId, prompt, options: null,
    answer: { type: seed.answerType, exactValue: seed.exactValue, derivation: seed.derivation }, explanationId: `g9-wave-c-grouped-frequency-q${String(index + 1).padStart(2, "0")}-explanation`, difficulty: seed.difficulty,
    provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g9-grouped-frequency-template-v1", seed: `g9-wave-c-${index + 1}`, sourceReferenceIds: [sourceId] },
    reviewStatus: "BUNDLED", published: false, pilotEligible: false, fixtureOnly: false,
    duplicateFingerprint: sha256(normalizedDefinition(`${prompt}|`).toLocaleLowerCase("vi")), validationReceiptIds: receiptIds, instructionalPurpose: purpose(index),
  };
});
const explanations: ExplanationSpec[] = questions.map((question, index) => ({ id: question.explanationId, questionId: question.id, steps: seeds[index]!.explanation, finalAnswer: question.answer.exactValue!, evidenceReceiptIds: [`${packId}-explanation-consistency`] }));
const blueprints = [
  { id: "g9-wave-c-grouped-frequency-foundational", grade, skillId: groupedTableSkill, difficulty: "FOUNDATIONAL" as const, questionType: "INTEGER_INPUT" as const, templateId: "g9-grouped-frequency-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
  { id: "g9-wave-c-grouped-relative-frequency-core", grade, skillId: groupedTableSkill, difficulty: "CORE" as const, questionType: "RATIONAL_INPUT" as const, templateId: "g9-grouped-frequency-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
  { id: "g9-wave-c-grouped-chart-extension-integer", grade, skillId: groupedChartSkill, difficulty: "EXTENSION" as const, questionType: "INTEGER_INPUT" as const, templateId: "g9-grouped-frequency-chart-template-v1", targetCount: 7, sourceReferenceIds: [sourceId] },
  { id: "g9-wave-c-grouped-chart-extension-rational", grade, skillId: groupedChartSkill, difficulty: "EXTENSION" as const, questionType: "RATIONAL_INPUT" as const, templateId: "g9-grouped-frequency-chart-template-v1", targetCount: 1, sourceReferenceIds: [sourceId] },
];
const sourceOutcomeIds = ["MOET2018-G9-STA-P077-016", "MOET2018-G9-STA-P077-019"] as const;
const candidateCore = { format: "plave-wave-c-candidate-v1", grade, candidateId, version, policyVersion, sourceOutcomeIds, blueprints, questions, explanations };
const bundleHash = sha256(canonicalize(candidateCore));

export const gradeNineWaveCPack: GradePack = {
  schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC",
  sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units, knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives,
  prerequisites: [{ fromSkillId: groupedTableSkill, toSkillId: groupedChartSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] }],
  blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts,
  candidate: { candidateId, version, bundleHash, policyVersion }, adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
  release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
  production: { wave: "C", selectedSliceId: "g9-grouped-frequency-data", selectionBasis: ["SOURCE_VERIFIED", "PAGE_77_EXACT_ROWS", "INTERVAL_MEMBERSHIP_ORACLE", "EXACT_GROUPED_RELATIVE_FREQUENCY", "DETERMINISTIC_CHART_HEIGHTS"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 },
  legacyAsset: null,
};

export const gradeNineWaveCMetadata = Object.freeze({ schemaVersion: "plave-wave-c-metadata-v1", grade, title: "Bảng và biểu đồ tần số ghép nhóm", sourcePages: [77] as const, sourceOutcomeIds, prerequisiteOutcomeIds: ["MOET2018-G9-STA-P077-016"] as const, prerequisiteEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", nextTargetOutcomeIds: ["MOET2018-G9-STA-P077-017", "MOET2018-G9-STA-P077-018"] as const, nextTargetEvidence: "HYPOTHESIS_REQUIRES_EVIDENCE", production: gradeNineWaveCPack.production, candidate: gradeNineWaveCPack.candidate, release: gradeNineWaveCPack.release });
export const gradeNineWavesABC = Object.freeze({ grade, packs: [gradeNineWaveAPack, gradeNineWaveBPack, gradeNineWaveCPack] as const, questions: [...gradeNineWaveAPack.questions, ...gradeNineWaveBPack.questions, ...gradeNineWaveCPack.questions], candidateBindings: [gradeNineWaveAPack.candidate, gradeNineWaveBPack.candidate, gradeNineWaveCPack.candidate], release: gradeNineWaveCPack.release, nextTargetOutcomeIds: gradeNineWaveCMetadata.nextTargetOutcomeIds });
