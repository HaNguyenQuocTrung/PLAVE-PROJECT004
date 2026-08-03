# Sprint 11A — Score, XP and Mastery Foundation

Ngày: 2026-08-03
Status: `COMPLETE_LOCAL_FOUNDATION`
Policy: `PLAVE_SCORING_POLICY_V1`

## Outcome

Sprint 11A adds one server-authoritative scoring path for materialized static and
GENERATED_V2 curriculum practice. Weighted attempt Score is finalized on
completion; XP and outcome mastery evidence are written exactly once with each
terminal answer in the same database transaction. The Student cannot submit
score, XP, difficulty, mastery, correctness or policy version.

This sprint does not implement Level, Streak, badges, achievements, leaderboard,
adaptive recommendation, deployment or remote activation.

## Implemented contract

- Score weights: EASY 1, MEDIUM 2, HARD 3; half-up integer percent, 0–100.
- XP: first terminal correct only; EASY 10, MEDIUM 15, HARD 20.
- Mastery: latest 10 distinct question evidence, weights 1.00/1.25/1.50 and
  explicit `IN_PROGRESS`, `DEVELOPING`, `PROFICIENT`, `MASTERED`,
  `NEEDS_REVIEW` transitions.
- EASY-only evidence cannot produce MASTERED.
- Lesson completion means required attempt completed; it does not mean mastered.
- Static and generated questions use the same trigger/function boundary.
- Duplicate/replay/CAS/resume cannot create extra XP or evidence.
- XP ledger and mastery evidence are append-only and not directly writable by
  `anon` or `authenticated`.

## Database and runtime evidence

- One additive local migration:
  `0043_score_xp_mastery_foundation.sql`.
- Fresh install: 43/43; upgrade 0042→0043: PASS; injected failure rollback: PASS.
- Old migration checksum gate: PASS; schema/RLS/privilege/search-path checks: PASS.
- Authenticated fixture profiles cover Grades 1–9.
- Public Student path is `/api/curriculum-runtime/*`; internal Generator proof or
  review routes used: 0.
- Generated attempts persist immutable questions/provenance 8/8 and reuse the
  same snapshots on resume.
- Static attempt evidence: score 96, earned/possible 23/24, XP 170, 11 ledger
  events and 36 outcome-evidence rows across 12 distinct questions.
- Concurrency: one start, one CAS winner, idempotent replay with `xpDelta=0`,
  clean rollback and no orphan row.
- Parent approved-link and Teacher approved-classroom scoring summaries are
  read-only; unrelated/wrong-role access and direct mutation fail closed.

## Product UI

- Dashboard shows Total XP, recent XP, mastery summary and outcomes needing review.
- Practice shows `+XP` only for a newly created XP event and respects reduced motion.
- Completed results show final Score, correct/total, earned/possible weight, attempt
  XP, mastery changes and lesson completion.
- Progress/history show weighted score and XP without UUID/provenance/private data.
- Parent linked summary shows bounded Score/XP/Mastery data; Teacher receives the
  same minimal authorized read contract without a new analytics surface.
- Vietnamese copy distinguishes Score, XP, mastery and lesson completion and avoids
  punitive language.

## Legacy policy

- New policy activates only for attempts inserted after migration 0043.
- Old curriculum attempts can retain a clearly labelled legacy accuracy result.
- Grade 1 legacy practice is not backfilled into XP/mastery without immutable
  official-outcome and difficulty evidence.
- No retroactive XP and no destructive rewrite were performed.

## Acceptance summary

- Scoring policy/unit/security contracts: 15/15 PASS.
- Static practice: 550/550 PASS.
- Generator independent full correctness: 32,760/32,760 PASS.
- Curriculum: 9/9 and universal curriculum 21/21 PASS.
- Competency: 10/10 PASS.
- UI/UX: 13/13 PASS.
- AI Tutor key-unset regression: 40/40 PASS; paid provider requests 0.
- Typecheck, lint and production build 77/77 PASS.
- Secret-boundary isolated canary: PASS; canary/client/log/artifact hits 0.
- `npm audit` registry check on 2026-08-03: 0 vulnerabilities.
- Browser: five required viewports, public Student static/generated journeys,
  mastery transitions, Parent linked read, console/hydration/page/overflow/private
  leak 0; all final screenshots manually reviewed.

## Status and boundaries

Critical findings: 0. High findings: 0. Remote mutations: 0. Paid provider
requests: 0. Git stage/commit/push: 0. Disposable fixtures/listeners are cleaned.

Milestone 2 remains
`REMEDIATION_VERIFIED_AWAITING_FINAL_ACADEMIC_ACCEPTANCE`; this sprint does not
create a new Owner decision. Milestone 3 remains the verified Owner-approved local
MVP. Generator repository default stays OFF.

SPRINT 11A COMPLETE — SCORE, XP AND MASTERY FOUNDATION READY
