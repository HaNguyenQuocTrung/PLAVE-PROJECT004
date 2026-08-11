# Grades 1–9 content factory Wave D

Wave D is additive and bounded. It leaves Waves A–C, Grade 1 SQL/runtime and shadow tuple, and the frozen Grade 2 tuple unchanged. Separate Wave D and derived A+B+C+D candidates remain `DRAFT/HIDDEN`; publication, pilot, runtime and retention are disabled.

## Retained source boundary and selection

| Grade | Selected uncovered slice | Retained rows | Pages | Why this slice follows |
|---:|---|---|---:|---|
| 1 | Immutable numbers-to-20 evidence overlay | Legacy migration `0020` only | N/A | Existing next legacy unit after Wave C subtraction; public-boundary oracle covers count, name, sequence, comparison and place value. |
| 2 | Operation meaning and one-step problems | `P025-010`, `P026-020` | 25–26 | Applies Wave C multiplication/division tables in bounded exact-integer contexts. |
| 3 | Area, cm², rectangle and square area | `P032-012/013`, `P033-025` | 32–33 | Continues from equal parts into unit-square counting and exact area. |
| 4 | Multiplication and division of fractions | `P037-026` | 37 | Continues directly from Wave C reduction using exact rational arithmetic. |
| 5 | Decimal multiplication and division | `P042-020/018` | 42 | Completes deterministic decimal operations after Wave C concepts and addition/subtraction. |
| 6 | Fraction of a number and inverse form | `P049-042` | 49 | Applies Wave C fraction arithmetic to exact quantities. |
| 7 | Roots, values and operations of one-variable polynomials | `P058-033/034/035` | 58 | Adds exact substitution and coefficient reasoning after proportional algebra. |
| 8 | Slope and line relations | `P064-009/013` | 64 | Extends symbolic algebra with exact slope extraction and comparison. |
| 9 | Central/inscribed angles and intercepted arcs | `P075-020/021` | 75 | Adds an exact-degree geometry slice without diagram-dependent inference. |

Grade 1 creates and changes no legacy question, answer or solution. All 24 selected immutable rows pass an independent public-prompt/options oracle and source question/explanation hashes are retained. Any failed row would remain outside the candidate as `AUTOMATED_VERIFICATION_INSUFFICIENT`.

Grades 2–9 each contain 24 deterministic, source-bound questions. Integer, rational and finite-decimal answers are recomputed by an independent exact oracle; polynomial, slope and circle-angle slices add bounded domain-specific oracles. Textbook exercises are not copied and curriculum completion is not claimed.

## Reproduction

```sh
npm run content:wave-d
npm run test:wave-d
npm run test:wave-c
npm run test:wave-b
npm run typecheck
npm run lint
npm run build
git diff --check
```

`test:wave-d-shards` launches all nine grade validators concurrently. The integrated tests then verify retained sources, independent mathematics, duplicate/equivalence detection, graph validity, adaptive software simulation, frozen A–C bundles, candidate isolation and artifact reconciliation. Simulations are software evidence only; they do not claim pedagogical superiority. Any prerequisite order not established by the retained source remains `HYPOTHESIS_REQUIRES_EVIDENCE`.
