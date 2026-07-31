# Nguồn chính thức cho audit Toán Lớp 2

- Phạm vi: Sprint 6A, documentation-only
- Ngày đối chiếu: 29/07/2026
- Mục đích: xác định outcome Lớp 2 trước khi PLAVE thiết kế hoặc phát hành
  content

## 1. Quy ước bằng chứng

Tài liệu trong bộ audit này dùng bốn nhãn:

- `OFFICIAL_SOURCE_CONFIRMED`: nội dung được diễn giải trực tiếp từ nguồn chính
  thức.
- `TECHNICAL_DECOMPOSITION`: cách đội phát triển tách outcome thành contract,
  unit, validator hoặc test; không phải cấu trúc do Bộ GDĐT ban hành.
- `PRODUCT_DECISION`: lựa chọn về thứ tự hiển thị, prerequisite kỹ thuật, số
  câu, UX hoặc release.
- `PRODUCT_HYPOTHESIS`: cách triển khai cần pilot data; optional expert review
  có thể bổ sung evidence.

Không nhãn nào trong tài liệu này là chứng nhận của cơ quan quản lý. Governance
hiện hành nằm tại
[OFFICIAL_SOURCE_PEDAGOGICAL_VALIDATION_POLICY.md](./OFFICIAL_SOURCE_PEDAGOGICAL_VALIDATION_POLICY.md).

## 2. Nguồn quy phạm và tình trạng sửa đổi

| Nguồn | Cơ quan | Vị trí dùng | Căn cứ sử dụng | Tình trạng đối chiếu |
|---|---|---|---|---|
| [Thông tư 32/2018/TT-BGDĐT — toàn văn](https://vbpl.vn/bogiaoducdaotao/Pages/vbpq-toanvan.aspx?ItemID=146721) | Bộ Giáo dục và Đào tạo | Phụ lục Chương trình GDPT; Chương trình môn Toán | Căn cứ pháp lý gốc của chương trình | CSDL VBPL ghi văn bản hết hiệu lực một phần; phải đọc cùng lược đồ và các văn bản sửa đổi |
| [Lược đồ Thông tư 32/2018/TT-BGDĐT](https://vbpl.vn/TW/Pages/ivbpq-luocdo.aspx?ItemID=146721) | CSDL quốc gia về VBPL | Quan hệ sửa đổi của văn bản | Xác định các sửa đổi liên quan đến chương trình | Đã đối chiếu các Thông tư 20/2021, 13/2022 và 17/2025 |
| [Thông tư 20/2021/TT-BGDĐT](https://vbpl.vn/TW/Pages/ivbpq-toanvan.aspx?ItemID=150034) | Bộ Giáo dục và Đào tạo | Nội dung sửa đổi được nêu trong văn bản | Kiểm tra ảnh hưởng lên chương trình hiện hành | Không thấy sửa đổi outcome Toán Lớp 2; sửa đổi liên quan lộ trình môn Tin học |
| [Thông tư 13/2022/TT-BGDĐT](https://vbpl.vn/TW/Pages/vbpq-van-ban-goc.aspx?ItemID=156376) | Bộ Giáo dục và Đào tạo | Nội dung/phụ lục sửa đổi được nêu trong văn bản | Kiểm tra ảnh hưởng lên chương trình hiện hành | Không thấy sửa đổi outcome Toán Lớp 2 trong phạm vi audit |
| [Thông tư 17/2025/TT-BGDĐT](https://vbpl.vn/bogiaoducdaotao/Pages/vbpq-toanvan.aspx?ItemID=183284) | Bộ Giáo dục và Đào tạo | Điều 1 và các phụ lục sửa đổi | Kiểm tra thay đổi mới nhất đã công bố | Có hiệu lực từ 12/09/2025; sửa các chương trình Lịch sử và Địa lí, Lịch sử, Địa lí, Giáo dục công dân; không sửa môn Toán |

`OFFICIAL_SOURCE_CONFIRMED` — trong các văn bản sửa đổi nêu trên, audit không
phát hiện thay đổi đối với outcome Toán Lớp 2. Vì vậy ma trận dùng phần môn Toán
ban hành kèm Thông tư 32/2018 làm căn cứ nội dung, đồng thời không mô tả Thông
tư 32 là còn hiệu lực toàn bộ.

## 3. Nguồn nội dung môn Toán

### 3.1. Chương trình giáo dục phổ thông môn Toán

- Tài liệu:
  [Chương trình giáo dục phổ thông môn Toán](https://moet.gov.vn/content/vanban/Lists/VBDT/Attachments/1559/2.%20Ch%C6%B0%C6%A1ng%20tr%C3%ACnh%20m%C3%B4n%20To%C3%A1n.pdf)
- Cơ quan công bố: Bộ Giáo dục và Đào tạo.
- Vị trí dùng: mục Lớp 2, trang PDF 12–15.
- Vai trò: nguồn outcome chính của ma trận.

Các nhóm được diễn giải từ phần Lớp 2:

| Trang | Nội dung dùng làm căn cứ | Nhãn |
|---:|---|---|
| 12 | Số và cấu tạo thập phân trong phạm vi 1000; so sánh, sắp xếp, tia số, ước lượng theo nhóm chục | `OFFICIAL_SOURCE_CONFIRMED` |
| 12–13 | Thành phần phép tính; cộng, trừ; tính nhẩm; phép tính có hai dấu; ý nghĩa và thành phần nhân, chia; bảng nhân, bảng chia | `OFFICIAL_SOURCE_CONFIRMED` |
| 13 | Điểm, đoạn thẳng, đường cong, đường thẳng, đường gấp khúc, ba điểm thẳng hàng; hình tứ giác; khối trụ, khối cầu; hoạt động tạo hình | `OFFICIAL_SOURCE_CONFIRMED` |
| 13–14 | Đo lường, dụng cụ đo, thời gian, lịch, tiền Việt Nam, tính toán/ước lượng với đại lượng | `OFFICIAL_SOURCE_CONFIRMED` |
| 14–15 | Thu thập, phân loại, kiểm đếm; biểu đồ tranh; nhận xét dữ liệu; khả năng có thể/chắc chắn/không thể | `OFFICIAL_SOURCE_CONFIRMED` |

Các trang trên mô tả outcome, không quy định PLAVE phải chia bao nhiêu unit,
bao nhiêu câu hoặc dùng prerequisite nào.

### 3.2. Hướng dẫn thực hiện trong điều kiện ứng phó dịch Covid-19

- Tài liệu:
  [Phụ lục 1 của hướng dẫn thực hiện chương trình cấp tiểu học năm học
  2021–2022](https://moet.gov.vn/content/vanban/Lists/VBDH/Attachments/3010/Ph%E1%BB%A5%20l%E1%BB%A5c%201.pdf)
- Cơ quan công bố: Bộ Giáo dục và Đào tạo.
- Văn bản liên quan: Công văn 3969/BGDĐT-GDTH ngày 10/09/2021.
- Vị trí dùng: phần Môn Toán Lớp 2, trang PDF 8–12.
- Vai trò: nguồn đối chiếu về nội dung cốt lõi trong một bối cảnh triển khai
  đặc thù; không thay thế Chương trình môn Toán.

Phụ lục giúp kiểm tra các outcome như số đến 1000, so sánh số, phép tính, đại
lượng, thời gian, lịch và tiền Việt Nam. Một số nội dung được hướng dẫn ưu tiên
trong bối cảnh năm học 2021–2022, vì vậy không được dùng riêng tài liệu này để
thu hẹp vĩnh viễn chương trình đầy đủ.

Ví dụ, chương trình đầy đủ nêu bảng nhân/chia 2, 3, …, 9, trong khi hướng dẫn
ứng phó Covid-19 tập trung bảng 2 và 5. `OFFICIAL_SOURCE_CONFIRMED` — hai tài
liệu có vai trò khác nhau; `PRODUCT_DECISION_REQUIRED` — PLAVE chưa được tự chọn
cách chia progression bảng nhân/chia chỉ từ hướng dẫn tạm thời đó.

## 4. Kết luận riêng về Tiền Việt Nam

`OFFICIAL_SOURCE_CONFIRMED` — trang 14 của Chương trình môn Toán đặt việc nhận
biết tiền Việt Nam thông qua hình ảnh một số tờ tiền trong phần Lớp 2. Phụ lục
hướng dẫn, trang 11, tiếp tục thể hiện outcome nhận biết tiền Việt Nam.

`PRODUCT_DECISION_REQUIRED` — outcome chính thức không đủ để PLAVE tự suy ra:

- danh sách mệnh giá bắt buộc cho một unit;
- thứ tự dạy mệnh giá;
- phạm vi tính tiền, trả tiền hoặc tiền thừa;
- hình thức minh họa đáp ứng yêu cầu pháp lý và sư phạm.

Do đó, “Tiền Việt Nam” có thể nằm trong blueprint Lớp 2 nhưng chưa đủ điều kiện
publication hoặc seed content.

## 5. Giới hạn của audit nguồn

- Không sử dụng blog, website luyện thi, khóa học hoặc sách thương mại để quyết
  định curriculum.
- Không xem cấu trúc unit/lesson trong sách giáo khoa là cấu trúc bắt buộc của
  chương trình.
- Không sao chép dài nội dung của nguồn.
- Các ranh giới nội dung chi tiết, distractor, wording và visual cần
  technical validation và Owner decision; optional expert review không bị
  giả mạo thành bắt buộc.
- Việc nguồn chính thức nêu một outcome không đồng nghĩa một implementation
  PLAVE cụ thể đã được Bộ GDĐT hoặc giáo viên phê duyệt.
