# PLAVE Improvement Backlog

**Source audit:** `PLAVE_PROJECT004_COMPLETE_AUDIT.md`
**Audit date:** 2026-07-30
**Current decision:** `READY_WITH_KNOWN_LIMITATIONS`

This backlog is advisory. No item was implemented during the read-only audit.

## Prioritized backlog

| Priority | Finding/item | Impact | Effort | Recommended acceptance |
|---:|---|---|---|---|
| 1 | AUD-M01: remove nested `<main>` elements and duplicate `main-content` ID | High accessibility/navigation confidence | Low | One main landmark per page; skip link resolves uniquely; semantic tests pass |
| 2 | AUD-M02: add a canonical root README and align package/project identity | High recipient/demo handoff confidence | Low | Fresh recipient can install, configure, build, run, find demo, and distinguish production/draft/disabled |
| 3 | AUD-M03: reconcile migration status wording | High operational safety | Low | Every status states scope, ledger evidence, and “current remote unverified”; no SQL action implied |
| 4 | AUD-M05: document and implement auth abuse controls | High production security | Medium | Login/register/reset limits tested; provider and app responsibilities documented |
| 5 | AUD-M04: educator review of Grade 7–9 draft content | High student learning quality | Medium–high | Risk-heavy outcomes reviewed by qualified educators; templates differentiated; all mappings/gates preserved |
| 6 | Add project-level not-found/error/loading states | Medium UX/recovery | Medium | Consistent Vietnamese recovery UI, no nested landmarks, no sensitive error details |
| 7 | Run approved live authenticated role acceptance | High release confidence | Medium | Student, parent, teacher isolation and persistence pass in a disposable approved environment |
| 8 | Add automated and manual accessibility acceptance | Medium inclusion/confidence | Medium | aXe has no serious issues; keyboard, focus, contrast, announcements, SVGs verified at three viewports |
| 9 | Add deployment-compatible security headers | Medium defense in depth | Medium | CSP/report-only rollout first; auth/assets work; framing/referrer/permissions headers verified |
| 10 | Clean module/dependency warnings and stale generated residue | Low maintainability/handoff | Low | No typeless-module warnings; clean install has no unexplained extraneous package |

## Detailed work packages

### A. Accessibility landmark correction

- Preserve the root `app/layout.tsx` main landmark.
- Replace inner page/loading `<main>` elements with `section` or `div`.
- Remove the second `id="main-content"` from curriculum preview.
- Add a test that renders representative public, diagnostic, and loading states and asserts one main landmark and one skip target.
- Do not alter curriculum, practice, or solution contracts.

### B. Canonical handoff documentation

- Add `README.md` with prerequisites, npm install strategy, public no-credential demo, optional Supabase configuration, test/build commands, and known limitations.
- Point to `docs/operations/FINAL_LOCAL_DEMO_RUNBOOK.md`.
- Clearly label Grade 1 production, frozen Grade 2, Grades 1–9 local draft preview, and disabled adaptive.
- DONE: canonical package identity is `plave-project004`.
- Mark historical architecture/scope reports as superseded instead of deleting evidence.

### C. Migration evidence reconciliation

- Preserve migrations 0035–0037 byte-for-byte.
- Change status prose only.
- Use three distinct labels: local static validation, historical ledger evidence, and current remote state.
- Add a documentation assertion that no validator grants authority to run SQL.

### D. Secondary curriculum quality review

- Begin with:
  - `grade-7-data-and-probability`: `q01`, `q05`, `q09`
  - `grade-9-data-and-probability`: `q01`, `q05`, `q09`
  - Long generated titles in `lib/curriculum/secondary-completion.ts`
- Review reasoning demand, realistic context, distractor quality, Vietnamese phrasing, theory/example alignment, and visual explanatory value.
- Do not call automated checks expert endorsement.
- Do not publish changes automatically; rerun 546/546 mapping, all curriculum tests, leak scans, and the sequential full suite.

### E. Auth production hardening

- Document Supabase Auth limits and email-provider limits.
- Add deployment-aware throttling keyed by privacy-preserving request/account signals.
- Preserve generic forgot-password and invalid-login messages.
- Test proxy/session behavior and avoid trusting forwarded headers without platform guarantees.

### F. Live acceptance still needed before production

Use only an explicitly authorized disposable environment:

- registration → confirmation → login → logout → recovery;
- student onboarding → lesson → persisted fixed practice → result/review;
- parent request/approval → isolated child progress;
- teacher invitation → classroom → assignment → gradebook;
- cross-account IDOR/role attempts;
- live RLS/RPC and concurrent adaptive CAS testing if adaptive is ever considered for activation.

## Submission safeguards

Before a local-demo submission:

- Keep adaptive flags false and membership deny-all.
- Keep frozen Grade 2 DRAFT/HIDDEN.
- Keep Grades 1–9 preview local-only.
- Exclude `.next/`, `node_modules/`, environment files, database dumps, and backups.
- Do not edit or reapply migrations 0035–0037.
- Do not introduce client imports of solution registries.
- Do not replace Owner-observed/static evidence labels with stronger claims.

## Deferred—not defects in the local demo

- Deployment and production-domain configuration.
- Remote dependency vulnerability scan.
- Current remote database-state verification.
- Real email delivery.
- Load testing at production concurrency.
- Adaptive activation/publication.
