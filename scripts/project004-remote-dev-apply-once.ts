import { createHash } from "node:crypto";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  captureLocalRuntimeFingerprint,
  createAuditedRemoteDevApplyOnceRunner,
  type ApplyOnceCommandCounts,
} from "./project004-remote-dev-audited-runner.ts";
import { buildProject004RemoteDevCurriculumSql } from "./project004-remote-dev-curriculum.ts";
import {
  RemoteDevGuardFailure,
  assertLinkedTarget,
  assertLocalIsolation,
  buildMigrationPlanFingerprint,
  createCanonicalRemoteDevCommandRunner,
  project004RemoteDevContract,
  withEphemeralRemoteCliMetadata,
  type MigrationPlan,
  type RemoteDevPrivateConfig,
  type SafeCommandResult,
} from "./project004-remote-dev-guard.ts";
import {
  buildResolvedRemoteCliEnvironment,
  buildResolvedRemoteDatabaseEnvironment,
  resolvedRemotePoolerUrl,
  type ResolvedRemoteDatabaseEndpoint,
} from "./project004-remote-connectivity-resolver.ts";
import {
  queryRemotePostApplyCounts,
  runRemoteDevPreflight,
  toRemoteDevRootFailureCode,
  verifyProject004DryRunResult,
  verifyRemotePostApplyCounts,
  type RemoteDevCheckState,
  type RemoteDevCommandRunner,
  type RemoteEmptyCounts,
  type RemotePostApplyCounts,
} from "./project004-remote-dev-operations.ts";

export type ApplyOnceStage =
  | "APPROVAL"
  | "PRECONDITION"
  | "DRY_RUN"
  | "SCHEMA_PUSH"
  | "CONTENT_TRANSACTION"
  | "POST_APPLY_DIAGNOSTIC"
  | "COMPLETE";

export type MigrationProgress = {
  count: number | "UNKNOWN";
  lastPassed: string;
  firstFailed: string;
};

export type ApplyOnceSafeReport = {
  ok: boolean;
  stage: ApplyOnceStage;
  rootFailureCode: string;
  project004Canonical: RemoteDevCheckState;
  remoteIdentityGuard: RemoteDevCheckState;
  emptyRemoteState: RemoteDevCheckState;
  localMigrationChecksums: RemoteDevCheckState;
  cleanDisposableProof: RemoteDevCheckState;
  remoteDatabaseEndpointMode:
    | "DIRECT"
    | "POOLER_SESSION"
    | "NOT_RUN";
  dryRunFingerprint: RemoteDevCheckState;
  migrationProgress: MigrationProgress;
  contentRollback: RemoteDevCheckState;
  localRuntimeUnchanged: RemoteDevCheckState;
  remoteMutationPerformed: "NO" | "YES" | "POSSIBLE";
  baselineCounts: RemoteEmptyCounts | null;
  postApplyCounts: RemotePostApplyCounts | null;
  commandCounts: ApplyOnceCommandCounts;
};

function emptyCommandCounts(): ApplyOnceCommandCounts {
  return {
    projectList: 0,
    readOnlySql: 0,
    guardedLink: 0,
    dryRun: 0,
    schemaPush: 0,
    schemaPushSucceeded: 0,
    contentTransaction: 0,
    contentTransactionSucceeded: 0,
    destructive: 0,
    unexpected: 0,
  };
}

export function notRunApplyOnceReport(
  failureCode: string,
  project004Canonical: RemoteDevCheckState,
  localMigrationChecksums: RemoteDevCheckState,
  cleanDisposableProof: RemoteDevCheckState = "NOT_RUN",
): ApplyOnceSafeReport {
  return {
    ok: false,
    stage: "APPROVAL",
    rootFailureCode: failureCode,
    project004Canonical,
    remoteIdentityGuard: "NOT_RUN",
    emptyRemoteState: "NOT_RUN",
    localMigrationChecksums,
    cleanDisposableProof,
    remoteDatabaseEndpointMode: "NOT_RUN",
    dryRunFingerprint: "NOT_RUN",
    migrationProgress: {
      count: 0,
      lastPassed: "NONE",
      firstFailed: "NOT_RUN",
    },
    contentRollback: "NOT_RUN",
    localRuntimeUnchanged: "PASS",
    remoteMutationPerformed: "NO",
    baselineCounts: null,
    postApplyCounts: null,
    commandCounts: emptyCommandCounts(),
  };
}

function identityGuardState(
  states: Record<string, RemoteDevCheckState>,
): RemoteDevCheckState {
  const identityStates = [
    states.REMOTE_TARGET_GUARD,
    states.CLI_AUTHENTICATION,
    states.REMOTE_PROJECT_IDENTITY,
  ];
  if (identityStates.includes("FAIL")) return "FAIL";
  if (identityStates.every((state) => state === "PASS")) {
    return "PASS";
  }
  return "NOT_RUN";
}

function configFromEnvironment(
  environment: NodeJS.ProcessEnv,
): RemoteDevPrivateConfig {
  return {
    projectName:
      environment.PLAVE_PROJECT004_REMOTE_TARGET_NAME ?? "",
    projectRef:
      environment.PLAVE_PROJECT004_REMOTE_PROJECT_REF ?? "",
    databasePassword:
      environment.PLAVE_PROJECT004_REMOTE_DB_PASSWORD ?? "",
    environmentClass:
      environment.PLAVE_PROJECT004_REMOTE_ENVIRONMENT_CLASS ?? "",
  };
}

function lastOutputLine(stdout: string) {
  return stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);
}

function runReadOnlyScalar(
  sql: string,
  config: RemoteDevPrivateConfig,
  environment: NodeJS.ProcessEnv,
  runner: RemoteDevCommandRunner,
  resolvedEndpoint: ResolvedRemoteDatabaseEndpoint,
) {
  return runner(
    "psql",
    [
      "--no-psqlrc",
      "--quiet",
      "--tuples-only",
      "--no-align",
      "--set",
      "ON_ERROR_STOP=1",
      "--command",
      sql,
    ],
    buildResolvedRemoteDatabaseEnvironment(
      config,
      resolvedEndpoint,
      environment,
    ),
  );
}

const migrationProgressSql = String.raw`
begin read only;
set local statement_timeout = '15s';
select coalesce(
  string_agg(version, ',' order by version),
  'NONE'
)
from supabase_migrations.schema_migrations
where version ~ '^(000[1-9]|00[12][0-9]|003[0-9]|0040)$';
commit;
`;

export function parseMigrationProgress(
  result: SafeCommandResult,
  plan: MigrationPlan,
): MigrationProgress {
  if (!result.ok) {
    return {
      count: "UNKNOWN",
      lastPassed: "UNKNOWN",
      firstFailed: "UNKNOWN",
    };
  }
  const raw = lastOutputLine(result.stdout);
  const applied =
    raw === "NONE" ? [] : (raw?.split(",") ?? []);
  const canonical = plan.migrations.map((entry) => entry.version);
  if (
    new Set(applied).size !== applied.length ||
    applied.some((version) => !canonical.includes(version))
  ) {
    return {
      count: "UNKNOWN",
      lastPassed: "UNKNOWN",
      firstFailed: "UNKNOWN",
    };
  }
  let consecutiveCount = 0;
  while (
    canonical[consecutiveCount] !== undefined &&
    applied.includes(canonical[consecutiveCount] ?? "")
  ) {
    consecutiveCount += 1;
  }
  return {
    count: applied.length,
    lastPassed:
      consecutiveCount === 0
        ? "NONE"
        : (canonical[consecutiveCount - 1] ?? "UNKNOWN"),
    firstFailed:
      consecutiveCount >= canonical.length
        ? "NONE"
        : (canonical[consecutiveCount] ?? "UNKNOWN"),
  };
}

const contentRollbackSql = String.raw`
begin read only;
set local statement_timeout = '15s';
select concat_ws(
  '|',
  (select count(*) from public.curriculum_releases),
  (select count(*) from public.curriculum_release_units),
  (select count(*) from public.curriculum_release_questions),
  (select count(*) from private.curriculum_release_solutions),
  (
    select count(*)
    from public.curriculum_legacy_grade1_outcome_mappings
  )
);
commit;
`;

function contentRollbackState(result: SafeCommandResult) {
  if (!result.ok) return "FAIL" as const;
  const values =
    lastOutputLine(result.stdout)?.split("|").map(Number) ?? [];
  return values.length === 5 &&
    values.every(
      (value) => Number.isSafeInteger(value) && value === 0,
    )
    ? ("PASS" as const)
    : ("FAIL" as const);
}

function errorCode(error: unknown) {
  if (error instanceof RemoteDevGuardFailure) {
    return toRemoteDevRootFailureCode(error.code);
  }
  return "UNCLASSIFIED_FAILURE";
}

function mutationState(
  counts: ApplyOnceCommandCounts,
  progress: MigrationProgress,
) {
  if (counts.schemaPushSucceeded === 1) return "YES" as const;
  if (counts.schemaPush === 0) return "NO" as const;
  if (typeof progress.count === "number") {
    return progress.count > 0 ? ("YES" as const) : ("NO" as const);
  }
  return "POSSIBLE" as const;
}

export function executeAuthorizedRemoteDevApplyOnce(options: {
  environment: NodeJS.ProcessEnv;
  candidateRoot?: string;
  runner?: RemoteDevCommandRunner;
}): ApplyOnceSafeReport {
  const environment = options.environment;
  const candidateRoot = options.candidateRoot ?? process.cwd();
  if (
    environment.PLAVE_PROJECT004_REMOTE_OWNER_APPROVAL !==
    project004RemoteDevContract.applyApproval
  ) {
    return notRunApplyOnceReport(
      "APPLY_OWNER_APPROVAL_REQUIRED",
      "NOT_RUN",
      "NOT_RUN",
    );
  }

  const beforeFingerprint =
    captureLocalRuntimeFingerprint(candidateRoot);
  let content: ReturnType<
    typeof buildProject004RemoteDevCurriculumSql
  >;
  try {
    content = buildProject004RemoteDevCurriculumSql();
  } catch {
    return notRunApplyOnceReport(
      "REMOTE_CONTENT_SOURCE_INVALID",
      "PASS",
      "PASS",
    );
  }
  const temporaryDirectory = mkdtempSync(
    join(tmpdir(), "plave-project004-remote-dev-apply-"),
  );
  const contentPath = join(
    temporaryDirectory,
    "canonical-curriculum-draft.sql",
  );
  writeFileSync(contentPath, content.sql, {
    encoding: "utf8",
    mode: 0o600,
  });
  const contentSha256 = createHash("sha256")
    .update(content.sql)
    .digest("hex");
  const audited = createAuditedRemoteDevApplyOnceRunner({
    delegate:
      options.runner ??
      createCanonicalRemoteDevCommandRunner(candidateRoot),
    contentPath,
    contentSha256,
  });
  const report: ApplyOnceSafeReport = notRunApplyOnceReport(
    "UNCLASSIFIED_FAILURE",
    "NOT_RUN",
    "NOT_RUN",
  );
  report.commandCounts = audited.counts;

  try {
    const preflight = runRemoteDevPreflight({
      environment,
      candidateRoot,
      runner: audited.runner,
    });
    report.project004Canonical = preflight.project004Canonical;
    report.remoteIdentityGuard = identityGuardState(
      preflight.checkStates,
    );
    report.emptyRemoteState =
      preflight.checkStates.REMOTE_EMPTY;
    report.localMigrationChecksums =
      preflight.checkStates.LOCAL_MIGRATIONS_0001_0040;
    report.cleanDisposableProof =
      preflight.checkStates.CLEAN_DISPOSABLE_PROOF;
    report.remoteDatabaseEndpointMode =
      preflight.resolvedEndpoint?.mode ?? "NOT_RUN";
    report.baselineCounts = preflight.counts;
    report.stage = "PRECONDITION";
    if (
      !preflight.ok ||
      !preflight.plan ||
      !preflight.resolvedEndpoint
    ) {
      report.rootFailureCode =
        preflight.failureCode ?? "APPLY_PREFLIGHT_FAILED";
      return report;
    }
    const plan = preflight.plan;
    const resolvedEndpoint = preflight.resolvedEndpoint;

    const config = configFromEnvironment(environment);
    const root = assertLocalIsolation(config, candidateRoot);
    const cliEnvironment = buildResolvedRemoteCliEnvironment(
      config,
      resolvedEndpoint,
      environment,
    );
    let schemaSucceeded = false;

    try {
      withEphemeralRemoteCliMetadata(
        root,
        {
          projectRef: config.projectRef,
          passwordlessPoolerUrl: resolvedRemotePoolerUrl(
            config,
            resolvedEndpoint,
          ),
        },
        () => {
          assertLinkedTarget(root, config);
          report.stage = "DRY_RUN";
          const dryRun = audited.runner(
            "supabase",
            ["db", "push", "--dry-run"],
            cliEnvironment,
          );
          verifyProject004DryRunResult(
            dryRun,
            plan,
          );
          if (
            buildMigrationPlanFingerprint(plan) !==
            plan.migrationPlanFingerprintSha256
          ) {
            throw new RemoteDevGuardFailure(
              "DRY_RUN_FINGERPRINT_MISMATCH",
            );
          }
          report.dryRunFingerprint = "PASS";

          report.stage = "PRECONDITION";
          const confirmation = runRemoteDevPreflight({
            environment,
            candidateRoot,
            runner: audited.runner,
            resolvedEndpoint,
          });
          if (confirmation.counts) {
            report.baselineCounts = confirmation.counts;
          }
          if (
            !confirmation.ok ||
            !confirmation.plan ||
            !confirmation.counts ||
            confirmation.plan.migrationPlanFingerprintSha256 !==
              plan.migrationPlanFingerprintSha256
          ) {
            throw new RemoteDevGuardFailure(
              "APPLY_PRECONDITION_CHANGED",
            );
          }

          report.stage = "SCHEMA_PUSH";
          const schemaApply = audited.runner(
            "supabase",
            ["db", "push"],
            cliEnvironment,
          );
          if (!schemaApply.ok) {
            throw new RemoteDevGuardFailure(
              "REMOTE_SCHEMA_APPLY_FAILED",
            );
          }
          schemaSucceeded = true;
        },
      );
    } catch (error) {
      report.rootFailureCode = errorCode(error);
      if (audited.counts.schemaPush === 1) {
        report.migrationProgress = parseMigrationProgress(
          runReadOnlyScalar(
            migrationProgressSql,
            config,
            environment,
            audited.runner,
            resolvedEndpoint,
          ),
          plan,
        );
      }
      report.remoteMutationPerformed = mutationState(
        audited.counts,
        report.migrationProgress,
      );
      return report;
    }

    if (!schemaSucceeded) {
      report.rootFailureCode = "REMOTE_SCHEMA_APPLY_FAILED";
      return report;
    }
    report.migrationProgress = {
      count: 40,
      lastPassed: "0040",
      firstFailed: "NONE",
    };
    report.remoteMutationPerformed = "YES";

    report.stage = "CONTENT_TRANSACTION";
    const contentApply = audited.runner(
      "psql",
      [
        "--no-psqlrc",
        "--quiet",
        "--set",
        "ON_ERROR_STOP=1",
        "--file",
        contentPath,
      ],
      buildResolvedRemoteDatabaseEnvironment(
        config,
        resolvedEndpoint,
        environment,
      ),
    );
    if (!contentApply.ok) {
      report.contentRollback = contentRollbackState(
        runReadOnlyScalar(
          contentRollbackSql,
          config,
          environment,
          audited.runner,
          resolvedEndpoint,
        ),
      );
      report.rootFailureCode =
        report.contentRollback === "PASS"
          ? "REMOTE_CONTENT_TRANSACTION_FAILED"
          : "REMOTE_CONTENT_ROLLBACK_UNCONFIRMED";
      return report;
    }

    report.stage = "POST_APPLY_DIAGNOSTIC";
    try {
      const counts = queryRemotePostApplyCounts(
        config,
        environment,
        audited.runner,
        resolvedEndpoint,
      );
      verifyRemotePostApplyCounts(counts);
      report.postApplyCounts = counts;
    } catch (error) {
      report.rootFailureCode = errorCode(error);
      return report;
    }

    if (
      audited.counts.dryRun !== 1 ||
      audited.counts.schemaPush !== 1 ||
      audited.counts.schemaPushSucceeded !== 1 ||
      audited.counts.contentTransaction !== 1 ||
      audited.counts.contentTransactionSucceeded !== 1 ||
      audited.counts.unexpected !== 0
    ) {
      report.rootFailureCode = "UNEXPECTED_OPERATION_DETECTED";
      return report;
    }

    report.ok = true;
    report.stage = "COMPLETE";
    report.rootFailureCode = "NONE";
    return report;
  } catch (error) {
    report.rootFailureCode = errorCode(error);
    return report;
  } finally {
    rmSync(temporaryDirectory, {
      recursive: true,
      force: true,
    });
    report.localRuntimeUnchanged =
      beforeFingerprint ===
      captureLocalRuntimeFingerprint(candidateRoot)
        ? "PASS"
        : "FAIL";
    if (report.localRuntimeUnchanged === "FAIL") {
      report.ok = false;
      report.rootFailureCode = "LOCAL_RUNTIME_CHANGED";
    }
  }
}
