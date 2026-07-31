# Sprint 6G-C credential-handling security correction

Status: **SUPERSEDED — FIX VERIFIED BY SUCCESSFUL BACKUP AND LOCAL RESTORE**

Date: 2026-07-30

The correction history remains below. Its Owner rerun gate has been satisfied
by the verified backup recorded in
[SPRINT_6G_C_BACKUP_RESTORE_EVIDENCE.md](SPRINT_6G_C_BACKUP_RESTORE_EVIDENCE.md).

## Incident boundary

The first manual backup attempt failed before any dump or remote database
command succeeded. Terminal output exposed part of a database URL containing
the former credential and included:

```text
printf: %40@: invalid directive
```

The Owner revoked and reset that password. It must never be reused.

## Root cause

The repository backup script did not contain a `printf` call whose format
argument was `PLAVE_DEV_DB_URL`; its formats were fixed strings. Because URI
validation failed before the first dump command, the observed `printf` error
was produced by a surrounding credential-loading or command wrapper.

Passing a URL as the format argument, such as `printf "$value"`, causes
percent-encoded text like `%40` to be interpreted as a format directive. That
both explains the invalid-directive error and causes credential text to be
written to the terminal.

The audit also found a distinct repository-side weakness: the complete URL
was passed to `supabase db dump --db-url`, making it visible in process
arguments. That path has been removed.

## Corrected credential flow

The new flow is:

1. Owner enters the reset Session Pooler URI through terminal `read -s` inside
   a subshell with `set +x`.
2. A typed Node validator reads the URI only from the temporary environment.
3. Validation requires:
   - `postgresql` or `postgres`;
   - username `postgres.<exact project ref>`;
   - allowlisted Supabase Session Pooler hostname;
   - port `5432`;
   - database `/postgres`;
   - no query or fragment;
   - a non-empty, valid percent-encoded password.
4. Direct host, localhost, another project, missing host/port/database and
   transaction-pooler port `6543` fail closed before artifact creation.
5. Successful diagnostics contain only shortened project ref, verified
   hostname, port, database and `SESSION_POOLER`.
6. The dump runner invokes only Supabase CLI `db dump`, using `--role-only`,
   schema, and `--data-only --use-copy` stages. The `--db-url` value is a
   passwordless Session Pooler target. The password exists only in the child
   environment.
7. Shell and Node cleanup handlers remove their credential environment on
   success, error and handled signals. The Owner command uses a subshell so
   the parent shell never retains the variable.

No `set -x`, raw database stderr forwarding, URL logging or credential-bearing
artifact is allowed.

## Regression evidence

`npm run test:backup-security` passes eleven cases:

- alphanumeric password;
- percent-encoded `@`, `%`, `:`, `/` and `#`;
- missing `@host`;
- wrong project ref;
- wrong and direct hosts;
- transaction-pooler and missing ports;
- raw reserved characters and malformed percent encoding;
- sanitized validator output;
- failed validation creates no backup artifact;
- no URL format-string, `set -x` or credential-bearing `--db-url` path;
- dump runner rejects an invalid URI before creating files or spawning a
  database tool.

Only synthetic credentials are used. Tests do not connect to any database.

`npm run test:backup-errors` validates the allowlisted failure reasons and
sanitized output. `npm run test:backup-lifecycle` covers Supabase CLI role,
schema and data stages, atomic publication, each stage failure, zero-byte
output, validator failure, Docker/CLI preflight failure and signal cleanup.

Supabase CLI `2.110.0` was also tested against a disposable local database.
The version uses libpq `PGPASSWORD` for an explicit passwordless `--db-url`;
it does not consume `SUPABASE_DB_PASSWORD` alone in that mode. The runner
therefore scopes both variables to the child process. No credential is placed
in argv, captured output, metadata or dump artifacts.

The earlier `LOGICAL_DUMP_FAILED:ROLES` event did not retain its raw
diagnostic, so its exact database-level cause remains unverified. The current
implementation can safely classify future failures without printing raw
stderr.

## Owner rerun

Run from the repository in a private terminal:

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

Use only the newly reset Session Pooler URI. Do not paste it into chat, files,
shell arguments or reports.
