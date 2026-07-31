# PLAVE-PROJECT004 — Data privacy rules

- Trạng thái: mandatory product baseline
- Phạm vi: development, test và MVP
- Đây không phải tuyên bố tuân thủ pháp luật hoàn chỉnh; cần chuyên gia pháp lý
  trước khi dùng dữ liệu trẻ em thật hoặc pilot trường học

## 1. Non-negotiable rules

1. Không bán dữ liệu học sinh.
2. Không quảng cáo nhắm mục tiêu trẻ em.
3. Không dùng dữ liệu trẻ em thật trong development/test/demo.
4. Không lưu password trong application tables; Supabase Auth sở hữu credential.
5. Không public ngày sinh. Nếu sau này thật sự cần age band, phải có purpose,
   access policy và retention riêng.
6. Service-role key chỉ dùng server-side; không có prefix `NEXT_PUBLIC_`, không
   trả qua API/log/client bundle.
7. Mọi private table bật RLS và có negative authorization tests.
8. Thu thập dữ liệu tối thiểu cho core learning; không thu thập “để dùng sau”.

## 2. Student identity and code

- Student code phải random, không tuần tự và đủ khó đoán.
- Không dùng database ID, số thứ tự hoặc grade làm code.
- Lookup bị rate-limit và không trả thông tin khi query mơ hồ/không hợp lệ.
- Response lookup chỉ hiển thị display name đã che một phần, ví dụ `M*** A**`.
- Không trả email, ngày sinh, classroom, full name hoặc progress trước khi link
  được chấp nhận.
- Log không ghi student code thô; nếu cần correlation dùng hash có scope.

## 3. Parent linking

State tối thiểu:

```text
PENDING → ACCEPTED
        → REJECTED
ACCEPTED → REVOKED
```

- Parent chỉ gửi request sau masked lookup.
- Student phải chủ động `ACCEPT` hoặc `REJECT`; parent không tự xác nhận.
- Parent chỉ đọc progress sau khi state là `ACCEPTED`.
- `PENDING`, `REJECTED` và `REVOKED` không cấp quyền đọc.
- Student có thể revoke; quyền phải mất hiệu lực ở query kế tiếp.
- Accept/reject/revoke phải idempotent và audit metadata tối thiểu.
- Không gửi full student identity trong notification/request list.

RLS phải kiểm tra accepted link trực tiếp; không dựa vào nút ẩn ở frontend.

## 4. Teacher invitation

- Invitation one-time, random và có expiry.
- Chỉ lưu hash/token fingerprint nếu thiết kế cho phép; không log token thô.
- Invitation gắn intended role và scope tối thiểu.
- Used, revoked hoặc expired invitation không thể dùng lại.
- Teacher role không được nhận từ client form hoặc user-editable metadata.
- Issuance/revocation cần audit actor và timestamp.

## 5. Authentication and session

- Supabase Auth quản lý password, password reset và session.
- Không mirror password/hash vào `profiles`.
- Cookie/session dùng cấu hình an toàn theo môi trường và hướng dẫn Supabase SSR
  được xác minh lúc triển khai.
- Logout/session expiry phải thu hồi UI access và server query.
- Error không tiết lộ email đã đăng ký nếu điều đó tạo user enumeration.

## 6. Database and RLS

### Student

- Self access cho profile allowlist, attempts, answers và progress.
- Không đọc student khác bằng direct ID/query.

### Parent

- Chỉ đọc summary của child có accepted link.
- Không sửa attempt/progress.
- Không mặc định đọc raw answers hoặc classroom data.

### Teacher

- Chỉ đọc student summary cần thiết trong classroom mình sở hữu và membership
  đang active.
- Không đọc dữ liệu ngoài classroom bằng direct URL/query.

### Guest

- Chỉ đọc dataset demo vô danh.
- Không insert/update private learning rows trừ ephemeral state phía client.

Mỗi policy phải test anonymous, correct owner, wrong owner và revoked relation.

## 7. Learning data

- Attempt/answer/progress chỉ lưu field cần cho learning outcome.
- Không lấy screen time, notification engagement hoặc behavioral profiling làm
  mục tiêu tối ưu.
- Correct answer không gửi trước submit.
- Parent/teacher nhận summary tối thiểu, không tự động nhận toàn bộ answer history.
- Demo data dùng tên giả rõ ràng và không tái sử dụng email/identity thật.

## 8. Logging and observability

Không log:

- password, access/refresh token, service-role key;
- full student code;
- ngày sinh;
- full parent-link lookup response;
- answer payload hoặc lesson activity nếu không cần chẩn đoán sự cố;
- raw Supabase error chứa internal detail gửi thẳng cho client.

Log nên dùng request ID, stable safe error code, actor pseudonymous ID khi cần và
redaction mặc định.

## 9. Data lifecycle baseline

Trước khi có user thật cần xác nhận:

- retention cho profile, attempt/progress, parent request, classroom và audit;
- export data scope;
- account deletion/anonymization;
- backup retention và restore access;
- contact point cho privacy/safety report.

MVP development chỉ dùng disposable synthetic data. Không tuyên bố privacy
deletion hoàn chỉnh chỉ vì có nút UI.

## 10. Development and testing

- Fixture dùng UUID/email/name giả, không lấy từ người thật.
- Supabase test project tách khỏi môi trường thật.
- Service-role secret chỉ có trong secret store/local ignored env, không commit.
- Screenshot, trace và test report không được chứa token hoặc dữ liệu trẻ em.
- Seed rerunnable và chỉ chứa synthetic data.
- Authorization test là release gate, không được skip để demo.

## 11. Privacy acceptance

- Không public ngày sinh.
- Student code không tuần tự và lookup chỉ trả tên che một phần.
- Student accept/reject/revoke parent request.
- Parent chỉ đọc sau `ACCEPTED`.
- Teacher invitation one-time và có expiry.
- Không password trong application tables.
- Service-role key server-side only.
- Không dữ liệu trẻ em thật trong development/test.
- RLS negative tests đạt cho mọi role.
- Phần cần luật sư/chuyên gia dữ liệu được ghi rõ trước pilot.
