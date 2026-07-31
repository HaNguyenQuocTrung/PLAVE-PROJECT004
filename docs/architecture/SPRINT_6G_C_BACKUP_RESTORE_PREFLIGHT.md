# Sprint 6G-C remote dev backup and restore preflight

Status: **SUPERSEDED — VERIFIED BACKUP RESTORED; BASELINE DRIFT RECORDED**

Date: 2026-07-30

The historical preflight and failed-artifact notes below are retained for
audit history. Current backup, restore, security, count, drift and cleanup
evidence is recorded in
[SPRINT_6G_C_BACKUP_RESTORE_EVIDENCE.md](SPRINT_6G_C_BACKUP_RESTORE_EVIDENCE.md).

## Approved environment classification

- Database: `TEST_DEMO_ONLY_CONFIRMED`
- Environment role: `CONTROLLED_DEV_STAGING`
- Data preservation: required
- Remote mutations: not authorized
- Draft migrations `0035` and `0036`: not authorized for remote apply
- Grade 2 publication and feature activation: not authorized

The classification is an Owner statement about the origin of the existing
accounts and history. It is not permission to reset them.

## Sanitized preflight

- Docker CLI and daemon: available.
- Supabase CLI `2.110.0`: available.
- Supabase dump container
  `public.ecr.aws/supabase/postgres:17.6.1.143`: locally available and able to
  run `pg_dump --version` with networking disabled.
- Local PostgreSQL client `16.14`: available.
- Remote project identity source: present in the existing public environment
  contract.
- `PLAVE_DEV_DB_URL`: not present in the Codex process environment.
- Supabase CLI link metadata: absent.
- Repository `supabase/config.toml`: absent.
- Port `3000`: not used or signalled during preflight.
- Migration files in the repository: `0001`–`0036`.

No remote database command was run because the temporary Session Pooler
credential was unavailable. No password, connection string, key or user data
was read or logged.

## Prepared backup tooling

[backup-supabase-dev-readonly.sh](../../scripts/backup-supabase-dev-readonly.sh)
requires `PLAVE_DEV_DB_URL`, validates that it is a non-local Session Pooler
URL for the same project ref as the existing public environment contract, and
then runs three Supabase CLI `db dump` stages:

1. `--role-only`;
2. schema;
3. `--data-only --use-copy`, excluding `storage.buckets_vectors` and
   `storage.vector_indexes`.

It creates a unique directory outside the repository with permissions `0700`
and files with permissions `0600`. The resulting artifact contains:

- `roles.sql`;
- `schema.sql`;
- `data.sql`;
- `manifest.json`;
- `checksums.sha256`;
- `README_RESTORE.txt`.

[validate-supabase-dev-backup.mjs](../../scripts/validate-supabase-dev-backup.mjs)
checks artifact location, file type, permissions, size, manifest identity,
hashes and common credential patterns. It does not print dump contents.

## Credential-safe manual gate

The Owner must load the Session Pooler URL in a private terminal prompt. It
must not be pasted into chat, source files, shell history or reports.

```bash
(
  set +x
  trap 'PLAVE_DEV_DB_URL=; unset PLAVE_DEV_DB_URL' EXIT HUP INT TERM
  printf '%s' 'Session Pooler URI (hidden): '
  IFS= read -r -s PLAVE_DEV_DB_URL
  printf '%s\n' ''
  export PLAVE_DEV_DB_URL
  ./scripts/backup-supabase-dev-readonly.sh
)
```

The backup script refuses localhost, a non-pooler host, a different project
ref, a URL without a password, or a backup location inside the repository.
It requires Session Pooler port `5432` and database `postgres`, rejects
transaction-pooler port `6543`, and accepts valid percent-encoding in the
password. The complete URL and password are never command arguments. The
passwordless connection target is passed through `--db-url`; the password is
scoped to the dump child process through both `SUPABASE_DB_PASSWORD` and
standard libpq `PGPASSWORD`.

Supabase CLI `2.110.0` was tested locally and does not consume
`SUPABASE_DB_PASSWORD` alone for an explicit `--db-url`. It does consume
`PGPASSWORD`. Supplying both variables keeps the preferred Supabase-named
contract available while preserving compatibility with this locked CLI
version. Neither variable is inherited back into the parent process.

## Prepared local restore boundary

[restore-supabase-dev-local.sh](../../scripts/restore-supabase-dev-local.sh)
accepts only:

- a verified backup artifact;
- a work directory under `/tmp/plave-6gc-restore.*`;
- a Supabase config with project ID prefixed `plave-6gc-restore-`;
- a database URL reported by that running local stack;
- a localhost database endpoint whose port is not `3000`.

It unsets the remote URL inside the restore process, restores roles, schema and
data in one local transaction, then runs
[LOCAL_RESTORE_EXACT_COUNTS.sql](../../supabase/diagnostics/LOCAL_RESTORE_EXACT_COUNTS.sql).
The verifier expects aggregate counts only and returns no identifiers,
answers, prompts or solutions.

The disposable local stack has not been created because no validated backup
exists yet.

## Recovery scope and limits

The logical dump is intended to cover database roles, application schema and
database rows. The data dump should include `auth.users`; this must be proven
by the exact local count before claiming Auth recovery.

The backup does not include:

- Storage object bytes;
- Edge Functions;
- platform configuration;
- secrets or API keys;
- dashboard backup/PITR state.

Storage currently has no object bytes according to the Owner-provided
environment evidence, but Storage remains outside the logical database backup.
Backup/PITR availability remains `UNKNOWN` and must be checked separately in
the Supabase dashboard.

## Baseline audit still pending

After a successful restore, normalized restored schema must be compared with a
separate clean local Supabase database that has repository migrations
`0001`–`0034` applied in order. The allowed result is one of:

- `BASELINE_MATCH`;
- `BASELINE_DRIFT`;
- `BASELINE_UNVERIFIED`.

No migration-history table will be created or repaired during this audit.
Until both restore and normalized-schema comparison pass, remote migration
apply remains blocked.

## Migration-history recommendation

The available strategies are:

1. Continue manual SQL on the current dev project: lowest immediate mutation,
   but keeps migration state implicit and is unsuitable as a long-term
   production release process.
2. Bootstrap `supabase_migrations` on the current project: only defensible
   after a complete baseline match and a separately reviewed mutation plan.
3. Use CLI migration repair: not appropriate in this sprint because the
   project is not linked, history is absent, and repair would mutate remote
   metadata.
4. Create a reviewed baseline migration for a fresh future production
   project: preserves the existing dev database while giving the future
   environment deterministic history.

Recommendation: keep the current dev project on manual SQL while the baseline
is verified, and prepare a reviewed baseline migration for a fresh future
production project. Do not bootstrap or repair the current remote migration
history during Sprint 6G-C.

## Local quality gates completed before credential gate

Passed without connecting to the remote database:

- backup and restore script shell syntax;
- manifest validator syntax;
- missing-credential fail-closed behavior;
- Session Pooler/project-ref and local-target static guards;
- read-only aggregate verification SQL guard;
- repository backup-artifact scan;
- sanitized documentation scan;
- existing Practice regression (`550` tests);
- content-engine tests (`12`);
- adaptive planner/runtime/database-contract tests (`40`);
- source-policy and frozen-release tests (`18`);
- Grade 1 validator (`13` units, `312` questions, `312` solutions);
- Grade 2 POC validator over five seeds;
- frozen candidate validation and hash;
- adaptive database draft static validation;
- lint;
- typecheck;
- production build;
- `npm audit --audit-level=high` with zero vulnerabilities.

Frozen candidate SHA-256 remains
`1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530`.
All four adaptive/pilot/retention feature-flag defaults remain false.

Not run and not claimed:

- remote logical backup;
- backup manifest validation against a real dump;
- local restore;
- Auth recovery;
- exact restored-count comparison;
- normalized schema comparison;
- local-stack cleanup.

These remain blocked solely by the absent temporary `PLAVE_DEV_DB_URL`
credential.

## Credential-handling correction

The first manual attempt was blocked before a remote dump. Terminal output
included part of the now-revoked credential and reported
`printf: %40@: invalid directive`.

No line in the repository backup script used the URL as a `printf` format
string; all repository `printf` calls used fixed formats. The observed error
therefore came from a surrounding credential-loading or command wrapper that
treated the URL as a format string. In shell, a percent-encoded sequence such
as `%40` is interpreted as a format directive when the value itself is passed
as the first argument to `printf`, which also explains why URL text reached
terminal output.

The repository script nevertheless had a separate exposure: an early
implementation passed the complete credential-bearing URL to a child command,
making it visible in process arguments. The corrected implementation passes
only a passwordless target to Supabase CLI. A typed Node validator emits only
shortened project ref, allowlisted hostname, port, database and connection
mode. The logical-dump runner scopes the decoded password to the child
environment and returns stable errors without forwarding database stderr.

The revoked password was not reused in validation. All correction tests use
synthetic credentials. The Supabase-supported dump path was additionally
verified against a disposable local database only.

## Supabase-supported dump path correction

The prior manual rerun established only `LOGICAL_DUMP_FAILED:ROLES`. Its raw
database diagnostic was intentionally suppressed, so it cannot now be
classified reliably as authentication, propagation, DNS, SSL, Docker,
permission, or tool incompatibility failure.

The role stage no longer invokes raw `pg_dumpall`. All three stages now use
Supabase CLI `2.110.0`, which owns the filtering of Supabase-managed roles and
schemas. Failures are reduced to an allowlisted reason without leaking the
connection target or raw database message:

```text
LOGICAL_DUMP_FAILED:<STAGE>:<SAFE_REASON>
```

An isolated local database test produced non-empty role, schema and data
dumps; verified role/schema filtering and both data exclusions; and exercised
real authentication and permission failures. The disposable container,
volume and temporary directory were removed after evidence collection.

## Owner-supplied backup verification

The verification result for backup ID
`plave-dev-20260729T185533Z-cbe208bd` is recorded in
[SPRINT_6G_C_BACKUP_RESTORE_EVIDENCE.md](SPRINT_6G_C_BACKUP_RESTORE_EVIDENCE.md).
Its private directory exists with restrictive permissions but contains no
files. The manifest validator therefore failed before local stack creation.
No restore, exact-count comparison, Auth-recovery check, or normalized schema
comparison has been claimed.
