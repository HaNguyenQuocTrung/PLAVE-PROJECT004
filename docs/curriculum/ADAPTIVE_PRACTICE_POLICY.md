# Adaptive Practice Contract

- Phạm vi: contract TypeScript thuần và proof of concept
- Unit tham chiếu: `grade-2-numbers-to-1000`
- Runtime Student/database: adapter typed đã chuẩn bị; feature flags tắt,
  persistence chỉ là migration draft chưa apply
- Publication: chưa thực hiện
- Owner approval: 2026-07-29

`PRODUCT_DECISION` — `ADAPTIVE` là hướng practice chính đã được owner phê
duyệt. `FIXED` vẫn tồn tại trong contract để tương thích và kiểm thử.

## 1. Vai trò của số lượng câu

| Khái niệm | Giá trị POC | Ý nghĩa | Nhãn |
|---|---:|---|---|
| Question bank size | Không cố định toàn hệ thống | Nguồn câu đã duyệt để planner chọn; 5 seed review hiện tạo 120 sample kỹ thuật, không phải live bank | `PRODUCT_DECISION` |
| Release review sample size | 24 câu/seed | Mẫu đủ rộng để validator kiểm tra từng family trước quyết định pilot/publication | `PRODUCT_HYPOTHESIS` |
| Minimum questions/attempt | 12 | Ngưỡng sớm nhất có thể kết thúc nếu từng skill đều đủ bằng chứng | `PRODUCT_HYPOTHESIS` |
| Maximum questions/attempt | 24 | Giới hạn lượt; chưa mastery thì dừng với remediation, không kéo dài vô hạn | `PRODUCT_HYPOTHESIS` |
| Mastery evidence | Tối thiểu 2 bằng chứng/skill, accuracy từ 75%, 2 câu gần nhất đúng | Đánh giá riêng từng skill; không lấy trung bình che skill yếu | `PRODUCT_HYPOTHESIS` |
| Delayed retention check | 4 câu sau 7 ngày | Lượt kiểm tra duy trì riêng, không cộng vào điểm lượt ban đầu | `PRODUCT_HYPOTHESIS` |

Nguồn chương trình không quy định học sinh phải làm 24 câu. Các con số trong
bảng là giả thuyết sản phẩm để kiểm thử, chưa phải chuẩn khoa học hay kết luận
đã được kiểm chứng bằng dữ liệu sử dụng.

## 2. Typed policy

Contract tại `../../lib/content-engine/adaptive-practice.ts` gồm:

- `mode: FIXED | ADAPTIVE`;
- `reviewSampleSize`;
- `minQuestions`, `maxQuestions`;
- `requiredSkillCoverage`;
- `minimumEvidencePerSkill`;
- `masteryThreshold`;
- `recentCorrectRequirement`;
- `retentionCheckQuestionCount`;
- `retentionCheckDelayDays`.

Validator fail-closed với range sai, skill trùng, max không đủ coverage, threshold
ngoài miền hoặc policy `FIXED` có min/max khác nhau. Adaptive threshold bắt buộc
giữ nhãn `PRODUCT_HYPOTHESIS`; hướng `ADAPTIVE` giữ nhãn `PRODUCT_DECISION`.

## 3. Quy tắc planner

Planner là hàm thuần, nhận policy, evidence, question bank và seed:

1. Cùng state và seed cho cùng quyết định.
2. Ưu tiên skill chưa đủ coverage.
3. Sau coverage, ưu tiên skill chưa mastery có accuracy thấp hơn.
4. Không chọn cùng skill yếu quá hai lần liên tiếp nếu còn skill yếu khác.
5. Chỉ kết thúc sớm khi đã đạt `minQuestions` và mọi skill đạt evidence riêng.
6. Ở `maxQuestions`, nếu còn skill yếu thì trả `STOP_WITH_REMEDIATION`.
7. Nếu hết bank trước khi đủ điều kiện thì fail-safe bằng remediation.
8. `FIXED` mode chỉ hoàn tất tại target cố định.

Evidence và question bank có duplicate hoặc skill ngoài allowlist bị từ chối.
Planner chỉ nhận `GeneratedQuestion`; type này không chứa correct answer,
solution hoặc audit source.

## 4. Delayed retention

Retention plan chỉ xác định thời điểm và số câu. Kết quả luôn có
`resultIsSeparateFromInitialAttempt: true`; không sửa mastery của lượt ban đầu
trong POC. Cách hợp nhất retention vào readiness cần dữ liệu thực tế; expert
review là evidence bổ sung tùy chọn.

Sprint 6F thêm contract `PLANNED_NOT_PERSISTED`: bốn câu retention được chọn
deterministic, một câu mỗi skill, sau bảy ngày. Không có bảng retention,
scheduled job, notification hoặc mutation database. `RETENTION_RUNTIME_ENABLED`
mặc định `false`.

## 5. Runtime adapter và lifecycle

Adapter tại `../../lib/content-engine/adaptive-runtime.ts` tách rõ question
bank, policy, planner state, evidence, next-question decision, mastery,
remediation và retention. Lifecycle được chuẩn bị:

`STARTED → IN_PROGRESS → MASTERED_EARLY | REMEDIATION_REQUIRED | MAX_REACHED | ABANDONED`

Planner và grading thuộc server boundary. Client chỉ nhận current question,
progress min/max, trạng thái kết thúc và remediation trung tính; không nhận
future question order, scoring threshold, answer key, solution trước submit
hoặc audit source.

Schema fixed-practice hiện tại không lưu content version, policy version,
planner seed, revision hoặc terminal reason. Draft
`0036_adaptive_practice_runtime_draft.sql` vì vậy dùng bảng adaptive riêng và
không thay đổi Grade 1. Sau Sprint 6G-A, draft có ba RPC atomic
start/resume/state/submit nhưng toàn bộ release binding vẫn `DRAFT/HIDDEN`,
mọi activation flag vẫn `false`, file chưa apply và Student chưa thể truy cập.
TypeScript planner tiếp tục là đặc tả chuẩn; planner SQL chỉ là enforcement
implementation do application hiện không có private database transaction
channel. PostgreSQL syntax, quyền, khóa, rollback và equivalence vẫn phải vượt
qua isolated-database gate trước bất kỳ yêu cầu apply nào.

Quyết định atomicity:
[ADR-0001-ADAPTIVE-PRACTICE-ATOMICITY.md](../architecture/ADR-0001-ADAPTIVE-PRACTICE-ATOMICITY.md).
Kế hoạch kiểm thử cô lập:
[ADAPTIVE_DATABASE_ISOLATED_TEST_PLAN.md](../architecture/ADAPTIVE_DATABASE_ISOLATED_TEST_PLAN.md).

## 6. Decision labels

- `OFFICIAL_SOURCE_CONFIRMED`: outcome/range có dẫn nguồn chính thức.
- `PRODUCT_DECISION`: hướng `ADAPTIVE`, kiến trúc typed, deterministic và tách
  kết quả retention.
- `PRODUCT_HYPOTHESIS`: mọi threshold, sample size và quy tắc ưu tiên hiện tại.
- `PRODUCT_HYPOTHESIS`: wording, độ khó, evidence sufficiency và retention.
- `OUT_OF_SCOPE`: activation Student, apply database draft, publication,
  retention persistence và analytics.

Policy source-validation và publication nằm tại
[OFFICIAL_SOURCE_PEDAGOGICAL_VALIDATION_POLICY.md](./OFFICIAL_SOURCE_PEDAGOGICAL_VALIDATION_POLICY.md).
Thiếu expert review không tự động chặn controlled pilot; Owner action và các
gate official-source/technical vẫn bắt buộc.
