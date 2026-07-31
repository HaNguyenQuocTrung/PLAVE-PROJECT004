# Content quality gates cho unit Toán Lớp 2

- Trạng thái: official-source validation policy active; publication workflow
  chưa tích hợp database
- Nguồn outcome: [GRADE2_OUTCOME_MATRIX.md](./GRADE2_OUTCOME_MATRIX.md)
- Governance:
  [OFFICIAL_SOURCE_PEDAGOGICAL_VALIDATION_POLICY.md](./OFFICIAL_SOURCE_PEDAGOGICAL_VALIDATION_POLICY.md)

## 1. Gate 1 — Traceability

Technical error nếu:

- unit không map tới outcome ID;
- outcome không có nguồn/trang;
- grade hoặc phạm vi khác nguồn;
- nội dung seed chứa kiến thức bị loại khỏi scope;
- prerequisite tạo cycle hoặc trỏ unit không tồn tại.

Thứ tự, wording và difficulty do PLAVE lựa chọn phải mang nhãn
`PRODUCT_DECISION` hoặc `PRODUCT_HYPOTHESIS`. Expert review là evidence bổ sung,
không thay thế source traceability.

## 2. Gate 2 — Lesson package

Mỗi unit cần:

- mục tiêu học tập cụ thể;
- lý thuyết ngắn, tự đủ nghĩa;
- ví dụ có bước giải thực chất;
- phần ghi nhớ;
- ngôn ngữ tiếng Việt phù hợp học sinh;
- không sao chép dài sách giáo khoa;
- không tuyên bố teacher/Bộ GDĐT sign-off khi chưa có bằng chứng.

Số section/ví dụ là `PRODUCT_DECISION`; cần đánh giá theo outcome, không sao chép
máy móc cấu trúc Grade 1.

## 3. Gate 3 — Question và solution

Mỗi câu phải:

- kiểm tra một mục tiêu chính;
- có một đáp án canonical;
- có distractor gắn với misconception thật;
- không lộ đáp án trong prompt, metadata hoặc alt text;
- có lời giải từng bước phù hợp độ tuổi;
- được validator kiểm tra boundary toán học;
- không dùng raw HTML/JavaScript/external URL trong visual.

NUMBER_INPUT cần boundary typed theo skill/unit. Runtime sau Sprint 6B chỉ kiểm
tra số nguyên không âm và độ dài an toàn; validator nội dung vẫn phải chứng minh
miền cụ thể như 0–1000.

## 4. 24 câu là release-review product rule

- `OFFICIAL_SOURCE_CONFIRMED`: nguồn chương trình không quy định 24 câu/unit.
- `PRODUCT_DECISION`: PLAVE Grade 1 hiện dùng 24 câu cho mỗi unit.
- `PRODUCT_DECISION`: runtime và database sau migration `0034` dùng tổng câu
  thật; POC Grade 2 dùng batch 24 câu để kiểm thử release review.

`PRODUCT_HYPOTHESIS` — 24 là `reviewSampleSize` và `maxQuestions` ban đầu,
không phải số câu bắt buộc của mọi attempt. Policy chi tiết nằm tại
[ADAPTIVE_PRACTICE_POLICY.md](./ADAPTIVE_PRACTICE_POLICY.md).

## 5. Gate 4 — Visual và accessibility

Mọi visual phải:

- dùng schema typed/allowlisted;
- có mô tả tương đương, không tiết lộ đáp án;
- không dựa riêng vào màu;
- giữ nét/label rõ ở mobile;
- không overflow ngang;
- render giống nhau ở practice và review;
- có safe fallback nếu spec không hợp lệ;
- dùng keyboard/focus-visible và screen reader được.

Đồng hồ, thước, cân, tiền, pictograph và hình học cần validator riêng khớp visual
với correct answer.

## 6. Gate 5 — Source, technical và Owner review

Trước controlled pilot:

- `officialSourceValidation = VALIDATED`;
- `technicalValidation = PASSED`;
- `ownerDecision = APPROVED_FOR_CONTROLLED_PILOT`;
- content đang ở `DRAFT` và có content version;
- source record và skill mapping không thiếu version/outcome;
- expert review nếu có phải ghi reviewer, vai trò, ngày, version và kết quả;
- nếu chưa có expert review, ghi `OPTIONAL_NOT_OBTAINED`, không giả mạo
  `EXPERT_REVIEWED`.

Eligibility không tự publication. Chuyển `PUBLISHED` luôn cần Owner action
riêng. Technical pass và official-source validation không phải chứng nhận của
Bộ GDĐT.

## 7. Gate 6 — Security và authorization

Phải chứng minh:

- Student đúng grade/onboarding/ownership mới start;
- prerequisite được enforce server/database;
- answer và solution không gửi trước submit;
- browser không direct SELECT `question_solutions`;
- grading server-side;
- review chỉ cho owner;
- Parent chỉ nhận aggregate ở connection `APPROVED`;
- Teacher không tự có quyền đọc system practice answers;
- không service-role trong application;
- không log PII/raw answer/token/cookie.

## 8. Gate 7 — Diagnostic và recommendation

Diagnostic/recommendation Grade 2 chỉ được phát hành khi:

- chỉ chọn question từ unit Grade 2 `published`;
- blueprint trace đủ domain đã công bố;
- không coi unit draft là missing mastery;
- recommendation không trả unit locked/unpublished;
- reason code deterministic và giải thích được;
- không ảnh hưởng progress practice;
- Grade 1 diagnostic/recommendation không bị trộn.

## 9. Gate 8 — Test và release

Tối thiểu:

- content validator;
- parser/contract tests;
- boundary đúng/sai;
- authorization/IDOR tests;
- prerequisite/concurrency tests;
- practice/resume/review/retake tests;
- Parent aggregate tests;
- responsive/accessibility checks;
- lint, typecheck, build, dependency audit;
- post-migration read-only verifier;
- manual live smoke.

## 10. Phân loại lỗi

| Mức | Ví dụ | Hành động |
|---|---|---|
| Technical error | Sai count, thiếu solution, đáp án sai, cycle, solution leak | Chặn migration/publication |
| Security error | IDOR, direct grant, client grading, fail-open | Chặn release |
| Accessibility error | Không có mô tả, chỉ dùng màu, overflow | Chặn publication |
| Product hypothesis | Wording/difficulty/evidence chưa có pilot data | Giữ nhãn hypothesis, theo dõi và cấu hình |
| Optional expert evidence | Chưa có expert review | Ghi `OPTIONAL_NOT_OBTAINED`; không tự chặn controlled pilot |
| Product decision pending | Unit split, 24 câu, prerequisite kỹ thuật | Chờ owner duyệt |

## 11. Release checklist

- [ ] Outcome trace `OFFICIAL_SOURCE_CONFIRMED`.
- [ ] Product scope và prerequisite được owner duyệt.
- [ ] Content không vượt grade/scope.
- [ ] Source records/outcome mapping/version đều hợp lệ.
- [ ] Validator/test/security/accessibility pass.
- [ ] Owner đã thực hiện action riêng cho controlled pilot/publication.
- [ ] Expert status trung thực, không tự nâng `EXPERT_REVIEWED`.
- [ ] Diagnostic/recommendation chỉ dùng published content.
- [ ] Parent boundary giữ aggregate-only.
- [ ] Migration additive, manual gate và post-migration verification pass.
- [ ] Live smoke pass nhưng không được dùng như official endorsement.

## 12. Gate adaptive và retention

Trước khi tích hợp adaptive runtime:

- policy typed và fail-closed;
- coverage/mastery được đánh giá theo từng skill;
- không dùng average che skill yếu;
- có min/max hữu hạn và remediation khi đạt max;
- planner deterministic theo state/seed;
- retention check tách khỏi điểm lượt học ban đầu;
- client question bundle không chứa solution/audit source;
- mọi threshold giữ `PRODUCT_HYPOTHESIS`;
- expert review có thể bổ sung evidence cho sufficiency, difficulty và wording;
- dữ liệu sử dụng thực tế được đánh giá trước khi nâng hypothesis thành product
  decision.
