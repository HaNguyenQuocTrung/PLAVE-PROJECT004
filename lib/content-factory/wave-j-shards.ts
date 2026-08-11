import type { FactoryGrade } from "./types.ts";
import { auditWaveJ } from "./wave-j-audit.ts";

export const waveJShardGrades = Object.freeze({ "1-3": [1, 2, 3], "4-6": [4, 5, 6], "7-9": [7, 8, 9] } as const);

export function verifyWaveJShard(grades: readonly FactoryGrade[]) {
  const audit = auditWaveJ(); const rows = audit.rows.filter((row) => grades.includes(row.grade));
  const errors = [...rows.flatMap((row) => [...row.independentErrors, ...row.validationErrors,
    ...(row.gapSkillsAfter ? [`G${row.grade}:DEPTH_GAP_REMAINS`] : []),
    ...Object.entries(row.simulation.checks).filter(([, passed]) => !passed).map(([check]) => `G${row.grade}:${check}`)]),
    ...(rows.length === grades.length ? [] : ["WAVE_J_SHARD_GRADE_MISSING"])];
  return { grades, status: errors.length ? "AUTOMATED_VERIFICATION_INSUFFICIENT" as const : "PASSED" as const,
    skills: rows.reduce((sum, row) => sum + row.skills, 0), addedQuestions: rows.reduce((sum, row) => sum + row.addedQuestions, 0),
    gapSkillsBefore: rows.reduce((sum, row) => sum + row.gapSkillsBefore, 0), gapSkillsAfter: rows.reduce((sum, row) => sum + row.gapSkillsAfter, 0), errors };
}
