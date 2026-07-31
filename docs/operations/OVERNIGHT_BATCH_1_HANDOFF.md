# Overnight Batch 1 handoff

> **ARCHIVED_NON_OPERATIONAL:** Historical handoff only. It is not a current
> command source, target definition, fallback, or transfer plan.

Date: 2026-07-30
Final local status: **READY FOR HUMAN REVIEW**
Remote actions performed: **false**
Secrets observed: **false**

## Scope and boundaries

Work was limited to `/Users/hatrung/Desktop/PLAVE-PROJECT004`.
No remote Supabase action, real membership, real UUID, activation,
publication, migration, deployment, Docker action, network action, git
mutation, or `.env.local` read/write was performed. PROJECT003 was not
accessed or modified.

## Independent-review findings and remediation evidence

### BLOCKER — project-target confirmation

Closed in local artifacts. The membership operation has exactly one mandatory
project-ref placeholder and fails before mutation unless it equals
`ujmwuhwfwbrmudtmmkes`. The runbook also requires the Owner to verify project
name `plave-project003-dev` and the SQL Editor URL project ref. The limitation
is explicit: PostgreSQL cannot independently discover a Dashboard project
ref. Defense in depth is provided by required/exact schema columns, the exact
0036 release binding, canonical candidate semantic fingerprint, and frozen
content/history invariants. No false SQL-only project-identity claim remains.

### HIGH — unique test Student

Closed in code/model tests. Under table locks, the operation counts every
auth-backed, onboarded `STUDENT` Grade 2 and requires exactly one; it separately
requires the selected private UUID to match that sole eligible row. It never
returns identity/PII and does not create a fixture marker or change
`profiles`/`student_profiles`.

### HIGH — diagnostic completeness

Closed in static/read-only artifacts. The diagnostic checks:

- one Grade 2 unit and zero published Grade 2 units;
- 24 total, 24 unpublished and zero published Grade 2 questions;
- 24 solution mappings; 16 MCQ; 8 NUMBER_INPUT;
- four skill families with six questions each;
- exact release candidate/content version/seed/policy/bundle and adaptive
  policy values from 0036;
- exactly one membership bound to the sole eligible Grade 2 Student;
- zero true database activation flags;
- zero adaptive attempts and zero adaptive answer/evidence rows;
- frozen Grade 1 and practice/diagnostic history aggregates;
- required/exact 0036/0037 table column fingerprint;
- database-row semantic fingerprint
  `0274b7f3b49830935dbb7120ecd661ec26ca725cf675f1429eea98d975d5b8d5`.

The release binding hash is verified. The database-row fingerprint is
recomputed from fields PostgreSQL actually stores and compared to an expected
value generated from canonical migration 0035 source. Full original
TypeScript bundle recomputation is explicitly `UNSUPPORTED` because private
audit/generator inputs are absent from the database.

### HIGH — concurrency/content-history protection

Closed in operation design and static/model tests. One short transaction locks
auth eligibility, content, Grade 1 history, diagnostic history, release,
adaptive history, and membership tables in a fixed order. Protected tables use
`SHARE`; membership uses `SHARE ROW EXCLUSIVE` for the sole insert. Pre/post
semantic checks and the insert are in the same transaction. Any lock failure
or invariant failure rolls back. The runbook documents the controlled-dev
write-pause trade-off and forbids this operation as a runtime enrolment path.

### MEDIUM — placeholder enforcement

Closed. UUID and project placeholders each occur exactly once. Tests cover
unchanged placeholders, malformed UUID, wrong project ref, and synthetic-only
UUID cases. No real identity or credential is embedded.

### MEDIUM — environment flags verification

Closed. `--allowlist-only` was removed. The checker now has:

- `--mode=allowlist-count` (identity-hidden count only);
- `--mode=pre-activation` (all four flags exactly false);
- `--mode=activation` (future exact intended flags only).

Synthetic environment invocations passed without reading `.env.local`.

### MEDIUM — semantic tests

Closed at the available local level. Model/static tests cover placeholder,
wrong project, zero/multiple eligible Students, selected mismatch, existing
membership, partial content, published question, missing solution mapping,
true activation flag, adaptive history drift, fixed lock order, pre/post
semantic comparison, and single allowed mutation.

`LOCAL_DB_INTEGRATION_PENDING`: the existing isolated Supabase/PostgreSQL
harness requires an isolated local stack. It was not executed because this
batch forbids Docker/network. No integration PASS is claimed.

## Registration false-failure audit

Code-proven cause: `registerAccount` previously mapped almost every non-
“already registered” `signUp` error to `ok:false` with “could not send
confirmation email.” That conflated account creation, confirmation state,
delivery failure, rate limiting, trigger failure, and transport uncertainty.
It could therefore render a false failure even when the auth account/profile
had been created.

Implemented outcomes:

- `CREATED_SESSION`
- `CREATED_REQUIRES_CONFIRMATION`
- `CREATED_EMAIL_DELIVERY_UNCERTAIN`
- `EMAIL_RATE_LIMITED`
- `DATABASE_TRIGGER_FAILED`
- `USER_ALREADY_EXISTS`
- `VALIDATION_FAILED`

The action performs exactly one `signUp`, never resends or auto-retries POST,
preserves production email confirmation, signs out an unexpected created
session, and never logs email/UUID/password/token/raw errors. Tests cover
Student Grade 2 metadata plus Parent and Teacher metadata and all outcome
families.

UNKNOWN: without remote Auth/SMTP/database logs, the historical incident
cannot be conclusively attributed to SMTP delivery, rate limiting, transport,
or a Supabase response edge case. No remote-root-cause claim is made.

## Files created or modified

- `app/register/actions.ts`
- `app/register/page.tsx`
- `lib/auth/registration-result.ts` (new)
- `package.json`
- `scripts/check-controlled-pilot-env.ts`
- `scripts/validate-controlled-pilot-package.mjs`
- `supabase/operations/grade2-controlled-pilot/ENROL_ONE_GRADE2_TEST_STUDENT.sql`
- `supabase/operations/grade2-controlled-pilot/README.md`
- `supabase/diagnostics/0037_SINGLE_TEST_STUDENT_MEMBERSHIP_READONLY.sql`
- `docs/operations/GRADE2_CONTROLLED_PILOT_RUNBOOK.md`
- `tests/single-test-student-membership-package.test.mjs`
- `tests/registration-result.test.ts` (new)
- `tests/practice-regression.test.ts`
- `docs/operations/OVERNIGHT_BATCH_1_HANDOFF.md` (new)
- `docs/operations/OVERNIGHT_BATCH_1_STATUS.json` (new)

## Local validation actually run

- 6J-B remediation: 7/7 PASS.
- Controlled-pilot validator: PASS.
- Pilot eligibility: 10/10 PASS.
- Adaptive API integration: 11/11 PASS.
- Registration/auth outcome tests: 5/5 PASS.
- Existing practice regression: 550/550 PASS.
- Content engine: 12/12 PASS.
- Adaptive practice/runtime/database: 16/16, 16/16, 8/8 PASS.
- Source policy and frozen Grade 2 candidate: 11/11 and 7/7 PASS.
- Adaptive runtime draft validator: PASS.
- Grade 1 full validator: 13 units, 312 questions, 312 solutions PASS.
- Grade 2 POC and release validators: PASS.
- ESLint: PASS.
- TypeScript typecheck: PASS.
- Next.js production build: PASS (54 static pages generated).
- Secret/service-role, committed UUID, PII/logging, `any`/`@ts-ignore`,
  and raw/pre-submit solution leak scans: PASS.
- Migration 0035 operation tests: 3/3 PASS.
- Migration 0036 operation tests: 4/4 PASS.
- Migration 0037 package validator: PASS.

One practice regression failure caused by the intentional metadata helper
refactor was fixed once by updating that test to the new helper contract, then
registration and all 550 practice tests passed. One expected semantic
fingerprint mismatch was fixed once by including the fixed unit slug in
canonical serialization, then the remediation suite and package validator
passed. An initially over-broad solution scan matched legitimate post-submit
feedback; it was narrowed to raw/pre-submit database fields and the adaptive
API leak suite passed.

## Pending validation

- `LOCAL_DB_INTEGRATION_PENDING`: execute the membership SQL and concurrency
  cases against a disposable isolated local Supabase stack. Do not claim
  remote/project verification from this pending test.
- Owner-only SQL Editor preflight and read-only post-diagnostic remain pending.
- Real environment verification remains Owner-only; this batch used synthetic
  values and did not inspect `.env.local`.

## Exact application flags for this sprint

```text
PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED=false
PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED=false
PLAVE_CONTROLLED_PILOT_ENABLED=false
PLAVE_RETENTION_RUNTIME_ENABLED=false
```

## Candidate and migration hashes

- Frozen original bundle SHA-256:
  `1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530`
- Database-row semantic fingerprint:
  `0274b7f3b49830935dbb7120ecd661ec26ca725cf675f1429eea98d975d5b8d5`
- Migration 0035 SHA-256:
  `67bef151f4a8744c107835ce98ab5a5c30372cf76ff0328e02c1ca8649c7f206`
- Migration 0036 SHA-256:
  `d88b21c866c5d19708dc544faaa2c5828e3127844c50f0d7e76a3716c07fc6f1`
- Migration 0037 SHA-256:
  `91e2a4bb918bf894903f313d65d93bd80d8be98fad4fa2a1ca7c59cbbfe1b070`
- Membership operation SHA-256:
  `1a636323b469ebb99edbb2ba971ff08fd6d54e3a15409d07c5a00c84a35148cd`
- Membership diagnostic SHA-256:
  `bf576b1d5101a6a2adc60347f496b35221567e8849a16ce6f977d41a68957883`

## Proposed files to transfer to PROJECT003

Transfer only after human review:

- `app/register/actions.ts`
- `app/register/page.tsx`
- `lib/auth/registration-result.ts`
- `package.json`
- `scripts/check-controlled-pilot-env.ts`
- `scripts/validate-controlled-pilot-package.mjs`
- `supabase/operations/grade2-controlled-pilot/ENROL_ONE_GRADE2_TEST_STUDENT.sql`
- `supabase/operations/grade2-controlled-pilot/README.md`
- `supabase/diagnostics/0037_SINGLE_TEST_STUDENT_MEMBERSHIP_READONLY.sql`
- `docs/operations/GRADE2_CONTROLLED_PILOT_RUNBOOK.md`
- `tests/single-test-student-membership-package.test.mjs`
- `tests/registration-result.test.ts`
- the small registration assertion update in
  `tests/practice-regression.test.ts`

Do not transfer generated build output, `.env.local`, substituted SQL, UUIDs,
or credentials.

## Remaining Owner actions

1. Review this handoff and the exact SQL diff.
2. Run the pending disposable local database integration/concurrency harness.
3. In Supabase Dashboard, manually confirm project name and SQL Editor URL ref.
4. Privately substitute both one-time placeholders; never save substituted SQL.
5. Run the membership operation once, then run the aggregate read-only
   diagnostic and require every row to pass.
6. Configure the private allowlist and run both allowlist-count and
   pre-activation modes. Keep all four application flags false.
7. Do not activate, publish, migrate, deploy, or perform remote configuration
   without a separate Owner authorization.
