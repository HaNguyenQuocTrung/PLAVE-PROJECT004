# Sprint 10C — Independent Generator Oracle and Correctness Remediation

Date: 2026-08-02
Result: `COMPLETE_PENDING_INDEPENDENT_REAUDIT`
Milestone 2: `REOPENED_AWAITING_SPRINT_10D_REAUDIT`

## Executive result

Sprint 10C replaces the circular/self-consistency correctness claim identified
by re-audit finding F-005 with a separate public-snapshot oracle. All 546
canonical outcomes, 198 capabilities, three difficulties and 20 seeds passed the
new oracle. The full authenticated Student runtime then exercised every
capability through `/api/curriculum-runtime/*`; internal proof and Owner-review
routes were not used.

This sprint does not close Milestone 2, create a new Owner approval, enable the
repository default, activate a remote release, deploy, or claim production
readiness. The active status is awaiting Sprint 10D independent re-audit.

## Re-audit findings addressed

- `F-003` — incomplete, ambiguous or interaction-mismatched Generator product
  contracts: repaired and retained as exact regression fixtures.
- `F-005` — solver/validator self-consistency presented as independence:
  replaced by an oracle package that cannot import Generator solve code, plus
  dependency and mutation tests.
- `F-002` remained resolved from Sprint 10B: the real Student runtime surface is
  used for persistence and browser evidence.

The nine exact F-003 examples from the complete re-audit are recorded without
answers in
`artifacts/remediation/generator-correctness-failure-cases/repaired-re-audit-f003.json`.
Repairs were made at canonical capability/contract level; no failing seed was
removed or special-cased.

## Independent oracle

- Package: `lib/generation-v2-oracle/`.
- Forbidden imports: Generator implementation, Generator solver/validator,
  runtime submit validator, generated expected answer and private solution data.
- Dependency audit: PASS, violations `[]`.
- Mutation tests: 7/7 killed with typed diagnostics.
- Known failure regression: 8/8 PASS; the first test covers all nine original
  F-003 outcomes.
- Public artifact includes no private answer or worked solution.

## Full 32,760-sample run

| Metric | Result |
|---|---:|
| Canonical outcomes | 546/546 |
| Canonical capabilities | 198/198 |
| Expected/attempted/unique coordinates | 32,760 / 32,760 / 32,760 |
| Missing/duplicate coordinates | 0 / 0 |
| Oracle validated | 32,760/32,760 |
| Mathematical invalidity | 0 |
| Insufficient public data | 0 |
| Unintended ambiguity | 0 |
| Prompt/visual mismatch | 0 |
| Interaction mismatch | 0 |
| Invalid distractor set | 0 |
| Answer mismatch | 0 |
| Private leak | 0 |
| Generic fallback / keyword routing | 0 / 0 |
| Exact duplicates | 0 |
| Maximum near-duplicate pair rate | 0.10 (threshold 0.12) |
| Provenance 8/8 | 32,760/32,760 |
| Deterministic replay | 32,760/32,760 |

All shards were merged by the unique tuple outcome, difficulty and seed. A
missing, duplicated or failed tuple makes the audit exit non-zero.

## Product and eligibility review

The developer review opened and read 198 public-only samples covering all
capabilities, Grades 1–9, EASY/MEDIUM/HARD, ten interaction types and twelve
visual families. All 198 were accepted after the canonical repairs; private
answers were excluded and `ownerApprovalRecorded=false`.

The review itself found and repaired four canonical product defects without
excluding a seed: zero-coefficient polynomial terms, a contradictory generic
DATA ordering lead, visible internal ordering IDs, and chart quantities without
public units. The final browser harness now rejects visible internal record IDs;
chart unit consistency is covered across 20 seeds per difficulty.

Eligibility is all-or-nothing per capability. Final result:

- `STUDENT_RUNTIME_ELIGIBLE` capabilities: 198/198;
- eligible outcomes: 546/546;
- blocked capabilities/outcomes: 0/0;
- repository default: OFF;
- runtime activation: local/disposable evidence only.

The final eligibility gate also requires dependency/mutation PASS, public-only
product review, authenticated persistence, browser acceptance and visual review;
oracle totals alone cannot promote a capability.

## Authenticated Student runtime proof

- Surface: `/api/curriculum-runtime/start`, `state`, `answer`, `progress`, and
  `history`, plus `/curriculum-practice/[attemptId]`.
- Internal proof/review routes used: NO.
- Fresh disposable local schema: migrations 0001–0042.
- Capability runtime proofs: 198/198.
- Attempts/completions: 215/215.
- Immutable generated questions, private solution rows and answers: 2,580 each.
- GENERATED_V2 and provenance 8/8 rows: 2,580 each.
- Resume without regeneration, incorrect/correct feedback, completion,
  concurrent start, duplicate submit, CAS, rollback, exactly-once
  progress/history and role/flag denials: PASS.
- Orphans: 0; public private leaks: 0.
- Fixture cleanup: PASS; remaining audit listener: NONE.

## Browser and screenshot acceptance

Local Playwright Core 1.51.1 and the already installed Chrome 150 ran the real
authenticated Student surface at 320×568, 390×844, 768×1024, 1280×800 and
1440×900. The matrix covers all 198 capabilities by manifest plus representative
numeric, fraction, choice, ordering/matching, symbolic, diagram, number-line,
table/chart, correct, incorrect, resume and completion states.

- viewports: 5/5;
- final screenshots: 22/22 opened at original detail and visually reviewed;
- console/hydration/page/overflow errors: 0/0/0/0;
- prompt/visual mismatch, private leak and dead required controls: 0;
- final critical/high visual issues: 0/0.

An interrupted earlier runtime proof left one `.sprint-10b-runtime-*` generated
copy. It was identified as the sole lint contamination, removed without touching
source/user data, and the generated-copy pattern was added to ESLint global
ignores. Final lint passes and no such directory remains.

## Regression gates

| Gate | Result |
|---|---|
| Practice | PASS 550/550 |
| Generator core | PASS 10/10 |
| Independent oracle + mutations | PASS 7/7 mutations and 8/8 regressions |
| Full correctness audit | PASS 32,760/32,760 |
| Student runtime integration | PASS 9/9 plus authenticated full proof |
| Generated persistence/migration inventory | PASS 7/7 |
| Curriculum | PASS 9/9 and full outcome coverage test |
| Universal curriculum/security | PASS 21/21 |
| Competency | PASS 6/6 + 4/4 = 10/10 |
| UI/UX | PASS 13/13 |
| AI Tutor regression | PASS 25/25 + 6/6 + 9/9 = 40/40 |
| Secret boundary | PASS in a disposable key-unset canary copy; provider calls 0 |
| Typecheck | PASS |
| Lint | PASS, 0 errors and 0 warnings |
| Production build | PASS, 77/77 static-generation work items |
| Intended-source clean-room | typecheck PASS, build PASS, cleanup PASS |
| JSON validation/cross-file totals | PASS |
| npm audit | `UNVERIFIED_ENVIRONMENT_BLOCKED` |

The first sandboxed npm audit attempt returned
`getaddrinfo ENOTFOUND registry.npmjs.org`. An unsandboxed request was denied by
policy because it would export dependency metadata to the external registry.
Current npm audit is therefore not claimed PASS; last verified evidence remains
0 vulnerabilities on 2026-08-01.

The clean-room tool also reports `HEAD_REPRODUCIBLE=NO` because Sprint 10B/10C
source changes are intentionally unstaged and uncommitted under the sprint
boundary. This is not substituted for the intended-source gate: the intended
working-tree snapshot typechecks and builds successfully and cleans up. Baseline
checkpoint remains `c5c46f69227f`; no Git mutation was performed.

## Evidence

- `artifacts/remediation/generator-full-correctness.json`
- `artifacts/remediation/generator-oracle-dependency-audit.json`
- `artifacts/remediation/generator-oracle-mutation-tests.json`
- `artifacts/remediation/generator-correctness-eligibility.json`
- `artifacts/remediation/generator-correctness-product-review.json`
- `artifacts/remediation/generator-runtime-full-proof.json`
- `artifacts/remediation/generator-correctness-browser-acceptance.json`
- `artifacts/remediation/generator-correctness-screenshot-review.json`
- `artifacts/remediation/generator-correctness-screenshots/`
- `artifacts/remediation/sprint-10c-report.json`

## Boundaries confirmed

- Remote access/mutations: 0/0.
- Migrations added or changed: 0.
- Deployments/publications/activations: 0.
- Git stage/commit/push: 0/0/0.
- Paid provider requests: 0.
- Owner decision changes: 0.
- Repository-default Generator activation: OFF.

SPRINT 10C COMPLETE — 546/546 OUTCOMES INDEPENDENTLY VALIDATED AND STUDENT-RUNTIME ELIGIBLE, REAUDIT REQUIRED
