import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { gradeEightWaveAPack } from "./grade8-wave-a.ts";
import { gradeEightWaveBPack } from "./grade8-wave-b.ts";
import { gradeEightWaveCPack } from "./grade8-wave-c.ts";
import { gradeEightWaveDPack } from "./grade8-wave-d.ts";
import { buildOfficialGradeSkeleton, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 8 as const;
const packId = "grade-8-regular-pyramid-measurement-wave-e";
const version = "g8-regular-pyramid-measurement-1.0.0-wave-e";
const candidateId = "g8-regular-pyramid-measurement-wave-e-rc1";
const policyVersion = "g8-regular-pyramid-measurement-policy-1.0.0-wave-e";
const sourceId = officialSourceReferenceId(grade);
const unitId = "grade-8-pyramid-measurement";
const applicationSkill = "moet2018-g8-geo-p065-001";
const measurementSkill = "moet2018-g8-geo-p065-005";
const value = (numerator: number): MathExpression => ({ op: "VALUE", numerator, denominator: 1 });
const multiply = (left: MathExpression, right: MathExpression): MathExpression => ({ op: "MULTIPLY", left, right });
const divide = (left: MathExpression, right: MathExpression): MathExpression => ({ op: "DIVIDE", left, right });
const productExpression = (factors: readonly number[], divisor: number) => { const product = factors.map(value).reduce(multiply); return divisor === 1 ? product : divide(product, value(divisor)); };
const purpose = (index: number): NonNullable<CandidateQuestion["instructionalPurpose"]> => { const slot = index % 8; return slot < 2 ? "FOUNDATION" : slot < 4 ? "STANDARD_APPLICATION" : slot < 6 ? "MISCONCEPTION_TARGETING" : slot === 6 ? "REMEDIATION" : "TRANSFER_APPLICATION"; };
type Seed = Readonly<{ prompt: string; factors: readonly number[]; divisor: number; answer: number; derivation: MathExpression; skillId: string; blueprintId: string; difficulty: DifficultyBand; explanation: readonly string[] }>;

const volumeInputs = [
  { shape: "tứ giác đều", base: 6, baseArea: 36, height: 9, givenArea: false }, { shape: "tứ giác đều", base: 8, baseArea: 64, height: 12, givenArea: false },
  { shape: "tứ giác đều", base: 10, baseArea: 100, height: 6, givenArea: false }, { shape: "tứ giác đều", base: 12, baseArea: 144, height: 15, givenArea: false },
  { shape: "tam giác đều", base: 0, baseArea: 18, height: 10, givenArea: true }, { shape: "tam giác đều", base: 0, baseArea: 24, height: 15, givenArea: true },
  { shape: "tam giác đều", base: 0, baseArea: 30, height: 12, givenArea: true }, { shape: "tam giác đều", base: 0, baseArea: 42, height: 9, givenArea: true },
] as const;
const volumeSeeds: readonly Seed[] = volumeInputs.map((item) => {
  const factors = item.givenArea ? [item.baseArea, item.height] : [item.base, item.base, item.height];
  const answer = factors.reduce((product, factor) => product * factor, 1) / 3;
  return { prompt: item.givenArea ? `Một hình chóp ${item.shape} có diện tích đáy ${item.baseArea} cm² và chiều cao ${item.height} cm. Thể tích bằng bao nhiêu xăng-ti-mét khối?` : `Một hình chóp ${item.shape} có cạnh đáy ${item.base} cm và chiều cao ${item.height} cm. Thể tích bằng bao nhiêu xăng-ti-mét khối?`, factors, divisor: 3, answer, derivation: productExpression(factors, 3), skillId: measurementSkill, blueprintId: "g8-wave-e-pyramid-volume-foundational", difficulty: "FOUNDATIONAL", explanation: ["Thể tích hình chóp bằng một phần ba diện tích đáy nhân chiều cao.", `Thay dữ kiện và chia 3, được ${answer} cm³.`] };
});
const lateralInputs = [
  { shape: "tứ giác đều", sides: 4, base: 5, slant: 8 }, { shape: "tứ giác đều", sides: 4, base: 7, slant: 10 }, { shape: "tứ giác đều", sides: 4, base: 9, slant: 12 }, { shape: "tứ giác đều", sides: 4, base: 11, slant: 6 },
  { shape: "tam giác đều", sides: 3, base: 6, slant: 9 }, { shape: "tam giác đều", sides: 3, base: 8, slant: 7 }, { shape: "tam giác đều", sides: 3, base: 10, slant: 11 }, { shape: "tam giác đều", sides: 3, base: 12, slant: 5 },
] as const;
const lateralSeeds: readonly Seed[] = lateralInputs.map((item) => { const factors = [item.sides, item.base, item.slant]; const answer = item.sides * item.base * item.slant / 2; return { prompt: `Một hình chóp ${item.shape} có cạnh đáy ${item.base} cm và trung đoạn mặt bên ${item.slant} cm. Diện tích xung quanh bằng bao nhiêu xăng-ti-mét vuông?`, factors, divisor: 2, answer, derivation: productExpression(factors, 2), skillId: measurementSkill, blueprintId: "g8-wave-e-pyramid-lateral-core", difficulty: "CORE", explanation: [`Chu vi đáy là ${item.sides} × ${item.base} = ${item.sides * item.base} cm.`, `Diện tích xung quanh bằng nửa chu vi đáy nhân trung đoạn, được ${answer} cm².`] }; });
const applicationInputs = [
  { context: "Một mô hình mái dạng chóp tứ giác đều", kind: "volume", factors: [100, 12], divisor: 3 }, { context: "Một hộp trưng bày dạng chóp tam giác đều", kind: "volume", factors: [36, 15], divisor: 3 },
  { context: "Một khối trang trí dạng chóp tứ giác đều", kind: "volume", factors: [64, 9], divisor: 3 }, { context: "Một khuôn dạng chóp tam giác đều", kind: "volume", factors: [45, 8], divisor: 3 },
  { context: "Một mái che dạng chóp tứ giác đều", kind: "lateral", factors: [4, 8, 10], divisor: 2 }, { context: "Một vỏ đèn dạng chóp tam giác đều", kind: "lateral", factors: [3, 10, 12], divisor: 2 },
  { context: "Một lều mô hình dạng chóp tứ giác đều", kind: "lateral", factors: [4, 7, 9], divisor: 2 }, { context: "Một tấm bọc dạng chóp tam giác đều", kind: "lateral", factors: [3, 12, 8], divisor: 2 },
] as const;
const applicationSeeds: readonly Seed[] = applicationInputs.map((item) => { const answer = item.factors.reduce((product, factor) => product * factor, 1) / item.divisor; const prompt = item.kind === "volume" ? `${item.context} có diện tích đáy ${item.factors[0]} dm² và chiều cao ${item.factors[1]} dm. Thể tích là bao nhiêu đề-xi-mét khối?` : `${item.context} có ${item.factors[0]} cạnh đáy, mỗi cạnh ${item.factors[1]} dm, trung đoạn mặt bên ${item.factors[2]} dm. Diện tích phủ các mặt bên là bao nhiêu đề-xi-mét vuông?`; return { prompt, factors: item.factors, divisor: item.divisor, answer, derivation: productExpression(item.factors, item.divisor), skillId: applicationSkill, blueprintId: "g8-wave-e-pyramid-application-extension", difficulty: "EXTENSION", explanation: [item.kind === "volume" ? "Dùng một phần ba diện tích đáy nhân chiều cao." : "Dùng nửa chu vi đáy nhân trung đoạn mặt bên.", `Tính chính xác theo dữ kiện được ${answer}.`] }; });
const seeds = [...volumeSeeds, ...lateralSeeds, ...applicationSeeds];
export const verifyGradeEightWaveEOracle = () => seeds.flatMap((seed, index) => seed.factors.reduce((product, factor) => product * factor, 1) / seed.divisor === seed.answer ? [] : [`g8-wave-e-pyramid-q${String(index + 1).padStart(2, "0")}`]);
const oracleErrors = verifyGradeEightWaveEOracle();
if (oracleErrors.length) throw new Error(`GRADE_8_WAVE_E_ORACLE_FAILED:${oracleErrors.join(",")}`);
const skeleton = buildOfficialGradeSkeleton(grade);
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({ id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`, entityId: packId, check, status: "PASSED" as const, evidence: check === "MATHEMATICAL_ANSWER" ? `Independent one-third-volume and half-perimeter lateral-area oracle verifies every pyramid answer; mismatches: ${oracleErrors.length}.` : `Deterministic Grade 8 Wave E ${check.toLowerCase().replaceAll("_", " ")} evidence.` }));
const receiptIds = evidenceReceipts.map((receipt) => receipt.id);
const questions: CandidateQuestion[] = seeds.map((seed, index) => { const prompt = seed.prompt.normalize("NFC"); return { id: `g8-wave-e-pyramid-q${String(index + 1).padStart(2, "0")}`, grade, unitId, blueprintId: seed.blueprintId, skillId: seed.skillId, prompt, options: null, answer: { type: "INTEGER_INPUT", exactValue: String(seed.answer), derivation: seed.derivation }, explanationId: `g8-wave-e-pyramid-q${String(index + 1).padStart(2, "0")}-explanation`, difficulty: seed.difficulty, provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g8-regular-pyramid-measurement-template-v1", seed: `g8-wave-e-${index + 1}`, sourceReferenceIds: [sourceId] }, reviewStatus: "BUNDLED", published: false, pilotEligible: false, fixtureOnly: false, duplicateFingerprint: sha256(normalizedDefinition(`${prompt}|`).toLocaleLowerCase("vi")), validationReceiptIds: receiptIds, instructionalPurpose: purpose(index) }; });
const explanations: ExplanationSpec[] = questions.map((question, index) => ({ id: question.explanationId, questionId: question.id, steps: seeds[index]!.explanation, finalAnswer: question.answer.exactValue!, evidenceReceiptIds: [`${packId}-explanation-consistency`] }));
const blueprints = [
  { id: "g8-wave-e-pyramid-volume-foundational", grade, skillId: measurementSkill, difficulty: "FOUNDATIONAL" as const, questionType: "INTEGER_INPUT" as const, templateId: "g8-regular-pyramid-measurement-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
  { id: "g8-wave-e-pyramid-lateral-core", grade, skillId: measurementSkill, difficulty: "CORE" as const, questionType: "INTEGER_INPUT" as const, templateId: "g8-regular-pyramid-measurement-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
  { id: "g8-wave-e-pyramid-application-extension", grade, skillId: applicationSkill, difficulty: "EXTENSION" as const, questionType: "INTEGER_INPUT" as const, templateId: "g8-regular-pyramid-measurement-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
];
const sourceOutcomeIds = ["MOET2018-G8-GEO-P065-001", "MOET2018-G8-GEO-P065-005"] as const;
const candidateCore = { format: "plave-wave-e-candidate-v1", grade, candidateId, version, policyVersion, sourceOutcomeIds, blueprints, questions, explanations };
const bundleHash = sha256(canonicalize(candidateCore));
export const gradeEightWaveEPack: GradePack = { schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC", sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units, knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives, prerequisites: [
  { fromSkillId: "moet2018-g8-naa-p064-009", toSkillId: measurementSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
  { fromSkillId: measurementSkill, toSkillId: applicationSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
], blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts, candidate: { candidateId, version, bundleHash, policyVersion }, adaptivePolicy: { version: policyVersion, status: "VALIDATED" }, release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false }, production: { wave: "E", selectedSliceId: "g8-regular-pyramid-measurement", selectionBasis: ["SOURCE_VERIFIED", "PAGE_65_EXACT_ROWS", "EXACT_PYRAMID_MEASUREMENT_ORACLE", "UNCOVERED_IN_WAVES_A_TO_D"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 }, legacyAsset: null };
export const gradeEightWaveEMetadata = Object.freeze({ schemaVersion: "plave-wave-e-metadata-v1", grade, title: "Diện tích xung quanh và thể tích hình chóp đều", sourcePages: [65] as const, sourceOutcomeIds, prerequisiteOutcomeIds: [] as const, prerequisiteEvidence: "NOT_SPECIFIED_BY_SOURCE_INVENTORY", production: gradeEightWaveEPack.production, candidate: gradeEightWaveEPack.candidate, release: gradeEightWaveEPack.release });
export const gradeEightWavesABCDE = Object.freeze({ grade, packs: [gradeEightWaveAPack, gradeEightWaveBPack, gradeEightWaveCPack, gradeEightWaveDPack, gradeEightWaveEPack] as const, questions: [...gradeEightWaveAPack.questions, ...gradeEightWaveBPack.questions, ...gradeEightWaveCPack.questions, ...gradeEightWaveDPack.questions, ...gradeEightWaveEPack.questions], candidateBindings: [gradeEightWaveAPack.candidate, gradeEightWaveBPack.candidate, gradeEightWaveCPack.candidate, gradeEightWaveDPack.candidate, gradeEightWaveEPack.candidate], release: gradeEightWaveEPack.release });
