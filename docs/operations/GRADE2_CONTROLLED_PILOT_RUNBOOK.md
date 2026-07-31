# Grade 2 controlled-pilot runbook

> **ARCHIVED_NON_OPERATIONAL:** Historical evidence only. Every remote and
> PROJECT003 instruction below is frozen and must not be executed. Current
> Owner operations are limited to the PROJECT004 loopback local stack.

Status: **membership package ready — Owner private UUID action required;
activation blocked**.

Candidate:

- ID: `g2-numbers-to-1000-rc1`
- Content version: `g2n1000-1.0.0-rc.1`
- Bundle SHA-256:
  `1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530`
- Publication state: `DRAFT`
- Student visibility: `HIDDEN`

PLAVE does not describe this candidate as Ministry- or expert-endorsed.

## Verified prerequisite

Migration `0036` grants the adaptive RPCs to `authenticated`, requires
`PUBLISHED/VISIBLE`, and has no Student-specific database membership. A
server-only environment allowlist protects PLAVE routes but cannot protect a
direct user-JWT PostgREST RPC call.

`0037_adaptive_controlled_pilot_eligibility_draft.sql` is
`APPLIED_AND_VERIFIED`; its remote read-only post-check returned `31/31 PASS`.
It added the private membership table, availability RPC, and membership checks
in start/submit without enrolling a member. Do not rerun or modify `0037`.

The verified starting state is exactly one available Grade 2 test Student,
zero pilot members, false database activation flags, a `DRAFT/HIDDEN`
candidate, and zero adaptive attempts/answers.

## Owner membership operation

1. Open Supabase Dashboard project `plave-project003-dev`. In the SQL Editor,
   inspect the browser URL and require the project ref to be exactly
   `ujmwuhwfwbrmudtmmkes`. Stop on any mismatch.
2. This is a dual confirmation: PostgreSQL cannot securely infer a Dashboard
   project ref. The SQL requires the Owner to type the exact ref, while its
   independently verifiable defense is the expected 0036/0037 schema,
   release binding, Grade 1/history baseline, and canonical Grade 2
   database-row semantic fingerprint. The SQL must not be described as proving
   Dashboard identity by itself.
3. Open the controlled dev project’s **Authentication → Users** screen.
4. Identify the one Student fixture owned by the Owner and copy its UUID
   locally. Do not paste it into chat, screenshots, source code, or operation
   logs.
5. Open
   `supabase/operations/grade2-controlled-pilot/ENROL_ONE_GRADE2_TEST_STUDENT.sql`.
   Copy it into a private SQL Editor buffer and replace the single
   `<OWNER_CONFIRM_AUTHORIZED_SUPABASE_PROJECT_REF>` with the exact authorized
   ref and replace `<OWNER_PRIVATE_STUDENT_UUID>` with the private UUID. Each
   placeholder occurs exactly once. Do not save the substituted SQL.
6. Execute the whole operation once. It fails before mutation unless the
   confirmation is exact, there is exactly one eligible auth-backed onboarded
   Student Grade 2 in the database, the selected UUID is that sole Student,
   membership is empty, all activation flags are false, all adaptive evidence
   is empty, and every frozen schema/content/history invariant holds.
7. The transaction takes locks in the documented fixed order across auth
   eligibility, content, history, adaptive, release, and membership tables.
   `SHARE` prevents concurrent writes during pre/post checks; membership uses
   `SHARE ROW EXCLUSIVE` for the single insert. Locks end at commit/rollback.
   This intentionally trades a brief controlled-dev write pause for a
   race-free owner operation and is not suitable as a runtime enrolment path.
8. The only intended mutation is one membership insert. No fixture marker,
   profile, student grade, content, release flag, or history row is changed.
9. In a new SQL Editor query, execute
   `supabase/diagnostics/0037_SINGLE_TEST_STUDENT_MEMBERSHIP_READONLY.sql`.
   Require every result row to be `PASS`. The diagnostic returns aggregates
   only. It checks the complete Grade 2 distribution, unique eligible Student
   binding, frozen 0036 release binding, semantic database-row fingerprint,
   false flags, zero adaptive attempt/answer evidence, and Grade 1/history
   baselines.

The release binding hash is verified against the stored 0036 row. The
database-row semantic fingerprint is independently recomputed from fields
actually stored in PostgreSQL and compared with the expected value generated
from canonical local source. Full recomputation of the original TypeScript
bundle hash is unsupported because PostgreSQL does not contain the private
audit and generator inputs; neither operation nor diagnostic claims otherwise.

Any SQL failure or diagnostic `FAIL` means stop: do not retry, configure
application activation flags, or run the activation operation until the state
has been reviewed.

## Private local allowlist setup

After the membership diagnostic passes, edit the Owner’s existing local
`.env.local` manually. Never commit it and never paste its value into chat:

   ```dotenv
   PLAVE_ADAPTIVE_PILOT_USER_IDS=<OWNER_TEST_STUDENT_UUID>
   PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED=false
   PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED=false
   PLAVE_CONTROLLED_PILOT_ENABLED=false
   PLAVE_RETENTION_RUNTIME_ENABLED=false
   ```

The exact three application pilot flag names found in source are:

- `PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED`
- `PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED`
- `PLAVE_CONTROLLED_PILOT_ENABLED`

They remain `false` in this membership-only step. Retention also remains
`false`.

Verify exactly one syntactically valid allowlist member without printing it:

   ```bash
   npm run check:controlled-pilot-env -- --mode=allowlist-count
   ```

Then verify the full pre-activation state:

   ```bash
   npm run check:controlled-pilot-env -- --mode=pre-activation
   ```

Expected values are exactly:

- `PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED=false`
- `PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED=false`
- `PLAVE_CONTROLLED_PILOT_ENABLED=false`
- `PLAVE_RETENTION_RUNTIME_ENABLED=false`

`--mode=activation` is reserved for a later Owner-approved activation and
requires the exact intended three true flags with retention false.

Restart the development server after changing `.env.local`. This does not
authorize activation; with all three application flags false and all database
activation flags false, access remains fail-closed.

Application access is granted only if the authenticated Student UUID is in
the server allowlist **and** the matching database membership/release flags
pass. Parent, Teacher, anonymous, other Students, general catalog,
recommendation, and fixed practice remain excluded.

## Future activation remains blocked

Do not run `ACTIVATE_G2_NUMBERS_CONTROLLED_PILOT.sql`, set the three
application pilot flags to `true`, publish, or seed adaptive data in this
step. Those actions require a separate Owner activation decision and a new
preflight.

## Deactivation contract

Run `DEACTIVATE_G2_NUMBERS_CONTROLLED_PILOT.sql`, then turn the three
application pilot flags off and restart the server.

Deactivation:

- blocks new starts and answer submissions;
- preserves attempt and answer history;
- does not remove membership or candidate content;
- does not publish Grade 2;
- does not change `schoolGrade`;
- pauses an in-progress attempt fail-closed until a separately approved
  reactivation.
