# PLAVE-PROJECT004 — Product scope

- Trạng thái: planning baseline
- Phạm vi: ứng dụng mới độc lập; chưa scaffold hoặc triển khai chức năng
- Định hướng: một trải nghiệm học Toán nhỏ, an toàn và có thể kiểm chứng
- Nội dung chương trình: phải trace tới nguồn chính thức và qua validation
  kỹ thuật; expert review là lớp evidence bổ sung tùy chọn

## 1. Mục tiêu sản phẩm

PLAVE-PROJECT004 ưu tiên một hành trình học hoàn chỉnh hơn số lượng tính năng:
học sinh vào được bài học, hiểu ví dụ, luyện tập, xem lời giải và nhìn thấy tiến
bộ. Phụ huynh chỉ xem dữ liệu sau khi học sinh chấp nhận liên kết; giáo viên có
một classroom flow cơ bản.

Đây là dự án độc lập với PLAVE-PROJECT002. Project cũ chỉ là nguồn tham khảo
thiết kế, không phải dependency build/runtime.

## 2. Nhóm người dùng

| Nhóm | Nhu cầu trong MVP |
|---|---|
| Guest | Xem demo read-only, không tạo hồ sơ trẻ em hoặc lưu tiến độ dài hạn |
| Student | Onboarding, học vertical slice lớp 1, luyện tập, xem lời giải và tiến độ |
| Parent | Gửi yêu cầu liên kết, chỉ xem tiến độ của học sinh đã chấp nhận |
| Teacher | Vào hệ thống bằng invitation hợp lệ, tạo classroom và quản lý roster cơ bản |

## 3. `MVP_NOW`

### 3.1 Guest demo

- Một lesson và một practice flow dùng dữ liệu demo vô danh.
- Hiển thị rõ “Dữ liệu minh hoạ; tiến độ không được lưu”.
- Không yêu cầu email, tên trẻ hoặc ngày sinh.
- Không cho guest truy cập dữ liệu Supabase của user khác.

### 3.2 Authentication

- Student, Parent và Teacher dùng Supabase Auth.
- Không lưu password trong application tables.
- Teacher chỉ onboarding sau invitation one-time còn hạn.
- Role được server/RLS xác minh; client không tự nâng role.
- Error/loading/forbidden state bằng tiếng Việt.

### 3.3 Profile onboarding

- Student: display name tối thiểu, grade 1, student code không tuần tự.
- Parent: display name và quy trình liên kết.
- Teacher: invitation đã xác minh và hồ sơ cơ bản.
- Không công khai ngày sinh; không dùng dữ liệu trẻ em thật trong development.

### 3.4 Một vertical slice lớp 1

Phạm vi đề xuất ban đầu: đếm, đọc, viết và cấu tạo số trong phạm vi 10. Đây là
phân rã kỹ thuật chờ giáo viên tiểu học xác nhận, không phải tuyên bố nội dung đã
được Bộ GDĐT phê duyệt.

Vertical slice phải có:

1. mục tiêu học tập;
2. lý thuyết ngắn, ngôn ngữ phù hợp lứa tuổi;
3. ít nhất một ví dụ có lời giải từng bước;
4. lỗi sai thường gặp;
5. curated questions đã trace nguồn và qua validator;
6. đáp án và lời giải chi tiết chỉ hiện sau khi nộp;
7. attempt, answer và progress được lưu;
8. empty/error/forbidden states;
9. responsive ở 360, 390, 412 px và desktop;
10. keyboard/focus/label cơ bản.

Không dùng runtime generator trong MVP.

### 3.5 Lesson

- Trang lesson server-authorized.
- Mục tiêu, phần giải thích, worked example, lỗi sai thường gặp và CTA practice.
- Không render HTML không được kiểm soát.
- Student chỉ đọc lesson được phép; guest chỉ đọc bản demo cho phép công khai.

### 3.6 Practice và detailed solution

- Câu hỏi curated, thứ tự có thể xáo trộn an toàn.
- Không tiết lộ correct answer trước submit.
- Mỗi submit có idempotency key.
- Kết quả gồm đúng/sai, đáp án đúng, lời giải từng bước và gợi ý ôn lại.
- Retry không tạo trùng attempt/answer.

### 3.7 Attempt và progress

- Lưu attempt, answer, thời điểm và kết quả theo student.
- Progress là dữ liệu dẫn xuất có thể đối chiếu với attempt history.
- Student chỉ đọc dữ liệu của mình.
- Parent chỉ đọc dữ liệu sau liên kết được student chấp nhận.
- Không dùng screen time làm thước đo học tập chính.

### 3.8 Parent linking

- Parent tra cứu bằng student code khó đoán.
- Kết quả lookup chỉ hiển thị tên đã che một phần.
- Parent gửi request; student accept hoặc reject.
- Chỉ request `ACCEPTED` còn hiệu lực mới cấp quyền đọc.
- Revoke phải thu hồi quyền ngay.

### 3.9 Teacher classroom cơ bản

- Teacher vào hệ thống qua invitation one-time còn hạn.
- Tạo classroom, phát join code/invitation an toàn.
- Student gửi/yêu cầu tham gia; teacher duyệt hoặc từ chối.
- Teacher chỉ xem roster và tiến độ tối thiểu của classroom mình sở hữu.
- Chưa có assignment/grading/analytics nâng cao.

## 4. `LATER`

- AI Tutor và mọi AI provider.
- Question generator/runtime-generated questions.
- Lớp 2–9.
- Diagnostic thích ứng và recommendation graph nâng cao.
- Assignment, grading và teacher analytics nâng cao.
- Gamification, streak, achievements.
- Search, library, notification.
- PWA/offline và Android wrapper.
- Email automation nâng cao.
- Content authoring/review workflow đầy đủ.
- Public launch hoặc school pilot.

Mỗi mục `LATER` cần ADR, privacy/security review và test riêng trước khi đưa vào
scope.

## 5. `OUT_OF_SCOPE`

- NestJS backend hoặc backend service riêng.
- Prisma schema/migrations.
- Redis, BullMQ hoặc background worker.
- Docker và monorepo.
- AI/provider code từ PROJECT002.
- Generated question data chưa qua official-source/technical validation.
- Content lifecycle/revision architecture của PROJECT002.
- Staging/CI/CD/production configuration của PROJECT002.
- Privacy deletion state machine của PROJECT002.
- Custom password hashing/storage.
- Quảng cáo nhắm mục tiêu trẻ em, bán dữ liệu hoặc dark pattern.

## 6. MVP release gate

MVP chỉ được xem là hoàn thành khi:

- các role và RLS policy có authorization tests;
- guest không đọc được private row;
- parent linking accept/reject/revoke đã được test;
- teacher invitation one-time/expiry đã được test;
- vertical slice chạy Lesson → Practice → Solution → Progress;
- không lộ đáp án trước submit;
- submit idempotent;
- nội dung mẫu có official-source traceability, technical validation và Owner
  release decision;
- mobile 360/390/412 px và keyboard flow được xác minh;
- không dùng dữ liệu trẻ em thật;
- typecheck, lint, unit/integration và browser E2E đạt không cần retry che lỗi.

## 7. Quyết định cần xác nhận

1. Có chấp thuận vertical slice “số trong phạm vi 10” hay chọn phạm vi khác?
2. Teacher account chỉ dùng invitation do admin dự án tạo, hay cho phép trường
   tự quản lý inviter?
3. Guest demo hoàn toàn local/read-only hay đọc các row public đã khóa bằng RLS?
4. Student tự quản lý parent request trong app có phù hợp với trải nghiệm mong
   muốn không?
5. Asset/logo nào có bằng chứng sở hữu để được đưa sang dự án mới?

## 8. Current validated learning scope

Mục 3.4 ở trên được giữ nguyên như planning baseline ban đầu. Phạm vi học tập
hiện tại đã mở rộng thành các unit Lớp 1 từ số trong phạm vi 10 đến thời gian,
đồng hồ, lịch và khối hình. Các unit này đã được người dùng xác nhận qua live
smoke; điều đó là validation kỹ thuật, không phải official endorsement.

Owner đã duyệt Sprint 5L “Khối lập phương và khối hộp chữ nhật” với prerequisite
theo domain `grade-1-basic-geometry-and-position`; migration `0030` và live
smoke đã được người dùng xác nhận. “Tiền Việt Nam” được giữ cho future Grade 2
content.

Audit chương trình hiện tại, coverage và quyết định mở rộng được quản lý tại:

- [Đối chiếu coverage Toán Lớp 1](./curriculum/GRADE1_CURRENT_COVERAGE.md)
- [Quyết định unit Lớp 1 tiếp theo](./curriculum/GRADE1_NEXT_UNIT_DECISION.md)
- [Content Expansion Track](./curriculum/CONTENT_EXPANSION_ROADMAP.md)

`OFFICIAL_SOURCE_CONFIRMED` chỉ áp dụng cho mapping đến yêu cầu cần đạt trong
nguồn chính thức. Cách chia unit, prerequisite và skill là `PRODUCT_DECISION`;
nội dung cụ thể dùng governance độc lập theo
[Official-source pedagogical validation policy](./curriculum/OFFICIAL_SOURCE_PEDAGOGICAL_VALIDATION_POLICY.md).
Thiếu expert review không tự động chặn controlled pilot; điều này không đồng
nghĩa PLAVE được Bộ GDĐT hay giáo viên chứng nhận.
