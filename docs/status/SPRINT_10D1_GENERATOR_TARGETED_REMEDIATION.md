# Sprint 10D.1 — Generator product and oracle remediation

Date: 2026-08-03
Source checkpoint: `3e16a3634bee4b815d683f59cfc9209c28031e24`
Result: `PASS_PENDING_INDEPENDENT_REAUDIT`

## Conclusion

The two Sprint 10D High findings have targeted remediations with fresh local
evidence. F-003 and F-005 are now `RESOLVED_PENDING_REAUDIT`; they are not being
closed by this implementation sprint. Milestone 2 remains
`REOPENED_AWAITING_SPRINT_10D2_REAUDIT` and the repository-default Generator
runtime flag remains OFF.

No Score/XP/Mastery work, AI Tutor implementation, migration, remote operation,
deployment, publication or Git mutation was performed.

## Reproduction before repair

The five exact Sprint 10D families were encoded before source repair in
`tests/generation-v2-sprint10d1-regressions.test.ts`. The initial run was 0/5:

1. `FUNCTION_GRAPH_RECOGNITION` drew one fixed origin line although the public
   label carried `y=mx+b`; the historical deterministic corpus reproduced 58/60
   nonzero intercepts.
2. `MOET2018-G7-NAA-P057-030` produced denominator-one answers through
   `FRACTION_INPUT` for all 40 audited EASY/MEDIUM samples.
3. `FRACTION_PART_WHOLE` named a color in 60/60 prompts while the public visual
   model did not encode it.
4. Adding `999` to a two-root quadratic `ORDERING` candidate returned
   `ok=true`, `diagnostics=[]`.
5. The diversity gate used prompt text after numeric-literal normalization and
   did not distinguish mathematical topology, context or visual/interaction.

The remediated targeted suite has nine tests and passes 9/9. No failing seed was
removed or special-cased.

## Product-contract remediation

### Linear graphs

The public candidate model now carries slope, y-intercept, equation, axes,
window and clipped plotted points. `plotLinearEquation` derives at least two
valid visible points from `y=mx+b`; it does not assume the origin. The renderer
maps the same public window/points into SVG. The independent oracle recomputes
coordinates without importing the rendering helper, checks every point against
the equation, verifies the visible intercept, axes and clipping, and rejects an
origin-only line when `b != 0`.

All 60 historical graph coordinates pass. Exactly 58 have a nonzero intercept,
matching the Sprint 10D claim. Positive, negative and zero intercepts plus
positive, negative, zero and fractional slope helper cases pass.

### Answer-driven interaction

Wave C resolves interaction from the reduced answer form. A reduced rational
with denominator 1 uses `INTEGER_INPUT`; a non-integral rational can use
`FRACTION_INPUT` when permitted. The Student submit boundary rejects a
fraction-shaped JSON payload for an integer-only interaction before the RPC,
while preserving the existing transports for matching, ordering and table data.

The complete Grade 7 affected outcome now has 60/60 denominator-one answers and
60/60 `INTEGER_INPUT` contracts. The original 40/40 EASY/MEDIUM affected set is
therefore repaired without rewriting prompts to manufacture fractions.

### Fraction color semantics

Color is now public mathematical presentation data rather than implicit wording.
The prompt color maps to stable region `fraction-shaded`, an allowlisted semantic
color ID, a fixed palette and `DIAGONAL_STRIPES`. The renderer uses both color and
pattern, and the visual alternative describes the shaded/hatched region so the
answer does not depend on color alone. All 60 prompt-color coordinates match the
public region and accessible description.

## Oracle and diversity remediation

The quadratic oracle independently parses the visible equation, computes the
exact real solution set, canonicalizes rational roots and compares sets by
equality. It emits:

- `ORACLE_MISSING_SOLUTION`;
- `ORACLE_EXTRANEOUS_SOLUTION`;
- `ORACLE_DUPLICATE_SOLUTION`;
- `ORACLE_DOMAIN_VIOLATION`;
- `ORACLE_INVALID_SOLUTION_FORMAT`.

The mutation gate now kills 12/12 mutations. The previously surviving extra-root
mutation is killed only by `ORACLE_EXTRANEOUS_SOLUTION`.

The new public-model semantic signature separately records lexical, parameter,
mathematical-structural, contextual and interaction/visual dimensions. Across
1,638 outcome/difficulty batches, 1,220 are explicitly marked as constrained to
one legitimate topology and 418 expose multiple structural forms. Pair evidence
records 0 exact duplicates, 115 surface-only pairs, 24,321 parameter changes,
50,517 structural changes, 235,809 contextual changes and 458
interaction/visual changes. The maximum surface-only near-duplicate pair rate is
0.036843, below the documented 0.12 gate without redefining the threshold.

## Full correctness and real Student runtime

The fresh full command executed every coordinate exactly once:

- outcomes/capabilities: 546/546 and 198/198;
- attempted/oracle validated: 32,760/32,760;
- missing/duplicate shards: 0/0;
- mathematical invalidity, insufficiency and ambiguity: 0;
- interaction, prompt/visual, answer-set and distractor failures: 0;
- private leak, fallback and keyword routing: 0;
- exact duplicates: 0;
- provenance 8/8 and deterministic replay: 32,760/32,760.

The authenticated disposable runtime used only `/api/curriculum-runtime/*` and
Student practice surfaces. It proved 198/198 capabilities, 217 completed
attempts, 2,604 immutable generated questions and 2,604 provenance-complete
rows on fresh schema 0001–0042. Concurrent start, CAS, duplicate submit,
rollback, resume without regeneration, exactly-once progress/history, role/flag
denials, zero orphans and cleanup all pass. Internal proof/review routes used: 0.

## Browser and manual screenshot review

Playwright Core 1.51.1 used installed Chrome 150 at 320×568, 390×844,
768×1024, 1280×800 and 1440×900. Eighteen authenticated journeys include all
four affected capabilities and representative registry coverage. The evidence
contains the required `y=2x+3`, negative-intercept, Grade 7 integer input,
fraction color/pattern, quadratic answer-set, feedback, resume and completion
states.

All 38 final screenshots were opened and manually reviewed. Critical/high visual
issues, console errors, hydration errors, page errors, overflow, dead controls,
private leaks and prompt/visual mismatches are all 0.

## Regression gates

PASS:

- Sprint 10D.1 failing fixtures 9/9;
- Generator core 10/10;
- oracle boundary and mutation 12/12;
- Wave C 3,420/3,420 and full correctness 32,760/32,760;
- Student runtime contract 9/9 and authenticated 198/198 capability proof;
- generated persistence 7/7 and database contract 3/3;
- Practice 550/550;
- curriculum 9/9, generation 546/546 and universal curriculum 21/21;
- competency 10/10;
- UI/UX 13/13;
- AI Tutor 40/40 using deterministic/local adapters;
- typecheck, lint and production build (77/77 pages);
- isolated key-unset secret-boundary canary;
- `npm audit`: 0 vulnerabilities;
- JSON parse/cross-file validation.

The first AI Tutor configuration-suite invocation was blocked by sandbox access
to `/dev/tty`; the identical deterministic suite passed 25/25 with terminal
access. The secret canary ran in a disposable snapshot containing an intentionally
empty mode-0600 `.env.local`, reported zero canary occurrences and made zero
provider requests.

## Remaining scope

The Sprint 10D Medium polynomial-feedback finding is unchanged because it is not
one of this sprint's two High targets. Sprint 10D.2 must independently reproduce
and verify F-003/F-005. Historical Owner approval is retained only as history;
this sprint creates no Owner decision and does not claim production readiness.

## Evidence

Machine-readable evidence is under `artifacts/remediation/sprint-10d1-*.json`.
The 38 reviewed screenshots are in
`artifacts/remediation/sprint-10d1-screenshots/`.

SPRINT 10D.1 COMPLETE — GENERATOR PRODUCT DEFECTS AND ORACLE GAPS REMEDIATED, INDEPENDENT REAUDIT REQUIRED
