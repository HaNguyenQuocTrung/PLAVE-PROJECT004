import { randomBytes } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { reserveDisposablePorts } from "./project004-disposable-port-reservation.ts";
import { buildDisposableConfig } from "./project004-disposable-migration-workspace.ts";
import { loadGeneratedPersistenceMigrationInventory } from "./project004-generated-persistence-migration-inventory.ts";
import { assertProject004Workspace } from "./project004-identity.ts";
import { runManagedChild } from "./project004-managed-child-process.ts";
import { assertDisposableCleanupScope, stopDisposableStack } from "./run-project004-clean-disposable-proof.ts";

const root = assertProject004Workspace();

function environment(extra: NodeJS.ProcessEnv = {}) {
  return {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR,
    LANG: "C",
    LC_ALL: "C",
    ...extra,
  };
}

async function psql(port: number, sql: string, stage: string) {
  return runManagedChild({
    executable: "/opt/homebrew/bin/psql",
    args: [
      "--no-psqlrc", "--quiet", "--tuples-only", "--no-align",
      "--set", "ON_ERROR_STOP=1", "--set", "VERBOSITY=terse",
    ],
    cwd: root,
    environment: environment({
      PGHOST: "127.0.0.1", PGPORT: String(port), PGUSER: "postgres",
      PGPASSWORD: "postgres", PGDATABASE: "postgres", PGSSLMODE: "disable",
    }),
    input: sql,
    timeoutMs: 180_000,
    stage,
  });
}

async function main() {
  const inventory = loadGeneratedPersistenceMigrationInventory(root);
  const migration0043 = inventory.entries.at(-1)!;
  if (inventory.entries.length !== 43 || migration0043.version !== "0043") {
    throw new Error("SPRINT_11A_UPGRADE_INVENTORY_INVALID");
  }
  const reservation = await reserveDisposablePorts();
  const projectId = `plave-project004-clean-proof-${randomBytes(6).toString("hex")}`;
  let released = false;
  let workdir = "";
  try {
    workdir = mkdtempSync(resolve(tmpdir(), "plave-project004-clean-proof-"));
    assertDisposableCleanupScope(workdir, projectId);
    const supabase = resolve(workdir, "supabase");
    const migrations = resolve(supabase, "migrations");
    mkdirSync(migrations, { recursive: true, mode: 0o700 });
    const config = resolve(supabase, "config.toml");
    copyFileSync(resolve(root, "supabase/config.toml"), config);
    writeFileSync(
      config,
      buildDisposableConfig(readFileSync(config, "utf8"), projectId, reservation.ports),
      { mode: 0o600 },
    );
    for (const entry of inventory.entries.slice(0, 42)) {
      copyFileSync(entry.absolutePath, resolve(migrations, entry.filename));
    }
    await reservation.release();
    released = true;
    const started = await runManagedChild({
      executable: "/opt/homebrew/bin/supabase",
      args: [
        "start", "--workdir", workdir, "--exclude",
        "realtime,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor",
        "--yes",
      ],
      cwd: root,
      environment: environment(),
      timeoutMs: 900_000,
      stage: "SPRINT_11A_UPGRADE_BASELINE_42",
    });
    if (!started.ok) throw new Error("SPRINT_11A_UPGRADE_BASELINE_FAILED");
    const source = readFileSync(migration0043.absolutePath, "utf8");
    const injected = source.replace(
      /\ncommit;\s*$/u,
      "\nselect 1 / 0; -- TEST_ONLY_SPRINT_11A_0043_ROLLBACK\ncommit;\n",
    );
    if (injected === source) throw new Error("SPRINT_11A_0043_COMMIT_BOUNDARY_MISSING");
    const failed = await psql(
      reservation.ports.database,
      injected,
      "SPRINT_11A_0043_FAILURE_INJECTION",
    );
    if (
      failed.ok ||
      !`${failed.stdout}\n${failed.stderr}`.includes(
        "division by zero",
      )
    ) {
      throw new Error(
        `SPRINT_11A_0043_FAILURE_NOT_OBSERVED:ok=${String(failed.ok)}:` +
        `${failed.stdout.slice(-180)}:${failed.stderr.slice(-180)}`,
      );
    }
    const rollback = await psql(reservation.ports.database, String.raw`
do $$ begin
  if (select count(*) from supabase_migrations.schema_migrations) <> 42 then
    raise exception 'ROLLBACK_MIGRATION_HISTORY_CHANGED';
  end if;
  if to_regclass('private.student_xp_ledger') is not null
    or to_regclass('private.student_mastery_evidence') is not null
    or to_regclass('private.student_outcome_mastery') is not null then
    raise exception 'ROLLBACK_SCORING_TABLE_SURVIVED';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='curriculum_attempts'
      and column_name='scoring_policy_version'
  ) then raise exception 'ROLLBACK_ATTEMPT_COLUMN_SURVIVED'; end if;
end $$;
select 'PASS';`, "SPRINT_11A_0043_ROLLBACK_AUDIT");
    if (!rollback.ok || rollback.stdout.trim() !== "PASS") {
      throw new Error("SPRINT_11A_0043_ROLLBACK_AUDIT_FAILED");
    }
    copyFileSync(migration0043.absolutePath, resolve(migrations, migration0043.filename));
    const upgraded = await runManagedChild({
      executable: "/opt/homebrew/bin/supabase",
      args: ["migration", "up", "--local", "--workdir", workdir],
      cwd: root,
      environment: environment(),
      timeoutMs: 300_000,
      stage: "SPRINT_11A_UPGRADE_42_TO_43",
    });
    if (!upgraded.ok) {
      throw new Error(`SPRINT_11A_UPGRADE_APPLY_FAILED:${upgraded.stderr.slice(0, 500)}`);
    }
    const after = await psql(reservation.ports.database, String.raw`
do $$ begin
  if (select count(*) from supabase_migrations.schema_migrations) <> 43
    or (select max(version) from supabase_migrations.schema_migrations) <> '0043' then
    raise exception 'UPGRADE_BOUNDARY_INVALID';
  end if;
  if to_regclass('private.student_xp_ledger') is null
    or to_regprocedure('public.get_my_score_xp_mastery()') is null then
    raise exception 'UPGRADE_CONTRACT_MISSING';
  end if;
end $$;
select 'PASS';`, "SPRINT_11A_UPGRADE_AFTER_AUDIT");
    if (!after.ok || after.stdout.trim() !== "PASS") {
      throw new Error("SPRINT_11A_UPGRADE_AFTER_AUDIT_FAILED");
    }
    process.stdout.write(
      "SPRINT_11A_UPGRADE_42_TO_43=PASS\n" +
      "SPRINT_11A_FAILURE_INJECTION_ROLLBACK=PASS\n",
    );
  } finally {
    if (!released) await reservation.release();
    if (workdir) {
      const cleanup = await stopDisposableStack(workdir, projectId);
      if (!cleanup.ok) throw new Error("SPRINT_11A_UPGRADE_CLEANUP_FAILED");
    }
  }
}

await main();
