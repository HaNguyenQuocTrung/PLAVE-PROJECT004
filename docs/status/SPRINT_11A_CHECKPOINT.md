# Sprint 11A.C — Reproducible checkpoint

This checkpoint contains the Score, XP and Mastery foundation only. It does not
enable Level, Streak, Goals, Badges, Achievements, deployment, or remote
activation.

## Scope

The committed scope is the additive `0043_score_xp_mastery_foundation.sql`
migration, the server-authoritative scoring policy and runtime integration, the
Student and minimal read-only Parent/Teacher surfaces, their tests, package
scripts, and the sanitized academic-MVP evidence under
`artifacts/academic-mvp/`. Historical Sprint 10D evidence, Owner Tutor state,
the Google smoke artifact, local secrets, caches, fixtures, and build output
are deliberately excluded.

## Reproducibility contract

The checkpoint is created with exactly one commit using:

`checkpoint: add score xp and mastery foundation`

The commit SHA is recorded in the handoff after Git creates it. The two JSON
records in this commit use a self-referential source marker because embedding a
future commit SHA would change the commit hash; the post-commit clean-checkout
verification is the authoritative result for that SHA.

Migration 0043 is additive and transactional. Local proof covers fresh
0001–0043 installation, 0042→0043 upgrade, RLS/privilege checks, and rollback
under failure injection. No remote migration or provider request is performed.

## Gate record

Before commit, staged-only validation must pass diff/secret checks, typecheck,
lint, Sprint 11A tests, scoring/XP/mastery, static/generated parity,
authorization/RLS, migration smoke, and JSON validation. After commit, a clean
checkout must repeat typecheck, lint, production build, local migration proof,
Sprint 11A tests, parity/idempotency/CAS/RLS checks, secret-canary checks, and
JSON validation. Provider requests remain zero.

## Status

`SPRINT_11A_CHECKPOINT_PENDING_POST_COMMIT_VERIFICATION`
