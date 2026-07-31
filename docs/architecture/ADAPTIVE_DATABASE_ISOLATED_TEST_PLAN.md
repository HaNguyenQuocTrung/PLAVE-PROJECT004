# Adaptive database isolated test plan

Status: **PASSED LOCALLY — REMOTE NOT APPLIED**

Execution evidence:
[SPRINT_6G_B_ISOLATED_DATABASE_EVIDENCE.md](./SPRINT_6G_B_ISOLATED_DATABASE_EVIDENCE.md)

## Target

Use a disposable Supabase-compatible PostgreSQL environment containing no real
user data. Record PostgreSQL, PostgREST and extension versions. Do not point
the test harness at production or any shared user environment.

## Setup

1. Create a disposable database/project.
2. Apply migrations `0001` through `0034`.
3. Record read-only baseline counts and legacy function hashes.
4. Apply draft `0035`, then draft `0036`, once.
5. Verify both migration transactions either commit fully or leave no partial
   objects on intentional failure.
6. In a test-only transaction, create synthetic auth/profile fixtures and
   temporarily set the frozen unit/release to published, visible and enabled.
7. Never copy real profiles, cookies, tokens, attempts or answers.

## Required tests

- start blocked while `DRAFT/HIDDEN` even with direct RPC;
- Student-only, onboarding, grade and ownership checks;
- start retry with one idempotency key returns one attempt;
- concurrent starts create one active attempt;
- first question matches TypeScript planner for fixed fixture seeds;
- state RPC returns current public question without solution/audit/future order;
- correct/incorrect grading matches frozen solutions;
- same submission/payload is idempotent;
- same submission/different payload returns `DUPLICATE_SUBMISSION`;
- two concurrent submissions on one revision commit one evidence row;
- stale revision returns `REVISION_CONFLICT`;
- wrong current question returns `QUESTION_MISMATCH`;
- terminal attempt rejects further answers;
- evidence/mastery/next question matches TypeScript for coverage, weak-skill,
  balanced-minimum, early-mastery, max-mastery, max-remediation and bank
  exhaustion fixtures;
- unexpected failure rolls back answer and attempt update together;
- anon has no function execution or table/solution read;
- authenticated has only three adaptive RPC execute grants and no table read;
- Parent/Teacher/other Student calls fail closed;
- legacy Grade 1 functions and rows remain byte/count equivalent;
- frozen candidate hash remains
  `1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530`.

## Concurrency procedure

Use two independent authenticated clients and a barrier so both submit the
same attempt/revision before either completes. Capture sanitized results,
answer count, evidence sequence, revision and terminal/current-question state.
Repeat with identical and different idempotency keys.

## Reset

Rollback each fixture transaction where possible. After the suite, destroy the
entire disposable target. Do not write cleanup SQL that can target production
history.

## Evidence to retain

- environment/version manifest;
- migration file checksums;
- migration application transcript without secrets;
- role/grant/RLS query output;
- deterministic TypeScript-versus-SQL decision vectors;
- concurrent request result matrix;
- rollback evidence;
- baseline and post-test Grade 1 checks;
- final confirmation that the disposable target was destroyed.
