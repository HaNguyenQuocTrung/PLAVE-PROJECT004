# Chính sách chuyển khối lớp

- Phạm vi: contract thiết kế, chưa code/database
- Áp dụng đầu tiên: chuyển từ Grade 1 sang Grade 2
- Owner approval: 2026-07-29

## 0. Nhãn quyết định

- `OFFICIAL_SOURCE_CONFIRMED`: outcome/grade được nguồn chính thức xác nhận.
- `PRODUCT_DECISION`: nguyên tắc sản phẩm đã được owner chấp thuận.
- `PRODUCT_HYPOTHESIS`: threshold/readiness cần kiểm chứng bằng giáo viên và dữ
  liệu sử dụng thực tế.
- `OPTIONAL_EXPERT_EVIDENCE`: góp ý chuyên môn bổ sung, không phải hard blocker.
- `OUT_OF_SCOPE`: chưa triển khai trong runtime/database hiện tại.

Nguồn chương trình không quy định workflow chuyển grade của PLAVE.

## 1. Trạng thái kỹ thuật hiện tại

- `student_profiles.grade` là grade hiện tại của Student.
- Student chọn grade 1–9 khi onboarding; không có mutation đổi grade sau đó.
- Parent và Teacher không có quyền direct-update grade.
- Grade 1 completion gate không tự mở hoặc chuyển sang Grade 2.
- Attempt/answer gắn Student và unit nên lịch sử có thể được bảo toàn khi
  implementation tương lai không rewrite dữ liệu cũ.

`PRODUCT_DECISION` — PLAVE không tự động chuyển grade và không nhận grade flag
từ browser để mở nội dung.

## 2. Bốn thuộc tính phải tách biệt

`PRODUCT_DECISION` — owner đã phê duyệt việc tách bốn thuộc tính dưới đây.

### `schoolGrade`

Lớp học thực tế do Student/Parent xác nhận theo workflow riêng. Nguồn dữ liệu
hiện tại là `student_profiles.grade`.

- `PRODUCT_DECISION`: PLAVE không tự thay đổi `schoolGrade`.
- `OUT_OF_SCOPE`: actor cuối cùng, consent và audit record của mutation grade
  chưa được triển khai.

### `learningLevel`

Mức thành thạo PLAVE suy ra từ outcome/skill evidence. Nó không phải lớp học
thực tế và không được dùng để mutation `schoolGrade`.

- `PRODUCT_DECISION`: giữ riêng khỏi hồ sơ grade.
- `PRODUCT_HYPOTHESIS`: cách tổng hợp mastery/retention cần được kiểm chứng.

### `unlockedGrades`

Tập grade content Student được phép học trước hoặc ôn lại.

- `PRODUCT_DECISION`: hoàn thành Lớp 1 có thể là tín hiệu mở nội dung Lớp 2 mà
  không đổi `schoolGrade`.
- `PRODUCT_DECISION`: Student vẫn xem review và retake content grade cũ nếu là
  chủ dữ liệu.
- `OUT_OF_SCOPE`: chưa có schema/runtime cho `unlockedGrades`.

### `gradeReadiness`

Contract dự kiến:

```text
NOT_READY | NEEDS_REMEDIATION | READY
```

- `PRODUCT_DECISION`: readiness dựa trên outcome/skill mastery và retention,
  không dựa vào tổng số câu đã làm.
- `PRODUCT_HYPOTHESIS`: threshold cụ thể chưa được dùng để mở grade.
- `PRODUCT_HYPOTHESIS`: evidence sufficiency và cách diễn giải cho
  học sinh/Parent cần dữ liệu pilot; expert review là evidence tùy chọn.

## 3. Nguyên tắc đã chốt

| Quy tắc | Nhãn |
|---|---|
| Không tự động chuyển Student từ Grade 1 sang Grade 2 | `PRODUCT_DECISION` |
| Hoàn thành 13/13 Grade 1 là tín hiệu khuyến nghị, không phải hard gate cho Student đăng ký trực tiếp Grade 2 | `PRODUCT_DECISION` |
| Parent và Teacher không direct-update grade của Student | `PRODUCT_DECISION` |
| Sprint nền tảng chưa xây tính năng đổi grade sau onboarding | `OUT_OF_SCOPE` |
| Lịch sử grade cũ tiếp tục xem/review/retake theo ownership | `PRODUCT_DECISION` |
| Không dùng Grade 1 diagnostic để tự đổi grade | `PRODUCT_DECISION` |

Student đăng ký trực tiếp Grade 2 không bị buộc phải có 13 completion trên
PLAVE vì lịch sử học ngoài hệ thống không có trong database.

## 4. Workflow chuyển `schoolGrade` tương lai

Các điểm sau chưa được triển khai:

- actor khởi tạo/yêu cầu chuyển grade;
- Parent consent khi có connection `APPROVED`;
- Teacher recommendation ở mức aggregate;
- authority thực hiện mutation cuối;
- effective date theo năm học;
- audit trail giá trị trước/sau và căn cứ.

`OUT_OF_SCOPE` — không thêm nút, RPC, RLS, schema hay grade mutation trong
Sprint 6D.

`PRODUCT_DECISION_REQUIRED` — cần Owner chốt cách xử lý Student có gap kiến
thức, Student chuyển trường và placement cho Student đăng ký thẳng Grade 2.

## 5. Bảo toàn dữ liệu và authorization

Implementation tương lai phải:

- không xóa/reassign attempt, answer, review hoặc completion cũ;
- tiếp tục kiểm tra ownership của Student;
- Parent chỉ thấy aggregate khi connection `APPROVED`;
- Teacher chỉ thấy dữ liệu trong classroom boundary hiện có;
- không trả raw answer/solution qua grade-transition API;
- không lưu quyết định chỉ ở localStorage;
- không log email, UUID, token, cookie hoặc dữ liệu học sinh.

`PRODUCT_DECISION` — completion/readiness là tín hiệu học tập, không phải bằng
cấp hoặc tuyên bố đã được Bộ GDĐT/giáo viên chứng nhận.

Tham chiếu governance mới:
[OFFICIAL_SOURCE_PEDAGOGICAL_VALIDATION_POLICY.md](./OFFICIAL_SOURCE_PEDAGOGICAL_VALIDATION_POLICY.md).
