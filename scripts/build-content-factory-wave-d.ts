import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize, sha256 } from "../lib/content-factory/canonical.ts";
import { auditWaveD } from "../lib/content-factory/wave-d-audit.ts";
import { combinedWaveABCDGradePacks, waveDGradePacks } from "../lib/content-factory/wave-d-packs.ts";
import { buildWaveDCoverageRows, renderWaveDCoverageMarkdown } from "../lib/content-factory/wave-d-report.ts";

const output = resolve(process.cwd(), "content/grade-packs/generated");
mkdirSync(output, { recursive: true });

const audit = auditWaveD();
if (audit.totals.candidates !== 9 || audit.totals.questions !== 216 || audit.totals.independentlyVerified !== 216 || audit.totals.errors !== 0) {
  for (const error of audit.errors) console.error(error);
  throw new Error("WAVE_D_AUDIT_FAILED");
}
const coverageRows = buildWaveDCoverageRows();
const candidateRows = waveDGradePacks.map((pack) => ({
  grade: pack.grade,
  candidate: pack.candidate,
  release: pack.release,
  production: pack.production,
  questionChecksums: pack.questions.map((question) => ({ id: question.id, sha256: sha256(canonicalize(question)) })),
  explanationChecksums: pack.explanations.map((explanation) => ({ id: explanation.id, sha256: sha256(canonicalize(explanation)) })),
  quarantinedChecksums: (pack.quarantinedQuestions ?? []).map((question) => ({ id: question.id, sha256: sha256(canonicalize(question)) })),
  evidenceReceiptChecksum: sha256(canonicalize(pack.evidenceReceipts)),
}));
const combinedRows = combinedWaveABCDGradePacks.map((pack) => ({
  grade: pack.grade,
  candidate: pack.candidate,
  release: pack.release,
  waveAQuestionCount: pack.grade === 1 ? 312 : 24,
  waveBEligibleQuestionCount: 24,
  waveCEligibleQuestionCount: 24,
  waveDEligibleQuestionCount: 24,
  totalQuestionCount: pack.questions.length,
  manifestChecksum: sha256(canonicalize({ packId: pack.packId, packVersion: pack.packVersion, candidate: pack.candidate, questionIds: pack.questions.map((question) => question.id) })),
}));
const candidates = { schemaVersion: "plave-grades-1-9-wave-d-candidates-v1", candidates: candidateRows, combined: combinedRows } as const;
const waveDBundle = buildDeterministicBundle(waveDGradePacks);
const combinedBundle = buildDeterministicBundle(combinedWaveABCDGradePacks);
if (canonicalize(waveDBundle) !== canonicalize(buildDeterministicBundle([...waveDGradePacks].reverse()))) throw new Error("WAVE_D_BUNDLE_NOT_DETERMINISTIC");
if (canonicalize(combinedBundle) !== canonicalize(buildDeterministicBundle([...combinedWaveABCDGradePacks].reverse()))) throw new Error("COMBINED_WAVE_D_BUNDLE_NOT_DETERMINISTIC");

const files = new Map<string, string>([
  ["wave-d-candidates.json", `${canonicalize(candidates)}\n`],
  ["wave-d-coverage.json", `${canonicalize({ schemaVersion: "plave-grades-1-9-wave-d-coverage-v1", rows: coverageRows })}\n`],
  ["wave-d-coverage.md", renderWaveDCoverageMarkdown(coverageRows)],
  ["wave-d-independent-audit.json", `${canonicalize(audit)}\n`],
  ["wave-d-independent-audit.md", [
    "# Grades 1–9 Wave D independent audit",
    "",
    `- Questions independently verified: ${audit.totals.independentlyVerified}/${audit.totals.questions}`,
    `- Candidate packs: ${audit.totals.candidates}/9`,
    `- Generated: ${audit.totals.generated}`,
    `- Repaired/rejected/insufficient/duplicate: ${audit.totals.repaired}/${audit.totals.rejected}/${audit.totals.verificationInsufficient}/${audit.totals.duplicate}`,
    `- Cross-wave duplicates: ${audit.crossWaveDuplicates.length}`,
    `- Progression cycles/missing/forward/orphan Wave D: ${audit.progression.cycles}/${audit.progression.missingReferences}/${audit.progression.forwardGradeDependencies}/${audit.progression.waveDOrphans}`,
    `- Errors: ${audit.totals.errors}`,
    `- Wave D bundle: ${audit.waveDBundle.bundleHash}`,
    `- Combined A+B+C+D bundle: ${audit.combinedBundle.bundleHash}`,
    "- Simulations prove bounded software behavior only; no pedagogical superiority is claimed.",
    "- Coverage truth: bounded Wave D slices only; no grade is curriculum-complete.",
    "",
  ].join("\n")],
  ["wave-d-simulations.json", `${canonicalize({ schemaVersion: "plave-grades-1-9-wave-d-simulations-v1", simulations: audit.simulations })}\n`],
  ["bundle-wave-d-grades-1-2-3-4-5-6-7-8-9.json", `${canonicalize(waveDBundle)}\n`],
  ["bundle-combined-wave-a-b-c-d-grades-1-2-3-4-5-6-7-8-9.json", `${canonicalize(combinedBundle)}\n`],
]);
for (const [name, content] of files) writeFileSync(resolve(output, name), content, { mode: 0o644 });
console.log(`WAVE_D_BUILD_OK grades=9 questions=216 verified=216 wave_d=${waveDBundle.bundleHash} combined=${combinedBundle.bundleHash}`);
