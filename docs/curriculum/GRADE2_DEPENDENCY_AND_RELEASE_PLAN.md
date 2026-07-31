# Dependency và kế hoạch release Toán Lớp 2

- Trạng thái: blueprint, chưa implementation
- Unit catalog: [GRADE2_UNIT_BLUEPRINT.md](./GRADE2_UNIT_BLUEPRINT.md)
- Transition policy: [GRADE_TRANSITION_POLICY.md](./GRADE_TRANSITION_POLICY.md)

## 1. Ba loại quan hệ phải tách riêng

| Loại | Ý nghĩa | Nhãn |
|---|---|---|
| Prerequisite kiến thức | Outcome trước thật sự cần để hiểu outcome sau | `OFFICIAL_SOURCE_CONFIRMED` khi nguồn thể hiện; nếu do PLAVE suy luận thì `PRODUCT_HYPOTHESIS` |
| Prerequisite kỹ thuật | Điều kiện PLAVE kiểm tra trước khi cho start practice | `PRODUCT_DECISION` |
| Display order | Thứ tự trình bày trong catalog | `PRODUCT_DECISION` |

Một unit đứng sau unit khác trong giao diện không đủ để biến unit trước thành
prerequisite.

## 2. Dependency graph đề xuất

`TECHNICAL_DECOMPOSITION`:

```text
Grade 2 access
├── Các số đến 1000
│   ├── So sánh/sắp xếp/ước lượng
│   ├── Cộng/trừ đến 100
│   │   └── Cộng/trừ đến 1000
│   │       └── Hai phép tính cộng/trừ
│   ├── Đo lường
│   └── Dữ liệu và biểu đồ tranh
├── Ý nghĩa nhân/chia
│   └── Bảng nhân/chia
├── Điểm, đường và tứ giác
├── Khối trụ, khối cầu và tạo hình
├── Thời gian và lịch
└── Có thể, chắc chắn, không thể
```

“Bài toán một bước Lớp 2” có thể cần cả nhánh cộng/trừ và nhân/chia. “Tiền Việt
Nam” cần đọc số, nhưng mức prerequisite và phạm vi bài tập vẫn
`PRODUCT_DECISION_REQUIRED`.

## 3. Kế hoạch release theo phase

| Phase | Nội dung | Điều kiện vào phase | Trạng thái |
|---|---|---|---|
| 0 | Chính sách grade transition và Grade 2 access | Owner phê duyệt authority, consent, history policy | `PRODUCT_DECISION_REQUIRED` |
| 1 | Vertical slice “Các số trong phạm vi 1000” | Official-source + technical gates + Owner controlled-pilot action | Owner đã chọn slice/skills; content vẫn `DRAFT` |
| 2 | So sánh số; cộng/trừ foundations | Phase 1 live ổn định; chốt ranh giới phép tính | `PRODUCT_DECISION_REQUIRED` |
| 3 | Ý nghĩa nhân/chia và progression bảng | Chốt cách chia bảng từ outcome đầy đủ | `PRODUCT_DECISION_REQUIRED` |
| 4 | Các nhánh hình học, đo lường, thời gian | Visual contracts và accessibility validation | `PRODUCT_DECISION_REQUIRED` |
| 5 | Tiền, dữ liệu và xác suất | Chốt scope tiền; pictograph/chance validator | `PRODUCT_DECISION_REQUIRED` |
| 6 | Diagnostic, recommendation và completion Grade 2 | Chỉ dùng unit đã published và trace đủ coverage | `PRODUCT_DECISION` |

Phase không đồng nghĩa mọi Student phải học theo một chuỗi duy nhất. Release order
phục vụ kiểm soát chất lượng; learning path có thể phân nhánh.

## 4. Vertical slice đầu tiên

Khuyến nghị: **Các số trong phạm vi 1000**.

Phạm vi MVP đề xuất:

- đọc, viết số trong phạm vi 1000;
- nhận biết trăm, chục, đơn vị và số tròn trăm;
- viết số thành tổng trăm–chục–đơn vị;
- liền trước/liền sau;
- vị trí đơn giản trên tia số.

Không đưa vào slice đầu:

- cộng/trừ trong phạm vi 1000;
- nhân/chia;
- tiền Việt Nam;
- bài toán nhiều bước;
- diagnostic Grade 2.

`PRODUCT_DECISION` — nếu giữ contract hiện tại, MVP dùng 24 câu. Đây không phải
đòi hỏi của chương trình.

## 5. Hạn chế kỹ thuật cần xử lý ở sprint implementation

Audit repository xác nhận:

- migration manifest hiện kết thúc ở `0034`; Sprint 6C không tạo migration;
- `learning_units.grade` và Student grade hỗ trợ 1–9;
- lesson route động nhận `grade-[1-9]`;
- question/attempt/review infrastructure có thể tái sử dụng;
- runtime/database dùng tổng câu thật 1–100; 13 unit Lớp 1 vẫn giữ 24;
- `SkillCode` và Parent parser có safe fallback, nhưng presentation metadata cụ
  thể vẫn chủ yếu là Lớp 1;
- NUMBER_INPUT runtime nhận số nguyên không âm có độ dài an toàn; content engine
  phải tiếp tục validate boundary typed theo unit/câu;
- diagnostic, personalized path và completion summary đang hard-code Grade 1,
  13 unit và bốn domain Lớp 1;
- completion UI/route là `/grade-1/summary`;
- schema hiện chỉ có một prerequisite trực tiếp;
- Student grade không có workflow đổi lớp sau onboarding;
- Teacher question/classroom model đã có grade 1–9, nhưng không thay thế
  system learning unit authorization.

### 5.1. Manifest 13 unit Grade 1 hiện tại

Mọi unit dưới đây đang `published`, Grade 1, có 24 question và 24 solution theo
release validator hiện tại.

| Order | Migration seed | Slug | Tên | Prerequisite |
|---:|---|---|---|---|
| 1 | `0004` | `grade-1-numbers-to-10` | Các số trong phạm vi 10 | Không |
| 2 | `0018` | `grade-1-addition-within-10` | Phép cộng trong phạm vi 10 | `grade-1-numbers-to-10` |
| 3 | `0019` | `grade-1-subtraction-within-10` | Phép trừ trong phạm vi 10 | `grade-1-addition-within-10` |
| 4 | `0020` | `grade-1-numbers-to-20` | Các số trong phạm vi 20 | `grade-1-subtraction-within-10` |
| 5 | `0021` | `grade-1-addition-within-20-no-carry` | Phép cộng trong phạm vi 20 không nhớ | `grade-1-numbers-to-20` |
| 6 | `0023` | `grade-1-subtraction-within-20-no-borrow` | Phép trừ trong phạm vi 20 không mượn | `grade-1-addition-within-20-no-carry` |
| 7 | `0024` | `grade-1-numbers-to-100` | Các số trong phạm vi 100 | `grade-1-subtraction-within-20-no-borrow` |
| 8 | `0025` | `grade-1-addition-within-100-no-carry` | Phép cộng trong phạm vi 100 không nhớ | `grade-1-numbers-to-100` |
| 9 | `0026` | `grade-1-subtraction-within-100-no-borrow` | Phép trừ trong phạm vi 100 không mượn | `grade-1-addition-within-100-no-carry` |
| 10 | `0027` | `grade-1-basic-geometry-and-position` | Hình học và vị trí cơ bản | `grade-1-subtraction-within-100-no-borrow` |
| 11 | `0028` | `grade-1-length-measurement` | Đo độ dài và so sánh độ dài | `grade-1-basic-geometry-and-position` |
| 12 | `0029` | `grade-1-time-clock-calendar` | Thời gian, đồng hồ và lịch | `grade-1-length-measurement` |
| 13 | `0030` | `grade-1-cube-and-cuboid` | Khối lập phương và khối hộp chữ nhật | `grade-1-basic-geometry-and-position` |

Order 13 cố ý tạo nhánh prerequisite từ unit hình học; nó không phụ thuộc unit
thời gian/lịch. Không có slug/order trùng trong release manifest.

### 5.2. Nền tảng có thể tái sử dụng

- `learning_units` đã có `grade` 1–9, publication, display order và một
  prerequisite.
- `questions`, `question_solutions`, `practice_attempts` và `practice_answers`
  gắn theo unit/attempt; solution được giữ sau boundary server.
- start/resume kiểm tra Student role, onboarding, grade, publication,
  prerequisite và ownership.
- dynamic lesson route, practice, review, results và retake vận hành theo
  unit/attempt thay vì page riêng cho từng unit.
- visual parser/renderer dùng contract allowlisted và có thể mở rộng có kiểm
  soát.
- Parent connection `APPROVED`, Teacher activation và classroom ownership là
  các authorization boundary có thể tái sử dụng.

### 5.3. Phần Grade 1 đang hard-code

- catalog presentation/skill labels chi tiết chủ yếu chứa 13 unit Grade 1;
- NUMBER_INPUT không còn giới hạn 100, nhưng boundary sư phạm nằm ở validator;
- practice schema/attempt order dùng tổng câu thật sau migration `0034`;
- diagnostic RPC, blueprint, route và recommendation dùng bốn domain Grade 1;
- personalized path ánh xạ slug Grade 1 sang domain diagnostic Grade 1;
- completion contract/RPC/UI dùng chính xác 13 unit và route Grade 1;
- Dashboard và `/lessons` có nhãn/branch Grade 1;
- Parent parsers cần biết skill codes hiện hành;
- Student grade chưa có transition workflow sau onboarding.

Các thay đổi tương lai nên được tách:

1. grade transition/access;
2. Grade 2 catalog/skill contracts;
3. per-question hoặc per-unit NUMBER_INPUT constraints;
4. multi-prerequisite nếu thực sự cần;
5. diagnostic/recommendation/completion generic theo grade.

Không thay đổi nào ở trên được thực hiện trong Sprint 6A.

## 6. Release guardrails

Một unit Lớp 2 chỉ được visible/published khi:

- outcome trace hợp lệ;
- content gate trong
  [GRADE2_CONTENT_QUALITY_GATES.md](./GRADE2_CONTENT_QUALITY_GATES.md) pass;
- grade access fail-closed;
- prerequisite không tạo cycle và không vô tình khóa nhánh độc lập;
- review không lộ solution trước submit;
- Parent chỉ nhận aggregate;
- diagnostic/recommendation lọc `published` và đúng grade;
- live smoke không dùng dữ liệu giả.

Không được tự mở Grade 2 khi Student hoàn thành 13/13 unit Grade 1.
