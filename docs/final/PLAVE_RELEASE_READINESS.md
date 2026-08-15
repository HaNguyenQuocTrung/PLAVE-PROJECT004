# PLAVE release readiness

| Scope | State | Evidence |
|---|---|---|
| Grades 1–9 local browser acceptance | LOCAL_ACCEPTED | `docs/e2e/GRADES_1_9_REAL_LOCAL_BROWSER_E2E_RECEIPT.json` |
| Grades 2–9 canonical database materialization | LOCAL_ACCEPTED | migration `0045` and release inventory |
| Grades 2–9 local PUBLIC behavior | LOCAL_ACCEPTED | browser and disposable-database proof |
| Repository default | HIDDEN | server-side release-mode contract |
| Remote migrations 0045–0047 | APPLIED_AND_VERIFIED | Owner-preserved sanitized operational evidence; not re-queried by this documentation audit |
| Remote Grades 2–9 state | HIDDEN_NOT_ACTIVATED | Eight policies; runtime/catalog/retention flags zero |
| Fresh post-current-ledger pre-activation backup | REQUIRED_BEFORE_ACTIVATION | Must be retained and restore-validated after the latest authorized migration |
| Remote Grades 2–9 activation | NOT_YET_EXECUTED | Authorized only after local/CI/backup gates |
| New application deployment | NOT_YET_EXECUTED | Owner action required |
| Grades 2–9 production availability | NOT_YET_CLAIMED | requires remote release and smoke proof |

Release readiness means the repository contains a locally verified implementation and a guarded handoff. It is not proof of remote publication.
