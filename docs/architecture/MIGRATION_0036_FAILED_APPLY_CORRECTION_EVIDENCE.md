# Migration 0036 failed-apply correction evidence

Date: 2026-07-30

This document records local, non-remote evidence for the failed controlled-dev
execution of migration `0036`. It contains no credential, personal data,
answer payload, or solution payload.

## Remote status

- Failed execution SHA-256:
  `806f4c2474bd80771d900684c854e65fcf60cebac8ce7792b7c0e71bd8b8ecdf`.
- Reported error: PostgreSQL `42P01`, with
  `public.adaptive_practice_releases` reported absent.
- Ledger state: `REMOTE_APPLY_FAILED`.
- Transaction state:
  `ROLLBACK_EXPECTED_NOT_YET_VERIFIED`.
- Activation state: `BLOCKED`.
- The failed checksum is not recorded as applied.

The Owner stopped after the first error. No remote rerun, post-apply
diagnostic, publication, or feature-flag activation occurred.

## Source-order audit

In the failed-checksum repository bytes:

1. `BEGIN` was the first statement.
2. `public.adaptive_practice_releases` was created at source line 16.
3. The release seed referenced it at source line 86.
4. Attempts referenced it at source line 141.
5. RLS and privilege statements referenced it after all three table
   definitions.
6. Approximate source line 322 was a `REVOKE` on
   `public.adaptive_practice_answers`, not the first reference to the release
   table.
7. The final validation block completed before the single final `COMMIT`.

The exact failed-checksum bytes were then applied as one `psql -c` query batch
to an isolated clean PostgreSQL database after migrations `0001–0034`, the
locked history fixture, and corrected migration `0035`. Before execution the
catalog contained zero adaptive tables. The batch completed with all three
tables, three public RPCs and four private helpers present.

Therefore a PostgreSQL static-resolution requirement does not explain the
reported error for the repository bytes. The exact remote execution-scope
discrepancy cannot be reconstructed from the sanitized error alone. The
available evidence is consistent with the remote editor not executing the
same complete statement scope, even though the intended source checksum was
reported. This remains an evidence limitation rather than a fabricated root
cause.

Earlier isolated tests did use the migration content, but they did not bind
the recorded checksum to a SQL-Editor-style single-query invocation and did
not produce a failed-apply catalog report. That evidence gap allowed a remote
execution-scope discrepancy to go undetected. The new tests bind the tested
bytes to the reported canonical SHA-256 and assert an empty adaptive catalog
before application.

## Canonical correction

Corrected SHA-256:

`d88b21c866c5d19708dc544faaa2c5828e3127844c50f0d7e76a3716c07fc6f1`

The correction does not alter the frozen candidate, content version, release
seed, bundle hash, policy thresholds, visibility, publication state, or
feature-flag defaults. It adds:

- a catalog-safe precondition that rejects partial adaptive objects;
- frozen-candidate count checks before schema mutation;
- all three table definitions before the release seed;
- an explicit table-phase boundary check before indexes, RLS, policies or
  functions;
- all postconditions before the only final `COMMIT`.

The correction seeds no adaptive attempt, answer, or evidence.

## Exact-file isolated verification

Two disposable local databases were created from migrations `0001–0034`.
Both loaded the locked synthetic history fixture and the exact corrected
`0035` checksum before testing `0036`.

| Check | Database A | Database B |
| --- | ---: | ---: |
| Corrected `0036` SHA asserted before execution | PASS | PASS |
| SQL-Editor-style one-batch execution | PASS | PASS |
| Post-apply diagnostic | 28/28 PASS | 28/28 PASS |
| Forced pre-commit exception | Not used | Non-zero exit |
| Catalog-safe rollback diagnostic after forced error | Not used | 19/19 PASS |
| Adaptive rows after canonical apply | Release only; attempts/answers 0 | Release only; attempts/answers 0 |

On database A, the authenticated integration harness also passed:

- hidden activation and authorization boundary;
- direct-table and private-solution protection;
- concurrent start and submit;
- duplicate submission and revision conflicts;
- rollback and terminal guards;
- 52 requests, local median 13.37 ms, local p95 115.79 ms;
- zero observed deadlocks.

The TypeScript–SQL equivalence corpus passed 105 cases across 9 seeds with
zero semantic mismatches. These local timings are not production-capacity
claims.

Two test-harness defects were corrected while collecting this evidence:

- duplicate-key testing now supplies a different valid numeric answer for a
  `NUMBER_INPUT` question instead of the invalid string `A`;
- the equivalence case transaction explicitly publishes its local question
  fixture, so it no longer depends on state left by a previous test.

Neither harness correction changes the frozen candidate or migration runtime
logic.

## Manual remote action boundary

Before any separately approved corrected migration execution, the Owner must
run:

`supabase/diagnostics/0036_FAILED_APPLY_ROLLBACK_READONLY.sql`

in the intended controlled-dev SQL Editor as one complete script. Every row
must report `PASS`. Any adaptive object presence keeps activation and remote
application blocked and requires a separate remediation plan.

No remote query or mutation was performed while producing this evidence.
