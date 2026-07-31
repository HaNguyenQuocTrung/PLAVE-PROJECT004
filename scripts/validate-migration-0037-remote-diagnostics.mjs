import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const migrationPath =
  "supabase/migrations/0037_adaptive_controlled_pilot_eligibility_draft.sql";
const failedDiagnosticPath =
  "supabase/diagnostics/0037_FAILED_APPLY_ROLLBACK_READONLY.sql";
const postDiagnosticPath =
  "supabase/diagnostics/0037_POST_APPLY_REMOTE_DEV_READONLY.sql";
const approvedChecksum =
  "91e2a4bb918bf894903f313d65d93bd80d8be98fad4fa2a1ca7c59cbbfe1b070";

function fail(message) {
  throw new Error(`0037 remote package validation failed: ${message}`);
}

function stripCommentsAndStrings(sql) {
  return sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:''|[^'])*'/g, " ");
}

function stripDollarQuotedBodies(sql) {
  return sql.replace(/\$([A-Za-z_][A-Za-z0-9_]*|)\$[\s\S]*?\$\1\$/g, " ");
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function validateReadOnlyDiagnostic(path, sql) {
  const normalized = sql.trim().toLowerCase();
  const executable = stripCommentsAndStrings(sql).toLowerCase();
  const prohibited =
    /\b(insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|call|do|execute)\b/;
  const pii =
    /\b(email|phone|full_name|display_name|student_code|raw_user_meta_data|encrypted_password)\b/;

  if (!normalized.startsWith("begin transaction read only;")) {
    fail(`${path} must begin with BEGIN TRANSACTION READ ONLY`);
  }
  if (!normalized.endsWith("rollback;")) {
    fail(`${path} must end with ROLLBACK`);
  }
  if (countMatches(executable, /\bbegin\s+transaction\s+read\s+only\s*;/g) !== 1) {
    fail(`${path} must contain exactly one read-only transaction`);
  }
  if (countMatches(executable, /\brollback\s*;/g) !== 1) {
    fail(`${path} must contain exactly one rollback`);
  }
  if (/\bcommit\s*;/.test(executable)) {
    fail(`${path} must not commit`);
  }
  if (prohibited.test(executable)) {
    fail(`${path} contains a prohibited statement`);
  }
  if (pii.test(executable)) {
    fail(`${path} references a prohibited PII column`);
  }
  if (
    !normalized.includes("transaction_read_only") ||
    !normalized.includes("from observed") ||
    !normalized.includes("exact_count") ||
    !normalized.includes("expected_count")
  ) {
    fail(`${path} is missing the unified read-only result contract`);
  }
  if (
    /\bselect\s+[^;]*(correct_answer|solution_steps|submitted_answer|answer_text)\b/i.test(
      executable,
    )
  ) {
    fail(`${path} may not select answer or solution payload`);
  }
}

const [migration, failedDiagnostic, postDiagnostic] = await Promise.all([
  readFile(migrationPath, "utf8"),
  readFile(failedDiagnosticPath, "utf8"),
  readFile(postDiagnosticPath, "utf8"),
]);

const checksum = createHash("sha256").update(migration).digest("hex");
if (checksum !== approvedChecksum) {
  fail(`migration checksum mismatch: ${checksum}`);
}

const migrationExecutable = stripCommentsAndStrings(migration).toLowerCase();
const migrationTopLevel = stripCommentsAndStrings(
  stripDollarQuotedBodies(migration),
).toLowerCase();
if (countMatches(migrationExecutable, /\bbegin\s*;/g) !== 1) {
  fail("migration must contain exactly one BEGIN");
}
if (countMatches(migrationExecutable, /\bcommit\s*;/g) !== 1) {
  fail("migration must contain exactly one COMMIT");
}
if (!migration.trim().toLowerCase().endsWith("commit;")) {
  fail("COMMIT must be the final migration statement");
}
const validationPosition = migration.lastIndexOf("do $validation$");
const commitPosition = migration.toLowerCase().lastIndexOf("commit;");
if (validationPosition < 0 || validationPosition > commitPosition) {
  fail("migration validation must execute before COMMIT");
}
if (
  /insert\s+into\s+public[.]adaptive_practice_pilot_members/i.test(
    migrationTopLevel,
  )
) {
  fail("migration must not seed a pilot member");
}
if (
  /insert\s+into\s+public[.]adaptive_practice_(attempts|answers)/i.test(
    migrationTopLevel,
  )
) {
  fail("migration must not seed adaptive history");
}
if (
  /set\s+(runtime_enabled|controlled_pilot_enabled|retention_runtime_enabled)\s*=\s*true/i.test(
    migrationTopLevel,
  )
) {
  fail("migration must not activate database flags");
}

validateReadOnlyDiagnostic(failedDiagnosticPath, failedDiagnostic);
validateReadOnlyDiagnostic(postDiagnosticPath, postDiagnostic);

console.log("Migration 0037 remote package validation: PASS");
console.log(`Migration checksum: ${checksum}`);
console.log("Failed-apply diagnostic: READ-ONLY STATIC PASS");
console.log("Post-apply diagnostic: READ-ONLY STATIC PASS");
