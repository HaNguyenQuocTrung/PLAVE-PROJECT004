# SPRINT 8A — Generator product audit

Ngày audit: 2026-08-01  
Phạm vi: PLAVE Toán lớp 1–9  
Kết luận: generator hiện tại **chưa hoàn chỉnh và chưa usable trong sản phẩm**.

## Kết luận chính

- 3.540 mẫu được tạo: 59 semantic variants × 3 mức độ × 20 seed.
- 0/3.540 mẫu đạt toàn bộ tiêu chí production-usable.
- 300/3.540 stem có thể giải đúng nếu xem riêng lẻ. Con số này không phải bằng chứng sản phẩm usable vì các stem vẫn lặp template, phân tầng độ khó yếu và dùng lời giải chung chung.
- Chỉ 50/59 variants có outcome thật mà runtime có thể chọn. 9 variants còn lại chỉ có synthetic proof.
- Luồng Student mặc định không dùng semantic generator: lớp 1 dùng bank cũ; lớp 2–9 dùng frozen materialized release.
- POST start thật trong local Chromium trả `503 RUNTIME_DISABLED` trước khi generator chạy. Vì vậy persistence, resume, history và progress của semantic runtime chưa được xác nhận bằng hành trình Student thật trong môi trường local hiện tại.
- Structural/unit tests vẫn PASS. Phần lớn các test đó kiểm tra generator cũ, self-consistency, schema/persistence contract hoặc contract tổng hợp; chúng không đo tính hữu ích của câu hỏi render thật.

## Runtime pipeline đã xác minh

```text
Student /lessons
├─ Lớp 1 mặc định
│  └─ /api/practice/start
│     └─ start_or_resume_practice
│        └─ static question bank
│           └─ /practice/[attemptId]
│
├─ Lớp 2–9 mặc định
│  └─ /api/curriculum-runtime/start
│     └─ start_or_resume_curriculum_unit
│        └─ frozen materialized release
│           └─ /curriculum-practice/[attemptId]
│
└─ CTA pilot đủ điều kiện (không phải luồng mặc định)
   └─ /api/on-demand-curriculum/start
      └─ runtime flags + Student eligibility
         └─ load progress
            └─ select recommendation/outcome
               └─ derive semantic variant
                  └─ generate AST
                     └─ solve + self-alignment validation
                        └─ immutable signed snapshot
                           └─ start_or_resume_semantic_generated_curriculum
                              └─ /on-demand-practice/[attemptId]
                                 └─ UniversalCurriculumRunner + CurriculumVisual

Submit
└─ /api/on-demand-curriculum/answer
   └─ submit_generated_curriculum_answer
      ├─ feedback chỉ sau submit
      ├─ generated evidence/progress/history
      └─ state/resume
```

Phần từ snapshot đến progress/history có code và SQL contract. Nó chưa được browser-verify end-to-end trong Sprint 8A vì start thật dừng tại feature flag và local database không có active release/semantic RPC 0041. Không migration hoặc activation nào được thực hiện để vượt qua boundary này.

## Vì sao các proof trước đây gây hiểu lầm

Có hai pipeline khác nhau:

1. `generateOnDemandAttemptSnapshot` trong `lib/curriculum/on-demand-generation.ts` dùng preview/template bank cũ. `tests/on-demand-generation.test.ts`, `tests/on-demand-pedagogical-quality.test.ts` và phần recompute của `scripts/run-learning-product-local-acceptance.ts` tập trung vào pipeline này.
2. Runtime mới gọi `generateSemanticPilotAttemptSnapshot` trong `lib/curriculum/semantic-pilot-generation.ts`.

Test SHADOW duyệt 546 outcome thật, nhưng chỉ kiểm tra rằng variant sinh ra nằm trong registry. Sau đó test tạo contract tổng hợp cho từng item trong registry 59 variants bằng cách override `expectedVariant`. Nó không assert rằng outcome thật phủ đủ 59 variants. Kết quả thực tế chỉ là 50.

## Kết quả theo lớp

| Lớp | Mẫu từ outcome thật | Variants | Stem giải được riêng lẻ | Production-usable |
|---:|---:|---:|---:|---:|
| 1 | 600 | 10 | 60 | 0 |
| 2 | 540 | 9 | 60 | 0 |
| 3 | 600 | 10 | 0 | 0 |
| 4 | 360 | 6 | 60 | 0 |
| 5 | 180 | 3 | 0 | 0 |
| 6 | 180 | 3 | 0 | 0 |
| 7 | 120 | 2 | 0 | 0 |
| 8 | 180 | 3 | 60 | 0 |
| 9 | 240 | 4 | 60 | 0 |

540 mẫu còn lại thuộc 9 variants proof-only, không có lớp/outcome/unit thật.

## Kết quả theo semantic variant

Không có variant nào production-ready. Chi tiết định lượng cho từng variant nằm trong `artifacts/generator-product-audit/diversity-analysis.json`; mỗi failure có file riêng trong `artifacts/generator-product-audit/failure-cases/` với route, file, function và exact deterministic reproduction seed.

28 variants CRITICAL:

`INTEGER_OPERATIONS`, `FRACTION_RECOGNITION`, `FRACTION_EQUIVALENCE`, `FRACTION_COMPARISON`, `FRACTION_OPERATIONS`, `DECIMAL_REPRESENTATION`, `DECIMAL_COMPARISON`, `DECIMAL_OPERATIONS`, `RATIO`, `PERCENTAGE`, `EXPRESSION_CONSTRUCTION`, `RELATION_INTERPRETATION`, `SHAPE_PROPERTIES`, `ANGLE`, `COORDINATE`, `GEOMETRIC_CONSTRUCTION`, `GEOMETRIC_RELATION`, `THEOREM_APPLICATION`, `SPATIAL_REASONING`, `EXPERIMENTAL_PROBABILITY`, `THEORETICAL_PROBABILITY`, `SAMPLE_SPACE`, `MULTI_STEP_CONTEXT`, `INFORMATION_SELECTION`, `INSUFFICIENT_INFORMATION`, `ERROR_DETECTION`, `MATHEMATICAL_MODELING`, `REPRESENTATION_CONSTRUCTION`.

31 variants HIGH:

`PLACE_VALUE`, `NUMBER_REPRESENTATION`, `NUMBER_COMPARISON`, `NUMBER_ORDERING`, `ADDITION_SUBTRACTION`, `MULTIPLICATION_DIVISION`, `DIVISIBILITY`, `POWER_ROOT`, `NUMERICAL_EXPRESSION`, `MISSING_VALUE`, `SUBSTITUTION`, `LIKE_TERM_COMBINATION`, `ALGEBRAIC_TRANSFORMATION`, `EQUATION_SOLVING`, `INEQUALITY_SOLVING`, `SEQUENCE_RULE`, `FUNCTION_INPUT_OUTPUT`, `DIRECT_MEASUREMENT`, `UNIT_CONVERSION`, `TIME_MONEY`, `PERIMETER`, `AREA`, `VOLUME`, `TABLE_INTERPRETATION`, `CHART_INTERPRETATION`, `FREQUENCY`, `RELATIVE_FREQUENCY`, `CENTRAL_TENDENCY`, `DATA_COMPARISON`, `ONE_STEP_CONTEXT`, `EXPLANATION_REASONING`.

9 variants không có outcome thật để runtime chọn:

`EXPRESSION_CONSTRUCTION`, `RELATION_INTERPRETATION`, `COORDINATE`, `MULTI_STEP_CONTEXT`, `INFORMATION_SELECTION`, `INSUFFICIENT_INFORMATION`, `ERROR_DETECTION`, `MATHEMATICAL_MODELING`, `REPRESENTATION_CONSTRUCTION`.

## Root causes

### CRITICAL — runtime không nối với sản phẩm mặc định

- `/lessons` không đưa semantic generator vào luồng chính.
- CTA chỉ xuất hiện cho cấu hình pilot đủ điều kiện.
- Local POST thật trả `RUNTIME_DISABLED`.
- Local database có 171 unit và 2.052 release questions nhưng 0 active release; semantic start RPC 0041 không có trong local schema hiện tại.

Phân loại: `RUNTIME_DISCONNECTED`, `FEATURE_FLAG_BLOCKED`, `STATIC_BANK_STILL_USED`.

### CRITICAL — mapping bằng substring regex chọn sai AST

`generateVariantAst` dùng regex rộng theo thứ tự:

- `INTEGER_OPERATIONS` chứa substring `RATIO` trong `OPERATIONS`, nên vào nhánh `RATIONAL` trước nhánh integer.
- `GEOMETRIC_RELATION` chứa `RELATION`, nên vào nhánh `ALGEBRA` trước nhánh geometry.

Kết quả render thật:

- Lớp 6 integer operations trở thành phép toán với `14/10` và `14/100`.
- Lớp 2 geometric relation trở thành biểu thức `2x + 12, x = 27`.

Phân loại: `FAMILY_MAPPING_WRONG`, `OUTCOME_ALIGNMENT_WRONG`.

### CRITICAL — validation tự nhất quán nhưng không chứng minh toán học

`validateOutcomeSemanticAlignment` chủ yếu kiểm tra variant/family/solver ID lặp lại giữa contract, AST và solver receipt. Nó không kiểm tra rằng:

- prompt hỏi đúng phép toán;
- mọi input solver có xuất hiện trong prompt/visual;
- answer phù hợp evidence form của outcome;
- đơn vị và giả thiết đầy đủ;
- độ khó phù hợp lớp;
- distractor phản ánh misconception.

Vì vậy câu sai nghĩa vẫn PASS structural validation.

### CRITICAL/HIGH — prompt và solver không cùng bài toán

Các family handler dùng câu khung “Thực hiện yêu cầu …” rồi solver âm thầm chọn phép cộng, max, mean hoặc trả tên variant.

Ví dụ:

- Fraction recognition 7/3 và 5/7 có đáp án 3.0476 vì solver cộng hai phân số.
- Probability dùng favorable/total không hề xuất hiện trong prompt/visual.
- Shape/angle có thể trả thẳng tên semantic variant.
- Central tendency luôn tính mean dù prompt nói mean/median/mode.
- Explanation reasoning yêu cầu chọn chính câu mô tả outcome curriculum.

Phân loại: `INVALID_OR_AMBIGUOUS_QUESTION`, `OUTCOME_ALIGNMENT_WRONG`, `GRADE_LEVEL_WRONG`, `LANGUAGE_QUALITY`.

### HIGH — diversity và difficulty không có ý nghĩa sản phẩm

- Near-duplicate pair rate: 100% ở cả 59 variants.
- Mỗi variant chỉ có 1–2 normalized templates trên 60 mẫu.
- Dominant template trung bình: 91.5%.
- Linguistic template diversity trung bình: 2.1%.
- Exact duplicate rate trung bình: 18.2%.
- EASY/MEDIUM/HARD chủ yếu tăng số lượng operand/giá trị; template và visual không đổi.
- Distractor template diversity trung bình: 0.7%; đa số là đáp án ± complexity.

Phân loại: `LOW_VARIATION`, `DIFFICULTY_NOT_MEANINGFUL`, `WEAK_DISTRACTORS`.

### HIGH — visual và answer type

- 2.460/3.000 runtime samples là `TEXT_ONLY`.
- 3.000/3.000 là `MULTIPLE_CHOICE`; semantic generator không sinh numeric/text input.
- Area render hình chữ nhật 38×12 nhưng prompt thêm số 2 không có vai trò và đáp án thiếu cm².
- Chart dùng nhãn “Mục 1–5” và không hỏi đại lượng cần đọc.
- Một visual có thể đẹp về CSS nhưng sai semantic.

Phân loại: `VISUAL_MISSING_OR_INCORRECT`, `UI_RENDERING_ERROR`.

### HIGH — feedback không dạy toán

3.000 runtime samples dùng đúng một feedback sentence. Bốn solution templates chỉ khác ký tự A/B/C/D. Correct và incorrect feedback có cùng nội dung khái quát, không giải thích phép toán và không xử lý misconception.

Phân loại: `FEEDBACK_OR_EXPLANATION_WEAK`.

## Browser evidence

- Playwright: `playwright-core` 1.51.1.
- Browser: Chromium 150.0.7871.186.
- Viewports: 390×844 và 1280×800.
- Exact production renderer: `UniversalCurriculumRunner` + `CurriculumVisual`.
- Overflow trang/card/visual: 0.
- Hydration error: 0.
- Uncaught page error: 0.
- Private feedback/solution/technical field trước submit: không thấy trong DOM.
- Duplicate-submit UI probe: một request.
- Touch target: PASS cho mọi control visible. Lượt diagnostic đầu đã tính nhầm nút mobile menu đang ẩn 0×0; selector đã được sửa để loại phần tử không visible.
- Skip link vẫn hiện trong ảnh correct/incorrect khi feedback nhận focus; đây là `UI_RENDERING_ERROR` mức MEDIUM cần xử lý cùng practice UX ở Sprint 8B.

Feedback screenshots dùng API-shaped local stub để kiểm tra component sau submit. Chúng không được dùng làm bằng chứng database persistence. Actual runtime start được gọi riêng và trả `RUNTIME_DISABLED`.

Đã mở và kiểm tra 12 ảnh ở độ phân giải gốc. Chi tiết: `artifacts/generator-product-audit/visual-review.json`.

## Screenshots

- `text-question-desktop.png`
- `multiple-choice-mobile.png`
- `numeric-input-static-bank.png` — đối chứng renderer, không phải semantic output
- `fraction-question.png`
- `algebra-question.png`
- `geometry-visual.png`
- `chart-statistics.png`
- `correct-feedback.png`
- `incorrect-feedback.png`
- `result-summary.png`
- `empty-state.png`
- `error-recovery.png`

Tất cả nằm tại `artifacts/generator-product-audit/screenshots/`.

## Security/private-solution boundary

Boundary hiện tại có nền tảng tốt:

- public pre-submit payload không chứa correct answer/solution steps;
- private solutions được lưu dưới schema private trong contract 0040;
- submit correctness được giao cho authenticated database RPC;
- browser diagnostic không thấy UUID, email, answer/solution metadata hoặc technical generator fields trước submit.

Điều này chỉ chứng minh boundary, không chứng minh câu hỏi đúng hoặc hữu ích.

## Tests

| Gate | Result | Ý nghĩa |
|---|---|---|
| Generator product diagnostic | PASS | 3.540 mẫu đã generate và được phân loại; 0 usable |
| Generation V1 | 4/4 PASS | Determinism/shape của pipeline cũ |
| Legacy on-demand generation | 9/9 PASS | Chủ yếu `generateOnDemandAttemptSnapshot` cũ |
| Legacy on-demand pedagogy | 2/2 PASS | Không audit semantic runtime hiện tại |
| Generated persistence contract | 7/7 PASS | SQL/schema contract |
| Semantic SHADOW proof | 1/1 PASS | Self-consistency + synthetic variants |
| On-demand API security | 6/6 PASS | Request/private boundary |
| Universal curriculum | 21/21 PASS | Frozen release/runtime contract |
| Typecheck | PASS | — |
| Lint | PASS | — |
| Production build | PASS | 67 static pages generated |
| Local Playwright | PASS_WITH_RUNTIME_BLOCKED | 12 ảnh; actual start 503 |

## Sprint 8B — thứ tự implementation đề xuất

1. Chốt rubric production-quality và reviewer fixtures theo grade/domain/variant.
2. Chọn một canonical runtime generator; xóa hoặc quarantine rõ pipeline cũ khỏi acceptance.
3. Thay regex substring bằng exhaustive typed handler và explicit outcome-to-variant mapping.
4. Tạo independent mathematical validators: đủ dữ kiện, nghiệm duy nhất, unit, grade bounds, evidence form.
5. Viết template/context families thật; difficulty thay đổi reasoning depth chứ không chỉ đổi số.
6. Tạo distractor theo misconception và dùng đúng answer policy: MC/numeric/text.
7. Tạo semantic visual contracts cho fraction, number line, geometry, measurement, table/chart và probability.
8. Sinh lời giải tiếng Việt theo AST/solver thật, không lộ trước submit.
9. Chạy canonical generator trên disposable local runtime đã migrate/seed đúng; verify start, submit, duplicate, reconnect, resume, completion, history và progress bằng Chromium.
10. Manual review đại diện Grades 1–9 và Owner review trước mọi quyết định enable rộng hơn.

## Exact blockers còn lại

- Actual semantic Student journey không thể qua start khi runtime flag đang OFF.
- Local database hiện không có ACTIVE/ACTIVE release và không có semantic RPC 0041.
- Sprint 8A không được migrate/activate để vượt boundary này.
- Không có semantic variant nào đủ điều kiện production-ready.

Audit vẫn hoàn tất vì các blocker đã được khoanh chính xác; Sprint 8B phải giải quyết trong disposable local infrastructure trước khi có bất kỳ claim runtime nào.

## Files cần sửa trong Sprint 8B

- `lib/generation-semantic/variant-engine.ts`
- `lib/curriculum/semantic-pilot-generation.ts`
- `lib/curriculum/on-demand-runtime.ts`
- `lib/curriculum/on-demand-generation.ts`
- `lib/generation-semantic/remote-shadow.ts`
- `tests/generated-practice-shadow-proof.test.ts`
- `tests/on-demand-generation.test.ts`
- `tests/on-demand-pedagogical-quality.test.ts`
- `scripts/run-learning-product-local-acceptance.ts`
- `app/curriculum-practice/[attemptId]/UniversalCurriculumRunner.tsx`
- `app/curriculum-preview/CurriculumVisual.tsx`
- `app/globals.css`

## Artifacts

- Machine report: `artifacts/generator-product-audit/report.json`
- Sample index: `artifacts/generator-product-audit/sample-index.json`
- Per-variant diversity: `artifacts/generator-product-audit/diversity-analysis.json`
- Failure cases: `artifacts/generator-product-audit/failure-cases/`
- Playwright result: `artifacts/generator-product-audit/playwright-result.json`
- Screenshot review: `artifacts/generator-product-audit/visual-review.json`

Không remote mutation, migration, publication, activation, deploy, runtime enablement, Git mutation hoặc AI Tutor work được thực hiện.
