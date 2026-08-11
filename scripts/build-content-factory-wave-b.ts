import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize, sha256 } from "../lib/content-factory/canonical.ts";
import { auditWaveB } from "../lib/content-factory/wave-b-audit.ts";
import { combinedWaveABGradePacks, waveBGradePacks } from "../lib/content-factory/wave-b-packs.ts";
import { buildWaveBCoverageRows, renderWaveBCoverageMarkdown } from "../lib/content-factory/wave-b-report.ts";

const output = resolve(process.cwd(), "content/grade-packs/generated");
mkdirSync(output, { recursive: true });

const audit = auditWaveB();
if (audit.totals.candidates !== 9 || audit.totals.questions !== 216 || audit.totals.independentlyVerified !== 216 || audit.totals.errors !== 0) {
  for (const error of audit.errors) console.error(error);
  throw new Error("WAVE_B_AUDIT_FAILED");
}
const coverageRows = buildWaveBCoverageRows();
const candidateRows = waveBGradePacks.map((pack) => ({
  grade: pack.grade,
  candidate: pack.candidate,
  release: pack.release,
  production: pack.production,
  questionChecksums: pack.questions.map((question) => ({ id: question.id, sha256: sha256(canonicalize(question)) })),
  explanationChecksums: pack.explanations.map((explanation) => ({ id: explanation.id, sha256: sha256(canonicalize(explanation)) })),
  evidenceReceiptChecksum: sha256(canonicalize(pack.evidenceReceipts)),
}));
const combinedRows = combinedWaveABGradePacks.map((pack) => ({
  grade: pack.grade,
  candidate: pack.candidate,
  release: pack.release,
  waveAQuestionCount: pack.grade === 1 ? 312 : 24,
  waveBEligibleQuestionCount: pack.production?.candidateEligible ?? 0,
  totalQuestionCount: pack.questions.length,
  manifestChecksum: sha256(canonicalize({ packId: pack.packId, packVersion: pack.packVersion, candidate: pack.candidate, questionIds: pack.questions.map((question) => question.id) })),
}));
const candidates = { schemaVersion: "plave-grades-1-9-wave-b-candidates-v1", candidates: candidateRows, combined: combinedRows } as const;
const waveBBundle = buildDeterministicBundle(waveBGradePacks);
const combinedBundle = buildDeterministicBundle(combinedWaveABGradePacks);
if (canonicalize(waveBBundle) !== canonicalize(buildDeterministicBundle([...waveBGradePacks].reverse()))) throw new Error("WAVE_B_BUNDLE_NOT_DETERMINISTIC");
if (canonicalize(combinedBundle) !== canonicalize(buildDeterministicBundle([...combinedWaveABGradePacks].reverse()))) throw new Error("COMBINED_WAVE_BUNDLE_NOT_DETERMINISTIC");

const files = new Map<string, string>([
  ["wave-b-candidates.json", `${canonicalize(candidates)}\n`],
  ["wave-b-coverage.json", `${canonicalize({ schemaVersion: "plave-grades-1-9-wave-b-coverage-v1", rows: coverageRows })}\n`],
  ["wave-b-coverage.md", renderWaveBCoverageMarkdown(coverageRows)],
  ["wave-b-independent-audit.json", `${canonicalize(audit)}\n`],
  ["wave-b-independent-audit.md", [
    "# Grades 1–9 Wave B independent audit",
    "",
    `- Questions independently verified: ${audit.totals.independentlyVerified}/${audit.totals.questions}`,
    `- Candidate packs: ${audit.totals.candidates}/9`,
    `- Cross-wave duplicates: ${audit.crossWaveDuplicates.length}`,
    `- Errors: ${audit.totals.errors}`,
    `- Wave B bundle: ${audit.waveBBundle.bundleHash}`,
    `- Combined A+B bundle: ${audit.combinedBundle.bundleHash}`,
    "- Coverage truth: bounded Wave B slices only; no grade is curriculum-complete.",
    "",
  ].join("\n")],
  ["wave-b-simulations.json", `${canonicalize({ schemaVersion: "plave-grades-1-9-wave-b-simulations-v1", simulations: audit.simulations })}\n`],
  ["bundle-wave-b-grades-1-2-3-4-5-6-7-8-9.json", `${canonicalize(waveBBundle)}\n`],
  ["bundle-combined-wave-a-b-grades-1-2-3-4-5-6-7-8-9.json", `${canonicalize(combinedBundle)}\n`],
]);
for (const [name, content] of files) writeFileSync(resolve(output, name), content, { mode: 0o644 });
console.log(`WAVE_B_BUILD_OK grades=9 questions=216 verified=216 wave_b=${waveBBundle.bundleHash} combined=${combinedBundle.bundleHash}`);
