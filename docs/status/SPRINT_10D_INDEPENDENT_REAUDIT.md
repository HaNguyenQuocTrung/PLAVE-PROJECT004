# Sprint 10D — Independent post-remediation re-audit

## Verdict

**SPRINT_10D_REAUDIT_FAIL — EXACT CRITICAL/HIGH FINDINGS REQUIRE REMEDIATION**

Current unresolved/remediation counts: **Critical 0, High 2, Medium 4, Low 2**.
The two High findings are F-003 and F-005. This audit does not change any
Owner decision and does not restore Milestone 2.

## Audit isolation

The only source used was clean checkpoint
`3e16a3634bee4b815d683f59cfc9209c28031e24`, whose parent is
`be68da308b99ffd68136370853b52a85657fba71`. A local no-hardlink clone was
created under `/private/tmp`; it began clean and contained 1,662 tracked
files. Dependencies were installed from the tracked lockfile with
`npm ci --no-audit --no-fund`.

The main working tree, its `.env.local`, the unstaged Google smoke artifact,
working caches/runtime state, and the Owner Tutor process were not read or
used as evidence. No paid provider request was made.

## Executive conclusion

The secret-boundary, clean-checkout, canonical compile, AI Tutor touch target,
and real Student-runtime integration remediations are independently
reproducible. In particular:

- F-001 is resolved: old-key revocation is recorded as Owner-confirmed and a
  fresh canary dev/build run found zero occurrences outside the allowed
  ephemeral input; client, build, cache, log, and artifact scans were clean.
- F-002 is resolved: the public authenticated Student runtime exercised
  198/198 capabilities through `/api/curriculum-runtime/*`, not an internal
  proof/review route.
- F-004 and F-006 are resolved: a clean checkout passes install, both
  TypeScript graphs, lint, and both production builds.
- F-007 is resolved: fresh deterministic Tutor browser acceptance passes
  320×568, 390×844, and 1280×800 with the repaired 44×44 target.

Generator product correctness and oracle completeness are not resolved.
Fresh browser evidence disproves the automated
`promptVisualMismatches=0` claim, and audit-time falsification shows that the
oracle accepts an extraneous algebra solution.

## Exact unresolved High findings

### F-003 — Generator product correctness: UNRESOLVED

Three independent residual defects were reproduced:

1. `FUNCTION_GRAPH_RECOGNITION`: the Student screenshot labels a candidate
   `y=2x+3`, but its line is drawn through the origin. Across 60 deterministic
   samples, 58 labels have a nonzero intercept; the candidate renderer uses a
   fixed path and ignores that intercept.
2. `ALGEBRAIC_SUBSTITUTION`, outcome
   `MOET2018-G7-NAA-P057-030`: all 40 EASY/MEDIUM samples that use
   `FRACTION_INPUT` have denominator 1, although the prompt asks for an
   integer value.
3. `FRACTION_PART_WHOLE`: all 60 prompts name a color, but the visual model
   has no color field and the renderer uses a fixed fill. The fresh screenshot
   shows an orange prompt with a teal/green model; 29/60 samples request an
   unambiguously different orange, purple, or yellow color.

The polynomial feedback screenshot also advises substituting `x=1` to
verify polynomial equivalence. One point is not a valid general equivalence
proof, so the feedback contract needs pedagogical correction.

Impact: `546/546 STUDENT_RUNTIME_ELIGIBLE` is not independently accepted.
At minimum, affected capabilities must return to fail-closed eligibility until
remediated and re-audited.

### F-005 — Oracle independence/completeness: PARTIALLY_RESOLVED

The package boundary itself is sound: four oracle files have no direct or
transitive Generator/solver import, do not read the expected answer, and do
not call the runtime submit validator. The existing suite reports 7/7
mutations killed.

The independent audit added eleven public-candidate falsifications. Ten were
detected. The failing case appended a third, extraneous value `999` to a
quadratic-equation `ORDERING` interaction. The oracle returned:

- `ok=true`;
- `diagnostics=[]`;
- option count changed from 2 to 3.

The full 32,760 command therefore proves coverage and deterministic
self-consistency, but not complete product correctness. Its diversity metric
also remains prompt text with numeric literals normalized; it does not compare
the mathematical or visual structure required by the original finding.

## Full deterministic and runtime results

The canonical correctness command actually executed 546 outcomes × 3
difficulties × 20 seeds:

- attempted/unique: 32,760/32,760;
- missing/duplicate shards: 0/0;
- raw command result: PASS;
- reported answer/provenance failures: 0.

An audit-only copy of the same checkpoint was then modified outside the
repository to force one shard's provenance check to fail. The command exited
nonzero, reported 32,759/32,760 validated and one recorded failure. The
temporary copy was deleted afterward.

Fresh authenticated runtime proof:

- capabilities attempted/passed: 198/198;
- attempts completed: 215/215;
- generated questions/answers: 2,580/2,580;
- provenance 8/8 rows: 2,580;
- orphan rows: 0;
- concurrent start, CAS, duplicate submit, rollback, resume, completion, and
  exactly-once progress/history: PASS;
- internal proof/review routes used: 0;
- disposable cleanup: PASS.

This resolves the runtime disconnection finding, but it does not override the
product defects above.

## AI Tutor result

No paid provider was called. A deterministic local provider was used.

- viewports: 320×568, 390×844, 1280×800 — 3/3 PASS;
- primary response-mode and action targets: at least 44×44 CSS px;
- keyboard, visible focus, tap/click, disabled/loading, dialog and Stop flows:
  PASS;
- console, hydration, page, overflow, XSS/private-leak errors: 0;
- anonymous 401; Parent/Teacher 403; concurrent duplicate send 409.

The documented local-MVP limitation remains: conversations do not persist
through refresh because there is no conversation schema. Real-provider
latency/quality was intentionally not rerun.

## Finding reconciliation

| Finding | Original severity | Current result |
|---|---:|---|
| F-001 Secret cache exposure | Critical | RESOLVED |
| F-002 Student runtime disconnected | High | RESOLVED |
| F-003 Product-invalid Generator questions | High | UNRESOLVED |
| F-004 Clean-checkout reproducibility | High | RESOLVED |
| F-005 Validation/independence overclaim | High | PARTIALLY_RESOLVED |
| F-006 Canonical owner-local compile | High | RESOLVED |
| F-007 Tutor touch target | Medium | RESOLVED |
| F-008 Stale strict browser locator | Medium | RESOLVED |
| F-009 Status source-of-truth drift | Medium | PARTIALLY_RESOLVED |
| F-010 Weak/self-attested evidence | Medium | UNRESOLVED |
| F-011 Missing Support surface | Medium | UNRESOLVED |
| F-012 Multiple practice pipelines | Medium | UNRESOLVED |
| F-013 Warning noise | Low | PARTIALLY_RESOLVED |
| F-014 Logo LCP warning | Low | RESOLVED |
| F-015 Grade 1 mobile density | Low | BLOCKED |

F-009 remains because current roadmap, full-coverage/Owner artifacts, and
fresh runtime artifact metadata still use different active checkpoint/status
values. F-010 remains because the machine visual mismatch count was disproved
by the screenshots and much of the test inventory is structural. F-011 and
F-012 are unchanged: there is still no Support route, and multiple generation
pipelines coexist. F-013 retains Node module/type-stripping warnings. F-015
could not be regenerated without a permitted isolated sitewide Owner profile.

## Browser and screenshot review

Thirty-two screenshots were opened and reviewed: 22 fresh Generator Student
runtime images and 10 fresh/rerun Tutor images. Viewports represented were
320×568, 390×844, 768×1024, 1280×800, and 1440×900.

Automated totals were console 0, hydration 0, page 0, overflow 0, and private
leaks 0. Manual semantic review found one High and two Medium screenshot
issues. The canonical sitewide static/Parent/Teacher dashboard browser
journey was blocked because the isolated checkpoint had no configured Owner
profile and the checkpoint override correctly prohibited using the main
`.env.local` or Owner runtime. Generator role/API/direct-route denials were
nevertheless freshly verified.

## Gates

- Passed: 24.
- Failed: 2 — audit-time oracle falsification; Generator screenshot/product
  semantic review.
- Blocked: 2 — npm audit due
  `getaddrinfo ENOTFOUND registry.npmjs.org`; isolated sitewide Owner browser.
- npm audit status: `UNVERIFIED_ENVIRONMENT_BLOCKED`.
- Last separate verified npm audit evidence: 0 vulnerabilities on 2026-08-01.

Representative passing commands included:

```text
npm ci --no-audit --no-fund
npm run --silent security:secret-boundary
npm run --silent typecheck
tsc --noEmit --project tsconfig.owner-local.json
npm run --silent lint
npm run --silent build
PLAVE_OWNER_LOCAL_DEMO=true npm run build
npm run --silent test:practice                         # 550/550
npm run --silent test:generation-v2                    # 10/10
npm run --silent test:generation-v2-oracle
npm run --silent audit:generator-v2-independent-oracle # raw 32760/32760
npm run --silent acceptance:generator-v2-correctness-runtime
npm run --silent acceptance:ai-tutor-local
```

All 231 inspected JSON files parsed. Migrations are exactly 0001–0042.

## Evidence quality

- PRODUCT_EVIDENCE: the 32 manually reviewed screenshots, deterministic
  interaction sampling, and audit-time falsification.
- RUNTIME_EVIDENCE: the disposable authenticated Student runtime and
  deterministic Tutor browser acceptance.
- STRUCTURAL_EVIDENCE: clean install, typecheck, builds, dependency graph,
  migration and JSON checks.
- REGRESSION_ONLY: the large unit/source-contract suites.
- WEAK_OR_MISLEADING_EVIDENCE: raw 32,760 PASS as a complete-correctness claim,
  normalized-prompt diversity, and machine `promptVisualMismatches=0`.

## Milestones

- Milestone 1: `COMPLETE_OWNER_APPROVED` — unchanged.
- Milestone 2: `REOPENED_CORRECTNESS_REMEDIATION` — F-003 and F-005 require
  remediation and another independent audit.
- Milestone 3: remains
  `REOPENED_SECURITY_AND_REPRODUCIBILITY_REMEDIATION` in this read-only audit.
  Its targeted Critical/compile/accessibility gates passed, but the audit does
  not automatically restore status or write a new Owner decision.

Historical Owner decisions are preserved.

## Required remediation order

1. Fix Student visual rendering from canonical public data, starting with
   function-line slope/intercept; add renderer-level semantic assertions.
2. Correct the algebra substitution interaction policy and fail closed the
   affected capability until its 60 samples and Student browser flow pass.
3. Add oracle validation for complete ORDERING answer sets and extraneous
   algebra solutions; rerun all audit-time mutations.
4. Replace prompt-only near-duplicate evidence with mathematical, interaction,
   and visual structural fingerprints.
5. Harden evidence writers/status metadata, then address Support UX and
   pipeline ownership.

## Cleanup and mutation confirmation

Audit servers stopped; the disposable database, temporary fault-injection
workspace, and clean checkout were removed after evidence validation. No
audit listener is reported. Source mutations: 0. Git
mutations: 0. Remote mutations: 0. Paid provider requests: 0. The main working
tree and Owner Tutor were preserved without inspection.

Machine-readable evidence is under `artifacts/remediation/sprint-10d-*.json`
and screenshots under `artifacts/remediation/sprint-10d-screenshots/`.
