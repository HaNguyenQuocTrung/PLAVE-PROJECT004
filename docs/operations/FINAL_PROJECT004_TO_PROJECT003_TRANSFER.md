# Final PROJECT004 to PROJECT003 transfer

> **ARCHIVED_NON_OPERATIONAL:** Historical transfer record only. PROJECT003 is
> frozen and no instruction below may be executed.

Status: **READY_FOR_TRANSFER_AND_FINAL_REVIEW**
Source: `/Users/hatrung/Desktop/PLAVE-PROJECT004`
Target: `PLAVE-PROJECT003` — not accessed or modified by this run

This is a selective payload manifest. It is not authorization to overwrite
conflicting target files blindly. No copy, Git operation, deployment, or
remote action has been performed.

## New files to transfer

| File | SHA-256 |
| --- | --- |
| `lib/auth/registration-result.ts` | `ce0630974fc5f7b01255084f2e4671725d24552fee998fd0aaf25b22820da64d` |
| `tests/registration-result.test.ts` | `2a4d633651ae71c1ee75090c9797000de4df5e28092e37aa9842847acead89b7` |
| `docs/operations/OVERNIGHT_BATCH_1_HANDOFF.md` | `a3bf0e0ab4fdb770a859043008f65dcd1f17e29b01e67e1d216f634105093b76` |
| `docs/operations/OVERNIGHT_BATCH_1_STATUS.json` | `030476edc1b56f4656cd1d3933dc1a69809849aa0dff8735ecf0f5f5eba64d95` |
| `docs/operations/FINAL_SUBMISSION_READINESS.md` | `81c60986ccd904a813d8238d25f3136c61e4d37ce3e33bbef001e2dd70038146` |

## Modified files to transfer or merge

| File | SHA-256 |
| --- | --- |
| `app/register/actions.ts` | `475468a01556b296a95a7f4a363ab18ed8289227d86206352d427394161681b8` |
| `app/register/page.tsx` | `28e83c9dbb43016e93a30b6426d2187e6a6afcf32eda551381e472375be96dc3` |
| `package.json` | `70692929142c1338d8ab68c3da82a9780a0b1974e9947463ef788a90f5682f9f` |
| `scripts/check-controlled-pilot-env.ts` | `846c7037719ceb5953ff0b3b469e759205bb4a44ead42def7c690bf361183786` |
| `scripts/validate-controlled-pilot-package.mjs` | `873acf1cb3b80a6e81d6c467baa67094d4b54daa88abfb9507a0a9dbd92dafd0` |
| `supabase/operations/grade2-controlled-pilot/ENROL_ONE_GRADE2_TEST_STUDENT.sql` | `1a636323b469ebb99edbb2ba971ff08fd6d54e3a15409d07c5a00c84a35148cd` |
| `supabase/operations/grade2-controlled-pilot/README.md` | `e6513ffa53ecd19673c622d6c4b489081da25cb2b40038a944f3bc7429d045a3` |
| `supabase/diagnostics/0037_SINGLE_TEST_STUDENT_MEMBERSHIP_READONLY.sql` | `bf576b1d5101a6a2adc60347f496b35221567e8849a16ce6f977d41a68957883` |
| `docs/operations/GRADE2_CONTROLLED_PILOT_RUNBOOK.md` | `7766d2303c6e6dd1e79cb49fc26d6e439530d7b3b65f7214fa0d6aef439dd8fe` |
| `tests/single-test-student-membership-package.test.mjs` | `1a9e50280ebdc3b250560972297485a6485c7e2c9a6d8018d838a8c93cdde31a` |
| `tests/practice-regression.test.ts` | `9d41c4f831d2e40bc3ac52031213e53d634b1ec958fe3ec349f4e94675becb18` |

## Never transfer

- `.env`, `.env.*`, `.env.local`, or any environment backup.
- Supabase/API credentials, service-role keys, JWTs, passwords, tokens, real
  UUIDs, substituted SQL, or private Owner notes.
- Logs, screenshots containing identity, database dumps, or audit output with
  sensitive values.
- `.next/`, build output, coverage, caches, `node_modules/`, package-manager
  cache, or generated route manifests.
- Docker state, local database volumes, temporary directories, automation
  scratch files, or isolated-workdir artifacts.
- Files from outside PROJECT004.

## Copy/merge order

1. Create `lib/auth/registration-result.ts`.
2. Merge `app/register/actions.ts` and `app/register/page.tsx`; verify imports
   resolve and keep the target's unrelated registration changes.
3. Transfer the membership operation, read-only diagnostic, package README,
   runbook, environment checker, and controlled-pilot validator as one atomic
   review unit.
4. Create/update the focused registration and membership tests.
5. Apply only the small registration assertion change from
   `tests/practice-regression.test.ts`; do not replace unrelated target
   regression additions.
6. Merge the two added npm scripts from `package.json`; do not overwrite
   target dependencies, versions, or unrelated scripts.
7. Copy the three audit/readiness documents after implementation files.
8. Recompute every transferred file hash in PROJECT003 and compare with this
   manifest, except files intentionally merged. For merged files, review the
   diff and run all validation commands.

## Conflict risks

- `package.json` is high-conflict: merge scripts, never blind-copy.
- `tests/practice-regression.test.ts` is large and likely high-conflict: apply
  the focused assertion change only.
- Registration files may contain target-specific UI/auth work: preserve
  unrelated changes while retaining the seven-outcome contract, single
  `signUp`, no resend/retry, and session cleanup behavior.
- The controlled-pilot SQL depends on the exact 0035/0036/0037 schema and
  frozen hashes already validated in PROJECT004. If target migration files or
  schema differ, stop; do not weaken the fingerprints.
- Existing operation/runbook edits in target require manual reconciliation.
- No assumptions about target `.env*` or remote state are allowed.

## Validation required after copy

Run from the PROJECT003 repository root, without remote mutation:

```bash
npm run test:controlled-pilot-remediation
npm run validate:controlled-pilot
npm run test:registration
npm run test:adaptive-pilot
npm run test:adaptive-api
npm run test:practice
npm run test:content-engine
npm run test:adaptive-practice
npm run test:adaptive-runtime
npm run test:adaptive-database
npm run test:source-policy
npm run test:grade2-release
npm run validate:adaptive-runtime-draft
npm run validate:grade1
npm run validate:grade2-engine-poc
npm run validate:grade2-release
npm run lint
npm run typecheck
npm run build
npm run test:remote-0035-operation
npm run test:remote-0036-operation
node scripts/validate-migration-0037-remote-diagnostics.mjs
```

Also repeat the runtime secret/service-role, membership UUID/PII/mutation,
TypeScript `any`/`@ts-ignore`, and raw/pre-submit solution-leak scans.

`LOCAL_DB_INTEGRATION_PENDING` remains until the operation and concurrency
contract run against a disposable isolated local Supabase database. Do not use
remote SQL to close that pending item.
