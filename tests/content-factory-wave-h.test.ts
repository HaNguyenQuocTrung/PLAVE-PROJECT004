import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { auditAppliedEquivalentQuestions } from "../lib/content-factory/applied-reasoning.ts";
import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { canonicalize } from "../lib/content-factory/canonical.ts";
import { simulateCombinedWaveABCDEFGHCandidate } from "../lib/content-factory/simulation.ts";
import { combinedWaveABCDEFGGradePacks, waveGGradePacks } from "../lib/content-factory/wave-g-packs.ts";
import { auditWaveH } from "../lib/content-factory/wave-h-audit.ts";
import { combinedWaveABCDEFGHGradePacks, waveHGradePacks, waveHProgressionContracts } from "../lib/content-factory/wave-h-packs.ts";
import { waveHPlan } from "../lib/content-factory/wave-h-plan.ts";
import { buildWaveHCoverageRows, renderWaveHCoverageMarkdown } from "../lib/content-factory/wave-h-report.ts";

test("Wave H plan selects nine bounded source-backed slices", () => {
  assert.deepEqual(waveHPlan.map((row) => row.grade), [1, 2, 3, 4, 5, 6, 7, 8, 9]); assert.equal(waveHPlan[0]?.gradeOneLegacyEvidence, true);
  assert.equal(waveHPlan.slice(1).every((row) => row.sourceOutcomeIds.length > 0 && row.authoritativePages.length > 0 && !row.curriculumCompletionClaim), true);
});

test("Wave H audit verifies all eligible content and applied equivalence", () => {
  const audit = auditWaveH();
  assert.deepEqual(audit.totals, { candidates: 9, questions: 198, independentlyVerified: 198, generated: 192, repaired: 0,
    verificationInsufficient: 0, rejected: 0, quarantined: 0, duplicate: 0, candidateEligible: 198,
    uniqueCanonicalPublicForms: 1848, errors: 0 });
  assert.deepEqual(audit.crossWaveDuplicates, []); assert.deepEqual(audit.appliedEquivalentDuplicates, []);
  assert.deepEqual(audit.progression, { nodes: 575, edges: 183, waveHSkills: 9, waveHOrphans: 0, cycles: 0, missingReferences: 0, forwardGradeDependencies: 0 });
  assert.equal(audit.invocationBoundary.status, "PASS"); assert.equal(audit.invocationBoundary.waveGNetworkAttemptCount + audit.invocationBoundary.waveHNetworkAttemptCount, 0);
});

test("combined A–H simulations fail malformed applied states closed", () => {
  for (const pack of combinedWaveABCDEFGHGradePacks) {
    const result = simulateCombinedWaveABCDEFGHCandidate(pack, waveHProgressionContracts.find((entry) => entry.grade === pack.grade)!);
    assert.deepEqual(result, simulateCombinedWaveABCDEFGHCandidate(pack, waveHProgressionContracts.find((entry) => entry.grade === pack.grade)!));
    assert.equal(result.earlyMastery.status, "MASTERED_EARLY"); assert.equal(result.remediation.status, "REMEDIATION_REQUIRED"); assert.equal(result.maximumTermination.status, "MAXIMUM_REACHED");
    assert.equal(result.emptyPool.failedClosed && result.historyPreserved && result.nextActions.alwaysValid, true);
    assert.equal(Object.values(result.appliedFailures).every((entry) => entry.status === "AUTOMATED_VERIFICATION_INSUFFICIENT"), true);
    assert.equal(result.nextActions.schoolGradeMutation || result.nextActions.entitlementGrant, false);
  }
});

test("Wave G artifacts and historical boundary record remain frozen", () => {
  assert.equal(buildDeterministicBundle(waveGGradePacks).bundleHash, "70d68d5c61159f00b7f93cdad32ac0c48cf67036add2291162b05d1974e19416");
  assert.equal(buildDeterministicBundle(combinedWaveABCDEFGGradePacks).bundleHash, "8cf480fbaf4717f8a79b26e33bdf96e20d3c0def410d63d9704cdf074e4f967b");
  assert.match(readFileSync("docs/content-factory/WAVE_G.md", "utf8"), /Wave F.*DNS|DNS.*Wave F/is);
});

test("Wave H bundles and generated coverage reconcile deterministically", () => {
  const waveH = buildDeterministicBundle(waveHGradePacks); const combined = buildDeterministicBundle(combinedWaveABCDEFGHGradePacks);
  assert.equal(waveH.bundleHash, "05d894cf9c1accd77350d8b6022fd19af173b6e5808a1018d72702c4429dc640");
  assert.equal(combined.bundleHash, "5e39cddd1c352409c02214902dac90bf95444c2ae0c80ffdb7b9d7090297cf2e");
  assert.equal(canonicalize(waveH), canonicalize(buildDeterministicBundle([...waveHGradePacks].reverse())));
  assert.deepEqual(auditAppliedEquivalentQuestions(waveHGradePacks), []);
  const rows = buildWaveHCoverageRows(); assert.deepEqual(JSON.parse(readFileSync("content/grade-packs/generated/wave-h-coverage.json", "utf8")).rows, rows);
  assert.equal(readFileSync("content/grade-packs/generated/wave-h-coverage.md", "utf8"), renderWaveHCoverageMarkdown(rows));
});

test("Wave H candidates remain hidden and combined counts reconcile", () => {
  assert.deepEqual(waveHGradePacks.map((pack) => pack.questions.length), [6, 24, 24, 24, 24, 24, 24, 24, 24]);
  assert.deepEqual(combinedWaveABCDEFGHGradePacks.map((pack) => pack.questions.length), [312, 192, 192, 192, 192, 192, 192, 192, 192]);
  assert.equal([...waveHGradePacks, ...combinedWaveABCDEFGHGradePacks].every((pack) => pack.release.publication === "DRAFT" && pack.release.visibility === "HIDDEN" && !pack.release.pilotEnabled && !pack.release.runtimeEnabled && !pack.release.retentionEnabled), true);
});
