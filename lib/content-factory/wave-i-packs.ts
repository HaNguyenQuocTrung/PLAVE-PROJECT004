import { waveIGrades1To3Audits } from "./wave-i-grades-1-3.ts";
import { waveIGrades4To6Audits } from "./wave-i-grades-4-6.ts";
import { waveIGrades7To9Audits } from "./wave-i-grades-7-9.ts";
import { combinedWaveABCDEFGHGradePacks } from "./wave-h-packs.ts";
import { buildWaveIPolicyCandidate, combineWaveABCDEFGHIPack } from "./wave-i.ts";

export const waveIGradeAudits = [...waveIGrades1To3Audits, ...waveIGrades4To6Audits, ...waveIGrades7To9Audits]
  .sort((left, right) => left.grade - right.grade);
if (waveIGradeAudits.map((entry) => entry.grade).join(",") !== "1,2,3,4,5,6,7,8,9") throw new Error("WAVE_I_AUDIT_GRADE_SET_INVALID");

export const waveIPolicyCandidates = combinedWaveABCDEFGHGradePacks.map((pack) => buildWaveIPolicyCandidate(pack,
  waveIGradeAudits.find((audit) => audit.grade === pack.grade)!));

export const combinedWaveABCDEFGHIGradePacks = combinedWaveABCDEFGHGradePacks.map((pack) => combineWaveABCDEFGHIPack(pack,
  waveIPolicyCandidates.find((candidate) => candidate.grade === pack.grade)!));

if (waveIPolicyCandidates.some((candidate) => candidate.bridgeQuestionCount !== 0 || candidate.bridgeQuestionIds.length !== 0)) {
  throw new Error("WAVE_I_UNEVIDENCED_BRIDGE_CONTENT");
}
