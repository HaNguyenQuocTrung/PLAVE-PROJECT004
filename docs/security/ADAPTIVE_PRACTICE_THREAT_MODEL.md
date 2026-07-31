# Adaptive practice threat model

## Security boundary

The browser and Next.js server both use the Student JWT when calling
PostgREST. The public application key and function name are not secrets.
Every public function must therefore remain secure under a forged direct call.

Protected assets:

- server-only correct answers and solutions;
- immutable answer/evidence history;
- frozen candidate/content/policy binding;
- current question and revision;
- mastery and terminal state;
- Student ownership;
- Grade 1 data and fixed runtime.

## Threats and controls

| Threat | Attack | Draft control |
|---|---|---|
| Hidden-content bypass | Directly call start while UI flags are off | Unit must be published **and** database release flags must be enabled/visible; draft row is `DRAFT/HIDDEN` with all flags false |
| IDOR | Submit/read another Student's attempt | `auth.uid()` and ownership predicate inside every public function |
| Forged grading | Send `isCorrect` or scoring key | Submit contract accepts only attempt/question/answer/revision/idempotency; correctness comes from `question_solutions` |
| Forged next question | Send planner decision or future order | No decision parameter; planner runs inside the locked transaction |
| Forged terminal state | Send mastery/remediation/status | No terminal parameter; state is derived from immutable evidence |
| Replay | Repeat POST | Attempt-scoped unique submission key; same payload returns idempotent result, changed payload is rejected |
| Double evidence | Concurrent keys for one current question | `FOR UPDATE`, revision check and primary key on attempt/question |
| Lost update | Two requests use one revision | Attempt row lock plus revision CAS; one transition increments once |
| Partial transition | Answer commits but next state does not | Grading, evidence, planning and attempt update share one function transaction |
| Candidate drift | Resume against another version | Attempt snapshots candidate/version/hash/policy; submit matches the release record |
| Solution exfiltration | Direct table read or broad RPC response | No browser table grants; only post-submit allowlisted feedback; state/start never return solution |
| Raw error leakage | Unexpected SQL error reaches client | Stable `ADAPTIVE:*` codes; unexpected errors collapse to `INTEGRITY_FAILURE`; Next.js must map to Vietnamese safe messages |
| Planner drift | SQL and TypeScript disagree | Policy version, deterministic fixtures and isolated equivalence gate |
| Privilege escalation | Exploit definer search path/dynamic SQL | Empty search path, schema-qualified objects, no dynamic SQL, minimal execute grants |
| Grade 1 regression | Shared table/function mutation | Separate adaptive tables/functions; validation checks legacy function definitions remain fixed-only |

## Residual risks

- Static validation cannot prove PostgreSQL runtime semantics.
- `SECURITY DEFINER` relies on the migration owner and Supabase role behavior;
  this must be verified in isolation.
- The SQL enforcement planner duplicates canonical TypeScript behavior.
- Database release activation requires a separate owner-approved mutation and
  controlled-pilot eligibility model.
- No retention evidence or scheduler exists.

No new signing secret, service-role, private connection or recovery worker is
introduced by Sprint 6G-A.
