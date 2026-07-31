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

export type P0UnitSeed = Readonly<{
  slug: string;
  title: string;
  grade: CurriculumUnit["grade"];
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
  kind: "P0_OUTCOME_COMPLETION" | "P1_OUTCOME_COMPLETION";
  theory: readonly TheorySection[];
  examples: readonly WorkedExample[];
}>;

export type P0QuestionSpec = Readonly<{
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

type Definition = Readonly<{
  slug: string;
  title: string;
  grade: CurriculumUnit["grade"];
  domain: CurriculumUnit["domain"];
  code: string;
  officialOutcomeIds: readonly string[];
  skills: readonly [string, string, string, ...string[]];
  prerequisiteSlugs: readonly string[];
  restrictions: readonly string[];
  visual: VisualRequirement;
  misconceptions: readonly string[];
  theory: readonly [string, string, string, string];
  theoryOutcomeGroups?: readonly [
    readonly string[],
    readonly string[],
    readonly string[],
    readonly string[],
  ];
  exampleOne: Readonly<{
    title: string;
    prompt: string;
    steps: readonly [string, string, string];
    answer: string;
    officialOutcomeIds: readonly string[];
  }>;
  exampleTwo: Readonly<{
    title: string;
    prompt: string;
    steps: readonly [string, string, string];
    answer: string;
    officialOutcomeIds: readonly string[];
  }>;
}>;

const G1_COUNT = "MOET2018-G1-NUM-P021-001";
const G1_TWO_OPS = "MOET2018-G1-NUM-P022-002";
const G1_ORDER = "MOET2018-G1-NUM-P022-006";
const G1_MENTAL = "MOET2018-G1-NUM-P022-010";
const G1_APPLIED_MEASURE = "MOET2018-G1-GEO-P023-006";
const G1_BUILD_SHAPES = "MOET2018-G1-GEO-P023-007";
const G1_INFORMAL_MEASURE = "MOET2018-G1-GEO-P023-013";

const G2_ROUND_HUNDREDS = "MOET2018-G2-NUM-P024-003";
const G2_COMPONENTS = "MOET2018-G2-NUM-P025-005";
const G2_COMPARE = "MOET2018-G2-NUM-P025-007";
const G2_NUMBER_LINE = "MOET2018-G2-NUM-P025-008";
const G2_ADD_SUB = "MOET2018-G2-NUM-P025-011";
const G2_MENTAL_ROUND = "MOET2018-G2-NUM-P025-012";
const G2_MENTAL_20 = "MOET2018-G2-NUM-P025-013";
const G2_ORDER = "MOET2018-G2-NUM-P025-014";
const G2_TWO_OPS = "MOET2018-G2-NUM-P025-015";
const G2_ESTIMATE_TENS = "MOET2018-G2-NUM-P025-016";
const G2_EXTREME = "MOET2018-G2-NUM-P025-019";
const G2_APPLIED_SHAPES = "MOET2018-G2-GEO-P026-001";
const G2_KG = "MOET2018-G2-GEO-P026-003";
const G2_LITRE = "MOET2018-G2-GEO-P026-005";
const G2_MAKE_SHAPES = "MOET2018-G2-GEO-P026-006";
const G2_SEGMENT = "MOET2018-G2-GEO-P026-009";
const G2_CLOCK = "MOET2018-G2-GEO-P027-010";
const G2_APPLIED_MEASURE = "MOET2018-G2-GEO-P027-011";
const G2_CALENDAR = "MOET2018-G2-GEO-P027-014";
const G2_MONEY = "MOET2018-G2-GEO-P027-015";
const G2_TOOLS = "MOET2018-G2-GEO-P027-016";
const G2_ESTIMATE_MEASURE = "MOET2018-G2-GEO-P027-018";

const G3_CONVERT = "MOET2018-G3-GEO-P032-021";
const G4_CONVERT = "MOET2018-G4-GEO-P038-013";
const G5_DECIMAL_COMPARE = "MOET2018-G5-NUM-P041-011";
const G5_FRACTION_OPS = "MOET2018-G5-NUM-P041-012";
const G5_BOX_MEASURE = "MOET2018-G5-GEO-P044-017";
const G6_INTEGER_OPS = "MOET2018-G6-NAA-P048-026";
const G6_FRACTION_OPS = "MOET2018-G6-NAA-P049-040";
const G7_INVERSE = "MOET2018-G7-NAA-P057-019";
const G1_CLOCK_RECOGNIZE = "MOET2018-G1-GEO-P023-009";
const G1_WEEK = "MOET2018-G1-GEO-P023-010";
const G1_CLOCK_READ = "MOET2018-G1-GEO-P023-014";
const G1_CALENDAR_READ = "MOET2018-G1-GEO-P023-015";
const G1_POSITION_PRACTICE = "MOET2018-G1-EXP-P024-001";
const G1_DAILY_MATH_PRACTICE = "MOET2018-G1-EXP-P024-002";
const G1_MEASURE_TIME_CALENDAR_PRACTICE = "MOET2018-G1-EXP-P024-003";
const G2_MULDIV_COMPONENTS = "MOET2018-G2-NUM-P025-006";
const G2_HEAVIER_LIGHTER = "MOET2018-G2-GEO-P026-004";
const G2_DAY_HOUR = "MOET2018-G2-GEO-P027-013";
const G2_PICTOGRAPH_COMMENT = "MOET2018-G2-STA-P028-003";
const G2_DATA_PRACTICE = "MOET2018-G2-EXP-P028-001";
const G2_MEASUREMENT_SCHEDULE_PRACTICE = "MOET2018-G2-EXP-P028-002";
const G3_READ_WRITE_100K = "MOET2018-G3-NUM-P029-001";
const G3_ROUND_100K = "MOET2018-G3-NUM-P029-002";
const G3_COMPARE_100K = "MOET2018-G3-NUM-P029-003";
const G3_DECIMAL_STRUCTURE = "MOET2018-G3-NUM-P029-004";

const definitions: readonly Definition[] = [
  {
    slug: "grade-1-number-foundations-p0",
    title: "Đếm, sắp thứ tự và tính nhẩm đến 100",
    grade: 1,
    domain: "NUMBERS_AND_OPERATIONS",
    code: "G1-P0-NUM-A",
    officialOutcomeIds: [G1_COUNT, G1_ORDER, G1_MENTAL, G1_TWO_OPS],
    skills: ["G1_P0_COUNT_READ_WRITE", "G1_P0_ORDER_TO_100", "G1_P0_MENTAL_TO_10", "G1_P0_TWO_OPERATIONS"],
    prerequisiteSlugs: [],
    restrictions: ["Số không vượt quá 100.", "Phép tính nhẩm cơ bản không vượt quá 10.", "Hai phép tính được làm từ trái sang phải."],
    visual: "PLACE_VALUE_CHART",
    misconceptions: ["SKIP_NUMBER", "ORDER_DIRECTION", "COUNT_ALL_AGAIN", "IGNORE_LEFT_TO_RIGHT"],
    theory: [
      "Đếm đủ từng vật rồi nối số lượng với cách đọc và cách viết; số cuối cùng cho biết có tất cả bao nhiêu.",
      "Muốn xếp không quá bốn số, so sánh hàng chục trước rồi hàng đơn vị; phải đọc rõ chiều bé đến lớn hay lớn đến bé.",
      "Trong phạm vi 10, có thể tách–gộp để nhẩm cộng và dùng phép cộng liên hệ để nhẩm trừ.",
      "Khi chỉ có cộng và trừ nối tiếp, thực hiện từ trái sang phải và ghi kết quả trung gian để không bỏ sót dấu.",
    ],
    exampleOne: {
      title: "Đếm và xếp số",
      prompt: "Có 24 thẻ. Viết số rồi xếp 24, 19, 31 theo thứ tự bé đến lớn.",
      steps: ["Hai chục và bốn đơn vị viết là 24.", "So sánh hàng chục: 1 chục, 2 chục, 3 chục.", "Thứ tự là 19, 24, 31."],
      answer: "19, 24, 31.",
      officialOutcomeIds: [G1_COUNT, G1_ORDER],
    },
    exampleTwo: {
      title: "Nhẩm và làm từ trái sang phải",
      prompt: "Tính 8 − 3 + 2.",
      steps: ["Tính phép bên trái trước: 8 − 3 = 5.", "Tiếp tục 5 + 2 = 7.", "Kiểm tra bằng cách đếm lùi 3 rồi đếm thêm 2."],
      answer: "7.",
      officialOutcomeIds: [G1_MENTAL, G1_TWO_OPS],
    },
  },
  {
    slug: "grade-1-shape-and-informal-measure-p0",
    title: "Xếp hình và đo bằng đơn vị quen thuộc",
    grade: 1,
    domain: "MEASUREMENT",
    code: "G1-P0-GEO-A",
    officialOutcomeIds: [G1_BUILD_SHAPES, G1_INFORMAL_MEASURE, G1_APPLIED_MEASURE],
    skills: ["G1_P0_COMPOSE_SHAPES", "G1_P0_INFORMAL_LENGTH", "G1_P0_APPLY_LENGTH_TIME_CALENDAR"],
    prerequisiteSlugs: [],
    restrictions: ["Hình và vật dụng quen thuộc.", "Đơn vị tự quy ước phải được giữ không đổi.", "Đồng hồ chỉ giờ đúng; lịch là lịch tờ hằng ngày."],
    visual: "MEASUREMENT_SCALE",
    misconceptions: ["GAP_OR_OVERLAP", "CHANGE_MEASURING_UNIT", "MIX_TIME_AND_LENGTH"],
    theory: [
      "Có thể ghép các tam giác, hình vuông hoặc khối đơn giản; các mảnh phải chạm đúng cạnh, không chồng lên nhau nếu đề không cho phép.",
      "Đo bằng gang tay hay bước chân là đặt cùng một đơn vị liên tiếp từ đầu đến cuối, không để hở và không chồng.",
      "Ước lượng trước khi đo giúp phát hiện kết quả vô lí; cùng một vật phải dùng cùng loại đơn vị khi so sánh.",
      "Trong tình huống thực tế, chọn đúng đại lượng: độ dài cho khoảng cách, đồng hồ cho giờ đúng và lịch cho ngày.",
    ],
    exampleOne: {
      title: "Ghép và đo",
      prompt: "Ghép hai tam giác vuông bằng nhau thành một hình vuông rồi đo cạnh bằng que tính.",
      steps: ["Xoay hai cạnh huyền sát nhau để tạo đường bao hình vuông.", "Đặt que tính liên tiếp dọc một cạnh, không hở.", "Đếm số que và ghi rõ đơn vị que tính."],
      answer: "Một hình vuông; số đo phụ thuộc số que trong hình.",
      officialOutcomeIds: [G1_BUILD_SHAPES, G1_INFORMAL_MEASURE],
    },
    exampleTwo: {
      title: "Chọn công cụ đúng",
      prompt: "Muốn biết hôm nay là ngày nào và lớp bắt đầu lúc mấy giờ, em dùng gì?",
      steps: ["Ngày trong tháng được đọc trên lịch.", "Giờ đúng được đọc trên đồng hồ.", "Không dùng thước vì câu hỏi không hỏi độ dài."],
      answer: "Dùng lịch và đồng hồ.",
      officialOutcomeIds: [G1_APPLIED_MEASURE],
    },
  },
  {
    slug: "grade-2-number-order-and-line-p0",
    title: "Số tròn trăm, tia số và thứ tự đến 1000",
    grade: 2,
    domain: "NUMBERS_AND_OPERATIONS",
    code: "G2-P0-NUM-A",
    officialOutcomeIds: [G2_ROUND_HUNDREDS, G2_COMPARE, G2_NUMBER_LINE, G2_ORDER],
    skills: ["G2_P0_ROUND_HUNDREDS", "G2_P0_COMPARE_TO_1000", "G2_P0_NUMBER_LINE", "G2_P0_ORDER_TO_1000"],
    prerequisiteSlugs: ["grade-1-number-foundations-p0"],
    restrictions: ["Số từ 0 đến 1000.", "Nhóm xếp thứ tự có không quá bốn số.", "Các vạch tia số cách đều theo cùng một bước."],
    visual: "NUMBER_LINE",
    misconceptions: ["HUNDRED_WITH_NONZERO_TAIL", "COMPARE_DIGIT_ONLY", "UNEQUAL_TICK_STEP", "ORDER_DIRECTION"],
    theory: [
      "Số tròn trăm gồm các trăm đầy đủ nên hai chữ số hàng chục và hàng đơn vị đều bằng 0.",
      "So sánh số đến 1000 theo thứ tự hàng trăm, hàng chục, hàng đơn vị; dừng ở hàng khác nhau đầu tiên.",
      "Trên tia số, số tăng đều theo bước giữa hai vạch liên tiếp; muốn đi sang phải thì cộng bước.",
      "Xếp không quá bốn số bằng cách so sánh nhất quán và kiểm tra lại chiều sắp xếp được yêu cầu.",
    ],
    exampleOne: {
      title: "Nhận biết và so sánh",
      prompt: "Trong 300, 305, 350, số nào tròn trăm? So sánh 305 và 350.",
      steps: ["300 có hàng chục và đơn vị đều là 0.", "Hai số 305 và 350 cùng 3 trăm.", "So sánh hàng chục: 0 < 5 nên 305 < 350."],
      answer: "300 tròn trăm; 305 < 350.",
      officialOutcomeIds: [G2_ROUND_HUNDREDS, G2_COMPARE],
    },
    exampleTwo: {
      title: "Điền tia số rồi xếp",
      prompt: "Tia số có 120, 130, □, 150. Điền ô rồi xếp 150, 120, 140.",
      steps: ["Mỗi vạch tăng 10 nên ô trống là 140.", "So sánh theo hàng trăm rồi hàng chục.", "Thứ tự bé đến lớn: 120, 140, 150."],
      answer: "140; 120, 140, 150.",
      officialOutcomeIds: [G2_NUMBER_LINE, G2_ORDER],
    },
  },
  {
    slug: "grade-2-addition-subtraction-fluency-p0",
    title: "Thành phần và tính cộng, trừ lớp 2",
    grade: 2,
    domain: "NUMBERS_AND_OPERATIONS",
    code: "G2-P0-NUM-B",
    officialOutcomeIds: [G2_COMPONENTS, G2_ADD_SUB, G2_MENTAL_ROUND, G2_MENTAL_20],
    skills: ["G2_P0_OPERATION_COMPONENTS", "G2_P0_ADD_SUB_TO_1000", "G2_P0_MENTAL_ROUND_NUMBERS", "G2_P0_MENTAL_TO_20"],
    prerequisiteSlugs: ["grade-1-number-foundations-p0"],
    restrictions: ["Phạm vi 1000; có nhớ hoặc mượn không quá một lượt.", "Tính nhẩm tròn chục/trăm không vượt 1000.", "Tính nhẩm cơ bản không vượt 20."],
    visual: "PLACE_VALUE_CHART",
    misconceptions: ["COMPONENT_NAME_SWAP", "MISALIGNED_PLACE_VALUE", "TREAT_TENS_AS_ONES", "INVERSE_FACT_IGNORED"],
    theory: [
      "Trong a + b = c, a và b là số hạng, c là tổng; trong a − b = c, a là số bị trừ, b là số trừ, c là hiệu.",
      "Cộng trừ đến 1000 phải đặt thẳng hàng; nếu cần, chỉ đổi một chục thành mười đơn vị hoặc mười đơn vị thành một chục theo phạm vi bài.",
      "Với số tròn chục, tròn trăm, tính số chục hoặc số trăm trước rồi gắn lại giá trị hàng.",
      "Các phép cộng và trừ trong phạm vi 20 liên hệ theo cùng một bộ ba số, giúp nhẩm và kiểm tra bằng phép tính ngược.",
    ],
    exampleOne: {
      title: "Gọi tên và đặt tính",
      prompt: "Tính 247 + 135 và gọi tên kết quả.",
      steps: ["247 và 135 là hai số hạng; kết quả gọi là tổng.", "Đặt thẳng cột và cộng: 247 + 135 = 382.", "Kiểm tra 382 − 135 = 247."],
      answer: "Tổng là 382.",
      officialOutcomeIds: [G2_COMPONENTS, G2_ADD_SUB],
    },
    exampleTwo: {
      title: "Nhẩm theo giá trị hàng",
      prompt: "Tính nhẩm 300 + 400 và 13 − 7.",
      steps: ["3 trăm + 4 trăm = 7 trăm nên 300 + 400 = 700.", "Vì 7 + 6 = 13 nên 13 − 7 = 6.", "Ước lượng để kiểm tra: 700 là số tròn trăm và 6 nhỏ hơn 13."],
      answer: "700 và 6.",
      officialOutcomeIds: [G2_MENTAL_ROUND, G2_MENTAL_20],
    },
  },
  {
    slug: "grade-2-calculation-strategies-p0",
    title: "Chuỗi tính, ước lượng và chọn số",
    grade: 2,
    domain: "NUMBERS_AND_OPERATIONS",
    code: "G2-P0-NUM-C",
    officialOutcomeIds: [G2_TWO_OPS, G2_ESTIMATE_TENS, G2_EXTREME],
    skills: ["G2_P0_TWO_OPERATIONS", "G2_P0_ESTIMATE_BY_TENS", "G2_P0_FIND_EXTREME"],
    prerequisiteSlugs: ["grade-1-number-foundations-p0"],
    restrictions: ["Chuỗi chỉ có cộng và trừ.", "Ước lượng theo nhóm một chục.", "Nhóm chọn lớn nhất/nhỏ nhất có không quá bốn số đến 1000."],
    visual: "COUNTER_ROW",
    misconceptions: ["IGNORE_LEFT_TO_RIGHT", "COUNT_EVERY_OBJECT_WHEN_ESTIMATING", "CHOOSE_BY_LAST_DIGIT"],
    theory: [
      "Chuỗi cộng trừ được làm từ trái sang phải; kết quả của bước trước trở thành số đầu của bước sau.",
      "Ước lượng theo chục bằng cách nhìn các nhóm khoảng mười vật, không cần đếm từng vật như khi tìm số chính xác.",
      "Muốn tìm số lớn nhất hoặc nhỏ nhất, so sánh hàng trăm trước rồi đến hàng chục và hàng đơn vị.",
      "Sau mỗi cách làm, kiểm tra tính hợp lí: ước lượng phải gần số thật và số lớn nhất không thể bé hơn một số trong nhóm.",
    ],
    exampleOne: {
      title: "Tính hai bước",
      prompt: "Tính 35 + 20 − 15.",
      steps: ["Làm từ trái sang phải: 35 + 20 = 55.", "Tiếp tục 55 − 15 = 40.", "Không tính 20 − 15 trước vì biểu thức chỉ có cộng và trừ."],
      answer: "40.",
      officialOutcomeIds: [G2_TWO_OPS],
    },
    exampleTwo: {
      title: "Ước lượng rồi chọn",
      prompt: "Một khay có khoảng 4 nhóm mười thẻ. Trong 36, 41, 28, số nào gần ước lượng và lớn nhất?",
      steps: ["4 nhóm mười là khoảng 40.", "41 gần 40 hơn 36 và 28.", "So sánh hàng chục cũng cho 41 là số lớn nhất."],
      answer: "41.",
      officialOutcomeIds: [G2_ESTIMATE_TENS, G2_EXTREME],
    },
  },
  {
    slug: "grade-2-shape-construction-p0",
    title: "Tạo hình và vẽ đoạn thẳng",
    grade: 2,
    domain: "GEOMETRY",
    code: "G2-P0-GEO-A",
    officialOutcomeIds: [G2_APPLIED_SHAPES, G2_MAKE_SHAPES, G2_SEGMENT],
    skills: ["G2_P0_APPLY_SHAPES", "G2_P0_FOLD_CUT_COMPOSE", "G2_P0_DRAW_SEGMENT"],
    prerequisiteSlugs: [],
    restrictions: ["Chỉ dùng hình phẳng và hình khối đã học.", "Mô tả thao tác an toàn với vật thật.", "Độ dài đoạn thẳng tính bằng cm."],
    visual: "SHAPE_SCENE",
    misconceptions: ["SHAPE_NAME_BY_ORIENTATION", "OVERLAP_PIECES", "START_RULER_AT_ONE"],
    theory: [
      "Nhận hình bằng đặc điểm cạnh, góc hoặc mặt chứ không dựa vào việc hình đang xoay theo hướng nào.",
      "Khi gấp, cắt, ghép hoặc xếp, dự đoán hình mới rồi kiểm tra các cạnh có khít và các mảnh có chồng lên nhau không.",
      "Vẽ đoạn thẳng dài cho trước bằng cách đặt vạch 0 của thước tại đầu thứ nhất, đánh dấu độ dài rồi nối hai điểm.",
      "Trong bài thực tế, chọn hình phù hợp với vật và giải thích bằng đặc điểm, không chỉ vì trông gần giống.",
    ],
    exampleOne: {
      title: "Ghép hình có lí do",
      prompt: "Dùng hai hình vuông bằng nhau ghép thành một hình chữ nhật.",
      steps: ["Đặt hai hình vuông cạnh nhau.", "Cho một cạnh của hai hình trùng khít, không chồng.", "Đường bao mới có hai cạnh dài và hai cạnh ngắn nên là hình chữ nhật."],
      answer: "Ghép sát một cạnh để được hình chữ nhật.",
      officialOutcomeIds: [G2_APPLIED_SHAPES, G2_MAKE_SHAPES],
    },
    exampleTwo: {
      title: "Vẽ đúng 6 cm",
      prompt: "Vẽ đoạn thẳng AB dài 6 cm.",
      steps: ["Đặt A tại vạch 0 cm.", "Đánh dấu B tại vạch 6 cm.", "Nối A với B và kiểm tra lại khoảng từ 0 đến 6."],
      answer: "AB = 6 cm.",
      officialOutcomeIds: [G2_SEGMENT],
    },
  },
  {
    slug: "grade-2-mass-capacity-tools-p0",
    title: "Ki-lô-gam, lít và dụng cụ đo",
    grade: 2,
    domain: "MEASUREMENT",
    code: "G2-P0-MEA-A",
    officialOutcomeIds: [G2_KG, G2_LITRE, G2_TOOLS],
    skills: ["G2_P0_KILOGRAM", "G2_P0_LITRE", "G2_P0_MEASURING_TOOLS"],
    prerequisiteSlugs: ["grade-1-shape-and-informal-measure-p0"],
    restrictions: ["Số đo từ 0 đến 1000 kg hoặc l.", "Chọn cân cho khối lượng, bình chia/can cho dung tích và thước cho độ dài."],
    visual: "MEASUREMENT_SCALE",
    misconceptions: ["MASS_CAPACITY_CONFUSION", "UNIT_OMITTED", "WRONG_MEASURING_TOOL"],
    theory: [
      "Ki-lô-gam (kg) đo khối lượng; số đo phải được đọc và viết kèm kg.",
      "Lít (l) đo dung tích chất lỏng; không dùng lít để nói vật nặng bao nhiêu.",
      "Chọn cân để cân, thước chia vạch để đo độ dài và bình hoặc can có vạch để đong dung tích.",
      "Đặt dụng cụ đúng điểm bắt đầu, đọc ngang tầm mắt khi cần và luôn kiểm tra đơn vị trước khi kết luận.",
    ],
    exampleOne: {
      title: "Phân biệt kg và l",
      prompt: "Bao gạo ghi 5 kg, can nước ghi 5 l. Hai số 5 nói về gì?",
      steps: ["5 kg là khối lượng của bao gạo.", "5 l là dung tích của can nước.", "Cùng số 5 nhưng khác đại lượng nên không đổi chỗ đơn vị."],
      answer: "5 kg đo khối lượng; 5 l đo dung tích.",
      officialOutcomeIds: [G2_KG, G2_LITRE],
    },
    exampleTwo: {
      title: "Chọn dụng cụ",
      prompt: "Muốn biết quả bí nặng bao nhiêu ki-lô-gam, dùng dụng cụ nào?",
      steps: ["Câu hỏi hỏi khối lượng.", "Dụng cụ đo khối lượng là cân.", "Đọc số trên cân và ghi đơn vị kg."],
      answer: "Dùng cân.",
      officialOutcomeIds: [G2_TOOLS],
    },
  },
  {
    slug: "grade-2-time-calendar-money-p0",
    title: "Đồng hồ, lịch tháng và tiền Việt Nam",
    grade: 2,
    domain: "MEASUREMENT",
    code: "G2-P0-MEA-B",
    officialOutcomeIds: [G2_CLOCK, G2_CALENDAR, G2_MONEY],
    skills: ["G2_P0_QUARTER_HALF_HOUR", "G2_P0_CALENDAR_MONTH", "G2_P0_VIETNAMESE_MONEY"],
    prerequisiteSlugs: ["grade-1-shape-and-informal-measure-p0"],
    restrictions: ["Kim phút chỉ số 3 hoặc số 6.", "Dùng tháng và ngày cụ thể hợp lệ.", "Chỉ nhận biết tờ tiền qua mệnh giá được nêu rõ."],
    visual: "DATA_DISPLAY",
    misconceptions: ["MINUTE_HAND_AS_HOUR_HAND", "INVALID_CALENDAR_DATE", "MONEY_VALUE_BY_NOTE_SIZE"],
    theory: [
      "Kim phút chỉ số 3 là 15 phút, đọc là giờ hơn 15 phút; chỉ số 6 là 30 phút, đọc là giờ rưỡi.",
      "Mỗi tháng có số ngày xác định; khi đọc ngày phải kiểm tra ngày đó có tồn tại trong tháng.",
      "Mệnh giá tiền Việt Nam được đọc từ số và chữ trên tờ tiền, không suy ra chỉ từ màu hoặc kích thước.",
      "Trong tình huống mua bán hay lập lịch, ghi đủ đơn vị giờ, ngày/tháng hoặc đồng và kiểm tra kết quả có ý nghĩa.",
    ],
    exampleOne: {
      title: "Đọc giờ và ngày",
      prompt: "Kim giờ qua số 7, kim phút chỉ số 6. Ngày 31 tháng 4 có hợp lệ không?",
      steps: ["Kim phút ở số 6 là 30 phút nên đồng hồ chỉ 7 giờ 30 phút.", "Tháng 4 có 30 ngày.", "Vì vậy ngày 31 tháng 4 không tồn tại."],
      answer: "7 giờ 30 phút; ngày 31 tháng 4 không hợp lệ.",
      officialOutcomeIds: [G2_CLOCK, G2_CALENDAR],
    },
    exampleTwo: {
      title: "Đọc mệnh giá",
      prompt: "Tờ tiền có in 20 000 đồng. Mệnh giá là bao nhiêu?",
      steps: ["Đọc dãy số in trên tờ tiền.", "20 000 được đọc là hai mươi nghìn.", "Ghi đủ đơn vị đồng."],
      answer: "20 000 đồng.",
      officialOutcomeIds: [G2_MONEY],
    },
  },
  {
    slug: "grade-2-applied-measurement-p0",
    title: "Giải quyết và ước lượng bài toán đo lường",
    grade: 2,
    domain: "APPLIED_PROBLEM_SOLVING",
    code: "G2-P0-APP-A",
    officialOutcomeIds: [G2_APPLIED_MEASURE, G2_ESTIMATE_MEASURE],
    skills: ["G2_P0_SOLVE_MEASUREMENT", "G2_P0_ESTIMATE_MEASUREMENT", "G2_P0_REASONABLENESS_CHECK"],
    prerequisiteSlugs: ["grade-1-shape-and-informal-measure-p0"],
    restrictions: ["Dữ kiện đầy đủ và cùng đại lượng.", "Ước lượng gắn với vật quen thuộc.", "Kết quả phải có đơn vị và kiểm tra hợp lí."],
    visual: "MEASUREMENT_SCALE",
    misconceptions: ["ADD_UNLIKE_UNITS", "UNREASONABLE_ESTIMATE", "ANSWER_WITHOUT_UNIT"],
    theory: [
      "Đọc tình huống để xác định đại lượng, dữ kiện, câu hỏi và đơn vị trước khi chọn phép tính.",
      "Ước lượng bằng mốc quen thuộc: cửa lớp khoảng vài mét, bút khoảng vài chục xăng-ti-mét, không chọn mốc sai cỡ.",
      "Chỉ cộng hoặc trừ các số đo cùng đại lượng và cùng đơn vị; câu trả lời phải ghi đơn vị.",
      "Kiểm tra bằng ước lượng và ngữ cảnh: kết quả phải dương, đúng cỡ và trả lời đúng điều được hỏi.",
    ],
    theoryOutcomeGroups: [
      [G2_APPLIED_MEASURE],
      [G2_ESTIMATE_MEASURE],
      [G2_APPLIED_MEASURE],
      [G2_APPLIED_MEASURE, G2_ESTIMATE_MEASURE],
    ],
    exampleOne: {
      title: "Bài toán có đơn vị",
      prompt: "Can có 12 l nước, rót thêm 5 l. Can có bao nhiêu lít?",
      steps: ["Hai dữ kiện cùng đo dung tích bằng lít.", "Từ “thêm” chọn phép cộng: 12 + 5 = 17.", "Kết luận can có 17 l nước và kiểm tra 17 > 12."],
      answer: "17 l.",
      officialOutcomeIds: [G2_APPLIED_MEASURE],
    },
    exampleTwo: {
      title: "Ước lượng hợp lí",
      prompt: "Cửa lớp cao gần 2 cm, 2 m hay 20 m?",
      steps: ["2 cm chỉ bằng bề rộng vài ngón tay nên quá thấp.", "20 m cao gần một tòa nhà nhiều tầng nên quá cao.", "2 m phù hợp chiều cao cửa ra vào."],
      answer: "Khoảng 2 m.",
      officialOutcomeIds: [G2_ESTIMATE_MEASURE],
    },
  },
  {
    slug: "grade-3-measurement-conversions-p0",
    title: "Đổi và tính với số đo lớp 3",
    grade: 3,
    domain: "MEASUREMENT",
    code: "G3-P0-MEA-A",
    officialOutcomeIds: [G3_CONVERT],
    skills: ["G3_P0_CONVERT_LENGTH_MASS", "G3_P0_CONVERT_TIME_CAPACITY", "G3_P0_CALCULATE_MEASURES"],
    prerequisiteSlugs: ["grade-2-applied-measurement-p0"],
    restrictions: ["Chỉ dùng các đơn vị lớp 3: mm, cm, dm, m, km; cm²; g, kg; ml, l; thời gian và tiền đã học.", "Đổi về cùng đơn vị trước khi tính."],
    visual: "MEASUREMENT_SCALE",
    misconceptions: ["CONVERSION_DIRECTION", "MIX_LINEAR_AND_SQUARE_UNITS", "CALCULATE_BEFORE_CONVERT"],
    theory: [
      "Mỗi quan hệ đổi đơn vị phải được viết rõ, chẳng hạn 1 m = 10 dm = 100 cm và 1 kg = 1000 g.",
      "Dung tích dùng ml, l; thời gian dùng phút, giờ, ngày, tuần, tháng, năm; tiền dùng đúng đơn vị đồng.",
      "Trước khi cộng, trừ hoặc so sánh, đổi các số đo về cùng một đơn vị rồi mới tính.",
      "Diện tích cm² là đơn vị vuông, không được đổi như độ dài cm; luôn kiểm tra loại đại lượng và độ lớn kết quả.",
    ],
    exampleOne: {
      title: "Đổi rồi cộng",
      prompt: "Tính 2 m 30 cm + 70 cm.",
      steps: ["Đổi 2 m 30 cm = 230 cm.", "Cộng 230 + 70 = 300 cm.", "Đổi lại 300 cm = 3 m."],
      answer: "3 m.",
      officialOutcomeIds: [G3_CONVERT],
    },
    exampleTwo: {
      title: "Tính thời gian",
      prompt: "Một hoạt động kéo dài 1 giờ 20 phút, thêm 40 phút. Tổng thời gian?",
      steps: ["Đổi 1 giờ 20 phút = 80 phút.", "Cộng 80 + 40 = 120 phút.", "Đổi 120 phút = 2 giờ."],
      answer: "2 giờ.",
      officialOutcomeIds: [G3_CONVERT],
    },
  },
  {
    slug: "grade-4-measurement-conversions-p0",
    title: "Đổi và tính với số đo lớp 4",
    grade: 4,
    domain: "MEASUREMENT",
    code: "G4-P0-MEA-A",
    officialOutcomeIds: [G4_CONVERT],
    skills: ["G4_P0_CONVERT_LENGTH_AREA", "G4_P0_CONVERT_MASS_TIME", "G4_P0_CALCULATE_MEASURES"],
    prerequisiteSlugs: ["grade-3-measurement-conversions-p0"],
    restrictions: ["Dùng đúng các đơn vị lớp 4, gồm yến, tạ, tấn và thế kỉ.", "Phân biệt hệ số đổi độ dài và diện tích."],
    visual: "AREA_MODEL",
    misconceptions: ["AREA_CONVERSION_AS_LENGTH", "MASS_UNIT_ORDER", "CENTURY_YEAR_CONFUSION"],
    theory: [
      "Độ dài đổi theo quan hệ giữa mm, cm, dm, m, km; diện tích đổi theo đơn vị vuông nên mỗi bước liền kề nhân hoặc chia 100.",
      "Khối lượng có 1 yến = 10 kg, 1 tạ = 100 kg, 1 tấn = 1000 kg; phải xác định chiều đổi trước.",
      "Thời gian gồm giây, phút, giờ, ngày, tuần, tháng, năm, thế kỉ; 1 thế kỉ = 100 năm nhưng tháng không có cùng số ngày.",
      "Khi tính nhiều số đo, đưa về cùng đơn vị, thực hiện phép tính rồi đổi kết quả sang đơn vị hợp lí và kiểm tra cỡ.",
    ],
    exampleOne: {
      title: "Đổi diện tích",
      prompt: "Đổi 3 m² thành dm².",
      steps: ["1 m = 10 dm.", "Đơn vị vuông nên 1 m² = 100 dm².", "Vậy 3 m² = 300 dm²."],
      answer: "300 dm².",
      officialOutcomeIds: [G4_CONVERT],
    },
    exampleTwo: {
      title: "Tính khối lượng",
      prompt: "2 tạ 30 kg cộng 70 kg bằng bao nhiêu tạ?",
      steps: ["2 tạ 30 kg = 230 kg.", "Cộng 230 + 70 = 300 kg.", "300 kg = 3 tạ."],
      answer: "3 tạ.",
      officialOutcomeIds: [G4_CONVERT],
    },
  },
  {
    slug: "grade-5-core-operations-measurement-p0",
    title: "So sánh thập phân, tính phân số và đo hình hộp",
    grade: 5,
    domain: "NUMBERS_AND_OPERATIONS",
    code: "G5-P0-CORE-A",
    officialOutcomeIds: [G5_DECIMAL_COMPARE, G5_FRACTION_OPS, G5_BOX_MEASURE],
    skills: ["G5_P0_COMPARE_DECIMALS", "G5_P0_FRACTION_OPERATIONS", "G5_P0_BOX_SURFACE_VOLUME"],
    prerequisiteSlugs: ["grade-4-measurement-conversions-p0"],
    restrictions: ["Số thập phân không âm.", "Mẫu số khác 0; cộng trừ chỉ khi một mẫu chia hết cho mẫu còn lại.", "Kích thước hình hộp dương và cùng đơn vị."],
    visual: "AREA_MODEL",
    misconceptions: ["COMPARE_DECIMAL_LENGTH", "ADD_FRACTION_DENOMINATORS", "SURFACE_VOLUME_UNIT_SWAP"],
    theory: [
      "So sánh hai số thập phân bằng phần nguyên rồi từng hàng thập phân; thêm số 0 tận cùng không đổi giá trị.",
      "Cộng trừ phân số phải quy đồng; nhân tử với tử, mẫu với mẫu; chia bằng nhân với phân số nghịch đảo và mẫu luôn khác 0.",
      "Hình hộp chữ nhật có diện tích xung quanh 2(a+b)h, toàn phần 2(ab+ah+bh), thể tích abh; hình lập phương là trường hợp a=b=h.",
      "Kiểm tra dấu, độ lớn và đơn vị: diện tích dùng đơn vị vuông, thể tích dùng đơn vị khối; không suy ra kích thước từ hình không theo tỉ lệ.",
    ],
    exampleOne: {
      title: "So sánh và tính phân số",
      prompt: "So sánh 3,4 và 3,35; tính 1/3 + 1/6.",
      steps: ["Viết 3,4 = 3,40 nên 3,40 > 3,35.", "Quy đồng 1/3 = 2/6.", "2/6 + 1/6 = 3/6 = 1/2."],
      answer: "3,4 > 3,35; 1/2.",
      officialOutcomeIds: [G5_DECIMAL_COMPARE, G5_FRACTION_OPS],
    },
    exampleTwo: {
      title: "Hình hộp chữ nhật",
      prompt: "Hộp dài 4 cm, rộng 3 cm, cao 2 cm. Tính diện tích toàn phần và thể tích.",
      steps: ["Diện tích toàn phần = 2 × (4×3 + 4×2 + 3×2) = 52 cm².", "Thể tích = 4 × 3 × 2 = 24 cm³.", "Đối chiếu đơn vị vuông cho diện tích và đơn vị khối cho thể tích."],
      answer: "52 cm² và 24 cm³.",
      officialOutcomeIds: [G5_BOX_MEASURE],
    },
  },
  {
    slug: "grade-6-integer-fraction-operations-p0",
    title: "Bốn phép tính với số nguyên và phân số",
    grade: 6,
    domain: "NUMBERS_AND_OPERATIONS",
    code: "G6-P0-NAA-A",
    officialOutcomeIds: [G6_INTEGER_OPS, G6_FRACTION_OPS],
    skills: ["G6_P0_INTEGER_FOUR_OPERATIONS", "G6_P0_FRACTION_FOUR_OPERATIONS", "G6_P0_OPERATION_REASONABLENESS"],
    prerequisiteSlugs: ["grade-5-core-operations-measurement-p0"],
    restrictions: ["Phép chia số nguyên phải chia hết và số chia khác 0.", "Mẫu số phân số và số bị chia nghịch đảo khác 0.", "Tuân thủ thứ tự phép tính."],
    visual: "NUMBER_LINE",
    misconceptions: ["INTEGER_SIGN_RULE", "DIVISION_BY_ZERO", "FRACTION_DIVIDE_WITHOUT_RECIPROCAL"],
    theory: [
      "Cộng trừ số nguyên dựa vào dấu và khoảng cách trên trục số; trừ một số là cộng số đối của nó.",
      "Nhân hoặc chia hai số nguyên cùng dấu cho kết quả dương, khác dấu cho kết quả âm; không bao giờ chia cho 0.",
      "Phân số cộng trừ cần mẫu chung, nhân theo tử–tử mẫu–mẫu, chia bằng nhân nghịch đảo; rút gọn khi có thể.",
      "Ước lượng dấu và độ lớn trước, thực hiện nhân chia trước cộng trừ, rồi thay hoặc tính ngược để kiểm tra.",
    ],
    exampleOne: {
      title: "Số nguyên đủ bốn phép",
      prompt: "Tính (−12) ÷ 3 + 5.",
      steps: ["Chia trước: (−12) ÷ 3 = −4 vì khác dấu.", "Cộng −4 + 5 = 1.", "Kiểm tra phép chia: 3 × (−4) = −12."],
      answer: "1.",
      officialOutcomeIds: [G6_INTEGER_OPS],
    },
    exampleTwo: {
      title: "Chia phân số",
      prompt: "Tính 3/4 ÷ 2/5.",
      steps: ["2/5 khác 0 nên phép chia xác định.", "Nhân 3/4 với nghịch đảo 5/2 được 15/8.", "15/8 đã tối giản; dấu và độ lớn phù hợp vì chia cho số nhỏ hơn 1 làm kết quả tăng."],
      answer: "15/8.",
      officialOutcomeIds: [G6_FRACTION_OPS],
    },
  },
  {
    slug: "grade-7-inverse-proportion-p0",
    title: "Bài toán đại lượng tỉ lệ nghịch",
    grade: 7,
    domain: "ALGEBRA_AND_PREALGEBRA",
    code: "G7-P0-NAA-A",
    officialOutcomeIds: [G7_INVERSE],
    skills: ["G7_P0_IDENTIFY_INVERSE", "G7_P0_SOLVE_INVERSE", "G7_P0_CHECK_INVERSE_CONTEXT"],
    prerequisiteSlugs: ["grade-6-integer-fraction-operations-p0"],
    restrictions: ["Hai đại lượng dương trong tình huống.", "Tích hai giá trị tương ứng không đổi.", "Không dùng mô hình tỉ lệ nghịch khi tổng khối lượng công việc thay đổi."],
    visual: "RATIO_TABLE",
    misconceptions: ["TREAT_INVERSE_AS_DIRECT", "CHANGE_TOTAL_WORK", "UNREASONABLE_CONTEXT_RESULT"],
    theory: [
      "Hai đại lượng tỉ lệ nghịch khi một đại lượng tăng bao nhiêu lần thì đại lượng kia giảm bấy nhiêu lần và tích tương ứng không đổi.",
      "Trong bài năng suất–thời gian với cùng khối lượng công việc, số người hoặc năng suất nhân thời gian là một hằng số.",
      "Lập bảng cặp giá trị, viết x₁y₁ = x₂y₂ rồi giải; mọi đại lượng trong tích phải cùng cách đo.",
      "Kiểm tra ngữ cảnh: nhiều người hơn phải cần ít thời gian hơn; nghiệm phải dương và hợp lí với điều kiện thực tế.",
    ],
    exampleOne: {
      title: "Năng suất và thời gian",
      prompt: "4 người làm một việc trong 6 giờ. Cùng năng suất, 8 người cần bao lâu?",
      steps: ["Khối lượng việc không đổi nên số người và thời gian tỉ lệ nghịch.", "Lập 4 × 6 = 8 × t.", "t = 24 ÷ 8 = 3 giờ; nhiều người hơn nên thời gian giảm là hợp lí."],
      answer: "3 giờ.",
      officialOutcomeIds: [G7_INVERSE],
    },
    exampleTwo: {
      title: "Phát hiện mô hình sai",
      prompt: "Một bạn nói 8 người sẽ cần 12 giờ vì số người gấp đôi. Sai ở đâu?",
      steps: ["Bạn đã dùng tỉ lệ thuận cho thời gian.", "Với cùng công việc, tích người × giờ phải không đổi.", "4 × 6 = 24 nhưng 8 × 12 = 96 nên kết luận 12 giờ sai."],
      answer: "Phải dùng tỉ lệ nghịch; thời gian đúng là 3 giờ.",
      officialOutcomeIds: [G7_INVERSE],
    },
  },
] as const;

const grade1P1Definitions: readonly Definition[] = [
  {
    slug: "grade-1-clock-week-calendar-p1",
    title: "Giờ đúng, tuần lễ và lịch hằng ngày",
    grade: 1,
    domain: "MEASUREMENT",
    code: "G1-P1-TIME-A",
    officialOutcomeIds: [
      G1_CLOCK_RECOGNIZE,
      G1_CLOCK_READ,
      G1_WEEK,
      G1_CALENDAR_READ,
    ],
    skills: [
      "G1_P1_RECOGNIZE_EXACT_HOUR",
      "G1_P1_READ_EXACT_HOUR",
      "G1_P1_WEEK_ORDER",
      "G1_P1_READ_DAILY_CALENDAR",
    ],
    prerequisiteSlugs: [],
    restrictions: [
      "Đồng hồ chỉ giờ đúng: kim phút ở số 12.",
      "Tuần có đúng 7 ngày theo thứ tự thông dụng.",
      "Lịch là lịch tờ hằng ngày với đủ thứ, ngày và tháng.",
    ],
    visual: "DATA_DISPLAY",
    misconceptions: [
      "CLOCK_HAND_SWAP",
      "EXACT_HOUR_WITH_MINUTES",
      "WEEK_ORDER",
      "CALENDAR_FIELD_SWAP",
    ],
    theory: [
      "Giờ đúng được nhận biết khi kim phút chỉ số 12; kim giờ chỉ số nào thì đọc số giờ đó.",
      "Khi đọc đồng hồ, nhìn kim phút trước để xác nhận đúng giờ rồi đọc kim giờ; không đổi vai trò hai kim.",
      "Một tuần có bảy ngày; tên và thứ tự các ngày lặp lại sau mỗi bảy ngày.",
      "Trên lịch tờ hằng ngày, đọc riêng thứ, ngày và tháng rồi ghép thành một thông tin đầy đủ.",
    ],
    exampleOne: {
      title: "Nhận biết và đọc giờ đúng",
      prompt: "Kim phút chỉ 12, kim giờ chỉ 8. Đồng hồ có chỉ giờ đúng không và đọc thế nào?",
      steps: [
        "Kim phút ở số 12 nên đây là giờ đúng.",
        "Kim giờ chỉ số 8.",
        "Đọc là 8 giờ đúng.",
      ],
      answer: "Có; 8 giờ đúng.",
      officialOutcomeIds: [G1_CLOCK_RECOGNIZE, G1_CLOCK_READ],
    },
    exampleTwo: {
      title: "Đọc tuần và lịch",
      prompt: "Tờ lịch ghi Thứ Ba, ngày 12 tháng 5. Ngày liền sau là thứ mấy, ngày nào?",
      steps: [
        "Sau Thứ Ba là Thứ Tư trong thứ tự bảy ngày.",
        "Ngày liền sau ngày 12 là ngày 13.",
        "Kết luận: Thứ Tư, ngày 13 tháng 5.",
      ],
      answer: "Thứ Tư, ngày 13 tháng 5.",
      officialOutcomeIds: [G1_WEEK, G1_CALENDAR_READ],
    },
  },
  {
    slug: "grade-1-practical-mathematics-p1",
    title: "Thực hành toán học trong lớp học",
    grade: 1,
    domain: "APPLIED_PROBLEM_SOLVING",
    code: "G1-P1-EXP-A",
    officialOutcomeIds: [
      G1_POSITION_PRACTICE,
      G1_DAILY_MATH_PRACTICE,
      G1_MEASURE_TIME_CALENDAR_PRACTICE,
    ],
    skills: [
      "G1_P1_POSITION_ORIENTATION",
      "G1_P1_DAILY_COUNT_CALCULATE",
      "G1_P1_CM_TIME_CALENDAR_PRACTICE",
    ],
    prerequisiteSlugs: [],
    restrictions: [
      "Tình huống quen thuộc, dữ kiện đầy đủ và số không vượt quá 100.",
      "Vị trí được mô tả theo mốc nhìn nêu rõ.",
      "Đo xăng-ti-mét bắt đầu ở vạch 0; giờ chỉ giờ đúng.",
    ],
    visual: "MEASUREMENT_SCALE",
    misconceptions: [
      "POSITION_WITHOUT_REFERENCE",
      "COUNT_OBJECT_TWICE",
      "START_RULER_AT_ONE",
    ],
    theory: [
      "Mô tả vị trí phải nêu vật làm mốc: trên/dưới bàn, trước/sau ghế, cao hơn/thấp hơn vật so sánh.",
      "Trong lớp học, đếm mỗi vật đúng một lần, ghi số rồi chọn cộng hoặc trừ theo hành động thêm/bớt.",
      "Đo bằng cm bằng cách đặt vạch 0 tại đầu vật; ước lượng trước giúp phát hiện kết quả sai cỡ.",
      "Một nhiệm vụ thực hành có thể cần đo, đọc giờ đúng và xem lịch; phải dùng đúng công cụ và ghi đủ đơn vị.",
    ],
    exampleOne: {
      title: "Vị trí và đếm trong lớp",
      prompt: "Hộp bút ở trên bàn. Có 6 quyển sách, thêm 2 quyển. Hãy mô tả vị trí và tìm tổng.",
      steps: [
        "Lấy bàn làm mốc: hộp bút ở trên bàn.",
        "Từ “thêm” chọn phép cộng 6 + 2.",
        "Có tất cả 8 quyển sách.",
      ],
      answer: "Hộp bút ở trên bàn; có 8 quyển sách.",
      officialOutcomeIds: [G1_POSITION_PRACTICE, G1_DAILY_MATH_PRACTICE],
    },
    exampleTwo: {
      title: "Đo, giờ và lịch",
      prompt: "Bút dài từ vạch 0 đến vạch 12 cm; đồng hồ chỉ 9 giờ đúng; lịch ghi ngày 5 tháng 9.",
      steps: [
        "Độ dài bút là 12 − 0 = 12 cm.",
        "Kim phút ở 12 và kim giờ ở 9 nên đọc 9 giờ đúng.",
        "Đọc lịch là ngày 5 tháng 9.",
      ],
      answer: "12 cm; 9 giờ đúng; ngày 5 tháng 9.",
      officialOutcomeIds: [G1_MEASURE_TIME_CALENDAR_PRACTICE],
    },
  },
] as const;

const grade2P1Definitions: readonly Definition[] = [
  {
    slug: "grade-2-multiplication-division-components-p1",
    title: "Thành phần của phép nhân và phép chia",
    grade: 2,
    domain: "NUMBERS_AND_OPERATIONS",
    code: "G2-P1-NUM-A",
    officialOutcomeIds: [G2_MULDIV_COMPONENTS],
    skills: [
      "G2_P1_NAME_MULTIPLICATION_PARTS",
      "G2_P1_NAME_DIVISION_PARTS",
      "G2_P1_RELATE_MULTIPLICATION_DIVISION",
    ],
    prerequisiteSlugs: ["grade-1-number-foundations-p0"],
    restrictions: [
      "Số tự nhiên nhỏ và phép chia hết.",
      "Số chia khác 0.",
      "Tên thành phần gắn với vị trí trong phép tính.",
    ],
    visual: "COUNTER_ROW",
    misconceptions: [
      "FACTOR_PRODUCT_SWAP",
      "DIVIDEND_DIVISOR_SWAP",
      "DIVISION_BY_ZERO",
    ],
    theory: [
      "Trong a × b = c, a và b là các thừa số, c là tích.",
      "Trong a : b = c, a là số bị chia, b là số chia và c là thương; số chia phải khác 0.",
      "Một phép nhân đúng tạo hai phép chia liên hệ khi dùng cùng ba số và phép chia là chia hết.",
      "Muốn gọi tên đúng, đọc dấu phép tính rồi xác định vị trí của từng số trước và sau dấu bằng.",
    ],
    exampleOne: {
      title: "Tên trong phép nhân",
      prompt: "Trong 4 × 3 = 12, gọi tên 4, 3 và 12.",
      steps: [
        "Dấu × cho biết đây là phép nhân.",
        "4 và 3 đứng trước dấu bằng nên là hai thừa số.",
        "12 là kết quả nên gọi là tích.",
      ],
      answer: "4 và 3 là thừa số; 12 là tích.",
      officialOutcomeIds: [G2_MULDIV_COMPONENTS],
    },
    exampleTwo: {
      title: "Tên trong phép chia",
      prompt: "Trong 12 : 3 = 4, gọi tên từng số.",
      steps: [
        "12 đứng trước dấu chia nên là số bị chia.",
        "3 là số chia và khác 0.",
        "4 là kết quả, gọi là thương.",
      ],
      answer: "12 là số bị chia; 3 là số chia; 4 là thương.",
      officialOutcomeIds: [G2_MULDIV_COMPONENTS],
    },
  },
  {
    slug: "grade-2-mass-and-time-relations-p1",
    title: "Nặng hơn, nhẹ hơn và quan hệ thời gian",
    grade: 2,
    domain: "MEASUREMENT",
    code: "G2-P1-MEA-A",
    officialOutcomeIds: [G2_HEAVIER_LIGHTER, G2_DAY_HOUR],
    skills: [
      "G2_P1_COMPARE_MASS",
      "G2_P1_DAY_TO_HOURS",
      "G2_P1_HOUR_TO_MINUTES",
    ],
    prerequisiteSlugs: ["grade-1-shape-and-informal-measure-p0"],
    restrictions: [
      "So sánh khối lượng từ số đo cùng đơn vị hoặc kết quả cân.",
      "Một ngày = 24 giờ; một giờ = 60 phút.",
      "Không coi 24 giờ là thời lượng ban ngày có ánh sáng.",
    ],
    visual: "MEASUREMENT_SCALE",
    misconceptions: [
      "HEAVIER_BY_OBJECT_SIZE",
      "DAY_AS_TWELVE_HOURS",
      "HOUR_AS_ONE_HUNDRED_MINUTES",
    ],
    theory: [
      "Vật có số đo khối lượng lớn hơn thì nặng hơn; vật có số đo nhỏ hơn thì nhẹ hơn khi dùng cùng đơn vị.",
      "Không thể kết luận chỉ từ kích thước nhìn thấy; cần cân hoặc số đo khối lượng.",
      "Một ngày đầy đủ có 24 giờ, tính từ một thời điểm đến cùng thời điểm ngày hôm sau.",
      "Một giờ có 60 phút; đổi giờ sang phút bằng đếm các nhóm 60 phút và kiểm tra đơn vị.",
    ],
    exampleOne: {
      title: "So sánh khối lượng",
      prompt: "Túi A nặng 5 kg, túi B nặng 3 kg. Túi nào nặng hơn?",
      steps: [
        "Hai số đo cùng đơn vị kg.",
        "So sánh 5 > 3.",
        "Túi A nặng hơn và túi B nhẹ hơn.",
      ],
      answer: "Túi A nặng hơn.",
      officialOutcomeIds: [G2_HEAVIER_LIGHTER],
    },
    exampleTwo: {
      title: "Đổi thời gian",
      prompt: "Một ngày có bao nhiêu giờ? Hai giờ có bao nhiêu phút?",
      steps: [
        "Theo quan hệ thời gian, một ngày có 24 giờ.",
        "Một giờ có 60 phút.",
        "Hai giờ có 2 × 60 = 120 phút.",
      ],
      answer: "24 giờ; 120 phút.",
      officialOutcomeIds: [G2_DAY_HOUR],
    },
  },
  {
    slug: "grade-2-data-and-measurement-experience-p1",
    title: "Dữ liệu và đo lường trong trường lớp",
    grade: 2,
    domain: "APPLIED_PROBLEM_SOLVING",
    code: "G2-P1-EXP-A",
    officialOutcomeIds: [
      G2_PICTOGRAPH_COMMENT,
      G2_DATA_PRACTICE,
      G2_MEASUREMENT_SCHEDULE_PRACTICE,
    ],
    skills: [
      "G2_P1_COMMENT_PICTOGRAPH",
      "G2_P1_COLLECT_CLASSIFY_DATA",
      "G2_P1_MEASURE_AND_PLAN_SCHEDULE",
    ],
    prerequisiteSlugs: ["grade-1-practical-mathematics-p1"],
    restrictions: [
      "Biểu đồ tranh có chú giải một hình bằng một đối tượng.",
      "Mỗi đối tượng được ghi và kiểm đếm đúng một lần.",
      "Thời gian biểu không có hai hoạt động chồng giờ.",
    ],
    visual: "DATA_DISPLAY",
    misconceptions: [
      "PICTOGRAPH_IGNORE_LEGEND",
      "DOUBLE_COUNT_DATA",
      "OVERLAPPING_SCHEDULE",
    ],
    theory: [
      "Nhận xét biểu đồ tranh phải dựa vào chú giải, số biểu tượng từng nhóm và một so sánh cụ thể.",
      "Thu thập dữ liệu theo câu hỏi rõ ràng, phân loại theo một tiêu chí, ghi vạch và cộng kiểm tra tổng.",
      "Khi đo vật thật, chọn đúng dụng cụ và đơn vị; ước lượng trước rồi đối chiếu kết quả đo.",
      "Sắp xếp thời gian biểu bằng giờ bắt đầu, thời lượng và giờ kết thúc; các hoạt động không được chồng lên nhau.",
    ],
    exampleOne: {
      title: "Thu thập và nhận xét",
      prompt: "Lớp có 6 bạn chọn táo và 4 bạn chọn cam. Nêu một nhận xét.",
      steps: [
        "Ghi hai nhóm theo cùng tiêu chí loại quả.",
        "So sánh 6 > 4.",
        "Có nhiều bạn chọn táo hơn cam 2 bạn.",
      ],
      answer: "Táo nhiều hơn cam 2 bạn.",
      officialOutcomeIds: [G2_PICTOGRAPH_COMMENT, G2_DATA_PRACTICE],
    },
    exampleTwo: {
      title: "Đo rồi xếp thời gian",
      prompt: "Đo bút dài 15 cm. Học từ 8 giờ đến 9 giờ, sau đó nghỉ 30 phút. Giờ nghỉ kết thúc lúc nào?",
      steps: [
        "Đặt bút từ vạch 0 đến vạch 15 để xác nhận 15 cm.",
        "Giờ học kết thúc lúc 9 giờ.",
        "Thêm 30 phút nên giờ nghỉ kết thúc lúc 9 giờ 30 phút.",
      ],
      answer: "Bút dài 15 cm; nghỉ kết thúc lúc 9 giờ 30 phút.",
      officialOutcomeIds: [G2_MEASUREMENT_SCHEDULE_PRACTICE],
    },
  },
] as const;

const grade3P1Definitions: readonly Definition[] = [
  {
    slug: "grade-3-number-sense-to-100000-p1",
    title: "Đọc, làm tròn, so sánh và cấu tạo số đến 100 000",
    grade: 3,
    domain: "NUMBERS_AND_OPERATIONS",
    code: "G3-P1-NUM-A",
    officialOutcomeIds: [
      G3_READ_WRITE_100K,
      G3_ROUND_100K,
      G3_COMPARE_100K,
      G3_DECIMAL_STRUCTURE,
    ],
    skills: [
      "G3_P1_READ_WRITE_TO_100K",
      "G3_P1_ROUND_TO_PLACE",
      "G3_P1_COMPARE_TO_100K",
      "G3_P1_DECOMPOSE_DECIMAL_STRUCTURE",
    ],
    prerequisiteSlugs: ["grade-2-number-order-and-line-p0"],
    restrictions: [
      "Số tự nhiên từ 0 đến 100 000.",
      "Làm tròn đến chục, trăm, nghìn hoặc mười nghìn.",
      "Phân tích theo tổng giá trị các hàng, kể cả hàng có chữ số 0.",
    ],
    visual: "PLACE_VALUE_CHART",
    misconceptions: [
      "READ_ZERO_PLACE",
      "ROUND_WRONG_NEIGHBOR",
      "COMPARE_BY_DIGIT_SUM",
      "DIGIT_VALUE_CONFUSION",
    ],
    theory: [
      "Đọc và viết số đến 100 000 theo từng lớp, từ hàng chục nghìn đến hàng đơn vị; chữ số 0 giữ đúng vị trí.",
      "Làm tròn đến hàng nào thì nhìn chữ số ngay bên phải: từ 5 trở lên tăng một, dưới 5 giữ nguyên rồi thay các hàng sau bằng 0.",
      "So sánh số có nhiều chữ số bằng số chữ số trước, sau đó so từng hàng từ trái sang phải.",
      "Cấu tạo thập phân biểu diễn số thành tổng giá trị các hàng, chẳng hạn 42 305 = 40 000 + 2 000 + 300 + 5.",
    ],
    exampleOne: {
      title: "Đọc và phân tích số",
      prompt: "Đọc và phân tích số 42 305.",
      steps: [
        "Đọc theo các hàng: bốn mươi hai nghìn ba trăm linh năm.",
        "Xác định giá trị: 4 chục nghìn, 2 nghìn, 3 trăm, 0 chục, 5 đơn vị.",
        "Viết 42 305 = 40 000 + 2 000 + 300 + 5.",
      ],
      answer: "Bốn mươi hai nghìn ba trăm linh năm; 40 000 + 2 000 + 300 + 5.",
      officialOutcomeIds: [G3_READ_WRITE_100K, G3_DECIMAL_STRUCTURE],
    },
    exampleTwo: {
      title: "Làm tròn và so sánh",
      prompt: "Làm tròn 12 346 đến hàng trăm rồi so sánh kết quả với 12 300.",
      steps: [
        "Nhìn hàng chục của 12 346 là 4, nhỏ hơn 5.",
        "Giữ hàng trăm và thay chục, đơn vị bằng 0: được 12 300.",
        "Hai số sau đó bằng nhau: 12 300 = 12 300.",
      ],
      answer: "12 300; bằng nhau.",
      officialOutcomeIds: [G3_ROUND_100K, G3_COMPARE_100K],
    },
  },
] as const;

function makeSections(definition: Definition): readonly TheorySection[] {
  const labels = ["Kiến thức cốt lõi", "Cách thực hiện", "Giải thích và kiểm tra", "Vận dụng đúng"];
  const outcomeIdsForSection = (index: number) => {
    if (definition.theoryOutcomeGroups) {
      return definition.theoryOutcomeGroups[index];
    }
    const ids = definition.officialOutcomeIds;
    if (ids.length === 1) return ids;
    if (ids.length === 2) return [ids[index < 2 ? 0 : 1]];
    if (ids.length === 3) return index < 3 ? [ids[index]] : ids;
    return [ids[index]];
  };
  const supportingExplanation = (index: number) => {
    if (index === 0) {
      return `Trong chủ đề này: ${definition.restrictions[0]}`;
    }
    if (index === 1) {
      return `Hãy nhớ: ${definition.restrictions[1] ?? definition.restrictions[0]}`;
    }
    if (index === 2) {
      return "Sau khi làm, em hãy đối chiếu kết quả với hình, đơn vị và dữ kiện ban đầu.";
    }
    return `Kiểm tra cuối cùng: ${definition.restrictions.at(-1)}`;
  };
  return definition.theory.map((explanation, index) => ({
    id: `${definition.slug}-s${index + 1}`,
    title: labels[index],
    explanation: [explanation, supportingExplanation(index)],
    visualDescription: `${definition.title}: mô hình trực quan cho ${labels[index].toLocaleLowerCase("vi")}.`,
    officialOutcomeIds: outcomeIdsForSection(index),
  }));
}

function makeExample(
  definition: Definition,
  index: 1 | 2,
  item: Definition["exampleOne"],
): WorkedExample {
  return {
    id: `${definition.slug}-e${index}`,
    title: item.title,
    prompt: item.prompt,
    steps: item.steps,
    answer: item.answer,
    visualDescription: `${definition.title}: dữ kiện và từng bước của ví dụ ${index} được biểu diễn đồng nhất.`,
    officialOutcomeIds: item.officialOutcomeIds,
  };
}

export const p0Outcomes: readonly CurriculumOutcome[] = definitions.map((definition) => ({
  id: `PLAVE-MOET2018-${definition.code}`,
  grade: definition.grade,
  domain: definition.domain,
  summary: `Hoàn thiện bằng chứng dạy học cho ${definition.officialOutcomeIds.length} yêu cầu cần đạt P0: ${definition.title}.`,
  sourceReferenceIds: ["MOET-MATH-2018"],
  status: "OFFICIAL_SOURCE_MAPPED",
}));

export const p0UnitSeeds: readonly P0UnitSeed[] = definitions.map((definition) => ({
  slug: definition.slug,
  title: definition.title,
  grade: definition.grade,
  domain: definition.domain,
  outcomeId: `PLAVE-MOET2018-${definition.code}`,
  officialOutcomeIds: definition.officialOutcomeIds,
  skills: definition.skills,
  prerequisiteSlugs: definition.prerequisiteSlugs,
  restrictions: definition.restrictions,
  visual: definition.visual,
  answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT", "TEXT_INPUT"],
  levels: ["UNDERSTAND", "APPLY", "REASON"],
  misconceptions: definition.misconceptions,
  kind: "P0_OUTCOME_COMPLETION",
  theory: makeSections(definition),
  examples: [
    makeExample(definition, 1, definition.exampleOne),
    makeExample(definition, 2, definition.exampleTwo),
  ],
}));

export const grade1P1Outcomes: readonly CurriculumOutcome[] =
  grade1P1Definitions.map((definition) => ({
    id: `PLAVE-MOET2018-${definition.code}`,
    grade: definition.grade,
    domain: definition.domain,
    summary: `Triển khai các yêu cầu cần đạt P1 lớp 1: ${definition.title}.`,
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  }));

export const grade1P1UnitSeeds: readonly P0UnitSeed[] =
  grade1P1Definitions.map((definition) => ({
    slug: definition.slug,
    title: definition.title,
    grade: definition.grade,
    domain: definition.domain,
    outcomeId: `PLAVE-MOET2018-${definition.code}`,
    officialOutcomeIds: definition.officialOutcomeIds,
    skills: definition.skills,
    prerequisiteSlugs: definition.prerequisiteSlugs,
    restrictions: definition.restrictions,
    visual: definition.visual,
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT", "TEXT_INPUT"],
    levels: ["UNDERSTAND", "APPLY", "REASON"],
    misconceptions: definition.misconceptions,
    kind: "P1_OUTCOME_COMPLETION",
    theory: makeSections(definition),
    examples: [
      makeExample(definition, 1, definition.exampleOne),
      makeExample(definition, 2, definition.exampleTwo),
    ],
  }));

export const grade2P1Outcomes: readonly CurriculumOutcome[] =
  grade2P1Definitions.map((definition) => ({
    id: `PLAVE-MOET2018-${definition.code}`,
    grade: definition.grade,
    domain: definition.domain,
    summary: `Triển khai các yêu cầu cần đạt P1 lớp 2: ${definition.title}.`,
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  }));

export const grade2P1UnitSeeds: readonly P0UnitSeed[] =
  grade2P1Definitions.map((definition) => ({
    slug: definition.slug,
    title: definition.title,
    grade: definition.grade,
    domain: definition.domain,
    outcomeId: `PLAVE-MOET2018-${definition.code}`,
    officialOutcomeIds: definition.officialOutcomeIds,
    skills: definition.skills,
    prerequisiteSlugs: definition.prerequisiteSlugs,
    restrictions: definition.restrictions,
    visual: definition.visual,
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT", "TEXT_INPUT"],
    levels: ["UNDERSTAND", "APPLY", "REASON"],
    misconceptions: definition.misconceptions,
    kind: "P1_OUTCOME_COMPLETION",
    theory: makeSections(definition),
    examples: [
      makeExample(definition, 1, definition.exampleOne),
      makeExample(definition, 2, definition.exampleTwo),
    ],
  }));

export const grade3P1Outcomes: readonly CurriculumOutcome[] =
  grade3P1Definitions.map((definition) => ({
    id: `PLAVE-MOET2018-${definition.code}`,
    grade: definition.grade,
    domain: definition.domain,
    summary: `Triển khai batch P1 lớp 3: ${definition.title}.`,
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  }));

export const grade3P1UnitSeeds: readonly P0UnitSeed[] =
  grade3P1Definitions.map((definition) => ({
    slug: definition.slug,
    title: definition.title,
    grade: definition.grade,
    domain: definition.domain,
    outcomeId: `PLAVE-MOET2018-${definition.code}`,
    officialOutcomeIds: definition.officialOutcomeIds,
    skills: definition.skills,
    prerequisiteSlugs: definition.prerequisiteSlugs,
    restrictions: definition.restrictions,
    visual: definition.visual,
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT", "TEXT_INPUT"],
    levels: ["UNDERSTAND", "APPLY", "REASON"],
    misconceptions: definition.misconceptions,
    kind: "P1_OUTCOME_COMPLETION",
    theory: makeSections(definition),
    examples: [
      makeExample(definition, 1, definition.exampleOne),
      makeExample(definition, 2, definition.exampleTwo),
    ],
  }));

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

const numericDistractors = (answer: number): [string, string, string] => [
  String(answer + 1),
  String(Math.max(0, answer - 1)),
  String(answer + 10),
];

function baseSpec(
  unit: CurriculumUnit,
  outcomeId: string,
  occurrence: number,
  input: Omit<P0QuestionSpec, "skillFamily" | "primaryOfficialOutcomeId" | "supportingOfficialOutcomeIds" | "evidenceForm">,
): P0QuestionSpec {
  const outcomeIndex = unit.officialOutcomeIds.indexOf(outcomeId);
  const prompt =
    occurrence % 4 === 0
      ? input.prompt
      : occurrence % 4 === 1
        ? `Trong bài thực hành, ${input.prompt.charAt(0).toLocaleLowerCase("vi")}${input.prompt.slice(1)}`
        : occurrence % 4 === 2
          ? `Một bạn chọn “${input.distractors[0]}”. ${input.prompt} Chọn kết quả đúng để sửa lỗi của bạn.`
          : `Vận dụng vào tình huống mới: ${input.prompt}`;
  const errorCategory =
    occurrence % 4 === 0
      ? "Lỗi khái niệm"
      : occurrence % 4 === 1
        ? "Lỗi thực hiện"
        : occurrence % 4 === 2
          ? "Lỗi biểu diễn hoặc lập luận"
          : unit.domain === "MEASUREMENT"
            ? "Lỗi đơn vị hoặc vận dụng"
            : "Lỗi vận dụng";
  const steps =
    occurrence % 4 === 2
      ? [
          ...input.steps,
          `Đối chiếu cho thấy “${input.distractors[0]}” không thỏa điều kiện của bài.`,
        ]
      : input.steps;
  return {
    ...input,
    prompt,
    steps,
    feedback: `${errorCategory}: ${input.feedback}`,
    skillFamily:
      unit.skillFamilies[
        (Math.max(0, outcomeIndex) + occurrence) % unit.skillFamilies.length
      ],
    primaryOfficialOutcomeId: outcomeId,
    supportingOfficialOutcomeIds: [],
    evidenceForm:
      occurrence % 4 === 0 ? "RECOGNIZE_UNDERSTAND"
        : occurrence % 4 === 1 ? "PERFORM"
          : occurrence % 4 === 2 ? "REASON_EXPLAIN"
            : "APPLY",
  };
}

function questionForOutcome(
  unit: CurriculumUnit,
  outcomeId: string,
  occurrence: number,
  random: ReturnType<typeof randomFor>,
): P0QuestionSpec {
  const n = random.integer(2, 8);
  const text = (prompt: string, answer: string, distractors: [string, string, string], steps: readonly string[], feedback: string, parameters: PreviewAudit["parameters"] = [], visualRequirement?: VisualRequirement) =>
    baseSpec(unit, outcomeId, occurrence, { prompt, answer, distractors, steps, feedback, inputType: "TEXT_INPUT", cognitiveLevel: occurrence % 3 === 0 ? "UNDERSTAND" : occurrence % 3 === 1 ? "APPLY" : "REASON", parameters, visualRequirement });
  const number = (prompt: string, answer: number, steps: readonly string[], feedback: string, parameters: PreviewAudit["parameters"] = [], visualRequirement?: VisualRequirement) =>
    baseSpec(unit, outcomeId, occurrence, { prompt, answer: String(answer), distractors: numericDistractors(answer), steps, feedback, inputType: "NUMBER_INPUT", cognitiveLevel: occurrence % 3 === 0 ? "UNDERSTAND" : occurrence % 3 === 1 ? "APPLY" : "REASON", parameters, visualRequirement });

  switch (outcomeId) {
    case G1_COUNT: {
      const value = random.integer(10, 99);
      return number(`Có ${value} que tính được bó theo chục và đơn vị. Viết số chỉ tất cả que tính.`, value, [`Đếm được ${Math.floor(value / 10)} bó chục và ${value % 10} que rời.`, `Viết ${Math.floor(value / 10)} ở hàng chục và ${value % 10} ở hàng đơn vị.`, `Số cần viết là ${value}.`], "Đếm mỗi nhóm đúng một lần rồi dùng giá trị hàng để viết số.", [{ name: "value", value }]);
    }
    case G1_ORDER: {
      const values = [random.integer(10, 30), random.integer(31, 55), random.integer(56, 80)].sort((a, b) => a - b);
      const answer = values.join(", ");
      return text(`Xếp các số ${values[2]}, ${values[0]}, ${values[1]} theo thứ tự từ bé đến lớn.`, answer, [values.slice().reverse().join(", "), `${values[0]}, ${values[2]}, ${values[1]}`, `${values[1]}, ${values[0]}, ${values[2]}`], ["So sánh hàng chục trước.", `Số bé nhất là ${values[0]}, tiếp theo ${values[1]}.`, `Thứ tự đúng: ${answer}.`], "Đọc rõ chiều sắp xếp và so sánh theo giá trị hàng.", values.map((value, index) => ({ name: `value${index}`, value })));
    }
    case G1_MENTAL: {
      const left = random.integer(5, 10);
      const right = random.integer(1, left);
      return number(`Tính nhẩm ${left} − ${right}.`, left - right, [`Tách ${left} thành ${right} và ${left - right}.`, `Bớt ${right} còn ${left - right}.`, `Kiểm tra ${left - right} + ${right} = ${left}.`], "Dùng bộ ba số liên hệ giữa phép cộng và phép trừ.", [{ name: "left", value: left }, { name: "right", value: right }]);
    }
    case G1_TWO_OPS: {
      const start = random.integer(6, 10);
      const subtract = random.integer(1, 3);
      const add = random.integer(1, 3);
      return number(`Tính từ trái sang phải: ${start} − ${subtract} + ${add}.`, start - subtract + add, [`Tính ${start} − ${subtract} = ${start - subtract}.`, `Tiếp tục ${start - subtract} + ${add} = ${start - subtract + add}.`, "Ghi kết quả trung gian để không đổi thứ tự."], "Với cộng và trừ nối tiếp, thực hiện từ trái sang phải.", [{ name: "start", value: start }, { name: "subtract", value: subtract }, { name: "add", value: add }]);
    }
    case G1_BUILD_SHAPES:
      return text(`Hai tam giác vuông bằng nhau ghép sát theo cạnh huyền, không chồng nhau, tạo hình gì?`, "hình vuông", ["hình tròn", "hình tam giác", "hình chữ nhật dài"], ["Xoay hai tam giác để cạnh huyền trùng nhau.", "Quan sát đường bao có bốn cạnh bằng nhau và bốn góc vuông.", "Kết luận hình ghép là hình vuông."], "Kiểm tra đường bao sau khi ghép, không gọi tên theo vị trí xoay.", [{ name: "shape", value: "SQUARE" }]);
    case G1_INFORMAL_MEASURE: {
      const count = random.integer(4, 9);
      return number(`Một mép bàn dài đúng ${count} que tính khi đặt các que sát nhau từ đầu đến cuối. Số đo theo đơn vị que tính là bao nhiêu?`, count, ["Chọn cùng một que làm đơn vị.", "Đặt liên tiếp, không hở và không chồng.", `Đếm ${count} đơn vị que tính.`], "Không đổi đơn vị giữa chừng và không để khoảng hở.", [{ name: "start", value: 0 }, { name: "end", value: count }]);
    }
    case G1_APPLIED_MEASURE:
      return text("Muốn biết ngày mai là ngày nào và buổi học bắt đầu lúc mấy giờ đúng, cần dùng gì?", "lịch và đồng hồ", ["thước và cân", "cân và lịch", "thước và đồng hồ"], ["Dùng lịch để xem ngày.", "Dùng đồng hồ để đọc giờ đúng.", "Hai công cụ trả lời hai đại lượng khác nhau."], "Chọn công cụ theo đại lượng được hỏi.", [{ name: "start", value: 0 }, { name: "end", value: n }]);
    case G2_ROUND_HUNDREDS: {
      const value = random.integer(1, 9) * 100;
      return number(`Số nào là số tròn trăm và có ${value / 100} trăm?`, value, ["Số tròn trăm có hàng chục và đơn vị bằng 0.", `${value / 100} trăm = ${value}.`, `Kiểm tra ${value} chia hết cho 100.`], "Không nhầm số có một chữ số 0 với số tròn trăm.", [{ name: "value", value }]);
    }
    case G2_COMPARE: {
      const left = random.integer(101, 899);
      const right = left + random.integer(1, 50);
      return text(`Điền dấu đúng: ${left} □ ${right}.`, "<", [">", "=", "không so sánh được"], ["So sánh hàng trăm trước, rồi hàng chục.", `${left} nhỏ hơn ${right}.`, `Điền ${left} < ${right}.`], "Dừng ở hàng khác nhau đầu tiên, không chỉ nhìn chữ số cuối.", [{ name: "left", value: left }, { name: "right", value: right }]);
    }
    case G2_NUMBER_LINE: {
      const start = random.integer(10, 70) * 10;
      const step = 10;
      return number(`Tia số có các vạch ${start}, ${start + step}, □, ${start + 3 * step}. Điền số còn thiếu.`, start + 2 * step, ["Khoảng giữa các vạch là 10.", `Sau ${start + step} là ${start + 2 * step}.`, `Kiểm tra vạch tiếp theo là ${start + 3 * step}.`], "Các vạch cách đều phải tăng cùng một bước.", [{ name: "start", value: start }, { name: "step", value: step }, { name: "end", value: start + 3 * step }]);
    }
    case G2_ORDER: {
      const values = [random.integer(100, 299), random.integer(300, 499), random.integer(500, 699), random.integer(700, 899)];
      return text(`Xếp ${values.slice().reverse().join(", ")} từ bé đến lớn.`, values.join(", "), [values.slice().reverse().join(", "), `${values[0]}, ${values[2]}, ${values[1]}, ${values[3]}`, `${values[1]}, ${values[0]}, ${values[2]}, ${values[3]}`], ["So sánh hàng trăm của bốn số.", "Hàng trăm tăng dần theo thứ tự đã chọn.", `Kết quả: ${values.join(", ")}.`], "Kiểm tra từng cặp liền nhau đều tăng.", values.map((value, index) => ({ name: `value${index}`, value })));
    }
    case G2_COMPONENTS:
      return text(`Trong phép tính ${n + 4} + ${n} = ${2 * n + 4}, số ${2 * n + 4} được gọi là gì?`, "tổng", ["số hạng", "số bị trừ", "hiệu"], ["Hai số ở bên trái dấu bằng là các số hạng.", "Kết quả của phép cộng gọi là tổng.", `Vậy ${2 * n + 4} là tổng.`], "Gọi tên thành phần theo phép tính và vị trí.", [{ name: "left", value: n + 4 }, { name: "right", value: n }]);
    case G2_ADD_SUB: {
      const left = random.integer(220, 480);
      const right = random.integer(110, 290);
      return number(`Tính ${left} + ${right}.`, left + right, ["Đặt các chữ số cùng hàng thẳng cột.", `Cộng từ đơn vị đến trăm được ${left + right}.`, `Kiểm tra bằng ${left + right} − ${right} = ${left}.`], "Nếu có nhớ, chỉ đổi đủ mười đơn vị thành một chục.", [{ name: "left", value: left }, { name: "right", value: right }]);
    }
    case G2_MENTAL_ROUND: {
      const left = random.integer(2, 7) * 100;
      const right = random.integer(1, 9 - left / 100) * 100;
      return number(`Tính nhẩm ${left} + ${right}.`, left + right, [`${left / 100} trăm + ${right / 100} trăm = ${(left + right) / 100} trăm.`, `${(left + right) / 100} trăm là ${left + right}.`, "Kết quả vẫn là số tròn trăm."], "Tính số trăm trước, không coi hàng trăm là đơn vị.", [{ name: "left", value: left }, { name: "right", value: right }]);
    }
    case G2_MENTAL_20: {
      const left = random.integer(11, 20);
      const right = random.integer(2, left - 1);
      return number(`Tính nhẩm ${left} − ${right}.`, left - right, [`Tách ${right} để đưa ${left} về 10 nếu thuận tiện.`, `Thực hiện phép trừ được ${left - right}.`, `Kiểm tra ${left - right} + ${right} = ${left}.`], "Dùng tách–gộp hoặc phép tính ngược để nhẩm.", [{ name: "left", value: left }, { name: "right", value: right }]);
    }
    case G2_TWO_OPS: {
      const start = random.integer(30, 70);
      const add = random.integer(5, 20);
      const sub = random.integer(5, 20);
      return number(`Tính từ trái sang phải: ${start} + ${add} − ${sub}.`, start + add - sub, [`${start} + ${add} = ${start + add}.`, `${start + add} − ${sub} = ${start + add - sub}.`, "Không gộp hai số sau trước."], "Cộng và trừ cùng mức ưu tiên nên làm từ trái sang phải.", [{ name: "start", value: start }, { name: "add", value: add }, { name: "subtract", value: sub }]);
    }
    case G2_ESTIMATE_TENS: {
      const groups = random.integer(3, 8);
      return number(`Một khay có khoảng ${groups} nhóm, mỗi nhóm gần 10 hạt. Ước lượng có khoảng bao nhiêu hạt?`, groups * 10, ["Mỗi nhóm gần 10.", `${groups} nhóm tương ứng khoảng ${groups} chục.`, `${groups} chục là khoảng ${groups * 10}.`], "Ước lượng theo chục không đòi hỏi đếm chính xác từng hạt.", [{ name: "groups", value: groups }, { name: "itemsPerGroup", value: 10 }]);
    }
    case G2_EXTREME: {
      const values = [random.integer(100, 299), random.integer(300, 499), random.integer(500, 699)];
      return number(`Trong các số ${values.join(", ")}, số lớn nhất là số nào?`, values[2], ["So sánh hàng trăm trước.", `${values[2]} có hàng trăm lớn nhất.`, `Kiểm tra ${values[2]} lớn hơn hai số còn lại.`], "Không chọn theo chữ số hàng đơn vị.", values.map((value, index) => ({ name: `value${index}`, value })));
    }
    case G2_APPLIED_SHAPES:
      return text("Một biển báo có ba cạnh thẳng và ba góc. Biển có dạng hình gì?", "hình tam giác", ["hình tròn", "hình vuông", "hình chữ nhật"], ["Đếm ba cạnh thẳng.", "Hình có ba cạnh và ba góc là tam giác.", "Không phụ thuộc hình đang xoay theo hướng nào."], "Nêu đặc điểm hình thay vì chỉ nói trông giống.", [{ name: "shape", value: "TRIANGLE" }]);
    case G2_MAKE_SHAPES:
      return text("Cắt một hình vuông theo đường chéo được hai mảnh có dạng gì?", "hai hình tam giác", ["hai hình tròn", "hai hình vuông", "một hình chữ nhật"], ["Đường chéo nối hai đỉnh đối diện.", "Mỗi phần có ba cạnh.", "Hai phần là hai tam giác bằng nhau."], "Theo dõi đường cắt và đường bao của từng mảnh.", [{ name: "shape", value: "SQUARE" }]);
    case G2_SEGMENT: {
      const length = random.integer(3, 9);
      return number(`Đặt A tại vạch 0 cm và B tại vạch ${length} cm. Đoạn AB dài bao nhiêu xăng-ti-mét?`, length, ["Đầu A trùng vạch 0.", `Đầu B trùng vạch ${length}.`, `Khoảng cách là ${length} − 0 = ${length} cm.`], "Bắt đầu ở vạch 0, không bắt đầu ở mép thước hay vạch 1.", [{ name: "start", value: 0 }, { name: "end", value: length }]);
    }
    case G2_KG: {
      const mass = random.integer(10, 90);
      return text(`Bao gạo có khối lượng ${mass}. Cách viết số đo đúng là gì?`, `${mass} kg`, [`${mass} l`, `${mass} cm`, `${mass} giờ`], ["Đại lượng được hỏi là khối lượng.", "Đơn vị lớp 2 là ki-lô-gam, viết tắt kg.", `Viết ${mass} kg.`], "Luôn ghép số đo với đúng đơn vị đại lượng.", [{ name: "end", value: mass }]);
    }
    case G2_LITRE: {
      const capacity = random.integer(10, 90);
      return text(`Bể nhỏ chứa ${capacity} lít nước. Cách viết số đo dung tích đúng là gì?`, `${capacity} l`, [`${capacity} kg`, `${capacity} cm`, `${capacity} đồng`], ["Đây là dung tích chất lỏng.", "Đơn vị là lít, viết tắt l.", `Viết ${capacity} l.`], "Không dùng kg cho dung tích.", [{ name: "end", value: capacity }]);
    }
    case G2_TOOLS:
      return text("Muốn cân khối lượng một quả bí, em chọn dụng cụ nào?", "cân", ["thước thẳng", "đồng hồ", "lịch"], ["Câu hỏi hỏi khối lượng.", "Cân là dụng cụ đo khối lượng.", "Đọc kết quả và ghi kg."], "Chọn dụng cụ theo đại lượng, không theo hình dáng vật.", [{ name: "end", value: n }]);
    case G2_CLOCK: {
      const hour = random.integer(1, 11);
      const half = occurrence % 2 === 1;
      const minute = half ? 30 : 15;
      return text(`Kim giờ vừa qua số ${hour}, kim phút chỉ số ${half ? 6 : 3}. Đồng hồ chỉ mấy giờ?`, `${hour} giờ ${minute} phút`, [`${minute} giờ ${hour} phút`, `${hour + 1} giờ`, `${hour} giờ`], [`Kim phút ở số ${half ? 6 : 3} là ${minute} phút.`, `Kim giờ vừa qua số ${hour}.`, `Đọc ${hour} giờ ${minute} phút.`], "Phân biệt kim giờ và kim phút; mỗi số trên mặt đồng hồ ứng 5 phút.", [{ name: "hour", value: hour }, { name: "minute", value: minute }], "CLOCK_FACE");
    }
    case G2_CALENDAR:
      return text("Ngày nào sau đây không tồn tại: 30 tháng 4 hay 31 tháng 4?", "31 tháng 4", ["30 tháng 4", "cả hai ngày", "không ngày nào"], ["Tháng 4 có 30 ngày.", "Ngày cuối tháng là 30 tháng 4.", "Vì vậy 31 tháng 4 không tồn tại."], "Kiểm tra số ngày của tháng trước khi dùng một ngày.", [{ name: "month", value: 4 }, { name: "days", value: 30 }]);
    case G2_MONEY: {
      const value = [10_000, 20_000, 50_000][occurrence % 3];
      return text(`Tờ tiền in số ${value.toLocaleString("vi-VN")} và chữ “đồng”. Mệnh giá là gì?`, `${value.toLocaleString("vi-VN")} đồng`, [`${value / 10} đồng`, `${value * 10} đồng`, `${value} kg`], ["Đọc dãy số trên tờ tiền.", `Giá trị là ${value.toLocaleString("vi-VN")}.`, "Ghi đơn vị đồng."], "Nhận biết mệnh giá từ số và chữ, không dựa riêng vào màu.", [{ name: "value", value }]);
    }
    case G2_APPLIED_MEASURE: {
      const start = random.integer(5, 20);
      const added = random.integer(2, 8);
      return number(`Can có ${start} l nước, rót thêm ${added} l. Can có bao nhiêu lít?`, start + added, ["Hai số đo cùng đơn vị l.", `Từ “thêm” dùng phép cộng ${start} + ${added} = ${start + added}.`, `Kết luận ${start + added} l.`], "Kết quả đo lường phải có đơn vị và trả lời đúng đại lượng.", [{ name: "start", value: start }, { name: "end", value: start + added }]);
    }
    case G2_ESTIMATE_MEASURE: {
      const estimates = [
        ["Chiều cao cửa lớp hợp lí nhất là 2 cm, 2 m hay 20 m?", "2 m", ["2 cm", "20 m", "200 m"], "Cửa cao hơn người nhỏ tuổi một chút nên khoảng 2 m."],
        ["Chiều dài bút chì hợp lí nhất là 15 cm, 15 m hay 150 m?", "15 cm", ["15 m", "150 m", "15 km"], "Bút chì cầm trong tay nên khoảng 15 cm."],
        ["Chiều cao bàn học hợp lí nhất là 1 cm, 1 m hay 10 m?", "1 m", ["1 cm", "10 m", "100 m"], "Bàn học thấp hơn người lớn nên khoảng 1 m."],
      ] as const;
      const [prompt, answer, distractors, reason] =
        estimates[occurrence % estimates.length];
      return text(prompt, answer, [...distractors], ["So với kích thước cơ thể và đồ vật quen thuộc.", reason, `Chọn ${answer}.`], "So sánh với mốc quen thuộc để loại ước lượng sai cỡ và sai đơn vị.", [{ name: "estimateIndex", value: occurrence % estimates.length }]);
    }
    case G3_CONVERT: {
      const metres = random.integer(2, 8);
      const centimetres = random.integer(1, 9) * 10;
      const answer = metres * 100 + centimetres;
      return number(`Đổi ${metres} m ${centimetres} cm thành xăng-ti-mét.`, answer, [`${metres} m = ${metres * 100} cm.`, `Cộng ${metres * 100} + ${centimetres} = ${answer} cm.`, "Kiểm tra kết quả lớn hơn số xăng-ti-mét ban đầu."], "Đổi từng phần về cùng đơn vị trước khi cộng.", [{ name: "start", value: 0 }, { name: "end", value: Math.min(100, centimetres) }, { name: "metres", value: metres }]);
    }
    case G4_CONVERT: {
      if (occurrence % 2 === 0) {
        const squareMetres = random.integer(2, 8);
        return number(`Đổi ${squareMetres} m² thành dm².`, squareMetres * 100, ["1 m = 10 dm nên 1 m² = 100 dm².", `${squareMetres} × 100 = ${squareMetres * 100}.`, "Giữ đơn vị dm²."], "Đơn vị diện tích đổi theo hệ số bình phương, không dùng hệ số độ dài.", [{ name: "width", value: squareMetres }, { name: "height", value: 1 }]);
      }
      const quintals = random.integer(1, 5);
      return number(`Đổi ${quintals} tạ thành ki-lô-gam.`, quintals * 100, ["1 tạ = 100 kg.", `${quintals} × 100 = ${quintals * 100}.`, "Ghi đơn vị kg."], "Xác định chiều đổi trước khi nhân hoặc chia.", [{ name: "width", value: quintals }, { name: "height", value: 1 }]);
    }
    case G5_DECIMAL_COMPARE: {
      const whole = random.integer(1, 8);
      const tenths = random.integer(1, 8);
      const left = `${whole},${tenths}`;
      const right = `${whole},${tenths - 1}${random.integer(1, 9)}`;
      return text(`Điền dấu: ${left} □ ${right}.`, ">", ["<", "=", "không xác định"], [`Viết ${left} thành ${left}0 để thẳng hàng.`, `So sánh ${left}0 với ${right} từ hàng phần mười.`, `${left} > ${right}.`], "Không so sánh theo số chữ số; thêm 0 tận cùng không đổi giá trị.", [{ name: "left", value: left }, { name: "right", value: right }]);
    }
    case G5_FRACTION_OPS: {
      const denominator = [4, 6, 8][occurrence % 3];
      return text(`Tính 1/2 + 1/${denominator}.`, `${denominator / 2 + 1}/${denominator}`, [`${denominator + 2}/${2 * denominator}`, `2/${denominator + 2}`, `${denominator / 2}/${denominator}`], [`Quy đồng 1/2 = ${denominator / 2}/${denominator}.`, `Cộng tử số: ${denominator / 2} + 1 = ${denominator / 2 + 1}.`, `Kết quả ${denominator / 2 + 1}/${denominator}; rút gọn nếu có thể.`], "Chỉ cộng tử sau khi các mẫu đã bằng nhau.", [{ name: "numerator", value: denominator / 2 + 1 }, { name: "denominator", value: denominator }]);
    }
    case G5_BOX_MEASURE: {
      const length = random.integer(3, 8);
      const width = random.integer(2, 6);
      const height = random.integer(2, 5);
      const volume = length * width * height;
      return number(`Hình hộp chữ nhật dài ${length} cm, rộng ${width} cm, cao ${height} cm. Thể tích bằng bao nhiêu cm³?`, volume, [`Các kích thước đều dương và cùng đơn vị.`, `V = ${length} × ${width} × ${height} = ${volume}.`, "Ghi đơn vị cm³, không phải cm²."], "Thể tích đo không gian nên dùng đơn vị khối.", [{ name: "shape", value: "RECTANGLE" }, { name: "width", value: length }, { name: "height", value: width }, { name: "depth", value: height }]);
    }
    case G6_INTEGER_OPS: {
      const left = random.integer(3, 12);
      const right = random.integer(2, 6);
      const result = -left * right;
      return number(`Tính (−${left}) × ${right}.`, result, ["Hai thừa số khác dấu nên tích âm.", `${left} × ${right} = ${left * right}.`, `Kết quả là ${result}.`], "Xác định dấu trước rồi tính giá trị tuyệt đối.", [{ name: "left", value: -left }, { name: "right", value: right }]);
    }
    case G6_FRACTION_OPS: {
      const denominator = [3, 4, 5, 6, 7, 8][occurrence % 6];
      return text(`Tính 1/${denominator} ÷ 2/${denominator}.`, "1/2", [`2/${denominator * denominator}`, "2", `${denominator}/2`], [`2/${denominator} khác 0.`, `Nhân 1/${denominator} với ${denominator}/2.`, `Rút gọn được 1/2.`], "Chia phân số bằng nhân với nghịch đảo của số chia khác 0.", [{ name: "numerator", value: 1 }, { name: "denominator", value: 2 }]);
    }
    case G7_INVERSE: {
      const workers = random.integer(2, 5);
      const time = random.integer(4, 8);
      const scale = 2;
      const answer = time / scale;
      return text(`${workers} người làm xong cùng một việc trong ${time} giờ. Với năng suất như nhau, ${workers * scale} người cần bao nhiêu giờ?`, Number.isInteger(answer) ? String(answer) : `${time}/2`, [String(time * scale), String(time), String(workers * scale)], ["Cùng công việc nên số người và thời gian tỉ lệ nghịch.", `Lập ${workers} × ${time} = ${workers * scale} × t.`, `Suy ra t = ${time}/${scale}${Number.isInteger(answer) ? ` = ${answer}` : ""} giờ; nhiều người hơn nên thời gian giảm.`], "Kiểm tra tích người × giờ không đổi và nghiệm dương.", [{ name: "leftBase", value: workers }, { name: "rightBase", value: time }, { name: "scale", value: scale }]);
    }
    case G1_CLOCK_RECOGNIZE: {
      const hour = random.integer(1, 12);
      return text(`Kim phút chỉ số 12 và kim giờ chỉ số ${hour}. Đây có phải giờ đúng không?`, "có", ["không", "không đủ dữ kiện", "chỉ đúng khi kim giờ ở 12"], ["Kim phút ở số 12 nghĩa là 0 phút.", `Kim giờ chỉ ${hour}.`, "Vì không có phút lẻ nên đây là giờ đúng."], "Nhận biết giờ đúng từ vị trí kim phút trước.", [{ name: "hour", value: hour }, { name: "minute", value: 0 }], "CLOCK_FACE");
    }
    case G1_CLOCK_READ: {
      const hour = random.integer(1, 12);
      return text(`Đồng hồ có kim phút ở 12, kim giờ ở ${hour}. Đọc giờ.`, `${hour} giờ đúng`, [`12 giờ ${hour} phút`, `${hour} giờ 12 phút`, `${hour + 1} giờ đúng`], ["Kim phút ở 12 xác nhận giờ đúng.", `Kim giờ chỉ số ${hour}.`, `Đọc ${hour} giờ đúng.`], "Không đổi vai trò kim giờ và kim phút.", [{ name: "hour", value: hour }, { name: "minute", value: 0 }], "CLOCK_FACE");
    }
    case G1_WEEK: {
      const days = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ nhật"] as const;
      const index = random.integer(0, days.length - 2);
      return text(`Ngày liền sau ${days[index]} là ngày nào?`, days[index + 1], [days[index], days[Math.max(0, index - 1)], "Không có ngày liền sau"], ["Một tuần có 7 ngày theo thứ tự cố định.", `Tìm ${days[index]} trong dãy ngày.`, `Ngày liền sau là ${days[index + 1]}.`], "Đọc tên ngày theo thứ tự tuần, không theo thứ tự chữ cái.", [{ name: "dayIndex", value: index }]);
    }
    case G1_CALENDAR_READ: {
      const day = random.integer(2, 27);
      const month = random.integer(1, 12);
      return text(`Tờ lịch ghi “Thứ Tư”, số ${day}, tháng ${month}. Đọc đầy đủ thông tin ngày.`, `Thứ Tư, ngày ${day} tháng ${month}`, [`Thứ Tư, ngày ${month} tháng ${day}`, `Thứ ${day}, ngày Tư tháng ${month}`, `Ngày ${day} tháng ${month}`], ["Đọc tên thứ: Thứ Tư.", `Đọc ngày trong tháng: ngày ${day}.`, `Đọc tháng: tháng ${month}, rồi ghép đủ ba phần.`], "Không đổi chỗ số ngày và số tháng.", [{ name: "day", value: day }, { name: "month", value: month }]);
    }
    case G1_POSITION_PRACTICE:
      return text("Quả bóng nằm dưới bàn. Lấy bàn làm mốc, quả bóng ở vị trí nào?", "dưới bàn", ["trên bàn", "cao hơn bàn", "trước bàn"], ["Vật làm mốc là bàn.", "Quả bóng nằm ở phía dưới mặt bàn.", "Mô tả: quả bóng ở dưới bàn."], "Luôn nêu vật làm mốc khi mô tả vị trí.", [{ name: "start", value: 0 }, { name: "end", value: n }]);
    case G1_DAILY_MATH_PRACTICE: {
      const start = random.integer(4, 9);
      const added = random.integer(1, 5);
      return number(`Lớp có ${start} cửa sổ đang mở, mở thêm ${added} cửa. Có tất cả bao nhiêu cửa sổ mở?`, start + added, ["Đếm mỗi cửa sổ một lần.", `Từ “thêm” dùng ${start} + ${added}.`, `Có ${start + added} cửa sổ mở.`], "Chọn phép cộng từ hành động thêm và kiểm tra tổng lớn hơn số ban đầu.", [{ name: "start", value: start }, { name: "add", value: added }]);
    }
    case G1_MEASURE_TIME_CALENDAR_PRACTICE: {
      const length = random.integer(5, 18);
      return number(`Một bút chì đặt từ vạch 0 đến vạch ${length} cm. Bút dài bao nhiêu xăng-ti-mét?`, length, ["Đầu bút trùng vạch 0.", `Đầu kia trùng vạch ${length}.`, `Độ dài là ${length} − 0 = ${length} cm.`], "Đo từ vạch 0 và ghi rõ đơn vị cm; ước lượng trước để kiểm tra.", [{ name: "start", value: 0 }, { name: "end", value: length }]);
    }
    case G2_MULDIV_COMPONENTS: {
      const factor = random.integer(2, 6);
      const other = random.integer(2, 6);
      const product = factor * other;
      if (occurrence % 2 === 0) {
        return text(`Trong ${factor} × ${other} = ${product}, số ${product} gọi là gì?`, "tích", ["thừa số", "số bị chia", "thương"], ["Dấu × cho biết phép nhân.", `${factor} và ${other} là hai thừa số.`, `${product} là kết quả nên gọi là tích.`], "Đọc phép tính trước khi gọi tên từng thành phần.", [{ name: "groups", value: factor }, { name: "itemsPerGroup", value: other }]);
      }
      return text(`Trong ${product} : ${factor} = ${other}, số ${factor} gọi là gì?`, "số chia", ["số bị chia", "thương", "tích"], ["Dấu : cho biết phép chia.", `${product} là số bị chia.`, `${factor} đứng sau dấu chia nên là số chia và khác 0.`], "Số chia đứng sau dấu chia và không được bằng 0.", [{ name: "dividend", value: product }, { name: "divisor", value: factor }]);
    }
    case G2_HEAVIER_LIGHTER: {
      const heavy = random.integer(5, 12);
      const light = random.integer(1, heavy - 1);
      return text(`Túi A nặng ${heavy} kg, túi B nặng ${light} kg. Túi nào nặng hơn?`, "Túi A", ["Túi B", "Hai túi bằng nhau", "Không thể so sánh"], ["Hai số đo cùng đơn vị kg.", `${heavy} > ${light}.`, "Túi A nặng hơn; túi B nhẹ hơn."], "So sánh số đo cùng đơn vị, không suy từ kích thước hình vẽ.", [{ name: "start", value: light }, { name: "end", value: heavy }]);
    }
    case G2_DAY_HOUR: {
      if (occurrence % 2 === 0) {
        const days = Math.floor(occurrence / 2) + 1;
        const hours = days * 24;
        return number(`${days} ngày đầy đủ có bao nhiêu giờ?`, hours, ["Một ngày tính từ một thời điểm đến cùng thời điểm hôm sau có 24 giờ.", `Tính ${days} × 24 = ${hours}.`, "Ghi đơn vị giờ."], "Không nhầm một ngày đầy đủ với 12 giờ trên một vòng mặt đồng hồ.", [{ name: "days", value: days }, { name: "end", value: hours }]);
      }
      const hours = random.integer(2, 4) * 60;
      return number(`${hours / 60} giờ có bao nhiêu phút?`, hours, ["1 giờ có 60 phút.", `Tính ${hours / 60} × 60 = ${hours}.`, `Kết luận ${hours} phút.`], "Đổi giờ sang phút bằng nhân với 60, không nhân với 100.", [{ name: "hours", value: hours / 60 }, { name: "end", value: hours }]);
    }
    case G2_PICTOGRAPH_COMMENT: {
      const apples = random.integer(5, 9);
      const oranges = random.integer(1, apples - 1);
      return text(`Biểu đồ tranh có ${apples} biểu tượng táo và ${oranges} biểu tượng cam; mỗi biểu tượng là 1 bạn. Nêu nhận xét đúng.`, `Táo nhiều hơn cam ${apples - oranges} bạn`, [`Cam nhiều hơn táo ${apples - oranges} bạn`, "Hai nhóm bằng nhau", `Táo có ${apples + oranges} bạn`], ["Đọc chú giải: một biểu tượng là một bạn.", `So sánh ${apples} > ${oranges}.`, `Hiệu ${apples} − ${oranges} = ${apples - oranges}, nên táo nhiều hơn cam ${apples - oranges} bạn.`], "Một nhận xét dữ liệu phải nêu nhóm, quan hệ và số chênh lệch đúng.", [{ name: "countA", value: apples }, { name: "countB", value: oranges }]);
    }
    case G2_DATA_PRACTICE: {
      const red = random.integer(3, 8);
      const blue = random.integer(2, 7);
      return number(`Kiểm đếm được ${red} bút đỏ và ${blue} bút xanh. Có tất cả bao nhiêu bút đã ghi?`, red + blue, ["Mỗi bút được xếp vào đúng một nhóm màu.", `Cộng ${red} + ${blue} = ${red + blue}.`, "Đối chiếu tổng với số vạch kiểm đếm."], "Phân loại theo một tiêu chí và không đếm một đồ vật hai lần.", [{ name: "countA", value: red }, { name: "countB", value: blue }]);
    }
    case G2_MEASUREMENT_SCHEDULE_PRACTICE: {
      const startHour = random.integer(7, 10);
      return text(`Hoạt động bắt đầu lúc ${startHour} giờ, kéo dài 1 giờ rồi nghỉ 30 phút. Giờ nghỉ kết thúc lúc nào?`, `${startHour + 1} giờ 30 phút`, [`${startHour} giờ 30 phút`, `${startHour + 2} giờ`, `${startHour + 1} giờ`], [`Sau 1 giờ, hoạt động kết thúc lúc ${startHour + 1} giờ.`, `Thêm 30 phút nghỉ được ${startHour + 1} giờ 30 phút.`, "Khoảng nghỉ bắt đầu sau hoạt động nên không chồng thời gian."], "Tính lần lượt giờ kết thúc từng hoạt động và kiểm tra không chồng lịch.", [{ name: "hour", value: startHour }, { name: "minute", value: 30 }], "CLOCK_FACE");
    }
    case G3_READ_WRITE_100K: {
      const value = random.integer(10_000, 99_999);
      return number(`Bảng giá trị hàng biểu diễn số ${value.toLocaleString("vi-VN")}. Viết số bằng chữ số không có dấu phân cách.`, value, ["Đọc lần lượt từ hàng chục nghìn đến hàng đơn vị.", "Giữ cả chữ số 0 nếu có ở một hàng.", `Viết ${value}.`], "Giá trị mỗi chữ số phụ thuộc vị trí; không bỏ hàng có chữ số 0.", [{ name: "value", value }]);
    }
    case G3_ROUND_100K: {
      const base = random.integer(100, 998) * 100;
      const tail = random.integer(0, 99);
      const value = base + tail;
      const rounded = Math.round(value / 100) * 100;
      return number(`Làm tròn ${value.toLocaleString("vi-VN")} đến hàng trăm.`, rounded, ["Nhìn chữ số hàng chục.", tail >= 50 ? "Hàng chục từ 5 trở lên nên tăng hàng trăm một đơn vị." : "Hàng chục dưới 5 nên giữ hàng trăm.", `Thay hàng chục, đơn vị bằng 0 được ${rounded.toLocaleString("vi-VN")}.`], "Chỉ nhìn chữ số ngay bên phải hàng cần làm tròn.", [{ name: "value", value }, { name: "place", value: 100 }, { name: "rounded", value: rounded }]);
    }
    case G3_COMPARE_100K: {
      const left = random.integer(10_000, 90_000);
      const right = left + random.integer(1, 5_000);
      return text(`Điền dấu đúng: ${left.toLocaleString("vi-VN")} □ ${right.toLocaleString("vi-VN")}.`, "<", [">", "=", "không so sánh được"], ["Hai số có cùng số chữ số.", "So từng hàng từ trái sang phải đến hàng khác nhau đầu tiên.", `${left.toLocaleString("vi-VN")} < ${right.toLocaleString("vi-VN")}.`], "Không so sánh tổng các chữ số hay chỉ nhìn chữ số cuối.", [{ name: "left", value: left }, { name: "right", value: right }]);
    }
    case G3_DECIMAL_STRUCTURE: {
      const tenThousands = random.integer(1, 8);
      const thousands = random.integer(1, 9);
      const hundreds = random.integer(1, 9);
      const value = tenThousands * 10_000 + thousands * 1_000 + hundreds * 100 + n;
      const expansion = `${tenThousands * 10_000} + ${thousands * 1_000} + ${hundreds * 100} + ${n}`;
      return text(`Phân tích số ${value.toLocaleString("vi-VN")} thành tổng giá trị các hàng khác 0.`, expansion, [`${tenThousands} + ${thousands} + ${hundreds} + ${n}`, `${tenThousands * 1_000} + ${thousands * 100} + ${hundreds * 10} + ${n}`, String(value)], [`Chữ số ${tenThousands} ở hàng chục nghìn có giá trị ${tenThousands * 10_000}.`, `Các hàng tiếp theo có giá trị ${thousands * 1_000}, ${hundreds * 100} và ${n}.`, `Cộng thành ${expansion}.`], "Phân biệt chữ số với giá trị của chữ số theo hàng.", [{ name: "value", value }, { name: "tenThousands", value: tenThousands }, { name: "thousands", value: thousands }, { name: "hundreds", value: hundreds }, { name: "ones", value: n }]);
    }
    default:
      throw new Error(`No P0 semantic generator for ${outcomeId}.`);
  }
}

export function generateP0QuestionSpecs(
  unit: CurriculumUnit,
  seed: string,
): readonly P0QuestionSpec[] {
  if (
    (unit.kind !== "P0_OUTCOME_COMPLETION" &&
      unit.kind !== "P1_OUTCOME_COMPLETION") ||
    unit.officialOutcomeIds.length === 0
  ) {
    throw new Error("P0 generator requires a source-locked official outcome list.");
  }
  if (12 % unit.officialOutcomeIds.length !== 0) {
    throw new Error(`${unit.slug} cannot allocate three or more primary questions evenly.`);
  }
  const questionsPerOutcome = 12 / unit.officialOutcomeIds.length;
  const random = randomFor(`${seed}:${unit.slug}`);
  return unit.officialOutcomeIds.flatMap((outcomeId) =>
    Array.from({ length: questionsPerOutcome }, (_, occurrence) =>
      questionForOutcome(unit, outcomeId, occurrence, random),
    ),
  );
}

export const p0TargetOutcomeIds = definitions.flatMap(
  (definition) => definition.officialOutcomeIds,
);

export const grade1P1TargetOutcomeIds = grade1P1Definitions.flatMap(
  (definition) => definition.officialOutcomeIds,
);

export const grade2P1TargetOutcomeIds = grade2P1Definitions.flatMap(
  (definition) => definition.officialOutcomeIds,
);

export const grade3P1TargetOutcomeIds = grade3P1Definitions.flatMap(
  (definition) => definition.officialOutcomeIds,
);
