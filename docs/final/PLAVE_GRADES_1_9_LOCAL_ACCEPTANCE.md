# PLAVE Grades 1–9 final local acceptance

Status: **LOCAL_ACCEPTED** for Grades 1–9 at executable baseline `20d276f14b94d74e60e5308953b99e708adb87e7`.

This document reconciles the already-passed browser, HTTP/API, disposable-database and quality evidence. It does not rerun the full harness or browser suite, alter executable runtime code, or claim a remote release.

## Canonical product truth

- Grade 1 remains on its unchanged public fixed runtime. Login, start/resume, submit, feedback, progress, history and relogin persistence passed in the browser.
- Grades 2–9 are materialized by canonical migration `0045` and integrated with the database-backed local release runtime.
- The Grades 2–9 inventory is 2,460 questions, 287 skills and 163 source units. Of these, 128 units have eligible runtime pools and 35 no-question source units fail closed.
- There are 274 adaptive skills and 13 fixed-safe skills. Fixed-safe browser acceptance passed 13/13 without writing adaptive mastery evidence.
- Browser journeys passed 9/9, including desktop/mobile, accessibility, authorization, deactivation/reactivation, persistence, console, hydration and request audits.

## Release and authorization truth

- `HIDDEN` remains the repository default and denies catalog exposure and start.
- `PILOT` requires the exact server-side user/grade/candidate/version/hash/policy entitlement.
- `PUBLIC` removes only the pilot UUID allowlist. It still requires an authenticated Student, the server-derived matching grade, exact active tuple, application flag and database flags.
- Anonymous, wrong-grade and cross-user requests fail closed. Parent and Teacher roles cannot start or submit. Approved Parent and authorized Teacher reads remain scope-limited.
- No path changes `schoolGrade` or creates a default entitlement.

## Operational state

The accepted PUBLIC activation occurred only in a disposable local database.
Remote migrations `0045`–`0047` are `APPLIED_AND_VERIFIED` from preserved
sanitized Owner-authorized operational evidence. Migration `0045` materializes
the hidden Grades 2–9 release; `0046` and `0047` add the unified XP and learning
activity projections. This documentation pass did not re-query the remote
database. Remote Grades 2–9 activation and a new application deployment remain
`NOT_YET_EXECUTED`; online production availability is `NOT_YET_CLAIMED`.

The machine-readable matrix and receipt are under `content/releases/grades-1-9/`.
