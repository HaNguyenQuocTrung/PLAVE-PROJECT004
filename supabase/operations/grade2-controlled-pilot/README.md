# Grade 2 controlled-pilot operations

> **ARCHIVED_NON_OPERATIONAL:** Historical evidence only. Every remote and
> PROJECT003 instruction below is frozen and must not be executed. Current
> Owner operations are limited to the PROJECT004 loopback local stack.

These operations are preparation artifacts. They have not been run remotely.

The pilot keeps `grade-2-numbers-to-1000` and all 24 questions
`DRAFT/HIDDEN` and unpublished. Migration `0037` is required first because
the user-JWT RPC channel must enforce database-side membership in addition to
the server-only application allowlist.

## Membership and application setup

1. Confirm the Dashboard project name is exactly `plave-project003-dev` and
   the project ref shown in the SQL Editor URL is exactly
   `ujmwuhwfwbrmudtmmkes`. PostgreSQL cannot independently discover that
   Dashboard ref, so this manual check is mandatory.
2. In a private SQL Editor session, copy
   `ENROL_ONE_GRADE2_TEST_STUDENT.sql`. Replace its one project-confirmation
   placeholder with the exact authorized ref and its one UUID placeholder with
   the sole eligible onboarded Student Grade 2 UUID. Substitute only in the
   private editor buffer; never save or share it.
3. Execute the whole file once. It locks protected tables only for its short
   transaction, verifies the 0036/0037 schema and canonical database-row
   fingerprint, requires exactly one eligible Grade 2 Student and inserts only
   one membership. It is an owner operation, not a runtime path.
4. In a new query, run
   `0037_SINGLE_TEST_STUDENT_MEMBERSHIP_READONLY.sql` and require every row to
   be `PASS`. Its result is aggregate-only.
5. In the server-only environment, set
   `PLAVE_ADAPTIVE_PILOT_USER_IDS` to the same UUID.
6. Verify allowlist count without printing identity:
   `npm run check:controlled-pilot-env -- --mode=allowlist-count`.
7. Keep the three server-only pilot flags `false` until a separate activation
   authorization. The exact flags are:
   `PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED`,
   `PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED`, and
   `PLAVE_CONTROLLED_PILOT_ENABLED`.
   `PLAVE_RETENTION_RUNTIME_ENABLED` remains `false`.
8. Verify the current membership-only flag state, not merely the allowlist:
   `npm run check:controlled-pilot-env -- --mode=pre-activation`.
9. Restart the development server. Verification may report only allowlist
   count `1`; it must never print the UUID.
10. A future, separately approved activation must use
   `--mode=activation` to require the exact intended three true flags and
   retention false.
11. Run `ACTIVATE_G2_NUMBERS_CONTROLLED_PILOT.sql` once only after a separate
   Owner approval, then run `POST_ACTIVATION_READONLY.sql` in a new query.

## Deactivation policy

`DEACTIVATE_G2_NUMBERS_CONTROLLED_PILOT.sql` blocks every new start and every
new answer submission by turning both database activation flags off. It does
not delete attempts, answers, evidence, membership, or candidate content.
The owner-only attempt state RPC remains read-only, but the application gate
must also be turned off, so an in-progress pilot is paused fail-closed until
a later approved reactivation.

No operation publishes the unit, publishes a question, enables retention, or
changes `schoolGrade`.
