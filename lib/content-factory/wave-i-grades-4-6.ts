import { canonicalize, sha256 } from "./canonical.ts";
import { combinedWaveABCDEFGHGradePacks } from "./wave-h-packs.ts";
import { buildWaveIGradeAudit } from "./wave-i-remediation.ts";

const grades = [4, 5, 6] as const;
const packs = grades.map((grade) => combinedWaveABCDEFGHGradePacks.find((pack) => pack.grade === grade)!);
export const waveIGrades4To6Audits = packs.map(buildWaveIGradeAudit);
const core = { format: "plave-wave-i-grades-4-6-shard-v1", audits: waveIGrades4To6Audits, bridgeQuestionIds: [] as const } as const;
export const waveIGrades4To6ShardHash = sha256(canonicalize(core));

export function verifyWaveIGrades4To6Shard() {
  const errors = waveIGrades4To6Audits.flatMap((audit) => [
    ...(audit.missingRemediationAfter.length ? [`G${audit.grade}:MISSING_REMEDIATION_AFTER`] : []),
    ...(audit.missingAdvanceAfter.length ? [`G${audit.grade}:MISSING_ADVANCE_AFTER`] : []),
    ...(audit.remediationMap.some((entry) => entry.questionIds.length === 0) ? [`G${audit.grade}:EMPTY_SKILL_POOL`] : []),
    ...(audit.bridgeQuestionIds.length ? [`G${audit.grade}:UNNECESSARY_BRIDGE`] : []),
  ]);
  return { status: errors.length ? "AUTOMATED_VERIFICATION_INSUFFICIENT" as const : "PASSED" as const, errors,
    shardHash: waveIGrades4To6ShardHash, bridgeQuestionCount: 0 as const };
}

export const waveIGrades4To6Summary = { grades, candidateQuestionCount: packs.reduce((sum, pack) => sum + pack.questions.length, 0),
  skillCount: waveIGrades4To6Audits.reduce((sum, audit) => sum + audit.candidateSkillIds.length, 0),
  edgeCount: waveIGrades4To6Audits.reduce((sum, audit) => sum + audit.prerequisiteEvidence.length, 0),
  entrySkillCount: waveIGrades4To6Audits.reduce((sum, audit) => sum + audit.entrySkillIds.length, 0),
  intermediateSkillCount: waveIGrades4To6Audits.reduce((sum, audit) => sum + audit.intermediateSkillIds.length, 0),
  terminalSkillCount: waveIGrades4To6Audits.reduce((sum, audit) => sum + audit.terminalSkillIds.length, 0),
  missingRemediationBefore: waveIGrades4To6Audits.reduce((sum, audit) => sum + audit.missingRemediationBefore.length, 0),
  missingAdvanceBefore: waveIGrades4To6Audits.reduce((sum, audit) => sum + audit.missingAdvanceBefore.length, 0),
  missingAfter: 0, bridgeQuestionCount: 0, shardHash: waveIGrades4To6ShardHash } as const;

if (verifyWaveIGrades4To6Shard().errors.length) throw new Error("WAVE_I_GRADES_4_6_SHARD_INVALID");
