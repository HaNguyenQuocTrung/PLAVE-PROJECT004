import { randomBytes } from "node:crypto";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildCleanDisposableProofFingerprint,
  cleanDisposableOrdering,
  cleanDisposablePostgresImage,
  cleanDisposableProofVersion,
  type CleanDisposableProofManifest,
} from "./project004-clean-disposable-proof.ts";
import {
  reserveDisposablePorts,
  type DisposablePorts,
} from "./project004-disposable-port-reservation.ts";
import {
  DisposableProofInterruptedError,
  DisposableProofLifecycle,
  type DisposableProofStage,
  disposableProofStageTimeoutMs,
  installDisposableProofSignalHandlers,
} from "./project004-disposable-proof-lifecycle.ts";
import {
  runManagedChild,
  type ManagedChildDeadlineUpdate,
  type ManagedChildOutputEvent,
  type ManagedChildResult,
} from "./project004-managed-child-process.ts";
import {
  DisposableSupabaseStartProgressTracker,
  deadlineProfileForResources,
  renderDisposableStartProgress,
  type DisposableStartProgressSnapshot,
} from "./project004-supabase-start-progress.ts";
import type { DisposableResourceClassification } from "./project004-disposable-resource-classifier.ts";
import {
  assertDisposableMigrationWorkspaceSmokeMarker,
  prepareDisposableMigrationWorkspace,
} from "./project004-disposable-migration-workspace.ts";
import {
  buildProject004PrefixSemanticCategorySql,
  buildProject004PrefixSemanticFingerprintSql,
  parsePrefixSemanticFingerprint,
  prefixSemanticCategories,
  type PrefixSemanticCategory,
} from "./project004-prefix-semantic-fingerprint.ts";
import { buildProject004RemoteDevCurriculumSql } from "./project004-remote-dev-curriculum.ts";
import {
  classifyProject004ContentFailure,
  parseProject004ContentAggregateCounts,
  project004ContentAggregateCountsSql,
  project004ContentRollbackPassed,
  type Project004ContentFailureStage,
  type Project004ContentStatementClass,
} from "./project004-content-transaction-diagnostic.ts";
import {
  buildMigrationPlanFingerprint,
  loadAndVerifyMigrationPlan,
  normalizeCanonicalMigrationVersion,
  project004RemoteDevContract,
} from "./project004-remote-dev-guard.ts";
import {
  executeProject004PostTransactionVerifier,
  Project004PostApplyResponseError,
  Project004PostApplyValidationError,
  type RemotePostApplyCounts,
} from "./project004-remote-dev-operations.ts";
import { Project004PostTransactionValidationError } from "./project004-post-transaction-validation.ts";
import { assertProject004Workspace } from "./project004-identity.ts";

type ProofFailure = Error & {
  code?: string;
  cleanup?: "PASS" | "FAIL" | "NOT_STARTED";
  expectedBoundary?: string;
  actualBoundary?: string;
  failedBoundarySubconditions?: string[];
  semanticStage?: string;
  semanticComponent?: string;
  semanticSqlstate?: string;
  semanticFailureCategory?: string;
  migrationObservedCount?: number;
  migrationLastObservedVersion?: string;
  contentFailureStage?: Project004ContentFailureStage;
  contentSqlstate?: string;
  contentErrorCategory?: string;
  contentFailedStatementClass?: Project004ContentStatementClass;
  contentSqlExecutionStarted?:
    | "YES"
    | "NO"
    | "UNVERIFIED";
  contentTransactionRollback?:
    | "PASS"
    | "FAIL"
    | "UNVERIFIED"
    | "NOT_REQUIRED";
  contentPreconditionId?: string;
  contentPreconditionObserved?: string;
  contentPreconditionExpected?: string;
  contentValidationId?: string;
  contentValidationObserved?: string;
  contentValidationExpected?: string;
  releaseScopedCounts?: string;
  legacyBaselineCounts?: string;
  physicalTableCounts?: string;
  postApplyQueryExit?: "PASS" | "FAIL";
  postApplyPayloadSentinelCount?: number;
  postApplyPayloadFieldCount?: number;
  postApplyPayloadVersion?: string;
  postApplyParserFailureCode?: string;
};

function assertManagedChildExited(
  result: ManagedChildResult,
) {
  if (!result.childExited) {
    proofFailure("DISPOSABLE_CHILD_EXIT_UNCONFIRMED");
  }
}

export function canStartDisposableProofCleanup(
  workdir: string,
  operationError: unknown,
) {
  if (!workdir) return false;
  return (
    (operationError as ProofFailure | null)?.code !==
    "DISPOSABLE_CHILD_EXIT_UNCONFIRMED"
  );
}

function proofFailure(
  code: string,
  detail?: {
    expectedBoundary?: string;
    actualBoundary?: string;
    failedBoundarySubconditions?: string[];
    semanticStage?: string;
    semanticComponent?: string;
    semanticSqlstate?: string;
    semanticFailureCategory?: string;
    migrationObservedCount?: number;
    migrationLastObservedVersion?: string;
    contentFailureStage?: Project004ContentFailureStage;
    contentSqlstate?: string;
    contentErrorCategory?: string;
    contentFailedStatementClass?: Project004ContentStatementClass;
    contentSqlExecutionStarted?:
      | "YES"
      | "NO"
      | "UNVERIFIED";
    contentTransactionRollback?:
      | "PASS"
      | "FAIL"
      | "UNVERIFIED"
      | "NOT_REQUIRED";
    contentPreconditionId?: string;
    contentPreconditionObserved?: string;
    contentPreconditionExpected?: string;
    contentValidationId?: string;
    contentValidationObserved?: string;
    contentValidationExpected?: string;
    releaseScopedCounts?: string;
    legacyBaselineCounts?: string;
    physicalTableCounts?: string;
    postApplyQueryExit?: "PASS" | "FAIL";
    postApplyPayloadSentinelCount?: number;
    postApplyPayloadFieldCount?: number;
    postApplyPayloadVersion?: string;
    postApplyParserFailureCode?: string;
  },
): never {
  const error = new Error(code) as ProofFailure;
  error.code = code;
  error.expectedBoundary = detail?.expectedBoundary;
  error.actualBoundary = detail?.actualBoundary;
  error.failedBoundarySubconditions =
    detail?.failedBoundarySubconditions;
  error.semanticStage = detail?.semanticStage;
  error.semanticComponent = detail?.semanticComponent;
  error.semanticSqlstate = detail?.semanticSqlstate;
  error.semanticFailureCategory =
    detail?.semanticFailureCategory;
  error.migrationObservedCount =
    detail?.migrationObservedCount;
  error.migrationLastObservedVersion =
    detail?.migrationLastObservedVersion;
  error.contentFailureStage = detail?.contentFailureStage;
  error.contentSqlstate = detail?.contentSqlstate;
  error.contentErrorCategory =
    detail?.contentErrorCategory;
  error.contentFailedStatementClass =
    detail?.contentFailedStatementClass;
  error.contentSqlExecutionStarted =
    detail?.contentSqlExecutionStarted;
  error.contentTransactionRollback =
    detail?.contentTransactionRollback;
  error.contentPreconditionId =
    detail?.contentPreconditionId;
  error.contentPreconditionObserved =
    detail?.contentPreconditionObserved;
  error.contentPreconditionExpected =
    detail?.contentPreconditionExpected;
  error.contentValidationId =
    detail?.contentValidationId;
  error.contentValidationObserved =
    detail?.contentValidationObserved;
  error.contentValidationExpected =
    detail?.contentValidationExpected;
  error.releaseScopedCounts =
    detail?.releaseScopedCounts;
  error.legacyBaselineCounts =
    detail?.legacyBaselineCounts;
  error.physicalTableCounts =
    detail?.physicalTableCounts;
  error.postApplyQueryExit =
    detail?.postApplyQueryExit;
  error.postApplyPayloadSentinelCount =
    detail?.postApplyPayloadSentinelCount;
  error.postApplyPayloadFieldCount =
    detail?.postApplyPayloadFieldCount;
  error.postApplyPayloadVersion =
    detail?.postApplyPayloadVersion;
  error.postApplyParserFailureCode =
    detail?.postApplyParserFailureCode;
  throw error;
}

function disposableInterruptFailure(
  signal: "SIGINT" | "SIGTERM",
) {
  const interrupted = new Error(
    `DISPOSABLE_PROOF_INTERRUPTED_${signal}`,
  ) as ProofFailure;
  interrupted.code =
    `DISPOSABLE_PROOF_INTERRUPTED_${signal}`;
  return interrupted;
}

export function cleanLocalCommandEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const child = { ...environment };
  for (const key of [
    "DATABASE_URL",
    "PLAVE_LOCAL_DATABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ACCESS_TOKEN",
    "PLAVE_PROJECT004_REMOTE_TARGET_NAME",
    "PLAVE_PROJECT004_REMOTE_PROJECT_REF",
    "PLAVE_PROJECT004_REMOTE_DB_PASSWORD",
    "PLAVE_PROJECT004_REMOTE_ENVIRONMENT_CLASS",
    "PLAVE_PROJECT004_REMOTE_OWNER_APPROVAL",
    "PGHOST",
    "PGPORT",
    "PGUSER",
    "PGPASSWORD",
    "PGDATABASE",
  ]) {
    delete child[key];
  }
  child.SUPABASE_TELEMETRY_DISABLED = "true";
  return child;
}

function managedCommand(
  executable: string,
  args: string[],
  options: {
    cwd?: string;
    environment?: NodeJS.ProcessEnv;
    input?: string;
    timeout: number;
    stage: string;
    lifecycle?: DisposableProofLifecycle;
    abortSignal?: AbortSignal;
    onOutput?: (
      event: ManagedChildOutputEvent,
    ) => ManagedChildDeadlineUpdate | undefined;
    onHeartbeat?: (elapsedMs: number) => void;
  },
): Promise<ManagedChildResult> {
  return runManagedChild({
    executable,
    args,
    cwd: options?.cwd ?? assertProject004Workspace(),
    environment:
      options?.environment ??
      cleanLocalCommandEnvironment(),
    input: options?.input,
    timeoutMs: options.timeout,
    terminationGraceMs: 5_000,
    killConfirmationMs: 5_000,
    heartbeatMs: 30_000,
    abortSignal: options.abortSignal,
    stage: options.stage,
    onHeartbeat: ({ stage, elapsedMs }) => {
      if (options.onHeartbeat) {
        options.onHeartbeat(elapsedMs);
      } else {
        options.lifecycle?.heartbeat(
          stage,
          elapsedMs,
        );
      }
    },
    onOutput: options.onOutput,
  });
}

function psqlEnvironment(ports: DisposablePorts) {
  return {
    ...cleanLocalCommandEnvironment(),
    PGHOST: "127.0.0.1",
    PGPORT: String(ports.database),
    PGUSER: "postgres",
    PGPASSWORD: "postgres",
    PGDATABASE: "postgres",
    PGSSLMODE: "disable",
    PGCONNECT_TIMEOUT: "5",
  };
}

export function runDisposablePsql(
  ports: DisposablePorts,
  sql: string,
  stage: DisposableProofStage,
  lifecycle: DisposableProofLifecycle | undefined,
  abortSignal: AbortSignal | undefined,
  timeout = 120_000,
  machineOutput = false,
  psqlArgs?: readonly string[],
) {
  return managedCommand(
    "/opt/homebrew/bin/psql",
    psqlArgs
      ? [...psqlArgs]
      : [
          "--no-psqlrc",
          "--quiet",
          ...(machineOutput
            ? ["--tuples-only", "--no-align"]
            : []),
          "--set",
          "ON_ERROR_STOP=1",
          "--set",
          "VERBOSITY=verbose",
        ],
    {
      environment: psqlEnvironment(ports),
      input: sql,
      timeout,
      stage,
      lifecycle,
      abortSignal,
    },
  );
}

const migrationBoundarySql = String.raw`
begin read only;
select concat_ws(
  '|',
  count(*),
  coalesce(min(version), 'NONE'),
  coalesce(max(version), 'NONE'),
  count(*) filter (
    where version ~ '^(000[1-9]|00[12][0-9]|003[0-9]|0040)$'
  )
)
from supabase_migrations.schema_migrations;
commit;
`;

export type RuntimeMigrationBoundarySubcondition =
  | "RUNTIME_HISTORY_QUERY_SUCCEEDED"
  | "RUNTIME_HISTORY_PAYLOAD_ROW_UNIQUE"
  | "RUNTIME_HISTORY_TOTAL_COUNT_VALID"
  | "RUNTIME_HISTORY_CANONICAL_COUNT_VALID"
  | "RUNTIME_HISTORY_CANONICAL_COUNT_MATCHES_TOTAL"
  | "RUNTIME_HISTORY_COUNT_MATCHES_EXPECTED"
  | "RUNTIME_HISTORY_FIRST_VERSION_MATCHES_EXPECTED"
  | "RUNTIME_HISTORY_LAST_VERSION_MATCHES_EXPECTED";

export const runtimeMigrationBoundarySubconditions:
  RuntimeMigrationBoundarySubcondition[] = [
    "RUNTIME_HISTORY_QUERY_SUCCEEDED",
    "RUNTIME_HISTORY_PAYLOAD_ROW_UNIQUE",
    "RUNTIME_HISTORY_TOTAL_COUNT_VALID",
    "RUNTIME_HISTORY_CANONICAL_COUNT_VALID",
    "RUNTIME_HISTORY_CANONICAL_COUNT_MATCHES_TOTAL",
    "RUNTIME_HISTORY_COUNT_MATCHES_EXPECTED",
    "RUNTIME_HISTORY_FIRST_VERSION_MATCHES_EXPECTED",
    "RUNTIME_HISTORY_LAST_VERSION_MATCHES_EXPECTED",
  ];

export type RuntimeMigrationBoundaryEvaluation = {
  pass: boolean;
  count: number | null;
  first: string;
  last: string;
  canonicalCount: number | null;
  expectedBoundary: string;
  actualBoundary: string;
  failedSubconditions: RuntimeMigrationBoundarySubcondition[];
};

export function parseRuntimeMigrationBoundaryOutput(
  output: string,
  querySucceeded = true,
): RuntimeMigrationBoundaryEvaluation {
  const payloadRows = output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => {
      const fields = line.split("|");
      return (
        fields.length === 4 &&
        /^[0-9]+$/u.test(fields[0] ?? "") &&
        /^[0-9]+$/u.test(fields[3] ?? "")
      );
    });
  const fields =
    payloadRows.length === 1
      ? (payloadRows[0]?.split("|") ?? [])
      : [];
  const parsedCount = Number(fields[0]);
  const parsedCanonicalCount = Number(fields[3]);
  const count =
    Number.isSafeInteger(parsedCount) && parsedCount >= 0
      ? parsedCount
      : null;
  const canonicalCount =
    Number.isSafeInteger(parsedCanonicalCount) &&
    parsedCanonicalCount >= 0
      ? parsedCanonicalCount
      : null;
  const first =
    normalizeCanonicalMigrationVersion(fields[1] ?? "") ??
    "INVALID";
  const last =
    normalizeCanonicalMigrationVersion(fields[2] ?? "") ??
    "INVALID";
  const checks: Record<
    RuntimeMigrationBoundarySubcondition,
    boolean
  > = {
    RUNTIME_HISTORY_QUERY_SUCCEEDED: querySucceeded,
    RUNTIME_HISTORY_PAYLOAD_ROW_UNIQUE:
      payloadRows.length === 1,
    RUNTIME_HISTORY_TOTAL_COUNT_VALID: count !== null,
    RUNTIME_HISTORY_CANONICAL_COUNT_VALID:
      canonicalCount !== null,
    RUNTIME_HISTORY_CANONICAL_COUNT_MATCHES_TOTAL:
      count !== null &&
      canonicalCount !== null &&
      canonicalCount === count,
    RUNTIME_HISTORY_COUNT_MATCHES_EXPECTED:
      count === project004RemoteDevContract.migrationCount,
    RUNTIME_HISTORY_FIRST_VERSION_MATCHES_EXPECTED:
      first === project004RemoteDevContract.migrationFirst,
    RUNTIME_HISTORY_LAST_VERSION_MATCHES_EXPECTED:
      last === project004RemoteDevContract.migrationLast,
  };
  const failedSubconditions =
    runtimeMigrationBoundarySubconditions.filter(
      (name) => !checks[name],
    );
  return {
    pass: failedSubconditions.length === 0,
    count,
    first,
    last,
    canonicalCount,
    expectedBoundary:
      `${String(project004RemoteDevContract.migrationCount)}/` +
      `${project004RemoteDevContract.migrationFirst}/` +
      project004RemoteDevContract.migrationLast,
    actualBoundary:
      `${count === null ? "INVALID" : String(count)}/` +
      `${first}/${last}`,
    failedSubconditions,
  };
}

async function migrationBoundary(
  ports: DisposablePorts,
  lifecycle?: DisposableProofLifecycle,
  abortSignal?: AbortSignal,
) {
  const result = await runDisposablePsql(
    ports,
    migrationBoundarySql,
    "RUNTIME_HISTORY_QUERY",
    lifecycle,
    abortSignal,
    disposableProofStageTimeoutMs.RUNTIME_HISTORY_QUERY,
  );
  assertManagedChildExited(result);
  return {
    ...parseRuntimeMigrationBoundaryOutput(
      result.stdout,
      result.ok,
    ),
    timedOut: result.timedOut,
  };
}

export type SemanticFingerprintFailureEvidence = {
  stage: "QUERY";
  component:
    | PrefixSemanticCategory
    | "SHARED_CATALOG"
    | "AGGREGATION"
    | "UNKNOWN";
  sqlstate: string;
  category:
    | "QUERY_TIMEOUT"
    | "QUERY_SYNTAX"
    | "CATALOG_COLUMN_UNAVAILABLE"
    | "CATALOG_FUNCTION_UNAVAILABLE"
    | "CATALOG_RELATION_UNAVAILABLE"
    | "QUERY_PERMISSION_DENIED"
    | "QUERY_EXECUTION_FAILED";
};

export function classifySemanticFingerprintQueryFailure(
  output: string,
  component:
    SemanticFingerprintFailureEvidence["component"] =
      "UNKNOWN",
): SemanticFingerprintFailureEvidence {
  const sqlstate =
    /(?:SQLSTATE\s+|sqlstate[=:]\s*|ERROR:\s+)([0-9A-Z]{5})(?::|\b)/iu.exec(
      output,
    )?.[1]?.toUpperCase() ?? "UNKNOWN";
  let category:
    SemanticFingerprintFailureEvidence["category"] =
      "QUERY_EXECUTION_FAILED";
  if (
    sqlstate === "57014" ||
    /statement timeout|canceling statement/iu.test(output)
  ) {
    category = "QUERY_TIMEOUT";
  } else if (sqlstate === "42601") {
    category = "QUERY_SYNTAX";
  } else if (sqlstate === "42703") {
    category = "CATALOG_COLUMN_UNAVAILABLE";
  } else if (sqlstate === "42883") {
    category = "CATALOG_FUNCTION_UNAVAILABLE";
  } else if (sqlstate === "42P01") {
    category = "CATALOG_RELATION_UNAVAILABLE";
  } else if (sqlstate === "42501") {
    category = "QUERY_PERMISSION_DENIED";
  }
  return {
    stage: "QUERY",
    component,
    sqlstate,
    category,
  };
}

export async function stopDisposableStack(
  workdir: string,
  projectId: string,
  lifecycle?: DisposableProofLifecycle,
) {
  assertDisposableCleanupScope(workdir, projectId);
  const stopped = await managedCommand(
    "/opt/homebrew/bin/supabase",
    [
      "stop",
      "--workdir",
      workdir,
      "--project-id",
      projectId,
      "--no-backup",
      "--yes",
    ],
    {
      timeout: disposableProofStageTimeoutMs.CLEANUP,
      stage: "CLEANUP",
      lifecycle,
    },
  );
  if (stopped.ok && stopped.childExited) {
    rmSync(workdir, { recursive: true, force: true });
  }
  return {
    ok: stopped.ok && stopped.childExited,
    timedOut: stopped.timedOut,
    childExited: stopped.childExited,
  };
}

export function assertDisposableCleanupScope(
  workdir: string,
  projectId: string,
) {
  const normalizedWorkdir = resolve(workdir);
  const disposableRootPrefix = resolve(
    tmpdir(),
    "plave-project004-clean-proof-",
  );
  if (
    !/^plave-project004-clean-proof-[0-9a-f]{11,12}$/u.test(
      projectId,
    ) ||
    !normalizedWorkdir.startsWith(disposableRootPrefix) ||
    normalizedWorkdir === assertProject004Workspace() ||
    normalizedWorkdir === resolve(tmpdir())
  ) {
    proofFailure("DISPOSABLE_CLEANUP_SCOPE_REJECTED");
  }
}

async function imageId(
  lifecycle: DisposableProofLifecycle,
  abortSignal: AbortSignal,
) {
  const inspected = await managedCommand(
    "docker",
    [
      "image",
      "inspect",
      "--format",
      "{{.Id}}",
      cleanDisposablePostgresImage,
    ],
    {
      timeout: 30_000,
      stage: "POST_APPLY_DIAGNOSTIC",
      lifecycle,
      abortSignal,
    },
  );
  assertManagedChildExited(inspected);
  const value = inspected.stdout.trim().replace(/^sha256:/u, "");
  if (!inspected.ok || !/^[0-9a-f]{64}$/u.test(value)) {
    proofFailure("DISPOSABLE_POSTGRES_IMAGE_UNAVAILABLE");
  }
  return value;
}

export function classifyDisposableStartFailure(
  rawOutput: string,
) {
  const output = rawOutput
    .replace(
      /(?:postgres(?:ql)?|https?):\/\/[^\s]+/giu,
      "[REDACTED_ENDPOINT]",
    )
    .replace(
      /\beyJ[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+[.][A-Za-z0-9_-]+\b/gu,
      "[REDACTED_TOKEN]",
    );
  const state =
    /(?:SQLSTATE\s+|sqlstate[=:]\s*)([0-9A-Z]{5})/iu.exec(
      output,
    )?.[1] ?? "UNKNOWN";
  let category = "UNRECOGNIZED";
  if (/role\s+["'][^"']+["']\s+does not exist/iu.test(output)) {
    category = "BASELINE_ROLE_MISSING";
  } else if (
    /relation\s+["'][^"']+["']\s+does not exist/iu.test(output)
  ) {
    category = "BASELINE_RELATION_MISSING";
  } else if (
    /function\s+[^ \n(]+(?:[(][^)]*[)])?\s+does not exist/iu.test(
      output,
    )
  ) {
    category = "BASELINE_FUNCTION_MISSING";
  } else if (/permission denied|must be owner/iu.test(output)) {
    category = "BASELINE_PERMISSION_MISMATCH";
  } else if (
    /invalid migration|migration filename|duplicate migration/iu.test(
      output,
    )
  ) {
    category = "MIGRATION_METADATA_INVALID";
  } else if (
    /address already in use|port is already allocated|bind:/iu.test(
      output,
    )
  ) {
    category = "DISPOSABLE_PORT_UNAVAILABLE";
  } else if (
    /failed to start docker container|container is not ready|health check/iu.test(
      output,
    )
  ) {
    category = "LOCAL_SERVICE_START_FAILED";
  } else if (
    /failed to connect|connection refused|connection reset/iu.test(
      output,
    )
  ) {
    category = "DISPOSABLE_DATABASE_CONNECTION_FAILED";
  }
  return `DISPOSABLE_START_${category}_SQLSTATE_${state}`;
}

export async function startDisposableStack(
  workdir: string,
  lifecycle?: DisposableProofLifecycle,
  abortSignal?: AbortSignal,
  resourceClassification: Exclude<
    DisposableResourceClassification,
    "INSUFFICIENT"
  > = "ADEQUATE",
) {
  const deadlines = deadlineProfileForResources(
    resourceClassification,
  );
  const progress =
    new DisposableSupabaseStartProgressTracker(deadlines);
  const applyProgressUpdate = (
    before: DisposableStartProgressSnapshot,
    update: ReturnType<
      DisposableSupabaseStartProgressTracker["consume"]
    >,
  ) => {
    if (
      lifecycle &&
      !before.migrationPhaseStarted &&
      update.snapshot.migrationPhaseStarted
    ) {
      lifecycle.finish("PASS");
      lifecycle.begin("MIGRATION_EXECUTION");
    }
    if (
      lifecycle &&
      !before.postMigrationWaitStarted &&
      update.snapshot.postMigrationWaitStarted
    ) {
      lifecycle.finish("PASS");
      lifecycle.begin("POST_MIGRATION_WAIT");
    }
    for (const marker of update.markers) {
      process.stdout.write(`${marker}\n`);
    }
  };
  process.stdout.write(
    "SERVICE_BOOTSTRAP_STARTED=PASS\n",
  );
  const result = await managedCommand(
    "/opt/homebrew/bin/supabase",
    [
      "start",
      "--workdir",
      workdir,
      "--exclude",
      [
        "realtime",
        "imgproxy",
        "mailpit",
        "postgres-meta",
        "studio",
        "edge-runtime",
        "logflare",
        "vector",
        "supavisor",
      ].join(","),
      "--yes",
    ],
    {
      timeout: deadlines.SERVICE_BOOTSTRAP,
      stage: "SERVICE_BOOTSTRAP",
      lifecycle,
      abortSignal,
      onOutput: (event) => {
        const before = progress.snapshot();
        const update = progress.consume(event);
        applyProgressUpdate(before, update);
        return update.deadline;
      },
      onHeartbeat: () => {
        if (!lifecycle) return;
        lifecycle.heartbeat(
          progress.snapshot().currentPhase,
          lifecycle.currentStageElapsedMs(),
        );
      },
    },
  );
  const beforeFlush = progress.snapshot();
  applyProgressUpdate(
    beforeFlush,
    progress.flush(result.executionElapsedMs),
  );
  const beforeSuccessfulExit = progress.snapshot();
  applyProgressUpdate(
    beforeSuccessfulExit,
    progress.observeSuccessfulChildExit({
      childOk: result.ok,
      childExited: result.childExited,
      elapsedMs: result.executionElapsedMs,
    }),
  );
  const snapshot = progress.snapshot();
  process.stdout.write(
    `${renderDisposableStartProgress(snapshot)}\n`,
  );
  return {
    ...result,
    progress: snapshot,
    phaseTiming: progress.timing(
      result.executionElapsedMs,
    ),
  };
}

export function classifyDisposableStartTimeout(
  progress: DisposableStartProgressSnapshot,
) {
  if (progress.postMigrationWaitStarted) {
    return "DISPOSABLE_STAGE_TIMEOUT_POST_MIGRATION_WAIT";
  }
  if (progress.migrationPhaseStarted) {
    return "DISPOSABLE_STAGE_TIMEOUT_MIGRATION_EXECUTION";
  }
  return "DISPOSABLE_STAGE_TIMEOUT_SERVICE_BOOTSTRAP";
}

async function executeDisposableProof(
  root: string,
  workdir: string,
  projectId: string,
  ports: DisposablePorts,
  lifecycle: DisposableProofLifecycle,
  abortSignal: AbortSignal,
) {
  const { plan } = loadAndVerifyMigrationPlan(root);
  let content: ReturnType<
    typeof buildProject004RemoteDevCurriculumSql
  >;
  try {
    content = buildProject004RemoteDevCurriculumSql();
  } catch {
    proofFailure("DISPOSABLE_CONTENT_SOURCE_BUILD_FAILED", {
      contentFailureStage: "CONTENT_SOURCE_BUILD",
      contentSqlstate: "NONE",
      contentErrorCategory:
        "CANONICAL_CONTENT_SOURCE_OR_SQL_CONTRACT_INVALID",
      contentFailedStatementClass: "SOURCE_BUILD",
      contentSqlExecutionStarted: "NO",
      contentTransactionRollback: "NOT_REQUIRED",
    });
  }
  lifecycle.begin("SERVICE_BOOTSTRAP");
  const started = await startDisposableStack(
    workdir,
    lifecycle,
    abortSignal,
  );
  if (!started.childExited) {
    lifecycle.finish("FAIL");
    proofFailure("DISPOSABLE_CHILD_EXIT_UNCONFIRMED");
  }
  lifecycle.throwIfInterrupted();
  if (started.timedOut) {
    lifecycle.finish("TIMEOUT");
    proofFailure(
      classifyDisposableStartTimeout(started.progress),
      {
        migrationObservedCount:
          started.progress.migrationObservedCount,
        migrationLastObservedVersion:
          started.progress.migrationLastObservedVersion,
      },
    );
  }
  if (!started.ok) {
    lifecycle.finish("FAIL");
    proofFailure(
      classifyDisposableStartFailure(
        `${started.stdout}\n${started.stderr}`,
      ),
    );
  }
  if (
    !started.progress.serviceBootstrapPass ||
    !started.progress.migrationPhaseStarted ||
    started.progress.migrationObservedCount !== 40 ||
    started.progress.migrationLastObservedVersion !== "0040" ||
    !started.progress.postMigrationWaitStarted
  ) {
    lifecycle.finish("FAIL");
    proofFailure(
      "DISPOSABLE_START_PROGRESS_UNRECOGNIZED",
    );
  }
  lifecycle.finish("PASS");

  lifecycle.begin("RUNTIME_HISTORY_QUERY");
  const boundary = await migrationBoundary(
    ports,
    lifecycle,
    abortSignal,
  );
  lifecycle.throwIfInterrupted();
  if (boundary.timedOut) {
    lifecycle.finish("TIMEOUT");
    proofFailure(
      "DISPOSABLE_STAGE_TIMEOUT_RUNTIME_HISTORY_QUERY",
    );
  }
  if (!boundary.pass) {
    lifecycle.finish("FAIL");
    proofFailure(
      "DISPOSABLE_RUNTIME_MIGRATION_HISTORY_BOUNDARY_INVALID",
      {
        expectedBoundary: boundary.expectedBoundary,
        actualBoundary: boundary.actualBoundary,
        failedBoundarySubconditions:
          boundary.failedSubconditions,
      },
    );
  }
  lifecycle.finish("PASS");
  lifecycle.begin("SEMANTIC_FINGERPRINT");
  const semanticResult = await runDisposablePsql(
    ports,
    buildProject004PrefixSemanticFingerprintSql(root, 40),
    "SEMANTIC_FINGERPRINT",
    lifecycle,
    abortSignal,
    disposableProofStageTimeoutMs.SEMANTIC_FINGERPRINT,
    true,
  );
  assertManagedChildExited(semanticResult);
  lifecycle.throwIfInterrupted();
  if (semanticResult.timedOut) {
    lifecycle.finish("TIMEOUT");
    proofFailure(
      "DISPOSABLE_STAGE_TIMEOUT_SEMANTIC_FINGERPRINT",
    );
  }
  if (!semanticResult.ok) {
    lifecycle.finish("FAIL");
    const evidence = classifySemanticFingerprintQueryFailure(
      `${semanticResult.stdout}\n${semanticResult.stderr}`,
    );
    proofFailure(
      "DISPOSABLE_SEMANTIC_FINGERPRINT_QUERY_FAILED",
      {
        semanticStage: evidence.stage,
        semanticComponent: evidence.component,
        semanticSqlstate: evidence.sqlstate,
        semanticFailureCategory: evidence.category,
      },
    );
  }
  let semantic: ReturnType<
    typeof parsePrefixSemanticFingerprint
  >;
  try {
    semantic = parsePrefixSemanticFingerprint(
      semanticResult.stdout,
    );
  } catch {
    lifecycle.finish("FAIL");
    proofFailure(
      "DISPOSABLE_SEMANTIC_FINGERPRINT_PARSER_FAILED",
      {
        semanticStage: "PARSER",
        semanticComponent: "AGGREGATION",
        semanticSqlstate: "NONE",
        semanticFailureCategory:
          "MACHINE_OUTPUT_CONTRACT_INVALID",
      },
    );
  }
  lifecycle.finish("PASS");

  lifecycle.begin("CONTENT_TRANSACTION");
  const contentApplied = await runDisposablePsql(
    ports,
    content.sql,
    "CONTENT_TRANSACTION",
    lifecycle,
    abortSignal,
    disposableProofStageTimeoutMs.CONTENT_TRANSACTION,
  );
  assertManagedChildExited(contentApplied);
  lifecycle.throwIfInterrupted();
  if (contentApplied.timedOut) {
    lifecycle.finish("TIMEOUT");
    proofFailure(
      "DISPOSABLE_STAGE_TIMEOUT_CONTENT_TRANSACTION",
    );
  }
  if (!contentApplied.ok) {
    lifecycle.finish("FAIL");
    const evidence = classifyProject004ContentFailure(
      contentApplied,
    );
    let rollback:
      | "PASS"
      | "FAIL"
      | "UNVERIFIED"
      | "NOT_REQUIRED" =
      evidence.sqlExecutionStarted === "NO"
        ? "NOT_REQUIRED"
        : "UNVERIFIED";
    if (evidence.sqlExecutionStarted !== "NO") {
      const rollbackResult = await runDisposablePsql(
        ports,
        project004ContentAggregateCountsSql,
        "POST_APPLY_DIAGNOSTIC",
        undefined,
        abortSignal,
        disposableProofStageTimeoutMs.POST_APPLY_DIAGNOSTIC,
        true,
      );
      if (rollbackResult.ok) {
        try {
          rollback = project004ContentRollbackPassed(
            parseProject004ContentAggregateCounts(
              rollbackResult.stdout,
            ),
          )
            ? "PASS"
            : "FAIL";
        } catch {
          rollback = "UNVERIFIED";
        }
      }
    }
    proofFailure("DISPOSABLE_CONTENT_TRANSACTION_FAILED", {
      contentFailureStage: evidence.stage,
      contentSqlstate: evidence.sqlstate,
      contentErrorCategory: evidence.errorCategory,
      contentFailedStatementClass:
        evidence.failedStatementClass,
      contentSqlExecutionStarted:
        evidence.sqlExecutionStarted,
      contentTransactionRollback: rollback,
      contentPreconditionId: evidence.preconditionId,
      contentPreconditionObserved:
        evidence.preconditionObserved,
      contentPreconditionExpected:
        evidence.preconditionExpected,
    });
  }
  lifecycle.finish("PASS");
  lifecycle.begin("POST_APPLY_DIAGNOSTIC");
  let counts: RemotePostApplyCounts | undefined;
  try {
    const verification =
      await executeProject004PostTransactionVerifier(
        ({ sql, machineOutput }) =>
          runDisposablePsql(
            ports,
            sql,
            "POST_APPLY_DIAGNOSTIC",
            lifecycle,
            abortSignal,
            disposableProofStageTimeoutMs.POST_APPLY_DIAGNOSTIC,
            machineOutput,
          ),
        );
    counts = verification.counts;
    if (verification.query.childExited === false) {
      proofFailure("DISPOSABLE_CHILD_EXIT_UNCONFIRMED");
    }
    lifecycle.throwIfInterrupted();
  } catch (error) {
    if (error instanceof Project004PostApplyResponseError) {
      lifecycle.finish(
        error.queryTimedOut ? "TIMEOUT" : "FAIL",
      );
      if (!error.queryChildExited) {
        proofFailure("DISPOSABLE_CHILD_EXIT_UNCONFIRMED");
      }
      const evidence = error.evidence;
      const rootCode = error.queryTimedOut
        ? "DISPOSABLE_STAGE_TIMEOUT_POST_APPLY_DIAGNOSTIC"
        : evidence.queryExit === "FAIL"
          ? "DISPOSABLE_POST_APPLY_DIAGNOSTIC_FAILED"
          : "POST_APPLY_DIAGNOSTIC_RESPONSE_INVALID";
      proofFailure(rootCode, {
        contentFailureStage:
          "POST_TRANSACTION_VERIFICATION",
        contentSqlstate:
          evidence.queryExit === "FAIL" ? "UNKNOWN" : "NONE",
        contentErrorCategory: error.queryTimedOut
          ? "POST_TRANSACTION_QUERY_TIMEOUT"
          : evidence.queryExit === "FAIL"
            ? "POST_TRANSACTION_QUERY_FAILED"
            : "POST_TRANSACTION_RESPONSE_INVALID",
        contentFailedStatementClass:
          "POST_COMMIT_READ_ONLY_VERIFIER",
        contentSqlExecutionStarted: "YES",
        contentTransactionRollback: "NOT_REQUIRED",
        contentValidationId: "NOT_RUN",
        contentValidationObserved: "NOT_RUN",
        contentValidationExpected: "NOT_RUN",
        postApplyQueryExit: evidence.queryExit,
        postApplyPayloadSentinelCount:
          evidence.payloadSentinelCount,
        postApplyPayloadFieldCount:
          evidence.payloadFieldCount,
        postApplyPayloadVersion:
          evidence.payloadVersion,
        postApplyParserFailureCode:
          evidence.parserFailureCode,
      });
    }
    lifecycle.finish("FAIL");
    if (
      error instanceof
      Project004PostTransactionValidationError
    ) {
      const observedCounts =
        error instanceof Project004PostApplyValidationError
          ? error.counts
          : counts;
      proofFailure("POST_APPLY_DIAGNOSTIC_MISMATCH", {
        contentFailureStage:
          "POST_TRANSACTION_VERIFICATION",
        contentSqlstate: "NONE",
        contentErrorCategory:
          "POST_TRANSACTION_STATE_MISMATCH",
        contentFailedStatementClass:
          "POST_COMMIT_READ_ONLY_VERIFIER",
        contentSqlExecutionStarted: "YES",
        contentTransactionRollback: "NOT_REQUIRED",
        contentValidationId: error.validationId,
        contentValidationObserved: error.observed,
        contentValidationExpected: error.expected,
        releaseScopedCounts: observedCounts
          ? `${String(observedCounts.units)}/${String(observedCounts.publicQuestions)}/` +
            `${String(observedCounts.privateSolutions)}/${String(observedCounts.officialOutcomes)}`
          : "NOT_RUN",
        legacyBaselineCounts: observedCounts
          ? `${String(observedCounts.legacyLearningUnits)}/${String(observedCounts.legacyQuestions)}/` +
            `${String(observedCounts.legacySolutions)}/${String(observedCounts.diagnosticBlueprintRows)}`
          : "NOT_RUN",
        physicalTableCounts: observedCounts
          ? `${String(observedCounts.physicalUnitRows)}/${String(observedCounts.physicalQuestionRows)}/` +
            `${String(observedCounts.physicalSolutionRows)}`
          : "NOT_RUN",
      });
    }
    throw error;
  }
  lifecycle.finish("PASS");
  if (!counts) {
    proofFailure("POST_APPLY_DIAGNOSTIC_RESPONSE_INVALID");
  }

  return {
    project: "PLAVE-PROJECT004" as const,
    targetName: project004RemoteDevContract.projectName,
    status: "FRESH_DISPOSABLE_PROOF_PASS" as const,
    proofVersion: cleanDisposableProofVersion as
      typeof cleanDisposableProofVersion,
    postgresImage: cleanDisposablePostgresImage as
      typeof cleanDisposablePostgresImage,
    postgresImageId: await imageId(
      lifecycle,
      abortSignal,
    ),
    migrationPlanFingerprintSha256:
      buildMigrationPlanFingerprint(plan),
    migrationCount: 40 as const,
    migrationFirst: "0001" as const,
    migrationLast: "0040" as const,
    lastMigrationPassed: "0040" as const,
    firstMigrationFailed: "NONE" as const,
    exactOrdering: cleanDisposableOrdering as
      typeof cleanDisposableOrdering,
    schemaSemanticFingerprintSha256:
      semantic.overallSha256,
    schemaRlsPrivateBoundary: "PASS" as const,
    contentTransaction: "PASS" as const,
    releases: 1 as const,
    units: counts.units as 171,
    publicQuestions: counts.publicQuestions as 2052,
    privateSolutions: counts.privateSolutions as 2052,
    officialOutcomes: counts.officialOutcomes as 546,
    universalRelease: "DRAFT_INACTIVE" as const,
    curriculumRuntime: false as const,
    adaptivePilot: "DISABLED" as const,
    authUsers: counts.authUsers as 0,
    storageObjects: counts.storageObjects as 0,
    syntheticUsers: counts.syntheticUserRows as 0,
    publicPayloadSha256: content.hashes.publicPayloadSha256,
    privateSolutionSha256:
      content.hashes.privateSolutionSha256,
    bundleSha256: content.hashes.bundleSha256,
    cleanup: "PASS" as const,
  };
}

export type DisposableSemanticCategoryDiagnostic = {
  category: PrefixSemanticCategory;
  query: "PASS" | "FAIL";
  parser: "PASS" | "FAIL" | "NOT_RUN";
  count: number | "NOT_RUN";
  sqlstate: string;
  failureCategory: string;
};

export type DisposableSemanticFingerprintDiagnostic = {
  migrationBoundary: "PASS" | "FAIL";
  query: "PASS" | "FAIL" | "NOT_RUN";
  parser: "PASS" | "FAIL" | "NOT_RUN";
  canonicalization:
    | "PASS"
    | "FAIL"
    | "NOT_RUN";
  semanticDrift:
    | "NOT_OBSERVED"
    | "NOT_EVALUATED";
  failedComponents: string[];
  sqlstate: string;
  failureCategory: string;
  categories: DisposableSemanticCategoryDiagnostic[];
  cleanup: "PASS" | "FAIL" | "NOT_STARTED";
  rootFailureCode: string;
};

async function diagnoseSemanticFingerprint(
  root: string,
  ports: DisposablePorts,
): Promise<
  Omit<DisposableSemanticFingerprintDiagnostic, "cleanup">
> {
  const overall = await runDisposablePsql(
    ports,
    buildProject004PrefixSemanticFingerprintSql(root, 40),
    "SEMANTIC_FINGERPRINT",
    undefined,
    undefined,
    120_000,
    true,
  );
  if (overall.ok) {
    try {
      const parsed = parsePrefixSemanticFingerprint(
        overall.stdout,
      );
      return {
        migrationBoundary: "PASS",
        query: "PASS",
        parser: "PASS",
        canonicalization: "PASS",
        semanticDrift: "NOT_OBSERVED",
        failedComponents: [],
        sqlstate: "NONE",
        failureCategory: "NONE",
        categories: parsed.categories.map((entry) => ({
          category: entry.category,
          query: "PASS",
          parser: "PASS",
          count: entry.count,
          sqlstate: "NONE",
          failureCategory: "NONE",
        })),
        rootFailureCode: "NONE",
      };
    } catch {
      return {
        migrationBoundary: "PASS",
        query: "PASS",
        parser: "FAIL",
        canonicalization: "NOT_RUN",
        semanticDrift: "NOT_EVALUATED",
        failedComponents: ["AGGREGATION"],
        sqlstate: "NONE",
        failureCategory:
          "MACHINE_OUTPUT_CONTRACT_INVALID",
        categories: [],
        rootFailureCode:
          "DISPOSABLE_SEMANTIC_FINGERPRINT_PARSER_FAILED",
      };
    }
  }

  const categoryDiagnostics: DisposableSemanticCategoryDiagnostic[] =
    [];
  for (const category of prefixSemanticCategories) {
    const result = await runDisposablePsql(
      ports,
      buildProject004PrefixSemanticCategorySql(
        category,
        root,
        40,
      ),
      "SEMANTIC_FINGERPRINT",
      undefined,
      undefined,
      120_000,
      true,
    );
    if (!result.ok) {
      const evidence =
        classifySemanticFingerprintQueryFailure(
          `${result.stdout}\n${result.stderr}`,
          category,
        );
      categoryDiagnostics.push({
        category,
        query: "FAIL",
        parser: "NOT_RUN",
        count: "NOT_RUN",
        sqlstate: evidence.sqlstate,
        failureCategory: evidence.category,
      });
      continue;
    }
    try {
      const parsed = parsePrefixSemanticFingerprint(
        result.stdout,
      );
      const selected = parsed.categories.find(
        (entry) => entry.category === category,
      );
      if (!selected) throw new Error("CATEGORY_MISSING");
      categoryDiagnostics.push({
        category,
        query: "PASS",
        parser: "PASS",
        count: selected.count,
        sqlstate: "NONE",
        failureCategory: "NONE",
      });
    } catch {
      categoryDiagnostics.push({
        category,
        query: "PASS",
        parser: "FAIL",
        count: "NOT_RUN",
        sqlstate: "NONE",
        failureCategory:
          "CATEGORY_MACHINE_OUTPUT_CONTRACT_INVALID",
      });
    }
  }
  const failedCategories = categoryDiagnostics.filter(
    (entry) =>
      entry.query === "FAIL" || entry.parser === "FAIL",
  );
  const overallEvidence =
    classifySemanticFingerprintQueryFailure(
      `${overall.stdout}\n${overall.stderr}`,
      failedCategories.length === 0
        ? "AGGREGATION"
        : failedCategories.length === 1
          ? failedCategories[0]?.category
          : "SHARED_CATALOG",
    );
  return {
    migrationBoundary: "PASS",
    query: "FAIL",
    parser: "NOT_RUN",
    canonicalization:
      failedCategories.some(
        (entry) => entry.parser === "FAIL",
      )
        ? "FAIL"
        : "PASS",
    semanticDrift: "NOT_EVALUATED",
    failedComponents:
      failedCategories.length === 0
        ? ["AGGREGATION"]
        : failedCategories.map((entry) => entry.category),
    sqlstate: overallEvidence.sqlstate,
    failureCategory: overallEvidence.category,
    categories: categoryDiagnostics,
    rootFailureCode:
      "DISPOSABLE_SEMANTIC_FINGERPRINT_QUERY_FAILED",
  };
}

export async function runProject004DisposableSemanticFingerprintDiagnostic(): Promise<DisposableSemanticFingerprintDiagnostic> {
  const root = assertProject004Workspace();
  assertDisposableMigrationWorkspaceSmokeMarker(root);
  const projectId =
    `plave-project004-clean-proof-${randomBytes(6).toString("hex")}`;
  const reservation = await reserveDisposablePorts();
  const ports = reservation.ports;
  let workdir = "";
  let report:
    | Omit<DisposableSemanticFingerprintDiagnostic, "cleanup">
    | undefined;
  try {
    workdir = prepareDisposableMigrationWorkspace({
      candidateRoot: root,
      projectId,
      ports,
    }).workdir;
    await reservation.release();
    const started = await startDisposableStack(workdir);
    if (!started.ok) {
      report = {
        migrationBoundary: "FAIL",
        query: "NOT_RUN",
        parser: "NOT_RUN",
        canonicalization: "NOT_RUN",
        semanticDrift: "NOT_EVALUATED",
        failedComponents: ["STACK_START"],
        sqlstate: "UNKNOWN",
        failureCategory:
          classifyDisposableStartFailure(
            `${started.stdout}\n${started.stderr}`,
          ),
        categories: [],
        rootFailureCode:
          "DISPOSABLE_SEMANTIC_DIAGNOSTIC_STACK_FAILED",
      };
    } else {
      const boundary = await migrationBoundary(ports);
      report = boundary.pass
        ? await diagnoseSemanticFingerprint(root, ports)
        : {
            migrationBoundary: "FAIL",
            query: "NOT_RUN",
            parser: "NOT_RUN",
            canonicalization: "NOT_RUN",
            semanticDrift: "NOT_EVALUATED",
            failedComponents:
              boundary.failedSubconditions,
            sqlstate: "NONE",
            failureCategory:
              "MIGRATION_BOUNDARY_INVALID",
            categories: [],
            rootFailureCode:
              "DISPOSABLE_RUNTIME_MIGRATION_HISTORY_BOUNDARY_INVALID",
          };
    }
  } catch {
    await reservation.release();
    report = {
      migrationBoundary: "FAIL",
      query: "NOT_RUN",
      parser: "NOT_RUN",
      canonicalization: "NOT_RUN",
      semanticDrift: "NOT_EVALUATED",
      failedComponents: ["HARNESS"],
      sqlstate: "UNKNOWN",
      failureCategory: "DIAGNOSTIC_HARNESS_FAILED",
      categories: [],
      rootFailureCode:
        "DISPOSABLE_SEMANTIC_DIAGNOSTIC_HARNESS_FAILED",
    };
  }
  const cleanupResult = workdir
    ? await stopDisposableStack(workdir, projectId)
    : { ok: true, timedOut: false, childExited: true };
  const cleanup: DisposableSemanticFingerprintDiagnostic["cleanup"] =
    cleanupResult.ok ? "PASS" : "FAIL";
  return {
    ...(report as Omit<
      DisposableSemanticFingerprintDiagnostic,
      "cleanup"
    >),
    cleanup,
  };
}

export function renderDisposableSemanticFingerprintDiagnostic(
  report: DisposableSemanticFingerprintDiagnostic,
) {
  const lines = [
    "PROJECT004_CANONICAL=PASS",
    "MIGRATION_EXECUTION_STARTED=YES",
    `MIGRATION_BOUNDARY=${report.migrationBoundary}`,
    `SEMANTIC_FINGERPRINT_QUERY=${report.query}`,
    `SEMANTIC_FINGERPRINT_PARSER=${report.parser}`,
    `SEMANTIC_CANONICALIZATION=${report.canonicalization}`,
    `SEMANTIC_DRIFT=${report.semanticDrift}`,
    `FAILED_SEMANTIC_COMPONENT=${
      report.failedComponents.length
        ? report.failedComponents.join(",")
        : "NONE"
    }`,
    `SEMANTIC_FINGERPRINT_SQLSTATE=${report.sqlstate}`,
    `SEMANTIC_FINGERPRINT_FAILURE_CATEGORY=${report.failureCategory}`,
  ];
  for (const category of report.categories) {
    lines.push(
      `SEMANTIC_CATEGORY_${category.category}=` +
        `${category.query}/${category.parser}/${String(category.count)}/` +
        `${category.sqlstate}/${category.failureCategory}`,
    );
  }
  lines.push(
    `DISPOSABLE_CLEANUP=${report.cleanup}`,
    "REMOTE_ACCESS_PERFORMED=NO",
    "REMOTE_MUTATION_PERFORMED=NO",
    "PROJECT003=FROZEN_UNTOUCHED",
    `ROOT_FAILURE_CODE=${report.rootFailureCode}`,
  );
  return `${lines.join("\n")}\n`;
}

export type CleanDisposableProofExtensionContext = {
  root: string;
  ports: DisposablePorts;
  lifecycle: DisposableProofLifecycle;
  abortSignal: AbortSignal;
};

export async function runProject004CleanDisposableProof(options?: {
  afterBaseProof?: (
    context: CleanDisposableProofExtensionContext,
  ) => Promise<void>;
}) {
  const root = assertProject004Workspace();
  assertDisposableMigrationWorkspaceSmokeMarker(root);
  const lifecycle = new DisposableProofLifecycle();
  const signalHandlers =
    installDisposableProofSignalHandlers(lifecycle);
  const projectId =
    `plave-project004-clean-proof-${randomBytes(6).toString("hex")}`;
  const reservation = await reserveDisposablePorts();
  const ports = reservation.ports;
  let reservationReleased = false;
  let workdir = "";
  let payload:
    | Awaited<ReturnType<typeof executeDisposableProof>>
    | undefined;
  let operationError: unknown = null;
  let cleanup = false;
  try {
    lifecycle.begin("WORKSPACE_PREPARATION");
    try {
      const workspaceStartedAt = Date.now();
      workdir = prepareDisposableMigrationWorkspace({
        candidateRoot: root,
        projectId,
        ports,
      }).workdir;
      lifecycle.attachWorkdir(workdir);
      lifecycle.throwIfInterrupted();
      if (
        Date.now() - workspaceStartedAt >
        disposableProofStageTimeoutMs.WORKSPACE_PREPARATION
      ) {
        lifecycle.finish("TIMEOUT");
        proofFailure(
          "DISPOSABLE_STAGE_TIMEOUT_WORKSPACE_PREPARATION",
        );
      }
      lifecycle.finish("PASS");
    } catch (error) {
      if (lifecycle.state?.status !== "TIMEOUT") {
        lifecycle.finish("FAIL");
      }
      throw error;
    }
    await reservation.release();
    reservationReleased = true;
    lifecycle.throwIfInterrupted();
    payload = await executeDisposableProof(
      root,
      workdir,
      projectId,
      ports,
      lifecycle,
      signalHandlers.signal,
    );
    if (options?.afterBaseProof) {
      await options.afterBaseProof({
        root,
        ports,
        lifecycle,
        abortSignal: signalHandlers.signal,
      });
    }
  } catch (error) {
    if (error instanceof DisposableProofInterruptedError) {
      operationError = disposableInterruptFailure(
        error.signal,
      );
    } else {
      operationError = error;
    }
  } finally {
    if (!reservationReleased) {
      await reservation.release();
    }
    if (
      canStartDisposableProofCleanup(
        workdir,
        operationError,
      )
    ) {
      lifecycle.begin("CLEANUP");
      const cleanupResult = await stopDisposableStack(
        workdir,
        projectId,
        lifecycle,
      );
      cleanup = cleanupResult.ok;
      if (cleanup) lifecycle.detachWorkdir();
      lifecycle.finish(
        cleanupResult.timedOut
          ? "TIMEOUT"
          : cleanup
            ? "PASS"
            : "FAIL",
      );
      if (
        cleanupResult.timedOut &&
        operationError === null &&
        lifecycle.signal === "NONE"
      ) {
        const timeout = new Error(
          "DISPOSABLE_STAGE_TIMEOUT_CLEANUP",
        ) as ProofFailure;
        timeout.code =
          "DISPOSABLE_STAGE_TIMEOUT_CLEANUP";
        operationError = timeout;
      }
    } else if (!workdir) {
      cleanup = true;
    }
    if (
      operationError === null &&
      lifecycle.signal !== "NONE"
    ) {
      operationError = disposableInterruptFailure(
        lifecycle.signal,
      );
    }
    signalHandlers.dispose();
  }
  if (operationError instanceof Error) {
    (operationError as ProofFailure).cleanup = cleanup
      ? "PASS"
      : "FAIL";
    throw operationError;
  }
  if (!cleanup) {
    proofFailure("DISPOSABLE_DATABASE_CLEANUP_FAILED");
  }
  if (!payload) {
    proofFailure("DISPOSABLE_PROOF_RESULT_UNAVAILABLE");
  }
  const proofFingerprintSha256 =
    buildCleanDisposableProofFingerprint(payload);
  return {
    ...payload,
    proofFingerprintSha256,
  } satisfies CleanDisposableProofManifest;
}

export function renderDisposableProof(
  proof: CleanDisposableProofManifest,
) {
  return [
    "PROJECT004_CANONICAL=PASS",
    "DISPOSABLE_DATABASE_ISOLATED=PASS",
    `MIGRATION_FIRST_LAST=${proof.migrationFirst}/${proof.migrationLast}`,
    `MIGRATION_LAST_PASS=${proof.lastMigrationPassed}`,
    `MIGRATION_FIRST_FAIL=${proof.firstMigrationFailed}`,
    "MIGRATION_EXECUTION_STARTED=YES",
    `MIGRATIONS_APPLIED=${proof.migrationCount}/40`,
    `EXACT_APPLY_ORDERING=${proof.exactOrdering}`,
    `SCHEMA_SEMANTIC_FINGERPRINT_SHA256=${proof.schemaSemanticFingerprintSha256}`,
    `SCHEMA_RLS_PRIVATE_BOUNDARY=${proof.schemaRlsPrivateBoundary}`,
    `CONTENT_TRANSACTION=${proof.contentTransaction}`,
    `RELEASE_BANK=${proof.units}/${proof.publicQuestions}/${proof.privateSolutions}/${proof.officialOutcomes}`,
    "VALIDATION_ID=NONE",
    "VALIDATION_OBSERVED=MATCH",
    "VALIDATION_EXPECTED=MATCH",
    "RELEASE_SCOPED_COUNTS=171/2052/2052/546",
    "LEGACY_BASELINE_COUNTS=14/336/336/24",
    "PHYSICAL_TABLE_COUNTS=185/2388/2388",
    "UNIVERSAL_RELEASE=DRAFT/INACTIVE",
    "CURRICULUM_RUNTIME=false",
    "GRADE2_CONTROLLED_ADAPTIVE_PILOT=DISABLED",
    `AUTH_USER_COUNT=${proof.authUsers}`,
    `STORAGE_OBJECT_COUNT=${proof.storageObjects}`,
    `SYNTHETIC_USER_COUNT=${proof.syntheticUsers}`,
    `DISPOSABLE_PROOF_FINGERPRINT_SHA256=${proof.proofFingerprintSha256}`,
    `DISPOSABLE_CLEANUP=${proof.cleanup}`,
    "REMOTE_ACCESS_PERFORMED=NO",
    "REMOTE_MUTATION_PERFORMED=NO",
    "PROJECT003=FROZEN_UNTOUCHED",
    "ROOT_FAILURE_CODE=NONE",
    "PROJECT004_CLEAN_DISPOSABLE_PROOF=PASS",
  ].join("\n") + "\n";
}

export function renderDisposableProofFailure(
  error: unknown,
) {
  const failure = error as ProofFailure;
  const code =
    failure.code ??
    "DISPOSABLE_PROOF_UNCLASSIFIED_FAILURE";
  const migrationsCompleted = new Set([
    "DISPOSABLE_SEMANTIC_FINGERPRINT_FAILED",
    "DISPOSABLE_SEMANTIC_FINGERPRINT_QUERY_FAILED",
    "DISPOSABLE_SEMANTIC_FINGERPRINT_PARSER_FAILED",
    "DISPOSABLE_STAGE_TIMEOUT_SEMANTIC_FINGERPRINT",
    "DISPOSABLE_STAGE_TIMEOUT_CONTENT_TRANSACTION",
    "DISPOSABLE_STAGE_TIMEOUT_POST_APPLY_DIAGNOSTIC",
    "DISPOSABLE_STAGE_TIMEOUT_CLEANUP",
    "DISPOSABLE_CONTENT_TRANSACTION_FAILED",
    "DISPOSABLE_POST_APPLY_DIAGNOSTIC_FAILED",
    "POST_APPLY_DIAGNOSTIC_RESPONSE_INVALID",
    "POST_APPLY_DIAGNOSTIC_MISMATCH",
  ]).has(code);
  const runtimeBoundaryObserved =
    code ===
    "DISPOSABLE_RUNTIME_MIGRATION_HISTORY_BOUNDARY_INVALID";
  const migrationProgressObserved =
    (failure.migrationObservedCount ?? 0) > 0;
  const serviceBootstrapTimeout =
    code ===
    "DISPOSABLE_STAGE_TIMEOUT_SERVICE_BOOTSTRAP";
  const preExecution =
    code === "DISPOSABLE_WORKSPACE_SMOKE_REQUIRED" ||
    code ===
      "DISPOSABLE_MIGRATION_WORKSPACE_BOUNDARY_INVALID" ||
    code.startsWith("DISPOSABLE_CONFIG_") ||
    code.startsWith("DISPOSABLE_PORT_") ||
    code.startsWith("DISPOSABLE_SUPABASE_");
  const migrationExecutionStarted = migrationsCompleted
    ? "YES"
    : runtimeBoundaryObserved
      ? "YES"
      : migrationProgressObserved
        ? "YES"
        : serviceBootstrapTimeout
          ? "NO"
          : preExecution
            ? "NO"
            : "UNVERIFIED";
  const lines = [
    "PROJECT004_CANONICAL=PASS",
    `MIGRATION_EXECUTION_STARTED=${migrationExecutionStarted}`,
    `MIGRATION_LAST_PASS=${
      migrationsCompleted
        ? "0040"
        : migrationProgressObserved
          ? (failure.migrationLastObservedVersion ??
            "UNVERIFIED")
        : runtimeBoundaryObserved
          ? "UNVERIFIED"
          : "NOT_RUN"
    }`,
    `MIGRATION_FIRST_FAIL=${
      runtimeBoundaryObserved ? "UNVERIFIED" : "NOT_RUN"
    }`,
  ];
  if (failure.migrationObservedCount !== undefined) {
    lines.push(
      `MIGRATION_OBSERVED_COUNT=${String(failure.migrationObservedCount)}`,
      `MIGRATION_LAST_OBSERVED_VERSION=${failure.migrationLastObservedVersion ?? "NOT_OBSERVED"}`,
    );
  }
  if (failure.expectedBoundary) {
    lines.push(
      `EXPECTED_BOUNDARY=${failure.expectedBoundary}`,
    );
  }
  if (failure.actualBoundary) {
    lines.push(`ACTUAL_BOUNDARY=${failure.actualBoundary}`);
  }
  if (failure.failedBoundarySubconditions?.length) {
    lines.push(
      `FAILED_BOUNDARY_SUBCONDITION=${failure.failedBoundarySubconditions.join(",")}`,
    );
  }
  if (failure.semanticStage) {
    lines.push(
      `SEMANTIC_FINGERPRINT_STAGE=${failure.semanticStage}`,
    );
  }
  if (failure.semanticComponent) {
    lines.push(
      `SEMANTIC_FINGERPRINT_COMPONENT=${failure.semanticComponent}`,
    );
  }
  if (failure.semanticSqlstate) {
    lines.push(
      `SEMANTIC_FINGERPRINT_SQLSTATE=${failure.semanticSqlstate}`,
    );
  }
  if (failure.semanticFailureCategory) {
    lines.push(
      `SEMANTIC_FINGERPRINT_FAILURE_CATEGORY=${failure.semanticFailureCategory}`,
    );
  }
  if (failure.contentFailureStage) {
    lines.push(
      `CONTENT_FAILURE_STAGE=${failure.contentFailureStage}`,
      `CONTENT_SQLSTATE=${failure.contentSqlstate ?? "UNKNOWN"}`,
      `CONTENT_ERROR_CATEGORY=${failure.contentErrorCategory ?? "UNKNOWN"}`,
      `CONTENT_FAILED_STATEMENT_CLASS=${failure.contentFailedStatementClass ?? "UNKNOWN"}`,
      `CONTENT_SQL_EXECUTION_STARTED=${failure.contentSqlExecutionStarted ?? "UNVERIFIED"}`,
      `CONTENT_TRANSACTION_ROLLBACK=${failure.contentTransactionRollback ?? "UNVERIFIED"}`,
      `PRECONDITION_ID=${failure.contentPreconditionId ?? "NOT_RUN"}`,
      `PRECONDITION_OBSERVED=${failure.contentPreconditionObserved ?? "NOT_RUN"}`,
      `PRECONDITION_EXPECTED=${failure.contentPreconditionExpected ?? "NOT_RUN"}`,
      `VALIDATION_ID=${failure.contentValidationId ?? "NOT_RUN"}`,
      `VALIDATION_OBSERVED=${failure.contentValidationObserved ?? "NOT_RUN"}`,
      `VALIDATION_EXPECTED=${failure.contentValidationExpected ?? "NOT_RUN"}`,
      `RELEASE_SCOPED_COUNTS=${failure.releaseScopedCounts ?? "NOT_RUN"}`,
      `LEGACY_BASELINE_COUNTS=${failure.legacyBaselineCounts ?? "NOT_RUN"}`,
      `PHYSICAL_TABLE_COUNTS=${failure.physicalTableCounts ?? "NOT_RUN"}`,
      "EXPECTED_CONTENT_COUNTS=171/2052/2052/546",
      "CONTENT_SQL_FILE_PREPARATION=NOT_USED",
      "CONTENT_SQL_TRANSPORT=STDIN_MEMORY",
    );
  }
  if (
    failure.postApplyQueryExit !== undefined ||
    failure.postApplyParserFailureCode !== undefined
  ) {
    lines.push(
      `QUERY_EXIT=${failure.postApplyQueryExit ?? "NOT_RUN"}`,
      `PAYLOAD_SENTINEL_COUNT=${String(failure.postApplyPayloadSentinelCount ?? 0)}`,
      `PAYLOAD_FIELD_COUNT=${String(failure.postApplyPayloadFieldCount ?? 0)}`,
      `PAYLOAD_VERSION=${failure.postApplyPayloadVersion ?? "UNKNOWN"}`,
      `PARSER_FAILURE_CODE=${failure.postApplyParserFailureCode ?? "NOT_RUN"}`,
    );
  }
  lines.push(
    `DISPOSABLE_CLEANUP=${failure.cleanup ?? "NOT_STARTED"}`,
    "REMOTE_ACCESS_PERFORMED=NO",
    "REMOTE_MUTATION_PERFORMED=NO",
    "PROJECT003=FROZEN_UNTOUCHED",
    `ROOT_FAILURE_CODE=${code}`,
    "PROJECT004_CLEAN_DISPOSABLE_PROOF=FAIL",
  );
  return `${lines.join("\n")}\n`;
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  if (process.argv.includes("--semantic-diagnostic")) {
    const report =
      await runProject004DisposableSemanticFingerprintDiagnostic();
    process.stdout.write(
      renderDisposableSemanticFingerprintDiagnostic(report),
    );
    process.exitCode =
      report.cleanup === "PASS" &&
      report.migrationBoundary === "PASS" &&
      report.failedComponents.length > 0
        ? 0
        : report.rootFailureCode === "NONE"
          ? 0
          : 1;
  } else if (process.argv.includes("--allocator-smoke")) {
    try {
      const reservation = await reserveDisposablePorts();
      await reservation.release();
      process.stdout.write(
        "CLEAN_DISPOSABLE_ALLOCATOR_SMOKE=PASS\n" +
          "REMOTE_ACCESS_PERFORMED=NO\n" +
          "REMOTE_MUTATION_PERFORMED=NO\n",
      );
    } catch {
      process.stdout.write(
        "CLEAN_DISPOSABLE_ALLOCATOR_SMOKE=FAIL\n" +
          "REMOTE_ACCESS_PERFORMED=NO\n" +
          "REMOTE_MUTATION_PERFORMED=NO\n",
      );
      process.exitCode = 1;
    }
  } else {
    try {
      process.stdout.write(
        renderDisposableProof(
          await runProject004CleanDisposableProof(),
        ),
      );
    } catch (error) {
      process.stdout.write(
        renderDisposableProofFailure(error),
      );
      process.exitCode = 1;
    }
  }
}
