import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const operation = (name: string) => readFileSync(resolve(root,
  "supabase/operations/grades-2-9-remote-release", name), "utf8");

test("remote release activation requires the continuous 0001-0047 ledger and preserves exact tuples", () => {
  const sql = operation("ACTIVATE_PUBLIC.sql");
  assert.match(sql, /^\\set ON_ERROR_STOP on[\s\S]*?\nbegin;/u);
  assert.match(sql, /count\(\*\)[\s\S]*<> 47/u);
  assert.match(sql, /count\(distinct version\)[\s\S]*<> 47/u);
  assert.match(sql, /generate_series\(1,47\)/u);
  assert.match(sql, /LEDGER_NOT_EXACT_0047/u);
  for (let grade = 2; grade <= 9; grade += 1) {
    assert.match(sql, new RegExp(`\\(${grade},'plave-math-grade-${grade}-a-k-v1','g${grade}-combined-wave-a-b-c-d-e-f-g-h-i-j-k'`, "u"));
  }
  assert.match(sql, /EXACT_TUPLE_MISMATCH/u);
  assert.match(sql, /full join \([\s\S]*?\) as actual using \(grade\)/u);
  assert.match(sql, /is distinct from/u);
  assert.match(sql, /v_history_after <> v_history_before/u);
  assert.match(sql, /release_mode='PUBLIC',catalog_enabled=true,runtime_enabled=true/u);
  assert.match(sql, /retention_enabled=false/u);
  assert.match(sql, /release_mode='HIDDEN'[\s\S]*release_mode='PUBLIC'/u);
  assert.match(sql, /commit;/u);
  assert.doesNotMatch(sql, /insert\s+into/iu);
  assert.doesNotMatch(sql, /learning_units[^;]*published\s*=\s*true/iu);
});

test("disposable database proof executes the exact remote activation SQL", () => {
  const proof = readFileSync(resolve(root,
    "scripts/run-grades-2-9-release-database-proof.ts"), "utf8");
  assert.match(proof,
    /grades-2-9-remote-release\/ACTIVATE_PUBLIC[.]sql/u);
  assert.doesNotMatch(proof,
    /grades-2-9-local-release\/ACTIVATE_PUBLIC[.]sql/u);
  assert.ok(
    proof.indexOf("values('0047',array[]::text[])") <
      proof.indexOf("grades-2-9-remote-release/ACTIVATE_PUBLIC.sql"),
    "the post-0047 activation package must run only after 0047 is recorded",
  );
  assert.match(proof, /unifiedActivitySchemaBoundary !== "3\|4\|4\|false\|0"/u);
});

test("remote 0045 deactivation blocks discovery and preserves history", () => {
  const sql = operation("DEACTIVATE.sql");
  assert.match(sql, /^\\set ON_ERROR_STOP on\nbegin;/u);
  assert.match(sql, /release_mode='HIDDEN',catalog_enabled=false/u);
  assert.match(sql, /v_after<>v_before/u);
  assert.match(sql, /commit;/u);
  assert.doesNotMatch(sql, /delete\s+from/iu);
  assert.doesNotMatch(sql, /truncate/iu);
});

test("remote diagnostic is scalar and transaction read-only", () => {
  const sql = operation("DIAGNOSTIC_READONLY.sql");
  assert.match(sql, /^\\set ON_ERROR_STOP on\nbegin read only;/u);
  assert.match(sql, /rollback;/u);
  assert.doesNotMatch(sql, /json|copy|insert|update|delete|truncate/iu);
  assert.match(sql, /migration_0046_rows/u);
  assert.match(sql, /migration_0047_rows/u);
  assert.match(sql, /ledger_continuous_0001_0047/u);
  assert.match(sql, /grade1_units/u);
  assert.match(sql, /curriculum_answers/u);
});

test("remote release runbook forbids historical activation package and locks server-only flags", () => {
  const markdown = operation("README.md");
  assert.match(markdown, /continuous canonical ledger `0001`–`0047`/u);
  assert.match(markdown, /post-0047\/pre-activation backup/u);
  assert.match(markdown, /Do not use the historical pre-0045 universal\s+activation scripts/u);
  assert.match(markdown, /PLAVE_GRADES_2_9_RELEASE_MODE=PUBLIC/u);
  assert.match(markdown, /Never expose release mode through a\s+`NEXT_PUBLIC_\*`/u);
});
