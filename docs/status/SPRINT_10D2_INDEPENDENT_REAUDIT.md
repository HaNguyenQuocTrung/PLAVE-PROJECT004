# Sprint 10D.2 — Independent targeted Generator re-audit

Audit timestamp: 2026-08-03T08:06:54+07:00

Verdict: `SPRINT_10D2_REAUDIT_FAIL — EXACT CRITICAL/HIGH GENERATOR FINDINGS REQUIRE REMEDIATION`

Counts: Critical 0, High 1, Medium 2, Low 1.

## Source isolation

The audit used a temporary detached Git worktree created directly from `b5eeabab22f0183ceef1bd64cc1d94d34e882cfd` (parent `3e16a3634bee4b815d683f59cfc9209c28031e24`). The worktree was clean before execution, contained 1,747 tracked files and package-lock v3, and did not contain `.env.local`, the unstaged Google smoke artifact, historical excluded screenshots, main-worktree caches, or Owner Tutor state. Dependencies were installed from the lockfile with `npm ci --ignore-scripts` (457 packages).

## Finding reconciliation

- `F-003` is **RESOLVED** for the original product defects. The independently generated graph family had 60/60 valid render transformations, including 58 nonzero intercepts. Grade 7 algebra substitution used `INTEGER_INPUT` for all 60 denominator-one samples, including the original 40 EASY/MEDIUM cases. All 60 fraction-color prompts mapped to stable rendered regions with a non-color pattern/text alternative.
- `F-005` is **UNRESOLVED**. Dependency isolation and the repository mutation suite pass, and the former extraneous-quadratic-root defect is fixed. However, an audit-time mutation that changed a denominator-one Grade 7 answer from `INTEGER_INPUT` to `FRACTION_INPUT` was accepted with `ok=true` and no diagnostic. The oracle also rejected the exact-equivalent spelling of an integer root as `n.0` instead of canonicalizing it. Existing 12/12 mutations do not cover these cases.

## Independent targeted results

### Linear graphs

- 60 samples audited; 60 renderer transforms valid.
- Nonzero intercepts: 58 (positive 26, negative 32); zero intercepts: 2.
- Positive slopes: 28; negative slopes: 32. The generated affected family did not advertise fractional slopes.
- `y = 2x + 3` rendered with the nonzero intercept.
- Replacing the visual with `y = 2x` while retaining the public equation was rejected as `ORACLE_VISUAL_DATA_MISMATCH`.

### Answer-driven interaction

- The full 32,760-coordinate corpus was scanned.
- Grade 7 `MOET2018-G7-NAA-P057-030`: 60/60 denominator-one answers used `INTEGER_INPUT`; `FRACTION_INPUT` count 0.
- 126 denominator-one rational values used `FRACTION_INPUT` only in contracts whose explicit curriculum evidence requires a reduced fraction/rational form; numeric-integer/FRACTION mismatches were 0.
- Audit-time forced Grade 7 interaction mutation: **not rejected**. This is the remaining High finding.

### Fraction visual semantics

- 60/60 color-referencing prompts had matching stable regions, correct shaded counts and accessible diagonal-pattern/text semantics.
- Prompt-color, region-color and accessible-label mutations were all rejected.
- Minimum fill/white contrast was 2.94:1, while the segment border/white contrast was 4.64:1 and the design did not rely on color alone.

### Quadratic answer sets

- Exact root set, repeated-root case and the remediated extraneous-root case behaved correctly.
- Missing, extra, duplicate, complex-format, invalid-domain and outside-tolerance candidates were rejected with typed diagnostics.
- A mathematically exact integer root written as `n.0` was rejected rather than canonicalized. This is a residual oracle representation defect under `F-005`.

### Structural diversity

Independent falsification correctly classified exact duplicate, wording-only, parameter, AST/structural, context, and interaction/visual changes. The full report contains 1,638 outcome/difficulty batches, five separate diversity dimensions, zero exact duplicates, and a maximum near-duplicate pair rate of 0.0368421 against the documented 0.12 limit. Constrained-topology capabilities are labeled instead of being credited with invented topology.

## Full run, runtime and browser

The canonical full command generated 32,760 actual records: 546 outcomes × 3 difficulties × 20 seeds, with no missing or duplicate coordinate. Its standard checks report 32,760/32,760 valid, but that PASS is insufficient because the additional audit-time interaction falsification escaped it.

The authenticated disposable runtime used only `/api/curriculum-runtime/*`: 198/198 capabilities passed start, incorrect/correct submit, resume without regeneration and completion; provenance was 2,604/2,604 at 8/8, orphans were 0, CAS and duplicate submit passed, roles/flags failed closed, repository default remained OFF, cleanup passed, and no internal proof/review route was used.

All 38 fresh runtime screenshots across 320×568, 390×844, 768×1024, 1280×800 and 1440×900 were opened and visually reviewed. The targeted graph, Grade 7 integer, fraction-color and quadratic surfaces were usable with no Critical/High visual issue. The captured set did not contain a dedicated results/history screenshot, although those public paths were observed by the runtime harness; this is a Medium evidence-completeness gap. Several long catalog titles are visually ellipsized, recorded as Low.

## Regression gates

PASS: targeted historical regressions 9/9; repository mutations 12/12; full deterministic run; Student runtime; persistence; Practice 550/550; curriculum 9/9 and 21/21; competency 10/10; role/security; UI/UX 13/13; AI Tutor 40/40 in key-unset mode; typecheck; lint; production build 77/77; secret-boundary canary; JSON validation; npm audit (0 vulnerabilities).

FAIL: independent audit-time interaction falsification. The first sandbox-only AI Tutor attempt failed because `/dev/tty` was denied; its required PTY rerun passed 25/25 and is the counted result. The first sandbox npm audit received `ENOTFOUND`; the required network-approved read-only rerun passed with 0 vulnerabilities.

## Residual findings

1. `10D2-H-001` (High, Developer/Both): oracle does not independently enforce answer-driven interaction semantics and does not fully canonicalize equivalent numeric root representations.
2. `10D2-M-001` (Medium, Developer): fresh runtime artifact metadata still names an older checkpoint/runtime-copy label, weakening traceability despite execution from the isolated checkpoint.
3. `10D2-M-002` (Medium, Both): no dedicated results/history screenshot in the final 38-image set.
4. `10D2-L-001` (Low, User): some long catalog titles use ellipsis at desktop/mobile breakpoints.

Milestone 2 remains `REOPENED_CORRECTNESS_REMEDIATION`. No Owner decision or milestone status was changed.

Cleanup: the detached audit worktree, external falsification harness and audit temp directory were removed; the runtime harness reported no listener and complete disposable-fixture cleanup. Five pre-existing `clean-proof` containers created before this audit were observed and deliberately preserved as unrelated state. Owner Tutor was not inspected or touched.

Remote mutations: 0. Git mutations: 0. Migrations: 0. Provider requests: 0. Paid requests: 0.
