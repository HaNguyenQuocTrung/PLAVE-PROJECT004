# P0/P1 pedagogical quality audit

Updated: 2026-07-30

Status: `REVIEWED — MATERIAL FINDINGS FIXED — TARGETED TESTS PASS`

## Scope

The audit reviewed all 20 units that existed under
`P0_OUTCOME_COMPLETION` and `P1_OUTCOME_COMPLETION` before the Grade 3–4
completion batches:

1. `grade-1-number-foundations-p0`
2. `grade-1-shape-and-informal-measure-p0`
3. `grade-2-number-order-and-line-p0`
4. `grade-2-addition-subtraction-fluency-p0`
5. `grade-2-calculation-strategies-p0`
6. `grade-2-shape-construction-p0`
7. `grade-2-mass-capacity-tools-p0`
8. `grade-2-time-calendar-money-p0`
9. `grade-2-applied-measurement-p0`
10. `grade-3-measurement-conversions-p0`
11. `grade-4-measurement-conversions-p0`
12. `grade-5-core-operations-measurement-p0`
13. `grade-6-integer-fraction-operations-p0`
14. `grade-7-inverse-proportion-p0`
15. `grade-1-clock-week-calendar-p1`
16. `grade-1-practical-mathematics-p1`
17. `grade-2-multiplication-division-components-p1`
18. `grade-2-mass-and-time-relations-p1`
19. `grade-2-data-and-measurement-experience-p1`
20. `grade-3-number-sense-to-100000-p1`

The review covered theory, worked examples, prompts, answer contracts,
feedback, separated solutions, typed visuals, prerequisites and official
outcome mappings. It also sampled every new Grade 1 and Grade 2 unit, the
existing Grade 3 P1 unit, at least three generated questions per skill family,
and boundary cases represented by each outcome's semantic recomputation test.

## Findings and fixes

| Severity | Finding | Evidence before repair | Repair | Verification |
| --- | --- | --- | --- | --- |
| HIGH | Theory evidence was over-broadly mapped. Every theory section inherited every official outcome in a multi-outcome unit, including sections teaching a different action. | Runtime inspection of all 80 sections in the 20 units. | Theory sections now receive explicit outcome groups; each outcome has direct evidence and no section references an outcome outside its unit. The Grade 2 applied-measurement unit has an explicit non-positional grouping because its content order differs from the default split. | P0/P1 source-locked semantic suites and registry validation. |
| HIGH | Three or four questions for an outcome could be the same mathematical form with only numbers changed. The pre-repair normalized audit found 50 duplicate prompt-pattern groups and 57 repeated feedback/solution-pattern groups. | Digit-normalized prompt, feedback and solution scan across 240 questions. | The generator now creates recognition, performance, error-analysis and application forms. Error-analysis prompts contain a concrete wrong choice and an explicit rejection step; feedback identifies conceptual, calculation, representation, unit or application error. | P0, Grade 1 P1, Grade 2 P1 and Grade 3 number-sense suites; answer-type and evidence-form assertions. |
| HIGH | Clock questions used a generic data-display visual, so visual semantics did not match hour/minute parameters. | Question-level visual inspection of clock skills. | Added typed `CLOCK_FACE` data, renderer, accessible SVG markup and question-level visual override; prompt/audit/visual consistency is tested. | `tests/curriculum-visual.test.ts`. |
| MEDIUM | All theory sections ended with the same generic sentence rather than an outcome-specific check. | Exact sentence scan across the factory output. | Removed the sentence and generated restriction/misconception-specific checks only where they add mathematical meaning. | Current theory scan: 80 rows, 0 exact normalized duplicate groups, 0 cross-unit groups. |
| MEDIUM | A few deterministic banks could repeat an exact prompt when an outcome received six questions and the random draw collided or the base situation was fixed. | Exact per-outcome prompt scan found repeats in Grade 2 estimation/time and Grade 6 fraction division. | Estimation now rotates three age-appropriate objects and units; day/hour questions vary the number of days; Grade 6 fraction denominators follow a deterministic six-value schedule. | Exact per-outcome prompt scan and targeted P0/P1 tests. |

## Similarity interpretation

The post-repair normalized scan found no duplicate theory section among 80
sections and no duplicate worked example among 40 examples. Arithmetic prompts
still share legitimate instructional frames such as “Tính nhẩm …” or “Tính
…”, and error-analysis prompts share an explicit correction frame. These were
not treated as generic-content findings when the operations, grade range,
constraints, recomputed answer and misconception differed.

Feedback and solution steps intentionally repeat within one outcome when the
same invariant must be checked (for example, “số chia khác 0” or converting to
one common unit). They are accepted only when the outcome-specific
calculation, unit or misconception remains explicit.

## Incorrect mappings

The audit found no invented official outcome and no unit mapped merely because
it shared a broad strand. The over-broad section-level mappings described
above were corrected. All reviewed unit outcome IDs exist in the exhaustive
official inventory and carry exact PDF page evidence there.

## Sampling evidence

- All new Grade 1 units: direct manual inspection plus Grade 1 P1 semantic
  suite, 3/3 PASS.
- All new Grade 2 units: direct manual inspection plus Grade 2 P1 semantic
  suite, 3/3 PASS.
- Existing Grade 3 P1 number-sense unit: direct manual inspection plus semantic
  suite, 3/3 PASS.
- All 37 P0 outcomes: at least three primary questions, at least two evidence
  forms, direct theory/example evidence, feedback, separated solution and
  independent recomputation, 3/3 PASS.
- Typed visuals: all registered and question-level override types render
  accessible markup and preserve audit parameters.

## Unresolved audit issues

None in the 20 reviewed units. This statement applies to the audited units,
not to full official curriculum coverage. Grade 7–9 official outcome backlog
remains separately tracked in
`GRADES_1_TO_9_OFFICIAL_OUTCOME_BACKLOG.md`.

## Grade 5–6 expansion audit addendum

The 9 Grade 5 and 18 Grade 6 completion units were checked at registry,
generated-question and audit-record level. Every one of the 103 newly closed
outcomes has an outcome-specific theory section, worked example, skill
contract, at least three primary questions, at least two evidence forms,
classified feedback and separated solutions.

Findings fixed during the addendum:

- The first Grade 6 draft had seven units whose fixed scenarios did not vary
  across seeds. Their mathematical data now vary deterministically while the
  same seed remains exactly reproducible.
- Negative half-boundary rounding initially inherited JavaScript's
  direction-toward-positive-infinity behavior. It now rounds the magnitude at
  the requested place and reapplies the negative sign, with boundary
  assertions.
- Two Grade 6 geometry prerequisites referred to a non-existent Grade 5 slug.
  They now depend on the validated Grade 5 geometry/solid-net unit.
- A new typed `SOLID_NET` visual models cuboid volume and nets without exposing
  an answer; invalid payloads remain rejected by the visual factory.

Post-fix checks found no per-outcome prompt collision, no answer or solution
field in public questions, four unique multiple-choice labels, and exact
visual/audit type agreement. The Grade 5 suite independently recomputes all 35
outcomes and preserves the six decimal comparison edge cases. The Grade 6
suite independently recomputes all 68 outcomes and checks zero-denominator,
division, sign, exponent, rounding, probability-bound, unit and data
invariants.

## Grade 7–9 expansion audit addendum

The final audit covered the existing Grade 7 completion engine and all 50 new
secondary completion units: 14 in Grade 7, 17 in Grade 8 and 19 in Grade 9.
The shared framework was restricted to deterministic mechanics, evidence
wiring, feedback categories and solution separation. Mathematical teaching is
selected through typed number/algebra, geometry/measurement,
statistics/probability, finance/software and modelling strategies.

Findings fixed:

- A generic fourth theory section for three-outcome units did not add
  domain-specific value. It now checks proof assumptions for geometry,
  totals/scales/sample space for data and probability, variables/units and
  assumptions for modelling, and domain/order restrictions for algebra.
- Initial same-grade prerequisite chains conflicted with the fail-closed
  registry contract. Every new unit now references a validated, domain-aligned
  anchor from the preceding grade; the registry cycle and grade-boundary
  checks pass.
- Grade 8–9 Number-and-Algebra units were initially classified as standalone
  Numbers cells. They now remain Algebra, preserving the Owner-approved
  `G8_NUMBERS_AND_OPERATIONS` and `G9_NUMBERS_AND_OPERATIONS` N/A taxonomy.
- Three fixed geometry/software scenarios were not seed-sensitive. Their
  angle, polygon or trial parameters now vary deterministically.
- Similarity scan found three cross-grade repeated source phrasings. Teaching
  and example titles now include the exact grade and PDF page, preserving
  source context and eliminating exact collisions without disguising
  substantive similarity.
- The final consistency scan found 132 baseline inventory mappings that were
  valid in `mappedUnitIds` but not reflected in registry
  `officialOutcomeIds`. The registry now mirrors only those legacy
  inventory-level mappings; the 414 outcomes with direct semantic evidence
  keep their stricter runtime evidence wiring. Orphan outcome and unit counts
  are both zero.

Verification sampled all new units and all 600 generated questions. Every
one of the 185 newly closed outcomes has direct theory and worked-example
evidence, at least three primary questions in at least two evidence forms,
misconception feedback and a separated solution. The semantic suite
independently recomputes 600/600 answers, confirms all 50 units are
deterministic and seed-sensitive, and finds zero exact theory, example or
prompt collisions. No unresolved HIGH or BLOCKER finding remains.

The first Grade 7 unit was audited with the same contract: four page-55
rational-number outcomes, four direct theory sections, four worked examples
and twelve deterministic questions. Independent checks cover negative
placement on the number line, non-zero denominators, the distinction between
opposite and reciprocal, and integer membership in Q. No new finding remains
open.
