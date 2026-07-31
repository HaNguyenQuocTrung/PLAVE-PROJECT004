# PLAVE PROJECT004 — Complete Website Audit

> **ARCHIVED_NON_OPERATIONAL:** Historical audit snapshot. Findings about old
> package names remain only to preserve the evidence recorded at that time.

**Decision: READY_WITH_KNOWN_LIMITATIONS**

**Audit date:** 2026-07-30
**Scope:** `/Users/hatrung/Desktop/PLAVE-PROJECT004` only
**Mode:** read-only application audit; only the four explicitly authorized audit artifacts were added
**Remote state:** not queried or changed
**Pedagogical status:** internal technical/content sampling only; this is not expert pedagogical endorsement

## 1. Executive conclusion

PLAVE currently has a working public local curriculum demonstration for Grades 1–9, a complete Grade 1 fixed-practice implementation, and substantial authenticated student, parent, and teacher functionality in source. The official curriculum validators independently pass at 546/546 outcomes, 37/37 applicable domains, 171 preview units, 2,052 questions, and 2,052 separately delivered solutions. The full sequential test suite passes 779/779, and lint, typecheck, and production build pass.

The Owner-observed public runtime and core student journey pass. No BLOCKER or HIGH finding was identified. The decision is nevertheless `READY_WITH_KNOWN_LIMITATIONS`, rather than an unqualified submission-ready decision, because authenticated role journeys were not live-tested in this audit, adaptive practice is deliberately hidden and disabled, the Grade 2 candidate remains frozen DRAFT/HIDDEN, and five specific MEDIUM findings remain.

### Evidence labels

- **OWNER_BROWSER_OBSERVED:** supplied by the Owner from a real local browser/runtime.
- **CURRENT_STATIC:** directly inspected in current source, generated build output, or current tests.
- **CURRENT_COMMAND:** rerun during this audit.
- **PREVIOUS_LEDGER_ONLY:** recorded in repository operations evidence, not independently checked against a remote system.
- **BLOCKED_BY_SANDBOX:** attempted locally but the audit sandbox could not bind/access the Owner's external server.
- **NOT_RUN:** outside the authorized or available boundary.

## 2. What the website contains

- Public landing, product information, About, Terms, Privacy, login, registration, password recovery, and public demo.
- A no-credential `/curriculum-preview` for Grades 1–9, with theory, worked examples, question practice, differentiated feedback, post-submit solutions, next/reset/exit/change-grade behavior, and local-only state.
- Authenticated Grade 1 learning catalog, lessons, fixed practice, results/review, diagnostic, personalized path, and progress.
- Parent connection, child progress, goals, and summary surfaces.
- Teacher invitation onboarding, classrooms, roster, question workshop, assignments, review, gradebook, analysis, and CSV export.
- Adaptive practice code and database contracts behind deny-by-default flags; it is not an active student feature.
- Local SQL migrations and operational diagnostics through 0037; no SQL was executed in this audit.

## 3. Project inventory

| Area | Current evidence |
|---|---|
| Framework | Next.js 16.2.12, React/React DOM 19.2.8, TypeScript 5.9.3 |
| Data/auth | `@supabase/ssr` 0.12.3, `@supabase/supabase-js` 2.110.9 |
| Quality tooling | ESLint 9.39.5, Node test runner, TypeScript compiler |
| Package manager | npm; `package-lock.json` present |
| Package identity | `package.json` still says `plave-project003` and has a stale Grade 1-oriented description |
| App structure | App Router: 46 functional page/callback routes, 32 API routes, two icon routes, plus the built-in not-found fallback; 37 component files and 95 library files |
| Content | Grade 1 production registry; frozen Grade 2 candidate; Grades 1–9 local draft registry/generators; official PDFs and mapping evidence |
| Database | 37 ordered migrations, `0001`–`0037`; operation and diagnostic SQL are local files only in this audit |
| Tests/scripts | 44 test files and 37 scripts |
| Public assets | Two public assets; no missing-asset evidence in the Owner-observed demo |
| Documentation | 62 documentation files; operational evidence is extensive but the root README is missing and several old documents are stale |
| Build artifacts | `.next` approximately 3.6 GB and `node_modules` approximately 446 MB; both are gitignored and must be excluded from any handoff archive |

### Environment variable names

Values were not read or printed. Names found include:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NODE_ENV`
- `PLAVE_ADAPTIVE_PILOT_USER_IDS`
- `PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED`
- `PLAVE_CONTROLLED_PILOT_ENABLED`
- `PLAVE_GRADE2_NUMBERS_TO_1000_ENABLED`
- `PLAVE_RETENTION_RUNTIME_ENABLED`
- Local backup/test database variable names used by operational scripts

Only `.env.example` was found; no real `.env` file was found. The example currently documents only the two public Supabase variables.

### File classification

| Classification | Examples and assessment |
|---|---|
| Active source | `app/`, `components/`, `lib/`, `proxy.ts`, `next.config.ts` |
| Tests | `tests/`; active and exercised |
| Production-relevant content | Grade 1 catalog/content and fixed-practice paths |
| Local draft/demo content | Grades 1–9 preview registry and generators |
| Frozen candidate | Grade 2 release candidate; DRAFT/HIDDEN |
| Database contracts | `supabase/migrations/0001`–`0037`; static only in this audit |
| Operations/diagnostics | `docs/operations/`, SQL scripts and validation scripts; some historical status wording is stale |
| Documentation only | `docs/architecture/`, curriculum source/evidence documents |
| Generated artifacts | `.next/`, TypeScript build cache; exclude from submission archive |
| Dependency artifacts | `node_modules/`; exclude from submission archive |
| Temporary/backup/archive files | No suspicious source-level temporary, backup, or archive file names found outside ignored generated directories |
| Stale/dead/duplicate | No confirmed executable dead-code path; stale PROJECT003 naming and historical documentation were found |

`npm ls --depth=0` reported `@emnapi/runtime` and `@img/sharp-wasm32` as extraneous. They appear dependency/build related; this is cleanup evidence, not a runtime failure.

## 4. Route and page audit

### Page routes

The rendering column describes the source boundary, not a guarantee that every route was browser-exercised.

| Path | Purpose | Role/auth | Rendering and data | Status/evidence | Finding |
|---|---|---|---|---|---|
| `/` | Landing | Public | Server page; static/product content and public auth header | 200 OWNER_BROWSER_OBSERVED; build PASS | Operational |
| `/about` | Product/about | Public | Server/static | CURRENT_STATIC, build PASS | Not runtime-observed |
| `/demo` | Public product demo | Public | Server with local demo components | 200 OWNER_BROWSER_OBSERVED | Operational |
| `/login` | Sign in | Anonymous | Server page + client/server form; Supabase auth | CURRENT_STATIC/tests | Live auth unverified |
| `/register` | Account creation | Anonymous | Server page + registration form/action; Supabase auth/profile metadata | CURRENT_STATIC/tests | Live auth unverified |
| `/forgot-password` | Request reset | Anonymous | Server/form; Supabase reset email | CURRENT_STATIC/tests | Provider/email unverified |
| `/auth/confirm` | Email/recovery confirmation | Public callback | Server route; Supabase OTP | CURRENT_STATIC/tests | Provider callback unverified |
| `/update-password` | Complete recovery | Recovery session | Server/form; recovery cookie + Supabase | CURRENT_STATIC/tests | Live recovery unverified |
| `/onboarding` | Student onboarding | Authenticated student | Server/client form; profile/onboarding API | CURRENT_STATIC/tests | Runtime blocked by environment |
| `/dashboard` | Student home/progress | Authenticated student | Server; Supabase learning context | CURRENT_STATIC/tests | Runtime blocked by environment |
| `/profile` | Profile | Authenticated | Server; Supabase profile | CURRENT_STATIC/build | Runtime blocked by environment |
| `/profile/edit` | Edit profile | Authenticated | Server/form; Supabase | CURRENT_STATIC/build | Runtime blocked by environment |
| `/settings` | Account settings/logout | Authenticated | Server/client actions; Supabase | CURRENT_STATIC/build | Runtime blocked by environment |
| `/learn` | Student catalog/path | Authenticated student | Server; Grade 1 production catalog and persisted progress | CURRENT_STATIC/tests | Runtime blocked by environment |
| `/learn/[gradeSlug]/[lessonSlug]` | Lesson | Authenticated student | Server; lesson catalog/content | CURRENT_STATIC/tests | Runtime blocked by environment |
| `/learn/grade-1/numbers-to-10` | Legacy/canonical Grade 1 lesson entry | Authenticated student | Server redirect/page boundary | CURRENT_STATIC/build | Reachability maintained |
| `/lessons` | Lesson index/redirect | Authenticated student | Server | CURRENT_STATIC/build | No failure found |
| `/practice/[attemptId]` | Fixed practice attempt | Authenticated student/member | Server + client runner; practice APIs/RPC | CURRENT_STATIC, 550 tests PASS | Live Supabase unverified |
| `/results` | Practice result routing | Authenticated student | Server; attempt/result state | CURRENT_STATIC/tests | Runtime blocked by environment |
| `/review/[attemptId]` | Fixed-practice review | Authenticated owner | Server; answer review with protected solutions | CURRENT_STATIC/tests | Live Supabase unverified |
| `/grade-1/summary` | Grade 1 progress summary | Authenticated student | Server; progress aggregates | CURRENT_STATIC/tests | Runtime blocked by environment |
| `/diagnostic` | Start/resume diagnostic | Authenticated student | Server + form; diagnostic APIs | CURRENT_STATIC/tests | Live Supabase unverified |
| `/diagnostic/[attemptId]` | Diagnostic attempt | Authenticated owner | Server + client runner; diagnostic state/answer APIs | CURRENT_STATIC/tests | Nested main landmark |
| `/diagnostic/[attemptId]/review` | Diagnostic review | Authenticated owner | Server; diagnostic result | CURRENT_STATIC/tests | Nested main landmark |
| `/curriculum-preview` | Grades 1–9 local curriculum demo | Public | Server filters local registry; selected unit's 12 public questions only; client practice | 200 OWNER_BROWSER_OBSERVED; tests PASS | Operational local demo |
| `/adaptive-practice/[attemptId]` | Adaptive attempt | Authenticated eligible student | Server + client; adaptive APIs/RPC/flags | CURRENT_STATIC/tests | DRAFT/HIDDEN; flags false |
| `/assignments` | Student assignments | Authenticated student | Server; Supabase assignments | CURRENT_STATIC/tests | Live Supabase unverified |
| `/assignments/[assignmentId]` | Assignment detail/start | Authenticated assigned student | Server/client; assignment APIs | CURRENT_STATIC/tests | Live Supabase unverified |
| `/assignments/[assignmentId]/review` | Assignment review | Authenticated owner | Server; protected assignment result | CURRENT_STATIC/tests | Live Supabase unverified |
| `/connections` | Parent/student connection requests | Authenticated parent/student | Server/forms; connection APIs | CURRENT_STATIC/tests | Live Supabase unverified |
| `/classrooms` | Student classroom membership/join | Authenticated student | Server + client manager; classroom APIs | CURRENT_STATIC/tests | Live Supabase unverified |
| `/goals` | Parent/student goals | Authenticated linked role | Server/forms; goals/RPC | CURRENT_STATIC/tests | Live Supabase unverified |
| `/parent/children/[connectionId]` | Child progress | Authenticated approved parent | Server; authorized aggregate RPCs | CURRENT_STATIC/tests | Live isolation unverified |
| `/teacher` | Teacher dashboard | Authenticated teacher | Server; teacher account/class data | CURRENT_STATIC/tests | Live Supabase unverified |
| `/teacher/onboarding` | Invitation-based teacher activation | Authenticated invited teacher | Server/form; activation API | CURRENT_STATIC/tests | Live invitation unverified |
| `/teacher/profile` | Teacher profile | Authenticated teacher | Server/form; Supabase | CURRENT_STATIC/tests | Live Supabase unverified |
| `/teacher/classrooms` | Classroom list/create | Authenticated teacher | Server/forms; classroom APIs | CURRENT_STATIC/tests | Live Supabase unverified |
| `/teacher/classrooms/[classroomId]` | Classroom roster | Owning/authorized teacher | Server/actions; membership checks | CURRENT_STATIC/tests | Live isolation unverified |
| `/teacher/classes/[classroomId]/gradebook` | Class gradebook | Authorized teacher | Server; gradebook data | CURRENT_STATIC/tests | Nested main in loading state |
| `/teacher/questions` | Question workshop | Authenticated teacher | Server/client; teacher question APIs | CURRENT_STATIC/tests | Live Supabase unverified |
| `/teacher/assignments` | Teacher assignment list | Authenticated teacher | Server; Supabase | CURRENT_STATIC/tests | Live Supabase unverified |
| `/teacher/assignments/new` | Draft assignment creation | Authenticated teacher | Server/form; draft API | CURRENT_STATIC/tests | Live Supabase unverified |
| `/teacher/assignments/[assignmentId]` | Assignment management | Authorized teacher | Server/client; lifecycle/publish APIs | CURRENT_STATIC/tests | Live isolation unverified |
| `/teacher/assignments/[assignmentId]/analysis` | Assignment analysis | Authorized teacher | Server; aggregate data | CURRENT_STATIC/tests | Nested main in loading state |
| `/privacy` | Privacy notice | Public | Server/static | CURRENT_STATIC/build | Operational source |
| `/terms` | Terms | Public | Server/static | CURRENT_STATIC/build | Operational source |
| `/_not-found` | Framework fallback | Public | Built-in Next.js fallback | Build PASS | No project-specific not-found UX |
| `/icon.png`, `/apple-icon.png` | Application icon assets | Public | Generated asset routes | Build PASS | Operational |

There is no project-level `app/error.tsx`, `app/not-found.tsx`, or global `app/loading.tsx`. Only selected assignment/parent/teacher pages have loading files. This does not stop the demo, but weakens failure and empty-state consistency.

### API routes

| Path | Purpose | Auth/authorization and data | Status/evidence | Finding |
|---|---|---|---|---|
| `/api/curriculum-preview/check` | Check one preview answer and return feedback/solution | Public local API; validates unit/question/answer; `no-store`; solution remains server-side until submit | CURRENT_STATIC/tests PASS | Correct solution boundary |
| `/api/practice/start` | Start/resume fixed practice | Student auth + server RPC | CURRENT_STATIC/tests | Live DB unverified |
| `/api/practice/state` | Load attempt state | Authenticated attempt owner | CURRENT_STATIC/tests | Live DB unverified |
| `/api/practice/answer` | Submit fixed answer | Authenticated owner; server-trusted correctness | CURRENT_STATIC/tests | Live DB unverified |
| `/api/diagnostic/start` | Start/resume diagnostic | Student auth | CURRENT_STATIC/tests | Live DB unverified |
| `/api/diagnostic/state` | Load diagnostic state | Authenticated owner | CURRENT_STATIC/tests | Live DB unverified |
| `/api/diagnostic/current` | Get current diagnostic item | Authenticated owner | CURRENT_STATIC/tests | Live DB unverified |
| `/api/diagnostic/answer` | Submit diagnostic answer | Authenticated owner; server scoring | CURRENT_STATIC/tests | Live DB unverified |
| `/api/adaptive-practice/start` | Start adaptive attempt | Student auth, membership, flags | CURRENT_STATIC/tests | Flags false/HIDDEN |
| `/api/adaptive-practice/state` | Load adaptive state | Authenticated owner/member | CURRENT_STATIC/tests | Flags false/HIDDEN |
| `/api/adaptive-practice/answer` | CAS/idempotent adaptive submit | Authenticated owner/member; revision/idempotency contracts | CURRENT_STATIC/tests | DB concurrency not live-tested |
| `/api/onboarding` | Complete student onboarding | Authenticated user; validated profile fields | CURRENT_STATIC/tests | Live DB unverified |
| `/api/connections/request` | Request parent/student link | Authenticated allowed role | CURRENT_STATIC/tests | Live DB unverified |
| `/api/connections/preview` | Preview connection target | Authenticated allowed role; limited response | CURRENT_STATIC/tests | Live DB unverified |
| `/api/connections/action` | Approve/reject connection | Authenticated target; membership checks | CURRENT_STATIC/tests | Live DB unverified |
| `/api/classrooms/create` | Create classroom | Teacher role | CURRENT_STATIC/tests | Live DB unverified |
| `/api/classrooms/request` | Request/join classroom | Allowed authenticated role | CURRENT_STATIC/tests | Live DB unverified |
| `/api/classrooms/preview` | Preview classroom code | Authenticated; limited response | CURRENT_STATIC/tests | Live DB unverified |
| `/api/classrooms/action` | Approve/reject membership | Authorized teacher/member | CURRENT_STATIC/tests | Live DB unverified |
| `/api/assignments/draft` | Create/update assignment draft | Authorized teacher | CURRENT_STATIC/tests | Live DB unverified |
| `/api/assignments/start` | Start student assignment | Assigned student | CURRENT_STATIC/tests | Live DB unverified |
| `/api/assignments/state` | Read assignment state | Authorized teacher/student | CURRENT_STATIC/tests | Live DB unverified |
| `/api/assignments/submit` | Submit assignment work | Assigned student; server validation | CURRENT_STATIC/tests | Live DB unverified |
| `/api/teacher/activate` | Activate invited teacher | Authenticated invitation contract | CURRENT_STATIC/tests | Live DB unverified |
| `/api/teacher/questions` | List workshop questions | Teacher role | CURRENT_STATIC/tests | Live DB unverified |
| `/api/teacher/questions/create` | Create draft question | Teacher role; validated payload | CURRENT_STATIC/tests | Live DB unverified |
| `/api/teacher/questions/archive` | Archive question | Authorized teacher/ownership | CURRENT_STATIC/tests | Live DB unverified |
| `/api/teacher/questions/restore` | Restore question | Authorized teacher/ownership | CURRENT_STATIC/tests | Live DB unverified |
| `/api/teacher/assignments/publish` | Publish teacher assignment | Authorized teacher; lifecycle checks | CURRENT_STATIC/tests | Not curriculum publication |
| `/api/teacher/assignments/lifecycle` | Assignment state changes | Authorized teacher | CURRENT_STATIC/tests | Live DB unverified |
| `/api/teacher/assignments/[assignmentId]/gradebook.csv` | Export assignment gradebook | Authorized teacher; CSV response | CURRENT_STATIC/tests | Live DB unverified |
| `/api/goal-suggestions` | Generate/load goal suggestions | Authenticated linked role; local/server logic | CURRENT_STATIC/tests | Live DB unverified |

No confirmed broken public-demo link, auth loop, public role leak, solution leak, or dead primary action was found. Route existence was not treated as journey completion.

## 5. Role and journey audit

| Role/journey | Status | Evidence and limitation |
|---|---|---|
| Anonymous landing and product pages | COMPLETE for local demo | `/` and `/demo` 200 OWNER_BROWSER_OBSERVED |
| Anonymous curriculum preview | COMPLETE for local demo | Owner journey PASS; local registry/API; no credential or remote mutation |
| Register/login/logout | PARTIAL / BLOCKED_BY_ENVIRONMENT | Source and tests pass; no live Supabase credential/provider run |
| Forgot/reset/verify email | PARTIAL / BLOCKED_BY_ENVIRONMENT | Safe source contracts and tests; email delivery/callback not live-tested |
| Protected-route redirect behavior | IMPLEMENTED, statically validated | Proxy and page guards inspected; live cookie flow unverified |
| Student onboarding/dashboard/profile | IMPLEMENTED, BLOCKED_BY_ENVIRONMENT | Complete source paths; live persisted role journey unverified |
| Grade 1 catalog/lesson/fixed practice/result/review | COMPLETE implementation; runtime environment-limited | 550 practice tests, 13/312/312 production validator; no live Supabase attempt in this audit |
| Diagnostic | COMPLETE implementation; BLOCKED_BY_ENVIRONMENT | Start/current/answer/state/review code and tests present |
| Personalized path/progress | COMPLETE implementation; BLOCKED_BY_ENVIRONMENT | Server loaders and tests present |
| Curriculum preview | COMPLETE local demo | Owner tested Grades 1, 3, 5, 6, 7, 8, 9 and complete representative flow |
| Adaptive eligibility/practice | DISABLED_BY_FLAG | Code and migrations/test contracts complete; all flags false, hidden, not live-tested |
| Parent connect/progress/goals | COMPLETE implementation; BLOCKED_BY_ENVIRONMENT | Access checks and tests present; no live linked accounts |
| Teacher onboarding/classroom/question/assignment/gradebook | COMPLETE implementation; BLOCKED_BY_ENVIRONMENT | Role/ownership checks and tests present; no live invitation/classroom |
| Admin/internal | NOT_IMPLEMENTED as product UI | Operational scripts/SQL exist; no admin route |

## 6. Teaching and curriculum audit

### Independent current validation

| Contract | Result |
|---|---|
| Official PDF/source provenance | PASS; two official source PDFs and mapping evidence present |
| Official outcomes | 546/546 PASS |
| Applicable domains | 37/37 PASS; three explicitly not-applicable taxonomy entries |
| Preview units | 171 PASS |
| Questions | 2,052 PASS |
| Separated solutions | 2,052 PASS |
| Outcome/source mapping | PASS |
| Determinism | PASS |
| Prerequisite graph/contracts | PASS in validators/tests |
| Solution preload | No client preload found |

Unit counts are Grade 1: 9, Grade 2: 16, Grade 3: 18, Grade 4: 16, Grade 5: 16, Grade 6: 26, Grade 7: 22, Grade 8: 23, Grade 9: 25. Every preview unit contains 12 questions.

### Content status separation

1. **Grade 1 production:** 13 units, 312 questions, 312 solutions; unchanged and production validator PASS.
2. **Frozen Grade 2 candidate:** 24 questions; DRAFT/HIDDEN; release validator PASS; not in the production catalog.
3. **Grades 1–9 local draft preview:** 171 units, 2,052 questions, 2,052 solutions; local demo only.
4. **Published content:** Grade 1 production catalog only as represented by current repository validators.
5. **Local-only content:** Grades 1–9 curriculum preview and disabled adaptive pilot.

### Manual stratified sample

The following 18 units and 54 exact question IDs were manually inspected against current theory, worked examples, prompt data, answer computation, feedback, solution, visual contract, Vietnamese wording, and post-submit solution boundary:

| Grade | Unit ID | Question IDs | Risk/coverage |
|---|---|---|---|
| 1 | `grade-1-numbers-to-10` | `q01`, `q05`, `q09` | Numbers |
| 1 | `grade-1-applied-problem-solving` | `q01`, `q05`, `q09` | Applied problems |
| 2 | `grade-2-time-calendar-money-p0` | `q01`, `q02`, `q03` | Measurement/finance |
| 2 | `grade-2-data-and-chance` | `q01`, `q05`, `q06` | Charts/probability |
| 3 | `grade-3-unit-fractions` | `q01`, `q05`, `q09` | Fractions |
| 3 | `grade-3-data-and-probability` | `q01`, `q05`, `q06` | Statistics/probability |
| 4 | `grade-4-fraction-reasoning-p1` | `q01`, `q05`, `q09` | Fraction reasoning |
| 4 | `grade-4-angle-reasoning` | `q01`, `q05`, `q09` | Geometry/measurement |
| 5 | `grade-5-decimal-operations` | `q01`, `q05`, `q09` | Decimals |
| 5 | `grade-5-volume-area-nets-p1` | `q01`, `q06`, `q10` | Solids/nets/measurement |
| 6 | `grade-6-integer-operations` | `q01`, `q05`, `q09` | Negative numbers |
| 6 | `grade-6-finance-interdisciplinary-p1` | `q01`, `q05`, `q10` | Finance/modelling |
| 7 | `grade-7-secondary-geo-p1-8` | `q10`, `q11`, `q12` | Proof/geometry |
| 7 | `grade-7-data-and-probability` | `q01`, `q05`, `q09` | Statistics/probability |
| 8 | `grade-8-linear-equations` | `q01`, `q05`, `q09` | Algebra/equations |
| 8 | `grade-8-pythagorean-reasoning` | `q01`, `q05`, `q09` | Geometry/proof |
| 9 | `grade-9-quadratic-functions` | `q01`, `q05`, `q09` | Algebra/modelling |
| 9 | `grade-9-data-and-probability` | `q01`, `q05`, `q09` | Charts/probability |

No serious correctness defect, missing datum, multiple-correct-answer defect, visual contract break, or solution leak was found in this sample. Arithmetic and stated answers/solutions were consistent. Theory and examples were sufficient for the generated task patterns. Vietnamese was generally natural.

The sample is an internal audit, not expert review. A MEDIUM limitation remains: some Grade 7–9 statistics items are structurally elementary and reuse generic templates, so coverage correctness is stronger than grade-level pedagogical differentiation. Some generated secondary titles also inherit long official-outcome phrasing.

## 7. Practice and adaptive audit

### Fixed Grade 1

- Question selection, start/resume, submit, differentiated feedback, post-submit solution, progress, retry/result/review, owner authorization, and RPC/security contracts are implemented.
- Correctness is determined server-side; the client does not submit a trusted `isCorrect`.
- Grade 1 gate: 13 units / 312 questions / 312 solutions, unchanged, PASS.
- Live persisted execution requires Supabase and was not performed.

### Adaptive state matrix

| Dimension | Current state |
|---|---|
| Implemented | YES: start/resume/state/answer, early mastery, remediation, maximum-reached termination |
| Migrated | PREVIOUS_LEDGER_ONLY for controlled remote dev/staging; local migrations 0036/0037 statically validate |
| Configured | NO for active use; deny-all membership and flags false |
| Activated | NO |
| Visible | NO; HIDDEN |
| Live-tested | NO in this audit |
| CAS revision | Implemented and tested |
| Idempotency/duplicate submit | Implemented and tested |
| Conflict refresh | Implemented and tested |
| Solution boundary | Server/API boundary tested |
| Role/membership enforcement | Source/tests PASS; 0037 static validator PASS |

Code completeness must not be interpreted as feature activation.

## 8. Authentication audit

- Proxy refreshes SSR sessions with the public Supabase key and redirects protected anonymous requests to a sanitized local `next` path.
- External, protocol-relative, and backslash redirect forms are rejected.
- Registration validates role, grade, password, terms, and teacher-invitation shape; server-side result mapping is tested.
- An unexpected registration session is cleaned up with sign-out.
- Login uses generic invalid-credential handling and separates unconfirmed-email behavior.
- Forgot-password response is generic to reduce account enumeration.
- Confirmation accepts allowlisted OTP types.
- Recovery state uses an HTTP-only, `SameSite=Lax`, short-lived cookie and is cleared after password update.
- Role/profile access is rechecked on role-specific server pages.
- No real credential, email provider, or live session refresh was used.
- No application-level rate limiter was found for login/register/recovery; production safety currently depends on Supabase/provider controls and deployment configuration.

## 9. Database and migration audit

- Migration order is contiguous from `0001` to `0037`.
- Current local SHA-256 values:
  - `0035`: `67bef151f4a8744c107835ce98ab5a5c30372cf76ff0328e02c1ca8649c7f206`
  - corrected `0036`: `d88b21c866c5d19708dc544faaa2c5828e3127844c50f0d7e76a3716c07fc6f1`
  - `0037`: `91e2a4bb918bf894903f313d65d93bd80d8be98fad4fa2a1ca7c59cbbfe1b070`
- Static checks cover constraints, indexes, RLS enablement, FORCE RLS where required, policies, grants, `SECURITY DEFINER`, safe `search_path`, authenticated RPC exposure, private helpers, ownership, membership, solution-table protection, and read-only parent aggregates.
- Browser roles do not receive direct private solution-table access.
- Migration 0035 keeps the candidate hidden/unpublished; 0036 defines adaptive atomic/CAS contracts; 0037 adds database-enforced pilot membership.
- The operation ledger records controlled remote application/verification. That is **PREVIOUS_LEDGER_ONLY**; current remote state was not queried.
- No SQL, rollback, migration, or remote diagnostic was run.

Historical documentation and one validator phrase remote state inconsistently; an operator could mistake “not applied by this static validator” for “never applied.” See finding AUD-M03.

## 10. Security audit

| Check | Result |
|---|---|
| Hard-coded secrets/private keys/tokens | No credential value found by local static scan |
| `.env` exposure | Only `.env.example`; no real `.env` found |
| Service-role browser use | None found |
| Real PII | None found; test identities/UUIDs appear synthetic |
| Client solution import/preload | None found |
| Direct solution-table query from app client/server | None found |
| Unsafe HTML/eval | No `dangerouslySetInnerHTML` or `eval` found |
| Open redirect | Local-path sanitization present and tested |
| Auth bypass/role escalation/IDOR | Server role/owner/membership checks found; static tests pass |
| Client-trusted correctness | Not found in practice/preview answer contracts |
| User-supplied userId/mass assignment | Validated server identity/payload patterns found |
| CSRF | Same-origin checks on mutations plus SameSite cookie assumptions |
| Error leakage | Public error mapping is restrained; no secret logging found |
| Dependency vulnerabilities | NOT_RUN; a network-dependent audit was outside the available boundary |
| Live RLS/RPC penetration | NOT_RUN; no remote/database access |

No BLOCKER/HIGH security issue was identified statically. Rate-limit dependency and absent explicit security headers are documented limitations, not proof of an exploit.

## 11. UI, responsive, and accessibility

### Runtime/browser evidence

- `/`, `/demo`, `/curriculum-preview`, and `/curriculum-preview?grade=7`: HTTP 200 OWNER_BROWSER_OBSERVED.
- Next.js 16.2.12 at `http://127.0.0.1:3000`, ready in 325 ms; no runtime server error observed by Owner.
- Curriculum journey: open unit, theory, examples, practice, incorrect submit/feedback, post-submit solution, correct submit, next, reset/exit, change grade: PASS OWNER_BROWSER_OBSERVED.
- Grades 1, 3, 5, 6, 7, 8, and 9 opened: PASS OWNER_BROWSER_OBSERVED.
- 360×800: PASS OWNER_BROWSER_OBSERVED; no horizontal overflow, clipping/overlap, or unusable button.
- Normal desktop use: PASS OWNER_BROWSER_OBSERVED.
- Console red errors: 0 OWNER_BROWSER_OBSERVED.
- 768×1024 and exact 1440×900: STATIC_COMPONENT_VALIDATED only.
- A current curl re-probe could not reach the Owner's external process, and sandbox server binding failed with `EPERM`; therefore no new runtime label was added.

### Source/static UI evidence

- Minimum interactive target contract approximately 44 px.
- Visible `:focus-visible` treatment, skip link, Vietnamese language declaration, semantic fieldsets/legends, alerts/status messages, and accessible visual captions/titles are present.
- Preview grade picker, cards, action groups, long Vietnamese text, math/visual containers, safe-area padding, and reduced-motion rules have responsive contracts.
- Client-side preview practice uses differentiated text/icon feedback, not color alone.
- No automated contrast/aXe/browser keyboard pass was performed in this audit.
- Nested `<main>` landmarks and a duplicate `main-content` ID remain in specific routes, creating a MEDIUM landmark-navigation issue.

## 12. Performance and architecture

- The landing route does not import the large curriculum registry.
- `/curriculum-preview` imports curriculum content on the server, filters to one grade/unit, and sends only the selected unit's 12 public questions to the client.
- Solutions are not included in initial client props; one solution is returned only after a validated submit to `/api/curriculum-preview/check`.
- No Grade 1–9 solution content, generator fingerprint, or registry marker was found in inspected client chunks.
- The preview-specific client chunk was small in the inspected build; there is no evidence that all 2,052 questions/solutions are hydrated.
- Server curriculum modules are large generated sources (roughly 676 KB combined in the inspected set), but no measured runtime regression or O(n²) hot path was demonstrated.
- Typed API/contracts and tests are strong. Generated curriculum code is maintainable through validators, though generic templates concentrate pedagogical behavior in large engine modules.
- `.next` at roughly 3.6 GB is a local generated artifact, not an application payload; exclude it from any archive.

## 13. Quality gates

All commands were run sequentially. The full suite explicitly used `--test-concurrency=1`.

| Gate | Exact result | Duration | Notes |
|---|---:|---:|---|
| Source/provenance validator | PASS, 546 outcomes, 0 gaps | 0.39 s | Node module-type warning |
| Taxonomy validator | 3/3 PASS | 0.19 s | 37/37 applicable domains |
| Official inventory validator | PASS, 546/546, 171 units, 2,052 mapped questions | 0.31 s | — |
| Curriculum 1–9 validator | PASS, 9 grades/171/2,052 | 0.31 s | — |
| Curriculum/API tests | 9/9 PASS | 0.65 s | Includes solution boundary |
| Teaching semantic tests | 92/92 PASS | 5.10 s | Internal automated semantics, not expert review |
| Grade 1 regression | 550/550 PASS | 0.52 s | — |
| Grade 1 production validator | PASS, 13/312/312 | 1.57 s | — |
| Frozen Grade 2 tests | 7/7 PASS | 0.26 s | — |
| Frozen Grade 2 validator | PASS, 24, DRAFT/HIDDEN | 0.22 s | — |
| Adaptive/API tests | 61/61 PASS | 0.71 s | Static/mocked DB contracts |
| Registration/auth tests | 5/5 PASS | 0.18 s | Live provider not exercised |
| Security/solution/operations tests | 52/52 PASS | 8.52 s | Local PostgreSQL integration remains pending |
| Full sequential suite | **779/779 PASS**, 0 fail, 0 skip | 12.95 s | concurrency 1; no retry |
| Lint | PASS | 7.55 s | — |
| Typecheck | PASS | 5.86 s | — |
| Production build | PASS | 11.39 s | Compile 3.3 s; type step 6.1 s |
| Adaptive runtime draft validator | PASS; flags all false, HIDDEN | 0.13 s | Remote state not asserted |
| Controlled pilot validator | PASS; DENY_ALL/flags false | <0.1 s | 0037 hash matches |
| Grade 1 completion migration validator | PASS | <0.1 s | Read-only parent aggregate |
| Migration SHA-256 | PASS | 0.03 s | Locale warning only |
| Local secret/PII scans | PASS; no credential value found | Static | Dependency network audit NOT_RUN |

Repeated non-failing warnings: Node experimental type stripping and `MODULE_TYPELESS_PACKAGE_JSON`; one locale warning from `shasum`. No flaky retry was observed.

## 14. Documentation and submission audit

A recipient can use `package.json` and `docs/operations/FINAL_LOCAL_DEMO_RUNBOOK.md` to install, build, start, and locate the preview. However, the root has no README, `.env.example` is incomplete for optional features/operations, package identity still says PROJECT003, and old architecture/scope/operations documents contradict current capability/counts. Absolute machine-specific paths appear in operations documents.

The canonical local demo steps are:

```bash
cd /Users/hatrung/Desktop/PLAVE-PROJECT004
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:3000/curriculum-preview
```

No deployment, publication, activation, packaging, remote mutation, or SQL was performed.

## 15. Findings

### BLOCKER: 0

### HIGH: 0

### MEDIUM: 5

#### AUD-M01 — Duplicate/nested main landmarks

- **Evidence:** the root layout already supplies `<main id="main-content">`; curriculum preview supplies another `main-content`, and diagnostic/loading views add nested `<main>` elements.
- **Paths:** `app/layout.tsx`; `app/curriculum-preview/page.tsx`; `app/diagnostic/page.tsx`; `app/diagnostic/[attemptId]/page.tsx`; `app/diagnostic/[attemptId]/review/page.tsx`; `app/assignments/[assignmentId]/loading.tsx`; `app/teacher/classes/[classroomId]/gradebook/loading.tsx`; `app/teacher/assignments/[assignmentId]/analysis/loading.tsx`.
- **Impact:** landmark navigation and skip-link targeting can be ambiguous for screen-reader and keyboard users.
- **Recommendation:** keep one page-level `main`/`main-content`; convert nested containers to `section`/`div` with appropriate headings.
- **Confidence:** high.
- **Safe to fix locally:** yes, with semantic/component tests.

#### AUD-M02 — New-recipient setup documentation is not canonical

- **Evidence:** no root `README.md`; package name/description still reference PROJECT003/Grade 1; `docs/ARCHITECTURE.md` describes an earlier no-code baseline; `docs/PRODUCT_SCOPE.md` mixes historical and current scope.
- **Paths:** missing `README.md`; `package.json`; `docs/ARCHITECTURE.md`; `docs/PRODUCT_SCOPE.md`; `docs/operations/FINAL_LOCAL_DEMO_RUNBOOK.md`.
- **Impact:** a recipient may select stale instructions or misunderstand what is production, local draft, or disabled.
- **Recommendation:** add one current root README and mark historical documents clearly; align package metadata without changing runtime behavior.
- **Confidence:** high.
- **Safe to fix locally:** yes, documentation-only.

#### AUD-M03 — Migration status wording is contradictory

- **Evidence:** the remote operation ledger records controlled application/verification, while validator/historical documents include “NOT APPLIED” language without always making the static-validator scope prominent.
- **Paths:** `scripts/validate-grade2-release-candidate.ts`; `docs/operations/REMOTE_DEV_OPERATION_LEDGER.md`; `docs/architecture/ADAPTIVE_MIGRATION_STATE_EVIDENCE.md`; `docs/architecture/ADAPTIVE_DATABASE_CONTRACT.md`.
- **Impact:** an operator could infer the wrong remote state or attempt an unsafe rerun.
- **Recommendation:** make every status line explicit: “not applied by this command/current audit” versus “previously applied per ledger; current remote state unverified.”
- **Confidence:** high.
- **Safe to fix locally:** yes, wording/tests only; do not execute SQL.

#### AUD-M04 — Secondary draft content has uneven grade differentiation

- **Evidence:** sampled Grade 7/9 data questions include elementary two-group totals/comparisons and basic relative frequency; common engine templates and long official-outcome-derived titles are heavily reused.
- **Paths:** `lib/curriculum/engine.ts`; `lib/curriculum/secondary-completion.ts`; sampled units `grade-7-data-and-probability` and `grade-9-data-and-probability`.
- **Impact:** technically correct coverage may feel repetitive or easier than the nominal secondary grade, weakening teaching quality.
- **Recommendation:** conduct educator review, then enrich context, reasoning depth, distractors, and worked examples while preserving outcome mappings and solution separation.
- **Confidence:** medium-high.
- **Safe to fix locally:** yes only after content-review approval and full validators; not before submission unless a correctness defect is found.

#### AUD-M05 — Authentication abuse controls depend on external configuration

- **Evidence:** no application-level throttle was found for login, registration, or password-reset requests; current protection assumes Supabase/provider limits.
- **Paths:** authentication form/actions under `app/login`, `app/register`, `app/forgot-password`, and Supabase auth helpers under `lib/`.
- **Impact:** a production deployment could be exposed to credential stuffing, signup abuse, or reset-email abuse if provider/deployment limits are insufficient.
- **Recommendation:** document required Supabase rate limits and add server/edge throttling before production exposure.
- **Confidence:** medium.
- **Safe to fix locally:** yes for documentation/tests; runtime enforcement needs deployment-aware design.

### LOW: 3

#### AUD-L01 — Generated directories are very large

- **Evidence:** `.next` is approximately 3.6 GB and `node_modules` approximately 446 MB; both are gitignored.
- **Paths:** `.next/`, `node_modules/`, `.gitignore`.
- **Impact:** accidental manual archiving would make a submission unnecessarily large.
- **Recommendation:** exclude generated/dependency directories from any archive and regenerate locally.
- **Confidence:** high.
- **Safe to fix locally:** no application fix required.

#### AUD-L02 — Node module-type warnings and stale dependency residue

- **Evidence:** validators repeatedly emit `MODULE_TYPELESS_PACKAGE_JSON`; `npm ls --depth=0` reports two extraneous image-runtime packages.
- **Paths:** `package.json`, `node_modules/`.
- **Impact:** noisy CI output and minor dependency hygiene cost.
- **Recommendation:** choose an explicit module strategy and perform a separately authorized clean dependency install.
- **Confidence:** high.
- **Safe to fix locally:** yes, but not during a read-only audit.

#### AUD-L03 — Security response headers are minimal

- **Evidence:** `next.config.ts` disables `X-Powered-By` but does not define a CSP or a broader response-header policy.
- **Path:** `next.config.ts`.
- **Impact:** reduced defense in depth for a future public deployment.
- **Recommendation:** add and test deployment-compatible CSP, framing, referrer, and permissions policies before production.
- **Confidence:** high.
- **Safe to fix locally:** yes, after testing auth redirects/assets.

## 16. Product completeness summary

| Area | Readiness |
|---|---|
| Landing/public demo | READY for local demo |
| Authentication | IMPLEMENTED; live provider journey unverified |
| Student Grade 1 | IMPLEMENTED and heavily tested; live persistence unverified |
| Curriculum 1–9 | READY as local draft demo; not publication |
| Fixed practice | COMPLETE implementation |
| Diagnostic | COMPLETE implementation; environment-blocked runtime |
| Adaptive | DRAFT/HIDDEN/DISABLED_BY_FLAG |
| Parent | COMPLETE implementation; environment-blocked runtime |
| Teacher | COMPLETE implementation; environment-blocked runtime |
| Security | Strong static boundary; no remote/live penetration or network dependency audit |
| Accessibility | Good source contracts; one MEDIUM landmark defect; no aXe/contrast run |
| Responsive | Owner 360/mobile and normal desktop PASS; tablet/exact desktop static only |
| Performance | Solution/data boundaries pass; no measured load-test |
| Database | Strong local contracts; remote state only previously evidenced |
| Deployment | NOT_RUN and not authorized |
| Documentation | Sufficient via runbook, but not canonical for a new recipient |

## 17. Top 10 improvements by impact/effort

1. Remove nested/duplicate main landmarks — high accessibility value, low effort.
2. Add a current root README and point all recipients to one canonical runbook — high handoff value, low effort.
3. Clarify migration status language across validators and ledgers — high operational safety, low effort.
4. Add explicit application/provider authentication rate-limit requirements — high production security value, medium effort.
5. Perform an educator-led Grade 7–9 content review and deepen generic statistics/algebra contexts — high learning value, medium/high effort.
6. Add custom global not-found/error/loading states with recovery actions — medium UX value, medium effort.
7. Run authenticated student/parent/teacher journeys against an approved disposable environment — high confidence value, medium effort.
8. Add automated accessibility checks plus manual keyboard/screen-reader/contrast verification — medium confidence value, medium effort.
9. Add deployment-compatible CSP and security headers — medium security value, medium effort.
10. Align package identity and clean dependency/module warnings — low risk, low effort.

## 18. Do not do before submission

- Do not activate adaptive or the frozen Grade 2 candidate.
- Do not publish the Grades 1–9 local draft registry.
- Do not change migrations 0035–0037 or rerun them based on stale wording.
- Do not weaken auth/RLS or expose private solution registries/tables.
- Do not bundle `.next`, `node_modules`, credentials, local environment files, or operational backups.
- Do not claim automated validation or this audit is expert pedagogical endorsement.
- Do not make broad curriculum rewrites without preserving the validated 546/546 mapping and rerunning all gates.

## 19. Documents for Owner review

1. `docs/operations/PLAVE_PROJECT004_COMPLETE_AUDIT.md`
2. `docs/operations/PLAVE_PROJECT004_COMPLETE_AUDIT.json`
3. `docs/operations/PLAVE_PRODUCT_COMPLETENESS_MATRIX.md`
4. `docs/operations/PLAVE_IMPROVEMENT_BACKLOG.md`
5. `docs/operations/FINAL_LOCAL_DEMO_RUNBOOK.md`
6. `docs/operations/FINAL_SUBMISSION_STATUS.json`
7. `docs/operations/REMOTE_DEV_OPERATION_LEDGER.md`
