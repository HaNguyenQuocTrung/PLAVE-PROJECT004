# PROJECT004 remote migration 0041

Status: Owner approved one apply attempt for the exact clean target, migration
`0041`, and pinned checksum. The approval is consumed before the single
transaction spawn and remains consumed whether the transaction passes or
fails.

Scope:

- Exact target: `plave-project004-dev-clean`.
- Exact migration:
  `0041_generated_practice_semantic_provenance.sql`.
- Migrations `0001`–`0040`, the active release bank, Grade 1 data, and the
  Grade 2 adaptive pilot are read-only preconditions.
- Generated practice remains `OFF`.

## Read-only preflight

```sh
npm run --silent remote-dev:migration-0041-preflight
```

The command prompts for the project reference and database password through
`/dev/tty`. It does not accept credentials in command arguments and prints
only aggregate state. Remote inspection uses the same stdin-based `psql`
transport as the universal activation package. Twelve bounded
`BEGIN READ ONLY` stages discover migration-history capabilities before
reading optional checksum columns. A failure reports only sanitized
SQLSTATE, stage, statement class, precondition ID, stderr category, and a
stable missing-routine class;
later stages remain `NOT_RUN`.

Migration-history discovery records the actual `data_type`/`udt_name`
capabilities before the history read. `version` is validated and compared as
text against the exact `0001`–`0040` set. Supabase `statements text[]` is never
passed to a scalar hash function: only an explicitly typed scalar element is
hashed when it represents the exact 0041 source stored by the controlled
wrapper. A native remote checksum is reported only when a compatible
`checksum` column exists; otherwise
`REMOTE_MIGRATION_CHECKSUM_CAPABILITY=UNAVAILABLE` is informational and the
prefix is guarded by exact versions plus the canonical semantic fingerprint.

Proceed to a separately approved apply only when all three markers are
present:

```text
MIGRATION_0041_ELIGIBLE=YES
CURRENT_RUN_MUTATION_PERFORMED=NO
PROJECT004_MIGRATION_0041_PREFLIGHT=PASS
```

Any source/checksum drift, missing/duplicate/foreign migration, partial
schema, release drift, enabled
generated runtime, enabled adaptive pilot, or security-boundary drift stops
the operation.

## Controlled apply

The apply entrypoint is unlocked for the Owner's one-time approval scoped to
the exact target, migration, pinned checksum, `BEFORE_0041` schema phase, five
existing curriculum attempts, and 41 existing learning-history rows:

```sh
npm run --silent remote-dev:migration-0041-apply
```

The command reruns the full preflight,
consumes a local mode-0600 non-secret approval receipt before mutation, and
executes at most one `psql` transaction. It does not call `supabase db push`,
reset, repair, pull, seed, activation, publication, or deployment.

The transaction takes an advisory lock, applies only the stripped body of
0041, verifies schema/functions/triggers/grants/RLS/history counts, records
the exact source and checksum in migration history, and commits only after
all postconditions pass. Failure is not retried. A fresh read-only
post-apply diagnostic must report `41/41`, `0001/0041`, `8/8` provenance
fields, unchanged learning-history counts, active release state, disabled
pilot/runtime, and a passing private-solution boundary.

If 0041 is already present with the exact checksum and schema, the command is
a read-only `ALREADY_APPLIED` no-op and consumes no new approval.
