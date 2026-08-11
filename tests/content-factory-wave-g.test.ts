import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import { simulateCombinedWaveABCDEFGCandidate } from "../lib/content-factory/simulation.ts";
import { combinedWaveABCDEFGradePacks, waveFGradePacks } from "../lib/content-factory/wave-f-packs.ts";
import { auditWaveG } from "../lib/content-factory/wave-g-audit.ts";
import { combinedWaveABCDEFGGradePacks, waveGGradePacks, waveGProgressionContracts } from "../lib/content-factory/wave-g-packs.ts";
import { waveGPlan } from "../lib/content-factory/wave-g-plan.ts";
import { buildWaveGCoverageRows, renderWaveGCoverageMarkdown } from "../lib/content-factory/wave-g-report.ts";

test("Wave G plan contains nine bounded source selections", () => {
  assert.deepEqual(waveGPlan.map((row) => row.grade), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(waveGPlan[0]?.gradeOneLegacyEvidence, true);
  assert.equal(waveGPlan.slice(1).every((row) => row.sourceOutcomeIds.length > 0 && row.authoritativePages.length > 0 && !row.curriculumCompletionClaim), true);
});

test("Wave G automated and independent audit verifies eligible content and quarantines visual-only rows", () => {
  const audit = auditWaveG();
  assert.deepEqual(audit.totals, { candidates: 9, questions: 192, independentlyVerified: 192, generated: 192, repaired: 0,
    verificationInsufficient: 6, rejected: 0, quarantined: 6, duplicate: 0, candidateEligible: 192,
    uniqueCanonicalPublicForms: 1656, errors: 0 });
  assert.deepEqual(audit.crossWaveDuplicates, []);
  assert.deepEqual(audit.progression, { nodes: 575, edges: 171, waveGSkills: 16, waveGOrphans: 0, cycles: 0, missingReferences: 0, forwardGradeDependencies: 0 });
  assert.equal(audit.invocationBoundary.status, "PASS"); assert.equal(audit.invocationBoundary.waveGNetworkAttemptCount, 0);
});

test("combined A–G candidates preserve progression and complete software simulations", () => {
  for (const pack of combinedWaveABCDEFGGradePacks) {
    const contract = waveGProgressionContracts.find((entry) => entry.grade === pack.grade)!;
    const first = simulateCombinedWaveABCDEFGCandidate(pack, contract);
    assert.deepEqual(first, simulateCombinedWaveABCDEFGCandidate(pack, contract));
    assert.equal(first.earlyMastery.status, "MASTERED_EARLY"); assert.equal(first.remediation.status, "REMEDIATION_REQUIRED");
    assert.equal(first.maximumTermination.status, "MAXIMUM_REACHED");
    assert.equal(first.emptyPool.failedClosed && first.historyPreserved && first.nextActions.alwaysValid, true);
    assert.equal(first.nextActions.schoolGradeMutation || first.nextActions.entitlementGrant, false);
  }
});

test("Wave F and combined A–F artifacts remain frozen", () => {
  assert.equal(buildDeterministicBundle(waveFGradePacks).bundleHash, "bf725bf649e3985394cd5fd874c6d949d0621bd815c65982a2bc045a622039de");
  assert.equal(buildDeterministicBundle(combinedWaveABCDEFGradePacks).bundleHash, "e52d19b8cb77960ac0f861f072917c8af2c1a8e300c31d603ffb2a57ffca7f09");
});

test("Wave G and combined A–G hashes and generated reports reconcile", () => {
  const waveG = buildDeterministicBundle(waveGGradePacks); const combined = buildDeterministicBundle(combinedWaveABCDEFGGradePacks);
  assert.equal(waveG.bundleHash, "70d68d5c61159f00b7f93cdad32ac0c48cf67036add2291162b05d1974e19416");
  assert.equal(combined.bundleHash, "8cf480fbaf4717f8a79b26e33bdf96e20d3c0def410d63d9704cdf074e4f967b");
  assert.equal(canonicalize(waveG), canonicalize(buildDeterministicBundle([...waveGGradePacks].reverse())));
  const rows = buildWaveGCoverageRows();
  assert.deepEqual(JSON.parse(readFileSync("content/grade-packs/generated/wave-g-coverage.json", "utf8")).rows, rows);
  assert.equal(readFileSync("content/grade-packs/generated/wave-g-coverage.md", "utf8"), renderWaveGCoverageMarkdown(rows));
});
