# PLAVE-PROJECT004 — Sprint plan

- Trạng thái: planning only
- Nguyên tắc: vertical slice chạy thật trước, mở rộng sau
- Lượt hiện tại: không scaffold, install, tạo Git hoặc Supabase resource

> **Ghi chú tên roadmap:** “Sprint 5 — Parent linking” bên dưới là tên lịch sử
> của product roadmap ban đầu và không bị đổi nghĩa. Các sprint 5A–5L về nội
> dung học thuộc một luồng riêng mang tên
> [Content Expansion Track](./curriculum/CONTENT_EXPANSION_ROADMAP.md).

## 1. Dependency order

```text
Product decisions
  → single-app foundation
  → Supabase Auth + profiles + RLS
  → curated Grade 1 data contract
  → Lesson → Practice → Solution → Progress
  → Parent linking
  → Basic classroom
  → MVP release gate
```

Không bắt đầu AI, generator hoặc lớp 2–9 trước khi MVP gate đạt.

## 2. Gate 0 — Decisions before Sprint 1

### Cần xác nhận

- Vertical slice lớp 1: phạm vi số trong 10 hay phạm vi khác.
- Guest demo: local static hay Supabase public demo rows.
- Student/Parent public registration policy.
- Teacher invitation issuer và quy trình thu hồi.
- Supabase project owner, region và chính sách không bật billing ngoài ý muốn.
- Logo/image ownership.
- Mức progress parent/teacher được phép xem.

### Acceptance

- Quyết định được ghi trong docs/ADR sau này.
- Không có credential hoặc dữ liệu trẻ em thật.
- MVP scope không mở rộng thêm.

## 3. Sprint 1 — Clean application foundation

### Mục tiêu

- Scaffold một Next.js App Router application TypeScript strict.
- Một `package.json`, một lockfile.
- Thiết lập lint, typecheck, unit test và Playwright tối thiểu.
- Supabase clients tách browser/server/admin boundary.
- Environment validation fail-fast.

### Không làm

- Chưa tạo learning feature hoàn chỉnh.
- Không AI/generator/queue/Docker.

### Acceptance

- Fresh checkout cài bằng lockfile và build được.
- `strict` typecheck đạt.
- Secret không vào client bundle/Git.
- Không có dependency NestJS, Prisma, Redis hoặc BullMQ.
- Placeholder kỹ thuật chỉ ở route health/setup nội bộ; không giả báo feature đã
  hoàn thành.

### Độ khó

`Small`

## 4. Sprint 2 — Supabase Auth, profiles and RLS

### Mục tiêu

- Supabase Auth cho Student/Parent/Teacher.
- Profile onboarding theo role.
- Teacher invitation one-time/expiry.
- RLS và authorization tests.

### Test bắt buộc

- Anonymous không đọc private rows.
- User A không đọc/sửa User B.
- Client không tự nâng role.
- Teacher không có invitation bị từ chối.
- Used/expired invitation bị từ chối xác định.
- Service-role module không import vào client.

### Acceptance

- Login/logout/session refresh hoạt động.
- Không custom password storage.
- Loading/error/forbidden state tiếng Việt.
- Không dùng dữ liệu trẻ em thật.

### Độ khó

`Medium`

## 5. Sprint 3 — Grade 1 curated content foundation

### Mục tiêu

- Chốt outcome/node/lesson/question contract cho một vertical slice.
- Dữ liệu curated; không generator.
- Giáo viên tiểu học phản biện lesson, distractor, answer và explanation.

### Test bắt buộc

- Content schema validation.
- Correct answer duy nhất.
- Không placeholder/HTML nguy hiểm.
- Boundary của số/operator đúng phạm vi đã duyệt.
- No-answer-leak contract.

### Acceptance

- Mọi content item có provenance/reviewer metadata đủ dùng.
- Không row learner-visible nếu chưa được giáo viên xác nhận.
- Không sao chép nội dung sách giáo khoa có bản quyền.

### Độ khó

`Medium`

## 6. Sprint 4 — Learning vertical slice

### Mục tiêu

- Lesson → worked example → practice → detailed solution → progress.
- Guest demo read-only và authenticated attempt persistence.
- Idempotent answer submission.

### Test bắt buộc

- Happy path đúng/sai.
- Không lộ đáp án trước submit.
- Double submit chỉ ghi một answer.
- Refresh/resume behavior xác định.
- Student không đọc attempt của student khác.
- Mobile 360/390/412 px.
- Keyboard/focus/label/accessibility smoke.

### Acceptance

- Một student E2E chạy không retry.
- Progress đối chiếu được từ attempt history.
- Error không giả báo đã lưu khi database fail.
- Giáo viên xác nhận mẫu hiển thị và lời giải.

### Độ khó

`Large`

## 7. Sprint 5 — Parent linking

### Mục tiêu

- Random student code.
- Masked lookup.
- Request → student accept/reject → parent read.
- Revoke access.

### Test bắt buộc

- Rate-limit lookup và không enumerate student.
- Pending/rejected không cấp quyền.
- Accepted chỉ cấp đúng child.
- Revoke mất quyền ngay.
- Hai request đồng thời cho kết quả xác định.

### Acceptance

- RLS negative tests đạt.
- Không public ngày sinh hoặc full identity.
- Audit metadata không chứa PII dư thừa.

### Độ khó

`Medium`

## 8. Sprint 6 — Basic teacher classroom

### Mục tiêu

- Teacher tạo/archive classroom.
- Join code/invitation an toàn.
- Student request join; teacher approve/reject.
- Roster và progress summary tối thiểu.

### Test bắt buộc

- Teacher A không truy cập classroom của Teacher B.
- Student không xem student khác.
- Expired/used invitation bị từ chối.
- Removed membership mất quyền.
- Direct URL/API IDOR.

### Acceptance

- Classroom flow chạy end-to-end.
- Không assignment/grading nâng cao lẫn vào sprint.

### Độ khó

`Medium`

## 9. Sprint 7 — MVP hardening

### Mục tiêu

- Hoàn thiện privacy/security/accessibility/performance baseline.
- Chạy toàn bộ release gate trong `PRODUCT_SCOPE.md`.

### Test bắt buộc

- Lint, strict typecheck, unit/integration, RLS policy tests, browser E2E.
- Accessibility automated smoke và manual keyboard check.
- Secret scan và production build.
- Empty/error/offline-request/session-expiry behavior.

### Acceptance

- Core flow không retry che lỗi.
- Không có dữ liệu trẻ em thật.
- Nội dung vertical slice có sign-off giáo viên.
- Chưa gọi là public launch hoặc school pilot.

### Độ khó

`Medium`

## 10. Deferred roadmap

Chỉ sau Sprint 7:

1. đánh giá lớp 2;
2. diagnostic/remediation;
3. content authoring/review workflow;
4. assignment/analytics;
5. AI/generator qua safety/cost/content governance;
6. production/pilot planning.
