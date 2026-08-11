import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalize, sha256 } from "../lib/content-factory/canonical.ts";
import { auditWaveI } from "../lib/content-factory/wave-i-audit.ts";
import { combinedWaveABCDEFGHIGradePacks, waveIGradeAudits, waveIPolicyCandidates } from "../lib/content-factory/wave-i-packs.ts";
import { buildWaveIReportRows, renderWaveIRemediationMarkdown } from "../lib/content-factory/wave-i-report.ts";
import { waveIErrorActionCoverage, type WaveIPrerequisiteEvidenceRow } from "../lib/content-factory/wave-i-remediation.ts";
import { waveIErrorCodes } from "../lib/content-factory/wave-i-taxonomy.ts";

const output = resolve(process.cwd(), "content/grade-packs/generated"); mkdirSync(output, { recursive: true });
const audit = auditWaveI();
if (audit.totals.grades !== 9 || audit.totals.questions !== 1848 || audit.totals.skills !== 189 || audit.totals.bridgeQuestions !== 0
  || audit.totals.missingRemediationAfter !== 0 || audit.totals.missingAdvanceAfter !== 0 || audit.totals.errors !== 0) {
  for (const error of audit.errors) console.error(error); throw new Error("WAVE_I_AUDIT_FAILED");
}
const reportRows = buildWaveIReportRows();
const candidateArtifact = { schemaVersion: "plave-grades-1-9-wave-i-policy-candidates-v1", policyCandidates: waveIPolicyCandidates,
  combinedCandidates: combinedWaveABCDEFGHIGradePacks.map((pack) => ({ grade: pack.grade, candidate: pack.candidate, release: pack.release,
    questionCount: pack.questions.length, questionManifestHash: sha256(canonicalize(pack.questions.map((question) => question.id))) })) } as const;
const prerequisiteRows = waveIGradeAudits.flatMap((entry) => entry.prerequisiteEvidence.map((edge): WaveIPrerequisiteEvidenceRow & { grade: number } => ({ grade: entry.grade, ...edge })));
const prerequisiteArtifact = { schemaVersion: "plave-grades-1-9-wave-i-prerequisite-evidence-v1", rows: prerequisiteRows,
  counts: { sourceEvidenced: audit.totals.sourceEvidencedEdges, contractDerived: audit.totals.contractDerivedEdges,
    hypothesisRequiresEvidence: audit.totals.hypothesisEdges } } as const;
const remediationArtifact = { schemaVersion: "plave-grades-1-9-wave-i-remediation-map-v1",
  grades: waveIGradeAudits.map((entry) => ({ grade: entry.grade, entrySkillIds: entry.entrySkillIds,
    intermediateSkillIds: entry.intermediateSkillIds, terminalSkillIds: entry.terminalSkillIds,
    missingRemediationBefore: entry.missingRemediationBefore, missingRemediationAfter: entry.missingRemediationAfter,
    missingAdvanceBefore: entry.missingAdvanceBefore, missingAdvanceAfter: entry.missingAdvanceAfter,
    remediationMap: entry.remediationMap, bridgeDecision: entry.bridgeDecision, auditHash: entry.auditHash })) } as const;
const taxonomyArtifact = { schemaVersion: "plave-wave-i-error-taxonomy-v1", codes: waveIErrorCodes, actionCoverage: waveIErrorActionCoverage,
  derivationBoundary: "POST_SUBMIT_SERVER_EVIDENCE_ONLY", psychologicalDiagnosisClaim: false, failClosedCode: "INSUFFICIENT_EVIDENCE_UNKNOWN" } as const;
const graphArtifact = { schemaVersion: "plave-grades-1-9-wave-i-graph-v1", graph: audit.graph, rows: reportRows.map((row) => ({ grade: row.grade,
  skills: row.skills, entries: row.entries, intermediates: row.intermediates, terminals: row.terminals, isolated: row.isolated,
  edgeClassifications: row.edgeClassifications })) } as const;
const files = new Map<string, string>([
  ["wave-i-policy-candidates.json", `${canonicalize(candidateArtifact)}\n`],
  ["wave-i-prerequisite-evidence.json", `${canonicalize(prerequisiteArtifact)}\n`],
  ["wave-i-prerequisite-evidence.md", ["# Grades 1–9 Wave I prerequisite evidence", "",
    `- SOURCE_EVIDENCED: ${audit.totals.sourceEvidencedEdges}`, `- CONTRACT_DERIVED: ${audit.totals.contractDerivedEdges}`,
    `- HYPOTHESIS_REQUIRES_EVIDENCE: ${audit.totals.hypothesisEdges}`,
    "- No hypothesis is promoted to curriculum fact.", ""].join("\n")],
  ["wave-i-remediation-map.json", `${canonicalize(remediationArtifact)}\n`],
  ["wave-i-remediation-map.md", renderWaveIRemediationMarkdown(reportRows)],
  ["wave-i-error-taxonomy.json", `${canonicalize(taxonomyArtifact)}\n`],
  ["wave-i-error-taxonomy.md", ["# Wave I deterministic error taxonomy", "", ...waveIErrorCodes.map((code) => `- \`${code}\`: ${waveIErrorActionCoverage[code]}.`),
    "", "Classifications use post-submit answer/derivation evidence and do not claim psychological diagnosis.", ""].join("\n")],
  ["wave-i-coverage.json", `${canonicalize({ schemaVersion: "plave-grades-1-9-wave-i-coverage-v1", rows: reportRows })}\n`],
  ["wave-i-graph.json", `${canonicalize(graphArtifact)}\n`],
  ["wave-i-simulations.json", `${canonicalize({ schemaVersion: "plave-grades-1-9-wave-i-simulations-v1", simulations: audit.rows.map((row) => row.simulation) })}\n`],
  ["wave-i-independent-audit.json", `${canonicalize(audit)}\n`],
  ["wave-i-independent-audit.md", ["# Grades 1–9 Wave I independent audit", "", `- Candidate skills: ${audit.totals.skills}`,
    `- Candidate-skill edges: ${audit.totals.edges}`, `- Remediation gaps before/after: ${audit.totals.missingRemediationBefore}/${audit.totals.missingRemediationAfter}`,
    `- Advance gaps before/after: ${audit.totals.missingAdvanceBefore}/${audit.totals.missingAdvanceAfter}`,
    `- Bridge questions: ${audit.totals.bridgeQuestions}`, `- State/transition coverage: ${audit.totals.simulationStates}/${audit.totals.simulationTransitions}`,
    `- Policy bundle: ${audit.policyBundleHash}`, `- Combined A–I bundle: ${audit.combinedBundle.bundleHash}`,
    `- Errors: ${audit.totals.errors}`, "- Software behavior only; no psychological or expert pedagogical validation claim.", ""].join("\n")],
  ["wave-i-invocation-boundary.json", `${canonicalize(audit.invocationBoundary)}\n`],
  ["bundle-wave-i-policy-grades-1-2-3-4-5-6-7-8-9.json", `${canonicalize({ format: "plave-wave-i-policy-bundle-v1", candidates: waveIPolicyCandidates, bundleHash: audit.policyBundleHash })}\n`],
  ["bundle-combined-wave-a-b-c-d-e-f-g-h-i-grades-1-2-3-4-5-6-7-8-9.json", `${canonicalize(audit.combinedBundle)}\n`],
]);
for (const [name, content] of files) writeFileSync(resolve(output, name), content, { mode: 0o644 });
console.log(`WAVE_I_BUILD_OK grades=9 skills=${audit.totals.skills} bridges=0 policy=${audit.policyBundleHash} combined=${audit.combinedBundle.bundleHash}`);
