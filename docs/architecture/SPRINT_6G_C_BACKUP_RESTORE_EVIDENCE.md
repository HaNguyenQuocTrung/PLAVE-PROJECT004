# Sprint 6G-C backup and local-restore evidence

Status: **RESTORE VERIFIED — ACTIVE REMOTE DRIFT, REMEDIATION PREPARED**

Date: 2026-07-30

## Approved source boundary

- Source classification: `TEST_DEMO_ONLY_CONFIRMED`
- Environment role: `CONTROLLED_DEV_STAGING`
- Remote mutation: not authorized and not performed
- Draft migrations `0035` and `0036`: not applied
- Grade 2 publication and feature activation: not authorized

## Verified backup

- Backup ID: `plave-dev-20260729T193011Z-42528f67`
- Artifact location: private Owner backup directory outside the repository
- Directory permission: `0700`
- File permissions: `0600`
- Validator result: `PASS`
- Credential patterns detected: `0`

| File | Size | SHA-256 |
|---|---:|---|
| `roles.sql` | 370 B | `168a95a9c745af5ed4679751f90419ac9dc434240a213b03e32a06d5664c2308` |
| `schema.sql` | 310,672 B | `b62be47faca25638fa3c760ff6c9ba49c16abc63ac68b13426c6262e1ce38a1f` |
| `data.sql` | 329,016 B | `a383afe7a7e6589b81eeca3f78dc3df8632bf860b8b14e0d047f97432a1cfec0` |

All five entries in `checksums.sha256` passed. The backup was revalidated
after restore and after local cleanup. It was not modified or deleted.

## Local restore result

The restore ran only against a dedicated local Supabase PostgreSQL container.
Roles, schema and data were restored in one transaction. Two local-runtime
compatibility issues were corrected in the reusable restore tooling:

1. macOS canonicalizes `/tmp` to `/private/tmp`; the target guard now uses
   `realpath("/tmp")`;
2. local `postgres` cannot execute the managed role-setting statement in
   `roles.sql`, so the verified local-only restore uses `supabase_admin`.

Local Supabase gives objects created by `supabase_admin` broad default
privileges. The restore now temporarily revokes those defaults before schema
creation and restores the local platform defaults after data restore, all in
the same transaction. This prevents local-only grants from contaminating the
recovered ACLs.

Supabase schema dump excludes the application-owned trigger on `auth.users`.
The restore recreates `on_auth_user_created` from the repository contract
after auth data is loaded, preventing the five recovered rows from being
reprocessed.

## Exact aggregate counts

| Metric | Expected | Restored |
|---|---:|---:|
| Auth users | 5 | 5 |
| Profiles | 5 | 5 |
| Student profiles | 3 | 3 |
| Teacher profiles | 1 | 1 |
| Parent–Student connections | 3 | 3 |
| Practice attempts | 18 | 18 |
| Practice answers | 340 | 340 |
| Diagnostic attempts | 1 | 1 |
| Diagnostic answers | 24 | 24 |
| Grade 1 units | 13 | 13 |
| Questions | 312 | 312 |
| Question solutions | 312 | 312 |

No identifier, email, answer or solution payload was selected or reported.

## Auth recovery boundary

Database-level Auth recovery was verified:

- 5 Auth users;
- 5 Auth identities;
- all 5 users have an identity;
- all 5 users retain a password record;
- all 5 users map to a profile;
- the application signup trigger exists and matches the repository baseline.

Existing-user sign-in was not attempted because that would require account
credentials or PII. This report does not claim an end-to-end Auth login test.

## Content and adaptive-draft boundary

- Grade 1: 13 units, 312 questions and 312 solutions.
- `grade-2-numbers-to-1000`: zero unit, question and solution rows.
- `private.is_valid_grade2_number_visual_spec`: absent.
- Adaptive tables from `0036`: `0/3`.
- Public adaptive functions from `0036`: `0/3`.
- Private adaptive helpers from `0036`: `0/4`.

This is evidence that `0035` content and `0036` schema are absent. It is not
an inference from a missing migration-history table.

## RLS, grants and Grade 1 object baseline

The restored database and a second clean local database with migrations
`0001`–`0034` applied as `postgres` matched on:

- 593 application schema objects;
- all relations, columns, constraints, indexes and types;
- all application function definitions and ACLs;
- all policies and RLS flags;
- all application triggers, including the `auth.users` signup trigger;
- 24 RLS-enabled public tables and 11 public policies;
- the three fixed-practice RPCs as `SECURITY DEFINER` with empty
  `search_path`;
- no `anon` or `authenticated` `SELECT` on `question_solutions`;
- no authenticated direct mutation grant on practice attempts or answers;
- no anonymous execution of fixed-practice RPCs.

## Baseline drift

The restored remote schema contains one additional object that is absent from
repository migrations `0001`–`0034`:

```text
public.rls_auto_enable()
```

The backup definition matches the optional helper published by Supabase:

- return type `event_trigger`;
- language `plpgsql`;
- `SECURITY DEFINER`;
- `search_path=pg_catalog`;
- handles only `CREATE TABLE`, `CREATE TABLE AS` and `SELECT INTO`;
- handles only table and partitioned-table objects in `public`, excluding
  system/temp schemas;
- its only dynamic statement is `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.

Official comparison sources:

- [Supabase Row Level Security — Auto-enable RLS for new tables](https://supabase.com/docs/guides/database/postgres/row-level-security#auto-enable-rls-for-new-tables)
- [Supabase Event Triggers](https://supabase.com/docs/guides/database/postgres/event-triggers)

The raw extracted function-definition SHA-256 is
`aac93332e8490e32d96d178dfad8f0d7ba1527dc6adf1b14adb717bdf46d4613`;
the whitespace-normalized lowercase definition SHA-256 is
`60620ceefcfe8ac0add4e9d8cc175fd6d748c2bee243ace65e23147862e99452`.

No `CREATE EVENT TRIGGER` statement exists in the logical schema dump, and the
restored local catalog consequently had no referencing event trigger. A later
direct, read-only remote catalog diagnostic established that the remote
database does have an active global event trigger. The schema-filtered logical
dump therefore cannot be used as evidence that a global event trigger is
absent.

The remote diagnostic reported:

- definition MD5 `6998ea6b4c2480f5d2e34b5dcf3f8d36`;
- normalized definition MD5 `685bfb43070e3afbcc764020048aaa0c`;
- event trigger `ensure_rls`;
- state `O`, event `ddl_command_end`;
- tags `CREATE TABLE`, `CREATE TABLE AS`, `SELECT INTO`;
- one active event trigger;
- zero extension dependencies;
- effective ACL including `PUBLIC EXECUTE`.

Sanitized metadata extracted from the backup/restored catalog:

- schema/name: `public.rls_auto_enable()`;
- owner: `postgres`;
- return type: `event_trigger`;
- language: `plpgsql`;
- security mode: `SECURITY DEFINER`;
- function config: `search_path=pg_catalog`;
- extension dependency count in the restored dump: `0`.

The schema dump contains no explicit `GRANT` or `REVOKE` statement for this
function. The remote catalog result, rather than dump omission, is the source
for the effective ACL and event-trigger state.

Current classification:

- `KNOWN_OFFICIAL_ACTIVE_REMOTE_DRIFT`;
- `REMOTE_MIGRATION_BLOCKED`.

The earlier `INERT_WITHOUT_EVENT_TRIGGER` and
`TOLERATED_REMOTE_ONLY_DEV_DRIFT` labels are superseded.

The helper will not be added to repository migrations. A future production
database must be created from repository migrations and must not inherit this
remote-only helper.

The catalog-only
[remote helper diagnostic](../../supabase/diagnostics/REMOTE_RLS_AUTO_ENABLE_CLASSIFICATION_READONLY.sql)
is available for an independent current-state check in the Supabase SQL
Editor. It fingerprints the function and reports ACLs, dependencies and event
triggers without executing the function or reading application data.

## Prepared remediation

The non-migration operation
[`REMOVE_RLS_AUTO_ENABLE_REMOTE_DEV.sql`](../../supabase/operations/remote-dev-rls-drift/REMOVE_RLS_AUTO_ENABLE_REMOTE_DEV.sql)
is prepared but not applied. Its separately reviewed recovery artifact is
[`RECOVER_RLS_AUTO_ENABLE_REMOTE_DEV.sql`](../../supabase/operations/remote-dev-rls-drift/RECOVER_RLS_AUTO_ENABLE_REMOTE_DEV.sql).

Local disposable verification proved:

- exact official fixture plus active trigger is removed;
- unexpected function fingerprint rolls back;
- unexpected extension dependency rolls back;
- unexpected trigger state rolls back;
- RLS/force-RLS flags on existing tables remain byte-equivalent;
- Grade 1 remains `13/312/312`;
- drafts `0035` and `0036` apply cleanly after remediation;
- the local stack and temporary work directory were removed.

No remote remediation, migration, publication or feature activation was
performed.

## Quality gates

Passed:

- backup validator and checksum verification;
- local restore guard tests;
- exact-count verifier;
- normalized schema inventory;
- RLS/grant checks;
- backup credential, safe-error and atomic-lifecycle tests;
- Practice regression;
- content-engine, adaptive planner/runtime/database and source-policy tests;
- Grade 1 release validator;
- Grade 2 POC and frozen-candidate validators;
- lint;
- typecheck;
- production build;
- `npm audit --audit-level=high` with zero vulnerabilities.

Frozen candidate hash remains
`1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530`.
Publication remains `DRAFT`, Student visibility remains `HIDDEN`, and all
four pilot/adaptive/retention flags remain false.

## Cleanup

Both exact local stacks—the restore target and clean `0001`–`0034`
baseline—were stopped and removed. Their containers, volumes, temporary
workdirs and schema-inventory files were removed. No broad Docker cleanup was
used. The verified backup remains intact outside the repository.

No remote query, remote mutation, migration apply, publication or feature
activation occurred during this restore verification.
