# SPRINT 10D.4R — Final Independent Generator Acceptance Rerun

**SPRINT_10D4_REAUDIT_PASS — CRITICAL 0, HIGH 0, GENERATOR REMEDIATION INDEPENDENTLY VERIFIED**

Audit date: 2026-08-03
Canonical checkpoint: `33f239e630a74b627f1b1a233493c4aef8870aea`
Parent: `83b604bcefc112116737142f3572bec068b73ea5`

## Executive conclusion

The final isolated rerun resolves the prior evidence blocker and independently verifies both Generator findings in scope. F-003 remains **RESOLVED** and F-005 is now **RESOLVED**. The clean checkpoint reproduced the Oracle, complete 32,760-case correctness audit, public authenticated Student runtime, browser acceptance, and all canonical regression gates without using the main working tree, provider credentials, paid requests, internal proof routes, or remote state.

Finding totals are **Critical 0, High 0, Medium 3, Low 2**. The Medium and Low items are maintenance/evidence/UX debt and do not materially affect Generator mathematical correctness, security, or the core Student journey.

## Source and evidence isolation

- Clean detached worktree HEAD matched the canonical checkpoint exactly and remained clean.
- Dependency installation from the tracked lockfile passed with Node `v22.16.0` and npm `10.9.2`.
- Mandatory audit evidence was present at 69/69 paths; missing and untracked dependencies were both empty.
- All 313 tracked JSON files parsed successfully.
- Tracked secret-like provider hits, cache paths, and private-solution artifacts were zero.
- Main `.env.local`, the unstaged Google smoke artifact, Owner Tutor state, main caches, and all untracked main evidence were excluded.

The prior 10D.4 evidence-isolation blocker is **RESOLVED**.

## Finding reconciliation

| Finding | Previous state | Independent result | Evidence |
|---|---|---|---|
| F-003 Generator product correctness | RESOLVED | **RESOLVED** | Original regressions 9/9, full 32,760 run, public runtime 198/198, 38 fresh screenshots |
| F-005 Oracle interaction and canonicalization | UNRESOLVED | **RESOLVED** | Forced interaction rejection, exact rational parsing, 11 bounded exceptions, dependency audit, mutation/falsification suites |
| 10D4-B001 evidence isolation | BLOCKED | **RESOLVED** | Mandatory paths 69/69, untracked dependencies 0, JSON errors 0 |
| Legacy Sprint 8C alternate-seed duplicate | MAINTENANCE_DEBT | **MAINTENANCE_DEBT** | Not canonical, not CI-active, not Student-runtime reachable |

## Oracle interaction and exact numeric acceptance

The forced Grade 7 denominator-one `FRACTION_INPUT` candidate was rejected with `ORACLE_INTERACTION_ANSWER_TYPE_MISMATCH`. Valid `INTEGER_INPUT` behavior passed. An adjacent non-exempt outcome could not inherit an exception.

All 11 fraction-representation exceptions were individually audited:

- every entry is an exact canonical outcome ID;
- every entry carries an explicit pedagogical fraction-representation reason;
- wildcard, capability-wide, grade-wide, regex, and substring bypass counts are zero;
- the Grade 7 failing algebra family is excluded.

The independent numeric parser uses reduced BigInt rationals, not floating-point equality. It canonicalized `5`, `5.0`, `5.00`, `5/1`, `10/2`, negative integers, negative zero, equivalent finite rationals, and permitted whitespace. It rejected empty or malformed input, trailing garbage, division by zero, `NaN`, `Infinity`, extra delimiters, and scientific notation unless explicitly authorized.

For equation solution sets, correct exact roots and equivalent `n.0`/`n/1` representations passed. Missing, extraneous, duplicate-equivalent, complex, and out-of-domain roots were rejected with typed diagnostics.

## Oracle independence and falsification

- Existing repository mutations: 12 attempted, 12 killed.
- Record-derived final falsification: 34/34 expected behaviors; 16/16 invalid mutations killed and 18/18 valid equivalences accepted.
- Independent audit-time cases: 37 attempted, 0 unexpected results.
- Unexpected survivors and silent skips: 0.
- Oracle imports from Generator implementation/solver: 0.
- Expected-answer reads, hidden-solution inputs, shared answer-producing helpers, and runtime-validator truth dependencies: 0.

The test totals were derived from mutation records, not hard-coded pass values. Sanitized before/after payload hashing confirmed that audit mutations actually changed candidates.

## Full canonical correctness

The canonical audit ran all `546 × 3 × 20 = 32,760` coordinates from the clean checkpoint:

- outcomes: 546;
- canonical capabilities: 198;
- attempted from raw records: 32,760;
- passed: 32,760;
- missing or duplicate coordinates: 0;
- mathematical, sufficiency, ambiguity, answer, interaction, visual, distractor, privacy, fallback, keyword-routing, and exact-duplicate failures: 0;
- provenance 8/8 and deterministic replay: 32,760/32,760;
- maximum near-duplicate pair rate: 0.03685 against the 0.12 bound.

An audit-only in-memory public-prompt mismatch made the command exit nonzero with one recorded failure. Repository files were untouched. A subsequent unmodified rerun restored 32,760/32,760 PASS, proving the gate does not silently ignore an injected failure.

## Authenticated Student runtime

The acceptance used the public `/api/curriculum-runtime/*` contract against disposable local schema 0001–0042. Internal proof/review route count was zero.

- capabilities attempted/passed: 198/198;
- completed attempts: 217/217;
- generated questions and answers: 2,604/2,604;
- GENERATED_V2 provenance 8/8: 2,604 rows;
- orphans and private leaks: 0;
- concurrent start, CAS single winner, duplicate-submit idempotency, rollback, exactly-once progress/history, and resume without regeneration: PASS;
- anonymous, wrong Student, Parent, Teacher, cross-grade, forged-routing, flag-off, and release-off cases failed closed.

The Student wire remains intentionally typed: integer inputs accept the integer transport contract, while `n.0` and `n/1` mathematical equivalence is validated by the independent Oracle candidate contract. This distinction does not expose hidden answer metadata.

Repository-default Generator activation remained **OFF**.

## Browser acceptance

Authenticated Student acceptance passed at 320×568, 390×844, 768×1024, 1280×800, and 1440×900. It covered Grade 7 integer input, fraction representation, equation/root interactions, correct and incorrect feedback, resume, completion, and results/history paths.

All 38 newly generated screenshots were opened and visually reviewed. Counts were:

- console, hydration, and page errors: 0;
- overflow and dead controls: 0;
- touch-target failures: 0;
- prompt/visual mismatches and private leaks: 0;
- Critical/High visual issues: 0.

## Canonical regression gates

Final canonical gates: **24 passed, 0 failed, 0 blocked, 0 skipped**.

- Typecheck and lint: PASS.
- Production build: 77/77 pages.
- Practice: 550/550.
- Generator core/security, Oracle, mutations, falsification, full correctness, runtime, and persistence/security: PASS.
- Curriculum, competency 10/10, role isolation, and UI/UX 13/13: PASS.
- AI Tutor key-unset suites: 40/40, paid provider requests 0.
- Secret-boundary canary: PASS using a disposable key-empty 0600 fixture, removed after the test.
- npm audit: 0 vulnerabilities after approved registry access; the first sandboxed DNS attempt returned `ENOTFOUND` and was not counted as PASS.

Retries caused by loopback sandbox policy, build/test ordering, TTY availability, the empty local-env fixture, and registry DNS are recorded in the machine-readable test evidence.

## Legacy Sprint 8C duplicate

The superseded `audit:generator-v2-full-coverage` command remains package-reachable and exits zero while printing a FAIL marker for one alternate-seed duplicate. It is not referenced by active CI, does not share the canonical Sprint 10C seed namespace, does not occur in the canonical 32,760 run, and does not affect Student runtime.

Classification: **MAINTENANCE_DEBT (Medium)**, not an active correctness failure. The command should later be retired or made to return a truthful nonzero exit, outside this read-only audit.

## Non-blocking findings

- **10D4R-M-001 — Medium:** the reachable legacy audit command can mislead maintainers.
- **10D4R-M-002 — Medium:** the secret-boundary command requires a disposable `.env.local` fixture even in a key-unset clean checkout.
- **10D4R-M-003 — Medium:** results/history paths were exercised, but no dedicated terminal-surface screenshot was captured.
- **10D4R-L-001 — Low:** long lesson headings are ellipsized in some practice headers.
- **10D4R-L-002 — Low:** one data-error distractor contains a mojibake quote sequence around “Tổng”.

## Milestone status after acceptance

- Milestone 1: `COMPLETE_OWNER_APPROVED`.
- Milestone 2: `REMEDIATION_VERIFIED_AWAITING_FINAL_ACADEMIC_ACCEPTANCE`.
- Milestone 3: `REMEDIATION_VERIFIED_COMPLETE_OWNER_APPROVED_LOCAL_MVP`.

This audit does not create a new Owner decision and does not claim deployment, remote activation, or production certification.

## Boundaries and cleanup

- Source/test files modified: 0.
- Git stage/commit/push/reset: 0.
- Remote mutations, migrations, deployments, paid-provider calls: 0.
- Main environment or unstaged Google smoke content read: no.
- Owner Tutor used or stopped: no.
- Audit servers, disposable database/container state, fixtures, and browser profiles: cleaned.
- The temporary audit worktree is removed during final handoff validation.

Machine-readable evidence is under `artifacts/remediation/sprint-10d4r-*.json`; the complete public runtime trace is in `sprint-10d4r-runtime-traceability.json`, and reviewed screenshots are in `artifacts/remediation/sprint-10d4r-screenshots/`.
