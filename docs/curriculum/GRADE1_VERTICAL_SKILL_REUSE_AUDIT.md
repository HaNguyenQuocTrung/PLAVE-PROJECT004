# Audit tái sử dụng skill theo chiều dọc từ Toán Lớp 1

> Historical Sprint 6C audit. Mandatory expert-review wording đã
> `SUPERSEDED_BY_OFFICIAL_SOURCE_VALIDATION_POLICY`; generated content hiện dùng
> các trạng thái source, technical, expert, Owner và publication độc lập.

- Thời điểm audit: Sprint 6C
- Nguồn outcome: [GRADE1_CURRENT_COVERAGE.md](./GRADE1_CURRENT_COVERAGE.md)
- Trạng thái: technical audit; không thay thế phản biện chuyên môn

## 1. Quy ước

- `REUSABLE_WITH_PARAMETERS`: giữ được invariant toán học và cấu trúc kiểm tra,
  chỉ thay cấu hình typed như grade, phạm vi, số chữ số, carry/borrow hoặc độ khó.
- `PARTIALLY_REUSABLE`: tái sử dụng được workflow/template family, nhưng visual,
  wording hoặc quy tắc nội dung phải viết và review riêng.
- `GRADE_SPECIFIC`: outcome mới; không được tạo bằng cách chỉ tăng phạm vi số.

Một template tái sử dụng được không đồng nghĩa biến thể sinh ra đã được duyệt.
Mọi content generated vẫn là `NEEDS_EXPERT_REVIEW` trước publication.

## 2. Manifest 13 unit

| # | Unit | Phân loại | Outcome chính thức | Skill family | Tham số tái sử dụng | Giới hạn riêng theo grade | Answer type | Visual bắt buộc | Prerequisite hiện tại |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | `grade-1-numbers-to-10` | `REUSABLE_WITH_PARAMETERS` | Đếm, đọc, viết và cấu tạo số tự nhiên | Whole-number recognition; sequence; place value | `grade`, `minValue`, `maxValue`, `digitCount`, cognitive level | Không suy ra cấu tạo hàng mới nếu outcome chưa có | MCQ, NUMBER_INPUT | Không bắt buộc; grouped objects khi cần | Không |
| 2 | `grade-1-addition-within-10` | `REUSABLE_WITH_PARAMETERS` | Ý nghĩa cộng, tính nhẩm và bài toán một bước | Addition meaning; calculation; number bonds; word problem | Range, operands, `carryMode`, step count | Tổng và cách nhớ phải theo outcome của grade | MCQ, NUMBER_INPUT | Grouped objects cho ý nghĩa phép cộng | Unit 1 |
| 3 | `grade-1-subtraction-within-10` | `REUSABLE_WITH_PARAMETERS` | Ý nghĩa trừ, tính nhẩm và bài toán một bước | Subtraction meaning; calculation; inverse relation; word problem | Range, operands, `borrowMode`, step count | Không cho kết quả âm khi cấu hình dùng số tự nhiên | MCQ, NUMBER_INPUT | Grouped objects khi dạy bớt/còn lại | Unit 2 |
| 4 | `grade-1-numbers-to-20` | `REUSABLE_WITH_PARAMETERS` | Số tự nhiên, dãy số và cấu tạo chục–đơn vị | Whole-number recognition; sequence; place value | Range 0–20, two-digit representation | Mốc 20 là `PRODUCT_DECISION` | MCQ, NUMBER_INPUT | Place-value chart có thể dùng | Unit 3 |
| 5 | `grade-1-addition-within-20-no-carry` | `REUSABLE_WITH_PARAMETERS` | Cộng và tính nhẩm trong phạm vi 20 | Addition no-carry; place-value addition; word problem | Range, digit count, `carryMode=FORBIDDEN` | Không được biến thành cộng có nhớ chỉ bằng seed | MCQ, NUMBER_INPUT | Tens/ones chart khi cần | Unit 4 |
| 6 | `grade-1-subtraction-within-20-no-borrow` | `REUSABLE_WITH_PARAMETERS` | Trừ và tính nhẩm trong phạm vi 20 | Subtraction no-borrow; missing number; word problem | Range, digit count, `borrowMode=FORBIDDEN` | Số trừ không vượt số bị trừ | MCQ, NUMBER_INPUT | Tens/ones chart khi cần | Unit 5 |
| 7 | `grade-1-numbers-to-100` | `REUSABLE_WITH_PARAMETERS` | Số tự nhiên đến 100; chục–đơn vị; so sánh | Whole-number recognition; read/write; place value; order | Range 0–100, two-digit representation | Không tự thêm hàng trăm nếu grade/outcome không cho phép | MCQ, NUMBER_INPUT | Place-value chart/tia số | Unit 6 |
| 8 | `grade-1-addition-within-100-no-carry` | `REUSABLE_WITH_PARAMETERS` | Cộng trong phạm vi 100 không nhớ | Add tens; add digits; missing number; word problem | Range, digits, `carryMode=FORBIDDEN` | Tổng từng hàng không được sinh carry | MCQ, NUMBER_INPUT | Place-value chart tùy template | Unit 7 |
| 9 | `grade-1-subtraction-within-100-no-borrow` | `REUSABLE_WITH_PARAMETERS` | Trừ trong phạm vi 100 không mượn | Subtract tens; subtract digits; missing number; word problem | Range, digits, `borrowMode=FORBIDDEN` | Mỗi chữ số số bị trừ không nhỏ hơn chữ số tương ứng | MCQ, NUMBER_INPUT | Place-value chart tùy template | Unit 8 |
| 10 | `grade-1-basic-geometry-and-position` | `PARTIALLY_REUSABLE` | Nhận dạng hình phẳng cơ bản | Shape recognition; classification; position; visible counting | Difficulty, item count, allowed shape set | Shape set và quan hệ vị trí phải trace outcome từng grade | Chủ yếu MCQ; NUMBER_INPUT cho đếm | `SHAPE_SCENE` typed | Unit 9 |
| 11 | `grade-1-length-measurement` | `PARTIALLY_REUSABLE` | Nhận biết cm và thực hành đo | Compare/order length; repeated units; read measurement | Unit set, scale, start/end, difficulty | Đơn vị và chuyển đổi không được suy từ grade khác | MCQ, NUMBER_INPUT | Ruler/equal-unit visual typed | Unit 10 |
| 12 | `grade-1-time-clock-calendar` | `PARTIALLY_REUSABLE` | Giờ đúng, ngày trong tuần, lịch đơn giản | Clock reading; event order; weekday; calendar | Allowed minute marks, calendar window, step count | Không tự thêm giờ rưỡi/24 giờ/tính khoảng thời gian | MCQ, NUMBER_INPUT | Clock/calendar/weekday typed | Unit 11 |
| 13 | `grade-1-cube-and-cuboid` | `GRADE_SPECIFIC` | Nhận dạng khối lập phương, khối hộp chữ nhật và xếp hình đơn giản | Solid recognition; object classification; visible composition | Chỉ tái sử dụng renderer, answer contract và visible-count guard | Khối trụ/khối cầu Lớp 2 là outcome mới, không phải “khối khó hơn” | MCQ, NUMBER_INPUT | `SOLID_SCENE` typed | Unit 10 |

## 3. Skill family tái sử dụng

### Dùng lại bằng tham số

1. `WHOLE_NUMBER_RECOGNITION`
2. `READ_WRITE_WHOLE_NUMBER`
3. `PLACE_VALUE_COMPOSITION`
4. `NUMBER_SEQUENCE_AND_ORDER`
5. `ADDITION_CALCULATION`
6. `SUBTRACTION_CALCULATION`
7. `MISSING_NUMBER_RELATION`
8. `ONE_STEP_WORD_PROBLEM`

Các family trên chỉ reusable khi configuration validator chứng minh đúng range,
digit count, allowed operation, carry/borrow và number of steps.

### Dùng lại một phần

1. `SHAPE_RECOGNITION_AND_CLASSIFICATION`
2. `POSITION_RELATIONS`
3. `MEASUREMENT_READING`
4. `TIME_AND_CALENDAR_READING`
5. `VISIBLE_OBJECT_COUNTING`

Những family này cần visual allowlist và validator riêng theo outcome. Thay grade
hoặc danh sách hình/đơn vị không đủ để trở thành content hợp lệ.

## 4. Hard-code và hướng xử lý

| Giả định được audit | Trạng thái sau Sprint 6B/6C | Hướng xử lý |
|---|---|---|
| Mọi unit có 24 câu | Runtime/database đã dùng total thật từ migration `0034` | 24 chỉ còn là batch rule của POC/Grade 1, không phải invariant engine |
| NUMBER_INPUT tối đa 100 | Client nhận số nguyên không âm tối đa 6 chữ số; server chấm | Mỗi skill config vẫn khai báo `minValue`/`maxValue` và validator kiểm tra |
| Skill catalog chỉ biết Lớp 1 | Runtime có fallback tiếng Việt an toàn | Engine dùng skill family metadata typed; publication sau này phải đăng ký label |
| Một prerequisite trực tiếp | Vẫn là giới hạn schema | Sprint 6C không mở rộng; unit nhiều dependency phải tách hoặc chờ thiết kế riêng |
| Diagnostic/recommendation/completion Lớp 1 | Được giữ riêng và fail-safe cho grade chưa có content | Không gọi logic Lớp 1 cho Grade 2; engine không tự tạo diagnostic |
| Parent parser biết skill cũ | Parser đã nhận safe skill code và trả aggregate | Không gửi audit source, answer hoặc solution vào Parent contract |

## 5. Boundary chuyên môn

- `TECHNICAL_DECOMPOSITION`: taxonomy và cấu hình engine trong tài liệu này.
- `PRODUCT_DECISION`: số câu, unit split, display order và prerequisite kỹ thuật.
- `NEEDS_EXPERT_REVIEW`: prompt, distractor, lời giải, visual và difficulty của
  mọi batch generated.
- `OFFICIAL_SOURCE_CONFIRMED`: chỉ outcome có trace trong các audit curriculum
  hiện hành; engine không tự nâng evidence status.
