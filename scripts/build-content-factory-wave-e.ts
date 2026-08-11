import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize, sha256 } from "../lib/content-factory/canonical.ts";
import { auditWaveE } from "../lib/content-factory/wave-e-audit.ts";
import { combinedWaveABCDEGradePacks, waveEGradePacks } from "../lib/content-factory/wave-e-packs.ts";
import { buildWaveECoverageRows, renderWaveECoverageMarkdown } from "../lib/content-factory/wave-e-report.ts";

const output = resolve(process.cwd(), "content/grade-packs/generated");
mkdirSync(output, { recursive: true });
const audit = auditWaveE();
if (audit.totals.candidates !== 9 || audit.totals.questions !== 198 || audit.totals.independentlyVerified !== 198 || audit.totals.errors !== 0) {
  for (const error of audit.errors) console.error(error);
  throw new Error("WAVE_E_AUDIT_FAILED");
}
const coverageRows = buildWaveECoverageRows();
const candidateRows = waveEGradePacks.map((pack) => ({ grade: pack.grade, candidate: pack.candidate, release: pack.release, production: pack.production,
  questionChecksums: pack.questions.map((question) => ({ id: question.id, sha256: sha256(canonicalize(question)) })),
  explanationChecksums: pack.explanations.map((explanation) => ({ id: explanation.id, sha256: sha256(canonicalize(explanation)) })),
  quarantinedChecksums: (pack.quarantinedQuestions ?? []).map((question) => ({ id: question.id, sha256: sha256(canonicalize(question)) })),
  evidenceReceiptChecksum: sha256(canonicalize(pack.evidenceReceipts)) }));
const combinedRows = combinedWaveABCDEGradePacks.map((pack) => ({ grade: pack.grade, candidate: pack.candidate, release: pack.release,
  waveAQuestionCount: pack.grade === 1 ? 312 : 24, waveBEligibleQuestionCount: 24, waveCEligibleQuestionCount: 24,
  waveDEligibleQuestionCount: 24, waveEEligibleQuestionCount: waveEGradePacks.find((entry) => entry.grade === pack.grade)!.questions.length,
  totalQuestionCount: pack.questions.length,
  manifestChecksum: sha256(canonicalize({ packId: pack.packId, packVersion: pack.packVersion, candidate: pack.candidate, questionIds: pack.questions.map((question) => question.id) })) }));
const candidates = { schemaVersion: "plave-grades-1-9-wave-e-candidates-v1", candidates: candidateRows, combined: combinedRows } as const;
const waveEBundle = buildDeterministicBundle(waveEGradePacks);
const combinedBundle = buildDeterministicBundle(combinedWaveABCDEGradePacks);
if (canonicalize(waveEBundle) !== canonicalize(buildDeterministicBundle([...waveEGradePacks].reverse()))) throw new Error("WAVE_E_BUNDLE_NOT_DETERMINISTIC");
if (canonicalize(combinedBundle) !== canonicalize(buildDeterministicBundle([...combinedWaveABCDEGradePacks].reverse()))) throw new Error("COMBINED_WAVE_E_BUNDLE_NOT_DETERMINISTIC");
const evidence = { schemaVersion: "plave-grades-1-9-wave-e-evidence-v1", sourceRows: audit.rows.map((row) => ({
  grade: row.grade, sourceOutcomeIds: row.sourceOutcomeIds, authoritativePages: row.authoritativePages,
  candidateEligible: row.production?.candidateEligible ?? 0, verificationInsufficient: row.production?.verificationInsufficient ?? 0,
  quarantinedQuestionIds: row.quarantinedQuestionIds, oracleErrors: row.oracleErrors, sourceErrors: row.sourceErrors,
  validationErrors: row.validationErrors })) } as const;
const files = new Map<string, string>([
  ["wave-e-candidates.json", `${canonicalize(candidates)}\n`],
  ["wave-e-coverage.json", `${canonicalize({ schemaVersion: "plave-grades-1-9-wave-e-coverage-v1", rows: coverageRows })}\n`],
  ["wave-e-coverage.md", renderWaveECoverageMarkdown(coverageRows)],
  ["wave-e-evidence.json", `${canonicalize(evidence)}\n`],
  ["wave-e-evidence.md", ["# Grades 1–9 Wave E evidence report", "", ...audit.rows.map((row) =>
    `- Grade ${row.grade}: eligible ${row.production?.candidateEligible ?? 0}, insufficient ${row.production?.verificationInsufficient ?? 0}, source rows ${row.sourceOutcomeIds.join(", ") || "immutable legacy"}, pages ${row.authoritativePages.join(", ") || "N/A"}.`), ""].join("\n")],
  ["wave-e-independent-audit.json", `${canonicalize(audit)}\n`],
  ["wave-e-independent-audit.md", ["# Grades 1–9 Wave E independent audit", "",
    `- Questions independently verified: ${audit.totals.independentlyVerified}/${audit.totals.questions}`,
    `- Generated: ${audit.totals.generated}`, `- Repaired/rejected/quarantined/insufficient/duplicate: ${audit.totals.repaired}/${audit.totals.rejected}/${audit.totals.quarantined}/${audit.totals.verificationInsufficient}/${audit.totals.duplicate}`,
    `- Cross-wave duplicates: ${audit.crossWaveDuplicates.length}`,
    `- Progression cycles/missing/forward/orphan Wave E: ${audit.progression.cycles}/${audit.progression.missingReferences}/${audit.progression.forwardGradeDependencies}/${audit.progression.waveEOrphans}`,
    `- Errors: ${audit.totals.errors}`, `- Wave E bundle: ${audit.waveEBundle.bundleHash}`,
    `- Combined A–E bundle: ${audit.combinedBundle.bundleHash}`,
    "- Simulations prove bounded software behavior only; no pedagogical superiority is claimed.", ""].join("\n")],
  ["wave-e-simulations.json", `${canonicalize({ schemaVersion: "plave-grades-1-9-wave-e-simulations-v1", simulations: audit.simulations })}\n`],
  ["bundle-wave-e-grades-1-2-3-4-5-6-7-8-9.json", `${canonicalize(waveEBundle)}\n`],
  ["bundle-combined-wave-a-b-c-d-e-grades-1-2-3-4-5-6-7-8-9.json", `${canonicalize(combinedBundle)}\n`],
]);
for (const [name, content] of files) writeFileSync(resolve(output, name), content, { mode: 0o644 });
console.log(`WAVE_E_BUILD_OK grades=9 eligible=198 insufficient=18 wave_e=${waveEBundle.bundleHash} combined=${combinedBundle.bundleHash}`);
