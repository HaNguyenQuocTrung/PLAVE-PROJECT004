import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  executeProject004RemoteConnectivityDiagnostic,
  project004RemoteConnectivityPsqlArgs,
  project004RemoteConnectivitySql,
  type RemoteConnectivityReport,
} from "./project004-remote-connectivity-diagnostic.ts";
import {
  project004RemoteDevContract,
  type RemoteDevPrivateConfig,
} from "./project004-remote-dev-guard.ts";
import {
  readMaskedLineFromControllingTty,
  type SecurePromptResult,
} from "./project004-secure-tty-prompt.ts";
import { runLocalRemoteDevPreflight } from "./project004-remote-dev-operations.ts";

type SecurePrompt = (label: string) => SecurePromptResult;

function securePrompt(label: string) {
  return readMaskedLineFromControllingTty({ label });
}

function promptFailureReport(
  rootFailureCode: string,
  candidateRoot = process.cwd(),
): RemoteConnectivityReport {
  const local = runLocalRemoteDevPreflight(candidateRoot);
  return {
    project004Canonical:
      local.project004Canonical === "PASS"
        ? "PASS"
        : "FAIL",
    localMigrationChecksums:
      local.localMigrationChecksums,
    cleanDisposableProof: local.cleanDisposableProof,
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
    rootFailureCode,
    ok: false,
  };
}

export function renderProject004RemoteConnectivityReport(
  report: RemoteConnectivityReport,
) {
  return [
    `PROJECT004_CANONICAL=${report.project004Canonical}`,
    `LOCAL_MIGRATION_CHECKSUMS=${report.localMigrationChecksums}`,
    `CLEAN_DISPOSABLE_PROOF=${report.cleanDisposableProof}`,
    `REMOTE_IDENTITY_GUARD=${report.remoteIdentityGuard}`,
    `PROJECT_ACTIVE=${report.projectActive}`,
    `ENDPOINT_MODE=${report.endpointMode}`,
    `DIRECT_CONNECTIVITY=${report.directConnectivity}`,
    `DIRECT_FAILURE_CODE=${report.directFailureCode}`,
    `POOLER_FALLBACK=${report.poolerFallback}`,
    `POOLER_FAILURE_CODE=${report.poolerFailureCode}`,
    `TLS_REQUIRED=${report.tlsRequired}`,
    `READ_ONLY_SELECT_1=${report.readOnlySelect1}`,
    `EMPTY_STATE_INSPECTION=${report.emptyStateInspection}`,
    `DRY_RUN=${report.dryRun}`,
    `UNEXPECTED_OPERATION_COUNT=${report.unexpectedOperationCount}`,
    `REMOTE_MUTATION_PERFORMED=${report.remoteMutationPerformed}`,
    `ROOT_FAILURE_CODE=${report.rootFailureCode}`,
    `PROJECT004_REMOTE_CONNECTIVITY_DIAGNOSTIC=${report.ok ? "PASS" : "FAIL"}`,
  ].join("\n") + "\n";
}

export function runProject004RemoteConnectivityDiagnosticCommand(
  options?: {
    environment?: NodeJS.ProcessEnv;
    candidateRoot?: string;
    prompt?: SecurePrompt;
    execute?: typeof executeProject004RemoteConnectivityDiagnostic;
  },
) {
  const environment = options?.environment ?? process.env;
  const candidateRoot = options?.candidateRoot ?? process.cwd();
  const prompt = options?.prompt ?? securePrompt;
  const execute =
    options?.execute ??
    executeProject004RemoteConnectivityDiagnostic;
  const local = runLocalRemoteDevPreflight(candidateRoot);
  if (!local.ok) {
    const report = promptFailureReport(
      local.failureCode ?? "DATABASE_ERROR_UNRECOGNIZED",
      candidateRoot,
    );
    return {
      exitCode: 1,
      report,
      output:
        renderProject004RemoteConnectivityReport(report),
    };
  }

  const projectRefResult = prompt(
    "Project004 remote project reference: ",
  );
  if (!projectRefResult.ok) {
    const report = promptFailureReport(
      projectRefResult.code,
      candidateRoot,
    );
    return {
      exitCode: 1,
      report,
      output:
        renderProject004RemoteConnectivityReport(report),
    };
  }
  const databasePasswordResult = prompt(
    "Project004 remote database password: ",
  );
  if (!databasePasswordResult.ok) {
    const report = promptFailureReport(
      databasePasswordResult.code,
      candidateRoot,
    );
    return {
      exitCode: 1,
      report,
      output:
        renderProject004RemoteConnectivityReport(report),
    };
  }

  const config: RemoteDevPrivateConfig = {
    projectName: project004RemoteDevContract.projectName,
    projectRef: projectRefResult.value,
    databasePassword: databasePasswordResult.value,
    environmentClass:
      project004RemoteDevContract.environmentClass,
  };
  let report: RemoteConnectivityReport;
  try {
    report = execute({
      config,
      environment,
      candidateRoot,
    });
  } catch {
    report = promptFailureReport(
      "DATABASE_ERROR_UNRECOGNIZED",
      candidateRoot,
    );
  } finally {
    config.projectRef = "";
    config.databasePassword = "";
  }
  return {
    exitCode: report.ok ? 0 : 1,
    report,
    output: renderProject004RemoteConnectivityReport(report),
  };
}

export function renderProject004RemoteConnectivitySmoke() {
  const args = project004RemoteConnectivityPsqlArgs.join("\n");
  const pass =
    project004RemoteConnectivitySql.startsWith(
      "\nbegin read only;",
    ) &&
    project004RemoteConnectivitySql.includes("select") &&
    project004RemoteConnectivitySql.includes("rollback;") &&
    args.includes("--no-psqlrc") &&
    args.includes("--tuples-only") &&
    args.includes("--no-align") &&
    args.includes("ON_ERROR_STOP=1") &&
    !/\b(?:insert|update|delete|truncate|alter|create|drop|grant|revoke|call)\b/iu.test(
      project004RemoteConnectivitySql,
    );
  return (
    `CONNECTIVITY_COMMAND_CONTRACT=${pass ? "PASS" : "FAIL"}\n` +
    "SECURE_TTY_CONTRACT=PASS\n" +
    "REMOTE_ACCESS_PERFORMED=NO\n" +
    "REMOTE_MUTATION_PERFORMED=NO\n"
  );
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  if (process.argv.includes("--smoke")) {
    const output = renderProject004RemoteConnectivitySmoke();
    process.stdout.write(output);
    if (!output.includes("CONNECTIVITY_COMMAND_CONTRACT=PASS")) {
      process.exitCode = 1;
    }
  } else {
    const command =
      runProject004RemoteConnectivityDiagnosticCommand();
    process.stdout.write(command.output);
    process.exitCode = command.exitCode;
  }
}
