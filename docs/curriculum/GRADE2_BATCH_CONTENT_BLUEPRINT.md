# Blueprint batch content cho 15 unit Toán Lớp 2

- Outcome source: [GRADE2_OUTCOME_MATRIX.md](./GRADE2_OUTCOME_MATRIX.md)
- Unit decomposition: [GRADE2_UNIT_BLUEPRINT.md](./GRADE2_UNIT_BLUEPRINT.md)
- Engine contract: [VERTICAL_MATH_SKILL_ENGINE.md](./VERTICAL_MATH_SKILL_ENGINE.md)
- Trạng thái chung: `DRAFT`; mỗi unit cần official-source traceability,
  technical validation và Owner decision riêng. Expert review là optional
  evidence.

## 1. Readiness scale

- `ENGINE_POC_READY`: có typed generator và validator, chưa có content được duyệt.
- `FAMILY_DESIGN_READY`: đã map được family/template, chưa triển khai generator.
- `PARTIAL_REUSE_ONLY`: tái sử dụng contract/renderer; invariant nội dung mới.
- `SCOPE_DECISION_REQUIRED`: còn product/expert decision chặn template batch.

Không readiness nào đồng nghĩa publication-ready.

## 2. Blueprint

| # | Unit / outcome | Skill families và template families | Prerequisite | Phạm vi / answer | Visual / solution | Misconception / reuse / nội dung mới | Readiness |
|---:|---|---|---|---|---|---|---|
| 1 | **Các số trong phạm vi 1000** `grade-2-numbers-to-1000`; `G2-NUM-01` | Recognize/compose; read/write; place value; predecessor/successor. Templates: compose number, read number, identify place, neighbor | Kiến thức: số đến 100. Kỹ thuật: Student Grade 2; không hard-gate 13/13 Lớp 1 | 0–1000; MCQ + NUMBER_INPUT | Number card, place-value chart, number line; lời giải đọc hàng rồi ghép/di chuyển một bước | Reuse number families 10/20/100. Mới: hàng trăm và boundary 1000; lỗi chữ số 0/đảo hàng | `ENGINE_POC_READY` |
| 2 | **So sánh, sắp xếp và ước lượng đến 1000**; `G2-NUM-02` | Compare place values; order up to four; estimate by tens. Templates: compare pair, order group, nearest-group estimate | Unit 1 | 0–1000; MCQ, NUMBER_INPUT chỉ khi có đáp án canonical | Number line/grouped objects; lời giải so sánh từ hàng cao nhất | Reuse compare/order Lớp 1. Mới: hàng trăm và ước lượng theo chục; lỗi so sánh từ đơn vị | `FAMILY_DESIGN_READY`; ước lượng cần expert rubric |
| 3 | **Cộng và trừ trong phạm vi 100**; phần `G2-ARITH-01` | Addition/subtraction calculation; operation components; missing number. Templates: calculate, name component, inverse check | Unit 1 theo decomposition sản phẩm | 0–100; MCQ + NUMBER_INPUT; carry/borrow scope phải chốt | Tens/ones chart; solution tách hàng và kiểm tra phép ngược | Reuse add/sub Lớp 1. Mới: outcome Lớp 2 về thành phần phép tính và progression carry/borrow | `SCOPE_DECISION_REQUIRED` |
| 4 | **Cộng và trừ trong phạm vi 1000**; `G2-ARITH-01` | Place-value addition/subtraction; regrouping; missing number. Templates theo số lượt nhớ/mượn được duyệt | Unit 1 và unit 3 về kiến thức; schema hiện chỉ khóa được một trực tiếp | 0–1000; MCQ + NUMBER_INPUT | Hundreds/tens/ones chart; solution từng hàng, nêu regrouping | Reuse calculation family. Mới: ba chữ số và carry/borrow qua hàng; lỗi quên zero/regroup sai hàng | `SCOPE_DECISION_REQUIRED` |
| 5 | **Hai phép tính cộng và trừ**; `G2-ARITH-02` | Operation sequence. Templates: evaluate left-to-right, identify intermediate result | Unit 4 | Đúng hai dấu cộng/trừ trong phạm vi được duyệt; MCQ + NUMBER_INPUT | Step strip; solution ghi kết quả bước 1 rồi bước 2 | Reuse calculation primitives. Mới: `numberOfSteps=2`; lỗi tự đặt ưu tiên/nhảy bước | `FAMILY_DESIGN_READY` |
| 6 | **Ý nghĩa phép nhân và phép chia**; `G2-MULDIV-01` | Equal groups; repeated addition; share/group division; operation components | Nền số và cộng cơ bản; nhánh độc lập sau Grade 2 access theo product decision | Nhóm bằng nhau; MCQ + NUMBER_INPUT đếm | Grouped objects/array; solution nêu số nhóm và số phần tử mỗi nhóm | Reuse visible counting/word-problem shell. Mới: multiplication/division invariant; lỗi nhóm không đều/đảo vai trò | `PARTIAL_REUSE_ONLY` |
| 7 | **Bảng nhân và bảng chia**; `G2-MULDIV-02` | Fact family; inverse facts; missing factor/dividend/divisor | Unit 6 | Bảng chính thức 2–9; cách chia batch chưa chốt; MCQ + NUMBER_INPUT | Array/group model; solution liên hệ nhân–chia | Reuse option/solution engine. Mới: table configuration và mastery progression | `SCOPE_DECISION_REQUIRED` |
| 8 | **Bài toán một bước Lớp 2**; `G2-PROBLEM-01` | Operation selection; one-step addition/subtraction/multiplication/division stories | Cần nhiều domain; chưa biểu diễn an toàn bằng một prerequisite | Một phép tính, dữ kiện đủ; MCQ + NUMBER_INPUT | Part–whole/equal-group diagrams; solution xác định quan hệ rồi tính | Reuse one-step story family. Mới: chọn một trong bốn phép tính; lỗi dựa từ khóa | `SCOPE_DECISION_REQUIRED` |
| 9 | **Điểm, đường và hình tứ giác**; `G2-GEO-01`, phần `G2-GEO-02` | Point/segment/line/curve recognition; collinearity; quadrilateral classification | Kiến thức hình phẳng Lớp 1; không khóa sau số học | MCQ; NUMBER_INPUT chỉ đếm đối tượng rõ | SVG geometry typed; solution nêu đặc điểm quan sát | Reuse shape parser/renderer. Mới: điểm, đường, ba điểm thẳng hàng, tứ giác | `PARTIAL_REUSE_ONLY` |
| 10 | **Khối trụ, khối cầu và tạo hình**; phần `G2-GEO-02` | Solid recognition; object classification; visible composition | Khối Lớp 1 ở mức kiến thức; nhánh độc lập | Chủ yếu MCQ; NUMBER_INPUT đếm rõ | Solid scene mở rộng; solution không suy khối ẩn | Reuse solid scene/visible count. Mới: cylinder/sphere và thao tác tạo hình | `PARTIAL_REUSE_ONLY` |
| 11 | **Độ dài, khối lượng và dung tích**; `G2-MEAS-01` | Choose unit/tool; read scale; compare/estimate measurement | Unit 1 và nền đo Lớp 1 | Unit/range cần đối chiếu từng slice; MCQ + NUMBER_INPUT | Ruler/scale/container typed; solution xác định vạch và đơn vị | Reuse ruler/equal units. Mới: mass/capacity và tool visual; lỗi trộn đại lượng | `SCOPE_DECISION_REQUIRED` |
| 12 | **Thời gian và lịch Lớp 2**; `G2-TIME-01` | Read clock; time relations; day/month/calendar lookup | Thời gian Lớp 1 về kiến thức; có thể nhánh độc lập | Phạm vi phút/quan hệ ngày cần expert review; MCQ + NUMBER_INPUT | Clock/calendar typed; solution đọc kim/vị trí ô lịch | Reuse clock/calendar renderer. Mới: quan hệ thời gian Lớp 2; lỗi kim giờ/phút, vượt tháng | `PARTIAL_REUSE_ONLY` |
| 13 | **Tiền Việt Nam**; `G2-MONEY-01` | Recognize value; match notation; compare values; compose amount nếu được duyệt | Đọc số; prerequisite kỹ thuật chưa chốt | Mệnh giá và dạng bài chưa chốt; ưu tiên MCQ | Schematic money card, không sao chép tiền thật; solution luôn ghi đơn vị | Reuse compare/compose shell. Mới hoàn toàn về domain tiền; rủi ro mệnh giá/pháp lý visual | `SCOPE_DECISION_REQUIRED` |
| 14 | **Dữ liệu và biểu đồ tranh**; `G2-STATS-01` | Classify/tally; read pictograph; compare categories; simple statement | Đếm và so sánh; nhánh độc lập | MCQ + NUMBER_INPUT count; scale phải explicit | Pictograph typed; solution đọc legend rồi kiểm đếm | Reuse counting/compare. Mới: data representation và legend; lỗi bỏ qua scale | `PARTIAL_REUSE_ONLY` |
| 15 | **Có thể, chắc chắn, không thể**; `G2-PROB-01` | Event classification. Templates: possible/certain/impossible from deterministic sample space | Ngôn ngữ và đếm cơ bản; nhánh độc lập | Chủ yếu MCQ; không tính xác suất số | Typed bag/spinner/event scene; solution liệt kê khả năng quan sát được | Chỉ tái sử dụng MCQ engine. Mới hoàn toàn về chance; lỗi “ít khả năng” = “không thể” | `PARTIAL_REUSE_ONLY` |

## 3. Nội dung Lớp 2 thực sự mới

Không thể tạo bằng thao tác “thêm một số 0”:

- hàng trăm và cách đọc số có chữ số 0;
- ước lượng theo chục;
- thành phần phép tính và cộng/trừ ba chữ số có regrouping;
- biểu thức hai phép tính;
- ý nghĩa và bảng nhân/chia;
- điểm, các loại đường, ba điểm thẳng hàng và tứ giác;
- khối trụ, khối cầu;
- khối lượng, dung tích và các dụng cụ tương ứng;
- phạm vi thời gian/lịch Lớp 2;
- tiền Việt Nam;
- biểu đồ tranh;
- sự kiện có thể, chắc chắn, không thể.

Mỗi nhóm cần outcome trace và template validator riêng. Expert review là
evidence bổ sung tùy chọn.

## 4. Publication boundary

Batch engine chỉ được tạo draft. Một unit chỉ được seed/publish khi:

1. scope và prerequisite được owner duyệt;
2. outcome trace và boundary validator pass;
3. source manifest và technical review package pass;
4. visual runtime allowlist và accessibility pass;
5. answer/solution được tính lại từ source;
6. security gate giữ solution phía server;
7. diagnostic/recommendation chỉ dùng unit đã published.
8. Owner thực hiện action riêng cho controlled pilot và publication.
