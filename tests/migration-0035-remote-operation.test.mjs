import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath =
  "supabase/migrations/0035_grade2_numbers_to_1000_release_candidate_draft.sql";
const diagnosticPath =
  "supabase/diagnostics/0035_POST_APPLY_REMOTE_DEV_READONLY.sql";
const ledgerPath = "docs/operations/REMOTE_DEV_OPERATION_LEDGER.md";

const migration = await readFile(migrationPath, "utf8");
const diagnostic = await readFile(diagnosticPath, "utf8");
const ledger = await readFile(ledgerPath, "utf8");

test("migration 0035 remains the frozen, atomic, hidden candidate", () => {
  const checksum = createHash("sha256").update(migration).digest("hex");

  assert.equal(
    checksum,
    "67bef151f4a8744c107835ce98ab5a5c30372cf76ff0328e02c1ca8649c7f206",
  );
  assert.match(migration, /^\s*begin;/i);
  assert.match(migration, /commit;\s*$/i);
  assert.equal((migration.match(/\bcommit\s*;/gi) ?? []).length, 1);
  assert.match(migration, /g2-numbers-to-1000-rc1/);
  assert.match(migration, /g2n1000-1\.0\.0-rc\.1/);
  assert.match(
    migration,
    /1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530/,
  );
  assert.match(
    migration,
    /'grade-2-numbers-to-1000'[\s\S]*?\n\s*false,\n\s*1,\n\s*null\n\);/,
  );
  assert.match(migration, /v_release_bank jsonb/);
  assert.doesNotMatch(migration, /grade2_numbers_release_seed/);
  assert.doesNotMatch(migration, /create\s+temporary\s+table/i);
  assert.doesNotMatch(migration, /on\s+commit\s+drop/i);
  assert.doesNotMatch(migration, /create table public\.adaptive_practice_/i);
});

test("post-apply diagnostic is one read-only result set without payload reads", () => {
  const normalized = diagnostic.trim();

  assert.match(normalized, /^begin transaction read only;/i);
  assert.match(normalized, /rollback;$/i);
  assert.equal((normalized.match(/\brollback\s*;/gi) ?? []).length, 1);
  assert.equal((normalized.match(/\bselect\b/gi) ?? []).length > 0, true);
  assert.doesNotMatch(
    normalized,
    /\b(insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|call|do)\b\s+/i,
  );
  assert.doesNotMatch(
    normalized,
    /\b(email|phone|student_code|normalized_answer|correct_answer|solution_steps|explanation|hint)\b/i,
  );
  assert.match(normalized, /adaptive_tables_present/);
  assert.match(normalized, /browser_solution_select_grants/);
  assert.match(normalized, /published_questions/);
});

test("operation ledger preserves executed and corrected checksum provenance", () => {
  assert.match(
    ledger,
    /911816c87723b8e762c1a1d7470d49b616cfbb95495ddf28e166fd1d536c55f8/,
  );
  assert.match(
    ledger,
    /67bef151f4a8744c107835ce98ab5a5c30372cf76ff0328e02c1ca8649c7f206/,
  );
  assert.match(ledger, /Remote-executed state \| `APPLIED_AND_VERIFIED`/);
  assert.match(ledger, /Execution note \| `POST_COMMIT_REPORTING_ERROR`/);
  assert.match(ledger, /Canonical checksum remote status \| `NOT_EXECUTED_REMOTE — DO_NOT_RERUN`/);
  assert.match(ledger, /Post-apply verification \| `PASS — all rows`/);
  assert.match(
    ledger,
    /Migration 0036 state \| `CORRECTED_APPLIED_AND_VERIFIED \/ FEATURE_FLAGS_OFF`/,
  );
  assert.match(ledger, /Migration-history action \| `NONE_AUTHORIZED`/);
});
