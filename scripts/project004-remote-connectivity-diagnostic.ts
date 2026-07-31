import {
  RemoteDevGuardFailure,
  assertLocalIsolation,
  assertRemoteDevTarget,
  createCanonicalRemoteDevCommandRunner,
  type RemoteDevPrivateConfig,
} from "./project004-remote-dev-guard.ts";
import {
  RemoteConnectivityResolutionError,
  project004RemoteConnectivityPsqlArgs,
  resolveProject004RemoteDatabaseEndpoint,
  selectProject004ConnectivityProject,
  type RemoteConnectivityCommandRunner,
  type RemoteConnectivityEndpointMode,
  type RemoteConnectivityFailureCode,
  type RemoteConnectivityResolutionEvidence,
} from "./project004-remote-connectivity-resolver.ts";
import { runCanonicalSupabaseCliAuthCheck } from "./project004-supabase-cli-auth.ts";
import { runLocalRemoteDevPreflight } from "./project004-remote-dev-operations.ts";

export {
  classifyRemoteConnectivityFailure,
  project004RemoteConnectivityPsqlArgs,
  project004RemoteConnectivitySql,
} from "./project004-remote-connectivity-resolver.ts";
export type {
  RemoteConnectivityCommandRunner,
  RemoteConnectivityEndpointMode,
  RemoteConnectivityFailureCode,
} from "./project004-remote-connectivity-resolver.ts";

export type RemoteConnectivityReport = {
  project004Canonical: "PASS" | "FAIL";
  localMigrationChecksums: "PASS" | "FAIL" | "NOT_RUN";
  cleanDisposableProof: "PASS" | "FAIL" | "NOT_RUN";
  remoteIdentityGuard: "PASS" | "FAIL" | "NOT_RUN";
  projectActive: "PASS" | "FAIL" | "NOT_RUN";
  endpointMode: RemoteConnectivityEndpointMode;
  directConnectivity: "PASS" | "FAIL" | "NOT_RUN";
  directFailureCode: RemoteConnectivityFailureCode | "NOT_RUN";
  poolerFallback: "PASS" | "FAIL" | "NOT_RUN";
  poolerFailureCode: RemoteConnectivityFailureCode | "NOT_RUN";
  tlsRequired: "PASS";
  readOnlySelect1: "PASS" | "FAIL" | "NOT_RUN";
  emptyStateInspection: "NOT_RUN";
  dryRun: "NOT_RUN";
  unexpectedOperationCount: number;
  remoteMutationPerformed: "NO";
  rootFailureCode: string;
  ok: boolean;
};

export type RemoteConnectivityCommandAudit = {
  projectListAttempts: number;
  directQueryAttempts: number;
  poolerQueryAttempts: number;
  unexpectedOperationCount: number;
};

function exactArguments(
  actual: readonly string[],
  expected: readonly string[],
) {
  return (
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

export function createRemoteConnectivityAuditedRunner(
  config: RemoteDevPrivateConfig,
  delegate: RemoteConnectivityCommandRunner,
) {
  const audit: RemoteConnectivityCommandAudit = {
    projectListAttempts: 0,
    directQueryAttempts: 0,
    poolerQueryAttempts: 0,
    unexpectedOperationCount: 0,
  };
  const reject = () => {
    audit.unexpectedOperationCount += 1;
    return {
      ok: false,
      stdout: "",
      stderr: "CONNECTIVITY_COMMAND_CONTRACT_REJECTED",
    };
  };
  const runner: RemoteConnectivityCommandRunner = (
    command,
    args,
    environment,
  ) => {
    if (
      command === "supabase" &&
      exactArguments(args, [
        "projects",
        "list",
        "--output",
        "json",
      ]) &&
      audit.projectListAttempts === 0 &&
      audit.directQueryAttempts === 0 &&
      audit.poolerQueryAttempts === 0
    ) {
      audit.projectListAttempts += 1;
      return delegate(command, args, environment);
    }
    if (
      command !== "psql" ||
      !exactArguments(
        args,
        project004RemoteConnectivityPsqlArgs,
      ) ||
      audit.projectListAttempts !== 1 ||
      environment.PGDATABASE !== "postgres" ||
      environment.PGPASSWORD !== config.databasePassword ||
      environment.PGSSLMODE !== "require" ||
      environment.PGCONNECT_TIMEOUT !== "10"
    ) {
      return reject();
    }
    const direct =
      audit.directQueryAttempts === 0 &&
      audit.poolerQueryAttempts === 0 &&
      environment.PGHOST ===
        `db.${config.projectRef}.supabase.co` &&
      environment.PGPORT === "5432" &&
      environment.PGUSER === "postgres";
    if (direct) {
      audit.directQueryAttempts += 1;
      return delegate(command, args, environment);
    }
    const pooler =
      audit.directQueryAttempts === 1 &&
      audit.poolerQueryAttempts === 0 &&
      typeof environment.PGHOST === "string" &&
      /^aws-0-[a-z]{2}(?:-[a-z0-9]+)+-[0-9][.]pooler[.]supabase[.]com$/u.test(
        environment.PGHOST,
      ) &&
      environment.PGPORT === "5432" &&
      environment.PGUSER === `postgres.${config.projectRef}`;
    if (pooler) {
      audit.poolerQueryAttempts += 1;
      return delegate(command, args, environment);
    }
    return reject();
  };
  return { runner, audit };
}

function initialReport(): RemoteConnectivityReport {
  return {
    project004Canonical: "PASS",
    localMigrationChecksums: "NOT_RUN",
    cleanDisposableProof: "NOT_RUN",
    remoteIdentityGuard: "NOT_RUN",
    projectActive: "NOT_RUN",
    endpointMode: "NONE",
    directConnectivity: "NOT_RUN",
    directFailureCode: "NOT_RUN",
    poolerFallback: "NOT_RUN",
    poolerFailureCode: "NOT_RUN",
    tlsRequired: "PASS",
    readOnlySelect1: "NOT_RUN",
    emptyStateInspection: "NOT_RUN",
    dryRun: "NOT_RUN",
    unexpectedOperationCount: 0,
    remoteMutationPerformed: "NO",
    rootFailureCode: "DATABASE_ERROR_UNRECOGNIZED",
    ok: false,
  };
}

function safeGuardCode(error: unknown) {
  if (error instanceof RemoteDevGuardFailure) {
    return error.code;
  }
  return "DATABASE_ERROR_UNRECOGNIZED";
}

function applyResolutionEvidence(
  report: RemoteConnectivityReport,
  evidence: RemoteConnectivityResolutionEvidence,
) {
  report.endpointMode = evidence.endpointMode;
  report.directConnectivity = evidence.directConnectivity;
  report.directFailureCode = evidence.directFailureCode;
  report.poolerFallback = evidence.poolerFallback;
  report.poolerFailureCode = evidence.poolerFailureCode;
  report.readOnlySelect1 = evidence.readOnlySelect1;
}

export function executeProject004RemoteConnectivityDiagnostic(
  options: {
    config: RemoteDevPrivateConfig;
    environment?: NodeJS.ProcessEnv;
    candidateRoot?: string;
    runner?: RemoteConnectivityCommandRunner;
  },
): RemoteConnectivityReport {
  const environment = options.environment ?? process.env;
  const candidateRoot = options.candidateRoot ?? process.cwd();
  const delegate =
    options.runner ??
    createCanonicalRemoteDevCommandRunner(candidateRoot);
  const audited = createRemoteConnectivityAuditedRunner(
    options.config,
    delegate,
  );
  const runner = audited.runner;
  const report = initialReport();
  const finish = () => {
    report.unexpectedOperationCount =
      audited.audit.unexpectedOperationCount;
    if (report.unexpectedOperationCount > 0) {
      report.ok = false;
      report.rootFailureCode =
        "DATABASE_ERROR_UNRECOGNIZED";
    }
    return report;
  };
  const local = runLocalRemoteDevPreflight(candidateRoot);
  report.project004Canonical =
    local.project004Canonical === "PASS" ? "PASS" : "FAIL";
  report.localMigrationChecksums =
    local.localMigrationChecksums;
  report.cleanDisposableProof = local.cleanDisposableProof;
  if (!local.ok) {
    report.rootFailureCode =
      local.failureCode ?? "DATABASE_ERROR_UNRECOGNIZED";
    return finish();
  }

  try {
    assertRemoteDevTarget(options.config);
    assertLocalIsolation(options.config, candidateRoot);
    const auth = runCanonicalSupabaseCliAuthCheck({
      environment,
      candidateRoot,
      runner,
    });
    const project = selectProject004ConnectivityProject(
      auth.projects,
      options.config,
    );
    report.remoteIdentityGuard = "PASS";
    report.projectActive = "PASS";
    const resolution =
      resolveProject004RemoteDatabaseEndpoint({
        config: options.config,
        project,
        environment,
        runner,
      });
    applyResolutionEvidence(report, resolution.evidence);
    report.rootFailureCode = "NONE";
    report.ok = true;
    return finish();
  } catch (error) {
    if (error instanceof RemoteConnectivityResolutionError) {
      applyResolutionEvidence(report, error.evidence);
    }
    const code = safeGuardCode(error);
    report.remoteIdentityGuard =
      code === "PROJECT_NOT_ACTIVE" ? "PASS" : report.remoteIdentityGuard;
    report.projectActive =
      code === "PROJECT_NOT_ACTIVE" ? "FAIL" : report.projectActive;
    report.rootFailureCode = code;
    return finish();
  }
}
