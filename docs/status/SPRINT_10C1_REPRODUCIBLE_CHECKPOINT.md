# Sprint 10C.1 — Reproducible local checkpoint before 10D

Date: 2026-08-03

Result: `COMPLETE_LOCAL_CHECKPOINT`

Milestone 2: `REOPENED_AWAITING_SPRINT_10D_REAUDIT`

## Baseline reconciliation

The requested historical baseline is `c5c46f69227f`. At preflight, the working
tree no longer contained the Sprint 10B/10C implementation as uncommitted
source: the preceding Owner-authorized operation had already created local
functional checkpoint `be68da308b99ffd68136370853b52a85657fba71` with message
`checkpoint: complete Sprint 10B/10C generator remediation`.

That existing commit was not amended, reset, rebased or replaced. Sprint 10C.1
independently verified it from a committed-only local clone, then prepared one
additional evidence checkpoint with the exact Owner-requested message:

`checkpoint: integrate Generator V2 student runtime and independent oracle`

No push, tag, merge or remote mutation is part of this operation. The new full
commit SHA is reported from the post-commit Git output rather than embedded in
the commit itself, avoiding a self-referential artifact.

## Preflight

- branch: `main`;
- previous HEAD: `be68da308b99ffd68136370853b52a85657fba71`;
- local `origin/main`: `37fc040b9854867d8b04e4f5bf8de8beda9121ef`;
- relation before the 10C.1 commit: ahead 2, behind 0;
- staged files before evidence: 0;
- untracked files before evidence: 0;
- pre-existing unstaged tracked file:
  `artifacts/ai-tutor-acceptance/google-real-smoke.json`;
- Git lock/operation files: none;
- `.env.local` and `.env.remote-dev.local`: ignored, mode 0600;
- listener records observed: 13, including pre-existing Owner Tutor PID 6279
  on loopback `127.0.0.1:3001`;
- Owner Tutor was preserved; no unrelated process was terminated.

The full listener inventory also contained pre-existing macOS system services,
local PostgreSQL, Docker Desktop and RStudio listeners. None was started,
stopped or mutated by this sprint.

## Classification and exclusion

The functional checkpoint contains 111 Sprint 10B/10C paths. Together with the
four Sprint 10C.1 status/evidence paths, the reproducibility contract covers 115
explicitly classified paths:

- `REQUIRED_SOURCE`: 32;
- `REQUIRED_TEST`: 8;
- `REQUIRED_DOCUMENTATION`: 7;
- `GENERATED_EVIDENCE`: 68;
- `REQUIRED_MIGRATION`: 0;
- `UNKNOWN`: 0.

The detailed path-by-path classification is stored in
`artifacts/remediation/sprint-10c1-staged-classification.json`.

The unrelated Google real-smoke artifact remained unstaged. Local env files,
Next/Turbopack caches, `node_modules`, Supabase temp state, browser/runtime
fixtures and private solution data were excluded.

## Secret and privacy boundary

- provider-key pattern hits in intended source/evidence: 0;
- full tracked-snapshot raw secret-like hits: 1, the explicit public
  Supabase publishable `test_only` fixture in the secret-boundary harness;
- unapproved tracked-snapshot secret hits after that narrow allowlist: 0;
- email hits: 0;
- UUID-like hits: 3, all static non-PII source/test IDs;
- local secret files staged: 0;
- cache files staged: 0;
- private solution artifacts staged: 0;
- forbidden paths staged: 0;
- real provider keys read: 0;
- paid/provider requests: 0.

The canary secret-boundary command ran in a committed-only clean clone with a
temporary empty mode-0600 `.env.local`; it reported source/cache/client/log
occurrences 0 and cleaned the fixture/output. No workspace env file was read or
changed.

## Committed-only clean checkout proof

The proof used `git clone --no-hardlinks --local` at the exact functional
checkpoint. Unstaged source and local environment files were not copied. The
project identity guard correctly rejected an initial generic clone directory;
the identical commit was rerun under the canonical `PLAVE-PROJECT004` directory
name.

| Gate | Result |
|---|---|
| Dependency/lockfile verification | PASS |
| Canonical typecheck | PASS |
| Lint | PASS |
| Production build | PASS, 77/77 |
| Oracle dependency boundary | PASS |
| Oracle mutation controls | PASS, 7/7 |
| Correctness regressions | PASS, 8/8 |
| Full oracle audit | PASS, 32,760/32,760 |
| Canonical outcomes/capabilities | PASS, 546/546 and 198/198 |
| Student runtime integration | PASS, 9/9 |
| Secret-boundary canary | PASS, provider requests 0 |
| JSON validation and targeted secret scan | PASS |

The full 32,760 audit was rerun; this checkpoint does not substitute historical
totals for a new clean-checkout result.

## Boundaries and active status

- remote access/mutations: 0/0;
- migrations applied: 0;
- deployments/publications/activations: 0;
- pushes: 0;
- Owner Tutor terminations: 0;
- unrelated file modifications by Sprint 10C.1: 0.

Milestone 2 remains `REOPENED_AWAITING_SPRINT_10D_REAUDIT`. Repository-default
Generator activation remains OFF. This checkpoint does not close the milestone,
claim production readiness or create a new Owner decision.

SPRINT 10C.1 COMPLETE — GENERATOR RUNTIME AND ORACLE CHECKPOINT REPRODUCIBLE, 10D READY
