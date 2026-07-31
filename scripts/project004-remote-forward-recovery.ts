import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildProject004RemoteDevCurriculumSql } from "./project004-remote-dev-curriculum.ts";
import {
  captureLocalRuntimeFingerprint,
  isReadOnlySqlCommand,
} from "./project004-remote-dev-audited-runner.ts";
import {
  RemoteDevGuardFailure,
  assertLinkedTarget,
  assertLocalIsolation,
  buildRemoteDatabaseEnvironment,
  buildSupabaseCliEnvironment,
  createCanonicalRemoteDevCommandRunner,
  loadAndVerifyMigrationPlan,
  project004RemoteDevContract,
  withEphemeralLinkedProjectRef,
  type RemoteDevPrivateConfig,
  type SafeCommandResult,
} from "./project004-remote-dev-guard.ts";
import {
  loadPrefixSemanticManifest,
  verifyForwardRecoveryDryRunOutput,
} from "./project004-prefix-recovery-contract.ts";
import {
  executePrefixRecoveryReadOnlyPreflight,
  type PrefixRecoveryPreflightReport,
} from "./project004-prefix-recovery-preflight.ts";
import {
  queryRemotePostApplyCounts,
  verifyRemotePostApplyCounts,
  type RemoteDevCommandRunner,
  type RemotePostApplyCounts,
} from "./project004-remote-dev-operations.ts";

export type ForwardRecoveryCommandCounts = {
  projectList: number;
  readOnlySql: number;
  dryRun: number;
  schemaPush: number;
  schemaPushSucceeded: number;
  contentTransaction: number;
  contentTransactionSucceeded: number;
  mutation: number;
  unexpected: number;
};

export type ForwardRecoveryReport = {
  ok: boolean;
  rootFailureCode: string;
  stage:
    | "APPROVAL"
    | "LOCAL_READINESS"
    | "REMOTE_PREFLIGHT"
    | "DRY_RUN"
    | "SCHEMA_PUSH"
    | "CONTENT_TRANSACTION"
    | "POST_APPLY_DIAGNOSTIC"
    | "COMPLETE";
  currentRunMutationPerformed: "NO" | "YES" | "POSSIBLE";
  preexistingRemoteApplicationState:
    | "YES"
    | "NO"
    | "NOT_RUN";
  recoveryPreflight: PrefixRecoveryPreflightReport | null;
  dryRunMigrationCount: number | "NOT_RUN";
  dryRunFirstLast: string;
  postApplyCounts: RemotePostApplyCounts | null;
  localRuntimeUnchanged: "PASS" | "FAIL";
  commandCounts: ForwardRecoveryCommandCounts;
};

function failedCommand(): SafeCommandResult {
  return { ok: false, stdout: "", stderr: "" };
}

function fileSha256(path: string) {
  return createHash("sha256")
    .update(readFileSync(path))
    .digest("hex");
}

function exactContentApply(args: string[], contentPath: string) {
  return (
    args.length === 6 &&
    args[0] === "--no-psqlrc" &&
    args[1] === "--quiet" &&
    args[2] === "--set" &&
    args[3] === "ON_ERROR_STOP=1" &&
    args[4] === "--file" &&
    args[5] === contentPath
  );
}

export function createAuditedForwardRecoveryRunner(options: {
  delegate: RemoteDevCommandRunner;
  contentPath: string;
  contentSha256: string;
}) {
  const counts: ForwardRecoveryCommandCounts = {
    projectList: 0,
    readOnlySql: 0,
    dryRun: 0,
    schemaPush: 0,
    schemaPushSucceeded: 0,
    contentTransaction: 0,
    contentTransactionSucceeded: 0,
    mutation: 0,
    unexpected: 0,
  };
  let dryRunVerified = false;
  const runner: RemoteDevCommandRunner = (
    command,
    args,
    environment,
  ) => {
    if (
      command === "supabase" &&
      args.length === 4 &&
      args[0] === "projects" &&
      args[1] === "list" &&
      args[2] === "--output" &&
      args[3] === "json"
    ) {
      counts.projectList += 1;
      return options.delegate(command, args, environment);
    }
    if (command === "psql" && isReadOnlySqlCommand(args)) {
      counts.readOnlySql += 1;
      return options.delegate(command, args, environment);
    }
    if (
      command === "supabase" &&
      args.length === 3 &&
      args[0] === "db" &&
      args[1] === "push" &&
      args[2] === "--dry-run" &&
      counts.dryRun === 0 &&
      counts.schemaPush === 0 &&
      counts.contentTransaction === 0
    ) {
      counts.dryRun += 1;
      return options.delegate(command, args, environment);
    }
    if (
      command === "supabase" &&
      args.length === 2 &&
      args[0] === "db" &&
      args[1] === "push" &&
      dryRunVerified &&
      counts.dryRun === 1 &&
      counts.schemaPush === 0 &&
      counts.contentTransaction === 0
    ) {
      counts.schemaPush += 1;
      counts.mutation += 1;
      const result = options.delegate(command, args, environment);
      if (result.ok) counts.schemaPushSucceeded += 1;
      return result;
    }
    if (
      command === "psql" &&
      exactContentApply(args, options.contentPath) &&
      counts.schemaPush === 1 &&
      counts.schemaPushSucceeded === 1 &&
      counts.contentTransaction === 0 &&
      existsSync(options.contentPath) &&
      fileSha256(options.contentPath) === options.contentSha256
    ) {
      counts.contentTransaction += 1;
      counts.mutation += 1;
      const result = options.delegate(command, args, environment);
      if (result.ok) counts.contentTransactionSucceeded += 1;
      return result;
    }
    if (
      (command === "supabase" &&
        args[0] === "db" &&
        ["push", "reset", "pull"].includes(args[1] ?? "")) ||
      (command === "psql" && !isReadOnlySqlCommand(args))
    ) {
      counts.mutation += 1;
    }
    counts.unexpected += 1;
    return failedCommand();
  };
  return {
    runner,
    counts,
    confirmDryRun: () => {
      if (counts.dryRun !== 1 || counts.schemaPush !== 0) {
        throw new Error("FORWARD_DRY_RUN_CONFIRMATION_INVALID");
      }
      dryRunVerified = true;
    },
  };
}

function emptyCounts(): ForwardRecoveryCommandCounts {
  return {
    projectList: 0,
    readOnlySql: 0,
    dryRun: 0,
    schemaPush: 0,
    schemaPushSucceeded: 0,
    contentTransaction: 0,
    contentTransactionSucceeded: 0,
    mutation: 0,
    unexpected: 0,
  };
}

export function notRunForwardRecoveryReport(
  rootFailureCode: string,
): ForwardRecoveryReport {
  return {
    ok: false,
    rootFailureCode,
    stage: "APPROVAL",
    currentRunMutationPerformed: "NO",
    preexistingRemoteApplicationState: "NOT_RUN",
    recoveryPreflight: null,
    dryRunMigrationCount: "NOT_RUN",
    dryRunFirstLast: "NONE",
    postApplyCounts: null,
    localRuntimeUnchanged: "PASS",
    commandCounts: emptyCounts(),
  };
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

function mutationState(counts: ForwardRecoveryCommandCounts) {
  if (
    counts.schemaPushSucceeded === 1 ||
    counts.contentTransactionSucceeded === 1
  ) {
    return "YES" as const;
  }
  if (counts.schemaPush === 0 && counts.contentTransaction === 0) {
    return "NO" as const;
  }
  return "POSSIBLE" as const;
}

export function executeAuthorizedForwardRecovery(options: {
  environment: NodeJS.ProcessEnv;
  candidateRoot?: string;
  runner?: RemoteDevCommandRunner;
  preflight?: typeof executePrefixRecoveryReadOnlyPreflight;
}): ForwardRecoveryReport {
  const candidateRoot = options.candidateRoot ?? process.cwd();
  const environment = options.environment;
  if (
    environment.PLAVE_PROJECT004_REMOTE_OWNER_APPROVAL !==
    project004RemoteDevContract.forwardRecoveryApproval
  ) {
    return notRunForwardRecoveryReport(
      "FORWARD_RECOVERY_OWNER_APPROVAL_REQUIRED",
    );
  }
  let manifest: ReturnType<
    typeof loadPrefixSemanticManifest
  >["manifest"];
  try {
    manifest =
      loadPrefixSemanticManifest(candidateRoot).manifest;
  } catch {
    return notRunForwardRecoveryReport(
      "PREFIX_SEMANTIC_MANIFEST_INVALID",
    );
  }
  if (
    manifest.canonicalCatalogStatus !== "VERIFIED" ||
    manifest.freshLocalIntegration.migration0039 !== "PASS" ||
    manifest.freshLocalIntegration.migration0040 !== "PASS" ||
    manifest.recoveryAuthorization !== "NOT_AUTHORIZED"
  ) {
    const report = notRunForwardRecoveryReport(
      "PREFIX_RECOVERY_NOT_VERIFIED",
    );
    report.stage = "LOCAL_READINESS";
    return report;
  }

  const beforeFingerprint =
    captureLocalRuntimeFingerprint(candidateRoot);
  let content: ReturnType<
    typeof buildProject004RemoteDevCurriculumSql
  >;
  try {
    content = buildProject004RemoteDevCurriculumSql();
  } catch {
    return notRunForwardRecoveryReport(
      "REMOTE_CONTENT_SOURCE_INVALID",
    );
  }
  const temporaryDirectory = mkdtempSync(
    join(tmpdir(), "plave-project004-forward-recovery-"),
  );
  const contentPath = join(
    temporaryDirectory,
    "canonical-curriculum-draft.sql",
  );
  writeFileSync(contentPath, content.sql, {
    encoding: "utf8",
    mode: 0o600,
  });
  const audited = createAuditedForwardRecoveryRunner({
    delegate:
      options.runner ??
      createCanonicalRemoteDevCommandRunner(candidateRoot),
    contentPath,
    contentSha256: createHash("sha256")
      .update(content.sql)
      .digest("hex"),
  });
  const report = notRunForwardRecoveryReport(
    "FORWARD_RECOVERY_FAILED",
  );
  report.commandCounts = audited.counts;
  report.stage = "REMOTE_PREFLIGHT";
  try {
    const preflight =
      options.preflight ??
      executePrefixRecoveryReadOnlyPreflight;
    const initial = preflight({
      environment,
      candidateRoot,
      runner: audited.runner,
    });
    report.recoveryPreflight = initial;
    report.preexistingRemoteApplicationState =
      initial.preexistingRemoteApplicationState;
    if (
      !initial.ok ||
      initial.partialStateRecoveryEligible !== "YES"
    ) {
      report.rootFailureCode =
        initial.rootFailureCode ||
        "PREFIX_RECOVERY_NOT_ELIGIBLE";
      return report;
    }

    const { plan } =
      loadAndVerifyMigrationPlan(candidateRoot);
    const config = configFromEnvironment(environment);
    const root = assertLocalIsolation(config, candidateRoot);
    const cliEnvironment = {
      ...buildSupabaseCliEnvironment(environment),
      SUPABASE_DB_PASSWORD: config.databasePassword,
    };
    report.stage = "DRY_RUN";
    withEphemeralLinkedProjectRef(
      root,
      config.projectRef,
      () => {
        assertLinkedTarget(root, config);
        const dryRun = audited.runner(
          "supabase",
          ["db", "push", "--dry-run"],
          cliEnvironment,
        );
        if (!dryRun.ok) {
          throw new RemoteDevGuardFailure(
            "FORWARD_DRY_RUN_COMMAND_FAILED",
          );
        }
        const verified = verifyForwardRecoveryDryRunOutput(
          `${dryRun.stdout}\n${dryRun.stderr}`,
          plan,
        );
        report.dryRunMigrationCount = verified.count;
        report.dryRunFirstLast =
          `${verified.first}/${verified.last}`;
        audited.confirmDryRun();

        report.stage = "REMOTE_PREFLIGHT";
        const confirmation = preflight({
          environment,
          candidateRoot,
          runner: audited.runner,
        });
        if (
          !confirmation.ok ||
          confirmation.partialStateRecoveryEligible !== "YES" ||
          confirmation.incident?.migration?.count !== 38
        ) {
          throw new RemoteDevGuardFailure(
            "FORWARD_RECOVERY_PRECONDITION_CHANGED",
          );
        }

        report.stage = "SCHEMA_PUSH";
        const schemaPush = audited.runner(
          "supabase",
          ["db", "push"],
          cliEnvironment,
        );
        if (!schemaPush.ok) {
          throw new RemoteDevGuardFailure(
            "FORWARD_SCHEMA_PUSH_FAILED",
          );
        }
      },
    );

    report.currentRunMutationPerformed = "YES";
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
      buildRemoteDatabaseEnvironment(config, environment),
    );
    if (!contentApply.ok) {
      report.rootFailureCode =
        "FORWARD_CONTENT_TRANSACTION_FAILED";
      return report;
    }

    report.stage = "POST_APPLY_DIAGNOSTIC";
    const counts = queryRemotePostApplyCounts(
      config,
      environment,
      audited.runner,
    );
    verifyRemotePostApplyCounts(counts);
    report.postApplyCounts = counts;
    if (
      audited.counts.dryRun !== 1 ||
      audited.counts.schemaPush !== 1 ||
      audited.counts.schemaPushSucceeded !== 1 ||
      audited.counts.contentTransaction !== 1 ||
      audited.counts.contentTransactionSucceeded !== 1 ||
      audited.counts.unexpected !== 0
    ) {
      report.rootFailureCode =
        "FORWARD_UNEXPECTED_OPERATION_DETECTED";
      return report;
    }
    report.ok = true;
    report.stage = "COMPLETE";
    report.rootFailureCode = "NONE";
    return report;
  } catch (error) {
    report.currentRunMutationPerformed = mutationState(
      audited.counts,
    );
    report.rootFailureCode =
      error instanceof RemoteDevGuardFailure
        ? error.code
        : error instanceof Error
          ? error.message
          : "FORWARD_RECOVERY_FAILED";
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
