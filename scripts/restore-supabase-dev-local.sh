#!/usr/bin/env bash

set -euo pipefail

umask 077

fail() {
  printf 'Local restore blocked: %s\n' "$1" >&2
  exit 1
}

command -v node >/dev/null 2>&1 || fail 'Node.js is required.'
command -v psql >/dev/null 2>&1 || fail 'psql is required.'
command -v supabase >/dev/null 2>&1 || fail 'Supabase CLI is required.'

[[ $# -eq 1 ]] || fail 'Pass exactly one backup directory.'
[[ -n "${PLAVE_LOCAL_RESTORE_DB_URL:-}" ]] \
  || fail 'PLAVE_LOCAL_RESTORE_DB_URL is required.'
[[ -n "${PLAVE_LOCAL_RESTORE_WORKDIR:-}" ]] \
  || fail 'PLAVE_LOCAL_RESTORE_WORKDIR is required.'

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd "${script_dir}/.." && pwd -P)"
backup_dir="$(cd "$1" && pwd -P)"
restore_workdir="$(cd "${PLAVE_LOCAL_RESTORE_WORKDIR}" && pwd -P)"

node "${repo_root}/scripts/validate-supabase-dev-backup.mjs" "${backup_dir}"

PLAVE_VERIFIED_RESTORE_WORKDIR="${restore_workdir}" node <<'NODE'
const fs = require("node:fs");

const workdir = process.env.PLAVE_VERIFIED_RESTORE_WORKDIR;
const localUrlValue = process.env.PLAVE_LOCAL_RESTORE_DB_URL;
if (!workdir || !localUrlValue) {
  process.exit(2);
}

const restorePrefix = `${fs.realpathSync("/tmp")}/plave-6gc-restore.`;
if (!workdir.startsWith(restorePrefix)) {
  process.exit(3);
}

const configPath = `${workdir}/supabase/config.toml`;
const config = fs.readFileSync(configPath, "utf8");
const projectMatch = /^project_id\s*=\s*"(plave-6gc-restore-[a-z0-9-]+)"$/mu.exec(
  config,
);
if (!projectMatch) {
  process.exit(4);
}

let url;
try {
  url = new URL(localUrlValue);
} catch {
  process.exit(5);
}

const isPostgres =
  url.protocol === "postgres:" || url.protocol === "postgresql:";
const isLocalHost =
  url.hostname === "127.0.0.1" ||
  url.hostname === "localhost" ||
  url.hostname === "::1";
const validPort =
  /^\d{2,5}$/u.test(url.port) &&
  Number(url.port) > 1024 &&
  Number(url.port) !== 3000;

if (
  !isPostgres ||
  !isLocalHost ||
  !validPort ||
  url.pathname !== "/postgres"
) {
  process.exit(6);
}
NODE

status_output="$(
  supabase status \
    --workdir "${restore_workdir}" \
    --output env \
    --log-level error
)"

PLAVE_LOCAL_STATUS_OUTPUT="${status_output}" node <<'NODE'
const expectedUrl = process.env.PLAVE_LOCAL_RESTORE_DB_URL;
const statusOutput = process.env.PLAVE_LOCAL_STATUS_OUTPUT ?? "";
const dbUrlLine = statusOutput
  .split(/\r?\n/u)
  .find((line) => line.startsWith("DB_URL="));

if (!expectedUrl || !dbUrlLine) {
  process.exit(2);
}

const rawStatusUrl = dbUrlLine.slice(dbUrlLine.indexOf("=") + 1);
const statusUrl =
  rawStatusUrl.startsWith("\"") && rawStatusUrl.endsWith("\"")
    ? rawStatusUrl.slice(1, -1)
    : rawStatusUrl;

if (statusUrl !== expectedUrl) {
  process.exit(3);
}
NODE

unset PLAVE_DEV_DB_URL || true

local_admin_db_url="$(
  PLAVE_VERIFIED_LOCAL_DB_URL="${PLAVE_LOCAL_RESTORE_DB_URL}" node <<'NODE'
const localUrlValue = process.env.PLAVE_VERIFIED_LOCAL_DB_URL;
if (!localUrlValue) {
  process.exit(2);
}

const url = new URL(localUrlValue);
const isLocalHost =
  url.hostname === "127.0.0.1" ||
  url.hostname === "localhost" ||
  url.hostname === "::1";
if (
  (url.protocol !== "postgres:" && url.protocol !== "postgresql:") ||
  !isLocalHost ||
  url.pathname !== "/postgres" ||
  !url.port ||
  Number(url.port) === 3000
) {
  process.exit(3);
}

// The local Supabase image exposes supabase_admin with the same disposable
// database password reported by `supabase status`. This URL never leaves this
// process and is never used for a remote host.
url.username = "supabase_admin";
process.stdout.write(url.toString());
NODE
)"

printf 'Restore target: verified local disposable Supabase stack\n'
printf 'Restore order: roles -> schema -> data (single transaction)\n'

psql \
  "${local_admin_db_url}" \
  -X \
  --set ON_ERROR_STOP=1 \
  --single-transaction \
  --command 'alter default privileges for role supabase_admin in schema public revoke all on tables from anon, authenticated, service_role;' \
  --command 'alter default privileges for role supabase_admin in schema public revoke all on sequences from anon, authenticated, service_role;' \
  --command 'alter default privileges for role supabase_admin in schema public revoke all on functions from anon, authenticated, service_role;' \
  --file "${backup_dir}/roles.sql" \
  --file "${backup_dir}/schema.sql" \
  --file "${backup_dir}/data.sql" \
  --command 'drop trigger if exists on_auth_user_created on auth.users; create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();' \
  --command 'alter default privileges for role supabase_admin in schema public grant all on tables to postgres, anon, authenticated, service_role;' \
  --command 'alter default privileges for role supabase_admin in schema public grant all on sequences to postgres, anon, authenticated, service_role;' \
  --command 'alter default privileges for role supabase_admin in schema public grant all on functions to postgres, anon, authenticated, service_role;' \
  >/dev/null

counts_output="$(
  psql \
    "${PLAVE_LOCAL_RESTORE_DB_URL}" \
    -X \
    --set ON_ERROR_STOP=1 \
    --quiet \
    --tuples-only \
    --no-align \
    --field-separator '|' \
    --file "${repo_root}/supabase/diagnostics/LOCAL_RESTORE_EXACT_COUNTS.sql"
)"

PLAVE_LOCAL_COUNTS="${counts_output}" node <<'NODE'
const rawCounts = process.env.PLAVE_LOCAL_COUNTS ?? "";
const expected = new Map([
  ["auth_users", 5],
  ["profiles", 5],
  ["student_profiles", 3],
  ["teacher_profiles", 1],
  ["parent_student_connections", 3],
  ["practice_attempts", 18],
  ["practice_answers", 340],
  ["diagnostic_attempts", 1],
  ["diagnostic_answers", 24],
  ["grade1_units", 13],
  ["questions", 312],
  ["question_solutions", 312],
]);

const observed = new Map();
for (const rawLine of rawCounts.split(/\r?\n/u)) {
  const line = rawLine.trim();
  if (!line) continue;
  const [metric, actualText, expectedText] = line.split("|");
  if (!metric || actualText === undefined || expectedText === undefined) {
    process.exit(2);
  }
  const actual = Number(actualText);
  const embeddedExpected = Number(expectedText);
  if (
    !Number.isSafeInteger(actual) ||
    !Number.isSafeInteger(embeddedExpected) ||
    expected.get(metric) !== embeddedExpected
  ) {
    process.exit(3);
  }
  observed.set(metric, actual);
}

if (observed.size !== expected.size) {
  process.exit(4);
}

const mismatches = [];
for (const [metric, expectedCount] of expected) {
  const actualCount = observed.get(metric);
  if (actualCount !== expectedCount) {
    mismatches.push({ metric, expected: expectedCount, actual: actualCount });
  }
}

if (mismatches.length > 0) {
  console.error(JSON.stringify({ status: "COUNT_MISMATCH", mismatches }, null, 2));
  process.exit(5);
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      aggregateMetrics: observed.size,
      counts: Object.fromEntries(observed),
      piiReturned: false,
    },
    null,
    2,
  ),
);
NODE

printf 'Local restore verification: PASS\n'
