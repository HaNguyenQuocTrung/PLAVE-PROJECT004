# SPRINT 8B — Generator V2 vertical slice

Ngày: 2026-08-01  
Phạm vi: 12 canonical product variants đại diện Toán lớp 1–9  
Milestone: 2 — `IN_PROGRESS`

## Kết luận

Canonical Generator V2, 12-variant slice, 3.600-sample quality harness và local Chromium product preview đã được triển khai. Slice đã chứng minh typed registry, deterministic generation, independent correctness checks, interaction-specific rendering/submit, feedback, refresh/resume, duplicate-submit idempotency và completion ở local server-only runtime.

Sprint chưa đạt end-to-end database-backed Student runtime. Local database hiện thiếu 0041 semantic start RPC và không có active release; việc thay migration/release bị cấm trong sprint. Vì vậy terminal status là blocked, không phải toàn bộ Milestone 2 hoàn tất.

## Đã triển khai

- Canonical entry point `generateQuestion(...)` trong `lib/generation-v2/`.
- Explicit outcome registry; không substring/regex family selection và không generic fallback.
- 12 canonical variants với outcomes thật, grade policy, difficulty policy, interactions, solver, validator, visual và feedback strategy.
- Typed public/private/solver/validation/feedback/provenance contracts.
- Interaction support: single choice, multi-select, integer, decimal, fraction, ordering, matching, chart response và visual selection.
- Family-specific misconception distractors; không dùng common random offset engine.
- Prompt, visual và solver dùng cùng normalized problem model.
- Independent integrity validation và 11 negative controls.
- 0041 compatibility adapter có contract test, không thay migration.
- Local-only `/internal/generator-v2` preview và guarded start/state/answer APIs.
- In-memory immutable snapshot session, revision/CAS, idempotent duplicate submit, refresh/resume và completion.

## 12 vertical-slice variants

| Grade | Variant | Outcome ID | Representative capability |
|---:|---|---|---|
| 1 | `ADD_SUB_MEANING` | `MOET2018-G1-NUM-P022-004` | cộng/trừ, object groups |
| 2 | `MULTIPLY_DIVIDE_FACTS` | `MOET2018-G2-NUM-P025-018` | nhân/chia theo nhóm |
| 3 | `PLACE_VALUE_COMPARE` | `MOET2018-G3-NUM-P029-004` | place value, ordering |
| 4 | `FRACTION_PART_WHOLE` | `MOET2018-G4-NUM-P036-018` | fraction input/visual |
| 9 | `LINEAR_SYSTEM` | `MOET2018-G9-NAA-P072-010` | hệ phương trình, matching |
| 3 | `GEOMETRY_PROPERTIES` | `MOET2018-G3-GEO-P031-004` | multi-select geometry |
| 5 | `UNIT_CONVERSION` | `MOET2018-G5-GEO-P044-013` | unit-aware numeric input |
| 6 | `PERIMETER_AREA` | `MOET2018-G6-GEO-P051-003` | area model và word problem |
| 7 | `CHART_DATA_INTERPRETATION` | `MOET2018-G7-STA-P061-001` | chart/data response |
| 8 | `EXPERIMENTAL_PROBABILITY` | `MOET2018-G8-STA-P069-011` | experiment table/fraction |
| 3 | `APPLIED_TWO_STEP` | `MOET2018-G3-NUM-P030-013` | applied two-step problem |
| 9 | `DATA_ERROR_REASONING` | `MOET2018-G9-STA-P076-008` | error detection/reasoning |

## Diversity result

- Samples: 3.600 = 12 variants × 3 difficulties × 100 seeds.
- Exact duplicate rate: 0 ở cả 36 batch.
- Near-duplicate pair threshold: ≤ 0,12; observed maximum 0,0823.
- Dominant template threshold: ≤ 0,15; observed maximum 0,1067.
- Dominant answer threshold: ≤ 0,35; tất cả PASS.
- Deterministic replay: PASS.
- EASY/MEDIUM/HARD structural separation: PASS cho 12/12.

Chi tiết: `artifacts/generator-v2-vertical-slice/diversity.json` và `sample-index.json`. Đây là technical evidence cho slice, không phải bằng chứng rằng toàn bộ Grades 1–9 generator đã hoàn tất hoặc Owner đã chấp nhận usefulness.

## Browser acceptance

- Strategy: local Playwright, Chromium trực tiếp; in-app Browser không dùng.
- Playwright: 1.51.1.
- Browser: Chromium 150.0.7871.186.
- Viewports: 390×844 và 1280×800.
- Variants: 12/12.
- Screenshots: 60 ảnh thật.
- Render, correct submit, incorrect submit, feedback, next, refresh/resume và 12-question completion: PASS cho 12/12.
- Duplicate submit: idempotent PASS.
- Console errors: 0.
- Hydration errors: 0.
- Horizontal/math overflow: 0.
- Private leaks: 0.
- Ambiguous rendered question detected by acceptance: 0.
- Visual/prompt mismatch detected by acceptance: 0.
- Playwright web server và local Supabase audit stack đã được dừng sau kiểm tra.

Screenshots: `artifacts/generator-v2-vertical-slice/screenshots/`. `playwright-result.json` là machine-readable browser manifest.

## Visual issues phát hiện và đã sửa

- Trùng `main-content` ID.
- Place-value table mobile tràn 66px và cột đơn vị cuối không đọc được.
- Wrong-response fixture của multi-select không tạo response hợp lệ.
- Click sớm trong hydration làm mất hành động start.
- Matching options có React keys trùng ở linear-system variant.
- Full-page screenshot bị artifact do sticky header/stitched scrolling.
- Internal option IDs xuất hiện trong feedback sau submit.
- Addition visual không render object groups đúng shape.
- Catalog giữ scroll position cũ khi đổi variant.
- Namespace mới dùng nhầm prefix lịch sử dành cho một lớp; đã đổi question/session/cookie namespace sang V2 universal.

Contact sheets và ảnh gốc đã được mở ở original resolution. Không còn issue critical/high trong local preview sau vòng sửa cuối.

## Regression gates

| Gate | Kết quả |
|---|---|
| Generator V2 core + negative controls | 5/5 PASS |
| V2 diversity build | 3.600 samples, PASS |
| UI/navigation contracts | 13/13 PASS |
| Practice visual readability | 3/3 PASS |
| Practice regression | 550/550 PASS |
| Grades 1–9 curriculum | 9/9 PASS |
| Universal curriculum | 21/21 PASS |
| Competency/recommendation | 10/10 PASS |
| Parent/Teacher isolation | 14/14 PASS |
| On-demand API security | 6/6 PASS |
| 0041 persistence contracts | 7/7 PASS |
| Typecheck | PASS |
| Lint | PASS |
| Production build | PASS, 70 static pages generated; internal V2 route guarded |
| Local Chromium acceptance | PASS, 12 variants/60 screenshots |

## Exact blockers

1. `LOCAL_DB_0041_RPC_MISSING`: local migration ledger dừng ở 0038; `start_or_resume_semantic_generated_curriculum` không có.
2. `LOCAL_ACTIVE_RELEASE_UNAVAILABLE`: local DB có curriculum inventory nhưng 0 ACTIVE/ACTIVE release.
3. `REAL_STUDENT_DB_RUNTIME_NOT_VALIDATED`: 0041 adapter được contract-test nhưng chưa persist V2 snapshot qua database, resume database snapshot, hoặc chứng minh progress/history update đúng một lần trong authenticated Student runtime.
4. Sprint boundary cấm migration và thay active release, nên không được tự sửa hai precondition trên.
5. Owner manual review/product usefulness approval cho generated questions chưa diễn ra; Milestone 2 không thể hoàn tất từ technical gates.

## Files materially changed

- `lib/generation-v2/types.ts`
- `lib/generation-v2/registry.ts`
- `lib/generation-v2/generator.ts`
- `lib/generation-v2/persistence.ts`
- `lib/generation-v2/local-runtime.ts`
- `lib/generation-v2/index.ts`
- `app/internal/generator-v2/*`
- `app/api/internal/generator-v2/{start,state,answer}/route.ts`
- `scripts/build-generator-v2-vertical-slice.ts`
- `scripts/run-generator-v2-playwright.ts`
- `tests/generation-v2.test.ts`
- `package.json`
- `docs/architecture/PLAVE_GENERATOR_V2.md`
- `docs/status/SPRINT_8B_GENERATOR_V2_VERTICAL_SLICE.md`
- `docs/status/PLAVE_THREE_MILESTONE_ROADMAP.md`
- `artifacts/generator-v2-vertical-slice/*`

## Next implementation order

1. Khi được cấp quyền, dựng disposable/local database có 0041 và active fixture release, không đụng remote/active production data.
2. Persist V2 snapshot, resume từ DB, submit interaction-specific responses, verify idempotent progress/history và source provenance.
3. Nối một outcome slice vào real authenticated Student lesson/practice route dưới local-only flag.
4. Owner review representative questions/rendered feedback theo grade bands và domains.
5. Sau đó mới mở rộng registry theo canonical outcomes thật; không chạy theo số 59 legacy variants.

AI Tutor vẫn `NOT_STARTED` và ngoài phạm vi.
