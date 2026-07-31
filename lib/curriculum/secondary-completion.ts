import inventoryJson from "../../docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json" with {
  type: "json",
};
import type {
  CurriculumDomain,
  CurriculumUnit,
  PreviewAudit,
  VerticalUnitKind,
  VisualRequirement,
} from "./types.ts";
import {
  buildCompletionArtifacts,
  generateCompletionQuestionSpecs,
  type CompletionOutcomeSpec,
  type CompletionQuestionCore,
  type CompletionRandom,
  type CompletionUnitGroup,
} from "./completion-framework.ts";

type SourceRecord = Readonly<{
  id: string;
  grade: number;
  officialStrand: string;
  subdomain: string;
  conciseParaphrase: string;
  mappedUnitIds: readonly string[];
  implementationEvidence?: unknown;
}>;

type SemanticKind =
  | "POWER_ROOT"
  | "NUMBER_ORDER"
  | "ALGEBRA"
  | "PROPORTION"
  | "FUNCTION_GRAPH"
  | "EQUATION_SYSTEM"
  | "INEQUALITY"
  | "SOLID_MEASURE"
  | "ANGLE_TRIANGLE_PROOF"
  | "QUADRILATERAL_SIMILARITY"
  | "CIRCLE_TRIG"
  | "TRANSFORMATION"
  | "DATA"
  | "PROBABILITY"
  | "FINANCE"
  | "SOFTWARE"
  | "MODELLING";

const targetDefinition = {
  7: {
    "NAA-56": [6, 9, 10, 11, 12, 13, 14, 15, 17, 18],
    "NAA-57": [21, 22, 23, 25, 26, 27, 28, 29, 30, 31, 32],
    "GEO-58": [2, 4],
    "NAA-58": [33, 34, 35],
    "GEO-59": [6, 8, 9, 10, 12, 13, 14, 16, 17, 18, 19],
    "GEO-60": [20, 21, 22, 23, 24, 25],
    "STA-61": [2, 3, 4, 5, 6],
    "EXP-62": [1, 2, 3, 4, 5, 6],
    "EXP-63": [1],
  },
  8: {
    "NAA-63": [1, 2, 3, 4, 5, 6, 7, 8],
    "NAA-64": [10, 11, 12, 13, 14, 16, 18, 19, 20, 22],
    "NAA-65": [25],
    "GEO-66": [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    "GEO-67": [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
    "STA-68": [1, 2, 3, 7],
    "GEO-68": [1, 2],
    "STA-69": [8, 9, 10, 13, 14],
    "EXP-70": [1, 2, 3, 4, 5, 6, 7, 8, 9],
  },
  9: {
    "NAA-71": [1, 2, 3, 6, 7, 8],
    "NAA-72": [11, 12, 13, 15, 16, 17, 18, 20, 21],
    "NAA-73": [23, 24, 25],
    "GEO-73": [2, 3, 4, 5, 7],
    "GEO-74": [9, 11, 12, 13, 14, 15, 17, 18],
    "GEO-75": [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
    "STA-76": [1, 2, 8],
    "GEO-76": [1, 2, 3, 4, 5, 6, 7],
    "STA-77": [12, 14, 15, 16, 17, 18, 19, 21],
    "EXP-78": [1, 2, 3, 4, 5, 6, 7, 8, 9],
  },
} as const;

function expandIds(grade: 7 | 8 | 9) {
  return Object.entries(targetDefinition[grade]).flatMap(([key, numbers]) => {
    const [strand, page] = key.split("-");
    return numbers.map(
      (number: number) =>
        `MOET2018-G${grade}-${strand}-P${page.padStart(3, "0")}-${String(number).padStart(3, "0")}`,
    );
  });
}

const records = (inventoryJson.outcomes as readonly SourceRecord[]);
const recordById = new Map(records.map((record) => [record.id, record]));
const mappedIds = new Map<string, string[]>();
for (const record of records) {
  if (record.implementationEvidence) continue;
  for (const slug of record.mappedUnitIds) {
    const ids = mappedIds.get(slug) ?? [];
    ids.push(record.id);
    mappedIds.set(slug, ids);
  }
}
export const officialOutcomeIdsByMappedUnitSlug: ReadonlyMap<
  string,
  readonly string[]
> = mappedIds;

function sourceRecords(grade: 7 | 8 | 9) {
  return expandIds(grade).map((id) => {
    const record = recordById.get(id);
    if (!record) throw new Error(`Missing frozen official outcome record: ${id}.`);
    return record;
  });
}

function semanticKind(record: SourceRecord): SemanticKind {
  const text = `${record.subdomain} ${record.conciseParaphrase}`.toLocaleLowerCase("vi");
  if (/phần mềm|video/u.test(text)) return "SOFTWARE";
  if (/ngân hàng|thuế|đầu tư|lãi suất|bảo hiểm|tăng trưởng|thu nhập|chi tiêu/u.test(text)) return "FINANCE";
  if (/xác suất|ngẫu nhiên|không gian mẫu/u.test(text)) return "PROBABILITY";
  if (/thống kê|dữ liệu|biểu đồ|tần số|điều tra|quảng cáo/u.test(text)) return "DATA";
  if (/đường tròn|tiếp tuyến|dây|cung|góc ở tâm|góc nội tiếp|nội tiếp|ngoại tiếp|lượng giác|sin|côsin|tangent|cotangent/u.test(text)) return "CIRCLE_TRIG";
  if (/phép quay|đa giác đều|tính đều|đối xứng/u.test(text)) return "TRANSFORMATION";
  if (/tứ giác|hình bình hành|hình thoi|hình thang|hình chữ nhật|hình vuông|thalès|đồng dạng|pythagore|hình vị tự/u.test(text)) return "QUADRILATERAL_SIMILARITY";
  if (/tam giác|góc|song song|vuông góc|tia phân giác|trung trực|trung tuyến|đường cao|định lí|chứng minh|lập luận/u.test(text)) return "ANGLE_TRIANGLE_PROOF";
  if (/hình hộp|lập phương|lăng trụ|hình chóp|hình nón|hình trụ|hình cầu|thể tích|diện tích xung quanh/u.test(text)) return "SOLID_MEASURE";
  if (/bất phương trình|bất đẳng thức/u.test(text)) return "INEQUALITY";
  if (/phương trình|hệ hai|nghiệm của hệ|viète/u.test(text)) return "EQUATION_SYSTEM";
  if (/hàm số|đồ thị|hệ số góc|toạ độ/u.test(text)) return "FUNCTION_GRAPH";
  if (/tỉ lệ|phần trăm|tỉ số/u.test(text)) return "PROPORTION";
  if (/luỹ thừa|căn bậc|căn thức/u.test(text)) return "POWER_ROOT";
  if (/thứ tự|so sánh|số đối|giá trị tuyệt đối|số thực|số vô tỉ|thập phân hữu hạn/u.test(text)) return "NUMBER_ORDER";
  if (/biểu thức|đa thức|đơn thức|phân thức|hằng đẳng thức|đồng nhất thức/u.test(text)) return "ALGEBRA";
  if (/thực tiễn|thực hành|ứng dụng|vận dụng|mô hình|hoá học|sinh học|đo khoảng cách/u.test(text)) return "MODELLING";
  return record.officialStrand.startsWith("HOẠT ĐỘNG")
    ? "MODELLING"
    : record.officialStrand.startsWith("HÌNH HỌC")
      ? "ANGLE_TRIANGLE_PROOF"
      : "ALGEBRA";
}

type TeachingStrategy = Readonly<{
  concept: string;
  why: string;
  method: string;
  error: string;
  examplePrompt: string;
  exampleSteps: readonly [string, string, string];
  exampleAnswer: string;
  visual: VisualRequirement;
}>;

const teaching: Readonly<Record<SemanticKind, TeachingStrategy>> = {
  POWER_ROOT: {concept:"Luỹ thừa và căn được xác định trên miền phù hợp; căn bậc hai số học luôn không âm và các phép biến đổi phải giữ điều kiện.","why":"Định nghĩa và miền xác định bảo đảm phép biến đổi không tạo giá trị không có nghĩa.","method":"Nêu điều kiện, dùng đúng quy tắc lũy thừa hoặc căn, rút gọn rồi kiểm tra bằng bình phương/lập phương.","error":"Không viết √(a²)=a khi a có thể âm; không phân phối căn qua tổng.",examplePrompt:"Rút gọn √36 và kiểm tra.",exampleSteps:["36 không âm.","√36=6 vì 6²=36.","Chọn căn số học không âm."],exampleAnswer:"6",visual:"NUMBER_LINE"},
  NUMBER_ORDER: {concept:"Thứ tự số được xác định bởi vị trí trên trục số; giá trị tuyệt đối là khoảng cách không âm tới 0.","why":"Mô hình trục số thống nhất so sánh số hữu tỉ, số thực và số đối.","method":"Chuẩn hoá biểu diễn, xác định dấu/vị trí, so từ trái sang phải và kiểm tra khoảng cách.","error":"Không so chuỗi chữ số hoặc bỏ dấu âm; số đối khác nghịch đảo.",examplePrompt:"So sánh −3/4 và −2/3.",exampleSteps:["Quy đồng mẫu 12.","−3/4=−9/12; −2/3=−8/12.","−9/12<−8/12."],exampleAnswer:"−3/4 < −2/3",visual:"NUMBER_LINE"},
  ALGEBRA: {concept:"Biểu thức đại số dùng số, biến và phép toán; mọi thu gọn, phân tích hay phép tính phải giữ giá trị và miền xác định.","why":"Các quy tắc phân phối, hằng đẳng thức và phép toán theo hạng đồng dạng bảo toàn biểu thức.","method":"Xác định biến, bậc và điều kiện; thu gọn theo hạng đồng dạng; thực hiện phép tính rồi thay lại kiểm tra.","error":"Không cộng hệ số của hạng khác dạng, chia cho biểu thức có thể bằng 0 hoặc bỏ ngoặc sai dấu.",examplePrompt:"Thu gọn 3x²−2x+x²+5x.",exampleSteps:["Nhóm các hạng x².","Nhóm các hạng x.","Được 4x²+3x."],exampleAnswer:"4x²+3x",visual:"BALANCE_MODEL"},
  PROPORTION: {concept:"Tỉ lệ thức a/b=c/d có mẫu khác 0 và tương đương ad=bc; dãy tỉ số dùng cùng một hệ số tỉ lệ.","why":"Nhân chéo và hệ số chung bảo toàn quan hệ giữa các đại lượng.","method":"Đưa đại lượng về cùng đơn vị, lập tỉ số, dùng tích chéo hoặc tổng phần rồi kiểm tra.","error":"Không đảo một tỉ số riêng lẻ, dùng mẫu 0 hoặc tính phần trăm trên sai toàn thể.",examplePrompt:"Chia 60 theo tỉ lệ 2:3.",exampleSteps:["Tổng phần là 5.","Mỗi phần là 60:5=12.","Hai phần là 24, ba phần là 36."],exampleAnswer:"24 và 36",visual:"RATIO_TABLE"},
  FUNCTION_GRAPH: {concept:"Hàm số gán mỗi giá trị đầu vào hợp lệ đúng một đầu ra; đồ thị gồm các điểm (x;f(x)) trên hệ trục có thang xác định.","why":"Công thức, bảng và đồ thị là các biểu diễn tương ứng của cùng quan hệ phụ thuộc.","method":"Xác định biến/miền, tính cặp tọa độ, đặt đúng trục và thang rồi diễn giải hệ số hoặc xu hướng.","error":"Không đổi thứ tự tọa độ, bỏ thang trục hoặc dùng đầu vào ngoài miền.",examplePrompt:"Với y=2x+1, tìm y khi x=3.",exampleSteps:["Thay x=3.","y=2×3+1.","y=7, điểm là (3;7)."],exampleAnswer:"7",visual:"COORDINATE_PLANE"},
  EQUATION_SYSTEM: {concept:"Nghiệm làm phương trình hoặc mọi phương trình trong hệ đúng; nghiệm ngoại lai và giá trị loại phải bị bác bỏ.","why":"Biến đổi tương đương giữ tập nghiệm khi tôn trọng miền xác định.","method":"Nêu điều kiện, biến đổi/khử hoặc dùng công thức, tìm ứng viên rồi thay lại từng phương trình.","error":"Không nhân chia bởi biểu thức có thể bằng 0, giữ nghiệm làm mẫu 0 hoặc quên kiểm tra nghiệm.",examplePrompt:"Giải (x−2)(x+3)=0.",exampleSteps:["Tích bằng 0 khi một thừa số bằng 0.","x−2=0 hoặc x+3=0.","x=2 hoặc x=−3."],exampleAnswer:"x=2 hoặc x=−3",visual:"BALANCE_MODEL"},
  INEQUALITY: {concept:"Bất đẳng thức mô tả thứ tự; cộng cùng số giữ chiều, nhân/chia với số âm phải đổi chiều.","why":"Nhân số âm phản xạ vị trí các số qua 0 nên thứ tự đảo.","method":"Thu gọn hai vế, cô lập ẩn, đổi chiều đúng lúc và biểu diễn tập nghiệm trên trục số.","error":"Không quên đổi chiều khi nhân/chia số âm hoặc coi một giá trị biên sai là nghiệm.",examplePrompt:"Giải −2x<6.",exampleSteps:["Chia hai vế cho −2.","Đổi chiều bất đẳng thức.","x>−3."],exampleAnswer:"x>−3",visual:"NUMBER_LINE"},
  SOLID_MEASURE: {concept:"Khối hình có các yếu tố và công thức riêng; thể tích dùng đơn vị khối, diện tích dùng đơn vị vuông.","why":"Công thức bắt nguồn từ diện tích đáy, chiều cao và cấu tạo mặt của khối.","method":"Nhận dạng khối, xác định kích thước dương cùng đơn vị, chọn công thức và kiểm tra bậc đơn vị.","error":"Không nhầm diện tích với thể tích, bán kính với đường kính hoặc dùng kích thước âm.",examplePrompt:"Hộp 3×4×5 dm có thể tích bao nhiêu?",exampleSteps:["Ba kích thước dương cùng đơn vị.","V=3×4×5.","V=60 dm³."],exampleAnswer:"60 dm³",visual:"SOLID_NET"},
  ANGLE_TRIANGLE_PROOF: {concept:"Lập luận hình học đi từ giả thiết qua định nghĩa, tiên đề hoặc định lí đến kết luận; hình vẽ chỉ minh hoạ.","why":"Mỗi bước có căn cứ giúp kết luận đúng cho mọi hình thỏa giả thiết, không chỉ một bản vẽ.","method":"Ghi GT–KL, xác định quan hệ góc/cạnh, viện dẫn đúng định lí, suy luận tuần tự rồi kết luận.","error":"Không suy từ hình không theo tỉ lệ, dùng điều phải chứng minh hoặc bỏ điều kiện của định lí.",examplePrompt:"Hai góc đối đỉnh, một góc 65°. Tính góc kia.",exampleSteps:["Hai đường thẳng cắt nhau tạo góc đối đỉnh.","Hai góc đối đỉnh bằng nhau.","Góc kia bằng 65°."],exampleAnswer:"65°",visual:"ANGLE_DIAGRAM"},
  QUADRILATERAL_SIMILARITY: {concept:"Tính chất tứ giác và đồng dạng được xác lập bằng quan hệ cạnh, góc, đường chéo và tỉ số tương ứng.","why":"Các dấu hiệu đủ cho phép suy ra toàn bộ cấu trúc mà không dựa vào vẻ ngoài.","method":"Xác định cặp yếu tố tương ứng, kiểm tra giả thiết dấu hiệu/định lí, lập tỉ số rồi suy ra độ dài hoặc tính chất.","error":"Không ghép sai đỉnh tương ứng, dùng tỉ lệ đảo lẫn lộn hoặc kết luận từ hình vẽ.",examplePrompt:"Hai tam giác đồng dạng có tỉ số 2/3; cạnh nhỏ 8 cm. Cạnh tương ứng lớn?",exampleSteps:["Tỉ số nhỏ/lớn là 2/3.","8/x=2/3.","x=12 cm."],exampleAnswer:"12 cm",visual:"SHAPE_SCENE"},
  CIRCLE_TRIG: {concept:"Quan hệ đường tròn và tam giác vuông phụ thuộc bán kính, dây, cung, góc và các tỉ số cạnh được xác định chính xác.","why":"Định lí góc–cung, tiếp tuyến và lượng giác liên kết hình học với phép tính.","method":"Xác định tâm/bán kính hoặc cạnh đối–kề–huyền, chọn định lí/công thức, tính rồi kiểm tra miền hình học.","error":"Không dùng độ dài âm, nhầm bán kính–đường kính, góc ở tâm–nội tiếp hoặc tỉ số lượng giác.",examplePrompt:"Tam giác vuông có cạnh đối góc α là 3, cạnh huyền 5. sin α?",exampleSteps:["Sin=góc đối/cạnh huyền.","sin α=3/5.","Giá trị nằm trong [0;1]."],exampleAnswer:"3/5",visual:"ANGLE_DIAGRAM"},
  TRANSFORMATION: {concept:"Phép quay giữ khoảng cách và góc; đa giác đều trùng chính nó ở các góc quay là bội của 360°/n.","why":"Mọi đỉnh được chuyển đồng thời quanh cùng tâm với cùng góc nên hình dạng được bảo toàn.","method":"Xác định tâm, hướng và góc quay; chuyển từng điểm rồi kiểm tra cạnh/góc tương ứng.","error":"Không dùng các tâm khác nhau, đổi độ dài hoặc nhầm phép quay với phản xạ.",examplePrompt:"Hình vuông quay quanh tâm góc nhỏ nhất bao nhiêu để trùng nó?",exampleSteps:["Hình vuông có 4 vị trí đỉnh đều.","Góc nhỏ nhất là 360°:4.","Kết quả 90°."],exampleAnswer:"90°",visual:"SHAPE_SCENE"},
  DATA: {concept:"Dữ liệu cần nguồn, đơn vị, tiêu chí phân loại; bảng và biểu đồ phải bảo toàn tần số, tổng và thang đo.","why":"Biểu diễn đúng giúp so sánh và kết luận trong đúng phạm vi mẫu.","method":"Kiểm tra nguồn/đơn vị, lập tần số, chọn biểu diễn, đọc thang và đối chiếu tổng trước kết luận.","error":"Không dùng thang lệch, cộng sai tổng, đổi tiêu chí hoặc suy rộng quá phạm vi dữ liệu.",examplePrompt:"Dữ liệu 2,2,3,4,4,4: tần số của 4?",exampleSteps:["Đếm số lần giá trị 4 xuất hiện.","Có ba lần.","Tổng các tần số phải bằng 6."],exampleAnswer:"3",visual:"DATA_DISPLAY"},
  PROBABILITY: {concept:"Không gian mẫu gồm mọi kết quả có thể; xác suất hoặc tần số tương đối là tỉ số thuận lợi trên tổng trường hợp/thử.","why":"Đếm đầy đủ và không trùng bảo đảm tỉ số nằm trong [0;1].","method":"Mô tả phép thử, liệt kê không gian mẫu, xác định biến cố, đếm và lập tỉ số rồi kiểm tra giới hạn.","error":"Không bỏ sót kết quả, dùng tổng bằng 0 hoặc kết luận chắc chắn từ mẫu nhỏ.",examplePrompt:"Tung đồng xu 20 lần được 11 lần ngửa. Tần số tương đối?",exampleSteps:["Số lần thuận lợi là 11.","Tổng số thử là 20.","Tỉ số 11/20=0,55."],exampleAnswer:"0,55",visual:"DATA_DISPLAY"},
  FINANCE: {concept:"Bài toán tài chính dùng dòng tiền, vốn, tỉ lệ và thời gian; số dư phải được diễn giải theo giao dịch thực.","why":"Tỉ lệ chỉ có ý nghĩa khi áp dụng đúng cơ sở tính và đúng kỳ.","method":"Xác định vốn/dòng tiền, đổi phần trăm, lập phép tính theo kỳ, tính và kiểm tra số dư/khả năng chi trả.","error":"Không cộng phần trăm trực tiếp vào tiền, tính trên sai vốn hoặc bỏ dấu thu–chi.",examplePrompt:"Vốn 2 000 000 đồng tăng 5% một kỳ. Tiền tăng?",exampleSteps:["5%=0,05.","2 000 000×0,05=100 000.","Số dư mới 2 100 000 đồng."],exampleAnswer:"100 000 đồng",visual:"RATIO_TABLE"},
  SOFTWARE: {concept:"Phần mềm hỗ trợ dựng, đo, biểu diễn hoặc mô phỏng nhưng kết quả chỉ đáng tin khi dữ liệu và ràng buộc được nhập đúng.","why":"Ràng buộc động và dữ liệu có cấu trúc giúp kiểm tra bất biến, tần số hoặc quan hệ khi thay đổi đầu vào.","method":"Chọn đúng công cụ, nhập dữ liệu/ràng buộc, chạy hoặc kéo thử, đối chiếu kết quả và lưu bằng chứng.","error":"Không coi hình nhìn đúng là dựng đúng, bỏ nhãn/trục hoặc dùng mô phỏng thay cho chứng minh.",examplePrompt:"Kiểm tra trung điểm M của AB trong phần mềm thế nào?",exampleSteps:["Dựng M thuộc AB.","Ràng buộc AM=MB.","Kéo A,B và kiểm tra hai điều kiện còn đúng."],exampleAnswer:"M thuộc AB và AM=MB",visual:"DATA_DISPLAY"},
  MODELLING: {concept:"Mô hình toán học chuyển tình huống thành biến, giả định, quan hệ và đơn vị để giải rồi diễn giải trở lại.","why":"Tách dữ kiện và giả định giúp biết kết luận áp dụng trong phạm vi nào.","method":"Xác định biến/đơn vị, nêu giả định, lập mô hình, giải, diễn giải và kiểm tra tính hợp lí.","error":"Không thiếu dữ kiện, trộn đơn vị, giữ nghiệm vô nghĩa hoặc kết luận ngoài phạm vi mô hình.",examplePrompt:"Đi 120 km với vận tốc 60 km/h. Thời gian?",exampleSteps:["Gọi t là thời gian theo giờ.","120=60t.","t=2 giờ, phù hợp dữ kiện."],exampleAnswer:"2 giờ",visual:"RATIO_TABLE"},
};

function shortTitle(record: SourceRecord) {
  const title = record.conciseParaphrase
    .replace(/^(Nhận biết|Mô tả|Giải thích|Giải quyết|Thực hiện|Vận dụng|Tính|Xác định|Lí giải|Chứng tỏ|Sử dụng|Thực hành|Làm quen|Tìm kiếm|Thu thập|So sánh)\s+(được\s+)?/u, "")
    .replace(/[.。]$/u, "");
  const readableTitle =
    title.length <= 82
      ? title
      : `${title.slice(0, 79).replace(/\s+\S*$/u, "").trimEnd()}…`;
  return (
    readableTitle.charAt(0).toLocaleUpperCase("vi") + readableTitle.slice(1)
  );
}

function specificExample(
  record: SourceRecord,
  fallback: TeachingStrategy,
): CompletionOutcomeSpec["example"] {
  const text = record.conciseParaphrase.toLocaleLowerCase("vi");
  const example = (
    prompt: string,
    first: string,
    second: string,
    third: string,
    answer: string,
  ): CompletionOutcomeSpec["example"] => ({
    prompt,
    steps: [first, second, third],
    answer,
  });
  if (/bậc của đa thức/u.test(text)) return example("Xác định bậc của 4x³−2x+1.","Đa thức đã thu gọn.","Số mũ lớn nhất có hệ số khác 0 là 3.","Vậy đa thức có bậc 3.","3");
  if (/nghiệm của đa thức/u.test(text)) return example("Kiểm tra x=2 có là nghiệm của P(x)=x−2.","Thay x=2.","P(2)=2−2=0.","Giá trị làm P bằng 0 là nghiệm.","có");
  if (/biểu thức số/u.test(text)) return example("Phân biệt 3²−5 và 3x−5.","Biểu thức số chỉ chứa số.","3²−5 không có biến.","3x−5 chứa biến nên là biểu thức đại số.","3²−5");
  if (/biểu thức đại số|đơn thức|đa thức nhiều biến/u.test(text)) return example("Nhận dạng 2xy+3 là biểu thức đại số.","x và y là các biến.","2xy và 3 là các hạng tử.","Biểu thức có hai biến x,y.","2xy+3");
  if (/đồng nhất thức|hằng đẳng thức/u.test(text)) return example("Kiểm tra (x+1)²=x²+2x+1.","Khai triển vế trái.","Hai vế có cùng hệ số ở mọi hạng.","Đẳng thức đúng với mọi x.","(x+1)²=x²+2x+1");
  if (/phân thức/u.test(text)) return example("Tìm điều kiện của (x+1)/(x−2).","Mẫu phải khác 0.","x−2≠0.","Suy ra x≠2.","x≠2");
  if (/hệ số góc/u.test(text)) return example("Tìm hệ số góc của y=3x−2.","Công thức có dạng y=ax+b.","Hệ số của x là a=3.","Vậy hệ số góc bằng 3.","3");
  if (/toạ độ/u.test(text)) return example("Tìm điểm trên y=2x+1 khi x=3.","Thay x=3.","y=2×3+1=7.","Viết hoành độ trước, tung độ sau.","(3;7)");
  if (/hệ hai phương trình|nghiệm của hệ/u.test(text)) return example("Giải hệ x+y=7, x−y=1.","Cộng hai phương trình được 2x=8.","Suy ra x=4 rồi y=3.","Thay (4;3) vào cả hai phương trình.","x=4, y=3");
  if (/phương trình bậc hai|viète|phương trình tích/u.test(text)) return example("Giải (x−2)(x−5)=0.","Một tích bằng 0 khi có thừa số bằng 0.","x−2=0 hoặc x−5=0.","Kiểm tra được hai nghiệm 2 và 5.","x=2 hoặc x=5");
  if (/ẩn ở mẫu/u.test(text)) return example("Giải phương trình có mẫu x−3.","Đặt điều kiện x≠3.","Biến đổi phương trình trên miền hợp lệ.","Loại mọi ứng viên làm mẫu bằng 0.","x≠3");
  if (/hình nón/u.test(text) && /thể tích/u.test(text)) return example("Tính thể tích nón r=3 cm, h=6 cm.","Dùng V=(1/3)πr²h.","V=(1/3)π×9×6.","Kết quả có đơn vị khối.","18π cm³");
  if (/hình trụ/u.test(text) && /thể tích/u.test(text)) return example("Tính thể tích trụ r=3 cm, h=5 cm.","Dùng V=πr²h.","V=π×9×5.","Kết quả có đơn vị khối.","45π cm³");
  if (/hình cầu/u.test(text) && /thể tích/u.test(text)) return example("Tính thể tích cầu r=3 cm.","Dùng V=(4/3)πr³.","V=(4/3)π×27.","Kết quả có đơn vị khối.","36π cm³");
  if (/tia phân giác/u.test(text)) return example("Oz là phân giác của góc xOy=80°. Tính góc xOz.","Tia phân giác tạo hai góc bằng nhau.","80°:2=40°.","Hai góc 40° có tổng 80°.","40°");
  if (/độ dài của ba cạnh/u.test(text)) return example("Kiểm tra 3 cm, 4 cm, 6 cm có lập tam giác.","Cả ba độ dài đều dương.","6<3+4 và các bất đẳng thức còn lại đúng.","Ba cạnh lập được một tam giác.","có");
  if (/định lí và chứng minh/u.test(text)) return example("Chứng minh hai góc đối đỉnh bằng nhau.","Mỗi góc cùng với một góc kề tạo thành 180°.","Hai góc đối đỉnh cùng bằng 180° trừ số đo góc kề đó.","Vì cùng bằng một đại lượng nên hai góc đối đỉnh bằng nhau.","hai góc đối đỉnh bằng nhau");
  if (/song song|so le trong|đồng vị/u.test(text)) return example("Hai đường song song có một góc so le trong 65°. Tính góc kia.","Xác định cặp góc so le trong.","Hai góc bằng nhau do hai đường song song.","Góc kia bằng 65°.","65°");
  if (/pythagore/u.test(text)) return example("Tam giác vuông có hai cạnh góc vuông 3 cm, 4 cm.","Dùng c²=3²+4².","c²=25.","Vì c>0 nên c=5 cm.","5 cm");
  if (/tổng các góc trong một tứ giác/u.test(text)) return example("Ba góc tứ giác là 80°, 90°, 100°.","Tổng bốn góc là 360°.","Ba góc đã biết có tổng 270°.","Góc còn lại là 90°.","90°");
  if (/thalès|đồng dạng|hình vị tự/u.test(text)) return example("Hai cạnh tương ứng tỉ lệ 2:3; cạnh nhỏ 8 cm.","Lập 8/x=2/3.","Nhân chéo được 2x=24.","Suy ra x=12 cm.","12 cm");
  if (/tỉ số lượng giác|sin|côsin|tangent|cotangent/u.test(text)) return example("Tam giác vuông 3–4–5, tính sin của góc đối cạnh 3.","Sin bằng cạnh đối chia cạnh huyền.","sin α=3/5.","Giá trị thuộc [0;1].","3/5");
  if (/tiếp tuyến/u.test(text)) return example("Xét bán kính OT tại tiếp điểm T.","T là tiếp điểm của tiếp tuyến.","Bán kính qua tiếp điểm vuông góc tiếp tuyến.","Góc tạo bởi OT và tiếp tuyến bằng 90°.","90°");
  if (/góc ở tâm|góc nội tiếp|số đo của cung/u.test(text)) return example("Góc nội tiếp chắn cung AB bằng 35°.","Góc ở tâm và nội tiếp chắn cùng cung.","Góc ở tâm gấp đôi góc nội tiếp.","Góc ở tâm bằng 70°.","70°");
  if (/độ dài cung|hình quạt|vành khuyên/u.test(text)) return example("Tính cung 60° của đường tròn bán kính 6 cm.","Dùng l=(60/360)×2πr.","Thay r=6 rồi rút gọn.","Độ dài cung bằng 2π cm.","2π cm");
  if (/tần số tương đối/u.test(text)) return example("A xuất hiện 15 lần trong 30 quan sát.","Lấy tần số chia tổng.","15/30=0,5.","Kết quả nằm trong [0;1].","0,5");
  if (/hợp lí|không chính xác|quảng cáo/u.test(text)) return example("Bảng ghi 12 nam, 15 nữ, tổng 30.","Cộng hai tần số được 27.","27 khác tổng công bố 30.","Dữ liệu có mâu thuẫn cần sửa.","tổng đúng phải là 27");
  if (/chuyển dữ liệu|dạng biểu diễn|lựa chọn và biểu diễn|thiết lập.*biểu đồ/u.test(text)) return example("Chọn biểu đồ để so sánh số lượng bốn nhóm.","Mục tiêu là so sánh các nhóm.","Dùng cùng thang trên các cột.","Đối chiếu tổng sau khi vẽ.","biểu đồ cột");
  if (/sao kê|giao dịch ngân hàng/u.test(text)) return example("Sao kê có tiền vào 500 000, tiền ra 120 000 đồng.","Quy ước tiền vào dương, tiền ra âm.","500 000−120 000=380 000.","Số dư tăng 380 000 đồng.","tăng 380 000 đồng");
  if (/thuế/u.test(text)) return example("Tính thuế 10% trên giá 800 000 đồng.","10%=0,1.","800 000×0,1=80 000.","Phân biệt tiền thuế với tổng thanh toán.","80 000 đồng");
  if (/hoá học|sinh học/u.test(text)) return example("Mô hình cân bằng 2H₂+O₂→2H₂O.","Đặt hệ số làm biến.","Bảo toàn riêng số nguyên tử H và O.","Kiểm tra hai vế cùng có 4 H và 2 O.","2, 1, 2");
  return {
    prompt: fallback.examplePrompt,
    steps: fallback.exampleSteps,
    answer: fallback.exampleAnswer,
  };
}

function toSpec(record: SourceRecord): CompletionOutcomeSpec {
  const pedagogy = teaching[semanticKind(record)];
  const directExample = specificExample(record, pedagogy);
  const contextualTitle = `${shortTitle(record)} — Lớp ${record.grade}`;
  return {
    id: record.id,
    title: contextualTitle,
    concept: `${record.conciseParaphrase} ${pedagogy.concept}`,
    why: pedagogy.why,
    method: pedagogy.method,
    error: pedagogy.error,
    example: {
      ...directExample,
      prompt: `${contextualTitle}: ${directExample.prompt}`,
    },
  };
}

function partition(items: readonly SourceRecord[]) {
  const sizes: number[] = [];
  let remainder = items.length;
  while (remainder % 4 !== 0) {
    sizes.push(3);
    remainder -= 3;
  }
  while (remainder > 0) {
    sizes.push(4);
    remainder -= 4;
  }
  const groups: SourceRecord[][] = [];
  let cursor = 0;
  for (const size of sizes) {
    groups.push(items.slice(cursor, cursor + size));
    cursor += size;
  }
  return groups;
}

function domain(record: SourceRecord): CurriculumDomain {
  if (record.officialStrand.startsWith("HÌNH HỌC")) return "GEOMETRY";
  if (record.officialStrand.startsWith("MỘT SỐ YẾU TỐ")) return "STATISTICS_AND_PROBABILITY";
  if (record.officialStrand.startsWith("HOẠT ĐỘNG")) return "APPLIED_PROBLEM_SOLVING";
  if (record.grade >= 8 && record.id.includes("-NAA-")) {
    return "ALGEBRA_AND_PREALGEBRA";
  }
  return semanticKind(record) === "FUNCTION_GRAPH" ||
    semanticKind(record) === "EQUATION_SYSTEM" ||
    semanticKind(record) === "INEQUALITY" ||
    semanticKind(record) === "ALGEBRA"
    ? "ALGEBRA_AND_PREALGEBRA"
    : "NUMBERS_AND_OPERATIONS";
}

function buildGrade(grade: 7 | 8 | 9) {
  const gradeRecords = sourceRecords(grade);
  const buckets = new Map<string, SourceRecord[]>();
  for (const record of gradeRecords) {
    let bucket = record.id.includes("-NAA-")
      ? "NAA"
      : record.id.includes("-GEO-")
        ? "GEO"
        : record.id.includes("-STA-")
          ? "STA"
          : "EXP";
    if (grade === 7 && (bucket === "STA" || bucket === "EXP")) bucket = "CONTEXT";
    const list = buckets.get(bucket) ?? [];
    list.push(record);
    buckets.set(bucket, list);
  }
  const groupedRecords = [...buckets.entries()].flatMap(([bucket, list]) =>
    partition(list).map((recordsInGroup) => ({ bucket, recordsInGroup })),
  );
  const prerequisiteByBucket: Readonly<Record<number, Readonly<Record<string, string>>>> = {
    7: {
      NAA: "grade-6-ratio-percent-decimal-p1",
      GEO: "grade-6-angle-line-relations-p1",
      CONTEXT: "grade-6-probability-data-collection-p1",
    },
    8: {
      NAA: "grade-7-rational-number-foundations-p1",
      GEO: "grade-7-triangle-reasoning",
      STA: "grade-7-data-and-probability",
      EXP: "grade-7-applied-problem-solving",
    },
    9: {
      NAA: "grade-8-linear-equations",
      GEO: "grade-8-pythagorean-reasoning",
      STA: "grade-8-data-and-probability",
      EXP: "grade-8-applied-problem-solving",
    },
  };
  const groups: CompletionUnitGroup[] = groupedRecords.map(
    ({ bucket, recordsInGroup }, index) => {
      const first = recordsInGroup[0];
      const last = recordsInGroup.at(-1) ?? first;
      const firstKind = semanticKind(first);
      return {
        slug: `grade-${grade}-secondary-${bucket.toLocaleLowerCase("en")}-p1-${index + 1}`,
        title:
          first === last
            ? shortTitle(first)
            : `${shortTitle(first)} – ${shortTitle(last)}`,
        code: `G${grade}-P1-${bucket}-${String(index + 1).padStart(2, "0")}`,
        domain: domain(first),
        visual: teaching[firstKind].visual,
        prerequisiteSlugs: [prerequisiteByBucket[grade][bucket]],
        outcomeIds: recordsInGroup.map((record) => record.id),
      };
    },
  );
  const kind = `GRADE${grade}_OUTCOME_COMPLETION` as VerticalUnitKind;
  const artifacts = buildCompletionArtifacts({
    grade,
    kind,
    specs: gradeRecords.map(toSpec),
    groups,
    restrictions: [
      "Mọi mẫu số và số chia phải khác 0; miền xác định được kiểm tra trước biến đổi.",
      "Chứng minh phải nêu giả thiết, căn cứ và kết luận; hình vẽ không thay thế lập luận.",
      "Mô hình, dữ liệu, xác suất và đại lượng hình học phải có đơn vị, phạm vi và kiểm tra tính hợp lí.",
    ],
  });
  return { ...artifacts, targetOutcomeIds: gradeRecords.map((record) => record.id) };
}

const grade7 = buildGrade(7);
const grade8 = buildGrade(8);
const grade9 = buildGrade(9);

export const grade7RemainingOutcomes = grade7.outcomes;
export const grade7RemainingUnitSeeds = grade7.unitSeeds;
export const grade7RemainingTargetOutcomeIds = grade7.targetOutcomeIds;
export const grade8CompletionOutcomes = grade8.outcomes;
export const grade8CompletionUnitSeeds = grade8.unitSeeds;
export const grade8CompletionTargetOutcomeIds = grade8.targetOutcomeIds;
export const grade9CompletionOutcomes = grade9.outcomes;
export const grade9CompletionUnitSeeds = grade9.unitSeeds;
export const grade9CompletionTargetOutcomeIds = grade9.targetOutcomeIds;

const p = (name: string, value: string | number) => ({ name, value });
const conceptCore = (
  prefix: string,
  prompt: string,
  answer: string,
  distractors: readonly [string, string, string],
  steps: readonly [string, string, string],
  feedback: string,
  rule: string,
  visualRequirement: VisualRequirement,
) =>
  textCore(
    `${prefix} ${prompt}`,
    answer,
    distractors,
    steps,
    feedback,
    [p("semanticRule", rule)],
    visualRequirement,
  );
const textCore = (
  prompt: string,
  answer: string,
  distractors: readonly [string, string, string],
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

function scenarioFor(
  outcomeId: string,
  occurrence: number,
  random: CompletionRandom,
): CompletionQuestionCore {
  const record = recordById.get(outcomeId);
  if (!record) throw new Error(`Missing secondary outcome strategy: ${outcomeId}.`);
  const kind = semanticKind(record);
  const text = record.conciseParaphrase.toLocaleLowerCase("vi");
  const a = random.integer(2, 8);
  const b = random.integer(2, 8);
  const c = random.integer(1, 5);
  const prefix = `${shortTitle(record)}:`;
  switch (kind) {
    case "POWER_ROOT": {
      if (/căn/u.test(record.conciseParaphrase.toLocaleLowerCase("vi"))) {
        const root = a + occurrence;
        return textCore(`${prefix} Tính √${root * root}.`,String(root),[String(root*root),String(-root),String(root+1)],["Số dưới căn không âm.",`${root}²=${root*root}.`,"Căn số học là giá trị không âm."],"Không chọn căn âm và phải kiểm tra miền xác định.",[p("radicand",root*root),p("root",root)],"NUMBER_LINE");
      }
      const exponent = occurrence + 2;
      return textCore(`${prefix} Tính ${a}^${exponent}.`,String(a**exponent),[String(a*exponent),String(a**exponent+a),String(exponent**a)],["Xác định cơ số và số mũ.","Nhân cơ số lặp đúng số lần.","Kiểm tra quy tắc lũy thừa."],"Không hiểu lũy thừa là phép nhân cơ số với số mũ.",[p("base",a),p("exponent",exponent)],"NUMBER_LINE");
    }
    case "NUMBER_ORDER": {
      const left = -a / b;
      const right = left + 1 / (b * 10);
      return textCore(`${prefix} So sánh ${left.toFixed(2)} và ${right.toFixed(2)}.`,`<`,[">","=","không xác định"],["Đưa về cùng độ chính xác.","Xét vị trí trên trục số.","Số bên trái nhỏ hơn."],"Không bỏ dấu âm hoặc so độ dài chuỗi.",[p("left",left),p("right",right)],"NUMBER_LINE");
    }
    case "ALGEBRA": {
      if (/bậc của đa thức/u.test(text)) {
        const degree = 2 + (a % 3);
        return textCore(
          `${prefix} Đa thức ${a}x^${degree}+${b}x−1 có bậc bao nhiêu?`,
          String(degree),
          [String(degree + 1), String(a), String(b)],
          ["Thu gọn đa thức nếu cần.", "Tìm số mũ lớn nhất có hệ số khác 0.", `Số mũ lớn nhất là ${degree}.`],
          "Không lấy hệ số hoặc số hạng làm bậc của đa thức.",
          [p("degree", degree)],
          "BALANCE_MODEL",
        );
      }
      if (/nghiệm của đa thức/u.test(text)) {
        const root = occurrence + 1;
        return textCore(
          `${prefix} x=${root} có là nghiệm của P(x)=x−${root} không?`,
          "có",
          ["không", "chỉ khi x=0", "không xác định"],
          [`Thay x=${root} vào P(x).`, `${root}−${root}=0.`, "Giá trị bằng 0 nên đó là nghiệm."],
          "Nghiệm của đa thức là giá trị làm đa thức bằng 0.",
          [p("semanticRule", "POLYNOMIAL_ROOT")],
          "BALANCE_MODEL",
        );
      }
      if (/biểu thức số/u.test(text)) {
        return conceptCore(prefix, "Biểu thức nào là biểu thức số?", "3²−5", ["3x−5", "x+y", "a/b"], ["Biểu thức số chỉ chứa số và phép toán.", "Loại các lựa chọn có biến.", "3²−5 thỏa định nghĩa."], "Không gọi biểu thức chứa biến là biểu thức số.", "NUMERICAL_EXPRESSION", "BALANCE_MODEL");
      }
      if (/biểu thức đại số/u.test(text)) {
        return conceptCore(prefix, "Biểu thức nào là biểu thức đại số?", "3x−5", ["3²−5", "12:4", "7+8"], ["Biểu thức đại số có thể chứa biến.", "Xác định x là biến.", "3x−5 là biểu thức đại số."], "Không nhầm biểu thức chỉ có số với biểu thức chứa biến.", "ALGEBRAIC_EXPRESSION", "BALANCE_MODEL");
      }
      if (/đồng nhất thức|hằng đẳng thức/u.test(text)) {
        return conceptCore(prefix, "Đẳng thức nào đúng với mọi x?", "(x+1)²=x²+2x+1", ["(x+1)²=x²+1", "x²−1=(x−1)²", "2(x+1)=2x+1"], ["Khai triển từng vế.", "So sánh các hệ số tương ứng.", "Đẳng thức đúng với mọi x là đồng nhất thức."], "Phải kiểm tra với mọi giá trị, không chỉ một giá trị thử.", "IDENTITY", "BALANCE_MODEL");
      }
      if (/phân thức/u.test(text)) {
        const excluded = occurrence + 1;
        return textCore(
          `${prefix} Phân thức (x+1)/(x−${excluded}) xác định khi nào?`,
          `x≠${excluded}`,
          [`x=${excluded}`, `x>${excluded}`, "mọi số thực"],
          ["Mẫu phải khác 0.", `x−${excluded}≠0.`, `Suy ra x≠${excluded}.`],
          "Không thực hiện phép biến đổi trước khi loại giá trị làm mẫu bằng 0.",
          [p("excluded", excluded)],
          "BALANCE_MODEL",
        );
      }
      const x = occurrence + 2;
      const value = a*x+b;
      return textCore(`${prefix} Với x=${x}, tính ${a}x+${b}.`,String(value),[String(a+b+x),String(a*x-b),String(value+1)],["Thay đúng giá trị x.","Nhân trước cộng.","Kiểm tra lại biểu thức."],"Không ghép hệ số với biến hoặc bỏ thứ tự phép tính.",[p("a",a),p("x",x),p("b",b),p("value",value)],"BALANCE_MODEL");
    }
    case "PROPORTION": {
      const total=(a+b)*c;
      return textCore(`${prefix} Chia ${total} theo tỉ lệ ${a}:${b}.`,`${a*c} và ${b*c}`,[`${a+b} và ${total-a-b}`,`${a*c+1} và ${b*c-1}`,`${b*c} và ${a*c}`],["Tổng số phần là a+b.",`Một phần bằng ${c}.`,"Nhân số phần tương ứng."],"Không dùng sai toàn thể hoặc đảo thứ tự tỉ lệ.",[p("a",a),p("b",b),p("part",c),p("total",total)],"RATIO_TABLE");
    }
    case "FUNCTION_GRAPH": {
      if (/hệ số góc/u.test(text)) {
        return textCore(
          `${prefix} Đường thẳng y=${a}x+${b} có hệ số góc bằng bao nhiêu?`,
          String(a),
          [String(b), String(-a), String(a + b)],
          ["Đưa công thức về dạng y=ax+b.", "Hệ số đứng trước x là hệ số góc.", `Hệ số góc bằng ${a}.`],
          "Không lấy tung độ gốc b làm hệ số góc.",
          [p("slope", a), p("intercept", b)],
          "COORDINATE_PLANE",
        );
      }
      if (/toạ độ/u.test(text)) {
        const x = occurrence + 1;
        const y = a * x + b;
        return textCore(
          `${prefix} Điểm trên y=${a}x+${b} có hoành độ ${x}; tọa độ điểm là gì?`,
          `(${x};${y})`,
          [`(${y};${x})`, `(${x};${a + b})`, `(${y};0)`],
          ["Tính tung độ từ công thức.", `${y}=${a}×${x}+${b}.`, "Viết hoành độ trước, tung độ sau."],
          "Không đảo thứ tự hoành độ và tung độ.",
          [p("coordinateX", x), p("coordinateY", y)],
          "COORDINATE_PLANE",
        );
      }
      if (/nhận biết được đồ thị|khái niệm hàm số|mô hình thực tế/u.test(text)) {
        return conceptCore(prefix, "Quan hệ nào mô tả một hàm số?", "mỗi đầu vào có đúng một đầu ra", ["một đầu vào có hai đầu ra", "không cần xác định đầu vào", "mọi điểm đều cùng tung độ"], ["Xác định tập đầu vào.", "Kiểm tra số đầu ra của từng đầu vào.", "Mỗi đầu vào đúng một đầu ra."], "Một đầu vào không được gắn với hai đầu ra khác nhau.", "FUNCTION_DEFINITION", "COORDINATE_PLANE");
      }
      const x=occurrence+1, y=a*x+b;
      return textCore(`${prefix} Với y=${a}x+${b}, tìm y khi x=${x}.`,String(y),[String(a+b+x),String(a*x-b),String(y+1)],["Xác định đầu vào x.","Thay vào công thức.","Tính và ghép điểm (x;y)."],"Không đổi thứ tự tọa độ hoặc đọc sai thang.",[p("a",a),p("b",b),p("x",x),p("y",y)],"COORDINATE_PLANE");
    }
    case "EQUATION_SYSTEM": {
      if (/hệ hai phương trình|nghiệm của hệ/u.test(text)) {
        const x = occurrence + 1;
        const y = a;
        return textCore(
          `${prefix} Giải hệ x+y=${x + y}, x−y=${x - y}.`,
          `x=${x}, y=${y}`,
          [`x=${y}, y=${x}`, `x=${x + y}, y=0`, "vô nghiệm"],
          ["Cộng hai phương trình để khử y.", `2x=${2 * x}, nên x=${x}.`, `Thay lại được y=${y}; kiểm tra cả hai phương trình.`],
          "Một cặp chỉ là nghiệm khi thỏa đồng thời cả hai phương trình.",
          [p("systemX", x), p("systemY", y)],
          "BALANCE_MODEL",
        );
      }
      if (/phương trình bậc hai|viète/u.test(text)) {
        const root1 = occurrence + 1;
        const root2 = root1 + 2;
        return textCore(
          `${prefix} Giải (x−${root1})(x−${root2})=0.`,
          `x=${root1} hoặc x=${root2}`,
          [`x=${-root1} hoặc x=${-root2}`, `x=${root1 + root2}`, "vô nghiệm"],
          ["Tích bằng 0 khi một thừa số bằng 0.", `x−${root1}=0 hoặc x−${root2}=0.`, "Thay từng nghiệm vào phương trình để kiểm tra."],
          "Không đổi sai dấu của nghiệm hoặc chỉ giữ một nghiệm.",
          [p("quadraticRoot1", root1), p("quadraticRoot2", root2)],
          "BALANCE_MODEL",
        );
      }
      if (/ẩn ở mẫu/u.test(text)) {
        const excluded = occurrence + 1;
        return conceptCore(prefix, `Với phương trình có mẫu x−${excluded}, điều kiện bắt buộc là gì?`, `x≠${excluded}`, [`x=${excluded}`, `x>${excluded}`, "không cần điều kiện"], ["Đặt mẫu khác 0.", `x−${excluded}≠0.`, `Loại x=${excluded} dù xuất hiện sau biến đổi.`], "Nghiệm làm mẫu bằng 0 phải bị loại.", `DENOMINATOR_${excluded}`, "BALANCE_MODEL");
      }
      const root=occurrence+2, constant=a*root+b;
      return textCore(`${prefix} Giải ${a}x+${b}=${constant}.`,String(root),[String(-root),String(root+1),String(constant-b)],["Trừ b ở hai vế.","Chia cho hệ số a khác 0.","Thay nghiệm để kiểm tra."],"Không chia cho 0 hoặc giữ nghiệm không thỏa phương trình ban đầu.",[p("a",a),p("b",b),p("constant",constant),p("root",root)],"BALANCE_MODEL");
    }
    case "INEQUALITY": {
      const boundary=occurrence+2;
      return textCore(`${prefix} Giải −${a}x<−${a*boundary}.`,`x>${boundary}`,[`x<${boundary}`,`x≥${boundary}`,`x≤${boundary}`],["Chia hai vế cho số âm.","Đổi chiều bất đẳng thức.","Kiểm tra một giá trị trong tập nghiệm."],"Phải đổi chiều khi chia cho số âm.",[p("coefficient",-a),p("constant",-a*boundary),p("boundary",boundary)],"NUMBER_LINE");
    }
    case "SOLID_MEASURE": {
      if (/mô tả|yếu tố cơ bản|tạo lập/u.test(text)) {
        if (/hình nón/u.test(text)) {
          return conceptCore(prefix, `Một hình nón có bán kính đáy ${a} cm. Bộ yếu tố nào mô tả đúng hình nón?`, "đỉnh, đường sinh, chiều cao, bán kính đáy", ["hai đáy song song", "chỉ có cạnh và đường chéo", "không có mặt cong"], ["Xác định đỉnh của nón.", "Nhận diện đáy tròn và bán kính.", "Phân biệt đường sinh với chiều cao."], "Không dùng các yếu tố của hình trụ hoặc đa diện để mô tả hình nón.", "CONE_ELEMENTS", "SOLID_NET");
        }
        if (/hình trụ/u.test(text)) {
          return conceptCore(prefix, `Một hình trụ cao ${a} cm. Bộ yếu tố nào mô tả đúng hình trụ?`, "hai đáy tròn, bán kính, chiều cao, đường sinh", ["một đỉnh và một đáy", "sáu mặt vuông", "không có mặt cong"], ["Nhận diện hai đáy tròn bằng nhau.", "Khoảng cách hai đáy là chiều cao.", "Đường sinh nằm trên mặt xung quanh."], "Không nhầm hình trụ với hình nón.", "CYLINDER_ELEMENTS", "SOLID_NET");
        }
        if (/hình cầu|mặt cầu/u.test(text)) {
          return conceptCore(prefix, `Một mặt cầu có bán kính ${a} cm. Yếu tố xác định mặt cầu là gì?`, "tâm và bán kính", ["đỉnh và cạnh", "hai đáy", "đường sinh và chiều cao"], ["Xác định điểm tâm.", "Mọi điểm trên mặt cầu cách tâm bằng nhau.", "Khoảng cách chung là bán kính."], "Không nhầm mặt cầu với phần khối bên trong.", "SPHERE_ELEMENTS", "SOLID_NET");
        }
        return conceptCore(prefix, `Hộp có chiều dài ${a} cm. Hình hộp chữ nhật có bao nhiêu đỉnh, cạnh và mặt?`, "8 đỉnh, 12 cạnh, 6 mặt", ["6 đỉnh, 8 cạnh, 12 mặt", "8 đỉnh, 6 cạnh, 12 mặt", "12 đỉnh, 8 cạnh, 6 mặt"], ["Đếm 4 đỉnh ở mỗi đáy.", "Có 4 cạnh mỗi đáy và 4 cạnh bên.", "Có 2 mặt đáy và 4 mặt bên."], "Không hoán đổi số đỉnh, cạnh và mặt.", "CUBOID_ELEMENTS", "SOLID_NET");
      }
      if (/hình nón/u.test(text)) {
        const radius = a;
        const height = 3 * b;
        const volumeFactor = radius * radius * b;
        return textCore(`${prefix} Hình nón bán kính ${radius} cm, chiều cao ${height} cm có thể tích bằng bao nhiêu lần π?`,`${volumeFactor}π cm³`,[`${3 * volumeFactor}π cm³`,`${radius * height}π cm²`,`${volumeFactor}π cm²`],["Dùng V=(1/3)πr²h.","Thay h là bội của 3 rồi rút gọn.","Kiểm tra đơn vị cm³."],"Không bỏ hệ số 1/3 hoặc ghi đơn vị diện tích.",[p("coneVolumeFactor",volumeFactor)],"SOLID_NET");
      }
      if (/hình trụ/u.test(text)) {
        const radius = a, height = b, volumeFactor = radius * radius * height;
        return textCore(`${prefix} Hình trụ bán kính ${radius} cm, cao ${height} cm có thể tích bằng bao nhiêu lần π?`,`${volumeFactor}π cm³`,[`${2 * radius * height}π cm²`,`${radius * height}π cm³`,`${volumeFactor}π cm²`],["Dùng V=πr²h.","Bình phương bán kính rồi nhân chiều cao.","Kiểm tra đơn vị cm³."],"Không dùng công thức diện tích xung quanh thay thể tích.",[p("cylinderVolumeFactor",volumeFactor)],"SOLID_NET");
      }
      if (/hình cầu/u.test(text)) {
        const radius = 3;
        const volumeFactor = 36;
        return textCore(`${prefix} Hình cầu bán kính ${radius} cm có thể tích bằng bao nhiêu lần π?`,`${volumeFactor}π cm³`,["12π cm³","27π cm³","36π cm²"],["Dùng V=(4/3)πr³.","V=(4/3)π×27.","Kết quả 36π cm³."],"Không dùng công thức diện tích mặt cầu hoặc bỏ lũy thừa ba.",[p("sphereVolumeFactor",volumeFactor)],"SOLID_NET");
      }
      const volume=a*b*c;
      return textCore(`${prefix} Khối hộp ${a}×${b}×${c} dm có thể tích?`,`${volume} dm³`,[`${a*b} dm²`,`${volume} dm²`,`${2*(a+b)} dm`],["Kích thước dương cùng dm.","Nhân ba kích thước.","Ghi đơn vị dm³."],"Không nhầm diện tích với thể tích hoặc dùng đơn vị sai bậc.",[p("length",a),p("width",b),p("height",c),p("volume",volume)],"SOLID_NET");
    }
    case "ANGLE_TRIANGLE_PROOF": {
      if (/định lí và chứng minh/u.test(text)) {
        const angle = 40 + occurrence * 10;
        return textCore(
          `${prefix} Hai góc đối đỉnh, một góc ${angle}°. Hãy tính góc kia và nêu căn cứ chứng minh.`,
          `${angle}°`,
          [
            `${180 - angle}°`,
            "90°",
            `${angle + 10}°`,
          ],
          [
            "Mỗi góc cùng với một góc kề tạo thành 180°.",
            "Hai góc cùng bằng 180° trừ góc kề nên bằng nhau.",
            `Vì vậy góc đối đỉnh còn lại bằng ${angle}°.`,
          ],
          "Chứng minh phải nêu giả thiết, căn cứ và kết luận; hình vẽ chỉ minh hoạ.",
          [p("angle", angle)],
          "ANGLE_DIAGRAM",
        );
      }
      if (/tia phân giác/u.test(text)) {
        const whole = 2 * (30 + 5 * ((a + occurrence) % 6));
        return textCore(`${prefix} Tia Oz là phân giác của góc xOy=${whole}°. Góc xOz bằng bao nhiêu?`,`${whole / 2}°`,[`${whole}°`,`${180 - whole}°`,`${whole / 2 + 5}°`],["Tia phân giác chia góc thành hai góc bằng nhau.","Lấy số đo góc ban đầu chia 2.","Kiểm tra tổng hai góc con bằng góc ban đầu."],"Không cộng thêm hoặc dùng góc bù khi đề cho tia phân giác.",[p("bisectedAngle",whole),p("halfAngle",whole/2)],"ANGLE_DIAGRAM");
      }
      if (/độ dài của ba cạnh/u.test(text)) {
        const side1 = a, side2 = b, side3 = a + b - 1;
        return textCore(`${prefix} Ba độ dài ${side1}, ${side2}, ${side3} cm có lập thành tam giác không?`,"có",["không","chỉ lập tam giác vuông","không đủ dữ kiện"],["Kiểm tra mỗi cạnh dương.","Cạnh lớn nhất nhỏ hơn tổng hai cạnh còn lại.","Ba bất đẳng thức tam giác đều đúng."],"Không chỉ nhìn hình; cạnh lớn nhất phải nhỏ hơn tổng hai cạnh kia.",[p("semanticRule","VALID_TRIANGLE")],"SHAPE_SCENE");
      }
      if (/song song|so le trong|đồng vị/u.test(text)) {
        const angle = 35 + 5 * ((a + occurrence) % 8);
        return textCore(`${prefix} Hai đường thẳng song song có một cặp góc so le trong; một góc ${angle}°. Góc kia bằng bao nhiêu?`,`${angle}°`,[`${180-angle}°`,`90°`,`${angle+10}°`],["Xác định đúng cặp góc so le trong.","Hai góc so le trong bằng nhau khi hai đường thẳng song song.","Kết luận số đo và nêu căn cứ."],"Không dùng vẻ ngoài của hình hoặc nhầm với cặp góc trong cùng phía.",[p("angle",angle)],"ANGLE_DIAGRAM");
      }
      if (/đường vuông góc.{0,24}đường xiên|khoảng cách từ một điểm/u.test(text)) {
        return conceptCore(prefix, "Đoạn nào biểu diễn khoảng cách ngắn nhất từ điểm A đến đường thẳng d?", "đoạn vuông góc từ A đến d", ["một đường xiên bất kỳ", "đoạn song song với d", "tia không cắt d"], ["Dựng chân đường vuông góc H.", "AH vuông góc d.", "Mọi đường xiên từ A đến d dài hơn AH."], "Khoảng cách điểm–đường không phải một đường xiên tùy ý.", "POINT_LINE_DISTANCE", "ANGLE_DIAGRAM");
      }
      const angle=30+5*((a+occurrence)%10);
      return textCore(`${prefix} Hai góc đối đỉnh, một góc ${angle}°. Góc kia?`,`${angle}°`,[`${180-angle}°`,`90°`,`${angle+5}°`],["Nêu giả thiết hai góc đối đỉnh.","Dùng định lí góc đối đỉnh bằng nhau.","Kết luận đúng số đo."],"Không suy từ vẻ ngoài của hình; phải nêu căn cứ.",[p("angle",angle)],"ANGLE_DIAGRAM");
    }
    case "QUADRILATERAL_SIMILARITY": {
      if (/pythagore/u.test(text)) {
        const scale = occurrence + 1;
        return textCore(`${prefix} Tam giác vuông có hai cạnh góc vuông ${3*scale} cm và ${4*scale} cm. Cạnh huyền?`,`${5*scale} cm`,[`${7*scale} cm`,`${Math.sqrt(7)*scale} cm`,`${5*scale} cm²`],["Dùng c²=a²+b².","Tính 9k²+16k²=25k².","Độ dài cạnh huyền là 5k."],"Không cộng trực tiếp hai cạnh hoặc ghi đơn vị diện tích.",[p("pythagoreanHypotenuse",5*scale)],"SHAPE_SCENE");
      }
      if (/tổng các góc trong một tứ giác/u.test(text)) {
        const missing = 360 - (80 + 90 + 100);
        return textCore(`${prefix} Ba góc của tứ giác là 80°, 90°, 100°. Góc còn lại?`,`${missing}°`,["90°","100°","180°"],["Tổng bốn góc tứ giác lồi bằng 360°.","Cộng ba góc đã biết được 270°.","Lấy 360°−270°=90°."],"Không dùng tổng 180° của tam giác cho tứ giác.",[p("quadrilateralAngle",missing)],"SHAPE_SCENE");
      }
      if (/hình bình hành/u.test(text)) {
        return conceptCore(prefix, "Tính chất nào luôn đúng với hình bình hành?", "hai đường chéo cắt nhau tại trung điểm mỗi đường", ["hai đường chéo luôn vuông góc", "hai đường chéo luôn bằng nhau", "bốn góc luôn vuông"], ["Dùng hai cặp cạnh đối song song.", "Suy ra các tam giác thích hợp bằng nhau.", "Hai đường chéo phân giác lẫn nhau."], "Không gán tính chất riêng của hình thoi hoặc chữ nhật cho mọi hình bình hành.", "PARALLELOGRAM_DIAGONALS", "SHAPE_SCENE");
      }
      if (/hình thoi/u.test(text)) {
        return conceptCore(prefix, "Tính chất đặc trưng nào đúng với hai đường chéo hình thoi?", "vuông góc và là phân giác các góc", ["luôn bằng nhau", "song song với nhau", "không cắt nhau"], ["Dùng bốn cạnh bằng nhau.", "Xét các tam giác tạo bởi đường chéo.", "Suy ra vuông góc và phân giác."], "Không mặc định hai đường chéo hình thoi bằng nhau.", "RHOMBUS_DIAGONALS", "SHAPE_SCENE");
      }
      const ratioSmall=Math.min(a,b), ratioLarge=Math.max(a,b)+Number(a===b);
      const small=ratioSmall*c, large=ratioLarge*c;
      return textCore(`${prefix} Hai cạnh tương ứng tỉ lệ ${ratioSmall}:${ratioLarge}; cạnh nhỏ ${small} cm. Cạnh lớn?`,`${large} cm`,[`${small+ratioLarge} cm`,`${ratioSmall+ratioLarge} cm`,`${large+1} cm`],["Ghép đúng cạnh tương ứng.",`Lập ${small}/x=${ratioSmall}/${ratioLarge}.`,"Giải được x và kiểm tra tỉ số."],"Không đảo một tỉ số riêng lẻ hoặc ghép sai đỉnh.",[p("ratioSmall",ratioSmall),p("ratioLarge",ratioLarge),p("small",small),p("large",large)],"SHAPE_SCENE");
    }
    case "CIRCLE_TRIG": {
      if (/tỉ số lượng giác|sin|côsin|tangent|cotangent/u.test(text)) {
        const scale = occurrence + 1;
        return textCore(`${prefix} Tam giác vuông có cạnh đối góc α là ${3*scale}, cạnh kề ${4*scale}, cạnh huyền ${5*scale}. sin α?`,"3/5",["4/5","3/4","5/3"],["Xác định cạnh đối và cạnh huyền.","sin α=cạnh đối/cạnh huyền.","Rút gọn tỉ số và kiểm tra thuộc [0;1]."],"Không nhầm sin với cos hoặc lấy cạnh huyền chia cạnh đối.",[p("semanticRule","SINE_3_4_5")],"ANGLE_DIAGRAM");
      }
      if (/vị trí tương đối của đường thẳng/u.test(text)) {
        const radius = a;
        return textCore(`${prefix} Khoảng cách từ tâm O đến đường thẳng d bằng bán kính ${radius} cm. d và đường tròn ở vị trí nào?`,"tiếp xúc",["cắt nhau tại hai điểm","không giao nhau","trùng nhau"],["So sánh khoảng cách từ tâm đến d với bán kính.","Hai đại lượng bằng nhau.","Đường thẳng tiếp xúc đường tròn."],"Không suy từ hình; phải so sánh khoảng cách với bán kính.",[p("semanticRule","LINE_CIRCLE_TANGENT")],"ANGLE_DIAGRAM");
      }
      if (/vị trí tương đối của hai đường tròn/u.test(text)) {
        return conceptCore(prefix, "Hai đường tròn bán kính 3 cm và 5 cm có khoảng cách hai tâm 8 cm. Vị trí tương đối?", "tiếp xúc ngoài", ["cắt nhau tại hai điểm", "tiếp xúc trong", "không giao nhau"], ["Tính tổng bán kính 3+5=8.", "Khoảng cách hai tâm bằng tổng bán kính.", "Hai đường tròn tiếp xúc ngoài."], "Không bỏ so sánh khoảng cách tâm với tổng và hiệu bán kính.", "TWO_CIRCLES_EXTERNAL_TANGENT", "ANGLE_DIAGRAM");
      }
      if (/tiếp tuyến/u.test(text)) {
        return conceptCore(prefix, "Bán kính đi qua tiếp điểm tạo với tiếp tuyến góc bao nhiêu?", "90°", ["0°","45°","180°"], ["Xác định tiếp điểm.", "Dùng định lí bán kính vuông góc tiếp tuyến.", "Kết luận góc 90°."], "Không coi dây bất kỳ là bán kính tới tiếp điểm.", "TANGENT_RADIUS", "ANGLE_DIAGRAM");
      }
      if (/góc ở tâm|góc nội tiếp|số đo của cung/u.test(text)) {
        const inscribed = 30 + 5 * (occurrence % 5);
        return textCore(`${prefix} Góc nội tiếp chắn cùng cung có số đo ${inscribed}°. Góc ở tâm chắn cung đó?`,`${2*inscribed}°`,[`${inscribed}°`,`${180-inscribed}°`,`${inscribed/2}°`],["Xác định hai góc chắn cùng một cung.","Góc ở tâm bằng hai lần góc nội tiếp.","Kiểm tra số đo không vượt 360°."],"Không nhầm chiều gấp đôi giữa góc ở tâm và góc nội tiếp.",[p("centralAngle",2*inscribed)],"ANGLE_DIAGRAM");
      }
      if (/độ dài cung|hình quạt|vành khuyên/u.test(text)) {
        const arcFactor = 2;
        return textCore(`${prefix} Cung 60° của đường tròn bán kính 6 cm dài bằng bao nhiêu lần π?`,`${arcFactor}π cm`,["6π cm","12π cm","2π cm²"],["Dùng l=(n/360)×2πr.","Thay n=60, r=6.","Rút gọn được 2π cm."],"Không dùng công thức diện tích quạt hoặc bỏ đơn vị độ dài.",[p("arcLengthFactor",arcFactor)],"ANGLE_DIAGRAM");
      }
      if (/đường kính và dây/u.test(text)) {
        const radius = a;
        return textCore(`${prefix} Đường tròn bán kính ${radius} cm có dây dài nhất bao nhiêu?`,`${2*radius} cm`,[`${radius} cm`,`${radius*radius} cm`,`${3*radius} cm`],["Dây dài nhất đi qua tâm.","Dây đó là đường kính.","Đường kính bằng hai lần bán kính."],"Không có dây nào dài hơn đường kính.",[p("diameter",2*radius)],"ANGLE_DIAGRAM");
      }
      const radius=a, diameter=2*a;
      return textCore(`${prefix} Đường tròn bán kính ${radius} cm có đường kính?`,`${diameter} cm`,[`${radius} cm`,`${radius*radius} cm²`,`${diameter+1} cm`],["Bán kính nối tâm với đường tròn.","Đường kính bằng hai lần bán kính.","Giữ đơn vị độ dài."],"Không nhầm bán kính, đường kính hoặc diện tích.",[p("radius",radius),p("diameter",diameter)],"ANGLE_DIAGRAM");
    }
    case "TRANSFORMATION": {
      const sides=[3,4,6][(a+occurrence)%3], angle=360/sides;
      return textCore(`${prefix} Đa giác đều ${sides} cạnh quay quanh tâm góc nhỏ nhất để trùng nó?`,`${angle}°`,[`${180/sides}°`,`180°`,`${angle+10}°`],["Có n vị trí đỉnh đều.","Chia 360° cho n.","Kiểm tra mọi đỉnh chuyển tới đỉnh kế."],"Không đổi tâm hoặc nhầm phép quay với phản xạ.",[p("sides",sides),p("angle",angle)],"SHAPE_SCENE");
    }
    case "DATA": {
      if (/tần số tương đối/u.test(text)) {
        const total = 20 + occurrence * 10;
        const count = total / 2;
        return textCore(`${prefix} Giá trị A xuất hiện ${count} lần trong ${total} quan sát. Tần số tương đối?`,"0,5",["2",String(count),`${count}%`],["Tần số tương đối bằng tần số chia tổng.","Thực hiện phép chia.","Kiểm tra kết quả thuộc [0;1]."],"Không đảo tỉ số hoặc nhầm tần số với tần số tương đối.",[p("relativeFrequencyCount",count),p("relativeFrequencyTotal",total)],"DATA_DISPLAY");
      }
      if (/chuyển dữ liệu|dạng biểu diễn|lựa chọn và biểu diễn|thiết lập.*biểu đồ/u.test(text)) {
        return conceptCore(prefix, `Bốn nhóm có ${a}, ${b}, ${a+b} và ${a+b+c} quan sát. Muốn so sánh số lượng, biểu đồ nào phù hợp nhất?`, "biểu đồ cột", ["biểu đồ không có thang", "một hình tròn không chia phần", "đường thẳng không gắn dữ liệu"], ["Xác định mục tiêu là so sánh nhóm.", "Giữ cùng thang đo trên các cột.", "Đối chiếu tổng dữ liệu sau khi biểu diễn."], "Biểu diễn phải giữ đúng giá trị, nhãn, đơn vị và thang.", "CHOOSE_COLUMN_CHART", "DATA_DISPLAY");
      }
      if (/hợp lí|không chính xác|quảng cáo/u.test(text)) {
        return conceptCore(prefix, `Bảng ghi ${a} nam, ${b} nữ nhưng tổng là ${a+b+1}. Kết luận nào đúng?`, `tổng bị sai vì ${a}+${b}=${a+b}`, ["dữ liệu hoàn toàn hợp lí", `${a}+${b}=${a+b+1}`, "không cần kiểm tra tổng"], ["Cộng các tần số thành phần.", `${a}+${b}=${a+b}.`, `So với tổng công bố ${a+b+1} và chỉ ra mâu thuẫn.`], "Không chấp nhận dữ liệu chỉ vì biểu đồ nhìn hợp lí.", `INVALID_DATA_TOTAL_${a}_${b}`, "DATA_DISPLAY");
      }
      if (/thu thập|phân loại/u.test(text)) {
        return conceptCore(prefix, `Khi khảo sát ${a*10} bạn về phương tiện đến trường, bước nào bảo đảm dữ liệu kiểm tra được?`, "ghi nguồn, tiêu chí phân loại và đủ từng câu trả lời", ["chỉ ghi kết luận", "đổi tiêu chí sau khi đếm", "bỏ các câu trả lời khác dự đoán"], ["Xác định đối tượng và nguồn.", "Ấn định tiêu chí không chồng lấn.", `Đối chiếu tổng bản ghi với cỡ mẫu ${a*10}.`], "Không thay tiêu chí hoặc bỏ dữ liệu sau khi thu thập.", "DATA_COLLECTION_PROTOCOL", "DATA_DISPLAY");
      }
      const values=[a,a,b,c,a], frequency=values.filter(v=>v===a).length;
      return textCore(`${prefix} Dữ liệu ${values.join(", ")}. Tần số của ${a}?`,String(frequency),[String(values.length),String(frequency+1),String(a)],["Xác định đúng giá trị cần đếm.","Đếm số lần xuất hiện.","Kiểm tra tổng tần số bằng cỡ mẫu."],"Không nhầm giá trị với tần số hoặc bỏ thang/đơn vị.",[p("target",a),p("frequency",frequency),p("sampleSize",values.length)],"DATA_DISPLAY");
    }
    case "PROBABILITY": {
      const trials=20+occurrence*10, success=trials/2+c;
      return textCore(`${prefix} Biến cố xảy ra ${success}/${trials} lần thử. Tần số tương đối?`,String(success/trials).replace(".",","),[String(trials/success).replace(".",","),String(success),String(trials)],["Đếm số lần biến cố xảy ra.","Chia cho tổng số lần thử.","Kiểm tra kết quả thuộc [0;1]."],"Không đảo tỉ số hoặc dùng tổng thử bằng 0.",[p("success",success),p("trials",trials)],"DATA_DISPLAY");
    }
    case "FINANCE": {
      if (/sao kê|giao dịch ngân hàng/u.test(text)) {
        return conceptCore(prefix, "Trên sao kê, khoản tiền vào 500 000 đồng và tiền ra 120 000 đồng làm số dư thay đổi thế nào?", "tăng 380 000 đồng", ["tăng 620 000 đồng", "giảm 380 000 đồng", "không đổi"], ["Quy ước tiền vào là dương.", "Tiền ra là âm.", "500 000−120 000=380 000 đồng."], "Không cộng tiền chi vào thu nhập hoặc bỏ dấu của giao dịch.", "BANK_STATEMENT_NET", "RATIO_TABLE");
      }
      if (/bảo hiểm/u.test(text)) {
        return conceptCore(prefix, "Khoản nào là chi phí để duy trì hợp đồng bảo hiểm?", "phí bảo hiểm", ["tiền bồi thường nhận được", "mệnh giá ngẫu nhiên", "số dư tài khoản"], ["Phân biệt phí và quyền lợi.", "Phí là khoản người tham gia đóng.", "Quyền lợi phụ thuộc điều kiện hợp đồng."], "Không coi bảo hiểm là khoản lợi nhuận chắc chắn.", "INSURANCE_PREMIUM", "RATIO_TABLE");
      }
      if (/thuế/u.test(text)) {
        const price = a * 100000;
        const tax = price / 10;
        return textCore(`${prefix} Giá trước thuế ${price} đồng, thuế suất 10%. Tiền thuế?`,`${tax} đồng`,[`${price+tax} đồng`,"10 đồng",`${price-tax} đồng`],["Đổi 10%=0,1.","Nhân với giá làm căn cứ tính thuế.","Phân biệt tiền thuế với tổng sau thuế."],"Không cộng phần trăm như một số tiền hoặc dùng sai căn cứ.",[p("tax",tax)],"RATIO_TABLE");
      }
      const capital=a*100000, rate=5+occurrence, interest=capital*rate/100;
      return textCore(`${prefix} Vốn ${capital} đồng tăng ${rate}%. Phần tăng?`,`${interest} đồng`,[`${capital+interest} đồng`,`${rate} đồng`,`${interest+1000} đồng`],["Đổi phần trăm trên 100.","Nhân đúng vốn cơ sở.","Phân biệt phần tăng với số dư mới."],"Không cộng phần trăm trực tiếp vào tiền hoặc dùng sai vốn.",[p("capital",capital),p("rate",rate),p("interest",interest)],"RATIO_TABLE");
    }
    case "SOFTWARE": {
      const trials = a + occurrence;
      return textCore(`${prefix} Sau ${trials} lần thay đổi đầu vào, bước kiểm chứng nào vẫn bắt buộc?`,"kiểm tra ràng buộc, nhãn và thang vẫn đúng",["chỉ nhìn ảnh ban đầu","xóa nhãn để hình gọn","coi mô phỏng là chứng minh"],["Nhập đúng dữ liệu/ràng buộc.",`Thay đổi đầu vào ${trials} lần.`,"Đối chiếu bất biến và lưu bằng chứng."],"Phần mềm hỗ trợ kiểm tra; không thay cho điều kiện toán học.",[p("trials",trials)],teaching.SOFTWARE.visual);
    }
    case "MODELLING": {
      if (/hoá học|sinh học/u.test(text)) {
        return conceptCore(prefix, "Mô hình nào mô tả đúng việc cân bằng 2H₂ + O₂ → 2H₂O?", "số nguyên tử H và O bằng nhau ở hai vế", ["chỉ tổng hệ số bằng nhau", "đổi chỉ số trong công thức chất", "bỏ qua nguyên tố O"], ["Đặt hệ số làm biến.", "Lập phương trình bảo toàn cho từng nguyên tố.", "Kiểm tra lại số nguyên tử ở hai vế."], "Chỉ được thay hệ số, không thay chỉ số hóa học.", "CHEMICAL_BALANCE_MODEL", "BALANCE_MODEL");
      }
      if (/giả định|tối ưu|kế hoạch/u.test(text)) {
        return conceptCore(prefix, "Bước nào phải có trước khi diễn giải kết quả mô hình?", "nêu biến, đơn vị và giả định", ["chỉ ghi một con số", "bỏ mọi ràng buộc", "làm tròn ngay từ dữ kiện"], ["Xác định biến cần tìm.", "Ghi đơn vị và giả định.", "Lập quan hệ rồi mới giải và kiểm tra."], "Kết quả không có biến, đơn vị và giả định không đủ ý nghĩa thực tế.", "MODELLING_ASSUMPTIONS", "RATIO_TABLE");
      }
      const distance=a*30, speed=30, time=distance/speed;
      return textCore(`${prefix} Quãng đường ${distance} km, vận tốc ${speed} km/h. Thời gian?`,`${time} giờ`,[`${distance*speed} giờ`,`${speed/distance} giờ`,`${time+1} km`],["Xác định biến thời gian và đơn vị giờ.","Lập distance=speed×time.","Giải rồi diễn giải trong ngữ cảnh."],"Không trộn đơn vị hoặc giữ kết quả không có ý nghĩa thực tế.",[p("distance",distance),p("speed",speed),p("time",time)],"RATIO_TABLE");
    }
  }
}

function generateForGrade(
  grade: 7 | 8 | 9,
  unit: CurriculumUnit,
  seed: string,
) {
  return generateCompletionQuestionSpecs({
    unit,
    seed,
    kind: `GRADE${grade}_OUTCOME_COMPLETION` as VerticalUnitKind,
    scenario: scenarioFor,
  });
}

export const generateGrade7RemainingQuestionSpecs = (unit: CurriculumUnit, seed: string) =>
  generateForGrade(7, unit, seed);
export const generateGrade8QuestionSpecs = (unit: CurriculumUnit, seed: string) =>
  generateForGrade(8, unit, seed);
export const generateGrade9QuestionSpecs = (unit: CurriculumUnit, seed: string) =>
  generateForGrade(9, unit, seed);
