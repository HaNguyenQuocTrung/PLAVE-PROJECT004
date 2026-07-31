import type {
  CurriculumOutcome,
  CurriculumUnit,
  PreviewAnswerType,
  PreviewAudit,
  PreviewCognitiveLevel,
  TheorySection,
  VisualRequirement,
  WorkedExample,
} from "./types.ts";

type OutcomeSpec = Readonly<{
  id: string;
  title: string;
  concept: string;
  why: string;
  method: string;
  error: string;
  example: Readonly<{
    prompt: string;
    steps: readonly [string, string, string];
    answer: string;
  }>;
}>;

type UnitGroup = Readonly<{
  slug: string;
  title: string;
  code: string;
  domain: CurriculumUnit["domain"];
  visual: VisualRequirement;
  prerequisiteSlugs: readonly string[];
  outcomeIds: readonly string[];
}>;

export type Grade3UnitSeed = Readonly<{
  slug: string;
  title: string;
  grade: 3;
  domain: CurriculumUnit["domain"];
  outcomeId: string;
  officialOutcomeIds: readonly string[];
  skills: readonly [string, string, string, ...string[]];
  prerequisiteSlugs: readonly string[];
  restrictions: readonly string[];
  visual: VisualRequirement;
  answers: readonly PreviewAnswerType[];
  levels: readonly PreviewCognitiveLevel[];
  misconceptions: readonly string[];
  kind: "GRADE3_OUTCOME_COMPLETION";
  theory: readonly TheorySection[];
  examples: readonly WorkedExample[];
}>;

export type Grade3QuestionSpec = Readonly<{
  skillFamily: string;
  prompt: string;
  answer: string;
  distractors: readonly [string, string, string];
  steps: readonly string[];
  feedback: string;
  inputType: Extract<PreviewAnswerType, "NUMBER_INPUT" | "TEXT_INPUT">;
  cognitiveLevel: PreviewCognitiveLevel;
  parameters: PreviewAudit["parameters"];
  primaryOfficialOutcomeId: string;
  supportingOfficialOutcomeIds: readonly string[];
  evidenceForm: NonNullable<PreviewAudit["evidenceForm"]>;
  visualRequirement?: VisualRequirement;
}>;

const specs: readonly OutcomeSpec[] = [
  {
    id: "MOET2018-G3-NUM-P029-005",
    title: "Chữ số La Mã đến XX",
    concept: "Các kí hiệu I, V, X biểu diễn 1, 5, 10; số nhỏ đứng trước số lớn thì được trừ, đứng sau thì được cộng.",
    why: "Quy tắc vị trí giúp phân biệt IV = 4 với VI = 6 và IX = 9 với XI = 11.",
    method: "Tách số thành chục và đơn vị, viết X cho mỗi chục rồi dùng I, V, X đúng quy tắc cho phần đơn vị.",
    error: "Không viết IIII cho 4 hoặc VIIII cho 9; dùng IV và IX.",
    example: { prompt: "Viết số 14 bằng chữ số La Mã.", steps: ["14 gồm 10 và 4.", "10 viết X; 4 viết IV.", "Ghép lại được XIV."], answer: "XIV." },
  },
  {
    id: "MOET2018-G3-NUM-P029-006",
    title: "Số tròn nghìn và tròn mười nghìn",
    concept: "Số tròn nghìn có ba chữ số cuối bằng 0; số tròn mười nghìn có bốn chữ số cuối bằng 0.",
    why: "Các chữ số 0 cho biết số gồm những nghìn hoặc chục nghìn đầy đủ, không còn trăm, chục, đơn vị.",
    method: "Quan sát các hàng bên phải hàng nghìn hoặc chục nghìn và kiểm tra chúng đều bằng 0.",
    error: "30 500 không phải số tròn nghìn vì còn 5 trăm.",
    example: { prompt: "Trong 30 000 và 30 500, số nào tròn mười nghìn?", steps: ["30 000 có bốn chữ số cuối là 0.", "30 500 còn 5 trăm.", "Vậy 30 000 tròn mười nghìn."], answer: "30 000." },
  },
  {
    id: "MOET2018-G3-NUM-P029-007",
    title: "Tính chất phép cộng và phép trừ liên hệ",
    concept: "Đổi chỗ hoặc nhóm lại các số hạng không làm đổi tổng; phép trừ kiểm tra lại phép cộng.",
    why: "Tổng chỉ phụ thuộc các phần được gộp, không phụ thuộc thứ tự gộp.",
    method: "Chọn cặp tạo số tròn chục, tròn trăm rồi dùng phép trừ ngược để kiểm tra.",
    error: "Không áp dụng giao hoán cho phép trừ: 9 − 4 khác 4 − 9.",
    example: { prompt: "Tính nhanh 125 + 37 + 75.", steps: ["Nhóm 125 + 75 = 200.", "Tính 200 + 37 = 237.", "Kiểm tra 237 − 37 = 200."], answer: "237." },
  },
  {
    id: "MOET2018-G3-NUM-P029-008",
    title: "Cộng trừ số có đến năm chữ số",
    concept: "Đặt các chữ số cùng hàng thẳng cột và thực hiện từ hàng đơn vị sang trái.",
    why: "Mỗi lần đủ 10 đơn vị của một hàng thì đổi thành 1 đơn vị ở hàng liền trước.",
    method: "Cộng hoặc trừ từng cột, ghi rõ lần nhớ/mượn và kiểm tra bằng phép tính ngược.",
    error: "Không đặt lệch hàng và không quên cộng phần đã nhớ.",
    example: { prompt: "Tính 24 376 + 13 452.", steps: ["Đặt thẳng các hàng.", "Cộng từ phải sang trái, nhớ ở hàng chục: được 37 828.", "Kiểm tra 37 828 − 13 452 = 24 376."], answer: "37 828." },
  },
  {
    id: "MOET2018-G3-NUM-P029-009",
    title: "Sắp xếp số đến 100 000",
    concept: "Sắp xếp tối đa bốn số bằng cách so sánh từ hàng cao nhất sang phải.",
    why: "Hàng khác nhau đầu tiên quyết định số nào lớn hơn.",
    method: "Đọc chiều yêu cầu, tìm số nhỏ nhất hoặc lớn nhất lần lượt rồi kiểm tra từng cặp liền nhau.",
    error: "Không xếp theo tổng chữ số hoặc theo chữ số hàng đơn vị.",
    example: { prompt: "Xếp 25 310, 25 031, 24 999 từ bé đến lớn.", steps: ["24 999 có hàng nghìn nhỏ hơn nên đứng đầu.", "25 031 < 25 310.", "Thứ tự là 24 999, 25 031, 25 310."], answer: "24 999, 25 031, 25 310." },
  },
  {
    id: "MOET2018-G3-NUM-P029-011",
    title: "Số lớn nhất và nhỏ nhất",
    concept: "Số lớn nhất hoặc nhỏ nhất được xác định sau khi so sánh toàn bộ các số trong nhóm.",
    why: "Một chữ số riêng lẻ không đủ quyết định giá trị của số nhiều chữ số.",
    method: "So sánh hàng chục nghìn, nghìn, trăm, chục, đơn vị theo thứ tự.",
    error: "Không chọn số có chữ số cuối lớn nhất nếu các hàng trước nhỏ hơn.",
    example: { prompt: "Tìm số lớn nhất trong 19 999, 20 001, 20 010.", steps: ["Hai số bắt đầu bằng 20 nghìn lớn hơn 19 999.", "So sánh 20 001 và 20 010 ở hàng chục.", "20 010 là số lớn nhất."], answer: "20 010." },
  },
  {
    id: "MOET2018-G3-NUM-P030-012",
    title: "Tính nhẩm bốn phép tính",
    concept: "Tính nhẩm dùng quan hệ số quen thuộc, tách số và bảng nhân chia.",
    why: "Tách số theo giá trị hàng làm phép tính nhỏ hơn nhưng giữ nguyên giá trị.",
    method: "Chọn tách–gộp cho cộng trừ, dùng bảng nhân và phép chia ngược cho nhân chia.",
    error: "Không nhẩm chia khi số chia bằng 0 và phải kiểm tra phép chia bằng phép nhân.",
    example: { prompt: "Tính nhẩm 48 + 20 và 42 : 6.", steps: ["48 + 2 chục = 68.", "Vì 6 × 7 = 42 nên 42 : 6 = 7.", "Kiểm tra 7 × 6 = 42."], answer: "68 và 7." },
  },
  {
    id: "MOET2018-G3-NUM-P030-014",
    title: "Biểu thức số",
    concept: "Biểu thức số gồm các số, dấu phép tính và có thể có dấu ngoặc; giá trị là kết quả sau khi tính đúng quy tắc.",
    why: "Dấu ngoặc và thứ tự phép tính làm rõ cách các số được kết hợp.",
    method: "Đọc các thành phần, xác định phép tính cần làm rồi mới tính giá trị.",
    error: "Không coi dấu bằng là một phần bắt buộc của biểu thức số.",
    example: { prompt: "Trong 12 + 3 × 2, đâu là biểu thức và giá trị của nó?", steps: ["12 + 3 × 2 là biểu thức số.", "Nhân trước: 3 × 2 = 6.", "Cộng 12 + 6 = 18."], answer: "Biểu thức 12 + 3 × 2 có giá trị 18." },
  },
  {
    id: "MOET2018-G3-NUM-P030-015",
    title: "Tính chất phép nhân và phép chia liên hệ",
    concept: "Đổi chỗ hoặc nhóm các thừa số không đổi tích; phép chia hết kiểm tra lại phép nhân.",
    why: "Một mảng hàng–cột có cùng số ô khi đổi vai trò số hàng và số cột.",
    method: "Nhóm thừa số tạo tích tròn rồi dùng tích chia một thừa số để tìm thừa số kia.",
    error: "Không áp dụng giao hoán cho phép chia.",
    example: { prompt: "Tính nhanh 4 × 25 × 3.", steps: ["Nhóm 4 × 25 = 100.", "Tính 100 × 3 = 300.", "Kiểm tra 300 : 3 = 100."], answer: "300." },
  },
  {
    id: "MOET2018-G3-NUM-P030-016",
    title: "Chia hết và chia có dư",
    concept: "Trong phép chia có dư, số bị chia = số chia × thương + số dư và số dư nhỏ hơn số chia.",
    why: "Số dư là phần còn lại chưa đủ tạo thêm một nhóm bằng số chia.",
    method: "Tìm bội lớn nhất của số chia không vượt số bị chia, rồi lấy phần chênh làm số dư.",
    error: "Số dư không được bằng hoặc lớn hơn số chia; số chia phải khác 0.",
    example: { prompt: "Chia 29 cho 4.", steps: ["Bội lớn nhất của 4 không vượt 29 là 28 = 4 × 7.", "29 − 28 = 1.", "Vậy 29 : 4 = 7 dư 1; 1 < 4."], answer: "7 dư 1." },
  },
  {
    id: "MOET2018-G3-NUM-P030-019",
    title: "Biểu thức có dấu ngoặc",
    concept: "Trong biểu thức có đến hai phép tính, phần trong dấu ngoặc được thực hiện trước.",
    why: "Dấu ngoặc chỉ rõ nhóm phép tính tạo thành một đại lượng trước khi kết hợp với phần còn lại.",
    method: "Tính trong ngoặc, thay ngoặc bằng kết quả rồi làm phép tính còn lại.",
    error: "Không bỏ qua ngoặc để làm phép tính ở ngoài trước.",
    example: { prompt: "Tính 6 × (9 − 4).", steps: ["Tính trong ngoặc: 9 − 4 = 5.", "Thay vào được 6 × 5.", "Kết quả 30."], answer: "30." },
  },
  {
    id: "MOET2018-G3-NUM-P030-020",
    title: "Biểu thức không có dấu ngoặc",
    concept: "Không có ngoặc: nhân chia trước, cộng trừ sau; các phép cùng mức làm từ trái sang phải.",
    why: "Quy ước chung bảo đảm mọi người tính một biểu thức ra cùng giá trị.",
    method: "Đánh dấu phép nhân/chia, thực hiện chúng rồi hoàn thành cộng/trừ.",
    error: "Không luôn làm phép bên trái trước nếu bên phải là nhân hoặc chia.",
    example: { prompt: "Tính 18 + 4 × 5.", steps: ["Nhân trước: 4 × 5 = 20.", "Cộng 18 + 20.", "Kết quả 38."], answer: "38." },
  },
  {
    id: "MOET2018-G3-NUM-P030-022",
    title: "Thành phần chưa biết",
    concept: "Tìm thành phần chưa biết bằng quan hệ ngược giữa cộng–trừ hoặc nhân–chia.",
    why: "Phép tính ngược khôi phục phần đã bị gộp, bớt, nhân nhóm hoặc chia nhóm.",
    method: "Gọi ô trống, chọn phép tính ngược, tính rồi thay lại kiểm tra.",
    error: "Không dùng cùng một quy tắc cho số hạng, số trừ và số bị trừ.",
    example: { prompt: "Tìm □ trong □ + 27 = 65.", steps: ["Ô trống là số hạng chưa biết.", "Lấy tổng trừ số hạng đã biết: 65 − 27 = 38.", "Kiểm tra 38 + 27 = 65."], answer: "38." },
  },
  {
    id: "MOET2018-G3-GEO-P031-001",
    title: "Gấp, cắt, ghép và tạo hình",
    concept: "Tạo hình là biến đổi hoặc kết hợp các mảnh theo cạnh, góc và đường bao được yêu cầu.",
    why: "Đặc điểm hình được bảo toàn theo đường cắt và cách các cạnh ghép khít.",
    method: "Dự đoán hình, thao tác không chồng mảnh, rồi kiểm tra đường bao và số phần.",
    error: "Không gọi tên hình chỉ theo hướng xoay.",
    example: { prompt: "Ghép hai tam giác vuông bằng nhau thành hình chữ nhật.", steps: ["Đặt hai cạnh huyền trùng nhau.", "Không để hở hoặc chồng mảnh.", "Kiểm tra đường bao có bốn góc vuông."], answer: "Được một hình chữ nhật." },
  },
  {
    id: "MOET2018-G3-GEO-P031-002",
    title: "Điểm ở giữa và trung điểm",
    concept: "Điểm M ở giữa A, B khi ba điểm thẳng hàng và M nằm giữa; M là trung điểm khi thêm AM = MB.",
    why: "Điều kiện bằng nhau chia đoạn thẳng thành hai phần có cùng độ dài.",
    method: "Kiểm tra thẳng hàng, vị trí ở giữa, rồi so sánh hai đoạn.",
    error: "Điểm ở giữa chưa chắc là trung điểm nếu hai khoảng cách không bằng nhau.",
    example: { prompt: "A, M, B thẳng hàng; AM = 4 cm, MB = 4 cm. M là gì?", steps: ["M nằm giữa A và B.", "AM = MB.", "M là trung điểm của AB."], answer: "M là trung điểm AB." },
  },
  {
    id: "MOET2018-G3-GEO-P031-003",
    title: "Góc vuông và góc không vuông",
    concept: "Góc tạo bởi hai tia chung gốc; góc vuông khớp với góc vuông của êke.",
    why: "Êke cung cấp một mẫu góc vuông cố định để so sánh.",
    method: "Đặt đỉnh vuông êke vào đỉnh góc, một cạnh trùng một tia rồi xem tia kia có trùng cạnh còn lại.",
    error: "Không kết luận từ hình vẽ nhìn gần vuông nếu chưa kiểm tra.",
    example: { prompt: "Hai cạnh góc khớp đúng hai cạnh vuông của êke. Đó là góc gì?", steps: ["Đỉnh êke trùng đỉnh góc.", "Hai cạnh cùng trùng.", "Góc là góc vuông."], answer: "Góc vuông." },
  },
  {
    id: "MOET2018-G3-GEO-P031-007",
    title: "Dùng êke và compa",
    concept: "Êke kiểm tra góc vuông; compa giữ khoảng cách không đổi để vẽ đường tròn.",
    why: "Mọi điểm trên đường tròn cách tâm một khoảng bằng bán kính mà compa giữ.",
    method: "Chọn đúng dụng cụ, đặt đúng tâm/đỉnh và không đổi độ mở compa.",
    error: "Không dùng thước thẳng để kết luận một góc vuông.",
    example: { prompt: "Muốn vẽ đường tròn tâm O bán kính 3 cm, dùng gì?", steps: ["Mở compa 3 cm bằng thước.", "Đặt mũi nhọn tại O.", "Quay compa, giữ nguyên độ mở."], answer: "Dùng compa." },
  },
  {
    id: "MOET2018-G3-GEO-P031-008",
    title: "Vẽ góc vuông và đường tròn",
    concept: "Góc vuông được dựng theo hai cạnh vuông của êke; đường tròn được dựng bằng tâm và bán kính.",
    why: "Dụng cụ giữ đúng quan hệ vuông góc hoặc khoảng cách bằng nhau.",
    method: "Đánh dấu đỉnh/tâm, đặt dụng cụ, vẽ và kiểm tra lại.",
    error: "Không đổi độ mở compa giữa khi đang vẽ một đường tròn.",
    example: { prompt: "Vẽ góc vuông đỉnh A có một cạnh Ax.", steps: ["Đặt đỉnh vuông êke tại A.", "Cho một cạnh êke trùng Ax.", "Vẽ tia Ay theo cạnh còn lại."], answer: "Góc xAy vuông." },
  },
  {
    id: "MOET2018-G3-GEO-P031-009",
    title: "Vẽ hình trên lưới ô vuông",
    concept: "Lưới ô vuông giúp đếm độ dài cạnh và giữ các cạnh ngang, dọc vuông góc.",
    why: "Các ô bằng nhau tạo đơn vị ổn định cho cạnh đối song song và bằng nhau.",
    method: "Chọn đỉnh đầu, đếm số ô cho từng cạnh, đánh dấu các đỉnh rồi nối.",
    error: "Không đếm số đường lưới thay cho số khoảng ô.",
    example: { prompt: "Vẽ hình chữ nhật dài 4 ô, rộng 2 ô.", steps: ["Chọn một đỉnh trên giao điểm lưới.", "Đếm 4 khoảng ô ngang và 2 khoảng ô dọc.", "Nối bốn đỉnh, kiểm tra cạnh đối bằng nhau."], answer: "Hình chữ nhật 4 ô × 2 ô." },
  },
  {
    id: "MOET2018-G3-GEO-P032-011",
    title: "Đọc giờ đến phút",
    concept: "Mỗi số trên đồng hồ cách nhau 5 phút; mỗi vạch nhỏ biểu diễn 1 phút.",
    why: "Kim phút quay đủ 60 vạch trong một giờ.",
    method: "Đọc kim giờ, tính phút theo số lớn và vạch nhỏ, rồi ghép giờ–phút.",
    error: "Không đọc số kim phút chỉ thành số phút nếu chưa nhân 5.",
    example: { prompt: "Kim giờ qua 8, kim phút chỉ số 7. Đọc giờ.", steps: ["Số 7 ứng 7 × 5 = 35 phút.", "Kim giờ đã qua 8.", "Đọc 8 giờ 35 phút."], answer: "8 giờ 35 phút." },
  },
  {
    id: "MOET2018-G3-GEO-P032-012",
    title: "Khái niệm diện tích",
    concept: "Diện tích cho biết phần mặt phẳng một hình chiếm, được so sánh bằng các phần phủ kín không chồng.",
    why: "Cùng một đơn vị phủ kín cho phép đếm và so sánh công bằng.",
    method: "Chọn đơn vị diện tích, phủ kín hình, đếm số đơn vị.",
    error: "Không nhầm diện tích với độ dài đường bao là chu vi.",
    example: { prompt: "Hình A phủ 12 ô vuông, hình B phủ 9 ô. Hình nào có diện tích lớn hơn?", steps: ["Hai hình dùng cùng ô vuông đơn vị.", "12 > 9.", "Hình A có diện tích lớn hơn."], answer: "Hình A." },
  },
  {
    id: "MOET2018-G3-GEO-P032-013",
    title: "Xăng-ti-mét vuông",
    concept: "1 cm² là diện tích hình vuông cạnh 1 cm.",
    why: "Đơn vị vuông đo phần mặt phẳng, khác cm đo độ dài.",
    method: "Đếm ô vuông 1 cm² hoặc dùng số hàng nhân số ô mỗi hàng.",
    error: "Không ghi cm cho diện tích và không ghi cm² cho độ dài.",
    example: { prompt: "Một hình phủ 3 hàng, mỗi hàng 4 ô 1 cm². Diện tích?", steps: ["Mỗi ô là 1 cm².", "Có 3 × 4 = 12 ô.", "Diện tích 12 cm²."], answer: "12 cm²." },
  },
  {
    id: "MOET2018-G3-GEO-P032-014",
    title: "Mi-li-lít và lít",
    concept: "Mi-li-lít đo dung tích nhỏ; 1 l = 1000 ml.",
    why: "Một nghìn phần dung tích 1 ml ghép thành 1 l.",
    method: "Đổi l sang ml bằng nhân 1000, ml sang l khi đủ nghìn bằng chia 1000.",
    error: "Không đổi theo 100 và không dùng ml cho khối lượng.",
    example: { prompt: "Đổi 2 l thành ml.", steps: ["1 l = 1000 ml.", "2 × 1000 = 2000.", "Vậy 2 l = 2000 ml."], answer: "2000 ml." },
  },
  {
    id: "MOET2018-G3-GEO-P032-016",
    title: "Gam và ki-lô-gam",
    concept: "Gam đo khối lượng nhỏ; 1 kg = 1000 g.",
    why: "Một nghìn gam ghép thành một ki-lô-gam.",
    method: "Dùng cân phù hợp, đọc vạch và đổi theo quan hệ 1000.",
    error: "Không dùng g hoặc kg cho dung tích.",
    example: { prompt: "Đổi 3 kg thành gam.", steps: ["1 kg = 1000 g.", "3 × 1000 = 3000.", "Vậy 3 kg = 3000 g."], answer: "3000 g." },
  },
  {
    id: "MOET2018-G3-GEO-P032-017",
    title: "Độ C",
    concept: "Độ C (°C) là đơn vị nhiệt độ, đọc trên nhiệt kế.",
    why: "Nhiệt độ mô tả mức nóng lạnh, không phải độ dài hay khối lượng.",
    method: "Đặt mắt ngang mức cột chỉ thị, đọc số vạch và ghi °C.",
    error: "Không bỏ dấu độ hoặc ghi cm cho nhiệt độ.",
    example: { prompt: "Nhiệt kế chỉ vạch 28. Viết số đo nhiệt độ.", steps: ["Đại lượng là nhiệt độ.", "Vạch chỉ số 28.", "Ghi 28 °C."], answer: "28 °C." },
  },
  {
    id: "MOET2018-G3-GEO-P032-018",
    title: "Mệnh giá tiền Việt Nam",
    concept: "Mệnh giá được nhận biết từ số và chữ in trên tờ tiền; lớp 3 nhận biết đến 100 000 đồng và nhận diện tờ 200 000, 500 000 đồng.",
    why: "Màu hoặc kích thước không đủ xác định giá trị.",
    method: "Quan sát dãy số, chữ đồng và nhóm nghìn; với tờ lớn chỉ yêu cầu nhận biết hình ảnh.",
    error: "Không suy mệnh giá chỉ từ màu tờ tiền.",
    example: { prompt: "Tờ tiền in 50 000 đồng có mệnh giá bao nhiêu?", steps: ["Đọc dãy số 50 000.", "Đọc chữ đồng.", "Mệnh giá là năm mươi nghìn đồng."], answer: "50 000 đồng." },
  },
  {
    id: "MOET2018-G3-GEO-P032-019",
    title: "Các tháng trong năm",
    concept: "Một năm có 12 tháng theo thứ tự từ tháng Một đến tháng Mười hai.",
    why: "Thứ tự tháng lặp lại theo chu kì năm.",
    method: "Ghi dãy tháng, tìm vị trí rồi xác định tháng liền trước hoặc liền sau.",
    error: "Không nhầm thứ tự tháng với số ngày trong tháng.",
    example: { prompt: "Tháng liền sau tháng Tám là tháng nào?", steps: ["Tháng Tám là tháng thứ 8.", "Tháng tiếp theo là tháng thứ 9.", "Đó là tháng Chín."], answer: "Tháng Chín." },
  },
  {
    id: "MOET2018-G3-GEO-P032-020",
    title: "Dụng cụ đo thông dụng",
    concept: "Cân đo khối lượng, thước chia mm đo độ dài, nhiệt kế đo nhiệt độ và bình chia vạch đo dung tích.",
    why: "Mỗi dụng cụ có thang đo và đơn vị phù hợp một đại lượng.",
    method: "Chọn dụng cụ, kiểm tra điểm 0, đặt đúng vật và đọc ngang tầm mắt.",
    error: "Không chọn dụng cụ theo hình dáng vật thay vì đại lượng cần đo.",
    example: { prompt: "Muốn đo nhiệt độ nước, chọn dụng cụ nào?", steps: ["Đại lượng cần đo là nhiệt độ.", "Dụng cụ là nhiệt kế phù hợp.", "Đọc và ghi kết quả bằng °C."], answer: "Nhiệt kế." },
  },
  {
    id: "MOET2018-G3-GEO-P033-023",
    title: "Bài toán đo lường thực tiễn",
    concept: "Bài toán đo lường cần đủ dữ kiện, cùng đại lượng và câu trả lời có đơn vị.",
    why: "Không thể cộng các số đo khác loại; đơn vị cho biết ý nghĩa kết quả.",
    method: "Xác định đại lượng, đổi cùng đơn vị, tính và kiểm tra cỡ kết quả.",
    error: "Không cộng kg với l hoặc cm với phút.",
    example: { prompt: "Can có 2 l nước, thêm 500 ml. Có tất cả bao nhiêu ml?", steps: ["Đổi 2 l = 2000 ml.", "Cộng 2000 + 500 = 2500.", "Kết luận 2500 ml."], answer: "2500 ml." },
  },
  {
    id: "MOET2018-G3-STA-P033-004",
    title: "Thu thập và phân loại dữ liệu",
    concept: "Dữ liệu được thu thập theo câu hỏi, phân loại bằng một tiêu chí và ghi chép mỗi đối tượng một lần.",
    why: "Tiêu chí nhất quán làm các nhóm không chồng và tổng kiểm đếm đúng.",
    method: "Nêu tiêu chí, ghi vạch từng quan sát, cộng tần số kiểm tra tổng.",
    error: "Không đổi tiêu chí giữa chừng hoặc xếp một đối tượng vào hai nhóm.",
    example: { prompt: "Phân loại 8 bút theo màu: 5 xanh, 3 đỏ.", steps: ["Tiêu chí là màu.", "Ghi 5 vạch nhóm xanh, 3 vạch nhóm đỏ.", "Tổng 5 + 3 = 8 khớp số bút."], answer: "Xanh 5, đỏ 3." },
  },
  {
    id: "MOET2018-G3-GEO-P033-024",
    title: "Ước lượng số đo",
    concept: "Ước lượng chọn số đo gần đúng dựa trên mốc quen thuộc và đại lượng phù hợp.",
    why: "Mốc thực tế giúp phát hiện kết quả sai cỡ trước hoặc sau khi đo.",
    method: "Chọn đơn vị, so với vật mốc, nêu khoảng rồi đo kiểm tra.",
    error: "Không chọn 2 g cho con gà hoặc 2 tấn cho một quyển sách.",
    example: { prompt: "Con gà nặng khoảng 2 g, 2 kg hay 20 kg?", steps: ["2 g quá nhẹ.", "20 kg quá nặng so với gà quen thuộc.", "2 kg là ước lượng hợp lí."], answer: "Khoảng 2 kg." },
  },
  {
    id: "MOET2018-G3-GEO-P033-025",
    title: "Diện tích hình chữ nhật và hình vuông",
    concept: "Diện tích hình chữ nhật bằng chiều dài × chiều rộng; hình vuông bằng cạnh × cạnh.",
    why: "Các ô vuông đơn vị xếp thành số hàng nhân số ô mỗi hàng.",
    method: "Đổi kích thước cùng đơn vị, nhân và ghi đơn vị vuông.",
    error: "Không cộng các cạnh như khi tính chu vi.",
    example: { prompt: "Hình chữ nhật dài 6 cm, rộng 4 cm. Tính diện tích.", steps: ["Hai kích thước cùng cm.", "6 × 4 = 24.", "Diện tích 24 cm²."], answer: "24 cm²." },
  },
  {
    id: "MOET2018-G3-EXP-P034-001",
    title: "Thực hành tính và đo",
    concept: "Thực hành kết hợp ước lượng, chọn dụng cụ, đo và tính chu vi hoặc diện tích hình đã học.",
    why: "Ước lượng và phép tính độc lập giúp kiểm tra kết quả đo thực tế.",
    method: "Lập kế hoạch đo, ghi số liệu có đơn vị, tính rồi đối chiếu với ước lượng.",
    error: "Không dùng kết quả thiếu đơn vị hoặc trộn chu vi với diện tích.",
    example: { prompt: "Mặt bàn dài 8 dm, rộng 5 dm. Ước lượng rồi tính diện tích.", steps: ["Ước lượng diện tích khoảng 40 dm².", "Tính 8 × 5 = 40.", "Kết quả 40 dm² khớp ước lượng."], answer: "40 dm²." },
  },
  {
    id: "MOET2018-G3-EXP-P034-002",
    title: "Thực hành dữ liệu trường lớp",
    concept: "Một cuộc khảo sát lớp học cần câu hỏi rõ, tiêu chí phân loại, bảng ghi và thứ tự dữ liệu.",
    why: "Quy trình thống nhất giúp người khác kiểm tra lại kết quả.",
    method: "Thu thập từng đối tượng, phân loại, kiểm đếm, sắp xếp và so tổng.",
    error: "Không bỏ quan sát không vừa ý hoặc đếm một bạn hai lần.",
    example: { prompt: "Khảo sát 10 bạn: 6 đi bộ, 4 đi xe. Ghi và kiểm tra.", steps: ["Tiêu chí là cách đến trường.", "Ghi đi bộ 6, đi xe 4.", "Tổng 6 + 4 = 10 đúng số bạn."], answer: "Đi bộ 6, đi xe 4." },
  },
] as const;

const groups: readonly UnitGroup[] = [
  { slug: "grade-3-number-notation-order-p1", title: "Kí hiệu và thứ tự số lớp 3", code: "G3-P1-NUM-B", domain: "NUMBERS_AND_OPERATIONS", visual: "PLACE_VALUE_CHART", prerequisiteSlugs: ["grade-2-number-order-and-line-p0"], outcomeIds: [specs[0].id, specs[1].id, specs[4].id, specs[5].id] },
  { slug: "grade-3-additive-fluency-p1", title: "Cộng, trừ và tính nhẩm lớp 3", code: "G3-P1-NUM-C", domain: "NUMBERS_AND_OPERATIONS", visual: "PLACE_VALUE_CHART", prerequisiteSlugs: ["grade-2-addition-subtraction-fluency-p0"], outcomeIds: [specs[2].id, specs[3].id, specs[6].id] },
  { slug: "grade-3-multiplicative-expression-p1", title: "Nhân, chia và biểu thức có ngoặc", code: "G3-P1-NUM-D", domain: "NUMBERS_AND_OPERATIONS", visual: "COUNTER_ROW", prerequisiteSlugs: ["grade-2-multiplication-division-components-p1"], outcomeIds: [specs[8].id, specs[9].id, specs[10].id] },
  { slug: "grade-3-expression-order-p1", title: "Biểu thức và thành phần chưa biết", code: "G3-P1-NUM-E", domain: "NUMBERS_AND_OPERATIONS", visual: "PLACE_VALUE_CHART", prerequisiteSlugs: ["grade-2-calculation-strategies-p0"], outcomeIds: [specs[7].id, specs[11].id, specs[12].id] },
  { slug: "grade-3-shape-relations-p1", title: "Tạo hình, trung điểm và góc", code: "G3-P1-GEO-A", domain: "GEOMETRY", visual: "SHAPE_SCENE", prerequisiteSlugs: ["grade-2-shape-construction-p0"], outcomeIds: [specs[13].id, specs[14].id, specs[15].id] },
  { slug: "grade-3-geometric-tools-p1", title: "Dụng cụ và dựng hình lớp 3", code: "G3-P1-GEO-B", domain: "GEOMETRY", visual: "ANGLE_DIAGRAM", prerequisiteSlugs: ["grade-2-shape-construction-p0"], outcomeIds: [specs[16].id, specs[17].id, specs[18].id] },
  { slug: "grade-3-time-and-area-units-p1", title: "Thời gian và diện tích lớp 3", code: "G3-P1-MEA-A", domain: "MEASUREMENT", visual: "AREA_MODEL", prerequisiteSlugs: ["grade-2-time-calendar-money-p0"], outcomeIds: [specs[19].id, specs[20].id, specs[21].id] },
  { slug: "grade-3-quantity-units-p1", title: "Dung tích, khối lượng, nhiệt độ và tiền", code: "G3-P1-MEA-B", domain: "MEASUREMENT", visual: "MEASUREMENT_SCALE", prerequisiteSlugs: ["grade-2-mass-capacity-tools-p0"], outcomeIds: [specs[22].id, specs[23].id, specs[24].id, specs[25].id] },
  { slug: "grade-3-calendar-measurement-p1", title: "Lịch, dụng cụ và ước lượng đo", code: "G3-P1-MEA-C", domain: "MEASUREMENT", visual: "MEASUREMENT_SCALE", prerequisiteSlugs: ["grade-2-applied-measurement-p0"], outcomeIds: [specs[26].id, specs[27].id, specs[28].id, specs[30].id] },
  { slug: "grade-3-area-data-experience-p1", title: "Diện tích, dữ liệu và thực hành", code: "G3-P1-APP-A", domain: "APPLIED_PROBLEM_SOLVING", visual: "DATA_DISPLAY", prerequisiteSlugs: ["grade-2-data-and-measurement-experience-p1"], outcomeIds: [specs[29].id, specs[31].id, specs[32].id, specs[33].id] },
] as const;

const specById = new Map(specs.map((spec) => [spec.id, spec]));

function skill(outcomeId: string) {
  return outcomeId.replace("MOET2018-", "").replaceAll("-", "_");
}

export const grade3CompletionOutcomes: readonly CurriculumOutcome[] = groups.map(
  (group) => ({
    id: `PLAVE-MOET2018-${group.code}`,
    grade: 3,
    domain: group.domain,
    summary: group.title,
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  }),
);

export const grade3CompletionUnitSeeds: readonly Grade3UnitSeed[] = groups.map(
  (group) => {
    const outcomes = group.outcomeIds.map((id) => {
      const spec = specById.get(id);
      if (!spec) throw new Error(`Missing Grade 3 teaching spec: ${id}.`);
      return spec;
    });
    const theory: TheorySection[] = outcomes.map((outcome, index) => ({
      id: `${group.slug}-s${index + 1}`,
      title: outcome.title,
      explanation: [
        outcome.concept,
        `Vì sao: ${outcome.why}`,
        `Khi dùng và cách làm: ${outcome.method}`,
        `Lỗi cần tránh: ${outcome.error}`,
      ],
      visualDescription: `${group.title}: mô hình minh hoạ trực tiếp cho ${outcome.title.toLocaleLowerCase("vi")}.`,
      officialOutcomeIds: [outcome.id],
    }));
    if (theory.length < 4) {
      theory.push({
        id: `${group.slug}-s4`,
        title: "Kiểm tra trong tình huống",
        explanation: [
          "Đối chiếu kết quả với dữ kiện, đơn vị và giới hạn của từng bài.",
          "Phân biệt lỗi khái niệm, lỗi tính toán, lỗi biểu diễn và lỗi đơn vị trước khi sửa.",
        ],
        visualDescription: `${group.title}: bảng kiểm điều kiện và kết quả.`,
        officialOutcomeIds: group.outcomeIds,
      });
    }
    return {
      slug: group.slug,
      title: group.title,
      grade: 3,
      domain: group.domain,
      outcomeId: `PLAVE-MOET2018-${group.code}`,
      officialOutcomeIds: group.outcomeIds,
      skills: group.outcomeIds.map(skill) as [string, string, string, ...string[]],
      prerequisiteSlugs: group.prerequisiteSlugs,
      restrictions: [
        "Chỉ dùng kiến thức và đơn vị xuất hiện trong yêu cầu cần đạt Lớp 3.",
        "Dữ kiện phải xác định duy nhất; số chia khác 0 và số đo có đơn vị.",
        "Mỗi câu ghi primary official outcome và được recompute độc lập.",
      ],
      visual: group.visual,
      answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT", "TEXT_INPUT"],
      levels: ["UNDERSTAND", "APPLY", "REASON"],
      misconceptions: outcomes.map((outcome) =>
        outcome.error
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/gu, "")
          .replace(/[^\p{L}\p{N}]+/gu, "_")
          .toUpperCase()
          .slice(0, 64),
      ),
      kind: "GRADE3_OUTCOME_COMPLETION",
      theory,
      examples: outcomes.map((outcome, index) => ({
        id: `${group.slug}-e${index + 1}`,
        title: `Ví dụ: ${outcome.title}`,
        prompt: outcome.example.prompt,
        steps: outcome.example.steps,
        answer: outcome.example.answer,
        visualDescription: `${group.title}: dữ kiện và phép kiểm tra của ${outcome.title.toLocaleLowerCase("vi")}.`,
        officialOutcomeIds: [outcome.id],
      })),
    };
  },
);

function seedToState(seed: string) {
  let state = 2166136261;
  for (const character of seed) {
    state ^= character.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  return state >>> 0;
}

function randomFor(seed: string) {
  let state = seedToState(seed) || 1;
  return {
    integer(minimum: number, maximum: number) {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return minimum + Math.floor(((state >>> 0) / 4_294_967_296) * (maximum - minimum + 1));
    },
  };
}

function makeSpec(
  unit: CurriculumUnit,
  outcomeId: string,
  occurrence: number,
  input: Omit<Grade3QuestionSpec, "skillFamily" | "primaryOfficialOutcomeId" | "supportingOfficialOutcomeIds" | "evidenceForm">,
): Grade3QuestionSpec {
  const form =
    occurrence % 4 === 0 ? "RECOGNIZE_UNDERSTAND"
      : occurrence % 4 === 1 ? "PERFORM"
        : occurrence % 4 === 2 ? "ERROR_ANALYSIS"
          : "APPLY";
  const prompt =
    form === "ERROR_ANALYSIS"
      ? `Bạn Minh chọn “${input.distractors[0]}”. ${input.prompt} Hãy chọn kết quả đúng để sửa lỗi.`
      : form === "APPLY"
        ? `Vận dụng trong tình huống thực tế: ${input.prompt}`
        : input.prompt;
  return {
    ...input,
    prompt,
    steps:
      form === "ERROR_ANALYSIS"
        ? [...input.steps, `“${input.distractors[0]}” không thỏa điều kiện nên bị loại.`]
        : input.steps,
    feedback: `${
      form === "ERROR_ANALYSIS"
        ? "Lỗi biểu diễn hoặc lập luận"
        : form === "PERFORM"
          ? "Lỗi tính toán"
          : unit.domain === "MEASUREMENT"
            ? "Lỗi khái niệm hoặc đơn vị"
            : "Lỗi khái niệm"
    }: ${input.feedback}`,
    skillFamily: skill(outcomeId),
    primaryOfficialOutcomeId: outcomeId,
    supportingOfficialOutcomeIds: [],
    evidenceForm: form,
  };
}

const numberDistractors = (answer: number): [string, string, string] => [
  String(answer + 1),
  String(answer - 1),
  String(answer + 10),
];

function scenario(
  unit: CurriculumUnit,
  outcomeId: string,
  occurrence: number,
  random: ReturnType<typeof randomFor>,
): Grade3QuestionSpec {
  const text = (prompt: string, answer: string, distractors: [string, string, string], steps: readonly string[], feedback: string, parameters: PreviewAudit["parameters"], visualRequirement?: VisualRequirement) =>
    makeSpec(unit, outcomeId, occurrence, { prompt, answer, distractors, steps, feedback, parameters, visualRequirement, inputType: "TEXT_INPUT", cognitiveLevel: occurrence === 0 ? "UNDERSTAND" : occurrence === 1 ? "APPLY" : "REASON" });
  const number = (prompt: string, answer: number, steps: readonly string[], feedback: string, parameters: PreviewAudit["parameters"], visualRequirement?: VisualRequirement) =>
    makeSpec(unit, outcomeId, occurrence, { prompt, answer: String(answer), distractors: numberDistractors(answer), steps, feedback, parameters, visualRequirement, inputType: "NUMBER_INPUT", cognitiveLevel: occurrence === 0 ? "UNDERSTAND" : occurrence === 1 ? "APPLY" : "REASON" });

  switch (outcomeId) {
    case "MOET2018-G3-NUM-P029-005": {
      const values = [4, 9, 14, 19];
      const romans = ["IV", "IX", "XIV", "XIX"];
      const index = occurrence % values.length;
      return text(`Viết ${values[index]} bằng chữ số La Mã.`, romans[index], [String(values[index]), romans[(index + 1) % romans.length], "IIII"], [`Tách ${values[index]} theo 10, 5 và 1.`, `Áp dụng quy tắc vị trí được ${romans[index]}.`, "Đọc ngược để kiểm tra."], "Dùng IV cho 4, IX cho 9 và X cho 10.", [{ name: "value", value: values[index] }], "PLACE_VALUE_CHART");
    }
    case "MOET2018-G3-NUM-P029-006": {
      const value = random.integer(2, 8) * 10_000;
      return text(`${value.toLocaleString("vi-VN")} có phải số tròn mười nghìn không?`, "có", ["không", "chỉ tròn nghìn", "không xác định"], ["Quan sát bốn chữ số cuối.", "Cả bốn đều bằng 0.", "Số gồm các chục nghìn đầy đủ."], "Số tròn mười nghìn phải có bốn chữ số cuối bằng 0.", [{ name: "value", value }], "PLACE_VALUE_CHART");
    }
    case "MOET2018-G3-NUM-P029-007": {
      const a = random.integer(120, 180);
      const b = 200 - a;
      const c = random.integer(20, 60);
      return number(`Tính nhanh ${a} + ${c} + ${b}.`, 200 + c, [`Nhóm ${a} + ${b} = 200.`, `Tính 200 + ${c} = ${200 + c}.`, `Kiểm tra ${200 + c} − ${c} = 200.`], "Giao hoán và kết hợp chỉ đổi thứ tự/nhóm số hạng, không đổi tổng.", [{ name: "left", value: a }, { name: "middle", value: c }, { name: "right", value: b }]);
    }
    case "MOET2018-G3-NUM-P029-008": {
      const left = 24_376 + occurrence * 100;
      const right = 13_452;
      return number(`Tính ${left.toLocaleString("vi-VN")} + ${right.toLocaleString("vi-VN")}.`, left + right, ["Đặt thẳng các hàng.", `Cộng từ phải sang trái được ${(left + right).toLocaleString("vi-VN")}.`, `Kiểm tra bằng phép trừ ngược.`], "Ghi phần nhớ đúng cột và không tạo lượt nhớ liên tiếp ngoài phạm vi.", [{ name: "left", value: left }, { name: "right", value: right }]);
    }
    case "MOET2018-G3-NUM-P029-009": {
      const base = random.integer(18, 72) * 1_000;
      const values = [base + 9, base + 101, base + 110, base - 1];
      return text(`Xếp ${values.slice().reverse().map((v) => v.toLocaleString("vi-VN")).join(", ")} từ bé đến lớn.`, values.slice().sort((a, b) => a - b).map((v) => v.toLocaleString("vi-VN")).join(", "), [values.map((v) => v.toLocaleString("vi-VN")).join(", "), values.slice().reverse().map((v) => v.toLocaleString("vi-VN")).join(", "), "Không thể xếp"], ["So sánh từ hàng chục nghìn.", "Nếu bằng nhau, tiếp tục sang phải.", "Kiểm tra từng cặp liền nhau tăng dần."], "Không xếp theo chữ số cuối.", values.map((value, index) => ({ name: `value${index}`, value })));
    }
    case "MOET2018-G3-NUM-P029-011": {
      const base = random.integer(18, 72) * 1_000;
      const values = [base - 1, base + 1, base + 10, base + 100];
      return number(`Tìm số lớn nhất trong ${values.map((v) => v.toLocaleString("vi-VN")).join(", ")}.`, Math.max(...values), ["So sánh hàng cao nhất trước.", "20 100 lớn hơn các số 20 nghìn còn lại ở hàng trăm.", "Đối chiếu với cả bốn số."], "Phải so sánh toàn bộ số, không chỉ chữ số cuối.", values.map((value, index) => ({ name: `value${index}`, value })));
    }
    case "MOET2018-G3-NUM-P030-012": {
      if (occurrence % 2 === 0) {
        const left = random.integer(30, 70);
        return number(`Tính nhẩm ${left} + 20.`, left + 20, [`Thêm 2 chục vào ${left}.`, `Kết quả ${left + 20}.`, `Trừ lại 20 để kiểm tra.`], "Tách số tròn chục theo giá trị hàng.", [{ name: "left", value: left }, { name: "right", value: 20 }]);
      }
      const factor = random.integer(2, 9);
      return number(`Tính nhẩm ${factor * 6} : 6.`, factor, [`Vì 6 × ${factor} = ${factor * 6}.`, `Nên ${factor * 6} : 6 = ${factor}.`, "Số chia 6 khác 0."], "Dùng phép nhân ngược để kiểm tra phép chia.", [{ name: "dividend", value: factor * 6 }, { name: "divisor", value: 6 }], "COUNTER_ROW");
    }
    case "MOET2018-G3-NUM-P030-014":
      return text("Trong các cách viết, đâu là một biểu thức số?", "12 + 3 × 2", ["12 + 3 = 15", "mười hai cộng ba", "12, 3, 2"], ["Biểu thức gồm số và dấu phép tính.", "Không cần có dấu bằng.", "12 + 3 × 2 thỏa điều kiện."], "Phân biệt biểu thức với một đẳng thức đã có kết quả.", [{ name: "value", value: 18 }]);
    case "MOET2018-G3-NUM-P030-015": {
      const c = random.integer(2, 6);
      return number(`Tính nhanh 4 × 25 × ${c}.`, 100 * c, ["Nhóm 4 × 25 = 100.", `Tính 100 × ${c} = ${100 * c}.`, `Kiểm tra ${(100 * c)} : ${c} = 100.`], "Chỉ giao hoán, kết hợp các thừa số; không đổi phép nhân thành phép cộng.", [{ name: "groups", value: c }, { name: "itemsPerGroup", value: 100 }], "COUNTER_ROW");
    }
    case "MOET2018-G3-NUM-P030-016": {
      const divisor = random.integer(3, 7);
      const quotient = random.integer(3, 8);
      const remainder = occurrence % divisor;
      const dividend = divisor * quotient + remainder;
      return text(`Tính ${dividend} : ${divisor}.`, remainder === 0 ? String(quotient) : `${quotient} dư ${remainder}`, [`${quotient + 1}`, `${quotient} dư ${divisor}`, String(dividend - divisor)], [`${divisor} × ${quotient} = ${divisor * quotient}.`, `Phần còn lại ${dividend - divisor * quotient} = ${remainder}.`, `Kiểm tra ${remainder} < ${divisor}.`], "Số dư phải nhỏ hơn số chia và số chia khác 0.", [{ name: "dividend", value: dividend }, { name: "divisor", value: divisor }, { name: "quotient", value: quotient }, { name: "remainder", value: remainder }], "COUNTER_ROW");
    }
    case "MOET2018-G3-NUM-P030-019": {
      const inside = random.integer(3, 8);
      const subtract = random.integer(1, inside - 1);
      const factor = random.integer(2, 6);
      const answer = factor * (inside - subtract);
      return number(`Tính ${factor} × (${inside} − ${subtract}).`, answer, [`Trong ngoặc: ${inside} − ${subtract} = ${inside - subtract}.`, `Nhân ${factor} × ${inside - subtract} = ${answer}.`, "Đối chiếu thứ tự: ngoặc trước."], "Không nhân trước khi hoàn thành phép tính trong ngoặc.", [{ name: "left", value: factor }, { name: "inside", value: inside }, { name: "subtract", value: subtract }]);
    }
    case "MOET2018-G3-NUM-P030-020": {
      const add = random.integer(10, 30);
      const factor = random.integer(2, 6);
      const answer = add + factor * 5;
      return number(`Tính ${add} + ${factor} × 5.`, answer, [`Nhân trước: ${factor} × 5 = ${factor * 5}.`, `Cộng ${add} + ${factor * 5} = ${answer}.`, "Không cộng hai số đầu trước."], "Nhân chia trước cộng trừ khi không có ngoặc.", [{ name: "add", value: add }, { name: "factor", value: factor }]);
    }
    case "MOET2018-G3-NUM-P030-022": {
      const known = random.integer(20, 40);
      const missing = random.integer(10, 30);
      const total = known + missing;
      return number(`Tìm □: □ + ${known} = ${total}.`, missing, [`Ô trống là số hạng chưa biết.`, `${total} − ${known} = ${missing}.`, `Kiểm tra ${missing} + ${known} = ${total}.`], "Số hạng chưa biết bằng tổng trừ số hạng đã biết.", [{ name: "known", value: known }, { name: "total", value: total }]);
    }
    case "MOET2018-G3-GEO-P031-001":
      return text("Hai tam giác vuông bằng nhau ghép khít theo cạnh huyền tạo được hình nào?", "hình chữ nhật", ["hình tròn", "hình ngũ giác", "không tạo được hình"], ["Cho hai cạnh huyền trùng nhau.", "Không để hở hoặc chồng.", "Kiểm tra đường bao có bốn góc vuông."], "Tên hình dựa vào đường bao, không dựa vào hướng xoay.", [{ name: "shape", value: "RECTANGLE" }], "SHAPE_SCENE");
    case "MOET2018-G3-GEO-P031-002": {
      const half = random.integer(2, 8);
      return text(`A, M, B thẳng hàng; AM = ${half} cm và MB = ${half} cm. M là gì của AB?`, "trung điểm", ["điểm đầu", "điểm ngoài", "không xác định"], ["M nằm giữa A và B.", `AM = MB = ${half} cm.`, "M là trung điểm AB."], "Điểm ở giữa chỉ là trung điểm khi hai đoạn bằng nhau.", [{ name: "start", value: 0 }, { name: "end", value: half * 2 }], "MEASUREMENT_SCALE");
    }
    case "MOET2018-G3-GEO-P031-003":
      return text("Một góc khớp đúng với góc vuông của êke. Góc đó là gì?", "góc vuông", ["góc không vuông", "đường tròn", "đoạn thẳng"], ["Đặt đỉnh êke trùng đỉnh góc.", "Hai cạnh êke trùng hai tia.", "Kết luận góc vuông."], "Không suy từ hình gần vuông; dùng êke kiểm tra.", [{ name: "angle", value: 90 }], "ANGLE_DIAGRAM");
    case "MOET2018-G3-GEO-P031-007":
      return text("Dụng cụ nào giữ bán kính không đổi để vẽ đường tròn?", "compa", ["êke", "cân", "nhiệt kế"], ["Mở compa theo bán kính.", "Đặt mũi nhọn tại tâm.", "Quay và giữ nguyên độ mở."], "Compa vẽ đường tròn; êke kiểm tra góc vuông.", [{ name: "shape", value: "CIRCLE" }], "SHAPE_SCENE");
    case "MOET2018-G3-GEO-P031-008":
      return text("Muốn dựng góc vuông đỉnh A có một cạnh đã cho, dùng dụng cụ nào?", "êke", ["compa", "cân", "đồng hồ"], ["Đặt đỉnh vuông êke tại A.", "Một cạnh êke trùng cạnh đã cho.", "Vẽ cạnh còn lại."], "Giữ êke cố định để hai tia thật sự vuông góc.", [{ name: "angle", value: 90 }], "ANGLE_DIAGRAM");
    case "MOET2018-G3-GEO-P031-009": {
      const width = random.integer(3, 6);
      const height = random.integer(2, 4);
      return number(`Hình chữ nhật trên lưới dài ${width} ô, rộng ${height} ô. Đường bao có bao nhiêu cạnh?`, 4, ["Đánh dấu bốn đỉnh.", "Nối theo các đường lưới.", "Đường bao hình chữ nhật có 4 cạnh."], "Đếm khoảng ô để dựng kích thước; không đếm đường lưới.", [{ name: "shape", value: "RECTANGLE" }, { name: "width", value: width }, { name: "height", value: height }], "SHAPE_SCENE");
    }
    case "MOET2018-G3-GEO-P032-011": {
      const hour = random.integer(1, 11);
      const minute = [5, 15, 35][occurrence % 3];
      return text(`Kim giờ qua ${hour}, kim phút chỉ ${minute} phút. Đọc giờ.`, `${hour} giờ ${minute} phút`, [`${minute} giờ ${hour} phút`, `${hour} giờ`, `${hour + 1} giờ ${minute} phút`], ["Đọc kim giờ là giờ đã qua.", `Kim phút cho ${minute} phút.`, `Ghép thành ${hour} giờ ${minute} phút.`], "Mỗi vạch nhỏ là 1 phút; mỗi số lớn cách 5 phút.", [{ name: "hour", value: hour }, { name: "minute", value: minute }], "CLOCK_FACE");
    }
    case "MOET2018-G3-GEO-P032-012": {
      const a = random.integer(8, 15);
      const b = random.integer(3, a - 1);
      return text(`Hình A phủ ${a} ô vuông, hình B phủ ${b} ô cùng cỡ. Hình nào có diện tích lớn hơn?`, "Hình A", ["Hình B", "hai hình bằng nhau", "không so sánh được"], ["Hai hình dùng cùng đơn vị ô vuông.", `${a} > ${b}.`, "Hình A chiếm nhiều mặt phẳng hơn."], "Diện tích là phần mặt phẳng được phủ, không phải độ dài đường bao.", [{ name: "width", value: a }, { name: "height", value: 1 }], "AREA_MODEL");
    }
    case "MOET2018-G3-GEO-P032-013": {
      const rows = random.integer(2, 5);
      const columns = random.integer(3, 6);
      return text(`Có ${rows} hàng, mỗi hàng ${columns} ô 1 cm². Diện tích là bao nhiêu?`, `${rows * columns} cm²`, [`${2 * (rows + columns)} cm`, `${rows + columns} cm²`, `${rows * columns} cm`], ["Mỗi ô có diện tích 1 cm².", `${rows} × ${columns} = ${rows * columns}.`, `Ghi ${rows * columns} cm².`], "Diện tích dùng đơn vị vuông cm².", [{ name: "shape", value: "RECTANGLE" }, { name: "width", value: columns }, { name: "height", value: rows }], "AREA_MODEL");
    }
    case "MOET2018-G3-GEO-P032-014": {
      const litres = random.integer(1, 5);
      return number(`Đổi ${litres} l thành ml.`, litres * 1000, ["1 l = 1000 ml.", `${litres} × 1000 = ${litres * 1000}.`, "Ghi đơn vị ml."], "Dung tích đổi theo 1000, không theo 100.", [{ name: "start", value: 0 }, { name: "end", value: litres }], "MEASUREMENT_SCALE");
    }
    case "MOET2018-G3-GEO-P032-016": {
      const kg = random.integer(1, 5);
      return number(`Đổi ${kg} kg thành g.`, kg * 1000, ["1 kg = 1000 g.", `${kg} × 1000 = ${kg * 1000}.`, "Ghi đơn vị g."], "Khối lượng đổi theo 1000 và không dùng đơn vị dung tích.", [{ name: "start", value: 0 }, { name: "end", value: kg }], "MEASUREMENT_SCALE");
    }
    case "MOET2018-G3-GEO-P032-017": {
      const temperature = random.integer(18, 35);
      return text(`Nhiệt kế chỉ ${temperature}. Viết số đo đúng.`, `${temperature} °C`, [`${temperature} cm`, `${temperature} kg`, `${temperature} l`], ["Đại lượng là nhiệt độ.", `Đọc số ${temperature}.`, "Ghi đơn vị °C."], "Không bỏ dấu độ và không dùng đơn vị của đại lượng khác.", [{ name: "start", value: 0 }, { name: "end", value: temperature }], "MEASUREMENT_SCALE");
    }
    case "MOET2018-G3-GEO-P032-018": {
      const value = [20_000, 50_000, 100_000][occurrence % 3];
      return text(`Tờ tiền in ${value.toLocaleString("vi-VN")} đồng. Mệnh giá là gì?`, `${value.toLocaleString("vi-VN")} đồng`, [`${value / 10} đồng`, `${value * 10} đồng`, `${value} kg`], ["Đọc dãy số in trên tờ.", "Xác nhận chữ đồng.", `Mệnh giá ${value.toLocaleString("vi-VN")} đồng.`], "Không nhận mệnh giá chỉ từ màu hoặc kích thước.", [{ name: "value", value }], "DATA_DISPLAY");
    }
    case "MOET2018-G3-GEO-P032-019": {
      const months = ["Tháng Một", "Tháng Hai", "Tháng Ba", "Tháng Tư", "Tháng Năm", "Tháng Sáu", "Tháng Bảy", "Tháng Tám", "Tháng Chín", "Tháng Mười", "Tháng Mười một", "Tháng Mười hai"];
      const index = random.integer(0, 10);
      return text(`Tháng liền sau ${months[index]} là tháng nào?`, months[index + 1], [months[index], months[Math.max(0, index - 1)], "Không có"], ["Một năm có 12 tháng theo thứ tự.", `Tìm ${months[index]}.`, `Tháng tiếp theo là ${months[index + 1]}.`], "Không nhầm thứ tự tháng với số ngày.", [{ name: "month", value: index + 1 }], "DATA_DISPLAY");
    }
    case "MOET2018-G3-GEO-P032-020":
      return text("Muốn đo nhiệt độ nước, chọn dụng cụ nào?", "nhiệt kế", ["cân", "thước thẳng", "bình đong"], ["Đại lượng là nhiệt độ.", "Chọn nhiệt kế phù hợp.", "Đọc ngang mức và ghi °C."], "Chọn dụng cụ theo đại lượng cần đo.", [{ name: "start", value: 0 }, { name: "end", value: 30 }], "MEASUREMENT_SCALE");
    case "MOET2018-G3-GEO-P033-023": {
      const litres = random.integer(1, 4);
      const ml = random.integer(1, 8) * 100;
      return number(`Can có ${litres} l nước, thêm ${ml} ml. Có tất cả bao nhiêu ml?`, litres * 1000 + ml, [`Đổi ${litres} l = ${litres * 1000} ml.`, `Cộng ${litres * 1000} + ${ml} = ${litres * 1000 + ml}.`, "Kết luận bằng ml."], "Chỉ cộng sau khi đổi về cùng đơn vị.", [{ name: "litres", value: litres }, { name: "millilitres", value: ml }], "MEASUREMENT_SCALE");
    }
    case "MOET2018-G3-STA-P033-004": {
      const a = random.integer(4, 8);
      const b = random.integer(2, 6);
      return number(`Ghi chép có ${a} bút xanh và ${b} bút đỏ. Tổng số bút được phân loại là bao nhiêu?`, a + b, ["Tiêu chí là màu.", `Cộng ${a} + ${b} = ${a + b}.`, "Tổng phải khớp số quan sát."], "Mỗi đối tượng chỉ vào một nhóm và được đếm một lần.", [{ name: "countA", value: a }, { name: "countB", value: b }], "DATA_DISPLAY");
    }
    case "MOET2018-G3-GEO-P033-024":
      return text("Ước lượng hợp lí cho khối lượng một con gà là bao nhiêu?", "2 kg", ["2 g", "20 kg", "200 kg"], ["2 g quá nhẹ.", "20 kg và 200 kg quá nặng.", "Khoảng 2 kg phù hợp vật mốc quen thuộc."], "Ước lượng phải đúng đại lượng, đơn vị và cỡ.", [{ name: "start", value: 0 }, { name: "end", value: 2 }], "MEASUREMENT_SCALE");
    case "MOET2018-G3-GEO-P033-025": {
      const width = random.integer(3, 8);
      const height = random.integer(2, 6);
      return number(`Hình chữ nhật dài ${width} cm, rộng ${height} cm. Diện tích bằng bao nhiêu cm²?`, width * height, ["Hai kích thước cùng đơn vị.", `${width} × ${height} = ${width * height}.`, "Ghi cm²."], "Không dùng công thức chu vi khi đề hỏi diện tích.", [{ name: "shape", value: "RECTANGLE" }, { name: "width", value: width }, { name: "height", value: height }], "AREA_MODEL");
    }
    case "MOET2018-G3-EXP-P034-001": {
      const width = random.integer(3, 7);
      const height = random.integer(2, 5);
      return text(`Mặt bàn mô hình dài ${width} dm, rộng ${height} dm. Diện tích thực hành là bao nhiêu?`, `${width * height} dm²`, [`${2 * (width + height)} dm`, `${width + height} dm²`, `${width * height} dm`], ["Ước lượng theo tích hai kích thước.", `${width} × ${height} = ${width * height}.`, "Kết quả dùng dm² và đối chiếu ước lượng."], "Phân biệt chu vi với diện tích và ghi đúng đơn vị.", [{ name: "shape", value: "RECTANGLE" }, { name: "width", value: width }, { name: "height", value: height }], "AREA_MODEL");
    }
    case "MOET2018-G3-EXP-P034-002": {
      const a = random.integer(4, 7);
      const b = 10 - a;
      return number(`Khảo sát 10 bạn: ${a} bạn đi bộ, ${b} bạn đi xe. Tổng kiểm đếm là bao nhiêu?`, 10, ["Ghi theo cùng tiêu chí cách đến trường.", `${a} + ${b} = 10.`, "Tổng khớp 10 người được khảo sát."], "Không bỏ hoặc đếm lặp một bạn.", [{ name: "countA", value: a }, { name: "countB", value: b }], "DATA_DISPLAY");
    }
    default:
      throw new Error(`Missing Grade 3 scenario: ${outcomeId}.`);
  }
}

export function generateGrade3QuestionSpecs(
  unit: CurriculumUnit,
  seed: string,
): readonly Grade3QuestionSpec[] {
  if (unit.kind !== "GRADE3_OUTCOME_COMPLETION") {
    throw new Error("Grade 3 completion generator received another unit kind.");
  }
  if (12 % unit.officialOutcomeIds.length !== 0) {
    throw new Error(`${unit.slug} cannot distribute primary evidence evenly.`);
  }
  const count = 12 / unit.officialOutcomeIds.length;
  const random = randomFor(`${seed}:${unit.slug}`);
  return unit.officialOutcomeIds.flatMap((outcomeId) =>
    Array.from({ length: count }, (_, occurrence) =>
      scenario(unit, outcomeId, occurrence, random),
    ),
  );
}

export const grade3CompletionTargetOutcomeIds = specs.map((spec) => spec.id);
