import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
  createCanonicalRemoteDevCommandRunner,
  runCapturedCommand,
  withEphemeralRemoteCliMetadata,
  type SafeCommandResult,
} from "./project004-remote-dev-guard.ts";
import { resolvedRemotePoolerUrl } from "./project004-remote-connectivity-resolver.ts";
import {
  Project004DryRunParserError,
  executeGuardedDryRun,
  runRemoteDevPreflight,
  toRemoteDevRootFailureCode,
  type RemoteDevCommandRunner,
  type RemoteEmptyCounts,
} from "./project004-remote-dev-operations.ts";

export type AuditedCommandCounts = {
  projectList: number;
  readOnlySql: number;
  guardedLink: number;
  dryRun: number;
  destructive: number;
  unexpected: number;
};

function failedCommand(): SafeCommandResult {
  return { ok: false, stdout: "", stderr: "" };
}

function stripSqlCommentsAndStrings(sql: string) {
  return sql
    .replace(/--[^\n]*(?:\n|$)/gu, "\n")
    .replace(/\/[*][\s\S]*?[*]\//gu, " ")
    .replace(/'(?:''|[^'])*'/gu, "''");
}

export function isReadOnlySqlCommand(args: string[]) {
  const commandIndex = args.indexOf("--command");
  const sql = commandIndex >= 0 ? args[commandIndex + 1] ?? "" : "";
  const executableSql = stripSqlCommentsAndStrings(sql);
  return (
    commandIndex >= 0 &&
    /\bbegin\s+read\s+only\s*;/iu.test(executableSql) &&
    !/\b(?:insert|update|delete|truncate|alter|create|drop|grant|revoke|copy|call)\b/iu.test(
      executableSql,
    )
  );
}

export type ApplyOnceCommandCounts = AuditedCommandCounts & {
  schemaPush: number;
  schemaPushSucceeded: number;
  contentTransaction: number;
  contentTransactionSucceeded: number;
};

export type IncidentAuditCommandCounts = {
  projectList: number;
  readOnlySql: number;
  mutation: number;
  unexpected: number;
};

export function createAuditedRemoteIncidentRunner(
  delegate: RemoteDevCommandRunner = runCapturedCommand,
) {
  const counts: IncidentAuditCommandCounts = {
    projectList: 0,
    readOnlySql: 0,
    mutation: 0,
    unexpected: 0,
  };
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
      return delegate(command, args, environment);
    }
    if (command === "psql" && isReadOnlySqlCommand(args)) {
      counts.readOnlySql += 1;
      return delegate(command, args, environment);
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
  return { runner, counts };
}

function exactContentApply(
  args: string[],
  contentPath: string,
) {
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

export function createAuditedRemoteDevApplyOnceRunner(options: {
  delegate?: RemoteDevCommandRunner;
  contentPath: string;
  contentSha256: string;
}) {
  const delegate = options.delegate ?? runCapturedCommand;
  const counts: ApplyOnceCommandCounts = {
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
      return delegate(command, args, environment);
    }
    if (command === "psql" && isReadOnlySqlCommand(args)) {
      counts.readOnlySql += 1;
      return delegate(command, args, environment);
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
      return delegate(command, args, environment);
    }
    if (
      command === "supabase" &&
      args.length === 2 &&
      args[0] === "db" &&
      args[1] === "push" &&
      counts.dryRun === 1 &&
      counts.schemaPush === 0 &&
      counts.contentTransaction === 0
    ) {
      counts.schemaPush += 1;
      counts.destructive += 1;
      const result = delegate(command, args, environment);
      if (result.ok) counts.schemaPushSucceeded += 1;
      return result;
    }
    if (
      command === "psql" &&
      exactContentApply(args, options.contentPath) &&
      counts.dryRun === 1 &&
      counts.schemaPush === 1 &&
      counts.schemaPushSucceeded === 1 &&
      counts.contentTransaction === 0 &&
      existsSync(options.contentPath) &&
      fileFingerprint(options.contentPath) ===
        options.contentSha256
    ) {
      counts.contentTransaction += 1;
      counts.destructive += 1;
      const result = delegate(command, args, environment);
      if (result.ok) counts.contentTransactionSucceeded += 1;
      return result;
    }

    if (
      (command === "supabase" &&
        args[0] === "db" &&
        ["push", "reset"].includes(args[1] ?? "")) ||
      (command === "psql" && !isReadOnlySqlCommand(args))
    ) {
      counts.destructive += 1;
    }
    counts.unexpected += 1;
    return failedCommand();
  };

  return { runner, counts };
}

export function createAuditedRemoteDevRunner(
  delegate: RemoteDevCommandRunner = runCapturedCommand,
) {
  const counts: AuditedCommandCounts = {
    projectList: 0,
    readOnlySql: 0,
    guardedLink: 0,
    dryRun: 0,
    destructive: 0,
    unexpected: 0,
  };

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
      return delegate(command, args, environment);
    }
    if (
      command === "psql" &&
      isReadOnlySqlCommand(args)
    ) {
      counts.readOnlySql += 1;
      return delegate(command, args, environment);
    }
    if (
      command === "supabase" &&
      args.length === 3 &&
      args[0] === "db" &&
      args[1] === "push" &&
      args[2] === "--dry-run"
    ) {
      counts.dryRun += 1;
      if (counts.dryRun > 1) {
        counts.unexpected += 1;
        return failedCommand();
      }
      return delegate(command, args, environment);
    }

    if (
      command === "supabase" &&
      args[0] === "db" &&
      ["push", "reset"].includes(args[1] ?? "")
    ) {
      counts.destructive += 1;
    }
    if (
      command === "psql" &&
      !isReadOnlySqlCommand(args)
    ) {
      counts.destructive += 1;
    }
    counts.unexpected += 1;
    return failedCommand();
  };

  return { runner, counts };
}

function fileFingerprint(path: string) {
  if (!existsSync(path)) return "ABSENT";
  return createHash("sha256")
    .update(readFileSync(path))
    .digest("hex");
}

export function captureLocalRuntimeFingerprint(
  root = process.cwd(),
) {
  const paths = [
    resolve(root, ".env.local"),
    resolve(root, "next.config.ts"),
    resolve(root, "supabase/config.toml"),
    join(
      tmpdir(),
      "plave-project004-owner-local-demo.state.json",
    ),
  ];
  return paths.map(fileFingerprint).join("|");
}

export type AuthorizedDryRunReport = {
  remoteIdentityGuard: boolean;
  emptyRemoteState: boolean;
  localMigrationChecksums: boolean;
  cleanDisposableProof: boolean;
  migrationCount: number;
  firstMigration: string;
  lastMigration: string;
  destructiveOrUnexpectedOperationCount: number;
  localRuntimeUnchanged: boolean;
  remoteMutationPerformed: false;
  commandCounts: AuditedCommandCounts;
  baselineCounts: RemoteEmptyCounts;
  remoteDatabaseEndpointMode: "DIRECT" | "POOLER_SESSION";
};

export function executeAuthorizedRemoteDevDryRun(options: {
  environment: NodeJS.ProcessEnv;
  runner?: RemoteDevCommandRunner;
  candidateRoot?: string;
}) {
  const candidateRoot = options.candidateRoot ?? process.cwd();
  const beforeFingerprint =
    captureLocalRuntimeFingerprint(candidateRoot);
  const audited = createAuditedRemoteDevRunner(
    options.runner ??
      createCanonicalRemoteDevCommandRunner(candidateRoot),
  );
  const preflight = runRemoteDevPreflight({
    environment: options.environment,
    candidateRoot,
    runner: audited.runner,
  });
  if (
    !preflight.ok ||
    !preflight.counts ||
    !preflight.resolvedEndpoint
  ) {
    return {
      ok: false as const,
      preflight,
      counts: audited.counts,
      failureCode:
        preflight.failureCode ?? "UNCLASSIFIED_FAILURE",
      stage: "PREFLIGHT" as const,
    };
  }

  let dryRun: ReturnType<typeof executeGuardedDryRun>;
  try {
    const projectRef =
      options.environment
        .PLAVE_PROJECT004_REMOTE_PROJECT_REF ?? "";
    dryRun = withEphemeralRemoteCliMetadata(
      candidateRoot,
      {
        projectRef,
        passwordlessPoolerUrl: resolvedRemotePoolerUrl(
          {
            projectName:
              options.environment
                .PLAVE_PROJECT004_REMOTE_TARGET_NAME ?? "",
            projectRef,
            databasePassword:
              options.environment
                .PLAVE_PROJECT004_REMOTE_DB_PASSWORD ?? "",
            environmentClass:
              options.environment
                .PLAVE_PROJECT004_REMOTE_ENVIRONMENT_CLASS ?? "",
          },
          preflight.resolvedEndpoint,
        ),
      },
      () =>
        executeGuardedDryRun({
          environment: options.environment,
          candidateRoot,
          runner: audited.runner,
          preflight,
        }),
    );
  } catch (error) {
    return {
      ok: false as const,
      preflight,
      counts: audited.counts,
      failureCode:
        error instanceof Error
          ? toRemoteDevRootFailureCode(error.message)
          : "UNCLASSIFIED_FAILURE",
      parserEvidence:
        error instanceof Project004DryRunParserError
          ? error.evidence
          : null,
      stage: "DRY_RUN" as const,
    };
  }
  const afterFingerprint =
    captureLocalRuntimeFingerprint(candidateRoot);
  const destructiveOrUnexpectedOperationCount =
    audited.counts.destructive + audited.counts.unexpected;
  const report: AuthorizedDryRunReport = {
    remoteIdentityGuard:
      preflight.checks.REMOTE_TARGET_GUARD &&
      preflight.checks.REMOTE_PROJECT_IDENTITY,
    emptyRemoteState: preflight.checks.REMOTE_EMPTY,
    localMigrationChecksums:
      preflight.checks.LOCAL_MIGRATIONS_0001_0040,
    cleanDisposableProof:
      preflight.checks.CLEAN_DISPOSABLE_PROOF,
    migrationCount: dryRun.migrationCount,
    firstMigration: dryRun.firstMigration,
    lastMigration: dryRun.lastMigration,
    destructiveOrUnexpectedOperationCount,
    localRuntimeUnchanged:
      beforeFingerprint === afterFingerprint,
    remoteMutationPerformed: false,
    commandCounts: audited.counts,
    baselineCounts: preflight.counts,
    remoteDatabaseEndpointMode:
      preflight.resolvedEndpoint.mode,
  };
  if (
    !report.remoteIdentityGuard ||
    !report.emptyRemoteState ||
    !report.localMigrationChecksums ||
    !report.cleanDisposableProof ||
    report.migrationCount !== 40 ||
    report.firstMigration !== "0001" ||
    report.lastMigration !== "0040" ||
    report.destructiveOrUnexpectedOperationCount !== 0 ||
    !report.localRuntimeUnchanged ||
    report.commandCounts.dryRun !== 1
  ) {
    return {
      ok: false as const,
      preflight,
      counts: audited.counts,
      failureCode:
        report.destructiveOrUnexpectedOperationCount !== 0
          ? "UNEXPECTED_OPERATION_DETECTED"
          : !report.localRuntimeUnchanged
            ? "LOCAL_RUNTIME_CHANGED"
            : "DRY_RUN_OUTPUT_UNRECOGNIZED",
      stage: "VALIDATION" as const,
    };
  }
  return { ok: true as const, report };
}
