import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  executeAuthorizedRemoteDevApplyOnce,
  notRunApplyOnceReport,
  type ApplyOnceSafeReport,
} from "./project004-remote-dev-apply-once.ts";
import { project004RemoteDevContract } from "./project004-remote-dev-guard.ts";
import { runLocalRemoteDevPreflight } from "./project004-remote-dev-operations.ts";
import {
  readMaskedLineFromControllingTty,
  type SecurePromptResult,
} from "./project004-secure-tty-prompt.ts";

type SecurePrompt = (label: string) => SecurePromptResult;

function securePrompt(label: string) {
  return readMaskedLineFromControllingTty({ label });
}

function safeCount(value: number | "UNKNOWN") {
  return typeof value === "number" ? String(value) : value;
}

export function renderApplyOnceReport(
  report: ApplyOnceSafeReport,
) {
  const counts = report.postApplyCounts;
  const preexistingRemoteApplicationState =
    report.baselineCounts === null
      ? "NOT_RUN"
      : report.baselineCounts.plaveApplicationObjects > 0 ||
          report.baselineCounts.foreignApplicationObjects > 0 ||
          report.baselineCounts.migrationHistoryCount > 0
        ? "YES"
        : "NO";
  const lines = [
    `PROJECT004_CANONICAL=${report.project004Canonical}`,
    `REMOTE_IDENTITY_GUARD=${report.remoteIdentityGuard}`,
    `EMPTY_DEVELOPMENT=${report.emptyRemoteState}`,
    `LOCAL_MIGRATION_CHECKSUMS=${report.localMigrationChecksums}`,
    `CLEAN_DISPOSABLE_PROOF=${report.cleanDisposableProof}`,
    `REMOTE_DATABASE_ENDPOINT_MODE=${report.remoteDatabaseEndpointMode}`,
    `DRY_RUN_FINGERPRINT=${report.dryRunFingerprint}`,
    `SCHEMA_PUSH_ATTEMPTS=${report.commandCounts.schemaPush}`,
    `CONTENT_TRANSACTION_ATTEMPTS=${report.commandCounts.contentTransaction}`,
    `UNEXPECTED_OPERATION_COUNT=${report.commandCounts.unexpected}`,
    `MIGRATIONS_APPLIED=${safeCount(report.migrationProgress.count)}/40`,
    `LAST_MIGRATION_PASSED=${report.migrationProgress.lastPassed}`,
    `FIRST_MIGRATION_FAILED=${report.migrationProgress.firstFailed}`,
    `MIGRATION_FIRST_LAST=${
      counts
        ? `${counts.migrationFirst}/${counts.migrationLast}`
        : "NOT_RUN"
    }`,
    `RELEASE_BANK=${
      counts
        ? `${counts.units}/${counts.publicQuestions}/${counts.privateSolutions}/${counts.officialOutcomes}`
        : "NOT_RUN"
    }`,
    `UNIVERSAL_RELEASE=${
      counts?.draftInactiveReleases === 1
        ? "DRAFT/INACTIVE"
        : "NOT_RUN"
    }`,
    `CURRICULUM_RUNTIME=${
      counts ? "false" : "NOT_RUN"
    }`,
    `GRADE2_CONTROLLED_ADAPTIVE_PILOT=${
      counts?.adaptiveReleaseRows === 1 &&
      counts.adaptiveEnabledRows === 0
        ? "DISABLED"
        : "NOT_RUN"
    }`,
    `AUTH_USER_COUNT=${counts?.authUsers ?? "NOT_RUN"}`,
    `STORAGE_OBJECT_COUNT=${counts?.storageObjects ?? "NOT_RUN"}`,
    `SYNTHETIC_USER_COUNT=${counts?.syntheticUserRows ?? "NOT_RUN"}`,
    `RLS_AND_PRIVATE_SOLUTION_BOUNDARY=${
      counts ? "PASS" : "NOT_RUN"
    }`,
    `CONTENT_TRANSACTION_ROLLBACK=${report.contentRollback}`,
    `LOCAL_RUNTIME_UNCHANGED=${report.localRuntimeUnchanged}`,
    `CURRENT_RUN_MUTATION_PERFORMED=${report.remoteMutationPerformed}`,
    `PREEXISTING_REMOTE_APPLICATION_STATE=${preexistingRemoteApplicationState}`,
    `REMOTE_MUTATION_PERFORMED=${report.remoteMutationPerformed}`,
    "PROJECT003=FROZEN_UNTOUCHED",
    "ACTIVATION_PERFORMED=NO",
    "PUBLICATION_PERFORMED=NO",
    "DEPLOYMENT_PERFORMED=NO",
  ];
  if (report.baselineCounts) {
    lines.push(
      `BASELINE_PLAVE_APPLICATION_OBJECTS=${report.baselineCounts.plaveApplicationObjects}`,
      `BASELINE_FOREIGN_APPLICATION_OBJECTS=${report.baselineCounts.foreignApplicationObjects}`,
      `BASELINE_AUTH_USER_COUNT=${report.baselineCounts.authUserCount}`,
      `BASELINE_STORAGE_OBJECT_COUNT=${report.baselineCounts.storageObjectCount}`,
      `BASELINE_MIGRATION_HISTORY_COUNT=${report.baselineCounts.migrationHistoryCount}`,
    );
  }
  lines.push(
    `ROOT_FAILURE_CODE=${report.rootFailureCode}`,
    `PROJECT004_REMOTE_DEV_PROVISIONED=${
      report.ok ? "PASS" : "FAIL"
    }`,
  );
  return `${lines.join("\n")}\n`;
}

export function runProject004RemoteDevApplyCommand(options?: {
  environment?: NodeJS.ProcessEnv;
  candidateRoot?: string;
  prompt?: SecurePrompt;
  execute?: typeof executeAuthorizedRemoteDevApplyOnce;
}) {
  const environment = options?.environment ?? process.env;
  const candidateRoot = options?.candidateRoot ?? process.cwd();
  const prompt = options?.prompt ?? securePrompt;
  const execute =
    options?.execute ?? executeAuthorizedRemoteDevApplyOnce;
  const local = runLocalRemoteDevPreflight(candidateRoot);
  if (!local.ok) {
    const report = notRunApplyOnceReport(
      local.failureCode ?? "LOCAL_CHECKSUM_MISMATCH",
      local.project004Canonical,
      local.localMigrationChecksums,
      local.cleanDisposableProof,
    );
    return {
      exitCode: 1,
      report,
      output: renderApplyOnceReport(report),
    };
  }
  const applyAuthorizationStatus: string =
    project004RemoteDevContract.applyAuthorizationStatus;
  if (
    applyAuthorizationStatus !==
    "OWNER_APPROVED_FOR_CLEAN_REMOTE_APPLY"
  ) {
    const report = notRunApplyOnceReport(
      "APPLY_OWNER_APPROVAL_REQUIRED",
      "PASS",
      "PASS",
      "PASS",
    );
    return {
      exitCode: 1,
      report,
      output: renderApplyOnceReport(report),
    };
  }

  const projectRefResult = prompt(
    "Project004 remote project reference: ",
  );
  if (!projectRefResult.ok) {
    const report = notRunApplyOnceReport(
      projectRefResult.code,
      "PASS",
      "PASS",
      "PASS",
    );
    return {
      exitCode: 1,
      report,
      output: renderApplyOnceReport(report),
    };
  }

  const databasePasswordResult = prompt(
    "Project004 remote database password: ",
  );
  if (!databasePasswordResult.ok) {
    const report = notRunApplyOnceReport(
      databasePasswordResult.code,
      "PASS",
      "PASS",
      "PASS",
    );
    return {
      exitCode: 1,
      report,
      output: renderApplyOnceReport(report),
    };
  }

  const operationEnvironment: NodeJS.ProcessEnv = {
    ...environment,
    PLAVE_PROJECT004_REMOTE_TARGET_NAME:
      project004RemoteDevContract.projectName,
    PLAVE_PROJECT004_REMOTE_PROJECT_REF:
      projectRefResult.value,
    PLAVE_PROJECT004_REMOTE_DB_PASSWORD:
      databasePasswordResult.value,
    PLAVE_PROJECT004_REMOTE_ENVIRONMENT_CLASS:
      project004RemoteDevContract.environmentClass,
    PLAVE_PROJECT004_REMOTE_OWNER_APPROVAL:
      project004RemoteDevContract.applyApproval,
  };
  let report: ApplyOnceSafeReport;
  try {
    report = execute({
      environment: operationEnvironment,
      candidateRoot,
    });
  } catch {
    report = notRunApplyOnceReport(
      "UNCLASSIFIED_FAILURE",
      "PASS",
      "PASS",
      "PASS",
    );
  } finally {
    for (const key of [
      "PLAVE_PROJECT004_REMOTE_PROJECT_REF",
      "PLAVE_PROJECT004_REMOTE_DB_PASSWORD",
    ]) {
      delete operationEnvironment[key];
    }
  }
  return {
    exitCode: report.ok ? 0 : 1,
    report,
    output: renderApplyOnceReport(report),
  };
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  const command = runProject004RemoteDevApplyCommand();
  process.stdout.write(command.output);
  process.exitCode = command.exitCode;
}
