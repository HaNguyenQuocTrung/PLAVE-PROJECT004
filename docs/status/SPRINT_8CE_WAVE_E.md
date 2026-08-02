# SPRINT 8C.E — Generator V2 Wave E

Ngày hoàn tất kỹ thuật: 2026-08-02  
Trạng thái: `PASS_BROWSER_VALIDATED`  
Roadmap: Milestone 2 `IN_PROGRESS_RESUMED`; không Owner auto-approval và không bắt đầu Wave F.

## Locked inventory

Taxonomy hiện hành xác định Wave E có 86 outcomes. Hai outcome đã có proven V2 baseline; sprint này author và implement 84 explicit contracts mới. Phần 94 outcome chưa implement tại đầu sprint được partition không mâu thuẫn như sau:

- `WAVE_E_SCOPE_OUTCOMES=86`
- `WAVE_E_UNIMPLEMENTED_OUTCOMES_AT_START=84`
- `WAVE_F_REMAINING_OUTCOMES=10`
- `84 + 10 = 94`

Exact 86 IDs, grade, strand/domain, curriculum description, mathematics, bounds, capability, interaction, visual/data requirement và implementation status nằm trong `artifacts/generator-v2-wave-e/outcome-matrix.json`. Grade distribution: Grade 2 = 7, Grade 3 = 5, Grade 4 = 7, Grade 5 = 7, Grade 6 = 12, Grade 7 = 9, Grade 8 = 16, Grade 9 = 23.

## Product contracts and routing

- 86/86 outcomes map trực tiếp bằng outcome ID tới 48 canonical capabilities.
- 84 mappings dùng `PLAVE_PRODUCT_ASSESSMENT_CONTRACT_V2` engine Wave E; hai proven baselines `CHART_DATA_INTERPRETATION` và `EXPERIMENTAL_PROBABILITY` được giữ nguyên.
- Contract chứa grade bounds, deterministic seed, canonical problem/answer/visual model, interaction, solver, validator, distractor/misconception và feedback policy.
- Không keyword/substring/regex routing, generic fallback, synthetic alias, runtime LLM solving hoặc template-only coverage.
- Unknown/Wave F mapping tiếp tục fail closed bằng `GENERATOR_V2_OUTCOME_NOT_IMPLEMENTED`.
- Actual interactions bao phủ single choice, multi-select, integer/decimal/fraction input, ordering, matching, table/chart response và construction/visual selection.

## Mathematical and diversity gates

- 86 × 3 difficulties × 20 seeds = 5.160/5.160 samples independently solved and validated.
- Provenance completeness 8/8 cho 5.160/5.160; deterministic replay PASS.
- Exact duplicate rate = 0; maximum near-duplicate pair rate = 0,036842 ≤ 0,12.
- Difficulty structural and multidimensional diversity gates PASS; fallback = 0; keyword routing = 0.
- Validator kiểm tra exact/rational/controlled-decimal arithmetic, units/precision, dataset/sample-space, probability normalization, function substitution/mapping, prompt–visual–answer alignment, grade bounds và public/private boundary.
- Negative controls chạy trên 84 new-engine outcomes, đại diện đủ 48 capability families; unknown outcome, malformed prompt/contract, wrong solver, out-of-grade parameter, impossible/mismatched visual và private metadata leak đều bị reject.

## Authenticated persistence proof

Fresh disposable local schema 0001–0042 PASS:

- authenticated Student start và concurrent start;
- reload/process-restart resume không regenerate;
- correct/incorrect submit, stale CAS và duplicate submit;
- exactly-once progress/history, completion và rollback;
- RLS/role isolation, immutable generated rows và provenance 8/8;
- 48/48 capability journeys, 588 persisted questions;
- orphan records = 0; private solution/solver metadata leak trước submit = 0;
- cleanup PASS, remaining listener = none, remote access/mutation = false.

## Local browser acceptance

Harness dùng `playwright-core` 1.51.1 và Chrome 150.0.7871.186 đã có sẵn; không dùng in-app Browser hoặc tải browser mới.

- Viewports 390×844 và 1280×800: 2/2 PASS.
- Canonical capabilities 48/48; Grades 2–9; EASY/MEDIUM/HARD; mọi interaction Wave E được đại diện.
- Correct/incorrect feedback, Next, reload/restart resume, completion/results/history PASS.
- Console, hydration, page errors, horizontal/math overflow, private leaks và prompt/visual mismatch đều 0.
- 27/27 screenshots của final clean run đã được mở ở original detail và review; final critical/high issues = 0.
- Review trước final run đã bắt các lỗi semantic thật như technical feedback labels, mismatched sample-space table, function-table interaction, missing triangle midline, exposed chemical coefficients, wrong investment unknown, frequency-meaning routing và synonymous probability distractors. Tất cả đã sửa và evidence cũ đã bị thay thế.

## Regression

- Waves A–D: PASS (8/8, 8/8, 8/8, 10/10).
- Generator V2 core 10/10; full-coverage audit 6/6; persistence/security 7/7 + database-proof contract 3/3.
- Practice 550/550; visual readability 3/3.
- Curriculum 9/9 và 21/21; competency 10/10; UI/UX 13/13.
- AI Tutor 40/40; paid provider requests = 0; implementation changed = false.
- Typecheck PASS; lint 0 errors/0 warnings; production build PASS, Next.js 16.2.12, 76/76 pages.
- `npm audit` là `UNVERIFIED_NETWORK_POLICY_NOT_CLAIMED_PASS`: sandbox trả `ENOTFOUND registry.npmjs.org`; read-only retry bị policy từ chối vì dependency-metadata egress. Last verified project result: 0 vulnerabilities ngày 2026-08-01. Không dependency/lockfile change trong sprint.

## Coverage after Wave E and exact Wave F remainder

Generator V2 hiện có 536/546 explicit callable mappings. Wave F còn đúng 10 unimplemented outcomes:

- `MOET2018-G1-NUM-P022-003`
- `MOET2018-G2-GEO-P026-004`
- `MOET2018-G5-GEO-P044-008`
- `MOET2018-G6-STA-P053-005`
- `MOET2018-G7-STA-P061-005`
- `MOET2018-G7-EXP-P062-002`
- `MOET2018-G8-NAA-P064-010`
- `MOET2018-G8-NAA-P064-011`
- `MOET2018-G8-STA-P069-010`
- `MOET2018-G8-EXP-P070-008`

Full audit đã chạy 32.160/32.760 samples; 600 Wave F samples không được tạo. Vì vậy Milestone 2 vẫn `IN_PROGRESS_RESUMED`; không claim 546/546 hoặc Owner usefulness acceptance.

## Boundaries

Không migration, remote access/mutation, activation/publication, deployment, Git mutation, AI Tutor implementation change, repository-default runtime enable, generic fallback, synthetic coverage hoặc Wave F implementation.

PLAVE GENERATOR V2 WAVE E COMPLETE — 86/86 OUTCOMES BROWSER VALIDATED
