# Remote Supabase database classification audit

Status: **TEST_DEMO_ONLY_CONFIRMED — CONTROLLED_DEV_STAGING**

Audit date: 2026-07-30

## Scope and safety

This audit classifies the one remote Supabase URL configured for PLAVE without
reading individual rows or exposing personal data. It does not authorize
migrations `0035`/`0036`, publication, feature activation or any database
mutation.

The Owner manually ran the superseded diagnostic in a read-only transaction.
The session stopped at its first direct reference to
`supabase_migrations.schema_migrations` because that relation does not exist.
No mutation occurred. No application row or PII was read by the failed
statement.

The repository has no configured PostgreSQL connection, database password,
service-role credential or Supabase CLI project link. Its publishable browser
credential cannot prove that a sequence of aggregate REST calls belongs to
one read-only SQL transaction, so Codex did not use it for classification.

## Owner classification decision

The Owner confirmed on 2026-07-30 that all five accounts and all Practice,
Diagnostic, Parent and Teacher history in this project were created for
testing. The approved classification is:

- database classification: `TEST_DEMO_ONLY_CONFIRMED`;
- environment role: `CONTROLLED_DEV_STAGING`.

This classification does not make the data disposable. Existing rows must be
preserved unless a separate, explicit destructive-data decision is made.
Migrations `0035` and `0036`, publication and feature activation remain
unauthorized.

## Sanitized project identity

- Project ref: `ujmw…mkes`
- Host: `ujmw…mkes.supabase.co`
- Configured URL scheme: HTTPS
- Configured project URLs found: one
- Browser and server source: the same centralized environment contract
- Environment files: `.env.local` and the non-secret `.env.example`
- Supabase CLI link metadata: absent
- Repository `supabase/config.toml`: absent
- Deployment configuration in this repository: absent

Only the variable names `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are configured and consumed. Values,
keys and connection strings are not included in this report.

The repository does not establish whether this project is local, demo,
staging or production. It also does not prove whether another deployed
application outside this repository uses the same project.

## Repository migration state

The repository contains migrations `0001` through `0036`.

- `0034_multi_grade_runtime_foundation.sql` is the final non-draft runtime
  migration in the repository.
- `0035_grade2_numbers_to_1000_release_candidate_draft.sql` remains a draft.
- `0036_adaptive_practice_runtime_draft.sql` remains a draft.

This is repository state only. It does not prove the remote migration state.
The absence of `supabase_migrations.schema_migrations` does not prove that any
migration is absent: migrations may have been applied manually, tracked under
another relation, or applied before migration tracking existed. No conclusion
about remote `0035` or `0036` is currently valid.

## Superseded diagnostic

Do not run
[REMOTE_DATABASE_CLASSIFICATION_READONLY.sql](../../supabase/diagnostics/REMOTE_DATABASE_CLASSIFICATION_READONLY.sql)
again. It is retained only as a superseded pointer and contains no executable
diagnostic.

Root cause: the former script was Phase 2-style SQL and directly queried an
application-specific migration relation before catalog discovery confirmed
that relation existed.

## Manual catalog discovery — Phase 1

Run
[REMOTE_DATABASE_CATALOG_DISCOVERY_READONLY.sql](../../supabase/diagnostics/REMOTE_DATABASE_CATALOG_DISCOVERY_READONLY.sql)
once in the SQL Editor of the already selected project.

The script:

- starts with `BEGIN TRANSACTION READ ONLY`;
- returns one catalog-only result set;
- ends with `ROLLBACK`;
- reads only `pg_catalog`, `information_schema` and
  `pg_stat_user_tables`;
- uses `to_regclass` for expected relation presence;
- does not directly query migration or application relations;
- does not execute RPCs or use dynamic SQL;
- does not return user identifiers, email, names, answer content, solution
  content or secrets;
- reports table/column structure, approximate catalog counts and presence of
  expected `0035`/`0036` tables, functions, policies, grants and indexes.

Do not send screenshots or exports containing unrelated SQL Editor history,
project keys or account data. The aggregate result tables from this script are
sufficient for classification.

Catalog `approximate_count` values are discovery hints, not authoritative
counts. Phase 1 results were used to generate
`REMOTE_DATABASE_AGGREGATE_COUNTS_READONLY_V2.sql`, which references only
relations confirmed to exist. Phase 2 remains an explicit read-only
transaction and uses no dynamic SQL.

Static validation of the Phase 1 script passed:

- statement boundary is `BEGIN TRANSACTION READ ONLY` → one catalog `WITH …
  SELECT` → `ROLLBACK`;
- every direct `FROM`/`JOIN` target is an allowlisted `pg_catalog` or
  `information_schema` relation, or a CTE derived from those catalogs;
- no direct `public`, `auth`, `private` or `supabase_migrations` relation
  reference exists;
- no mutation, DDL, `CALL`, `DO`, dynamic SQL or application RPC exists;
- no PII, answer or solution column is selected;
- the unified output columns are `section`, `object_type`, `schema_name`,
  `object_name`, `detail` and `approximate_count`.

## Catalog discovery result

The Owner completed Phase 1 successfully in a read-only transaction. Catalog
estimates reported:

| Relation | Approximate rows |
| --- | ---: |
| `auth.users` | 5 |
| `public.profiles` | 5 |
| `public.student_profiles` | 3 |
| `public.teacher_profiles` | 1 |
| `public.parent_student_connections` | 3 |
| `public.practice_attempts` | 18 |
| `public.practice_answers` | 341 |
| `public.diagnostic_attempts` | 1 |
| `public.diagnostic_answers` | 24 |
| `public.learning_units` | 13 |
| `public.questions` | 312 |
| `public.question_solutions` | 312 |

No application migration-history relation was discovered. That absence does
not establish whether a migration was applied.

All three expected adaptive tables from draft `0036` were absent:

- `public.adaptive_practice_releases`
- `public.adaptive_practice_attempts`
- `public.adaptive_practice_answers`

This is evidence for `0036_SCHEMA_ABSENT`, not proof about migration-history
execution. The remote state of `0035` content remains unknown until Phase 2.

Catalog grants did not show `anon` or `authenticated` SELECT access to
`question_solutions`. PostgreSQL owner privileges are not browser exposure,
and the presence of `service_role` privileges is not evidence that the PLAVE
runtime uses service-role credentials.

## Manual exact aggregate audit — Phase 2

Run
[REMOTE_DATABASE_AGGREGATE_COUNTS_READONLY_V2.sql](../../supabase/diagnostics/REMOTE_DATABASE_AGGREGATE_COUNTS_READONLY_V2.sql)
once in the SQL Editor of the same already selected project.

The Phase 2 script:

- starts with `BEGIN TRANSACTION READ ONLY` and ends with `ROLLBACK`;
- returns one result set with `section`, `metric`, `exact_count`, `status`,
  `earliest_date`, `latest_date` and `notes`;
- reads only relations confirmed by Phase 1 plus system catalogs;
- returns exact identity/history/content counts without identifiers or row
  content;
- counts Grade 1 units, questions and solution mappings;
- checks the unit slug, 24 question mappings, code pattern, four skill groups,
  three visual kinds and validation objects unique to draft `0035`;
- classifies content presence only as `0035_CONTENT_ABSENT`,
  `0035_CONTENT_PRESENT` or `0035_CONTENT_PARTIAL`;
- rechecks `0036` through `to_regclass`/`to_regprocedure` without querying
  absent relations;
- counts only browser-role SELECT grants on `question_solutions`.

`0035_CONTENT_PRESENT` would prove that the expected content footprint exists,
not that migration `0035` was the mechanism that created it. Candidate ID and
content version are not stored by draft `0035` itself.

Static validation of Phase 2 passed:

- one `BEGIN READ ONLY` → `WITH … SELECT` → `ROLLBACK` flow;
- no relation outside the catalog-confirmed allowlist;
- no mutation, DDL, RPC execution or dynamic SQL;
- no PII, prompt, answer or solution payload selection;
- one unified result-set contract.

## Current classification

The Owner has classified the database:

`TEST_DEMO_ONLY_CONFIRMED`

The prior provisional classification was `DATA_PRESENT_TREAT_AS_REAL` because
catalog discovery showed accounts and learning history whose origin had not
yet been established. It is superseded by the explicit Owner confirmation
that the rows are test/demo data. Existing data must still be preserved.

Exact aggregate counts and the `0035` content footprint are still pending.
Remote deployment use cannot be established from current repository
permissions.

Backup/PITR status: **UNKNOWN**.

The project may be treated as controlled dev/staging under the Owner decision,
but no remote schema mutation is authorized until logical backup and local
restore verification are complete.

## Active remote-only RLS helper drift

A subsequent catalog-only remote diagnostic confirmed that
`public.rls_auto_enable()` is referenced by the enabled global event trigger
`ensure_rls`. The trigger runs on `ddl_command_end` for `CREATE TABLE`,
`CREATE TABLE AS` and `SELECT INTO`.

Classification:

- `KNOWN_OFFICIAL_ACTIVE_REMOTE_DRIFT`;
- `REMOTE_MIGRATION_BLOCKED`.

The former inference that the helper was inert was based on the schema-filtered
logical dump, which did not carry the global event trigger into the local
restore. That inference is superseded by the direct remote catalog result.
Remediation and recovery SQL are prepared as non-migration operations under
[`supabase/operations/remote-dev-rls-drift`](../../supabase/operations/remote-dev-rls-drift/README.md),
but neither has been applied.

## Conditions before any mutation

Before applying a migration or activating a pilot:

1. complete this read-only aggregate audit;
2. classify the database using the approved four-state policy;
3. verify backup/PITR independently in the Supabase dashboard;
4. confirm whether any deployed frontend/backend uses this project;
5. preserve all existing data for both `DATA_PRESENT_TREAT_AS_REAL` and the
   current `TEST_DEMO_ONLY_CONFIRMED` controlled-dev classification;
6. separately review and authorize migrations `0035` and `0036`;
7. keep Grade 2 DRAFT/HIDDEN and all feature flags false until a distinct
   controlled-pilot approval.

No PII, secret, user row, answer or solution content was read or written while
preparing this report.
