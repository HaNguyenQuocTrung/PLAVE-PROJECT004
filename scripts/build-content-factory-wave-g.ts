import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize, sha256 } from "../lib/content-factory/canonical.ts";
import { auditWaveG } from "../lib/content-factory/wave-g-audit.ts";
import { waveFGradePacks } from "../lib/content-factory/wave-f-packs.ts";
import { combinedWaveABCDEFGGradePacks, waveGGradePacks } from "../lib/content-factory/wave-g-packs.ts";
import { buildWaveGCoverageRows, renderWaveGCoverageMarkdown } from "../lib/content-factory/wave-g-report.ts";

const output = resolve(process.cwd(), "content/grade-packs/generated");
mkdirSync(output, { recursive: true });
const audit = auditWaveG();
if (audit.totals.candidates !== 9 || audit.totals.questions !== 192 || audit.totals.independentlyVerified !== 192 || audit.totals.errors !== 0) {
  for (const error of audit.errors) console.error(error);
  throw new Error("WAVE_G_AUDIT_FAILED");
}
const coverageRows = buildWaveGCoverageRows();
const candidateRows = waveGGradePacks.map((pack) => ({ grade: pack.grade, candidate: pack.candidate, release: pack.release, production: pack.production,
  questionChecksums: pack.questions.map((question) => ({ id: question.id, sha256: sha256(canonicalize(question)) })),
  explanationChecksums: pack.explanations.map((explanation) => ({ id: explanation.id, sha256: sha256(canonicalize(explanation)) })),
  quarantinedChecksums: (pack.quarantinedQuestions ?? []).map((question) => ({ id: question.id, sha256: sha256(canonicalize(question)) })),
  evidenceReceiptChecksum: sha256(canonicalize(pack.evidenceReceipts)) }));
const combinedRows = combinedWaveABCDEFGGradePacks.map((pack) => ({ grade: pack.grade, candidate: pack.candidate, release: pack.release,
  waveAQuestionCount: pack.grade === 1 ? 312 : 24, waveBEligibleQuestionCount: 24, waveCEligibleQuestionCount: 24, waveDEligibleQuestionCount: 24,
  waveEEligibleQuestionCount: 24, waveFEligibleQuestionCount: waveFGradePacks.find((entry) => entry.grade === pack.grade)!.questions.length,
  waveGEligibleQuestionCount: waveGGradePacks.find((entry) => entry.grade === pack.grade)!.questions.length, totalQuestionCount: pack.questions.length,
  manifestChecksum: sha256(canonicalize({ packId: pack.packId, packVersion: pack.packVersion, candidate: pack.candidate, questionIds: pack.questions.map((question) => question.id) })) }));
const candidates = { schemaVersion: "plave-grades-1-9-wave-g-candidates-v1", candidates: candidateRows, combined: combinedRows } as const;
const waveGBundle = buildDeterministicBundle(waveGGradePacks);
const combinedBundle = buildDeterministicBundle(combinedWaveABCDEFGGradePacks);
if (canonicalize(waveGBundle) !== canonicalize(buildDeterministicBundle([...waveGGradePacks].reverse()))) throw new Error("WAVE_G_BUNDLE_NOT_DETERMINISTIC");
if (canonicalize(combinedBundle) !== canonicalize(buildDeterministicBundle([...combinedWaveABCDEFGGradePacks].reverse()))) throw new Error("COMBINED_WAVE_G_BUNDLE_NOT_DETERMINISTIC");
const evidence = { schemaVersion: "plave-grades-1-9-wave-g-evidence-v1", sourceRows: audit.rows.map((row) => ({ grade: row.grade,
  sourceOutcomeIds: row.sourceOutcomeIds, authoritativePages: row.authoritativePages, candidateEligible: row.production?.candidateEligible ?? 0,
  verificationInsufficient: row.production?.verificationInsufficient ?? 0, quarantinedQuestionIds: row.quarantinedQuestionIds,
  oracleErrors: row.oracleErrors, sourceErrors: row.sourceErrors, validationErrors: row.validationErrors })) } as const;
const files = new Map<string, string>([
  ["wave-g-candidates.json", `${canonicalize(candidates)}\n`],
  ["wave-g-coverage.json", `${canonicalize({ schemaVersion: "plave-grades-1-9-wave-g-coverage-v1", rows: coverageRows })}\n`],
  ["wave-g-coverage.md", renderWaveGCoverageMarkdown(coverageRows)],
  ["wave-g-evidence.json", `${canonicalize(evidence)}\n`],
  ["wave-g-evidence.md", ["# Grades 1–9 Wave G evidence report", "", ...audit.rows.map((row) => `- Grade ${row.grade}: eligible ${row.production?.candidateEligible ?? 0}, insufficient ${row.production?.verificationInsufficient ?? 0}, source rows ${row.sourceOutcomeIds.join(", ") || "immutable legacy"}, pages ${row.authoritativePages.join(", ") || "N/A"}.`), ""].join("\n")],
  ["wave-g-independent-audit.json", `${canonicalize(audit)}\n`],
  ["wave-g-independent-audit.md", ["# Grades 1–9 Wave G independent audit", "", `- Questions independently verified: ${audit.totals.independentlyVerified}/${audit.totals.questions}`,
    `- Generated: ${audit.totals.generated}`, `- Repaired/rejected/quarantined/insufficient/duplicate: ${audit.totals.repaired}/${audit.totals.rejected}/${audit.totals.quarantined}/${audit.totals.verificationInsufficient}/${audit.totals.duplicate}`,
    `- Cross-wave duplicates: ${audit.crossWaveDuplicates.length}`, `- Progression cycles/missing/forward/orphan Wave G: ${audit.progression.cycles}/${audit.progression.missingReferences}/${audit.progression.forwardGradeDependencies}/${audit.progression.waveGOrphans}`,
    `- Offline boundary: ${audit.invocationBoundary.status}; Wave G network attempts: ${audit.invocationBoundary.waveGNetworkAttemptCount}`,
    `- Errors: ${audit.totals.errors}`, `- Wave G bundle: ${audit.waveGBundle.bundleHash}`, `- Combined A–G bundle: ${audit.combinedBundle.bundleHash}`,
    "- Simulations prove bounded software behavior only; no pedagogical superiority is claimed.", ""].join("\n")],
  ["wave-g-simulations.json", `${canonicalize({ schemaVersion: "plave-grades-1-9-wave-g-simulations-v1", simulations: audit.simulations })}\n`],
  ["wave-g-invocation-boundary.json", `${canonicalize(audit.invocationBoundary)}\n`],
  ["bundle-wave-g-grades-1-2-3-4-5-6-7-8-9.json", `${canonicalize(waveGBundle)}\n`],
  ["bundle-combined-wave-a-b-c-d-e-f-g-grades-1-2-3-4-5-6-7-8-9.json", `${canonicalize(combinedBundle)}\n`],
]);
for (const [name, content] of files) writeFileSync(resolve(output, name), content, { mode: 0o644 });
console.log(`WAVE_G_BUILD_OK grades=9 eligible=${audit.totals.candidateEligible} insufficient=${audit.totals.verificationInsufficient} wave_g=${waveGBundle.bundleHash} combined=${combinedBundle.bundleHash}`);
