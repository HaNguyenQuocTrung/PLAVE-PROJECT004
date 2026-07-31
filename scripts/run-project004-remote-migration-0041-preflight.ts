import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildMigration0041RemoteQuerySql,
  executeMigration0041RemotePreflight,
  migration0041RemoteQueryStages,
  type Migration0041PreflightReport,
} from "./project004-remote-migration-0041.ts";
import {
  promptProject004UniversalRemoteEnvironment,
} from "./run-project004-remote-universal-preflight.ts";
import {
  type SecurePromptResult,
} from "./project004-secure-tty-prompt.ts";
import {
  buildProject004UniversalActivationPsqlInvocation,
} from "./project004-universal-activation-execution.ts";

type SecurePrompt = (label: string) => SecurePromptResult;

function failedPreflight(
  rootFailureCode: string,
): Migration0041PreflightReport {
  return {
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
  };
}

export function renderMigration0041Preflight(
  report: Migration0041PreflightReport,
  options?: { includeTerminalFields?: boolean },
) {
  const counts = report.counts;
  const onlyPending =
    report.remotePhase === "BEFORE_0041"
      ? "0041"
      : report.remotePhase === "ALREADY_APPLIED"
        ? "NONE"
        : "NOT_RUN";
  return [
    `PROJECT004_CANONICAL=${report.project004Canonical}`,
    `REMOTE_IDENTITY_GUARD=${report.remoteIdentityGuard}`,
    `REMOTE_DATABASE_ENDPOINT_MODE=${report.endpointMode}`,
    `REMOTE_CONNECTION_VERIFIED=${report.remoteQuery.connectionVerified}`,
    `REMOTE_READ_ONLY_VERIFIED=${report.remoteQuery.readOnlyVerified}`,
    `REMOTE_QUERY_SQLSTATE=${report.remoteQuery.sqlstate}`,
    `REMOTE_QUERY_FAILURE_STAGE=${report.remoteQuery.failureStage}`,
    `REMOTE_QUERY_FAILED_STATEMENT_CLASS=${report.remoteQuery.failedStatementClass}`,
    `REMOTE_QUERY_PRECONDITION_ID=${report.remoteQuery.preconditionId}`,
    `REMOTE_QUERY_STDERR_CLASS=${report.remoteQuery.stderrClass}`,
    `REMOTE_QUERY_MISSING_ROUTINE_CLASS=${report.remoteQuery.missingRoutineClass}`,
    `DDL_TRANSACTION_ENDPOINT=${
      report.endpointMode === "DIRECT" ||
      report.endpointMode === "POOLER_SESSION"
        ? "PASS"
        : "NOT_RUN"
    }`,
    `LOCAL_MIGRATIONS_0001_0040_CHECKSUMS=${report.localPrefixChecksums}`,
    `LOCAL_MIGRATION_0041_CHECKSUM=${report.localMigration0041Checksum}`,
    `REMOTE_MIGRATION_HISTORY_COUNT=${counts?.migrationCount ?? "NOT_RUN"}`,
    `REMOTE_MIGRATION_FIRST_LAST=${
      counts
        ? `${counts.migrationFirst}/${counts.migrationLast}`
        : "NOT_RUN"
    }`,
    `REMOTE_FOREIGN_MIGRATIONS=${counts?.foreignMigrationCount ?? "NOT_RUN"}`,
    `REMOTE_MIGRATION_0041_COUNT=${counts?.migration0041Count ?? "NOT_RUN"}`,
    `REMOTE_MIGRATION_0041_CHECKSUM=${report.remoteMigration0041Checksum}`,
    `REMOTE_MIGRATION_CHECKSUM_CAPABILITY=${report.remoteMigrationChecksumCapability}`,
    `REMOTE_MIGRATION_0041_SOURCE_HASH=${report.remoteMigration0041SourceHash}`,
    `ONLY_PENDING_MIGRATION=${onlyPending}`,
    `PREFIX_0040_SCHEMA_FINGERPRINT=${report.prefixSchemaFingerprint}`,
    `ATTEMPT_ITEM_TABLE_CONTRACT=${
      counts?.tableCount === 1 &&
      counts.primaryKeyContractCount === 1
        ? "PASS"
        : "NOT_RUN"
    }`,
    `PROVENANCE_FIELDS=${counts ? `${counts.provenanceFieldCount}/8` : "NOT_RUN"}`,
    `PARTIAL_SCHEMA=${
      report.remotePhase === "PARTIAL_OR_DRIFTED"
        ? "YES"
        : report.remotePhase === "NOT_RUN"
          ? "NOT_RUN"
          : "NO"
    }`,
    `EXISTING_ATTEMPT_ROWS=${counts?.attemptRows ?? "NOT_RUN"}`,
    `EXISTING_GENERATED_QUESTION_ROWS=${counts?.generatedQuestionRows ?? "NOT_RUN"}`,
    `EXISTING_LEGACY_QUESTION_ROWS=${counts?.legacyQuestionRows ?? "NOT_RUN"}`,
    `EXISTING_SEMANTIC_QUESTION_ROWS=${counts?.semanticQuestionRows ?? "NOT_RUN"}`,
    `EXISTING_PRIVATE_SOLUTION_ROWS=${counts?.privateSolutionRows ?? "NOT_RUN"}`,
    `EXISTING_GENERATED_ANSWER_ROWS=${counts?.generatedAnswerRows ?? "NOT_RUN"}`,
    `EXISTING_LEARNING_HISTORY_ROWS=${counts?.learningHistoryRows ?? "NOT_RUN"}`,
    `RELEASE_CONTRACT=${report.releaseContract}`,
    `UNIVERSAL_RELEASE=${
      report.releaseContract === "PASS"
        ? "ACTIVE/ACTIVE"
        : "NOT_RUN"
    }`,
    `RELEASE_BANK=${
      counts
        ? `${counts.releaseUnits}/${counts.releaseQuestions}/${counts.releaseSolutions}/${counts.releaseOutcomes}`
        : "NOT_RUN"
    }`,
    `GRADE1_BOUNDARY=${report.grade1Boundary}`,
    `GRADE2_CONTROLLED_ADAPTIVE_PILOT=${
      report.adaptivePilotDisabled === "PASS"
        ? "DISABLED"
        : "NOT_RUN"
    }`,
    `GENERATED_RUNTIME_REMOTE=${
      report.generatedRuntimeRemoteOff === "PASS"
        ? "OFF"
        : "NOT_RUN"
    }`,
    `RLS_PRIVATE_SOLUTION_BOUNDARY=${report.rlsPrivateBoundary}`,
    `REMOTE_SCHEMA_PHASE=${report.remotePhase}`,
    `MIGRATION_0041_ELIGIBLE=${report.migration0041Eligible}`,
    ...(options?.includeTerminalFields === false
      ? []
      : [
          `CURRENT_RUN_MUTATION_PERFORMED=${report.currentRunMutationPerformed}`,
          `ROOT_FAILURE_CODE=${report.rootFailureCode}`,
          `PROJECT004_MIGRATION_0041_PREFLIGHT=${
            report.ok ? "PASS" : "FAIL"
          }`,
          "",
        ]),
  ].join("\n");
}

export function runMigration0041PreflightCommand(options?: {
  environment?: NodeJS.ProcessEnv;
  candidateRoot?: string;
  prompt?: SecurePrompt;
  execute?: typeof executeMigration0041RemotePreflight;
}) {
  const prompted = promptProject004UniversalRemoteEnvironment({
    environment: options?.environment,
    prompt: options?.prompt,
  });
  if (!prompted.ok) {
    const report = failedPreflight(prompted.code);
    return {
      exitCode: 1,
      report,
      output: renderMigration0041Preflight(report),
    };
  }
  try {
    try {
      const report = (
        options?.execute ??
        executeMigration0041RemotePreflight
      )({
        environment: prompted.environment,
        candidateRoot: options?.candidateRoot,
      });
      return {
        exitCode: report.ok ? 0 : 1,
        report,
        output: renderMigration0041Preflight(report),
      };
    } catch {
      const report = failedPreflight(
        "MIGRATION_0041_PREFLIGHT_FAILED",
      );
      return {
        exitCode: 1,
        report,
        output: renderMigration0041Preflight(report),
      };
    }
  } finally {
    prompted.clear();
  }
}

export function renderMigration0041PreflightQuerySmoke() {
  const queries = migration0041RemoteQueryStages.map((stage) =>
    buildMigration0041RemoteQuerySql({
      stage,
      migrationHistory:
        stage === "MIGRATION_HISTORY_READ"
          ? {
              tableExists: 1,
              versionColumnExists: 1,
              versionTextCompatible: 1,
              statementsTextArray: 1,
              statementsText: 0,
              nameColumnExists: 1,
              nameTextCompatible: 1,
              checksumColumnExists: 0,
              checksumTextCompatible: 0,
              checksumByteaCompatible: 0,
            }
          : undefined,
    }),
  );
  const invocation =
    buildProject004UniversalActivationPsqlInvocation(
      queries[0] ?? "",
    );
  const pass =
    queries.length === 12 &&
    queries.every(
      (query) =>
        /^\s*begin read only;/u.test(query) &&
        /\nrollback;\s*$/u.test(query),
    ) &&
    !(invocation.args as readonly string[]).includes(
      "--command",
    ) &&
    invocation.input === queries[0];
  return [
    `MIGRATION_0041_STAGED_QUERY_CONTRACT=${pass ? "PASS" : "FAIL"}`,
    `MIGRATION_0041_STDIN_TRANSPORT=${pass ? "PASS" : "FAIL"}`,
    `MIGRATION_0041_READ_ONLY_CONTRACT=${pass ? "PASS" : "FAIL"}`,
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
    process.stdout.write(
      renderMigration0041PreflightQuerySmoke(),
    );
  } else {
    const result = runMigration0041PreflightCommand();
    process.stdout.write(result.output);
    process.exitCode = result.exitCode;
  }
}
