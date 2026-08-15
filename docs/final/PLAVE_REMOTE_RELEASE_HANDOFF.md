# PLAVE remote release handoff

Migrations `0045`–`0047` have been applied and verified on the canonical project
according to preserved sanitized Owner-authorized operational evidence. This
handoff begins after schema materialization and the unified XP/activity schema;
it does not claim PUBLIC activation or a new application deployment. Never paste
credentials, tokens, user identities or sensitive target metadata into the
repository or terminal transcript.

## Authorization checkpoints

1. **Read-only preflight authorization:** reconcile the intended branch/commit, remote target classification, current migrations and active release state.
2. **Backup authorization:** create and verify a remote database backup using the Owner's approved provider workflow.
3. **Activation authorization (mutating):** run the exact-tuple Grades 2–9 PUBLIC activation operation after the read-only diagnostic and a fresh post-current-ledger backup/restore proof.
4. **Deployment authorization (mutating):** deploy the accepted application commit with server-only release settings. Do not expose release mode through `NEXT_PUBLIC_*`.
5. **Post-deployment acceptance authorization:** run browser smoke journeys for Grades 1–9 plus Parent/Teacher scope checks.

## Proposed command classes

- **Read-only:** branch/commit reconciliation, migration inventory, checksum verification, release diagnostic, catalog diagnostic and post-release reads.
- **Mutating:** remote backup creation, any future migration, PUBLIC activation, application deployment, deactivation and rollback. Each requires explicit Owner authorization at execution time.
- **Destructive:** database restore or infrastructure rollback. Do not run unless an approved rollback condition is met and the Owner explicitly authorizes the exact target.

This handoff intentionally omits runnable remote target strings and credentials. Use the provider's approved secret injection and deployment interfaces at execution time.

The Grades 2–9 operation package originally introduced after `0045` is
`supabase/operations/grades-2-9-remote-release/`. Do not use the historical
pre-0045 universal activation scripts: those pin an older ledger and inventory.
Run `DIAGNOSTIC_READONLY.sql` first, reconcile the complete current ledger,
preserve a fresh post-current-ledger/pre-activation backup, then use
`ACTIVATE_PUBLIC.sql` only against the independently verified canonical target.
Keep `DEACTIVATE.sql` available as the separately authorized, history-preserving
rollback.

## Required sequence

1. Reconcile the authorized commit and frozen hashes.
2. Create and verify a remote backup.
3. Confirm canonical migrations `0001–0047` are present with no gap or duplicate.
4. Confirm Grades 2–9 remain DRAFT/HIDDEN and reconcile 2,460 questions, 287 skills, 163 source units, 128 runtime units, 274 adaptive skills and 13 fixed-safe skills.
5. Retain a fresh verified post-0047/pre-activation backup and disposable restore proof.
6. Activate exact Grades 2–9 PUBLIC tuples.
7. Deploy the accepted application commit.
8. Run Grades 1–9 browser smoke and Parent/Teacher authorization smoke.
9. Produce a sanitized final remote receipt.

## Rollback conditions

Deactivate Grades 2–9 new starts if tuple/hash/count reconciliation fails, catalog exposure differs from policy, authorization or solution isolation fails, history/progress integrity regresses, or any grade journey dead-ends. Deactivation must preserve candidate data, attempts, answers and history. Restore a backup only for a separately authorized database-recovery event.
