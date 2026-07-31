import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  project004RemoteDevContract,
} from "./project004-remote-dev-guard.ts";
import {
  executePrefixRecoveryReadOnlyPreflight,
  type PrefixRecoveryPreflightReport,
} from "./project004-prefix-recovery-preflight.ts";
import {
  runLocalRemoteDevPreflight,
} from "./project004-remote-dev-operations.ts";
import {
  readMaskedLineFromControllingTty,
  type SecurePromptResult,
} from "./project004-secure-tty-prompt.ts";

type SecurePrompt = (label: string) => SecurePromptResult;

function securePrompt(label: string) {
  return readMaskedLineFromControllingTty({ label });
}

function notRunReport(
  rootFailureCode: string,
): PrefixRecoveryPreflightReport {
  return {
    ok: false,
    rootFailureCode,
    currentRunMutationPerformed: "NO",
    preexistingRemoteApplicationState: "NOT_RUN",
    incident: null,
    canonicalSemanticFingerprint: "UNVERIFIED",
    remoteSemanticFingerprint: "NOT_RUN",
    semanticMismatchCount: "NOT_RUN",
    extraObjectClassification: "FOREIGN_OR_UNVERIFIED",
    forwardPreconditions: "NOT_RUN",
    migration0039FreshLocal: "UNVERIFIED",
    migration0040FreshLocal: "UNVERIFIED",
    partialStateRecoveryEligible: "NO",
    effectiveExtraObjectCount: "NOT_RUN",
    commandCounts: {
      projectList: 0,
      readOnlySql: 0,
      mutation: 0,
      unexpected: 0,
    },
  };
}

function value(
  candidate: string | number | undefined,
) {
  return candidate ?? "NOT_RUN";
}

export function renderPrefixRecoveryAudit(
  report: PrefixRecoveryPreflightReport,
) {
  const incident = report.incident;
  return [
    `CURRENT_RUN_MUTATION_PERFORMED=${report.currentRunMutationPerformed}`,
    `PREEXISTING_REMOTE_APPLICATION_STATE=${report.preexistingRemoteApplicationState}`,
    `REMOTE_MIGRATION_COUNT=${value(incident?.migration?.count)}`,
    `REMOTE_MIGRATION_FIRST_LAST=${value(incident?.migration?.firstLast)}`,
    `CANONICAL_CONTIGUOUS_PREFIX=${value(incident?.migration?.contiguousPrefix)}`,
    `MISSING_MIGRATIONS=${value(incident?.migration?.missingMigrations)}`,
    `FOREIGN_MIGRATIONS=${value(incident?.migration?.foreignMigrations)}`,
    `PLAVE_OBJECTS_EXPECTED_FOR_PREFIX=${value(incident?.schema?.expectedForPrefix)}`,
    `PLAVE_OBJECTS_OBSERVED=${value(incident?.schema?.observedCanonical)}`,
    `MISSING_OBJECT_COUNT=${value(incident?.schema?.missingObjects)}`,
    `RAW_EXTRA_OBJECT_COUNT=${value(incident?.schema?.extraObjects)}`,
    `EXTRA_OBJECT_CLASSIFICATION=${report.extraObjectClassification}`,
    `EFFECTIVE_EXTRA_OBJECT_COUNT=${value(report.effectiveExtraObjectCount)}`,
    `CANONICAL_PREFIX_SEMANTIC_FINGERPRINT=${report.canonicalSemanticFingerprint}`,
    `REMOTE_PREFIX_SEMANTIC_FINGERPRINT=${report.remoteSemanticFingerprint}`,
    `SEMANTIC_MISMATCH_COUNT=${value(report.semanticMismatchCount)}`,
    `AUTH_USER_COUNT=${value(incident?.data?.authUsers)}`,
    `STORAGE_OBJECT_COUNT=${value(incident?.data?.storageObjects)}`,
    `SYNTHETIC_USER_COUNT=${value(incident?.data?.syntheticUsers)}`,
    `RLS_PRIVATE_BOUNDARY=${value(incident?.schema?.rlsPrivateBoundary)}`,
    `FORWARD_0039_0040_PRECONDITIONS=${report.forwardPreconditions}`,
    `MIGRATION_0039_FRESH_LOCAL=${report.migration0039FreshLocal}`,
    `MIGRATION_0040_FRESH_LOCAL=${report.migration0040FreshLocal}`,
    `READ_ONLY_COMMAND_COUNT=${report.commandCounts.readOnlySql}`,
    `MUTATION_COMMAND_COUNT=${report.commandCounts.mutation}`,
    `UNEXPECTED_OPERATION_COUNT=${report.commandCounts.unexpected}`,
    `PARTIAL_STATE_RECOVERY_ELIGIBLE=${report.partialStateRecoveryEligible}`,
    `ROOT_FAILURE_CODE=${report.rootFailureCode}`,
    `PREFIX_RECOVERY_READ_ONLY_AUDIT=${report.ok ? "PASS" : "FAIL"}`,
  ].join("\n") + "\n";
}

export function runProject004PrefixRecoveryAuditCommand(options?: {
  environment?: NodeJS.ProcessEnv;
  candidateRoot?: string;
  prompt?: SecurePrompt;
  execute?: typeof executePrefixRecoveryReadOnlyPreflight;
}) {
  const environment = options?.environment ?? process.env;
  const candidateRoot = options?.candidateRoot ?? process.cwd();
  const prompt = options?.prompt ?? securePrompt;
  const execute =
    options?.execute ?? executePrefixRecoveryReadOnlyPreflight;
  const local = runLocalRemoteDevPreflight(candidateRoot);
  if (!local.ok) {
    const report = notRunReport(
      local.failureCode ?? "LOCAL_CHECKSUM_MISMATCH",
    );
    return {
      exitCode: 1,
      report,
      output: renderPrefixRecoveryAudit(report),
    };
  }
  const projectRef = prompt(
    "Project004 remote project reference: ",
  );
  if (!projectRef.ok) {
    const report = notRunReport(projectRef.code);
    return {
      exitCode: 1,
      report,
      output: renderPrefixRecoveryAudit(report),
    };
  }
  const databasePassword = prompt(
    "Project004 remote database password: ",
  );
  if (!databasePassword.ok) {
    const report = notRunReport(databasePassword.code);
    return {
      exitCode: 1,
      report,
      output: renderPrefixRecoveryAudit(report),
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
  };
  let report: PrefixRecoveryPreflightReport;
  try {
    report = execute({
      environment: operationEnvironment,
      candidateRoot,
    });
  } catch {
    report = notRunReport(
      "PREFIX_RECOVERY_AUDIT_UNCLASSIFIED_FAILURE",
    );
  } finally {
    delete operationEnvironment
      .PLAVE_PROJECT004_REMOTE_PROJECT_REF;
    delete operationEnvironment
      .PLAVE_PROJECT004_REMOTE_DB_PASSWORD;
  }
  return {
    exitCode: report.ok ? 0 : 1,
    report,
    output: renderPrefixRecoveryAudit(report),
  };
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  const command =
    runProject004PrefixRecoveryAuditCommand();
  process.stdout.write(command.output);
  process.exitCode = command.exitCode;
}
