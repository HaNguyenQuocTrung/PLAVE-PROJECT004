# PLAVE AI Tutor MVP Architecture

Ngày cập nhật: 2026-08-02  
Phạm vi: AI Tutor Toán lớp 1–9, authenticated Student, local-first và fail closed

## Trạng thái

AI Tutor có canonical provider boundary, OpenAI Responses API adapter, Google
Gemini streaming adapter, authenticated server route và giao diện PLAVE V2.
Feature mặc định `OFF`; `GOOGLE` là provider active, còn DeepSeek trả
`AI_PROVIDER_NOT_IMPLEMENTED`. Không có provider fallback âm thầm.

Sprint 9B đã sửa false completion và response bị cắt, thêm response contract,
complexity/thinking tiers và latency telemetry. Bounded real-provider benchmark
6 requests chọn `gemini-3.6-flash`. Owner decision
`OWNER AI TUTOR QUALITY ACCEPTANCE: APPROVED` đã đặt historical local-MVP status
thành `COMPLETE_OWNER_APPROVED_LOCAL_MVP`. Sau complete-project re-audit, active
Milestone 3 là `REOPENED_SECURITY_AND_REPRODUCIBILITY_REMEDIATION`. Không claim
production deployment hay real-provider browser PASS chưa được chạy.

## Audit code trước implementation

| Hạng mục | Phân loại | Kết luận |
|---|---|---|
| PLAVE V2 shell, navigation, icon và focus behavior | REUSABLE | Dùng trực tiếp cho `/tutor` |
| `getStudentLearningContext()` | REUSABLE | Nguồn identity, role và `schoolGrade` server-side |
| same-origin request guard | REUSABLE | Áp dụng trước auth và provider call |
| Existing Tutor/chat UI hoặc API | DEAD_CODE/NOT_PRESENT | Không có subsystem thứ hai để duy trì |
| Conversation/message database tables | BACKEND_ONLY/NOT_PRESENT | Không tạo migration phụ trong MVP |
| Provider SDK/streaming/rate limiter cũ | DEAD_CODE/NOT_PRESENT | Xây một canonical boundary mới |
| Tin cậy `userId`, provider, model hoặc base URL từ client | SECURITY_RISK | Typed parser từ chối toàn bộ field này |

## Canonical request path

```text
Authenticated browser
  -> POST /api/tutor/stream (same-origin, size limit)
  -> getStudentLearningContext() (server identity + Student role + grade)
  -> strict TutorClientRequest parser
  -> owner/concurrency/duplicate/rate-limit boundary
  -> local safety decision
       -> bounded local response, hoặc
       -> AiTutorProvider
            -> Google Gemini generateContentStream(), hoặc OpenAI Responses API
  -> validated TutorStreamEvent NDJSON
  -> plain-text React rendering + aria-live
```

Client không được chọn provider, model, base URL hoặc identity. Server tạo một
`safety_identifier` từ fingerprint một chiều của authenticated user ID; email,
tên và raw UUID không được gửi vào model.

## Provider contract

Canonical interface:

```ts
interface AiTutorProvider {
  readonly id: "OPENAI" | "GOOGLE" | "DEEPSEEK";
  readonly model: string;
  streamTutorResponse(input: TutorRequest): AsyncIterable<TutorStreamEvent>;
}
```

OpenAI adapter dùng official `openai` SDK và `client.responses.create()` với:

- `stream: true`;
- `store: false`;
- `max_output_tokens` theo server config;
- `safety_identifier` không chứa raw identity;
- `maxRetries: 0` để tránh retry POST/billing mù;
- AbortSignal và timeout server-side;
- chỉ map output-text delta, completion usage và sanitized error class.

Raw provider response, headers, reasoning/internal trace và SDK error không đi
qua public event contract. Tài liệu tham chiếu: [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses)
và [official OpenAI JavaScript SDK](https://github.com/openai/openai-node).

Google adapter dùng official `@google/genai` SDK 2.15.0 và
`ai.models.generateContentStream()` với:

- model server-only `GOOGLE_AI_MODEL`, mặc định configure là
  `gemini-3.6-flash` dựa trên bounded benchmark;
- canonical secret duy nhất `GOOGLE_API_KEY`; alias `GEMINI_API_KEY` không được
  đọc;
- system instruction và public learning context giống provider contract chung;
- `maxOutputTokens`, thinking level, request timeout và `AbortSignal` do server
  kiểm soát;
- `retryOptions.attempts=1`, không retry POST/billing mù;
- history map `user -> user`, `assistant -> model`;
- text chunks, usage/thinking tokens, `finishReason` và latency được map sang
  canonical events;
- chỉ `finishReason=STOP` cùng response đạt cấu trúc tối thiểu mới phát
  `message_complete`;
- `MAX_TOKENS`, safety block, empty output, timeout, abort và stream đóng bất
  thường trở thành stable error riêng, không trả raw SDK error.

Ba model `gemini-3.5-flash`, `gemini-3.6-flash` và
`gemini-3.5-flash-lite` được xác minh bằng official account model listing trước
benchmark. Default được chọn theo quality pass rồi latency, không theo version.
Streaming surface theo [official Google Gen AI JavaScript SDK](https://googleapis.github.io/js-genai/).

## Streaming contract

Chỉ sáu event hợp lệ:

- `message_start`;
- `text_delta`;
- `message_complete`;
- `usage`;
- `metrics`;
- `error`.

Validator yêu cầu exact keys, bounded strings, non-negative token counts và một
stable error code đã khai báo. Event thừa HTML/raw data hoặc malformed provider
event bị chuyển thành `AI_MALFORMED_PROVIDER_EVENT`. UI chỉ render plain text,
không dùng `dangerouslySetInnerHTML`.

`message_complete` không được phát khi `finishReason=MAX_TOKENS`, safety block,
provider timeout, abort, stream đóng bất thường hoặc response thiếu dấu câu/cấu
trúc tối thiểu. Public error phân biệt `AI_RESPONSE_TRUNCATED`,
`AI_PROVIDER_TIMEOUT`, `AI_STREAM_INTERRUPTED`, `AI_SAFETY_BLOCKED` và
`AI_EMPTY_RESPONSE`. UI giữ delta đã nhận, gắn trạng thái gián đoạn và đưa nút
`Tiếp tục câu trả lời` thay vì hiển thị normal completion.

## Tutoring and safety contract

- Tiếng Việt mặc định, wording phù hợp `schoolGrade` lớp 1–9.
- Response mode server-owned: `HINT`, `EXPLAIN`, `EXAMPLE`, `CHECK_MY_WORK`,
  `FULL_SOLUTION`; client chip chỉ là preference allowlisted.
- `HINT` có hành động đầu tiên và câu hỏi dẫn dắt, không lộ đáp án cuối;
  `EXPLAIN`/`FULL_SOLUTION` có bước, ví dụ, lỗi thường gặp và câu kiểm tra.
- Complexity classifier server-side chọn `SIMPLE=minimal/2048`,
  `STANDARD=low/3072`, `ADVANCED=medium/4096`. Client không truyền arbitrary
  thinking budget.
- Chỉ dùng context công khai: lesson/outcome title, public question, và
  Student answer/public feedback sau submit.
- Không nhận private solution, raw seed, solver receipt, hash hoặc validator data.
- Không tự nhận là con người/giáo viên; không tiết lộ hidden instructions hay
  server configuration.
- Prompt xin secret/quyền admin/dữ liệu user khác, PII và nhóm nội dung nguy hiểm
  cho trẻ được chặn cục bộ trước provider.
- Tình huống nguy hiểm được hướng về phụ huynh, giáo viên hoặc người lớn đáng tin
  cậy; Tutor không chẩn đoán y tế/tâm lý.

## Auth, isolation and cost controls

- Anonymous: `401`; Parent/Teacher: `403`.
- Conversation ID lần đầu được bind với fingerprint của Student trong process;
  user khác nhận `403`.
- Một active request/conversation; duplicate message ID bị từ chối.
- Giới hạn message bytes/chars, history turns, output tokens, request/phút và
  daily request ceiling đều ở server config.
- Không model call khi mở trang; suggestion chỉ gửi sau hành động Student.
- Usage log tối thiểu: provider/model, request accepted time, auth/context stages,
  server preparation, provider first chunk/text, total generation, stream
  buffering, chunk count, input/output/thinking tokens, finish reason và outcome.
  Client đo first visible token và UI completion bằng metrics event riêng. Không
  log nội dung chat, full conversation, key hay raw identity.

## Persistence boundary

Repository hiện không có conversation/message schema an toàn. Theo scope MVP,
không tạo migration chỉ cho tính năng phụ. Conversation được giữ trong UI state
và process-local authorization/rate-limit state; refresh mở welcome state mới.
Không có API key, hidden prompt hoặc provider trace được persist.

Đây là giới hạn rõ ràng, không được diễn giải là resume support. Persistence sau
này cần schema/RLS riêng, retention policy và Owner approval trước implementation.

## Owner acceptance và non-blocking enhancements

Owner đã duyệt AI Tutor local MVP: `OWNER AI TUTOR QUALITY ACCEPTANCE: APPROVED`.
Roadmap hiện giữ Milestone 1 `COMPLETE_OWNER_APPROVED`, mở lại Milestone 2 ở
`REOPENED_CRITICAL_REMEDIATION`, và mở lại Milestone 3 ở
`REOPENED_SECURITY_AND_REPRODUCIBILITY_REMEDIATION`. Các approval trước re-audit
được lưu là historical decisions.

Các enhancement không chặn local MVP:

- Conversation persistence.
- Deployment configuration.
- Optional DeepSeek/OpenAI providers hoặc activation ngoài active Google path.
- Production monitoring and cost controls.

## Files chính

- `lib/ai-tutor/contracts.ts`
- `lib/ai-tutor/config-values.ts`
- `lib/ai-tutor/openai-provider.ts`
- `lib/ai-tutor/google-provider.ts`
- `lib/ai-tutor/provider-factory.ts`
- `lib/ai-tutor/prompt.ts`
- `lib/ai-tutor/response-quality.ts`
- `lib/ai-tutor/runtime.ts`
- `app/api/tutor/stream/route.ts`
- `app/tutor/page.tsx`
- `components/AiTutorChat.tsx`
