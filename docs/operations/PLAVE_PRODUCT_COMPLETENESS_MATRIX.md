# PLAVE Product Completeness Matrix

**Audit date:** 2026-07-30
**Decision:** `READY_WITH_KNOWN_LIMITATIONS`

“Remote unverified” means this audit performed no remote read or mutation. “Owner observed” refers only to the runtime/browser evidence explicitly supplied by the Owner.

| Product area | Implementation status | Validation status | Runtime status | Remote status | Readiness | Limitations |
|---|---|---|---|---|---|---|
| Landing | COMPLETE | Build/source PASS | `/` 200 OWNER_BROWSER_OBSERVED | Not required for core public content | READY_LOCAL | Other public informational routes not individually browser-exercised |
| Authentication | COMPLETE implementation | Registration/auth tests PASS; redirect/cookie source audited | BLOCKED_BY_ENVIRONMENT | UNVERIFIED | PARTIAL | No live signup, email confirmation, reset, or session-refresh journey; rate-limit dependency |
| Student | COMPLETE Grade 1 implementation | Practice 550/550; production 13/312/312 PASS | Public preview Owner-observed; authenticated student runtime unverified | UNVERIFIED | READY_LOCAL_DEMO / PARTIAL_PERSISTED | Requires Supabase for dashboard/progress |
| Curriculum 1–9 | COMPLETE local draft preview | 546/546, 37/37, 171/2,052/2,052 PASS; 18-unit/54-question internal sample | Owner journey PASS for Grades 1, 3, 5, 6, 7, 8, 9 | No remote dependency | READY_LOCAL_DRAFT | Not published; secondary content needs educator review |
| Fixed practice | COMPLETE | Selection/answer/feedback/solution/security tests PASS | Authenticated runtime not exercised | UNVERIFIED | IMPLEMENTATION_READY | Persisted attempt needs Supabase |
| Diagnostic | COMPLETE implementation | API/state/authorization tests PASS | BLOCKED_BY_ENVIRONMENT | UNVERIFIED | IMPLEMENTATION_READY | No live attempt/review |
| Adaptive | IMPLEMENTED but HIDDEN/DISABLED | 61/61 adaptive tests; draft/pilot validators PASS | NOT ACTIVE | Ledger evidence only; current remote unverified | NOT READY FOR STUDENT USE | Flags false, deny-all membership, no live concurrency test |
| Parent | COMPLETE implementation | Connection, aggregate, authorization tests/static SQL PASS | BLOCKED_BY_ENVIRONMENT | UNVERIFIED | IMPLEMENTATION_READY | No live linked-account isolation journey |
| Teacher | COMPLETE implementation | Classroom/question/assignment/gradebook contracts tested | BLOCKED_BY_ENVIRONMENT | UNVERIFIED | IMPLEMENTATION_READY | No live invitation/classroom/assignment journey |
| Security | COMPLETE static boundary | Solution-boundary, RLS/RPC, redirect and role tests PASS | Public preview has no observed console/runtime failure | Live RLS/penetration NOT_RUN | READY_LOCAL | No dependency network audit; rate-limit and headers hardening remain |
| Accessibility | SUBSTANTIAL | Focus/target/responsive source contracts PASS | Mobile/desktop Owner-observed generally PASS | Not applicable | READY_WITH_LIMITATION | Nested main/duplicate ID; no aXe, contrast, or screen-reader run |
| Responsive | COMPLETE public-preview contract | 360/768/1440 component contracts PASS | 360×800 and normal desktop OWNER_BROWSER_OBSERVED | Not applicable | READY_LOCAL | 768×1024 and exact 1440×900 are static only |
| Performance | APPROPRIATE server/client split | Build/chunk/solution-boundary inspection PASS | Owner runtime ready 325 ms; no detailed timing profile | Not applicable | READY_LOCAL | No load/memory profiling; large server generator modules |
| Database | COMPLETE local migration contract through 0037 | Static migration/RLS/RPC/checksum tests PASS | No DB runtime in audit | PREVIOUS_LEDGER_ONLY | READY_FOR_CONTROLLED_USE, NOT REVERIFIED | Do not infer current remote state |
| Deployment | NOT PERFORMED | Production build PASS | Local only | NOT_RUN | OUT_OF_SCOPE | No host, domain, secrets, or production smoke |
| Documentation | PARTIAL | Runbook and extensive operations evidence present | Local command documented | Not applicable | READY_WITH_LIMITATION | Historical audit documents are archived; canonical package identity is PROJECT004 |

## Role journey states

| Journey | State |
|---|---|
| Anonymous landing/demo/curriculum preview | COMPLETE |
| Student public preview | COMPLETE |
| Student authenticated learning/persistence | IMPLEMENTED, BLOCKED_BY_ENVIRONMENT |
| Parent connection/progress/goals | IMPLEMENTED, BLOCKED_BY_ENVIRONMENT |
| Teacher invitation/classroom/question/assignment | IMPLEMENTED, BLOCKED_BY_ENVIRONMENT |
| Adaptive student journey | DISABLED_BY_FLAG |
| Admin product UI | NOT_IMPLEMENTED |

## Curriculum publication boundary

| Content set | Status |
|---|---|
| Grade 1 production | 13 units / 312 questions / 312 solutions; validator PASS |
| Frozen Grade 2 candidate | 24 questions; DRAFT/HIDDEN |
| Grades 1–9 preview | 171 units / 2,052 questions / 2,052 solutions; local draft demo |
| Adaptive pilot | HIDDEN, feature flags false, membership deny-all |
