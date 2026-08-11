# Grades 1–9 content factory Wave F

Wave F is an additive number-and-algebra expansion. It leaves Waves A–E, the Grade 1 SQL/runtime and original shadow tuple, and the frozen Grade 2 tuple unchanged. Separate Wave F and derived A+B+C+D+E+F candidates remain `DRAFT/HIDDEN`; publication, pilot, runtime and retention are disabled, with no default entitlement.

## Retained source boundary and selection

| Grade | Selected uncovered slice | Retained rows | Pages | Continuous-learning value |
|---:|---|---|---:|---|
| 1 | Immutable addition within 20 without carrying | Legacy migration `0021_grade1_addition_within_20_no_carry.sql` | N/A | Extends teen-number place value into independently verifiable addition without changing any legacy field. |
| 2 | Comparison, number ray, ordering and extrema to 1000 | `P025-007/008/014/019` | 25 | Extends place-value work into exact order reasoning; approximation is explicitly excluded. |
| 3 | Division with remainder, two-operation expressions and unknown components | `P030-016/019/020/022` | 30 | Connects multiplication/division fluency to expression order and inverse operations. |
| 4 | Distributive property and expression values | `P036-023` | 36 | Adds exact equivalent-form reasoning after multiplication. |
| 5 | Percentage ratio and value | `P042-014` | 42 | Builds exact percentages on retained decimal and fraction operations. |
| 6 | Four operations with signed decimals | `P050-047` | 50 | Extends signed-number work into exact finite-decimal arithmetic. |
| 7 | Algebraic-expression evaluation | `P057-030` | 57 | Adds exact integer and rational substitution to the algebra path. |
| 8 | Rational-expression concepts, domains and properties | `P064-010/011` | 64 | Adds exact domain restrictions, evaluation and equality under nonzero scaling. |
| 9 | First-degree linear inequalities | `P073-023` | 73 | Extends linear algebra with exact inequality bounds and sign-reversal reasoning. |

The Grade 1 adapter creates or changes no legacy question, prompt, option, answer, solution, ID or runtime behavior. Its public-boundary oracle independently reproduces all 24 selected answers and confirms protected explanation conclusions. Existing visual-dependent Wave E quarantines remain untouched.

Grades 2–9 each contain 24 deterministic, source-bound questions. Independent bigint rational evaluation verifies every derivation and comparison. Structural normalization audits Wave F against all prior waves. Approximation, ambiguous rounding, open modelling and unresolved-domain cases remain excluded rather than inferred. No textbook exercise is copied, and no curriculum-completion or pedagogical-superiority claim is made.

## Reproduction

```sh
npm run content:wave-f
npm run test:wave-f
npm run test:wave-e
npm run test:wave-d
npm run test:wave-c
npm run test:wave-b
npm run typecheck
npm run lint
npm run build
git diff --check
```

`test:wave-f-shards` launches all nine grade validators concurrently. Integrated tests verify retained sources, independent mathematics, duplicate/equivalence detection, graph validity, adaptive software simulation, frozen A–E artifacts, candidate isolation and generated-artifact reconciliation. Simulations are software evidence only. Prerequisite order not established by retained evidence remains `HYPOTHESIS_REQUIRES_EVIDENCE`.
