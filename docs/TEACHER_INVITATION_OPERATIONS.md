# Vận hành mã mời giáo viên

Tài liệu này chỉ dành cho chủ PLAVE thao tác trong Supabase SQL Editor sau khi
migration `0012_teacher_invitation_foundation.sql` đã được áp dụng.

## Phát hành một mã

Chạy đúng một lần:

```sql
select private.issue_teacher_invitation(
  now() + interval '14 days'
) as invitation_code;
```

Kết quả plaintext chỉ xuất hiện ở lần phát hành này. Hãy chuyển mã qua kênh
riêng cho đúng giáo viên và không đưa mã vào log, URL, tài liệu công khai hoặc
cuộc trò chuyện hỗ trợ. Database chỉ lưu SHA-256 hash của mã.

## Kiểm tra trạng thái an toàn

Không đọc cột hash. Chỉ xem các trường vận hành:

```sql
select
  id,
  status,
  created_at,
  expires_at,
  claimed_at,
  revoked_at,
  expired_at
from public.teacher_invitations
order by created_at desc;
```

## Thu hồi mã chưa sử dụng

Thay placeholder bằng ID lấy từ truy vấn trạng thái:

```sql
select private.revoke_teacher_invitation(
  'INVITATION_UUID'::uuid
);
```

Function chỉ thu hồi mã còn khả dụng. Mã đã được claim không thể dùng lại hoặc
thu hồi bằng thao tác này.
