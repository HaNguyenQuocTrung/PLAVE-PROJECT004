# PLAVE-PROJECT004 — Feature reuse matrix

- Nguồn audit: PLAVE-PROJECT002 tại thời điểm tách dự án
- Hành động trong lượt này: chỉ đánh giá; không copy source hoặc asset
- Nguyên tắc: mặc định `REBUILD` nếu kéo theo API, auth state hoặc dependency cũ

Các source path dưới đây là đường dẫn tương đối bên trong project cũ. Chúng
không phải runtime/build dependency của PLAVE-PROJECT004.

## 1. Matrix

| Mục | Source path trong PROJECT002 | Dependency trực tiếp | Phụ thuộc backend cũ | Copy độc lập? | Khuyến nghị | Lý do |
|---|---|---|---:|---:|---|---|
| Text logo/wordmark | `plave-frontend/components/AuthExperience.tsx`; `plave-frontend/app/page.tsx` | Next `Link`, Tailwind classes | Không | Có thể tái tạo | `REBUILD` | Wordmark chỉ là text gradient; rebuild thành component nhỏ, accessible, không kéo layout cũ |
| App icon/logo SVG | `plave-frontend/public/icon.svg` | Không | Không | Có, nếu quyền sở hữu được xác nhận | `COPY` có điều kiện | SVG code-native, nhỏ; chưa có hồ sơ provenance/license trong repo |
| Brand colors | `plave-frontend/app/globals.css`; auth/dashboard Tailwind classes | Tailwind palette/hard-coded hex | Không | Có, dưới dạng tokens | `COPY` | Chỉ lấy giá trị token sau khi chuẩn hoá: background sáng, blue primary, violet accent, semantic success/warning/error |
| Font | `plave-frontend/app/globals.css` | System stack với tên `Inter`; không có font binary bundled | Không | Có | `COPY` design decision | Giữ system fallback hoặc dùng `next/font` sau này; không copy file font vì không có |
| Auth illustration | `plave-frontend/public/auth-journey-v1.avif`; `.webp` | `next/image` | Không | Về kỹ thuật có | `SKIP` tới khi xác minh quyền | Git chỉ chứng minh file có trong baseline, không chứng minh license/ownership |
| Journey illustration | `plave-frontend/public/math-journey-map-v2.avif`; `.webp` | `next/image`, layout cũ | Không | Về kỹ thuật có | `SKIP` tới khi xác minh quyền | Không cần cho MVP learning flow và provenance chưa được ghi |
| Open Graph image | `plave-frontend/public/og.png` | Metadata Next.js | Không | Có | `SKIP` | Gắn với UI cũ; tạo lại khi visual mới ổn định |
| Login/register layout | `plave-frontend/components/AuthExperience.tsx`; `app/login/page.tsx`; `app/register/page.tsx` | Next, React, Tailwind, Lucide, Axios, custom auth/API hooks | Có, ở form logic | Không nguyên khối | `REBUILD` | Layout tham khảo tốt nhưng 989 dòng auth UI/logic kéo role, diagnostic và backend contract cũ |
| Dashboard layout | `plave-frontend/app/page.tsx` | 742 dòng; AI modal, JourneyMap, PracticeModal, old API/auth, gamification | Có | Không | `REBUILD` | Scope mới nhỏ hơn; cần dashboard theo Supabase/RLS và bỏ AI/gamification |
| Lesson page/card | `plave-frontend/app/lessons/[lessonId]/page.tsx`; lesson recommendation card nằm trong `app/page.tsx` | Old API types, RequireAuth, KnowledgeGraph type, PracticeModal, Lucide | Có | Không nguyên khối | `REBUILD` | Có thể giữ information architecture: objective/theory/example/mistake/quick-check/CTA, nhưng viết component/data contract mới |
| Simple question component | `plave-frontend/components/PracticeModal.tsx` | 463 dòng; Framer Motion, old API, KnowledgeGraph type, dialog hook, idempotency state | Có | Không | `REBUILD` | Tách `QuestionCard`, `AnswerFeedback`, `PracticeProgress`; server không trả correct answer trước submit |
| Accessibility CSS patterns | `plave-frontend/app/globals.css` | Tailwind/global CSS | Không | Có | `COPY` có chọn lọc | Skip link, focus-visible, touch target và reduced-motion là patterns độc lập, nhưng cần test lại trong app mới |

## 2. Dependency observations

- Auth pages dùng `axios`, custom `AuthProvider`, role routing và diagnostic API
  của PROJECT002; không phù hợp Supabase Auth.
- Dashboard gắn AI, gamification, knowledge graph, recommendation và nhiều API
  ngoài `MVP_NOW`.
- Lesson page có information architecture tốt nhưng data types và authorization
  thuộc backend cũ.
- Practice modal đã có idempotency/error/accessibility ideas, nhưng component quá
  lớn và nhận correct-answer contract từ API cũ.
- PROJECT002 dùng Tailwind 4, Lucide và Framer Motion. PROJECT004 chưa quyết định
  dependency; không thêm package chỉ để copy UI.

## 3. Approved reuse boundary

Có thể reuse sau khi xác nhận:

1. tên/wordmark PLAVE dưới dạng component viết lại;
2. brand color values dưới dạng tokens mới;
3. system font stack;
4. `icon.svg` nếu có bằng chứng project sở hữu;
5. accessibility interaction patterns dưới dạng implementation mới.

Không copy logic/API/state. UI reference không tạo dependency import sang
PROJECT002.

## 4. Explicitly prohibited transfer

- `.git`, `.env`, `node_modules`, `.next*`, `dist`, coverage, logs hoặc test
  artifacts;
- NestJS backend, Prisma schema/migration, Redis/BullMQ hoặc Docker;
- CI/CD, staging hoặc deployment configuration cũ;
- privacy deletion state machine;
- content lifecycle/revision architecture;
- AI provider code;
- generated question data chưa được xác minh;
- asset không có provenance/permission rõ.

## 5. Ownership checks before copying assets

Với mỗi asset được đề xuất `COPY`, cần ghi:

- người/tổ chức tạo;
- ngày tạo;
- license hoặc xác nhận sở hữu;
- source prompt/tool nếu là generated image;
- attribution requirement;
- checksum của file được chấp thuận.

Thiếu bất kỳ mục nào thì chuyển khuyến nghị về `SKIP`.
