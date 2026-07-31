import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath =
  "supabase/migrations/0036_adaptive_practice_runtime_draft.sql";
const diagnosticPath =
  "supabase/diagnostics/0036_POST_APPLY_REMOTE_DEV_READONLY.sql";
const rollbackDiagnosticPath =
  "supabase/diagnostics/0036_FAILED_APPLY_ROLLBACK_READONLY.sql";
const ledgerPath = "docs/operations/REMOTE_DEV_OPERATION_LEDGER.md";

const migration = await readFile(migrationPath, "utf8");
const diagnostic = await readFile(diagnosticPath, "utf8");
const rollbackDiagnostic = await readFile(rollbackDiagnosticPath, "utf8");
const ledger = await readFile(ledgerPath, "utf8");

test("canonical corrected migration 0036 is atomic and phase ordered", () => {
  const checksum = createHash("sha256").update(migration).digest("hex");

  assert.equal(
    checksum,
    "d88b21c866c5d19708dc544faaa2c5828e3127844c50f0d7e76a3716c07fc6f1",
  );
  assert.match(migration, /^\s*begin;/i);
  assert.match(migration, /commit;\s*$/i);
  assert.equal((migration.match(/\bcommit\s*;/gi) ?? []).length, 1);
  const releaseTable = migration.indexOf(
    "create table public.adaptive_practice_releases",
  );
  const attemptTable = migration.indexOf(
    "create table public.adaptive_practice_attempts",
  );
  const answerTable = migration.indexOf(
    "create table public.adaptive_practice_answers",
  );
  const tablePhaseValidation = migration.indexOf(
    "do $table_phase_validation$",
  );
  const releaseSeed = migration.indexOf(
    "insert into public.adaptive_practice_releases",
  );
  const firstFunction = migration.indexOf("create or replace function");

  assert.ok(releaseTable > 0);
  assert.ok(releaseTable < attemptTable);
  assert.ok(attemptTable < answerTable);
  assert.ok(answerTable < tablePhaseValidation);
  assert.ok(tablePhaseValidation < releaseSeed);
  assert.ok(releaseSeed < firstFunction);
  assert.match(
    migration,
    /ADAPTIVE:PRECONDITION_FAILED:TABLE_ALREADY_EXISTS/,
  );
  assert.match(migration, /ADAPTIVE:TABLE_PHASE_INCOMPLETE/);
  assert.match(migration, /g2-numbers-to-1000-rc1/);
  assert.match(migration, /g2n1000-1\.0\.0-rc\.1/);
  assert.match(
    migration,
    /1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530/,
  );
  assert.match(
    migration,
    /false,\n\s*false,\n\s*false,\n\s*'DRAFT',\n\s*'HIDDEN'/,
  );
});

test("0036 post-apply diagnostic is read-only and aggregate-only", () => {
  const normalized = diagnostic.trim();

  assert.match(normalized, /^begin transaction read only;/i);
  assert.match(normalized, /rollback;$/i);
  assert.equal((normalized.match(/\brollback\s*;/gi) ?? []).length, 1);
  assert.doesNotMatch(
    normalized,
    /\b(insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|call|do)\b\s+/i,
  );
  assert.doesNotMatch(
    normalized,
    /\b(email|phone|student_code|normalized_answer|correct_answer|solution_steps|explanation|hint)\b/i,
  );
  assert.match(normalized, /public_rpc_secure_definer_search_path/);
  assert.match(normalized, /browser_direct_mutation_privileges/);
  assert.match(normalized, /frozen_hidden_release/);
  assert.match(normalized, /answer_evidence_rows/);
});

test("failed-apply rollback diagnostic is catalog-safe for adaptive objects", () => {
  const normalized = rollbackDiagnostic.trim();

  assert.match(normalized, /^begin transaction read only;/i);
  assert.match(normalized, /rollback;$/i);
  assert.doesNotMatch(
    normalized,
    /\b(insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|call|do)\b\s+/i,
  );
  assert.doesNotMatch(normalized, /\bexecute\b/i);
  assert.doesNotMatch(
    normalized,
    /\b(from|join)\s+public[.]adaptive_practice_/i,
  );
  assert.doesNotMatch(
    normalized,
    /\b(email|phone|student_code|normalized_answer|correct_answer|solution_steps|explanation|hint)\b/i,
  );
  assert.match(normalized, /pg_catalog[.]pg_class/);
  assert.match(normalized, /information_schema[.]role_table_grants/);
  assert.match(normalized, /tables_present/);
  assert.match(normalized, /public_rpcs_present/);
  assert.match(normalized, /private_helpers_present/);
});

test("ledger closes the failed and corrected 0036 operation provenance", () => {
  assert.match(
    ledger,
    /806f4c2474bd80771d900684c854e65fcf60cebac8ce7792b7c0e71bd8b8ecdf/,
  );
  assert.match(
    ledger,
    /d88b21c866c5d19708dc544faaa2c5828e3127844c50f0d7e76a3716c07fc6f1/,
  );
  assert.match(
    ledger,
    /OWNER APPROVED — MIGRATION 0036 ON CONTROLLED DEV STAGING/,
  );
  assert.match(
    ledger,
    /Failed attempt execution \| `REMOTE_APPLY_FAILED`/,
  );
  assert.match(
    ledger,
    /Failed-attempt rollback state \| `VERIFIED_CLEAN — 19\/19 PASS`/,
  );
  assert.match(
    ledger,
    /Corrected Owner re-approval \| `OWNER APPROVED FOR CORRECTED 0036 ON CONTROLLED DEV STAGING ONLY`/,
  );
  assert.match(
    ledger,
    /Corrected checksum remote status \| `APPLIED_AND_VERIFIED`/,
  );
  assert.match(
    ledger,
    /Corrected post-apply verification \| `28\/28 PASS`/,
  );
  assert.match(ledger, /`FAILED_AND_ROLLED_BACK_VERIFIED`/);
  assert.match(
    ledger,
    /Adaptive schema evidence \| `3 tables \/ 3 public RPCs \/ 4 private helpers — PASS`/,
  );
  assert.match(ledger, /Database activation evidence \| `true flags = 0`/);
  assert.match(
    ledger,
    /Candidate state \| `DRAFT \/ HIDDEN`; Grade 2 unit\/questions unpublished/,
  );
  assert.match(ledger, /Application feature flags \| all `false`/);
  assert.match(ledger, /Activation \| `BLOCKED \/ FEATURE_FLAGS_FALSE`/);
  assert.match(ledger, /Rerun action \| `NONE — DO NOT RERUN`/);
  assert.match(ledger, /No `supabase_migrations` history table was created or/);
});
