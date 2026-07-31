import { spawnSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { isOwnerLocalPort } from "./project004-disposable-port-reservation.ts";
import { disposableProofStageTimeoutMs } from "./project004-disposable-proof-lifecycle.ts";
import { assertProject004Workspace } from "./project004-identity.ts";
import { assertDisposableCleanupScope } from "./run-project004-clean-disposable-proof.ts";

type CleanupCandidate = {
  workdir: string;
  projectId: string;
  databasePort: number;
  modifiedAt: number;
};

export type InterruptedDisposableCleanupReport = {
  candidateCount: number;
  validatedScopeCount: number;
  selection: "NEWEST_UNIQUE" | "FAIL";
  priorRunState: "ABSENT" | "PRESENT";
  databaseReachable: "YES" | "NO";
  migrationCount: number | "NOT_AVAILABLE";
  contentCounts: string;
  lastConfirmedStage: string;
  blockedChildProcess: string;
  exactStopAttempts: number;
  allFlagUsed: "NO";
  otherCandidatesTouched: number;
  cleanup: "PASS" | "FAIL";
  rootFailureCode: string;
};

function parseCandidate(workdir: string): CleanupCandidate | null {
  const configPath = resolve(
    workdir,
    "supabase/config.toml",
  );
  if (!existsSync(configPath)) return null;
  const config = readFileSync(configPath, "utf8");
  const projectId =
    /^project_id = "(plave-project004-clean-proof-[0-9a-f]{12})"$/mu.exec(
      config,
    )?.[1];
  const databasePort = Number(
    /\[db\][\s\S]*?\nport\s*=\s*(\d+)/u.exec(config)?.[1],
  );
  if (
    !projectId ||
    !Number.isSafeInteger(databasePort) ||
    databasePort < 1024 ||
    databasePort > 65_535 ||
    isOwnerLocalPort(databasePort)
  ) {
    return null;
  }
  assertDisposableCleanupScope(workdir, projectId);
  return {
    workdir,
    projectId,
    databasePort,
    modifiedAt: statSync(workdir).mtimeMs,
  };
}

function psql(
  candidate: CleanupCandidate,
  sql: string,
) {
  const environment = { ...process.env };
  for (const key of [
    "DATABASE_URL",
    "PLAVE_LOCAL_DATABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ACCESS_TOKEN",
  ]) {
    delete environment[key];
  }
  environment.PGHOST = "127.0.0.1";
  environment.PGPORT = String(candidate.databasePort);
  environment.PGUSER = "postgres";
  environment.PGPASSWORD = "postgres";
  environment.PGDATABASE = "postgres";
  environment.PGSSLMODE = "disable";
  environment.PGCONNECT_TIMEOUT = "3";
  return spawnSync(
    "/opt/homebrew/bin/psql",
    [
      "--no-psqlrc",
      "--quiet",
      "--tuples-only",
      "--no-align",
      "--set",
      "ON_ERROR_STOP=1",
    ],
    {
      env: environment,
      input: sql,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout:
        disposableProofStageTimeoutMs.RUNTIME_HISTORY_QUERY,
    },
  );
}

function migrationCount(candidate: CleanupCandidate) {
  const result = psql(
    candidate,
    String.raw`
begin read only;
select count(*)
from supabase_migrations.schema_migrations
where version ~ '^(000[1-9]|00[12][0-9]|003[0-9]|0040)$';
commit;
`,
  );
  const value = Number(
    result.stdout
      ?.toString()
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .find((line) => /^\d+$/u.test(line)),
  );
  return result.status === 0 &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : null;
}

function contentCounts(candidate: CleanupCandidate) {
  const result = psql(
    candidate,
    String.raw`
begin read only;
select concat_ws(
  '|',
  (select count(*) from public.curriculum_release_units),
  (select count(*) from public.curriculum_release_questions),
  (select count(*) from private.curriculum_release_solutions),
  (select count(*) from public.curriculum_official_outcomes)
);
commit;
`,
  );
  const value = result.stdout
    ?.toString()
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find((line) => /^\d+\|\d+\|\d+\|\d+$/u.test(line));
  return result.status === 0 && value
    ? value
    : "NOT_AVAILABLE";
}

function exactStop(candidate: CleanupCandidate) {
  const result = spawnSync(
    "/opt/homebrew/bin/supabase",
    [
      "stop",
      "--workdir",
      candidate.workdir,
      "--project-id",
      candidate.projectId,
      "--no-backup",
      "--yes",
    ],
    {
      cwd: assertProject004Workspace(),
      env: {
        ...process.env,
        SUPABASE_TELEMETRY_DISABLED: "true",
      },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: disposableProofStageTimeoutMs.CLEANUP,
    },
  );
  if (result.status === 0) {
    rmSync(candidate.workdir, {
      recursive: true,
      force: true,
    });
  }
  return result.status === 0 && !existsSync(candidate.workdir);
}

export function runInterruptedDisposableCleanup(): InterruptedDisposableCleanupReport {
  assertProject004Workspace();
  const candidates = readdirSync(tmpdir(), {
    withFileTypes: true,
  })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name.startsWith(
          "plave-project004-clean-proof-",
        ),
    )
    .map((entry) =>
      parseCandidate(resolve(tmpdir(), entry.name)),
    )
    .filter(
      (candidate): candidate is CleanupCandidate =>
        candidate !== null,
    )
    .sort(
      (left, right) =>
        right.modifiedAt - left.modifiedAt,
    );
  const newest = candidates[0];
  const unique =
    newest !== undefined &&
    (candidates.length === 1 ||
      newest.modifiedAt -
        (candidates[1]?.modifiedAt ?? 0) >=
        60_000);
  if (!newest || !unique) {
    return {
      candidateCount: candidates.length,
      validatedScopeCount: candidates.length,
      selection: "FAIL",
      priorRunState: "ABSENT",
      databaseReachable: "NO",
      migrationCount: "NOT_AVAILABLE",
      contentCounts: "NOT_AVAILABLE",
      lastConfirmedStage: "NOT_AVAILABLE",
      blockedChildProcess: "NOT_AVAILABLE",
      exactStopAttempts: 0,
      allFlagUsed: "NO",
      otherCandidatesTouched: 0,
      cleanup: "FAIL",
      rootFailureCode:
        "INTERRUPTED_DISPOSABLE_TARGET_AMBIGUOUS",
    };
  }
  const stateMarker = resolve(
    newest.workdir,
    "supabase/.temp/project004-proof-run-state.json",
  );
  const priorRunState:
    InterruptedDisposableCleanupReport["priorRunState"] =
      existsSync(stateMarker) ? "PRESENT" : "ABSENT";
  const count = migrationCount(newest);
  const counts =
    count === 40
      ? contentCounts(newest)
      : "NOT_AVAILABLE";
  let lastConfirmedStage =
    "SUPABASE_START_OR_MIGRATION_EXECUTION";
  if (count === 40) {
    lastConfirmedStage =
      counts === "171|2052|2052|546"
        ? "CONTENT_TRANSACTION_COMMITTED"
        : "MIGRATIONS_0040_CONFIRMED_CONTENT_NOT_COMMITTED";
  } else if (count === null) {
    lastConfirmedStage =
      "DATABASE_NOT_REACHABLE_AFTER_INTERRUPT";
  }
  const before = new Set(
    candidates.slice(1).map((candidate) => candidate.workdir),
  );
  const cleanup = exactStop(newest);
  const otherCandidatesTouched = [...before].filter(
    (workdir) => !existsSync(workdir),
  ).length;
  return {
    candidateCount: candidates.length,
    validatedScopeCount: candidates.length,
    selection: "NEWEST_UNIQUE",
    priorRunState,
    databaseReachable: count === null ? "NO" : "YES",
    migrationCount: count ?? "NOT_AVAILABLE",
    contentCounts: counts,
    lastConfirmedStage,
    blockedChildProcess:
      count === null
        ? "SUPABASE_START_OR_CLEANUP"
        : counts === "171|2052|2052|546"
          ? "POST_APPLY_DIAGNOSTIC_OR_CLEANUP"
          : "SEMANTIC_FINGERPRINT_OR_CONTENT_TRANSACTION",
    exactStopAttempts: 1,
    allFlagUsed: "NO",
    otherCandidatesTouched,
    cleanup:
      cleanup && otherCandidatesTouched === 0
        ? "PASS"
        : "FAIL",
    rootFailureCode:
      cleanup && otherCandidatesTouched === 0
        ? "NONE"
        : "INTERRUPTED_DISPOSABLE_CLEANUP_FAILED",
  };
}

export function renderInterruptedDisposableCleanup(
  report: InterruptedDisposableCleanupReport,
) {
  return [
    "PROJECT004_CANONICAL=PASS",
    `DISPOSABLE_CANDIDATE_COUNT=${report.candidateCount}`,
    `VALIDATED_EXACT_SCOPE_COUNT=${report.validatedScopeCount}`,
    `TARGET_SELECTION=${report.selection}`,
    `PRIOR_RUN_STATE=${report.priorRunState}`,
    `DATABASE_REACHABLE_AFTER_INTERRUPT=${report.databaseReachable}`,
    `MIGRATION_HISTORY_COUNT=${report.migrationCount}`,
    `CURRICULUM_COUNTS=${report.contentCounts}`,
    `LAST_CONFIRMED_STAGE=${report.lastConfirmedStage}`,
    `UNRESOLVED_CHILD_STAGE=${report.blockedChildProcess}`,
    `EXACT_STOP_ATTEMPTS=${report.exactStopAttempts}`,
    `STOP_ALL_USED=${report.allFlagUsed}`,
    `OTHER_CANDIDATES_TOUCHED=${report.otherCandidatesTouched}`,
    `INTERRUPTED_RUN_CLEANUP=${report.cleanup}`,
    "DATABASE_MUTATION_PERFORMED=NO",
    "REMOTE_ACCESS_PERFORMED=NO",
    "REMOTE_MUTATION_PERFORMED=NO",
    "PROJECT003=FROZEN_UNTOUCHED",
    `ROOT_FAILURE_CODE=${report.rootFailureCode}`,
  ].join("\n") + "\n";
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  const report = runInterruptedDisposableCleanup();
  process.stdout.write(
    renderInterruptedDisposableCleanup(report),
  );
  process.exitCode = report.cleanup === "PASS" ? 0 : 1;
}
