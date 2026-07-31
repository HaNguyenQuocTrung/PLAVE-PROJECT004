# PROJECT004 versus PROJECT003

> **ARCHIVED_NON_OPERATIONAL:** Historical comparison only. PROJECT004 is now
> canonical and PROJECT003 is frozen; do not re-run this comparison.

Comparison date: 2026-07-30
Comparison mode: read-only; no file transfer

## Summary

PROJECT004 is a source superset of PROJECT003 for the application areas inspected. PROJECT003 has no application-source-only file that PROJECT004 lacks. Critical migrations, Grade 1 content, adaptive runtime, Supabase contracts, environment template, package lock and frozen-candidate artifacts are identical.

The targeted remediation closed the three former HIGH findings. The final re-audit recommends promoting PROJECT004 as the primary development tree, subject to an Owner-approved filesystem backup/checksum/rollback procedure. No promotion or transfer was performed.

## Repository and provenance risk

Both directories resolve to the same parent Git repository at `/Users/hatrung`, where each project is an untracked directory. There is no independent commit history for either project. A future promotion or copy plan needs an explicit filesystem backup/checksum rollback procedure; a normal Git rollback cannot be assumed.

## PROJECT003-only files

| Path | Classification | Transfer decision |
| --- | --- | --- |
| `.env.local` | Secret-bearing local environment file | Never transfer |

No PROJECT003-only application, curriculum, test, migration, build-config or asset file was found under the audit exclusions.

## PROJECT004-only intentional source

### Curriculum teaching implementation

- `app/api/curriculum-preview/check/route.ts`
- `app/curriculum-preview/CurriculumPreviewRunner.tsx`
- `app/curriculum-preview/page.tsx`
- `lib/curriculum/engine.ts`
- `lib/curriculum/registry.ts`
- `lib/curriculum/types.ts`
- `lib/curriculum/validation.ts`
- `scripts/validate-grades-1-9-curriculum.ts`
- `tests/curriculum-preview-api.test.ts`
- `tests/grades-1-9-curriculum.test.ts`
- `docs/curriculum/GRADES_1_TO_9_COVERAGE_MATRIX.md`
- `docs/curriculum/GRADES_1_TO_9_COVERAGE_STATUS.json`
- `docs/curriculum/GRADES_1_TO_9_IMPLEMENTATION_STATUS.md`
- `docs/operations/GRADES_1_TO_9_DEADLINE_HANDOFF.md`

### Registration remediation

- `lib/auth/registration-result.ts`
- `tests/registration-result.test.ts`

### Controlled-pilot remediation

- `supabase/diagnostics/0037_SINGLE_TEST_STUDENT_MEMBERSHIP_READONLY.sql`
- `supabase/operations/grade2-controlled-pilot/ENROL_ONE_GRADE2_TEST_STUDENT.sql`
- `tests/single-test-student-membership-package.test.mjs`

### Existing handoff/audit artifacts

- `docs/operations/FINAL_PROJECT004_TO_PROJECT003_TRANSFER.json`
- `docs/operations/FINAL_PROJECT004_TO_PROJECT003_TRANSFER.md`
- `docs/operations/FINAL_SUBMISSION_READINESS.md`
- `docs/operations/OVERNIGHT_BATCH_1_HANDOFF.md`
- `docs/operations/OVERNIGHT_BATCH_1_STATUS.json`
- `docs/operations/PROJECT004_FULL_AUDIT.md`
- `docs/operations/PROJECT004_VS_PROJECT003_COMPARISON.md`
- `docs/operations/PROJECT_PRIMARY_DECISION.md`
- `docs/operations/PROJECT_PRIMARY_DECISION.json`

## Common files with differences

| Path | Classification | Assessment |
| --- | --- | --- |
| `app/globals.css` | Application UI | PROJECT004 adds preview styling; review together with rendered-visual fix |
| `app/register/actions.ts` | Registration/security | PROJECT004 structured result handling is an improvement |
| `app/register/page.tsx` | Registration UI | PROJECT004 avoids false total-failure messaging |
| `package.json` | Scripts | PROJECT004 adds local validators/tests; lockfile remains synchronized |
| `tests/practice-regression.test.ts` | Regression | PROJECT004 includes added coverage; retain after tests pass |
| `docs/operations/GRADE2_CONTROLLED_PILOT_RUNBOOK.md` | Operations | PROJECT004 remediation is stricter |
| `docs/operations/REMOTE_DEV_OPERATION_LEDGER.md` | Operations | PROJECT004 records later local work |
| `scripts/check-controlled-pilot-env.ts` | Operations validator | PROJECT004 separates allowlist and flag contracts |
| `scripts/validate-controlled-pilot-package.mjs` | Operations validator | PROJECT004 contains strengthened validation |
| `supabase/operations/grade2-controlled-pilot/README.md` | Operations documentation | PROJECT004 documents fail-closed operation |

These are conflicts for a future copy operation because the destination exists and differs. They require review/merge rather than blind overwrite.

## Critical parity checks

| Area | Result |
| --- | --- |
| Grade 1 verified content | Present in both; critical files identical |
| Migrations 0035, 0036 and 0037 | Byte-identical; recorded checksums match |
| Adaptive runtime and API | Present in both; common source identical |
| Registration fix | PROJECT004 is newer and tested |
| Security/Supabase contracts | Critical common files retained |
| `.env.example` | Identical |
| Package lock | Identical and synchronized with manifest |
| Frozen Grade 2 manifest | Identical |
| Candidate/migration hashes | Match recorded ledger |
| Remote project binding | Both target `plave-project003-dev`; PROJECT004's controlled-pilot confirmation uses the authorized public ref |

No evidence was found that PROJECT004 is an older clone missing a newer PROJECT003 application fix.

## Exclusions from any future transfer

- `.env*`, especially `.env.local`
- credentials, tokens, keys or local machine configuration
- `.next/**`
- `node_modules/**`
- `coverage/**`
- `build/**`
- `dist/**`
- logs
- backup/export artifacts
- temporary audit files
- editor/OS metadata
- parent-repository Git metadata

## Current promotion recommendation

Decision: `PROMOTE_PROJECT004_TO_PRIMARY`.

Do not selectively copy files as an improvised substitute for promotion. Because neither project is an independent Git repository, the Owner should first approve an exact filesystem backup, checksum and rollback runbook. Operational SQL remains a separate Owner-reviewed package and is not authorized by this decision.
