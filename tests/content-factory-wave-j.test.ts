import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { auditWaveJ } from "../lib/content-factory/wave-j-audit.ts";
import { combinedWaveABCDEFGHIGradePacks } from "../lib/content-factory/wave-i-packs.ts";
import { combinedWaveABCDEFGHIJGradePacks, waveJGradePacks } from "../lib/content-factory/wave-j-packs.ts";

test("Wave J integrated audit closes all proven gaps without duplicates", () => {
  const audit = auditWaveJ();
  assert.deepEqual(audit.errors, []); assert.equal(audit.totals.skills, 189);
  assert.equal(audit.totals.gapSkillsBefore, 14); assert.equal(audit.totals.gapSkillsAfter, 0);
  assert.equal(audit.totals.addedQuestions, 30); assert.equal(audit.totals.duplicate, 0);
  assert.equal(audit.graph.cycles, 0); assert.equal(audit.graph.missingReferences, 0); assert.equal(audit.graph.forwardGradeDependencies, 0);
});

test("A–I candidates remain frozen and Wave J candidates remain hidden", () => {
  assert.equal(auditWaveJ().frozen.combinedAIBundleHash, "12b4acc67db62701dc50b210e11d8db09fabe176647e325849e33620f109cb7c");
  assert.ok(waveJGradePacks.every((pack) => pack.release.publication === "DRAFT" && pack.release.visibility === "HIDDEN"
    && !pack.release.pilotEnabled && !pack.release.runtimeEnabled && !pack.release.retentionEnabled));
  assert.deepEqual(combinedWaveABCDEFGHIGradePacks.map((pack) => pack.questions.length), [312, 192, 192, 192, 192, 192, 192, 192, 192]);
  assert.deepEqual(combinedWaveABCDEFGHIJGradePacks.map((pack) => pack.questions.length), [312, 192, 192, 193, 198, 203, 204, 192, 192]);
});

test("Wave J generated artifacts reconcile with deterministic hashes", () => {
  const audit = auditWaveJ();
  const candidates = JSON.parse(readFileSync("content/grade-packs/generated/wave-j-candidates.json", "utf8"));
  const invocation = JSON.parse(readFileSync("content/grade-packs/generated/wave-j-invocation-boundary.json", "utf8"));
  assert.deepEqual(candidates.waveJ.map((row: { candidate: { bundleHash: string } }) => row.candidate.bundleHash),
    waveJGradePacks.map((pack) => pack.candidate!.bundleHash));
  assert.equal(invocation.waveJNetworkAttemptCount, 0); assert.equal(audit.waveJBundle.bundleHash.length, 64);
  assert.equal(audit.combinedBundle.bundleHash.length, 64);
});

test("Wave J bounded simulations preserve software and isolation contracts", () => {
  for (const row of auditWaveJ().rows) {
    assert.ok(Object.values(row.simulation.checks).every(Boolean));
    assert.equal(row.simulation.selectedQuestionIds.length, 6);
    assert.equal(new Set(row.simulation.selectedQuestionIds).size, 6);
    assert.equal(row.simulation.actions.exhausted, "FAIL_CLOSED"); assert.equal(row.simulation.actions.maximum, "STOP_MAX");
  }
});
