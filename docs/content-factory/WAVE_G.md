# Grades 1–9 content factory Wave G

Wave G is an additive statistics, data-representation and probability expansion. Waves A–F, the Grade 1 SQL/runtime and original shadow tuple, and the frozen Grade 2 tuple remain unchanged. Separate Wave G and derived A+B+C+D+E+F+G candidates are `DRAFT/HIDDEN`; publication, pilot, runtime and retention are disabled, with no default entitlement.

## Offline invocation boundary

Every Wave G test or build entry point first runs a local-only guard with `npm_config_offline=true`. The guard rejects bare `npx`, programmatic `npx`, and npm install/update/audit commands without an offline boundary; it also verifies the repository-local TypeScript, ESLint and Next executables before use. Missing dependencies fail closed and never fall back to a registry.

The retained Wave F history records one registry DNS-resolution attempt (`ENOTFOUND`, no download and no remote data). Wave G does not rewrite that incident. Wave G's network-attempt count is zero.

## Retained source boundary and selection

| Grade | Selected uncovered slice | Retained rows | Pages | Continuous-learning value |
|---:|---|---|---:|---|
| 1 | Immutable visual classification/count evidence overlay | Legacy geometry rows q19–q24 | N/A | Audits the nearest data-like legacy slice after no standalone retained Grade 1 statistics unit was available; all six fail closed because the public candidate omits the pictured dataset. |
| 2 | Pictographs, observations and category counts | `P028-001/003/004` | 28 | Introduces complete public datasets, totals and comparisons. |
| 3 | Data tables, observations and classification | `P033-001/002/004` | 33 | Extends category counts into complete tables and exact comparisons. |
| 4 | Arithmetic mean | `P039-007` | 39 | Adds exact descriptive-statistics aggregation. |
| 5 | Statistical fraction/decimal/percentage rates | `P045-007` | 45 | Connects retained number operations to exact frequency proportions. |
| 6 | Empirical probability | `P054-011` | 54 | Introduces bounded empirical probability from explicit event and trial counts. |
| 7 | Pie and line data, change and pattern | `P061-001/002/007` | 61 | Adds complete chart datasets, exact totals and changes. |
| 8 | Experimental and theoretical probability | `P069-011/014` | 69 | Compares exact experimental ratios with complete finite sample spaces. |
| 9 | Malformed represented-data detection | `P076-008` | 76 | Adds deterministic reasonableness checks after grouped-frequency work. |

Grade 1 creates or changes no legacy prompt, option, answer, solution, ID or runtime behavior. The six selected rows remain quarantined as `AUTOMATED_VERIFICATION_INSUFFICIENT`; no visual content is inferred.

Grades 2–9 contain 24 deterministic source-bound questions each. Independent checks cover exact totals, sample size, frequency, mean, rational equivalence, probability bounds, public dataset completeness, malformed data, explanation consistency, structure diversity and duplicate/equivalence detection. Open surveys, image-only values and incomplete sample spaces remain excluded.

## Reproduction

```sh
export npm_config_offline=true
node --no-warnings --experimental-strip-types scripts/audit-offline-invocation-boundary.ts
npm run content:wave-g
npm run test:wave-g
npm run typecheck
npm run lint
npm run build
git diff --check
```

`test:wave-g-shards` launches nine grade validators concurrently using `process.execPath`. Integrated tests verify retained sources, independent mathematics, fail-closed quarantine, duplicate/equivalence detection, graph validity, adaptive software simulation, frozen A–F artifacts, candidate isolation and generated-artifact reconciliation. Simulations establish software behavior only and make no pedagogical-superiority claim. Unverified prerequisite order stays `HYPOTHESIS_REQUIRES_EVIDENCE`.
