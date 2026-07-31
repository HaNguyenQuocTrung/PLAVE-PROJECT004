import type {
  CurriculumOutcome,
  CurriculumUnit,
  PreviewAnswerType,
  PreviewCognitiveLevel,
  TheorySection,
  VerticalUnitKind,
  VisualRequirement,
  WorkedExample,
} from "./types.ts";

type Seed = Readonly<{
  slug: string;
  title: string;
  grade: CurriculumUnit["grade"];
  domain: CurriculumUnit["domain"];
  outcomeId: string;
  skills: readonly [string, string, string];
  prerequisiteSlugs: readonly string[];
  restrictions: readonly string[];
  visual: VisualRequirement;
  answers: readonly PreviewAnswerType[];
  levels: readonly PreviewCognitiveLevel[];
  misconceptions: readonly string[];
  kind: VerticalUnitKind;
  theory: readonly TheorySection[];
  examples: readonly WorkedExample[];
}>;

type Topic = Readonly<{
  batch: "C" | "D" | "E" | "F" | "G" | "H";
  grade: CurriculumUnit["grade"];
  domain: CurriculumUnit["domain"];
  code: string;
  slug: string;
  title: string;
  summary: string;
  skills: readonly [string, string, string];
  prerequisiteSlugs: readonly string[];
  restrictions: readonly string[];
  visual: VisualRequirement;
  kind: VerticalUnitKind;
  core: string;
  method: string;
  check: string;
  context: string;
  exampleOne: Readonly<{
    prompt: string;
    steps: readonly [string, string, string];
    answer: string;
  }>;
  exampleTwo: Readonly<{
    prompt: string;
    steps: readonly [string, string, string];
    answer: string;
  }>;
}>;

const section = (
  id: string,
  title: string,
  explanation: readonly string[],
  visualDescription: string,
): TheorySection => ({ id, title, explanation, visualDescription });

const example = (
  id: string,
  title: string,
  item: Topic["exampleOne"],
  visualDescription: string,
): WorkedExample => ({
  id,
  title,
  prompt: item.prompt,
  steps: item.steps,
  answer: item.answer,
  visualDescription,
});

const geometryTopics: readonly Topic[] = [
  {
    batch: "C", grade: 7, domain: "GEOMETRY", code: "G7_GEOMETRY_01",
    slug: "grade-7-triangle-reasoning", title: "Suy luận với tam giác",
    summary: "Suy luận với tổng góc, tam giác bằng nhau, tam giác cân và các đường đặc biệt trong tam giác.",
    skills: ["G7_TRIANGLE_ANGLE_SUM", "G7_ISOSCELES_REASONING", "G7_TRIANGLE_CONGRUENCE"],
    prerequisiteSlugs: ["grade-6-angle-reasoning"],
    restrictions: ["Góc tính theo độ và dữ kiện xác định duy nhất.", "Chứng minh chỉ dùng quan hệ tam giác trong outcome đã khóa."],
    visual: "ANGLE_DIAGRAM", kind: "SECONDARY_GEOMETRY",
    core: "Tổng ba góc trong một tam giác bằng 180°; tam giác cân có hai góc ở đáy bằng nhau.",
    method: "Ghi các góc đã biết, chọn đúng quan hệ rồi lập phép tính tìm góc còn thiếu.",
    check: "Kiểm tra mọi góc dương và tổng ba góc đúng 180° trước khi kết luận.",
    context: "Dùng các quan hệ tam giác để đo, vẽ và giải thích các cấu hình đơn giản.",
    exampleOne: { prompt: "Tam giác có hai góc 50° và 60°. Tìm góc còn lại.", steps: ["Cộng hai góc đã biết: 50° + 60° = 110°.", "Lấy 180° - 110° = 70°.", "Kiểm tra 50° + 60° + 70° = 180°."], answer: "70°." },
    exampleTwo: { prompt: "Tam giác cân có góc ở đỉnh 40°. Tìm mỗi góc ở đáy.", steps: ["Hai góc ở đáy bằng nhau.", "Tổng hai góc ở đáy là 180° - 40° = 140°.", "Chia 140° cho 2 được 70°."], answer: "70°." },
  },
  {
    batch: "C", grade: 8, domain: "GEOMETRY", code: "G8_GEOMETRY_01",
    slug: "grade-8-pythagorean-reasoning", title: "Định lí Pythagore",
    summary: "Giải thích, áp dụng định lí Pythagore để tìm cạnh tam giác vuông và giải bài toán khoảng cách.",
    skills: ["G8_IDENTIFY_HYPOTENUSE", "G8_PYTHAGORE_SIDE", "G8_PYTHAGORE_CONTEXT"],
    prerequisiteSlugs: ["grade-7-triangle-reasoning"],
    restrictions: ["Chỉ áp dụng cho tam giác vuông.", "Generator dùng bộ số cho kết quả nguyên hoặc căn bậc hai rõ ràng."],
    visual: "AREA_MODEL", kind: "SECONDARY_GEOMETRY",
    core: "Trong tam giác vuông, bình phương cạnh huyền bằng tổng bình phương hai cạnh góc vuông.",
    method: "Xác định cạnh huyền trước, thay số vào a² + b² = c² rồi lấy căn dương của độ dài.",
    check: "Cạnh huyền phải là cạnh dài nhất và bình phương các cạnh phải thỏa đẳng thức.",
    context: "Mô hình hóa đường chéo và khoảng cách thẳng bằng một tam giác vuông.",
    exampleOne: { prompt: "Tam giác vuông có hai cạnh góc vuông 3 cm và 4 cm. Tìm cạnh huyền.", steps: ["Lập c² = 3² + 4².", "Tính c² = 9 + 16 = 25.", "Độ dài dương nên c = 5 cm."], answer: "5 cm." },
    exampleTwo: { prompt: "Cạnh huyền 13 m và một cạnh góc vuông 5 m. Tìm cạnh còn lại.", steps: ["Lập b² = 13² - 5².", "Tính b² = 169 - 25 = 144.", "Lấy căn dương: b = 12 m."], answer: "12 m." },
  },
  {
    batch: "C", grade: 9, domain: "GEOMETRY", code: "G9_GEOMETRY_01",
    slug: "grade-9-right-triangle-trigonometry", title: "Tỉ số lượng giác trong tam giác vuông",
    summary: "Dùng sin, côsin, tang và quan hệ cạnh-góc để giải tam giác vuông và bài toán thực tế.",
    skills: ["G9_TRIG_RATIO", "G9_FIND_RIGHT_TRIANGLE_SIDE", "G9_TRIG_CONTEXT"],
    prerequisiteSlugs: ["grade-8-pythagorean-reasoning"],
    restrictions: ["Góc được chỉ rõ trong tam giác vuông.", "Tỉ số dùng cạnh đối, cạnh kề và cạnh huyền đúng theo góc đang xét."],
    visual: "ANGLE_DIAGRAM", kind: "SECONDARY_GEOMETRY",
    core: "Sin là đối trên huyền, côsin là kề trên huyền và tang là đối trên kề đối với góc nhọn đang xét.",
    method: "Đánh dấu góc, gọi tên ba cạnh theo góc đó, chọn tỉ số chứa đại lượng đã biết và cần tìm.",
    check: "Sin và côsin của góc nhọn nằm giữa 0 và 1; độ dài tìm được phải dương.",
    context: "Dùng tam giác vuông để tính gián tiếp chiều cao, khoảng cách hoặc góc.",
    exampleOne: { prompt: "Với góc A, cạnh đối dài 3 và cạnh huyền dài 5. Tính sin A.", steps: ["Sin dùng cạnh đối chia cạnh huyền.", "Thay số sin A = 3/5.", "Tỉ số 3/5 nằm giữa 0 và 1."], answer: "3/5." },
    exampleTwo: { prompt: "Tam giác vuông có tan A = 3/4 và cạnh kề A dài 8 cm. Tìm cạnh đối.", steps: ["Dùng tan A = đối/kề.", "Lập đối/8 = 3/4.", "Nhân 8 × 3/4 = 6 cm."], answer: "6 cm." },
  },
];

const measurementTopics: readonly Topic[] = [
  {
    batch: "C", grade: 7, domain: "MEASUREMENT", code: "G7_MEASUREMENT_01",
    slug: "grade-7-prism-measurement", title: "Diện tích và thể tích lăng trụ đứng",
    summary: "Tính diện tích xung quanh, thể tích lăng trụ đứng tam giác hoặc tứ giác và giải bài toán thực tế.",
    skills: ["G7_PRISM_BASE_AREA", "G7_PRISM_LATERAL_AREA", "G7_PRISM_VOLUME"],
    prerequisiteSlugs: ["grade-6-area-measurement"],
    restrictions: ["Đáy và chiều cao lăng trụ được nêu đủ.", "Đơn vị diện tích và thể tích không bị trộn lẫn."],
    visual: "AREA_MODEL", kind: "SECONDARY_MEASUREMENT",
    core: "Thể tích lăng trụ đứng bằng diện tích đáy nhân chiều cao; diện tích xung quanh bằng chu vi đáy nhân chiều cao.",
    method: "Tính đại lượng ở đáy trước, sau đó nhân với chiều cao lăng trụ theo công thức phù hợp.",
    check: "Diện tích dùng đơn vị vuông, thể tích dùng đơn vị khối và mọi kích thước phải cùng đơn vị.",
    context: "Mô hình hóa hộp, bể hoặc vật thể dạng lăng trụ để tính vật liệu hay sức chứa.",
    exampleOne: { prompt: "Lăng trụ có diện tích đáy 12 cm² và cao 5 cm. Tính thể tích.", steps: ["Dùng V = Sđáy × h.", "Thay số 12 × 5 = 60.", "Ghi đơn vị cm³."], answer: "60 cm³." },
    exampleTwo: { prompt: "Lăng trụ có chu vi đáy 18 cm và cao 7 cm. Tính diện tích xung quanh.", steps: ["Dùng Sxq = Pđáy × h.", "Tính 18 × 7 = 126.", "Ghi đơn vị cm²."], answer: "126 cm²." },
  },
  {
    batch: "C", grade: 8, domain: "MEASUREMENT", code: "G8_MEASUREMENT_01",
    slug: "grade-8-pyramid-measurement", title: "Diện tích và thể tích hình chóp đều",
    summary: "Tính diện tích xung quanh, thể tích hình chóp đều tam giác hoặc tứ giác trong tình huống thực tế.",
    skills: ["G8_PYRAMID_BASE_AREA", "G8_PYRAMID_LATERAL_AREA", "G8_PYRAMID_VOLUME"],
    prerequisiteSlugs: ["grade-7-prism-measurement"],
    restrictions: ["Phân biệt chiều cao hình chóp với trung đoạn mặt bên.", "Dữ kiện tạo kết quả hữu tỉ đơn giản."],
    visual: "AREA_MODEL", kind: "SECONDARY_MEASUREMENT",
    core: "Thể tích hình chóp bằng một phần ba diện tích đáy nhân chiều cao vuông góc.",
    method: "Xác định diện tích đáy và chiều cao hình chóp, nhân rồi chia cho 3.",
    check: "Không dùng trung đoạn mặt bên thay cho chiều cao khi tính thể tích.",
    context: "Tính sức chứa hoặc vật liệu cho mô hình có dạng hình chóp đều.",
    exampleOne: { prompt: "Hình chóp có diện tích đáy 24 cm² và cao 6 cm. Tính thể tích.", steps: ["Dùng V = Sđáy × h ÷ 3.", "Tính 24 × 6 = 144.", "Chia 144 cho 3 được 48 cm³."], answer: "48 cm³." },
    exampleTwo: { prompt: "Hình chóp có thể tích 40 cm³ và diện tích đáy 20 cm². Tìm chiều cao.", steps: ["Từ V = Sđáy × h ÷ 3 suy ra h = 3V/Sđáy.", "Tính 3 × 40 = 120.", "Chia 120 cho 20 được 6 cm."], answer: "6 cm." },
  },
  {
    batch: "C", grade: 9, domain: "MEASUREMENT", code: "G9_MEASUREMENT_01",
    slug: "grade-9-round-solids-measurement", title: "Đo lường hình trụ, hình nón và hình cầu",
    summary: "Tính diện tích và thể tích hình trụ, hình nón, hình cầu trong các bài toán thực tế.",
    skills: ["G9_CYLINDER_VOLUME", "G9_CONE_VOLUME", "G9_SPHERE_VOLUME"],
    prerequisiteSlugs: ["grade-8-pyramid-measurement"],
    restrictions: ["Dùng π = 3,14 khi đề bài yêu cầu số gần đúng.", "Bán kính và chiều cao phải cùng đơn vị."],
    visual: "AREA_MODEL", kind: "SECONDARY_MEASUREMENT",
    core: "Hình trụ có V = πr²h; hình nón có một phần ba thể tích hình trụ cùng đáy và chiều cao.",
    method: "Xác định đúng bán kính, bình phương bán kính, rồi áp dụng hệ số của từng hình khối.",
    check: "Thể tích dùng đơn vị khối và kết quả hình nón phải bằng một phần ba hình trụ tương ứng.",
    context: "Mô hình hóa lon, phễu và quả cầu để tính sức chứa hay vật liệu.",
    exampleOne: { prompt: "Hình trụ có r = 2 cm, h = 5 cm, lấy π = 3,14. Tính thể tích.", steps: ["Dùng V = πr²h.", "Tính 3,14 × 2² × 5.", "Kết quả 62,8 cm³."], answer: "62,8 cm³." },
    exampleTwo: { prompt: "Hình nón cùng đáy và chiều cao với hình trụ thể tích 90 cm³. Tính thể tích hình nón.", steps: ["Hình nón bằng một phần ba hình trụ tương ứng.", "Tính 90 ÷ 3.", "Kết quả 30 cm³."], answer: "30 cm³." },
  },
];

const dataGrades = [3, 4, 5, 6, 7, 8, 9] as const;
const dataTopics: readonly Topic[] = dataGrades.map((grade) => ({
  batch: grade <= 5 ? "D" : "E",
  grade,
  domain: "STATISTICS_AND_PROBABILITY",
  code: `G${grade}_STATISTICS_AND_PROBABILITY_01`,
  slug: `grade-${grade}-data-and-probability`,
  title:
    grade <= 4 ? "Bảng, biểu đồ và khả năng xảy ra"
      : grade <= 6 ? "Biểu diễn dữ liệu và xác suất thực nghiệm"
        : grade <= 8 ? "Phân tích dữ liệu và xác suất"
          : "Tần số và xác suất từ không gian mẫu",
  summary:
    grade === 3 ? "Đọc bảng dữ liệu, nhận xét đơn giản và mô tả khả năng của thí nghiệm một lần."
      : grade === 4 ? "Đọc biểu đồ cột, giải bài toán dữ liệu và kiểm đếm kết quả lặp lại."
        : grade === 5 ? "Đọc biểu đồ quạt tròn và dùng tỉ số mô tả kết quả thực nghiệm."
          : grade === 6 ? "Chọn bảng hoặc biểu đồ phù hợp và dùng phân số mô tả xác suất thực nghiệm."
            : grade === 7 ? "Phân tích biểu đồ quạt tròn, đoạn thẳng và xác suất biến cố đơn giản."
              : grade === 8 ? "Kiểm tra dữ liệu, so sánh biểu diễn và liên hệ xác suất thực nghiệm với xác suất."
                : "Lập bảng tần số, tần số tương đối và tính xác suất bằng đếm không gian mẫu.",
  skills: [`G${grade}_READ_DATA`, `G${grade}_COMPARE_FREQUENCY`, `G${grade}_REASON_PROBABILITY`],
  prerequisiteSlugs: [grade === 3 ? "grade-2-data-and-chance" : `grade-${grade - 1}-data-and-probability`],
  restrictions: [
    grade <= 4 ? "Dữ liệu có không quá hai nhóm và tần số nguyên nhỏ." : "Dữ liệu hữu hạn, nguồn và tiêu chí được nêu rõ.",
    grade <= 3 ? "Không tính xác suất bằng phân số." : "Mẫu số xác suất là tổng số lần thử hoặc số kết quả đồng khả năng.",
  ],
  visual: "DATA_DISPLAY",
  kind: "DATA_AND_PROBABILITY",
  core: "Tần số cho biết số lần một giá trị xuất hiện; tổng các tần số bằng tổng số quan sát.",
  method: "Đọc nhãn và chú giải, ghi tần số từng nhóm, rồi chọn phép so sánh hoặc tỉ số phù hợp.",
  check: "Cộng lại các tần số và kiểm tra xác suất nằm từ 0 đến 1 khi biểu diễn bằng tỉ số.",
  context: "Dùng dữ liệu để mô tả, so sánh và trả lời câu hỏi trong tình huống quen thuộc.",
  exampleOne: { prompt: "Bảng có nhóm A là 6 và nhóm B là 4. Có tất cả bao nhiêu quan sát?", steps: ["Đọc đúng tần số hai nhóm.", "Cộng 6 + 4 = 10.", "Kiểm tra tổng lớn hơn từng tần số thành phần."], answer: "10 quan sát." },
  exampleTwo: grade === 3
    ? { prompt: "Túi có thẻ đỏ và xanh. Lấy một thẻ vàng có thể xảy ra không?", steps: ["Liệt kê màu có trong túi: đỏ, xanh.", "Không có thẻ vàng.", "Sự kiện không thể xảy ra."], answer: "Không thể." }
    : { prompt: "Trong 10 lần thử, biến cố A xảy ra 4 lần. Tỉ số thực nghiệm là bao nhiêu?", steps: ["Tử số là số lần A xảy ra: 4.", "Mẫu số là tổng số lần thử: 10.", "Viết 4/10 và có thể rút gọn thành 2/5."], answer: "2/5." },
}));

const numberAlgebraTopics: readonly Topic[] = [
  {
    batch: "F", grade: 7, domain: "NUMBERS_AND_OPERATIONS", code: "G7_NUMBERS_AND_OPERATIONS_01",
    slug: "grade-7-rational-number-operations", title: "Phép tính với số hữu tỉ",
    summary: "Thực hiện phép tính, thứ tự phép tính và vận dụng tính chất của số hữu tỉ trong bài toán thực tế.",
    skills: ["G7_RATIONAL_ADD_SUBTRACT", "G7_RATIONAL_MULTIPLY_DIVIDE", "G7_RATIONAL_ORDER"],
    prerequisiteSlugs: ["grade-6-fraction-operations"],
    restrictions: ["Mẫu số khác 0 và giá trị được rút gọn.", "Biểu thức có số lượng phép tính vừa đủ để giải thích từng bước."],
    visual: "NUMBER_LINE", kind: "RATIONAL_NUMBER_OPERATIONS",
    core: "Số hữu tỉ có thể viết dạng a/b với b khác 0 và được thực hiện bốn phép tính theo quy tắc phân số.",
    method: "Đưa về mẫu chung khi cộng trừ; nhân tử với tử, mẫu với mẫu; chia bằng nhân nghịch đảo.",
    check: "Ước lượng dấu và độ lớn, rút gọn phân số, đồng thời không tạo mẫu số bằng 0.",
    context: "Dùng số hữu tỉ cho chuyển động, đo đạc và thay đổi đại lượng dương hoặc âm.",
    exampleOne: { prompt: "Tính 1/3 + 1/6.", steps: ["Quy đồng 1/3 = 2/6.", "Cộng 2/6 + 1/6 = 3/6.", "Rút gọn 3/6 = 1/2."], answer: "1/2." },
    exampleTwo: { prompt: "Tính (-3/4) ÷ (1/2).", steps: ["Đổi phép chia thành nhân nghịch đảo.", "Tính (-3/4) × (2/1) = -6/4.", "Rút gọn được -3/2."], answer: "-3/2." },
  },
  {
    batch: "F", grade: 6, domain: "ALGEBRA_AND_PREALGEBRA", code: "G6_ALGEBRA_AND_PREALGEBRA_01",
    slug: "grade-6-powers-and-order", title: "Luỹ thừa và thứ tự phép tính",
    summary: "Thực hiện luỹ thừa số mũ tự nhiên, nhân chia luỹ thừa cùng cơ số và thứ tự phép tính.",
    skills: ["G6_EVALUATE_POWER", "G6_COMBINE_POWERS", "G6_ORDER_OF_OPERATIONS"],
    prerequisiteSlugs: ["grade-5-decimal-operations"],
    restrictions: ["Cơ số và số mũ tự nhiên nhỏ.", "Không dùng số mũ âm hoặc biến đổi vượt chương trình lớp 6."],
    visual: "PLACE_VALUE_CHART", kind: "PREALGEBRA_POWERS",
    core: "Luỹ thừa aⁿ là tích của n thừa số a; khi nhân cùng cơ số thì cộng số mũ.",
    method: "Tính luỹ thừa trước, rồi nhân chia, cuối cùng cộng trừ; trong ngoặc luôn làm trước.",
    check: "Khai triển một luỹ thừa nhỏ để kiểm tra và đối chiếu thứ tự từng bước.",
    context: "Dùng ký hiệu luỹ thừa để viết gọn tích lặp và tổ chức biểu thức số.",
    exampleOne: { prompt: "Tính 2³.", steps: ["Viết 2³ = 2 × 2 × 2.", "Nhân 2 × 2 = 4.", "Nhân 4 × 2 = 8."], answer: "8." },
    exampleTwo: { prompt: "Tính 3 + 2² × 5.", steps: ["Tính luỹ thừa trước: 2² = 4.", "Nhân 4 × 5 = 20.", "Cộng 3 + 20 = 23."], answer: "23." },
  },
];

const appliedGrades = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const appliedTopics: readonly Topic[] = appliedGrades.map((grade) => ({
  batch: grade <= 5 ? "G" : "H",
  grade,
  domain: "APPLIED_PROBLEM_SOLVING",
  code: `G${grade}_APPLIED_PROBLEM_SOLVING_01`,
  slug: `grade-${grade}-applied-problem-solving`,
  title: `Giải quyết vấn đề thực tế lớp ${grade}`,
  summary:
    grade === 1 ? "Chọn phép cộng hoặc trừ phù hợp với tranh và bài toán có lời văn đơn giản."
      : grade === 2 ? "Giải bài toán thực tế một bước về thêm, bớt, nhiều hơn hoặc ít hơn."
        : grade === 3 ? "Giải bài toán thực tế đến hai bước và so sánh gấp hoặc giảm một số lần."
          : grade === 4 ? "Giải bài toán hai hoặc ba bước về trung bình, tổng-hiệu và rút về đơn vị."
            : grade === 5 ? "Giải bài toán nhiều bước với số tự nhiên hoặc số thập phân."
              : grade === 6 ? "Giải bài toán mua sắm và số lượng bằng phép tính số tự nhiên."
                : grade === 7 ? "Giải bài toán chuyển động hoặc đo đạc bằng phép tính số hữu tỉ."
                  : grade === 8 ? "Mô hình hóa bài toán thực tế bằng phương trình bậc nhất."
                    : "Mô hình hóa bài toán thực tế bằng hệ phương trình hoặc phương trình bậc hai.",
  skills: [`G${grade}_IDENTIFY_UNKNOWN`, `G${grade}_MODEL_CONTEXT`, `G${grade}_CHECK_CONTEXT`],
  prerequisiteSlugs: grade === 1 ? [] : [grade === 2 ? "grade-1-applied-problem-solving" : `grade-${grade - 1}-applied-problem-solving`],
  restrictions: [
    `Số bước và phép toán nằm trong outcome Lớp ${grade} đã khóa.`,
    "Mỗi lời giải nêu đại lượng, đơn vị và kiểm tra câu trả lời trong ngữ cảnh.",
  ],
  visual: grade <= 3 ? "COUNTER_ROW" : grade <= 7 ? "RATIO_TABLE" : "BALANCE_MODEL",
  kind: "APPLIED_PROBLEM_SOLVING",
  core:
    grade <= 2
      ? "Bài toán thực tế cho biết một vài số và hỏi một số chưa biết."
      : "Bài toán thực tế cần xác định dữ kiện, đại lượng chưa biết và quan hệ toán học giữa chúng.",
  method:
    grade <= 2
      ? "Đọc câu hỏi, tóm tắt bằng tranh hoặc sơ đồ, chọn phép cộng hay phép trừ rồi viết câu trả lời."
      : "Tóm tắt bằng mô hình, chọn phép tính hoặc phương trình, thực hiện từng bước và viết câu trả lời.",
  check:
    grade <= 2
      ? "Đọc lại câu hỏi, kiểm tra phép tính và xem câu trả lời có đúng với câu chuyện không."
      : "Thay kết quả vào dữ kiện, kiểm tra đơn vị, dấu và mức độ hợp lí của đáp số.",
  context: "Mô hình chỉ giữ thông tin cần thiết nhưng câu trả lời phải quay lại đúng tình huống ban đầu.",
  exampleOne: grade <= 2
    ? { prompt: "Có 8 quyển sách, cho đi 3 quyển. Còn bao nhiêu quyển?", steps: ["Từ 'cho đi' cho biết số lượng giảm.", "Tính 8 - 3 = 5.", "Trả lời còn 5 quyển sách."], answer: "5 quyển." }
    : grade <= 5
      ? { prompt: "Có 4 hộp, mỗi hộp 6 sản phẩm. Dùng 5 sản phẩm. Còn bao nhiêu?", steps: ["Tính tổng 4 × 6 = 24.", "Lấy 24 - 5 = 19.", "Kiểm tra 19 + 5 = 24."], answer: "19 sản phẩm." }
      : grade <= 7
        ? { prompt: "Mỗi vé giá 25 nghìn đồng. Mua 6 vé hết bao nhiêu?", steps: ["Tổng tiền bằng đơn giá nhân số lượng.", "Tính 25 × 6 = 150.", "Ghi đơn vị nghìn đồng."], answer: "150 nghìn đồng." }
        : { prompt: "Ba lần một số cộng 5 bằng 26. Tìm số đó.", steps: ["Gọi số cần tìm là x, lập 3x + 5 = 26.", "Trừ 5 được 3x = 21.", "Chia 3 được x = 7 và thay lại để kiểm tra."], answer: "7." },
  exampleTwo: grade === 1
    ? { prompt: "Có 4 viên bi, thêm 3 viên bi. Có tất cả bao nhiêu viên?", steps: ["Từ 'thêm' cho biết số lượng tăng.", "Tính 4 + 3 = 7.", "Trả lời có 7 viên bi."], answer: "7 viên." }
    : grade <= 3
      ? { prompt: "Có 3 túi, mỗi túi 4 viên bi. Có tất cả bao nhiêu viên?", steps: ["Mỗi túi có cùng 4 viên.", "Tính 3 × 4 = 12.", "Trả lời có 12 viên bi."], answer: "12 viên." }
    : grade <= 7
      ? { prompt: "5 sản phẩm giá 60 nghìn đồng. Cùng đơn giá, 8 sản phẩm giá bao nhiêu?", steps: ["Tìm đơn giá 60 ÷ 5 = 12.", "Tính 12 × 8 = 96.", "Kiểm tra số sản phẩm tăng nên tổng tiền tăng."], answer: "96 nghìn đồng." }
      : { prompt: "Tổng hai số là 10 và hiệu là 2. Tìm hai số.", steps: ["Lập x + y = 10 và x - y = 2.", "Cộng hai phương trình được 2x = 12, nên x = 6.", "Thế lại được y = 4 và kiểm tra cả hai quan hệ."], answer: "6 và 4." },
}));

const topics: readonly Topic[] = [
  ...geometryTopics,
  ...measurementTopics,
  ...dataTopics,
  ...numberAlgebraTopics,
  ...appliedTopics,
];

export const batchesCHOutcomes: readonly CurriculumOutcome[] = topics.map(
  (topic) => ({
    id: topic.code,
    grade: topic.grade,
    domain: topic.domain,
    summary: topic.summary,
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  }),
);

export const batchesCHUnitSeeds: readonly Seed[] = topics.map((topic) => {
  const prefix = `g${topic.grade}-${topic.domain.toLowerCase().replaceAll("_", "-")}`;
  return {
    slug: topic.slug,
    title: topic.title,
    grade: topic.grade,
    domain: topic.domain,
    outcomeId: topic.code,
    skills: topic.skills,
    prerequisiteSlugs: topic.prerequisiteSlugs,
    restrictions: topic.restrictions,
    visual: topic.visual,
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT", "TEXT_INPUT"],
    levels: ["UNDERSTAND", "APPLY", "REASON"],
    misconceptions: [
      `${topic.skills[0]}_MISREAD`,
      `${topic.skills[1]}_WRONG_MODEL`,
      `${topic.skills[2]}_NO_CONTEXT_CHECK`,
    ],
    kind: topic.kind,
    theory: [
      section(`${prefix}-s1`, "Ý tưởng cốt lõi", [topic.core, "Xác định rõ tên và vai trò của từng đại lượng trước khi tính."], `${topic.title}: mô hình trực quan làm rõ các đại lượng cốt lõi.`),
      section(`${prefix}-s2`, "Quy trình giải", [topic.method, "Ghi mỗi biến đổi trên một dòng để có thể kiểm tra."], `${topic.title}: các bước giải được nối theo đúng thứ tự.`),
      section(`${prefix}-s3`, "Kiểm tra kết quả", [topic.check, "Nếu kiểm tra không khớp, quay lại bước chọn quan hệ thay vì sửa đáp số."], `${topic.title}: kết quả được đối chiếu với dữ kiện ban đầu.`),
      section(`${prefix}-s4`, "Vận dụng", [topic.context, "Luôn diễn giải kết quả bằng lời và đơn vị phù hợp."], `${topic.title}: một tình huống thực tế được mô hình hóa bằng toán học.`),
    ],
    examples: [
      example(`${prefix}-e1`, "Ví dụ theo quy trình", topic.exampleOne, `${topic.title}: dữ kiện của ví dụ thứ nhất được đánh dấu.`),
      example(`${prefix}-e2`, "Ví dụ kiểm tra ngược", topic.exampleTwo, `${topic.title}: mô hình của ví dụ thứ hai kèm bước kiểm tra.`),
    ],
  };
});

export const batchGapCounts = {
  C: topics.filter((topic) => topic.batch === "C").length,
  D: topics.filter((topic) => topic.batch === "D").length,
  E: topics.filter((topic) => topic.batch === "E").length,
  F: topics.filter((topic) => topic.batch === "F").length,
  G: topics.filter((topic) => topic.batch === "G").length,
  H: topics.filter((topic) => topic.batch === "H").length,
} as const;
