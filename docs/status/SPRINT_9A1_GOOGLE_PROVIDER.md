# Sprint 9A.1 — Google Gemini AI Tutor Provider

Ngày: 2026-08-01  
Trạng thái: `CODE_AND_LOCAL_BROWSER_COMPLETE_GOOGLE_KEY_REQUIRED`

## Kết quả

- Official `@google/genai` 2.15.0 adapter dùng
  `models.generateContentStream()` và stable model `gemini-3.5-flash`.
- Canonical server-only configuration: `PLAVE_AI_PROVIDER=GOOGLE`,
  `GOOGLE_API_KEY`, `GOOGLE_AI_MODEL`; không dùng alias `GEMINI_API_KEY`.
- Google chunks, usage, completion, safety/abort/error được map sang typed
  `TutorStreamEvent` chung.
- Timeout, output cap, no-retry billing, auth, rate/concurrency, local injection,
  XSS và minors-safety contracts được giữ nguyên.
- Configure hỗ trợ OPENAI/GOOGLE/DEEPSEEK; Google prompt được mask, model mặc
  định không hỏi lại, ghi file atomically và mode `0600`.
- Ctrl+C pseudo-TTY test: exit 130, key test không echo, `.env.local`/temp file
  còn lại 0. Configure nay dùng canonical project lock, atomic single-write và
  process-group cleanup; stale owner chỉ được thu hồi sau khi xác minh PID chết.
- Bounded Google smoke command đã sẵn sàng; khi chưa có key, command fail closed
  trước provider call với paid requests bằng 0.

## Browser evidence

- Local Playwright Chromium 150.0.7871.186, Playwright 1.51.1.
- 390×844 và 1280×800 PASS với authenticated Student và Google-configured
  deterministic nonproduction provider.
- Console errors 0, hydration errors 0, horizontal overflow 0, secret/private
  leak 0, XSS 0; disposable cleanup PASS.
- 9 screenshots mới đã được mở ở original resolution; critical/high visual
  issues còn lại 0.
- Đây không phải real-provider evidence. Real Google browser validation chỉ được
  chạy sau khi Owner cấu hình key.

## Automated gates

- AI Tutor/provider/security/configure lock: 25/25 PASS.
- Practice: 550/550 PASS.
- UI/UX: 13/13 PASS.
- Generator V2 regression: 10/10 PASS.
- Typecheck, full-repository lint và production build: PASS.
- `npm audit --audit-level=high`: PASS, 0 vulnerabilities.

## Exact remaining blocker

`OWNER_GOOGLE_KEY_CONFIGURATION_AND_BOUNDED_REAL_PROVIDER_SMOKE`.

Commands:

```bash
npm run --silent ai-tutor:configure
npm run --silent smoke:ai-tutor-google
```

Không remote DB mutation, migration, deploy, Git mutation hoặc Generator V2
work được thực hiện.

Configure compaction regression đã được xử lý. Hai lần chạy tuần tự tại project
root đều tới provider prompt và Ctrl+C trả `130`; Owner key vẫn unset. Chi tiết:
`docs/status/SPRINT_9A2_AI_TUTOR_CONFIGURE_LOCK_FIX.md`.
