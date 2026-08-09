import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ownerLocalHealthContract,
  parseOwnerLocalHealth,
} from "../lib/owner-local-health-contract.ts";
import { getSupabasePublicEnv } from "../lib/supabase/env.ts";
import {
  buildOwnerLocalChildEnvironment,
  evaluateOwnerLocalPreflight,
  ownerLocalHealthFlagFailure,
  ownerLocalPreflightCheckNames,
  parseOwnerLocalManagedState,
  parseSupabaseStatusEnvironment,
  waitForOwnerLocalHealth,
  withOwnerLocalManagedState,
} from "../scripts/owner-local-demo-support.ts";
import { perGradeCheckNames } from "../scripts/universal-collaboration-evidence.ts";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const packageJson = JSON.parse(source("package.json")) as {
  scripts: Record<string, string>;
};
const activation = source(
  "supabase/operations/activate_0038_universal_curriculum_owner_local_demo.sql",
);
const deactivation = source(
  "supabase/operations/deactivate_0038_universal_curriculum_local.sql",
);
const support = source("scripts/owner-local-demo-support.ts");
const preflight = source("scripts/preflight-owner-local-demo.ts");
const start = source("scripts/start-owner-local-demo.ts");
const nextConfig = source("next.config.ts");
const proxy = source("proxy.ts");
const ownerHealthRoute = source(
  "app/api/internal/owner-local-health/route.ts",
);
const runtimeDiagnostic = source(
  "scripts/diagnose-owner-local-runtime.ts",
);
const runtimeLogger = source("lib/runtime-diagnostics/server.ts");
const stop = source("scripts/stop-owner-local-demo.ts");
const invitation = source(
  "scripts/create-owner-local-teacher-invitation.ts",
);
const status = JSON.parse(
  source("docs/operations/PARENT_TEACHER_UNIVERSAL_RUNTIME_STATUS.json"),
) as {
  decision: string;
  perGradeEvidenceMatrix: Array<Record<string, unknown>>;
  ownerLocalDemo: Record<string, unknown>;
};

test("Owner local demo commands are loopback-only and never print local keys", () => {
  for (const command of [
    "owner-local-demo:preflight",
    "owner-local-demo:start",
    "owner-local-demo:stop",
    "owner-local-demo:teacher-invite",
  ]) {
    assert.ok(packageJson.scripts[command]);
  }

  assert.match(
    support,
    /new Set\(\["127\.0\.0\.1", "localhost", "::1"\]\)/,
  );
  assert.match(support, /supabase", \["status", "-o", "env"\]/);
  assert.match(support, /REMOTE_TARGET=NONE_LOOPBACK_ONLY/);
  assert.doesNotMatch(
    `${support}\n${start}\n${stop}\n${invitation}`,
    /(?:console\.log|process\.stdout\.write)\([^)]*(?:publishableKey|ANON_KEY|PGPASSWORD|databaseUrl)/,
  );
  assert.match(invitation, /loadOwnerLocalSupabase\(\)/);
  assert.match(invitation, /private\.issue_teacher_invitation/);
  assert.match(invitation, /private\.revoke_teacher_invitation/);
  assert.match(invitation, /INVITATION_COUNT=/);
  assert.match(invitation, /PLAINTEXT_PERSISTED=NO/);
  assert.doesNotMatch(invitation, /writeFileSync|INVITATION_FILE=/);
  assert.doesNotMatch(
    `${start}\n${stop}`,
    /\b(?:db push|supabase link|--linked|deploy|publication)\b/i,
  );
  assert.match(
    start,
    /"--hostname",\s*"127\.0\.0\.1",\s*"--port",\s*String\(ownerLocalAppPort\)/,
  );
  assert.match(start, /startOwnerLocalSupabase\(\)/);
  assert.match(start, /stopOwnerLocalSupabase\(\)/);
  assert.match(stop, /OWNER_LOCAL_ACCEPTANCE_DATA=REMOVED/);
  assert.match(support, /const ownerLocalMigrationCount = 44/);
  assert.match(support, /get_parent_child_score_xp_mastery\(uuid\)/);
  assert.match(support, /get_parent_child_motivation_v1\(uuid\)/);
  for (const command of Object.values(packageJson.scripts).filter((value) =>
    value.includes("owner-local-demo"),
  )) {
    assert.doesNotMatch(command, /--env-file/);
  }

  const parsed = parseSupabaseStatusEnvironment(
    [
      'API_URL="http://127.0.0.1:54321"',
      'ANON_KEY="local-public-test-value-without-real-secret"',
      'DB_URL="postgresql://local:local@127.0.0.1:54322/postgres"',
    ].join("\n"),
  );
  assert.equal(parsed.get("API_URL"), "http://127.0.0.1:54321");
  assert.equal(
    parsed.get("ANON_KEY"),
    "local-public-test-value-without-real-secret",
  );
});

test("Owner local activation is exact, reversible and keeps adaptive pilot disabled", () => {
  for (const count of ["171", "2052", "546"]) {
    assert.match(activation, new RegExp(`<> ${count}`));
  }
  assert.match(activation, /status = 'ACTIVE'/);
  assert.match(activation, /activation_state = 'ACTIVE'/);
  assert.match(activation, /controlled_pilot_enabled/);
  assert.match(activation, /runtime_enabled/);
  assert.match(activation, /retention_runtime_enabled/);
  assert.match(activation, /publication_status <> 'DRAFT'/);
  assert.match(activation, /student_visibility <> 'HIDDEN'/);
  assert.doesNotMatch(activation, /\bdelete\s+from\b/i);
  assert.doesNotMatch(
    activation,
    /update\s+public\.adaptive_practice_releases/i,
  );

  assert.match(deactivation, /status = 'DRAFT'/);
  assert.match(deactivation, /activation_state = 'INACTIVE'/);
  assert.doesNotMatch(
    deactivation,
    /\bdelete\s+from\s+public\.(?:curriculum_attempts|curriculum_answers|student_curriculum_)/i,
  );
  assert.match(support, /PLAVE_CURRICULUM_RUNTIME_ENABLED: "true"/);
  assert.match(support, /PLAVE_CONTROLLED_PILOT_ENABLED: "false"/);
  assert.match(support, /PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED: "false"/);
  assert.match(support, /PLAVE_ADAPTIVE_PILOT_USER_IDS: ""/);
  assert.doesNotMatch(preflight, /setOwnerLocalDemoFlags|process[.]env/);
  assert.match(preflight, /assertOwnerLocalDemoPreflight\(\)/);
  assert.match(start, /withOwnerLocalManagedState/);
});

test("Supabase public URL policy permits HTTP loopback but rejects insecure remote URLs", () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "local-public-key";
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    assert.equal(
      getSupabasePublicEnv().url,
      "http://127.0.0.1:54321",
    );
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://example.com";
    assert.throws(() => getSupabasePublicEnv(), /không hợp lệ/);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "ftp://localhost";
    assert.throws(() => getSupabasePublicEnv(), /không hợp lệ/);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.com";
    assert.equal(getSupabasePublicEnv().url, "https://example.com");
  } finally {
    if (previousUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    }
    if (previousKey === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousKey;
    }
  }
});

test("machine status stays browser NOT_READY despite nine database PASS rows", () => {
  assert.equal(status.decision, "NOT_READY_FOR_OWNER_BROWSER_DEMO");
  assert.equal(
    status.ownerLocalDemo.status,
    "NOT_READY_FOR_OWNER_BROWSER_DEMO",
  );
  assert.equal(status.ownerLocalDemo.productionReadyClaim, false);
  assert.equal(status.perGradeEvidenceMatrix.length, 9);
  assert.deepEqual(
    status.perGradeEvidenceMatrix.map((row) => row.grade),
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  for (const row of status.perGradeEvidenceMatrix) {
    assert.equal(row.evidenceType, "LIVE_LOCAL_DATABASE");
    assert.equal(row.overall, "PASS");
    for (const check of perGradeCheckNames) {
      assert.equal(row[check], "PASS");
    }
  }
});

test("start command cannot advertise browser readiness before Owner retest", () => {
  assert.match(start, /NOT_READY_FOR_OWNER_BROWSER_DEMO/);
  assert.match(start, /OWNER_LOCAL_DEMO_RUNTIME_DIAGNOSTIC_MODE/);
  assert.doesNotMatch(start, /process\.stdout\.write\("OWNER_LOCAL_DEMO_READY/);
  assert.match(start, /buildOwnerLocalChildEnvironment/);
  assert.match(
    start,
    /withOwnerLocalManagedState\([\s\S]*assertOwnerLocalDemoPreflight/,
  );
  assert.match(nextConfig, /\.next-owner-local-project004/);
  assert.match(nextConfig, /incomingRequests: false/);
});

test("child environment carries exact runtime and disabled adaptive flags", () => {
  const environment = buildOwnerLocalChildEnvironment(
    {
      apiUrl: "http://127.0.0.1:54321",
      publishableKey: "local-public-test-value-without-real-secret",
      databaseUrl: new URL(
        "postgresql://local:local@127.0.0.1:54322/postgres",
      ),
    },
    "a".repeat(64),
    { NODE_ENV: "test" },
  );
  assert.equal(environment.PLAVE_CURRICULUM_RUNTIME_ENABLED, "true");
  assert.equal(environment.PLAVE_ON_DEMAND_GENERATION_ENABLED, "true");
  assert.equal(environment.PLAVE_OWNER_LOCAL_DEMO, "true");
  assert.equal(environment.PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED, "false");
  assert.equal(
    environment.PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED,
    "false",
  );
  assert.equal(environment.PLAVE_CONTROLLED_PILOT_ENABLED, "false");
  assert.equal(environment.PLAVE_RETENTION_RUNTIME_ENABLED, "false");
  assert.equal(environment.PLAVE_ADAPTIVE_PILOT_USER_IDS, "");
  assert.equal((environment as NodeJS.ProcessEnv).GOOGLE_API_KEY, "");
  assert.equal(
    (environment as NodeJS.ProcessEnv).SUPABASE_SERVICE_ROLE_KEY,
    "",
  );
  assert.equal(
    environment.PLAVE_GENERATED_PRACTICE_RUNTIME_ENABLED,
    "true",
  );
  assert.equal(environment.PLAVE_GENERATED_PRACTICE_MODE, "SHADOW");
});

test("health readiness tolerates Next Ready before route compilation", async () => {
  let clockMs = 0;
  const observations = [
    { status: "ENDPOINT_NOT_READY" as const },
    { status: "ENDPOINT_NOT_READY" as const },
    {
      status: "READY" as const,
      health: {
        status: "OK" as const,
        ...ownerLocalHealthContract,
        ownerMode: true as const,
        runtimeEnabled: true,
        adaptivePilotDisabled: true,
        onDemandGenerationEnabled: true,
      },
    },
  ];
  const result = await waitForOwnerLocalHealth({
    deadlineMs: 1_000,
    retryIntervalMs: 100,
    now: () => clockMs,
    sleep: async (durationMs) => {
      clockMs += durationMs;
    },
    probe: async () =>
      observations.shift() ?? {
        status: "ENDPOINT_NOT_READY" as const,
      },
  });
  assert.equal(result.ok, true);
  assert.equal(result.attempts, 3);
  assert.equal(clockMs, 200);
});

test("health readiness distinguishes malformed response and timeout", async () => {
  const malformed = await waitForOwnerLocalHealth({
    deadlineMs: 1_000,
    probe: async () => ({ status: "MALFORMED_RESPONSE" }),
  });
  assert.deepEqual(malformed, {
    ok: false,
    code: "APP_HEALTH_MALFORMED_RESPONSE",
    attempts: 1,
  });

  let clockMs = 0;
  const timeout = await waitForOwnerLocalHealth({
    deadlineMs: 250,
    retryIntervalMs: 100,
    now: () => clockMs,
    sleep: async (durationMs) => {
      clockMs += durationMs;
    },
    probe: async () => ({ status: "ENDPOINT_NOT_READY" }),
  });
  assert.deepEqual(timeout, {
    ok: false,
    code: "APP_HEALTH_READINESS_TIMEOUT",
    attempts: 4,
  });
});

test("valid health reports actual app flag mismatch independently", () => {
  const healthy = {
    status: "OK" as const,
    ...ownerLocalHealthContract,
    ownerMode: true as const,
    runtimeEnabled: true,
    adaptivePilotDisabled: true,
    onDemandGenerationEnabled: true,
  };
  assert.equal(ownerLocalHealthFlagFailure(healthy), null);
  assert.equal(
    ownerLocalHealthFlagFailure({
      ...healthy,
      adaptivePilotDisabled: false,
    }),
    "APP_ADAPTIVE_PILOT_CONFIGURATION_INVALID",
  );
});

test("managed marker exists during preflight and is always removed", async () => {
  const successEvents: string[] = [];
  await withOwnerLocalManagedState(
    101,
    202,
    async () => {
      successEvents.push("preflight");
    },
    {
      write: () => successEvents.push("write"),
      remove: () => successEvents.push("remove"),
    },
  );
  assert.deepEqual(successEvents, ["write", "preflight", "remove"]);

  const failureEvents: string[] = [];
  await assert.rejects(
    withOwnerLocalManagedState(
      101,
      202,
      async () => {
        failureEvents.push("preflight");
        throw new Error("simulated health failure");
      },
      {
        write: () => failureEvents.push("write"),
        remove: () => failureEvents.push("remove"),
      },
    ),
    /simulated health failure/,
  );
  assert.deepEqual(failureEvents, ["write", "preflight", "remove"]);
});

test("managed PID/cache marker fails closed on foreign identity", () => {
  const validMarker = {
    version: 1,
    project: ownerLocalHealthContract.project,
    cacheIdentity: ownerLocalHealthContract.cacheIdentity,
    managerPid: 101,
    childPid: 202,
  };
  assert.equal(
    parseOwnerLocalManagedState(validMarker).identityValid,
    true,
  );
  assert.equal(
    parseOwnerLocalManagedState({
      ...validMarker,
      project: "FOREIGN_PROJECT",
    }).identityValid,
    false,
  );
  assert.equal(
    parseOwnerLocalManagedState({
      ...validMarker,
      cacheIdentity: "FOREIGN_CACHE",
    }).identityValid,
    false,
  );
});

test("runtime diagnostics expose safe timing without identity-bearing logs", () => {
  for (const field of [
    "correlation_id",
    "api_path",
    "http_status",
    "server_error_code",
    "duration_ms",
    "stages_ms",
  ]) {
    assert.match(runtimeLogger, new RegExp(field));
  }
  assert.match(runtimeLogger, /Server-Timing/);
  assert.match(runtimeLogger, /X-PLAVE-Correlation-ID/);
  assert.doesNotMatch(
    runtimeLogger,
    /\b(?:email|user_id|student_id|attempt_id|token|authorization|apikey|publishableKey)\b/i,
  );
  assert.match(runtimeDiagnostic, /new URL\(path, appOrigin\)\.pathname/);
  assert.doesNotMatch(
    runtimeDiagnostic,
    /process\.stdout\.write\([^)]*(?:syntheticEmail|syntheticPassword|attemptId|questionId)/,
  );
});

test("standalone preflight trusts observed child health without inheriting child env", () => {
  const previousRuntime =
    process.env.PLAVE_CURRICULUM_RUNTIME_ENABLED;
  delete process.env.PLAVE_CURRICULUM_RUNTIME_ENABLED;
  try {
    const healthyFacts = {
      supabaseHealthy: true,
      migrationsValid: true,
      releaseCountsValid: true,
      releaseState: "ACTIVE" as const,
      adaptiveDatabaseDisabled: true,
      appPortManaged: true,
      healthObserved: true,
      healthRuntimeEnabled: true,
      healthAdaptivePilotDisabled: true,
      healthOnDemandGenerationEnabled: true,
      managedPidCacheIdentity: true,
    };
    const checks = evaluateOwnerLocalPreflight(healthyFacts);
    assert.deepEqual(
      ownerLocalPreflightCheckNames.map((name) => checks[name]),
      ownerLocalPreflightCheckNames.map(() => true),
    );

    assert.equal(
      evaluateOwnerLocalPreflight({
        ...healthyFacts,
        managedPidCacheIdentity: false,
      }).MANAGED_PID_CACHE_IDENTITY,
      false,
    );
    assert.equal(
      evaluateOwnerLocalPreflight({
        ...healthyFacts,
        appPortManaged: false,
      }).APP_PORT,
      false,
    );
    assert.equal(
      evaluateOwnerLocalPreflight({
        ...healthyFacts,
        healthRuntimeEnabled: false,
      }).RELEASE_RUNTIME_CONSISTENCY,
      false,
    );
    assert.equal(
      evaluateOwnerLocalPreflight({
        ...healthyFacts,
        releaseState: "INACTIVE",
      }).RELEASE_RUNTIME_CONSISTENCY,
      false,
    );
  } finally {
    if (previousRuntime === undefined) {
      delete process.env.PLAVE_CURRICULUM_RUNTIME_ENABLED;
    } else {
      process.env.PLAVE_CURRICULUM_RUNTIME_ENABLED =
        previousRuntime;
    }
  }
});

test("Owner health contract is loopback-only, exact and identity-free", () => {
  const payload = {
    status: "OK",
    ...ownerLocalHealthContract,
    ownerMode: true,
    runtimeEnabled: true,
    adaptivePilotDisabled: true,
    onDemandGenerationEnabled: true,
  };
  assert.deepEqual(parseOwnerLocalHealth(payload), payload);
  assert.equal(
    parseOwnerLocalHealth({ ...payload, token: "forbidden" }),
    null,
  );
  assert.match(ownerHealthRoute, /new Set\(\["127\.0\.0\.1", "localhost", "::1"\]\)/);
  assert.match(ownerHealthRoute, /PLAVE_OWNER_LOCAL_DEMO !== "true"/);
  assert.match(ownerHealthRoute, /Cache-Control/);
  assert.doesNotMatch(
    ownerHealthRoute,
    /\b(?:email|userId|studentId|attemptId|questionId|authorization|apikey|publishableKey)\b/,
  );
  assert.match(proxy, /api\/internal\/owner-local-health/);
  for (const checkName of ownerLocalPreflightCheckNames) {
    assert.match(support, new RegExp(checkName));
  }
  for (const generatedEvidenceRpc of [
    "public.get_my_generated_curriculum_evidence()",
    "public.get_parent_child_generated_curriculum_progress(uuid)",
  ]) {
    assert.match(
      support,
      new RegExp(generatedEvidenceRpc.replace(/[().]/g, "\\$&")),
    );
  }
  assert.doesNotMatch(
    support,
    /process[.]env[.]PLAVE_CURRICULUM_RUNTIME_ENABLED\s*!==/,
  );
});
