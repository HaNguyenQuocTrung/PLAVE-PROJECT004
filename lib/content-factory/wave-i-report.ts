import { buildWaveHCoverageRows } from "./wave-h-report.ts";
import { auditWaveI } from "./wave-i-audit.ts";

export function buildWaveIReportRows() {
  const audit = auditWaveI(); const priorCoverage = buildWaveHCoverageRows();
  return audit.rows.map((row) => {
    const prior = priorCoverage.find((entry) => entry.grade === row.grade)!;
    return { grade: row.grade, questions: row.questionCount, skills: row.skillCount, entries: row.entrySkillCount,
      intermediates: row.intermediateSkillCount, terminals: row.terminalSkillCount, isolated: row.isolatedSkillCount,
      edges: row.edgeCount, edgeClassifications: row.edgeClassifications,
      missingRemediationBefore: row.missingRemediationBefore, missingRemediationAfter: row.missingRemediationAfter,
      missingAdvanceBefore: row.missingAdvanceBefore, missingAdvanceAfter: row.missingAdvanceAfter,
      broadErrorMappingsBefore: row.broadErrorMappingsBefore, broadErrorMappingsAfter: row.broadErrorMappingsAfter,
      bridgeQuestions: row.bridgeQuestionCount, policyCandidate: row.policyCandidate, combinedCandidate: row.combinedCandidate,
      remainingSourceVerifiedSkills: prior.remainingSourceVerifiedSkills,
      remainingVerificationInsufficientOutcomes: prior.remainingVerificationInsufficientOutcomes,
      simulationStates: row.simulation.visitedStates, simulationTransitions: row.simulation.visitedTransitions,
      release: row.release, curriculumCompletionClaim: false as const };
  });
}

export function renderWaveIRemediationMarkdown(rows: ReturnType<typeof buildWaveIReportRows>) {
  return `${["# Grades 1–9 Wave I remediation map", "",
    "Wave I maps only question-bearing A–H candidate skills. Contract-derived retry/retention routes are software behavior, not curriculum or psychological claims.", "",
    "| Grade | Questions | Skills | Entry | Intermediate | Terminal | Edges | Source | Contract | Hypothesis | Remediation before/after | Advance before/after | Bridges |",
    "|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---:|",
    ...rows.map((row) => `| ${row.grade} | ${row.questions} | ${row.skills} | ${row.entries} | ${row.intermediates} | ${row.terminals} | ${row.edges} | ${row.edgeClassifications.SOURCE_EVIDENCED} | ${row.edgeClassifications.CONTRACT_DERIVED} | ${row.edgeClassifications.HYPOTHESIS_REQUIRES_EVIDENCE} | ${row.missingRemediationBefore}/${row.missingRemediationAfter} | ${row.missingAdvanceBefore}/${row.missingAdvanceAfter} | ${row.bridgeQuestions} |`),
    "", "Terminal skills retain valid retention/mixed-practice actions. Entry skills without an evidenced predecessor use current-skill retry and never invent a curriculum prerequisite.", ""].join("\n")}`;
}
