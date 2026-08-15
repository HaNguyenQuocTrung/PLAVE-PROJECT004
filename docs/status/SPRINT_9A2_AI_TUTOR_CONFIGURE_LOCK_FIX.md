# Sprint 9A.2 — AI Tutor Configure Lock Fix

Ngày: 2026-08-01  
Trạng thái: `FIXED_OWNER_RERUN_REQUIRED`

## Kết quả

Luồng `ai-tutor:configure` nay dùng đúng một transaction cấu hình được serialize
bởi lock project-local. Nội dung `.env.local` chỉ được ghi một lần bằng temporary
file mode `0600`, `fsync`, atomic rename và `chmod 0600`. Các entry không liên quan
được giữ nguyên. Không có `Promise.all`, nested write batch hoặc nested compaction
trong đường ghi cấu hình.

Ctrl+C tại provider, key hoặc model prompt trả exit `130`, không ghi cấu hình một
phần, không để lock/temp file và không in synthetic test key. Harness chạy trong
process group riêng; `finally` dọn cả group theo thứ tự `SIGINT`, `SIGTERM`,
`SIGKILL` với thời gian chờ hữu hạn.

## Root cause và recovery

- Package script là lời gọi Node trực tiếp tới `scripts/configure-ai-tutor.ts`.
- Chuỗi lỗi `Compaction failed: Another write batch or compaction is already
  active` không tồn tại trong source repository, dependencies, global npm modules
  hoặc local Codex binaries đã kiểm tra. Configure cũ cũng không dùng config-store
  hay compaction library.
- Trước sửa, harness đã để lại npm/configure process group trong PROJECT004. Đây
  là concurrent process/execution-host state, không phải filesystem lock của
  `.env.local`.
- Process group sót lại chỉ chứa command thuộc PROJECT004, owner PID đã được kiểm
  tra bằng metadata rồi group được dừng. Các PID được xác nhận không còn tồn tại.
- Tại thời điểm recovery, cả `.ai-tutor-config.lock` và `.env.local.lock` đều
  không tồn tại, vì vậy không có lock file nào bị xóa hoặc giả lập.
- `.env.local` không bị xóa, ghi đè thủ công hay đọc vào log. Owner configuration
  vẫn chưa được cấu hình.

Canonical lock path:

```text
<repository-root>/.ai-tutor-config.lock
```

Lock chỉ chứa metadata owner không bí mật. Khi lock đã có, implementation đọc và
validate metadata, kiểm tra owner PID. Owner còn sống trả
`AI_TUTOR_CONFIGURATION_LOCKED` và exit `73`. Owner chết chỉ được thu hồi sau khi
inode, device và nội dung metadata vẫn khớp; metadata hỏng fail closed. Release chỉ
xóa lock có đúng PID và nonce của transaction hiện tại.

## Regression evidence

`npm run test:ai-tutor`: 25/25 PASS, gồm:

- clean configure và hai lần configure tuần tự;
- atomic persistence, giữ entry có sẵn và mode `0600`;
- Ctrl+C tại provider/key/model prompt;
- concurrent configure;
- stale lock với dead owner;
- live lock với active owner;
- nested acquisition regression;
- process-group cleanup;
- không config một phần, không secret output, không temp/lock sót lại.

Hai lần chạy thật tuần tự tại project root, không nhập key và Ctrl+C ngay tại
provider prompt, đều tới prompt bình thường rồi trả `130`. Lần thứ hai không còn
gặp compaction/lock error. Sau kiểm tra, `.env.local` và lock đều không tồn tại.

## Quality gates

- AI Tutor/configure/provider/security tests: 25/25 PASS.
- Typecheck: PASS.
- Full repository lint: PASS.
- Production build: PASS, 76 routes.
- `npm audit --audit-level=high`: PASS, 0 vulnerabilities.
- Provider API calls: 0.
- Remote access/mutation, migration, deploy và Git mutation: 0.

## Owner action

Từ đúng project root:

```bash
npm run --silent ai-tutor:configure
```

Owner key vẫn intentionally unset sau automated verification.
