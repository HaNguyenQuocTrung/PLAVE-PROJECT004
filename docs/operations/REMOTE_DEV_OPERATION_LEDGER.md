# Remote dev operation ledger

> **ARCHIVED_NON_OPERATIONAL:** Historical remote ledger only. It grants no
> current authority and none of its targets or commands may be reused.

This ledger records manually authorized operations for the controlled
development/staging project. It contains no credential, connection string,
personal data, answer payload, or solution payload.

## 2026-07-30 — Remove remote-only automatic-RLS helper

| Field | Value |
| --- | --- |
| Environment | `CONTROLLED_DEV_STAGING / TEST_DEMO_ONLY_CONFIRMED` |
| Project | `plave-project003-dev` |
| Operation | `REMOVE_RLS_AUTO_ENABLE_REMOTE_DEV.sql` |
| Remote execution | `APPLIED_AND_VERIFIED` |
| Post-operation verification | `APPLIED_AND_VERIFIED` |
| Verified function state | `public.rls_auto_enable(): ABSENT` |
| Verified event-trigger state | `ensure_rls: ABSENT` |
| Verified active event-trigger count | `0` |

## 2026-07-30 — Stage Grade 2 release candidate with migration 0035

| Field | Value |
| --- | --- |
| Environment | `CONTROLLED_DEV_STAGING / TEST_DEMO_ONLY_CONFIRMED` |
| Project | `plave-project003-dev` |
| Sanitized project ref | `ujmw…mkes` |
| Owner authorization | `OWNER APPROVED FOR MIGRATION 0035 ON CONTROLLED DEV STAGING ONLY` |
| Operation | `0035_grade2_numbers_to_1000_release_candidate_draft.sql` |
| Remote-executed SHA-256 | `911816c87723b8e762c1a1d7470d49b616cfbb95495ddf28e166fd1d536c55f8` |
| Remote-executed state | `APPLIED_AND_VERIFIED` |
| Execution note | `POST_COMMIT_REPORTING_ERROR` (`42P01` on the dropped temporary seed relation) |
| Canonical corrected SHA-256 | `67bef151f4a8744c107835ce98ab5a5c30372cf76ff0328e02c1ca8649c7f206` |
| Canonical checksum remote status | `NOT_EXECUTED_REMOTE — DO_NOT_RERUN` |
| Candidate ID | `g2-numbers-to-1000-rc1` |
| Content version | `g2n1000-1.0.0-rc.1` |
| Frozen seed | `g2-review-number-language` |
| Bundle SHA-256 | `1571a6bdb0ef650ba00d5e217d27264f40d05ddc507475a1069f250bab11f530` |
| Publication state required | `DRAFT / HIDDEN / unpublished` |
| Migration 0036 state | `CORRECTED_APPLIED_AND_VERIFIED / FEATURE_FLAGS_OFF` |
| Feature flags required state | all `false` |
| Post-apply verification | `PASS — all rows` |
| Grade 1 evidence | `13 units / 312 questions / 312 solutions` |
| Grade 2 evidence | `1 unit / 24 questions / 24 solutions; 16 MCQ / 8 NUMBER_INPUT; 4 skills × 6` |
| Visibility evidence | `unit/questions unpublished; zero Grade 2 attempts` |
| History evidence | `practice 18/340; diagnostic 1/24` |
| Security evidence | `0036 absent; RLS drift absent; browser solution SELECT grants = 0` |
| Migration-history action | `NONE_AUTHORIZED` |

The old checksum is the artifact actually executed remotely. Its transactional
body committed the intended state, and the independent read-only diagnostic
verified that state. The reported error occurred in post-commit reporting that
referenced the temporary seed relation after `ON COMMIT DROP`.

The canonical source now keeps the frozen release bank in a local PL/pgSQL
variable and performs both inserts inside one statement. It contains no
temporary seed relation and no statement after its final `COMMIT`. The
candidate IDs, content version, release seed, question content and bundle hash
are unchanged. Future clean environments use the corrected checksum. The
controlled dev/staging project must not rerun migration 0035.

## 2026-07-30 — Prepare adaptive runtime migration 0036

| Field | Value |
| --- | --- |
| Environment | `CONTROLLED_DEV_STAGING / TEST_DEMO_ONLY_CONFIRMED` |
| Project | `plave-project003-dev` |
| Sanitized project ref | `ujmw…mkes` |
| Initial Owner authorization | `OWNER APPROVED — MIGRATION 0036 ON CONTROLLED DEV STAGING` |
| Operation | `0036_adaptive_practice_runtime_draft.sql` |
| Approved SHA-256 | `806f4c2474bd80771d900684c854e65fcf60cebac8ce7792b7c0e71bd8b8ecdf` |
| Required release state | `DRAFT / HIDDEN / unpublished` |
| Required activation state | all database and application flags `false` |
| Required data state | zero adaptive attempts and answers/evidence |
| Failed attempt execution | `REMOTE_APPLY_FAILED` |
| Failed SHA-256 | `806f4c2474bd80771d900684c854e65fcf60cebac8ce7792b7c0e71bd8b8ecdf` |
| Remote error | `42P01` — adaptive release relation reported absent |
| Failed-attempt rollback state | `VERIFIED_CLEAN — 19/19 PASS` |
| Failed-attempt post-apply verification | `NOT_RUN_AFTER_FAILURE` |
| Canonical corrected SHA-256 | `d88b21c866c5d19708dc544faaa2c5828e3127844c50f0d7e76a3716c07fc6f1` |
| Corrected Owner re-approval | `OWNER APPROVED FOR CORRECTED 0036 ON CONTROLLED DEV STAGING ONLY` |
| Corrected checksum remote status | `APPLIED_AND_VERIFIED` |
| Corrected execution result | `Success. No rows returned` |
| Corrected post-apply verification | `28/28 PASS` |
| Adaptive schema evidence | `3 tables / 3 public RPCs / 4 private helpers — PASS` |
| RLS evidence | `3 adaptive tables: RLS + FORCE RLS — PASS` |
| Browser privilege evidence | `direct adaptive mutations = 0; question_solutions SELECT = 0` |
| Adaptive row evidence | `zero attempts / zero answers` |
| Database activation evidence | `true flags = 0` |
| Candidate state | `DRAFT / HIDDEN`; Grade 2 unit/questions unpublished |
| Grade 1 evidence | `13 units / 312 questions / 312 solutions` |
| Grade 2 evidence | `1 unit / 24 questions / 24 solutions` |
| History evidence | `practice 18/340; diagnostic 1/24` |
| RLS drift evidence | `function/trigger objects = 0` |
| Diagnostic transaction | `READ ONLY — PASS` |
| Application feature flags | all `false` |
| Activation | `BLOCKED / FEATURE_FLAGS_FALSE` |
| Migration-history action | `NONE_AUTHORIZED` |
| Rerun action | `NONE — DO NOT RERUN` |

The Owner stopped immediately after the first failure and did not rerun the
failed checksum. That checksum is recorded as
`FAILED_AND_ROLLED_BACK_VERIFIED`: a catalog-safe read-only rollback
diagnostic returned `19/19 PASS` and proved that the failed transaction left
no partial adaptive object.

The Owner subsequently approved and manually executed the corrected canonical
checksum exactly once. The migration completed successfully and the read-only
post-apply diagnostic returned `28/28 PASS`. The three adaptive tables, three
public RPCs and four private helpers match the contract; no adaptive attempt or
answer row was created. The release remains `DRAFT/HIDDEN`, the Grade 2
unit/questions remain unpublished, and every database/application activation
flag remains false. No `supabase_migrations` history table was created or
modified, and migration 0036 must not be rerun.

The failed checksum was subsequently executed from the exact repository bytes
as one PostgreSQL query batch on a clean isolated local database and completed
successfully. In that source, the release table was created before every
reference to it; the reported approximate remote line points to a later
`REVOKE` statement. The precise remote execution-scope discrepancy therefore
cannot be recovered from the sanitized error alone. The corrected canonical
file hardens the phase boundary by checking for partial adaptive objects,
creating all three tables before the release seed, and verifying the table
phase before any index, RLS, policy or function statement.

## 2026-07-30 — Sprint 6J-B single test Student membership package

| Field | Value |
| --- | --- |
| `0037_adaptive_controlled_pilot_eligibility_draft.sql` | `APPLIED_AND_VERIFIED` |
| Approved SHA-256 | `91e2a4bb918bf894903f313d65d93bd80d8be98fad4fa2a1ca7c59cbbfe1b070` |
| Authorized environment | `plave-project003-dev / ujmw…mkes / CONTROLLED_DEV_STAGING` |
| Post-apply diagnostic | `0037_POST_APPLY_REMOTE_DEV_READONLY.sql — 31/31 PASS` |
| Grade 2 test Student | `AVAILABLE_NOT_YET_ENROLLED` |
| Database pilot membership | `PENDING_OWNER_OPERATION` |
| Membership operation | `ENROL_ONE_GRADE2_TEST_STUDENT.sql — PREPARED_NOT_RUN` |
| Post-membership diagnostic | `0037_SINGLE_TEST_STUDENT_MEMBERSHIP_READONLY.sql — PREPARED_NOT_RUN` |
| Server allowlist | `DEFAULT_EMPTY_DENY_ALL` |
| Activation | `BLOCKED` |
| Deactivation operation | `PREPARED_NOT_APPLIED` |
| Grade 2 publication | `DRAFT / HIDDEN` |
| Adaptive attempts / answers | `0 / 0` |
| Remote mutation during Sprint 6J-B package preparation | `NONE` |

`0037` is applied and independently verified; it must not be rerun. This
Sprint 6J-B package performs no remote action. The known Grade 2 Student is
available but not enrolled, membership remains pending the Owner’s private
UUID operation, all activation flags remain false, and activation stays
blocked. After the Owner reports a successful membership transaction and an
all-`PASS` aggregate diagnostic, only the membership fields may be advanced;
activation still requires a separate decision.

## 2026-07-30 — Universal Grades 1–9 runtime implementation package

| Field | Value |
| --- | --- |
| Environment | `LOCAL_DISPOSABLE_VERIFIED` |
| Migration | `0038_universal_curriculum_runtime_draft.sql` |
| Migration state | `LOCAL_DRAFT / REMOTE_NOT_APPLIED` |
| Architecture | `MATERIALIZED_RELEASE_BANK / PRIVATE_SOLUTIONS / JWT_SECURE_RPC` |
| Release | `plave-math-grades-1-9-v1 / 2026.07.30-draft.1` |
| Materialization | `171 units / 2,052 questions / 2,052 private solutions` |
| Bundle SHA-256 | `3d5b1a60e4cbb30ea89b6a2018b4c70c49808aa18d584f623bf4bb93931696f4` |
| Database content state | `LOCAL_MATERIALIZED / CLEANUP_DRAFT_INACTIVE` |
| Application flag | `PLAVE_CURRICULUM_RUNTIME_ENABLED / DEFAULT_FALSE` |
| Local PostgreSQL integration | `PASS / GRADES_1_TO_9 / RLS_RPC_JOURNEYS` |
| Remote SQL/mutation | `NONE` |
| Publication/activation/deployment | `NONE` |
| Grade 1 compatibility | `LEGACY_RUNTIME_UNCHANGED / UNIFIED_READ_MODEL` |
| 0035–0037 | `UNCHANGED` |
| 0038 SHA-256 | `9eee72dbdb6f3a8115fa6e92e73092b178b34d2dd6514ce3b307ba65f55bea8f` |

This entry records implementation and verified disposable-local evidence
only. It does not supersede prior remote evidence and does not authorize
migration 0038, content materialization, activation or application flag
changes on any remote environment.
