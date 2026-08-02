# Sprint 9A — PLAVE AI Tutor MVP

Ngày: 2026-08-01  
Phạm vi: Toán lớp 1–9, authenticated Student, Google Gemini là active provider

## Kết quả hiện tại

AI Tutor code, security contracts, local authenticated mock-browser journeys và
PLAVE V2 UI đã hoàn tất. Google key đã được cấu hình server-only; bounded Google
real smoke PASS bằng đúng ba requests. Command
`npm run --silent ai-tutor:local-start` hiện ghép clean remote-development
Supabase auth với local Google Tutor config trong một child Next.js loopback-only.
Sau Sprint 9B và quyết định rõ ràng
`OWNER AI TUTOR QUALITY ACCEPTANCE: APPROVED`, historical local-MVP status là
`COMPLETE_OWNER_APPROVED_LOCAL_MVP`. Active status sau complete project re-audit
là `REOPENED_SECURITY_AND_REPRODUCIBILITY_REMEDIATION`. Đây không phải production deployment và
không biến evidence chưa chạy thành real-provider browser PASS.

## Implemented

- Dedicated `/tutor` route và Student navigation item `AI Tutor`.
- PLAVE V2 welcome, grade-based suggestions, message composer và streaming text.
- Stop, Retry, Regenerate, Copy, New conversation và clear confirmation.
- Offline, disabled/config, timeout/provider và recovery states.
- Accessible aria-live, keyboard composer, dialog focus trap/restore và visible
  focus.
- Typed OPENAI/GOOGLE/DEEPSEEK provider boundary; OPENAI và GOOGLE hoàn chỉnh,
  DEEPSEEK fail closed.
- Server-only env configuration và masked `ai-tutor:configure` command.
- Authenticated Student-only API, same-origin, strict schema, bounded history,
  rate/daily/concurrency/duplicate controls.
- Prompt-injection, PII/minor-safety guard và sanitized provider errors.
- Minimal usage telemetry không chứa nội dung chat hoặc raw identity.

## Browser evidence

- `playwright-core` 1.51.1.
- Chromium 150.0.7871.186.
- 390×844 và 1280×800: PASS, horizontal overflow 0.
- Real disposable Supabase auth với Student/Parent/Teacher actors; migrations
  42/42 chỉ trong stack local temporary; cleanup PASS.
- Streaming, Stop, Retry, Regenerate, Copy, New/Clear, long math response và error
  recovery đều PASS.
- Anonymous 401; Parent/Teacher 403; cross-user 403; duplicate/concurrent 409;
  oversized 413; client provider/model/identity injection 400.
- Console errors 0, hydration errors 0, secret/private leaks 0, XSS 0.
- In-app Browser không được sử dụng; remote access/mutation và paid calls đều 0.

Các bullet trên là deterministic Google-config mock-provider acceptance. Không
được dùng chúng để claim real-provider browser PASS. Google real smoke riêng đã
dùng 3 requests; authenticated real-provider UI review chưa chạy vì execution
environment không có browser backend hoặc authenticated Student browser session.
Owner đã chấp nhận local MVP bằng quyết định chất lượng rõ ràng; giới hạn evidence
này được giữ nguyên và không còn là blocker của local MVP.

## Authenticated local runtime

- Canonical command: `npm run --silent ai-tutor:local-start`.
- Reuses `.env.remote-dev.local` loader, 0600 permission check, clean target guard,
  public URL/project-ref binding và scrubbed remote child environment.
- Reads only the four Tutor keys from `.env.local`; Google key remains server-only
  and is absent from argv, `NEXT_PUBLIC_*`, diagnostics and client source.
- Fixed listener `127.0.0.1:3001`; a live second start reported exact
  PID/command/listener and did not kill it.
- Live `/tutor` returned 200. Anonymous stream returned `401 AI_AUTH_REQUIRED`
  before provider dispatch.
- Live Ctrl+C returned `130`; port 3001 had no listener afterward.
- `remote-dev:runtime-start` implementation/command and OFF behavior were not
  changed.

## Visual self-review and fixes

Tất cả 9 screenshot cuối đã được mở ở original resolution. Issues tìm thấy và
sửa trong vòng lặp browser:

1. `CRITICAL`: Student message body bị đặt vào fixed avatar column, rộng 4px và
   cao 1347px. Root cause là `order` đảo grid item nhưng không đảo grid columns.
   Sửa bằng explicit `avatar/body` grid areas và thêm bounding-box regression.
2. `HIGH`: suggested prompts bị cắt trong welcome. Sửa compact layout và mobile
   horizontal scroll-snap row.
3. `HIGH`: `scrollIntoView` kéo document, làm Tutor title chui dưới mobile header.
   Sửa bằng scroll riêng message container.
4. `HIGH`: conditional grid children làm recovery/composer trượt row và composer
   chặn click Retry. Sửa bằng năm wrapper/row ổn định và bỏ sticky overlay.
5. `MEDIUM`: nested textarea focus ring quá nặng. Giữ một focus ring trên
   composer container.

Không còn issue critical/high sau vòng review cuối.

## Screenshots

- `artifacts/ai-tutor-acceptance/screenshots/tutor-welcome-desktop.png`
- `artifacts/ai-tutor-acceptance/screenshots/tutor-streaming-desktop.png`
- `artifacts/ai-tutor-acceptance/screenshots/tutor-response-desktop.png`
- `artifacts/ai-tutor-acceptance/screenshots/tutor-error-desktop.png`
- `artifacts/ai-tutor-acceptance/screenshots/tutor-long-response-desktop.png`
- `artifacts/ai-tutor-acceptance/screenshots/tutor-welcome-mobile.png`
- `artifacts/ai-tutor-acceptance/screenshots/tutor-streaming-mobile.png`
- `artifacts/ai-tutor-acceptance/screenshots/tutor-stopped-mobile.png`
- `artifacts/ai-tutor-acceptance/screenshots/tutor-dialog-mobile.png`

## Persistence limitation

Không có conversation/message schema trong repository. MVP giữ conversation ở
client/process local state; refresh trở về welcome. Không có migration mới. Đây
không phải resume support và được ghi rõ trong UI/report.

## Owner decision và remaining enhancements

Owner decision: `OWNER AI TUTOR QUALITY ACCEPTANCE: APPROVED`.

Không còn blocker cho AI Tutor local MVP. Các enhancement không chặn completion:

- Conversation persistence.
- Deployment configuration.
- Optional DeepSeek/OpenAI providers.
- Production monitoring and cost controls.

## Quality gates

- Authenticated local runtime merge/guard/secret/port/process-tree/auth suite:
  9/9 PASS.
- AI Tutor provider/API/auth/security/streaming suite: 18/18 PASS, gồm Google
  stream/usage/safety/abort/config contracts.
- Local Playwright authenticated Tutor acceptance: PASS tại 390×844 và
  1280×800.
- UI/UX contracts: 13/13 PASS.
- Practice regression: 550/550 PASS.
- Practice visual readability: 3/3 PASS.
- Universal curriculum: 21/21 PASS.
- Competency/recommendation: 10/10 PASS.
- Generator V2 regression: 10/10 PASS.
- Typecheck: PASS.
- ESLint toàn repository: PASS.
- Next.js production build: PASS; `/tutor` và `/api/tutor/stream` được build
  thành dynamic server routes.
- `npm audit --audit-level=high`: PASS, 0 vulnerabilities.

Practice suite ban đầu phát hiện các assertion cũ hard-code năm Student nav
items và dependency list trước khi thêm OpenAI SDK. Chỉ các contract assertions
này được cập nhật để phản ánh navigation sáu mục và dependency `openai`; toàn bộ
550 behavior tests sau đó PASS. Không nới lỏng assertion về practice behavior,
private solution hoặc authorization.

## Boundaries preserved

- Generator V2 không thay đổi.
- Chỉ public/auth read-only access qua live local runtime; không remote database
  mutation, migration, deploy, publication hoặc feature activation.
- Repository-default AI Tutor vẫn OFF.
- Không Git stage/commit/push.
- Milestone 1: `COMPLETE_OWNER_APPROVED`.
- Milestone 2 active: `REOPENED_CRITICAL_REMEDIATION`.
- Milestone 3 active: `REOPENED_SECURITY_AND_REPRODUCIBILITY_REMEDIATION`.
- Historical Owner decisions: M2 `COMPLETE_OWNER_APPROVED`; M3
  `COMPLETE_OWNER_APPROVED_LOCAL_MVP`.
