# AI Tutor Owner Setup

Ngày cập nhật: 2026-08-01  
Mục đích: cấu hình Google Gemini key local, server-only, không gửi key qua chat

## 1. Cấu hình key

Từ project root bắt buộc:

```bash
cd /Users/hatrung/Desktop/PLAVE-PROJECT004
npm run --silent ai-tutor:configure
```

Chọn `GOOGLE` tại prompt. Command đọc key qua masked `/dev/tty`, không echo,
không gọi provider và không in prefix/suffix. Với Google, command tự dùng
`GOOGLE_AI_MODEL=gemini-3.6-flash` và không hỏi OpenAI model. Nó cập nhật
`.env.local` atomically, giữ nguyên config không liên quan và đặt file mode
`0600`. Ctrl+C trước khi hoàn tất không tạo file hoặc entry một phần.

Configure được serialize bằng lock project-local:

```text
/Users/hatrung/Desktop/PLAVE-PROJECT004/.ai-tutor-config.lock
```

Lock chỉ chứa metadata owner, không chứa key/config value. Nếu một configure khác
đang chạy, command fail closed với `AI_TUTOR_CONFIGURATION_LOCKED` và exit `73`.
Lock stale chỉ được tự thu hồi sau khi owner PID đã được xác minh không còn sống;
metadata không hợp lệ không bị tự xóa. Ctrl+C trả exit `130` và dọn lock trong
`finally`.

Output thành công chỉ gồm:

```text
AI_TUTOR_PROVIDER=GOOGLE
AI_TUTOR_KEY_CONFIGURED=YES
AI_TUTOR_KEY_FILE_MODE=0600
AI_TUTOR_KEY_LOGGED=NO
AI_TUTOR_STALE_LOCK_RECOVERED=NO
```

`.env.local` đã được gitignore. Không commit, paste vào issue, screenshot hoặc
gửi key qua chat.

## 2. Chạy Google real-provider smoke có giới hạn

Sau khi configure:

```bash
cd /Users/hatrung/Desktop/PLAVE-PROJECT004
npm run --silent smoke:ai-tutor-google
```

Command dùng đúng canonical Tutor runtime và tối đa ba remote requests:

1. một phép tính;
2. một yêu cầu chỉ đưa gợi ý;
3. một stream dài được abort sau delta đầu.

Prompt injection là local safety response và tạo 0 provider request. Command
không in câu trả lời, key, raw error hoặc provider headers. Evidence sanitized
được ghi vào `artifacts/ai-tutor-acceptance/google-real-smoke.json`.

Expected output:

```text
GOOGLE_KEY_CONFIGURED=YES
GOOGLE_REAL_SMOKE=PASS
REMOTE_REQUESTS_ATTEMPTED=3
SECRETS_LOGGED=NO
```

## 2B. Model benchmark — chỉ chạy khi Owner chủ động benchmark lại

Sprint 9B đã chạy command sau đúng một lần với 6/6 paid requests:

```bash
npm run --silent benchmark:ai-tutor-google
```

Command gọi official `models.list` trước rồi dùng hai prompt cố định cho ba model
`gemini-3.5-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`; không retry,
không lưu prompt/response và không in key. Không chạy lại command này trong cùng
acceptance window. Evidence ở `artifacts/ai-tutor-quality/` chọn
`gemini-3.6-flash`: 2/2 bounded quality samples PASS, median first visible token
1.17 giây và median total 2.25 giây. Flash-Lite nhanh hơn nhưng fail mẫu phân số,
nên không được chọn.

## 3. Chạy authenticated local runtime

Command canonical kết hợp Supabase public/auth profile đã được guard với đúng bốn
Tutor value trong `.env.local` mà không copy credential sang file khác:

```bash
cd /Users/hatrung/Desktop/PLAVE-PROJECT004
npm run --silent ai-tutor:local-start
```

Command bắt buộc dùng `.env.remote-dev.local` mode `0600`, gọi lại chính loader và
target guard của `remote-dev:runtime-start`, sau đó merge `PLAVE_AI_TUTOR_ENABLED`,
`PLAVE_AI_PROVIDER`, `GOOGLE_API_KEY`, `GOOGLE_AI_MODEL` từ `.env.local` mode
`0600` chỉ vào child Next.js. Next bind chính xác `127.0.0.1:3001`;
`remote-dev:runtime-start` và repository-default Tutor vẫn OFF.

Expected diagnostics không chứa secret:

```text
AI_TUTOR_LOCAL_TARGET_GUARD=PASS
AI_TUTOR_LOCAL_LOOPBACK_ONLY=PASS
AI_TUTOR_LOCAL_SUPABASE_PUBLIC_CONFIG=PASS
AI_TUTOR_LOCAL_PROVIDER=GOOGLE
AI_TUTOR_LOCAL_MODEL=gemini-3.6-flash
AI_TUTOR_LOCAL_KEY_CONFIGURED=YES
AI_TUTOR_LOCAL_START=READY
```

Nếu port đã có listener, command fail closed và in
`AI_TUTOR_LOCAL_PORT_OCCUPIED_PID`, `AI_TUTOR_LOCAL_PORT_OCCUPIED_COMMAND`,
`AI_TUTOR_LOCAL_PORT_OCCUPIED_LISTENER`; command không kill process đó. Ctrl+C gửi
TERM cho toàn process group, escalates KILL sau grace period nếu cần, chờ cleanup,
và trả exit `130`.

## 4. Authenticated Owner browser recheck Sprint 9B

Giữ command trên chạy, mở `http://127.0.0.1:3001/tutor`, đăng nhập bằng Student
thuộc clean remote-development target. Không chạy lại 6 benchmark requests.
Thực hiện số request nhỏ nhất để bao phủ:

1. `1280×800`: chip **Gợi ý**, hỏi phép cộng có nhớ; xác minh thinking indicator,
   elapsed time sau 3 giây nếu cần, delta xuất hiện ngay, có bước hành động/câu hỏi
   và không lộ đáp án cuối.
2. Chip **Giải thích**, hỏi so sánh phân số; xác minh bước, ví dụ, lỗi thường gặp,
   câu kiểm tra và completion không bị cắt.
3. Chip **Kiểm tra bài của em**, gửi một lời giải sai; xác minh chỉ rõ bước sai và
   cách sửa, không phán xét.
4. Một request để nhấn **Dừng**; dùng **Thử lại** hoặc **Tạo lại** cho đúng một
   recovery flow và đợi hoàn tất. Không cần chạy cả hai nếu sẽ tạo request thừa.
5. Để mô phỏng interrupted transport mà không che giấu lỗi, tắt mạng local ngay
   sau khi có delta rồi bật lại; xác minh trạng thái **Câu trả lời bị gián đoạn**
   và nút **Tiếp tục câu trả lời**, sau đó cho phép đúng một continue request.
6. **Cuộc trò chuyện mới** và **Xóa cuộc trò chuyện** phải hoạt động; chuyển
   `390×844` và xác minh mode chips, composer, scroll, focus và overflow mà không
   gửi request thêm nếu coverage đã đủ.
7. Context ẩn danh phải trả `401`; Parent/Teacher có sẵn phải bị từ chối `403`.
   Không tạo account hoặc sửa profile/role trên remote target.

Expected: median first visible token ≤4 giây và median total SIMPLE ≤10 giây
trong local environment; completed-truncated 0, empty 0, reviewed invalid math 0;
console/hydration/horizontal overflow/XSS/raw error/key leak đều 0. Network body,
response và client static assets không chứa Google key.

Review cả `390×844` và `1280×800`. Parent/Teacher phải bị từ chối; cửa sổ ẩn danh
phải bị đưa về login hoặc API trả `401`. Không tạo actor mới và không mutate remote
database để phục vụ review.

## 5. Fail-closed diagnostics

- `AI_TUTOR_DISABLED`: `PLAVE_AI_TUTOR_ENABLED` chưa là `true`.
- `AI_CONFIGURATION_INVALID`: key/model/limit thiếu hoặc sai.
- `AI_PROVIDER_NOT_IMPLEMENTED`: DeepSeek chưa triển khai.
- `AI_PROVIDER_TIMEOUT`: provider quá thời gian server cho phép.
- `AI_RESPONSE_TRUNCATED`: provider báo `MAX_TOKENS` hoặc response kết thúc thiếu
  cấu trúc/dấu câu tối thiểu; UI giữ phần đã nhận và cho tiếp tục.
- `AI_STREAM_INTERRUPTED`: stream đóng không có terminal hợp lệ.
- `AI_SAFETY_BLOCKED`: provider safety filter dừng response.
- `AI_EMPTY_RESPONSE`: provider không trả text.
- `AI_RATE_LIMITED`/`AI_DAILY_LIMIT_REACHED`: cost guard đã chặn.
- `REMOTE_RUNTIME_ENV_FILE_MISSING` hoặc remote public config/target guard code:
  Supabase runtime profile thiếu hoặc sai target.
- `AI_TUTOR_LOCAL_GOOGLE_KEY_MISSING`: `.env.local` thiếu Google key.
- `AI_TUTOR_LOCAL_PROVIDER_INVALID`/`AI_TUTOR_LOCAL_MODEL_INVALID`: local provider
  không phải Google hoặc model không phải `gemini-3.6-flash`.
- `AI_TUTOR_LOCAL_TUTOR_DISABLED`: local Tutor flag không phải `true`.
- `AI_TUTOR_LOCAL_NON_LOOPBACK_HOST_REJECTED`: host khác `127.0.0.1`.
- `AI_TUTOR_LOCAL_PORT_OCCUPIED`: port có listener; tự xử lý process được report,
  không yêu cầu command kill hộ.

Không sửa bằng cách đưa key vào `NEXT_PUBLIC_*`, hard-code model/key, bật provider
fallback hoặc tăng limits không có review.

## 6. Evidence hiện tại

Local mock/browser acceptance:

```bash
npm run acceptance:ai-tutor-local
```

Command này dùng key giả và deterministic provider với cấu hình `GOOGLE` chỉ
trong `NODE_ENV=development`, không gọi remote API. Evidence ở
`artifacts/ai-tutor-acceptance/`.

Hiện tại Google key đã cấu hình trong `.env.local` mode `0600`; Sprint 9B bounded
benchmark PASS đúng 6 requests và chọn `gemini-3.6-flash`. Authenticated local
launcher regression 9/9 PASS. Live launcher in đủ diagnostics, `/tutor` trả 200,
anonymous stream bị chặn `401 AI_AUTH_REQUIRED`, Ctrl+C trả `130` và port 3001
không còn listener.

Real-provider authenticated browser review Sprint 9B chưa được claim: browser
runtime trả danh sách backend rỗng trong execution environment hiện tại. Owner
phải hoàn tất mục 4; không dùng mock evidence để đổi trạng thái này thành PASS.
