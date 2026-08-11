import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { auditWaveL, frozenCombinedAKBundleHash } from "../lib/content-factory/wave-l-audit.ts";

test("Wave L reconciles frozen A-K without production content or hash drift", () => {
  const audit = auditWaveL();
  assert.equal(audit.status, "PASSED"); assert.deepEqual(audit.errors, []);
  assert.equal(audit.frozen.combinedAKBundleActual, frozenCombinedAKBundleHash);
  assert.deepEqual([audit.totals.questions, audit.totals.skills, audit.totals.units], [2772, 338, 176]);
  assert.equal(audit.totals.newProductionQuestions, 0);
  assert.deepEqual(audit.migrationInventory, { count: 44, first: audit.migrationInventory.first,
    last: audit.migrationInventory.last, changed: false });
  assert.match(audit.migrationInventory.first ?? "", /^0001_/u); assert.match(audit.migrationInventory.last ?? "", /^0044_/u);
});

test("Wave L readiness is truthful and every bounded proof is invariant-clean", () => {
  const audit = auditWaveL();
  assert.deepEqual(audit.totals.readiness, { ADAPTIVE_READY: 274, FIXED_RUNTIME_ONLY: 0, SHADOW_ONLY: 51,
    POOL_LIMITED_FAIL_CLOSED: 13, EVIDENCE_LIMITED: 0, UNAVAILABLE: 0 });
  assert.equal(audit.inventories[0]!.executionMode, "LOCAL_SHADOW_ONLY");
  assert.equal(audit.inventories[0]!.fixedRuntimeCompatibility, "GRADE_ONE_FIXED_RUNTIME_UNCHANGED");
  assert.ok(audit.properties.every((proof) => proof.invariantViolations.length === 0));
  assert.ok(audit.totals.visitedStates > 2_000); assert.equal(audit.totals.visitedStates, audit.totals.visitedTransitions);
});

test("Wave L generated artifacts reconcile with the executable audit", () => {
  const audit = auditWaveL();
  const compatibility = JSON.parse(readFileSync("content/grade-packs/generated/wave-l-combined-a-k-runtime-compatibility.json", "utf8"));
  const stateMachine = JSON.parse(readFileSync("content/grade-packs/generated/wave-l-state-machine-report.json", "utf8"));
  assert.equal(compatibility.compatibilityHash, audit.compatibility.compatibilityHash);
  assert.equal(compatibility.frozenCombinedAKBundleHash, frozenCombinedAKBundleHash);
  assert.equal(stateMachine.totals.invariantViolations, 0);
});
