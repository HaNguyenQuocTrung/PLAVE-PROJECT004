# Sprint 10D.1C — Reproducible local checkpoint

Date: 2026-08-03

## Authorized operation

Owner authorized one local checkpoint commit for Sprint 10D.1. Push, amend,
merge, rebase and tag remain prohibited. The checkpoint contains the targeted
Generator product/oracle remediation and the evidence contracts required to
reproduce it; it does not activate Generator V2 by default or close Milestone 2.

## Preflight

- Branch: `main`.
- Previous HEAD: `3e16a3634bee4b815d683f59cfc9209c28031e24`.
- Previous parent: `be68da308b99ffd68136370853b52a85657fba71`.
- Before checkpoint, `main` was 3 commits ahead and 0 behind `origin/main`.
- Staged files before this operation: 0.
- Git index/HEAD locks: absent.
- Owner Tutor remained listening on loopback port 3001 and was not inspected
  beyond process/listener metadata or terminated.
- `.env.local` remained ignored, mode 0600 and unread.
- The modified Google real-smoke artifact was classified `UNRELATED` and
  excluded from staging without reading its contents.

## Intended checkpoint boundary

Included:

- canonical graph, interaction, fraction-visual and Student submit-boundary
  source;
- independent exact quadratic set oracle and public-model structural diversity;
- targeted regression and audit/runtime harness changes;
- Sprint 10D baseline finding contracts needed to trace the repair;
- Sprint 10D.1 status, architecture, machine evidence and reviewed screenshots;
- this reproducibility contract and its machine-readable classification.

Excluded:

- `.env.local`, provider keys, caches, browser profiles, temporary databases,
  raw private-solution artifacts and fixtures;
- `artifacts/ai-tutor-acceptance/google-real-smoke.json`;
- unrelated Sprint 10D screenshot binaries not needed to reproduce the targeted
  Generator repair;
- all other unrelated user state.

## Staged-only validation

The commit is allowed only after a temporary snapshot exported from the Git
index, without unstaged source, passes typecheck, lint, production build, the
five original regression families, oracle boundary/mutations, structural/full
32,760 audit, Student runtime, Practice 550/550, AI Tutor 40/40, JSON validation
and an isolated key-unset secret-boundary canary.

The final staged-only status and counts are recorded in
`artifacts/remediation/sprint-10d1c-checkpoint.json`. The new commit cannot embed
its own content hash without changing that hash, so this document uses
`SELF_COMMIT`; the exact SHA is resolved externally by `git rev-parse HEAD` and
recorded in the post-commit clean-checkout evidence.

Final staged-only result: `PASS`. The index-only snapshot used a fresh lockfile
install and passed typecheck, lint, the 77-page production build, 9/9 targeted
regressions, the independent oracle boundary, 12/12 mutations, the full
32,760/32,760 correctness audit, 9/9 Student-runtime integration tests, Practice
550/550, AI Tutor 40/40, 278/278 JSON parses and the isolated key-unset secret
canary. The canary made zero provider requests and cleaned its temporary cache
and listener. Practice was evaluated after the canonical build because its
route-manifest assertion intentionally consumes that build output.

## Post-commit verification

`artifacts/remediation/sprint-10d1c-clean-checkout.json` is intentionally written
after the single commit and remains outside it. It records the exact checkpoint
SHA and clean-worktree results without requiring a prohibited second evidence
commit.

Milestone 2 remains `REOPENED_AWAITING_SPRINT_10D2_REAUDIT`.
