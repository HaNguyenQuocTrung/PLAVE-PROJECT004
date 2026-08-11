#!/usr/bin/env bash

set -euo pipefail

umask 077

staging_dir=''
# A non-empty target is the single rollback authority. It follows the backup
# across the staging rename and is cleared only after the success receipt.
cleanup_target=''

fail() {
  printf '%s\n' "Backup blocked: $1" >&2
  exit 1
}

require_executable() {
  local command_name="$1"
  local command_path
  command_path="$(command -v "${command_name}" 2>/dev/null)" \
    || fail "${command_name} is required."
  [[ "${command_path}" = /* && -x "${command_path}" ]] \
    || fail "${command_name} must resolve to an executable file."
}

require_executable node
require_executable supabase
require_executable docker
require_executable shasum
require_executable openssl

if [[ -z "${PLAVE_DEV_DB_URL:-}" ]]; then
  fail 'PLAVE_DEV_DB_URL must be loaded in the current shell by a hidden prompt.'
fi

clear_credential() {
  PLAVE_DEV_DB_URL=''
  unset PLAVE_DEV_DB_URL
}

cleanup_generated_directory() {
  if [[ -z "${cleanup_target}" ]]; then
    return
  fi

  case "${cleanup_target}" in
    "${backup_root:-/nonexistent}"/plave-dev-????????T??????Z-????????.incomplete|\
    "${backup_root:-/nonexistent}"/plave-dev-????????T??????Z-????????)
      if [[ -d "${cleanup_target}" && ! -L "${cleanup_target}" ]]; then
        rm -rf -- "${cleanup_target}" >/dev/null 2>&1 || true
      fi
      ;;
  esac
}

finish() {
  local exit_code=$?
  trap - EXIT HUP INT TERM
  cleanup_generated_directory
  clear_credential
  exit "${exit_code}"
}

trap finish EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd "${script_dir}/.." && pwd -P)"
public_env_file="${PLAVE_PUBLIC_ENV_FILE:-${repo_root}/.env.local}"

[[ -f "${public_env_file}" ]] \
  || fail 'A public environment file is required to verify the known PLAVE dev project ref.'

identity_result="$(
  PLAVE_PUBLIC_ENV_FILE="${public_env_file}" \
    node "${repo_root}/scripts/validate-plave-dev-database-url.mjs"
)" || fail 'The database URL is not the verified PLAVE dev Session Pooler target.'

case "${identity_result}" in
  REMOTE_SESSION_POOLER_OK'|'*) ;;
  *) fail 'Remote target identity verification failed.' ;;
esac

supabase_cli_version="$(supabase --version 2>/dev/null)" \
  || {
    printf '%s\n' \
      'LOGICAL_DUMP_FAILED:PREFLIGHT:CLI_VERSION_UNSUPPORTED' >&2
    exit 1
  }
[[ "${supabase_cli_version}" = '2.110.0' ]] \
  || {
    printf '%s\n' \
      'LOGICAL_DUMP_FAILED:PREFLIGHT:CLI_VERSION_UNSUPPORTED' >&2
    exit 1
  }
supabase_dump_image='public.ecr.aws/supabase/postgres:17.6.1.143'

dump_help="$(supabase db dump --help 2>/dev/null)" \
  || {
    printf '%s\n' \
      'LOGICAL_DUMP_FAILED:PREFLIGHT:CLI_VERSION_UNSUPPORTED' >&2
    exit 1
  }
for required_flag in \
  '--db-url' \
  '--file' \
  '--role-only' \
  '--data-only' \
  '--use-copy' \
  '--exclude'
do
  grep -F -- "${required_flag}" <<<"${dump_help}" >/dev/null \
    || {
      printf '%s\n' \
        'LOGICAL_DUMP_FAILED:PREFLIGHT:CLI_VERSION_UNSUPPORTED' >&2
      exit 1
    }
done

docker version --format '{{.Client.Version}}|{{.Server.Version}}' \
  >/dev/null 2>&1 \
  || {
    printf '%s\n' \
      'LOGICAL_DUMP_FAILED:PREFLIGHT:DOCKER_UNAVAILABLE' >&2
    exit 1
  }
docker info --format '{{.ServerVersion}}' >/dev/null 2>&1 \
  || {
    printf '%s\n' \
      'LOGICAL_DUMP_FAILED:PREFLIGHT:DOCKER_UNAVAILABLE' >&2
    exit 1
  }
docker image inspect "${supabase_dump_image}" >/dev/null 2>&1 \
  || {
    printf '%s\n' \
      'LOGICAL_DUMP_FAILED:PREFLIGHT:DOCKER_UNAVAILABLE' >&2
    exit 1
  }
docker run \
  --rm \
  --network none \
  --entrypoint pg_dump \
  "${supabase_dump_image}" \
  --version \
  >/dev/null 2>&1 \
  || {
    printf '%s\n' \
      'LOGICAL_DUMP_FAILED:PREFLIGHT:DOCKER_UNAVAILABLE' >&2
    exit 1
  }

backup_root="${PLAVE_DEV_BACKUP_ROOT:-${HOME}/PLAVE-DEV-BACKUPS}"
mkdir -p "${backup_root}"
chmod 700 "${backup_root}"
backup_root="$(cd "${backup_root}" && pwd -P)"

case "${backup_root}/" in
  "${repo_root}/"*)
    fail 'Backup directory must be outside the repository.'
    ;;
esac

random_suffix="$(openssl rand -hex 4)"
backup_id="plave-dev-$(date -u +%Y%m%dT%H%M%SZ)-${random_suffix}"
final_backup_dir="${backup_root}/${backup_id}"
staging_dir="${final_backup_dir}.incomplete"
cleanup_target="${staging_dir}"

[[ ! -e "${final_backup_dir}" && ! -e "${staging_dir}" ]] \
  || fail 'Generated backup path already exists.'
mkdir "${staging_dir}" 2>/dev/null \
  || fail 'Could not create the incomplete backup directory.'
chmod 700 "${staging_dir}" 2>/dev/null \
  || fail 'Could not restrict the incomplete backup directory.'

roles_file="${staging_dir}/roles.sql"
schema_file="${staging_dir}/schema.sql"
data_file="${staging_dir}/data.sql"
manifest_file="${staging_dir}/manifest.json"
checksums_file="${staging_dir}/checksums.sha256"
readme_file="${staging_dir}/README_RESTORE.txt"

PLAVE_PUBLIC_ENV_FILE="${public_env_file}" \
  node "${repo_root}/scripts/run-plave-dev-logical-dump.mjs" "${staging_dir}"

for dump_file in "${roles_file}" "${schema_file}" "${data_file}"; do
  [[ -s "${dump_file}" ]] || fail "$(basename "${dump_file}") is missing or empty."
  chmod 600 "${dump_file}" 2>/dev/null \
    || fail 'Could not restrict a completed dump file.'
done

PLAVE_BACKUP_DIRECTORY="${staging_dir}" node <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

try {
  const backupDir = process.env.PLAVE_BACKUP_DIRECTORY;
  const dbUrlValue = process.env.PLAVE_DEV_DB_URL;
  if (!backupDir || !dbUrlValue) {
    process.exit(2);
  }

  const dbUrl = new URL(dbUrlValue);
  const forbiddenValues = [
    dbUrlValue,
    decodeURIComponent(dbUrl.password),
    dbUrl.password,
  ].filter((value) => value.length >= 8);

  for (const fileName of ["roles.sql", "schema.sql", "data.sql"]) {
    const filePath = path.join(backupDir, fileName);
    const content = fs.readFileSync(filePath, "utf8");
    if (forbiddenValues.some((value) => content.includes(value))) {
      process.exit(3);
    }
  }
} catch {
  process.exit(4);
}
NODE

observed_counts_file="${staging_dir}/.observed-restore-counts.json"
PLAVE_BACKUP_DATA_FILE="${data_file}" \
PLAVE_BACKUP_COUNTS_FILE="${observed_counts_file}" \
node <<'NODE' || fail 'Could not derive sanitized aggregate counts from data.sql.'
const fs = require("node:fs");

try {
  const dataFile = process.env.PLAVE_BACKUP_DATA_FILE;
  if (!dataFile) {
    process.exit(2);
  }

  const targets = new Map([
    ["auth.users", { key: "authUsers" }],
    ["public.profiles", { key: "profiles" }],
    ["public.student_profiles", { key: "studentProfiles" }],
    ["public.teacher_profiles", { key: "teacherProfiles" }],
    [
      "public.parent_student_connections",
      { key: "parentStudentConnections" },
    ],
    ["public.practice_attempts", { key: "practiceAttempts" }],
    ["public.practice_answers", { key: "practiceAnswers" }],
    ["public.diagnostic_attempts", { key: "diagnosticAttempts" }],
    ["public.diagnostic_answers", { key: "diagnosticAnswers" }],
    ["public.learning_units", { key: "grade1Units", gradeOneOnly: true }],
    ["public.questions", { key: "questions" }],
    ["public.question_solutions", { key: "questionSolutions" }],
  ]);
  const counts = new Map();
  const lines = fs.readFileSync(dataFile, "utf8").split(/\n/u);
  const copyHeader = /^COPY "([^"]+)"\."([^"]+)" \((.+)\) FROM stdin;$/u;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].replace(/\r$/u, "");
    const match = copyHeader.exec(line);
    if (!match) continue;

    const identity = `${match[1]}.${match[2]}`;
    const target = targets.get(identity);
    let terminator = index + 1;
    while (
      terminator < lines.length &&
      lines[terminator].replace(/\r$/u, "") !== "\\."
    ) {
      terminator += 1;
    }
    if (terminator >= lines.length) {
      process.exit(3);
    }
    if (target) {
      if (counts.has(target.key)) {
        process.exit(4);
      }
      const rows = lines.slice(index + 1, terminator);
      if (target.gradeOneOnly) {
        const columns = [...match[3].matchAll(/"([^"]+)"/gu)].map(
          (columnMatch) => columnMatch[1],
        );
        const gradeIndex = columns.indexOf("grade");
        if (gradeIndex < 0) {
          process.exit(5);
        }
        counts.set(
          target.key,
          rows.filter((row) => row.split("\t")[gradeIndex] === "1").length,
        );
      } else {
        counts.set(target.key, rows.length);
      }
    }
    index = terminator;
  }

  if (
    counts.size !== targets.size ||
    [...counts.values()].some(
      (value) => !Number.isSafeInteger(value) || value < 0,
    )
  ) {
    process.exit(6);
  }

  const countsFile = process.env.PLAVE_BACKUP_COUNTS_FILE;
  if (!countsFile) {
    process.exit(7);
  }
  fs.writeFileSync(
    countsFile,
    JSON.stringify(Object.fromEntries(counts)),
    { mode: 0o600, flag: "wx" },
  );
} catch {
  process.exit(8);
}
NODE
observed_restore_counts="$(<"${observed_counts_file}")" \
  || fail 'Could not read sanitized aggregate counts from data.sql.'
rm -f -- "${observed_counts_file}" \
  || fail 'Could not clear temporary sanitized aggregate counts.'

roles_sha="$(shasum -a 256 "${roles_file}" 2>/dev/null | awk '{print $1}')" \
  || fail 'roles.sql checksum failed.'
schema_sha="$(shasum -a 256 "${schema_file}" 2>/dev/null | awk '{print $1}')" \
  || fail 'schema.sql checksum failed.'
data_sha="$(shasum -a 256 "${data_file}" 2>/dev/null | awk '{print $1}')" \
  || fail 'data.sql checksum failed.'
roles_size="$(stat -f %z "${roles_file}" 2>/dev/null)" \
  || fail 'roles.sql size check failed.'
schema_size="$(stat -f %z "${schema_file}" 2>/dev/null)" \
  || fail 'schema.sql size check failed.'
data_size="$(stat -f %z "${data_file}" 2>/dev/null)" \
  || fail 'data.sql size check failed.'

PLAVE_BACKUP_ID="${backup_id}" \
PLAVE_BACKUP_CREATED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
PLAVE_BACKUP_ROLES_SHA="${roles_sha}" \
PLAVE_BACKUP_SCHEMA_SHA="${schema_sha}" \
PLAVE_BACKUP_DATA_SHA="${data_sha}" \
PLAVE_BACKUP_ROLES_SIZE="${roles_size}" \
PLAVE_BACKUP_SCHEMA_SIZE="${schema_size}" \
PLAVE_BACKUP_DATA_SIZE="${data_size}" \
PLAVE_BACKUP_SUPABASE_CLI_VERSION="${supabase_cli_version}" \
PLAVE_BACKUP_SUPABASE_DUMP_IMAGE="${supabase_dump_image}" \
PLAVE_BACKUP_EXPECTED_COUNTS="${observed_restore_counts}" \
PLAVE_BACKUP_DIRECTORY="${staging_dir}" \
node <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

try {
  const backupDir = process.env.PLAVE_BACKUP_DIRECTORY;
  if (!backupDir) {
    process.exit(2);
  }

  const expectedRestoreCounts = JSON.parse(
    process.env.PLAVE_BACKUP_EXPECTED_COUNTS ?? "",
  );
  const expectedCountKeys = [
    "authUsers",
    "profiles",
    "studentProfiles",
    "teacherProfiles",
    "parentStudentConnections",
    "practiceAttempts",
    "practiceAnswers",
    "diagnosticAttempts",
    "diagnosticAnswers",
    "grade1Units",
    "questions",
    "questionSolutions",
  ];
  if (
    Object.keys(expectedRestoreCounts).sort().join("\n") !==
      [...expectedCountKeys].sort().join("\n") ||
    expectedCountKeys.some(
      (key) =>
        !Number.isSafeInteger(expectedRestoreCounts[key]) ||
        expectedRestoreCounts[key] < 0,
    )
  ) {
    process.exit(3);
  }

  const manifest = {
    formatVersion: 1,
    backupId: process.env.PLAVE_BACKUP_ID,
    createdAt: process.env.PLAVE_BACKUP_CREATED_AT,
    sourceClassification: "TEST_DEMO_ONLY_CONFIRMED",
    sourceEnvironmentRole: "CONTROLLED_DEV_STAGING",
    remoteTarget: "VERIFIED_PLAVE_DEV_SESSION_POOLER",
    transactionIntent: "READ_ONLY_LOGICAL_DUMP",
    tooling: {
      supabaseCliVersion: process.env.PLAVE_BACKUP_SUPABASE_CLI_VERSION,
      dumpContainerImage: process.env.PLAVE_BACKUP_SUPABASE_DUMP_IMAGE,
      commandFamily: "supabase db dump",
      credentialTransport:
        "PASSWORDLESS_DB_URL_WITH_TEMPORARY_LIBPQ_ENVIRONMENT",
      dataExclusions: [
        "storage.buckets_vectors",
        "storage.vector_indexes",
      ],
    },
    files: {
      "roles.sql": {
        sizeBytes: Number(process.env.PLAVE_BACKUP_ROLES_SIZE),
        sha256: process.env.PLAVE_BACKUP_ROLES_SHA,
      },
      "schema.sql": {
        sizeBytes: Number(process.env.PLAVE_BACKUP_SCHEMA_SIZE),
        sha256: process.env.PLAVE_BACKUP_SCHEMA_SHA,
      },
      "data.sql": {
        sizeBytes: Number(process.env.PLAVE_BACKUP_DATA_SIZE),
        sha256: process.env.PLAVE_BACKUP_DATA_SHA,
      },
    },
    expectedRestoreCounts,
    included: ["database roles dump", "database schema dump", "database data dump"],
    excluded: [
      "Storage objects",
      "Edge Functions",
      "platform configuration",
      "API keys and secrets",
      "PITR and dashboard backups",
    ],
    remoteMutationPerformed: false,
  };

  fs.writeFileSync(
    path.join(backupDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { mode: 0o600 },
  );
} catch {
  process.exit(3);
}
NODE

cat 2>/dev/null > "${readme_file}" <<'EOF' || fail 'Restore README generation failed.'
PLAVE DEV LOGICAL BACKUP — RESTORE NOTES

This directory is outside the repository and must remain private.

Contents:
- roles.sql: database roles emitted by Supabase CLI role-only filtering
- schema.sql: logical database schema
- data.sql: logical database data using COPY
- manifest.json: sanitized metadata, expected aggregate counts and file hashes
- checksums.sha256: integrity hashes

Not included:
- Storage objects
- Edge Functions
- platform configuration
- API keys or secrets
- downloadable dashboard backups or PITR

Restore only into a verified local disposable Supabase/PostgreSQL target.
Never point the restore command at a remote host.
Run roles, schema and data in that order, then verify aggregate counts.
Do not edit the original dump files to hide restore errors.
EOF

chmod 600 "${manifest_file}" "${readme_file}" 2>/dev/null \
  || fail 'Could not restrict backup metadata files.'

(
  cd "${staging_dir}"
  shasum -a 256 \
    roles.sql \
    schema.sql \
    data.sql \
    manifest.json \
    README_RESTORE.txt \
    > checksums.sha256 2>/dev/null
) || fail 'Backup checksum manifest generation failed.'
chmod 600 "${checksums_file}" 2>/dev/null \
  || fail 'Could not restrict the checksum manifest.'

node "${repo_root}/scripts/validate-supabase-dev-backup.mjs" \
  "${staging_dir}" \
  --staging \
  --quiet

# Signals are ignored only for the short atomic publication boundary. If
# rename or output fails, the EXIT trap removes the exact generated target.
trap '' HUP INT TERM
PLAVE_BACKUP_STAGING_DIRECTORY="${staging_dir}" \
PLAVE_BACKUP_FINAL_DIRECTORY="${final_backup_dir}" \
node <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const stagingDirectory = process.env.PLAVE_BACKUP_STAGING_DIRECTORY ?? "";
const finalDirectory = process.env.PLAVE_BACKUP_FINAL_DIRECTORY ?? "";

try {
  if (
    path.dirname(stagingDirectory) !== path.dirname(finalDirectory) ||
    path.basename(stagingDirectory) !== `${path.basename(finalDirectory)}.incomplete` ||
    fs.existsSync(finalDirectory)
  ) {
    process.exit(1);
  }
  fs.renameSync(stagingDirectory, finalDirectory);
} catch {
  process.exit(1);
}
NODE
cleanup_target="${final_backup_dir}"

printf '%s\n%s\n' \
  'Backup validation: PASS' \
  "Backup ID: ${backup_id}"

cleanup_target=''
staging_dir=''
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
