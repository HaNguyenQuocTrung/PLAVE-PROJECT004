import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  assertProject004ContentSqlContract,
  inspectProject004ContentSqlContract,
  project004ExpectedContentCounts,
} from "./project004-content-sql-contract.ts";
import {
  classifyProject004ContentFailure,
  parseProject004ContentAggregateCounts,
  project004ContentAggregateCountsSql,
  project004ContentCountsPassed,
  project004ContentRollbackPassed,
  type Project004ContentAggregateCounts,
  type Project004ContentFailureEvidence,
} from "./project004-content-transaction-diagnostic.ts";
import {
  reserveDisposablePorts,
} from "./project004-disposable-port-reservation.ts";
import {
  DisposableProofInterruptedError,
  DisposableProofLifecycle,
  disposableProofStageTimeoutMs,
  installDisposableProofSignalHandlers,
} from "./project004-disposable-proof-lifecycle.ts";
import {
  assertDisposableMigrationWorkspaceSmokeMarker,
  prepareDisposableMigrationWorkspace,
} from "./project004-disposable-migration-workspace.ts";
import { readOnlyDockerEvidence } from "./project004-disposable-start-timing-diagnostic.ts";
import { buildProject004RemoteDevCurriculumSql } from "./project004-remote-dev-curriculum.ts";
import {
  executeProject004PostTransactionVerifier,
  project004PostApplyPayloadFieldCount,
  project004PostApplyPayloadSentinel,
  Project004PostApplyResponseError,
  Project004PostApplyValidationError,
} from "./project004-remote-dev-operations.ts";
import { Project004PostTransactionValidationError } from "./project004-post-transaction-validation.ts";
import { assertProject004Workspace } from "./project004-identity.ts";
import {
  classifyDisposableStartFailure,
  classifyDisposableStartTimeout,
  cleanLocalCommandEnvironment,
  runDisposablePsql,
  startDisposableStack,
  stopDisposableStack,
} from "./run-project004-clean-disposable-proof.ts";

type CheckState = "PASS" | "FAIL" | "NOT_RUN";

export type Project004DisposableContentDiagnosticReport = {
  sourceBuild: CheckState;
  sqlFilePreparation: "NOT_USED";
  sqlTransport: "STDIN_MEMORY";
  precondition: CheckState;
  psqlInvocation: CheckState;
  sqlExecution: CheckState;
  transactionCommit: CheckState;
  postTransactionVerification: CheckState;
  sqlExecutionStarted: "YES" | "NO" | "UNVERIFIED";
  sqlstate: string;
  errorCategory: string;
  failedStatementClass: string;
  validationId: string;
  validationObserved: string;
  validationExpected: string;
  releaseScopedCounts: string;
  legacyBaselineCounts: string;
  physicalTableCounts: string;
  queryExit: "PASS" | "FAIL" | "NOT_RUN";
  payloadSentinelCount: number | "NOT_RUN";
  payloadFieldCount: number | "NOT_RUN";
  payloadVersion: string;
  parserFailureCode: string;
  preconditionId: string;
  preconditionObserved: string;
  preconditionExpected: string;
  transactionRollback:
    | "PASS"
    | "FAIL"
    | "UNVERIFIED"
    | "NOT_REQUIRED";
  counts: Project004ContentAggregateCounts | null;
  cleanup: "PASS" | "FAIL" | "NOT_RUN";
  rootFailureCode: string;
};

function initialReport(): Project004DisposableContentDiagnosticReport {
  return {
    sourceBuild: "NOT_RUN",
    sqlFilePreparation: "NOT_USED",
    sqlTransport: "STDIN_MEMORY",
    precondition: "NOT_RUN",
    psqlInvocation: "NOT_RUN",
    sqlExecution: "NOT_RUN",
    transactionCommit: "NOT_RUN",
    postTransactionVerification: "NOT_RUN",
    sqlExecutionStarted: "NO",
    sqlstate: "NONE",
    errorCategory: "NONE",
    failedStatementClass: "NONE",
    validationId: "NOT_RUN",
    validationObserved: "NOT_RUN",
    validationExpected: "NOT_RUN",
    releaseScopedCounts: "NOT_RUN",
    legacyBaselineCounts: "NOT_RUN",
    physicalTableCounts: "NOT_RUN",
    queryExit: "NOT_RUN",
    payloadSentinelCount: "NOT_RUN",
    payloadFieldCount: "NOT_RUN",
    payloadVersion: "NOT_RUN",
    parserFailureCode: "NOT_RUN",
    preconditionId: "NOT_RUN",
    preconditionObserved: "NOT_RUN",
    preconditionExpected: "NOT_RUN",
    transactionRollback: "NOT_REQUIRED",
    counts: null,
    cleanup: "NOT_RUN",
    rootFailureCode: "DISPOSABLE_CONTENT_DIAGNOSTIC_NOT_RUN",
  };
}

function applyFailureEvidence(
  report: Project004DisposableContentDiagnosticReport,
  evidence: Project004ContentFailureEvidence,
) {
  report.sqlExecutionStarted = evidence.sqlExecutionStarted;
  report.sqlstate = evidence.sqlstate;
  report.errorCategory = evidence.errorCategory;
  report.failedStatementClass =
    evidence.failedStatementClass;
  report.preconditionId = evidence.preconditionId;
  report.preconditionObserved =
    evidence.preconditionObserved;
  report.preconditionExpected =
    evidence.preconditionExpected;
  report.psqlInvocation =
    evidence.stage === "PSQL_INVOCATION" ? "FAIL" : "PASS";
  report.precondition =
    evidence.stage === "CONTENT_PRECONDITION"
      ? "FAIL"
      : evidence.sqlExecutionStarted === "YES"
        ? "PASS"
        : "NOT_RUN";
  report.sqlExecution =
    evidence.stage === "SQL_EXECUTION"
      ? "FAIL"
      : evidence.sqlExecutionStarted === "YES"
        ? "PASS"
        : "NOT_RUN";
  report.transactionCommit =
    evidence.stage === "TRANSACTION_COMMIT"
      ? "FAIL"
      : "NOT_RUN";
  report.postTransactionVerification =
    evidence.stage === "POST_TRANSACTION_VERIFICATION"
      ? "FAIL"
      : "NOT_RUN";
}

async function observeContentCounts(
  ports: Parameters<typeof runDisposablePsql>[0],
  abortSignal: AbortSignal,
) {
  const observed = await runDisposablePsql(
    ports,
    project004ContentAggregateCountsSql,
    "POST_APPLY_DIAGNOSTIC",
    undefined,
    abortSignal,
    disposableProofStageTimeoutMs.POST_APPLY_DIAGNOSTIC,
    true,
  );
  if (!observed.ok || !observed.childExited) return null;
  try {
    return parseProject004ContentAggregateCounts(
      observed.stdout,
    );
  } catch {
    return null;
  }
}

export async function runProject004DisposableContentDiagnostic(): Promise<Project004DisposableContentDiagnosticReport> {
  const root = assertProject004Workspace();
  assertDisposableMigrationWorkspaceSmokeMarker(root);
  const report = initialReport();
  let content: ReturnType<
    typeof buildProject004RemoteDevCurriculumSql
  >;
  try {
    content = buildProject004RemoteDevCurriculumSql();
    assertProject004ContentSqlContract(content.sql);
    report.sourceBuild = "PASS";
  } catch {
    report.sourceBuild = "FAIL";
    report.errorCategory =
      "CANONICAL_CONTENT_SOURCE_OR_SQL_CONTRACT_INVALID";
    report.failedStatementClass = "SOURCE_BUILD";
    report.rootFailureCode =
      "DISPOSABLE_CONTENT_SOURCE_BUILD_FAILED";
    report.cleanup = "PASS";
    return report;
  }

  const lifecycle = new DisposableProofLifecycle();
  const signals =
    installDisposableProofSignalHandlers(lifecycle);
  const environment = cleanLocalCommandEnvironment();
  const projectId =
    `plave-project004-clean-proof-${randomBytes(6).toString("hex")}`;
  let reservation:
    | Awaited<ReturnType<typeof reserveDisposablePorts>>
    | undefined;
  let reservationReleased = false;
  let workdir = "";
  let childExited = true;
  try {
    const docker = await readOnlyDockerEvidence(
      root,
      environment,
      signals.signal,
    );
    if (
      docker.daemon !== "PASS" ||
      !docker.evidenceAvailable ||
      docker.resources.classification === "INSUFFICIENT"
    ) {
      report.errorCategory =
        "LOCAL_DISPOSABLE_RESOURCE_PRECONDITION_FAILED";
      report.rootFailureCode =
        "DISPOSABLE_CONTENT_DIAGNOSTIC_RESOURCE_FAILED";
      return report;
    }
    reservation = await reserveDisposablePorts();
    workdir = prepareDisposableMigrationWorkspace({
      candidateRoot: root,
      projectId,
      ports: reservation.ports,
    }).workdir;
    lifecycle.attachWorkdir(workdir);
    await reservation.release();
    reservationReleased = true;

    lifecycle.begin("SERVICE_BOOTSTRAP");
    const started = await startDisposableStack(
      workdir,
      lifecycle,
      signals.signal,
      docker.resources.classification,
    );
    childExited = started.childExited;
    if (!started.childExited) {
      lifecycle.finish("FAIL");
      report.errorCategory = "CHILD_EXIT_UNCONFIRMED";
      report.rootFailureCode =
        "DISPOSABLE_CHILD_EXIT_UNCONFIRMED";
      return report;
    }
    lifecycle.throwIfInterrupted();
    if (started.timedOut) {
      lifecycle.finish("TIMEOUT");
      report.errorCategory =
        classifyDisposableStartTimeout(started.progress);
      report.rootFailureCode =
        "DISPOSABLE_CONTENT_DIAGNOSTIC_STACK_TIMEOUT";
      return report;
    }
    if (
      !started.ok ||
      started.progress.migrationObservedCount !== 40 ||
      started.progress.migrationLastObservedVersion !== "0040"
    ) {
      lifecycle.finish("FAIL");
      report.errorCategory = started.ok
        ? "MIGRATION_PROGRESS_CONTRACT_INVALID"
        : classifyDisposableStartFailure(
            `${started.stdout}\n${started.stderr}`,
          );
      report.rootFailureCode =
        "DISPOSABLE_CONTENT_DIAGNOSTIC_STACK_FAILED";
      return report;
    }
    lifecycle.finish("PASS");

    lifecycle.begin("CONTENT_TRANSACTION");
    const applied = await runDisposablePsql(
      reservation.ports,
      content.sql,
      "CONTENT_TRANSACTION",
      lifecycle,
      signals.signal,
      disposableProofStageTimeoutMs.CONTENT_TRANSACTION,
    );
    childExited = applied.childExited;
    if (!applied.childExited) {
      lifecycle.finish("FAIL");
      report.psqlInvocation = "FAIL";
      report.errorCategory = "CHILD_EXIT_UNCONFIRMED";
      report.failedStatementClass = "PSQL_PROCESS";
      report.rootFailureCode =
        "DISPOSABLE_CHILD_EXIT_UNCONFIRMED";
      return report;
    }
    lifecycle.throwIfInterrupted();
    if (!applied.ok) {
      lifecycle.finish(applied.timedOut ? "TIMEOUT" : "FAIL");
      const evidence =
        classifyProject004ContentFailure(applied);
      applyFailureEvidence(report, evidence);
      report.counts = await observeContentCounts(
        reservation.ports,
        signals.signal,
      );
      report.transactionRollback =
        evidence.sqlExecutionStarted === "NO"
          ? "NOT_REQUIRED"
          : report.counts &&
              project004ContentRollbackPassed(report.counts)
            ? "PASS"
            : report.counts
              ? "FAIL"
              : "UNVERIFIED";
      report.rootFailureCode =
        applied.timedOut
          ? "DISPOSABLE_STAGE_TIMEOUT_CONTENT_TRANSACTION"
          : "DISPOSABLE_CONTENT_TRANSACTION_FAILED";
      return report;
    }
    lifecycle.finish("PASS");
    report.precondition = "PASS";
    report.psqlInvocation = "PASS";
    report.sqlExecution = "PASS";
    report.transactionCommit = "PASS";
    report.sqlExecutionStarted = "YES";

    lifecycle.begin("POST_APPLY_DIAGNOSTIC");
    try {
      const verification =
        await executeProject004PostTransactionVerifier(
          async ({ sql, machineOutput }) => {
            const result = await runDisposablePsql(
              reservation.ports,
              sql,
              "POST_APPLY_DIAGNOSTIC",
              lifecycle,
              signals.signal,
              disposableProofStageTimeoutMs.POST_APPLY_DIAGNOSTIC,
              machineOutput,
            );
            childExited = result.childExited;
            return result;
          },
        );
      const postApply = verification.counts;
      report.queryExit =
        verification.parserEvidence.queryExit;
      report.payloadSentinelCount =
        verification.parserEvidence.payloadSentinelCount;
      report.payloadFieldCount =
        verification.parserEvidence.payloadFieldCount;
      report.payloadVersion =
        verification.parserEvidence.payloadVersion;
      report.parserFailureCode =
        verification.parserEvidence.parserFailureCode;
      report.counts = {
        releases: postApply.releases,
        units: postApply.units,
        publicQuestions: postApply.publicQuestions,
        privateSolutions: postApply.privateSolutions,
        officialOutcomes: postApply.officialOutcomes,
      };
      report.releaseScopedCounts =
        `${String(postApply.units)}/` +
        `${String(postApply.publicQuestions)}/` +
        `${String(postApply.privateSolutions)}/` +
        `${String(postApply.officialOutcomes)}`;
      report.legacyBaselineCounts =
        `${String(postApply.legacyLearningUnits)}/` +
        `${String(postApply.legacyQuestions)}/` +
        `${String(postApply.legacySolutions)}/` +
        `${String(postApply.diagnosticBlueprintRows)}`;
      report.physicalTableCounts =
        `${String(postApply.physicalUnitRows)}/` +
        `${String(postApply.physicalQuestionRows)}/` +
        `${String(postApply.physicalSolutionRows)}`;
      if (!project004ContentCountsPassed(report.counts)) {
        throw new Error("CONTENT_COUNTS_MISMATCH");
      }
      report.postTransactionVerification = "PASS";
      report.validationId = "NONE";
      report.validationObserved = "MATCH";
      report.validationExpected = "MATCH";
      report.transactionRollback = "NOT_REQUIRED";
      report.rootFailureCode = "NONE";
      lifecycle.finish("PASS");
      return report;
    } catch (error) {
      lifecycle.finish(
        error instanceof Project004PostApplyResponseError &&
          error.queryTimedOut
          ? "TIMEOUT"
          : "FAIL",
      );
      report.postTransactionVerification = "FAIL";
      report.failedStatementClass =
        "POST_COMMIT_READ_ONLY_VERIFIER";
      if (
        error instanceof Project004PostApplyResponseError
      ) {
        report.queryExit = error.evidence.queryExit;
        report.payloadSentinelCount =
          error.evidence.payloadSentinelCount;
        report.payloadFieldCount =
          error.evidence.payloadFieldCount;
        report.payloadVersion =
          error.evidence.payloadVersion;
        report.parserFailureCode =
          error.evidence.parserFailureCode;
        report.errorCategory = error.queryTimedOut
          ? "POST_TRANSACTION_QUERY_TIMEOUT"
          : error.evidence.queryExit === "FAIL"
            ? "POST_TRANSACTION_QUERY_FAILED"
            : "POST_TRANSACTION_RESPONSE_INVALID";
        report.rootFailureCode =
          "DISPOSABLE_CONTENT_POST_VERIFICATION_FAILED";
        return report;
      }
      report.errorCategory =
        "POST_TRANSACTION_STATE_MISMATCH";
      if (
        error instanceof
        Project004PostTransactionValidationError
      ) {
        report.validationId = error.validationId;
        report.validationObserved = error.observed;
        report.validationExpected = error.expected;
        if (
          error instanceof
          Project004PostApplyValidationError
        ) {
          const postApply = error.counts;
          report.counts = {
            releases: postApply.releases,
            units: postApply.units,
            publicQuestions: postApply.publicQuestions,
            privateSolutions: postApply.privateSolutions,
            officialOutcomes: postApply.officialOutcomes,
          };
          report.releaseScopedCounts =
            `${String(postApply.units)}/` +
            `${String(postApply.publicQuestions)}/` +
            `${String(postApply.privateSolutions)}/` +
            `${String(postApply.officialOutcomes)}`;
          report.legacyBaselineCounts =
            `${String(postApply.legacyLearningUnits)}/` +
            `${String(postApply.legacyQuestions)}/` +
            `${String(postApply.legacySolutions)}/` +
            `${String(postApply.diagnosticBlueprintRows)}`;
          report.physicalTableCounts =
            `${String(postApply.physicalUnitRows)}/` +
            `${String(postApply.physicalQuestionRows)}/` +
            `${String(postApply.physicalSolutionRows)}`;
        }
      }
      report.rootFailureCode =
        "DISPOSABLE_CONTENT_POST_VERIFICATION_FAILED";
      return report;
    }
  } catch (error) {
    if (error instanceof DisposableProofInterruptedError) {
      report.errorCategory = `USER_INTERRUPT_${error.signal}`;
      report.rootFailureCode =
        `DISPOSABLE_CONTENT_DIAGNOSTIC_INTERRUPTED_${error.signal}`;
    } else {
      report.errorCategory =
        "CONTENT_DIAGNOSTIC_HARNESS_FAILED";
      report.rootFailureCode =
        "DISPOSABLE_CONTENT_DIAGNOSTIC_HARNESS_FAILED";
    }
    return report;
  } finally {
    if (reservation && !reservationReleased) {
      await reservation.release();
    }
    if (workdir && childExited) {
      lifecycle.begin("CLEANUP");
      const cleanup = await stopDisposableStack(
        workdir,
        projectId,
        lifecycle,
      );
      report.cleanup = cleanup.ok ? "PASS" : "FAIL";
      lifecycle.finish(
        cleanup.timedOut
          ? "TIMEOUT"
          : cleanup.ok
            ? "PASS"
            : "FAIL",
      );
      if (cleanup.ok) lifecycle.detachWorkdir();
      if (
        !cleanup.ok &&
        report.rootFailureCode === "NONE"
      ) {
        report.rootFailureCode =
          "DISPOSABLE_CONTENT_DIAGNOSTIC_CLEANUP_FAILED";
      }
    } else if (!workdir) {
      report.cleanup = "PASS";
    }
    signals.dispose();
  }
}

function renderCounts(
  counts: Project004ContentAggregateCounts | null,
) {
  return counts
    ? `${String(counts.units)}/${String(counts.publicQuestions)}/` +
        `${String(counts.privateSolutions)}/${String(counts.officialOutcomes)}`
    : "NOT_RUN";
}

export function renderProject004DisposableContentDiagnostic(
  report: Project004DisposableContentDiagnosticReport,
) {
  return [
    "PROJECT004_CANONICAL=PASS",
    `CONTENT_SOURCE_BUILD=${report.sourceBuild}`,
    `CONTENT_SQL_FILE_PREPARATION=${report.sqlFilePreparation}`,
    `CONTENT_SQL_TRANSPORT=${report.sqlTransport}`,
    `CONTENT_PRECONDITION=${report.precondition}`,
    `PSQL_INVOCATION=${report.psqlInvocation}`,
    `SQL_EXECUTION=${report.sqlExecution}`,
    `TRANSACTION_COMMIT=${report.transactionCommit}`,
    `POST_TRANSACTION_VERIFICATION=${report.postTransactionVerification}`,
    `CONTENT_SQL_EXECUTION_STARTED=${report.sqlExecutionStarted}`,
    `CONTENT_SQLSTATE=${report.sqlstate}`,
    `CONTENT_ERROR_CATEGORY=${report.errorCategory}`,
    `CONTENT_FAILED_STATEMENT_CLASS=${report.failedStatementClass}`,
    `VALIDATION_ID=${report.validationId}`,
    `VALIDATION_OBSERVED=${report.validationObserved}`,
    `VALIDATION_EXPECTED=${report.validationExpected}`,
    `RELEASE_SCOPED_COUNTS=${report.releaseScopedCounts}`,
    `LEGACY_BASELINE_COUNTS=${report.legacyBaselineCounts}`,
    `PHYSICAL_TABLE_COUNTS=${report.physicalTableCounts}`,
    `QUERY_EXIT=${report.queryExit}`,
    `PAYLOAD_SENTINEL_COUNT=${String(report.payloadSentinelCount)}`,
    `PAYLOAD_FIELD_COUNT=${String(report.payloadFieldCount)}`,
    `PAYLOAD_VERSION=${report.payloadVersion}`,
    `PARSER_FAILURE_CODE=${report.parserFailureCode}`,
    `PRECONDITION_ID=${report.preconditionId}`,
    `PRECONDITION_OBSERVED=${report.preconditionObserved}`,
    `PRECONDITION_EXPECTED=${report.preconditionExpected}`,
    `CONTENT_TRANSACTION_ROLLBACK=${report.transactionRollback}`,
    `CONTENT_COUNTS=${renderCounts(report.counts)}`,
    `EXPECTED_CONTENT_COUNTS=${String(project004ExpectedContentCounts.units)}/` +
      `${String(project004ExpectedContentCounts.publicQuestions)}/` +
      `${String(project004ExpectedContentCounts.privateSolutions)}/` +
      `${String(project004ExpectedContentCounts.officialOutcomes)}`,
    `DISPOSABLE_CLEANUP=${report.cleanup}`,
    "REMOTE_ACCESS_PERFORMED=NO",
    "REMOTE_MUTATION_PERFORMED=NO",
    "PROJECT003=FROZEN_UNTOUCHED",
    `ROOT_FAILURE_CODE=${report.rootFailureCode}`,
  ].join("\n") + "\n";
}

export function renderProject004ContentDiagnosticSmoke() {
  const built = buildProject004RemoteDevCurriculumSql();
  const contract = inspectProject004ContentSqlContract(
    built.sql,
  );
  const pass =
    contract.pass &&
    contract.releaseColumnCount === 12 &&
    contract.releaseValueCount === 12 &&
    built.counts.units === 171 &&
    built.counts.publicQuestions === 2052 &&
    built.counts.privateSolutions === 2052 &&
    built.counts.officialOutcomes === 546;
  return (
    `CONTENT_SQL_CONTRACT=${pass ? "PASS" : "FAIL"}\n` +
    "CONTENT_SQL_FILE_PREPARATION=NOT_USED\n" +
    "CONTENT_SQL_TRANSPORT=STDIN_MEMORY\n" +
    "DOCKER_EXECUTION_PERFORMED=NO\n" +
    "SUPABASE_EXECUTION_PERFORMED=NO\n" +
    "REMOTE_ACCESS_PERFORMED=NO\n" +
    "REMOTE_MUTATION_PERFORMED=NO\n"
  );
}

export async function renderProject004PostApplyParserSmoke() {
  const payload =
    `${project004PostApplyPayloadSentinel}|` +
    "40|40|0001|0040|1|1|1|0|171|2052|2052|546|0|" +
    "14|13|336|312|336|24|0|185|2388|2388|0|0|0|" +
    "1|1|0|0|0|0|0|0|23|18|1|1";
  let machineOutputObserved = false;
  const verified =
    await executeProject004PostTransactionVerifier(
      ({ sql, machineOutput }) => {
        machineOutputObserved =
          machineOutput &&
          sql.includes(project004PostApplyPayloadSentinel);
        return {
          ok: true,
          childExited: true,
          stdout:
            "NOTICE: sanitized verifier progress\n" +
            `${payload}\n` +
            "(1 row)\n",
        };
      },
    );
  const pass =
    machineOutputObserved &&
    verified.parserEvidence.parserFailureCode === "NONE" &&
    verified.parserEvidence.payloadSentinelCount === 1 &&
    verified.parserEvidence.payloadFieldCount ===
      project004PostApplyPayloadFieldCount &&
    verified.counts.units === 171 &&
    verified.counts.publicQuestions === 2052 &&
    verified.counts.privateSolutions === 2052 &&
    verified.counts.officialOutcomes === 546;
  if (!pass) {
    throw new Error("POST_APPLY_PARSER_SMOKE_FAILED");
  }
  return (
    "POST_APPLY_CANONICAL_EXECUTOR=PASS\n" +
    "POST_APPLY_MACHINE_OUTPUT=PASS\n" +
    "POST_APPLY_SENTINEL_VERSION=V1\n" +
    "DOCKER_EXECUTION_PERFORMED=NO\n" +
    "SUPABASE_EXECUTION_PERFORMED=NO\n" +
    "REMOTE_ACCESS_PERFORMED=NO\n" +
    "REMOTE_MUTATION_PERFORMED=NO\n"
  );
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  if (process.argv.includes("--post-apply-parser-smoke")) {
    try {
      process.stdout.write(
        await renderProject004PostApplyParserSmoke(),
      );
    } catch {
      process.stdout.write(
        "POST_APPLY_CANONICAL_EXECUTOR=FAIL\n" +
          "POST_APPLY_MACHINE_OUTPUT=FAIL\n" +
          "POST_APPLY_SENTINEL_VERSION=UNKNOWN\n" +
          "DOCKER_EXECUTION_PERFORMED=NO\n" +
          "SUPABASE_EXECUTION_PERFORMED=NO\n" +
          "REMOTE_ACCESS_PERFORMED=NO\n" +
          "REMOTE_MUTATION_PERFORMED=NO\n",
      );
      process.exitCode = 1;
    }
  } else if (process.argv.includes("--smoke")) {
    try {
      process.stdout.write(
        renderProject004ContentDiagnosticSmoke(),
      );
    } catch {
      process.stdout.write(
        "CONTENT_SQL_CONTRACT=FAIL\n" +
          "CONTENT_SQL_FILE_PREPARATION=NOT_USED\n" +
          "CONTENT_SQL_TRANSPORT=STDIN_MEMORY\n" +
          "DOCKER_EXECUTION_PERFORMED=NO\n" +
          "SUPABASE_EXECUTION_PERFORMED=NO\n" +
          "REMOTE_ACCESS_PERFORMED=NO\n" +
          "REMOTE_MUTATION_PERFORMED=NO\n",
      );
      process.exitCode = 1;
    }
  } else {
    const report =
      await runProject004DisposableContentDiagnostic();
    process.stdout.write(
      renderProject004DisposableContentDiagnostic(report),
    );
    if (
      report.rootFailureCode !== "NONE" ||
      report.cleanup !== "PASS"
    ) {
      process.exitCode = 1;
    }
  }
}
