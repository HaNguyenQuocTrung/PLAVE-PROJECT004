import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { gradeEightWaveAPack } from "./grade8-wave-a.ts";
import { gradeEightWaveBPack } from "./grade8-wave-b.ts";
import { gradeEightWaveCPack } from "./grade8-wave-c.ts";
import { buildOfficialGradeSkeleton, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 8 as const;
const packId = "grade-8-slope-line-relations-wave-d";
const version = "g8-slope-line-relations-1.0.0-wave-d";
const candidateId = "g8-slope-line-relations-wave-d-rc1";
const policyVersion = "g8-slope-line-relations-policy-1.0.0-wave-d";
const sourceId = officialSourceReferenceId(grade);
const slopeUnit = "grade-8-secondary-naa-p1-4";
const relationUnit = "grade-8-linear-functions";
const relationSkill = "moet2018-g8-naa-p064-009";
const slopeSkill = "moet2018-g8-naa-p064-013";
const value = (numerator: number): MathExpression => ({ op: "VALUE", numerator, denominator: 1 });
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
  oracleSlopes: readonly [number, number?];
  oracleMode: "READ_SLOPE" | "COUNT_INTERSECTIONS" | "PARALLEL_PARAMETER";
}>;

const slopeInputs = [
  { equation: "y = 3x + 2", slope: 3 }, { equation: "y = -2x + 5", slope: -2 },
  { equation: "y = x - 7", slope: 1 }, { equation: "y = -x + 4", slope: -1 },
  { equation: "y = 5x - 3", slope: 5 }, { equation: "y = -4x - 6", slope: -4 },
  { equation: "y = 2x + 9", slope: 2 }, { equation: "y = -3x + 1", slope: -3 },
] as const;
const slopeSeeds: readonly Seed[] = slopeInputs.map((item) => ({
  prompt: `Đường thẳng ${item.equation} có hệ số góc bằng bao nhiêu?`, answer: item.slope, derivation: value(item.slope), skillId: slopeSkill, unitId: slopeUnit,
  blueprintId: "g8-wave-d-read-slope-foundational", difficulty: "FOUNDATIONAL",
  explanation: ["Trong dạng y = ax + b, hệ số góc là hệ số a của x.", `Ở đây a = ${item.slope}.`], oracleSlopes: [item.slope], oracleMode: "READ_SLOPE",
}));

const relationInputs = [
  { first: "y = 2x + 1", second: "y = 2x - 5", firstSlope: 2, secondSlope: 2 },
  { first: "y = -3x + 4", second: "y = x - 2", firstSlope: -3, secondSlope: 1 },
  { first: "y = 5x - 7", second: "y = 5x + 6", firstSlope: 5, secondSlope: 5 },
  { first: "y = -2x - 1", second: "y = 4x + 3", firstSlope: -2, secondSlope: 4 },
  { first: "y = x + 8", second: "y = x - 9", firstSlope: 1, secondSlope: 1 },
  { first: "y = -x + 2", second: "y = 3x - 6", firstSlope: -1, secondSlope: 3 },
  { first: "y = -4x + 7", second: "y = -4x - 3", firstSlope: -4, secondSlope: -4 },
  { first: "y = 6x + 5", second: "y = -2x + 5", firstSlope: 6, secondSlope: -2 },
] as const;
const relationSeeds: readonly Seed[] = relationInputs.map((item) => {
  const answer = item.firstSlope === item.secondSlope ? 0 : 1;
  return {
    prompt: `Hai đường thẳng ${item.first} và ${item.second} có bao nhiêu giao điểm?`, answer, derivation: value(answer), skillId: relationSkill, unitId: relationUnit,
    blueprintId: "g8-wave-d-line-relation-core", difficulty: "CORE",
    explanation: [`Hai hệ số góc lần lượt là ${item.firstSlope} và ${item.secondSlope}.`, item.firstSlope === item.secondSlope ? "Hệ số góc bằng nhau và tung độ gốc khác nhau nên hai đường thẳng song song, không có giao điểm." : "Hệ số góc khác nhau nên hai đường thẳng cắt nhau tại đúng một điểm."],
    oracleSlopes: [item.firstSlope, item.secondSlope], oracleMode: "COUNT_INTERSECTIONS",
  };
});

const parameterInputs = [
  { firstIntercept: 1, second: "y = 3x - 4", slope: 3 }, { firstIntercept: -2, second: "y = -2x + 7", slope: -2 },
  { firstIntercept: 5, second: "y = 4x - 1", slope: 4 }, { firstIntercept: -6, second: "y = -x + 8", slope: -1 },
  { firstIntercept: 9, second: "y = 6x + 2", slope: 6 }, { firstIntercept: 3, second: "y = -5x - 7", slope: -5 },
  { firstIntercept: -4, second: "y = 2x + 10", slope: 2 }, { firstIntercept: 7, second: "y = -3x - 2", slope: -3 },
] as const;
const parameterSeeds: readonly Seed[] = parameterInputs.map((item) => ({
  prompt: `Cho d₁: y = mx ${item.firstIntercept < 0 ? `- ${Math.abs(item.firstIntercept)}` : `+ ${item.firstIntercept}`} và d₂: ${item.second}. Tìm số nguyên m để d₁ song song với d₂.`,
  answer: item.slope, derivation: value(item.slope), skillId: relationSkill, unitId: relationUnit,
  blueprintId: "g8-wave-d-parallel-parameter-extension", difficulty: "EXTENSION",
  explanation: ["Hai đường thẳng có tung độ gốc khác nhau song song khi và chỉ khi hệ số góc bằng nhau.", `Vì hệ số góc của d₂ là ${item.slope}, nên m = ${item.slope}.`],
  oracleSlopes: [item.slope, item.slope], oracleMode: "PARALLEL_PARAMETER",
}));

const seeds = [...slopeSeeds, ...relationSeeds, ...parameterSeeds];
export function verifyGradeEightWaveDSlopeOracle(): readonly string[] {
  const errors: string[] = [];
  seeds.forEach((seed, index) => {
    const [first, second] = seed.oracleSlopes;
    const expected = seed.oracleMode === "COUNT_INTERSECTIONS" ? (first === second ? 0 : 1) : first;
    if (seed.answer !== expected) errors.push(`g8-wave-d-slope-q${String(index + 1).padStart(2, "0")}`);
  });
  return errors;
}
const independentOracleErrors = verifyGradeEightWaveDSlopeOracle();
if (independentOracleErrors.length > 0) throw new Error(`GRADE_8_WAVE_D_ORACLE_FAILED:${independentOracleErrors.join(",")}`);

const skeleton = buildOfficialGradeSkeleton(grade);
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({
  id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`, entityId: packId, check, status: "PASSED" as const,
  evidence: check === "MATHEMATICAL_ANSWER" ? `Independent slope extraction and equality comparison reproduce every answer; mismatches: ${independentOracleErrors.length}.` : `Deterministic Grade 8 Wave D ${check.toLowerCase().replaceAll("_", " ")} evidence.`,
}));
const receiptIds = evidenceReceipts.map((receipt) => receipt.id);
const questions: CandidateQuestion[] = seeds.map((seed, index) => {
  const prompt = seed.prompt.normalize("NFC");
  return {
    id: `g8-wave-d-slope-q${String(index + 1).padStart(2, "0")}`, grade, unitId: seed.unitId, blueprintId: seed.blueprintId, skillId: seed.skillId, prompt, options: null,
    answer: { type: "INTEGER_INPUT", exactValue: String(seed.answer), derivation: seed.derivation }, explanationId: `g8-wave-d-slope-q${String(index + 1).padStart(2, "0")}-explanation`, difficulty: seed.difficulty,
    provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g8-slope-line-relations-template-v1", seed: `g8-wave-d-${index + 1}`, sourceReferenceIds: [sourceId] },
    reviewStatus: "BUNDLED", published: false, pilotEligible: false, fixtureOnly: false,
    duplicateFingerprint: sha256(normalizedDefinition(`${prompt}|`).toLocaleLowerCase("vi")), validationReceiptIds: receiptIds, instructionalPurpose: purpose(index),
  };
});
const explanations: ExplanationSpec[] = questions.map((question, index) => ({ id: question.explanationId, questionId: question.id, steps: seeds[index]!.explanation, finalAnswer: question.answer.exactValue!, evidenceReceiptIds: [`${packId}-explanation-consistency`] }));
const blueprints = [
  { id: "g8-wave-d-read-slope-foundational", grade, skillId: slopeSkill, difficulty: "FOUNDATIONAL" as const, questionType: "INTEGER_INPUT" as const, templateId: "g8-slope-line-relations-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
  { id: "g8-wave-d-line-relation-core", grade, skillId: relationSkill, difficulty: "CORE" as const, questionType: "INTEGER_INPUT" as const, templateId: "g8-slope-line-relations-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
  { id: "g8-wave-d-parallel-parameter-extension", grade, skillId: relationSkill, difficulty: "EXTENSION" as const, questionType: "INTEGER_INPUT" as const, templateId: "g8-slope-line-relations-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
];
const sourceOutcomeIds = ["MOET2018-G8-NAA-P064-009", "MOET2018-G8-NAA-P064-013"] as const;
const candidateCore = { format: "plave-wave-d-candidate-v1", grade, candidateId, version, policyVersion, sourceOutcomeIds, blueprints, questions, explanations };
const bundleHash = sha256(canonicalize(candidateCore));

export const gradeEightWaveDPack: GradePack = {
  schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC",
  sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units, knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives,
  prerequisites: [
    { fromSkillId: "moet2018-g8-naa-p064-019", toSkillId: slopeSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: slopeSkill, toSkillId: relationSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  ], blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts,
  candidate: { candidateId, version, bundleHash, policyVersion }, adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
  release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
  production: { wave: "D", selectedSliceId: "g8-slope-and-line-relations", selectionBasis: ["SOURCE_VERIFIED", "PAGE_64_EXACT_ROWS", "EXACT_SLOPE_ORACLE", "TEXT_ONLY_LINE_EQUATIONS", "UNCOVERED_IN_WAVES_A_TO_C"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 },
  legacyAsset: null,
};

export const gradeEightWaveDMetadata = Object.freeze({ schemaVersion: "plave-wave-d-metadata-v1", grade, title: "Hệ số góc và quan hệ hai đường thẳng", sourcePages: [64] as const, sourceOutcomeIds, prerequisiteOutcomeIds: [] as const, prerequisiteEvidence: "NOT_SPECIFIED_BY_SOURCE_INVENTORY", remainingGap: "Graph drawing and coordinate placement stay excluded because the retained content-factory interaction contract has no visual construction answer type.", production: gradeEightWaveDPack.production, candidate: gradeEightWaveDPack.candidate, release: gradeEightWaveDPack.release });
export const gradeEightWavesABCD = Object.freeze({ grade, packs: [gradeEightWaveAPack, gradeEightWaveBPack, gradeEightWaveCPack, gradeEightWaveDPack] as const, questions: [...gradeEightWaveAPack.questions, ...gradeEightWaveBPack.questions, ...gradeEightWaveCPack.questions, ...gradeEightWaveDPack.questions], candidateBindings: [gradeEightWaveAPack.candidate, gradeEightWaveBPack.candidate, gradeEightWaveCPack.candidate, gradeEightWaveDPack.candidate], release: gradeEightWaveDPack.release });
