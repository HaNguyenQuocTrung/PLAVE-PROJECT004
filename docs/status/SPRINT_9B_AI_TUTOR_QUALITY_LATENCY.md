# Sprint 9B — AI Tutor Response Quality, Completeness and Latency

Ngày: 2026-08-01  
Historical status: `COMPLETE_OWNER_APPROVED_LOCAL_MVP`  
Active status: `REOPENED_SECURITY_AND_REPRODUCIBILITY_REMEDIATION`

## Kết quả

Pipeline đã được sửa để không còn coi API success là product success. Google
adapter chỉ phát `message_complete` khi provider kết thúc bằng `STOP` và response
đạt terminal punctuation/cấu trúc tối thiểu theo response mode. Partial text được
giữ lại với error cụ thể và UI cho tiếp tục. Bounded real-provider benchmark đúng
6 requests chọn `gemini-3.6-flash` dựa trên cả chất lượng và latency.

Owner decision: `OWNER AI TUTOR QUALITY ACCEPTANCE: APPROVED`.

Browser runtime của execution environment đã trả danh sách backend rỗng, nên
authenticated Student real-provider journeys Sprint 9B ở 390×844 và 1280×800
không được chạy lại. Giới hạn evidence này vẫn được ghi đúng, không bị đổi thành
browser PASS; Owner đã chấp nhận chất lượng và local MVP một cách rõ ràng.

## Root cause response bị cắt

Audit end-to-end:

```text
Google generateContentStream
  -> GoogleAiTutorProvider
  -> canonical NDJSON events
  -> authenticated server route
  -> incremental TextDecoder/parser
  -> functional React delta aggregation
  -> plain-text render
```

Root cause chính:

1. Gemini 3 không có explicit thinking level nên dùng dynamic/high thinking mặc
   định cho bài đơn giản, làm first visible token chậm.
2. Runtime cũ giới hạn `maxOutputTokens=900`; thinking và candidate cùng dùng
   budget nên response có thể hết token trước khi hoàn tất.
3. Google adapter cũ bỏ qua `candidate.finishReason`, rồi luôn phát
   `message_complete` sau bất kỳ non-empty text. `MAX_TOKENS` vì vậy bị hiển thị
   như complete.
4. Client đánh complete ngay khi thấy event, không flush trailing decoder buffer,
   và closure error state có thể stale. Đây không phải Markdown truncation; UI
   render plain text.

Đã sửa:

- giữ `finishReason`, safety/prompt block, usage và thinking token metadata;
- `MAX_TOKENS -> AI_RESPONSE_TRUNCATED`;
- timeout, abnormal close, safety và empty output có error riêng;
- không complete khi abort hoặc response thiếu dấu câu/cấu trúc tối thiểu;
- flush decoder cuối stream, functional delta append và terminal decision sau
  stream end;
- client không có timeout ngắn hơn server; request dùng cùng server abort path và
  nút Stop phát AbortSignal, tránh timeout mismatch;
- `maxOutputTokens` default 4096, tier cap 2048/3072/4096;
- Google request `retryOptions.attempts=1`, không retry paid POST.

Official references: [Gemini 3 thinking levels](https://ai.google.dev/gemini-api/docs/gemini-3),
[GenerateContent finish reasons](https://ai.google.dev/api/generate-content),
[Models API](https://ai.google.dev/api/models),
[official JavaScript SDK](https://github.com/googleapis/js-genai).

## Thinking và response contract

| Complexity | Thinking | Output cap | Mục đích |
|---|---:|---:|---|
| SIMPLE | `minimal` | 2048 | phép tính/ngôn ngữ lớp nhỏ, latency thấp |
| STANDARD | `low` | 3072 | giải thích nhiều bước vừa phải |
| ADVANCED | `medium` | 4096 | chứng minh, đại số/hình học nhiều bước |

Server phân loại tier và quyết định cuối cùng cho `HINT`, `EXPLAIN`, `EXAMPLE`,
`CHECK_MY_WORK`, `FULL_SOLUTION`. Client chỉ gửi allowlisted mode preference;
không thể chọn thinking budget/model. HINT yêu cầu một hành động và câu hỏi dẫn
dắt, không lộ đáp án cuối. EXPLAIN/FULL_SOLUTION yêu cầu khái niệm, bước, ví dụ,
lỗi thường gặp và câu kiểm tra.

## Latency instrumentation

Không log prompt, response, full conversation, raw identity hay secret. Metrics
bao gồm:

- request accepted epoch và accepted-to-provider-start;
- Supabase client, auth user, profile, student profile và tổng context loading;
- server preparation;
- provider first chunk/first text/total generation;
- runtime first text, stream buffering, chunk/delta count;
- input/output/thinking/total tokens và finish reason;
- client first visible token và UI completion qua `plave-ai-tutor-metrics` event.

Direct benchmark không đi qua browser/auth route, vì vậy các field auth/client
trong `latency.json` để `null` và ghi scope rõ; không giả số liệu.

## Bounded real-provider benchmark

Official account `models.list` xác nhận cả ba model hỗ trợ `generateContent` và
output token limit 65536 trước khi generation. Hai prompt cố định: addition with
carrying lớp 2 ở HINT và fraction comparison lớp 7. Không lưu response text.

| Model | Quality | Median first visible | Median total | Kết luận |
|---|---:|---:|---:|---|
| `gemini-3.5-flash` | 2/2 | 8704.1 ms | 9594.1 ms | đúng nhưng first token chậm |
| `gemini-3.6-flash` | 2/2 | 1172.4 ms | 2251.8 ms | **selected default** |
| `gemini-3.5-flash-lite` | 1/2 | 812.7 ms | 1584.3 ms | nhanh nhưng fail fraction rubric |

Selected SIMPLE sample: first visible 1170.1 ms, total 1628.5 ms, `STOP`, 0
truncated completed, 0 empty, 0 invalid reviewed selected-model samples. Có 1
invalid sample trong toàn benchmark candidate set do Flash-Lite; đây là lý do
không chọn Lite. Review chỉ là bounded acceptance, không tuyên bố correctness
tuyệt đối.

Artifacts:

- `artifacts/ai-tutor-quality/model-benchmark.json`
- `artifacts/ai-tutor-quality/latency.json`
- `artifacts/ai-tutor-quality/review-samples.json`
- `artifacts/ai-tutor-quality/report.json`

## UI

- trạng thái visible `AI Tutor đang suy nghĩ…`, elapsed time sau 3 giây và Stop;
- delta render ngay, functional append, auto-scroll trong message container;
- composer/mode chips khóa khi một request active;
- chips: Gợi ý, Giải thích, Ví dụ tương tự, Kiểm tra bài của em;
- partial response có nhãn `Câu trả lời bị gián đoạn` và nút tiếp tục;
- Retry/Regenerate/New/Clear contracts được giữ nguyên;
- plain-text renderer, không `dangerouslySetInnerHTML`.

## Verification

- AI Tutor provider/config/security/streaming: 25/25 PASS.
- Quality/truncation/timeout/math representative Grades 1–9: 6/6 PASS.
- Authenticated local runtime/role/port/process tree: 9/9 PASS.
- UI/UX contracts: 13/13 PASS.
- Practice: 550/550 PASS.
- Generator V2: 10/10 PASS; không sửa Generator V2.
- Universal curriculum: 21/21 PASS.
- Competency learning path/UI: 10/10 PASS.
- Typecheck, ESLint, production build: PASS.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- Live local runtime: diagnostics PASS, `/tutor=200`, anonymous stream
  `401 AI_AUTH_REQUIRED`, Ctrl+C exit 130, listener sau Ctrl+C: none.

Không có migration, remote database mutation, deploy, publication hoặc Git
mutation. Repository-default Tutor và `remote-dev:runtime-start` safety behavior
không đổi.

## Owner decision và evidence limitation

Chưa có authenticated real-browser evidence Sprint 9B cho:

- simple hint, detailed explanation, wrong-answer feedback;
- continue after interrupted-stream simulation;
- Stop và Retry/Regenerate;
- mobile 390×844, desktop 1280×800;
- console/hydration/overflow/XSS/secret checks.

Evidence limitation: `IN_APP_BROWSER_BACKENDS_AVAILABLE=0`. Local runtime/auth
config không phải blocker và không có browser PASS mới được suy diễn. Owner
decision `OWNER AI TUTOR QUALITY ACCEPTANCE: APPROVED` hoàn tất local MVP.

## Remaining non-blocking enhancements

- Conversation persistence.
- Deployment configuration.
- Optional DeepSeek/OpenAI providers.
- Production monitoring and cost controls.

## Roadmap

- Milestone 1: `COMPLETE_OWNER_APPROVED`.
- Milestone 2 active: `REOPENED_CRITICAL_REMEDIATION`.
- Milestone 3 active: `REOPENED_SECURITY_AND_REPRODUCIBILITY_REMEDIATION`.
- Historical Owner decisions remain M2 `COMPLETE_OWNER_APPROVED` and M3
  `COMPLETE_OWNER_APPROVED_LOCAL_MVP`.

Milestone 3 và AI Tutor local MVP hoàn tất theo quyết định Owner. Các enhancement
ở trên không chặn completion và không được diễn giải là production deployment.
