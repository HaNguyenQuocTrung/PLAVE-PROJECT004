# Quyết định unit Toán Lớp 1 tiếp theo

> Historical Owner decision. Teacher-hard-blocker wording trong tài liệu này
> được giữ để bảo toàn lịch sử và đã
> `SUPERSEDED_BY_OFFICIAL_SOURCE_VALIDATION_POLICY`. Không có expert review nào
> được suy diễn từ quyết định này.

- Trạng thái owner: **Approved with adjustment**
- Content track: **Sprint 5L**
- Trạng thái nội dung: **NEEDS_EXPERT_REVIEW**
- Migration dự kiến: `0030_grade1_cube_and_cuboid.sql` — chưa áp dụng

## 1. Quyết định đã được duyệt

| Thuộc tính | Giá trị |
|---|---|
| Tên tiếng Việt | **Khối lập phương và khối hộp chữ nhật** |
| Slug | `grade-1-cube-and-cuboid` |
| Grade | 1 |
| Display order | 13 |
| Prerequisite kỹ thuật | `grade-1-basic-geometry-and-position` |
| Nhãn outcome | `OFFICIAL_SOURCE_CONFIRMED` |
| Nhãn prerequisite và cách chia unit | `PRODUCT_DECISION` |
| Trạng thái bộ nội dung cụ thể | `NEEDS_EXPERT_REVIEW` |

Chương trình môn Toán Lớp 1 nêu việc nhận dạng khối lập phương và khối hộp
chữ nhật bằng đồ dùng học tập hoặc vật thật, đồng thời có hoạt động lắp ghép,
xếp hình đơn giản. Nội dung này ở phần Hình học trực quan, trang PDF 10 của
[Chương trình GDPT môn Toán](https://moet.gov.vn/content/vanban/Lists/VBDT/Attachments/1559/2.%20Ch%C6%B0%C6%A1ng%20tr%C3%ACnh%20m%C3%B4n%20To%C3%A1n.pdf).

Sprint 5I đã bao phủ hình tròn, tam giác, vuông, chữ nhật và một số quan hệ vị
trí, nhưng chưa đưa hình khối 3D vào scope. Unit 5L lấp gap này mà không lặp
lại nội dung các unit đang live.

## 2. Prerequisite đã được owner điều chỉnh

`OFFICIAL_SOURCE_CONFIRMED` — chương trình không quy định phải hoàn thành
unit “Thời gian, đồng hồ và lịch” trước khi nhận dạng hai hình khối.

`PRODUCT_DECISION` — prerequisite kỹ thuật được owner duyệt là:

`grade-1-basic-geometry-and-position`

Đây là prerequisite theo domain hình học. Việc đã hoàn thành unit 5I đủ để mở
practice 5L; học sinh không bị buộc hoàn thành unit đồng hồ/lịch vì mục đích
mở unit này. Database vẫn kiểm tra prerequisite bằng `prerequisite_unit_slug`.

## 3. Phạm vi đã duyệt cho development/demo

### Được phép

- `OFFICIAL_SOURCE_CONFIRMED` — nhận biết và gọi tên khối lập phương.
- `OFFICIAL_SOURCE_CONFIRMED` — nhận biết và gọi tên khối hộp chữ nhật.
- `OFFICIAL_SOURCE_CONFIRMED` — liên hệ mô hình với một số vật quen thuộc.
- `OFFICIAL_SOURCE_CONFIRMED` — lắp ghép, xếp hình đơn giản.
- `PRODUCT_DECISION` — phân loại nhóm nhỏ theo hai loại khối.
- `PRODUCT_DECISION` — đếm các khối nhìn thấy đầy đủ trong bố cục đơn giản.

### Bị loại bỏ

- Diện tích, thể tích, công thức, khai triển hình hộp.
- Mặt, cạnh, đỉnh dưới dạng định nghĩa hình học hình thức.
- Khối bị che, suy luận khối ẩn hoặc phối cảnh đánh lừa.
- Cấu trúc ba chiều phức tạp và chứng minh hình học.
- Câu hỏi phụ thuộc duy nhất vào màu sắc.
- Tiền Việt Nam hoặc kiến thức ngoài Lớp 1 của unit.

Các giới hạn cụ thể trên là `PRODUCT_DECISION` để giảm mơ hồ và giữ đúng độ
tuổi.

## 4. Bốn nhóm kỹ năng

| Skill code | Mô tả | Nhãn |
|---|---|---|
| `CUBE_RECOGNITION` | Nhận dạng khối lập phương | Outcome `OFFICIAL_SOURCE_CONFIRMED`; cách chia skill `PRODUCT_DECISION` |
| `CUBOID_RECOGNITION` | Nhận dạng khối hộp chữ nhật | Outcome `OFFICIAL_SOURCE_CONFIRMED`; cách chia skill `PRODUCT_DECISION` |
| `REAL_OBJECT_CLASSIFICATION` | Liên hệ đồ vật quen thuộc với hình khối | Outcome `OFFICIAL_SOURCE_CONFIRMED`; dạng câu `NEEDS_EXPERT_REVIEW` |
| `SIMPLE_BLOCK_COMPOSITION` | Ghép hoặc đếm khối nhìn thấy đầy đủ | Outcome `OFFICIAL_SOURCE_CONFIRMED`; dạng số hóa `NEEDS_EXPERT_REVIEW` |

Sprint 5L dùng 4 skill × 6 câu. MCQ dùng cho nhận dạng/phân loại; NUMBER_INPUT
chỉ dùng đếm số khối nhìn thấy đầy đủ trong miền 0–10.

## 5. Accessibility và visual boundary

- Tái sử dụng renderer React/SVG/CSS nội bộ.
- `SOLID_SCENE` chỉ cho phép dữ liệu typed: vị trí lưới, kích thước giới hạn,
  appearance allowlist, nhãn và mô tả.
- Không cho phép HTML, raw SVG, script, event handler, data URL hoặc URL ngoài.
- Các ô lưới là duy nhất nên khối không chồng lấp hoặc bị che.
- Đường viền và nhãn chữ giúp phân biệt, không dùng màu làm tín hiệu duy nhất.
- Mô tả screen reader nêu đồ vật, vị trí và tỉ lệ quan sát nhưng không chèn
  nhãn “đúng/sai” hoặc trường đáp án.
- `NEEDS_EXPERT_REVIEW` — cần giáo viên/accessibility reviewer rà từng visual,
  distractor và mô tả tương đương trước khi dùng với trẻ em thật.

## 6. Quyết định về Tiền Việt Nam

`OFFICIAL_SOURCE_CONFIRMED` — “Tiền Việt Nam” được chuyển sang future Grade 2
content. Nội dung đó là `OUT_OF_GRADE_SCOPE` đối với chuỗi Lớp 1 và không có
trong migration Sprint 5L. Phạm vi mệnh giá vẫn `NEEDS_EXPERT_REVIEW`.

## 7. Gate còn lại

Owner approval cho phép implementation và development/demo, nhưng không đồng
nghĩa giáo viên đã duyệt nội dung. Trước publication cho trẻ em thật vẫn cần:

1. giáo viên tiểu học rà 24 câu, distractor và lời giải;
2. accessibility review cho câu nhận dạng hình khối;
3. migration `0030` được áp dụng thủ công và post-migration verification;
4. live smoke Lesson → Practice → Review → Results → Retake.
