import type {
  CurriculumDomain,
  CurriculumOutcome,
  CurriculumSourceReference,
  CurriculumUnit,
  DomainCoverageEntry,
  PreviewAnswerType,
  PreviewCognitiveLevel,
  TheorySection,
  VerticalUnitKind,
  VisualRequirement,
  WorkedExample,
} from "./types.ts";
import { batchAOutcomes, batchAUnitSeeds } from "./batch-a.ts";
import { batchBOutcomes, batchBUnitSeeds } from "./batch-b.ts";
import {
  grade2DataOutcome,
  grade2DataUnitSeed,
} from "./source-locked-grade2-data.ts";
import {
  batchesCHOutcomes,
  batchesCHUnitSeeds,
} from "./batches-c-h.ts";
import {
  grade1NumberOperationsOutcome,
  grade1NumberOperationsUnitSeed,
} from "./outcome-batch-grade1.ts";
import {
  grade1P1Outcomes,
  grade1P1UnitSeeds,
  grade2P1Outcomes,
  grade2P1UnitSeeds,
  grade3P1Outcomes,
  grade3P1UnitSeeds,
  p0Outcomes,
  p0UnitSeeds,
} from "./p0-outcome-expansion.ts";
import {
  grade3CompletionOutcomes,
  grade3CompletionUnitSeeds,
} from "./grade3-completion.ts";
import {
  grade4CompletionOutcomes,
  grade4CompletionUnitSeeds,
} from "./grade4-completion.ts";
import {
  grade5CompletionOutcomes,
  grade5CompletionUnitSeeds,
} from "./grade5-completion.ts";
import {
  grade6CompletionOutcomes,
  grade6CompletionUnitSeeds,
} from "./grade6-completion.ts";
import {
  grade7CompletionOutcomes,
  grade7CompletionUnitSeeds,
} from "./grade7-completion.ts";
import {
  grade7RemainingOutcomes,
  grade7RemainingUnitSeeds,
  grade8CompletionOutcomes,
  grade8CompletionUnitSeeds,
  grade9CompletionOutcomes,
  grade9CompletionUnitSeeds,
  officialOutcomeIdsByMappedUnitSlug,
} from "./secondary-completion.ts";

export const officialMathCurriculumSource: CurriculumSourceReference = {
  id: "MOET-MATH-2018",
  authority: "Bộ Giáo dục và Đào tạo",
  title: "Chương trình giáo dục phổ thông môn Toán",
  document: "Thông tư 32/2018/TT-BGDĐT, phụ lục môn Toán",
  url: "https://moet.gov.vn/content/vanban/Lists/VBDT/Attachments/1559/2.%20Ch%C6%B0%C6%A1ng%20tr%C3%ACnh%20m%C3%B4n%20To%C3%A1n.pdf",
  location: "Mục V. Nội dung giáo dục, yêu cầu cần đạt theo từng lớp",
  accessedAt: "2026-07-30",
  status: "OFFICIAL_PRIMARY_SOURCE",
};

export const curriculumSources = [officialMathCurriculumSource] as const;

const coreCurriculumOutcomes: readonly CurriculumOutcome[] = [
  {
    id: "PLAVE-MOET2018-G1-NUM-01",
    grade: 1,
    domain: "NUMBERS_AND_OPERATIONS",
    summary: "Đếm, đọc, viết, so sánh và thực hành tính với số trong phạm vi 10.",
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  },
  {
    id: "PLAVE-MOET2018-G2-NUM-01",
    grade: 2,
    domain: "NUMBERS_AND_OPERATIONS",
    summary:
      "Đọc, viết, cấu tạo thập phân, so sánh và xác định vị trí số trong phạm vi 1000.",
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  },
  {
    id: "PLAVE-MOET2018-G3-FRA-01",
    grade: 3,
    domain: "NUMBERS_AND_OPERATIONS",
    summary:
      "Nhận biết phân số qua các phần bằng nhau của một toàn thể và đọc các phân số đơn vị quen thuộc.",
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  },
  {
    id: "PLAVE-MOET2018-G4-FRA-01",
    grade: 4,
    domain: "NUMBERS_AND_OPERATIONS",
    summary:
      "Nhận biết tính chất cơ bản, so sánh và thực hiện phép cộng, trừ phân số trong phạm vi yêu cầu của lớp 4.",
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  },
  {
    id: "PLAVE-MOET2018-G5-DEC-01",
    grade: 5,
    domain: "NUMBERS_AND_OPERATIONS",
    summary:
      "Đọc, viết, so sánh và thực hiện các phép tính cơ bản với số thập phân.",
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  },
  {
    id: "PLAVE-MOET2018-G6-INT-01",
    grade: 6,
    domain: "NUMBERS_AND_OPERATIONS",
    summary:
      "Biểu diễn, so sánh và thực hiện phép cộng, trừ với số nguyên trong các tình huống phù hợp.",
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  },
  {
    id: "PLAVE-MOET2018-G7-RATIO-01",
    grade: 7,
    domain: "ALGEBRA_AND_PREALGEBRA",
    summary:
      "Nhận biết tỉ lệ thức và vận dụng tính chất của dãy tỉ số bằng nhau, đại lượng tỉ lệ.",
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  },
  {
    id: "PLAVE-MOET2018-G8-LINEAR-01",
    grade: 8,
    domain: "ALGEBRA_AND_PREALGEBRA",
    summary:
      "Mô tả hàm số bậc nhất, tính giá trị và nhận biết ý nghĩa của hệ số trong biểu diễn đại số, đồ thị.",
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  },
  {
    id: "PLAVE-MOET2018-G9-QUADRATIC-01",
    grade: 9,
    domain: "ALGEBRA_AND_PREALGEBRA",
    summary:
      "Nhận biết hàm số dạng y = ax², tính giá trị và đọc các điểm đơn giản trên đồ thị.",
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  },
  {
    id: "PLAVE-MOET2018-G2-MULDIV-01",
    grade: 2,
    domain: "NUMBERS_AND_OPERATIONS",
    summary:
      "Nhận biết ý nghĩa phép nhân, phép chia và vận dụng các bảng nhân, chia phù hợp ở lớp 2.",
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  },
  {
    id: "PLAVE-MOET2018-G3-MULDIV-01",
    grade: 3,
    domain: "NUMBERS_AND_OPERATIONS",
    summary:
      "Thực hiện và vận dụng phép nhân, phép chia trong phạm vi nội dung số học lớp 3.",
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  },
  {
    id: "PLAVE-MOET2018-G4-WHOLEOPS-01",
    grade: 4,
    domain: "NUMBERS_AND_OPERATIONS",
    summary:
      "Thực hiện phép tính với số tự nhiên và vận dụng thứ tự thực hiện phép tính trong tình huống phù hợp.",
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  },
  {
    id: "PLAVE-MOET2018-G5-FRA-01",
    grade: 5,
    domain: "NUMBERS_AND_OPERATIONS",
    summary:
      "Củng cố tính chất, so sánh và thực hiện phép tính với phân số trong phạm vi yêu cầu lớp 5.",
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  },
  {
    id: "PLAVE-MOET2018-G6-FRA-01",
    grade: 6,
    domain: "NUMBERS_AND_OPERATIONS",
    summary:
      "Biểu diễn, so sánh và tính toán với phân số, liên hệ phân số với số hữu tỉ dương và âm ở mức nhập môn.",
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  },
  {
    id: "PLAVE-MOET2018-G8-EQ-01",
    grade: 8,
    domain: "ALGEBRA_AND_PREALGEBRA",
    summary:
      "Giải phương trình bậc nhất một ẩn và vận dụng phương trình để biểu diễn tình huống đơn giản.",
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  },
  {
    id: "PLAVE-MOET2018-G9-SYS-01",
    grade: 9,
    domain: "ALGEBRA_AND_PREALGEBRA",
    summary:
      "Nhận biết và giải hệ hai phương trình bậc nhất hai ẩn trong các trường hợp đơn giản.",
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  },
] as const;

export const curriculumOutcomes: readonly CurriculumOutcome[] = [
  ...coreCurriculumOutcomes,
  ...batchAOutcomes,
  ...batchBOutcomes,
  grade2DataOutcome,
  ...batchesCHOutcomes,
  grade1NumberOperationsOutcome,
  ...p0Outcomes,
  ...grade1P1Outcomes,
  ...grade2P1Outcomes,
  ...grade3P1Outcomes,
  ...grade3CompletionOutcomes,
  ...grade4CompletionOutcomes,
  ...grade5CompletionOutcomes,
  ...grade6CompletionOutcomes,
  ...grade7CompletionOutcomes,
  ...grade7RemainingOutcomes,
  ...grade8CompletionOutcomes,
  ...grade9CompletionOutcomes,
];

type UnitSeed = Readonly<{
  slug: string;
  title: string;
  grade: CurriculumUnit["grade"];
  domain: CurriculumDomain;
  outcomeId: string;
  officialOutcomeIds?: readonly string[];
  skills: readonly [string, string, string, ...string[]];
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

function section(
  id: string,
  title: string,
  explanation: readonly string[],
  visualDescription: string,
): TheorySection {
  return { id, title, explanation, visualDescription };
}

function example(
  id: string,
  title: string,
  prompt: string,
  steps: readonly string[],
  answer: string,
  visualDescription: string,
): WorkedExample {
  return { id, title, prompt, steps, answer, visualDescription };
}

const coreUnitSeeds: readonly UnitSeed[] = [
  {
    slug: "grade-1-numbers-to-10",
    title: "Các số trong phạm vi 10",
    grade: 1,
    domain: "NUMBERS_AND_OPERATIONS",
    outcomeId: "PLAVE-MOET2018-G1-NUM-01",
    skills: ["G1_COUNT_TO_10", "G1_COMPARE_TO_10", "G1_ADD_TO_10"],
    prerequisiteSlugs: [],
    restrictions: ["Chỉ dùng số tự nhiên từ 0 đến 10.", "Tổng không vượt quá 10."],
    visual: "COUNTER_ROW",
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT"],
    levels: ["UNDERSTAND", "APPLY"],
    misconceptions: ["OFF_BY_ONE", "COMPARE_DIRECTION", "COUNTING_OBJECTS"],
    kind: "WHOLE_NUMBERS_TO_10",
    theory: [
      section("g1-s1", "Đếm từng đồ vật", ["Chạm hoặc chỉ vào mỗi đồ vật đúng một lần.", "Số cuối cùng em đọc cho biết có tất cả bao nhiêu đồ vật."], "Một hàng tối đa mười chấm tròn, có khoảng cách đều."),
      section("g1-s2", "Đọc và viết số", ["Mỗi lượng từ 0 đến 10 có một chữ số biểu diễn.", "Số 0 cho biết không có đồ vật nào trong nhóm."], "Thẻ số đặt cạnh nhóm chấm có cùng số lượng."),
      section("g1-s3", "So sánh hai số", ["Nhóm có nhiều đồ vật hơn ứng với số lớn hơn.", "Dùng các từ lớn hơn, bé hơn hoặc bằng nhau."], "Hai hàng chấm được căn trái để so sánh từng cặp."),
      section("g1-s4", "Gộp để cộng", ["Phép cộng gộp hai nhóm thành một nhóm.", "Có thể đếm tiếp từ số lớn hơn để tìm tổng."], "Hai nhóm chấm khác màu được gộp vào một khung."),
    ],
    examples: [
      example("g1-e1", "Đếm 7 chấm", "Có một hàng 7 chấm. Có bao nhiêu chấm?", ["Chỉ lần lượt từng chấm.", "Đọc: 1, 2, 3, 4, 5, 6, 7.", "Số cuối là 7."], "Có 7 chấm.", "Một hàng gồm đúng bảy chấm tròn."),
      example("g1-e2", "Gộp hai nhóm", "Có 3 khối, thêm 2 khối. Có tất cả bao nhiêu?", ["Bắt đầu từ 3.", "Đếm thêm hai bước: 4, 5.", "Viết 3 + 2 = 5."], "Có tất cả 5 khối.", "Nhóm ba khối và nhóm hai khối cùng nằm trong một khung."),
    ],
  },
  {
    slug: "grade-2-numbers-to-1000-preview",
    title: "Số và giá trị hàng đến 1000",
    grade: 2,
    domain: "NUMBERS_AND_OPERATIONS",
    outcomeId: "PLAVE-MOET2018-G2-NUM-01",
    skills: ["G2_COMPOSE_TO_1000", "G2_PLACE_VALUE", "G2_NUMBER_NEIGHBORS"],
    prerequisiteSlugs: ["grade-1-numbers-to-10"],
    restrictions: ["Giá trị từ 0 đến 1000.", "Không đưa phép tính có nhớ vào unit này."],
    visual: "PLACE_VALUE_CHART",
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT"],
    levels: ["UNDERSTAND", "APPLY"],
    misconceptions: ["PLACE_VALUE_ZERO", "DIGIT_VALUE_CONFUSION", "OFF_BY_ONE"],
    kind: "PLACE_VALUE_TO_1000",
    theory: [
      section("g2-s1", "Trăm, chục và đơn vị", ["Mười đơn vị tạo thành một chục; mười chục tạo thành một trăm.", "Vị trí của chữ số quyết định giá trị của nó."], "Bảng ba cột Trăm, Chục, Đơn vị có nhãn đọc rõ."),
      section("g2-s2", "Ghép một số", ["Cộng giá trị của các hàng để ghép số.", "Hàng không có nhóm nào được viết bằng chữ số 0."], "Các bó một trăm, bó một chục và khối đơn vị xếp theo cột."),
      section("g2-s3", "Phân tích một số", ["Tách số thành tổng các trăm, chục và đơn vị.", "Ví dụ cấu trúc: 325 = 300 + 20 + 5."], "Mũi tên từ từng chữ số đến giá trị hàng tương ứng."),
      section("g2-s4", "Số liền trước, liền sau", ["Số liền trước kém một đơn vị.", "Số liền sau hơn một đơn vị."], "Tia số có ba vạch liên tiếp, vạch giữa được nhấn mạnh."),
    ],
    examples: [
      example("g2-e1", "Ghép 406", "4 trăm, 0 chục và 6 đơn vị tạo thành số nào?", ["4 trăm là 400.", "0 chục là 0.", "Cộng 400 + 0 + 6."], "Số 406.", "Bảng giá trị hàng hiển thị 4 ở cột trăm, 0 ở cột chục, 6 ở cột đơn vị."),
      example("g2-e2", "Tìm số liền sau", "Số liền sau của 599 là số nào?", ["Số liền sau hơn 599 một đơn vị.", "Tính 599 + 1.", "Khi thêm 1, 9 đơn vị và 9 chục đổi thành 0, trăm tăng lên 6."], "Số 600.", "Tia số gồm các mốc 598, 599 và 600."),
    ],
  },
  {
    slug: "grade-3-unit-fractions",
    title: "Phân số đơn vị",
    grade: 3,
    domain: "NUMBERS_AND_OPERATIONS",
    outcomeId: "PLAVE-MOET2018-G3-FRA-01",
    skills: ["G3_EQUAL_PARTS", "G3_FRACTION_OF_SET", "G3_COMPARE_UNIT_FRACTIONS"],
    prerequisiteSlugs: ["grade-2-numbers-to-1000-preview"],
    restrictions: ["Mẫu số từ 2 đến 9.", "Toàn thể phải được chia thành các phần bằng nhau."],
    visual: "FRACTION_BAR",
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT", "TEXT_INPUT"],
    levels: ["UNDERSTAND", "APPLY", "REASON"],
    misconceptions: ["UNEQUAL_PARTS", "DENOMINATOR_AS_SIZE", "FRACTION_OF_SET"],
    kind: "UNIT_FRACTIONS",
    theory: [
      section("g3-s1", "Một toàn thể và các phần bằng nhau", ["Muốn nói về phân số, toàn thể phải được chia thành các phần bằng nhau.", "Mỗi phần có cùng kích thước dù hình có thể đặt theo hướng khác nhau."], "Một thanh được chia thành các ô bằng nhau, một ô tô màu."),
      section("g3-s2", "Đọc phân số đơn vị", ["Phân số đơn vị có tử số là 1.", "Mẫu số cho biết toàn thể được chia thành bao nhiêu phần bằng nhau."], "Thanh phân số có nhãn 1/n dưới phần được tô."),
      section("g3-s3", "Tìm một phần của một nhóm", ["Chia tổng số đồ vật thành các nhóm bằng nhau.", "Một nhóm là một phần theo mẫu số đã cho."], "Các chấm được khoanh thành những nhóm có số lượng bằng nhau."),
      section("g3-s4", "So sánh các phân số đơn vị", ["Với cùng một toàn thể, chia thành càng nhiều phần thì mỗi phần càng nhỏ.", "Vì vậy 1/3 lớn hơn 1/5."], "Hai thanh dài bằng nhau chia lần lượt thành ba và năm phần."),
    ],
    examples: [
      example("g3-e1", "Một phần tư", "Một thanh chia 4 phần bằng nhau, tô 1 phần. Phần tô màu là bao nhiêu?", ["Toàn thể có 4 phần bằng nhau nên mẫu số là 4.", "Có 1 phần được tô nên tử số là 1.", "Viết 1/4."], "Phần tô màu là 1/4.", "Thanh ngang chia bốn ô bằng nhau, ô đầu được tô."),
      example("g3-e2", "Một phần ba của 12", "Tìm 1/3 của 12 chấm.", ["Chia 12 chấm thành 3 nhóm bằng nhau.", "Mỗi nhóm có 12 ÷ 3 = 4 chấm.", "Lấy một nhóm."], "1/3 của 12 là 4.", "Mười hai chấm xếp thành ba nhóm, mỗi nhóm bốn chấm."),
    ],
  },
  {
    slug: "grade-4-fraction-foundations",
    title: "Phân số tương đương và phép tính",
    grade: 4,
    domain: "NUMBERS_AND_OPERATIONS",
    outcomeId: "PLAVE-MOET2018-G4-FRA-01",
    skills: ["G4_EQUIVALENT_FRACTIONS", "G4_COMPARE_FRACTIONS", "G4_ADD_LIKE_DENOMINATORS"],
    prerequisiteSlugs: ["grade-3-unit-fractions"],
    restrictions: ["Mẫu số dương không quá 12.", "Phép cộng trong unit dùng cùng mẫu số."],
    visual: "FRACTION_BAR",
    answers: ["MULTIPLE_CHOICE", "TEXT_INPUT"],
    levels: ["UNDERSTAND", "APPLY", "REASON"],
    misconceptions: ["ADD_DENOMINATORS", "CROSS_COMPARE_ERROR", "NON_EQUIVALENT_SCALE"],
    kind: "FRACTION_OPERATIONS",
    theory: [
      section("g4-s1", "Tử số và mẫu số", ["Mẫu số cho biết số phần bằng nhau của toàn thể.", "Tử số cho biết số phần đang xét."], "Thanh phân số có chú thích tử số và mẫu số."),
      section("g4-s2", "Phân số tương đương", ["Nhân cả tử và mẫu với cùng một số khác 0 tạo phân số bằng phân số ban đầu.", "Các thanh phân số giúp kiểm tra cùng một độ dài."], "Hai thanh bằng nhau chia số ô khác nhau nhưng tô cùng độ dài."),
      section("g4-s3", "So sánh cùng mẫu", ["Khi hai phân số cùng mẫu, phân số có tử lớn hơn thì lớn hơn.", "Luôn kiểm tra mẫu số giống nhau trước."], "Hai thanh cùng chia tám phần với số ô tô khác nhau."),
      section("g4-s4", "Cộng phân số cùng mẫu", ["Giữ nguyên mẫu số vì kích thước mỗi phần không đổi.", "Cộng số phần đang có, tức là cộng tử số."], "Hai nhóm phần tô được ghép trên cùng thang chia."),
    ],
    examples: [
      example("g4-e1", "Tạo phân số tương đương", "Điền số vào 2/3 = ?/6.", ["Mẫu số 3 được nhân 2 để thành 6.", "Nhân tử số 2 với cùng số 2.", "2 × 2 = 4."], "2/3 = 4/6.", "Hai thanh bằng nhau: thanh đầu tô 2/3, thanh sau tô 4/6."),
      example("g4-e2", "Cộng cùng mẫu", "Tính 3/8 + 2/8.", ["Hai phân số có cùng mẫu 8.", "Cộng tử số: 3 + 2 = 5.", "Giữ mẫu số 8."], "3/8 + 2/8 = 5/8.", "Một thanh chia tám phần, ba phần và hai phần được tô bằng hai màu."),
    ],
  },
  {
    slug: "grade-5-decimal-operations",
    title: "Số thập phân và phép tính",
    grade: 5,
    domain: "NUMBERS_AND_OPERATIONS",
    outcomeId: "PLAVE-MOET2018-G5-DEC-01",
    skills: ["G5_DECIMAL_PLACE_VALUE", "G5_COMPARE_DECIMALS", "G5_ADD_SUBTRACT_DECIMALS"],
    prerequisiteSlugs: ["grade-4-fraction-foundations"],
    restrictions: ["Tối đa hai chữ số thập phân.", "Phép tính không dùng số âm."],
    visual: "DECIMAL_PLACE_VALUE_CHART",
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT", "TEXT_INPUT"],
    levels: ["UNDERSTAND", "APPLY", "REASON"],
    misconceptions: ["IGNORE_DECIMAL_POINT", "MISALIGN_DECIMALS", "COMPARE_DIGIT_COUNT"],
    kind: "DECIMAL_OPERATIONS",
    theory: [
      section("g5-s1", "Hàng phần mười và phần trăm", ["Chữ số đầu sau dấu phẩy ở hàng phần mười.", "Chữ số thứ hai ở hàng phần trăm."], "Bảng hàng đơn vị, phần mười, phần trăm ngăn bởi dấu phẩy."),
      section("g5-s2", "Viết số thập phân", ["Phần nguyên nằm trước dấu phẩy; phần thập phân nằm sau.", "Chỉ có thể thêm số 0 tận cùng bên phải phần thập phân mà giá trị không đổi, chẳng hạn 2 = 2,0 và 3,14 = 3,140."], "Hai thẻ 2,5 và 2,50 đặt trên cùng tia số."),
      section("g5-s3", "So sánh số thập phân", ["So sánh phần nguyên trước; không dựa vào độ dài cách viết hoặc số lượng chữ số.", "Chỉ khi phần nguyên bằng nhau mới lần lượt so sánh phần mười, phần trăm và các hàng tiếp theo."], "Hai bảng giá trị hàng đặt cạnh nhau."),
      section("g5-s4", "Cộng và trừ", ["Đặt thẳng hàng các dấu phẩy.", "Tính theo từng hàng rồi đặt dấu phẩy thẳng cột trong kết quả."], "Phép tính dọc có đường kẻ căn dấu phẩy."),
    ],
    examples: [
      example("g5-e1", "So sánh 1,9 và 2", "Điền dấu thích hợp.", ["Viết 2 thành 2,0; số 0 tận cùng bên phải phần thập phân không làm đổi giá trị.", "So sánh phần nguyên trước: 1 < 2.", "Vì phần nguyên đã khác nhau, không cần dựa vào độ dài cách viết."], "1,9 < 2,0 nên 1,9 < 2.", "Hai bảng hàng biểu diễn 1 đơn vị 9 phần mười và 2 đơn vị 0 phần mười."),
      example("g5-e2", "Cộng số thập phân", "Tính 2,35 + 1,4.", ["Viết 1,4 thành 1,40.", "Căn thẳng dấu phẩy.", "Cộng 2,35 + 1,40 = 3,75."], "Kết quả là 3,75.", "Phép cộng dọc với hai dấu phẩy thẳng cột."),
    ],
  },
  {
    slug: "grade-6-integer-operations",
    title: "Số nguyên trên trục số",
    grade: 6,
    domain: "NUMBERS_AND_OPERATIONS",
    outcomeId: "PLAVE-MOET2018-G6-INT-01",
    skills: ["G6_COMPARE_INTEGERS", "G6_ADD_INTEGERS", "G6_SUBTRACT_INTEGERS"],
    prerequisiteSlugs: ["grade-5-decimal-operations"],
    restrictions: ["Giá trị từ -30 đến 30.", "Không dùng nhân hoặc chia số nguyên trong slice này."],
    visual: "NUMBER_LINE",
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT"],
    levels: ["UNDERSTAND", "APPLY", "REASON"],
    misconceptions: ["NEGATIVE_ORDER", "SIGN_ADDITION", "SUBTRACT_AS_ADD"],
    kind: "INTEGER_OPERATIONS",
    theory: [
      section("g6-s1", "Số nguyên âm và dương", ["Số nguyên dương nằm bên phải 0; số nguyên âm nằm bên trái 0.", "Số 0 không âm cũng không dương."], "Trục số ngang có 0 ở giữa, mũi tên chỉ hai chiều."),
      section("g6-s2", "So sánh số nguyên", ["Trên trục số, số nằm bên phải luôn lớn hơn.", "Trong hai số âm, số gần 0 hơn là số lớn hơn."], "Hai điểm âm được đánh dấu trên trục số."),
      section("g6-s3", "Cộng số nguyên", ["Cộng số dương là dịch sang phải.", "Cộng số âm là dịch sang trái."], "Mũi tên chuyển động bắt đầu tại số hạng thứ nhất."),
      section("g6-s4", "Trừ số nguyên", ["Trừ một số tương đương cộng số đối của nó.", "Đổi phép trừ thành phép cộng rồi dùng trục số để kiểm tra."], "Cặp số đối nằm cách đều 0."),
    ],
    examples: [
      example("g6-e1", "So sánh hai số âm", "So sánh -3 và -8.", ["Đánh dấu -3 và -8 trên trục số.", "-3 nằm bên phải -8.", "Số bên phải lớn hơn."], "-3 > -8.", "Trục số từ -10 đến 0, hai điểm -8 và -3 được đánh dấu."),
      example("g6-e2", "Trừ một số âm", "Tính 4 - (-3).", ["Số đối của -3 là 3.", "Đổi thành 4 + 3.", "Dịch 3 bước sang phải từ 4."], "4 - (-3) = 7.", "Trục số có mũi tên từ 4 sang 7."),
    ],
  },
  {
    slug: "grade-7-ratio-proportion",
    title: "Tỉ lệ và đại lượng tỉ lệ thuận",
    grade: 7,
    domain: "ALGEBRA_AND_PREALGEBRA",
    outcomeId: "PLAVE-MOET2018-G7-RATIO-01",
    skills: ["G7_SIMPLIFY_RATIOS", "G7_DIRECT_PROPORTION", "G7_SCALE_FACTOR_MODELLING"],
    prerequisiteSlugs: ["grade-6-integer-operations"],
    restrictions: ["Tỉ số dùng số nguyên dương.", "Bài toán có hệ số tỉ lệ nguyên dương."],
    visual: "RATIO_TABLE",
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT", "TEXT_INPUT"],
    levels: ["UNDERSTAND", "APPLY", "REASON"],
    misconceptions: ["RATIO_ORDER", "NON_MULTIPLICATIVE_SCALE", "PERCENT_BASE"],
    kind: "RATIO_AND_PROPORTION",
    theory: [
      section("g7-s1", "Tỉ số có thứ tự", ["Tỉ số a:b so sánh a với b và thứ tự có ý nghĩa.", "Có thể viết tỉ số dưới dạng phân số a/b khi b khác 0."], "Hai hàng đối tượng có nhãn a và b."),
      section("g7-s2", "Rút gọn tỉ số", ["Chia cả hai số của tỉ số cho cùng một ước chung.", "Tỉ số rút gọn vẫn mô tả cùng quan hệ."], "Bảng cho thấy 6:9 và 2:3 trên hai dòng."),
      section("g7-s3", "Đại lượng tỉ lệ thuận", ["Khi một đại lượng tăng k lần, đại lượng kia cũng tăng k lần.", "Hệ số tỉ lệ giữ nguyên trong bảng."], "Bảng hai hàng với các cột là cặp giá trị tương ứng."),
      section("g7-s4", "Mô hình theo hệ số tỉ lệ", ["Xác định giá trị của một đơn vị trước khi mở rộng bảng tỉ lệ.", "Kiểm tra mọi cặp giá trị có cùng hệ số tỉ lệ."], "Bảng hai hàng có mũi tên nhân cùng một hệ số giữa các cột."),
    ],
    examples: [
      example("g7-e1", "Rút gọn 12:18", "Rút gọn tỉ số 12:18.", ["Ước chung lớn nhất của 12 và 18 là 6.", "Chia cả hai số cho 6.", "12:18 = 2:3."], "Tỉ số rút gọn là 2:3.", "Mười hai và mười tám chấm được gom thành các nhóm sáu."),
      example("g7-e2", "Giá theo tỉ lệ", "3 quyển vở giá 24 nghìn đồng. 5 quyển cùng loại giá bao nhiêu?", ["Giá một quyển là 24 ÷ 3 = 8 nghìn.", "Năm quyển giá 5 × 8.", "Kiểm tra hệ số giá mỗi quyển vẫn là 8."], "Giá là 40 nghìn đồng.", "Bảng tỉ lệ có hàng số vở 1, 3, 5 và hàng giá 8, 24, 40."),
    ],
  },
  {
    slug: "grade-8-linear-functions",
    title: "Hàm số bậc nhất",
    grade: 8,
    domain: "ALGEBRA_AND_PREALGEBRA",
    outcomeId: "PLAVE-MOET2018-G8-LINEAR-01",
    skills: ["G8_EVALUATE_EXPRESSIONS", "G8_LINEAR_RULE", "G8_SLOPE_INTERCEPT"],
    prerequisiteSlugs: ["grade-7-ratio-proportion"],
    restrictions: ["Hệ số nguyên từ -5 đến 5, hệ số a khác 0.", "Giá trị đầu vào nguyên nhỏ."],
    visual: "COORDINATE_PLANE",
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT"],
    levels: ["UNDERSTAND", "APPLY", "REASON"],
    misconceptions: ["ORDER_OF_OPERATIONS", "SUBSTITUTION_SIGN", "SLOPE_INTERCEPT_SWAP"],
    kind: "LINEAR_FUNCTIONS",
    theory: [
      section("g8-s1", "Biến và biểu thức", ["Biến đại diện cho một giá trị có thể thay đổi.", "Thay giá trị của biến rồi tuân theo thứ tự phép tính."], "Hộp đầu vào x nối bằng mũi tên đến hộp biểu thức."),
      section("g8-s2", "Quy tắc hàm số", ["Hàm số gán mỗi giá trị x đang xét cho đúng một giá trị y.", "Quy tắc y = ax + b cho biết cách tính y từ x."], "Máy hàm số có nhãn nhân a rồi cộng b."),
      section("g8-s3", "Hệ số a và b", ["Trong y = ax + b, a mô tả độ thay đổi của y khi x tăng 1.", "b là giá trị y khi x = 0."], "Đường thẳng cắt trục tung tại b, tam giác độ dốc minh họa a."),
      section("g8-s4", "Điểm thuộc đồ thị", ["Điểm (x;y) thuộc đồ thị nếu thay x vào quy tắc nhận đúng y.", "Bảng giá trị giúp tạo các điểm trước khi vẽ."], "Mặt phẳng tọa độ có ba điểm thẳng hàng được gắn nhãn."),
    ],
    examples: [
      example("g8-e1", "Tính giá trị hàm", "Với y = 2x + 1, tìm y khi x = 3.", ["Thay x = 3.", "Tính 2 × 3 + 1.", "6 + 1 = 7."], "y = 7.", "Máy hàm số nhận 3, nhân 2 rồi cộng 1 để cho 7."),
      example("g8-e2", "Đọc hệ số", "Trong y = -3x + 4, xác định a và b.", ["So sánh với dạng y = ax + b.", "Hệ số đứng trước x là a.", "Số hạng không chứa x là b."], "a = -3 và b = 4.", "Đường thẳng đi xuống và cắt trục tung tại 4."),
    ],
  },
  {
    slug: "grade-9-quadratic-functions",
    title: "Hàm số y = ax²",
    grade: 9,
    domain: "ALGEBRA_AND_PREALGEBRA",
    outcomeId: "PLAVE-MOET2018-G9-QUADRATIC-01",
    skills: ["G9_SQUARES_ROOTS", "G9_EVALUATE_QUADRATIC", "G9_QUADRATIC_POINTS"],
    prerequisiteSlugs: ["grade-8-linear-functions"],
    restrictions: ["Hệ số a nguyên khác 0.", "Chỉ dùng căn bậc hai số học của số chính phương trong slice này."],
    visual: "COORDINATE_PLANE",
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT"],
    levels: ["UNDERSTAND", "APPLY", "REASON"],
    misconceptions: ["SQUARE_SIGN", "DOUBLE_INSTEAD_OF_SQUARE", "ROOT_SIGN"],
    kind: "QUADRATIC_FUNCTIONS",
    theory: [
      section("g9-s1", "Bình phương và căn bậc hai số học", ["Bình phương x là x × x.", "Căn bậc hai số học của một số không âm là giá trị không âm có bình phương bằng số đó."], "Hình vuông cạnh x có diện tích x²."),
      section("g9-s2", "Quy tắc y = ax²", ["Thay x, tính x² trước rồi nhân với a.", "Hai đầu vào x và -x cho cùng x²."], "Máy hàm số bình phương đầu vào rồi nhân a."),
      section("g9-s3", "Bảng giá trị đối xứng", ["Các giá trị tại x và -x bằng nhau với hàm y = ax².", "Bảng giá trị nên chọn các cặp đầu vào đối nhau."], "Bảng có các cột -2, -1, 0, 1, 2."),
      section("g9-s4", "Đồ thị parabol", ["Các điểm của y = ax² tạo một đường cong đối xứng qua trục tung.", "Nếu a dương đồ thị mở lên; nếu a âm đồ thị mở xuống."], "Mặt phẳng tọa độ với parabol và trục đối xứng nét đứt."),
    ],
    examples: [
      example("g9-e1", "Tính y", "Với y = 2x², tìm y khi x = -3.", ["Bình phương trước: (-3)² = 9.", "Nhân 9 với 2.", "2 × 9 = 18."], "y = 18.", "Máy hàm số nhận -3, tạo 9 rồi nhân 2 thành 18."),
      example("g9-e2", "Kiểm tra một điểm", "Điểm (2;12) có thuộc y = 3x² không?", ["Thay x = 2 vào vế phải.", "3 × 2² = 3 × 4 = 12.", "Giá trị nhận được bằng tung độ của điểm."], "Có, điểm (2;12) thuộc đồ thị.", "Parabol y = 3x² có điểm (2;12) được đánh dấu."),
    ],
  },
  {
    slug: "grade-2-multiplication-division",
    title: "Nhân và chia bằng nhóm đều",
    grade: 2,
    domain: "NUMBERS_AND_OPERATIONS",
    outcomeId: "PLAVE-MOET2018-G2-MULDIV-01",
    skills: ["G2_REPEATED_ADDITION", "G2_EQUAL_GROUPS", "G2_INVERSE_DIVISION"],
    prerequisiteSlugs: ["grade-1-numbers-to-10"],
    restrictions: ["Dùng bảng nhân, chia 2 và 5 trong draft này.", "Phép chia luôn chia hết."],
    visual: "COUNTER_ROW",
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT"],
    levels: ["UNDERSTAND", "APPLY", "REASON"],
    misconceptions: ["GROUPS_VS_ITEMS", "REPEATED_ADDITION_COUNT", "DIVISION_REMAINDER"],
    kind: "MULTIPLICATION_DIVISION",
    theory: [
      section("g2m-s1", "Các nhóm bằng nhau", ["Phép nhân mô tả nhiều nhóm có cùng số đồ vật.", "Cần phân biệt số nhóm và số đồ vật trong mỗi nhóm."], "Các chấm được khoanh thành hai hoặc năm nhóm bằng nhau."),
      section("g2m-s2", "Từ cộng lặp đến nhân", ["Cộng cùng một số nhiều lần có thể viết gọn bằng phép nhân.", "Số nhóm nhân với số đồ vật mỗi nhóm cho tổng số đồ vật."], "Ba nhóm, mỗi nhóm hai chấm, kèm 2 + 2 + 2 và 3 × 2."),
      section("g2m-s3", "Chia thành nhóm đều", ["Phép chia có thể tìm số đồ vật mỗi nhóm hoặc số nhóm.", "Mọi nhóm phải có số lượng bằng nhau."], "Mười chấm được tách thành năm nhóm, mỗi nhóm hai chấm."),
      section("g2m-s4", "Nhân và chia ngược nhau", ["Nếu 5 × 2 = 10 thì 10 ÷ 5 = 2 và 10 ÷ 2 = 5.", "Dùng phép nhân để kiểm tra kết quả phép chia."], "Tam giác fact family nối ba số 2, 5 và 10."),
    ],
    examples: [
      example("g2m-e1", "Bốn nhóm hai", "Có 4 nhóm, mỗi nhóm 2 quả. Có tất cả bao nhiêu?", ["Viết cộng lặp: 2 + 2 + 2 + 2.", "Viết phép nhân: 4 × 2.", "Tính được 8."], "Có 8 quả.", "Bốn vòng tròn, mỗi vòng chứa hai quả."),
      example("g2m-e2", "Chia mười thành năm nhóm", "Chia đều 10 thẻ vào 5 nhóm. Mỗi nhóm có mấy thẻ?", ["Lần lượt đặt một thẻ vào mỗi nhóm.", "Tiếp tục đến khi hết 10 thẻ.", "Mỗi nhóm nhận 2 thẻ; 10 ÷ 5 = 2."], "Mỗi nhóm có 2 thẻ.", "Năm khung bằng nhau, mỗi khung có hai thẻ."),
    ],
  },
  {
    slug: "grade-3-multiplication-division",
    title: "Nhân, chia và bài toán nhóm đều",
    grade: 3,
    domain: "NUMBERS_AND_OPERATIONS",
    outcomeId: "PLAVE-MOET2018-G3-MULDIV-01",
    skills: ["G3_MULTIPLICATION_FACTS", "G3_DIVISION_FACTS", "G3_MULDIV_WORD_PROBLEMS"],
    prerequisiteSlugs: ["grade-2-multiplication-division"],
    restrictions: ["Dùng thừa số không quá 10 trong generator.", "Phép chia luôn có thương nguyên."],
    visual: "COUNTER_ROW",
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT"],
    levels: ["UNDERSTAND", "APPLY", "REASON"],
    misconceptions: ["FACT_RECALL", "DIVISOR_QUOTIENT_SWAP", "OPERATION_CHOICE"],
    kind: "MULTIPLICATION_DIVISION",
    theory: [
      section("g3m-s1", "Quan hệ trong bảng nhân", ["Mỗi phép nhân có thể được nhìn như một mảng hàng và cột.", "Đổi thứ tự hai thừa số không đổi tích."], "Mảng ba hàng bốn cột có thể xoay thành bốn hàng ba cột."),
      section("g3m-s2", "Fact family nhân–chia", ["Một phép nhân đúng tạo ra hai phép chia liên quan.", "Fact family giúp nhớ bảng chia từ bảng nhân."], "Tam giác số nối tích ở đỉnh với hai thừa số ở đáy."),
      section("g3m-s3", "Chọn phép tính", ["Tìm tổng của các nhóm đều dùng phép nhân.", "Biết tổng và số nhóm để tìm mỗi nhóm dùng phép chia."], "Sơ đồ thanh ghi tổng, số nhóm và giá trị mỗi nhóm."),
      section("g3m-s4", "Kiểm tra bằng phép ngược", ["Lấy thương nhân với số chia để kiểm tra số bị chia.", "Nếu tích không khớp, cần xem lại phép chia."], "Mũi tên hai chiều nối a × b = c với c ÷ a = b."),
    ],
    examples: [
      example("g3m-e1", "Mảng 6 × 4", "Một mảng có 6 hàng, mỗi hàng 4 ô. Có bao nhiêu ô?", ["Có 6 nhóm bằng nhau.", "Mỗi nhóm có 4 ô.", "Tính 6 × 4 = 24."], "Có 24 ô.", "Mảng chữ nhật sáu hàng và bốn cột."),
      example("g3m-e2", "Chia đều 42", "Chia 42 nhãn dán cho 7 bạn. Mỗi bạn nhận bao nhiêu?", ["Tìm số nhân với 7 được 42.", "Vì 7 × 6 = 42.", "Nên 42 ÷ 7 = 6."], "Mỗi bạn nhận 6 nhãn.", "Bốn mươi hai chấm chia thành bảy hàng bằng nhau."),
    ],
  },
  {
    slug: "grade-4-whole-number-operations",
    title: "Phép tính với số tự nhiên",
    grade: 4,
    domain: "NUMBERS_AND_OPERATIONS",
    outcomeId: "PLAVE-MOET2018-G4-WHOLEOPS-01",
    skills: ["G4_MULTI_DIGIT_ADD_SUBTRACT", "G4_MULTIPLY_DIVIDE", "G4_ORDER_OF_OPERATIONS"],
    prerequisiteSlugs: ["grade-3-multiplication-division"],
    restrictions: ["Giá trị không vượt 100000.", "Biểu thức tối đa hai phép tính trong draft."],
    visual: "PLACE_VALUE_CHART",
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT"],
    levels: ["UNDERSTAND", "APPLY", "REASON"],
    misconceptions: ["PLACE_ALIGNMENT", "OPERATION_ORDER", "DIVISION_CHECK"],
    kind: "WHOLE_NUMBER_OPERATIONS",
    theory: [
      section("g4w-s1", "Căn hàng khi cộng, trừ", ["Đặt các chữ số cùng hàng thẳng cột.", "Tính từ hàng đơn vị sang trái và xử lí nhớ hoặc mượn."], "Hai số nhiều chữ số đặt trong bảng hàng thẳng cột."),
      section("g4w-s2", "Nhân theo từng phần", ["Có thể tách một thừa số theo giá trị hàng.", "Nhân từng phần rồi cộng các tích riêng."], "Mô hình diện tích chia hình chữ nhật theo chục và đơn vị."),
      section("g4w-s3", "Chia và kiểm tra", ["Phép chia tìm số nhóm đều hoặc số phần trong mỗi nhóm.", "Lấy thương nhân số chia để kiểm tra khi phép chia hết."], "Sơ đồ fact family giữa số bị chia, số chia và thương."),
      section("g4w-s4", "Thứ tự phép tính", ["Trong biểu thức không có ngoặc, nhân và chia làm trước cộng và trừ.", "Các phép cùng mức được làm từ trái sang phải."], "Hai màu nhấn mạnh phép nhân trước phép cộng."),
    ],
    examples: [
      example("g4w-e1", "Cộng theo hàng", "Tính 2 468 + 1 357.", ["Đặt hai số thẳng hàng.", "Cộng từ đơn vị và nhớ khi tổng một hàng từ 10 trở lên.", "Nhận 3 825."], "2 468 + 1 357 = 3 825.", "Phép cộng dọc có nhãn nghìn, trăm, chục, đơn vị."),
      example("g4w-e2", "Tính đúng thứ tự", "Tính 18 + 6 × 4.", ["Thực hiện phép nhân trước: 6 × 4 = 24.", "Sau đó cộng 18 + 24.", "Kết quả 42."], "Giá trị biểu thức là 42.", "Biểu thức có 6 × 4 được khoanh trước, rồi mũi tên đến phép cộng."),
    ],
  },
  {
    slug: "grade-5-fraction-operations",
    title: "Phân số: tương đương, so sánh và cộng",
    grade: 5,
    domain: "NUMBERS_AND_OPERATIONS",
    outcomeId: "PLAVE-MOET2018-G5-FRA-01",
    skills: ["G5_EQUIVALENT_FRACTIONS", "G5_COMPARE_FRACTIONS", "G5_ADD_FRACTIONS"],
    prerequisiteSlugs: ["grade-4-fraction-foundations"],
    restrictions: ["Generator dùng mẫu số chung để tập trung vào ý nghĩa.", "Kết quả giữ dạng phân số để audit dễ kiểm tra."],
    visual: "FRACTION_BAR",
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT", "TEXT_INPUT"],
    levels: ["UNDERSTAND", "APPLY", "REASON"],
    misconceptions: ["COMMON_DENOMINATOR", "ADD_DENOMINATORS", "EQUIVALENT_SCALE"],
    kind: "FRACTION_OPERATIONS",
    theory: [
      section("g5f-s1", "Tương đương và rút gọn", ["Nhân hoặc chia cả tử và mẫu cho cùng một số khác 0 giữ nguyên giá trị phân số.", "Rút gọn giúp thấy cấu trúc đơn giản hơn."], "Hai thanh bằng nhau tô cùng độ dài với số phần chia khác nhau."),
      section("g5f-s2", "Tạo mẫu số chung", ["Để cộng hoặc so sánh phân số khác mẫu, có thể đổi về phân số tương đương cùng mẫu.", "Mẫu số chung phải là bội chung của các mẫu ban đầu."], "Hai lưới phân số được chia lại thành cùng số cột."),
      section("g5f-s3", "So sánh phân số", ["Sau khi cùng mẫu, so sánh tử số.", "Có thể dùng mốc 0, 1/2 và 1 để ước lượng trước."], "Tia số từ 0 đến 1 có các phân số được đánh dấu."),
      section("g5f-s4", "Cộng phân số", ["Đổi về cùng đơn vị phần rồi cộng số phần.", "Luôn kiểm tra có thể rút gọn kết quả hay không."], "Hai thanh phần được ghép thành một thanh tổng."),
    ],
    examples: [
      example("g5f-e1", "Quy đồng để so sánh", "So sánh 2/3 và 3/4.", ["Mẫu chung là 12.", "2/3 = 8/12; 3/4 = 9/12.", "Vì 8 < 9 nên 2/3 < 3/4."], "2/3 < 3/4.", "Hai thanh chia mười hai phần, tô tám và chín phần."),
      example("g5f-e2", "Cộng khác mẫu", "Tính 1/2 + 1/3.", ["Mẫu chung là 6.", "1/2 = 3/6; 1/3 = 2/6.", "3/6 + 2/6 = 5/6."], "Kết quả là 5/6.", "Hai thanh chia sáu phần, phần tô được ghép thành năm phần."),
    ],
  },
  {
    slug: "grade-6-fraction-operations",
    title: "Phân số và số hữu tỉ nhập môn",
    grade: 6,
    domain: "NUMBERS_AND_OPERATIONS",
    outcomeId: "PLAVE-MOET2018-G6-FRA-01",
    skills: ["G6_EQUIVALENT_FRACTIONS", "G6_COMPARE_FRACTIONS", "G6_ADD_FRACTIONS"],
    prerequisiteSlugs: ["grade-5-fraction-operations"],
    restrictions: ["Bài luyện generator dùng phân số dương cùng mẫu.", "Số hữu tỉ âm được giải thích nhưng chưa sinh trong batch này."],
    visual: "NUMBER_LINE",
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT", "TEXT_INPUT"],
    levels: ["UNDERSTAND", "APPLY", "REASON"],
    misconceptions: ["RATIONAL_SIGN", "DENOMINATOR_ZERO", "ADD_DENOMINATORS"],
    kind: "FRACTION_OPERATIONS",
    theory: [
      section("g6f-s1", "Phân số trên trục số", ["Phân số biểu diễn một vị trí chính xác trên trục số.", "Các phân số tương đương nằm cùng một điểm."], "Trục số có 1/2 và 2/4 ở cùng vị trí."),
      section("g6f-s2", "Mẫu số không bằng 0", ["Phép chia cho 0 không được xác định.", "Vì vậy mẫu số của phân số luôn khác 0."], "Thẻ a/b có b ≠ 0 được nhấn mạnh."),
      section("g6f-s3", "So sánh bằng mẫu chung", ["Đưa hai phân số về cùng mẫu dương rồi so sánh tử.", "Với phân số âm, dấu âm ảnh hưởng thứ tự trên trục số."], "Trục số có các điểm âm, 0 và dương."),
      section("g6f-s4", "Cộng và kiểm tra", ["Cộng phân số sau khi có cùng mẫu.", "Ước lượng vị trí kết quả trên trục số để kiểm tra tính hợp lí."], "Hai bước nhảy phân số liên tiếp trên trục số."),
    ],
    examples: [
      example("g6f-e1", "Cùng một điểm", "Vì sao 3/6 và 1/2 bằng nhau?", ["Chia cả tử và mẫu của 3/6 cho 3.", "Nhận 1/2.", "Hai phân số nằm cùng vị trí trên trục số."], "3/6 = 1/2.", "Trục số đánh dấu hai nhãn tại cùng điểm giữa 0 và 1."),
      example("g6f-e2", "Cộng và ước lượng", "Tính 2/7 + 3/7.", ["Hai phân số cùng mẫu 7.", "Cộng tử: 2 + 3 = 5.", "5/7 nằm giữa 1/2 và 1 nên kết quả hợp lí."], "Kết quả là 5/7.", "Trục số từ 0 đến 1 chia bảy phần với điểm 5/7."),
    ],
  },
  {
    slug: "grade-8-linear-equations",
    title: "Phương trình bậc nhất một ẩn",
    grade: 8,
    domain: "ALGEBRA_AND_PREALGEBRA",
    outcomeId: "PLAVE-MOET2018-G8-EQ-01",
    skills: ["G8_INVERSE_OPERATIONS", "G8_SOLVE_AX_PLUS_B", "G8_EQUATION_MODELLING"],
    prerequisiteSlugs: ["grade-7-ratio-proportion"],
    restrictions: ["Hệ số nguyên nhỏ, hệ số của x khác 0.", "Generator tạo nghiệm nguyên để tập trung vào phương pháp."],
    visual: "BALANCE_MODEL",
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT"],
    levels: ["UNDERSTAND", "APPLY", "REASON"],
    misconceptions: ["ONE_SIDE_ONLY", "SIGN_TRANSFER", "MODEL_UNKNOWN"],
    kind: "LINEAR_EQUATIONS",
    theory: [
      section("g8e-s1", "Hai vế cân bằng", ["Phương trình khẳng định hai biểu thức có cùng giá trị.", "Mọi phép biến đổi giữ tương đương phải tác động như nhau lên hai vế."], "Cân thăng bằng có biểu thức ở hai đĩa."),
      section("g8e-s2", "Phép toán ngược", ["Cộng và trừ là hai phép ngược nhau; nhân và chia cũng vậy.", "Dùng phép ngược để cô lập biến x."], "Chuỗi mũi tên phép toán và mũi tên ngược."),
      section("g8e-s3", "Giải ax + b = c", ["Trừ b ở cả hai vế trước.", "Sau đó chia cả hai vế cho a, với a khác 0."], "Cân được bỏ cùng b khối ở hai bên rồi chia thành a nhóm."),
      section("g8e-s4", "Kiểm tra nghiệm", ["Thay nghiệm tìm được vào phương trình ban đầu.", "Nếu hai vế bằng nhau, nghiệm thỏa mãn phương trình."], "Hộp thay x vào hai vế và dấu bằng màu trung tính."),
    ],
    examples: [
      example("g8e-e1", "Giải 3x + 5 = 20", "Tìm x.", ["Trừ 5 ở hai vế: 3x = 15.", "Chia hai vế cho 3: x = 5.", "Kiểm tra 3 × 5 + 5 = 20."], "x = 5.", "Cân ban đầu có ba hộp x và năm khối bằng hai mươi khối."),
      example("g8e-e2", "Lập phương trình", "Một số nhân 4 rồi bớt 3 được 25. Tìm số đó.", ["Gọi số cần tìm là x.", "Lập 4x - 3 = 25.", "Cộng 3 rồi chia 4: x = 7."], "Số cần tìm là 7.", "Máy quy tắc nhận x, nhân 4, trừ 3 và cho 25."),
    ],
  },
  {
    slug: "grade-9-linear-systems",
    title: "Hệ hai phương trình bậc nhất hai ẩn",
    grade: 9,
    domain: "ALGEBRA_AND_PREALGEBRA",
    outcomeId: "PLAVE-MOET2018-G9-SYS-01",
    skills: ["G9_VERIFY_SYSTEM_SOLUTION", "G9_SOLVE_SIMPLE_SYSTEM", "G9_SYSTEM_MODELLING"],
    prerequisiteSlugs: ["grade-8-linear-equations"],
    restrictions: ["Generator dùng hệ có nghiệm nguyên duy nhất.", "Hệ số nhỏ để tập trung vào phương pháp thế/cộng."],
    visual: "COORDINATE_PLANE",
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT"],
    levels: ["UNDERSTAND", "APPLY", "REASON"],
    misconceptions: ["VERIFY_ONE_EQUATION_ONLY", "ELIMINATION_SIGN", "VARIABLE_ROLE_SWAP"],
    kind: "LINEAR_SYSTEMS",
    theory: [
      section("g9s-s1", "Nghiệm của một hệ", ["Một cặp (x;y) là nghiệm khi đồng thời thỏa mãn cả hai phương trình.", "Kiểm tra một phương trình thôi là chưa đủ."], "Hai đường thẳng cắt nhau tại một điểm được gắn nhãn."),
      section("g9s-s2", "Phương pháp thế", ["Biểu diễn một ẩn theo ẩn kia từ một phương trình.", "Thế biểu thức đó vào phương trình còn lại để được phương trình một ẩn."], "Mũi tên thay một hộp biểu thức vào phương trình thứ hai."),
      section("g9s-s3", "Phương pháp cộng", ["Nhân phương trình nếu cần để hệ số một ẩn đối nhau.", "Cộng hai phương trình để khử ẩn đó."], "Hai dòng phương trình thẳng cột với một cột hệ số bị khử."),
      section("g9s-s4", "Mô hình hai đại lượng", ["Chọn hai ẩn và nêu rõ mỗi ẩn đại diện đại lượng nào.", "Từ hai quan hệ độc lập, lập hai phương trình rồi kiểm tra nghiệm trong ngữ cảnh."], "Bảng hai cột tên đại lượng và biểu thức tương ứng."),
    ],
    examples: [
      example("g9s-e1", "Giải hệ tổng và hiệu", "Giải x + y = 10 và x - y = 2.", ["Cộng hai phương trình: 2x = 12.", "Suy ra x = 6.", "Thế vào x + y = 10 được y = 4."], "(x;y) = (6;4).", "Hai đường thẳng cắt nhau tại điểm (6;4)."),
      example("g9s-e2", "Kiểm tra cặp số", "Cặp (3;2) có thỏa x + y = 5 và 2x - y = 4 không?", ["Thay vào phương trình một: 3 + 2 = 5.", "Thay vào phương trình hai: 2 × 3 - 2 = 4.", "Cả hai đều đúng."], "(3;2) là nghiệm của hệ.", "Hai dấu kiểm cạnh hai phương trình sau khi thay số."),
    ],
  },
] as const;

const unitSeeds: readonly UnitSeed[] = [
  ...coreUnitSeeds,
  ...batchAUnitSeeds,
  ...batchBUnitSeeds,
  grade2DataUnitSeed,
  ...batchesCHUnitSeeds,
  grade1NumberOperationsUnitSeed,
  ...p0UnitSeeds,
  ...grade1P1UnitSeeds,
  ...grade2P1UnitSeeds,
  ...grade3P1UnitSeeds,
  ...grade3CompletionUnitSeeds,
  ...grade4CompletionUnitSeeds,
  ...grade5CompletionUnitSeeds,
  ...grade6CompletionUnitSeeds,
  ...grade7CompletionUnitSeeds,
  ...grade7RemainingUnitSeeds,
  ...grade8CompletionUnitSeeds,
  ...grade9CompletionUnitSeeds,
];

export const curriculumUnits: readonly CurriculumUnit[] = unitSeeds.map(
  (seed) => ({
    slug: seed.slug,
    title: seed.title,
    grade: seed.grade,
    domain: seed.domain,
    outcomeIds: [seed.outcomeId],
    officialOutcomeIds: [
      ...new Set([
        ...(seed.officialOutcomeIds ?? []),
        ...(officialOutcomeIdsByMappedUnitSlug.get(seed.slug) ?? []),
      ]),
    ],
    skillFamilies: seed.skills,
    prerequisiteSlugs: seed.prerequisiteSlugs,
    reusableParameters: [
      { name: "seed", description: "Chuỗi xác định để tái tạo cùng bộ câu hỏi." },
      { name: "questionCount", description: "Số câu của draft.", minimum: 12, maximum: 12 },
      { name: "difficultyBand", description: "Dải UNDERSTAND–REASON theo cấu hình unit." },
    ],
    gradeSpecificRestrictions: seed.restrictions,
    requiredVisual: seed.visual,
    answerTypes: seed.answers,
    cognitiveLevels: seed.levels,
    misconceptionTags: seed.misconceptions,
    sourceReferenceIds: ["MOET-MATH-2018"],
    readiness: [
      "OFFICIAL_SOURCE_MAPPED",
      "TEACHABLE_IMPLEMENTED",
      "VALIDATOR_PASSED",
    ],
    generationStatus: "DRAFT_GENERATED",
    sourceValidationStatus: "OFFICIAL_SOURCE_MAPPED",
    kind: seed.kind,
    theory: seed.theory,
    examples: seed.examples,
  }),
);

export function getCurriculumUnit(slug: string) {
  return curriculumUnits.find((unit) => unit.slug === slug) ?? null;
}

export function getRepresentativeUnitForGrade(grade: number) {
  return curriculumUnits.find((unit) => unit.grade === grade) ?? null;
}

const allDomains: readonly CurriculumDomain[] = [
  "NUMBERS_AND_OPERATIONS",
  "ALGEBRA_AND_PREALGEBRA",
  "GEOMETRY",
  "MEASUREMENT",
  "STATISTICS_AND_PROBABILITY",
  "APPLIED_PROBLEM_SOLVING",
];

export const domainCoverage: readonly DomainCoverageEntry[] = Array.from(
  { length: 9 },
  (_, index) => index + 1,
).flatMap((grade) =>
  allDomains.map((domain) => {
    const implemented = curriculumUnits.some(
      (unit) => unit.grade === grade && unit.domain === domain,
    );
    const ownerDeclaredNotApplicable =
      (grade === 1 && domain === "STATISTICS_AND_PROBABILITY") ||
      ((grade === 8 || grade === 9) && domain === "NUMBERS_AND_OPERATIONS");
    const algebraApplicable = grade >= 6;
    const applicable =
      domain !== "ALGEBRA_AND_PREALGEBRA" || algebraApplicable;
    return {
      grade: grade as CurriculumUnit["grade"],
      domain,
      status: implemented
        ? "TEACHABLE_IMPLEMENTED"
        : ownerDeclaredNotApplicable
          ? "NOT_APPLICABLE_BY_OFFICIAL_CURRICULUM"
        : applicable
          ? "BLUEPRINT_ONLY"
          : "NOT_APPLICABLE",
      note: implemented
        ? "Có một vertical slice draft chạy end-to-end; không đại diện toàn bộ domain."
        : ownerDeclaredNotApplicable
          ? "Không áp dụng theo phạm vi strand chính thức được source-lock trong outcome index."
        : applicable
          ? "Outcome chi tiết chưa được map/implement trong deadline slice."
          : "Không ép algebra thành domain độc lập ở tiểu học; tư duy đại số được tích hợp trong Số và phép tính.",
    };
  }),
);
