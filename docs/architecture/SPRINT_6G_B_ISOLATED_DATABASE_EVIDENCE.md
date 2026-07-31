# Sprint 6G-B isolated database evidence

Status: **PASSED LOCALLY — REMOTE NOT APPLIED**

Date: 2026-07-29
Scope: disposable local Supabase/PostgreSQL only

## Sanitized target identity

- Docker Desktop: client/server `28.1.1`.
- Supabase CLI: `2.110.0`.
- PostgreSQL: `17.6`.
- Temporary project ID: `plave-6gb-isolated-20260729-a`.
- API endpoint used by the harness: `127.0.0.1:57321`.
- Database endpoint used by every SQL command: `127.0.0.1:57322/postgres`.
- Supabase services ran in the project-specific local Docker network.
- The temporary database contained four synthetic principals only: two
  Students, one Parent and one Teacher.
- No real profile, attempt, answer or credential was copied into the target.

The repository did not contain `supabase/config.toml` during preflight, despite
the prerequisite note saying it existed. The test therefore used a
CLI-initialized configuration under a unique temporary directory. That
configuration had no project-ref/link metadata and used dedicated high ports.
The repository configuration was not created or changed.

No `supabase login`, `supabase link`, `supabase db push`, remote migration,
deployment or broad Docker cleanup command was run.

## Integrity snapshot

| Artifact | SHA-256 |
| --- | --- |
| Draft migration `0035` | `911816c87723b8e762c1a1d7470d49b616cfbb95495ddf28e166fd1d536c55f8` |
| Draft migration `0036` before test | `806f4c2474bd80771d900684c854e65fcf60cebac8ce7792b7c0e71bd8b8ecdf` |
| Draft migration `0036` after test | `806f4c2474bd80771d900684c854e65fcf60cebac8ce7792b7c0e71bd8b8ecdf` |
| Frozen candidate bundle | `1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530` |

Candidate identity remained:

- `g2-numbers-to-1000-rc1`
- `g2n1000-1.0.0-rc.1`
- seed `g2-review-number-language`

No candidate artifact or migration draft changed during the database test.

## Migration execution

Two clean-database runs were completed.

1. Migrations `0001`–`0034` applied in order.
2. The Grade 1 baseline was `13` units, `312` questions and `312` solutions.
3. Draft `0035` applied and produced one unpublished Grade 2 unit, 24
   unpublished questions and 24 private solutions.
4. Draft `0036` applied with three adaptive tables, required constraints and
   indexes, RLS/force-RLS, three public RPCs and four private helpers.
5. No adaptive attempt or answer was seeded by either migration.
6. The process was repeated from a database removed with project-scoped
   `supabase stop --no-backup`.

The three legacy Grade 1 practice function definitions retained these hashes
before and after `0035`/`0036`:

```text
start_or_resume_practice  4271e6cfc10930649b8594fc95ddc87d
submit_practice_answer    28a46ec0e113876b4160616f260bae18
get_practice_review       edb2539d401605dd6ee4c54e8565980d
```

### Migration rollback proof

On the second clean run, a temporary copy of `0036` received a deliberate
exception immediately before its final `COMMIT`. Migration execution failed as
expected. The database remained at `0035`; it contained zero adaptive tables,
zero adaptive public functions and all 312 Grade 1 questions.

The temporary failing fixture was then replaced by the byte-identical source
draft. The real `0036` applied successfully. This proves transaction rollback
for the exercised migration failure; it is not evidence about remote rollout.

## Authorization and RLS matrix

| Check | Result |
| --- | --- |
| Anonymous adaptive mutation RPC | Denied |
| Parent/Teacher adaptive start | `FORBIDDEN` |
| Student A reading or mutating Student B attempt | Denied |
| Student B reading or mutating Student A attempt | Denied |
| Direct adaptive table mutation by browser roles | Denied |
| Direct `question_solutions` SELECT by anon/authenticated | Denied |
| Private helper execution by authenticated | Denied |
| Public RPC execution by authenticated | Limited to the three intended RPCs |
| RLS and force-RLS on all three adaptive tables | Enabled |
| Hidden candidate direct start | `UNIT_NOT_AVAILABLE` |

The public RPCs use the caller principal, check role/grade/onboarding and
ownership, validate the expected revision and current question, calculate
correctness from the private solution, and return an allowlisted response.
Raw solution rows, audit source, future question order and raw SQL exceptions
were absent from tested responses.

## Atomicity and concurrency

The integration harness used PostgREST with authenticated local test JWTs; it
did not use the service role.

| Scenario | Evidence |
| --- | --- |
| Concurrent start, same key | 8 clients returned one attempt |
| Concurrent start, different keys while active | One active attempt |
| Concurrent submit, same key | 6 clients produced one answer/evidence |
| Different keys, same revision | One success; loser received `REVISION_CONFLICT` |
| Same key, changed payload | `DUPLICATE_SUBMISSION` |
| Wrong current question | `QUESTION_MISMATCH` |
| Malformed answer | `INVALID_ANSWER` |
| Submit by another Student | Denied |
| Submit after terminal state | `ATTEMPT_NOT_ACTIVE` |
| Forced error after evidence insert | Whole RPC transaction rolled back |
| Mastery path | Terminal `MASTERED_EARLY` at 12 answers |

No duplicate evidence, double revision increment, second current question,
partial terminal transition, lock timeout or deadlock was observed.

The test-only activation was returned to `DRAFT/HIDDEN`, all runtime/pilot/
retention flags were returned to false, and the unit plus its 24 questions were
returned to unpublished state. A cleanup omission in the initial harness only
reset the release row; the harness was corrected to reset unit and question
publication state as well. This was a test-harness issue, not a candidate or
migration change.

## TypeScript–SQL planner equivalence

- Cases: `105`.
- Evidence range: `0`–`24`.
- Planner seeds: `9`.
- Skill families: `4`.
- Semantic mismatches: `0`.
- Corpus identity:
  `4b0cc5abcfcff09a93baa2e79554feca3575c43430e5ccb19b1cee6bbaf294e0`.

The corpus covered missing coverage, strong and weak skills, the 75% boundary,
recent-correct pass/fail, early mastery from questions 12–23, max-question
remediation, every skill family and the prior regression where eight evidence
items must not permit completion before question 12.

## Local performance observations

Second-run integration observation:

- Requests: `52`.
- Concurrent start clients: `8`.
- Concurrent submit clients: `6`.
- Median local RPC/API latency: `11.09 ms`.
- Local p95: `69.58 ms`.
- Deadlocks: `0`.

These numbers describe one disposable local environment only and are not a
production capacity claim.

## Repository quality gates

Passed:

- existing practice regression;
- content-engine tests;
- adaptive planner/runtime/database contract tests;
- source-policy and frozen-release tests;
- Grade 1 release validator (`13/312/312`);
- Grade 2 POC validator over five seeds and 120 generated samples;
- frozen candidate/hash validator;
- adaptive migration static validator;
- isolated PostgreSQL migration/RLS/RPC/concurrency tests;
- TypeScript–SQL equivalence corpus;
- client solution-leak and application service-role scans;
- secret/PII/diagnostic-artifact scans;
- ESLint with zero warnings;
- TypeScript typecheck;
- Next.js production build;
- `npm audit --audit-level=high` with zero vulnerabilities.

No dependency was added. No `any`, `@ts-ignore`, direct application query to
`question_solutions`, service-role application reference or secret/PII logging
was introduced.

## Limits of this evidence

- It does not prove staging or production behavior.
- It does not authorize remote apply, publication or feature-flag activation.
- It does not measure production throughput.
- It does not persist or test retention scheduling.
- It does not prove state in an environment that was deliberately not queried.

The safe remote plan remains: review both draft checksums, take an environment
backup, apply in order under separate Owner authorization, verify read-only
invariants, keep all flags false and visibility hidden, and deactivate rather
than destructively deleting content/history if rollback is required.

## Cleanup

The exact temporary stack and its project-scoped data volume were removed
after the final repository gates. The dedicated API/database ports were free
after cleanup, and the temporary work directory was deleted. No unrelated
container, volume or process was targeted. PID `87465` was not running before
or after cleanup and was never signalled by this procedure; port `3000` also
had no listener before or after the test.
