# Final student experience acceptance — Toán Lớp 1–9

> **HISTORICAL / SUPERSEDED:** This local-draft acceptance snapshot is
> preserved as evidence. Current real-browser acceptance is in
> `docs/final/PLAVE_GRADES_1_9_LOCAL_ACCEPTANCE.md`.

Ngày kiểm tra: 2026-07-30
Phạm vi: local draft demo trong `PLAVE-PROJECT004`
Quyết định: **READY_FOR_LOCAL_DEMO_AND_SUBMISSION**

## Tóm tắt quyết định

Coverage và các contract kỹ thuật đã trở thành một luồng học có bài học, ví dụ,
luyện tập, phản hồi đúng/sai và lời giải sau submit. Bộ 779 test tuần tự,
validator, lint, typecheck và production build đều PASS. Mẫu phân tầng 18 chủ
đề/54 câu không còn lỗi BLOCKER hoặc HIGH về nội dung, phép tính, lời giải hay
solution boundary sau các sửa đổi trong lượt này.

Owner đã bổ sung runtime/browser evidence từ application chạy ngoài sandbox.
Các route bắt buộc trả HTTP 200, journey đại diện Lớp 1, 3, 5, 6, 7, 8, 9
PASS, mobile 360×800 và desktop usage được quan sát trực tiếp, console có 0 red
error. Responsive component contract vẫn PASS ở 360×800, 768×1024 và 1440×900.
Không còn acceptance blocker.

## Owner runtime evidence follow-up

Owner đã gửi runtime evidence thực tế cho Lớp 1, 3, 5, 6, 7, 8 và 9:

| Bằng chứng bắt buộc | Evidence | Trạng thái ghi nhận |
| --- | --- | --- |
| HTTP `/`, `/demo`, `/curriculum-preview`, `?grade=7` | `200`, `200`, `200`, `200` | OWNER_BROWSER_OBSERVED |
| Open unit, theory, worked examples, start | PASS | OWNER_BROWSER_OBSERVED |
| Incorrect submit và incorrect feedback | PASS | OWNER_BROWSER_OBSERVED |
| Solution appears after submit | PASS | OWNER_BROWSER_OBSERVED |
| Correct submit | PASS | OWNER_BROWSER_OBSERVED |
| Next/reset/exit/change grade | PASS | OWNER_BROWSER_OBSERVED |
| Lớp 1, 3, 5, 6, 7, 8, 9 mở được | PASS | OWNER_BROWSER_OBSERVED |
| Mobile 360×800 | PASS; không overflow, clipping, overlap hoặc unusable button | OWNER_BROWSER_OBSERVED |
| Normal desktop usage | PASS | OWNER_BROWSER_OBSERVED |
| 768×1024 | Responsive contract PASS | STATIC_COMPONENT_VALIDATED |
| 1440×900 | Responsive contract PASS; exact viewport không được báo riêng | STATIC_COMPONENT_VALIDATED |
| Console red errors | 0 | OWNER_BROWSER_OBSERVED |
| Server runtime | Next.js 16.2.12; ready 325 ms; không quan sát lỗi | OWNER_RUNTIME_OBSERVED |

Hydration error count, missing-asset count, keyboard navigation và network-level
solution preload không được Owner báo thành các phép đo riêng, nên không được
gắn nhãn browser-observed. Chúng vẫn có source/component/build/security evidence
PASS và không phải blocker theo acceptance evidence đã cung cấp.

## Baseline và invariants

| Hạng mục | Kết quả |
| --- | --- |
| Official outcome coverage | 546/546, 100%, PASS |
| Applicable domain coverage | 37/37; 3/40 ô có bằng chứng N/A, PASS |
| Preview registry | 171 chủ đề / 2.052 câu / 2.052 lời giải, PASS |
| Full sequential suite | 779/779 PASS |
| Grade 1 production | 13 units / 312 questions / 312 solutions, unchanged, PASS |
| Grade 1 regression | 550/550 PASS |
| Grade 2 | `DRAFT` / `HIDDEN`; không publish, không apply migration |
| Lint / typecheck / production build | PASS / PASS / PASS |
| Migration 0035 | `67bef151f4a8744c107835ce98ab5a5c30372cf76ff0328e02c1ca8649c7f206` |
| Migration 0036 | `d88b21c866c5d19708dc544faaa2c5828e3127844c50f0d7e76a3716c07fc6f1` |
| Migration 0037 | `91e2a4bb918bf894903f313d65d93bd80d8be98fad4fa2a1ca7c59cbbfe1b070` |

Ba checksum migration khớp chính xác baseline đã lưu. Không migration nào được
sửa hoặc chạy.

## Route và runtime smoke

| Route | Build/source result | HTTP/browser result |
| --- | --- | --- |
| `/` | Có trong production route manifest | 200, OWNER_RUNTIME_OBSERVED |
| `/demo` | Có trong production route manifest; có CTA tới preview | 200, OWNER_RUNTIME_OBSERVED |
| `/curriculum-preview` | Có trong production route manifest; server-rendered | 200, OWNER_RUNTIME_OBSERVED |
| `/api/curriculum-preview/check` | Có trong manifest; direct handler tests: 200/400/404 PASS | Journey POST PASS; exact HTTP status không được báo riêng |
| `/curriculum-preview?grade=7` | Cùng route server-rendered | 200, OWNER_RUNTIME_OBSERVED |

Runtime dùng Next.js 16.2.12 tại `http://127.0.0.1:3000`, ready trong 325 ms.
Owner không quan sát lỗi server runtime và browser console có 0 red error.
Hydration error và missing-asset count không được báo thành phép đo riêng;
production build vẫn loại trừ broken import và targeted journey hoạt động bình
thường.

Preview không dùng Supabase. Trang server đọc local curriculum registry; API
local chỉ kiểm tra câu thuộc đúng chủ đề. Production auth routes không bị thay
đổi hoặc nới lỏng.

## Student journey

Luồng đã có đủ các trạng thái và contract sau:

1. Chọn Lớp 1–9 và chọn chủ đề.
2. Đọc mục tiêu, lý thuyết và ví dụ từng bước.
3. Nhấn “Bắt đầu luyện tập”.
4. Submit đáp án qua POST local.
5. Nhận phản hồi chữ khác nhau cho đúng và sai.
6. Chỉ thấy đáp án/lời giải khi POST đã trả kết quả.
7. Chuyển câu, xem kết quả, làm lại, thoát chủ đề và đổi lớp.

Direct API/component tests xác nhận correct/incorrect result khác nhau, malformed
và cross-unit request fail closed, và không có solution trong public question
contract. Owner đã quan sát toàn bộ journey thực tế và mở thành công Lớp 1, 3,
5, 6, 7, 8, 9.

## Mẫu phân tầng 18 chủ đề / 54 câu

Mỗi hàng đã review theory, worked example, prompt, đáp án, feedback, solution,
visual contract, tiếng Việt và pre-submit boundary. Kết quả sau sửa là PASS cho
54/54 câu. Đây là review nội bộ về kỹ thuật và nội dung; không phải expert
pedagogical endorsement.

| Lớp | Exact unit ID | Exact question IDs | Trọng tâm | Kết quả |
| --- | --- | --- | --- | --- |
| 1 | `grade-1-numbers-to-10` | `grade-1-numbers-to-10-q01`, `grade-1-numbers-to-10-q05`, `grade-1-numbers-to-10-q09` | numbers, compare, addition | PASS |
| 1 | `grade-1-applied-problem-solving` | `grade-1-applied-problem-solving-q01`, `grade-1-applied-problem-solving-q05`, `grade-1-applied-problem-solving-q09` | applied problems | PASS |
| 2 | `grade-2-time-calendar-money-p0` | `grade-2-time-calendar-money-p0-q01`, `grade-2-time-calendar-money-p0-q02`, `grade-2-time-calendar-money-p0-q03` | time, measurement | PASS |
| 2 | `grade-2-data-and-chance` | `grade-2-data-and-chance-q01`, `grade-2-data-and-chance-q05`, `grade-2-data-and-chance-q06` | charts/data | PASS |
| 3 | `grade-3-unit-fractions` | `grade-3-unit-fractions-q01`, `grade-3-unit-fractions-q05`, `grade-3-unit-fractions-q09` | fractions | PASS |
| 3 | `grade-3-data-and-probability` | `grade-3-data-and-probability-q01`, `grade-3-data-and-probability-q05`, `grade-3-data-and-probability-q06` | data display | PASS |
| 4 | `grade-4-fraction-reasoning-p1` | `grade-4-fraction-reasoning-p1-q01`, `grade-4-fraction-reasoning-p1-q05`, `grade-4-fraction-reasoning-p1-q09` | fraction reasoning | PASS |
| 4 | `grade-4-angle-reasoning` | `grade-4-angle-reasoning-q01`, `grade-4-angle-reasoning-q05`, `grade-4-angle-reasoning-q09` | angles, measurement | PASS |
| 5 | `grade-5-decimal-operations` | `grade-5-decimal-operations-q01`, `grade-5-decimal-operations-q05`, `grade-5-decimal-operations-q09` | decimals | PASS |
| 5 | `grade-5-volume-area-nets-p1` | `grade-5-volume-area-nets-p1-q01`, `grade-5-volume-area-nets-p1-q06`, `grade-5-volume-area-nets-p1-q10` | right angle, volume, solid net | PASS |
| 6 | `grade-6-integer-operations` | `grade-6-integer-operations-q01`, `grade-6-integer-operations-q05`, `grade-6-integer-operations-q09` | negative numbers, integer operations | PASS |
| 6 | `grade-6-finance-interdisciplinary-p1` | `grade-6-finance-interdisciplinary-p1-q01`, `grade-6-finance-interdisciplinary-p1-q05`, `grade-6-finance-interdisciplinary-p1-q10` | finance, modelling, solid volume | PASS |
| 7 | `grade-7-secondary-geo-p1-8` | `grade-7-secondary-geo-p1-8-q10`, `grade-7-secondary-geo-p1-8-q11`, `grade-7-secondary-geo-p1-8-q12` | proof, vertical angles | PASS |
| 7 | `grade-7-data-and-probability` | `grade-7-data-and-probability-q01`, `grade-7-data-and-probability-q05`, `grade-7-data-and-probability-q09` | charts, experimental probability | PASS |
| 8 | `grade-8-linear-equations` | `grade-8-linear-equations-q01`, `grade-8-linear-equations-q05`, `grade-8-linear-equations-q09` | equations, modelling | PASS |
| 8 | `grade-8-pythagorean-reasoning` | `grade-8-pythagorean-reasoning-q01`, `grade-8-pythagorean-reasoning-q05`, `grade-8-pythagorean-reasoning-q09` | geometry, Pythagorean reasoning | PASS |
| 9 | `grade-9-quadratic-functions` | `grade-9-quadratic-functions-q01`, `grade-9-quadratic-functions-q05`, `grade-9-quadratic-functions-q09` | roots, quadratic function, coordinates | PASS |
| 9 | `grade-9-data-and-probability` | `grade-9-data-and-probability-q01`, `grade-9-data-and-probability-q05`, `grade-9-data-and-probability-q09` | frequency, probability | PASS |

Mẫu bao phủ Numbers, Algebra, Geometry, Measurement,
Statistics/Probability, Applied Problem Solving, proof, modelling, financial
context, fractions, decimals, negative numbers, equations, solids, charts và
probability. Các chủ đề rủi ro cao Lớp 7–9 nằm trong sáu hàng cuối.

## Responsive UI

CSS/component contract có breakpoint, grid co giãn, `min-width: 0`, action
wrapping, button tối thiểu 44–48 px, visual có `viewBox`,
`preserveAspectRatio`, text wrapping và reduced-motion override. Targeted visual
tests PASS.

| Viewport | Static/component result | Browser result |
| --- | --- | --- |
| 360 × 800 | PASS contract | OWNER_BROWSER_OBSERVED: PASS |
| 768 × 1024 | PASS contract | STATIC_COMPONENT_VALIDATED |
| 1440 × 900 | PASS contract | STATIC_COMPONENT_VALIDATED; normal desktop usage OWNER_BROWSER_OBSERVED |

Các trạng thái grade selection, unit list, theory, example, question, visual,
feedback và solution đều có markup/style tương ứng. Owner trực tiếp xác nhận
360×800 không có page overflow, clipping, overlap hoặc unusable button. Tablet
768×1024 và exact desktop 1440×900 giữ đúng nhãn
`STATIC_COMPONENT_VALIDATED`; normal desktop usage được Owner quan sát và PASS.

## Accessibility

Đã xác nhận trong source/component tests:

- heading và section hierarchy có nhãn;
- grade picker và footer là navigation có accessible name;
- radio options nằm trong `fieldset`/`legend`;
- text input có label;
- button có tên rõ;
- feedback có nội dung chữ “Chính xác” hoặc “Mình cùng sửa”, không chỉ dùng màu;
- lỗi dùng `role="alert"`, feedback dùng `role="status"` và nhận focus;
- visual dùng `figure role="img"` với accessible description; SVG nội bộ bị ẩn
  để tránh đọc lặp;
- focus-visible và reduced-motion có style;
- touch target đạt tối thiểu 44 px trong preview.

Keyboard order, screen-reader announcement và computed color contrast không được
Owner báo thành phép đo browser riêng. Source/component contract cho form label,
focus-visible, textual feedback và accessible visual vẫn PASS. Đây không phải
WCAG certification.

## Performance và solution boundary

| Kiểm tra | Kết quả |
| --- | --- |
| Preview client-specific JS chunk | 12.764 bytes |
| Câu gửi cho một chủ đề | 12 câu, khoảng 6.014 bytes ở mẫu Lớp 9 |
| Nếu serialize toàn bộ 2.052 câu | khoảng 1.335.974 bytes; không được gửi |
| Mean generation của một unit, local process | khoảng 0,052 ms/100-run average |
| Generate toàn bộ 171 units, local process | khoảng 49,301 ms |
| Question IDs trong client-specific static chunk | 0 |
| `solutionSteps` trong client-specific static chunk | không có |
| Registry/engine client import | không có |

`page.tsx` là server component. Nó chọn một lớp, một unit và chỉ truyền 12 public
questions vào client runner. `solutions` và `audits` không được truyền. POST
`/api/curriculum-preview/check` gọi engine phía server và trả `correct`,
`correctAnswer`, `steps`, `feedback` sau submit với `Cache-Control: no-store`.
Không có GET solution endpoint. Đây là solution boundary PASS.

## Findings và fixes

Đã sửa trong lượt này:

- loại thuật ngữ kỹ thuật khỏi student UI; thêm nhãn domain tiếng Việt, mục tiêu
  học, trạng thái đang học, empty state và CTA rõ;
- thêm explicit start, reset, exit, completion và đổi chủ đề/lớp;
- thêm form semantics, focus sau submit/chuyển câu, feedback bằng chữ và
  reduced-motion-compatible UI;
- sửa fraction bar, counter grouping, number line, ratio/finance table, area
  model, data display, coordinate point và visual descriptions;
- sửa nội dung applied Lớp 1, ví dụ chứng minh Lớp 7, tiêu đề bị cắt giữa từ và
  prefix ví dụ thiếu tự nhiên;
- giữ solution registry ở server và thêm tests chống leak;
- thêm CTA từ `/demo` tới `/curriculum-preview`;
- thêm safe-area bottom padding, mobile section spacing và giới hạn
  `max-width: 100%` cho preview content/visual;
- giữ SVG legible trong canvas cuộn nội bộ, không tạo horizontal page scroll;
- làm mobile primary/card actions full-width khi phù hợp, tách next/reset/exit
  thành từng hàng và tăng spacing feedback/solution;
- hiển thị focus rõ trên toàn radio option và giữ touch target 44–48 px;
- tăng responsive test cho fixed-width guard, visual max-width, touch target,
  grade wrapping, long-text wrapping, action layout, focus, feedback và
  safe-area padding.

Open product findings: BLOCKER 0, HIGH 0, MEDIUM 0.
Open acceptance/environment findings: BLOCKER 0, HIGH 0, MEDIUM 0.

## Regression evidence

- Targeted responsive/component/API tests: 15/15 PASS.
- Curriculum/API suite: 9/9 PASS.
- Official outcome validator: 546/546 PASS.
- Applicable taxonomy: 37/37 PASS.
- Full sequential suite: 779/779 PASS.
- Grade 1 regression: 550/550 PASS.
- Grade 1 production validator: 13/312/312 PASS.
- Frozen Grade 2 tests: 7/7 PASS.
- Frozen Grade 2 validator: PASS, `DRAFT` / `HIDDEN`.
- Lint: PASS.
- Typecheck: PASS.
- Next.js production build: PASS.
- Solution leak scans: PASS.
- Migration checksum verification: PASS.

## Quyết định cuối

Owner runtime/mobile/desktop evidence, static responsive contract, closed
solution boundary và toàn bộ regression gates đáp ứng điều kiện acceptance.
`submissionDecision` là `READY_FOR_LOCAL_DEMO_AND_SUBMISSION`.
