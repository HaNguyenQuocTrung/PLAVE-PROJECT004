import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const diagnosticPath = path.join(
  repositoryRoot,
  "supabase",
  "diagnostics",
  "REMOTE_RLS_AUTO_ENABLE_CLASSIFICATION_READONLY.sql",
);
const verifiedBackupPath = path.join(
  os.homedir(),
  "PLAVE-DEV-BACKUPS",
  "plave-dev-20260729T193011Z-42528f67",
);
const backupSchemaPath = path.join(verifiedBackupPath, "schema.sql");

const stripSqlCommentsAndStrings = (sql) =>
  sql
    .replace(/--[^\n]*(?:\n|$)/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:''|[^'])*'/g, "''");

test("remote helper diagnostic is one catalog-only read-only query", () => {
  const sql = fs.readFileSync(diagnosticPath, "utf8");
  const executableSql = stripSqlCommentsAndStrings(sql);

  assert.match(executableSql, /^\s*begin\s+transaction\s+read\s+only\s*;/i);
  assert.match(executableSql, /\brollback\s*;\s*$/i);
  assert.equal(
    (executableSql.match(/\bbegin\s+transaction\s+read\s+only\s*;/gi) ?? [])
      .length,
    1,
  );
  assert.equal((executableSql.match(/\brollback\s*;/gi) ?? []).length, 1);

  const forbiddenStatements = [
    "insert",
    "update",
    "delete",
    "merge",
    "create",
    "alter",
    "drop",
    "truncate",
    "grant",
    "revoke",
    "call",
    "do",
    "execute",
  ];
  for (const statement of forbiddenStatements) {
    assert.doesNotMatch(
      executableSql,
      new RegExp(`\\b${statement}\\b`, "i"),
      `${statement.toUpperCase()} is forbidden in the read-only diagnostic`,
    );
  }

  assert.doesNotMatch(
    executableSql,
    /\b(?:from|join)\s+(?:public|auth|private|storage)\s*\./i,
  );
  assert.doesNotMatch(
    executableSql,
    /\b(?:email|phone|student_code|answer_value|correct_answer|solution)\b/i,
  );

  const directRelations = [
    ...executableSql.matchAll(
      /\b(?:from|join)\s+pg_catalog\.([a-z_][a-z0-9_]*)/gi,
    ),
  ].map((match) => match[1].toLowerCase());
  const allowlistedCatalogRelations = new Set([
    "pg_depend",
    "pg_event_trigger",
    "pg_extension",
    "pg_language",
    "pg_namespace",
    "pg_proc",
    "pg_roles",
  ]);
  for (const relation of directRelations) {
    assert.ok(
      allowlistedCatalogRelations.has(relation),
      `unexpected catalog relation: ${relation}`,
    );
  }
});

test(
  "verified backup helper matches the official optional Supabase shape",
  {
    skip: fs.existsSync(backupSchemaPath)
      ? false
      : "Owner backup remains outside the repository",
  },
  () => {
  const schema = fs.readFileSync(backupSchemaPath, "utf8");
  const functionStart = schema.indexOf(
    'CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"()',
  );
  const ownerStatement = schema.indexOf(
    'ALTER FUNCTION "public"."rls_auto_enable"()',
    functionStart,
  );
  assert.ok(functionStart >= 0);
  assert.ok(ownerStatement > functionStart);

  const definition = schema.slice(functionStart, ownerStatement).trim();
  const normalized = definition.toLowerCase().replace(/\s+/g, " ").trim();

  assert.match(normalized, /returns "?event_trigger"?/);
  assert.match(normalized, /language "?plpgsql"? security definer/);
  assert.match(
    normalized,
    /set "?search_path"? to 'pg_catalog'/,
  );
  assert.match(normalized, /from pg_event_trigger_ddl_commands\(\)/);
  assert.match(
    normalized,
    /command_tag in \('create table', 'create table as', 'select into'\)/,
  );
  assert.match(
    normalized,
    /object_type in \('table','partitioned table'\)/,
  );
  assert.match(normalized, /cmd\.schema_name in \('public'\)/);
  assert.match(
    normalized,
    /cmd\.schema_name not in \('pg_catalog','information_schema'\)/,
  );
  assert.match(normalized, /cmd\.schema_name not like 'pg_toast%'/);
  assert.match(normalized, /cmd\.schema_name not like 'pg_temp%'/);

  const dynamicStatements = [
    ...definition.matchAll(/\bEXECUTE\s+format\('([^']+)'/gi),
  ].map((match) => match[1].toLowerCase());
  assert.deepEqual(dynamicStatements, [
    "alter table if exists %s enable row level security",
  ]);

  assert.doesNotMatch(schema, /\bCREATE\s+EVENT\s+TRIGGER\b/i);
  assert.doesNotMatch(schema, /\bALTER\s+EXTENSION\b[\s\S]{0,200}rls_auto_enable/i);

  assert.equal(
    crypto.createHash("sha256").update(definition).digest("hex"),
    "aac93332e8490e32d96d178dfad8f0d7ba1527dc6adf1b14adb717bdf46d4613",
  );
  assert.equal(
    crypto.createHash("sha256").update(normalized).digest("hex"),
    "60620ceefcfe8ac0add4e9d8cc175fd6d748c2bee243ace65e23147862e99452",
  );
  },
);
