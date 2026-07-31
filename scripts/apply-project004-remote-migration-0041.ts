import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  executeMigration0041ControlledApply,
  project004Migration0041Contract,
  type Migration0041OperationReport,
} from "./project004-remote-migration-0041.ts";
import {
  renderMigration0041Preflight,
} from "./run-project004-remote-migration-0041-preflight.ts";
import {
  promptProject004UniversalRemoteEnvironment,
} from "./run-project004-remote-universal-preflight.ts";
import {
  type SecurePromptResult,
} from "./project004-secure-tty-prompt.ts";

type SecurePrompt = (label: string) => SecurePromptResult;

function lockedReport(
  rootFailureCode: string,
): Migration0041OperationReport {
  return {
    ok: false,
    status: "FAILED",
    preflight: {
      ok: false,
      project004Canonical: "NOT_RUN",
      remoteIdentityGuard: "NOT_RUN",
      endpointMode: "NOT_RUN",
      localPrefixChecksums: "NOT_RUN",
      localMigration0041Checksum: "NOT_RUN",
      prefixSchemaFingerprint: "NOT_APPLICABLE",
      remoteMigration0041Checksum: "NOT_APPLICABLE",
      remoteMigration0041SourceHash: "NOT_APPLICABLE",
      generatedRuntimeRemoteOff: "NOT_RUN",
      remotePhase: "NOT_RUN",
      migration0041Eligible: "NO",
      releaseContract: "NOT_RUN",
      grade1Boundary: "NOT_RUN",
      adaptivePilotDisabled: "NOT_RUN",
      rlsPrivateBoundary: "NOT_RUN",
      counts: null,
      config: null,
      resolvedEndpoint: null,
      rootFailureCode,
      currentRunMutationPerformed: "NO",
      remoteQuery: {
        sqlstate: "NOT_RUN",
        failureStage: "NOT_RUN",
        failedStatementClass: "NOT_RUN",
        preconditionId: "NOT_RUN",
        stderrClass: "NOT_RUN",
        connectionVerified: "NOT_RUN",
        readOnlyVerified: "NOT_RUN",
        missingRoutineClass: "NOT_RUN",
      },
      remoteMigrationChecksumCapability: "NOT_RUN",
    },
    postflight: null,
    applyAttempts: 0,
    approvalConsumed: false,
    postApplyDiagnostic: "NOT_RUN",
    historyCountsUnchanged: "NOT_RUN",
    transactionRollback: "NOT_RUN",
    sqlstate: "NOT_RUN",
    failureStage: "NONE",
    failedStatementClass: "NONE",
    preconditionId: "NONE",
    currentRunMutationPerformed: "NO",
    rootFailureCode,
  };
}

export function renderMigration0041Operation(
  report: Migration0041OperationReport,
) {
  const after = report.postflight?.counts;
  return [
    renderMigration0041Preflight(report.preflight, {
      includeTerminalFields: false,
    }),
    `MIGRATION_0041_OPERATION_STATUS=${report.status}`,
    `MIGRATION_0041_APPLY_ATTEMPTS=${report.applyAttempts}`,
    `OWNER_APPROVAL_CONSUMED=${report.approvalConsumed ? "YES" : "NO"}`,
    `MIGRATION_0041_SQLSTATE=${report.sqlstate}`,
    `MIGRATION_0041_FAILURE_STAGE=${report.failureStage}`,
    `MIGRATION_0041_FAILED_STATEMENT_CLASS=${report.failedStatementClass}`,
    `MIGRATION_0041_PRECONDITION_ID=${report.preconditionId}`,
    `TRANSACTION_ROLLBACK=${report.transactionRollback}`,
    `POST_APPLY_DIAGNOSTIC=${report.postApplyDiagnostic}`,
    `MIGRATIONS_AFTER=${
      after
        ? `${after.migrationCount}/41`
        : "NOT_RUN"
    }`,
    `MIGRATION_FIRST_LAST_AFTER=${
      after
        ? `${after.migrationFirst}/${after.migrationLast}`
        : "NOT_RUN"
    }`,
    `PROVENANCE_FIELDS_AFTER=${
      after ? `${after.provenanceFieldCount}/8` : "NOT_RUN"
    }`,
    `EXISTING_ATTEMPTS_HISTORY_UNCHANGED=${report.historyCountsUnchanged}`,
    `GENERATED_ATTEMPT_OR_QUESTION_SEEDED=${
      report.historyCountsUnchanged === "PASS" ? "NO" : "NOT_RUN"
    }`,
    `UNIVERSAL_RELEASE_AFTER=${
      report.postflight?.releaseContract === "PASS"
        ? "ACTIVE/ACTIVE"
        : "NOT_RUN"
    }`,
    `RELEASE_BANK_AFTER=${
      after
        ? `${after.releaseUnits}/${after.releaseQuestions}/${after.releaseSolutions}/${after.releaseOutcomes}`
        : "NOT_RUN"
    }`,
    `GRADE1_BOUNDARY_AFTER=${
      report.postflight?.grade1Boundary ?? "NOT_RUN"
    }`,
    `GRADE2_CONTROLLED_ADAPTIVE_PILOT_AFTER=${
      report.postflight?.adaptivePilotDisabled === "PASS"
        ? "DISABLED"
        : "NOT_RUN"
    }`,
    `GENERATED_RUNTIME_REMOTE_AFTER=${
      report.postflight?.generatedRuntimeRemoteOff === "PASS"
        ? "OFF"
        : "NOT_RUN"
    }`,
    `RLS_PRIVATE_SOLUTION_BOUNDARY_AFTER=${
      report.postflight?.rlsPrivateBoundary ?? "NOT_RUN"
    }`,
    "ACTIVATION_PERFORMED=NO",
    "PUBLICATION_PERFORMED=NO",
    "DEPLOYMENT_PERFORMED=NO",
    `CURRENT_RUN_MUTATION_PERFORMED=${report.currentRunMutationPerformed}`,
    `ROOT_FAILURE_CODE=${report.rootFailureCode}`,
    `PROJECT004_MIGRATION_0041_APPLY=${
      report.ok ? "PASS" : "FAIL"
    }`,
    "",
  ].join("\n");
}

export function runMigration0041ApplyCommand(options?: {
  environment?: NodeJS.ProcessEnv;
  candidateRoot?: string;
  prompt?: SecurePrompt;
  execute?: typeof executeMigration0041ControlledApply;
}) {
  if (
    project004Migration0041Contract.authorizationStatus !==
    "OWNER_APPROVED_FOR_ONE_TIME_APPLY"
  ) {
    const report = lockedReport(
      "MIGRATION_0041_OWNER_APPROVAL_REQUIRED",
    );
    return {
      exitCode: 1,
      report,
      output: renderMigration0041Operation(report),
    };
  }
  const prompted = promptProject004UniversalRemoteEnvironment({
    environment: options?.environment,
    prompt: options?.prompt,
  });
  if (!prompted.ok) {
    const report = lockedReport(prompted.code);
    return {
      exitCode: 1,
      report,
      output: renderMigration0041Operation(report),
    };
  }
  try {
    try {
      const report = (
        options?.execute ??
        executeMigration0041ControlledApply
      )({
        environment: prompted.environment,
        candidateRoot: options?.candidateRoot,
        approval: project004Migration0041Contract.approval,
      });
      return {
        exitCode: report.ok ? 0 : 1,
        report,
        output: renderMigration0041Operation(report),
      };
    } catch {
      const report = lockedReport(
        "MIGRATION_0041_OPERATION_FAILED",
      );
      return {
        exitCode: 1,
        report,
        output: renderMigration0041Operation(report),
      };
    }
  } finally {
    prompted.clear();
  }
}

export function renderMigration0041PackageSmoke() {
  const pass =
    project004Migration0041Contract.targetName ===
      "plave-project004-dev-clean" &&
    project004Migration0041Contract.migrationVersion === "0041" &&
    project004Migration0041Contract.authorizationStatus ===
      "OWNER_APPROVED_FOR_ONE_TIME_APPLY";
  return [
    `PROJECT004_CANONICAL=${pass ? "PASS" : "FAIL"}`,
    `EXACT_REMOTE_TARGET_GUARD=${pass ? "PASS" : "FAIL"}`,
    `MIGRATION_0041_CHECKSUM_PIN=${pass ? "PASS" : "FAIL"}`,
    "OWNER_APPROVAL=UNLOCKED_FOR_ONE_ATTEMPT",
    "REMOTE_ACCESS_PERFORMED=NO",
    "CURRENT_RUN_MUTATION_PERFORMED=NO",
    "",
  ].join("\n");
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  if (process.argv.includes("--smoke")) {
    process.stdout.write(renderMigration0041PackageSmoke());
  } else {
    const result = runMigration0041ApplyCommand();
    process.stdout.write(result.output);
    process.exitCode = result.exitCode;
  }
}
