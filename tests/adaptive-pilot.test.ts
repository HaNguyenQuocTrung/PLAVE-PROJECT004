import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  parseAdaptivePilotAvailability,
  parseAdaptivePilotEntitlements,
  parseAdaptiveRuntimeFeatureFlags,
  resolveConfiguredAdaptivePilotAccess,
  type AdaptivePilotEnvironment,
} from "../lib/practice/adaptive-pilot.ts";
import { gradeTwoNumbersTo1000PublicationState } from "../lib/practice/runtime-flags.ts";

const studentA = "11111111-1111-4111-8111-111111111111";
const binding = {
  userId: studentA, grade: 2, candidateId: "g2-numbers-to-1000-rc1", candidateVersion: "g2n1000-1.0.0-rc.1",
  bundleHash: "1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530", policyVersion: "g2n1000-adaptive-policy-1.0.0-pilot",
};
const enabled: AdaptivePilotEnvironment = {
  PLAVE_ADAPTIVE_PILOT_ENTITLEMENTS: JSON.stringify({ version: 1, entitlements: [binding] }),
  PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED: "true", PLAVE_CONTROLLED_PILOT_ENABLED: "true", PLAVE_RETENTION_RUNTIME_ENABLED: "false",
};

test("Sprint 6K entitlements default deny and bind every candidate dimension", () => {
  assert.deepEqual(parseAdaptivePilotEntitlements(undefined), { status: "NOT_CONFIGURED", entitlements: [] });
  assert.equal(parseAdaptivePilotEntitlements(enabled.PLAVE_ADAPTIVE_PILOT_ENTITLEMENTS).status, "VALID");
  assert.equal(resolveConfiguredAdaptivePilotAccess(studentA, 2, enabled).gate.kind, "RPC_ALLOWED");
  for (const change of [{ grade: 3 }, { candidateId: "unrelated-candidate" }, { bundleHash: "0".repeat(64) }, { policyVersion: "other-policy" }]) {
    const environment = { ...enabled, PLAVE_ADAPTIVE_PILOT_ENTITLEMENTS: JSON.stringify({ version: 1, entitlements: [{ ...binding, ...change }] }) };
    assert.equal(resolveConfiguredAdaptivePilotAccess(studentA, 2, environment).gate.kind, "DENIED");
  }
});

test("Sprint 6K malformed, duplicate and noncanonical entitlement configuration fails closed", () => {
  for (const raw of ["{}", "not-json", JSON.stringify({ version: 1, entitlements: [{ ...binding, extra: true }] }), JSON.stringify({ version: 1, entitlements: [binding, binding] }), JSON.stringify({ version: 1, entitlements: [{ ...binding, candidateId: binding.candidateId.toUpperCase() }] })]) {
    assert.equal(parseAdaptivePilotEntitlements(raw).status, "MALFORMED_CONFIGURATION");
  }
});

test("Sprint 6K feature flags are generic, server-only and explicit", () => {
  assert.deepEqual(parseAdaptiveRuntimeFeatureFlags({}).flags, { ADAPTIVE_PRACTICE_RUNTIME_ENABLED: false, CONTROLLED_PILOT_ENABLED: false, RETENTION_RUNTIME_ENABLED: false });
  assert.equal(parseAdaptiveRuntimeFeatureFlags({ PLAVE_CONTROLLED_PILOT_ENABLED: "yes" }).status, "MALFORMED_CONFIGURATION");
  assert.equal(Object.keys(parseAdaptiveRuntimeFeatureFlags({}).flags).some((key) => key.includes("GRADE2")), false);
});

test("Sprint 6K database availability matches the selected exact binding", () => {
  const valid = { available: true, unit_slug: binding.candidateId.replace("g2-numbers-to-1000-rc1", "grade-2-numbers-to-1000"), release_candidate_id: binding.candidateId, content_version: binding.candidateVersion, bundle_sha256: binding.bundleHash, policy_version: binding.policyVersion };
  assert.ok(parseAdaptivePilotAvailability(valid, gradeTwoNumbersTo1000PublicationState));
  assert.equal(parseAdaptivePilotAvailability({ ...valid, bundle_sha256: "0".repeat(64) }, gradeTwoNumbersTo1000PublicationState), null);
  assert.equal(parseAdaptivePilotAvailability({ ...valid, correct_answer: "A" }, gradeTwoNumbersTo1000PublicationState), null);
});

test("Sprint 6K adaptive routes and common-surface isolation fail closed", () => {
  for (const path of ["app/api/adaptive-practice/start/route.ts", "app/api/adaptive-practice/state/route.ts", "app/api/adaptive-practice/answer/route.ts", "app/adaptive-practice/[attemptId]/page.tsx"]) {
    const source = readFileSync(path, "utf8"); assert.match(source, /resolveServerAdaptivePilotAccess/); assert.match(source, /getStudentLearningContext/); assert.doesNotMatch(source, /NEXT_PUBLIC|service[_-]?role/iu); assert.doesNotMatch(source, /[.]from\(["']question_solutions["']\)/u);
  }
  const personalized = readFileSync("lib/personalized-path/server.ts", "utf8");
  assert.match(personalized, /[.]eq\("published", true\)/u); assert.match(personalized, /loadServerAdaptivePilotUnit/u);
});

test("Sprint 6K entitlement implementation logs no identity and contains no hard-coded identity", () => {
  const source = ["lib/practice/adaptive-pilot.ts", "lib/practice/adaptive-pilot-server.ts", "scripts/check-controlled-pilot-env.ts"].map((path) => readFileSync(path, "utf8")).join("\n");
  assert.doesNotMatch(source, /NEXT_PUBLIC/u); assert.doesNotMatch(source, /console[.](?:log|error)\([^)]*(?:userId|ENTITLEMENTS)/u);
  assert.doesNotMatch(source.replace(/UUID_PATTERN[\s\S]*?;/u, ""), /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/iu);
});
