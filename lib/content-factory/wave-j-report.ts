import { buildWaveIReportRows } from "./wave-i-report.ts";
import { auditWaveJ } from "./wave-j-audit.ts";

export function buildWaveJReportRows() {
  const audit = auditWaveJ(); const prior = buildWaveIReportRows();
  return audit.rows.map((row) => {
    const coverage = prior.find((entry) => entry.grade === row.grade)!;
    return { grade: row.grade, skills: row.skills, beforeQuestions: row.beforeQuestions, addedQuestions: row.addedQuestions,
      afterQuestions: row.afterQuestions, gapSkillsBefore: row.gapSkillsBefore, gapSkillsAfter: row.gapSkillsAfter,
      gapClassificationsBefore: row.gapClassificationsBefore, gapClassificationsAfter: row.gapClassificationsAfter,
      targetedSkillIds: row.targetedSkillIds, sourcePages: row.sourcePages, structuresAdded: row.structureTags.length,
      difficultyEvidence: row.difficultyEvidence.length, simulationStates: row.simulation.visitedStates,
      remainingSourceVerifiedSkills: coverage.remainingSourceVerifiedSkills,
      remainingVerificationInsufficientOutcomes: coverage.remainingVerificationInsufficientOutcomes,
      candidate: row.candidate, combinedCandidate: row.combinedCandidate, release: row.release };
  });
}

export function renderWaveJDepthMarkdown(rows: ReturnType<typeof buildWaveJReportRows>) {
  return `${["# Grades 1–9 Wave J depth audit", "",
    "Thresholds come from the Wave I attempt/action contract. Difficulty evidence is machine-checkable and CONTRACT_DERIVED, not a claim of pedagogical superiority.", "",
    "| Grade | Skills | Before | Added | After | Gap skills before/after | Structures added | Source pages |",
    "|---:|---:|---:|---:|---:|---:|---:|---|",
    ...rows.map((row) => `| ${row.grade} | ${row.skills} | ${row.beforeQuestions} | ${row.addedQuestions} | ${row.afterQuestions} | ${row.gapSkillsBefore}/${row.gapSkillsAfter} | ${row.structuresAdded} | ${row.sourcePages.join(", ") || "metadata only"} |`),
    "", "Grades 1–3 and 8–9 are DEPTH_SUFFICIENT and receive no filler questions. Grade 1 remains an immutable metadata-only audit.", ""].join("\n")}`;
}
