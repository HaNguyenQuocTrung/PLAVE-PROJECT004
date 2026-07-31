import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  classifyRemoteConnectivityFailure,
  createRemoteConnectivityAuditedRunner,
  executeProject004RemoteConnectivityDiagnostic,
  project004RemoteConnectivityPsqlArgs,
  project004RemoteConnectivitySql,
  type RemoteConnectivityCommandRunner,
  type RemoteConnectivityReport,
} from "../scripts/project004-remote-connectivity-diagnostic.ts";
import {
  renderProject004RemoteConnectivityReport,
  runProject004RemoteConnectivityDiagnosticCommand,
} from "../scripts/run-project004-remote-connectivity-diagnostic.ts";
import {
  project004RemoteDevContract,
  type RemoteDevPrivateConfig,
  type SafeCommandResult,
} from "../scripts/project004-remote-dev-guard.ts";

const candidateRoot = process.cwd();
const projectRef = "a".repeat(20);
const databasePassword = "p".repeat(20);
const config: RemoteDevPrivateConfig = {
  projectName: project004RemoteDevContract.projectName,
  projectRef,
  databasePassword,
  environmentClass: project004RemoteDevContract.environmentClass,
};
const sentinelOutput =
  "PROJECT004_REMOTE_CONNECTIVITY_V1|1\n";

function result(
  ok: boolean,
  stdout = "",
  stderr = "",
): SafeCommandResult {
  return { ok, stdout, stderr };
}

function projectsOutput(
  overrides: Record<string, unknown> = {},
) {
  return JSON.stringify([
    {
      ref: projectRef,
      name: project004RemoteDevContract.projectName,
      status: "ACTIVE_HEALTHY",
      region: "ap-southeast-1",
      ...overrides,
    },
  ]);
}

function classify(
  stderr: string,
  mode: "DIRECT" | "POOLER_SESSION" = "DIRECT",
) {
  return classifyRemoteConnectivityFailure(
    result(false, "", stderr),
    mode,
  );
}

test("connectivity failure classifier distinguishes every safe root category", () => {
  assert.equal(
    classify("password authentication failed for user"),
    "DATABASE_PASSWORD_INVALID",
  );
  assert.equal(
    classify("could not translate host name"),
    "DNS_RESOLUTION_FAILED",
  );
  assert.equal(
    classify("Network is unreachable"),
    "DIRECT_IPV6_UNAVAILABLE",
  );
  assert.equal(
    classify("Network is unreachable", "POOLER_SESSION"),
    "NETWORK_UNREACHABLE",
  );
  assert.equal(
    classify("SSL handshake failed"),
    "TLS_FAILED",
  );
  assert.equal(
    classify("connection timed out"),
    "CONNECTION_TIMEOUT",
  );
  assert.equal(
    classifyRemoteConnectivityFailure(
      {
        ok: false,
        stdout: "",
        stderr: "",
        timedOut: true,
      },
      "DIRECT",
    ),
    "CONNECTION_TIMEOUT",
  );
  assert.equal(
    classify("connection to server at 2001:db8::1 timed out"),
    "DIRECT_IPV6_UNAVAILABLE",
  );
  assert.equal(
    classify("connection refused"),
    "DATABASE_CONNECTION_REFUSED",
  );
  assert.equal(
    classify("tenant or user not found", "POOLER_SESSION"),
    "POOLER_UNAVAILABLE",
  );
  assert.equal(
    classify("an unknown database response"),
    "DATABASE_ERROR_UNRECOGNIZED",
  );
});

test("direct endpoint executes exactly one TLS read-only SELECT 1 without secret argv", () => {
  const calls: Array<{
    command: string;
    args: string[];
    environment: NodeJS.ProcessEnv;
  }> = [];
  const runner: RemoteConnectivityCommandRunner = (
    command,
    args,
    environment,
  ) => {
    calls.push({ command, args, environment });
    if (command === "supabase") {
      return result(true, projectsOutput());
    }
    return result(true, sentinelOutput);
  };
  const report = executeProject004RemoteConnectivityDiagnostic({
    config: { ...config },
    candidateRoot,
    environment: { ...process.env },
    runner,
  });

  assert.equal(report.ok, true);
  assert.equal(report.endpointMode, "DIRECT");
  assert.equal(report.directConnectivity, "PASS");
  assert.equal(report.poolerFallback, "NOT_RUN");
  assert.equal(report.readOnlySelect1, "PASS");
  assert.equal(report.emptyStateInspection, "NOT_RUN");
  assert.equal(report.dryRun, "NOT_RUN");
  assert.equal(report.remoteMutationPerformed, "NO");
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0]?.args, [
    "projects",
    "list",
    "--output",
    "json",
  ]);
  assert.deepEqual(
    calls[1]?.args,
    [...project004RemoteConnectivityPsqlArgs],
  );
  assert.equal(calls[1]?.environment.PGSSLMODE, "require");
  assert.equal(calls[1]?.environment.PGPORT, "5432");
  assert.equal(calls[1]?.environment.PGPASSWORD, databasePassword);
  assert.doesNotMatch(calls[1]?.args.join(" "), new RegExp(projectRef, "u"));
  assert.doesNotMatch(
    calls[1]?.args.join(" "),
    new RegExp(databasePassword, "u"),
  );
});

test("direct IPv6 network failure uses exactly one IPv4 session-pooler fallback", () => {
  const databaseEnvironments: NodeJS.ProcessEnv[] = [];
  const runner: RemoteConnectivityCommandRunner = (
    command,
    _args,
    environment,
  ) => {
    if (command === "supabase") {
      return result(true, projectsOutput());
    }
    databaseEnvironments.push(environment);
    return databaseEnvironments.length === 1
      ? result(false, "", "Network is unreachable")
      : result(true, sentinelOutput);
  };
  const report = executeProject004RemoteConnectivityDiagnostic({
    config: { ...config },
    candidateRoot,
    environment: { ...process.env },
    runner,
  });

  assert.equal(report.ok, true);
  assert.equal(report.endpointMode, "POOLER_SESSION");
  assert.equal(report.directFailureCode, "DIRECT_IPV6_UNAVAILABLE");
  assert.equal(report.poolerFallback, "PASS");
  assert.equal(report.poolerFailureCode, "NONE");
  assert.equal(databaseEnvironments.length, 2);
  assert.equal(
    databaseEnvironments[1]?.PGHOST,
    "aws-0-ap-southeast-1.pooler.supabase.com",
  );
  assert.equal(databaseEnvironments[1]?.PGPORT, "5432");
  assert.equal(databaseEnvironments[1]?.PGUSER, `postgres.${projectRef}`);
  assert.equal(databaseEnvironments[1]?.PGSSLMODE, "require");
});

test("password failure does not trigger pooler fallback", () => {
  let psqlCalls = 0;
  const runner: RemoteConnectivityCommandRunner = (command) => {
    if (command === "supabase") {
      return result(true, projectsOutput());
    }
    psqlCalls += 1;
    return result(false, "", "password authentication failed");
  };
  const report = executeProject004RemoteConnectivityDiagnostic({
    config: { ...config },
    candidateRoot,
    runner,
  });

  assert.equal(report.rootFailureCode, "DATABASE_PASSWORD_INVALID");
  assert.equal(report.endpointMode, "DIRECT");
  assert.equal(report.poolerFallback, "NOT_RUN");
  assert.equal(psqlCalls, 1);
});

test("inactive project fails before a database child is spawned", () => {
  let psqlCalls = 0;
  const runner: RemoteConnectivityCommandRunner = (command) => {
    if (command === "supabase") {
      return result(true, projectsOutput({ status: "PAUSED" }));
    }
    psqlCalls += 1;
    return result(true, sentinelOutput);
  };
  const report = executeProject004RemoteConnectivityDiagnostic({
    config: { ...config },
    candidateRoot,
    runner,
  });

  assert.equal(report.remoteIdentityGuard, "PASS");
  assert.equal(report.projectActive, "FAIL");
  assert.equal(report.rootFailureCode, "PROJECT_NOT_ACTIVE");
  assert.equal(report.endpointMode, "NONE");
  assert.equal(psqlCalls, 0);
});

test("missing verified pooler region fails closed after direct IPv6 failure", () => {
  let psqlCalls = 0;
  const runner: RemoteConnectivityCommandRunner = (command) => {
    if (command === "supabase") {
      return result(true, projectsOutput({ region: undefined }));
    }
    psqlCalls += 1;
    return result(false, "", "Network is unreachable");
  };
  const report = executeProject004RemoteConnectivityDiagnostic({
    config: { ...config },
    candidateRoot,
    runner,
  });

  assert.equal(report.rootFailureCode, "POOLER_UNAVAILABLE");
  assert.equal(report.poolerFallback, "FAIL");
  assert.equal(report.poolerFailureCode, "POOLER_UNAVAILABLE");
  assert.equal(psqlCalls, 1);
});

test("malformed or duplicate SELECT payload fails closed without exposing response", () => {
  for (const stdout of [
    "",
    `${sentinelOutput}${sentinelOutput}`,
    "PROJECT004_REMOTE_CONNECTIVITY_V2|1\n",
  ]) {
    const runner: RemoteConnectivityCommandRunner = (command) =>
      command === "supabase"
        ? result(true, projectsOutput())
        : result(true, stdout);
    const report = executeProject004RemoteConnectivityDiagnostic({
      config: { ...config },
      candidateRoot,
      runner,
    });
    assert.equal(
      report.rootFailureCode,
      "DATABASE_ERROR_UNRECOGNIZED",
    );
    assert.equal(report.readOnlySelect1, "FAIL");
  }
});

test("rendered report exposes only safe mode and classifications", () => {
  const report: RemoteConnectivityReport = {
    project004Canonical: "PASS",
    localMigrationChecksums: "PASS",
    cleanDisposableProof: "PASS",
    remoteIdentityGuard: "PASS",
    projectActive: "PASS",
    endpointMode: "POOLER_SESSION",
    directConnectivity: "FAIL",
    directFailureCode: "DIRECT_IPV6_UNAVAILABLE",
    poolerFallback: "PASS",
    poolerFailureCode: "NONE",
    tlsRequired: "PASS",
    readOnlySelect1: "PASS",
    emptyStateInspection: "NOT_RUN",
    dryRun: "NOT_RUN",
    unexpectedOperationCount: 0,
    remoteMutationPerformed: "NO",
    rootFailureCode: "NONE",
    ok: true,
  };
  const output = renderProject004RemoteConnectivityReport(report);
  assert.match(output, /^ENDPOINT_MODE=POOLER_SESSION$/mu);
  assert.match(output, /^EMPTY_STATE_INSPECTION=NOT_RUN$/mu);
  assert.match(output, /^DRY_RUN=NOT_RUN$/mu);
  assert.match(output, /^REMOTE_MUTATION_PERFORMED=NO$/mu);
  assert.doesNotMatch(output, new RegExp(projectRef, "u"));
  assert.doesNotMatch(output, new RegExp(databasePassword, "u"));
  assert.doesNotMatch(output, /supabase[.]com|PGHOST|PGUSER/iu);
});

test("secure command uses the two controlling-terminal labels and clears secrets", () => {
  const labels: string[] = [];
  let observedConfig: RemoteDevPrivateConfig | null = null;
  const values = [projectRef, databasePassword];
  const command =
    runProject004RemoteConnectivityDiagnosticCommand({
      candidateRoot,
      prompt: (label) => {
        labels.push(label);
        return { ok: true, value: values.shift() ?? "" };
      },
      execute: (options) => {
        observedConfig = options.config;
        return {
          project004Canonical: "PASS",
          localMigrationChecksums: "PASS",
          cleanDisposableProof: "PASS",
          remoteIdentityGuard: "PASS",
          projectActive: "PASS",
          endpointMode: "DIRECT",
          directConnectivity: "PASS",
          directFailureCode: "NONE",
          poolerFallback: "NOT_RUN",
          poolerFailureCode: "NOT_RUN",
          tlsRequired: "PASS",
          readOnlySelect1: "PASS",
          emptyStateInspection: "NOT_RUN",
          dryRun: "NOT_RUN",
          unexpectedOperationCount: 0,
          remoteMutationPerformed: "NO",
          rootFailureCode: "NONE",
          ok: true,
        };
      },
    });

  assert.deepEqual(labels, [
    "Project004 remote project reference: ",
    "Project004 remote database password: ",
  ]);
  assert.equal(command.exitCode, 0);
  assert.equal(
    (observedConfig as RemoteDevPrivateConfig | null)?.projectRef,
    "",
  );
  assert.equal(
    (observedConfig as RemoteDevPrivateConfig | null)
      ?.databasePassword,
    "",
  );
  assert.doesNotMatch(command.output, new RegExp(projectRef, "u"));
  assert.doesNotMatch(
    command.output,
    new RegExp(databasePassword, "u"),
  );
});

test("production source contains no empty-state, dry-run, link, or mutating SQL path", () => {
  const source = [
    readFileSync(
      "scripts/project004-remote-connectivity-diagnostic.ts",
      "utf8",
    ),
    readFileSync(
      "scripts/run-project004-remote-connectivity-diagnostic.ts",
      "utf8",
    ),
  ].join("\n");
  assert.doesNotMatch(
    source,
    /queryRemoteEmptyCounts|executeGuardedDryRun|supabase\s+link|db\s+(?:push|pull|reset)|include-seed/iu,
  );
  assert.doesNotMatch(
    project004RemoteConnectivitySql,
    /\b(?:insert|update|delete|truncate|alter|create|drop|grant|revoke|call)\b/iu,
  );
  assert.match(project004RemoteConnectivitySql, /begin read only/iu);
  assert.match(project004RemoteConnectivitySql, /rollback/iu);
});

test("audited connectivity runner rejects every command outside identity and read-only SELECT", () => {
  let delegated = 0;
  const guarded = createRemoteConnectivityAuditedRunner(
    { ...config },
    () => {
      delegated += 1;
      return result(true);
    },
  );
  const rejected = guarded.runner(
    "supabase",
    ["db", "push", "--dry-run"],
    process.env,
  );
  assert.equal(rejected.ok, false);
  assert.equal(delegated, 0);
  assert.equal(guarded.audit.unexpectedOperationCount, 1);
});

test("Node 22 strip-only executable smoke starts without remote access", () => {
  const smoke = spawnSync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-strip-types",
      "scripts/run-project004-remote-connectivity-diagnostic.ts",
      "--smoke",
    ],
    {
      cwd: candidateRoot,
      encoding: "utf8",
      timeout: 20_000,
      env: process.env,
    },
  );
  assert.equal(smoke.status, 0, smoke.stderr);
  assert.match(
    smoke.stdout,
    /^CONNECTIVITY_COMMAND_CONTRACT=PASS$/mu,
  );
  assert.match(
    smoke.stdout,
    /^REMOTE_ACCESS_PERFORMED=NO$/mu,
  );
  assert.match(
    smoke.stdout,
    /^REMOTE_MUTATION_PERFORMED=NO$/mu,
  );
});
