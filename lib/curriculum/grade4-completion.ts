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
  example: readonly [string, string, string, string, string];
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

export type Grade4UnitSeed = Readonly<{
  slug: string;
  title: string;
  grade: 4;
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
  kind: "GRADE4_OUTCOME_COMPLETION";
  theory: readonly TheorySection[];
  examples: readonly WorkedExample[];
}>;

export type Grade4QuestionSpec = Readonly<{
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
  { id: "MOET2018-G4-NUM-P034-001", title: "Số đến lớp triệu", concept: "Số nhiều chữ số được tách thành lớp đơn vị, lớp nghìn và lớp triệu; mỗi lớp có hàng trăm, chục, đơn vị.", why: "Nhóm ba chữ số giúp đọc và viết số dài mà vẫn giữ đúng giá trị từng hàng.", method: "Tách từ phải sang trái thành từng lớp ba chữ số, đọc lớp cao nhất trước và bỏ tên lớp đơn vị.", error: "Không đọc các chữ số 0 ở đầu một lớp như một hàng có giá trị.", example: ["Đọc số 3 205 014.", "Tách 3 | 205 | 014.", "Đọc ba triệu, hai trăm linh năm nghìn.", "Đọc lớp cuối là không trăm mười bốn.", "Ba triệu hai trăm linh năm nghìn không trăm mười bốn."] },
  { id: "MOET2018-G4-NUM-P034-002", title: "Dãy số tự nhiên", concept: "Các số tự nhiên 0, 1, 2, 3, ... tạo thành dãy không có số cuối; hai số liên tiếp hơn kém nhau 1.", why: "Thêm 1 luôn tạo số tự nhiên kế tiếp nên dãy tiếp tục mãi.", method: "Muốn tìm số liền sau thì cộng 1; số liền trước của số khác 0 thì trừ 1.", error: "Số 0 không có số tự nhiên liền trước.", example: ["Tìm số liền trước và liền sau 40 000.", "40 000 khác 0 nên có số liền trước.", "40 000 − 1 = 39 999.", "40 000 + 1 = 40 001.", "Hai số là 39 999 và 40 001."] },
  { id: "MOET2018-G4-NUM-P034-003", title: "So sánh số trong lớp triệu", concept: "Số có nhiều chữ số hơn lớn hơn; nếu cùng số chữ số thì hàng khác nhau đầu tiên quyết định.", why: "Giá trị của một đơn vị ở hàng cao lớn hơn tổng tối đa của các hàng thấp hơn bên phải.", method: "So số chữ số rồi so lần lượt từ hàng triệu đến hàng đơn vị.", error: "Không so sánh bằng tổng các chữ số hoặc chỉ nhìn ba chữ số cuối.", example: ["So sánh 905 120 và 950 012.", "Hai số đều có sáu chữ số.", "Hàng trăm nghìn đều là 9.", "Hàng chục nghìn: 0 < 5.", "905 120 < 950 012."] },
  { id: "MOET2018-G4-NUM-P034-004", title: "Giá trị theo vị trí", concept: "Một chữ số có giá trị bằng chữ số nhân với giá trị của hàng mà nó đứng.", why: "Cùng chữ số nhưng chuyển sang trái một hàng thì giá trị gấp 10 lần.", method: "Xác định tên hàng, viết 1 kèm số chữ số 0 tương ứng rồi nhân với chữ số.", error: "Không trả lời bằng chính chữ số khi đề hỏi giá trị của chữ số.", example: ["Giá trị chữ số 7 trong 4 725 310 là bao nhiêu?", "Chữ số 7 ở hàng trăm nghìn.", "Một trăm nghìn là 100 000.", "7 × 100 000 = 700 000.", "Giá trị là 700 000."] },
  { id: "MOET2018-G4-NUM-P034-005", title: "Số chẵn và số lẻ", concept: "Số chẵn chia hết cho 2; số lẻ chia 2 dư 1. Chỉ chữ số hàng đơn vị quyết định.", why: "Các chục, trăm, nghìn đều là bội của 2 nên không làm đổi tính chẵn lẻ.", method: "Quan sát chữ số cuối: 0, 2, 4, 6, 8 là chẵn; 1, 3, 5, 7, 9 là lẻ.", error: "Không cộng các chữ số để quyết định chẵn lẻ.", example: ["47 306 là số chẵn hay lẻ?", "Chữ số hàng đơn vị là 6.", "6 thuộc nhóm 0, 2, 4, 6, 8.", "47 306 chia hết cho 2.", "Đây là số chẵn."] },
  { id: "MOET2018-G4-NUM-P035-006", title: "Biểu thức chứa chữ", concept: "Chữ trong biểu thức đại diện một số; giá trị biểu thức được xác định sau khi thay đúng giá trị của từng chữ.", why: "Cùng một quy tắc có thể dùng cho nhiều bộ dữ liệu bằng cách thay chữ.", method: "Ghi phép thay, đặt ngoặc quanh giá trị nếu cần rồi tính theo thứ tự phép tính.", error: "Không ghép chữ và số thành một số mới, và không bỏ sót chữ chưa được cho giá trị.", example: ["Tính a + 2 × b khi a = 15, b = 4.", "Thay a bằng 15 và b bằng 4.", "Được 15 + 2 × 4.", "Nhân trước: 2 × 4 = 8.", "Giá trị là 23."] },
  { id: "MOET2018-G4-NUM-P035-007", title: "Làm tròn số tự nhiên", concept: "Làm tròn đến một hàng giữ phần bên trái hàng đó và dùng chữ số ngay bên phải để quyết định tăng hay giữ.", why: "Mốc 5 chia khoảng giữa hai số tròn gần nhất thành hai phía.", method: "Khoanh hàng cần làm tròn: chữ số bên phải từ 5 trở lên thì tăng 1, nhỏ hơn 5 thì giữ; thay phần sau bằng 0.", error: "Không nhìn tất cả chữ số sau cùng lúc hoặc quên thay chúng bằng 0.", example: ["Làm tròn 347 620 đến hàng nghìn.", "Hàng nghìn là 7.", "Chữ số hàng trăm là 6 nên làm tròn lên.", "7 tăng thành 8; ba hàng sau thành 0.", "Kết quả 348 000."] },
  { id: "MOET2018-G4-NUM-P035-010", title: "Nhân chia với 10, 100, 1000", concept: "Nhân số tự nhiên với 10, 100, 1000 làm các chữ số chuyển trái 1, 2, 3 hàng; chia hết làm chuyển phải tương ứng.", why: "Mỗi hàng bên trái có giá trị gấp 10 lần hàng bên phải.", method: "Với phép nhân, thêm số chữ số 0 của thừa số; với phép chia hết, bỏ đúng số 0 tận cùng.", error: "Không bỏ chữ số 0 nếu số không chia hết cho 10, 100 hoặc 1000.", example: ["Tính 245 × 100 và 24 500 : 100.", "100 có hai chữ số 0.", "245 × 100 = 24 500.", "24 500 bỏ hai số 0 tận cùng được 245.", "Hai kết quả là 24 500 và 245."] },
  { id: "MOET2018-G4-NUM-P035-012", title: "Số trung bình cộng", concept: "Trung bình cộng là tổng các giá trị chia cho số lượng giá trị.", why: "Chia đều tổng cho tất cả phần tạo ra một mức bằng nhau đại diện cho nhóm.", method: "Tính tổng, đếm đúng số giá trị, chia tổng cho số lượng rồi kiểm tra kết quả nằm giữa nhỏ nhất và lớn nhất.", error: "Không chia cho tổng hoặc quên một giá trị khi đếm.", example: ["Tìm trung bình cộng của 12, 18, 24.", "Tổng là 12 + 18 + 24 = 54.", "Có 3 số.", "54 : 3 = 18.", "Trung bình cộng là 18."] },
  { id: "MOET2018-G4-NUM-P035-013", title: "Tính nhẩm thuận tiện", concept: "Có thể tách, gộp hoặc bù trừ để tạo số tròn mà không đổi giá trị phép tính.", why: "Các tính chất phép cộng và phép nhân cho phép chọn thứ tự tính dễ hơn.", method: "Tìm cặp tạo chục, trăm hoặc nghìn tròn, thực hiện cặp đó trước rồi tính phần còn lại.", error: "Không tự ý thay đổi một số mà không bù lại.", example: ["Tính nhanh 198 + 37.", "Bù 2 cho 198 để được 200.", "Phải bớt lại 2 từ 37, còn 35.", "200 + 35 = 235.", "Kết quả 235."] },
  { id: "MOET2018-G4-NUM-P035-014", title: "Tính chất cộng và quan hệ trừ", concept: "Đổi chỗ, nhóm số hạng không đổi tổng; phép trừ là phép tính ngược của phép cộng.", why: "Gộp cùng các phần theo thứ tự khác vẫn có cùng toàn thể.", method: "Nhóm các số hạng thuận tiện và dùng tổng trừ một số hạng để kiểm tra số hạng kia.", error: "Không áp dụng giao hoán cho phép trừ.", example: ["Tính 125 + 68 + 75.", "Đổi chỗ để nhóm 125 và 75.", "125 + 75 = 200.", "200 + 68 = 268.", "Kiểm tra 268 − 68 = 200."] },
  { id: "MOET2018-G4-NUM-P035-015", title: "Tính chất nhân và quan hệ chia", concept: "Đổi chỗ, nhóm thừa số không đổi tích; phép chia hết là phép tính ngược của phép nhân.", why: "Số phần tử trong một mảng không đổi khi đổi cách nhóm hàng và cột.", method: "Nhóm thừa số tạo 10, 100, 1000 rồi dùng tích chia một thừa số để kiểm tra.", error: "Không giao hoán số bị chia và số chia; số chia phải khác 0.", example: ["Tính nhanh 25 × 4 × 7.", "Nhóm 25 × 4 = 100.", "100 × 7 = 700.", "Kiểm tra 700 : 7 = 100.", "Kết quả 700."] },
  { id: "MOET2018-G4-NUM-P036-016", title: "Đọc và viết phân số", concept: "Phân số a/b có tử số a chỉ số phần lấy và mẫu số b khác 0 chỉ số phần bằng nhau của một toàn thể.", why: "Mẫu số xác định đơn vị phần; tử số đếm số đơn vị phần đó.", method: "Viết tử trên gạch ngang, mẫu dưới; đọc tử rồi đọc mẫu theo cách đọc phân số.", error: "Mẫu số không được bằng 0 và không đảo tử–mẫu.", example: ["Viết phân số chỉ 3 trong 8 phần bằng nhau.", "Toàn thể chia 8 phần nên mẫu là 8.", "Lấy 3 phần nên tử là 3.", "Viết 3/8.", "Đọc là ba phần tám."] },
  { id: "MOET2018-G4-NUM-P036-021", title: "Quy đồng hai phân số", concept: "Quy đồng thay các phân số bằng phân số tương đương có cùng mẫu; trường hợp một mẫu chia hết mẫu kia dùng mẫu lớn.", why: "Nhân cả tử và mẫu cùng số khác 0 giữ nguyên giá trị phân số.", method: "Chọn mẫu lớn, tìm thương giữa hai mẫu, nhân cả tử và mẫu của phân số có mẫu nhỏ với thương.", error: "Không chỉ nhân mẫu mà giữ nguyên tử.", example: ["Quy đồng 1/3 và 5/6.", "6 chia hết cho 3 nên chọn mẫu chung 6.", "Nhân cả tử và mẫu 1/3 với 2.", "1/3 = 2/6; 5/6 giữ nguyên.", "Hai phân số là 2/6 và 5/6."] },
  { id: "MOET2018-G4-NUM-P036-022", title: "Rút gọn phân số", concept: "Rút gọn chia cả tử và mẫu cho cùng một ước chung lớn hơn 1 để được phân số tương đương đơn giản hơn.", why: "Tử và mẫu cùng giảm theo một tỉ lệ nên phần của toàn thể không đổi.", method: "Tìm ước chung, chia cả tử và mẫu, lặp đến khi không còn ước chung lớn hơn 1.", error: "Không chia tử và mẫu cho hai số khác nhau.", example: ["Rút gọn 12/18.", "12 và 18 cùng chia hết cho 6.", "12 : 6 = 2.", "18 : 6 = 3.", "12/18 = 2/3."] },
  { id: "MOET2018-G4-NUM-P036-023", title: "Tính chất phân phối", concept: "a × (b + c) = a × b + a × c; có thể dùng chiều ngược để đặt thừa số chung.", why: "Nhân tổng nghĩa là lấy cùng số nhóm của từng phần rồi gộp lại.", method: "Nhân thừa số ngoài ngoặc với từng số hạng, hoặc nhận ra thừa số chung để nhóm.", error: "Không chỉ nhân một số hạng trong ngoặc.", example: ["Tính 7 × (20 + 3).", "Phân phối 7 cho cả 20 và 3.", "7 × 20 = 140; 7 × 3 = 21.", "140 + 21 = 161.", "Kết quả 161."] },
  { id: "MOET2018-G4-NUM-P036-024", title: "Lớn nhất, bé nhất trong nhóm phân số", concept: "Phân số cùng mẫu được so bằng tử; nếu một mẫu là bội các mẫu khác thì quy đồng về mẫu đó.", why: "Khi đơn vị phần bằng nhau, nhiều phần hơn tạo giá trị lớn hơn.", method: "Quy đồng nếu cần, so tối đa bốn tử rồi đối chiếu lại phân số ban đầu.", error: "Không kết luận mẫu lớn hơn thì phân số lớn hơn.", example: ["Tìm phân số lớn nhất: 1/2, 3/4, 2/4.", "Quy đồng 1/2 = 2/4.", "So các tử 2, 3, 2.", "Tử lớn nhất là 3.", "Phân số lớn nhất là 3/4."] },
  { id: "MOET2018-G4-NUM-P037-025", title: "Bài toán phân số nhiều bước", concept: "Bài toán phân số có thể cần tìm phân số của một số rồi kết hợp với dữ kiện bằng tối đa ba bước.", why: "Mỗi phép tính phải tương ứng một quan hệ trong tình huống, không chỉ ghép số.", method: "Tóm tắt, tìm giá trị một phần hoặc lấy số nhân tử chia mẫu, rồi thực hiện bước còn lại và kiểm tra.", error: "Không lấy số chia tử rồi nhân mẫu; phải giữ đơn vị.", example: ["Lớp có 32 bạn, 3/8 số bạn trồng cây. Có bao nhiêu bạn không trồng cây?", "Số bạn trồng cây: 32 : 8 × 3 = 12.", "Số bạn không trồng: 32 − 12.", "32 − 12 = 20.", "Có 20 bạn không trồng cây."] },
  { id: "MOET2018-G4-GEO-P037-001", title: "Giải quyết vấn đề hình học", concept: "Vấn đề hình học thực tế kết hợp đo góc, vẽ, ghép hoặc tạo hình theo các điều kiện đã cho.", why: "Các đặc điểm như độ dài, góc, song song và vuông góc cho phép kiểm tra sản phẩm.", method: "Xác định điều kiện, chọn dụng cụ, thao tác, đo lại và đối chiếu từng điều kiện.", error: "Không kết luận chỉ bằng mắt từ hình không theo tỉ lệ.", example: ["Kiểm tra một góc của khung có vuông không.", "Đặt đỉnh vuông êke vào đỉnh khung.", "Cho một cạnh êke trùng cạnh khung.", "Kiểm tra cạnh còn lại có trùng hay không.", "Nếu trùng, góc khung là góc vuông."] },
  { id: "MOET2018-G4-GEO-P037-004", title: "Hình bình hành và hình thoi", concept: "Hình bình hành có hai cặp cạnh đối song song; hình thoi là hình bình hành có bốn cạnh bằng nhau.", why: "Các đặc điểm cạnh không đổi khi hình được xoay nên giúp nhận dạng chính xác.", method: "Kiểm tra song song của hai cặp cạnh; nếu thêm bốn cạnh bằng nhau thì là hình thoi.", error: "Không gọi mọi hình nghiêng là hình bình hành hoặc mọi hình giống viên kim cương là hình thoi.", example: ["Tứ giác có hai cặp cạnh đối song song và bốn cạnh bằng nhau là hình gì?", "Hai cặp cạnh đối song song nên là hình bình hành.", "Bốn cạnh lại bằng nhau.", "Điều kiện đặc biệt này xác định hình thoi.", "Đó là hình thoi."] },
  { id: "MOET2018-G4-NUM-P037-026", title: "Nhân và chia phân số", concept: "Nhân phân số bằng nhân tử với tử, mẫu với mẫu; chia cho phân số khác 0 bằng nhân với phân số đảo ngược.", why: "Nhân biểu diễn lấy một phần của một phần; phép chia được chuyển thành phép nhân nghịch đảo.", method: "Kiểm tra mẫu và số chia khác 0, nhân, rồi rút gọn kết quả.", error: "Không nhân chéo khi nhân và không đảo phân số bị chia.", example: ["Tính 2/3 × 3/5.", "Nhân tử: 2 × 3 = 6.", "Nhân mẫu: 3 × 5 = 15.", "Rút gọn 6/15 = 2/5.", "Kết quả 2/5."] },
  { id: "MOET2018-G4-GEO-P037-005", title: "Đo, vẽ và tạo hình", concept: "Tạo hình chính xác cần số đo cạnh, góc và quan hệ giữa các phần được kiểm tra bằng dụng cụ.", why: "Đo lại biến yêu cầu bằng lời thành điều kiện có thể kiểm chứng.", method: "Đánh dấu điểm, đo/vẽ lần lượt, ghép không chồng hở, rồi kiểm tra cạnh và góc.", error: "Không thay số đo bằng ước nhìn khi đề yêu cầu chính xác.", example: ["Vẽ đoạn AB dài 6 cm.", "Đặt vạch 0 của thước tại A.", "Đánh dấu B tại vạch 6 cm.", "Nối A với B.", "Đo lại AB = 6 cm."] },
  { id: "MOET2018-G4-GEO-P037-006", title: "Đường vuông góc và song song", concept: "Hai đường vuông góc tạo góc vuông; hai đường song song trong mặt phẳng không cắt nhau.", why: "Êke giữ góc vuông và khi trượt theo thước tạo các đường có cùng phương.", method: "Dùng cạnh vuông êke để dựng vuông góc; cố định thước và trượt êke để dựng song song.", error: "Không dựa vào khoảng cách nhìn gần bằng nhau để kết luận song song.", example: ["Qua điểm M vẽ đường thẳng vuông góc với d.", "Đặt một cạnh vuông êke trùng d.", "Trượt êke đến khi cạnh kia qua M.", "Kẻ theo cạnh qua M.", "Đường vừa vẽ vuông góc d."] },
  { id: "MOET2018-G4-GEO-P038-009", title: "Giây và thế kỉ", concept: "1 phút = 60 giây; 1 thế kỉ = 100 năm. Các đơn vị dùng cho khoảng thời gian rất khác nhau.", why: "Quy đổi về cùng đơn vị mới cho phép cộng, trừ hoặc so sánh thời gian.", method: "Nhân khi đổi từ đơn vị lớn sang nhỏ, chia khi đổi ngược và kiểm tra phần dư nếu có.", error: "Không dùng hệ 10 cho phút–giây hoặc năm–thế kỉ.", example: ["Đổi 3 phút thành giây.", "1 phút = 60 giây.", "3 × 60 = 180.", "Đơn vị mới là giây.", "3 phút = 180 giây."] },
  { id: "MOET2018-G4-GEO-P038-010", title: "Đơn vị đo góc độ", concept: "Độ, kí hiệu °, là đơn vị đo độ mở góc; góc vuông có số đo 90°.", why: "Số đo cho phép so sánh góc mà không phụ thuộc độ dài hai cạnh vẽ.", method: "Đặt tâm thước đo góc tại đỉnh, vạch 0 trùng một cạnh và đọc nơi cạnh kia đi qua.", error: "Không đọc nhầm thang bắt đầu từ phía đối diện.", example: ["Một góc có số đo 65°. Nó bé hơn hay lớn hơn góc vuông?", "Góc vuông bằng 90°.", "65 < 90.", "Độ dài tia không ảnh hưởng số đo.", "Góc 65° bé hơn góc vuông."] },
  { id: "MOET2018-G4-STA-P038-001", title: "Dãy số liệu thống kê", concept: "Dãy số liệu là các giá trị thu được từ quan sát hoặc đo theo cùng một tiêu chí.", why: "Giữ đúng thứ tự và đơn vị giúp kiểm tra nguồn và thực hiện phân tích.", method: "Nêu tiêu chí, ghi từng giá trị, kiểm tra số phần tử và đơn vị.", error: "Không trộn dữ liệu khác tiêu chí hoặc bỏ giá trị vì không thuận tiện.", example: ["Ghi số sách đọc trong 4 tuần: 2, 3, 1, 4.", "Tiêu chí là số sách mỗi tuần.", "Có bốn giá trị theo thứ tự tuần.", "Các giá trị là 2, 3, 1, 4.", "Đây là một dãy số liệu gồm 4 số."] },
  { id: "MOET2018-G4-GEO-P038-011", title: "Dùng dụng cụ đo", concept: "Mỗi đại lượng cần dụng cụ và đơn vị phù hợp: cân cho khối lượng, bình chia độ cho dung tích, thước cho độ dài, đồng hồ cho thời gian.", why: "Dụng cụ được chia vạch theo đại lượng cụ thể nên công cụ sai không tạo số đo có nghĩa.", method: "Chọn dụng cụ, kiểm tra vạch 0, đặt đúng tư thế, đọc ngang mức và ghi đơn vị.", error: "Không dùng lẫn đơn vị hoặc đọc xiên vạch chia.", example: ["Muốn đo 750 ml nước, dùng gì?", "Đại lượng là dung tích.", "Chọn bình đong có vạch ml.", "Đặt bình thẳng và đọc ngang mặt nước.", "Dùng bình đong."] },
  { id: "MOET2018-G4-GEO-P038-014", title: "Ước lượng kết quả đo", concept: "Ước lượng dùng vật mốc và hiểu biết thực tế để cho khoảng giá trị hợp lí trước khi đo.", why: "Ước lượng giúp phát hiện sai đơn vị hoặc kết quả lệch cỡ lớn.", method: "Xác định đại lượng, chọn vật mốc gần, so sánh và nêu giá trị kèm đơn vị.", error: "Không chỉ nêu một số mà thiếu đơn vị hoặc chọn vật mốc khác đại lượng.", example: ["Ước lượng khối lượng một con bò.", "Đại lượng là khối lượng.", "Một người khoảng vài chục ki-lô-gam; bò nặng hơn nhiều.", "Khoảng 3 tạ là hợp lí.", "Ước lượng 3 tạ."] },
  { id: "MOET2018-G4-STA-P039-003", title: "Giải bài toán từ biểu đồ cột", concept: "Chiều cao cột được đọc theo trục và thang chia để tìm giá trị, tổng hoặc chênh lệch.", why: "Một ô hay một vạch có thể đại diện nhiều đơn vị nên phải dùng đúng tỉ lệ.", method: "Đọc tên nhóm, xác định mỗi vạch, đổi chiều cao thành số rồi thực hiện phép tính đề hỏi.", error: "Không đếm vạch như đơn vị khi thang chia không phải 1.", example: ["Biểu đồ: lớp A 24 cây, lớp B 18 cây. A hơn B bao nhiêu?", "Đọc đúng hai cột theo cùng thang.", "Lấy 24 − 18.", "24 − 18 = 6.", "Lớp A hơn 6 cây."] },
  { id: "MOET2018-G4-STA-P039-005", title: "Phát hiện quy luật từ biểu đồ", concept: "Quy luật dữ liệu là xu hướng hoặc quan hệ lặp lại được chứng minh bằng các giá trị trên biểu đồ.", why: "So sánh nhiều cột giúp phân biệt một biến động đơn lẻ với xu hướng nhất quán.", method: "Đọc dãy giá trị, tính thay đổi giữa các cột liên tiếp, mô tả quy luật và kiểm tra mọi cột.", error: "Không khẳng định xu hướng chỉ từ một cặp cột.", example: ["Bốn cột có giá trị 5, 10, 15, 20. Quy luật là gì?", "Tính chênh lệch liên tiếp.", "Mỗi lần đều tăng 5.", "Quy luật đúng với cả ba khoảng.", "Dãy tăng đều 5 đơn vị."] },
  { id: "MOET2018-G4-EXP-P039-001", title: "Thực hành tính toán và đo lường", concept: "Hoạt động thực tế kết hợp ước lượng, đo, tính chu vi/diện tích/góc/khối lượng/dung tích hoặc xác định thế kỉ.", why: "Kết quả đo, phép tính và ước lượng là ba bằng chứng kiểm tra lẫn nhau.", method: "Lập kế hoạch, chọn dụng cụ, ghi dữ liệu có đơn vị, tính và đối chiếu với mức hợp lí.", error: "Không trộn chu vi với diện tích hoặc đổi thế kỉ bằng phép chia sai mốc.", example: ["Tấm bìa 8 dm × 5 dm có diện tích bao nhiêu?", "Ước lượng khoảng 40 dm².", "Tính 8 × 5 = 40.", "Ghi đơn vị diện tích dm².", "Diện tích 40 dm² khớp ước lượng."] },
  { id: "MOET2018-G4-STA-P039-007", title: "Trung bình dữ liệu", concept: "Giá trị trung bình của bảng hoặc biểu đồ bằng tổng tất cả số liệu chia số giá trị.", why: "Nếu phân phối đều tổng dữ liệu cho các nhóm, mỗi nhóm nhận đúng mức trung bình.", method: "Đọc đủ cột, cộng, đếm số cột, chia và kiểm tra trung bình nằm trong khoảng dữ liệu.", error: "Không chia cho giá trị lớn nhất hoặc số vạch trên trục.", example: ["Ba cột có giá trị 12, 18, 24. Tính trung bình.", "Tổng là 54.", "Có 3 cột.", "54 : 3 = 18.", "Trung bình là 18."] },
  { id: "MOET2018-G4-EXP-P040-002", title: "Thực hành mua bán", concept: "Mua bán cần tính tổng tiền, số tiền trả lại và kiểm tra mệnh giá theo đơn vị đồng.", why: "Tổng giá trị hàng cộng với tiền thừa phải bằng số tiền khách đưa.", method: "Cộng giá, so với tiền đưa, lấy tiền đưa trừ tổng và kiểm tra bằng phép cộng ngược.", error: "Không trừ ngược tổng tiền khỏi tiền hàng hoặc bỏ đơn vị đồng.", example: ["Mua hàng 37 000 đồng, trả 50 000 đồng. Nhận lại bao nhiêu?", "Tiền đưa lớn hơn tiền hàng.", "50 000 − 37 000 = 13 000.", "Kiểm tra 37 000 + 13 000 = 50 000.", "Nhận lại 13 000 đồng."] },
  { id: "MOET2018-G4-EXP-P040-003", title: "Thực hành dữ liệu", concept: "Một dự án dữ liệu gồm thu thập theo tiêu chí, kiểm tra, biểu diễn và phân tích kết quả trong ngữ cảnh.", why: "Quy trình minh bạch cho phép người khác đối chiếu tổng và hiểu kết luận.", method: "Đặt câu hỏi, chọn đối tượng, ghi từng quan sát, lập bảng/cột, tính và nêu kết luận vừa đủ.", error: "Không bỏ dữ liệu trái dự đoán hoặc dùng biểu đồ có thang không nhất quán.", example: ["Khảo sát 20 bạn: 12 dùng chai tái sử dụng, 8 chưa dùng.", "Tiêu chí có hai nhóm không chồng nhau.", "Kiểm tra 12 + 8 = 20.", "Biểu diễn hai cột theo cùng thang.", "Kết luận nhóm dùng chai nhiều hơn 4 bạn."] },
] as const;

const groups: readonly UnitGroup[] = [
  { slug: "grade-4-place-value-millions-p1", title: "Số tự nhiên đến lớp triệu", code: "G4-P1-NUM-A", domain: "NUMBERS_AND_OPERATIONS", visual: "PLACE_VALUE_CHART", prerequisiteSlugs: ["grade-3-number-notation-order-p1"], outcomeIds: specs.slice(0, 4).map((item) => item.id) },
  { slug: "grade-4-number-patterns-p1", title: "Chẵn lẻ, làm tròn, nhân chia và trung bình", code: "G4-P1-NUM-B", domain: "NUMBERS_AND_OPERATIONS", visual: "NUMBER_LINE", prerequisiteSlugs: ["grade-3-additive-fluency-p1"], outcomeIds: [specs[4].id, specs[6].id, specs[7].id, specs[8].id] },
  { slug: "grade-4-expression-properties-p1", title: "Biểu thức và tính chất phép tính", code: "G4-P1-NUM-C", domain: "NUMBERS_AND_OPERATIONS", visual: "BALANCE_MODEL", prerequisiteSlugs: ["grade-3-expression-order-p1"], outcomeIds: [specs[5].id, specs[9].id, specs[10].id, specs[11].id] },
  { slug: "grade-4-fraction-foundations-p1", title: "Đọc, quy đồng và rút gọn phân số", code: "G4-P1-NUM-D", domain: "NUMBERS_AND_OPERATIONS", visual: "FRACTION_BAR", prerequisiteSlugs: ["grade-3-unit-fractions"], outcomeIds: [specs[12].id, specs[13].id, specs[14].id] },
  { slug: "grade-4-fraction-reasoning-p1", title: "Tính chất và bài toán phân số", code: "G4-P1-NUM-E", domain: "NUMBERS_AND_OPERATIONS", visual: "FRACTION_BAR", prerequisiteSlugs: ["grade-3-unit-fractions"], outcomeIds: [specs[15].id, specs[16].id, specs[17].id, specs[20].id] },
  { slug: "grade-4-geometry-construction-p1", title: "Đặc điểm và dựng hình lớp 4", code: "G4-P1-GEO-A", domain: "GEOMETRY", visual: "SHAPE_SCENE", prerequisiteSlugs: ["grade-3-geometric-tools-p1"], outcomeIds: [specs[18].id, specs[19].id, specs[21].id, specs[22].id] },
  { slug: "grade-4-measurement-tools-p1", title: "Thời gian, góc và thực hành đo", code: "G4-P1-MEA-A", domain: "MEASUREMENT", visual: "MEASUREMENT_SCALE", prerequisiteSlugs: ["grade-3-calendar-measurement-p1"], outcomeIds: [specs[23].id, specs[24].id, specs[26].id, specs[27].id] },
  { slug: "grade-4-data-reasoning-p1", title: "Dãy số liệu và biểu đồ cột", code: "G4-P1-STA-A", domain: "STATISTICS_AND_PROBABILITY", visual: "DATA_DISPLAY", prerequisiteSlugs: ["grade-3-area-data-experience-p1"], outcomeIds: [specs[25].id, specs[28].id, specs[29].id, specs[31].id] },
  { slug: "grade-4-experience-projects-p1", title: "Đo lường, tiền tệ và dự án dữ liệu", code: "G4-P1-EXP-A", domain: "APPLIED_PROBLEM_SOLVING", visual: "DATA_DISPLAY", prerequisiteSlugs: ["grade-3-area-data-experience-p1"], outcomeIds: [specs[30].id, specs[32].id, specs[33].id] },
] as const;

const specById = new Map(specs.map((spec) => [spec.id, spec]));
const skill = (outcomeId: string) =>
  outcomeId.replace("MOET2018-", "").replaceAll("-", "_");

export const grade4CompletionOutcomes: readonly CurriculumOutcome[] = groups.map(
  (group) => ({
    id: `PLAVE-MOET2018-${group.code}`,
    grade: 4,
    domain: group.domain,
    summary: group.title,
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  }),
);

export const grade4CompletionUnitSeeds: readonly Grade4UnitSeed[] = groups.map(
  (group) => {
    const outcomes = group.outcomeIds.map((id) => {
      const outcome = specById.get(id);
      if (!outcome) throw new Error(`Missing Grade 4 teaching spec: ${id}.`);
      return outcome;
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
      visualDescription: `${group.title}: minh hoạ trực tiếp cho ${outcome.title.toLocaleLowerCase("vi")}.`,
      officialOutcomeIds: [outcome.id],
    }));
    if (theory.length === 3) {
      theory.push({
        id: `${group.slug}-s4`,
        title: "Kiểm tra tính hợp lí",
        explanation: [
          "Đối chiếu lại dữ kiện, phép tính, điều kiện và đơn vị trước khi kết luận.",
          "Nêu rõ lỗi là khái niệm, tính toán, biểu diễn hay đơn vị để chọn cách sửa.",
        ],
        visualDescription: `${group.title}: bảng kiểm dữ kiện và kết quả.`,
        officialOutcomeIds: group.outcomeIds,
      });
    }
    return {
      slug: group.slug,
      title: group.title,
      grade: 4,
      domain: group.domain,
      outcomeId: `PLAVE-MOET2018-${group.code}`,
      officialOutcomeIds: group.outcomeIds,
      skills: group.outcomeIds.map(skill) as [string, string, string, ...string[]],
      prerequisiteSlugs: group.prerequisiteSlugs,
      restrictions: [
        "Chỉ dùng kiến thức, kí hiệu và đơn vị thuộc yêu cầu cần đạt Lớp 4.",
        "Mẫu số, số chia khác 0; thang biểu đồ và đơn vị phải nhất quán.",
        "Mỗi câu ghi một primary official outcome và được recompute độc lập.",
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
      kind: "GRADE4_OUTCOME_COMPLETION",
      theory,
      examples: outcomes.flatMap((outcome, index) => {
        const primary = {
          id: `${group.slug}-e${index + 1}`,
          title: `Ví dụ: ${outcome.title}`,
          prompt: outcome.example[0],
          steps: outcome.example.slice(1, 4),
          answer: outcome.example[4],
          visualDescription: `${group.title}: dữ kiện và phép kiểm tra của ${outcome.title.toLocaleLowerCase("vi")}.`,
          officialOutcomeIds: [outcome.id],
        };
        return outcome.id === "MOET2018-G4-NUM-P037-026"
          ? [
              primary,
              {
                id: `${group.slug}-e-division`,
                title: "Ví dụ: Chia hai phân số",
                prompt: "Tính 2/3 : 4/5.",
                steps: [
                  "Phân số chia 4/5 khác 0.",
                  "Đảo 4/5 thành 5/4 rồi tính 2/3 × 5/4 = 10/12.",
                  "Rút gọn 10/12 = 5/6.",
                ],
                answer: "Kết quả 5/6.",
                visualDescription: "Thanh phân số biểu diễn phép chia 2/3 thành các nhóm 4/5.",
                officialOutcomeIds: [outcome.id],
              },
            ]
          : [primary];
      }),
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
  input: Omit<Grade4QuestionSpec, "skillFamily" | "primaryOfficialOutcomeId" | "supportingOfficialOutcomeIds" | "evidenceForm">,
): Grade4QuestionSpec {
  const form =
    occurrence % 4 === 0 ? "RECOGNIZE_UNDERSTAND"
      : occurrence % 4 === 1 ? "PERFORM"
        : occurrence % 4 === 2 ? "ERROR_ANALYSIS"
          : "APPLY";
  return {
    ...input,
    prompt:
      form === "ERROR_ANALYSIS"
        ? `Bạn An chọn “${input.distractors[0]}”. ${input.prompt} Hãy sửa lựa chọn và nêu điều kiện bị vi phạm.`
        : form === "APPLY"
          ? `Vận dụng trong một tình huống thực tế: ${input.prompt}`
          : input.prompt,
    steps:
      form === "ERROR_ANALYSIS"
        ? [...input.steps, `Loại “${input.distractors[0]}” vì không thỏa điều kiện của bài.`]
        : input.steps,
    feedback: `${
      form === "ERROR_ANALYSIS"
        ? "Lỗi biểu diễn hoặc lập luận"
        : unit.domain === "MEASUREMENT"
          ? "Lỗi khái niệm hoặc đơn vị"
          : form === "PERFORM"
            ? "Lỗi tính toán"
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
): Grade4QuestionSpec {
  const text = (prompt: string, answer: string, distractors: [string, string, string], steps: readonly string[], feedback: string, parameters: PreviewAudit["parameters"], visualRequirement?: VisualRequirement) =>
    makeSpec(unit, outcomeId, occurrence, { prompt, answer, distractors, steps, feedback, parameters, visualRequirement, inputType: "TEXT_INPUT", cognitiveLevel: occurrence === 0 ? "UNDERSTAND" : occurrence === 1 ? "APPLY" : "REASON" });
  const number = (prompt: string, answer: number, steps: readonly string[], feedback: string, parameters: PreviewAudit["parameters"], visualRequirement?: VisualRequirement) =>
    makeSpec(unit, outcomeId, occurrence, { prompt, answer: String(answer), distractors: numberDistractors(answer), steps, feedback, parameters, visualRequirement, inputType: "NUMBER_INPUT", cognitiveLevel: occurrence === 0 ? "UNDERSTAND" : occurrence === 1 ? "APPLY" : "REASON" });
  const gcd = (left: number, right: number) => {
    let a = Math.abs(left);
    let b = Math.abs(right);
    while (b !== 0) [a, b] = [b, a % b];
    return a || 1;
  };

  switch (outcomeId) {
    case "MOET2018-G4-NUM-P034-001": {
      const millions = random.integer(1, 8);
      const thousands = random.integer(101, 950);
      const units = random.integer(101, 950);
      const value = millions * 1_000_000 + thousands * 1_000 + units;
      return number(`Viết số gồm ${millions} triệu, ${thousands} nghìn và ${units} đơn vị.`, value, ["Ghép ba lớp theo thứ tự triệu–nghìn–đơn vị.", `Mỗi lớp đủ ba chữ số: ${millions} | ${thousands} | ${units}.`, `Được ${value.toLocaleString("vi-VN")}.`], "Không bỏ chữ số giữ hàng giữa các lớp.", [{ name: "millions", value: millions }, { name: "thousands", value: thousands }, { name: "units", value: units }], "PLACE_VALUE_CHART");
    }
    case "MOET2018-G4-NUM-P034-002": {
      const value = random.integer(10_000, 900_000);
      return number(`Số tự nhiên liền sau ${value.toLocaleString("vi-VN")} là số nào?`, value + 1, [`Số liền sau hơn ${value.toLocaleString("vi-VN")} đúng 1.`, `${value.toLocaleString("vi-VN")} + 1 = ${(value + 1).toLocaleString("vi-VN")}.`, "Dãy số tự nhiên tiếp tục sau số đó."], "Không có số tự nhiên cuối cùng; luôn cộng 1 để tìm số liền sau.", [{ name: "value", value }], "NUMBER_LINE");
    }
    case "MOET2018-G4-NUM-P034-003": {
      const left = random.integer(200_000, 800_000);
      const right = left + random.integer(1, 9_000);
      return text(`Điền dấu vào ${left.toLocaleString("vi-VN")} … ${right.toLocaleString("vi-VN")}.`, "<", [">", "=", "không so sánh được"], ["Hai số có cùng số chữ số.", "So từ hàng cao nhất đến hàng đầu tiên khác nhau.", `${left.toLocaleString("vi-VN")} nhỏ hơn ${right.toLocaleString("vi-VN")}.`], "So giá trị hàng, không cộng các chữ số.", [{ name: "left", value: left }, { name: "right", value: right }], "PLACE_VALUE_CHART");
    }
    case "MOET2018-G4-NUM-P034-004": {
      const digit = random.integer(2, 9);
      const place = [1_000, 10_000, 100_000][occurrence % 3];
      return number(`Chữ số ${digit} ở hàng có giá trị ${place.toLocaleString("vi-VN")} có giá trị bao nhiêu?`, digit * place, [`Giá trị hàng là ${place.toLocaleString("vi-VN")}.`, `${digit} × ${place.toLocaleString("vi-VN")} = ${(digit * place).toLocaleString("vi-VN")}.`, "Phân biệt chữ số với giá trị chữ số."], "Giá trị phụ thuộc vị trí, không chỉ phụ thuộc chữ số.", [{ name: "digit", value: digit }, { name: "place", value: place }], "PLACE_VALUE_CHART");
    }
    case "MOET2018-G4-NUM-P034-005": {
      const value = random.integer(1_000, 99_999) * 10 + (occurrence % 2 === 0 ? 6 : 7);
      const answer = value % 2 === 0 ? "số chẵn" : "số lẻ";
      return text(`${value.toLocaleString("vi-VN")} là số chẵn hay số lẻ?`, answer, [answer === "số chẵn" ? "số lẻ" : "số chẵn", "cả hai", "không xác định"], ["Quan sát chữ số hàng đơn vị.", `${value % 10} ${value % 2 === 0 ? "chia hết" : "không chia hết"} cho 2.`, `Kết luận ${answer}.`], "Chỉ chữ số hàng đơn vị quyết định tính chẵn lẻ.", [{ name: "value", value }], "PLACE_VALUE_CHART");
    }
    case "MOET2018-G4-NUM-P035-006": {
      const a = random.integer(10, 30);
      const b = random.integer(2, 9);
      return number(`Tính a + 2 × b khi a = ${a}, b = ${b}.`, a + 2 * b, [`Thay a = ${a}, b = ${b}.`, `Nhân trước: 2 × ${b} = ${2 * b}.`, `Cộng ${a} + ${2 * b} = ${a + 2 * b}.`], "Phải thay đủ giá trị và giữ thứ tự phép tính.", [{ name: "a", value: a }, { name: "b", value: b }], "BALANCE_MODEL");
    }
    case "MOET2018-G4-NUM-P035-007": {
      const base = [10, 100, 1_000][occurrence % 3];
      const lower = random.integer(100, 800) * base;
      const offset = occurrence % 2 === 0 ? Math.floor(base * 0.3) : Math.floor(base * 0.7);
      const value = lower + offset;
      const rounded = Math.round(value / base) * base;
      return number(`Làm tròn ${value.toLocaleString("vi-VN")} đến hàng ${base.toLocaleString("vi-VN")}.`, rounded, [`Xét chữ số ngay bên phải hàng ${base.toLocaleString("vi-VN")}.`, `${offset < base / 2 ? "Nhỏ hơn 5 nên giữ" : "Từ 5 trở lên nên tăng"} chữ số ở hàng làm tròn.`, `Thay các hàng sau bằng 0: ${rounded.toLocaleString("vi-VN")}.`], "Chỉ chữ số ngay bên phải quyết định làm tròn.", [{ name: "value", value }, { name: "base", value: base }, { name: "rounded", value: rounded }], "NUMBER_LINE");
    }
    case "MOET2018-G4-NUM-P035-010": {
      const value = random.integer(12, 999);
      const factor = [10, 100, 1_000][occurrence % 3];
      return number(`Tính ${value} × ${factor.toLocaleString("vi-VN")}.`, value * factor, [`${factor.toLocaleString("vi-VN")} có ${String(factor).length - 1} chữ số 0.`, `Chuyển các chữ số sang trái tương ứng.`, `Kết quả ${(value * factor).toLocaleString("vi-VN")}.`], "Phép nhân với lũy thừa 10 phải giữ nguyên thứ tự chữ số.", [{ name: "value", value }, { name: "factor", value: factor }], "PLACE_VALUE_CHART");
    }
    case "MOET2018-G4-NUM-P035-012": {
      const start = random.integer(5, 20);
      const step = random.integer(2, 8);
      const values = [start, start + step, start + 2 * step];
      return number(`Tìm trung bình cộng của ${values.join(", ")}.`, start + step, [`Tổng là ${values.reduce((sum, value) => sum + value, 0)}.`, "Có 3 số.", `Chia tổng cho 3 được ${start + step}.`], "Mẫu số của phép chia là số lượng giá trị.", values.map((value, index) => ({ name: `value${index}`, value })), "DATA_DISPLAY");
    }
    case "MOET2018-G4-NUM-P035-013": {
      const left = random.integer(120, 190);
      const complement = 200 - left;
      const middle = random.integer(20, 70);
      return number(`Tính thuận tiện ${left} + ${middle} + ${complement}.`, 200 + middle, [`Nhóm ${left} + ${complement} = 200.`, `Cộng 200 + ${middle} = ${200 + middle}.`, "Phép nhóm không đổi tổng."], "Tạo số tròn bằng một cặp thật sự có trong biểu thức.", [{ name: "left", value: left }, { name: "middle", value: middle }, { name: "right", value: complement }]);
    }
    case "MOET2018-G4-NUM-P035-014": {
      const a = random.integer(100, 180);
      const b = 200 - a;
      const c = random.integer(30, 90);
      return number(`Tính ${a} + ${c} + ${b}.`, 200 + c, [`Đổi chỗ để đặt ${a} cạnh ${b}.`, `${a} + ${b} = 200.`, `200 + ${c} = ${200 + c}; trừ ${c} để kiểm tra.`], "Giao hoán, kết hợp áp dụng cho phép cộng, không cho phép trừ.", [{ name: "left", value: a }, { name: "middle", value: c }, { name: "right", value: b }]);
    }
    case "MOET2018-G4-NUM-P035-015": {
      const factor = random.integer(3, 9);
      return number(`Tính 25 × 4 × ${factor}.`, 100 * factor, ["Nhóm 25 × 4 = 100.", `100 × ${factor} = ${100 * factor}.`, `Kiểm tra ${(100 * factor)} : ${factor} = 100.`], "Không đổi thứ tự của phép chia và số chia phải khác 0.", [{ name: "left", value: 25 }, { name: "middle", value: 4 }, { name: "right", value: factor }], "COUNTER_ROW");
    }
    case "MOET2018-G4-NUM-P036-016": {
      const denominator = random.integer(3, 9);
      const numerator = random.integer(1, denominator - 1);
      return text(`Viết phân số chỉ ${numerator} trong ${denominator} phần bằng nhau.`, `${numerator}/${denominator}`, [`${denominator}/${numerator}`, `${numerator + 1}/${denominator}`, `${numerator}/${denominator + 1}`], [`Mẫu số là ${denominator}, khác 0.`, `Tử số là ${numerator}.`, `Viết ${numerator}/${denominator}.`], "Không đảo tử và mẫu.", [{ name: "numerator", value: numerator }, { name: "denominator", value: denominator }], "FRACTION_BAR");
    }
    case "MOET2018-G4-NUM-P036-021": {
      const small = random.integer(2, 6);
      const scale = random.integer(2, 4);
      const numerator = random.integer(1, small - 1);
      return text(`Quy đồng ${numerator}/${small} về mẫu ${small * scale}.`, `${numerator * scale}/${small * scale}`, [`${numerator}/${small * scale}`, `${numerator + scale}/${small * scale}`, `${numerator * scale}/${small}`], [`Mẫu mới gấp ${scale} lần mẫu cũ.`, `Nhân cả tử và mẫu với ${scale}.`, `Được ${numerator * scale}/${small * scale}.`], "Phải nhân cả tử và mẫu với cùng một số.", [{ name: "numerator", value: numerator }, { name: "denominator", value: small }, { name: "scale", value: scale }], "FRACTION_BAR");
    }
    case "MOET2018-G4-NUM-P036-022": {
      const simpleNumerator = random.integer(1, 5);
      const simpleDenominator = random.integer(simpleNumerator + 1, 8);
      const scale = random.integer(2, 5);
      const numerator = simpleNumerator * scale;
      const denominator = simpleDenominator * scale;
      const divisor = gcd(numerator, denominator);
      return text(`Rút gọn ${numerator}/${denominator} tối giản.`, `${numerator / divisor}/${denominator / divisor}`, [`${numerator / divisor}/${denominator}`, `${numerator}/${denominator / divisor}`, `${denominator / divisor}/${numerator / divisor}`], [`Tìm ước chung lớn nhất ${divisor}.`, `Chia cả tử và mẫu cho ${divisor}.`, `Được ${numerator / divisor}/${denominator / divisor}.`], "Tử và mẫu phải chia cùng một ước.", [{ name: "numerator", value: numerator }, { name: "denominator", value: denominator }, { name: "divisor", value: divisor }], "FRACTION_BAR");
    }
    case "MOET2018-G4-NUM-P036-023": {
      const a = random.integer(3, 9);
      const b = random.integer(10, 30);
      const c = random.integer(2, 9);
      return number(`Tính ${a} × (${b} + ${c}) bằng tính chất phân phối.`, a * (b + c), [`Tính ${a} × ${b} và ${a} × ${c}.`, `${a * b} + ${a * c} = ${a * (b + c)}.`, "Đã nhân thừa số ngoài với cả hai số hạng."], "Không được bỏ một số hạng trong ngoặc.", [{ name: "a", value: a }, { name: "b", value: b }, { name: "c", value: c }], "AREA_MODEL");
    }
    case "MOET2018-G4-NUM-P036-024": {
      const denominator = [4, 6, 8][occurrence % 3];
      const numerators = [1, denominator - 1, Math.floor(denominator / 2), denominator - 2];
      const max = Math.max(...numerators);
      return text(`Tìm phân số lớn nhất trong ${numerators.map((value) => `${value}/${denominator}`).join(", ")}.`, `${max}/${denominator}`, [`${Math.min(...numerators)}/${denominator}`, `${Math.floor(denominator / 2)}/${denominator}`, `${denominator}/${max}`], [`Các phân số cùng mẫu ${denominator}.`, `So các tử ${numerators.join(", ")}.`, `Tử lớn nhất ${max}.`], "Cùng mẫu thì so tử, không so theo mẫu.", numerators.map((value, index) => ({ name: `numerator${index}`, value })).concat({ name: "denominator", value: denominator }), "FRACTION_BAR");
    }
    case "MOET2018-G4-NUM-P037-025": {
      const denominator = [4, 5, 8][occurrence % 3];
      const numerator = random.integer(1, denominator - 1);
      const whole = denominator * random.integer(4, 10);
      return number(`Một nhóm có ${whole} bạn, ${numerator}/${denominator} số bạn tham gia. Có bao nhiêu bạn tham gia?`, whole / denominator * numerator, [`Tìm 1/${denominator}: ${whole} : ${denominator} = ${whole / denominator}.`, `Nhân ${numerator}: ${whole / denominator} × ${numerator} = ${whole / denominator * numerator}.`, "Kết quả không vượt tổng số bạn."], "Tìm phân số của một số bằng chia mẫu rồi nhân tử.", [{ name: "whole", value: whole }, { name: "numerator", value: numerator }, { name: "denominator", value: denominator }], "FRACTION_BAR");
    }
    case "MOET2018-G4-NUM-P037-026": {
      const a = random.integer(1, 4);
      const b = random.integer(a + 1, 7);
      const c = random.integer(1, 4);
      const d = random.integer(c + 1, 7);
      const division = occurrence % 2 === 1;
      const numerator = division ? a * d : a * c;
      const denominator = division ? b * c : b * d;
      const divisor = gcd(numerator, denominator);
      const symbol = division ? ":" : "×";
      return text(`Tính ${a}/${b} ${symbol} ${c}/${d} và rút gọn.`, `${numerator / divisor}/${denominator / divisor}`, [`${a + c}/${b + d}`, `${denominator / divisor}/${numerator / divisor}`, `${a}/${b * d}`], [division ? `Đảo số chia rồi tính ${a}/${b} × ${d}/${c}.` : `Nhân tử với tử, mẫu với mẫu.`, `Được ${numerator}/${denominator}; ước chung lớn nhất là ${divisor}.`, `Rút gọn được ${numerator / divisor}/${denominator / divisor}.`], division ? "Khi chia, chỉ đảo phân số chia và phân số chia phải khác 0." : "Mẫu số phải khác 0 và phép nhân không dùng nhân chéo.", [{ name: "a", value: a }, { name: "b", value: b }, { name: "c", value: c }, { name: "d", value: d }, { name: "divisor", value: divisor }, { name: "operation", value: division ? "DIVIDE" : "MULTIPLY" }], "FRACTION_BAR");
    }
    case "MOET2018-G4-GEO-P037-001":
      return text("Dụng cụ nào kiểm tra trực tiếp một góc của khung có vuông không?", "êke", ["compa", "cân", "bình đong"], ["Đại lượng cần kiểm tra là góc vuông.", "Đặt góc vuông êke vào góc khung.", "Đối chiếu hai cạnh."], "Không kết luận chỉ bằng mắt.", [{ name: "angle", value: 90 }], "ANGLE_DIAGRAM");
    case "MOET2018-G4-GEO-P037-004":
      return text("Tứ giác có hai cặp cạnh đối song song và bốn cạnh bằng nhau là hình gì?", "hình thoi", ["hình chữ nhật", "hình tam giác", "hình tròn"], ["Hai cặp cạnh đối song song cho hình bình hành.", "Bốn cạnh bằng nhau là điều kiện thêm.", "Kết luận hình thoi."], "Nhận dạng theo tính chất, không theo hướng xoay.", [{ name: "shape", value: "RHOMBUS" }], "SHAPE_SCENE");
    case "MOET2018-G4-GEO-P037-005": {
      const length = random.integer(3, 9);
      return text(`Muốn vẽ đoạn thẳng dài ${length} cm, vạch 0 của thước đặt ở đâu?`, "tại điểm đầu", ["tại vạch 1 cm", "tại điểm cuối", "ở vị trí bất kì"], ["Chọn điểm đầu đoạn.", "Đặt vạch 0 trùng điểm đầu.", `Đánh dấu điểm cuối tại vạch ${length} cm.`], "Đo chính xác phải dùng vạch 0 làm mốc.", [{ name: "start", value: 0 }, { name: "end", value: length }], "MEASUREMENT_SCALE");
    }
    case "MOET2018-G4-GEO-P037-006":
      return text("Hai đường thẳng cắt nhau tạo bốn góc vuông được gọi là gì?", "vuông góc", ["song song", "trùng nhau", "cong"], ["Kiểm tra một góc bằng êke.", "Một góc 90° kéo theo bốn góc vuông.", "Hai đường vuông góc."], "Song song không cắt nhau; vuông góc tạo góc 90°.", [{ name: "angle", value: 90 }], "ANGLE_DIAGRAM");
    case "MOET2018-G4-GEO-P038-009": {
      const minutes = random.integer(2, 9);
      return number(`Đổi ${minutes} phút thành giây.`, minutes * 60, ["1 phút = 60 giây.", `${minutes} × 60 = ${minutes * 60}.`, "Ghi đơn vị giây."], "Thời gian phút–giây dùng hệ 60, không dùng hệ 10.", [{ name: "minutes", value: minutes }], "CLOCK_FACE");
    }
    case "MOET2018-G4-GEO-P038-010": {
      const angle = [45, 65, 120][occurrence % 3];
      return text(`Góc ${angle}° ${angle < 90 ? "bé hơn" : "lớn hơn"} góc vuông. Nhận định này đúng hay sai?`, "đúng", ["sai", "không đủ dữ kiện", "chỉ đúng khi tia dài bằng nhau"], ["Góc vuông bằng 90°.", `So ${angle} với 90.`, `Nhận định ${angle < 90 ? "bé hơn" : "lớn hơn"} là đúng.`], "Số đo góc không phụ thuộc độ dài tia.", [{ name: "angle", value: angle }], "ANGLE_DIAGRAM");
    }
    case "MOET2018-G4-STA-P038-001": {
      const values = [random.integer(2, 8), random.integer(2, 8), random.integer(2, 8), random.integer(2, 8)];
      return number(`Dãy số liệu ${values.join(", ")} có bao nhiêu giá trị?`, values.length, ["Mỗi số là một giá trị theo cùng tiêu chí.", `Đếm được ${values.length} giá trị.`, "Giữ nguyên thứ tự ghi nhận."], "Không đếm trùng giá trị giống nhau thành một.", values.map((value, index) => ({ name: `value${index}`, value })), "DATA_DISPLAY");
    }
    case "MOET2018-G4-GEO-P038-011":
      return text("Muốn đo 750 ml nước, chọn dụng cụ nào?", "bình đong", ["cân", "êke", "thước đo góc"], ["Đại lượng là dung tích.", "Chọn bình có vạch ml.", "Đọc ngang mặt nước."], "Dụng cụ phải phù hợp đại lượng và đơn vị.", [{ name: "start", value: 0 }, { name: "end", value: 750 }], "MEASUREMENT_SCALE");
    case "MOET2018-G4-GEO-P038-014":
      return text("Ước lượng hợp lí cho khối lượng một con bò trưởng thành là bao nhiêu?", "3 tạ", ["3 g", "3 kg", "30 tấn"], ["So với vật mốc là người trưởng thành.", "3 g và 3 kg quá nhẹ; 30 tấn quá nặng.", "Khoảng 3 tạ hợp lí."], "Ước lượng cần đúng cỡ và đúng đơn vị.", [{ name: "start", value: 0 }, { name: "end", value: 3 }], "MEASUREMENT_SCALE");
    case "MOET2018-G4-STA-P039-003": {
      const scale = 2;
      const a = random.integer(8, 16) * scale;
      const b = random.integer(3, 7) * scale;
      return number(`Biểu đồ cột cho nhóm A ${a} sản phẩm, nhóm B ${b} sản phẩm. A hơn B bao nhiêu?`, a - b, [`Hai cột dùng cùng thang ${scale} đơn vị.`, `${a} − ${b} = ${a - b}.`, "Kết quả là chênh lệch, không phải tổng."], "Đọc giá trị theo thang trước khi trừ.", [{ name: "countA", value: a }, { name: "countB", value: b }, { name: "scale", value: scale }], "DATA_DISPLAY");
    }
    case "MOET2018-G4-STA-P039-005": {
      const start = random.integer(2, 8);
      const step = random.integer(2, 6);
      const values = [start, start + step, start + 2 * step, start + 3 * step];
      return number(`Các cột có giá trị ${values.join(", ")}. Mỗi cột tăng bao nhiêu so với cột trước?`, step, ["Lấy giá trị sau trừ giá trị trước.", `Các hiệu đều bằng ${step}.`, "Kiểm tra cả ba khoảng."], "Không kết luận quy luật từ chỉ một cặp cột.", [{ name: "start", value: start }, { name: "step", value: step }], "DATA_DISPLAY");
    }
    case "MOET2018-G4-EXP-P039-001": {
      const width = random.integer(4, 9);
      const height = random.integer(2, 6);
      return text(`Tấm bìa dài ${width} dm, rộng ${height} dm. Diện tích là bao nhiêu?`, `${width * height} dm²`, [`${2 * (width + height)} dm`, `${width * height} dm`, `${width + height} dm²`], [`Hai kích thước cùng đơn vị dm.`, `${width} × ${height} = ${width * height}.`, "Ghi đơn vị vuông dm²."], "Không dùng công thức chu vi và không ghi dm.", [{ name: "shape", value: "RECTANGLE" }, { name: "width", value: width }, { name: "height", value: height }], "AREA_MODEL");
    }
    case "MOET2018-G4-STA-P039-007": {
      const start = random.integer(4, 12);
      const step = random.integer(2, 6);
      return number(`Ba cột có giá trị ${start}, ${start + step}, ${start + 2 * step}. Trung bình là bao nhiêu?`, start + step, [`Tổng là ${3 * (start + step)}.`, "Có 3 cột.", `Chia cho 3 được ${start + step}.`], "Phải chia tổng cho số cột.", [{ name: "value0", value: start }, { name: "value1", value: start + step }, { name: "value2", value: start + 2 * step }], "DATA_DISPLAY");
    }
    case "MOET2018-G4-EXP-P040-002": {
      const cost = random.integer(20, 45) * 1_000;
      const paid = 50_000;
      return number(`Mua hàng ${cost.toLocaleString("vi-VN")} đồng, trả ${paid.toLocaleString("vi-VN")} đồng. Tiền thừa là bao nhiêu đồng?`, paid - cost, [`Lấy tiền trả trừ giá hàng.`, `${paid.toLocaleString("vi-VN")} − ${cost.toLocaleString("vi-VN")} = ${(paid - cost).toLocaleString("vi-VN")}.`, "Cộng ngược với giá hàng để kiểm tra."], "Không đảo thứ tự phép trừ.", [{ name: "cost", value: cost }, { name: "paid", value: paid }], "DATA_DISPLAY");
    }
    case "MOET2018-G4-EXP-P040-003": {
      const yes = random.integer(11, 15);
      const total = 20;
      const no = total - yes;
      return number(`Khảo sát ${total} bạn: ${yes} bạn chọn A, ${no} bạn chọn B. A nhiều hơn B bao nhiêu bạn?`, yes - no, [`Kiểm tra ${yes} + ${no} = ${total}.`, `Tính ${yes} − ${no} = ${yes - no}.`, "Hai nhóm dùng cùng tiêu chí và không chồng nhau."], "Kiểm tra tổng trước khi phân tích chênh lệch.", [{ name: "countA", value: yes }, { name: "countB", value: no }, { name: "total", value: total }], "DATA_DISPLAY");
    }
    default:
      throw new Error(`Missing Grade 4 scenario: ${outcomeId}.`);
  }
}

export function generateGrade4QuestionSpecs(
  unit: CurriculumUnit,
  seed: string,
): readonly Grade4QuestionSpec[] {
  if (unit.kind !== "GRADE4_OUTCOME_COMPLETION") {
    throw new Error("Grade 4 completion generator received another unit kind.");
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

export const grade4CompletionTargetOutcomeIds = specs.map((spec) => spec.id);
