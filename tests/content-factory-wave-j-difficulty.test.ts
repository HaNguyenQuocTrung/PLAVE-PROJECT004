import test from "node:test";
import assert from "node:assert/strict";
import { auditWaveJ } from "../lib/content-factory/wave-j-audit.ts";
import { buildWaveJAdaptiveDepthPolicy } from "../lib/content-factory/wave-j.ts";

test("all Wave J difficulty labels have machine-checkable contract evidence", () => {
  const evidence = auditWaveJ().rows.flatMap((row) => row.difficultyEvidence);
  assert.equal(evidence.length, 30); assert.ok(evidence.every((row) => row.machineVerified));
  assert.ok(evidence.every((row) => row.basis === "CONTRACT_DERIVED" && !row.pedagogicalEffectivenessClaim));
  assert.ok(new Set(evidence.map((row) => row.level)).has("ADVANCED"));
});

test("adaptive depth policy prevents one-answer promotion and calculation-slip over-remediation", () => {
  for (let grade = 1; grade <= 9; grade += 1) {
    const policy = buildWaveJAdaptiveDepthPolicy(grade as never);
    assert.equal(policy.promotionEvidence.singleCorrectPromotes, false);
    assert.equal(policy.promotionEvidence.minimumDistinctCorrectStructures, 2);
    assert.equal(policy.calculationSlip.deepRemediation, false);
    assert.equal(policy.noRepeatSelector.maximumAttempts, 6);
    assert.equal(policy.schoolGradeMutation, false); assert.equal(policy.entitlementGrant, false);
  }
});
