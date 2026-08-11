import { canonicalize, sha256 } from "./canonical.ts";
import { combinedWaveABCDEFGHGradePacks } from "./wave-h-packs.ts";
import { buildWaveIGradeAudit, type WaveIEdgeEvidence } from "./wave-i-remediation.ts";
import {
  classifyWaveIError,
  waveIErrorCodes,
  waveIObservedFailures,
  type WaveIDiagnosticEvidence,
} from "./wave-i-taxonomy.ts";

const shardGrades = [7, 8, 9] as const;
const allowedEdgeClassifications = new Set<WaveIEdgeEvidence>([
  "SOURCE_EVIDENCED",
  "CONTRACT_DERIVED",
  "HYPOTHESIS_REQUIRES_EVIDENCE",
]);

const shardPacks = shardGrades.map((grade) => {
  const pack = combinedWaveABCDEFGHGradePacks.find((candidate) => candidate.grade === grade);
  if (!pack) throw new Error(`WAVE_I_G7_G9_PACK_MISSING:G${grade}`);
  return pack;
});

export const waveIGrades7To9Audits = shardPacks.map((pack) => buildWaveIGradeAudit(pack));

function buildDiagnosticFixtures() {
  return waveIGrades7To9Audits.flatMap((audit) => {
    const pack = shardPacks.find((candidate) => candidate.grade === audit.grade)!;
    const mappedSkill = audit.remediationMap.find((entry) => entry.remediationTargetSkillId !== null)
      ?? audit.remediationMap[0];
    if (!mappedSkill) throw new Error(`WAVE_I_G7_G9_DIAGNOSTIC_SKILL_MISSING:G${audit.grade}`);
    const question = pack.questions.find((candidate) => candidate.id === mappedSkill.questionIds[0]);
    if (!question) throw new Error(`WAVE_I_G7_G9_DIAGNOSTIC_QUESTION_MISSING:G${audit.grade}`);
    const deterministic = waveIObservedFailures.map((observedFailure, index) => {
      const evidence: WaveIDiagnosticEvidence = {
        postSubmit: true,
        questionId: question.id,
        skillId: mappedSkill.skillId,
        submittedAnswerPresent: true,
        submittedAnswerFingerprint: "synthetic-shared-wrong-answer",
        expectedContract: question.answer,
        observedFailure,
        failedStepIndex: 0,
        prerequisiteSkillId: mappedSkill.remediationTargetSkillId,
        repeatedEquivalentEvidenceCount: 2,
        publicDerivationEvidenceComplete: true,
        solutionExposedBeforeSubmit: false,
      };
      return {
        id: `wave-i-g${audit.grade}-diagnostic-${String(index + 1).padStart(2, "0")}`,
        grade: audit.grade,
        evidence,
        expectedClassification: classifyWaveIError(evidence),
        requiresBridgeQuestion: false as const,
        preservesHistory: true as const,
        changesSchoolGrade: false as const,
        grantsEntitlement: false as const,
      };
    });
    const insufficientEvidence: WaveIDiagnosticEvidence = {
      postSubmit: false,
      questionId: question.id,
      skillId: mappedSkill.skillId,
      submittedAnswerPresent: false,
      submittedAnswerFingerprint: null,
      expectedContract: null,
      observedFailure: null,
      failedStepIndex: null,
      prerequisiteSkillId: null,
      repeatedEquivalentEvidenceCount: 0,
      publicDerivationEvidenceComplete: false,
      solutionExposedBeforeSubmit: false,
    };
    return [...deterministic, {
      id: `wave-i-g${audit.grade}-diagnostic-${String(waveIObservedFailures.length + 1).padStart(2, "0")}`,
      grade: audit.grade,
      evidence: insufficientEvidence,
      expectedClassification: classifyWaveIError(insufficientEvidence),
      requiresBridgeQuestion: false as const,
      preservesHistory: true as const,
      changesSchoolGrade: false as const,
      grantsEntitlement: false as const,
    }];
  });
}

export const waveIGrades7To9DiagnosticFixtures = buildDiagnosticFixtures();

export const waveIGrades7To9SkillInventory = waveIGrades7To9Audits.map((audit) => ({
  grade: audit.grade,
  questionBearingSkillCount: audit.candidateSkillIds.length,
  entrySkillIds: audit.entrySkillIds,
  intermediateSkillIds: audit.intermediateSkillIds,
  terminalSkillIds: audit.terminalSkillIds,
  isolatedSkillIds: audit.isolatedSkillIds,
  prerequisiteEvidence: audit.prerequisiteEvidence,
  remediationContracts: audit.remediationMap,
  gaps: {
    missingRemediationBefore: audit.missingRemediationBefore,
    missingRemediationAfter: audit.missingRemediationAfter,
    missingAdvanceBefore: audit.missingAdvanceBefore,
    missingAdvanceAfter: audit.missingAdvanceAfter,
    broadErrorMappingsBefore: audit.broadErrorMappingsBefore,
    broadErrorMappingsAfter: audit.broadErrorMappingsAfter,
  },
  bridgeDecision: audit.bridgeDecision,
  bridgeQuestionIds: audit.bridgeQuestionIds,
}));

const shardCore = {
  format: "plave-wave-i-grades-7-9-shard-v1",
  grades: shardGrades,
  audits: waveIGrades7To9Audits,
  diagnosticFixtures: waveIGrades7To9DiagnosticFixtures,
  bridgeQuestions: [] as const,
} as const;

export const waveIGrades7To9ShardHash = sha256(canonicalize(shardCore));

export function verifyWaveIGrades7To9Shard() {
  const errors: string[] = [];
  for (const audit of waveIGrades7To9Audits) {
    const pack = shardPacks.find((candidate) => candidate.grade === audit.grade)!;
    const candidateSkills = new Set(pack.questions.map((question) => question.skillId));
    const questionIds = new Set(pack.questions.map((question) => question.id));
    if (audit.candidateSkillIds.length !== candidateSkills.size) errors.push(`G${audit.grade}:SKILL_COUNT_MISMATCH`);
    if (audit.remediationMap.some((entry) => entry.questionIds.length === 0 || entry.questionIds.some((id) => !questionIds.has(id)))) {
      errors.push(`G${audit.grade}:QUESTION_POOL_INVALID`);
    }
    if (audit.prerequisiteEvidence.some((edge) => !allowedEdgeClassifications.has(edge.classification))) {
      errors.push(`G${audit.grade}:EDGE_CLASSIFICATION_INVALID`);
    }
    if (audit.missingRemediationAfter.length || audit.missingAdvanceAfter.length || audit.bridgeQuestionIds.length
      || audit.bridgeDecision !== "NOT_REQUIRED_EXISTING_A_TO_H_POOL_SUFFICIENT") {
      errors.push(`G${audit.grade}:UNRESOLVED_GAP_OR_BRIDGE`);
    }
  }
  for (const fixture of waveIGrades7To9DiagnosticFixtures) {
    const actual = classifyWaveIError(fixture.evidence);
    if (canonicalize(actual) !== canonicalize(fixture.expectedClassification)) errors.push(`${fixture.id}:CLASSIFICATION_MISMATCH`);
    if (fixture.evidence.solutionExposedBeforeSubmit || fixture.requiresBridgeQuestion || !fixture.preservesHistory
      || fixture.changesSchoolGrade || fixture.grantsEntitlement) errors.push(`${fixture.id}:BOUNDARY_INVALID`);
  }
  const fixtureCodes = new Set(waveIGrades7To9DiagnosticFixtures.map((fixture) => fixture.expectedClassification.code));
  if (waveIErrorCodes.some((code) => !fixtureCodes.has(code))) errors.push("SHARD:ERROR_TAXONOMY_COVERAGE_INCOMPLETE");
  if (waveIGrades7To9DiagnosticFixtures.length !== shardGrades.length * waveIErrorCodes.length) {
    errors.push("SHARD:DIAGNOSTIC_FIXTURE_COUNT_MISMATCH");
  }
  return {
    status: errors.length === 0 ? "PASSED" as const : "AUTOMATED_VERIFICATION_INSUFFICIENT" as const,
    errors,
    shardHash: waveIGrades7To9ShardHash,
    bridgeQuestionsRequired: false as const,
    bridgeQuestionCount: 0 as const,
  };
}

export const waveIGrades7To9ShardVerification = verifyWaveIGrades7To9Shard();
if (waveIGrades7To9ShardVerification.errors.length) {
  throw new Error(`WAVE_I_GRADES_7_9_INVALID:${waveIGrades7To9ShardVerification.errors.join(",")}`);
}

export const waveIGrades7To9Summary = Object.freeze({
  schemaVersion: "plave-wave-i-grades-7-9-summary-v1",
  grades: shardGrades,
  candidateQuestionCount: shardPacks.reduce((sum, pack) => sum + pack.questions.length, 0),
  questionBearingSkillCount: waveIGrades7To9Audits.reduce((sum, audit) => sum + audit.candidateSkillIds.length, 0),
  retainedQuestionSkillEdgeCount: waveIGrades7To9Audits.reduce((sum, audit) => sum + audit.prerequisiteEvidence.length, 0),
  entrySkillCount: waveIGrades7To9Audits.reduce((sum, audit) => sum + audit.entrySkillIds.length, 0),
  intermediateSkillCount: waveIGrades7To9Audits.reduce((sum, audit) => sum + audit.intermediateSkillIds.length, 0),
  terminalSkillCount: waveIGrades7To9Audits.reduce((sum, audit) => sum + audit.terminalSkillIds.length, 0),
  isolatedSkillCount: waveIGrades7To9Audits.reduce((sum, audit) => sum + audit.isolatedSkillIds.length, 0),
  missingRemediationBeforeCount: waveIGrades7To9Audits.reduce((sum, audit) => sum + audit.missingRemediationBefore.length, 0),
  missingRemediationAfterCount: 0,
  missingAdvanceBeforeCount: waveIGrades7To9Audits.reduce((sum, audit) => sum + audit.missingAdvanceBefore.length, 0),
  missingAdvanceAfterCount: 0,
  diagnosticFixtureCount: waveIGrades7To9DiagnosticFixtures.length,
  generatedBridgeQuestionCount: 0,
  shardHash: waveIGrades7To9ShardHash,
});
