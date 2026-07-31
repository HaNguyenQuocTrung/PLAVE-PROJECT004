# Ma trận outcome Toán Lớp 2

- Trạng thái: audit blueprint, chưa phê duyệt implementation
- Nguồn: [GRADE2_OFFICIAL_SOURCES.md](./GRADE2_OFFICIAL_SOURCES.md)
- Đơn vị trong cột “Unit dự kiến” là `TECHNICAL_DECOMPOSITION`, không phải tên
  bài chính thức.

## 1. Cách đọc ma trận

Mỗi outcome có một ID kỹ thuật để trace nội dung, test và validator sau này.
ID không phải mã của Bộ GDĐT. Cột “Giáo viên” là optional expert evidence theo
policy hiện hành, không phải hard blocker.

## 2. Ma trận tạm thời

| Outcome ID | Mô tả ngắn | Nhóm | Nguồn | Evidence | Kiến thức nền | Unit dự kiến | Dạng bài phù hợp | Visual/thao tác | Accessibility | Rủi ro nội dung | Giáo viên |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `G2-NUM-01` | Đếm, đọc, viết; nhận biết trăm–chục–đơn vị, số tròn trăm, liền trước/sau và tia số trong phạm vi 1000 | Số tự nhiên | Chương trình Toán tr.12; Phụ lục tr.8 | `OFFICIAL_SOURCE_CONFIRMED` | Số đến 100 | Các số trong phạm vi 1000 | MCQ, NUMBER_INPUT, ghép cấu tạo số | Bó trăm/chục/đơn vị, tia số | Mô tả cấu tạo bằng text, không chỉ màu | Đọc sai số có chữ số 0; trộn vị trí hàng | Cần |
| `G2-NUM-02` | So sánh, tìm lớn nhất/bé nhất, sắp xếp nhóm không quá 4 số; ước lượng theo nhóm chục | Số tự nhiên | Chương trình Toán tr.12 | `OFFICIAL_SOURCE_CONFIRMED` | `G2-NUM-01` | So sánh, sắp xếp và ước lượng đến 1000 | MCQ, NUMBER_INPUT có miền rõ | Tia số, nhóm đối tượng gọn | Alt text không tiết lộ đáp án; kích thước chạm đủ lớn | Đánh đồng nhiều chữ số hơn với luôn lớn hơn; ước lượng mơ hồ | Cần |
| `G2-ARITH-01` | Cộng, trừ trong phạm vi 1000; nhẩm trường hợp phù hợp; nhận biết thành phần phép tính | Số và phép tính | Chương trình Toán tr.12–13 | `OFFICIAL_SOURCE_CONFIRMED` | Số đến 1000; cộng/trừ Lớp 1 | Cộng và trừ Lớp 2 | MCQ, NUMBER_INPUT | Khối giá trị hàng, trục số khi cần | Các bước chấm có text tương đương | Phạm vi nhớ/mượn và mức độ mỗi câu cần bám đúng nguồn | Cần |
| `G2-ARITH-02` | Tính biểu thức có hai dấu cộng/trừ theo thứ tự từ trái sang phải | Số và phép tính | Chương trình Toán tr.13 | `OFFICIAL_SOURCE_CONFIRMED` | `G2-ARITH-01` | Hai phép tính cộng/trừ | MCQ, NUMBER_INPUT | Thanh bước tính | Đọc tuần tự bằng screen reader | Biến thành bài toán nhiều bước vượt mức; dùng ngoặc chưa được xác minh | Cần |
| `G2-MULDIV-01` | Nhận biết ý nghĩa, thành phần và mối liên hệ của phép nhân, phép chia | Nhân và chia | Chương trình Toán tr.13 | `OFFICIAL_SOURCE_CONFIRMED` | Cộng lặp, nhóm bằng nhau | Ý nghĩa phép nhân và phép chia | MCQ, NUMBER_INPUT đếm nhóm | Nhóm bằng nhau, chia đều vật đếm | Mô tả số nhóm và số phần tử | Dạy thuộc bảng trước khi hiểu ý nghĩa; hình chia không đều | Cần |
| `G2-MULDIV-02` | Vận dụng bảng nhân và bảng chia 2, 3, …, 9 trong chương trình đầy đủ | Nhân và chia | Chương trình Toán tr.12–13 | `OFFICIAL_SOURCE_CONFIRMED` | `G2-MULDIV-01` | Bảng nhân và bảng chia | MCQ, NUMBER_INPUT | Mảng hàng/cột đơn giản | Mô tả cấu trúc mảng bằng text | Cách chia nhỏ bảng thành unit chưa có Owner decision; hướng dẫn Covid ưu tiên 2 và 5 không thay thế outcome đầy đủ | Tùy chọn |
| `G2-PROBLEM-01` | Giải quyết tình huống thực tiễn một bước bằng phép cộng, trừ, nhân hoặc chia | Giải quyết vấn đề | Chương trình Toán tr.13 | `OFFICIAL_SOURCE_CONFIRMED` | Phép tính tương ứng | Bài toán một bước Lớp 2 | MCQ, NUMBER_INPUT | Sơ đồ phần–tổng hoặc nhóm | Đề bài tự đủ nghĩa khi không xem hình | Đọc hiểu lấn át Toán; dữ kiện thừa; nhiều phép tính | Cần |
| `G2-GEO-01` | Nhận biết điểm, đoạn thẳng, đường cong, đường thẳng, đường gấp khúc, ba điểm thẳng hàng | Hình học | Chương trình Toán tr.13 | `OFFICIAL_SOURCE_CONFIRMED` | Hình và vị trí Lớp 1 | Điểm và các loại đường | MCQ; NUMBER_INPUT đếm có kiểm soát | SVG đường/điểm typed | Pattern/label thay màu; mô tả tương đương | Độ dày nét, giao điểm và phối cảnh gây mơ hồ | Cần |
| `G2-GEO-02` | Nhận dạng hình tứ giác, khối trụ, khối cầu; thực hành gấp/cắt/lắp ghép/tạo hình phù hợp | Hình học | Chương trình Toán tr.13 | `OFFICIAL_SOURCE_CONFIRMED` | Hình phẳng/khối cơ bản Lớp 1 | Hình tứ giác, khối trụ và khối cầu | MCQ; thao tác mô phỏng giới hạn | SVG/CSS hình phẳng và khối | Mô tả đặc điểm không dựa riêng vào màu | Đồng nhất mọi tứ giác; phối cảnh 3D đánh lừa | Cần |
| `G2-MEAS-01` | Nhận biết, dùng và ước lượng các đơn vị/dụng cụ đo độ dài, khối lượng, dung tích được nêu cho Lớp 2 | Đo lường | Chương trình Toán tr.13–14; Phụ lục tr.10–11 | `OFFICIAL_SOURCE_CONFIRMED` | Số đến 1000; đo độ dài Lớp 1 | Độ dài, khối lượng và dung tích | MCQ, NUMBER_INPUT | Thước, cân, bình chia mức schematic | Vạch/nhãn đọc được; text equivalent | Danh sách đơn vị và quan hệ đưa vào từng slice phải đối chiếu lại từng trang | Cần |
| `G2-TIME-01` | Nhận biết quan hệ ngày–giờ–phút, đọc đồng hồ theo vị trí kim được nêu, ngày/tháng và lịch | Thời gian | Chương trình Toán tr.14; Phụ lục tr.11 | `OFFICIAL_SOURCE_CONFIRMED` | Giờ đúng và lịch cơ bản Lớp 1 | Thời gian và lịch Lớp 2 | MCQ, NUMBER_INPUT | Đồng hồ analog, lịch deterministic | Phân biệt kim bằng hình dạng/độ dài; mô tả ngày | Đồng hồ 24 giờ, khoảng thời gian nhiều bước hoặc vượt tháng khi chưa duyệt | Cần |
| `G2-MONEY-01` | Nhận biết tiền Việt Nam qua hình ảnh một số tờ tiền và chữ/số ghi giá trị | Đo lường/tiền | Chương trình Toán tr.14; Phụ lục tr.11 | `OFFICIAL_SOURCE_CONFIRMED` | Đọc số; so sánh giá trị | Tiền Việt Nam | MCQ, NUMBER_INPUT chỉ sau khi chốt phạm vi | Thẻ tiền schematic, không sao chép tiền thật | Giá trị luôn có text; không chỉ màu/kích thước | Mệnh giá và dạng mua bán chưa đủ căn cứ; rủi ro mô phỏng tiền thật | Cần bắt buộc |
| `G2-STATS-01` | Thu thập, phân loại, kiểm đếm; đọc/mô tả biểu đồ tranh; nhận xét đơn giản | Thống kê | Chương trình Toán tr.14–15; Phụ lục tr.12 | `OFFICIAL_SOURCE_CONFIRMED` | Đếm và so sánh số | Dữ liệu và biểu đồ tranh | MCQ, NUMBER_INPUT | Pictograph typed, bảng kiểm đếm | Mỗi biểu tượng có nhãn; scale được nêu bằng text | Biểu tượng đại diện nhiều đơn vị nếu chưa dạy; câu nhận xét có nhiều đáp án | Cần |
| `G2-PROB-01` | Mô tả sự kiện là có thể, chắc chắn hoặc không thể qua hoạt động đơn giản | Xác suất | Chương trình Toán tr.15 | `OFFICIAL_SOURCE_CONFIRMED` | Ngôn ngữ tình huống quen thuộc | Có thể, chắc chắn, không thể | Chủ yếu MCQ | Vòng quay/túi vật mô phỏng deterministic | Không dựa màu; mô tả đầy đủ tập kết quả | Trộn “ít khả năng” với “không thể”; yêu cầu tính xác suất số | Cần |

## 3. Những điểm chưa được phép suy ra

- `PRODUCT_DECISION_REQUIRED` — danh sách mệnh giá tiền và bài toán trả tiền.
- `PRODUCT_DECISION_REQUIRED` — cách chia bảng nhân/chia thành bao nhiêu unit. Chương
  trình đầy đủ và hướng dẫn triển khai đặc thù năm 2021–2022 không được trộn
  thành một yêu cầu giả.
- `PRODUCT_DECISION_REQUIRED` — danh sách đơn vị đo đưa vào mỗi vertical slice và thứ
  tự giới thiệu.
- `PRODUCT_DECISION` — unit split, slug, prerequisite, số câu và thứ tự release.
- `TECHNICAL_DECOMPOSITION` — outcome ID và mapping sang visual/question type.

## 4. Coverage tối thiểu trước khi gọi là Grade 2 release

Một release không được tự nhận bao phủ Lớp 2 chỉ vì đã có unit số học đầu tiên.
Coverage phải trace từng outcome ở bảng trên tới ít nhất một unit đã:

1. qua content gate;
2. có official-source manifest và technical validation pass;
3. có validator và regression test;
4. được publish thật;
5. không bị bỏ qua trong diagnostic/recommendation.
