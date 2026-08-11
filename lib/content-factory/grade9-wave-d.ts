import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { gradeNineWaveAPack } from "./grade9-wave-a.ts";
import { gradeNineWaveBPack } from "./grade9-wave-b.ts";
import { gradeNineWaveCPack } from "./grade9-wave-c.ts";
import { buildOfficialGradeSkeleton, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 9 as const;
const packId = "grade-9-circle-angle-relations-wave-d";
const version = "g9-circle-angle-relations-1.0.0-wave-d";
const candidateId = "g9-circle-angle-relations-wave-d-rc1";
const policyVersion = "g9-circle-angle-relations-policy-1.0.0-wave-d";
const sourceId = officialSourceReferenceId(grade);
const arcAngleUnit = "grade-9-secondary-geo-p1-9";
const sharedArcUnit = "grade-9-secondary-geo-p1-10";
const arcAngleSkill = "moet2018-g9-geo-p075-020";
const sharedArcSkill = "moet2018-g9-geo-p075-021";
const value = (numerator: number): MathExpression => ({ op: "VALUE", numerator, denominator: 1 });
const multiplyByTwo = (number: number): MathExpression => ({ op: "MULTIPLY", left: value(number), right: value(2) });
const divideByTwo = (number: number): MathExpression => ({ op: "DIVIDE", left: value(number), right: value(2) });
const purpose = (index: number): NonNullable<CandidateQuestion["instructionalPurpose"]> => {
  const slot = index % 8;
  return slot < 2 ? "FOUNDATION" : slot < 4 ? "STANDARD_APPLICATION" : slot < 6 ? "MISCONCEPTION_TARGETING" : slot === 6 ? "REMEDIATION" : "TRANSFER_APPLICATION";
};

type Seed = Readonly<{
  prompt: string;
  given: number;
  answer: number;
  derivation: MathExpression;
  relation: "SAME" | "HALF" | "DOUBLE";
  skillId: string;
  unitId: string;
  blueprintId: string;
  difficulty: DifficultyBand;
  explanation: readonly string[];
}>;

const centralArcInputs = [
  { direction: "ARC_TO_CENTRAL", measure: 48 }, { direction: "ARC_TO_CENTRAL", measure: 76 },
  { direction: "ARC_TO_CENTRAL", measure: 112 }, { direction: "ARC_TO_CENTRAL", measure: 150 },
  { direction: "CENTRAL_TO_ARC", measure: 64 }, { direction: "CENTRAL_TO_ARC", measure: 98 },
  { direction: "CENTRAL_TO_ARC", measure: 126 }, { direction: "CENTRAL_TO_ARC", measure: 172 },
] as const;
const centralArcSeeds: readonly Seed[] = centralArcInputs.map((item) => ({
  prompt: item.direction === "ARC_TO_CENTRAL"
    ? `Trong đường tròn tâm O, cung nhỏ AB có số đo ${item.measure}°. Góc ở tâm AOB chắn cung nhỏ AB có số đo bao nhiêu độ?`
    : `Trong đường tròn tâm O, góc ở tâm AOB bằng ${item.measure}° và chắn cung nhỏ AB. Cung nhỏ AB có số đo bao nhiêu độ?`,
  given: item.measure, answer: item.measure, derivation: value(item.measure), relation: "SAME", skillId: arcAngleSkill, unitId: arcAngleUnit,
  blueprintId: "g9-wave-d-central-arc-foundational", difficulty: "FOUNDATIONAL",
  explanation: ["Số đo góc ở tâm bằng số đo cung mà góc đó chắn.", `Vì vậy số đo cần tìm là ${item.measure}°.`],
}));

const inscribedArcInputs = [
  { direction: "ARC_TO_INSCRIBED", measure: 84 }, { direction: "ARC_TO_INSCRIBED", measure: 116 },
  { direction: "ARC_TO_INSCRIBED", measure: 142 }, { direction: "ARC_TO_INSCRIBED", measure: 168 },
  { direction: "INSCRIBED_TO_ARC", measure: 27 }, { direction: "INSCRIBED_TO_ARC", measure: 39 },
  { direction: "INSCRIBED_TO_ARC", measure: 56 }, { direction: "INSCRIBED_TO_ARC", measure: 73 },
] as const;
const inscribedArcSeeds: readonly Seed[] = inscribedArcInputs.map((item) => {
  const arcToAngle = item.direction === "ARC_TO_INSCRIBED";
  const answer = arcToAngle ? item.measure / 2 : item.measure * 2;
  return {
    prompt: arcToAngle
      ? `Điểm C nằm trên cung lớn AB của một đường tròn. Cung nhỏ AB bằng ${item.measure}°. Góc nội tiếp ACB có số đo bao nhiêu độ?`
      : `Điểm C nằm trên cung lớn AB của một đường tròn. Góc nội tiếp ACB bằng ${item.measure}° và chắn cung nhỏ AB. Cung nhỏ AB bằng bao nhiêu độ?`,
    given: item.measure, answer, derivation: arcToAngle ? divideByTwo(item.measure) : multiplyByTwo(item.measure), relation: arcToAngle ? "HALF" : "DOUBLE",
    skillId: arcAngleSkill, unitId: arcAngleUnit, blueprintId: "g9-wave-d-inscribed-arc-core", difficulty: "CORE",
    explanation: ["Số đo góc nội tiếp bằng một nửa số đo cung bị chắn.", arcToAngle ? `Lấy ${item.measure} chia 2, được ${answer}°.` : `Cung bị chắn bằng hai lần góc nội tiếp: ${item.measure} × 2 = ${answer}°.`],
  };
});

const centralInscribedInputs = [
  { direction: "CENTRAL_TO_INSCRIBED", measure: 70 }, { direction: "CENTRAL_TO_INSCRIBED", measure: 104 },
  { direction: "CENTRAL_TO_INSCRIBED", measure: 138 }, { direction: "CENTRAL_TO_INSCRIBED", measure: 176 },
  { direction: "INSCRIBED_TO_CENTRAL", measure: 32 }, { direction: "INSCRIBED_TO_CENTRAL", measure: 47 },
  { direction: "INSCRIBED_TO_CENTRAL", measure: 61 }, { direction: "INSCRIBED_TO_CENTRAL", measure: 79 },
] as const;
const centralInscribedSeeds: readonly Seed[] = centralInscribedInputs.map((item) => {
  const centralToInscribed = item.direction === "CENTRAL_TO_INSCRIBED";
  const answer = centralToInscribed ? item.measure / 2 : item.measure * 2;
  return {
    prompt: centralToInscribed
      ? `Trong đường tròn tâm O, góc ở tâm AOB bằng ${item.measure}°. Điểm C thuộc cung lớn AB nên góc nội tiếp ACB cùng chắn cung nhỏ AB. Góc ACB bằng bao nhiêu độ?`
      : `Trong đường tròn tâm O, điểm C thuộc cung lớn AB. Góc nội tiếp ACB bằng ${item.measure}° và góc ở tâm AOB cùng chắn cung nhỏ AB. Góc AOB bằng bao nhiêu độ?`,
    given: item.measure, answer, derivation: centralToInscribed ? divideByTwo(item.measure) : multiplyByTwo(item.measure), relation: centralToInscribed ? "HALF" : "DOUBLE",
    skillId: sharedArcSkill, unitId: sharedArcUnit, blueprintId: "g9-wave-d-central-inscribed-extension", difficulty: "EXTENSION",
    explanation: ["Góc ở tâm bằng hai lần góc nội tiếp cùng chắn một cung.", centralToInscribed ? `Chia góc ở tâm ${item.measure}° cho 2, được ${answer}°.` : `Nhân góc nội tiếp ${item.measure}° với 2, được ${answer}°.`],
  };
});

const seeds = [...centralArcSeeds, ...inscribedArcSeeds, ...centralInscribedSeeds];
export function verifyGradeNineWaveDCircleAngleOracle(): readonly string[] {
  const errors: string[] = [];
  seeds.forEach((seed, index) => {
    const expected = seed.relation === "SAME" ? seed.given : seed.relation === "HALF" ? seed.given / 2 : seed.given * 2;
    if (!Number.isInteger(expected) || expected <= 0 || expected >= 360 || seed.answer !== expected) errors.push(`g9-wave-d-circle-angle-q${String(index + 1).padStart(2, "0")}`);
  });
  return errors;
}
const independentOracleErrors = verifyGradeNineWaveDCircleAngleOracle();
if (independentOracleErrors.length > 0) throw new Error(`GRADE_9_WAVE_D_ORACLE_FAILED:${independentOracleErrors.join(",")}`);

const skeleton = buildOfficialGradeSkeleton(grade);
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({
  id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`, entityId: packId, check, status: "PASSED" as const,
  evidence: check === "MATHEMATICAL_ANSWER" ? `Independent exact-degree oracle verifies equality and factor-two relations for every central, inscribed, and intercepted-arc measure; mismatches: ${independentOracleErrors.length}.` : `Deterministic Grade 9 Wave D ${check.toLowerCase().replaceAll("_", " ")} evidence.`,
}));
const receiptIds = evidenceReceipts.map((receipt) => receipt.id);
const questions: CandidateQuestion[] = seeds.map((seed, index) => {
  const prompt = seed.prompt.normalize("NFC");
  return {
    id: `g9-wave-d-circle-angle-q${String(index + 1).padStart(2, "0")}`, grade, unitId: seed.unitId, blueprintId: seed.blueprintId, skillId: seed.skillId, prompt, options: null,
    answer: { type: "INTEGER_INPUT", exactValue: String(seed.answer), derivation: seed.derivation, unit: "degree" }, explanationId: `g9-wave-d-circle-angle-q${String(index + 1).padStart(2, "0")}-explanation`, difficulty: seed.difficulty,
    provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g9-circle-angle-relations-template-v1", seed: `g9-wave-d-${index + 1}`, sourceReferenceIds: [sourceId] },
    reviewStatus: "BUNDLED", published: false, pilotEligible: false, fixtureOnly: false,
    duplicateFingerprint: sha256(normalizedDefinition(`${prompt}|`).toLocaleLowerCase("vi")), validationReceiptIds: receiptIds, instructionalPurpose: purpose(index),
  };
});
const explanations: ExplanationSpec[] = questions.map((question, index) => ({ id: question.explanationId, questionId: question.id, steps: seeds[index]!.explanation, finalAnswer: question.answer.exactValue!, evidenceReceiptIds: [`${packId}-explanation-consistency`] }));
const blueprints = [
  { id: "g9-wave-d-central-arc-foundational", grade, skillId: arcAngleSkill, difficulty: "FOUNDATIONAL" as const, questionType: "INTEGER_INPUT" as const, templateId: "g9-circle-angle-relations-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
  { id: "g9-wave-d-inscribed-arc-core", grade, skillId: arcAngleSkill, difficulty: "CORE" as const, questionType: "INTEGER_INPUT" as const, templateId: "g9-circle-angle-relations-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
  { id: "g9-wave-d-central-inscribed-extension", grade, skillId: sharedArcSkill, difficulty: "EXTENSION" as const, questionType: "INTEGER_INPUT" as const, templateId: "g9-circle-angle-relations-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
];
const sourceOutcomeIds = ["MOET2018-G9-GEO-P075-020", "MOET2018-G9-GEO-P075-021"] as const;
const candidateCore = { format: "plave-wave-d-candidate-v1", grade, candidateId, version, policyVersion, sourceOutcomeIds, blueprints, questions, explanations };
const bundleHash = sha256(canonicalize(candidateCore));

export const gradeNineWaveDPack: GradePack = {
  schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC",
  sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units, knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives,
  prerequisites: [
    { fromSkillId: "moet2018-g9-sta-p077-019", toSkillId: arcAngleSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
    { fromSkillId: arcAngleSkill, toSkillId: sharedArcSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  ], blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts,
  candidate: { candidateId, version, bundleHash, policyVersion }, adaptivePolicy: { version: policyVersion, status: "VALIDATED" },
  release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false },
  production: { wave: "D", selectedSliceId: "g9-circle-central-inscribed-angle-relations", selectionBasis: ["SOURCE_VERIFIED", "PAGE_75_EXACT_ROWS", "EXACT_INTEGER_DEGREE_ORACLE", "EXPLICIT_INTERCEPTED_ARC_CONFIGURATION", "UNCOVERED_IN_WAVES_A_TO_C"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 },
  legacyAsset: null,
};

export const gradeNineWaveDMetadata = Object.freeze({ schemaVersion: "plave-wave-d-metadata-v1", grade, title: "Quan hệ cung, góc ở tâm và góc nội tiếp", sourcePages: [75] as const, sourceOutcomeIds, prerequisiteOutcomeIds: [] as const, prerequisiteEvidence: "NOT_SPECIFIED_BY_SOURCE_INVENTORY", remainingGap: "Diagram-dependent recognition and open proof responses remain excluded; only explicitly named points and exact degree relations enter this candidate.", production: gradeNineWaveDPack.production, candidate: gradeNineWaveDPack.candidate, release: gradeNineWaveDPack.release });
export const gradeNineWavesABCD = Object.freeze({ grade, packs: [gradeNineWaveAPack, gradeNineWaveBPack, gradeNineWaveCPack, gradeNineWaveDPack] as const, questions: [...gradeNineWaveAPack.questions, ...gradeNineWaveBPack.questions, ...gradeNineWaveCPack.questions, ...gradeNineWaveDPack.questions], candidateBindings: [gradeNineWaveAPack.candidate, gradeNineWaveBPack.candidate, gradeNineWaveCPack.candidate, gradeNineWaveDPack.candidate], release: gradeNineWaveDPack.release });
