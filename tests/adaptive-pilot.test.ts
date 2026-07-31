import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  parseAdaptivePilotAllowlist,
  parseAdaptivePilotAvailability,
  parseAdaptiveRuntimeFeatureFlags,
  resolveConfiguredAdaptivePilotGate,
  resolveControlledPilotEligibility,
  type AdaptivePilotEnvironment,
} from "../lib/practice/adaptive-pilot.ts";

const studentA = "11111111-1111-4111-8111-111111111111";
const studentB = "22222222-2222-4222-8222-222222222222";
const enabledEnvironment: AdaptivePilotEnvironment = {
  PLAVE_ADAPTIVE_PILOT_USER_IDS: studentA,
  PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED: "true",
  PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED: "true",
  PLAVE_CONTROLLED_PILOT_ENABLED: "true",
  PLAVE_RETENTION_RUNTIME_ENABLED: "false",
};

test("Sprint 6J allowlist defaults to empty and deny-all", () => {
  const parsed = parseAdaptivePilotAllowlist(undefined);
  assert.deepEqual(parsed, { status: "NOT_CONFIGURED", userIds: [] });
  assert.deepEqual(resolveControlledPilotEligibility(studentA, parsed), {
    status: "NOT_CONFIGURED",
  });
});

test("Sprint 6J allowlist validates UUIDs, trims and removes duplicates", () => {
  assert.deepEqual(
    parseAdaptivePilotAllowlist(` ${studentA},${studentB},${studentA} `),
    { status: "VALID", userIds: [studentA, studentB] },
  );
});

test("Sprint 6J malformed allowlist fails closed without partial access", () => {
  for (const raw of [
    "not-a-uuid",
    `${studentA},`,
    `${studentA};${studentB}`,
    Array.from({ length: 21 }, () => studentA).join(","),
  ]) {
    const parsed = parseAdaptivePilotAllowlist(raw);
    assert.deepEqual(parsed, {
      status: "MALFORMED_CONFIGURATION",
      userIds: [],
    });
    assert.deepEqual(resolveControlledPilotEligibility(studentA, parsed), {
      status: "MALFORMED_CONFIGURATION",
    });
  }
});

test("Sprint 6J eligible and ineligible identities are resolved server-side", () => {
  const parsed = parseAdaptivePilotAllowlist(
    `${studentA.toUpperCase()},${studentB}`,
  );
  assert.deepEqual(resolveControlledPilotEligibility(studentA, parsed), {
    status: "ELIGIBLE",
  });
  assert.deepEqual(
    resolveControlledPilotEligibility(
      "33333333-3333-4333-8333-333333333333",
      parsed,
    ),
    { status: "NOT_ELIGIBLE" },
  );
});

test("Sprint 6J feature flags accept only explicit server booleans", () => {
  assert.deepEqual(parseAdaptiveRuntimeFeatureFlags({}), {
    status: "VALID",
    flags: {
      GRADE2_NUMBERS_TO_1000_ENABLED: false,
      ADAPTIVE_PRACTICE_RUNTIME_ENABLED: false,
      CONTROLLED_PILOT_ENABLED: false,
      RETENTION_RUNTIME_ENABLED: false,
    },
  });
  assert.equal(
    parseAdaptiveRuntimeFeatureFlags({
      PLAVE_CONTROLLED_PILOT_ENABLED: "yes",
    }).status,
    "MALFORMED_CONFIGURATION",
  );
});

test("Sprint 6J app gate requires flags and the exact allowlisted user", () => {
  assert.deepEqual(
    resolveConfiguredAdaptivePilotGate(studentA, enabledEnvironment),
    {
      kind: "RPC_ALLOWED",
      visibilityMode: "CONTROLLED_PILOT_HIDDEN",
      databaseReleaseActivation: "ENFORCED_BY_RPC",
      databaseRuntimeActivation: "ENFORCED_BY_RPC",
      databasePilotMembership: "ENFORCED_BY_RPC",
    },
  );
  assert.deepEqual(
    resolveConfiguredAdaptivePilotGate(studentB, enabledEnvironment),
    { kind: "DENIED", reason: "PILOT_NOT_ELIGIBLE" },
  );
  assert.deepEqual(resolveConfiguredAdaptivePilotGate(studentA, {}), {
    kind: "DENIED",
    reason: "APPLICATION_FEATURE_DISABLED",
  });
});

test("Sprint 6J frozen database availability must match every binding", () => {
  const valid = {
    available: true,
    unit_slug: "grade-2-numbers-to-1000",
    release_candidate_id: "g2-numbers-to-1000-rc1",
    content_version: "g2n1000-1.0.0-rc.1",
    bundle_sha256:
      "1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530",
    policy_version: "g2n1000-adaptive-policy-1.0.0-pilot",
  };
  assert.ok(parseAdaptivePilotAvailability(valid));
  assert.equal(
    parseAdaptivePilotAvailability({
      ...valid,
      bundle_sha256: "0".repeat(64),
    }),
    null,
  );
  assert.equal(
    parseAdaptivePilotAvailability({
      ...valid,
      correct_answer: "A",
    }),
    null,
  );
});

test("Sprint 6J adaptive routes require the server pilot resolver", () => {
  for (const path of [
    "app/api/adaptive-practice/start/route.ts",
    "app/api/adaptive-practice/state/route.ts",
    "app/api/adaptive-practice/answer/route.ts",
    "app/adaptive-practice/[attemptId]/page.tsx",
  ]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /resolveServerAdaptivePilotAccess/);
    assert.match(source, /getStudentLearningContext/);
    assert.doesNotMatch(source, /NEXT_PUBLIC|service[_-]?role/i);
    assert.doesNotMatch(
      source,
      /[.]from\(["']question_solutions["']\)/,
    );
  }
});

test("Sprint 6J pilot CTA is isolated from common catalog and recommendation", () => {
  const lessons = readFileSync("app/lessons/page.tsx", "utf8");
  const dashboard = readFileSync("app/dashboard/page.tsx", "utf8");
  const learn = readFileSync("app/learn/page.tsx", "utf8");
  const personalized = readFileSync(
    "lib/personalized-path/server.ts",
    "utf8",
  );

  assert.match(lessons, /ControlledPilotCard/);
  assert.match(dashboard, /ControlledPilotCard/);
  assert.doesNotMatch(learn, /ControlledPilotCard/);
  assert.match(personalized, /[.]eq\("published", true\)/);
  assert.match(personalized, /loadServerAdaptivePilotUnit/);
  assert.match(personalized, /controlledPilotUnit/);
});

test("Sprint 6J source contains no committed pilot identity or allowlist logging", () => {
  const source = [
    "lib/practice/adaptive-pilot.ts",
    "lib/practice/adaptive-pilot-server.ts",
    "scripts/check-controlled-pilot-env.ts",
    "components/ControlledPilotCard.tsx",
  ]
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");

  assert.doesNotMatch(source, /NEXT_PUBLIC/);
  assert.doesNotMatch(
    source,
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
  );
  assert.doesNotMatch(
    source,
    /console[.](?:log|error)\([^)]*(?:userIds|PLAVE_ADAPTIVE_PILOT_USER_IDS)/,
  );
});
