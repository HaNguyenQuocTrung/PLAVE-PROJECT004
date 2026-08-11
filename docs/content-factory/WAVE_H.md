# Grades 1–9 Wave H: applied and multi-step problems

Wave H adds a bounded source-backed applied-reasoning slice without publishing or activating content. It does not claim curriculum completion or pedagogical superiority. Every candidate remains `DRAFT/HIDDEN`, all runtime/pilot/retention flags remain false, and no entitlement is created.

## Source selections

- Grade 1: immutable legacy word problems q19–q24 from `0025_grade1_addition_within_100_no_carry.sql`; six public two-group addition prompts pass semantic-parity oracle verification. No legacy content, identity, answer, explanation, digest, or runtime changed.
- Grade 2: `MOET2018-G2-GEO-P027-011`, page 27 — applied measurement.
- Grade 3: `MOET2018-G3-NUM-P030-013`, page 30 — applied problems with up to two steps.
- Grade 4: `MOET2018-G4-NUM-P037-025`, page 37 — multi-step fraction applications.
- Grade 5: `MOET2018-G5-NUM-P040-002`, pages 40–41 — natural-number applications with up to four steps.
- Grade 6: `MOET2018-G6-NAA-P050-044`, page 50 — decimal, ratio, and percent applications.
- Grade 7: `MOET2018-G7-NAA-P056-005`, page 56 — rational-number applications.
- Grade 8: `MOET2018-G8-NAA-P065-025`, page 65 — linear-function motion applications.
- Grade 9: `MOET2018-G9-NAA-P072-022`, page 72 — quadratic applied problems with one context-valid root.

Canonical inventory outcomes `MOET2018-G2-EXP-P028-002`, `MOET2018-G7-EXP-P062-002`, `MOET2018-G8-EXP-P070-008`, and `MOET2018-G9-EXP-P078-001/P078-004` remain excluded as `AUTOMATED_VERIFICATION_INSUFFICIENT`. They were not used to widen candidate eligibility.

## Verification and operational boundary

The applied oracle verifies public-data completeness, intermediate steps, unit consistency, domain/context validity, answer uniqueness, rounding disclosure, geometry/data completeness, solution isolation, and safe synthetic context. Negative fixtures cover intermediate-step failure, invalid derivation, unit mismatch, insufficient data, and applied-equivalence detection.

Wave G's offline invocation guard is inherited and extended. Bare `npx`, network-capable package invocation, and Wave H network-attempt counts must remain zero. The historical Wave F registry DNS-attempt incident remains recorded in Wave G; Wave H does not rewrite it.
