import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { executeAuthorizedRemoteDevDryRun } from "./project004-remote-dev-audited-runner.ts";
import { project004RemoteDevContract } from "./project004-remote-dev-guard.ts";
import {
  readMaskedLineFromControllingTty,
  type SecurePromptResult,
} from "./project004-secure-tty-prompt.ts";
import {
  runLocalRemoteDevPreflight,
  type LocalRemoteDevPreflightResult,
  type RemoteDevCheckState,
  type RemoteDevPreflightResult,
  type RemoteEmptyCounts,
  type Project004DryRunParserEvidence,
} from "./project004-remote-dev-operations.ts";

type SecurePrompt = (label: string) => SecurePromptResult;

export type SafeDryRunDiagnostic = {
  project004Canonical: RemoteDevCheckState;
  remoteIdentityGuard: RemoteDevCheckState;
  emptyRemoteState: RemoteDevCheckState;
  localMigrationChecksums: RemoteDevCheckState;
  cleanDisposableProof: RemoteDevCheckState;
  remoteDatabaseEndpointMode:
    | "DIRECT"
    | "POOLER_SESSION"
    | "NOT_RUN";
  dryRunMigrationCount: number | "NOT_RUN" | "UNVERIFIED";
  dryRunFirstLastMigration: string;
  destructiveOrUnexpectedOperationCount: number;
  localRuntimeUnchanged: RemoteDevCheckState;
  remoteMutationPerformed: "NO";
  dryRunParserEvidence: Project004DryRunParserEvidence | null;
  rootFailureCode: string;
  localFailureDetail:
    | LocalRemoteDevPreflightResult["failureDetail"]
    | null;
  remoteCounts: RemoteEmptyCounts | null;
  ok: boolean;
};

function securePrompt(label: string) {
  return readMaskedLineFromControllingTty({ label });
}

function identityGuardState(
  preflight: RemoteDevPreflightResult,
): RemoteDevCheckState {
  const states = [
    preflight.checkStates.REMOTE_TARGET_GUARD,
    preflight.checkStates.CLI_AUTHENTICATION,
    preflight.checkStates.REMOTE_PROJECT_IDENTITY,
  ];
  if (states.includes("FAIL")) return "FAIL";
  if (states.every((state) => state === "PASS")) return "PASS";
  return "NOT_RUN";
}

function localFailureDiagnostic(
  local: LocalRemoteDevPreflightResult,
  rootFailureCode = local.failureCode ?? "UNCLASSIFIED_FAILURE",
): SafeDryRunDiagnostic {
  return {
    project004Canonical: local.project004Canonical,
    remoteIdentityGuard: "NOT_RUN",
    emptyRemoteState: "NOT_RUN",
    localMigrationChecksums: local.localMigrationChecksums,
    cleanDisposableProof: local.cleanDisposableProof,
    remoteDatabaseEndpointMode: "NOT_RUN",
    dryRunMigrationCount: "NOT_RUN",
    dryRunFirstLastMigration: "NONE",
    destructiveOrUnexpectedOperationCount: 0,
    localRuntimeUnchanged: "PASS",
    remoteMutationPerformed: "NO",
    dryRunParserEvidence: null,
    rootFailureCode,
    localFailureDetail: local.failureDetail,
    remoteCounts: null,
    ok: false,
  };
}

export function renderRemoteDevDryRunDiagnostic(
  report: SafeDryRunDiagnostic,
) {
  const lines = [
    `PROJECT004_CANONICAL=${report.project004Canonical}`,
    `REMOTE_IDENTITY_GUARD=${report.remoteIdentityGuard}`,
    `EMPTY_REMOTE_STATE=${report.emptyRemoteState}`,
    `LOCAL_MIGRATION_CHECKSUMS=${report.localMigrationChecksums}`,
    `CLEAN_DISPOSABLE_PROOF=${report.cleanDisposableProof}`,
    `REMOTE_DATABASE_ENDPOINT_MODE=${report.remoteDatabaseEndpointMode}`,
    `DRY_RUN_MIGRATION_COUNT=${report.dryRunMigrationCount}`,
    `DRY_RUN_FIRST_LAST_MIGRATION=${report.dryRunFirstLastMigration}`,
    `DESTRUCTIVE_OR_UNEXPECTED_OPERATION_COUNT=${report.destructiveOrUnexpectedOperationCount}`,
    `LOCAL_RUNTIME_UNCHANGED=${report.localRuntimeUnchanged}`,
    `REMOTE_MUTATION_PERFORMED=${report.remoteMutationPerformed}`,
  ];
  if (report.localFailureDetail) {
    lines.push(
      `LOCAL_MIGRATION_MISMATCH_VERSION=${report.localFailureDetail.migrationVersion}`,
      `LOCAL_MIGRATION_MISMATCH_PATH=${report.localFailureDetail.relativePath}`,
      `LOCAL_MIGRATION_MISMATCH_TYPE=${report.localFailureDetail.mismatchType}`,
    );
  }
  if (report.remoteCounts) {
    lines.push(
      `PLATFORM_BASELINE_OBJECTS=${report.remoteCounts.platformBaselineObjects}`,
      `PLAVE_APPLICATION_OBJECTS=${report.remoteCounts.plaveApplicationObjects}`,
      `FOREIGN_APPLICATION_OBJECTS=${report.remoteCounts.foreignApplicationObjects}`,
      `AUTH_USER_COUNT=${report.remoteCounts.authUserCount}`,
      `STORAGE_OBJECT_COUNT=${report.remoteCounts.storageObjectCount}`,
      `MIGRATION_HISTORY_COUNT=${report.remoteCounts.migrationHistoryCount}`,
      `PLAVE_MIGRATION_HISTORY_COUNT=${report.remoteCounts.plaveMigrationHistoryCount}`,
      `FOREIGN_MIGRATION_HISTORY_COUNT=${report.remoteCounts.foreignMigrationHistoryCount}`,
      `REMOTE_BASELINE_CLASSIFICATION=${
        report.emptyRemoteState === "PASS" ? "PASS" : "FAIL"
      }`,
    );
  }
  if (report.dryRunParserEvidence) {
    const parser = report.dryRunParserEvidence;
    lines.push(
      `DRY_RUN_QUERY_EXIT=${parser.queryExit}`,
      `DRY_RUN_SUCCESS_SIGNATURE=${parser.successSignature}`,
      `DRY_RUN_MIGRATION_HEADER_COUNT=${parser.migrationHeaderCount}`,
      `DRY_RUN_OBSERVED_MIGRATION_COUNT=${parser.observedMigrationCount}`,
      `DRY_RUN_OBSERVED_FIRST_LAST=${parser.observedFirstLast}`,
      `DRY_RUN_DUPLICATE_MIGRATION_COUNT=${parser.duplicateMigrationCount}`,
      `DRY_RUN_FOREIGN_MIGRATION_COUNT=${parser.foreignMigrationCount}`,
      `DRY_RUN_MIGRATION_ORDER=${parser.migrationOrder}`,
      `DRY_RUN_CANONICAL_PLAN_CHECKSUMS=${parser.canonicalPlanChecksums}`,
      `DRY_RUN_SEED_OPERATION_COUNT=${parser.seedOperationCount}`,
      `DRY_RUN_DESTRUCTIVE_OPERATION_COUNT=${parser.destructiveOperationCount}`,
      `DRY_RUN_PARSER_FAILURE_CODE=${parser.parserFailureCode}`,
    );
  }
  lines.push(
    `ROOT_FAILURE_CODE=${report.rootFailureCode}`,
    `PROJECT004_REMOTE_DEV_DRY_RUN=${report.ok ? "PASS" : "FAIL"}`,
  );
  return `${lines.join("\n")}\n`;
}

export function runRemoteDevPreflightDryRunCommand(options?: {
  environment?: NodeJS.ProcessEnv;
  prompt?: SecurePrompt;
  candidateRoot?: string;
  execute?: typeof executeAuthorizedRemoteDevDryRun;
}) {
  const environment = options?.environment ?? process.env;
  const prompt = options?.prompt ?? securePrompt;
  const candidateRoot = options?.candidateRoot ?? process.cwd();
  const execute =
    options?.execute ?? executeAuthorizedRemoteDevDryRun;
  const local = runLocalRemoteDevPreflight(candidateRoot);

  if (!local.ok) {
    const report = localFailureDiagnostic(local);
    return {
      exitCode: 1,
      report,
      output: renderRemoteDevDryRunDiagnostic(report),
    };
  }

  const projectRefResult = prompt(
    "Project004 remote project reference: ",
  );
  if (!projectRefResult.ok) {
    const report = localFailureDiagnostic(
      local,
      projectRefResult.code,
    );
    return {
      exitCode: 1,
      report,
      output: renderRemoteDevDryRunDiagnostic(report),
    };
  }
  const projectRef = projectRefResult.value;

  const databasePasswordResult = prompt(
    "Project004 remote database password: ",
  );
  if (!databasePasswordResult.ok) {
    const report = localFailureDiagnostic(
      local,
      databasePasswordResult.code,
    );
    return {
      exitCode: 1,
      report,
      output: renderRemoteDevDryRunDiagnostic(report),
    };
  }
  const databasePassword = databasePasswordResult.value;

  const operationEnvironment: NodeJS.ProcessEnv = {
    ...environment,
    PLAVE_PROJECT004_REMOTE_TARGET_NAME:
      project004RemoteDevContract.projectName,
    PLAVE_PROJECT004_REMOTE_PROJECT_REF: projectRef,
    PLAVE_PROJECT004_REMOTE_DB_PASSWORD: databasePassword,
    PLAVE_PROJECT004_REMOTE_ENVIRONMENT_CLASS:
      "EMPTY_DEVELOPMENT",
  };
  const result = execute({
    environment: operationEnvironment,
    candidateRoot,
  });

  if (!result.ok) {
    const dryRunAttempted = result.counts.dryRun > 0;
    const report: SafeDryRunDiagnostic = {
      project004Canonical: result.preflight.project004Canonical,
      remoteIdentityGuard: identityGuardState(result.preflight),
      emptyRemoteState:
        result.preflight.checkStates.REMOTE_EMPTY,
      localMigrationChecksums:
        result.preflight.checkStates.LOCAL_MIGRATIONS_0001_0040,
      cleanDisposableProof:
        result.preflight.checkStates.CLEAN_DISPOSABLE_PROOF,
      remoteDatabaseEndpointMode:
        result.preflight.resolvedEndpoint?.mode ?? "NOT_RUN",
      dryRunMigrationCount: dryRunAttempted
        ? "UNVERIFIED"
        : "NOT_RUN",
      dryRunFirstLastMigration: "NONE",
      destructiveOrUnexpectedOperationCount:
        result.counts.destructive + result.counts.unexpected,
      localRuntimeUnchanged:
        result.failureCode === "LOCAL_RUNTIME_CHANGED"
          ? "FAIL"
          : result.stage === "VALIDATION"
            ? "PASS"
            : "NOT_RUN",
      remoteMutationPerformed: "NO",
      dryRunParserEvidence:
        "parserEvidence" in result
          ? (result.parserEvidence ?? null)
          : null,
      rootFailureCode: result.failureCode,
      localFailureDetail: result.preflight.failureDetail,
      remoteCounts: result.preflight.counts,
      ok: false,
    };
    return {
      exitCode: 1,
      report,
      output: renderRemoteDevDryRunDiagnostic(report),
    };
  }

  const report: SafeDryRunDiagnostic = {
    project004Canonical: "PASS",
    remoteIdentityGuard:
      result.report.remoteIdentityGuard ? "PASS" : "FAIL",
    emptyRemoteState:
      result.report.emptyRemoteState ? "PASS" : "FAIL",
    localMigrationChecksums:
      result.report.localMigrationChecksums ? "PASS" : "FAIL",
    cleanDisposableProof:
      result.report.cleanDisposableProof ? "PASS" : "FAIL",
    remoteDatabaseEndpointMode:
      result.report.remoteDatabaseEndpointMode,
    dryRunMigrationCount: result.report.migrationCount,
    dryRunFirstLastMigration:
      `${result.report.firstMigration}/${result.report.lastMigration}`,
    destructiveOrUnexpectedOperationCount:
      result.report.destructiveOrUnexpectedOperationCount,
    localRuntimeUnchanged:
      result.report.localRuntimeUnchanged ? "PASS" : "FAIL",
    remoteMutationPerformed: "NO",
    dryRunParserEvidence: null,
    rootFailureCode: "NONE",
    localFailureDetail: null,
    remoteCounts: result.report.baselineCounts,
    ok: true,
  };
  return {
    exitCode: 0,
    report,
    output: renderRemoteDevDryRunDiagnostic(report),
  };
}

export function runSecurePromptSmoke(
  prompt: SecurePrompt = securePrompt,
) {
  const projectRefResult = prompt(
    "Project004 remote project reference: ",
  );
  if (!projectRefResult.ok) {
    return {
      exitCode: 1,
      output:
        `ROOT_FAILURE_CODE=${projectRefResult.code}\n` +
        "SECURE_PROMPT_SMOKE=FAIL\n",
    };
  }
  const databasePasswordResult = prompt(
    "Project004 remote database password: ",
  );
  if (!databasePasswordResult.ok) {
    return {
      exitCode: 1,
      output:
        `ROOT_FAILURE_CODE=${databasePasswordResult.code}\n` +
        "SECURE_PROMPT_SMOKE=FAIL\n",
    };
  }
  return {
    exitCode: 0,
    output: "SECURE_PROMPT_SMOKE=PASS\n",
  };
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  const promptSmoke = process.argv.slice(2).includes("--prompt-smoke");
  const command = promptSmoke
    ? runSecurePromptSmoke()
    : runRemoteDevPreflightDryRunCommand();
  process.stdout.write(command.output);
  process.exitCode = command.exitCode;
}
