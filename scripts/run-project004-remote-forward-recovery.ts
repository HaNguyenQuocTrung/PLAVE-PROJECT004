import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  executeAuthorizedForwardRecovery,
  notRunForwardRecoveryReport,
  type ForwardRecoveryReport,
} from "./project004-remote-forward-recovery.ts";
import {
  project004RemoteDevContract,
} from "./project004-remote-dev-guard.ts";
import {
  loadPrefixSemanticManifest,
} from "./project004-prefix-recovery-contract.ts";
import {
  readMaskedLineFromControllingTty,
  type SecurePromptResult,
} from "./project004-secure-tty-prompt.ts";

type SecurePrompt = (label: string) => SecurePromptResult;

function securePrompt(label: string) {
  return readMaskedLineFromControllingTty({ label });
}

function safeValue(value: number | "NOT_RUN") {
  return String(value);
}

export function renderForwardRecoveryReport(
  report: ForwardRecoveryReport,
) {
  const counts = report.postApplyCounts;
  return [
    `CURRENT_RUN_MUTATION_PERFORMED=${report.currentRunMutationPerformed}`,
    `PREEXISTING_REMOTE_APPLICATION_STATE=${report.preexistingRemoteApplicationState}`,
    `PARTIAL_STATE_RECOVERY_ELIGIBLE=${report.recoveryPreflight?.partialStateRecoveryEligible ?? "NOT_RUN"}`,
    `FORWARD_DRY_RUN_MIGRATION_COUNT=${safeValue(report.dryRunMigrationCount)}`,
    `FORWARD_DRY_RUN_FIRST_LAST=${report.dryRunFirstLast}`,
    `SCHEMA_PUSH_ATTEMPTS=${report.commandCounts.schemaPush}`,
    `CONTENT_TRANSACTION_ATTEMPTS=${report.commandCounts.contentTransaction}`,
    `MUTATION_COMMAND_COUNT=${report.commandCounts.mutation}`,
    `UNEXPECTED_OPERATION_COUNT=${report.commandCounts.unexpected}`,
    `MIGRATIONS_APPLIED=${counts ? `${counts.migrationRows}/40` : "NOT_RUN"}`,
    `RELEASE_BANK=${counts ? `${counts.units}/${counts.publicQuestions}/${counts.privateSolutions}/${counts.officialOutcomes}` : "NOT_RUN"}`,
    `UNIVERSAL_RELEASE=${counts?.draftInactiveReleases === 1 ? "DRAFT/INACTIVE" : "NOT_RUN"}`,
    `CURRICULUM_RUNTIME=${counts ? "false" : "NOT_RUN"}`,
    `GRADE2_CONTROLLED_ADAPTIVE_PILOT=${counts?.adaptiveEnabledRows === 0 ? "DISABLED" : "NOT_RUN"}`,
    `AUTH_USER_COUNT=${counts?.authUsers ?? "NOT_RUN"}`,
    `STORAGE_OBJECT_COUNT=${counts?.storageObjects ?? "NOT_RUN"}`,
    `SYNTHETIC_USER_COUNT=${counts?.syntheticUserRows ?? "NOT_RUN"}`,
    `LOCAL_RUNTIME_UNCHANGED=${report.localRuntimeUnchanged}`,
    "ACTIVATION_PERFORMED=NO",
    "PUBLICATION_PERFORMED=NO",
    "DEPLOYMENT_PERFORMED=NO",
    `ROOT_FAILURE_CODE=${report.rootFailureCode}`,
    `FORWARD_RECOVERY=${report.ok ? "PASS" : "FAIL"}`,
  ].join("\n") + "\n";
}

export function runProject004ForwardRecoveryCommand(options?: {
  environment?: NodeJS.ProcessEnv;
  candidateRoot?: string;
  argv?: string[];
  prompt?: SecurePrompt;
  execute?: typeof executeAuthorizedForwardRecovery;
}) {
  const environment = options?.environment ?? process.env;
  const candidateRoot = options?.candidateRoot ?? process.cwd();
  const argv = options?.argv ?? process.argv.slice(2);
  const prompt = options?.prompt ?? securePrompt;
  const execute =
    options?.execute ?? executeAuthorizedForwardRecovery;
  let manifest: ReturnType<
    typeof loadPrefixSemanticManifest
  >["manifest"];
  try {
    manifest =
      loadPrefixSemanticManifest(candidateRoot).manifest;
  } catch {
    const report = notRunForwardRecoveryReport(
      "PREFIX_SEMANTIC_MANIFEST_INVALID",
    );
    return {
      exitCode: 1,
      report,
      output: renderForwardRecoveryReport(report),
    };
  }
  if (
    manifest.canonicalCatalogStatus !== "VERIFIED" ||
    manifest.freshLocalIntegration.migration0039 !== "PASS" ||
    manifest.freshLocalIntegration.migration0040 !== "PASS"
  ) {
    const report = notRunForwardRecoveryReport(
      "PREFIX_RECOVERY_NOT_VERIFIED",
    );
    report.stage = "LOCAL_READINESS";
    return {
      exitCode: 1,
      report,
      output: renderForwardRecoveryReport(report),
    };
  }
  if (
    argv.length !== 1 ||
    argv[0] !== "--owner-approved-forward-recovery"
  ) {
    const report = notRunForwardRecoveryReport(
      "FORWARD_RECOVERY_OWNER_APPROVAL_REQUIRED",
    );
    return {
      exitCode: 1,
      report,
      output: renderForwardRecoveryReport(report),
    };
  }

  const projectRef = prompt(
    "Project004 remote project reference: ",
  );
  if (!projectRef.ok) {
    const report = notRunForwardRecoveryReport(projectRef.code);
    return {
      exitCode: 1,
      report,
      output: renderForwardRecoveryReport(report),
    };
  }
  const databasePassword = prompt(
    "Project004 remote database password: ",
  );
  if (!databasePassword.ok) {
    const report = notRunForwardRecoveryReport(
      databasePassword.code,
    );
    return {
      exitCode: 1,
      report,
      output: renderForwardRecoveryReport(report),
    };
  }
  const operationEnvironment: NodeJS.ProcessEnv = {
    ...environment,
    PLAVE_PROJECT004_REMOTE_TARGET_NAME:
      project004RemoteDevContract.projectName,
    PLAVE_PROJECT004_REMOTE_PROJECT_REF: projectRef.value,
    PLAVE_PROJECT004_REMOTE_DB_PASSWORD:
      databasePassword.value,
    PLAVE_PROJECT004_REMOTE_ENVIRONMENT_CLASS:
      project004RemoteDevContract.environmentClass,
    PLAVE_PROJECT004_REMOTE_OWNER_APPROVAL:
      project004RemoteDevContract.forwardRecoveryApproval,
  };
  let report: ForwardRecoveryReport;
  try {
    report = execute({
      environment: operationEnvironment,
      candidateRoot,
    });
  } catch {
    report = notRunForwardRecoveryReport(
      "FORWARD_RECOVERY_UNCLASSIFIED_FAILURE",
    );
  } finally {
    delete operationEnvironment
      .PLAVE_PROJECT004_REMOTE_PROJECT_REF;
    delete operationEnvironment
      .PLAVE_PROJECT004_REMOTE_DB_PASSWORD;
    delete operationEnvironment
      .PLAVE_PROJECT004_REMOTE_OWNER_APPROVAL;
  }
  return {
    exitCode: report.ok ? 0 : 1,
    report,
    output: renderForwardRecoveryReport(report),
  };
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  const command = runProject004ForwardRecoveryCommand();
  process.stdout.write(command.output);
  process.exitCode = command.exitCode;
}
