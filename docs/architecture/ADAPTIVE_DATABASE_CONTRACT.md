# Adaptive database contract

Status: **DRAFT — STATICALLY VALIDATED, NOT APPLIED**

Typed transport parser:
`../../lib/practice/adaptive-database-contract.ts`.
Atomicity decision:
[ADR-0001-ADAPTIVE-PRACTICE-ATOMICITY.md](./ADR-0001-ADAPTIVE-PRACTICE-ATOMICITY.md).

## Persistence boundary

`adaptive_practice_releases`

- binds unit, candidate ID, content version, bundle hash and policy version;
- stores configurable policy snapshot;
- defaults to `DRAFT/HIDDEN` with runtime, pilot and retention flags false;
- has no browser table grant.

`adaptive_practice_attempts`

- owned by one Student;
- snapshots candidate/content/hash/policy/planner seed;
- stores lifecycle, revision, current question, counts and terminal reason;
- unique start idempotency key and one active attempt per
  Student/unit/content version;
- does not share or mutate fixed Grade 1 attempts.

`adaptive_practice_answers`

- one immutable evidence row per attempt/question;
- unique attempt/submission idempotency key;
- unique evidence sequence;
- stores normalized answer and server-computed correctness;
- has no browser mutation grant.

Retention persistence is absent.

## Public RPC contract

### Start/resume

```text
start_or_resume_adaptive_practice(unitSlug, idempotencyKey)
```

The function requires `auth.uid()`, Student role, completed onboarding, grade
2, published unit and release activation at all three database gates. It uses
an advisory transaction lock, returns an identical attempt on safe retry, and
selects the first question in the same transaction.

### Read current state

```text
get_adaptive_practice_state(attemptId)
```

The function checks ownership and returns only the current public question and
sanitized progress. It never returns answer key, solution, audit source,
future order, policy thresholds or Student ID.

### Submit

```text
submit_adaptive_practice_answer(
  attemptId,
  questionId,
  answer,
  expectedRevision,
  idempotencyKey
)
```

Within one function transaction it:

1. locks the owned attempt row;
2. verifies release/content binding;
3. normalizes the submitted answer;
4. handles an identical idempotency replay or rejects key reuse;
5. checks active status, revision and current question;
6. grades against private `question_solutions`;
7. inserts one answer/evidence row;
8. runs the enforcement planner on post-answer evidence;
9. increments revision once and writes current/terminal state;
10. returns feedback for the submitted question and a sanitized next state.

The signature has no user ID, correctness, answer key, next question, mastery
or terminal status parameter.

## Error and retry policy

| Code | Retry behavior |
|---|---|
| `REVISION_CONFLICT` | refetch, then require a deliberate retry |
| transient transport/database error | retry only with the same idempotency key; no automatic POST retry |
| `UNAUTHENTICATED`, `FORBIDDEN`, `UNIT_NOT_AVAILABLE` | do not retry |
| `CONTENT_VERSION_MISMATCH`, `ATTEMPT_NOT_FOUND`, `ATTEMPT_NOT_ACTIVE` | do not retry |
| `QUESTION_MISMATCH`, `DUPLICATE_SUBMISSION`, `INVALID_ANSWER` | do not retry |
| `INTEGRITY_FAILURE` | stop and investigate; do not expose raw SQL details |

Unexpected database exceptions collapse to `INTEGRITY_FAILURE`. UI/API
wording must map these codes to safe Vietnamese messages.

## Privilege model

- Three public RPCs are `SECURITY DEFINER`, `search_path = ''`, and executable
  only by `authenticated`.
- `SECURITY DEFINER` is necessary because the functions read private solutions
  and write tables that browser roles cannot mutate.
- Four private helpers are `SECURITY INVOKER` and have execute revoked from
  `PUBLIC`, `anon` and `authenticated`.
- All adaptive tables enable and force RLS, revoke direct browser table access,
  and public functions still perform explicit ownership checks.
- Direct PostgREST invocation is treated as expected hostile input.

Actual owner/BYPASSRLS behavior, function syntax, locks, rollback and grants
must be proven in the isolated database plan; static validation is not that
proof.
