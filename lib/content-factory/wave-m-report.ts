import type { auditWaveM } from "./wave-m-audit.ts";

export function renderWaveMMarkdown(audit: ReturnType<typeof auditWaveM>) {
  const gradeRows = audit.supportInventory.grades.map((grade) =>
    `| ${grade.grade} | ${grade.counts.adaptiveReady} | ${grade.counts.fixedSafe} | ${grade.counts.shadowOnly} | ${grade.counts.unavailable} | ${grade.gradeSupport} |`).join("\n");
  const poolRows = audit.poolResolution.rows.map((row) =>
    `| ${row.grade} | \`${row.skillId}\` | ${row.questionCount} | ${row.reasoningStructureCount} | ${row.resolution} | ${row.sanitizedReasonCode} |`).join("\n");
  const dodRows = audit.definitionOfDone.grades.flatMap((grade) => grade.rows.map((row) =>
    `| ${grade.grade} | ${row.criterion} | ${row.result} | ${row.reason} |`)).join("\n");
  return `# Wave M — Complete learning journey, progress and history\n\nStatus: **${audit.status}**.\n\n`
    + `Combined A–K: \`${audit.frozen.combinedAKActual}\`. Wave L compatibility: \`${audit.frozen.waveLActual}\`.\n\n`
    + `Wave M compatibility: \`${audit.compatibility.compatibilityHash}\`. Corrective overlay: \`${audit.correctiveOverlay.overlayHash}\` (${audit.correctiveOverlay.questions.length} questions).\n\n`
    + `## Adaptive/fixed-safe inventory\n\n| Grade | Adaptive | Fixed-safe | Shadow | Unavailable | Journey support |\n|---:|---:|---:|---:|---:|---|\n${gradeRows}\n\n`
    + `## Thirteen pool-limited resolutions\n\n| Grade | Skill | Questions | Structures | Resolution | Reason |\n|---:|---|---:|---:|---|---|\n${poolRows}\n\n`
    + `No corrective questions were required: every source-bound single-structure pool has a fixed-safe sequence and a same-grade future action. No adaptive mastery claim is made for these pools.\n\n`
    + `## Product definition of done\n\n| Grade | Criterion | Result | Reason |\n|---:|---|---|---|\n${dodRows}\n\n`
    + `Visited states/transitions: ${audit.totals.states}/${audit.totals.transitions}; invariant violations: ${audit.totals.invariantViolations}.\n\n`
    + `History integrity failures: ${audit.historyIntegrity.integrityFailures}; stakeholder authorization failures: ${audit.stakeholderAuthorization.authorizationFailures}.\n\n`
    + `Credential reads: ${audit.totals.credentialReads}; real environment files opened: ${audit.totals.realEnvironmentFilesOpened}; network attempts: ${audit.totals.networkAttempts}. `
    + `Wave F and Wave K incident records remain preserved.\n`;
}
