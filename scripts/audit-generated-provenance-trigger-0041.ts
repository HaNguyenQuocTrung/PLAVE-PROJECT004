import { randomBytes } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

import { reserveDisposablePorts } from "./project004-disposable-port-reservation.ts";
import { buildDisposableConfig } from "./project004-disposable-migration-workspace.ts";
import { loadGeneratedPersistenceMigrationInventory } from "./project004-generated-persistence-migration-inventory.ts";
import { assertProject004Workspace } from "./project004-identity.ts";
import { runManagedChild } from "./project004-managed-child-process.ts";
import { assertDisposableCleanupScope, stopDisposableStack } from "./run-project004-clean-disposable-proof.ts";

const root = assertProject004Workspace();

function environment(extra: NodeJS.ProcessEnv = {}) {
  return { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, LANG: "C", LC_ALL: "C", ...extra };
}

async function psql(port: number, sql: string) {
  return runManagedChild({
    executable: "/opt/homebrew/bin/psql",
    args: ["--no-psqlrc", "--quiet", "--tuples-only", "--no-align", "--set", "ON_ERROR_STOP=1"],
    cwd: root,
    environment: environment({ PGHOST: "127.0.0.1", PGPORT: String(port), PGUSER: "postgres", PGPASSWORD: "postgres", PGDATABASE: "postgres", PGSSLMODE: "disable" }),
    input: sql,
    timeoutMs: 120_000,
    stage: "AUDIT_0041_TRIGGER_PRIVILEGE",
  });
}

async function main() {
  const projectId = `plave-project004-clean-proof-${randomBytes(6).toString("hex").slice(0, 11)}`;
  const reservation = await reserveDisposablePorts();
  const ports = reservation.ports;
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
    writeFileSync(config, buildDisposableConfig(readFileSync(config, "utf8"), projectId, ports), { mode: 0o600 });
    const inventory = loadGeneratedPersistenceMigrationInventory(root);
    const baseline = inventory.entries.filter((entry) => Number(entry.version) <= 41);
    if (baseline.length !== 41 || baseline[0]?.version !== "0001" || baseline.at(-1)?.version !== "0041") throw new Error("AUDIT_0041_INVENTORY_INVALID");
    for (const entry of baseline) copyFileSync(entry.absolutePath, resolve(migrations, entry.filename));
    await reservation.release();
    released = true;
    const started = await runManagedChild({
      executable: "/opt/homebrew/bin/supabase",
      args: ["start", "--workdir", workdir, "--exclude", "realtime,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor", "--yes"],
      cwd: root,
      environment: environment(),
      timeoutMs: 900_000,
      stage: "AUDIT_0041_SUPABASE_START",
    });
    if (!started.ok) throw new Error("AUDIT_0041_STACK_START_FAILED");
    const result = await psql(ports.database, String.raw`
select jsonb_pretty(jsonb_build_object(
  'migrationCount', (select count(*) from supabase_migrations.schema_migrations),
  'function', (select jsonb_build_object(
    'schema', n.nspname,
    'name', p.proname,
    'owner', pg_get_userbyid(p.proowner),
    'prosecdef', p.prosecdef,
    'proconfig', coalesce(to_jsonb(p.proconfig), 'null'::jsonb),
    'volatility', p.provolatile,
    'parallel', p.proparallel,
    'acl', coalesce(to_jsonb(p.proacl), '[]'::jsonb),
    'publicExecute', has_function_privilege('public', p.oid, 'EXECUTE'),
    'anonExecute', has_function_privilege('anon', p.oid, 'EXECUTE'),
    'authenticatedExecute', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
    'definition', pg_get_functiondef(p.oid)
  ) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.proname = 'enforce_generated_question_provenance'),
  'trigger', (select jsonb_build_object(
    'name', t.tgname,
    'deferrable', t.tgdeferrable,
    'initiallyDeferred', t.tginitdeferred,
    'definition', pg_get_triggerdef(t.oid, true)
  ) from pg_trigger t where t.tgname = 'curriculum_generated_question_provenance_complete' and not t.tgisinternal),
  'authenticatedTablePrivileges', jsonb_build_object(
    'generatedQuestionsSelect', has_table_privilege('authenticated', 'public.curriculum_generated_questions', 'SELECT'),
    'generatedQuestionsInsert', has_table_privilege('authenticated', 'public.curriculum_generated_questions', 'INSERT'),
    'generatedQuestionsUpdate', has_table_privilege('authenticated', 'public.curriculum_generated_questions', 'UPDATE'),
    'generatedQuestionsDelete', has_table_privilege('authenticated', 'public.curriculum_generated_questions', 'DELETE'),
    'privateSolutionsSelect', has_table_privilege('authenticated', 'private.curriculum_generated_solutions', 'SELECT')
  ),
  'rpc', (select jsonb_build_object('owner', pg_get_userbyid(p.proowner), 'prosecdef', p.prosecdef, 'proconfig', to_jsonb(p.proconfig), 'authenticatedExecute', has_function_privilege('authenticated', p.oid, 'EXECUTE'), 'definition', pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='start_or_resume_semantic_generated_curriculum')
));
`);
    if (!result.ok) throw new Error("AUDIT_0041_QUERY_FAILED");
    const audit = JSON.parse(result.stdout) as Record<string, unknown>;
    mkdirSync(resolve(root, "artifacts/generator-v2-database-proof"), { recursive: true });
    writeFileSync(resolve(root, "artifacts/generator-v2-database-proof/privilege-audit-0041-baseline.json"), `${JSON.stringify(audit, null, 2)}\n`);
    process.stdout.write("AUDIT_0041_TRIGGER=PASS\nMIGRATIONS=41/41\n");
  } finally {
    if (!released) await reservation.release();
    if (workdir) {
      const stopped = await stopDisposableStack(workdir, projectId);
      if (!stopped.ok) throw new Error("AUDIT_0041_CLEANUP_FAILED");
    }
  }
}

await main();
