import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  analyzeBootstrapFailure,
  classifySanitizedLog,
  parseSupabaseCliVersion,
  renderBootstrapDiagnostic,
  type BootstrapDiagnosticReport,
} from "../scripts/project004-supabase-bootstrap-diagnostic.ts";

const root = resolve(import.meta.dirname, "..");

test("CLI version parser accepts only the pinned major compatibility line", () => {
  assert.deepEqual(parseSupabaseCliVersion("2.45.3\n"), {
    version: "2.45.3",
    compatibility: "PASS",
  });
  assert.deepEqual(parseSupabaseCliVersion("3.0.0\n"), {
    version: "3.0.0",
    compatibility: "FAIL",
  });
  assert.deepEqual(parseSupabaseCliVersion("unknown\n"), {
    version: "UNRECOGNIZED",
    compatibility: "FAIL",
  });
});

test("sanitized log classifier distinguishes bind, resource, permission, DNS, TLS, image and config causes", () => {
  assert.equal(
    classifySanitizedLog(
      "bind: address already in use; port is already allocated",
    ),
    "PORT_BIND_FAILED",
  );
  assert.equal(
    classifySanitizedLog("no space left on device"),
    "DISK_EXHAUSTED",
  );
  assert.equal(
    classifySanitizedLog("fatal: out of memory"),
    "MEMORY_EXHAUSTED",
  );
  assert.equal(
    classifySanitizedLog("operation not permitted"),
    "PERMISSION_DENIED",
  );
  assert.equal(
    classifySanitizedLog("temporary failure in name resolution"),
    "DNS_FAILED",
  );
  assert.equal(
    classifySanitizedLog("x509 certificate verification failed"),
    "TLS_FAILED",
  );
  assert.equal(
    classifySanitizedLog("manifest unknown"),
    "IMAGE_PULL_FAILED",
  );
  assert.equal(
    classifySanitizedLog("failed to parse TOML configuration"),
    "CONFIG_INVALID",
  );
});

test("first failed service and one high-confidence root cause come from sanitized container evidence", () => {
  const result = analyzeBootstrapFailure({
    cliOutput: "health check failed",
    containers: [
      {
        service: "AUTH",
        state: "running",
        exitCode: 0,
        health: "healthy",
        logCategory: "UNRECOGNIZED",
        imageAvailable: true,
      },
      {
        service: "DATABASE",
        state: "exited",
        exitCode: 1,
        health: "unhealthy",
        logCategory: "PERMISSION_DENIED",
        imageAvailable: true,
      },
    ],
  });
  assert.deepEqual(result, {
    firstServiceFailed: "DATABASE",
    serviceExitCategory: "APPLICATION_ERROR",
    serviceHealthCategory: "PERMISSION_DENIED",
    imageState: "AVAILABLE",
    rootFailureCode:
      "BOOTSTRAP_DATABASE_PERMISSION_DENIED",
    rootCauseConfidence: "HIGH",
  });
});

test("unrecognized CLI-only failure stays low confidence and never invents migration failure", () => {
  const result = analyzeBootstrapFailure({
    cliOutput:
      "failed to start local development stack for an unknown reason",
    containers: [],
  });
  assert.equal(result.firstServiceFailed, "CLI");
  assert.equal(
    result.rootFailureCode,
    "BOOTSTRAP_CLI_LOCAL_SERVICE_BOOTSTRAP_FAILED",
  );
  assert.equal(result.rootCauseConfidence, "LOW");
});

test("safe renderer includes required fields without container identity or migration attribution", () => {
  const report: BootstrapDiagnosticReport = {
    dockerDaemon: "PASS",
    dockerResourceState: "ADEQUATE",
    hostArchitecture: "ARM64",
    supabaseCliVersion: "2.45.3",
    supabaseCliVersionCompatibility: "PASS",
    tempConfigValidation: "PASS",
    disposablePortSet: "PASS",
    firstServiceFailed: "DATABASE",
    serviceExitCategory: "APPLICATION_ERROR",
    serviceHealthCategory: "PERMISSION_DENIED",
    imageState: "AVAILABLE",
    bootstrapTimeoutStage: "SUPABASE_START",
    baselineStackReady: "FAIL",
    migrationSqlExecutionStarted: "NO",
    disposableCleanup: "PASS",
    rootFailureCode:
      "BOOTSTRAP_DATABASE_PERMISSION_DENIED",
    rootCauseConfidence: "HIGH",
  };
  const output = renderBootstrapDiagnostic(report);
  for (const marker of [
    "DOCKER_DAEMON=PASS",
    "DOCKER_RESOURCE_STATE=ADEQUATE",
    "SUPABASE_CLI_VERSION_COMPATIBILITY=PASS",
    "TEMP_CONFIG_VALIDATION=PASS",
    "DISPOSABLE_PORT_SET=PASS",
    "FIRST_SERVICE_FAILED=DATABASE",
    "SERVICE_EXIT_CATEGORY=APPLICATION_ERROR",
    "SERVICE_HEALTH_CATEGORY=PERMISSION_DENIED",
    "IMAGE_STATE=AVAILABLE",
    "BOOTSTRAP_TIMEOUT_STAGE=SUPABASE_START",
    "BASELINE_STACK_READY=FAIL",
    "FIRST_MIGRATION_FAILED=NOT_RUN",
    "MIGRATION_SQL_EXECUTION_STARTED=NO",
    "DISPOSABLE_CLEANUP=PASS",
    "ROOT_CAUSE_CONFIDENCE=HIGH",
  ]) {
    assert.match(output, new RegExp(marker, "u"));
  }
  assert.doesNotMatch(
    output,
    /container|project-id|https?:|postgres(?:ql)?:|token|key/iu,
  );
});

test("bootstrap diagnostic source has no app migration, database mutation, content or broad cleanup path", () => {
  const source = readFileSync(
    resolve(
      root,
      "scripts/project004-supabase-bootstrap-diagnostic.ts",
    ),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /\b(?:db\s+reset|migration\s+up|db\s+push|content transaction)\b/iu,
  );
  assert.doesNotMatch(
    source,
    /supabase[/\\]migrations|copyFileSync|buildProject004RemoteDevCurriculumSql/u,
  );
  assert.doesNotMatch(
    source,
    /\[\s*"stop"\s*,\s*"--all"/u,
  );
  assert.match(
    source,
    /"stop"[\s\S]{0,500}"--project-id"[\s\S]{0,200}"--no-backup"/u,
  );
  assert.match(
    source,
    /readdirSync[(]migrationsPath[)][.]length\s*!==\s*0/u,
  );
  assert.match(
    source,
    /migrationSqlExecutionStarted:\s*"NO"/u,
  );
});

test("Node 22 executable smoke classifies fixtures without Docker, Supabase or remote access", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-strip-types",
      "scripts/run-project004-supabase-bootstrap-diagnostic.ts",
      "--smoke",
    ],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout,
    "BOOTSTRAP_DIAGNOSTIC_SMOKE=PASS\n" +
      "MIGRATION_SQL_EXECUTION_STARTED=NO\n" +
      "REMOTE_ACCESS_PERFORMED=NO\n" +
      "REMOTE_MUTATION_PERFORMED=NO\n",
  );
});
