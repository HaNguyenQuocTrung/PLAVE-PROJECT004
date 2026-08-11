import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize, sha256 } from "../lib/content-factory/canonical.ts";
import { auditWaveF } from "../lib/content-factory/wave-f-audit.ts";
import { waveEGradePacks } from "../lib/content-factory/wave-e-packs.ts";
import { combinedWaveABCDEFGradePacks, waveFGradePacks } from "../lib/content-factory/wave-f-packs.ts";
import { buildWaveFCoverageRows, renderWaveFCoverageMarkdown } from "../lib/content-factory/wave-f-report.ts";

const output = resolve(process.cwd(), "content/grade-packs/generated");
mkdirSync(output, { recursive: true });
const audit = auditWaveF();
if (audit.totals.candidates !== 9 || audit.totals.questions !== 216 || audit.totals.independentlyVerified !== 216 || audit.totals.errors !== 0) {
  for (const error of audit.errors) console.error(error);
  throw new Error("WAVE_F_AUDIT_FAILED");
}
const coverageRows = buildWaveFCoverageRows();
const candidateRows = waveFGradePacks.map((pack) => ({ grade: pack.grade, candidate: pack.candidate, release: pack.release, production: pack.production,
  questionChecksums: pack.questions.map((question) => ({ id: question.id, sha256: sha256(canonicalize(question)) })),
  explanationChecksums: pack.explanations.map((explanation) => ({ id: explanation.id, sha256: sha256(canonicalize(explanation)) })),
  quarantinedChecksums: (pack.quarantinedQuestions ?? []).map((question) => ({ id: question.id, sha256: sha256(canonicalize(question)) })),
  evidenceReceiptChecksum: sha256(canonicalize(pack.evidenceReceipts)) }));
const combinedRows = combinedWaveABCDEFGradePacks.map((pack) => ({ grade: pack.grade, candidate: pack.candidate, release: pack.release,
  waveAQuestionCount: pack.grade === 1 ? 312 : 24, waveBEligibleQuestionCount: 24, waveCEligibleQuestionCount: 24,
  waveDEligibleQuestionCount: 24, waveEEligibleQuestionCount: waveEGradePacks.find((entry) => entry.grade === pack.grade)!.questions.length,
  waveFEligibleQuestionCount: waveFGradePacks.find((entry) => entry.grade === pack.grade)!.questions.length,
  totalQuestionCount: pack.questions.length,
  manifestChecksum: sha256(canonicalize({ packId: pack.packId, packVersion: pack.packVersion, candidate: pack.candidate, questionIds: pack.questions.map((question) => question.id) })) }));
const candidates = { schemaVersion: "plave-grades-1-9-wave-f-candidates-v1", candidates: candidateRows, combined: combinedRows } as const;
const waveFBundle = buildDeterministicBundle(waveFGradePacks);
const combinedBundle = buildDeterministicBundle(combinedWaveABCDEFGradePacks);
if (canonicalize(waveFBundle) !== canonicalize(buildDeterministicBundle([...waveFGradePacks].reverse()))) throw new Error("WAVE_F_BUNDLE_NOT_DETERMINISTIC");
if (canonicalize(combinedBundle) !== canonicalize(buildDeterministicBundle([...combinedWaveABCDEFGradePacks].reverse()))) throw new Error("COMBINED_WAVE_F_BUNDLE_NOT_DETERMINISTIC");
const evidence = { schemaVersion: "plave-grades-1-9-wave-f-evidence-v1", sourceRows: audit.rows.map((row) => ({
  grade: row.grade, sourceOutcomeIds: row.sourceOutcomeIds, authoritativePages: row.authoritativePages,
  candidateEligible: row.production?.candidateEligible ?? 0, verificationInsufficient: row.production?.verificationInsufficient ?? 0,
  quarantinedQuestionIds: row.quarantinedQuestionIds, oracleErrors: row.oracleErrors, sourceErrors: row.sourceErrors,
  validationErrors: row.validationErrors })) } as const;
const files = new Map<string, string>([
  ["wave-f-candidates.json", `${canonicalize(candidates)}\n`],
  ["wave-f-coverage.json", `${canonicalize({ schemaVersion: "plave-grades-1-9-wave-f-coverage-v1", rows: coverageRows })}\n`],
  ["wave-f-coverage.md", renderWaveFCoverageMarkdown(coverageRows)],
  ["wave-f-evidence.json", `${canonicalize(evidence)}\n`],
  ["wave-f-evidence.md", ["# Grades 1–9 Wave F evidence report", "", ...audit.rows.map((row) =>
    `- Grade ${row.grade}: eligible ${row.production?.candidateEligible ?? 0}, insufficient ${row.production?.verificationInsufficient ?? 0}, source rows ${row.sourceOutcomeIds.join(", ") || "immutable legacy"}, pages ${row.authoritativePages.join(", ") || "N/A"}.`), ""].join("\n")],
  ["wave-f-independent-audit.json", `${canonicalize(audit)}\n`],
  ["wave-f-independent-audit.md", ["# Grades 1–9 Wave F independent audit", "",
    `- Questions independently verified: ${audit.totals.independentlyVerified}/${audit.totals.questions}`,
    `- Generated: ${audit.totals.generated}`, `- Repaired/rejected/quarantined/insufficient/duplicate: ${audit.totals.repaired}/${audit.totals.rejected}/${audit.totals.quarantined}/${audit.totals.verificationInsufficient}/${audit.totals.duplicate}`,
    `- Cross-wave duplicates: ${audit.crossWaveDuplicates.length}`,
    `- Progression cycles/missing/forward/orphan Wave F: ${audit.progression.cycles}/${audit.progression.missingReferences}/${audit.progression.forwardGradeDependencies}/${audit.progression.waveFOrphans}`,
    `- Errors: ${audit.totals.errors}`, `- Wave F bundle: ${audit.waveFBundle.bundleHash}`,
    `- Combined A–F bundle: ${audit.combinedBundle.bundleHash}`,
    "- Simulations prove bounded software behavior only; no pedagogical superiority is claimed.", ""].join("\n")],
  ["wave-f-simulations.json", `${canonicalize({ schemaVersion: "plave-grades-1-9-wave-f-simulations-v1", simulations: audit.simulations })}\n`],
  ["bundle-wave-f-grades-1-2-3-4-5-6-7-8-9.json", `${canonicalize(waveFBundle)}\n`],
  ["bundle-combined-wave-a-b-c-d-e-f-grades-1-2-3-4-5-6-7-8-9.json", `${canonicalize(combinedBundle)}\n`],
]);
for (const [name, content] of files) writeFileSync(resolve(output, name), content, { mode: 0o644 });
console.log(`WAVE_F_BUILD_OK grades=9 eligible=${audit.totals.candidateEligible} insufficient=${audit.totals.verificationInsufficient} wave_f=${waveFBundle.bundleHash} combined=${combinedBundle.bundleHash}`);
