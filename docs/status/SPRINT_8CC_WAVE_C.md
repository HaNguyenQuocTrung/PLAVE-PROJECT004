# SPRINT 8C.C — Generator V2 Wave C

Ngày: 2026-08-02  
Roadmap: Milestone 1 `COMPLETE_OWNER_APPROVED`; Milestone 2 `IN_PROGRESS_RESUMED`; Milestone 3 `COMPLETE_OWNER_APPROVED_LOCAL_MVP`  
Trạng thái: `COMPLETE_BROWSER_VALIDATED_OWNER_PRODUCT_REVIEW_REQUIRED`

## Exact inventory

Wave C được lấy nguyên trạng từ trường `wave: "C"` trong full-coverage matrix; sprint không repartition theo keyword. Machine-readable inventory được ghi trước implementation tại `artifacts/generator-v2-wave-c/outcome-matrix.json`.

`WAVE_C_OUTCOMES=57`. Phân bố chính xác theo lớp:

| Grade | Outcomes |
|---:|---:|
| 3 | 2 |
| 4 | 10 |
| 5 | 18 |
| 6 | 1 |
| 7 | 3 |
| 8 | 6 |
| 9 | 17 |
| **Tổng** | **57** |

Inventory chứa exact outcome ID, strand/domain, curriculum description, unit, prerequisites, prior implementation state, dependency, interaction proposal và missing capability cho cả 57 rows. Metadata-insufficient outcomes: `[]`.

## Product contracts and implementation

- 57/57 outcome IDs map trực tiếp tới typed `PLAVE_PRODUCT_ASSESSMENT_CONTRACT_V2`.
- 41 canonical mathematical capabilities; 56 mappings mới và 1 proven `LINEAR_SYSTEM` baseline được giữ nguyên.
- Routing là `outcomeId → canonicalVariantId → contractVersion`; unknown outcome fail closed bằng `GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED`.
- Fallback 0, keyword/substring/regex routing 0, synthetic aliases 0, runtime LLM answering 0.
- Generator, exact/rational solver, answer validator, distractor validator và feedback strategy giữ boundary độc lập.
- Interaction được dùng theo contract: `CONSTRUCTION_OR_VISUAL_SELECTION`, `DECIMAL_INPUT`, `FRACTION_INPUT`, `INTEGER_INPUT`, `MATCHING`, `ORDERING`, `SHORT_STRUCTURED_RESPONSE`, `SINGLE_CHOICE`, `TABLE_OR_CHART_RESPONSE`.
- Visuals sinh từ canonical normalized model, gồm coordinate graph, data table, fraction model, number line và place-value chart khi outcome yêu cầu.

## Generation and semantic gates

| Gate | Result |
|---|---:|
| Outcomes | 57/57 |
| Difficulties | EASY/MEDIUM/HARD |
| Seeds | 20/outcome/difficulty |
| Generated and independently validated | 3.420/3.420 |
| Provenance | 8/8 trên 3.420 samples |
| Exact duplicates | 0 |
| Maximum near-duplicate pair rate | 0,094737 ≤ 0,12 |
| Deterministic replay | PASS |
| Difficulty structural separation | PASS |
| Multidimensional diversity | PASS |
| Persistence adapter proofs | 171/171 |
| Negative controls | PASS |

Negative controls reject prompt/model mismatch, incorrect independent-solver result, out-of-grade parameter, invalid rational denominator và unsupported outcomes theo typed error contract. Không loại sample hoặc hạ threshold để đạt gate.

## Authenticated database proof

Fresh disposable local schema 0001–0042 applied 42/42. Authenticated Student journey persisted 42 completed attempts and 504 immutable generated questions/solutions/answers. All 504 public rows carry `GENERATED_V2` and provenance 8/8.

- Concurrent start, process-restart resume without regeneration, correct/incorrect submit, stale CAS, duplicate submit, exactly-once progress/history, completion và injected transaction rollback: PASS.
- Student B, Parent, Teacher, anonymous and direct-table bypass: denied by the existing contracts.
- Private solution/solver data before submit: 0; orphan records: 0.
- Fixture cleanup: PASS; remaining listener: none; remote access/mutation: no.

## Real browser acceptance

Local `playwright-core` 1.51.1 launched the existing Chrome 150.0.7871.186 executable. In-app Browser discovery and browser download were not used.

- Viewports: 390×844 and 1280×800, 2/2 PASS.
- Capabilities: 41/41; grades 3–9; EASY/MEDIUM/HARD; all 9 actual interaction types.
- Authenticated real application/API/database journeys cover answer, family feedback, next, restart/resume and completion/results/history.
- Console 0, hydration 0, page errors 0, horizontal/math overflow 0, disabled required controls 0, private leaks 0, prompt/visual mismatches 0.
- 32/32 final PNG screenshots were opened at original detail and visually reviewed; final critical/high issues = 0.

Earlier browser iterations exposed and fixed answer-bearing tables/graphs, wrong substitution-table semantics, decimal scale rendering, fraction-model ratio distortion, quadratic two-root interaction, a common-denominator interaction mismatch, and collapsed mobile table rows. Defective screenshots were deleted before the final clean run and are not acceptance evidence.

## Regression evidence

- Wave A: 98/98, 5.880/5.880, 39/39 capabilities, tests 8/8 PASS.
- Wave B: 61/61, 3.660/3.660, 30/30 capabilities, tests 8/8 PASS.
- Generator V2 core 10/10; full-coverage contract 6/6; database contract 3/3; generated persistence 7/7 and current persistence audit PASS.
- Practice 550/550; visual readability 3/3; curriculum 9/9 and 21/21; competency 10/10; UI/UX 13/13 PASS.
- AI Tutor compatibility only: 25/25 core/security/streaming, 6/6 quality, 9/9 authenticated local-runtime PASS; paid-provider requests 0 and Tutor implementation unchanged.
- Typecheck, lint and production build PASS; build generated 76/76 static pages while preserving dynamic routes.
- Current `npm audit` is not claimed PASS: sandbox run failed `getaddrinfo ENOTFOUND registry.npmjs.org`, and the read-only retry was policy-rejected because dependency metadata disclosure lacked explicit authorization. Last recorded project result is 0 vulnerabilities on 2026-08-01; no install was performed.

## Coverage after Wave C

Generator V2 now has 223/546 explicit mappings and 13.380/32.760 bounded samples. Exactly 323 outcomes remain in Waves D–F. Full coverage and Milestone 2 are not claimed complete; Wave D has not started, and Owner product usefulness review is not assumed.

Evidence root: `artifacts/generator-v2-wave-c/`. The report, exact outcome matrix, capability registry, diversity, negative controls, database proof, browser acceptance, screenshot review, review manifest and regression evidence are machine-readable there.

## Boundaries

No migration change, remote access/mutation, deployment, publication, Git mutation, AI Tutor implementation change, repository-default runtime enablement, generic fallback, synthetic coverage or Wave D implementation was performed.

PLAVE GENERATOR V2 WAVE C COMPLETE — 57/57 OUTCOMES BROWSER VALIDATED
