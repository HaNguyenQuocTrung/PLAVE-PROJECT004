# Blueprint unit Toán Lớp 2

- Trạng thái: đề xuất để owner quyết định
- Outcome source: [GRADE2_OUTCOME_MATRIX.md](./GRADE2_OUTCOME_MATRIX.md)
- Dependency/release:
  [GRADE2_DEPENDENCY_AND_RELEASE_PLAN.md](./GRADE2_DEPENDENCY_AND_RELEASE_PLAN.md)
- Batch/skill-family readiness:
  [GRADE2_BATCH_CONTENT_BLUEPRINT.md](./GRADE2_BATCH_CONTENT_BLUEPRINT.md)
- Typed engine contract:
  [VERTICAL_MATH_SKILL_ENGINE.md](./VERTICAL_MATH_SKILL_ENGINE.md)

## 1. Nguyên tắc

`TECHNICAL_DECOMPOSITION` — danh sách dưới đây là cách PLAVE có thể đóng gói
outcome thành unit có thể kiểm thử. Bộ GDĐT không quy định các slug, số unit,
thứ tự release hoặc 24 câu/unit.

`PRODUCT_DECISION` — các prerequisite kỹ thuật chỉ được chốt sau khi Owner
duyệt. Optional expert evidence có thể hỗ trợ progression. “Thứ tự hiển thị”
không tự động trở thành prerequisite.

Mọi unit bên dưới bắt đầu ở `DRAFT`. Official-source validation, technical
validation và Owner decision là các gate độc lập; expert review là evidence
tùy chọn theo
[policy mới](./OFFICIAL_SOURCE_PEDAGOGICAL_VALIDATION_POLICY.md).

## 2. Danh sách unit đề xuất

| # | Unit / slug dự kiến | Outcome và mục tiêu | Prerequisite đề xuất | Câu hỏi / visual | Misconception chính | Điều kiện publication |
|---:|---|---|---|---|---|---|
| 1 | **Các số trong phạm vi 1000** — `grade-2-numbers-to-1000` | `G2-NUM-01`; đọc, viết, cấu tạo trăm–chục–đơn vị, liền trước/sau, tia số | Kiến thức: số đến 100; kỹ thuật: Student đã ở Grade 2, không bắt buộc 13/13 Lớp 1 | MCQ, NUMBER_INPUT; khối giá trị hàng/tia số allowlisted | Bỏ qua chữ số 0; đảo hàng | Source manifest, numeric boundary, distractor và visual validator pass; Owner action riêng |
| 2 | **So sánh, sắp xếp và ước lượng đến 1000** — `grade-2-compare-order-estimate-to-1000` | `G2-NUM-02`; so sánh, nhóm tối đa 4 số, ước lượng theo chục | Kiến thức: unit 1 | MCQ, NUMBER_INPUT; tia số/nhóm vật | So sánh từ hàng đơn vị trước; ước lượng không có chuẩn | Miền đáp án duy nhất; rubric ước lượng được teacher duyệt |
| 3 | **Cộng và trừ trong phạm vi 100** — `grade-2-add-subtract-within-100` | Một lát cắt `G2-ARITH-01`; củng cố nhẩm và thành phần phép tính | Kiến thức: unit 1; đây là decomposition bảo thủ | MCQ, NUMBER_INPUT; khối chục–đơn vị | Lẫn số hạng/tổng, số bị trừ/số trừ/hiệu | Ranh giới nhớ/mượn và difficulty được teacher duyệt |
| 4 | **Cộng và trừ trong phạm vi 1000** — `grade-2-add-subtract-within-1000` | Phần còn lại của `G2-ARITH-01`; đặt/tính phù hợp phạm vi chính thức | Kiến thức: unit 1 và unit 3 | MCQ, NUMBER_INPUT; bảng giá trị hàng | Nhớ/mượn sai hàng; quên chữ số 0 | Validator toán học chứng minh phạm vi và số lượt nhớ/mượn |
| 5 | **Hai phép tính cộng và trừ** — `grade-2-two-add-subtract-operations` | `G2-ARITH-02`; tính hai dấu từ trái sang phải | Kiến thức: unit 4 | MCQ, NUMBER_INPUT; thanh bước tính | Cộng/trừ theo ưu tiên tự đặt; bỏ bước giữa | Không đưa ngoặc/dạng nhiều hơn hai dấu khi chưa được duyệt |
| 6 | **Ý nghĩa phép nhân và phép chia** — `grade-2-multiplication-division-meaning` | `G2-MULDIV-01`; nhóm bằng nhau, cộng lặp, chia đều, thành phần phép tính | Kiến thức: số và cộng/trừ cơ bản; có thể là nhánh song song sau unit 1/3 | MCQ, NUMBER_INPUT; nhóm vật/mảng | Nhóm không đều; đổi số nhóm và số phần tử | Mọi visual có mô tả số nhóm/phần tử, không lộ đáp án |
| 7 | **Bảng nhân và bảng chia** — `grade-2-multiplication-division-tables` | `G2-MULDIV-02`; vận dụng các bảng thuộc outcome đầy đủ | Kiến thức: unit 6 | MCQ, NUMBER_INPUT; mảng hàng/cột | Học thuộc không hiểu; lẫn nhân/chia | `PRODUCT_DECISION_REQUIRED`: chốt cách chia bảng và progression trước khi seed |
| 8 | **Bài toán một bước Lớp 2** — `grade-2-one-step-operation-problems` | `G2-PROBLEM-01`; chọn đúng một trong bốn phép tính | Nhiều kiến thức: unit 4 và unit 7; schema single-prerequisite hiện chưa biểu diễn đủ | MCQ, NUMBER_INPUT; sơ đồ phần–tổng/nhóm | Dữ kiện thừa; chọn phép tính theo từ khóa | Chỉ release sau khi mô hình multi-prerequisite hoặc tách unit theo phép tính |
| 9 | **Điểm, đường và hình tứ giác** — `grade-2-points-lines-quadrilaterals` | `G2-GEO-01` và phần phẳng của `G2-GEO-02` | Kiến thức: hình học Lớp 1; không cần khóa sau chuỗi nhân/chia | MCQ, NUMBER_INPUT đếm; SVG typed | Lẫn đoạn/đường; xem mọi hình nghiêng là hình khác | Visual geometry validator và screen-reader description pass |
| 10 | **Khối trụ, khối cầu và tạo hình** — `grade-2-cylinder-sphere-shape-building` | Phần khối/tạo hình của `G2-GEO-02` | Kiến thức: khối Lớp 1; có thể là nhánh song song | MCQ, NUMBER_INPUT đếm rõ | Phối cảnh che khuất; phân loại bằng màu | Không có khối ẩn; visual được teacher kiểm tra |
| 11 | **Độ dài, khối lượng và dung tích** — `grade-2-length-mass-capacity` | `G2-MEAS-01`; nhận biết, đo, ước lượng và dùng đại lượng trong phạm vi đã duyệt | Kiến thức: unit 1; đo độ dài Lớp 1 | MCQ, NUMBER_INPUT; thước/cân/bình schematic | Đọc sai vạch; trộn đại lượng/đơn vị | `PRODUCT_DECISION_REQUIRED`: chốt danh sách đơn vị và quan hệ cho slice |
| 12 | **Thời gian và lịch Lớp 2** — `grade-2-time-and-calendar` | `G2-TIME-01`; quan hệ thời gian, đồng hồ và lịch ở phạm vi chính thức | Kiến thức: thời gian/lịch Lớp 1; có thể release độc lập sau grade transition | MCQ, NUMBER_INPUT; analog clock/calendar | Lẫn kim; vượt tháng; tính khoảng nhiều bước | Clock/calendar validator khớp đáp án và source boundary |
| 13 | **Tiền Việt Nam** — `grade-2-vietnamese-money` | `G2-MONEY-01`; nhận biết giá trị qua hình ảnh/chữ số | Kiến thức: đọc số; prerequisite kỹ thuật chưa chốt | Chủ yếu MCQ; money card schematic | Dựa màu/kích thước; tự suy mệnh giá | Danh sách mệnh giá, dạng bài và visual pháp lý cần source/Owner decision; expert evidence tùy chọn |
| 14 | **Dữ liệu và biểu đồ tranh** — `grade-2-data-and-pictographs` | `G2-STATS-01`; thu thập, kiểm đếm, đọc/mô tả và nhận xét đơn giản | Kiến thức: đếm/so sánh; không cần chuỗi số học đầy đủ | MCQ, NUMBER_INPUT; pictograph typed | Bỏ qua chú giải; câu nhận xét có nhiều đáp án | Scale/chú giải rõ; mỗi câu có đáp án duy nhất |
| 15 | **Có thể, chắc chắn, không thể** — `grade-2-possible-certain-impossible` | `G2-PROB-01`; mô tả khả năng ở tình huống đơn giản | Ngôn ngữ và đếm cơ bản; nhánh độc lập | MCQ; visual tập kết quả | Nhầm ít khả năng với không thể | Không đưa xác suất số; tình huống được teacher kiểm tra |

## 3. Dependency không tuyến tính

Các domain hình học, thời gian, dữ liệu và xác suất có thể là nhánh độc lập sau
khi Student được phép học Grade 2. `PRODUCT_DECISION` — PLAVE không nên khóa
toàn bộ các nhánh này sau bảng nhân/chia chỉ vì chúng có display order muộn.

Current schema chỉ có một `prerequisite_unit_slug`. Unit cần nhiều nền tảng như
“Bài toán một bước Lớp 2” phải:

1. được tách nhỏ theo domain; hoặc
2. chờ một dependency model hỗ trợ nhiều prerequisite.

Đây là giới hạn kỹ thuật cần xử lý ở implementation sprint, không phải lý do
thay đổi outcome chính thức.

## 4. Ba ứng viên vertical slice đầu tiên

Thang 1–5, điểm cao hơn là thuận lợi hơn; “rủi ro” 5 nghĩa là ít rủi ro.

| Tiêu chí | Các số đến 1000 | Ý nghĩa nhân/chia | Điểm, đường và tứ giác |
|---|---:|---:|---:|
| Tính nền tảng | 5 | 4 | 3 |
| Ít phụ thuộc | 5 | 3 | 4 |
| Dễ kiểm thử deterministic | 5 | 4 | 4 |
| Tái sử dụng hệ thống hiện tại | 5 | 4 | 3 |
| Ít rủi ro sư phạm | 4 | 3 | 3 |
| Ít visual mới | 4 | 3 | 2 |
| Có thể tạo bộ câu chất lượng | 5 | 4 | 4 |
| Giá trị cho diagnostic/recommendation | 5 | 5 | 3 |
| **Tổng** | **38** | **30** | **26** |

### Khuyến nghị

`PRODUCT_DECISION` — đề xuất vertical slice đầu tiên là **Các số trong phạm vi
1000** (`grade-2-numbers-to-1000`).

Lý do:

- là nền tảng trực tiếp cho so sánh, cộng/trừ, đo lường và dữ liệu;
- ít phụ thuộc vào quyết định chia bảng nhân/chia;
- tái sử dụng được practice, NUMBER_INPUT và cấu trúc unit hiện tại;
- validator có thể kiểm tra mạnh phạm vi 0–1000, cấu tạo hàng và đáp án;
- tạo điểm neo rõ cho diagnostic/recommendation Lớp 2 sau này.

`PRODUCT_DECISION` — progression giữa đọc/viết số, cấu tạo số, tia số và liền
trước/sau đã được Owner duyệt cho POC. Wording, tải đọc và difficulty tiếp tục là
`PRODUCT_HYPOTHESIS`; optional expert evidence có thể bổ sung sau.

## 5. 24 câu không phải yêu cầu chính thức

`PRODUCT_DECISION` — 13 unit Grade 1 hiện vẫn có 24 câu. Runtime và database đã
được tổng quát hóa ở Sprint 6B để dùng tổng câu thật; 24 không còn là invariant
toàn hệ thống.

`OFFICIAL_SOURCE_CONFIRMED` — tài liệu chương trình được audit không yêu cầu mỗi
unit phải có 24 câu.

POC đầu Grade 2 giữ 24 câu như một batch rule dễ kiểm thử. Mỗi unit Lớp 2 vẫn
phải đánh giá riêng coverage, tải nhận thức và chất lượng; engine không mặc định
mọi unit tương lai có 24 câu.
