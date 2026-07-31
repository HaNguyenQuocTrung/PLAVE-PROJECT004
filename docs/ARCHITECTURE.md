# PLAVE-PROJECT004 — Architecture

- Trạng thái: proposed baseline chờ xác nhận
- Kiểu hệ thống: một Next.js full-stack application
- Chưa có code, package, Supabase project hoặc database trong lượt này

## 1. Architectural constraints

1. Một Next.js application, App Router, TypeScript strict.
2. Một `package.json`. Không monorepo.
3. Supabase Auth cho Student, Parent và Teacher.
4. Supabase PostgreSQL là database duy nhất.
5. Row Level Security (RLS) là authorization boundary bắt buộc.
6. Server Actions/Route Handlers xử lý mutation cần server validation.
7. Không NestJS, Prisma, Redis, BullMQ, Docker hoặc backend service riêng.
8. Không custom password storage.
9. Service-role key chỉ tồn tại server-side và không đi vào client bundle.
10. Không silent fallback sang provider/dịch vụ khác.

## 2. Logical architecture

```text
Browser
  ├─ Next.js Server Components (read theo user session)
  ├─ Next.js Client Components (interaction tối thiểu)
  └─ Server Actions / Route Handlers (validate + mutate)
             │
             ├─ Supabase Auth
             └─ Supabase PostgreSQL + RLS
```

Không có queue hoặc worker. Các side effect không bắt buộc cho core request sẽ
được để `LATER`; không giả lập background reliability trong MVP.

## 3. Runtime boundaries

### Browser-safe

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- session-aware Supabase browser client
- public capability/config không chứa secret

Anon key không thay thế authorization. Mọi table có dữ liệu user phải bật RLS.

### Server-only

- Supabase server client gắn session/cookie.
- `SUPABASE_SERVICE_ROLE_KEY` chỉ khi thật sự cần cho invitation/admin operation.
- Mutation validation, rate limit phù hợp và audit metadata.
- Không import module server-only từ Client Component.

Service-role operation phải hẹp, có allowlist use case và audit; không dùng làm
client data access mặc định.

## 4. Suggested project structure after approval

```text
PLAVE-PROJECT004/
  app/
    (public)/
    (auth)/
    (student)/
    (parent)/
    (teacher)/
    api/
  components/
    ui/
    learning/
  features/
    auth/
    profiles/
    learning/
    parent-linking/
    classrooms/
  lib/
    supabase/
      browser.ts
      server.ts
      admin.ts
    validation/
  supabase/
    migrations/
    seed.sql
  tests/
  docs/
  package.json
```

Đây chỉ là target structure. Lượt hiện tại không tạo các thư mục/code trên.

## 5. Conceptual data model

| Entity | Mục đích | RLS ownership chính |
|---|---|---|
| `profiles` | Role và display metadata tối thiểu gắn `auth.users.id` | User đọc/sửa trường cho phép của chính mình |
| `student_profiles` | Grade, random student code, onboarding state | Student self; accepted parent read subset |
| `parent_link_requests` | Pending/accepted/rejected/revoked link | Requesting parent + target student theo state |
| `teacher_invitations` | One-time, expires, hashed token metadata | Server-only/admin operation |
| `classrooms` | Lớp do teacher sở hữu | Owning teacher |
| `classroom_memberships` | Join request/active/removed | Student self; owning teacher |
| `learning_nodes` | Vertical-slice taxonomy | Published/demo read policy |
| `lessons` | Lesson curated | Published/demo read policy |
| `questions` | Curated prompt/choices/explanation | Public fields before submit; answer fields server-protected |
| `attempts` | Một practice attempt | Student owner; accepted parent subset; teacher classroom subset |
| `attempt_answers` | Submitted answer/evaluation | Student owner; authorized derived readers |
| `student_progress` | Progress projection | Student owner; accepted parent/authorized teacher subset |

Tên bảng và field chỉ là conceptual contract, chưa phải migration.

## 6. Authentication and role flow

1. Supabase Auth xác thực identity.
2. Server đọc role từ application profile đã được RLS bảo vệ; không tin role từ
   form/client state.
3. Student/Parent public sign-up policy cần được xác nhận trước scaffold.
4. Teacher hoàn tất profile chỉ khi invitation token hợp lệ, chưa dùng, chưa hết
   hạn và khớp identity.
5. Middleware chỉ hỗ trợ routing/session refresh; authorization thật vẫn nằm ở
   RLS và server mutation.

Không lưu password hash, refresh token hoặc service-role key trong application
tables.

## 7. RLS policy baseline

### Student

- Chỉ đọc/sửa profile của mình trong allowlist field.
- Chỉ tạo/đọc attempt, answer và progress của chính mình.
- Có thể xem và quyết định parent request nhắm tới chính mình.
- Không đọc dữ liệu student khác.

### Parent

- Lookup student code chỉ qua server function trả masked display name.
- Chỉ đọc progress khi có link `ACCEPTED`.
- Pending/rejected/revoked link không cấp quyền.
- Không đọc raw answer nếu MVP chỉ cần summary.

### Teacher

- Chỉ đọc classroom mình sở hữu.
- Chỉ đọc membership/progress tối thiểu của active member trong classroom đó.
- Không tự gán role teacher; invitation phải được server xác minh.

### Guest

- Chỉ đọc demo dataset vô danh được đánh dấu public.
- Không truy cập profile, attempt, progress, classroom hoặc link request.

RLS policy phải có negative tests bằng user A/user B/anonymous; UI ẩn nút không
được coi là authorization.

## 8. Learning request flow

### Lesson

1. Server resolve lesson được phép theo demo hoặc authenticated student.
2. Chỉ trả content learner-visible.
3. Không render arbitrary HTML.

### Practice

1. Server tạo attempt thuộc student hoặc ephemeral guest demo.
2. Client nhận prompt/choices nhưng không nhận correct answer.
3. Submit đi qua server action/route với idempotency key.
4. Server xác minh ownership, chấm curated question, ghi answer/progress trong
   transaction.
5. Response sau submit mới chứa detailed solution được phép.

### Parent progress

1. RLS xác minh accepted link.
2. Query chỉ trả summary cần thiết.
3. Revoke làm query kế tiếp mất quyền ngay.

## 9. Reliability and security baseline

- TypeScript `strict: true`; không dùng `any` để né contract.
- Validate input tại server boundary.
- Mutation idempotency cho answer, parent request decision và classroom join.
- Database transaction/function cho mutation nhiều bảng.
- Stable user-facing error codes; không trả SQL/internal exception.
- Rate limit cho student-code lookup, auth-sensitive và invitation actions.
- Không log password, token, student code thô, answer payload không cần thiết
  hoặc dữ liệu trẻ em.
- Security headers, CSRF-safe mutation pattern và cookie defaults theo Supabase
  SSR guidance được xác minh tại thời điểm scaffold.

## 10. Deployment neutrality

Kiến trúc không khóa vào một Next.js host cụ thể. Supabase là dependency đã được
chọn cho Auth/PostgreSQL, nhưng UI/domain logic không import service-role client
tràn lan. Data access nằm trong feature/server boundary để có thể kiểm thử và
thay đổi có kiểm soát.

Không có cấu hình deployment trong lượt này.

## 11. Architecture acceptance

- Chỉ một application và một package manifest.
- Client bundle không chứa service-role key.
- Mọi private table có RLS và negative policy tests.
- Teacher invitation one-time/expiry được enforce ở database/server boundary.
- Parent link pending không cấp quyền; accept/revoke thay đổi quyền xác định.
- Correct answer không có trong pre-submit payload.
- Không có dependency NestJS/Prisma/Redis/BullMQ/Docker.
