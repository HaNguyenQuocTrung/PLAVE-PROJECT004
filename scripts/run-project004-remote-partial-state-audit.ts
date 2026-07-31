import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  auditPriorDryRunConstruction,
  executeRemotePartialStateIncidentAudit,
  type RemotePartialStateAuditReport,
  type StaticDryRunAudit,
} from "./project004-remote-partial-state-audit.ts";
import { project004RemoteDevContract } from "./project004-remote-dev-guard.ts";
import {
  runLocalRemoteDevPreflight,
  type RemoteDevCheckState,
} from "./project004-remote-dev-operations.ts";
import {
  readMaskedLineFromControllingTty,
  type SecurePromptResult,
} from "./project004-secure-tty-prompt.ts";

type SecurePrompt = (label: string) => SecurePromptResult;

function securePrompt(label: string) {
  return readMaskedLineFromControllingTty({ label });
}

function notRunStaticAudit(): StaticDryRunAudit {
  return {
    dryRunArgvContract: "NOT_RUN",
    sanitizedDryRunArgvEvidence: "UNVERIFIED",
    childProcessSequence: "NOT_RUN",
    dryRunOutputParser: "NOT_RUN",
    fallbackMutationPath: "NOT_FOUND",
    hiddenSchemaPushPath: "NOT_FOUND",
    priorCapturedArgv: "NOT_RECORDED",
  };
}

function notRunReport(options: {
  project004Canonical: RemoteDevCheckState;
  localMigrationChecksums: RemoteDevCheckState;
  rootFailureCode: string;
  staticDryRunAudit?: StaticDryRunAudit;
}): RemotePartialStateAuditReport {
  return {
    ok: false,
    rootFailureCode: options.rootFailureCode,
    currentRunMutationPerformed: "NO",
    preexistingRemoteApplicationState: "NOT_RUN",
    project004Canonical: options.project004Canonical,
    remoteIdentityGuard: "NOT_RUN",
    localMigrationChecksums: options.localMigrationChecksums,
    baselineCounts: null,
    migration: null,
    schema: null,
    data: null,
    foreignClassification: "NOT_RUN",
    recoveryEligible: "NO",
    commandCounts: {
      projectList: 0,
      readOnlySql: 0,
      mutation: 0,
      unexpected: 0,
    },
    staticDryRunAudit:
      options.staticDryRunAudit ?? notRunStaticAudit(),
  };
}

function valueOrNotRun(
  value: string | number | undefined,
) {
  return value ?? "NOT_RUN";
}

export function renderRemotePartialStateAudit(
  report: RemotePartialStateAuditReport,
) {
  const baseline = report.baselineCounts;
  const migration = report.migration;
  const schema = report.schema;
  const data = report.data;
  const lines = [
    `PROJECT004_CANONICAL=${report.project004Canonical}`,
    `REMOTE_IDENTITY_GUARD=${report.remoteIdentityGuard}`,
    `LOCAL_MIGRATION_CHECKSUMS=${report.localMigrationChecksums}`,
    `CURRENT_RUN_MUTATION_PERFORMED=${report.currentRunMutationPerformed}`,
    `PREEXISTING_REMOTE_APPLICATION_STATE=${report.preexistingRemoteApplicationState}`,
    `REMOTE_MIGRATION_COUNT=${valueOrNotRun(migration?.count)}`,
    `REMOTE_MIGRATION_FIRST_LAST=${valueOrNotRun(migration?.firstLast)}`,
    `CANONICAL_CONTIGUOUS_PREFIX=${valueOrNotRun(migration?.contiguousPrefix)}`,
    `CANONICAL_PREFIX_LAST=${valueOrNotRun(migration?.prefixLast)}`,
    `MISSING_MIGRATIONS=${valueOrNotRun(migration?.missingMigrations)}`,
    `FOREIGN_MIGRATIONS=${valueOrNotRun(migration?.foreignMigrations)}`,
    `DUPLICATE_MIGRATIONS=${valueOrNotRun(migration?.duplicateVersions)}`,
    `OUT_OF_ORDER_MIGRATIONS=${valueOrNotRun(migration?.outOfOrderVersions)}`,
    `CHECKSUM_METADATA=${valueOrNotRun(migration?.checksumMetadata)}`,
    `CHECKSUM_DRIFT_COUNT=${valueOrNotRun(migration?.checksumDriftCount)}`,
    `PLAVE_OBJECTS_EXPECTED_FOR_PREFIX=${valueOrNotRun(schema?.expectedForPrefix)}`,
    `PLAVE_OBJECTS_OBSERVED=${valueOrNotRun(schema?.observedCanonical)}`,
    `EXTRA_OBJECT_COUNT=${valueOrNotRun(schema?.extraObjects)}`,
    `MISSING_OBJECT_COUNT=${valueOrNotRun(schema?.missingObjects)}`,
    `AUTH_USER_COUNT=${valueOrNotRun(data?.authUsers)}`,
    `STORAGE_OBJECT_COUNT=${valueOrNotRun(data?.storageObjects)}`,
    `SYNTHETIC_USER_COUNT=${valueOrNotRun(data?.syntheticUsers)}`,
    `CURRICULUM_COUNTS=${valueOrNotRun(data?.curriculumCounts)}`,
    `RELEASE_STATE=${valueOrNotRun(data?.releaseState)}`,
    `RUNTIME_STATE=${valueOrNotRun(data?.runtimeState)}`,
    `PILOT_STATE=${valueOrNotRun(data?.pilotState)}`,
    `RLS_PRIVATE_BOUNDARY=${valueOrNotRun(schema?.rlsPrivateBoundary)}`,
    `FOREIGN_OBJECT_CLASSIFICATION=${report.foreignClassification}`,
    `PLATFORM_BASELINE_OBJECTS=${valueOrNotRun(baseline?.platformBaselineObjects)}`,
    `PLAVE_APPLICATION_OBJECTS=${valueOrNotRun(baseline?.plaveApplicationObjects)}`,
    `FOREIGN_APPLICATION_OBJECTS=${valueOrNotRun(baseline?.foreignApplicationObjects)}`,
    `DRY_RUN_ARGV_CONTRACT=${report.staticDryRunAudit.dryRunArgvContract}`,
    `SANITIZED_DRY_RUN_ARGV_EVIDENCE=${report.staticDryRunAudit.sanitizedDryRunArgvEvidence}`,
    `DRY_RUN_CHILD_SEQUENCE=${report.staticDryRunAudit.childProcessSequence}`,
    `DRY_RUN_OUTPUT_PARSER=${report.staticDryRunAudit.dryRunOutputParser}`,
    `DRY_RUN_FALLBACK_MUTATION_PATH=${report.staticDryRunAudit.fallbackMutationPath}`,
    `PRIOR_DRY_RUN_ARGV_RECORD=${report.staticDryRunAudit.priorCapturedArgv}`,
    `HIDDEN_SCHEMA_PUSH_PATH=${report.staticDryRunAudit.hiddenSchemaPushPath}`,
    `READ_ONLY_COMMAND_COUNT=${report.commandCounts.readOnlySql}`,
    `UNEXPECTED_OPERATION_COUNT=${report.commandCounts.unexpected}`,
    `MUTATION_COMMAND_COUNT=${report.commandCounts.mutation}`,
    `PARTIAL_STATE_RECOVERY_ELIGIBLE=${report.recoveryEligible}`,
    `ROOT_FAILURE_CODE=${report.rootFailureCode}`,
    `READ_ONLY_INCIDENT_AUDIT=${report.ok ? "PASS" : "FAIL"}`,
  ];
  return `${lines.join("\n")}\n`;
}

export function runProject004RemotePartialStateAuditCommand(
  options?: {
    environment?: NodeJS.ProcessEnv;
    candidateRoot?: string;
    prompt?: SecurePrompt;
    execute?: typeof executeRemotePartialStateIncidentAudit;
  },
) {
  const environment = options?.environment ?? process.env;
  const candidateRoot = options?.candidateRoot ?? process.cwd();
  const prompt = options?.prompt ?? securePrompt;
  const execute =
    options?.execute ?? executeRemotePartialStateIncidentAudit;
  const local = runLocalRemoteDevPreflight(candidateRoot);
  if (!local.ok) {
    const report = notRunReport({
      project004Canonical: local.project004Canonical,
      localMigrationChecksums: local.localMigrationChecksums,
      rootFailureCode:
        local.failureCode ?? "LOCAL_CHECKSUM_MISMATCH",
    });
    return {
      exitCode: 1,
      report,
      output: renderRemotePartialStateAudit(report),
    };
  }

  const staticDryRunAudit =
    auditPriorDryRunConstruction(candidateRoot);
  const projectRefResult = prompt(
    "Project004 remote project reference: ",
  );
  if (!projectRefResult.ok) {
    const report = notRunReport({
      project004Canonical: "PASS",
      localMigrationChecksums: "PASS",
      rootFailureCode: projectRefResult.code,
      staticDryRunAudit,
    });
    return {
      exitCode: 1,
      report,
      output: renderRemotePartialStateAudit(report),
    };
  }

  const databasePasswordResult = prompt(
    "Project004 remote database password: ",
  );
  if (!databasePasswordResult.ok) {
    const report = notRunReport({
      project004Canonical: "PASS",
      localMigrationChecksums: "PASS",
      rootFailureCode: databasePasswordResult.code,
      staticDryRunAudit,
    });
    return {
      exitCode: 1,
      report,
      output: renderRemotePartialStateAudit(report),
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
  };
  let report: RemotePartialStateAuditReport;
  try {
    report = execute({
      environment: operationEnvironment,
      candidateRoot,
    });
  } catch {
    report = notRunReport({
      project004Canonical: "PASS",
      localMigrationChecksums: "PASS",
      rootFailureCode: "INCIDENT_AUDIT_UNCLASSIFIED_FAILURE",
      staticDryRunAudit,
    });
  } finally {
    delete operationEnvironment
      .PLAVE_PROJECT004_REMOTE_PROJECT_REF;
    delete operationEnvironment
      .PLAVE_PROJECT004_REMOTE_DB_PASSWORD;
  }
  return {
    exitCode: report.ok ? 0 : 1,
    report,
    output: renderRemotePartialStateAudit(report),
  };
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  const command =
    runProject004RemotePartialStateAuditCommand();
  process.stdout.write(command.output);
  process.exitCode = command.exitCode;
}
