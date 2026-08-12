# PLAVE remote release handoff

This is a proposed Owner-authorized procedure. Nothing in this document records that a remote command has run. Never paste credentials, tokens, user identities or sensitive target metadata into the repository or terminal transcript.

## Authorization checkpoints

1. **Read-only preflight authorization:** reconcile the intended branch/commit, remote target classification, current migrations and active release state.
2. **Backup authorization:** create and verify a remote database backup using the Owner's approved provider workflow.
3. **Migration authorization (mutating):** apply exact canonical migration `0045_grades_2_9_local_public_release.sql` only after verifying migrations `0001–0044` and SHA-256 `8ef040428b424bf84fe50c4077a891e042956e77436aca9f6f55ca1bf19a663f`.
4. **Activation authorization (mutating):** run the exact-tuple Grades 2–9 PUBLIC activation operation after the read-only diagnostic passes.
5. **Deployment authorization (mutating):** deploy the accepted application commit with server-only release settings. Do not expose release mode through `NEXT_PUBLIC_*`.
6. **Post-deployment acceptance authorization:** run browser smoke journeys for Grades 1–9 plus Parent/Teacher scope checks.

## Proposed command classes

- **Read-only:** branch/commit reconciliation, migration inventory, checksum verification, release diagnostic, catalog diagnostic and post-release reads.
- **Mutating:** remote backup creation, migration 0045, PUBLIC activation, application deployment, deactivation and rollback. Each requires explicit Owner authorization at execution time.
- **Destructive:** database restore or infrastructure rollback. Do not run unless an approved rollback condition is met and the Owner explicitly authorizes the exact target.

This handoff intentionally omits runnable remote target strings and credentials. Use the provider's approved secret injection and deployment interfaces at execution time.

## Required sequence

1. Reconcile the authorized commit and frozen hashes.
2. Create and verify a remote backup.
3. Confirm canonical migrations `0001–0044` are present with no gap or duplicate.
4. Apply exact migration `0045` atomically.
5. Run the read-only release diagnostic and reconcile 2,460 questions, 287 skills, 163 source units, 128 runtime units, 274 adaptive skills and 13 fixed-safe skills.
6. Activate exact Grades 2–9 PUBLIC tuples.
7. Deploy the accepted application commit.
8. Run Grades 1–9 browser smoke and Parent/Teacher authorization smoke.
9. Produce a sanitized final remote receipt.

## Rollback conditions

Deactivate Grades 2–9 new starts if tuple/hash/count reconciliation fails, catalog exposure differs from policy, authorization or solution isolation fails, history/progress integrity regresses, or any grade journey dead-ends. Deactivation must preserve candidate data, attempts, answers and history. Restore a backup only for a separately authorized database-recovery event.
