import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import { simulateCombinedWaveABCDECandidate } from "../lib/content-factory/simulation.ts";
import { combinedWaveABCDGradePacks, waveDGradePacks } from "../lib/content-factory/wave-d-packs.ts";
import { auditWaveE } from "../lib/content-factory/wave-e-audit.ts";
import { combinedWaveABCDEGradePacks, waveEGradePacks, waveEProgressionContracts } from "../lib/content-factory/wave-e-packs.ts";
import { waveEPlan } from "../lib/content-factory/wave-e-plan.ts";
import { buildWaveECoverageRows, renderWaveECoverageMarkdown } from "../lib/content-factory/wave-e-report.ts";

test("Wave E plan contains nine source-bounded measurement/geometry slices", () => {
  assert.deepEqual(waveEPlan.map((row) => row.grade), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(waveEPlan[0]?.gradeOneLegacyEvidence, true);
  assert.equal(waveEPlan.slice(1).every((row) => row.sourceOutcomeIds.length > 0 && row.authoritativePages.length > 0 && !row.curriculumCompletionClaim), true);
});

test("Wave E automated and independent audit records partial Grade 1 eligibility without false completion", () => {
  const audit = auditWaveE();
  assert.deepEqual(audit.totals, { candidates: 9, questions: 198, independentlyVerified: 198, generated: 192, repaired: 0,
    verificationInsufficient: 18, rejected: 0, quarantined: 18, duplicate: 0, candidateEligible: 198,
    uniqueCanonicalPublicForms: 1272, errors: 0 });
  assert.deepEqual(audit.crossWaveDuplicates, []);
});

test("combined A–E candidates preserve progression and complete software simulations", () => {
  for (const pack of combinedWaveABCDEGradePacks) {
    const contract = waveEProgressionContracts.find((entry) => entry.grade === pack.grade)!;
    const first = simulateCombinedWaveABCDECandidate(pack, contract);
    assert.deepEqual(first, simulateCombinedWaveABCDECandidate(pack, contract));
    assert.equal(first.earlyMastery.status, "MASTERED_EARLY");
    assert.equal(first.remediation.status, "REMEDIATION_REQUIRED");
    assert.equal(first.maximumTermination.status, "MAXIMUM_REACHED");
    assert.equal(first.emptyPool.failedClosed && first.historyPreserved && first.nextActions.alwaysValid, true);
    assert.equal(first.nextActions.schoolGradeMutation || first.nextActions.entitlementGrant, false);
  }
});

test("Wave D and combined A–D artifacts remain frozen", () => {
  assert.equal(buildDeterministicBundle(waveDGradePacks).bundleHash, "8395b56d061f84f34cf9c7de90d2cd8fcd78071bbd906abc14b2a664a0a3e052");
  assert.equal(buildDeterministicBundle(combinedWaveABCDGradePacks).bundleHash, "d574cc67e9d45fdd25bf2e55f4a2af899ba7acecc4a85b80435a47f7e21e53dd");
});

test("Wave E and combined A–E bundle hashes and generated reports reconcile", () => {
  const waveE = buildDeterministicBundle(waveEGradePacks);
  const combined = buildDeterministicBundle(combinedWaveABCDEGradePacks);
  assert.equal(waveE.bundleHash, "5795d721a8a2a9249e6195bbb7bc61280f400ce57355874c91d4752ba130d25c");
  assert.equal(combined.bundleHash, "f123d7f658c692ee979a3132f1321a7dce039de7d5ef0914be33ccf14bf1e626");
  assert.equal(canonicalize(waveE), canonicalize(buildDeterministicBundle([...waveEGradePacks].reverse())));
  const rows = buildWaveECoverageRows();
  assert.deepEqual(JSON.parse(readFileSync("content/grade-packs/generated/wave-e-coverage.json", "utf8")).rows, rows);
  assert.equal(readFileSync("content/grade-packs/generated/wave-e-coverage.md", "utf8"), renderWaveECoverageMarkdown(rows));
});
