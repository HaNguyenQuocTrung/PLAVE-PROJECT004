# PROJECT_REAUDIT_FAIL — CRITICAL/HIGH FINDINGS REQUIRE REMEDIATION

Audit completed: 2026-08-02 (Asia/Ho_Chi_Minh)  
Scope: complete PLAVE user/developer re-audit, read-only except for this report and its audit artifacts  
Findings: **1 CRITICAL · 5 HIGH · 6 MEDIUM · 3 LOW**

## 1. Executive conclusion

PLAVE has a substantial working local product: public/auth pages, Student static
practice, Parent and Teacher journeys, a local authenticated AI Tutor, and an
explicit 546-outcome Generator V2 registry. Typecheck, lint process, production
build, a fresh 42-migration database proof, representative RLS/CAS/idempotency,
and most regression suites pass.

The project does **not** pass this re-audit. The configured Google API key is
recoverable from 16 mode-0644 Turbopack development-cache files. Generator V2 is
not connected to the real Student practice runtime, its approved review package
contains ambiguous or interaction-mismatched questions, and its “independent”
32,760-sample evidence reuses solver/self-consistency paths. The approved
implementation is also largely absent from repository HEAD. The canonical
sitewide launcher cannot compile under its owner-local TypeScript config, and
the fresh AI Tutor browser gate fails its touch-target contract.

No Owner decision or milestone field was changed. The evidence warrants Owner
review of whether Milestone 2 should be reopened; this audit does not reopen it.

## 2. User-perspective verdict

Verdict: **FAIL**.

Confirmed usable in a disposable diagnostic runtime:

- Landing, login, registration role selection, forgot-password form, legal and
  error pages render coherently.
- Student dashboard, Grade 1 lesson catalog/detail, static practice,
  correct/incorrect flow, completion, results/history, goals, settings and
  collaboration surfaces work in representative journeys.
- Parent consent/linking and linked-student reporting enforce ownership in the
  inspected server/RLS contracts.
- Teacher dashboard, question workshop, classroom, gradebook and assignment
  surfaces work in representative journeys.
- Required layout widths 320, 390, 768, 1280 and 1440 were exercised; the
  diagnostic run reported zero console, hydration and horizontal-overflow
  errors.

User-impacting reasons for failure:

- Real Students cannot enter the 546-outcome Generator V2 from normal lessons
  or practice.
- Multiple approved Generator prompts are incomplete or semantically
  ambiguous, even though hidden validation accepts one answer.
- Fresh AI Tutor browser acceptance stops at a primary-control touch-target
  failure.
- Error copy can tell a user to contact PLAVE, but no support/contact route is
  provided.
- The mobile lesson catalog is usable but visually dense for young learners.

## 3. Developer-perspective verdict

Verdict: **FAIL**.

The domain code shows good fail-closed instincts: explicit outcome maps, typed
roles, server-side role checks, no-store Tutor streaming, process-local Tutor
limits, deterministic Generator seeds, migration-backed provenance, CAS and RLS.
However, maintainability and evidence integrity are not adequate for the claims
currently recorded:

- A clean checkout of HEAD cannot reproduce the approved implementation.
- Static curriculum, adaptive, on-demand, generated-pilot, V1 and V2 practice
  pipelines coexist with different flags and selection policies.
- The 32,760 audit is strong self-consistency evidence but not an independent
  mathematical oracle.
- Canonical browser commands are stale/broken while structural suites still
  pass.
- Architecture/status artifacts disagree, and the full-audit writer can reset
  post-approval lifecycle fields.
- There is no repository README or CI workflow, and core test/source files are
  unusually large.

## 4. Verified milestone statuses

| Milestone | Recorded active status | Independent assessment | Audit mutation |
|---|---|---|---|
| 1 | `COMPLETE_OWNER_APPROVED` | Core UI works under a diagnostic runtime; canonical owner-local sitewide launcher currently fails | None |
| 2 | `COMPLETE_OWNER_APPROVED` | 546 mappings/198 capabilities confirmed, but Student integration and product/validation claims are disproved | None |
| 3 | `COMPLETE_OWNER_APPROVED_LOCAL_MVP` | Local Student-only scope confirmed; fresh browser gate fails and real-provider browser was not rerun | None |

Owner evidence remains `APPROVED`, `reviewedCount=198`,
`perSampleDecisionDataAvailable=false`. No individual votes were invented.

Active-source inconsistencies include:

- `docs/architecture/PLAVE_GENERATOR_V2.md` still states 107/546 and a local
  vertical slice.
- AI Tutor architecture/status artifacts retain Milestone 2
  `IN_PROGRESS_RESUMED`.
- the full-coverage browser artifact retains
  `IN_PROGRESS_AWAITING_OWNER_REVIEW`;
- rerunning the full-coverage writer on an isolated copy generates an awaiting
  review/null-owner lifecycle rather than preserving approval.

Historical wave documents that clearly describe their then-current state were
treated as history, not active status.

## 5. Route and role coverage

Inventory: 55 page routes, 56 API routes, one auth callback route, 42 migrations.
The production build generated 77 route units.

Representative access summary:

| Surface | Anonymous | Student | Parent | Teacher |
|---|---|---|---|---|
| Public/legal | Allow | Allow | Allow | Allow |
| Student lessons/static practice | Login redirect | Allow | Deny/role route | Deny/role route |
| Generator V2 proof | Deny | Dev-loopback proof only | Deny | Deny |
| Generator V2 real practice | Unavailable | **Unavailable** | Unavailable | Unavailable |
| AI Tutor | Login redirect | Local-enabled process only | Deny | Deny |
| Parent child detail | Login redirect | Deny | Own accepted link only | Deny |
| Teacher workshop/classroom | Deny | Deny | Deny | Verified/owned resources only |
| Profile/settings | Login redirect | Own | Own | Own |

No auth bypass, IDOR, role escalation, or cross-role private-answer leak was
found in the representative direct API/RLS checks. Not every API was invoked by
all four roles; critical routes were combined with server authorization and RLS
inspection. See `artifacts/complete-project-reaudit/role-access-matrix.json`.

## 6. Core journey results

| Journey | Result | Evidence/limit |
|---|---|---|
| Public landing/navigation/legal | Diagnostic PASS | Clear CTAs; no support route |
| Login/register/forgot password | Diagnostic PASS | No live email mutation or delivery test |
| Reset/recovery | PARTIAL | Server/page contracts inspected; external expired-link and email delivery not run |
| Student static lesson/practice | Diagnostic PASS | Start, submit, next, refresh, completion, result/history |
| Grades 1–9 navigation | PASS by registry/tests; Grade 1/7 browser sampled | No browser journey for every grade |
| Generator V2 Student journey | **FAIL** | Internal proof surface only |
| Generator V2 proof journey | Technical PASS | 198 capabilities; not the real product route |
| Parent | Diagnostic PASS | Empty, link consent and linked detail represented |
| Teacher | Diagnostic PASS after temporary locator narrowing | Canonical harness locator fails strict mode |
| AI Tutor | Unit/runtime PASS; browser FAIL | Touch-target failure before fresh full matrix |
| Account/settings | Diagnostic PASS | Session/logout/reset UI present |

## 7. Generator V2 findings

### Registry and execution facts

- Canonical outcome IDs: 546 unique.
- Explicit mappings: 546/546.
- Canonical capabilities: 198.
- Missing/duplicates/conflicts/synthetic coverage: none reported.
- Generic fallback and keyword routing: zero.
- Unknown outcome: `GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED`.
- Fresh isolated full command: 32,760/32,760, exact duplicate maximum 0,
  near-duplicate maximum 0.1157894737 at threshold 0.12.
- Fresh disposable runtime: migrations 42/42, capabilities 198/198, 2,388
  generated questions persisted, provenance 8/8, CAS/idempotency/RLS/rollback
  and cleanup PASS.

### What those facts do not prove

The audit invokes `generateQuestion`, `verifyQuestionIntegrity` and generated
`question.validation`; several Wave C–F validators call the same `solveModel`
implementation used by generation. Near-duplicate measurement normalizes
numbers in prompt text, not full mathematical/visual structures. Therefore the
result proves deterministic registry self-consistency, not independent
mathematical correctness or usefulness.

### Product-invalid representative samples

Examples reproduced from the approved public-only owner manifest:

- `MOET2018-G2-NUM-P024-002`: sequence prompt omits the required term/index and
  sequence evidence.
- `MOET2018-G7-NAA-P056-005`: asks for a reduced fraction but uses
  `DECIMAL_INPUT`; direction/sign is unclear.
- `MOET2018-G8-NAA-P064-018`: integer function evaluation uses
  `FRACTION_INPUT`.
- `MOET2018-G8-NAA-P064-016`: gives two rational expressions without naming the
  operation.
- `MOET2018-G1-GEO-P023-008`: omits unit names and conversion direction and
  conflicts with integer input.
- `MOET2018-G2-GEO-P027-011`: omits the required measurement operation/units.
- `MOET2018-G5-GEO-P043-002`: does not distinguish total versus lateral surface
  area.
- `MOET2018-G9-GEO-P074-008`: asks for sine without identifying the acute
  angle.
- `MOET2018-G6-NAA-P050-044`: gives a quantity change without specifying
  increase or decrease.

The manually reviewed proof screenshots also expose boilerplate such as
“Phân tích yêu cầu tại tủ đồ dùng” and “Xác minh nghiệm trong sân trường”. The
internal completion surface says the attempt completed in a disposable
database; this is appropriate only for a proof route, not a Student product.

## 8. AI Tutor findings

Confirmed:

- Authenticated Student-only route; anonymous/Parent/Teacher fail closed.
- Repository and remote-development defaults remain OFF.
- Google and OpenAI adapters exist; DeepSeek is not implemented.
- Incremental deltas, Stop/abort, retry, regenerate, continue after truncation,
  finish-reason, `MAX_TOKENS`, timeout, safety, empty and interrupted states have
  deterministic coverage.
- No provider key was found in static client/production bundles or public audit
  artifacts.
- Unit/security 25/25, quality 6/6 and local-runtime 9/9 pass.

Current limitations:

- Fresh browser acceptance fails
  `DESKTOP_WELCOME_PRIMARY_TOUCH_TARGET_SMALL`.
- Conversation state is client/process memory and does not survive refresh or
  process restart.
- Rate/daily/concurrency maps reset per process and are not multi-instance safe.
- Current configured model is `gemini-3.6-flash`; this audit made zero paid
  requests. Prior bounded evidence from 2026-08-01 reports 2/2 reviewed direct
  responses with median first token 1,172 ms and total 2,252 ms, but that is not
  a fresh real-provider browser result.
- The reviewed deterministic response is visually clean but generic for the
  requested fraction skill; it is not real-provider quality evidence.

## 9. Database and security findings

The fresh disposable stack successfully applied schema 0001–0042. Representative
authenticated persistence proved no regeneration on resume, concurrent start,
correct/incorrect submit, revision conflict, duplicate-submit idempotency,
exactly-once progress/history, rollback, completion, RLS role isolation,
provenance 8/8, zero orphans, zero pre-submit private leaks and cleanup.

The critical security failure is outside the database: the exact configured
Google API key appears in 16 `.next/dev/cache/turbopack/<VERSION>/*.sst` files,
all mode 0644, totaling 239,401,257 bytes. It was not found in client static
chunks, production server bundles, docs, artifacts, public files or
`.local-artifacts`. The value is deliberately omitted from all audit output.

No actual `SECURITY DEFINER` function without an explicit search-path contract
was found in the inspected migration/function inventory. No destructive or
remote exploit was performed.

## 10. Test-evidence quality

The repository contains 96 TypeScript test files and 1,266 declared test calls.
Sixty-four files read source directly, 18 invoke child processes, one uses
`fetch`, one mentions Playwright, 39 reference DB/SQL, and 15 assert artifacts.

Classification:

- **PRODUCT_EVIDENCE:** bounded manual prompt review; on-demand pedagogy; the 34
  screenshots explicitly opened in this audit.
- **RUNTIME_EVIDENCE:** fresh disposable Generator database/browser proof;
  diagnostic sitewide Playwright; AI Tutor local runtime tests.
- **STRUCTURAL_EVIDENCE:** most UI/Practice/curriculum/security tests and
  registry checks.
- **REGRESSION_ONLY:** owner-review lifecycle, quality/state-machine and many
  source contract tests.
- **WEAK_OR_MISLEADING:** owner-local-demo structural PASS despite canonical
  runtime compile failure; automatic `screenshotsOpenedAtOriginalResolution`
  claim written by a script with no visual-inspection capability; masked
  feedback screenshot treated as visual review.

Fresh failures are valuable: owner-review tests are stale after approval,
identity tests find live PROJECT003 references, sitewide canonical runtime fails
TypeScript alias resolution and the Tutor browser gate catches a touch target.

## 11. Performance and reliability

Local-only measurements—not production claims:

| Measurement | Result |
|---|---:|
| Typecheck | 20.64 s |
| Production build | 28.80 s |
| Full 32,760 Generator audit | 5.26 s |
| Uncompressed client JS chunks | 1,319,673 bytes |
| Largest uncompressed client chunk | 227,315 bytes |
| Sitewide diagnostic console/hydration/overflow | 0 / 0 / 0 |

The sitewide runtime emitted an LCP warning for the header logo. The full
authenticated Generator proof is long-running and persistence-heavy but cleaned
up successfully. No production concurrency, N+1 query load, network topology,
multi-instance memory, or cold deployment was measured.

## 12. Findings by severity

### F-001 — CRITICAL — BOTH — Secret boundary

- **Evidence:** exact current Google key in 16 mode-0644 Turbopack `.sst` cache
  files; no value printed.
- **Reproduction:** load `.env.local`, run the local Tutor/Next dev process, then
  byte-scan `.next/dev/cache/turbopack` for the configured key.
- **Expected:** server-only secrets never persist in diagnostics/cache/artifacts.
- **Actual:** 239,401,257 aggregate matching cache bytes remain at rest.
- **Impact:** credential recovery by local readers, backup or artifact tooling.
- **Likely root cause:** Turbopack development cache serializes server module/env
  state while the launcher uses a persistent default dist/cache directory.
- **Recommended fix:** isolate or disable sensitive dev cache, purge affected
  cache safely, and use the Owner-controlled key-rotation procedure.
- **Confidence:** High. **Previously known:** No.

### F-002 — HIGH — BOTH — Generator runtime integration

- **Evidence:** V2 calls exist only in internal proof/review routes; Student
  curriculum RPC is static and on-demand routes use the older generator.
- **Reproduction:** trace `/lessons` → practice start API and search runtime
  imports of `generateQuestion`.
- **Expected:** supported Student outcomes select `GENERATED_V2` explicitly.
- **Actual:** no real Student V2 entry point exists.
- **Impact:** approved 546-outcome usefulness is not delivered to Students.
- **Likely root cause:** proof/runtime integration was never promoted from the
  internal loopback surface.
- **Recommended fix:** reopen integration review, define explicit Student
  selection/rollback policy, and browser-test real routes.
- **Confidence:** High. **Previously known:** Yes in architecture, contradicted
  by roadmap completion language.

### F-003 — HIGH — USER — Generator product contracts

- **Evidence:** nine exact outcome examples listed in section 7.
- **Reproduction:** open the owner manifest samples or generate their documented
  seed/difficulty and read only the public prompt/interaction.
- **Expected:** prompt supplies every datum and names the requested operation;
  interaction matches answer type.
- **Actual:** prompts omit term, unit, operation, direction or angle, and some
  interactions mismatch the requested answer.
- **Impact:** ambiguous grading and misleading feedback.
- **Likely root cause:** validators prove hidden-model consistency but do not
  independently parse student-facing linguistic completeness.
- **Recommended fix:** add capability-family public-contract oracles and recheck
  all affected mappings/seeds.
- **Confidence:** High. **Previously known:** No.

### F-004 — HIGH — DEVELOPER — Reproducibility

- **Evidence:** 83 tracked files modified; Generator/Tutor/migration 0042 and
  associated tests/docs/artifacts largely untracked at HEAD.
- **Reproduction:** compare `git ls-files` and `git status --short` with active
  milestone implementation paths.
- **Expected:** approved product can be recreated from the recorded commit.
- **Actual:** a clean checkout lacks the implementation.
- **Impact:** unreproducible build, loss risk and unsafe handoff.
- **Likely root cause:** milestones completed entirely in an uncommitted
  workspace.
- **Recommended fix:** after remediation/review, establish a controlled tracked
  checkpoint; no Git mutation was performed by this audit.
- **Confidence:** High. **Previously known:** No.

### F-005 — HIGH — DEVELOPER — Validation independence

- **Evidence:** reused `solveModel`, trusted `question.validation`, prompt-text
  near-duplicate metric.
- **Reproduction:** trace full-audit → generate → integrity/validator calls in
  Waves C–F.
- **Expected:** independent mathematical oracle and structural semantic
  diversity checks.
- **Actual:** circular/self-consistency dominates key gates.
- **Impact:** large PASS totals can miss product-invalid contracts.
- **Likely root cause:** one domain model is shared for speed and completeness.
- **Recommended fix:** independent family oracles, public-prompt parsers,
  mutation tests and normalized-model/visual fingerprints.
- **Confidence:** High. **Previously known:** No.

### F-006 — HIGH — DEVELOPER — Canonical local runtime

- **Evidence:** owner-local flag selects a tsconfig without base extension or
  `@/*` aliases; Next emits module-not-found and readiness times out.
- **Reproduction:** start the canonical sitewide/owner-local browser command.
- **Expected:** one-command loopback owner runtime compiles.
- **Actual:** it does not reach HTTP readiness.
- **Impact:** canonical owner and acceptance operation is broken.
- **Likely root cause:** `tsconfig.owner-local.json` drifted from base config.
- **Recommended fix:** restore a shared config contract and add a true compile
  smoke test for every distDir/runtime mode.
- **Confidence:** High. **Previously known:** No.

### F-007 — MEDIUM — BOTH — Tutor accessibility

- **Evidence:** fresh canonical Tutor Playwright fails
  `DESKTOP_WELCOME_PRIMARY_TOUCH_TARGET_SMALL`.
- **Reproduction:** run `npm run --silent acceptance:ai-tutor-local` with local
  Chrome/Supabase.
- **Expected:** every visible primary control is at least 44×44.
- **Actual:** at least one welcome-state primary control is smaller.
- **Impact:** reduced usability and incomplete current browser certification.
- **Likely root cause:** compact text/icon button sizing.
- **Recommended fix:** identify the reported element, enlarge its hit area and
  rerun all Tutor viewports.
- **Confidence:** High. **Previously known:** No.

### F-008 — MEDIUM — DEVELOPER — Browser locator drift

- **Evidence:** `getByRole(heading, {name: 'Lớp Toán V2'})` matches h2 and h3.
- **Reproduction:** continue sitewide Teacher flow after class creation.
- **Expected:** stable unique semantic locator.
- **Actual:** strict-mode violation aborts the journey.
- **Impact:** canonical browser evidence stops before completion.
- **Likely root cause:** UI gained a second legitimate class-name heading while
  the harness stayed broad.
- **Recommended fix:** scope by region or level/testable semantic target.
- **Confidence:** High. **Previously known:** No.

### F-009 — MEDIUM — DEVELOPER — Status source of truth

- **Evidence:** active architecture/artifact statuses disagree; the full-audit
  writer produces a pre-approval lifecycle.
- **Reproduction:** search active docs/artifacts and run the audit on an isolated
  copy.
- **Expected:** one active status contract; audit must not downgrade decisions.
- **Actual:** multiple active states and destructive semantic output.
- **Impact:** operational confusion and evidence corruption risk.
- **Likely root cause:** sprint-specific writers were not made lifecycle-aware.
- **Recommended fix:** immutable technical report + separate decision artifact,
  schema consistency check and clearly historical docs.
- **Confidence:** High. **Previously known:** Partly.

### F-010 — MEDIUM — DEVELOPER — Evidence quality

- **Evidence:** 64/96 tests read source; browser/visual claims can be written
  without browser/human inspection; masked feedback image.
- **Reproduction:** inventory test imports and inspect sitewide report writer.
- **Expected:** PASS labels state whether evidence is structural, runtime or
  product-reviewed.
- **Actual:** structural and self-attested claims are often presented as product
  acceptance.
- **Impact:** false confidence and delayed discovery of runtime/product bugs.
- **Likely root cause:** status-marker-oriented sprint tests.
- **Recommended fix:** evidence taxonomy in CI, no self-asserted human-review
  fields, authenticated browser/database tests for core claims.
- **Confidence:** High. **Previously known:** No.

### F-011 — MEDIUM — USER — Support UX

- **Evidence:** no support/contact route among 55 pages; error text references
  contacting PLAVE.
- **Reproduction:** use invitation/onboarding recovery text, then inspect
  navigation/footer.
- **Expected:** actionable help destination.
- **Actual:** none.
- **Impact:** blocked users cannot escalate.
- **Likely root cause:** support operations remain out of product scope.
- **Recommended fix:** privacy-safe support route/contact contract.
- **Confidence:** Medium. **Previously known:** No.

### F-012 — MEDIUM — DEVELOPER — Architecture maintainability

- **Evidence:** six practice/generation paths, fragmented flags, no README/CI,
  several >1,000-line files and a 13,797-line regression file.
- **Reproduction:** inventory routes/imports/scripts/file sizes.
- **Expected:** documented ownership and one explicit runtime selection policy.
- **Actual:** overlapping pipelines and weak onboarding.
- **Impact:** high change risk and hidden coupling.
- **Likely root cause:** milestone-by-milestone accretion.
- **Recommended fix:** architecture decision record, pipeline deprecation map,
  CI and smaller family-focused modules/tests.
- **Confidence:** High. **Previously known:** Yes in part.

### F-013 — LOW — DEVELOPER — Warning noise

- **Evidence:** one lint warning and repeated module-type reparsing warnings.
- **Reproduction:** lint and Node TypeScript test commands.
- **Expected:** warning-free gates.
- **Actual:** warnings remain.
- **Impact:** lower signal-to-noise.
- **Likely root cause:** unused `_args` and missing package module declaration.
- **Recommended fix:** align lint/code and module packaging deliberately.
- **Confidence:** High. **Previously known:** No.

### F-014 — LOW — BOTH — LCP hint

- **Evidence:** Next warns the above-fold PLAVE header logo should load eagerly.
- **Reproduction:** start the sitewide diagnostic runtime and load the first
  page.
- **Expected:** above-fold brand image prioritized.
- **Actual:** default loading triggers warning.
- **Impact:** possible avoidable LCP delay.
- **Likely root cause:** image priority/loading prop omitted.
- **Recommended fix:** measure and mark eager/priority only if confirmed.
- **Confidence:** Medium. **Previously known:** No.

### F-015 — LOW — USER — Mobile density

- **Evidence:** reviewed 390px Grade 1 lessons screenshot.
- **Reproduction:** open `/lessons` on 390×844 with a Grade 1 Student.
- **Expected:** age-appropriate, easily scannable lesson selection.
- **Actual:** many similar cards and small secondary copy in a long page.
- **Impact:** scanning fatigue; no core blockage.
- **Likely root cause:** desktop information model stacked directly on mobile.
- **Recommended fix:** progressive disclosure/filtering and larger essential
  status text.
- **Confidence:** Medium. **Previously known:** No.

## 13. Claims confirmed

1. 546 unique explicit outcome mappings and 198 capability IDs exist.
2. Unknown outcomes fail closed; generic fallback/keyword mapping are absent in
   outcome routing.
3. The bounded full command visits all 546×3×20 cases.
4. Schema 0001–0042, provenance 8/8, immutable resume, CAS, idempotency,
   exactly-once progress/history, RLS and cleanup work in fresh proof.
5. AI Tutor is local Student-only and remote-default OFF.
6. Tutor provider keys do not enter client/production bundles.
7. Typecheck, build and broad regression suites generally work.

## 14. Claims disproved

1. Generator V2 is available in normal Student practice.
2. All 32,760 questions are independently mathematically validated.
3. Every approved representative Generator contract is unambiguous/useful.
4. Canonical sitewide and Tutor browser acceptance currently pass.
5. Active milestone architecture/artifacts are status-consistent.
6. Lint is zero-warning.

## 15. Claims not independently verifiable

- Current real-Google browser streaming/latency/completeness.
- Live reset/email verification delivery and provider-side auth behavior.
- Dependency vulnerability status today (`npm audit` was DNS/policy blocked).
- Production security/performance, deployment, remote activation, monitoring,
  cost controls and multi-instance rate limiting.

## 16. Technical debt

- Untracked milestone implementation and no reproducible commit checkpoint.
- Competing practice/generation pipelines and many feature flags.
- Status/report writers coupled to pre-approval lifecycle.
- Giant regression/source files and repeated domain utilities.
- Structural test dominance and weak test-evidence labels.
- Process-local Tutor state/rate limiting.
- Missing README, CI and support operations contract.

## 17. Recommended remediation order

1. Contain/purge the dev-cache credential and rotate it through the Owner
   procedure.
2. Ask Owner whether F-002/F-003/F-005 reopen Milestone 2.
3. Fix public Generator contracts and add independent mathematical/semantic
   oracles.
4. Connect V2 to a real Student route behind explicit safe rollout/rollback.
5. Establish a reproducible tracked checkpoint.
6. Repair owner-local/sitewide and Tutor browser gates.
7. Reconcile lifecycle artifacts and make technical audits decision-preserving.
8. Add CI/README/support and simplify/deprecate competing pipelines.

## 18. Remaining operational/deployment gaps

- No deployment or remote activation proof.
- AI Tutor remains a local MVP; conversation persistence, production limits,
  monitoring and cost controls are absent.
- Generator V2 repository default remains OFF and Student integration absent.
- `npm audit`: `UNVERIFIED_ENVIRONMENT_BLOCKED`; exact error was DNS
  `ENOTFOUND registry.npmjs.org`, and escalation was not permitted. Last
  recorded evidence is zero vulnerabilities on 2026-08-01; this audit does not
  call that a current PASS.
- No production health-check/rollback rehearsal or CI workflow.

## 19. Exact commands and results

| Command | Result |
|---|---|
| `git status --short`, `git diff --check`, `git log`, `git remote -v` | read-only inventory; diff check PASS; heavily dirty/untracked |
| `npm run --silent typecheck` | PASS, 20.64 s |
| `npm run --silent lint` | PASS exit 0, one warning |
| `npm run --silent build` | PASS, 28.80 s, 77 generation units |
| `npm run --silent test:uiux` | 13/13 PASS, structural |
| `npm run --silent test:practice` | 550/550 PASS, mainly structural |
| curriculum/competency/security commands | 9/9, 21/21, 10/10, 23/23 PASS |
| AI Tutor unit/quality/runtime | 25/25, 6/6, 9/9 PASS |
| direct Generator combined tests | 66/67 FAIL |
| `npm run --silent test:generator-v2-owner-review` | 3/8 FAIL |
| `npm run --silent test:project004-identity` | 1/3 FAIL |
| isolated `audit:generator-v2-full-coverage` | 32,760/32,760 reported PASS; independence finding applies |
| `PLAVE_GENERATOR_V2_PROOF_SCOPE=FULL ...run-generator-v2-database-proof.ts` | technical PASS pending visual review; selected fresh evidence reviewed |
| canonical `acceptance:v2-sitewide` | FAIL: owner-local module aliases unresolved |
| diagnostic temp-copy sitewide run | 7/7 viewports, 51 images, console/hydration/overflow 0; not canonical PASS |
| canonical `acceptance:ai-tutor-local` | FAIL: primary touch target small |
| `npm audit --json` | BLOCKED: registry DNS/policy |

Full machine-readable commands/results are in
`artifacts/complete-project-reaudit/test-evidence.json`.

## 20. Cleanup confirmation

- Audit-created Next listeners remaining: 0.
- Audit-created disposable containers remaining: 0.
- Audit fixtures remaining: 0.
- Exact audit temp workspace removed: yes.
- Unrelated pre-existing processes changed: no.
- Remote mutations: 0.
- Git mutations: 0.
- Paid provider requests: 0.
- Source/migration fixes: 0.
- Owner-decision changes: 0.

The only repository writes from this audit are this report,
`artifacts/complete-project-reaudit/*.json`, and the selected screenshot copies
under `artifacts/complete-project-reaudit/screenshots/`.

**PROJECT_REAUDIT_FAIL — CRITICAL/HIGH FINDINGS REQUIRE REMEDIATION**
