import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  executeProject004UniversalActivationOnce,
  project004UniversalActivationContract,
  type UniversalActivationOperationReport,
} from "./project004-remote-universal-activation.ts";
import {
  promptProject004UniversalRemoteEnvironment,
  renderProject004UniversalActivationPreflight,
} from "./run-project004-remote-universal-preflight.ts";
import { runLocalRemoteDevPreflight } from "./project004-remote-dev-operations.ts";
import type { SecurePromptResult } from "./project004-secure-tty-prompt.ts";
import {
  loadProject004RemoteRuntimeConfigFile,
  setProject004RemoteRuntimeUniversalFlag,
} from "./project004-remote-runtime-connection.ts";

function lockedReport(
  rootFailureCode: string,
): UniversalActivationOperationReport {
  const local = runLocalRemoteDevPreflight();
  return {
    ok: false,
    preflight: {
      ok: false,
      project004Canonical: local.project004Canonical,
      localMigrationChecksums: local.localMigrationChecksums,
      cleanDisposableProof: local.cleanDisposableProof,
      remoteIdentityGuard: "NOT_RUN",
      endpointMode: "NOT_RUN",
      schemaFingerprint: "NOT_RUN",
      releaseContract: "NOT_RUN",
      grade1LegacyBoundary: "NOT_RUN",
      adaptivePilotDisabled: "NOT_RUN",
      rlsPrivateBoundary: "NOT_RUN",
      activationEligible: "NO",
      counts: null,
      resolvedEndpoint: null,
      config: null,
      rootFailureCode,
      currentRunMutationPerformed: "NO",
    },
    activationAttempts: 0,
    postActivationDiagnostic: "NOT_RUN",
    releaseState: "NOT_RUN",
    releaseBank: "NOT_RUN",
    adaptivePilot: "NOT_RUN",
    runtimeConfigurationRequired: "YES",
    activationSqlstate: "NOT_RUN",
    activationFailureStage: "NONE",
    activationFailedStatementClass: "NONE",
    activationPreconditionId: "NONE",
    transactionRollback: "NOT_RUN",
    currentRunMutationPerformed: "NO",
    rootFailureCode,
  };
}

export function renderProject004UniversalActivationOperation(
  report: UniversalActivationOperationReport,
  options?: {
    localRuntimeProfile?: "ENABLED" | "NOT_CONFIGURED" | "UPDATE_FAILED";
    rootFailureCode?: string;
    operationPass?: boolean;
  },
) {
  return [
    renderProject004UniversalActivationPreflight(
      report.preflight,
      { includeTerminalFields: false },
    ),
    [
      `ACTIVATION_ATTEMPTS=${report.activationAttempts}`,
      `ACTIVATION_SQLSTATE=${report.activationSqlstate}`,
      `ACTIVATION_FAILURE_STAGE=${report.activationFailureStage}`,
      `ACTIVATION_FAILED_STATEMENT_CLASS=${report.activationFailedStatementClass}`,
      `ACTIVATION_PRECONDITION_ID=${report.activationPreconditionId}`,
      `TRANSACTION_ROLLBACK=${report.transactionRollback}`,
      `POST_ACTIVATION_DIAGNOSTIC=${report.postActivationDiagnostic}`,
      `UNIVERSAL_RELEASE_AFTER=${report.releaseState}`,
      `RELEASE_BANK_AFTER=${report.releaseBank}`,
      `GRADE2_CONTROLLED_ADAPTIVE_PILOT_AFTER=${report.adaptivePilot}`,
      `APPLICATION_RUNTIME_CONFIGURATION_REQUIRED=${report.runtimeConfigurationRequired}`,
      `LOCAL_RUNTIME_PROFILE=${options?.localRuntimeProfile ?? "NOT_RUN"}`,
      `CURRENT_RUN_MUTATION_PERFORMED=${report.currentRunMutationPerformed}`,
      `ROOT_FAILURE_CODE=${options?.rootFailureCode ?? report.rootFailureCode}`,
      `PROJECT004_UNIVERSAL_ACTIVATION=${
        (options?.operationPass ?? report.ok) ? "PASS" : "FAIL"
      }`,
      "",
    ].join("\n"),
  ].join("\n");
}

export function runProject004UniversalActivationCommand(
  options?: {
    environment?: NodeJS.ProcessEnv;
    candidateRoot?: string;
    prompt?: (label: string) => SecurePromptResult;
    execute?: typeof executeProject004UniversalActivationOnce;
  },
) {
  const candidateRoot =
    options?.candidateRoot ?? process.cwd();
  if (
    project004UniversalActivationContract
      .activationAuthorizationStatus !==
    "OWNER_APPROVED_FOR_ONE_TIME_ACTIVATION"
  ) {
    const report = lockedReport(
      "UNIVERSAL_ACTIVATION_OWNER_APPROVAL_REQUIRED",
    );
    return {
      exitCode: 1,
      report,
      output:
        renderProject004UniversalActivationOperation(report),
    };
  }
  let localRuntimeConfig: ReturnType<
    typeof loadProject004RemoteRuntimeConfigFile
  >;
  try {
    localRuntimeConfig =
      loadProject004RemoteRuntimeConfigFile(candidateRoot);
  } catch {
    const report = lockedReport(
      "REMOTE_RUNTIME_PROFILE_REQUIRED_BEFORE_ACTIVATION",
    );
    return {
      exitCode: 1,
      report,
      output:
        renderProject004UniversalActivationOperation(report),
    };
  }
  const prompted = promptProject004UniversalRemoteEnvironment(
    options,
  );
  if (!prompted.ok) {
    const report = lockedReport(prompted.code);
    return {
      exitCode: 1,
      report,
      output:
        renderProject004UniversalActivationOperation(report),
    };
  }
  try {
    if (
      prompted.environment
        .PLAVE_PROJECT004_REMOTE_PROJECT_REF !==
      localRuntimeConfig.projectRef
    ) {
      const report = lockedReport(
        "REMOTE_RUNTIME_PROFILE_TARGET_MISMATCH",
      );
      return {
        exitCode: 1,
        report,
        output:
          renderProject004UniversalActivationOperation(report),
      };
    }
    const report = (
      options?.execute ??
      executeProject004UniversalActivationOnce
    )({
      environment: prompted.environment,
      approval:
        project004UniversalActivationContract.activationApproval,
      candidateRoot,
    });
    let localRuntimeProfile:
      | "ENABLED"
      | "NOT_CONFIGURED"
      | "UPDATE_FAILED" = "NOT_CONFIGURED";
    if (report.ok) {
      try {
        setProject004RemoteRuntimeUniversalFlag(
          true,
          candidateRoot,
        );
        localRuntimeProfile = "ENABLED";
      } catch {
        localRuntimeProfile = "UPDATE_FAILED";
      }
    }
    const localUpdateFailed =
      report.ok && localRuntimeProfile === "UPDATE_FAILED";
    return {
      exitCode: report.ok && !localUpdateFailed ? 0 : 1,
      report,
      output:
        renderProject004UniversalActivationOperation(report, {
          localRuntimeProfile,
          rootFailureCode: localUpdateFailed
            ? "REMOTE_ACTIVATED_LOCAL_RUNTIME_PROFILE_UPDATE_FAILED"
            : report.rootFailureCode,
          operationPass: report.ok && !localUpdateFailed,
        }),
    };
  } finally {
    prompted.clear();
  }
}

export function renderProject004UniversalActivationAuthorizationSmoke() {
  const pass =
    project004UniversalActivationContract.targetName ===
      "plave-project004-dev-clean" &&
    project004UniversalActivationContract
      .activationAuthorizationStatus ===
      "OWNER_APPROVED_FOR_ONE_TIME_ACTIVATION" &&
    project004UniversalActivationContract
      .deactivationAuthorizationStatus ===
      "OWNER_APPROVAL_REQUIRED";
  return [
    `PROJECT004_CANONICAL=${pass ? "PASS" : "FAIL"}`,
    `EXACT_REMOTE_TARGET_GUARD=${pass ? "PASS" : "FAIL"}`,
    "ONE_TIME_ACTIVATION_AUTHORIZATION=PASS",
    "DEACTIVATION_AUTHORIZATION=LOCKED",
    "REMOTE_ACCESS_PERFORMED=NO",
    "CURRENT_RUN_MUTATION_PERFORMED=NO",
    "REMOTE_MUTATION_PERFORMED=NO",
    "",
  ].join("\n");
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  if (process.argv.includes("--smoke")) {
    process.stdout.write(
      renderProject004UniversalActivationAuthorizationSmoke(),
    );
  } else {
    const result = runProject004UniversalActivationCommand();
    process.stdout.write(result.output);
    process.exitCode = result.exitCode;
  }
}
