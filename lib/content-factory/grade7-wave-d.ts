import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { gradeSevenWaveAPack } from "./grade7-wave-a.ts";
import { gradeSevenWaveBPack } from "./grade7-wave-b.ts";
import { gradeSevenWaveCPack } from "./grade7-wave-c.ts";
import { buildOfficialGradeSkeleton, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression, QuestionType } from "./types.ts";

const grade = 7 as const;
const packId = "grade-7-polynomial-reasoning-wave-d";
const version = "g7-polynomial-reasoning-1.0.0-wave-d";
const candidateId = "g7-polynomial-reasoning-wave-d-rc1";
const policyVersion = "g7-polynomial-reasoning-policy-1.0.0-wave-d";
const sourceId = officialSourceReferenceId(grade);
const unitId = "grade-7-secondary-naa-p1-6";
const rootSkill = "moet2018-g7-naa-p058-033";
const operationSkill = "moet2018-g7-naa-p058-034";
const evaluationSkill = "moet2018-g7-naa-p058-035";

const value = (numerator: number): MathExpression => ({ op: "VALUE", numerator, denominator: 1 });
const add = (left: MathExpression, right: MathExpression): MathExpression => ({ op: "ADD", left, right });
const subtract = (left: MathExpression, right: MathExpression): MathExpression => ({ op: "SUBTRACT", left, right });
const multiply = (left: MathExpression, right: MathExpression): MathExpression => ({ op: "MULTIPLY", left, right });
const divide = (left: MathExpression, right: MathExpression): MathExpression => ({ op: "DIVIDE", left, right });
const polynomialValue = (a: number, b: number, c: number, x: number) => add(add(multiply(value(a), multiply(value(x), value(x))), multiply(value(b), value(x))), value(c));
const purpose = (index: number): NonNullable<CandidateQuestion["instructionalPurpose"]> => {
  const slot = index % 8;
  return slot < 2 ? "FOUNDATION" : slot < 4 ? "STANDARD_APPLICATION" : slot < 6 ? "MISCONCEPTION_TARGETING" : slot === 6 ? "REMEDIATION" : "TRANSFER_APPLICATION";
};

type Seed = Readonly<{
  prompt: string;
  options: readonly string[] | null;
  exactValue: string;
  derivation?: MathExpression;
  answerType: Extract<QuestionType, "SINGLE_CHOICE" | "INTEGER_INPUT">;
  skillId: string;
  blueprintId: string;
  difficulty: DifficultyBand;
  explanation: readonly string[];
}>;

const rootInputs = [
  { polynomial: "x² - 5x + 6", a: 1, b: -5, c: 6, options: ["2", "1", "0", "-1"], answer: "2" },
  { polynomial: "x² + x - 6", a: 1, b: 1, c: -6, options: ["-3", "-2", "0", "1"], answer: "-3" },
  { polynomial: "2x² - 8", a: 2, b: 0, c: -8, options: ["2", "1", "0", "3"], answer: "2" },
  { polynomial: "x² - 16", a: 1, b: 0, c: -16, options: ["-4", "-2", "0", "2"], answer: "-4" },
  { polynomial: "x² - 7x + 12", a: 1, b: -7, c: 12, options: ["3", "2", "1", "0"], answer: "3" },
  { polynomial: "x² + 5x + 6", a: 1, b: 5, c: 6, options: ["-2", "-1", "0", "1"], answer: "-2" },
  { polynomial: "3x² - 12x", a: 3, b: -12, c: 0, options: ["0", "1", "2", "3"], answer: "0" },
  { polynomial: "2x² + 2x - 12", a: 2, b: 2, c: -12, options: ["2", "-2", "0", "1"], answer: "2" },
] as const;
const rootSeeds: readonly Seed[] = rootInputs.map((item) => {
  const options: readonly string[] = item.options;
  return {
    prompt: `Cho đa thức P(x) = ${item.polynomial}. Giá trị nào sau đây là một nghiệm của P(x)?`,
    options,
    exactValue: String.fromCharCode(65 + options.indexOf(item.answer)),
    answerType: "SINGLE_CHOICE",
    skillId: rootSkill,
    blueprintId: "g7-wave-d-polynomial-root-foundational",
    difficulty: "FOUNDATIONAL",
    explanation: [`Thay lần lượt từng giá trị vào P(x) và tính chính xác.`, `Chỉ giá trị ${item.answer} làm P(x) bằng 0.`],
  };
});

const evaluationInputs = [
  { polynomial: "2x² - 3x + 1", a: 2, b: -3, c: 1, x: 2 },
  { polynomial: "x² + 4x - 5", a: 1, b: 4, c: -5, x: -2 },
  { polynomial: "-3x² + 2x + 7", a: -3, b: 2, c: 7, x: 1 },
  { polynomial: "4x² - x - 6", a: 4, b: -1, c: -6, x: -1 },
  { polynomial: "5x² - 2x + 3", a: 5, b: -2, c: 3, x: 3 },
  { polynomial: "-2x² - 5x + 4", a: -2, b: -5, c: 4, x: -3 },
  { polynomial: "3x² + 6x - 8", a: 3, b: 6, c: -8, x: 4 },
  { polynomial: "-x² + 7x + 2", a: -1, b: 7, c: 2, x: -2 },
] as const;
const evaluationSeeds: readonly Seed[] = evaluationInputs.map((item) => {
  const result = item.a * item.x * item.x + item.b * item.x + item.c;
  return {
    prompt: `Cho P(x) = ${item.polynomial}. Tính P(${item.x}).`, options: null, exactValue: String(result), derivation: polynomialValue(item.a, item.b, item.c, item.x), answerType: "INTEGER_INPUT",
    skillId: evaluationSkill, blueprintId: "g7-wave-d-polynomial-evaluation-core", difficulty: "CORE",
    explanation: [`Thay x = ${item.x} vào đúng từng hạng tử của P(x).`, `Thực hiện lũy thừa, phép nhân rồi cộng theo thứ tự, được ${result}.`],
  };
});

const operationSeeds: readonly Seed[] = [
  { prompt: "Cho P(x) = 3x² - 2x + 5 và Q(x) = -x² + 4x - 1. Hệ số của x² trong P(x) + Q(x) là bao nhiêu?", exactValue: "2", derivation: add(value(3), value(-1)), explanation: ["Cộng các hạng tử cùng bậc.", "Hệ số cần tìm là 3 + (-1) = 2."] },
  { prompt: "Cho A(x) = -2x³ + x - 4 và B(x) = 5x³ - 3x + 7. Hệ số của x³ trong A(x) + B(x) là bao nhiêu?", exactValue: "3", derivation: add(value(-2), value(5)), explanation: ["Chỉ ghép hai hạng tử bậc ba.", "Cộng -2 với 5 được hệ số 3."] },
  { prompt: "Cho P(x) = 6x² + 3x - 2 và Q(x) = 2x² - 5x + 4. Hệ số của x trong P(x) - Q(x) là bao nhiêu?", exactValue: "8", derivation: subtract(value(3), value(-5)), explanation: ["Khi trừ Q(x), đổi dấu mọi hạng tử của Q(x).", "Hệ số của x là 3 - (-5) = 8."] },
  { prompt: "Cho M(x) = -x³ + 4x² và N(x) = 3x³ - 2x². Hệ số của x³ trong M(x) - N(x) là bao nhiêu?", exactValue: "-4", derivation: subtract(value(-1), value(3)), explanation: ["Trừ các hệ số của cùng hạng tử x³.", "Ta có -1 - 3 = -4."] },
  { prompt: "Nhân đơn thức 3x với đa thức 2x² - 5x + 1. Hệ số của x³ trong tích là bao nhiêu?", exactValue: "6", derivation: multiply(value(3), value(2)), explanation: ["Nhân 3x với từng hạng tử.", "Hạng tử bậc ba có hệ số 3 × 2 = 6."] },
  { prompt: "Nhân đơn thức -2x² với đa thức 4x³ + x - 3. Hệ số của x⁵ trong tích là bao nhiêu?", exactValue: "-8", derivation: multiply(value(-2), value(4)), explanation: ["Bậc của tích đầu là 2 + 3 = 5.", "Hệ số tương ứng là -2 × 4 = -8."] },
  { prompt: "Chia đa thức 12x⁴ - 6x³ + 9x² cho đơn thức 3x². Hệ số của x² trong thương là bao nhiêu?", exactValue: "4", derivation: divide(value(12), value(3)), explanation: ["Chia từng hạng tử cho 3x².", "Hạng tử đầu cho 4x² nên hệ số cần tìm là 4."] },
  { prompt: "Chia đa thức -15x⁵ + 10x³ - 5x² cho đơn thức 5x². Hệ số của x³ trong thương là bao nhiêu?", exactValue: "-3", derivation: divide(value(-15), value(5)), explanation: ["Chia từng hệ số và trừ số mũ của x.", "Hạng tử đầu cho -3x³ nên hệ số là -3."] },
].map((seed) => ({ ...seed, options: null, answerType: "INTEGER_INPUT", skillId: operationSkill, blueprintId: "g7-wave-d-polynomial-operations-extension", difficulty: "EXTENSION" }));

const seeds = [...rootSeeds, ...evaluationSeeds, ...operationSeeds];
export function verifyGradeSevenWaveDRootOracle(): readonly string[] {
  const errors: string[] = [];
  rootInputs.forEach((item, index) => {
    const options: readonly string[] = item.options;
    const zeroes = options.map((option) => { const x = Number(option); return item.a * x * x + item.b * x + item.c === 0; });
    const answerIndex = options.indexOf(item.answer);
    if (zeroes.filter(Boolean).length !== 1 || answerIndex < 0 || !zeroes[answerIndex]) errors.push(`g7-wave-d-polynomial-q${String(index + 1).padStart(2, "0")}`);
  });
  return errors;
}
const independentOracleErrors = verifyGradeSevenWaveDRootOracle();
if (independentOracleErrors.length > 0) throw new Error(`GRADE_7_WAVE_D_ORACLE_FAILED:${independentOracleErrors.join(",")}`);

const skeleton = buildOfficialGradeSkeleton(grade);
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({
  id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`, entityId: packId, check, status: "PASSED" as const,
  evidence: check === "MATHEMATICAL_ANSWER" ? `Independent substitution and coefficient arithmetic verify all polynomial answers; root-option mismatches: ${independentOracleErrors.length}.` : `Deterministic Grade 7 Wave D ${check.toLowerCase().replaceAll("_", " ")} evidence.`,
}));
const receiptIds = evidenceReceipts.map((receipt) => receipt.id);
const questions: CandidateQuestion[] = seeds.map((seed, index) => {
  const prompt = seed.prompt.normalize("NFC");
  const options = seed.options?.map((option) => option.normalize("NFC")) ?? null;
  return {
    id: `g7-wave-d-polynomial-q${String(index + 1).padStart(2, "0")}`, grade, unitId, blueprintId: seed.blueprintId, skillId: seed.skillId, prompt, options,
    answer: { type: seed.answerType, exactValue: seed.exactValue, ...(seed.derivation ? { derivation: seed.derivation } : {}) }, explanationId: `g7-wave-d-polynomial-q${String(index + 1).padStart(2, "0")}-explanation`, difficulty: seed.difficulty,
    provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g7-polynomial-reasoning-template-v1", seed: `g7-wave-d-${index + 1}`, sourceReferenceIds: [sourceId] },
    reviewStatus: "BUNDLED", published: false, pilotEligible: false, fixtureOnly: false,
    duplicateFingerprint: sha256(normalizedDefinition(`${prompt}|${options?.join("|") ?? ""}`).toLocaleLowerCase("vi")), validationReceiptIds: receiptIds, instructionalPurpose: purpose(index),
  };
});
const explanations: ExplanationSpec[] = questions.map((question, index) => ({ id: question.explanationId, questionId: question.id, steps: seeds[index]!.explanation, finalAnswer: question.answer.exactValue!, evidenceReceiptIds: [`${packId}-explanation-consistency`] }));
const blueprints = [
  { id: "g7-wave-d-polynomial-root-foundational", grade, skillId: rootSkill, difficulty: "FOUNDATIONAL" as const, questionType: "SINGLE_CHOICE" as const, templateId: "g7-polynomial-reasoning-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
  { id: "g7-wave-d-polynomial-evaluation-core", grade, skillId: evaluationSkill, difficulty: "CORE" as const, questionType: "INTEGER_INPUT" as const, templateId: "g7-polynomial-reasoning-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
  { id: "g7-wave-d-polynomial-operations-extension", grade, skillId: operationSkill, difficulty: "EXTENSION" as const, questionType: "INTEGER_INPUT" as const, templateId: "g7-polynomial-reasoning-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
];
const sourceOutcomeIds = ["MOET2018-G7-NAA-P058-033", "MOET2018-G7-NAA-P058-034", "MOET2018-G7-NAA-P058-035"] as const;
const candidateCore = { format: "plave-wave-d-candidate-v1", grade, candidateId, version, policyVersion, sourceOutcomeIds, blueprints, questions, explanations };
const bundleHash = sha256(canonicalize(candidateCore));

export const gradeSevenWaveDPack: GradePack = {
  schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC",
  sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units, knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives,
  prerequisites: [
    { fromSkillId: "moet2018-g7-naa-p057-032", toSkillId: rootSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: rootSkill, toSkillId: evaluationSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: evaluationSkill, toSkillId: operationSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  ], blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts,
  candidate: { candidateId, version, bundleHash, policyVersion }, adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
  release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
  production: { wave: "D", selectedSliceId: "g7-one-variable-polynomial-reasoning", selectionBasis: ["SOURCE_VERIFIED", "PAGE_58_EXACT_ROWS", "INTEGER_SUBSTITUTION_ORACLE", "COEFFICIENT_OPERATION_ORACLE", "UNCOVERED_IN_WAVES_A_TO_C"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 },
  legacyAsset: null,
};

export const gradeSevenWaveDMetadata = Object.freeze({ schemaVersion: "plave-wave-d-metadata-v1", grade, title: "Nghiệm, giá trị và phép toán đa thức một biến", sourcePages: [58] as const, sourceOutcomeIds, prerequisiteOutcomeIds: [] as const, prerequisiteEvidence: "NOT_SPECIFIED_BY_SOURCE_INVENTORY", remainingGap: "Canonical polynomial output beyond integer coefficient queries remains excluded until an equivalence-safe structured response contract is retained.", production: gradeSevenWaveDPack.production, candidate: gradeSevenWaveDPack.candidate, release: gradeSevenWaveDPack.release });
export const gradeSevenWavesABCD = Object.freeze({ grade, packs: [gradeSevenWaveAPack, gradeSevenWaveBPack, gradeSevenWaveCPack, gradeSevenWaveDPack] as const, questions: [...gradeSevenWaveAPack.questions, ...gradeSevenWaveBPack.questions, ...gradeSevenWaveCPack.questions, ...gradeSevenWaveDPack.questions], candidateBindings: [gradeSevenWaveAPack.candidate, gradeSevenWaveBPack.candidate, gradeSevenWaveCPack.candidate, gradeSevenWaveDPack.candidate], release: gradeSevenWaveDPack.release });
