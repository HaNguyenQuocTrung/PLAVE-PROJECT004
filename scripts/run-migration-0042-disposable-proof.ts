import { createHash, randomBytes } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

import { reserveDisposablePorts } from "./project004-disposable-port-reservation.ts";
import { buildDisposableConfig } from "./project004-disposable-migration-workspace.ts";
import { generatedPersistenceMigrationBoundary, loadGeneratedPersistenceMigrationInventory } from "./project004-generated-persistence-migration-inventory.ts";
import { assertProject004Workspace } from "./project004-identity.ts";
import { runManagedChild } from "./project004-managed-child-process.ts";
import { assertDisposableCleanupScope, stopDisposableStack } from "./run-project004-clean-disposable-proof.ts";

const root = assertProject004Workspace();
const artifact = resolve(root, "artifacts/generator-v2-database-proof/privilege-audit.json");

function environment(extra: NodeJS.ProcessEnv = {}) {
  return { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, LANG: "C", LC_ALL: "C", ...extra };
}

async function psql(port: number, sql: string, stage: string) {
  return runManagedChild({
    executable: "/opt/homebrew/bin/psql",
    args: ["--no-psqlrc", "--quiet", "--tuples-only", "--no-align", "--set", "ON_ERROR_STOP=1", "--set", "VERBOSITY=terse"],
    cwd: root,
    environment: environment({ PGHOST: "127.0.0.1", PGPORT: String(port), PGUSER: "postgres", PGPASSWORD: "postgres", PGDATABASE: "postgres", PGSSLMODE: "disable" }),
    input: sql,
    timeoutMs: 180_000,
    stage,
  });
}

function auditSql(label: string) {
  return String.raw`select jsonb_build_object(
    'label', ${`'${label}'`},
    'migrationCount', (select count(*) from supabase_migrations.schema_migrations),
    'migrationFirst', (select min(version) from supabase_migrations.schema_migrations),
    'migrationLast', (select max(version) from supabase_migrations.schema_migrations),
    'owner', pg_get_userbyid(p.proowner),
    'prosecdef', p.prosecdef,
    'proconfig', to_jsonb(p.proconfig),
    'volatility', p.provolatile,
    'publicExecute', has_function_privilege('public', p.oid, 'EXECUTE'),
    'anonExecute', has_function_privilege('anon', p.oid, 'EXECUTE'),
    'authenticatedExecute', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
    'triggerDeferrable', t.tgdeferrable,
    'triggerInitiallyDeferred', t.tginitdeferred,
    'triggerDefinition', pg_get_triggerdef(t.oid, true),
    'generatedQuestionsSelect', has_table_privilege('authenticated', 'public.curriculum_generated_questions', 'SELECT'),
    'generatedQuestionsInsert', has_table_privilege('authenticated', 'public.curriculum_generated_questions', 'INSERT'),
    'generatedQuestionsUpdate', has_table_privilege('authenticated', 'public.curriculum_generated_questions', 'UPDATE'),
    'generatedQuestionsDelete', has_table_privilege('authenticated', 'public.curriculum_generated_questions', 'DELETE'),
    'privateSolutionsSelect', has_table_privilege('authenticated', 'private.curriculum_generated_solutions', 'SELECT'),
    'definition', pg_get_functiondef(p.oid)
  ) from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_trigger t on t.tgfoid=p.oid and t.tgname='curriculum_generated_question_provenance_complete' where n.nspname='private' and p.proname='enforce_generated_question_provenance';`;
}

async function main() {
  const inventory = loadGeneratedPersistenceMigrationInventory(root);
  if (inventory.entries.length !== 42 || inventory.entries.at(-1)?.sha256 !== generatedPersistenceMigrationBoundary.migration0042Sha256) throw new Error("MIGRATION_0042_INVENTORY_INVALID");
  const baselineChecksums = inventory.entries.slice(0, 41).map((entry) => ({ version: entry.version, sha256: entry.sha256 }));
  const projectId = `plave-project004-clean-proof-${randomBytes(6).toString("hex").slice(0, 11)}`;
  const reservation = await reserveDisposablePorts();
  const ports = reservation.ports;
  let released = false;
  let workdir = "";
  let cleanup = false;
  let proof: Record<string, unknown> | null = null;
  try {
    workdir = mkdtempSync(resolve(tmpdir(), "plave-project004-clean-proof-"));
    assertDisposableCleanupScope(workdir, projectId);
    const supabase = resolve(workdir, "supabase");
    const migrations = resolve(supabase, "migrations");
    mkdirSync(migrations, { recursive: true, mode: 0o700 });
    const config = resolve(supabase, "config.toml");
    copyFileSync(resolve(root, "supabase/config.toml"), config);
    writeFileSync(config, buildDisposableConfig(readFileSync(config, "utf8"), projectId, ports), { mode: 0o600 });
    for (const entry of inventory.entries.slice(0, 41)) copyFileSync(entry.absolutePath, resolve(migrations, entry.filename));
    await reservation.release();
    released = true;
    const started = await runManagedChild({ executable: "/opt/homebrew/bin/supabase", args: ["start", "--workdir", workdir, "--exclude", "realtime,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor", "--yes"], cwd: root, environment: environment(), timeoutMs: 900_000, stage: "MIGRATION_0042_UPGRADE_BASELINE_START" });
    if (!started.ok) throw new Error("MIGRATION_0042_BASELINE_START_FAILED");
    const beforeResult = await psql(ports.database, auditSql("BEFORE_0042"), "MIGRATION_0042_AUDIT_BEFORE");
    if (!beforeResult.ok) throw new Error("MIGRATION_0042_AUDIT_BEFORE_FAILED");
    const before = JSON.parse(beforeResult.stdout) as Record<string, unknown>;
    const migration0042Sql = readFileSync(inventory.entries[41]!.absolutePath, "utf8");
    const injectedMigration0042Sql = migration0042Sql.replace(
      /\ncommit;\s*$/u,
      "\n\\echo TEST_ONLY_MIGRATION_0042_REACHED\ndo $$ begin raise exception 'TEST_ONLY_MIGRATION_0042_FAILURE'; end $$;\ncommit;\n",
    );
    if (injectedMigration0042Sql === migration0042Sql) throw new Error("MIGRATION_0042_COMMIT_BOUNDARY_NOT_FOUND");
    const injectedFailure = await psql(
      ports.database,
      injectedMigration0042Sql,
      "MIGRATION_0042_FAILURE_INJECTION",
    );
    if (injectedFailure.ok || !injectedFailure.stdout.includes("TEST_ONLY_MIGRATION_0042_REACHED")) {
      throw new Error("MIGRATION_0042_FAILURE_INJECTION_NOT_OBSERVED");
    }
    const rollbackCheck = await psql(ports.database, String.raw`
do $$
begin
  if (
    select p.prosecdef
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname = 'enforce_generated_question_provenance'
  ) then
    raise exception 'TRIGGER_PRIVILEGE_CHANGE_SURVIVED_ROLLBACK';
  end if;
  if to_regprocedure(
    'public.start_or_resume_semantic_generated_curriculum(jsonb,text,uuid)'
  ) is null then
    raise exception 'PUBLIC_RPC_RENAME_SURVIVED_ROLLBACK';
  end if;
  if to_regprocedure(
    'private.start_or_resume_semantic_generated_curriculum_0041_impl(jsonb,text,uuid)'
  ) is not null then
    raise exception 'PRIVATE_RPC_MOVE_SURVIVED_ROLLBACK';
  end if;
  if (select count(*) from supabase_migrations.schema_migrations) <> 41 then
    raise exception 'MIGRATION_HISTORY_CHANGED_DURING_ROLLBACK';
  end if;
end $$;
select 'PASS';
`, "MIGRATION_0042_FAILURE_ROLLBACK_CHECK");
    if (!rollbackCheck.ok || rollbackCheck.stdout.trim() !== "PASS") {
      throw new Error("MIGRATION_0042_FAILURE_ROLLBACK_FAILED");
    }
    copyFileSync(inventory.entries[41]!.absolutePath, resolve(migrations, inventory.entries[41]!.filename));
    const upgraded = await runManagedChild({ executable: "/opt/homebrew/bin/supabase", args: ["migration", "up", "--local", "--workdir", workdir], cwd: root, environment: environment(), timeoutMs: 300_000, stage: "MIGRATION_0042_UPGRADE_APPLY" });
    if (!upgraded.ok) throw new Error(`MIGRATION_0042_UPGRADE_APPLY_FAILED_${upgraded.stderr.slice(0, 120)}`);
    const afterResult = await psql(ports.database, auditSql("AFTER_0042"), "MIGRATION_0042_AUDIT_AFTER");
    if (!afterResult.ok) throw new Error("MIGRATION_0042_AUDIT_AFTER_FAILED");
    const after = JSON.parse(afterResult.stdout) as Record<string, unknown>;
    const negative = await psql(ports.database, String.raw`
do $$ begin
  if has_function_privilege('public', 'private.enforce_generated_question_provenance()', 'EXECUTE') or has_function_privilege('anon', 'private.enforce_generated_question_provenance()', 'EXECUTE') or has_function_privilege('authenticated', 'private.enforce_generated_question_provenance()', 'EXECUTE') then raise exception 'EXECUTE_BOUNDARY_WEAK'; end if;
  if has_table_privilege('authenticated', 'public.curriculum_generated_questions', 'SELECT,INSERT,UPDATE,DELETE') then raise exception 'TABLE_BOUNDARY_WEAK'; end if;
  if has_table_privilege('authenticated', 'private.curriculum_generated_solutions', 'SELECT') then raise exception 'PRIVATE_BOUNDARY_WEAK'; end if;
end $$;
begin;
create schema test_only_shadow;
create table test_only_shadow.curriculum_generated_questions (attempt_id uuid, question_id text, question_source text);
set local search_path = test_only_shadow, public, private;
do $$ declare v_definition text; begin select pg_get_functiondef(p.oid) into v_definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='enforce_generated_question_provenance'; if v_definition not like '%SET search_path TO ''''%' or v_definition not like '%public.curriculum_generated_questions%' or v_definition not like '%pg_catalog.current_setting%' then raise exception 'SEARCH_PATH_NOT_PINNED'; end if; end $$;
rollback;
select 'PASS';
`, "MIGRATION_0042_SECURITY_NEGATIVE_CONTROLS");
    if (!negative.ok || negative.stdout.trim() !== "PASS") throw new Error("MIGRATION_0042_SECURITY_NEGATIVE_CONTROLS_FAILED");
    if (before.migrationCount !== 41 || before.prosecdef !== false || after.migrationCount !== 42 || after.migrationLast !== "0042" || after.owner !== "postgres" || after.prosecdef !== true || after.publicExecute !== false || after.anonExecute !== false || after.authenticatedExecute !== false || after.triggerDeferrable !== true || after.triggerInitiallyDeferred !== true) throw new Error("MIGRATION_0042_PRIVILEGE_ASSERTION_FAILED");
    proof = { status: "PASS", baselineChecksums, baselineChecksumDigest: createHash("sha256").update(JSON.stringify(baselineChecksums)).digest("hex"), migration0042Sha256: generatedPersistenceMigrationBoundary.migration0042Sha256, freshInstall: "PENDING_GENERATOR_PROOF", upgradePath: "PASS", transactionWrapped: true, failureInjectionRollback: "PASS", before, after, directInvocation: "DENIED", directTablePrivileges: "DENIED", privateSolutionRead: "DENIED", searchPathShadowing: "PASS", remoteAccessPerformed: false, remoteMutationPerformed: false, cleanup: "PENDING" };
  } finally {
    if (!released) await reservation.release();
    if (workdir) cleanup = (await stopDisposableStack(workdir, projectId)).ok;
    else cleanup = true;
  }
  if (!cleanup || !proof) throw new Error("MIGRATION_0042_CLEANUP_OR_RESULT_FAILED");
  proof.cleanup = "PASS";
  mkdirSync(resolve(root, "artifacts/generator-v2-database-proof"), { recursive: true });
  writeFileSync(artifact, `${JSON.stringify(proof, null, 2)}\n`);
  process.stdout.write("MIGRATIONS_UPGRADE=41_TO_42_PASS\nFAILURE_INJECTION_ROLLBACK=PASS\nPRIVILEGE_BOUNDARY=PASS\nSEARCH_PATH_SHADOWING=PASS\nDISPOSABLE_CLEANUP=PASS\nREMOTE_ACCESS_PERFORMED=NO\n");
}

await main();
