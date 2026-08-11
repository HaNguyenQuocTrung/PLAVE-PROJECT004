# Wave L — adaptive learning completion

Wave L verifies software-level adaptive compatibility for the immutable combined A–K Grades 1–9 inventory. It creates no production question, changes no A–K candidate or bundle, enables no runtime flag, and grants no entitlement.

## Frozen boundary

- Combined A–K bundle: `de5cff15605c2fd4d09bf06740db9475a9918d20396e9d06f5ec27200b362b1e`.
- Inventory: 2,772 questions, 338 question-bearing skills, 176 units.
- Migrations: exactly 0001–0044.
- Grade 1 remains `LOCAL_SHADOW_ONLY`; its fixed public runtime, 13/312/312/24 boundary, source digest, shadow tuple, 84 deterministic evidence items, 24 quarantined visual items, and 228 UNKNOWN items are unchanged.
- Wave F's registry DNS-attempt incident and Wave K's two credential-read boundary incidents remain recorded without rewriting. Wave L adds zero incidents.

## Readiness inventory

| Grade | Status | Units | Skills | Questions | Adaptive-ready | Pool-limited fail-closed | Shadow-only |
|---:|---|---:|---:|---:|---:|---:|---:|
| 1 | `SHADOW_ONLY` | 13 | 51 | 312 | 0 | 0 | 51 |
| 2 | `POOL_LIMITED_FAIL_CLOSED` | 17 | 37 | 264 | 34 | 3 | 0 |
| 3 | `ADAPTIVE_READY` | 18 | 41 | 306 | 41 | 0 | 0 |
| 4 | `ADAPTIVE_READY` | 16 | 34 | 319 | 34 | 0 | 0 |
| 5 | `POOL_LIMITED_FAIL_CLOSED` | 16 | 34 | 312 | 33 | 1 | 0 |
| 6 | `POOL_LIMITED_FAIL_CLOSED` | 26 | 61 | 485 | 58 | 3 | 0 |
| 7 | `POOL_LIMITED_FAIL_CLOSED` | 22 | 25 | 246 | 23 | 2 | 0 |
| 8 | `POOL_LIMITED_FAIL_CLOSED` | 23 | 22 | 228 | 20 | 2 | 0 |
| 9 | `POOL_LIMITED_FAIL_CLOSED` | 25 | 33 | 300 | 31 | 2 | 0 |

The 13 pool-limited skills have verified questions but only one structural fingerprint. A structure-changing retry therefore returns `FAIL_CLOSED_UNAVAILABLE`; Wave L does not fabricate diversity or falsely label those pools adaptive-ready. Every other Grades 2–9 skill has an entry/current path, question pool, retry, remediation or entry fallback, advance or terminal path, retention path, mixed-practice eligibility, and bounded maximum action.

## Selection and next action

The selector validates a server-owned Student identity, exact entitlement tuple, candidate/version/hash/policy, application/database/pilot flags, attempt ownership/version, grade, and bounded seed. Its deterministic priority is:

1. active remediation;
2. required retry with a different structure;
3. current-skill evidence;
4. retention due;
5. advance candidate;
6. mixed practice;
7. fail-closed terminal or grade-complete future path.

It returns exactly one of `CONTINUE_CURRENT_SKILL`, `RETRY_DIFFERENT_STRUCTURE`, `REMEDIATE_PREREQUISITE`, `RETURN_TO_INTERRUPTED_SKILL`, `ADVANCE_SKILL`, `RETENTION_REVIEW`, `MIXED_PRACTICE`, `GRADE_COMPLETE_WITH_FUTURE_PATH`, or `FAIL_CLOSED_UNAVAILABLE`. All reason codes are sanitized. Client projections omit answers and explanations before submit, never mutate `schoolGrade`, and never grant entitlement.

## Policy provenance

- Attempt limit 6 and repeated-error threshold 2 are `CONTRACT_DERIVED` from Wave I.
- Two distinct correct structures for difficulty promotion are `CONTRACT_DERIVED` from Wave J.
- Mastery accuracy 0.75 and retention delay 21 days remain `PRODUCT_HYPOTHESIS` compatibility values.
- Remediation stack limit 2 is a `PRODUCT_HYPOTHESIS` safety bound.
- A single calculation slip retries a different structure and does not trigger deep remediation.

None of these policy values is claimed to be curriculum-authoritative or expert pedagogical validation.

## Proofs and isolation

Deterministic bounded traversal uses four fixed seeds over all question-bearing skills. It visits 2,540 states and 2,540 transitions with zero invariant violations. The proof covers one-selection-at-most, exact candidate/pool membership, deterministic replay, monotonic versions, terminal rejection, CAS conflict, duplicate replay/rejection without duplicate effects, preserved mastery/history, bounded remediation, total next-action coverage, and solution isolation.

Pure local fixtures cover all nine grades without a database stack. Existing scoring, XP, mastery, motivation, history, deactivation, start/resume, retention, mixed practice, maximum termination, role isolation, cross-user denial, and limited-pool fail-closed contracts remain compatible. There is no public runtime hook for combined A–K and no Grade 1 adaptive hook.

The credential-safe audit uses a disposable workspace populated only from explicitly selected repository Wave L files. It never copies ignored secret files, opens `.env.local`, reads or evaluates a credential environment value, inherits provider variables, or logs the environment. A synthetic, obviously fake fixture proves static rejection of both historical causes; cleanup is mandatory and verified. Wave L credential reads, network attempts, bare `npx` invocations, and operational incidents are all zero.

## Deterministic artifacts

- Runtime compatibility hash: `ffbe617c9790a74cad0e0a9093da077e5f18428b3c529610bf482b9a72be5932`.
- Grades 1–3 shard: `07be294fa5be52903ad207d08e80c19936986c36751174a051192d0443661d72`.
- Grades 4–6 shard: `f72823abb9bbaa26978d4878ed064e4a50554eff8ba96216fc82fe5b11a0d120`.
- Grades 7–9 shard: `4c4f1b3154e01b0da51b2119e7284d05bf257aab09edcfc7b0d0b677936e5e83`.

All artifacts remain local, hidden and non-activating.
