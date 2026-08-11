import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { auditWaveK } from "../lib/content-factory/wave-k-audit.ts";
import { combinedWaveABCDEFGHIJGradePacks } from "../lib/content-factory/wave-j-packs.ts";
import { combinedWaveABCDEFGHIJKGradePacks, waveKGradePacks } from "../lib/content-factory/wave-k-packs.ts";

test("Wave K integrated audit closes every producible deterministic gap", () => {
  const audit = auditWaveK();
  assert.deepEqual(audit.errors, []);
  assert.equal(audit.totals.grades, 9);
  assert.equal(audit.totals.auditedRemaining, 386);
  assert.equal(audit.totals.reportedRemaining, 345);
  assert.equal(audit.totals.remainingProducible, 0);
  assert.equal(audit.totals.duplicate, 0);
  assert.equal(audit.graph.cycles, 0);
  assert.equal(audit.graph.missingReferences, 0);
  assert.equal(audit.graph.forwardGradeDependencies, 0);
});

test("A-J stays frozen and Wave K candidates stay hidden", () => {
  const audit = auditWaveK();
  assert.equal(audit.frozen.combinedAJBundleHash, "22a4799ad423fd16a2b0568f64920be66dcf545dc1f62ee3d42cadbe9a814e33");
  assert.deepEqual(combinedWaveABCDEFGHIJGradePacks.map((pack) => pack.questions.length), [312, 192, 192, 193, 198, 203, 204, 192, 192]);
  assert.ok(waveKGradePacks.every((pack) => pack.release.publication === "DRAFT" && pack.release.visibility === "HIDDEN"
    && !pack.release.pilotEnabled && !pack.release.runtimeEnabled && !pack.release.retentionEnabled));
  assert.ok(combinedWaveABCDEFGHIJKGradePacks.every((pack) => pack.candidate && pack.candidate.bundleHash.length === 64));
});

test("Wave K simulations preserve progression and product contracts", () => {
  for (const row of auditWaveK().rows) {
    assert.ok(Object.entries(row.simulation.checks).every(([key, passed]) =>
      key === "schoolGradeMutation" || key === "entitlementGrant" ? passed === false : passed === true));
    assert.ok(row.simulation.visitedStates > 0);
    assert.ok(row.simulation.visitedTransitions > 0);
    assert.equal(row.remediation.missingRemediation, 0);
    assert.equal(row.remediation.missingAdvance, 0);
  }
});

test("generated Wave K manifests reconcile with candidate and bundle hashes", () => {
  const audit = auditWaveK();
  const candidates = JSON.parse(readFileSync("content/grade-packs/generated/wave-k-candidates.json", "utf8"));
  const invocation = JSON.parse(readFileSync("content/grade-packs/generated/wave-k-invocation-boundary.json", "utf8"));
  const batches = JSON.parse(readFileSync("content/grade-packs/generated/wave-k-batch-manifests.json", "utf8"));
  assert.deepEqual(candidates.waveK.map((row: { candidate: { bundleHash: string } }) => row.candidate.bundleHash),
    waveKGradePacks.map((pack) => pack.candidate!.bundleHash));
  assert.ok(batches.batches.every((batch: { questionCount: number; batchHash: string; frozen: boolean }) =>
    batch.questionCount === 6 && batch.batchHash.length === 64 && batch.frozen));
  assert.equal(invocation.waveKNetworkAttemptCount, 0);
  assert.equal(invocation.waveKCredentialBoundaryIncidentCount, 2);
  assert.equal(invocation.status, "PASS_WITH_RECORDED_INCIDENT");
  assert.equal(audit.waveKBundle.bundleHash.length, 64);
  assert.equal(audit.combinedBundle.bundleHash.length, 64);
});
