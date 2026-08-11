import type { FactoryGrade } from "./types.ts";
import { auditWaveK } from "./wave-k-audit.ts";

export const waveKShardGrades = Object.freeze({ "1-3": [1, 2, 3], "4-6": [4, 5, 6], "7-9": [7, 8, 9] } as const);

export function verifyWaveKShard(grades: readonly FactoryGrade[]) {
  const audit = auditWaveK(); const rows = audit.rows.filter((row) => grades.includes(row.grade));
  const inventory = audit.inventory.rows.filter((row) => grades.includes(row.grade));
  const errors = [...rows.flatMap((row) => row.errors),
    ...rows.filter((row) => row.remainingProducible !== 0).map((row) => `G${row.grade}:PRODUCIBLE_GAP_REMAINS`),
    ...(rows.length === grades.length ? [] : ["WAVE_K_SHARD_GRADE_MISSING"])];
  const domainBatches = [...new Set(inventory.map((row) => `${row.grade}:${row.domain}`))].sort().map((key) => {
    const [gradeText, ...domainParts] = key.split(":"); const domain = domainParts.join(":"); const grade = Number(gradeText);
    const domainRows = inventory.filter((row) => row.grade === grade && row.domain === domain);
    return { grade, domain, outcomes: domainRows.length,
      producible: domainRows.filter((row) => row.classification === "PRODUCIBLE_DETERMINISTIC").length,
      excluded: domainRows.filter((row) => row.classification !== "PRODUCIBLE_DETERMINISTIC" && row.classification !== "ALREADY_COVERED_SEMANTICALLY").length };
  });
  return { grades, status: errors.length ? "AUTOMATED_VERIFICATION_INSUFFICIENT" as const : "PASSED" as const,
    inventoryRows: inventory.length, producedSkills: rows.reduce((sum, row) => sum + row.newlyProducedSkills, 0),
    questions: rows.reduce((sum, row) => sum + row.generatedQuestions, 0), domainBatches, errors };
}

