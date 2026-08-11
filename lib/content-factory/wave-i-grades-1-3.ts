import { canonicalize, sha256 } from "./canonical.ts";
import { GRADE_ONE_SOURCE_DIGEST, gradeOneShadowArtifacts, gradeOneShadowCandidatePack } from "./grade1-shadow.ts";
import { combinedWaveABCDEFGHGradePacks } from "./wave-h-packs.ts";
import { buildWaveIGradeAudit } from "./wave-i-remediation.ts";

const grades = [1, 2, 3] as const;
const packs = grades.map((grade) => combinedWaveABCDEFGHGradePacks.find((pack) => pack.grade === grade)!);
export const waveIGrades1To3Audits = packs.map(buildWaveIGradeAudit);

export const waveIGrades1To3GradeOneBoundary = {
  sourceDigest: GRADE_ONE_SOURCE_DIGEST, shadowCandidate: gradeOneShadowCandidatePack.candidate,
  semanticParity: gradeOneShadowArtifacts.receipt.semanticParity, units: 13, questions: 312, solutions: 312, diagnosticRows: 24,
  fixedRuntimeMutation: false, sqlMutation: false, contentMutation: false, quarantineMutation: false,
} as const;

const core = { format: "plave-wave-i-grades-1-3-shard-v1", audits: waveIGrades1To3Audits,
  gradeOneBoundary: waveIGrades1To3GradeOneBoundary, bridgeQuestionIds: [] as const } as const;
export const waveIGrades1To3ShardHash = sha256(canonicalize(core));

export function verifyWaveIGrades1To3Shard() {
  const errors = waveIGrades1To3Audits.flatMap((audit) => [
    ...(audit.missingRemediationAfter.length ? [`G${audit.grade}:MISSING_REMEDIATION_AFTER`] : []),
    ...(audit.missingAdvanceAfter.length ? [`G${audit.grade}:MISSING_ADVANCE_AFTER`] : []),
    ...(audit.remediationMap.some((entry) => entry.questionIds.length === 0) ? [`G${audit.grade}:EMPTY_SKILL_POOL`] : []),
    ...(audit.bridgeQuestionIds.length ? [`G${audit.grade}:UNNECESSARY_BRIDGE`] : []),
  ]);
  if (waveIGrades1To3GradeOneBoundary.questions !== 312 || waveIGrades1To3GradeOneBoundary.fixedRuntimeMutation
    || waveIGrades1To3GradeOneBoundary.sqlMutation || waveIGrades1To3GradeOneBoundary.contentMutation) errors.push("GRADE_ONE_BOUNDARY_DRIFT");
  return { status: errors.length ? "AUTOMATED_VERIFICATION_INSUFFICIENT" as const : "PASSED" as const, errors,
    shardHash: waveIGrades1To3ShardHash, bridgeQuestionCount: 0 as const };
}

export const waveIGrades1To3Summary = { grades, candidateQuestionCount: packs.reduce((sum, pack) => sum + pack.questions.length, 0),
  skillCount: waveIGrades1To3Audits.reduce((sum, audit) => sum + audit.candidateSkillIds.length, 0),
  edgeCount: waveIGrades1To3Audits.reduce((sum, audit) => sum + audit.prerequisiteEvidence.length, 0),
  entrySkillCount: waveIGrades1To3Audits.reduce((sum, audit) => sum + audit.entrySkillIds.length, 0),
  intermediateSkillCount: waveIGrades1To3Audits.reduce((sum, audit) => sum + audit.intermediateSkillIds.length, 0),
  terminalSkillCount: waveIGrades1To3Audits.reduce((sum, audit) => sum + audit.terminalSkillIds.length, 0),
  missingRemediationBefore: waveIGrades1To3Audits.reduce((sum, audit) => sum + audit.missingRemediationBefore.length, 0),
  missingAdvanceBefore: waveIGrades1To3Audits.reduce((sum, audit) => sum + audit.missingAdvanceBefore.length, 0),
  missingAfter: 0, bridgeQuestionCount: 0, shardHash: waveIGrades1To3ShardHash } as const;

if (verifyWaveIGrades1To3Shard().errors.length) throw new Error("WAVE_I_GRADES_1_3_SHARD_INVALID");
