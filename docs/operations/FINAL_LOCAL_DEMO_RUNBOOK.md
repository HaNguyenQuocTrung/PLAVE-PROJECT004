# Final local demo runbook — Toán Lớp 1–9

Runbook này hoàn tất phần browser evidence còn thiếu. Không cần credential,
remote Supabase, migration, publication hoặc mutation.

Trạng thái evidence hiện tại: **ACCEPTED**.

- Next.js 16.2.12 tại `http://127.0.0.1:3000`, ready trong 325 ms.
- `/`, `/demo`, `/curriculum-preview`, `/curriculum-preview?grade=7`: HTTP 200.
- Journey Lớp 1, 3, 5, 6, 7, 8, 9: PASS.
- 360×800 và normal desktop usage: OWNER_BROWSER_OBSERVED, PASS.
- 768×1024: STATIC_COMPONENT_VALIDATED; không gắn nhãn browser-observed.
- 1440×900: STATIC_COMPONENT_VALIDATED; normal desktop usage đã được Owner
  browser-observed nhưng exact viewport không được báo riêng.
- Console red errors: 0; không quan sát server runtime error.

Hydration count, missing-asset count, keyboard navigation và network-level
solution preload không được Owner báo riêng; không suy diễn chúng thành
browser-observed evidence. Các source/component/build/security contract tương
ứng vẫn PASS.

## 1. Kiểm tra server hiện có

Chạy bên ngoài sandbox, trong đúng thư mục:

```bash
cd <repository-root>
curl -I --max-time 3 http://127.0.0.1:3000/
```

Nếu đã nhận HTTP response, dùng server hiện có và không khởi động server thứ
hai. Nếu chưa có response:

```bash
cd <repository-root>
npm run dev
```

Giữ terminal này mở. Không chạy migration, SQL hoặc lệnh publish.

## 2. Route smoke

Mở DevTools, bật Network và Console, sau đó mở lần lượt:

1. `http://127.0.0.1:3000/`
2. `http://127.0.0.1:3000/demo`
3. `http://127.0.0.1:3000/curriculum-preview`
4. `http://127.0.0.1:3000/curriculum-preview?grade=7&unit=grade-7-secondary-geo-p1-8`

Ghi cho từng route:

- HTTP status và redirect chain;
- `DOMContentLoaded`/load time cơ bản;
- console error/warning liên quan app;
- server stack/error overlay;
- hydration mismatch;
- request asset 404;
- broken import.

Kỳ vọng: route page trả 200, không redirect sang login; preview không gọi
Supabase. Trong Network, POST
`http://127.0.0.1:3000/api/curriculum-preview/check` chỉ xuất hiện sau submit.

## 3. Journey chuẩn

Tại `/curriculum-preview`:

1. Chọn “Lớp 1”.
2. Mở “Các số trong phạm vi 10”.
3. Đọc “Mục tiêu học” và ít nhất một thẻ bài học.
4. Đọc một “Ví dụ từng bước”.
5. Xác nhận chưa có “Lời giải từng bước”.
6. Nhấn “Bắt đầu luyện tập”.
7. Ở `grade-1-numbers-to-10-q01`, chọn đáp án có nhãn `8`, nhấn “Kiểm tra”.
8. Xác nhận có “Chính xác!” và lời giải chỉ xuất hiện lúc này.
9. Nhấn “Câu tiếp theo”, cố ý chọn một đáp án sai.
10. Xác nhận có “Mình cùng sửa nhé”, đáp án đúng và lời giải.
11. Nhấn “Câu tiếp theo”.
12. Nhấn “Làm lại từ đầu”, xác nhận về câu 1 và điểm reset.
13. Nhấn “Thoát chủ đề”, chọn một chủ đề khác.
14. Đổi sang một lớp khác.

Để kiểm tra completion, có thể hoàn thành đủ 12 câu của một unit rồi xác nhận:
“Đã hoàn thành chủ đề”, đúng/tổng, “Làm lại từ đầu” và “Chọn chủ đề khác”.
Reload phải reset state vì preview không ghi remote và không lưu browser
storage.

## 4. Journey đại diện bảy lớp

Lặp các bước đọc bài học → ví dụ → start → một đúng → một sai → next → reset
hoặc exit cho các URL sau:

- Lớp 1: `/curriculum-preview?grade=1&unit=grade-1-numbers-to-10`
  - q01 đúng: `8`.
- Lớp 3: `/curriculum-preview?grade=3&unit=grade-3-unit-fractions`
  - q01 đúng: `1/5`.
- Lớp 5: `/curriculum-preview?grade=5&unit=grade-5-decimal-operations`
  - q01 đúng: `4`.
- Lớp 6: `/curriculum-preview?grade=6&unit=grade-6-integer-operations`
  - q01 đúng: `17`.
- Lớp 7: `/curriculum-preview?grade=7&unit=grade-7-secondary-geo-p1-8`
  - q10 đúng: `40°`; để tới q10 nhanh, vẫn phải submit từng câu trước đó.
- Lớp 8: `/curriculum-preview?grade=8&unit=grade-8-linear-equations`
  - q01 đúng: `12`.
- Lớp 9: `/curriculum-preview?grade=9&unit=grade-9-quadratic-functions`
  - q01 đúng: `7`.

Ở câu sai, chọn một option khác đáp án hiển thị hoặc nhập một giá trị rõ ràng
khác. Không dùng Network response của câu trước để suy đáp án câu sau.

## 5. Responsive

Trong DevTools Device Toolbar, chạy đầy đủ journey state tại:

- 360 × 800;
- 768 × 1024;
- 1440 × 900.

Tại mỗi viewport, chụp hoặc ghi kết quả cho:

- grade selection;
- unit list;
- theory;
- worked example;
- question và visual;
- submitted correct/incorrect feedback;
- solution.

Fail nếu có horizontal page overflow, text/formula bị cắt, nút ngoài viewport,
element chồng nhau, SVG label không đọc được, touch target quá nhỏ, scroll bị
kẹt hoặc tiếng Việt dài không wrap.

## 6. Accessibility

Không dùng chuột trong một lượt:

1. Tab qua grade picker và unit cards; focus ring phải nhìn thấy.
2. Enter để mở unit và start practice.
3. Dùng arrow keys đổi radio option, Tab tới “Kiểm tra”, Enter để submit.
4. Focus phải chuyển đến feedback; feedback phải đọc rõ đúng/sai bằng chữ.
5. Tab tới “Câu tiếp theo”, “Làm lại từ đầu” và “Thoát chủ đề”.
6. Dùng Accessibility tree kiểm tra tên của navigation, form control và visual.
7. Bật `prefers-reduced-motion: reduce`; không được có animation gây cản trở.
8. Kiểm tra computed contrast của text, button, focus ring và feedback.

Fail nếu không thể hoàn tất flow bằng bàn phím, control không có name/label,
focus mất, feedback chỉ dùng màu hoặc visual không có accessible description.

## 7. Payload và solution leak

Tại Network:

1. Clear log rồi mở một unit.
2. Tìm trong page/RSC payload: chỉ được có 12 câu của unit đang mở.
3. Trước submit, tìm `correctAnswer`, `solutionSteps`, `solutions`, `audits`.
   Không được có đáp án/lời giải của câu.
4. Xác nhận không có payload chứa cả 2.052 câu hoặc 2.052 lời giải.
5. Submit một câu; POST body chỉ có `unitSlug`, `questionCode`, `answer`.
6. POST response mới được có `correct`, `correctAnswer`, `steps`, `feedback`.
7. Gửi GET tới endpoint check; không được trả solution.
8. Xác nhận không có request Supabase khi dùng preview.

Lưu ý: chuỗi tên field `correctAnswer` có thể tồn tại trong JS client để parse
POST response; đó không phải leak. Leak là answer value hoặc solution data có
trước submit.

## 8. Chốt quyết định

Chỉ đổi status sang READY khi:

- tất cả route thật sự mở;
- bảy journey đại diện PASS;
- ba viewport PASS;
- keyboard/accessibility flow không có lỗi nghiêm trọng;
- Network xác nhận solution boundary;
- Console không có server/hydration/broken asset error;
- BLOCKER/HIGH bằng 0.

Owner evidence và regression gates hiện tại đã đáp ứng checklist bắt buộc.
Quyết định được ghi là `READY_FOR_LOCAL_DEMO_AND_SUBMISSION`. Giữ phần runbook
này để lặp lại smoke check trước mỗi lần trình diễn local; nếu lần chạy sau có
mục fail, ghi exact route, viewport, question ID và reproduction steps.
