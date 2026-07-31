# Parent/Teacher universal runtime — local acceptance runbook

Status: **LIVE-LOCAL DATABASE PASS — 9 Grades × 12 checks;
NOT_READY_FOR_OWNER_BROWSER_DEMO.**

This runbook is local-only. It must never be used with a linked project, a remote database URL, `db push`, publication, activation, or deployment. The runner rejects non-loopback PostgreSQL hosts.

## What the verification does

The runner:

1. prints the exact `UNIVERSAL_COLLABORATION` relation precondition without identity data;
2. verifies the complete 0038 and collaboration base-schema fingerprints;
3. applies 0038 only when every 0038 object is absent, and fails closed on a partial schema;
4. materializes the deterministic release as `DRAFT/INACTIVE` only when the release bank is completely empty;
5. applies 0039 only when every 0039 marker is absent, skips it when the complete fingerprint already exists, and fails closed on a partial prior apply;
6. removes only deterministic synthetic residue and restores the release to `DRAFT/INACTIVE`;
7. temporarily activates the existing universal release inside the verification transaction;
8. creates synthetic-only fixtures: two Teachers, two Parents, classrooms and Students for Grades 1–9;
9. exercises Parent link isolation, multiple-child selection, universal progress, attempts, outcomes, skills and solution denial;
10. exercises Teacher deterministic/manual curriculum selection, draft, publish, Student start/resume/save/submit, database-authoritative grading, CAS, idempotency, gradebook evidence, close/reopen and cross-role/cross-classroom denial;
11. verifies the Grade 1 fixture remains 18 attempts / 340 answers;
12. rolls the verification transaction back and always runs cleanup in `finally`;
13. emits one `LIVE_LOCAL_DATABASE` evidence record for each Grade 1–9, with twelve independent checks per grade;
14. confirms the release is `DRAFT/INACTIVE` and no synthetic collaboration users remain;
15. records the database evidence while preserving
    `NOT_READY_FOR_OWNER_BROWSER_DEMO`; this runner is not allowed to promote
    browser readiness.

The SQL transaction is the live semantics evidence. It passed for all nine
grades, and the machine-readable status was populated only from its marker.
Static tests are not a substitute for that evidence.

## Exact local command

From `/Users/hatrung/Desktop/PLAVE-PROJECT004`, run:

```bash
npm run test:universal-collaboration-local
```

The runner obtains the PROJECT004 loopback database configuration from the
local Supabase CLI without printing it. `PLAVE_LOCAL_DATABASE_URL` remains an
optional loopback-only override.

Expected final line:

```text
0039 Parent/Teacher local integration and cleanup: PASS
```

The runner must also finish its postchecks without an error. If it stops after applying 0039, run the exact emergency cleanup operation against that same local database:

```bash
psql -X --set ON_ERROR_STOP=1 --file supabase/operations/cleanup_0039_parent_teacher_universal_local.sql "$PLAVE_LOCAL_DATABASE_URL"
```

Then independently confirm:

- universal release: `DRAFT/INACTIVE`;
- synthetic emails matching `collaboration-%@plave.local.invalid`: zero;
- no synthetic classroom, connection, assignment, answer or progress row remains.

## Quality gates already completed on 2026-07-31

- Parent/Teacher targeted contracts: 12/12 PASS, including canonical lifecycle assertions, exact typed/named 0039 RPC calls, explicit JSONB-to-text evidence serialization and strict per-grade marker parsing.
- Universal curriculum: 20/20 PASS.
- Grades 1–9 curriculum: 9/9 PASS; 171 units / 2,052 questions.
- Grade 1 practice regression: 550/550 PASS.
- Grade 1 production validator: 13 / 312 / 312 PASS.
- Frozen Grade 2: 7/7 PASS; DRAFT/HIDDEN.
- Owner runtime contracts and diagnostic hygiene: 14/14 PASS.
- Live HTTP/cookie runtime for Student Grades 1, 5, 8 and 9: PASS for
  register, login, lesson, start/resume, submit, progress, history and
  persistence.
- Full sequential suite: 818/818 PASS at concurrency 1.
- Lint, typecheck and production build: PASS.
- Browser solution/service-role import scan: zero matches.
- Migrations 0035–0037 baseline checks: PASS.

## Acceptance rule

Parent/Teacher universal database integration is `PASS`, while Owner browser
demo status remains `NOT_READY_FOR_OWNER_BROWSER_DEMO`: the exact live-local
runner and cleanup postconditions passed, but they do not cover the Next.js
HTTP, authenticated cookie/session, response-mapping or client-transition
path. Remote remains unchanged and requires a separate Owner-approved release
process.

For browser use, follow
`docs/operations/OWNER_LOCAL_DEMO_RUNBOOK.md`.
