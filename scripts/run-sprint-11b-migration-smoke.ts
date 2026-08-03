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
      PGHOST: "127.0.0.1",
      PGPORT: String(port),
      PGUSER: "postgres",
      PGPASSWORD: "postgres",
      PGDATABASE: "postgres",
      PGSSLMODE: "disable",
    }),
    input: sql,
    timeoutMs: 180_000,
    stage,
  });
}

async function main() {
  const inventory = loadGeneratedPersistenceMigrationInventory(root);
  if (inventory.entries.length !== 44 || inventory.entries.at(-1)?.version !== "0044") {
    throw new Error("SPRINT_11B_MIGRATION_INVENTORY_INVALID");
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
    for (const entry of inventory.entries) {
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
      stage: "SPRINT_11B_FRESH_INSTALL_44",
    });
    if (!started.ok) {
      throw new Error(`SPRINT_11B_FRESH_INSTALL_FAILED:${started.stderr.slice(0, 600)}`);
    }
    const audit = await psql(reservation.ports.database, String.raw`
do $$
declare v_summary_function text; v_refresh_function text;
begin
  if (select count(*) from supabase_migrations.schema_migrations) <> 44
    or (select max(version) from supabase_migrations.schema_migrations) <> '0044' then
    raise exception 'MIGRATION_CHAIN_INVALID';
  end if;
  select pg_get_functiondef('public.get_my_motivation_v1()'::regprocedure)
  into v_summary_function;
  select pg_get_functiondef('private.refresh_motivation_for_attempt_v1(uuid)'::regprocedure)
  into v_refresh_function;
  if v_summary_function like '%''current_streak_days'', 0%' then
    raise exception 'MOTIVATION_CURRENT_STREAK_HARDCODED_ZERO';
  end if;
  if v_refresh_function not like '%student_goal_completion_ledger%' then
    raise exception 'MOTIVATION_GOAL_LEDGER_NEVER_REFRESHED';
  end if;
  if v_refresh_function not like '%student_achievement_awards%' then
    raise exception 'MOTIVATION_ACHIEVEMENT_LEDGER_NEVER_REFRESHED';
  end if;
end $$;
select 'PASS';
`, "SPRINT_11B_RUNTIME_SEMANTICS_AUDIT");
    if (!audit.ok || audit.stdout.trim() !== "PASS") {
      throw new Error(
        `SPRINT_11B_RUNTIME_SEMANTICS_FAILED:${audit.stderr.trim().slice(0, 800)}`,
      );
    }
    process.stdout.write("SPRINT_11B_FRESH_INSTALL_44=PASS\nSPRINT_11B_RUNTIME_SEMANTICS=PASS\n");
  } finally {
    if (!released) await reservation.release();
    if (workdir) {
      const cleanup = await stopDisposableStack(workdir, projectId);
      if (!cleanup.ok) throw new Error("SPRINT_11B_DISPOSABLE_CLEANUP_FAILED");
    }
  }
}

await main();
