import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { auditAppliedEquivalentQuestions } from "../lib/content-factory/applied-reasoning.ts";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize, sha256 } from "../lib/content-factory/canonical.ts";
import { waveGGradePacks } from "../lib/content-factory/wave-g-packs.ts";
import { auditWaveH } from "../lib/content-factory/wave-h-audit.ts";
import { combinedWaveABCDEFGHGradePacks, waveHGradePacks } from "../lib/content-factory/wave-h-packs.ts";
import { buildWaveHCoverageRows, renderWaveHCoverageMarkdown } from "../lib/content-factory/wave-h-report.ts";

const output = resolve(process.cwd(), "content/grade-packs/generated"); mkdirSync(output, { recursive: true });
const audit = auditWaveH();
if (audit.totals.candidates !== 9 || audit.totals.questions !== 198 || audit.totals.independentlyVerified !== 198 || audit.totals.errors !== 0) {
  for (const error of audit.errors) console.error(error); throw new Error("WAVE_H_AUDIT_FAILED");
}
const coverageRows = buildWaveHCoverageRows();
const candidates = { schemaVersion: "plave-grades-1-9-wave-h-candidates-v1",
  candidates: waveHGradePacks.map((pack) => ({ grade: pack.grade, candidate: pack.candidate, release: pack.release, production: pack.production,
    questionChecksums: pack.questions.map((question) => ({ id: question.id, sha256: sha256(canonicalize(question)) })),
    explanationChecksums: pack.explanations.map((entry) => ({ id: entry.id, sha256: sha256(canonicalize(entry)) })),
    quarantinedChecksums: (pack.quarantinedQuestions ?? []).map((question) => ({ id: question.id, sha256: sha256(canonicalize(question)) })), evidenceReceiptChecksum: sha256(canonicalize(pack.evidenceReceipts)) })),
  combined: combinedWaveABCDEFGHGradePacks.map((pack) => ({ grade: pack.grade, candidate: pack.candidate, release: pack.release,
    priorWaveQuestionCount: pack.questions.length - waveHGradePacks.find((entry) => entry.grade === pack.grade)!.questions.length,
    waveHEligibleQuestionCount: waveHGradePacks.find((entry) => entry.grade === pack.grade)!.questions.length, totalQuestionCount: pack.questions.length,
    manifestChecksum: sha256(canonicalize({ packId: pack.packId, packVersion: pack.packVersion, candidate: pack.candidate, questionIds: pack.questions.map((question) => question.id) })) })) } as const;
const waveHBundle = buildDeterministicBundle(waveHGradePacks); const combinedBundle = buildDeterministicBundle(combinedWaveABCDEFGHGradePacks);
if (canonicalize(waveHBundle) !== canonicalize(buildDeterministicBundle([...waveHGradePacks].reverse()))) throw new Error("WAVE_H_BUNDLE_NOT_DETERMINISTIC");
if (canonicalize(combinedBundle) !== canonicalize(buildDeterministicBundle([...combinedWaveABCDEFGHGradePacks].reverse()))) throw new Error("COMBINED_WAVE_H_BUNDLE_NOT_DETERMINISTIC");
const evidence = { schemaVersion: "plave-grades-1-9-wave-h-evidence-v1", sourceRows: audit.rows.map((row) => ({ grade: row.grade,
  sourceOutcomeIds: row.sourceOutcomeIds, authoritativePages: row.authoritativePages, candidateEligible: row.production?.candidateEligible ?? 0,
  verificationInsufficient: row.production?.verificationInsufficient ?? 0, quarantinedQuestionIds: row.quarantinedQuestionIds,
  oracleErrors: row.oracleErrors, sourceErrors: row.sourceErrors, validationErrors: row.validationErrors })) } as const;
const reasoning = { schemaVersion: "plave-grades-1-9-wave-h-reasoning-v1", rows: coverageRows.map((row) => ({ grade: row.grade,
  reasoningRequirement: row.reasoningRequirement, structures: row.structures, prerequisiteGapClosed: row.prerequisiteGapClosed })),
  appliedEquivalentDuplicates: auditAppliedEquivalentQuestions(waveHGradePacks), failureSimulations: audit.simulations.map((entry) => ({ grade: entry.grade, appliedFailures: entry.appliedFailures, intermediateRemediationTargetSkillIds: entry.intermediateRemediationTargetSkillIds })) } as const;
const files = new Map<string, string>([
  ["wave-h-candidates.json", `${canonicalize(candidates)}\n`], ["wave-h-coverage.json", `${canonicalize({ schemaVersion: "plave-grades-1-9-wave-h-coverage-v1", rows: coverageRows })}\n`],
  ["wave-h-coverage.md", renderWaveHCoverageMarkdown(coverageRows)], ["wave-h-evidence.json", `${canonicalize(evidence)}\n`],
  ["wave-h-evidence.md", ["# Grades 1–9 Wave H evidence report", "", ...audit.rows.map((row) => `- Grade ${row.grade}: eligible ${row.production?.candidateEligible ?? 0}, insufficient ${row.production?.verificationInsufficient ?? 0}, source ${row.sourceOutcomeIds.join(", ") || "immutable legacy SQL"}, pages ${row.authoritativePages.join(", ") || "N/A"}.`), ""].join("\n")],
  ["wave-h-independent-audit.json", `${canonicalize(audit)}\n`],
  ["wave-h-independent-audit.md", ["# Grades 1–9 Wave H independent audit", "", `- Independently verified: ${audit.totals.independentlyVerified}/${audit.totals.questions}`,
    `- Generated/repaired/rejected/quarantined/insufficient/duplicate: ${audit.totals.generated}/${audit.totals.repaired}/${audit.totals.rejected}/${audit.totals.quarantined}/${audit.totals.verificationInsufficient}/${audit.totals.duplicate}`,
    `- Cross-wave/applied-equivalent duplicates: ${audit.crossWaveDuplicates.length}/${audit.appliedEquivalentDuplicates.length}`,
    `- Graph cycles/missing/forward/orphan: ${audit.progression.cycles}/${audit.progression.missingReferences}/${audit.progression.forwardGradeDependencies}/${audit.progression.waveHOrphans}`,
    `- Offline boundary: ${audit.invocationBoundary.status}; Wave G/H network attempts: ${audit.invocationBoundary.waveGNetworkAttemptCount}/${audit.invocationBoundary.waveHNetworkAttemptCount}`,
    `- Errors: ${audit.totals.errors}`, `- Wave H bundle: ${audit.waveHBundle.bundleHash}`, `- Combined A–H bundle: ${audit.combinedBundle.bundleHash}`,
    "- Simulations establish bounded software behavior only; no pedagogical superiority is claimed.", ""].join("\n")],
  ["wave-h-reasoning-structures.json", `${canonicalize(reasoning)}\n`],
  ["wave-h-reasoning-structures.md", ["# Grades 1–9 Wave H reasoning structures", "", ...coverageRows.map((row) => `- Grade ${row.grade}: ${row.structures} public reasoning structures; ${row.reasoningRequirement}`), ""].join("\n")],
  ["wave-h-simulations.json", `${canonicalize({ schemaVersion: "plave-grades-1-9-wave-h-simulations-v1", simulations: audit.simulations })}\n`],
  ["wave-h-invocation-boundary.json", `${canonicalize(audit.invocationBoundary)}\n`],
  ["bundle-wave-h-grades-1-2-3-4-5-6-7-8-9.json", `${canonicalize(waveHBundle)}\n`],
  ["bundle-combined-wave-a-b-c-d-e-f-g-h-grades-1-2-3-4-5-6-7-8-9.json", `${canonicalize(combinedBundle)}\n`],
]);
for (const [name, content] of files) writeFileSync(resolve(output, name), content, { mode: 0o644 });
if (buildDeterministicBundle(waveGGradePacks).bundleHash !== audit.frozen.waveGBundleHash) throw new Error("WAVE_G_POST_BUILD_DRIFT");
console.log(`WAVE_H_BUILD_OK grades=9 eligible=${audit.totals.candidateEligible} insufficient=${audit.totals.verificationInsufficient} wave_h=${waveHBundle.bundleHash} combined=${combinedBundle.bundleHash}`);
