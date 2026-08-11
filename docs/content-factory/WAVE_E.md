# Grades 1–9 content factory Wave E

Wave E is an additive measurement-and-geometry expansion. It leaves Waves A–D, the Grade 1 SQL/runtime and original shadow tuple, and the frozen Grade 2 tuple unchanged. Separate Wave E and derived A+B+C+D+E candidates remain `DRAFT/HIDDEN`; publication, pilot, runtime and retention are disabled, with no default entitlement.

## Retained source boundary and selection

| Grade | Selected uncovered slice | Retained rows | Pages | Continuous-learning value |
|---:|---|---|---:|---|
| 1 | Immutable weekday-sequence evidence overlay | Legacy migration `0029_grade1_time_clock_calendar.sql` | N/A | Adds an independent calendar-sequence oracle without changing any legacy field. |
| 2 | Length-unit relations, conversion and polyline sums | `P027-012/017/019` | 27 | Establishes exact length measurement needed for later perimeter work. |
| 3 | Length units, conversion and perimeter | `P032-015/021/022` | 32 | Extends Grade 2 measurement into exact conversions and perimeter. |
| 4 | Conversion and calculation with measurements | `P038-013` | 38 | Connects exact arithmetic to length, area, mass, capacity and time units. |
| 5 | Volume and time conversion | `P044-013` | 44 | Supplies exact conversions required for later solid measurement. |
| 6 | Perimeter and area of special plane figures | `P051-003` | 51 | Connects rational arithmetic to complete-dimension plane measurement. |
| 7 | Lateral area and volume of right prisms | `P058-001/005` | 58–59 | Introduces exact solid measurement with rational dimensions. |
| 8 | Lateral area and volume of regular pyramids | `P065-001/005` | 65 | Continues the solid-measurement progression using complete dimensions. |
| 9 | Area and volume of cylinders, cones and spheres | `P073-001/006/007` | 73 | Completes the retained solid-measurement path using exact coefficients of π. |

The Grade 1 adapter creates or changes no legacy question, prompt, option, answer, solution, ID or runtime behavior. Its public-boundary oracle proves six weekday-sequence rows independently. The remaining 18 clock, schedule and marked-calendar rows depend on images or context that the deterministic oracle cannot recover, so they stay outside the candidate with `AUTOMATED_VERIFICATION_INSUFFICIENT`.

Grades 2–9 each contain 24 deterministic, source-bound questions. Independent exact-integer, rational, conversion, perimeter, area and volume oracles recompute every answer. Structurally normalized duplicate/equivalence checks cover Wave E and all prior waves. No textbook exercise is copied, and no curriculum-completion or pedagogical-superiority claim is made.

## Reproduction

```sh
npm run content:wave-e
npm run test:wave-e
npm run test:wave-d
npm run test:wave-c
npm run test:wave-b
npm run typecheck
npm run lint
npm run build
git diff --check
```

`test:wave-e-shards` launches all nine grade validators concurrently. The integrated tests verify retained source bindings, independent mathematics, duplicate/equivalence detection, graph validity, adaptive software simulation, frozen A–D artifacts, candidate isolation and generated-artifact reconciliation. Simulations are software evidence only. Visual, physical-action, estimation and open modelling outcomes remain excluded until a deterministic verification contract exists. Prerequisite order not established by retained evidence remains `HYPOTHESIS_REQUIRES_EVIDENCE`.
