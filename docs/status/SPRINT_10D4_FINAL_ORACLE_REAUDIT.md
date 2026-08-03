# Sprint 10D.4 — Final independent Oracle re-audit

Audit date: 2026-08-03

Canonical checkpoint: `83b604bcefc112116737142f3572bec068b73ea5`

Parent: `b5eeabab22f0183ceef1bd64cc1d94d34e882cfd`

## Verdict

`SPRINT_10D4_REAUDIT_BLOCKED — EXACT ENVIRONMENT OR EVIDENCE GAPS REPORTED`

Confirmed findings in the bounded source checks: Critical 0, High 0. The
Critical/High acceptance assessment is incomplete because one source-isolation
blocker contains three required files that are absent from the canonical Git
checkpoint. F-005 therefore remains `BLOCKED`, not `RESOLVED`.

## Source-isolation blocker

A detached clean worktree was created directly from the required checkpoint.
It was clean at creation, resolved the exact parent, contained the lockfile and
had no tracked secret, cache or private-solution artifact. The following files
required by the Sprint 10D.4 contract are not present in the checkpoint:

- `docs/status/SPRINT_10D2_INDEPENDENT_REAUDIT.md`
- `artifacts/remediation/sprint-10d2-report.json`
- `artifacts/remediation/sprint-10d3c-clean-checkout.json`

Copies of those paths exist only as untracked files in the main working tree.
They were not opened, copied or used. Substituting them would violate the
checkpoint-only evidence boundary. This also prevents an exact reconciliation
of the 10D.2 failure and the mandated 10D.3C clean-checkout claim.

## Bounded checks completed before stopping

These checks used only files contained in the clean checkpoint:

- dependency install from `package-lock.json`: PASS (`npm ci --ignore-scripts --prefer-offline`);
- Oracle unit/dependency/mutation suite: PASS, TAP 11/11 and existing mutations 12/12;
- final-remediation falsification command: PASS, 34 records, 16 invalid
  mutations rejected, 18 valid equivalences accepted, unexpected survivors 0;
- independent Oracle canonical run: PASS, 32,760/32,760 records, 546 outcomes,
  198 capabilities, missing and duplicate coordinates 0;
- exact parser source: complete-string parsing with `BigInt` reduced rationals;
- denominator-one inventory: 12,222 samples, 126 `FRACTION_INPUT` samples under
  11 exact outcome-ID exceptions, unauthorized count 0;
- Oracle package scan found no Generator implementation/solver import and no
  expected-answer/private-solution read.

These are partial structural/regression observations. They do not replace the
required independent audit-time candidates, authenticated Student runtime,
browser acceptance or the missing finding evidence.

## Exception review status

The 11 exceptions are literal outcome-ID keys; there is no wildcard, regex,
grade-wide or capability-wide bypass. All 11 IDs exist in the canonical
curriculum inventory and the prior failing Grade 7 algebra outcome
`MOET2018-G7-NAA-P057-030` is excluded. The checkpoint records a reason for each
exception. Final independent pedagogical acceptance was not concluded because
the audit was stopped at the mandatory evidence blocker.

## Legacy Sprint 8C duplicate

Classification: `MAINTENANCE_DEBT`.

The reachable package command `audit:generator-v2-full-coverage` uses the
alternate `sprint8c` seed namespace and exits zero while printing
`GENERATOR_V2_FULL_COVERAGE=FAIL`. It reproduces one public exact duplicate for
`MOET2018-G6-STA-P054-009/HARD`, seeds `01` and `04`. The canonical
`sprint10c` Oracle coordinate set reports exact duplicates 0. The legacy
command is not referenced by an active CI workflow and active Oracle
documentation names the independent Oracle command, but the package script and
test alias remain reachable and can confuse maintainers. No legacy command or
historical evidence was changed during this audit.

## Gates not run

After the source-isolation failure, authenticated Student runtime, persistence,
role isolation, browser checks, screenshot review, Practice, Curriculum,
Competency, UI/UX, AI Tutor, typecheck, lint, production build, secret canary,
JSON corpus validation and npm audit were marked `NOT_RUN_DUE_SOURCE_ISOLATION_BLOCKER`.
No skipped gate is counted as PASS.

## Status and cleanup

- F-003: historical checkpoint status retained; not re-evaluated in this blocked audit.
- F-005: `BLOCKED`.
- Milestone 1: `COMPLETE_OWNER_APPROVED` (unchanged).
- Milestone 2: `REOPENED_AWAITING_SPRINT_10D4_REAUDIT` (unchanged).
- Milestone 3: `REOPENED_SECURITY_AND_REPRODUCIBILITY_REMEDIATION` (unchanged).
- Source/Git-content, remote, database and provider mutations: 0. One temporary
  detached worktree was added and removed as the required isolation mechanism;
  stages, commits, pushes and ref changes: 0.
- Paid provider requests: 0.
- Screenshots generated/reviewed: 0/0.
- The disposable worktree was removed; no audit server or container was started.
- Owner Tutor and the main working tree were preserved.
