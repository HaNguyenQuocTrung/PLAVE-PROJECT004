import { strict as assert } from "node:assert";
import test from "node:test";
import { parseAdaptivePilotEntitlements, resolveConfiguredAdaptivePilotAccess } from "../lib/practice/adaptive-pilot.ts";

const id = "11111111-1111-4111-8111-111111111111";
const entitlement = { userId: id, grade: 2, candidateId: "g2-numbers-to-1000-rc1", candidateVersion: "g2n1000-1.0.0-rc.1", bundleHash: "1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530", policyVersion: "g2n1000-adaptive-policy-1.0.0-pilot" };

test("generalized entitlement selects exact candidate and denies all malformed drift", () => {
  const env = { PLAVE_ADAPTIVE_PILOT_ENTITLEMENTS: JSON.stringify({ version: 1, entitlements: [entitlement] }), PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED: "true", PLAVE_CONTROLLED_PILOT_ENABLED: "true", PLAVE_RETENTION_RUNTIME_ENABLED: "false" };
  const allowed = resolveConfiguredAdaptivePilotAccess(id, 2, env, "grade-2-numbers-to-1000"); assert.equal(allowed.gate.kind, "RPC_ALLOWED"); assert.equal(allowed.candidate?.bundleSha256, entitlement.bundleHash);
  assert.equal(resolveConfiguredAdaptivePilotAccess(id, 3, env).gate.kind, "DENIED");
  assert.deepEqual(parseAdaptivePilotEntitlements(""), { status: "NOT_CONFIGURED", entitlements: [] });
});
