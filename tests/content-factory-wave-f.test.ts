import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import { simulateCombinedWaveABCDEFCandidate } from "../lib/content-factory/simulation.ts";
import { combinedWaveABCDEGradePacks, waveEGradePacks } from "../lib/content-factory/wave-e-packs.ts";
import { auditWaveF } from "../lib/content-factory/wave-f-audit.ts";
import { combinedWaveABCDEFGradePacks, waveFGradePacks, waveFProgressionContracts } from "../lib/content-factory/wave-f-packs.ts";
import { waveFPlan } from "../lib/content-factory/wave-f-plan.ts";
import { buildWaveFCoverageRows, renderWaveFCoverageMarkdown } from "../lib/content-factory/wave-f-report.ts";

test("Wave F plan contains nine source-bounded number and algebra slices", () => {
  assert.deepEqual(waveFPlan.map((row) => row.grade), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(waveFPlan[0]?.gradeOneLegacyEvidence, true);
  assert.equal(waveFPlan.slice(1).every((row) => row.sourceOutcomeIds.length > 0 && row.authoritativePages.length > 0 && !row.curriculumCompletionClaim), true);
});

test("Wave F automated and independent audit verifies all eligible content", () => {
  const audit = auditWaveF();
  assert.deepEqual(audit.totals, { candidates: 9, questions: 216, independentlyVerified: 216, generated: 192, repaired: 0,
    verificationInsufficient: 0, rejected: 0, quarantined: 0, duplicate: 0, candidateEligible: 216,
    uniqueCanonicalPublicForms: 1464, errors: 0 });
  assert.deepEqual(audit.crossWaveDuplicates, []);
});

test("combined A–F candidates preserve progression and complete software simulations", () => {
  for (const pack of combinedWaveABCDEFGradePacks) {
    const contract = waveFProgressionContracts.find((entry) => entry.grade === pack.grade)!;
    const first = simulateCombinedWaveABCDEFCandidate(pack, contract);
    assert.deepEqual(first, simulateCombinedWaveABCDEFCandidate(pack, contract));
    assert.equal(first.earlyMastery.status, "MASTERED_EARLY");
    assert.equal(first.remediation.status, "REMEDIATION_REQUIRED");
    assert.equal(first.maximumTermination.status, "MAXIMUM_REACHED");
    assert.equal(first.emptyPool.failedClosed && first.historyPreserved && first.nextActions.alwaysValid, true);
    assert.equal(first.nextActions.schoolGradeMutation || first.nextActions.entitlementGrant, false);
  }
});

test("Wave E and combined A–E artifacts remain frozen", () => {
  assert.equal(buildDeterministicBundle(waveEGradePacks).bundleHash, "5795d721a8a2a9249e6195bbb7bc61280f400ce57355874c91d4752ba130d25c");
  assert.equal(buildDeterministicBundle(combinedWaveABCDEGradePacks).bundleHash, "f123d7f658c692ee979a3132f1321a7dce039de7d5ef0914be33ccf14bf1e626");
});

test("Wave F and combined A–F bundle hashes and generated reports reconcile", () => {
  const waveF = buildDeterministicBundle(waveFGradePacks);
  const combined = buildDeterministicBundle(combinedWaveABCDEFGradePacks);
  assert.equal(waveF.bundleHash, "bf725bf649e3985394cd5fd874c6d949d0621bd815c65982a2bc045a622039de");
  assert.equal(combined.bundleHash, "e52d19b8cb77960ac0f861f072917c8af2c1a8e300c31d603ffb2a57ffca7f09");
  assert.equal(canonicalize(waveF), canonicalize(buildDeterministicBundle([...waveFGradePacks].reverse())));
  const rows = buildWaveFCoverageRows();
  assert.deepEqual(JSON.parse(readFileSync("content/grade-packs/generated/wave-f-coverage.json", "utf8")).rows, rows);
  assert.equal(readFileSync("content/grade-packs/generated/wave-f-coverage.md", "utf8"), renderWaveFCoverageMarkdown(rows));
});
