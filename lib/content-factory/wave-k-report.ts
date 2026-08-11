import { auditWaveK } from "./wave-k-audit.ts";

export function renderWaveKCoverageMarkdown(audit = auditWaveK()) {
  const lines = ["# Wave K final deterministic curriculum coverage", "",
    "| Grade | Source skills | A–J covered | Remaining before K | Produced skills | Questions | Semantic | Insufficient | Open | Visual | Unknown | Remaining producible |",
    "|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ...audit.rows.map((row) => `| ${row.grade} | ${row.sourceSkillsInitial} | ${row.aJCoveredSkills} | ${row.remainingSkillsBeforeK} | ${row.newlyProducedSkills} | ${row.generatedQuestions} | ${row.semanticallyAlreadyCovered} | ${row.verificationInsufficient} | ${row.openEndedExperiential} | ${row.visualRequired} | ${row.unknown} | ${row.remainingProducible} |`),
    "", `Canonical remaining rows audited: ${audit.totals.auditedRemaining}.`,
    `Reported Grades 2–9 deterministic/structured inventory: ${audit.totals.reportedRemaining}.`,
    `Produced: ${audit.totals.producibleSkills} skills / ${audit.totals.questions} questions.`,
    `Remaining producible deterministic skills: ${audit.totals.remainingProducible}.`,
    `Errors: ${audit.errors.length}.`, "",
    "These reports prove deterministic software behavior and source reconciliation only; they do not claim expert pedagogical validation.", ""];
  return lines.join("\n");
}

