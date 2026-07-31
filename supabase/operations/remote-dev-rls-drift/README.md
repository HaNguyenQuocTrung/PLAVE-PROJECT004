# Remote dev RLS helper drift remediation

Status: **PREPARED — NOT APPLIED**

These are reviewed operations artifacts, not migrations. They must never be
placed in `supabase/migrations/` or run without a separate Owner approval.

## Remediation

Run
[`REMOVE_RLS_AUTO_ENABLE_REMOTE_DEV.sql`](./REMOVE_RLS_AUTO_ENABLE_REMOTE_DEV.sql)
as one complete SQL Editor operation only after:

1. selecting the controlled-dev project;
2. confirming the latest catalog diagnostic still matches the locked
   fingerprints and active `ensure_rls` metadata;
3. confirming a verified logical backup remains available;
4. pausing application writes for the short transaction.

The operation checks metadata, dependencies, ACL, the exact 24-table RLS
baseline, Grade 1 content counts and draft `0035`/`0036` absence before its
first permanent mutation. It then locks the application tables against
concurrent writes, snapshots counts/RLS flags, drops `ensure_rls` before
`public.rls_auto_enable()`, and checks every postcondition before commit.

Success returns one result set where:

- `event_trigger_ensure_rls` is `REMOVED` from `1` to `0`;
- `function_public_rls_auto_enable` is `REMOVED` from `1` to `0`;
- every aggregate content/history metric is `PRESERVED`.

Any metadata mismatch, permission error, lock failure, concurrent-state
change or postcondition failure aborts the transaction. If the SQL Editor
keeps the failed transaction session open, run `ROLLBACK;` before doing
anything else. Do not execute isolated fragments or manually continue after
an error.

## Recovery

[`RECOVER_RLS_AUTO_ENABLE_REMOTE_DEV.sql`](./RECOVER_RLS_AUTO_ENABLE_REMOTE_DEV.sql)
recreates the exact official helper and active event trigger. It is a
review-only recovery artifact and is not part of the approved remediation
procedure. Running it requires a separate Owner recovery decision.

Removing the helper does not disable RLS on an existing table. It only removes
the optional event-trigger mechanism that automatically enables RLS after
future table-creation DDL. Repository migrations explicitly enable RLS for
every current application table, including all three draft `0036` tables.
