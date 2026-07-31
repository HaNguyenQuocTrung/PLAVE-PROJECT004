import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import test from "node:test";

import { buildProject004RemoteDevCurriculumSql } from "../scripts/project004-remote-dev-curriculum.ts";
import {
  loadAndVerifyCleanDisposableProofReceipt,
  verifyCleanDisposableProofReceipt,
  type CleanDisposableProofReceipt,
} from "../scripts/project004-clean-disposable-proof.ts";
import {
  buildProject004PrefixObjectInventory,
  buildProject004RemoteBaselineClassificationSql,
  buildProject004ForeignObjectInspectionSql,
  buildProject004RemoteObjectInventory,
} from "../scripts/project004-remote-dev-baseline.ts";
import {
  createAuditedRemoteIncidentRunner,
  createAuditedRemoteDevRunner,
  createAuditedRemoteDevApplyOnceRunner,
  executeAuthorizedRemoteDevDryRun,
  isReadOnlySqlCommand,
} from "../scripts/project004-remote-dev-audited-runner.ts";
import {
  executeAuthorizedRemoteDevApplyOnce,
  notRunApplyOnceReport,
  parseMigrationProgress,
} from "../scripts/project004-remote-dev-apply-once.ts";
import {
  renderApplyOnceReport,
  runProject004RemoteDevApplyCommand,
} from "../scripts/apply-project004-remote-dev.ts";
import {
  inspectProject004RemoteForeignObject,
  parseSafeForeignObjectInspection,
  renderSafeForeignObjectInspection,
} from "../scripts/inspect-project004-remote-foreign-object.ts";
import {
  readMaskedLineFromControllingTty,
  type SecureTtyAdapter,
} from "../scripts/project004-secure-tty-prompt.ts";
import {
  RemoteDevGuardFailure,
  assertLinkedTarget,
  assertRemoteDevTarget,
  loadAndVerifyMigrationPlan,
  project004RemoteDevContract,
  withEphemeralRemoteCliMetadata,
  withEphemeralLinkedProjectRef,
  type RemoteDevPrivateConfig,
} from "../scripts/project004-remote-dev-guard.ts";
import {
  buildResolvedRemoteCliEnvironment,
  resolvedRemotePoolerUrl,
  type ResolvedRemoteDatabaseEndpoint,
} from "../scripts/project004-remote-connectivity-resolver.ts";
import {
  buildCanonicalCliAuthContext,
  classifyCliAuthCommandFailure,
  runCanonicalSupabaseCliAuthCheck,
} from "../scripts/project004-supabase-cli-auth.ts";
import {
  isRemoteEmpty,
  inspectProject004DryRunResult,
  parseRemoteBaselineCounts,
  project004PostApplyPayloadSentinel,
  renderRemoteDevPreflight,
  runLocalRemoteDevPreflight,
  runRemoteDevPreflight,
  verifyDryRunOutput,
  verifyProject004DryRunResult,
  type RemoteDevCommandRunner,
} from "../scripts/project004-remote-dev-operations.ts";
import {
  runRemoteDevPreflightDryRunCommand,
  runSecurePromptSmoke,
} from "../scripts/run-project004-remote-dev-preflight-dry-run.ts";
import {
  auditPriorDryRunConstruction,
  buildIncidentDataAuditSql,
  buildIncidentObjectAuditSql,
  classifyIncidentMigrationHistory,
  executeRemotePartialStateIncidentAudit,
} from "../scripts/project004-remote-partial-state-audit.ts";
import {
  renderRemotePartialStateAudit,
  runProject004RemotePartialStateAuditCommand,
} from "../scripts/run-project004-remote-partial-state-audit.ts";

const testProjectRef = "a".repeat(20);
const validConfig: RemoteDevPrivateConfig = {
  projectName: "plave-project004-dev-clean",
  projectRef: testProjectRef,
  databasePassword: "x".repeat(20),
  environmentClass: "EMPTY_DEVELOPMENT",
};
const validEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  PLAVE_PROJECT004_REMOTE_TARGET_NAME: validConfig.projectName,
  PLAVE_PROJECT004_REMOTE_PROJECT_REF: validConfig.projectRef,
  PLAVE_PROJECT004_REMOTE_DB_PASSWORD:
    validConfig.databasePassword,
  PLAVE_PROJECT004_REMOTE_ENVIRONMENT_CLASS:
    validConfig.environmentClass,
};
const validApplyEnvironment: NodeJS.ProcessEnv = {
  ...validEnvironment,
  PLAVE_PROJECT004_REMOTE_OWNER_APPROVAL:
    project004RemoteDevContract.applyApproval,
};

type RemoteBaselineFixture = {
  name: string;
  catalogOutput: string;
  migrationOutput: string | null;
  expectedEmpty: boolean;
  expectedCategory: string;
};

function commandResult(stdout: string, ok = true) {
  return { ok, stdout, stderr: "" };
}

const emptyBaselineOutput = "3709|0|0|0|0|0\n";
const connectivityOutput =
  "PROJECT004_REMOTE_CONNECTIVITY_V1|1\n";
const validPostApplyOutput =
  `${project004PostApplyPayloadSentinel}|` +
  "40|40|0001|0040|1|1|1|0|171|2052|2052|546|0|14|13|336|312|336|24|0|185|2388|2388|0|0|0|1|1|0|0|0|0|0|0|23|18|1|1\n";

function supabaseCli210DryRunResult(
  plan: ReturnType<typeof loadAndVerifyMigrationPlan>["plan"],
  files = plan.migrations.map((entry) => entry.file),
) {
  const bullets = files
    .map(
      (file) =>
        ` \u001B[2K\r • \u001B]8;;file://migration/${file}\u001B\\` +
        `\u001B[1m${file}\u001B[0m\u001B]8;;\u001B\\`,
    )
    .join("\n");
  return {
    ok: true,
    stdout:
      "\u001B[32mFinished \u001B[1msupabase db push\u001B[0m\u001B[32m.\u001B[0m\n",
    stderr:
      "\u001B[33mDRY RUN: migrations will *not* be pushed to the database.\u001B[0m\n" +
      "Connecting to remote database...\n" +
      "Would push these migrations:\n" +
      `${bullets}\n`,
  };
}

function createApplyFixtureRunner(options?: {
  baselineOutput?: string;
  baselineOutputs?: string[];
  schemaPushOk?: boolean;
  schemaProgress?: string;
  contentApplyOk?: boolean;
  rollbackOutput?: string;
  postApplyOutput?: string;
  directConnectivityFailure?: boolean;
}) {
  const { plan } = loadAndVerifyMigrationPlan();
  const calls: string[] = [];
  const databaseContexts: Array<{
    command: string;
    user: string;
    sslMode: string;
  }> = [];
  const baselineOutputs = [
    ...(options?.baselineOutputs ?? []),
  ];
  const runner: RemoteDevCommandRunner = (
    command,
    args,
    environment,
  ) => {
    if (
      command === "psql" ||
      (command === "supabase" && args[0] === "db")
    ) {
      databaseContexts.push({
        command: `${command}:${args.slice(0, 3).join(" ")}`,
        user: environment.PGUSER ?? "",
        sslMode: environment.PGSSLMODE ?? "",
      });
    }
    if (command === "supabase" && args[0] === "projects") {
      calls.push("PROJECTS_LIST");
      return commandResult(
        JSON.stringify([
          {
            id: testProjectRef,
            name: "plave-project004-dev-clean",
            status: "ACTIVE_HEALTHY",
            region: "ap-southeast-1",
          },
        ]),
      );
    }
    if (
      command === "supabase" &&
      args[0] === "db" &&
      args[1] === "push" &&
      args[2] === "--dry-run"
    ) {
      calls.push("DRY_RUN");
      return supabaseCli210DryRunResult(plan);
    }
    if (
      command === "supabase" &&
      args.length === 2 &&
      args[0] === "db" &&
      args[1] === "push"
    ) {
      calls.push("SCHEMA_PUSH");
      return commandResult(
        "",
        options?.schemaPushOk ?? true,
      );
    }
    if (command === "psql" && args.includes("--file")) {
      calls.push("CONTENT_TRANSACTION");
      return commandResult(
        "",
        options?.contentApplyOk ?? true,
      );
    }
    if (command === "psql" && args.includes("--command")) {
      const sql = args[args.indexOf("--command") + 1] ?? "";
      if (sql.includes("PROJECT004_REMOTE_CONNECTIVITY_V1")) {
        calls.push(
          environment.PGUSER === "postgres"
            ? "CONNECTIVITY_DIRECT"
            : "CONNECTIVITY_POOLER",
        );
        if (
          environment.PGUSER === "postgres" &&
          options?.directConnectivityFailure
        ) {
          return {
            ok: false,
            stdout: "",
            stderr: "could not translate host name",
          };
        }
        return commandResult(connectivityOutput);
      }
      if (sql.includes("object_totals.platform_count")) {
        calls.push("BASELINE_QUERY");
        return commandResult(
          baselineOutputs.shift() ??
            options?.baselineOutput ??
            emptyBaselineOutput,
        );
      }
      if (sql.includes("string_agg(version")) {
        calls.push("MIGRATION_PROGRESS_QUERY");
        return commandResult(
          `${options?.schemaProgress ?? "NONE"}\n`,
        );
      }
      if (
        sql.includes(
          "curriculum_legacy_grade1_outcome_mappings",
        ) &&
        !sql.includes("synthetic_user_counts")
      ) {
        calls.push("ROLLBACK_QUERY");
        return commandResult(
          options?.rollbackOutput ?? "0|0|0|0|0\n",
        );
      }
      if (sql.includes("synthetic_user_counts")) {
        calls.push("POST_APPLY_QUERY");
        return commandResult(
          options?.postApplyOutput ?? validPostApplyOutput,
        );
      }
    }
    calls.push("UNEXPECTED");
    return commandResult("", false);
  };
  return { runner, calls, databaseContexts };
}

function createDryRunConnectivityFixture(options?: {
  directFailure?: boolean;
  poolerFailure?: boolean;
  malformedDryRun?: boolean;
}) {
  const { plan } = loadAndVerifyMigrationPlan();
  const calls: Array<{
    kind: string;
    args: string[];
    host: string;
    user: string;
    sslMode: string;
  }> = [];
  const runner: RemoteDevCommandRunner = (
    command,
    args,
    environment,
  ) => {
    if (command === "supabase" && args[0] === "projects") {
      calls.push({
        kind: "PROJECTS",
        args: [...args],
        host: "",
        user: "",
        sslMode: "",
      });
      return commandResult(
        JSON.stringify([
          {
            id: testProjectRef,
            name: project004RemoteDevContract.projectName,
            status: "ACTIVE_HEALTHY",
            region: "ap-southeast-1",
          },
        ]),
      );
    }
    if (command === "psql") {
      const sql = args[args.indexOf("--command") + 1] ?? "";
      const isConnectivity = sql.includes(
        "PROJECT004_REMOTE_CONNECTIVITY_V1",
      );
      const mode =
        environment.PGUSER === "postgres"
          ? "DIRECT"
          : "POOLER_SESSION";
      calls.push({
        kind: isConnectivity
          ? `CONNECTIVITY_${mode}`
          : `BASELINE_${mode}`,
        args: [...args],
        host: environment.PGHOST ?? "",
        user: environment.PGUSER ?? "",
        sslMode: environment.PGSSLMODE ?? "",
      });
      if (
        isConnectivity &&
        mode === "DIRECT" &&
        options?.directFailure
      ) {
        return {
          ok: false,
          stdout: "",
          stderr: "could not translate host name",
        };
      }
      if (
        isConnectivity &&
        mode === "POOLER_SESSION" &&
        options?.poolerFailure
      ) {
        return {
          ok: false,
          stdout: "",
          stderr: "pooler unavailable",
        };
      }
      return commandResult(
        isConnectivity
          ? connectivityOutput
          : emptyBaselineOutput,
      );
    }
    if (
      command === "supabase" &&
      args[0] === "db" &&
      args[1] === "push" &&
      args[2] === "--dry-run"
    ) {
      calls.push({
        kind: "DRY_RUN",
        args: [...args],
        host: environment.PGHOST ?? "",
        user: environment.PGUSER ?? "",
        sslMode: environment.PGSSLMODE ?? "",
      });
      return options?.malformedDryRun
        ? commandResult("\u001B[33mprogress only\u001B[0m\n")
        : supabaseCli210DryRunResult(plan);
    }
    return commandResult("", false);
  };
  return { runner, calls };
}

test("remote target guard accepts only the exact empty development target", () => {
  assert.doesNotThrow(() => assertRemoteDevTarget(validConfig));

  const rejected = [
    {
      ...validConfig,
      projectName: "plave-project004-production",
    },
    { ...validConfig, projectName: "plave-project004-staging" },
    { ...validConfig, projectName: "plave-project004-dev" },
    {
      ...validConfig,
      projectName: `plave-project${"003"}-dev`,
    },
    { ...validConfig, projectRef: "short" },
    { ...validConfig, databasePassword: "short" },
    { ...validConfig, environmentClass: "DEVELOPMENT" },
  ];
  for (const candidate of rejected) {
    assert.throws(
      () => assertRemoteDevTarget(candidate),
      RemoteDevGuardFailure,
    );
  }
});

test("pinned migration plan exactly matches 0001 through 0040", () => {
  const { plan } = loadAndVerifyMigrationPlan();
  assert.equal(plan.migrations.length, 40);
  assert.equal(plan.migrations[0]?.version, "0001");
  assert.equal(plan.migrations.at(-1)?.version, "0040");
  assert.equal(plan.seedIncluded, false);
  assert.equal(plan.activationIncluded, false);
  assert.equal(plan.publicationIncluded, false);
  assert.deepEqual(
    plan.migrations.map((entry) => entry.order),
    Array.from({ length: 40 }, (_, index) => index + 1),
  );
});

test("clean disposable proof receipt pins both Owner-confirmed fingerprints", () => {
  const receipt = loadAndVerifyCleanDisposableProofReceipt();
  assert.equal(
    receipt.schemaSemanticFingerprintSha256,
    project004RemoteDevContract
      .schemaSemanticFingerprintSha256,
  );
  assert.equal(
    receipt.proofFingerprintSha256,
    project004RemoteDevContract
      .cleanDisposableProofFingerprintSha256,
  );
  assert.equal(receipt.migrationsApplied, "40/40");
  assert.equal(receipt.migrationFirstLast, "0001/0040");
  assert.equal(receipt.releaseBank, "171/2052/2052/546");
  assert.equal(receipt.universalRelease, "DRAFT/INACTIVE");
  assert.equal(receipt.curriculumRuntime, false);
  assert.equal(
    receipt.grade2ControlledAdaptivePilot,
    "DISABLED",
  );
  assert.equal(receipt.remoteAccessPerformed, false);
  assert.equal(receipt.remoteMutationPerformed, false);

  for (const drift of [
    {
      ...receipt,
      schemaSemanticFingerprintSha256: "0".repeat(64),
    },
    {
      ...receipt,
      proofFingerprintSha256: "f".repeat(64),
    },
    { ...receipt, migrationFirstLast: "0001/0039" },
    { ...receipt, curriculumRuntime: true },
  ]) {
    assert.throws(
      () =>
        verifyCleanDisposableProofReceipt(
          drift as CleanDisposableProofReceipt,
        ),
      RemoteDevGuardFailure,
    );
  }
});

test("local and remote preflight require the pinned clean proof before remote access", () => {
  const local = runLocalRemoteDevPreflight();
  assert.equal(local.ok, true);
  assert.equal(local.localMigrationChecksums, "PASS");
  assert.equal(local.cleanDisposableProof, "PASS");

  const source = [
    readFileSync(
      "scripts/project004-remote-dev-operations.ts",
      "utf8",
    ),
    readFileSync(
      "scripts/project004-remote-dev-apply-once.ts",
      "utf8",
    ),
    readFileSync(
      "scripts/project004-clean-disposable-proof.ts",
      "utf8",
    ),
    readFileSync(
      "scripts/project004-remote-dev-guard.ts",
      "utf8",
    ),
  ].join("\n");
  assert.match(
    source,
    /loadAndVerifyCleanDisposableProofReceipt/u,
  );
  assert.match(source, /CLEAN_DISPOSABLE_PROOF/u);
  assert.match(
    source,
    /schemaSemanticFingerprintSha256/u,
  );
  assert.match(
    source,
    /cleanDisposableProofFingerprintSha256/u,
  );
});

test("remote baseline classifier derives canonical PLAVE inventory from pinned migrations", () => {
  const { root, plan } = loadAndVerifyMigrationPlan();
  const inventory = buildProject004RemoteObjectInventory(
    root,
    plan,
  );
  const relationNames = new Set(
    inventory.relations.map(
      (object) => `${object.schema}.${object.name}`,
    ),
  );
  for (const expected of [
    "public.profiles",
    "public.questions",
    "public.curriculum_releases",
    "private.curriculum_release_solutions",
    "public.curriculum_generated_questions",
    "private.curriculum_generated_solutions",
  ]) {
    assert.ok(relationNames.has(expected), expected);
  }
  const sql =
    buildProject004RemoteBaselineClassificationSql(root, plan);
  assert.match(sql, /^begin read only;/mu);
  assert.match(sql, /pg_catalog[.]pg_extension/u);
  assert.match(sql, /extension_schema_oids/u);
  assert.match(sql, /platform_schema_oids/u);
  assert.match(
    sql,
    /namespace[.]nspname not in \('public', 'private'\)/u,
  );
  assert.match(sql, /plave_relations/u);
  assert.match(sql, /foreign_count/u);
  assert.match(sql, /automatic_rls_routine_oids/u);
  assert.match(sql, /auth[.]users/u);
  assert.match(sql, /storage[.]objects/u);
  const executableSql = sql
    .replace(/--[^\n]*(?:\n|$)/gu, "\n")
    .replace(/\/[*][\s\S]*?[*]\//gu, " ")
    .replace(/'(?:''|[^'])*'/gu, "''");
  assert.doesNotMatch(
    executableSql,
    /\b(?:insert|update|delete|truncate|alter|create|drop|grant|revoke|call)\b/iu,
  );
});

test("fresh baseline and application-state fixtures classify independently", () => {
  const fixtures = JSON.parse(
    readFileSync(
      "tests/fixtures/project004-remote-baseline-classification.json",
      "utf8",
    ),
  ) as RemoteBaselineFixture[];
  assert.equal(fixtures.length, 8);
  for (const fixture of fixtures) {
    const counts = parseRemoteBaselineCounts(
      fixture.catalogOutput,
      fixture.migrationOutput ?? undefined,
    );
    assert.equal(
      isRemoteEmpty(counts),
      fixture.expectedEmpty,
      fixture.name,
    );
    assert.equal(
      counts.platformBaselineObjects,
      fixture.expectedCategory === "SUPABASE_AUTOMATIC_RLS"
        ? 501
        : 500,
    );
    if (fixture.expectedCategory === "PLAVE_APPLICATION_OBJECTS") {
      assert.equal(counts.plaveApplicationObjects, 1);
    }
    if (
      fixture.expectedCategory === "FOREIGN_APPLICATION_OBJECTS"
    ) {
      assert.equal(counts.foreignApplicationObjects, 1);
    }
    if (fixture.expectedCategory === "AUTH_USER_COUNT") {
      assert.equal(counts.authUserCount, 1);
    }
    if (fixture.expectedCategory === "STORAGE_OBJECT_COUNT") {
      assert.equal(counts.storageObjectCount, 1);
    }
    if (
      fixture.expectedCategory ===
      "FOREIGN_MIGRATION_HISTORY_COUNT"
    ) {
      assert.equal(counts.foreignMigrationHistoryCount, 1);
    }
  }
});

test("Automatic RLS helper is baseline only with exact platform provenance", () => {
  const { root, plan } = loadAndVerifyMigrationPlan();
  const inventory = buildProject004RemoteObjectInventory(
    root,
    plan,
  );
  assert.equal(
    inventory.routines.some(
      (routine) =>
        routine.schema === "public" &&
        routine.name === "rls_auto_enable",
    ),
    false,
  );
  const sql =
    buildProject004RemoteBaselineClassificationSql(root, plan);
  for (const evidence of [
    "procedure.proname = 'rls_auto_enable'",
    "procedure.prosecdef",
    "search_path=pg_catalog",
    "owner_role.rolsuper",
    "event_trigger.evtenabled <> 'D'",
    "event_trigger.evtevent = 'ddl_command_end'",
    "CREATE TABLE AS",
    "SELECT INTO",
    "dependency.deptype = 'e'",
  ]) {
    assert.ok(sql.includes(evidence), evidence);
  }
  assert.match(
    sql,
    /procedure[.]oid in \(\s*select oid from automatic_rls_routine_oids\s*\)/u,
  );
  assert.match(
    sql,
    /procedure[.]oid not in \(\s*select oid from automatic_rls_routine_oids\s*\)/u,
  );
  const platformFixture = readFileSync(
    "tests/fixtures/rls-auto-enable-active.sql",
    "utf8",
  );
  assert.match(
    platformFixture,
    /create or replace function public[.]rls_auto_enable[(][)]/iu,
  );
  assert.match(
    platformFixture,
    /create event trigger ensure_rls/iu,
  );
});

test("foreign-object inspector is one catalog-only read-only transaction", () => {
  const { root, plan } = loadAndVerifyMigrationPlan();
  const sql = buildProject004ForeignObjectInspectionSql(
    root,
    plan,
  );
  const executableSql = sql
    .replace(/--[^\n]*(?:\n|$)/gu, "\n")
    .replace(/\/[*][\s\S]*?[*]\//gu, " ")
    .replace(/'(?:''|[^'])*'/gu, "''");
  assert.match(
    executableSql,
    /^\s*begin\s+read\s+only\s*;/iu,
  );
  assert.match(executableSql, /\brollback\s*;\s*$/iu);
  assert.equal(
    (
      executableSql.match(/\bbegin\s+read\s+only\s*;/giu) ??
      []
    ).length,
    1,
  );
  assert.equal(
    (executableSql.match(/\brollback\s*;/giu) ?? []).length,
    1,
  );
  for (const forbidden of [
    "insert",
    "update",
    "delete",
    "merge",
    "create",
    "alter",
    "drop",
    "truncate",
    "grant",
    "revoke",
    "call",
    "execute",
  ]) {
    assert.doesNotMatch(
      executableSql,
      new RegExp(`\\b${forbidden}\\b`, "iu"),
      forbidden,
    );
  }
  assert.doesNotMatch(sql, /pg_get_functiondef/iu);
  assert.doesNotMatch(
    executableSql,
    /\b(?:from|join)\s+(?:auth|storage|private)\s*[.]/iu,
  );
});

test("foreign-object inspection parses and renders only sanitized provenance", () => {
  const raw =
    "INSPECTION_V1|1|ROUTINE|PUBLIC_APPLICATION_SURFACE|" +
    "PLATFORM_SUPERUSER|0|SUPABASE_AUTOMATIC_RLS|YES|" +
    "NO_DIRECT_CATALOG_DEPENDENCY|public.rls_auto_enable()|" +
    "NO|1";
  const inspection = parseSafeForeignObjectInspection(raw);
  assert.deepEqual(inspection, {
    foreignObjectCount: 1,
    objectCategory: "ROUTINE",
    schemaCategory: "PUBLIC_APPLICATION_SURFACE",
    ownerCategory: "PLATFORM_SUPERUSER",
    extensionDependencyCount: 0,
    platformConfigurationProvenance:
      "SUPABASE_AUTOMATIC_RLS",
    automaticRlsProvenance: "YES",
    dataApiProvenance: "NO_DIRECT_CATALOG_DEPENDENCY",
    safeObjectIdentifier: "public.rls_auto_enable()",
    plaveMigrationConflict: "NO",
    matchingActiveEventTriggerCount: 1,
  });
  const rendered = renderSafeForeignObjectInspection(inspection);
  assert.match(rendered, /REMOTE_MUTATION_PERFORMED=NO/u);
  assert.match(
    rendered,
    /PLATFORM_CONFIGURATION_PROVENANCE=SUPABASE_AUTOMATIC_RLS/u,
  );
  assert.doesNotMatch(
    rendered,
    /(?:project.ref|url|host|password|credential|definition)/iu,
  );
});

test("guarded foreign inspection issues one catalog query and no mutation", () => {
  const calls: string[] = [];
  const inspection = inspectProject004RemoteForeignObject({
    runner: (command, args) => {
      calls.push(`${command}:${args.slice(0, 3).join(" ")}`);
      if (args[0] === "projects") {
        return commandResult(
          JSON.stringify([
            {
              id: testProjectRef,
              name: "plave-project004-dev-clean",
              status: "ACTIVE_HEALTHY",
              region: "ap-southeast-1",
            },
          ]),
        );
      }
      return commandResult(
        "INSPECTION_V1|1|ROUTINE|PUBLIC_APPLICATION_SURFACE|" +
          "PLATFORM_SUPERUSER|0|SUPABASE_AUTOMATIC_RLS|YES|" +
          "NO_DIRECT_CATALOG_DEPENDENCY|" +
          "public.rls_auto_enable()|NO|1",
      );
    },
  });
  assert.equal(inspection.foreignObjectCount, 1);
  assert.deepEqual(calls, [
    "supabase:projects list --output",
    "supabase:db query --linked",
  ]);
  assert.equal(
    calls.filter((call) => call.includes("db query")).length,
    1,
  );
  assert.equal(
    calls.some((call) =>
      /\b(?:push|reset|pull|link|seed)\b/u.test(call),
    ),
    false,
  );
});

test("read-only preflight verifies CLI identity and a truly empty target", () => {
  const calls: Array<{
    command: string;
    args: string[];
    environment: NodeJS.ProcessEnv;
  }> = [];
  const runner: RemoteDevCommandRunner = (
    command,
    args,
    environment,
  ) => {
    calls.push({ command, args, environment });
    if (command === "supabase") {
      return commandResult(
        JSON.stringify([
          {
            id: testProjectRef,
            name: "plave-project004-dev-clean",
            status: "ACTIVE_HEALTHY",
            region: "ap-southeast-1",
          },
        ]),
      );
    }
    const sql = args[args.indexOf("--command") + 1] ?? "";
    if (sql.includes("PROJECT004_REMOTE_CONNECTIVITY_V1")) {
      return commandResult(connectivityOutput);
    }
    return commandResult("500|0|0|0|0|0\n");
  };
  const result = runRemoteDevPreflight({
    environment: validEnvironment,
    runner,
  });
  assert.equal(result.ok, true);
  assert.ok(result.counts && isRemoteEmpty(result.counts));
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[0]?.args, [
    "projects",
    "list",
    "--output",
    "json",
  ]);
  assert.equal(
    calls[0]?.environment
      .PLAVE_PROJECT004_REMOTE_DB_PASSWORD,
    undefined,
  );
  assert.equal(
    calls[1]?.environment.PGHOST,
    `db.${testProjectRef}.supabase.co`,
  );
  assert.equal(
    calls[1]?.environment.PGPASSWORD,
    validConfig.databasePassword,
  );

  const rendered = renderRemoteDevPreflight(result);
  assert.match(rendered, /PROJECT004_REMOTE_DEV_PREFLIGHT=PASS/);
  assert.match(rendered, /CLEAN_DISPOSABLE_PROOF=PASS/u);
  assert.match(
    rendered,
    /REMOTE_DATABASE_ENDPOINT_MODE=DIRECT/u,
  );
  assert.match(rendered, /PLATFORM_BASELINE_OBJECTS=500/u);
  assert.match(rendered, /PLAVE_APPLICATION_OBJECTS=0/u);
  assert.match(rendered, /FOREIGN_APPLICATION_OBJECTS=0/u);
  assert.match(rendered, /AUTH_USER_COUNT=0/u);
  assert.match(rendered, /STORAGE_OBJECT_COUNT=0/u);
  assert.match(rendered, /MIGRATION_HISTORY_COUNT=0/u);
  assert.match(
    rendered,
    /REMOTE_BASELINE_CLASSIFICATION=PASS/u,
  );
  assert.doesNotMatch(rendered, new RegExp(testProjectRef, "u"));
  assert.doesNotMatch(
    rendered,
    new RegExp(validConfig.databasePassword, "u"),
  );
});

test("preflight fails closed for wrong identity or non-empty remote", () => {
  const wrongIdentityRunner: RemoteDevCommandRunner = (
    command,
  ) =>
    command === "supabase"
      ? commandResult(
          JSON.stringify([
            {
              id: testProjectRef,
              name: "not-the-accepted-target",
            },
          ]),
        )
      : commandResult("500|0|0|0|0|0\n");
  const wrongIdentity = runRemoteDevPreflight({
    environment: validEnvironment,
    runner: wrongIdentityRunner,
  });
  assert.equal(wrongIdentity.ok, false);
  assert.equal(
    wrongIdentity.checks.REMOTE_PROJECT_IDENTITY,
    false,
  );

  const nonEmptyRunner: RemoteDevCommandRunner = (
    command,
    args,
  ) => {
    if (command === "supabase") {
      return commandResult(
        JSON.stringify([
          {
            id: testProjectRef,
            name: "plave-project004-dev-clean",
            status: "ACTIVE_HEALTHY",
            region: "ap-southeast-1",
          },
        ]),
      );
    }
    const sql = args[args.indexOf("--command") + 1] ?? "";
    return sql.includes("PROJECT004_REMOTE_CONNECTIVITY_V1")
      ? commandResult(connectivityOutput)
      : commandResult("500|1|0|0|0|0\n");
  };
  const nonEmpty = runRemoteDevPreflight({
    environment: validEnvironment,
    runner: nonEmptyRunner,
  });
  assert.equal(nonEmpty.ok, false);
  assert.equal(nonEmpty.checks.REMOTE_EMPTY, false);
  assert.equal(nonEmpty.counts?.plaveApplicationObjects, 1);
  assert.equal(nonEmpty.failureCode, "REMOTE_NOT_EMPTY");
  assert.match(
    renderRemoteDevPreflight(nonEmpty),
    /REMOTE_BASELINE_CLASSIFICATION=FAIL/u,
  );
});

test("direct connectivity mode is reused by baseline inspection and dry-run", () => {
  const fixture = createDryRunConnectivityFixture();
  const result = executeAuthorizedRemoteDevDryRun({
    environment: validEnvironment,
    runner: fixture.runner,
  });
  assert.equal(result.ok, true);
  if (!result.ok) assert.fail("expected direct dry-run PASS");
  assert.equal(
    result.report.remoteDatabaseEndpointMode,
    "DIRECT",
  );
  assert.deepEqual(
    fixture.calls.map((call) => call.kind),
    [
      "PROJECTS",
      "CONNECTIVITY_DIRECT",
      "BASELINE_DIRECT",
      "DRY_RUN",
    ],
  );
  for (const call of fixture.calls.slice(1)) {
    assert.equal(call.user, "postgres");
    assert.equal(call.sslMode, "require");
  }
});

test("direct DNS failure resolves once to IPv4 session pooler for baseline and dry-run", () => {
  const fixture = createDryRunConnectivityFixture({
    directFailure: true,
  });
  const result = executeAuthorizedRemoteDevDryRun({
    environment: validEnvironment,
    runner: fixture.runner,
  });
  assert.equal(result.ok, true);
  if (!result.ok) assert.fail("expected pooler dry-run PASS");
  assert.equal(
    result.report.remoteDatabaseEndpointMode,
    "POOLER_SESSION",
  );
  assert.deepEqual(
    fixture.calls.map((call) => call.kind),
    [
      "PROJECTS",
      "CONNECTIVITY_DIRECT",
      "CONNECTIVITY_POOLER_SESSION",
      "BASELINE_POOLER_SESSION",
      "DRY_RUN",
    ],
  );
  for (const call of fixture.calls.slice(2)) {
    assert.equal(call.user, `postgres.${testProjectRef}`);
    assert.equal(call.sslMode, "require");
  }
});

test("pooler fallback failure stops before baseline inspection and dry-run", () => {
  const fixture = createDryRunConnectivityFixture({
    directFailure: true,
    poolerFailure: true,
  });
  const result = executeAuthorizedRemoteDevDryRun({
    environment: validEnvironment,
    runner: fixture.runner,
  });
  assert.equal(result.ok, false);
  if (result.ok) assert.fail("expected pooler failure");
  assert.equal(result.failureCode, "POOLER_UNAVAILABLE");
  assert.deepEqual(
    fixture.calls.map((call) => call.kind),
    [
      "PROJECTS",
      "CONNECTIVITY_DIRECT",
      "CONNECTIVITY_POOLER_SESSION",
    ],
  );
  assert.equal(result.counts.dryRun, 0);
});

test("resolved CLI context keeps credentials out of argv and pooler metadata", () => {
  const endpoint: ResolvedRemoteDatabaseEndpoint = {
    mode: "POOLER_SESSION",
    host: "aws-0-ap-southeast-1.pooler.supabase.com",
    port: "5432",
    user: `postgres.${testProjectRef}`,
    sslMode: "require",
  };
  const cliEnvironment = buildResolvedRemoteCliEnvironment(
    validConfig,
    endpoint,
    validEnvironment,
  );
  const passwordlessPoolerUrl = resolvedRemotePoolerUrl(
    validConfig,
    endpoint,
  );
  assert.ok(passwordlessPoolerUrl);
  assert.doesNotMatch(
    passwordlessPoolerUrl,
    new RegExp(validConfig.databasePassword, "u"),
  );
  assert.equal(new URL(passwordlessPoolerUrl).password, "");
  assert.equal(cliEnvironment.PGSSLMODE, "require");

  const temporaryRoot = mkdtempSync(
    join(tmpdir(), "plave-project004-cli-metadata-"),
  );
  try {
    let observedRef = "";
    let observedPoolerUrl = "";
    withEphemeralRemoteCliMetadata(
      temporaryRoot,
      {
        projectRef: validConfig.projectRef,
        passwordlessPoolerUrl,
      },
      () => {
        const refMarker = join(
          temporaryRoot,
          project004RemoteDevContract.linkedRefMarker,
        );
        const poolerMarker = join(
          temporaryRoot,
          project004RemoteDevContract.poolerUrlMarker,
        );
        assert.equal(lstatSync(refMarker).isFIFO(), true);
        assert.equal(lstatSync(poolerMarker).isFIFO(), true);
        observedRef = readFileSync(refMarker, "utf8").trim();
        observedPoolerUrl = readFileSync(
          poolerMarker,
          "utf8",
        ).trim();
      },
    );
    assert.equal(observedRef, validConfig.projectRef);
    assert.equal(observedPoolerUrl, passwordlessPoolerUrl);
    assert.equal(
      existsSync(
        join(
          temporaryRoot,
          project004RemoteDevContract.linkedRefMarker,
        ),
      ),
      false,
    );
    assert.equal(
      existsSync(
        join(
          temporaryRoot,
          project004RemoteDevContract.poolerUrlMarker,
        ),
      ),
      false,
    );
    const argv = ["supabase", "db", "push", "--dry-run"];
    assert.equal(argv.includes(validConfig.projectRef), false);
    assert.equal(
      argv.includes(validConfig.databasePassword),
      false,
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("identity failure preserves local checksum PASS and skips remote empty check", () => {
  const calls: string[] = [];
  const result = runRemoteDevPreflight({
    environment: validEnvironment,
    runner: (command, args) => {
      calls.push(`${command}:${args[0] ?? ""}`);
      return {
        ok: false,
        stdout: "",
        stderr:
          "Access token not provided. Run supabase login.",
      };
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.checkStates.LOCAL_MIGRATIONS_0001_0040,
    "PASS",
  );
  assert.equal(result.checkStates.CLI_AUTHENTICATION, "FAIL");
  assert.equal(
    result.checkStates.REMOTE_PROJECT_IDENTITY,
    "NOT_RUN",
  );
  assert.equal(result.checkStates.REMOTE_EMPTY, "NOT_RUN");
  assert.equal(result.failureCode, "CLI_NOT_AUTHENTICATED");
  assert.deepEqual(calls, ["supabase:projects"]);

  const rendered = renderRemoteDevPreflight(result);
  assert.match(
    rendered,
    /LOCAL_MIGRATIONS_0001_0040=PASS/u,
  );
  assert.match(rendered, /REMOTE_EMPTY=NOT_RUN/u);
  assert.equal(
    rendered.match(/ROOT_FAILURE_CODE=/gu)?.length,
    1,
  );
});

test("dry-run and apply derive the same canonical native CLI auth context", () => {
  const environment: NodeJS.ProcessEnv = {
    ...validEnvironment,
    HOME: "/native-cli-home",
    PATH: "/canonical-cli-bin",
    XDG_CONFIG_HOME: "/native-cli-config",
  };
  const dryRunContext = buildCanonicalCliAuthContext(
    environment,
    process.cwd(),
  );
  const applyContext = buildCanonicalCliAuthContext(
    {
      ...environment,
      PLAVE_PROJECT004_REMOTE_OWNER_APPROVAL:
        project004RemoteDevContract.applyApproval,
    },
    process.cwd(),
  );

  assert.equal(
    dryRunContext.cwdFingerprint,
    applyContext.cwdFingerprint,
  );
  assert.equal(
    dryRunContext.environmentFingerprint,
    applyContext.environmentFingerprint,
  );
  assert.equal(dryRunContext.executable, "supabase");
  assert.equal(applyContext.executable, "supabase");
  assert.equal(
    dryRunContext.tokenDiscovery,
    "NATIVE_CLI_STORE",
  );
  assert.equal(
    applyContext.tokenDiscovery,
    "NATIVE_CLI_STORE",
  );
  assert.equal(
    applyContext.childEnvironment.HOME,
    environment.HOME,
  );
  assert.equal(
    applyContext.childEnvironment.XDG_CONFIG_HOME,
    environment.XDG_CONFIG_HOME,
  );
});

test("isolated PWD does not replace canonical cwd or native CLI auth context", () => {
  const environment: NodeJS.ProcessEnv = {
    ...validEnvironment,
    HOME: "/native-cli-home",
    PATH: "/canonical-cli-bin",
  };
  const canonical = buildCanonicalCliAuthContext(
    environment,
    process.cwd(),
  );
  const isolated = buildCanonicalCliAuthContext(
    {
      ...environment,
      PWD: "/isolated-operation-workdir",
    },
    process.cwd(),
  );

  assert.equal(
    isolated.cwdFingerprint,
    canonical.cwdFingerprint,
  );
  assert.equal(
    isolated.environmentFingerprint,
    canonical.environmentFingerprint,
  );
  assert.equal(
    isolated.childEnvironment.HOME,
    environment.HOME,
  );
});

test("canonical CLI auth checker classifies session failures without leaking context", () => {
  assert.equal(
    classifyCliAuthCommandFailure({
      ok: false,
      stdout: "",
      stderr:
        "Access token not provided. Run supabase login.",
    }),
    "CLI_NOT_AUTHENTICATED",
  );
  assert.equal(
    classifyCliAuthCommandFailure({
      ok: false,
      stdout: "",
      stderr: "Access token is expired.",
    }),
    "CLI_SESSION_EXPIRED",
  );
  assert.equal(
    classifyCliAuthCommandFailure({
      ok: false,
      stdout: "",
      stderr: "401 Unauthorized",
    }),
    "CLI_SESSION_EXPIRED",
  );
  assert.equal(
    classifyCliAuthCommandFailure({
      ok: false,
      stdout: "",
      stderr: "command transport failed",
    }),
    "CLI_AUTH_OUTPUT_UNRECOGNIZED",
  );
});

test("canonical auth checker rejects malformed output and context mutation", () => {
  assert.throws(
    () =>
      runCanonicalSupabaseCliAuthCheck({
        environment: {
          ...validEnvironment,
          HOME: "/native-cli-home",
          PATH: "/canonical-cli-bin",
        },
        runner: () => commandResult("not-json"),
      }),
    (error: unknown) =>
      error instanceof RemoteDevGuardFailure &&
      error.code === "CLI_AUTH_OUTPUT_UNRECOGNIZED",
  );
  assert.throws(
    () =>
      runCanonicalSupabaseCliAuthCheck({
        environment: {
          ...validEnvironment,
          HOME: "/native-cli-home",
          PATH: "/canonical-cli-bin",
        },
        runner: (_command, _args, environment) => {
          environment.HOME = "/changed-auth-home";
          return commandResult("[]");
        },
      }),
    (error: unknown) =>
      error instanceof RemoteDevGuardFailure &&
      error.code === "CLI_AUTH_CONTEXT_MISMATCH",
  );
});

test("apply auth failure stays pre-mutation and preserves the specific root code", () => {
  for (const fixture of [
    {
      stderr:
        "Access token not provided. Run supabase login.",
      expected: "CLI_NOT_AUTHENTICATED",
    },
    {
      stderr: "Access token is expired.",
      expected: "CLI_SESSION_EXPIRED",
    },
    {
      stderr: "unexpected CLI transport failure",
      expected: "CLI_AUTH_OUTPUT_UNRECOGNIZED",
    },
  ]) {
    const report = executeAuthorizedRemoteDevApplyOnce({
      environment: {
        ...validApplyEnvironment,
        HOME: "/native-cli-home",
        PATH: "/canonical-cli-bin",
      },
      runner: () => ({
        ok: false,
        stdout: "",
        stderr: fixture.stderr,
      }),
    });
    assert.equal(report.ok, false);
    assert.equal(report.rootFailureCode, fixture.expected);
    assert.equal(report.commandCounts.schemaPush, 0);
    assert.equal(report.commandCounts.contentTransaction, 0);
    assert.equal(report.remoteMutationPerformed, "NO");
  }
});

test("CLI access token is never placed in argv or a shell command", () => {
  const inheritedToken = "test-only-inherited-token";
  let observedArgs: string[] = [];
  const result = runCanonicalSupabaseCliAuthCheck({
    environment: {
      ...validEnvironment,
      HOME: "/native-cli-home",
      PATH: "/canonical-cli-bin",
      SUPABASE_ACCESS_TOKEN: inheritedToken,
    },
    runner: (_command, args, environment) => {
      observedArgs = [...args];
      assert.equal(
        environment.SUPABASE_ACCESS_TOKEN,
        inheritedToken,
      );
      return commandResult("[]");
    },
  });
  assert.equal(result.projects.length, 0);
  assert.deepEqual(observedArgs, [
    "projects",
    "list",
    "--output",
    "json",
  ]);
  assert.equal(observedArgs.includes(inheritedToken), false);
  const sources = [
    "scripts/project004-supabase-cli-auth.ts",
    "scripts/project004-remote-dev-guard.ts",
    "scripts/project004-remote-dev-operations.ts",
    "scripts/project004-remote-connectivity-resolver.ts",
    "scripts/project004-remote-dev-apply-once.ts",
    "scripts/apply-project004-remote-dev.ts",
  ]
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  assert.doesNotMatch(sources, /--access-token/u);
  assert.doesNotMatch(
    sources,
    /(?:exec|spawn)(?:Sync)?\([^)]*(?:login|access-token)/isu,
  );
});

test("secure prompt cancellation reports one root cause without remote execution", () => {
  let executeCalls = 0;
  const command = runRemoteDevPreflightDryRunCommand({
    environment: { NODE_ENV: "test" },
    prompt: () => ({
      ok: false,
      code: "SECURE_PROMPT_CANCELLED",
    }),
    execute: (() => {
      executeCalls += 1;
      throw new Error("must not execute");
    }) as typeof executeAuthorizedRemoteDevDryRun,
  });

  assert.equal(command.exitCode, 1);
  assert.equal(executeCalls, 0);
  assert.equal(command.report.project004Canonical, "PASS");
  assert.equal(command.report.localMigrationChecksums, "PASS");
  assert.equal(command.report.cleanDisposableProof, "PASS");
  assert.equal(command.report.remoteIdentityGuard, "NOT_RUN");
  assert.equal(command.report.emptyRemoteState, "NOT_RUN");
  assert.equal(command.report.dryRunMigrationCount, "NOT_RUN");
  assert.equal(
    command.report.rootFailureCode,
    "SECURE_PROMPT_CANCELLED",
  );
  assert.equal(
    command.output.match(/ROOT_FAILURE_CODE=/gu)?.length,
    1,
  );
  assert.doesNotMatch(
    command.output,
    /(?:password|token|project.ref|database.host|pid|identity)=/iu,
  );
});

function createSecureTtyTestAdapter(options: {
  input?: Buffer;
  openFailure?: boolean;
  readFailure?: boolean;
  nowValues?: number[];
}) {
  const events: string[] = [];
  let consumed = false;
  let nowIndex = 0;
  const adapter: SecureTtyAdapter = {
    open: () => {
      events.push("OPEN");
      if (options.openFailure) throw new Error("no tty");
      return 42;
    },
    close: () => {
      events.push("CLOSE");
    },
    write: (_fd, value) => {
      events.push(value === "\n" ? "NEWLINE" : `WRITE:${value}`);
    },
    read: (_fd, target) => {
      events.push("READ");
      if (options.readFailure) throw new Error("read failed");
      if (consumed || !options.input) return 0;
      options.input.copy(target);
      consumed = true;
      return options.input.length;
    },
    readMode: () => {
      events.push("READ_MODE");
      return "saved-terminal-mode";
    },
    setMaskedMode: () => {
      events.push("MASK");
      return true;
    },
    restoreMode: (_fd, mode) => {
      events.push(`RESTORE:${mode}`);
      return true;
    },
    now: () =>
      options.nowValues?.[
        Math.min(nowIndex++, options.nowValues.length - 1)
      ] ?? 0,
  };
  return { adapter, events };
}

test("controlling TTY prompt accepts pasted input independently of npm child stdin", () => {
  const tty = createSecureTtyTestAdapter({
    input: Buffer.from("pasted-value\r", "utf8"),
  });
  const result = readMaskedLineFromControllingTty({
    label: "Project004 remote project reference: ",
    adapter: tty.adapter,
  });

  assert.deepEqual(result, {
    ok: true,
    value: "pasted-value",
  });
  assert.deepEqual(tty.events, [
    "OPEN",
    "READ_MODE",
    "MASK",
    "WRITE:Project004 remote project reference: ",
    "READ",
    "NEWLINE",
    "RESTORE:saved-terminal-mode",
    "CLOSE",
  ]);
});

test("unavailable controlling TTY is not classified as cancellation", () => {
  const tty = createSecureTtyTestAdapter({
    openFailure: true,
  });
  const result = readMaskedLineFromControllingTty({
    label: "Project004 remote database password: ",
    adapter: tty.adapter,
  });
  assert.deepEqual(result, {
    ok: false,
    code: "SECURE_TTY_UNAVAILABLE",
  });
  assert.deepEqual(tty.events, ["OPEN"]);
});

test("Ctrl+C and terminal read exceptions always restore terminal mode", () => {
  for (const scenario of [
    { input: Buffer.from([0x03]) },
    { readFailure: true },
  ]) {
    const tty = createSecureTtyTestAdapter(scenario);
    const result = readMaskedLineFromControllingTty({
      label: "Project004 remote database password: ",
      adapter: tty.adapter,
    });
    assert.equal(result.ok, false);
    if (result.ok) assert.fail("expected prompt failure");
    assert.equal(
      result.code,
      scenario.readFailure
        ? "SECURE_TTY_READ_FAILED"
        : "SECURE_PROMPT_CANCELLED",
    );
    assert.ok(
      tty.events.includes("RESTORE:saved-terminal-mode"),
    );
    assert.equal(tty.events.at(-1), "CLOSE");
  }
});

test("prompt timeout restores terminal mode before returning", () => {
  const tty = createSecureTtyTestAdapter({
    nowValues: [0, 0, 101],
  });
  const result = readMaskedLineFromControllingTty({
    label: "Project004 remote database password: ",
    adapter: tty.adapter,
    timeoutMs: 100,
  });
  assert.deepEqual(result, {
    ok: false,
    code: "SECURE_PROMPT_TIMEOUT",
  });
  assert.ok(
    tty.events.includes("RESTORE:saved-terminal-mode"),
  );
  assert.equal(tty.events.at(-1), "CLOSE");
});

test("prompt smoke consumes two masked values without remote execution or disclosure", () => {
  const values = ["dummy-reference", "dummy-password"];
  const labels: string[] = [];
  const smoke = runSecurePromptSmoke((label) => {
    labels.push(label);
    return { ok: true, value: values.shift() ?? "" };
  });

  assert.equal(smoke.exitCode, 0);
  assert.equal(smoke.output, "SECURE_PROMPT_SMOKE=PASS\n");
  assert.deepEqual(labels, [
    "Project004 remote project reference: ",
    "Project004 remote database password: ",
  ]);
  assert.doesNotMatch(smoke.output, /dummy/iu);
});

test("npm child with ignored stdin reports unavailable controlling TTY, not cancellation", async () => {
  const result = await new Promise<{
    status: number | null;
    stdout: string;
  }>((resolvePromise, rejectPromise) => {
    const child = spawn(
      "npm",
      [
        "run",
        "--silent",
        "remote-dev:preflight-dry-run",
        "--",
        "--prompt-smoke",
      ],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
        detached: true,
      },
    );
    let stdout = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      rejectPromise(new Error("npm prompt smoke timed out"));
    }, 10_000);
    child.once("error", (error) => {
      clearTimeout(timeout);
      rejectPromise(error);
    });
    child.once("close", (status) => {
      clearTimeout(timeout);
      resolvePromise({ status, stdout });
    });
  });
  assert.equal(result.status, 1);
  assert.match(
    result.stdout,
    /ROOT_FAILURE_CODE=SECURE_TTY_UNAVAILABLE/u,
  );
  assert.match(result.stdout, /SECURE_PROMPT_SMOKE=FAIL/u);
  assert.doesNotMatch(
    result.stdout,
    /SECURE_PROMPT_CANCELLED/u,
  );
});

test("password rejection is distinct and stops before dry-run", () => {
  const calls: string[] = [];
  const result = executeAuthorizedRemoteDevDryRun({
    environment: validEnvironment,
    runner: (command, args) => {
      calls.push(`${command}:${args.slice(0, 2).join(" ")}`);
      if (command === "supabase") {
        return commandResult(
          JSON.stringify([
            {
              id: testProjectRef,
              name: "plave-project004-dev-clean",
              status: "ACTIVE_HEALTHY",
              region: "ap-southeast-1",
            },
          ]),
        );
      }
      return {
        ok: false,
        stdout: "",
        stderr: "password authentication failed",
      };
    },
  });

  assert.equal(result.ok, false);
  if (result.ok) assert.fail("expected failure");
  assert.equal(result.failureCode, "DATABASE_PASSWORD_INVALID");
  assert.equal(
    result.preflight.checkStates.REMOTE_PROJECT_IDENTITY,
    "PASS",
  );
  assert.equal(
    result.preflight.checkStates.REMOTE_DATABASE_CONNECTIVITY,
    "FAIL",
  );
  assert.equal(
    result.preflight.checkStates.REMOTE_EMPTY,
    "NOT_RUN",
  );
  assert.equal(result.counts.guardedLink, 0);
  assert.equal(result.counts.dryRun, 0);
  assert.equal(
    calls.some((call) => call === "supabase:db push"),
    false,
  );
});

test("project name mismatch skips database and dry-run operations", () => {
  const calls: string[] = [];
  const result = executeAuthorizedRemoteDevDryRun({
    environment: validEnvironment,
    runner: (command, args) => {
      calls.push(`${command}:${args.slice(0, 2).join(" ")}`);
      return commandResult(
        JSON.stringify([
          {
            id: testProjectRef,
            name: "wrong-development-target",
            status: "ACTIVE_HEALTHY",
          },
        ]),
      );
    },
  });

  assert.equal(result.ok, false);
  if (result.ok) assert.fail("expected failure");
  assert.equal(result.failureCode, "REMOTE_NAME_MISMATCH");
  assert.equal(
    result.preflight.checkStates.REMOTE_PROJECT_IDENTITY,
    "FAIL",
  );
  assert.equal(result.preflight.checkStates.REMOTE_EMPTY, "NOT_RUN");
  assert.equal(result.counts.readOnlySql, 0);
  assert.equal(result.counts.guardedLink, 0);
  assert.equal(result.counts.dryRun, 0);
  assert.deepEqual(calls, ["supabase:projects list"]);
});

test("linked target guard rejects a foreign or missing marker", () => {
  const temporaryRoot = mkdtempSync(
    join(tmpdir(), "plave-project004-link-test-"),
  );
  try {
    mkdirSync(join(temporaryRoot, "supabase/.temp"), {
      recursive: true,
    });
    assert.throws(
      () => assertLinkedTarget(temporaryRoot, validConfig),
      RemoteDevGuardFailure,
    );
    writeFileSync(
      join(temporaryRoot, "supabase/.temp/project-ref"),
      "foreign-target\n",
      { mode: 0o600 },
    );
    assert.throws(
      () => assertLinkedTarget(temporaryRoot, validConfig),
      RemoteDevGuardFailure,
    );
    writeFileSync(
      join(temporaryRoot, "supabase/.temp/project-ref"),
      `${testProjectRef}\n`,
      { mode: 0o600 },
    );
    assert.doesNotThrow(() =>
      assertLinkedTarget(temporaryRoot, validConfig),
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("ephemeral linked ref uses a FIFO and leaves no persisted value", () => {
  const temporaryRoot = mkdtempSync(
    join(tmpdir(), "plave-project004-ephemeral-link-test-"),
  );
  const marker = join(
    temporaryRoot,
    "supabase/.temp/project-ref",
  );
  try {
    const values = withEphemeralLinkedProjectRef(
      temporaryRoot,
      testProjectRef,
      () => [
        readFileSync(marker, "utf8").trim(),
        readFileSync(marker, "utf8").trim(),
      ],
    );
    assert.deepEqual(values, [testProjectRef, testProjectRef]);
    assert.equal(existsSync(marker), false);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("dry-run parser accepts exact Supabase CLI 2.110.0 stdout/stderr shape only", () => {
  const { plan } = loadAndVerifyMigrationPlan();
  const validResult = supabaseCli210DryRunResult(plan);
  const validOutput =
    `${validResult.stdout}\n${validResult.stderr}`;
  const evidence = inspectProject004DryRunResult(
    validResult,
    plan,
  );
  assert.deepEqual(evidence, {
    queryExit: "PASS",
    successSignature: "PASS",
    migrationHeaderCount: 1,
    observedMigrationCount: 40,
    observedFirstLast: "0001/0040",
    duplicateMigrationCount: 0,
    foreignMigrationCount: 0,
    migrationOrder: "PASS",
    canonicalPlanChecksums: "PASS",
    seedOperationCount: 0,
    destructiveOperationCount: 0,
    parserFailureCode: "NONE",
  });
  assert.doesNotThrow(() =>
    verifyDryRunOutput(validOutput, plan),
  );
  assert.throws(
    () =>
      verifyDryRunOutput(
        (() => {
          const result = supabaseCli210DryRunResult(
            plan,
            plan.migrations
              .slice(1)
              .map((entry) => entry.file),
          );
          return `${result.stdout}\n${result.stderr}`;
        })(),
        plan,
      ),
    RemoteDevGuardFailure,
  );
  assert.throws(
    () =>
      verifyDryRunOutput(
        (() => {
          const files = plan.migrations.map(
            (entry) => entry.file,
          );
          [files[0], files[1]] = [files[1] ?? "", files[0] ?? ""];
          const result = supabaseCli210DryRunResult(plan, files);
          return `${result.stdout}\n${result.stderr}`;
        })(),
        plan,
      ),
    RemoteDevGuardFailure,
  );
  assert.throws(
    () => verifyDryRunOutput(
      `${validOutput}\nWould seed these files:\n • seed.sql`,
      plan,
    ),
    RemoteDevGuardFailure,
  );
  assert.throws(
    () =>
      verifyDryRunOutput(
        (() => {
          const result = supabaseCli210DryRunResult(plan, [
            ...plan.migrations.map((entry) => entry.file),
            "0041_foreign_application.sql",
          ]);
          return `${result.stdout}\n${result.stderr}`;
        })(),
        plan,
      ),
    RemoteDevGuardFailure,
  );
  assert.throws(
    () =>
      verifyDryRunOutput(
        (() => {
          const files = plan.migrations.map(
            (entry) => entry.file,
          );
          const result = supabaseCli210DryRunResult(plan, [
            ...files,
            files[0] ?? "",
          ]);
          return `${result.stdout}\n${result.stderr}`;
        })(),
        plan,
      ),
    RemoteDevGuardFailure,
  );
  for (const unexpected of [
    "supabase db reset",
    "supabase db pull",
    "supabase migration repair",
    "drop schema public",
    "truncate table public.profiles",
  ]) {
    assert.throws(
      () =>
        verifyDryRunOutput(
          `${validOutput}\n${unexpected}`,
          plan,
        ),
      RemoteDevGuardFailure,
    );
  }
  assert.throws(
    () =>
      verifyProject004DryRunResult(
        {
          ...validResult,
          ok: false,
        },
        plan,
      ),
    RemoteDevGuardFailure,
  );
  assert.throws(
    () => verifyDryRunOutput("", plan),
    RemoteDevGuardFailure,
  );
  assert.throws(
    () =>
      verifyDryRunOutput(
        validResult.stderr,
        plan,
      ),
    RemoteDevGuardFailure,
  );
});

test("dry-run parser failure renders only sanitized subconditions", () => {
  const fixture = createDryRunConnectivityFixture({
    malformedDryRun: true,
  });
  const values = [
    validConfig.projectRef,
    validConfig.databasePassword,
  ];
  const command = runRemoteDevPreflightDryRunCommand({
    prompt: () => ({
      ok: true,
      value: values.shift() ?? "",
    }),
    execute: ({ environment, candidateRoot }) =>
      executeAuthorizedRemoteDevDryRun({
        environment,
        candidateRoot,
        runner: fixture.runner,
      }),
  });
  assert.equal(command.exitCode, 1);
  for (const expected of [
    "DRY_RUN_QUERY_EXIT=PASS",
    "DRY_RUN_SUCCESS_SIGNATURE=FAIL",
    "DRY_RUN_MIGRATION_HEADER_COUNT=0",
    "DRY_RUN_OBSERVED_MIGRATION_COUNT=0",
    "DRY_RUN_OBSERVED_FIRST_LAST=NONE",
    "DRY_RUN_DUPLICATE_MIGRATION_COUNT=0",
    "DRY_RUN_FOREIGN_MIGRATION_COUNT=0",
    "DRY_RUN_MIGRATION_ORDER=NOT_RUN",
    "DRY_RUN_CANONICAL_PLAN_CHECKSUMS=PASS",
    "DRY_RUN_SEED_OPERATION_COUNT=0",
    "DRY_RUN_DESTRUCTIVE_OPERATION_COUNT=0",
    "DRY_RUN_PARSER_FAILURE_CODE=SUCCESS_SIGNATURE_MISSING",
    "ROOT_FAILURE_CODE=DRY_RUN_OUTPUT_UNRECOGNIZED",
  ]) {
    assert.match(
      command.output,
      new RegExp(expected, "u"),
    );
  }
  assert.doesNotMatch(
    command.output,
    /progress only|\u001B|supabase[.]co/iu,
  );
  assert.doesNotMatch(
    command.output,
    new RegExp(validConfig.projectRef, "u"),
  );
  assert.doesNotMatch(
    command.output,
    new RegExp(validConfig.databasePassword, "u"),
  );
});

test("curriculum transaction is canonical, complete, and inactive", () => {
  const content = buildProject004RemoteDevCurriculumSql();
  assert.deepEqual(content.counts, {
    releases: 1,
    units: 171,
    publicQuestions: 2052,
    privateSolutions: 2052,
    officialOutcomes: 546,
  });
  assert.match(content.sql, /begin;/u);
  assert.match(content.sql, /commit;/u);
  assert.match(content.sql, /'DRAFT'/u);
  assert.match(content.sql, /'INACTIVE'/u);
  assert.match(
    content.sql,
    /supabase_migrations[.]schema_migrations/u,
  );
  assert.match(content.sql, /not runtime_enabled/u);
  assert.match(content.sql, /not controlled_pilot_enabled/u);
  assert.match(content.sql, /not retention_runtime_enabled/u);
  assert.match(content.sql, /from auth[.]users/u);
  assert.match(
    content.sql,
    /v_legacy_published_units[\s\S]+?<>[\s\S]+?13/u,
  );
  assert.match(
    content.sql,
    /v_legacy_published_questions[\s\S]+?<>[\s\S]+?312/u,
  );
  assert.match(content.sql, /public_payload_sha256/u);
  assert.match(content.sql, /private_solution_sha256/u);
  assert.match(content.sql, /bundle_sha256/u);
  assert.match(
    content.sql,
    /REMOTE_CONTENT:PRECONDITION:PC004_LEGACY_CURRICULUM_BASELINE/u,
  );
  assert.doesNotMatch(content.sql, /insert into auth[.]users/iu);
  assert.doesNotMatch(
    content.sql,
    /insert into public[.](?:profiles|practice_attempts|curriculum_attempts|assignment_submissions)/iu,
  );
});

test("apply-once success executes one dry-run, one schema push, and one content transaction", () => {
  const fixture = createApplyFixtureRunner();
  const report = executeAuthorizedRemoteDevApplyOnce({
    environment: validApplyEnvironment,
    runner: fixture.runner,
  });

  assert.equal(report.ok, true);
  assert.equal(report.stage, "COMPLETE");
  assert.equal(report.rootFailureCode, "NONE");
  assert.equal(report.dryRunFingerprint, "PASS");
  assert.equal(report.cleanDisposableProof, "PASS");
  assert.equal(report.commandCounts.dryRun, 1);
  assert.equal(report.commandCounts.schemaPush, 1);
  assert.equal(report.commandCounts.schemaPushSucceeded, 1);
  assert.equal(report.commandCounts.contentTransaction, 1);
  assert.equal(
    report.commandCounts.contentTransactionSucceeded,
    1,
  );
  assert.equal(report.commandCounts.unexpected, 0);
  assert.equal(report.remoteMutationPerformed, "YES");
  assert.equal(report.localRuntimeUnchanged, "PASS");
  assert.deepEqual(fixture.calls, [
    "PROJECTS_LIST",
    "CONNECTIVITY_DIRECT",
    "BASELINE_QUERY",
    "DRY_RUN",
    "PROJECTS_LIST",
    "BASELINE_QUERY",
    "SCHEMA_PUSH",
    "CONTENT_TRANSACTION",
    "POST_APPLY_QUERY",
  ]);
  const output = renderApplyOnceReport(report);
  for (const expected of [
    "MIGRATIONS_APPLIED=40/40",
    "CLEAN_DISPOSABLE_PROOF=PASS",
    "MIGRATION_FIRST_LAST=0001/0040",
    "RELEASE_BANK=171/2052/2052/546",
    "UNIVERSAL_RELEASE=DRAFT/INACTIVE",
    "CURRICULUM_RUNTIME=false",
    "GRADE2_CONTROLLED_ADAPTIVE_PILOT=DISABLED",
    "AUTH_USER_COUNT=0",
    "STORAGE_OBJECT_COUNT=0",
    "SYNTHETIC_USER_COUNT=0",
    "RLS_AND_PRIVATE_SOLUTION_BOUNDARY=PASS",
    "LOCAL_RUNTIME_UNCHANGED=PASS",
    "PROJECT003=FROZEN_UNTOUCHED",
    "DEPLOYMENT_PERFORMED=NO",
    "PUBLICATION_PERFORMED=NO",
    "PROJECT004_REMOTE_DEV_PROVISIONED=PASS",
  ]) {
    assert.match(output, new RegExp(expected, "u"), expected);
  }
});

test("future apply reuses resolved pooler mode through schema, content, and post-apply", () => {
  const fixture = createApplyFixtureRunner({
    directConnectivityFailure: true,
  });
  const report = executeAuthorizedRemoteDevApplyOnce({
    environment: validApplyEnvironment,
    runner: fixture.runner,
  });
  assert.equal(report.ok, true);
  assert.equal(
    report.remoteDatabaseEndpointMode,
    "POOLER_SESSION",
  );
  assert.equal(
    fixture.databaseContexts[0]?.user,
    "postgres",
  );
  for (const context of fixture.databaseContexts.slice(1)) {
    assert.equal(
      context.user,
      `postgres.${testProjectRef}`,
      context.command,
    );
    assert.equal(context.sslMode, "require", context.command);
  }
});

test("apply-once precondition drift stops before every remote mutation", () => {
  const fixture = createApplyFixtureRunner({
    baselineOutput: "3709|0|1|0|0|0\n",
  });
  const report = executeAuthorizedRemoteDevApplyOnce({
    environment: validApplyEnvironment,
    runner: fixture.runner,
  });

  assert.equal(report.ok, false);
  assert.equal(report.stage, "PRECONDITION");
  assert.equal(report.rootFailureCode, "REMOTE_NOT_EMPTY");
  assert.equal(report.commandCounts.dryRun, 0);
  assert.equal(report.commandCounts.schemaPush, 0);
  assert.equal(report.commandCounts.contentTransaction, 0);
  assert.equal(report.remoteMutationPerformed, "NO");
  assert.deepEqual(fixture.calls, [
    "PROJECTS_LIST",
    "CONNECTIVITY_DIRECT",
    "BASELINE_QUERY",
  ]);
});

test("apply-once rechecks baseline after dry-run and stops on drift", () => {
  const fixture = createApplyFixtureRunner({
    baselineOutputs: [
      emptyBaselineOutput,
      "3709|0|1|0|0|0\n",
    ],
  });
  const report = executeAuthorizedRemoteDevApplyOnce({
    environment: validApplyEnvironment,
    runner: fixture.runner,
  });

  assert.equal(report.ok, false);
  assert.equal(report.stage, "PRECONDITION");
  assert.equal(
    report.rootFailureCode,
    "APPLY_PRECONDITION_CHANGED",
  );
  assert.equal(report.commandCounts.dryRun, 1);
  assert.equal(report.commandCounts.schemaPush, 0);
  assert.equal(report.commandCounts.contentTransaction, 0);
  assert.equal(report.remoteMutationPerformed, "NO");
  assert.deepEqual(fixture.calls, [
    "PROJECTS_LIST",
    "CONNECTIVITY_DIRECT",
    "BASELINE_QUERY",
    "DRY_RUN",
    "PROJECTS_LIST",
    "BASELINE_QUERY",
  ]);
});

test("schema failure is never retried and reports the safe migration boundary", () => {
  const fixture = createApplyFixtureRunner({
    schemaPushOk: false,
    schemaProgress: "0001,0002,0003",
  });
  const report = executeAuthorizedRemoteDevApplyOnce({
    environment: validApplyEnvironment,
    runner: fixture.runner,
  });

  assert.equal(report.ok, false);
  assert.equal(report.rootFailureCode, "REMOTE_SCHEMA_APPLY_FAILED");
  assert.equal(report.commandCounts.schemaPush, 1);
  assert.equal(report.commandCounts.contentTransaction, 0);
  assert.deepEqual(report.migrationProgress, {
    count: 3,
    lastPassed: "0003",
    firstFailed: "0004",
  });
  assert.equal(report.remoteMutationPerformed, "YES");
  assert.equal(
    fixture.calls.filter((call) => call === "SCHEMA_PUSH").length,
    1,
  );
  assert.equal(fixture.calls.includes("CONTENT_TRANSACTION"), false);
});

test("content failure is never retried and confirms transaction rollback", () => {
  const fixture = createApplyFixtureRunner({
    contentApplyOk: false,
    rollbackOutput: "0|0|0|0|0\n",
  });
  const report = executeAuthorizedRemoteDevApplyOnce({
    environment: validApplyEnvironment,
    runner: fixture.runner,
  });

  assert.equal(report.ok, false);
  assert.equal(
    report.rootFailureCode,
    "REMOTE_CONTENT_TRANSACTION_FAILED",
  );
  assert.equal(report.contentRollback, "PASS");
  assert.equal(report.commandCounts.schemaPush, 1);
  assert.equal(report.commandCounts.contentTransaction, 1);
  assert.equal(
    fixture.calls.filter(
      (call) => call === "CONTENT_TRANSACTION",
    ).length,
    1,
  );
  assert.equal(fixture.calls.includes("POST_APPLY_QUERY"), false);
});

test("migration progress parser fails closed on malformed history", () => {
  const { plan } = loadAndVerifyMigrationPlan();
  assert.deepEqual(
    parseMigrationProgress(commandResult("0001,0002\n"), plan),
    {
      count: 2,
      lastPassed: "0002",
      firstFailed: "0003",
    },
  );
  assert.deepEqual(
    parseMigrationProgress(
      commandResult("0001,9999\n"),
      plan,
    ),
    {
      count: "UNKNOWN",
      lastPassed: "UNKNOWN",
      firstFailed: "UNKNOWN",
    },
  );
});

test("consumed apply gate stops before prompt, remote access, or mutation", () => {
  const labels: string[] = [];
  let executeCalls = 0;
  let approvalObserved = "";
  const command = runProject004RemoteDevApplyCommand({
    prompt: (label) => {
      labels.push(label);
      return {
        ok: true,
        value:
          labels.length === 1
            ? validConfig.projectRef
            : validConfig.databasePassword,
      };
    },
    execute: ({ environment }) => {
      executeCalls += 1;
      approvalObserved =
        environment
          .PLAVE_PROJECT004_REMOTE_OWNER_APPROVAL ?? "";
      return notRunApplyOnceReport(
        "TEST_EXECUTION_STOP",
        "PASS",
        "PASS",
        "PASS",
      );
    },
  });
  assert.equal(command.exitCode, 1);
  assert.deepEqual(labels, []);
  assert.equal(executeCalls, 0);
  assert.equal(approvalObserved, "");
  assert.match(
    command.output,
    /ROOT_FAILURE_CODE=APPLY_OWNER_APPROVAL_REQUIRED/u,
  );
  assert.match(command.output, /CLEAN_DISPOSABLE_PROOF=PASS/u);
  assert.match(command.output, /SCHEMA_PUSH_ATTEMPTS=0/u);
  assert.match(command.output, /REMOTE_MUTATION_PERFORMED=NO/u);
});

test("apply audit gate rejects repeated or out-of-order mutation", () => {
  const temporaryDirectory = mkdtempSync(
    join(tmpdir(), "project004-apply-gate-test-"),
  );
  const contentPath = join(temporaryDirectory, "content.sql");
  const contentSql = "begin;\nselect 1;\ncommit;\n";
  writeFileSync(contentPath, contentSql, { mode: 0o600 });
  try {
    const delegated: string[] = [];
    const audited = createAuditedRemoteDevApplyOnceRunner({
      contentPath,
      contentSha256: createHash("sha256")
        .update(contentSql)
        .digest("hex"),
      delegate: (command, args) => {
        delegated.push(`${command}:${args.join(" ")}`);
        return commandResult("");
      },
    });
    const environment: NodeJS.ProcessEnv = {
      NODE_ENV: "test",
    };
    assert.equal(
      audited.runner(
        "supabase",
        ["db", "push"],
        environment,
      ).ok,
      false,
    );
    assert.equal(
      audited.runner(
        "supabase",
        ["db", "push", "--dry-run"],
        environment,
      ).ok,
      true,
    );
    assert.equal(
      audited.runner(
        "supabase",
        ["db", "push"],
        environment,
      ).ok,
      true,
    );
    assert.equal(
      audited.runner(
        "supabase",
        ["db", "push"],
        environment,
      ).ok,
      false,
    );
    assert.equal(
      audited.runner(
        "psql",
        [
          "--no-psqlrc",
          "--quiet",
          "--set",
          "ON_ERROR_STOP=1",
          "--file",
          contentPath,
        ],
        environment,
      ).ok,
      true,
    );
    assert.equal(
      audited.runner(
        "psql",
        [
          "--no-psqlrc",
          "--quiet",
          "--set",
          "ON_ERROR_STOP=1",
          "--file",
          contentPath,
        ],
        environment,
      ).ok,
      false,
    );
    assert.equal(audited.counts.schemaPush, 1);
    assert.equal(audited.counts.contentTransaction, 1);
    assert.equal(audited.counts.unexpected, 3);
    assert.equal(delegated.length, 3);
  } finally {
    rmSync(temporaryDirectory, {
      recursive: true,
      force: true,
    });
  }
});

test("guarded mutation entry points stop safely without a controlling TTY", () => {
  for (const script of [
    "scripts/link-project004-remote-dev.ts",
    "scripts/apply-project004-remote-dev.ts",
  ]) {
    const result = spawnSync(
      process.execPath,
      ["--experimental-strip-types", script],
      {
        cwd: process.cwd(),
        env: {
          NODE_ENV: "test",
          PATH: process.env.PATH,
        },
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    assert.equal(result.status, 1);
    assert.match(result.stdout, /=FAIL\n$/u);
    assert.doesNotMatch(result.stdout, /(?:password|token|key|ref)/iu);
  }
});

test("npm apply executable smoke stops at consumed approval before remote access", () => {
  const result = spawnSync(
    "npm",
    ["run", "--silent", "remote-dev:apply"],
    {
      cwd: process.cwd(),
      env: {
        NODE_ENV: "test",
        PATH: process.env.PATH,
      },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10_000,
    },
  );
  assert.equal(result.status, 1);
  assert.match(
    result.stdout,
    /ROOT_FAILURE_CODE=APPLY_OWNER_APPROVAL_REQUIRED/u,
  );
  assert.match(result.stdout, /SCHEMA_PUSH_ATTEMPTS=0/u);
  assert.match(
    result.stdout,
    /CONTENT_TRANSACTION_ATTEMPTS=0/u,
  );
  assert.match(result.stdout, /REMOTE_MUTATION_PERFORMED=NO/u);
  assert.doesNotMatch(
    result.stdout,
    /(?:password|token|key|project reference)/iu,
  );
});

test("operation sources exclude pull, linked reset, seed, and local env loading", () => {
  const sources = [
    "scripts/project004-remote-dev-guard.ts",
    "scripts/project004-remote-dev-baseline.ts",
    "scripts/project004-remote-dev-operations.ts",
    "scripts/project004-remote-dev-audited-runner.ts",
    "scripts/project004-remote-dev-apply-once.ts",
    "scripts/project004-supabase-cli-auth.ts",
    "scripts/project004-secure-tty-prompt.ts",
    "scripts/project004-remote-partial-state-audit.ts",
    "scripts/run-project004-remote-partial-state-audit.ts",
    "scripts/project004-prefix-semantic-fingerprint.ts",
    "scripts/project004-prefix-recovery-contract.ts",
    "scripts/project004-prefix-recovery-preflight.ts",
    "scripts/project004-remote-forward-recovery.ts",
    "scripts/run-project004-remote-forward-recovery.ts",
    "scripts/run-project004-prefix-fresh-local-integration.ts",
    "scripts/run-project004-prefix-recovery-audit.ts",
    "scripts/inspect-project004-remote-foreign-object.ts",
    "scripts/preflight-project004-remote-dev.ts",
    "scripts/link-project004-remote-dev.ts",
    "scripts/dry-run-project004-remote-dev.ts",
    "scripts/run-project004-remote-dev-preflight-dry-run.ts",
    "scripts/apply-project004-remote-dev.ts",
    "scripts/diagnose-project004-remote-dev.ts",
  ]
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  assert.match(
    sources,
    /\["db", "push", "--dry-run"\]/u,
  );
  assert.match(sources, /\["db", "push"\]/u);
  assert.doesNotMatch(sources, /\["db", "pull"/u);
  assert.doesNotMatch(sources, /\["db", "reset"/u);
  assert.doesNotMatch(
    sources,
    /\["link",\s*"--project-ref"/u,
  );
  assert.doesNotMatch(sources, /--include-seed/u);
  assert.doesNotMatch(
    sources,
    /--env-file(?:-if-exists)?(?:=|\s+)[^\s]*[.]env[.]local/u,
  );
  assert.doesNotMatch(sources, /\b(?:dotenv|loadEnvConfig|readEnvFile)\b/u);
  assert.match(
    readFileSync(
      "scripts/project004-remote-dev-audited-runner.ts",
      "utf8",
    ),
    /fileFingerprint[\s\S]*resolve\(root,\s*["'][.]env[.]local["']\)/u,
  );
  assert.match(
    sources,
    new RegExp(project004RemoteDevContract.linkApproval, "u"),
  );
  assert.match(
    sources,
    new RegExp(project004RemoteDevContract.applyApproval, "u"),
  );
});

test("audited runner allows one dry-run and rejects mutation or repetition", () => {
  const delegated: string[] = [];
  const audited = createAuditedRemoteDevRunner(
    (command, args) => {
      delegated.push(`${command}:${args.join(" ")}`);
      return commandResult("PASS");
    },
  );
  const environment: NodeJS.ProcessEnv = { NODE_ENV: "test" };
  assert.equal(
    audited.runner(
      "supabase",
      ["projects", "list", "--output", "json"],
      environment,
    ).ok,
    true,
  );
  assert.equal(
    audited.runner(
      "psql",
      [
        "--command",
        "begin read only; select count(*) from pg_catalog.pg_class; commit;",
      ],
      environment,
    ).ok,
    true,
  );
  assert.equal(
    audited.runner(
      "supabase",
      ["link", "--project-ref", "a".repeat(20)],
      environment,
    ).ok,
    false,
  );
  assert.equal(
    audited.runner(
      "supabase",
      ["db", "push", "--dry-run"],
      environment,
    ).ok,
    true,
  );
  assert.equal(
    audited.runner(
      "supabase",
      ["db", "push", "--dry-run"],
      environment,
    ).ok,
    false,
  );
  assert.equal(
    audited.runner(
      "supabase",
      ["db", "push"],
      environment,
    ).ok,
    false,
  );
  assert.equal(audited.counts.dryRun, 2);
  assert.equal(audited.counts.destructive, 1);
  assert.equal(audited.counts.guardedLink, 0);
  assert.equal(audited.counts.unexpected, 3);
  assert.equal(delegated.length, 3);
});

test("single authorized runner uses controlling TTY prompts and safe report labels", () => {
  const runnerSource = readFileSync(
    "scripts/run-project004-remote-dev-preflight-dry-run.ts",
    "utf8",
  );
  const ttySource = readFileSync(
    "scripts/project004-secure-tty-prompt.ts",
    "utf8",
  );
  const source = `${runnerSource}\n${ttySource}`;
  assert.match(ttySource, /openSync\("\/dev\/tty"/u);
  assert.match(ttySource, /"-echo"/u);
  assert.match(ttySource, /"-icanon"/u);
  assert.match(ttySource, /finally/u);
  assert.doesNotMatch(source, /osascript|display dialog/iu);
  assert.match(
    runnerSource,
    /Project004 remote project reference: /u,
  );
  assert.match(
    runnerSource,
    /Project004 remote database password: /u,
  );
  assert.match(runnerSource, /--prompt-smoke/u);
  assert.match(runnerSource, /SECURE_PROMPT_SMOKE=PASS/u);
  for (const label of [
    "REMOTE_IDENTITY_GUARD",
    "EMPTY_REMOTE_STATE",
    "LOCAL_MIGRATION_CHECKSUMS",
    "CLEAN_DISPOSABLE_PROOF",
    "DRY_RUN_MIGRATION_COUNT",
    "DRY_RUN_FIRST_LAST_MIGRATION",
    "DESTRUCTIVE_OR_UNEXPECTED_OPERATION_COUNT",
    "LOCAL_RUNTIME_UNCHANGED",
    "REMOTE_MUTATION_PERFORMED",
    "ROOT_FAILURE_CODE",
    "PLATFORM_BASELINE_OBJECTS",
    "PLAVE_APPLICATION_OBJECTS",
    "FOREIGN_APPLICATION_OBJECTS",
    "AUTH_USER_COUNT",
    "STORAGE_OBJECT_COUNT",
    "MIGRATION_HISTORY_COUNT",
    "REMOTE_BASELINE_CLASSIFICATION",
  ]) {
    assert.ok(
      runnerSource.includes(label),
      `missing safe report ${label}`,
    );
  }
  assert.doesNotMatch(
    source,
    /stdout[.]write\([^)]*(?:projectRef|databasePassword)/u,
  );
});

test("dry-run and apply share one canonical CLI auth checker", () => {
  const operationsSource = readFileSync(
    "scripts/project004-remote-dev-operations.ts",
    "utf8",
  );
  const dryRunSource = readFileSync(
    "scripts/run-project004-remote-dev-preflight-dry-run.ts",
    "utf8",
  );
  const applySource = readFileSync(
    "scripts/apply-project004-remote-dev.ts",
    "utf8",
  );
  const applyOperationSource = readFileSync(
    "scripts/project004-remote-dev-apply-once.ts",
    "utf8",
  );
  assert.match(
    operationsSource,
    /runCanonicalSupabaseCliAuthCheck/u,
  );
  assert.doesNotMatch(
    `${dryRunSource}\n${applySource}\n${applyOperationSource}`,
    /\["projects",\s*"list"/u,
  );
  assert.match(
    applyOperationSource,
    /createCanonicalRemoteDevCommandRunner\(candidateRoot\)/u,
  );
  assert.match(
    readFileSync(
      "scripts/project004-remote-dev-audited-runner.ts",
      "utf8",
    ),
    /createCanonicalRemoteDevCommandRunner\(candidateRoot\)/u,
  );
});

test("package status records consumed clean-target apply and archives the deleted incident", () => {
  const status = JSON.parse(
    readFileSync(
      "docs/operations/PROJECT004_REMOTE_DEV_PROVISIONING_STATUS.json",
      "utf8",
    ),
  ) as Record<string, unknown>;
  assert.equal(
    status.phase,
    "REMOTE_RUNTIME_CONNECTION_PREPARATION",
  );
  assert.equal(
    status.targetName,
    "plave-project004-dev-clean",
  );
  assert.equal(
    status.currentPreparationRemoteAccessPerformed,
    false,
  );
  assert.equal(
    status.currentPreparationRemoteMutationPerformed,
    false,
  );
  const incident = status.incidentArchive as Record<
    string,
    unknown
  >;
  assert.equal(incident.status, "DELETED_PARTIAL_REMOTE");
  assert.equal(incident.operational, false);
  const apply = status.applyContract as Record<string, unknown>;
  const connectivity =
    status.connectivityDiagnosticContract as Record<
      string,
      unknown
    >;
  assert.equal(connectivity.status, "PASS");
  assert.equal(
    connectivity.observedEndpointMode,
    "POOLER_SESSION",
  );
  const dryRun = status.dryRunContract as Record<
    string,
    unknown
  >;
  assert.equal(
    dryRun.status,
    "OWNER_REPORTED_PASS_BEFORE_APPLY",
  );
  assert.equal(apply.operationAuthorized, false);
  assert.equal(apply.approvalConsumed, true);
  assert.equal(
    apply.status,
    "OWNER_REPORTED_COMPLETED",
  );
});

test("provisioning package contains no concrete remote credential or endpoint", () => {
  const packageText = [
    "scripts/project004-remote-dev-guard.ts",
    "scripts/project004-remote-dev-baseline.ts",
    "scripts/project004-remote-dev-operations.ts",
    "scripts/project004-remote-dev-audited-runner.ts",
    "scripts/project004-secure-tty-prompt.ts",
    "scripts/inspect-project004-remote-foreign-object.ts",
    "scripts/project004-remote-dev-curriculum.ts",
    "scripts/project004-remote-dev-apply-once.ts",
    "scripts/project004-supabase-cli-auth.ts",
    "scripts/project004-remote-partial-state-audit.ts",
    "scripts/run-project004-remote-partial-state-audit.ts",
    "scripts/project004-prefix-semantic-fingerprint.ts",
    "scripts/project004-prefix-recovery-contract.ts",
    "scripts/project004-prefix-recovery-preflight.ts",
    "scripts/project004-remote-forward-recovery.ts",
    "scripts/run-project004-remote-forward-recovery.ts",
    "scripts/run-project004-prefix-fresh-local-integration.ts",
    "scripts/run-project004-prefix-recovery-audit.ts",
    "scripts/preflight-project004-remote-dev.ts",
    "scripts/link-project004-remote-dev.ts",
    "scripts/dry-run-project004-remote-dev.ts",
    "scripts/apply-project004-remote-dev.ts",
    "scripts/diagnose-project004-remote-dev.ts",
    "scripts/run-project004-remote-dev-preflight-dry-run.ts",
    "docs/operations/PROJECT004_REMOTE_DEV_MIGRATION_PLAN.json",
    "docs/operations/PROJECT004_REMOTE_DEV_PROVISIONING_STATUS.json",
    "docs/operations/PROJECT004_REMOTE_DEV_PROVISIONING_RUNBOOK.md",
    "docs/operations/PROJECT004_CLEAN_REMOTE_DISPOSABLE_PROOF_RECEIPT.json",
    "docs/operations/PROJECT004_PREFIX_0038_SEMANTIC_FINGERPRINT.json",
    "docs/operations/PROJECT004_PARTIAL_PREFIX_FORWARD_RECOVERY.md",
    "tests/fixtures/project004-remote-baseline-classification.json",
  ]
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  assert.doesNotMatch(
    packageText,
    /https:\/\/[a-z0-9]{12,40}[.]supabase[.]co/iu,
  );
  assert.doesNotMatch(
    packageText,
    /postgres(?:ql)?:\/\/[^:/\s]+:[^@/\s]+@/iu,
  );
  assert.doesNotMatch(packageText, /\bsbp_[a-z0-9_-]+\b/iu);
  assert.doesNotMatch(packageText, /\beyJ[a-z0-9_-]{20,}\b/iu);
  assert.doesNotMatch(
    packageText,
    /"(?:projectRef|databasePassword|accessToken)"\s*:\s*"[^"]+"/iu,
  );
});

function canonicalHistoryRows(
  count: number,
  options?: {
    checksum?: boolean;
    order?: boolean;
  },
) {
  const { plan } = loadAndVerifyMigrationPlan();
  return plan.migrations.slice(0, count).map((entry, index) => ({
    version: entry.version,
    duplicate_count: 1,
    checksum: options?.checksum ? entry.sha256 : "NONE",
    order_index: options?.order ? index + 1 : null,
  }));
}

test("incident migration classifier proves only exact canonical history metadata", () => {
  const { plan } = loadAndVerifyMigrationPlan();
  const typicalSupabaseHistory =
    classifyIncidentMigrationHistory(
      canonicalHistoryRows(38),
      plan,
      false,
      false,
    );
  assert.equal(typicalSupabaseHistory.count, 38);
  assert.equal(typicalSupabaseHistory.firstLast, "0001/0038");
  assert.equal(typicalSupabaseHistory.contiguousPrefix, "PASS");
  assert.equal(typicalSupabaseHistory.prefixLast, "0038");
  assert.equal(
    typicalSupabaseHistory.missingMigrations,
    "0039,0040",
  );
  assert.equal(
    typicalSupabaseHistory.checksumDriftCount,
    "NOT_AVAILABLE",
  );
  assert.equal(
    typicalSupabaseHistory.outOfOrderVersions,
    "NOT_AVAILABLE",
  );

  const provableHistory = classifyIncidentMigrationHistory(
    canonicalHistoryRows(38, {
      checksum: true,
      order: true,
    }),
    plan,
    true,
    true,
  );
  assert.equal(provableHistory.checksumDriftCount, 0);
  assert.equal(provableHistory.outOfOrderVersions, 0);

  const drifted = canonicalHistoryRows(38, {
    checksum: true,
    order: true,
  });
  if (drifted[9]) drifted[9].checksum = "f".repeat(64);
  assert.equal(
    classifyIncidentMigrationHistory(
      drifted,
      plan,
      true,
      true,
    ).checksumDriftCount,
    1,
  );
});

test("incident migration classifier detects gaps, foreign, duplicate, and out-of-order versions", () => {
  const { plan } = loadAndVerifyMigrationPlan();
  const rows = canonicalHistoryRows(38, {
    checksum: true,
    order: true,
  });
  rows.splice(9, 1);
  rows.push({
    version: "9999",
    duplicate_count: 1,
    checksum: "e".repeat(64),
    order_index: 39,
  });
  if (rows[19]) rows[19].order_index = 5;
  const duplicated = rows.find(
    (row) => row.version === "0005",
  );
  if (!duplicated) assert.fail("missing duplicate fixture");
  duplicated.duplicate_count = 2;
  rows.push({ ...duplicated });

  const audit = classifyIncidentMigrationHistory(
    rows,
    plan,
    true,
    true,
  );
  assert.equal(audit.contiguousPrefix, "FAIL");
  assert.match(audit.missingMigrations, /0010/u);
  assert.equal(audit.foreignMigrations, 1);
  assert.equal(audit.duplicateVersions, 1);
  assert.ok(
    audit.outOfOrderVersions !== "NOT_AVAILABLE" &&
      audit.outOfOrderVersions > 0,
  );
});

test("prefix object inventory and incident SQL are migration-bounded and read-only", () => {
  const { root, plan } = loadAndVerifyMigrationPlan();
  const prefix = buildProject004PrefixObjectInventory(
    root,
    plan,
    38,
  );
  const full = buildProject004PrefixObjectInventory(
    root,
    plan,
    40,
  );
  assert.ok(prefix.length > 0);
  assert.ok(full.length > prefix.length);
  assert.ok(
    prefix.some(
      (object) =>
        object.category === "TRIGGER" &&
        object.schema === "auth" &&
        object.relation === "users" &&
        object.name === "on_auth_user_created",
    ),
  );
  assert.equal(
    prefix.some(
      (object) =>
        object.name === "curriculum_generated_questions",
    ),
    false,
  );
  assert.equal(
    full.some(
      (object) =>
        object.name === "curriculum_generated_questions",
    ),
    true,
  );
  for (const sql of [
    buildIncidentObjectAuditSql(prefix, full),
    buildIncidentDataAuditSql(),
  ]) {
    assert.equal(
      isReadOnlySqlCommand(["--command", sql]),
      true,
    );
  }
});

test("incident command gate rejects every mutation and dry-run path", () => {
  const delegated: string[] = [];
  const audited = createAuditedRemoteIncidentRunner(
    (command, args) => {
      delegated.push(`${command}:${args.join(" ")}`);
      return commandResult("PASS");
    },
  );
  assert.equal(
    audited.runner(
      "supabase",
      ["projects", "list", "--output", "json"],
      validEnvironment,
    ).ok,
    true,
  );
  assert.equal(
    audited.runner(
      "psql",
      [
        "--command",
        "begin read only; select count(*) from pg_catalog.pg_class; commit;",
      ],
      validEnvironment,
    ).ok,
    true,
  );
  for (const args of [
    ["db", "push", "--dry-run"],
    ["db", "push"],
    ["db", "reset"],
    ["db", "pull"],
  ]) {
    assert.equal(
      audited.runner("supabase", args, validEnvironment).ok,
      false,
    );
  }
  assert.equal(
    audited.runner(
      "psql",
      [
        "--command",
        "begin; update public.profiles set role = role; commit;",
      ],
      validEnvironment,
    ).ok,
    false,
  );
  assert.equal(audited.counts.mutation, 5);
  assert.equal(audited.counts.unexpected, 5);
  assert.equal(delegated.length, 2);
});

function createIncidentFixtureRunner(options?: {
  foreignApplicationObjects?: number;
  checksumMetadata?: boolean;
  orderMetadata?: boolean;
}) {
  const { root, plan } = loadAndVerifyMigrationPlan();
  const expected = buildProject004PrefixObjectInventory(
    root,
    plan,
    38,
  ).length;
  const full = buildProject004PrefixObjectInventory(
    root,
    plan,
    40,
  );
  const calls: Array<{
    command: string;
    args: string[];
  }> = [];
  const runner: RemoteDevCommandRunner = (command, args) => {
    calls.push({ command, args: [...args] });
    assert.equal(args.includes(testProjectRef), false);
    assert.equal(
      args.includes(validConfig.databasePassword),
      false,
    );
    if (command === "supabase") {
      assert.deepEqual(args, [
        "projects",
        "list",
        "--output",
        "json",
      ]);
      return commandResult(
        JSON.stringify([
          {
            id: testProjectRef,
            name: project004RemoteDevContract.projectName,
            status: "ACTIVE_HEALTHY",
          },
        ]),
      );
    }
    if (command !== "psql") return commandResult("", false);
    const sql = args[args.indexOf("--command") + 1] ?? "";
    if (sql.includes("object_totals.platform_count")) {
      return commandResult(
        `3709|189|${options?.foreignApplicationObjects ?? 0}|0|0|1\n`,
      );
    }
    if (
      sql.includes("count(*) filter") &&
      sql.includes("supabase_migrations.schema_migrations")
    ) {
      return commandResult("38|38\n");
    }
    if (sql.includes("json_agg(column_name")) {
      const columns = ["version", "statements", "name"];
      if (options?.checksumMetadata) columns.push("checksum");
      if (options?.orderMetadata) columns.push("inserted_at");
      return commandResult(`${JSON.stringify(columns)}\n`);
    }
    if (sql.includes("json_build_object")) {
      return commandResult(
        `${JSON.stringify(
          canonicalHistoryRows(38, {
            checksum: options?.checksumMetadata,
            order: options?.orderMetadata,
          }),
        )}\n`,
      );
    }
    if (sql.includes("expected_objects")) {
      return commandResult(
        `${expected}|${expected}|${expected}|0|0|0|0|1\n`,
      );
    }
    if (sql.includes("runtime_enabled or")) {
      return commandResult(
        [
          1,
          1,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
        ].join("|") + "\n",
      );
    }
    if (sql.includes("'INSPECTION_V1'")) {
      return commandResult(
        "INSPECTION_V1|1|ROUTINE|PUBLIC_APPLICATION_SURFACE|PLATFORM_SUPERUSER|0|SUPABASE_AUTOMATIC_RLS|YES|NO_DIRECT_CATALOG_DEPENDENCY|public.rls_auto_enable()|NO|1\n",
      );
    }
    assert.fail(
      `unexpected read-only incident fixture query (${full.length})`,
    );
  };
  return { runner, calls, expected };
}

test("simulated incident audit reports preexisting canonical prefix without mutation", () => {
  const fixture = createIncidentFixtureRunner();
  const report = executeRemotePartialStateIncidentAudit({
    environment: validEnvironment,
    runner: fixture.runner,
  });
  assert.equal(report.ok, true);
  assert.equal(report.currentRunMutationPerformed, "NO");
  assert.equal(report.preexistingRemoteApplicationState, "YES");
  assert.equal(report.migration?.count, 38);
  assert.equal(report.migration?.prefixLast, "0038");
  assert.equal(report.schema?.expectedForPrefix, fixture.expected);
  assert.equal(report.schema?.missingObjects, 0);
  assert.equal(report.data?.authUsers, 0);
  assert.equal(report.data?.storageObjects, 0);
  assert.equal(report.data?.syntheticUsers, 0);
  assert.equal(report.recoveryEligible, "NO");
  assert.equal(
    report.rootFailureCode,
    "REMOTE_PARTIAL_STATE_CONFIRMED",
  );
  assert.equal(report.commandCounts.mutation, 0);
  assert.equal(report.commandCounts.unexpected, 0);
  assert.equal(
    fixture.calls.some(
      (call) =>
        call.command === "supabase" &&
        call.args[0] === "db",
    ),
    false,
  );
});

test("recovery eligibility requires exact checksum and order evidence", () => {
  const fixture = createIncidentFixtureRunner({
    checksumMetadata: true,
    orderMetadata: true,
  });
  const report = executeRemotePartialStateIncidentAudit({
    environment: validEnvironment,
    runner: fixture.runner,
  });
  assert.equal(report.migration?.checksumDriftCount, 0);
  assert.equal(report.migration?.outOfOrderVersions, 0);
  assert.equal(report.recoveryEligible, "YES");
});

test("Automatic RLS foreign evidence remains explicit and recovery stays blocked", () => {
  const fixture = createIncidentFixtureRunner({
    foreignApplicationObjects: 1,
    checksumMetadata: true,
    orderMetadata: true,
  });
  const report = executeRemotePartialStateIncidentAudit({
    environment: validEnvironment,
    runner: fixture.runner,
  });
  assert.equal(
    report.foreignClassification,
    "SUPABASE_AUTOMATIC_RLS",
  );
  assert.equal(report.schema?.extraObjects, 1);
  assert.equal(report.recoveryEligible, "NO");
});

test("dry-run construction audit records exact sanitized argv contract and no hidden push path", () => {
  const audit = auditPriorDryRunConstruction();
  assert.equal(audit.dryRunArgvContract, "PASS");
  assert.equal(
    audit.sanitizedDryRunArgvEvidence,
    "supabase/db/push/--dry-run",
  );
  assert.equal(audit.childProcessSequence, "PASS");
  assert.equal(audit.dryRunOutputParser, "PASS");
  assert.equal(audit.fallbackMutationPath, "NOT_FOUND");
  assert.equal(audit.hiddenSchemaPushPath, "NOT_FOUND");
  assert.equal(audit.priorCapturedArgv, "NOT_RECORDED");
  const operations = readFileSync(
    "scripts/project004-remote-dev-operations.ts",
    "utf8",
  );
  assert.match(
    operations,
    /runner\(\s*"supabase",\s*\["db", "push", "--dry-run"\]/u,
  );
});

test("incident command prompts twice, keeps credentials out of output, and renders safe audit fields", () => {
  const values = [testProjectRef, validConfig.databasePassword];
  const labels: string[] = [];
  const fixture = createIncidentFixtureRunner();
  const command = runProject004RemotePartialStateAuditCommand({
    prompt: (label) => {
      labels.push(label);
      return { ok: true, value: values.shift() ?? "" };
    },
    execute: ({ environment, candidateRoot }) =>
      executeRemotePartialStateIncidentAudit({
        environment,
        candidateRoot,
        runner: fixture.runner,
      }),
  });
  assert.equal(command.exitCode, 0);
  assert.deepEqual(labels, [
    "Project004 remote project reference: ",
    "Project004 remote database password: ",
  ]);
  assert.match(
    command.output,
    /CURRENT_RUN_MUTATION_PERFORMED=NO/u,
  );
  assert.match(
    command.output,
    /PREEXISTING_REMOTE_APPLICATION_STATE=YES/u,
  );
  assert.match(
    command.output,
    /REMOTE_MIGRATION_FIRST_LAST=0001\/0038/u,
  );
  assert.match(
    command.output,
    /PARTIAL_STATE_RECOVERY_ELIGIBLE=NO/u,
  );
  assert.doesNotMatch(
    command.output,
    new RegExp(
      `${testProjectRef}|${validConfig.databasePassword}`,
      "u",
    ),
  );
});

test("incident report has exactly one safe root failure field", () => {
  const report = executeRemotePartialStateIncidentAudit({
    environment: validEnvironment,
    runner: createIncidentFixtureRunner().runner,
  });
  const output = renderRemotePartialStateAudit(report);
  assert.equal(
    output.match(/^ROOT_FAILURE_CODE=/gmu)?.length,
    1,
  );
  assert.doesNotMatch(
    output,
    /(?:project.ref|database.password|token|host|uuid|identity)=/iu,
  );
});

test("npm incident audit smoke stops at unavailable TTY before remote access", () => {
  const result = spawnSync(
    "npm",
    ["run", "--silent", "remote-dev:incident-audit"],
    {
      cwd: process.cwd(),
      env: {
        NODE_ENV: "test",
        PATH: process.env.PATH,
      },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10_000,
    },
  );
  assert.equal(result.status, 1);
  assert.match(
    result.stdout,
    /ROOT_FAILURE_CODE=SECURE_TTY_UNAVAILABLE/u,
  );
  assert.match(
    result.stdout,
    /CURRENT_RUN_MUTATION_PERFORMED=NO/u,
  );
  assert.match(result.stdout, /REMOTE_MIGRATION_COUNT=NOT_RUN/u);
  assert.match(result.stdout, /READ_ONLY_COMMAND_COUNT=0/u);
  assert.doesNotMatch(
    result.stdout,
    /(?:password|token|key|project reference)/iu,
  );
});
