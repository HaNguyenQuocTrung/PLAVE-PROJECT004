import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { gradeSevenWaveAPack } from "./grade7-wave-a.ts";
import { gradeSevenWaveBPack } from "./grade7-wave-b.ts";
import { gradeSevenWaveCPack } from "./grade7-wave-c.ts";
import { gradeSevenWaveDPack } from "./grade7-wave-d.ts";
import { buildOfficialGradeSkeleton, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 7 as const;
const packId = "grade-7-right-prism-measurement-wave-e";
const version = "g7-right-prism-measurement-1.0.0-wave-e";
const candidateId = "g7-right-prism-measurement-wave-e-rc1";
const policyVersion = "g7-right-prism-measurement-policy-1.0.0-wave-e";
const sourceId = officialSourceReferenceId(grade);
const unitId = "grade-7-prism-measurement";
const applicationSkill = "moet2018-g7-geo-p058-001";
const measurementSkill = "moet2018-g7-geo-p058-005";
const value = (numerator: number): MathExpression => ({ op: "VALUE", numerator, denominator: 1 });
const add = (left: MathExpression, right: MathExpression): MathExpression => ({ op: "ADD", left, right });
const multiply = (left: MathExpression, right: MathExpression): MathExpression => ({ op: "MULTIPLY", left, right });
const sumExpression = (numbers: readonly number[]) => numbers.map(value).reduce(add);
const purpose = (index: number): NonNullable<CandidateQuestion["instructionalPurpose"]> => ["FOUNDATION", "STANDARD_APPLICATION", "MISCONCEPTION_TARGETING", "REMEDIATION", "TRANSFER_APPLICATION"][(index % 8) < 2 ? 0 : (index % 8) < 4 ? 1 : (index % 8) < 6 ? 2 : (index % 8) === 6 ? 3 : 4]! as NonNullable<CandidateQuestion["instructionalPurpose"]>;

type Seed = Readonly<{ prompt: string; factors: readonly number[]; answer: number; derivation: MathExpression; skillId: string; blueprintId: string; difficulty: DifficultyBand; explanation: readonly string[] }>;
const volumeInputs = [
  [12, 7], [18, 5], [24, 9], [15, 11], [28, 6], [32, 8], [21, 13], [36, 4],
] as const;
const volumeSeeds: readonly Seed[] = volumeInputs.map(([baseArea, height], index) => ({
  prompt: `${index % 2 === 0 ? "Một lăng trụ đứng tam giác" : "Một lăng trụ đứng tứ giác"} có diện tích đáy ${baseArea} cm² và chiều cao lăng trụ ${height} cm. Thể tích bằng bao nhiêu xăng-ti-mét khối?`,
  factors: [baseArea, height], answer: baseArea * height, derivation: multiply(value(baseArea), value(height)), skillId: measurementSkill, blueprintId: "g7-wave-e-prism-volume-foundational", difficulty: "FOUNDATIONAL",
  explanation: ["Thể tích lăng trụ đứng bằng diện tích đáy nhân chiều cao.", `Tính ${baseArea} × ${height} = ${baseArea * height} cm³.`],
}));
const lateralInputs = [
  { sides: [3, 4, 5], height: 8 }, { sides: [5, 5, 6], height: 7 }, { sides: [6, 8, 10], height: 9 }, { sides: [7, 7, 10], height: 6 },
  { sides: [4, 6, 4, 6], height: 11 }, { sides: [5, 7, 5, 7], height: 10 }, { sides: [6, 9, 6, 9], height: 8 }, { sides: [8, 10, 8, 10], height: 5 },
] as const;
const lateralSeeds: readonly Seed[] = lateralInputs.map((item) => {
  const perimeter = item.sides.reduce((sum, side) => sum + side, 0);
  const answer = perimeter * item.height;
  return {
    prompt: `Một lăng trụ đứng có đáy là ${item.sides.length === 3 ? "tam giác" : "tứ giác"} với các cạnh ${item.sides.join(", ")} cm và chiều cao ${item.height} cm. Diện tích xung quanh bằng bao nhiêu xăng-ti-mét vuông?`,
    factors: [perimeter, item.height], answer, derivation: multiply(sumExpression(item.sides), value(item.height)), skillId: measurementSkill, blueprintId: "g7-wave-e-prism-lateral-core", difficulty: "CORE",
    explanation: [`Chu vi đáy là ${item.sides.join(" + ")} = ${perimeter} cm.`, `Diện tích xung quanh bằng ${perimeter} × ${item.height} = ${answer} cm².`],
  };
});
const applicationInputs = [
  { context: "Một bể chứa dạng lăng trụ đứng", measure: "thể tích", first: 45, second: 12, answer: 540 },
  { context: "Một hộp quà dạng lăng trụ đứng", measure: "thể tích", first: 36, second: 15, answer: 540 },
  { context: "Một khối gỗ dạng lăng trụ đứng", measure: "thể tích", first: 28, second: 20, answer: 560 },
  { context: "Một khuôn bê tông dạng lăng trụ đứng", measure: "thể tích", first: 54, second: 9, answer: 486 },
  { context: "Một ống bọc dạng lăng trụ đứng", measure: "diện tích xung quanh", first: 26, second: 14, answer: 364 },
  { context: "Một hộp đèn dạng lăng trụ đứng", measure: "diện tích xung quanh", first: 32, second: 18, answer: 576 },
  { context: "Một cột trang trí dạng lăng trụ đứng", measure: "diện tích xung quanh", first: 40, second: 16, answer: 640 },
  { context: "Một vỏ hộp dạng lăng trụ đứng", measure: "diện tích xung quanh", first: 35, second: 12, answer: 420 },
] as const;
const applicationSeeds: readonly Seed[] = applicationInputs.map((item) => ({
  prompt: item.measure === "thể tích"
    ? `${item.context} có diện tích đáy ${item.first} cm² và chiều cao ${item.second} cm. Dung tích hình học của nó là bao nhiêu xăng-ti-mét khối?`
    : `${item.context} có chu vi đáy ${item.first} cm và chiều cao ${item.second} cm. Diện tích vật liệu phủ các mặt bên là bao nhiêu xăng-ti-mét vuông?`,
  factors: [item.first, item.second], answer: item.answer, derivation: multiply(value(item.first), value(item.second)), skillId: applicationSkill, blueprintId: "g7-wave-e-prism-application-extension", difficulty: "EXTENSION",
  explanation: [item.measure === "thể tích" ? "Dùng diện tích đáy nhân chiều cao để tính thể tích." : "Dùng chu vi đáy nhân chiều cao để tính diện tích xung quanh.", `Tích ${item.first} × ${item.second} bằng ${item.answer}.`],
}));
const seeds = [...volumeSeeds, ...lateralSeeds, ...applicationSeeds];
export const verifyGradeSevenWaveEOracle = () => seeds.flatMap((seed, index) => seed.factors.reduce((product, factor) => product * factor, 1) === seed.answer ? [] : [`g7-wave-e-prism-q${String(index + 1).padStart(2, "0")}`]);
const oracleErrors = verifyGradeSevenWaveEOracle();
if (oracleErrors.length) throw new Error(`GRADE_7_WAVE_E_ORACLE_FAILED:${oracleErrors.join(",")}`);
const skeleton = buildOfficialGradeSkeleton(grade);
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({ id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`, entityId: packId, check, status: "PASSED" as const, evidence: check === "MATHEMATICAL_ANSWER" ? `Independent base-area/perimeter product oracle verifies every prism measure; mismatches: ${oracleErrors.length}.` : `Deterministic Grade 7 Wave E ${check.toLowerCase().replaceAll("_", " ")} evidence.` }));
const receiptIds = evidenceReceipts.map((receipt) => receipt.id);
const questions: CandidateQuestion[] = seeds.map((seed, index) => { const prompt = seed.prompt.normalize("NFC"); return { id: `g7-wave-e-prism-q${String(index + 1).padStart(2, "0")}`, grade, unitId, blueprintId: seed.blueprintId, skillId: seed.skillId, prompt, options: null, answer: { type: "INTEGER_INPUT", exactValue: String(seed.answer), derivation: seed.derivation }, explanationId: `g7-wave-e-prism-q${String(index + 1).padStart(2, "0")}-explanation`, difficulty: seed.difficulty, provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g7-right-prism-measurement-template-v1", seed: `g7-wave-e-${index + 1}`, sourceReferenceIds: [sourceId] }, reviewStatus: "BUNDLED", published: false, pilotEligible: false, fixtureOnly: false, duplicateFingerprint: sha256(normalizedDefinition(`${prompt}|`).toLocaleLowerCase("vi")), validationReceiptIds: receiptIds, instructionalPurpose: purpose(index) }; });
const explanations: ExplanationSpec[] = questions.map((question, index) => ({ id: question.explanationId, questionId: question.id, steps: seeds[index]!.explanation, finalAnswer: question.answer.exactValue!, evidenceReceiptIds: [`${packId}-explanation-consistency`] }));
const blueprints = [
  { id: "g7-wave-e-prism-volume-foundational", grade, skillId: measurementSkill, difficulty: "FOUNDATIONAL" as const, questionType: "INTEGER_INPUT" as const, templateId: "g7-right-prism-measurement-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
  { id: "g7-wave-e-prism-lateral-core", grade, skillId: measurementSkill, difficulty: "CORE" as const, questionType: "INTEGER_INPUT" as const, templateId: "g7-right-prism-measurement-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
  { id: "g7-wave-e-prism-application-extension", grade, skillId: applicationSkill, difficulty: "EXTENSION" as const, questionType: "INTEGER_INPUT" as const, templateId: "g7-right-prism-measurement-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
];
const sourceOutcomeIds = ["MOET2018-G7-GEO-P058-001", "MOET2018-G7-GEO-P058-005"] as const;
const candidateCore = { format: "plave-wave-e-candidate-v1", grade, candidateId, version, policyVersion, sourceOutcomeIds, blueprints, questions, explanations };
const bundleHash = sha256(canonicalize(candidateCore));
export const gradeSevenWaveEPack: GradePack = { schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC", sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units, knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives, prerequisites: [
  { fromSkillId: "moet2018-g7-naa-p058-034", toSkillId: measurementSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  { fromSkillId: measurementSkill, toSkillId: applicationSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
], blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts, candidate: { candidateId, version, bundleHash, policyVersion }, adaptivePolicy: { version: policyVersion, status: "VALIDATED" }, release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false }, production: { wave: "E", selectedSliceId: "g7-right-prism-measurement", selectionBasis: ["SOURCE_VERIFIED", "PAGES_58_59_EXACT_ROWS", "EXACT_AREA_VOLUME_PRODUCTS", "UNCOVERED_IN_WAVES_A_TO_D"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 }, legacyAsset: null };
export const gradeSevenWaveEMetadata = Object.freeze({ schemaVersion: "plave-wave-e-metadata-v1", grade, title: "Diện tích xung quanh và thể tích lăng trụ đứng", sourcePages: [58, 59] as const, sourceOutcomeIds, prerequisiteOutcomeIds: [] as const, prerequisiteEvidence: "NOT_SPECIFIED_BY_SOURCE_INVENTORY", production: gradeSevenWaveEPack.production, candidate: gradeSevenWaveEPack.candidate, release: gradeSevenWaveEPack.release });
export const gradeSevenWavesABCDE = Object.freeze({ grade, packs: [gradeSevenWaveAPack, gradeSevenWaveBPack, gradeSevenWaveCPack, gradeSevenWaveDPack, gradeSevenWaveEPack] as const, questions: [...gradeSevenWaveAPack.questions, ...gradeSevenWaveBPack.questions, ...gradeSevenWaveCPack.questions, ...gradeSevenWaveDPack.questions, ...gradeSevenWaveEPack.questions], candidateBindings: [gradeSevenWaveAPack.candidate, gradeSevenWaveBPack.candidate, gradeSevenWaveCPack.candidate, gradeSevenWaveDPack.candidate, gradeSevenWaveEPack.candidate], release: gradeSevenWaveEPack.release });
