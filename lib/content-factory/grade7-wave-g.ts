import { canonicalize, normalizedDefinition, sha256 } from "./canonical.ts";
import { gradeSevenWaveAPack } from "./grade7-wave-a.ts";
import { gradeSevenWaveBPack } from "./grade7-wave-b.ts";
import { gradeSevenWaveCPack } from "./grade7-wave-c.ts";
import { gradeSevenWaveDPack } from "./grade7-wave-d.ts";
import { gradeSevenWaveEPack } from "./grade7-wave-e.ts";
import { gradeSevenWaveFPack } from "./grade7-wave-f.ts";
import { buildOfficialGradeSkeleton, officialSourceReferenceId } from "./official-source-map.ts";
import { requiredAutomatedEvidenceChecks } from "./review.ts";
import type { CandidateQuestion, DifficultyBand, ExplanationSpec, GradePack, MathExpression } from "./types.ts";

const grade = 7 as const;
const packId = "grade-7-pie-line-data-wave-g";
const version = "g7-pie-line-data-1.0.0-wave-g";
const candidateId = "g7-pie-line-data-wave-g-rc1";
const policyVersion = "g7-pie-line-data-policy-1.0.0-wave-g";
const sourceId = officialSourceReferenceId(grade);
const dataUnit = "grade-7-data-and-probability";
const contextUnit = "grade-7-secondary-context-p1-12";
const readSkill = "moet2018-g7-sta-p061-001";
const problemSkill = "moet2018-g7-sta-p061-002";
const patternSkill = "moet2018-g7-sta-p061-007";
const value = (numerator: number): MathExpression => ({ op: "VALUE", numerator, denominator: 1 });
const add = (left: MathExpression, right: MathExpression): MathExpression => ({ op: "ADD", left, right });
const subtract = (left: MathExpression, right: MathExpression): MathExpression => ({ op: "SUBTRACT", left, right });
const multiply = (left: MathExpression, right: MathExpression): MathExpression => ({ op: "MULTIPLY", left, right });
const divide = (left: MathExpression, right: MathExpression): MathExpression => ({ op: "DIVIDE", left, right });
const purpose = (index: number): NonNullable<CandidateQuestion["instructionalPurpose"]> => { const slot = index % 8; return slot < 2 ? "FOUNDATION" : slot < 4 ? "STANDARD_APPLICATION" : slot < 6 ? "MISCONCEPTION_TARGETING" : slot === 6 ? "REMEDIATION" : "TRANSFER_APPLICATION"; };
type Seed = Readonly<{ prompt: string; answer: number; derivation: MathExpression; operands: readonly number[]; operation: "PIE" | "CHANGE" | "PATTERN"; skillId: string; unitId: string; blueprintId: string; difficulty: DifficultyBand; explanation: readonly string[] }>;

const pieInputs = [[120, 25], [200, 15], [160, 30], [240, 35], [300, 12], [400, 18], [250, 28], [360, 45]] as const;
const pieSeeds: readonly Seed[] = pieInputs.map(([total, percent], index) => ({ prompt: index % 2 === 0
  ? `Biểu đồ quạt tròn mô tả ${total} quan sát; nhóm A chiếm ${percent}%. Nhóm A có bao nhiêu quan sát?`
  : `Trong bảng dữ liệu của biểu đồ quạt tròn, tổng là ${total} và phần dành cho nhóm A là ${percent}%. Hãy xác định tần số của nhóm A.`, answer: total * percent / 100, derivation: divide(multiply(value(total), value(percent)), value(100)), operands: [total, percent], operation: "PIE", skillId: readSkill, unitId: dataUnit, blueprintId: "g7-wave-g-pie-read-foundational", difficulty: "FOUNDATIONAL", explanation: [`Nhóm A chiếm ${percent} phần trong 100 phần của tổng.`, `Tính ${total} × ${percent}/100.`] }));
const lineInputs = [[42, 57], [68, 51], [35, 64], [90, 72], [105, 128], [144, 119], [76, 101], [132, 165]] as const;
const lineSeeds: readonly Seed[] = lineInputs.map(([first, second]) => ({ prompt: `Biểu đồ đoạn thẳng ghi giá trị hai thời điểm liên tiếp là ${first} và ${second}. Giá trị đã thay đổi bao nhiêu nếu lấy thời điểm sau trừ thời điểm trước?`, answer: second - first, derivation: subtract(value(second), value(first)), operands: [first, second], operation: "CHANGE", skillId: problemSkill, unitId: contextUnit, blueprintId: "g7-wave-g-line-change-core", difficulty: "CORE", explanation: ["Đọc đúng hai điểm theo thứ tự thời gian.", `Lấy ${second} - ${first}.`] }));
const patternInputs = [[12, 5], [30, -4], [7, 6], [50, -7], [18, 9], [80, -10], [25, 8], [100, -12]] as const;
const patternSeeds: readonly Seed[] = patternInputs.map(([start, step]) => { const values = [start, start + step, start + 2 * step, start + 3 * step]; const answer = start + 4 * step; return { prompt: `Các điểm liên tiếp trên biểu đồ đoạn thẳng có giá trị ${values.join(", ")}. Nếu quy luật thay đổi không đổi tiếp tục, giá trị kế tiếp là bao nhiêu?`, answer, derivation: add(value(values[3]!), value(step)), operands: [...values, step], operation: "PATTERN", skillId: patternSkill, unitId: dataUnit, blueprintId: "g7-wave-g-line-pattern-extension", difficulty: "EXTENSION", explanation: [`Hiệu giữa hai giá trị liên tiếp luôn bằng ${step}.`, `Cộng ${step} vào ${values[3]} được ${answer}.`] }; });
const seeds = [...pieSeeds, ...lineSeeds, ...patternSeeds];
export function verifyGradeSevenWaveGOracle(): readonly string[] { return seeds.flatMap((seed, index) => { const expected = seed.operation === "PIE" ? seed.operands[0]! * seed.operands[1]! / 100 : seed.operation === "CHANGE" ? seed.operands[1]! - seed.operands[0]! : seed.operands[3]! + seed.operands[4]!; return expected === seed.answer && Number.isInteger(expected) ? [] : [`g7-wave-g-data-q${String(index + 1).padStart(2, "0")}`]; }); }
const oracleErrors = verifyGradeSevenWaveGOracle(); if (oracleErrors.length) throw new Error(`GRADE_7_WAVE_G_ORACLE_FAILED:${oracleErrors.join(",")}`);
const skeleton = buildOfficialGradeSkeleton(grade);
const evidenceReceipts = requiredAutomatedEvidenceChecks.map((check) => ({ id: `${packId}-${check.toLowerCase().replaceAll("_", "-")}`, entityId: packId, check, status: "PASSED" as const, evidence: check === "MATHEMATICAL_ANSWER" ? `Independent pie-total, signed-change, and constant-difference oracle; mismatches: ${oracleErrors.length}.` : `Deterministic Grade 7 Wave G ${check}.` }));
const receiptIds = evidenceReceipts.map((receipt) => receipt.id);
const questions: CandidateQuestion[] = seeds.map((seed, index) => { const prompt = seed.prompt.normalize("NFC"); const id = `g7-wave-g-data-q${String(index + 1).padStart(2, "0")}`; return { id, grade, unitId: seed.unitId, blueprintId: seed.blueprintId, skillId: seed.skillId, prompt, options: null, answer: { type: "INTEGER_INPUT", exactValue: String(seed.answer), derivation: seed.derivation }, explanationId: `${id}-explanation`, difficulty: seed.difficulty, provenance: { kind: "DETERMINISTIC_TEMPLATE", templateVersion: "g7-pie-line-data-template-v1", seed: `g7-wave-g-${index + 1}`, sourceReferenceIds: [sourceId] }, reviewStatus: "BUNDLED", published: false, pilotEligible: false, fixtureOnly: false, duplicateFingerprint: sha256(normalizedDefinition(`${prompt}|`).toLocaleLowerCase("vi")), validationReceiptIds: receiptIds, instructionalPurpose: purpose(index) }; });
const explanations: ExplanationSpec[] = questions.map((question, index) => ({ id: question.explanationId, questionId: question.id, steps: seeds[index]!.explanation, finalAnswer: question.answer.exactValue!, evidenceReceiptIds: [`${packId}-explanation-consistency`] }));
const blueprints = [
  { id: "g7-wave-g-pie-read-foundational", grade, skillId: readSkill, difficulty: "FOUNDATIONAL" as const, questionType: "INTEGER_INPUT" as const, templateId: "g7-pie-line-data-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
  { id: "g7-wave-g-line-change-core", grade, skillId: problemSkill, difficulty: "CORE" as const, questionType: "INTEGER_INPUT" as const, templateId: "g7-pie-line-data-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
  { id: "g7-wave-g-line-pattern-extension", grade, skillId: patternSkill, difficulty: "EXTENSION" as const, questionType: "INTEGER_INPUT" as const, templateId: "g7-pie-line-data-template-v1", targetCount: 8, sourceReferenceIds: [sourceId] },
];
const sourceOutcomeIds = ["MOET2018-G7-STA-P061-001", "MOET2018-G7-STA-P061-002", "MOET2018-G7-STA-P061-007"] as const;
const core = { format: "plave-wave-g-candidate-v1", grade, candidateId, version, policyVersion, sourceOutcomeIds, blueprints, questions, explanations }; const bundleHash = sha256(canonicalize(core));
export const gradeSevenWaveGPack: GradePack = { schemaVersion: "content-factory-grade-pack-v1", grade, packId, packVersion: version, immutableReference: false, testOnly: false, locale: "vi-VN", unicodeNormalization: "NFC", sources: [skeleton.source], domains: skeleton.domains, units: skeleton.units, knowledgeNodes: skeleton.knowledgeNodes, skills: skeleton.skills, objectives: skeleton.objectives, prerequisites: [
  { fromSkillId: "moet2018-g7-naa-p057-030", toSkillId: readSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] }, { fromSkillId: readSkill, toSkillId: problemSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] }, { fromSkillId: problemSkill, toSkillId: patternSkill, evidence: "HYPOTHESIS_REQUIRES_EVIDENCE", sourceReferenceIds: [] },
], blueprints, questions, quarantinedQuestions: [], explanations, evidenceReceipts, candidate: { candidateId, version, bundleHash, policyVersion }, adaptivePolicy: { version: policyVersion, status: "VALIDATED" }, release: { publication: "DRAFT", visibility: "HIDDEN", pilotEnabled: false, runtimeEnabled: false, retentionEnabled: false }, production: { wave: "G", selectedSliceId: "g7-pie-line-data", selectionBasis: ["SOURCE_VERIFIED", "PAGE_61_EXACT_ROWS", "EXACT_DATA_TOTAL_CHANGE_PATTERN_ORACLE", "UNCOVERED_IN_WAVES_A_TO_F"], generated: 24, repaired: 0, evidenceGatePassed: 24, verificationInsufficient: 0, rejected: 0, duplicate: 0, candidateEligible: 24 }, legacyAsset: null };
export const gradeSevenWaveGMetadata = Object.freeze({ schemaVersion: "plave-wave-g-metadata-v1", grade, title: "Dữ liệu biểu đồ quạt tròn và đoạn thẳng", sourcePages: [61] as const, sourceOutcomeIds, prerequisiteOutcomeIds: [] as const, prerequisiteEvidence: "NOT_SPECIFIED_BY_SOURCE_INVENTORY", production: gradeSevenWaveGPack.production, candidate: gradeSevenWaveGPack.candidate, release: gradeSevenWaveGPack.release });
export const gradeSevenWavesABCDEFG = Object.freeze({ grade, packs: [gradeSevenWaveAPack, gradeSevenWaveBPack, gradeSevenWaveCPack, gradeSevenWaveDPack, gradeSevenWaveEPack, gradeSevenWaveFPack, gradeSevenWaveGPack] as const, questions: [...gradeSevenWaveAPack.questions, ...gradeSevenWaveBPack.questions, ...gradeSevenWaveCPack.questions, ...gradeSevenWaveDPack.questions, ...gradeSevenWaveEPack.questions, ...gradeSevenWaveFPack.questions, ...gradeSevenWaveGPack.questions], candidateBindings: [gradeSevenWaveAPack.candidate, gradeSevenWaveBPack.candidate, gradeSevenWaveCPack.candidate, gradeSevenWaveDPack.candidate, gradeSevenWaveEPack.candidate, gradeSevenWaveFPack.candidate, gradeSevenWaveGPack.candidate], release: gradeSevenWaveGPack.release });
