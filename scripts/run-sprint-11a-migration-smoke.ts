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
  if (inventory.entries.length !== 43 || inventory.entries.at(-1)?.version !== "0043") {
    throw new Error("SPRINT_11A_MIGRATION_INVENTORY_INVALID");
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
      stage: "SPRINT_11A_FRESH_INSTALL_43",
    });
    if (!started.ok) {
      throw new Error(`SPRINT_11A_FRESH_INSTALL_FAILED:${started.stderr.slice(0, 600)}`);
    }
    const audit = await psql(reservation.ports.database, String.raw`
do $$
begin
  if (select count(*) from supabase_migrations.schema_migrations) <> 43 then
    raise exception 'MIGRATION_COUNT_INVALID';
  end if;
  if (select max(version) from supabase_migrations.schema_migrations) <> '0043' then
    raise exception 'MIGRATION_LAST_INVALID';
  end if;
  if to_regclass('private.student_xp_ledger') is null
    or to_regclass('private.student_mastery_evidence') is null
    or to_regclass('private.student_outcome_mastery') is null then
    raise exception 'SCORING_TABLE_MISSING';
  end if;
  if to_regprocedure('public.get_my_score_xp_mastery()') is null then
    raise exception 'SCORING_RPC_MISSING';
  end if;
  if has_table_privilege('authenticated', 'private.student_xp_ledger', 'INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated', 'private.student_mastery_evidence', 'INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated', 'private.student_outcome_mastery', 'INSERT,UPDATE,DELETE') then
    raise exception 'DIRECT_SCORING_MUTATION_ALLOWED';
  end if;
end $$;
select 'PASS';
`, "SPRINT_11A_SCHEMA_AUDIT");
    if (!audit.ok || audit.stdout.trim() !== "PASS") {
      throw new Error(`SPRINT_11A_SCHEMA_AUDIT_FAILED:${audit.stderr.slice(0, 600)}`);
    }
    process.stdout.write("SPRINT_11A_FRESH_INSTALL_43=PASS\nSPRINT_11A_SCHEMA_AUDIT=PASS\n");
  } finally {
    if (!released) await reservation.release();
    if (workdir) {
      const cleanup = await stopDisposableStack(workdir, projectId);
      if (!cleanup.ok) throw new Error("SPRINT_11A_DISPOSABLE_CLEANUP_FAILED");
    }
  }
}

await main();
