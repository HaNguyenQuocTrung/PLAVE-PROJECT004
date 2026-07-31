import type { CurriculumUnit, PreviewAudit, VisualRequirement } from "./types.ts";
import {
  buildCompletionArtifacts,
  generateCompletionQuestionSpecs,
  numberDistractors,
  type CompletionOutcomeSpec,
  type CompletionQuestionCore,
  type CompletionRandom,
  type CompletionUnitGroup,
} from "./completion-framework.ts";

const E = (
  id: string,
  title: string,
  concept: string,
  why: string,
  method: string,
  error: string,
  prompt: string,
  steps: readonly [string, string, string],
  answer: string,
): CompletionOutcomeSpec => ({
  id,
  title,
  concept,
  why,
  method,
  error,
  example: { prompt, steps, answer },
});

const specs = [
  E("MOET2018-G5-NUM-P040-001", "Số tự nhiên: đọc, viết và thứ tự", "Số tự nhiên được đọc theo lớp ba chữ số và so sánh từ hàng cao nhất.", "Giá trị hàng cao hơn quyết định trước mọi hàng bên phải.", "Tách lớp, đọc/viết rồi so số chữ số và từng hàng để xếp thứ tự.", "Không xếp theo tổng chữ số hay chữ số cuối.", "Xếp 405 120, 450 012, 405 102 tăng dần.", ["Cùng sáu chữ số.", "405 102 < 405 120 < 450 012.", "Kiểm tra từng cặp liền nhau."], "405 102, 405 120, 450 012."),
  E("MOET2018-G5-NUM-P040-003", "Bốn phép tính số tự nhiên", "Cộng, trừ, nhân, chia số tự nhiên tuân theo giá trị hàng và quan hệ phép tính ngược.", "Đặt đúng hàng và kiểm tra ngược giữ chính xác với số nhiều chữ số.", "Chọn phép tính, đặt tính, thực hiện và kiểm tra bằng phép ngược.", "Số chia phải khác 0; không bỏ lượt nhớ hoặc mượn.", "Tính 48 216 : 6.", ["6 khác 0.", "Chia lần lượt từ hàng cao được 8 036.", "Kiểm tra 8 036 × 6 = 48 216."], "8 036."),
  E("MOET2018-G5-NUM-P040-004", "Tính chất phép tính số tự nhiên", "Giao hoán, kết hợp và phân phối cho phép nhóm các số để tính hợp lí.", "Các tính chất giữ nguyên giá trị nhưng tạo số tròn dễ tính.", "Tìm cặp tạo chục, trăm, nghìn hoặc đặt thừa số chung.", "Không giao hoán phép trừ, phép chia hay thay số mà không bù.", "Tính nhanh 125 × 8 × 7.", ["Nhóm 125 × 8 = 1 000.", "1 000 × 7 = 7 000.", "Kiểm tra bằng chia cho 7."], "7 000."),
  E("MOET2018-G5-NUM-P041-006", "Bài toán nhiều bước với phân số", "Mỗi bước phân số phải biểu diễn một quan hệ rõ như phần của toàn thể, phần còn lại hoặc tổng phần.", "Sơ đồ phần giúp chọn phép tính thay vì ghép số tùy ý.", "Tóm tắt, quy đồng hoặc tìm phân số của số, thực hiện từng bước và kiểm tra phạm vi.", "Không bỏ đơn vị hoặc để phần tìm được vượt toàn thể.", "Có 40 kg gạo, bán 3/8. Còn bao nhiêu?", ["Bán 40 : 8 × 3 = 15 kg.", "Còn 40 − 15 = 25 kg.", "25 nằm từ 0 đến 40."], "25 kg."),
  E("MOET2018-G5-NUM-P041-007", "Phân số thập phân và hỗn số", "Phân số thập phân có mẫu 10, 100, 1000,...; tử lớn hơn mẫu có thể viết thành hỗn số.", "Chia tử cho mẫu tách được phần nguyên và phần phân số còn lại.", "Nhận mẫu lũy thừa 10, chia tử cho mẫu, ghi thương và số dư trên mẫu.", "Không gọi mọi phân số có chữ số 0 ở mẫu là phân số thập phân.", "Viết 237/100 dưới dạng hỗn số.", ["237 : 100 = 2 dư 37.", "Phần nguyên là 2.", "Phần phân số là 37/100."], "2 37/100."),
  E("MOET2018-G5-NUM-P041-008", "Cấu tạo số thập phân", "Số thập phân gồm phần nguyên bên trái dấu phẩy và phần thập phân bên phải theo hàng phần mười, phần trăm, phần nghìn.", "Mỗi hàng bên phải có giá trị bằng một phần mười hàng liền trước.", "Tách ở dấu phẩy, xác định lần lượt từng hàng và viết tổng giá trị.", "Không dùng độ dài chuỗi để so sánh; số 0 tận cùng bên phải không đổi giá trị.", "Nêu giá trị chữ số 7 trong 12,375.", ["7 ở hàng phần trăm.", "Một phần trăm là 0,01.", "7 × 0,01 = 0,07."], "0,07."),
  E("MOET2018-G5-NUM-P041-013", "Cộng trừ phân số khác mẫu", "Có thể lấy tích hai mẫu khác 0 làm mẫu chung rồi cộng hoặc trừ tử tương ứng.", "Quy đồng tạo cùng đơn vị phần nên tử mới mới được cộng hoặc trừ.", "Nhân chéo để đổi tử, giữ mẫu chung là tích và rút gọn.", "Không cộng trực tiếp mẫu số hay dùng mẫu 0.", "Tính 2/3 + 1/5.", ["Mẫu chung 15.", "2/3 = 10/15; 1/5 = 3/15.", "Tổng 13/15."], "13/15."),
  E("MOET2018-G5-NUM-P042-015", "Bài toán với số thập phân", "Bài toán thập phân dùng các phép tính theo ý nghĩa đại lượng và phải căn thẳng hàng khi cộng trừ.", "Cùng đơn vị và giá trị hàng giúp kết quả có nghĩa.", "Đổi cùng đơn vị, lập phép tính, tính và kiểm tra độ lớn.", "Không cộng số đo khác đơn vị hoặc làm mất dấu phẩy.", "Có 2,5 l nước, thêm 0,75 l. Có bao nhiêu?", ["Cùng đơn vị lít.", "2,50 + 0,75 = 3,25.", "Kết quả lớn hơn 2,5."], "3,25 l."),
  E("MOET2018-G5-NUM-P042-016", "Làm tròn số thập phân", "Làm tròn giữ đến hàng yêu cầu và xét chữ số ngay bên phải: từ 5 tăng 1, dưới 5 giữ.", "Mốc 5 chia hai khoảng gần hai số tròn kế cận.", "Căn hàng, xét đúng một chữ số quyết định, tăng hoặc giữ rồi bỏ phần sau.", "Không xét độ dài chuỗi hoặc bỏ qua trường hợp nhớ sang phần nguyên.", "Làm tròn 7,995 đến hai chữ số thập phân.", ["Giữ đến hàng phần trăm.", "Chữ số phần nghìn là 5 nên tăng.", "7,99 tăng thành 8,00."], "8,00."),
  E("MOET2018-G5-NUM-P042-017", "Tỉ lệ bản đồ", "Tỉ lệ 1:n nghĩa là 1 đơn vị trên bản đồ ứng với n đơn vị cùng loại ngoài thực tế.", "Tỉ lệ là quan hệ nhân cố định giữa độ dài bản đồ và thực tế.", "Nhân độ dài bản đồ với n rồi đổi sang đơn vị phù hợp.", "Không nhân trước khi thống nhất đơn vị.", "Bản đồ 1:100 000, đoạn dài 3 cm. Thực tế bao nhiêu km?", ["3 × 100 000 = 300 000 cm.", "100 000 cm = 1 km.", "300 000 cm = 3 km."], "3 km."),
  E("MOET2018-G5-NUM-P042-018", "Chia cho số thập phân", "Nhân cả số bị chia và số chia với cùng lũy thừa 10 biến số chia thập phân thành số tự nhiên.", "Nhân cùng một số khác 0 không đổi thương.", "Đếm chữ số thập phân của số chia, dịch dấu phẩy ở cả hai số rồi chia.", "Không chỉ dịch dấu phẩy ở số chia; số chia không được bằng 0.", "Tính 7,2 : 0,24.", ["Nhân cả hai số với 100.", "720 : 24 = 30.", "Kiểm tra 30 × 0,24 = 7,2."], "30."),
  E("MOET2018-G5-NUM-P042-020", "Nhân với số thập phân", "Nhân như số tự nhiên rồi đặt dấu phẩy theo tổng số chữ số thập phân của hai thừa số.", "Mỗi chữ số thập phân biểu diễn phép chia cho 10 nên tích phải chia theo tổng số hàng.", "Bỏ dấu phẩy tạm thời, nhân, đếm tổng hàng thập phân và đặt lại.", "Không đặt dấu phẩy theo riêng một thừa số.", "Tính 12 × 0,35.", ["12 × 35 = 420.", "0,35 có hai chữ số thập phân.", "Đặt hai chữ số được 4,20 = 4,2."], "4,2."),
  E("MOET2018-G5-NUM-P042-021", "Nhân chia nhẩm số thập phân", "Nhân hoặc chia với 10, 100, 1000 dịch giá trị hàng; với 0,1; 0,01 có quan hệ ngược.", "0,1 bằng 1/10 nên nhân 0,1 tương đương chia 10.", "Xác định số hàng cần dịch và chiều dịch từ phép tính.", "Không thêm hoặc xóa số 0 theo hình thức mà bỏ giá trị hàng.", "Tính 4,56 : 0,1.", ["Chia 0,1 tương đương nhân 10.", "Dịch dấu phẩy sang phải một hàng.", "4,56 : 0,1 = 45,6."], "45,6."),
  E("MOET2018-G5-NUM-P042-022", "Sắp xếp số thập phân", "So phần nguyên trước; nếu bằng, thêm số 0 tận cùng bên phải để căn thẳng hàng rồi so từng hàng.", "Số 0 tận cùng bên phải phần thập phân không đổi giá trị.", "Chuẩn hóa cùng số hàng thập phân, so từ trái sang phải và xếp tối đa bốn số.", "Không so bằng độ dài chuỗi chữ số.", "Xếp 2,5; 2,05; 2,500; 2,15 tăng dần.", ["Viết 2,500; 2,050; 2,500; 2,150.", "2,05 < 2,15 < 2,5.", "2,5 = 2,500."], "2,05; 2,15; 2,5; 2,500."),
  E("MOET2018-G5-NUM-P042-023", "Tính chất phép tính thập phân", "Giao hoán, kết hợp và phân phối vẫn đúng với số thập phân trong miền xác định.", "Giá trị số không phụ thuộc cách nhóm hợp lệ.", "Tạo số tròn bằng nhóm hoặc đặt thừa số chung rồi kiểm tra dấu phẩy.", "Không giao hoán phép trừ/chia hoặc chia cho 0.", "Tính nhanh 2,5 × 4 × 1,7.", ["Nhóm 2,5 × 4 = 10.", "10 × 1,7 = 17.", "Kiểm tra độ lớn hợp lí."], "17."),
  E("MOET2018-G5-GEO-P043-001", "Giải quyết vấn đề hình học thực tiễn", "Đo, vẽ, lắp ghép và tạo hình cần thỏa đồng thời kích thước, góc và quan hệ hình học.", "Điều kiện đo được cho phép kiểm tra sản phẩm thay vì suy bằng mắt.", "Lập kế hoạch, chọn dụng cụ, thực hiện và đo lại từng điều kiện.", "Không suy từ hình không theo tỉ lệ.", "Tạo khung chữ nhật 8 cm × 5 cm.", ["Vẽ hai cạnh vuông góc dài 8 cm và 5 cm.", "Dựng hai cạnh đối song song.", "Đo lại bốn góc và các cạnh."], "Khung chữ nhật 8 cm × 5 cm."),
  E("MOET2018-G5-GEO-P043-002", "Biểu tượng thể tích", "Thể tích cho biết phần không gian một vật chiếm chỗ và có thể so bằng số khối lập phương đơn vị.", "Khối đơn vị bằng nhau tạo phép đo nhất quán ba chiều.", "Xếp kín không hở/chồng, đếm theo lớp hoặc dài × rộng × cao.", "Không nhầm thể tích với diện tích bề mặt.", "Khối có 3 lớp, mỗi lớp 4 khối đơn vị. Thể tích?", ["Mỗi lớp có 4 khối.", "3 × 4 = 12 khối.", "Thể tích là 12 đơn vị khối."], "12 đơn vị khối."),
  E("MOET2018-G5-GEO-P043-003", "Ki-lô-mét vuông và héc-ta", "km² và ha đo diện tích lớn; 1 km² = 100 ha, 1 ha = 10 000 m².", "Đơn vị vuông tăng theo bình phương hệ số độ dài.", "Chọn đơn vị theo quy mô và đổi bằng quan hệ 100 hoặc 10 000.", "Không đổi diện tích như độ dài tuyến tính.", "Đổi 3 km² thành ha.", ["1 km² = 100 ha.", "3 × 100 = 300.", "Ghi 300 ha."], "300 ha."),
  E("MOET2018-G5-GEO-P043-004", "Hình khai triển khối", "Hình khai triển là các mặt phẳng nối theo cạnh có thể gấp thành khối không chồng hoặc thiếu mặt.", "Quan hệ cạnh chung quyết định các mặt gặp nhau khi gấp.", "Đếm đúng loại mặt, kiểm tra cạnh nối và tưởng tượng/gấp thử.", "Không nhận chỉ theo số mặt mà bỏ cách nối.", "Một khai triển lập phương cần bao nhiêu hình vuông?", ["Lập phương có 6 mặt.", "Mỗi mặt là hình vuông bằng nhau.", "Khai triển cần 6 hình vuông nối hợp lệ."], "6 hình vuông."),
  E("MOET2018-G5-NUM-P043-024", "Máy tính và phần trăm", "Máy tính hỗ trợ phép tính nhưng biểu thức nhập, thứ tự và kết quả vẫn phải được ước lượng kiểm tra.", "Ước lượng phát hiện lỗi bấm phím hoặc dấu phần trăm.", "Lập biểu thức trước, nhập đúng phím, đọc kết quả và đối chiếu ước lượng.", "Không coi màn hình là đúng nếu biểu thức nhập sai.", "Dùng máy tính tìm 15% của 240.", ["Nhập 240 × 15 ÷ 100.", "Máy cho 36.", "Ước lượng 10% là 24, nên 36 hợp lí."], "36."),
  E("MOET2018-G5-GEO-P044-008", "Bài toán chuyển động đều", "Trong chuyển động đều: quãng đường = vận tốc × thời gian; vận tốc = quãng đường : thời gian.", "Cùng vận tốc nghĩa là đi các quãng đường bằng nhau trong các khoảng thời gian bằng nhau.", "Xác định đại lượng cần tìm, thống nhất đơn vị, chọn công thức và kiểm tra.", "Không nhân khi cần chia hoặc trộn giờ với phút.", "Đi 120 km trong 3 giờ. Vận tốc?", ["Đơn vị km và giờ.", "120 : 3 = 40.", "Kiểm tra 40 × 3 = 120."], "40 km/h."),
  E("MOET2018-G5-GEO-P044-009", "Bài toán thể tích, dung tích và thời gian", "Các bài toán đo nhiều bước cần đổi về cùng đơn vị trước khi cộng, trừ, nhân hoặc chia.", "Phép tính chỉ có nghĩa khi các số đo cùng đại lượng và đơn vị.", "Đổi đơn vị, tính, ghi đơn vị kết quả và kiểm tra sức chứa/thời gian.", "Không coi cm³ và ml khác lượng khi dùng 1 cm³ = 1 ml.", "Hộp 2 000 cm³ chứa bao nhiêu lít?", ["1 000 cm³ = 1 l.", "2 000 : 1 000 = 2.", "Dung tích 2 l."], "2 l."),
  E("MOET2018-G5-GEO-P044-010", "Vận tốc và đơn vị", "Vận tốc mô tả quãng đường đi được trong một đơn vị thời gian, dùng km/h hoặc m/s.", "Tỉ số quãng đường/thời gian cho phép so sánh chuyển động.", "Lấy quãng đường chia thời gian và ghi đơn vị dạng quãng đường/thời gian.", "Không ghi km hoặc giờ riêng lẻ cho vận tốc.", "Chạy 300 m trong 60 s. Vận tốc?", ["300 : 60 = 5.", "Đơn vị là m trên giây.", "Vận tốc 5 m/s."], "5 m/s."),
  E("MOET2018-G5-GEO-P044-011", "Sử dụng dụng cụ đo và mua bán", "Dụng cụ phải phù hợp đại lượng, giới hạn đo và độ chia; mua bán dùng đúng mệnh giá.", "Dụng cụ và đơn vị đúng làm số đo có ý nghĩa.", "Chọn dụng cụ, kiểm tra vạch 0, đọc đúng tư thế và ghi kết quả.", "Không đọc xiên hoặc dùng dụng cụ sai đại lượng.", "Đo 750 ml nước bằng dụng cụ nào?", ["Đại lượng là dung tích.", "Chọn bình đong có vạch ml.", "Đọc ngang mặt nước."], "Bình đong."),
  E("MOET2018-G5-GEO-P044-012", "Thực hành đo đại lượng", "Một quy trình đo gồm ước lượng, chọn dụng cụ, đo lặp lại và ghi đơn vị.", "Ước lượng và đo lặp giúp phát hiện sai số thô.", "Nêu đại lượng, chọn thang đo phù hợp, đo và so với ước lượng.", "Không ghi kết quả thiếu đơn vị hay vượt giới hạn dụng cụ.", "Cân một túi gạo khoảng 5 kg.", ["Ước lượng khoảng 5 kg.", "Chọn cân có giới hạn trên 5 kg.", "Đặt túi và đọc theo vạch kg."], "Dùng cân, ghi kết quả bằng kg."),
  E("MOET2018-G5-GEO-P044-013", "Đổi thể tích và thời gian", "1 m³ = 1 000 dm³; 1 dm³ = 1 000 cm³; thời gian dùng quan hệ 60 và 24.", "Đơn vị thể tích thay đổi theo lập phương hệ số độ dài.", "Xác định chiều đổi, nhân/chia 1 000 cho thể tích hoặc dùng đúng quan hệ thời gian.", "Không đổi m³ sang dm³ bằng 10.", "Đổi 2,5 dm³ thành cm³.", ["1 dm³ = 1 000 cm³.", "2,5 × 1 000 = 2 500.", "Ghi 2 500 cm³."], "2 500 cm³."),
  E("MOET2018-G5-GEO-P044-014", "Ước lượng thể tích", "Ước lượng thể tích dựa vào vật mốc có kích thước và đơn vị khối quen thuộc.", "So ba kích thước tránh nhầm cỡ và nhầm diện tích.", "Ước lượng dài, rộng, cao rồi nhân gần đúng và chọn đơn vị.", "Không nêu số thiếu đơn vị hoặc dùng cm².", "Hộp phấn khoảng 20 cm × 10 cm × 5 cm. Thể tích?", ["Nhân ba kích thước.", "20 × 10 × 5 = 1 000.", "Ước lượng 1 000 cm³."], "Khoảng 1 000 cm³."),
  E("MOET2018-G5-STA-P045-003", "Bài toán từ biểu đồ quạt tròn", "Mỗi quạt biểu diễn một phần của toàn thể 100% hoặc 360°.", "Tỉ lệ diện tích quạt tương ứng tỉ lệ dữ liệu.", "Đọc chú giải và phần trăm, nhân với tổng hoặc so các phần.", "Không cộng phần trăm vượt 100% hay bỏ chú giải.", "40% của 200 học sinh chọn A. Có bao nhiêu?", ["40% = 40/100.", "200 × 40/100 = 80.", "80 không vượt tổng 200."], "80 học sinh."),
  E("MOET2018-G5-STA-P045-004", "Quy luật từ biểu đồ quạt", "So các tỉ lệ quạt qua nhiều thời điểm có thể phát hiện xu hướng tăng, giảm hoặc ổn định.", "Dãy phần trăm cho bằng chứng định lượng của xu hướng.", "Đọc từng phần trăm, tính chênh lệch liên tiếp và kiểm tra toàn dãy.", "Không kết luận từ một thời điểm duy nhất.", "Tỉ lệ 20%, 25%, 30% có quy luật gì?", ["Hiệu lần lượt 5 và 5 điểm phần trăm.", "Cả hai khoảng cùng tăng.", "Tăng đều 5 điểm phần trăm."], "Tăng đều 5 điểm phần trăm."),
  E("MOET2018-G5-STA-P045-005", "Chọn cách biểu diễn dữ liệu", "Dãy phù hợp dữ liệu ít; bảng phù hợp tra cứu; biểu đồ phù hợp so sánh hoặc cơ cấu.", "Mục đích đọc quyết định biểu diễn nào truyền đạt rõ nhất.", "Xác định loại dữ liệu và câu hỏi cần trả lời rồi chọn biểu diễn có thang/chú giải.", "Không chọn biểu đồ quạt nếu tổng không tạo một toàn thể.", "Muốn thể hiện cơ cấu chi tiêu 100%, chọn gì?", ["Các phần tạo thành một toàn thể.", "Cần thấy tỉ lệ từng phần.", "Chọn biểu đồ quạt tròn."], "Biểu đồ quạt tròn."),
  E("MOET2018-G5-STA-P045-007", "Thống kê và phần trăm", "Số thập phân, phân số và phần trăm là các cách biểu diễn tỉ lệ trong dữ liệu.", "Đổi biểu diễn giúp so sánh và giải thích thống kê.", "Tính tỉ lệ phần/tổng rồi đổi sang thập phân hoặc phần trăm.", "Không dùng phần trăm khi mẫu số tổng bằng 0.", "15 trong 60 tương ứng bao nhiêu phần trăm?", ["15/60 = 1/4.", "1/4 = 0,25.", "0,25 = 25%."], "25%."),
  E("MOET2018-G5-STA-P045-008", "Thu thập và phân loại dữ liệu", "Dữ liệu được thu thập theo câu hỏi và phân loại bằng tiêu chí rõ, không chồng lặp khi yêu cầu nhóm rời nhau.", "Tiêu chí nhất quán làm tổng kiểm đếm khớp số quan sát.", "Nêu nguồn, ghi từng quan sát, phân loại, đếm và sắp xếp.", "Không đổi tiêu chí giữa chừng hoặc đếm một đối tượng hai lần.", "Khảo sát 20 bạn: 12 đi bộ, 8 đi xe.", ["Hai nhóm cùng tiêu chí cách đi học.", "12 + 8 = 20.", "Sắp xếp 8, 12 nếu cần tăng dần."], "Tổng 20, dữ liệu hợp lí."),
  E("MOET2018-G5-EXP-P046-001", "Chi tiêu, lãi và lỗ", "Lãi = giá bán − giá vốn; lỗ = giá vốn − giá bán; lãi suất phần trăm tính trên vốn hoặc số tiền gửi theo điều kiện.", "So thu và chi cho biết giao dịch tăng hay giảm tiền.", "Ghi đủ vốn, thu, thời hạn; tính chênh lệch và kiểm tra dấu/đơn vị.", "Không tính phần trăm trên sai số tiền gốc.", "Mua 200 000 đồng, bán 230 000 đồng. Lãi?", ["Thu lớn hơn vốn.", "230 000 − 200 000 = 30 000.", "Tỉ lệ lãi 30 000/200 000 = 15%."], "Lãi 30 000 đồng, 15%."),
  E("MOET2018-G5-EXP-P046-002", "Dự án dữ liệu thực tiễn", "Dự án dữ liệu gồm câu hỏi, nguồn, thu thập, làm sạch, biểu diễn và kết luận.", "Quy trình minh bạch cho phép kiểm tra tổng và giới hạn kết luận.", "Chọn tiêu chí, ghi dữ liệu, kiểm tra, chọn bảng/biểu đồ và nêu nhận xét có số.", "Không bỏ dữ liệu trái dự đoán hoặc dùng thang không đều.", "Số chai tái chế 4 tuần: 20, 25, 30, 35.", ["Cùng tiêu chí và đơn vị chai.", "Mỗi tuần tăng 5.", "Biểu đồ cột phù hợp so sánh tuần."], "Tăng đều 5 chai mỗi tuần."),
  E("MOET2018-G5-EXP-P046-003", "Tổng hợp thể tích và chuyển động", "Bài thực hành tổng hợp dùng mô hình thể tích hoặc quan hệ quãng đường–vận tốc–thời gian.", "Ước lượng độc lập kiểm tra phép tính và đơn vị.", "Đo/đọc dữ kiện, chọn công thức, tính, ghi đơn vị và đối chiếu mức hợp lí.", "Không trộn đại lượng hoặc dùng diện tích thay thể tích.", "Xe đi 45 km/h trong 2,5 giờ. Quãng đường?", ["s = v × t.", "45 × 2,5 = 112,5.", "Ghi 112,5 km."], "112,5 km."),
] as const;

const ids = specs.map((spec) => spec.id);
const groups: readonly CompletionUnitGroup[] = [
  { slug: "grade-5-natural-number-fluency-p1", title: "Số tự nhiên và tính hợp lí lớp 5", code: "G5-P1-NUM-A", domain: "NUMBERS_AND_OPERATIONS", visual: "PLACE_VALUE_CHART", prerequisiteSlugs: ["grade-4-place-value-millions-p1"], outcomeIds: ids.slice(0, 3) },
  { slug: "grade-5-fraction-decimal-foundations-p1", title: "Phân số và cấu tạo số thập phân", code: "G5-P1-NUM-B", domain: "NUMBERS_AND_OPERATIONS", visual: "FRACTION_BAR", prerequisiteSlugs: ["grade-4-fraction-foundations-p1"], outcomeIds: ids.slice(3, 7) },
  { slug: "grade-5-decimal-operations-p1", title: "Phép tính và làm tròn số thập phân", code: "G5-P1-NUM-C", domain: "NUMBERS_AND_OPERATIONS", visual: "PLACE_VALUE_CHART", prerequisiteSlugs: ["grade-4-expression-properties-p1"], outcomeIds: [ids[7], ids[8], ids[10], ids[11]] },
  { slug: "grade-5-decimal-relations-map-p1", title: "Tỉ lệ bản đồ và quan hệ thập phân", code: "G5-P1-NUM-D", domain: "NUMBERS_AND_OPERATIONS", visual: "NUMBER_LINE", prerequisiteSlugs: ["grade-4-number-patterns-p1"], outcomeIds: [ids[9], ids[12], ids[13], ids[14]] },
  { slug: "grade-5-volume-area-nets-p1", title: "Thể tích, diện tích lớn và hình khai triển", code: "G5-P1-GEO-A", domain: "GEOMETRY", visual: "SOLID_NET", prerequisiteSlugs: ["grade-4-geometry-construction-p1"], outcomeIds: ids.slice(15, 19) },
  { slug: "grade-5-calculator-motion-p1", title: "Máy tính và chuyển động đều", code: "G5-P1-APP-A", domain: "APPLIED_PROBLEM_SOLVING", visual: "MEASUREMENT_SCALE", prerequisiteSlugs: ["grade-4-experience-projects-p1"], outcomeIds: ids.slice(19, 23) },
  { slug: "grade-5-measurement-practice-p1", title: "Thực hành và đổi số đo lớp 5", code: "G5-P1-MEA-A", domain: "MEASUREMENT", visual: "MEASUREMENT_SCALE", prerequisiteSlugs: ["grade-4-measurement-tools-p1"], outcomeIds: ids.slice(23, 27) },
  { slug: "grade-5-statistical-representations-p1", title: "Biểu đồ quạt và biểu diễn dữ liệu", code: "G5-P1-STA-A", domain: "STATISTICS_AND_PROBABILITY", visual: "DATA_DISPLAY", prerequisiteSlugs: ["grade-4-data-reasoning-p1"], outcomeIds: ids.slice(27, 31) },
  { slug: "grade-5-data-finance-experience-p1", title: "Dữ liệu, tài chính và trải nghiệm", code: "G5-P1-EXP-A", domain: "APPLIED_PROBLEM_SOLVING", visual: "DATA_DISPLAY", prerequisiteSlugs: ["grade-4-experience-projects-p1"], outcomeIds: ids.slice(31, 35) },
] as const;

const artifacts = buildCompletionArtifacts({
  grade: 5,
  kind: "GRADE5_OUTCOME_COMPLETION",
  specs,
  groups,
  restrictions: [
    "Chỉ dùng kiến thức và kí hiệu thuộc yêu cầu cần đạt Lớp 5.",
    "So sánh thập phân theo phần nguyên và giá trị hàng; số 0 tận cùng bên phải không đổi giá trị.",
    "Mẫu số, số chia khác 0; số đo phải cùng đơn vị trước khi tính.",
  ],
});
export const grade5CompletionOutcomes = artifacts.outcomes;
export const grade5CompletionUnitSeeds = artifacts.unitSeeds;
export const grade5CompletionTargetOutcomeIds = ids;

const p = (name: string, value: string | number) => ({ name, value });
const n = (
  prompt: string,
  answer: number,
  steps: readonly string[],
  feedback: string,
  parameters: PreviewAudit["parameters"],
  visualRequirement?: VisualRequirement,
): CompletionQuestionCore => ({
  prompt,
  answer: String(answer),
  distractors: numberDistractors(answer),
  steps,
  feedback,
  inputType: "NUMBER_INPUT",
  parameters,
  visualRequirement,
});
const t = (
  prompt: string,
  answer: string,
  distractors: [string, string, string],
  steps: readonly string[],
  feedback: string,
  parameters: PreviewAudit["parameters"],
  visualRequirement?: VisualRequirement,
): CompletionQuestionCore => ({
  prompt,
  answer,
  distractors,
  steps,
  feedback,
  inputType: "TEXT_INPUT",
  parameters,
  visualRequirement,
});
const decimal = (hundredths: number) =>
  (hundredths / 100).toLocaleString("vi-VN", {
    minimumFractionDigits: hundredths % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

function scenario(
  id: string,
  occurrence: number,
  r: CompletionRandom,
): CompletionQuestionCore {
  switch (id) {
    case ids[0]: {
      const values = [r.integer(120, 180) * 1000 + 5, r.integer(181, 230) * 1000 + 15, r.integer(80, 119) * 1000 + 50];
      const sorted = [...values].sort((a, b) => a - b);
      return t(`Xếp ${values.map((v) => v.toLocaleString("vi-VN")).join(", ")} tăng dần.`, sorted.map((v) => v.toLocaleString("vi-VN")).join(", "), [values.join(", "), [...sorted].reverse().join(", "), "Không thể xếp"], ["So số chữ số.", "So từ hàng cao nhất.", "Kiểm tra từng cặp tăng dần."], "Không dùng tổng chữ số để xếp.", values.map((v, i) => p(`value${i}`, v)), "PLACE_VALUE_CHART");
    }
    case ids[1]: {
      const divisor = r.integer(3, 9);
      const quotient = r.integer(200, 900);
      return n(`Tính ${divisor * quotient} : ${divisor}.`, quotient, [`Số chia ${divisor} khác 0.`, `${divisor * quotient} : ${divisor} = ${quotient}.`, `Kiểm tra ${quotient} × ${divisor}.`], "Dùng phép nhân ngược và không chia cho 0.", [p("dividend", divisor * quotient), p("divisor", divisor)]);
    }
    case ids[2]: {
      const factor = r.integer(3, 9);
      return n(`Tính nhanh 125 × 8 × ${factor}.`, 1000 * factor, ["Nhóm 125 × 8 = 1 000.", `Nhân ${factor} được ${1000 * factor}.`, "Kiểm tra bằng phép chia ngược."], "Chỉ nhóm các thừa số của phép nhân.", [p("a", 125), p("b", 8), p("c", factor)]);
    }
    case ids[3]: {
      const denominator = [4, 5, 8][occurrence % 3];
      const numerator = r.integer(1, denominator - 1);
      const whole = denominator * r.integer(6, 12);
      const used = whole / denominator * numerator;
      return n(`Có ${whole} kg, dùng ${numerator}/${denominator}. Còn bao nhiêu kg?`, whole - used, [`Dùng ${whole} : ${denominator} × ${numerator} = ${used}.`, `Còn ${whole} − ${used} = ${whole - used}.`, "Kết quả nằm trong 0 đến toàn thể."], "Tìm phần đã dùng trước rồi lấy toàn thể trừ đi.", [p("whole", whole), p("numerator", numerator), p("denominator", denominator)]);
    }
    case ids[4]: {
      const denominator = [10, 100, 1000][occurrence % 3];
      const numerator = denominator * r.integer(1, 5) + r.integer(1, denominator - 1);
      const whole = Math.floor(numerator / denominator);
      const remainder = numerator % denominator;
      return t(`Viết ${numerator}/${denominator} dưới dạng hỗn số.`, `${whole} ${remainder}/${denominator}`, [`${remainder} ${whole}/${denominator}`, `${whole}/${denominator}`, `${numerator - denominator}/${denominator}`], [`Chia ${numerator} cho ${denominator}.`, `Thương ${whole}, dư ${remainder}.`, "Giữ mẫu phân số thập phân."], "Phần nguyên là thương, tử phần lẻ là số dư.", [p("numerator", numerator), p("denominator", denominator)]);
    }
    case ids[5]: {
      const integer = r.integer(2, 30);
      const tenths = r.integer(1, 9);
      const hundredths = r.integer(1, 9);
      return n(`Trong ${integer},${tenths}${hundredths}, chữ số ${hundredths} có giá trị bao nhiêu phần trăm đơn vị?`, hundredths, ["Chữ số đứng thứ hai sau dấu phẩy.", "Đó là hàng phần trăm.", `Giá trị ${hundredths}/100 đơn vị.`], "Căn theo giá trị hàng, không theo độ dài chuỗi.", [p("integer", integer), p("tenths", tenths), p("hundredths", hundredths)], "PLACE_VALUE_CHART");
    }
    case ids[6]: {
      const a = r.integer(1, 4), b = r.integer(2, 7), c = r.integer(1, 4), d = r.integer(2, 7);
      const numerator = a * d + c * b, denominator = b * d;
      return t(`Tính ${a}/${b} + ${c}/${d} theo mẫu chung là tích hai mẫu.`, `${numerator}/${denominator}`, [`${a + c}/${b + d}`, `${numerator}/${b + d}`, `${a * c}/${denominator}`], [`Mẫu chung ${b} × ${d} = ${denominator}.`, `Tử mới ${a} × ${d} + ${c} × ${b} = ${numerator}.`, "Giữ mẫu chung."], "Không cộng trực tiếp hai mẫu.", [p("a", a), p("b", b), p("c", c), p("d", d)]);
    }
    case ids[7]: {
      const start = r.integer(120, 450), add = r.integer(25, 90);
      return n(`Có ${decimal(start)} l, thêm ${decimal(add)} l. Tổng bao nhiêu phần trăm lít?`, start + add, ["Cùng đơn vị lít.", `Cộng theo phần trăm: ${start} + ${add} = ${start + add}.`, "Đổi lại số thập phân nếu cần."], "Căn thẳng hàng giá trị hàng khi cộng.", [p("leftHundredths", start), p("rightHundredths", add)]);
    }
    case ids[8]: {
      const scale = [1, 10, 100][occurrence % 3];
      const lower = r.integer(100, 900) * scale;
      const offset = occurrence % 2 ? 6 * scale / 10 : 4 * scale / 10;
      const value = lower + offset;
      const rounded = Math.round(value / scale) * scale;
      return n(`Làm tròn ${value / 100} đến đơn vị ${scale / 100}. Viết kết quả theo phần trăm đơn vị.`, rounded, ["Xét chữ số ngay bên phải hàng giữ.", offset >= scale / 2 ? "Tăng hàng giữ một đơn vị." : "Giữ hàng đang xét.", "Bỏ phần sau."], "Ranh giới 5 làm tròn lên, kể cả khi nhớ sang phần nguyên.", [p("scaledValue", value), p("scale", scale), p("rounded", rounded)]);
    }
    case ids[9]: {
      const mapCm = r.integer(2, 8), ratio = [10_000, 100_000, 1_000_000][occurrence % 3];
      return n(`Bản đồ 1:${ratio.toLocaleString("vi-VN")}, đoạn dài ${mapCm} cm. Thực tế bao nhiêu mét?`, mapCm * ratio / 100, [`Nhân ${mapCm} × ${ratio}.`, "Được độ dài thực tế theo cm.", "Chia 100 để đổi sang m."], "Phải giữ cùng đơn vị trước khi áp dụng tỉ lệ.", [p("mapCm", mapCm), p("ratio", ratio)]);
    }
    case ids[10]: {
      const divisorHundredths = [25, 40, 50][occurrence % 3], quotient = r.integer(2, 12), dividendHundredths = divisorHundredths * quotient;
      return n(`Tính ${decimal(dividendHundredths)} : ${decimal(divisorHundredths)}.`, quotient, ["Nhân cả hai số với 100.", `${dividendHundredths} : ${divisorHundredths} = ${quotient}.`, "Kiểm tra bằng phép nhân."], "Dịch dấu phẩy ở cả số bị chia và số chia; số chia khác 0.", [p("dividendHundredths", dividendHundredths), p("divisorHundredths", divisorHundredths)]);
    }
    case ids[11]: {
      const left = r.integer(2, 15), rightHundredths = [25, 35, 45][occurrence % 3];
      return n(`Tính ${left} × ${decimal(rightHundredths)} theo phần trăm đơn vị.`, left * rightHundredths, [`Tính ${left} × ${rightHundredths}.`, "Hai chữ số thập phân tương ứng chia 100.", "Đặt lại dấu phẩy đúng hai hàng."], "Tổng số hàng thập phân quyết định vị trí dấu phẩy.", [p("left", left), p("rightHundredths", rightHundredths)]);
    }
    case ids[12]: {
      const value = r.integer(125, 975), shift = [10, 100, 1000][occurrence % 3];
      return n(`Số có ${value} phần trăm đơn vị nhân ${shift} được bao nhiêu phần trăm đơn vị?`, value * shift, [`Nhân ${shift}.`, "Giá trị hàng dịch sang trái.", `Kết quả ${value * shift} phần trăm.`], "Dịch giá trị hàng, không xóa dấu phẩy tùy ý.", [p("valueHundredths", value), p("factor", shift)]);
    }
    case ids[13]: {
      const base = r.integer(100, 800);
      const values = [base, base + 5, base + 50, base + 1];
      const sorted = [...values].sort((a, b) => a - b);
      return t(`Xếp ${values.map(decimal).join("; ")} tăng dần.`, sorted.map(decimal).join("; "), [[...values].reverse().map(decimal).join("; "), values.map(decimal).join("; "), "Không thể so sánh"], ["So phần nguyên trước.", "Căn thẳng hàng phần mười, phần trăm.", "Số 0 tận cùng không đổi giá trị."], "Không so độ dài chuỗi chữ số.", values.map((v, i) => p(`value${i}Hundredths`, v)), "NUMBER_LINE");
    }
    case ids[14]: {
      const c = r.integer(12, 39);
      return n(`Tính thuận tiện 2,5 × 4 × ${decimal(c)} theo phần trăm đơn vị.`, 10 * c, ["Nhóm 2,5 × 4 = 10.", `10 × ${decimal(c)} = ${decimal(10 * c)}.`, "Kiểm tra dấu phẩy."], "Giao hoán/kết hợp chỉ dùng cho phép nhân.", [p("cHundredths", c)]);
    }
    case ids[15]:
      return t("Dụng cụ nào kiểm tra góc vuông khi tạo một khung hình?", "êke", ["compa", "cân", "bình đong"], ["Xác định điều kiện góc vuông.", "Đặt góc êke tại đỉnh.", "Kiểm tra hai cạnh trùng."], "Không suy chỉ bằng mắt.", [p("angle", 90)], "ANGLE_DIAGRAM");
    case ids[16]: {
      const layers = r.integer(2, 5), perLayer = r.integer(4, 12);
      return n(`Khối có ${layers} lớp, mỗi lớp ${perLayer} khối đơn vị. Có bao nhiêu khối?`, layers * perLayer, ["Các khối bằng nhau và không hở/chồng.", `Nhân ${layers} × ${perLayer}.`, "Kết quả đo phần không gian chiếm chỗ."], "Không nhầm số khối với số mặt ngoài.", [p("layers", layers), p("perLayer", perLayer), p("solid", "CUBOID")], "SOLID_NET");
    }
    case ids[17]: {
      const km2 = r.integer(1, 9);
      return n(`Đổi ${km2} km² thành ha.`, km2 * 100, ["1 km² = 100 ha.", `Nhân ${km2} × 100.`, "Ghi đơn vị ha."], "Diện tích đổi theo quan hệ 100, không theo độ dài 10.", [p("km2", km2)], "AREA_MODEL");
    }
    case ids[18]:
      return n("Một hình khai triển hợp lệ của hình lập phương có bao nhiêu mặt vuông?", 6, ["Lập phương có 6 mặt.", "Mỗi mặt là hình vuông bằng nhau.", "Cách nối phải gấp không chồng."], "Đếm đủ mặt và kiểm tra cách nối.", [p("faces", 6), p("solid", "CUBE")], "SOLID_NET");
    case ids[19]: {
      const whole = r.integer(10, 40) * 10, percent = [10, 15, 25][occurrence % 3];
      return n(`Dùng máy tính tìm ${percent}% của ${whole}.`, whole * percent / 100, [`Nhập ${whole} × ${percent} ÷ 100.`, "Đọc kết quả.", "Ước lượng để phát hiện lỗi phím."], "Biểu thức nhập phải đúng trước khi tin kết quả.", [p("whole", whole), p("percent", percent)], "DATA_DISPLAY");
    }
    case ids[20]: {
      const speed = r.integer(25, 70), time = r.integer(2, 5);
      return n(`Đi đều ${speed} km/h trong ${time} giờ. Quãng đường bao nhiêu km?`, speed * time, ["s = v × t.", `${speed} × ${time} = ${speed * time}.`, "Đơn vị km."], "Không dùng phép chia khi tìm quãng đường.", [p("speed", speed), p("time", time)], "MEASUREMENT_SCALE");
    }
    case ids[21]: {
      const cm3 = r.integer(1, 8) * 1000;
      return n(`${cm3.toLocaleString("vi-VN")} cm³ bằng bao nhiêu ml?`, cm3, ["1 cm³ = 1 ml.", "Giữ nguyên giá trị số.", "Ghi đơn vị ml."], "Thể tích và dung tích tương ứng phải dùng đúng quan hệ.", [p("cm3", cm3)], "MEASUREMENT_SCALE");
    }
    case ids[22]: {
      const distance = r.integer(120, 600), time = [30, 60, 120][occurrence % 3];
      return n(`Đi ${distance} m trong ${time} s. Vận tốc theo m/s là bao nhiêu?`, distance / time, ["v = s : t.", `${distance} : ${time} = ${distance / time}.`, "Ghi m/s."], "Thời gian phải khác 0 và đơn vị vận tốc là tỉ số.", [p("distance", distance), p("time", time)]);
    }
    case ids[23]:
      return t("Muốn đo 750 ml nước, chọn dụng cụ nào?", "bình đong", ["cân", "êke", "đồng hồ"], ["Đại lượng là dung tích.", "Chọn bình có vạch ml.", "Đọc ngang mặt nước."], "Dụng cụ phải đúng đại lượng.", [p("capacityMl", 750)], "MEASUREMENT_SCALE");
    case ids[24]:
      return t("Quy trình nào đúng khi cân túi gạo khoảng 5 kg?", "ước lượng, chọn cân, đặt túi, đọc kg", ["dùng thước đo", "đọc trước khi đặt túi", "ghi kết quả không đơn vị"], ["Ước lượng cỡ 5 kg.", "Chọn cân đủ giới hạn.", "Đọc và ghi kg."], "Đo phải có dụng cụ, mốc và đơn vị.", [p("estimateKg", 5)], "MEASUREMENT_SCALE");
    case ids[25]: {
      const dm3Hundredths = r.integer(100, 900);
      return n(`${decimal(dm3Hundredths)} dm³ bằng bao nhiêu cm³?`, dm3Hundredths * 10, ["1 dm³ = 1 000 cm³.", `Nhân ${decimal(dm3Hundredths)} với 1 000.`, "Ghi cm³."], "Đơn vị khối đổi theo 1 000.", [p("dm3Hundredths", dm3Hundredths)], "MEASUREMENT_SCALE");
    }
    case ids[26]: {
      const length = r.integer(12, 25), width = r.integer(6, 12), height = r.integer(3, 8);
      return n(`Hộp khoảng ${length} cm × ${width} cm × ${height} cm. Ước lượng thể tích cm³.`, length * width * height, ["Nhân ba kích thước dương.", `${length} × ${width} × ${height}.`, "Ghi cm³."], "Không dùng diện tích hay bỏ chiều cao.", [p("length", length), p("width", width), p("height", height), p("solid", "CUBOID")], "SOLID_NET");
    }
    case ids[27]: {
      const total = r.integer(5, 20) * 10, percent = [20, 25, 40][occurrence % 3];
      return n(`${percent}% của tổng ${total} trong biểu đồ quạt là bao nhiêu?`, total * percent / 100, [`Đổi ${percent}% = ${percent}/100.`, `Nhân với ${total}.`, "Kết quả không vượt tổng."], "Tổng phải dương và các phần không vượt 100%.", [p("total", total), p("percent", percent)], "DATA_DISPLAY");
    }
    case ids[28]: {
      const start = r.integer(10, 30), step = r.integer(3, 8);
      return n(`Các phần trăm qua ba kỳ là ${start}%, ${start + step}%, ${start + 2 * step}%. Mỗi kỳ tăng bao nhiêu điểm phần trăm?`, step, ["Lấy kỳ sau trừ kỳ trước.", `Hai hiệu đều ${step}.`, "Kết luận tăng đều."], "Phải kiểm tra mọi khoảng.", [p("start", start), p("step", step)], "DATA_DISPLAY");
    }
    case ids[29]:
      return t("Muốn thể hiện cơ cấu bốn khoản chi cộng đúng 100%, chọn biểu diễn nào?", "biểu đồ quạt tròn", ["dãy số không nhãn", "một điểm trên trục số", "thước đo góc không chú giải"], ["Các phần tạo một toàn thể.", "Cần so tỉ lệ từng phần.", "Biểu đồ quạt phù hợp."], "Biểu đồ phải phù hợp mục đích và có chú giải.", [p("totalPercent", 100)], "DATA_DISPLAY");
    case ids[30]: {
      const part = r.integer(1, 9), total = part * 4;
      return n(`${part} trong ${total} đối tượng bằng bao nhiêu phần trăm?`, 25, [`${part}/${total} = 1/4.`, "1/4 = 0,25.", "Đổi thành 25%."], "Tổng phải khác 0 khi tính tỉ lệ.", [p("part", part), p("total", total)], "DATA_DISPLAY");
    }
    case ids[31]: {
      const a = r.integer(8, 15), b = 20 - a;
      return n(`Phân loại ${a} đối tượng nhóm A và ${b} nhóm B. Tổng bao nhiêu?`, 20, [`Hai nhóm cùng tiêu chí.`, `${a} + ${b} = 20.`, "Không có đối tượng đếm lặp."], "Tiêu chí phải nhất quán và tổng khớp nguồn.", [p("countA", a), p("countB", b)], "DATA_DISPLAY");
    }
    case ids[32]: {
      const cost = r.integer(10, 30) * 10_000, rate = [10, 15, 20][occurrence % 3];
      return n(`Vốn ${cost.toLocaleString("vi-VN")} đồng, lãi ${rate}%. Tiền lãi bao nhiêu?`, cost * rate / 100, [`Lãi suất tính trên vốn ${cost}.`, `Nhân ${rate}/100.`, "Ghi đơn vị đồng."], "Không tính phần trăm trên giá bán.", [p("cost", cost), p("rate", rate)], "DATA_DISPLAY");
    }
    case ids[33]: {
      const start = r.integer(10, 25), step = r.integer(2, 7);
      return n(`Dữ liệu bốn tuần: ${start}, ${start + step}, ${start + 2 * step}, ${start + 3 * step}. Mỗi tuần tăng bao nhiêu?`, step, ["Cùng tiêu chí theo tuần.", "Tính ba hiệu liên tiếp.", `Các hiệu đều ${step}.`], "Không bỏ giá trị trái dự đoán.", [p("start", start), p("step", step)], "DATA_DISPLAY");
    }
    case ids[34]: {
      const speedHundredths = r.integer(2500, 6500), timeHundredths = [150, 200, 250][occurrence % 3];
      return n(`Vận tốc có ${speedHundredths} phần trăm km/h trong ${timeHundredths} phần trăm giờ. Quãng đường theo phần mười nghìn km?`, speedHundredths * timeHundredths, ["Nhân vận tốc với thời gian.", "Giữ bốn chữ số thập phân theo dữ liệu đã scale.", "Đối chiếu mức hợp lí."], "Phải thống nhất đơn vị và phân biệt scale số nguyên.", [p("speedHundredths", speedHundredths), p("timeHundredths", timeHundredths)], "MEASUREMENT_SCALE");
    }
    default:
      throw new Error(`Missing Grade 5 scenario: ${id}.`);
  }
}

export function generateGrade5QuestionSpecs(
  unit: CurriculumUnit,
  seed: string,
) {
  return generateCompletionQuestionSpecs({
    unit,
    seed,
    kind: "GRADE5_OUTCOME_COMPLETION",
    scenario,
  });
}
