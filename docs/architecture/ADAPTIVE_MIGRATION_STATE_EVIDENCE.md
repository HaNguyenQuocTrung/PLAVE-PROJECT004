# Adaptive draft migration-state evidence

Ngày audit: 2026-07-29

> Historical snapshot. It is superseded for current remote-operation status by
> `MIGRATION_0036_FAILED_APPLY_CORRECTION_EVIDENCE.md` and
> `../operations/REMOTE_DEV_OPERATION_LEDGER.md`.

## Kết luận trong phạm vi có thể chứng minh

- Owner khai báo `0035` và `0036` là `DRAFT_NOT_APPLIED`.
- Repository giữ hai file ở trạng thái draft; comments, validators và release
  documents đều ghi chưa apply.
- Manifest migration local kết thúc bằng đúng một file `0035` và một file
  `0036`.
- SHA-256 của repository snapshot tại thời điểm audit:
  - `0035`: `911816c87723b8e762c1a1d7470d49b616cfbb95495ddf28e166fd1d536c55f8`;
  - `0036`: `806f4c2474bd80771d900684c854e65fcf60cebac8ce7792b7c0e71bd8b8ecdf`.
- Không có local migration ledger hoặc environment record đủ thẩm quyền để
  chứng minh trạng thái của mọi Supabase environment được quản lý.
- Sprint 6G-A không kết nối Supabase, không chạy diagnostic SQL và không thực
  hiện mutation.

Do đó, việc sửa `0036` tại chỗ dựa trên Owner approval hiện tại. Tài liệu này
không khẳng định độc lập rằng mọi environment bên ngoài repository đều chưa
từng chạy draft.

## Manual verification trước isolated test hoặc apply review

Chạy file read-only
`../../supabase/diagnostics/0036_migration_state_readonly.sql` trong đúng
environment cần kiểm tra và lưu output đã loại bỏ dữ liệu nhạy cảm.

Kỳ vọng với environment chưa apply:

- ba adaptive table trả `null`;
- ba adaptive RPC trả `null`;
- Grade 2 candidate rows bằng `0`;
- fixed Grade 1 RPC vẫn tồn tại.

Nếu bất kỳ adaptive object hoặc candidate row nào đã tồn tại, dừng quy trình:
không sửa/apply lại `0036`; giữ migration bất biến và thiết kế migration kế
tiếp sau khi xác định provenance.

Diagnostic chỉ đọc metadata/count, không chọn profile, attempt, answer hoặc
dữ liệu định danh.
