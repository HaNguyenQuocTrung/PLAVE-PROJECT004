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

type ExpansionUnitSeed = Readonly<{
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

const section = (
  id: string,
  title: string,
  explanation: readonly string[],
  visualDescription: string,
): TheorySection => ({ id, title, explanation, visualDescription });

const example = (
  id: string,
  title: string,
  prompt: string,
  steps: readonly string[],
  answer: string,
  visualDescription: string,
): WorkedExample => ({
  id,
  title,
  prompt,
  steps,
  answer,
  visualDescription,
});

export const batchAOutcomes: readonly CurriculumOutcome[] = [
  {
    id: "PLAVE-MOET2018-G1-GEO-01",
    grade: 1,
    domain: "GEOMETRY",
    summary:
      "Nhận dạng hình tròn, tam giác, vuông, chữ nhật qua hình dạng và các đặc điểm trực quan đơn giản.",
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  },
  {
    id: "PLAVE-MOET2018-G1-MEA-01",
    grade: 1,
    domain: "MEASUREMENT",
    summary:
      "So sánh độ dài và thực hành đo độ dài bằng xăng-ti-mét trong tình huống gần gũi.",
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  },
  {
    id: "PLAVE-MOET2018-G2-GEO-01",
    grade: 2,
    domain: "GEOMETRY",
    summary:
      "Mô tả, nhận dạng một số hình phẳng thông dụng và kiểm tra số cạnh, số đỉnh.",
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  },
  {
    id: "PLAVE-MOET2018-G2-MEA-01",
    grade: 2,
    domain: "MEASUREMENT",
    summary:
      "Đo, ước lượng, so sánh và tính với độ dài theo đơn vị xăng-ti-mét trong phạm vi phù hợp.",
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  },
  {
    id: "PLAVE-MOET2018-G3-GEO-01",
    grade: 3,
    domain: "GEOMETRY",
    summary:
      "Nhận biết đặc điểm cạnh, đỉnh của hình phẳng và dùng đặc điểm để phân loại hình.",
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  },
  {
    id: "PLAVE-MOET2018-G3-MEA-01",
    grade: 3,
    domain: "MEASUREMENT",
    summary:
      "Đọc dụng cụ đo, thực hiện phép tính độ dài cùng đơn vị và giải thích kết quả đo.",
    sourceReferenceIds: ["MOET-MATH-2018"],
    status: "OFFICIAL_SOURCE_MAPPED",
  },
];

export const batchAUnitSeeds: readonly ExpansionUnitSeed[] = [
  {
    slug: "grade-1-shapes",
    title: "Nhận biết các hình phẳng",
    grade: 1,
    domain: "GEOMETRY",
    outcomeId: "PLAVE-MOET2018-G1-GEO-01",
    skills: ["G1_IDENTIFY_SHAPE", "G1_COUNT_SIDES", "G1_COUNT_CORNERS"],
    prerequisiteSlugs: [],
    restrictions: ["Chỉ dùng hình tròn, tam giác, vuông và chữ nhật.", "Không dùng định nghĩa góc hoặc tính chất vượt lớp."],
    visual: "SHAPE_SCENE",
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT", "TEXT_INPUT"],
    levels: ["UNDERSTAND", "APPLY"],
    misconceptions: ["SHAPE_BY_SIZE", "SIDE_CORNER_CONFUSION", "ROTATED_SHAPE"],
    kind: "GEOMETRY_PRACTICE",
    theory: [
      section("g1geo-s1", "Nhìn toàn bộ hình", ["Tên hình không đổi khi hình to hơn, nhỏ hơn hoặc xoay đi.", "Ta nhìn đường bao quanh hình để nhận biết."], "Một hình vuông ở tư thế ngay và một hình vuông được xoay."),
      section("g1geo-s2", "Hình tròn", ["Hình tròn có đường bao cong khép kín.", "Hình tròn không có cạnh thẳng và không có góc nhọn."], "Một hình tròn rõ nét trên nền sáng."),
      section("g1geo-s3", "Tam giác", ["Tam giác có ba cạnh thẳng.", "Ba cạnh gặp nhau tạo thành ba đỉnh."], "Một tam giác với ba cạnh và ba đỉnh được làm nổi bật."),
      section("g1geo-s4", "Vuông và chữ nhật", ["Hình vuông và hình chữ nhật đều có bốn cạnh, bốn đỉnh.", "Không gọi tên chỉ dựa vào việc hình đang nằm ngang hay đứng dọc."], "Một hình vuông và một hình chữ nhật đặt cạnh nhau."),
    ],
    examples: [
      example("g1geo-e1", "Nhận ra tam giác", "Hình có ba cạnh thẳng là hình gì?", ["Theo đường bao và đếm từng cạnh đúng một lần.", "Có ba cạnh thẳng.", "Hình có ba cạnh là tam giác."], "Hình tam giác.", "Tam giác có từng cạnh được đánh dấu."),
      example("g1geo-e2", "Đếm đỉnh hình vuông", "Hình vuông có bao nhiêu đỉnh?", ["Chỉ vào nơi hai cạnh gặp nhau.", "Đi quanh hình và đếm mỗi nơi một lần.", "Có bốn nơi hai cạnh gặp nhau."], "Hình vuông có 4 đỉnh.", "Hình vuông với bốn chấm tại bốn đỉnh."),
    ],
  },
  {
    slug: "grade-1-length-centimetres",
    title: "So sánh và đo độ dài",
    grade: 1,
    domain: "MEASUREMENT",
    outcomeId: "PLAVE-MOET2018-G1-MEA-01",
    skills: ["G1_COMPARE_LENGTH", "G1_READ_CM_SCALE", "G1_ADD_LENGTH"],
    prerequisiteSlugs: [],
    restrictions: ["Độ dài nguyên từ 1 đến 10 cm.", "Các phép cộng không vượt 10 cm."],
    visual: "MEASUREMENT_SCALE",
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT", "TEXT_INPUT"],
    levels: ["UNDERSTAND", "APPLY"],
    misconceptions: ["COUNT_MARKS_NOT_SPACES", "MISALIGNED_START", "OMIT_UNIT"],
    kind: "MEASUREMENT_PRACTICE",
    theory: [
      section("g1mea-s1", "Dài hơn và ngắn hơn", ["Đặt hai đầu vật cùng một vạch bắt đầu.", "Vật vươn xa hơn thì dài hơn."], "Hai đoạn thẳng cùng bắt đầu tại vạch 0."),
      section("g1mea-s2", "Đơn vị xăng-ti-mét", ["Xăng-ti-mét viết tắt là cm.", "Đơn vị cho biết ta đang đo độ dài, không chỉ đếm."], "Một đoạn dài một khoảng giữa hai vạch liên tiếp."),
      section("g1mea-s3", "Đặt đúng vạch 0", ["Một đầu vật phải trùng vạch 0 của thước.", "Nếu bắt đầu sai vạch, số đọc không phải độ dài."], "Đầu trái đoạn thẳng trùng vạch 0."),
      section("g1mea-s4", "Đếm khoảng", ["Độ dài là số khoảng bằng nhau, không phải số vạch.", "Từ 0 đến 4 có bốn khoảng một xăng-ti-mét."], "Thước từ 0 đến 4 tô bốn khoảng."),
    ],
    examples: [
      example("g1mea-e1", "Đọc thước", "Đoạn bắt đầu ở 0 và kết thúc ở 6 dài bao nhiêu?", ["Kiểm tra đầu trái ở vạch 0.", "Đọc số tại đầu phải là 6.", "Gắn đơn vị cm."], "Đoạn dài 6 cm.", "Thước có đoạn được tô từ 0 đến 6."),
      example("g1mea-e2", "Ghép hai đoạn", "Một đoạn dài 3 cm nối với đoạn dài 2 cm. Tổng dài bao nhiêu?", ["Hai đoạn nối tiếp nên cộng độ dài.", "Tính 3 + 2 = 5.", "Ghi đơn vị cm."], "Tổng dài 5 cm.", "Hai đoạn 3 cm và 2 cm nối trên cùng thước."),
    ],
  },
  {
    slug: "grade-2-shape-properties",
    title: "Cạnh và đỉnh của hình phẳng",
    grade: 2,
    domain: "GEOMETRY",
    outcomeId: "PLAVE-MOET2018-G2-GEO-01",
    skills: ["G2_CLASSIFY_SHAPE", "G2_COUNT_SIDES", "G2_COUNT_VERTICES"],
    prerequisiteSlugs: ["grade-1-shapes"],
    restrictions: ["Dùng hình phẳng quen thuộc.", "Không suy ra hình chỉ từ hướng đặt."],
    visual: "SHAPE_SCENE",
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT", "TEXT_INPUT"],
    levels: ["UNDERSTAND", "APPLY", "REASON"],
    misconceptions: ["ROTATION_CHANGES_SHAPE", "EDGE_VERTEX_SWAP", "RECTANGLE_SQUARE_CONFUSION"],
    kind: "GEOMETRY_PRACTICE",
    theory: [
      section("g2geo-s1", "Cạnh là đoạn thẳng", ["Mỗi đoạn thẳng trên đường bao là một cạnh.", "Đếm theo một chiều và dừng khi về cạnh đầu."], "Hình chữ nhật có bốn cạnh được tô luân phiên."),
      section("g2geo-s2", "Đỉnh là nơi hai cạnh gặp nhau", ["Hai cạnh liền nhau gặp tại một đỉnh.", "Số đỉnh của tam giác, vuông và chữ nhật bằng số cạnh."], "Các đỉnh được đánh dấu bằng chấm."),
      section("g2geo-s3", "Phân loại bằng đặc điểm", ["Tam giác có ba cạnh; vuông và chữ nhật có bốn cạnh.", "Hình tròn có đường cong nên không đếm như cạnh thẳng."], "Bốn hình đặt thành hàng để so sánh."),
      section("g2geo-s4", "Hình xoay vẫn giữ tên", ["Xoay hình không làm thêm hoặc bớt cạnh, đỉnh.", "Hãy kiểm tra đặc điểm thay vì đoán theo tư thế."], "Một hình vuông được xoay nhưng vẫn có bốn cạnh."),
    ],
    examples: [
      example("g2geo-e1", "Phân loại theo cạnh", "Hình có 3 cạnh và 3 đỉnh là hình gì?", ["Đếm ba đoạn thẳng trên đường bao.", "Kiểm tra ba nơi các cạnh gặp nhau.", "Đặc điểm khớp với tam giác."], "Hình tam giác.", "Tam giác với cạnh và đỉnh được đánh dấu."),
      example("g2geo-e2", "Hình chữ nhật xoay", "Xoay hình chữ nhật có đổi tên không?", ["Phép xoay chỉ đổi hướng nhìn.", "Hình vẫn có bốn cạnh và bốn đỉnh.", "Đặc điểm không đổi nên tên không đổi."], "Không, vẫn là hình chữ nhật.", "Hai hình chữ nhật cùng kích thước ở hai hướng."),
    ],
  },
  {
    slug: "grade-2-length-calculations",
    title: "Đo và tính độ dài",
    grade: 2,
    domain: "MEASUREMENT",
    outcomeId: "PLAVE-MOET2018-G2-MEA-01",
    skills: ["G2_READ_LENGTH", "G2_COMPARE_LENGTH", "G2_CALCULATE_LENGTH"],
    prerequisiteSlugs: ["grade-1-length-centimetres"],
    restrictions: ["Dùng độ dài nguyên đến 100 cm.", "Phép tính cùng đơn vị cm."],
    visual: "MEASUREMENT_SCALE",
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT", "TEXT_INPUT"],
    levels: ["UNDERSTAND", "APPLY", "REASON"],
    misconceptions: ["COUNT_TICKS", "DROP_CM", "COMPARE_NUMBER_WITHOUT_UNIT"],
    kind: "MEASUREMENT_PRACTICE",
    theory: [
      section("g2mea-s1", "Đọc hiệu hai vạch", ["Nếu đoạn không bắt đầu ở 0, lấy số cuối trừ số đầu.", "Khoảng từ vạch 3 đến vạch 8 dài 5 cm."], "Thước tô đoạn từ 3 đến 8."),
      section("g2mea-s2", "So sánh cùng đơn vị", ["Đổi về cùng đơn vị trước khi so sánh.", "Khi đều là cm, so sánh các số đo."], "Hai đoạn 7 cm và 9 cm cùng bắt đầu ở 0."),
      section("g2mea-s3", "Cộng độ dài", ["Các đoạn nối tiếp được cộng độ dài.", "Kết quả vẫn mang đơn vị cm."], "Hai đoạn liên tiếp có nhãn độ dài."),
      section("g2mea-s4", "Tìm phần còn lại", ["Độ dài toàn bộ bằng tổng các phần.", "Muốn tìm phần thiếu, lấy toàn bộ trừ phần đã biết."], "Một thanh chia phần đã biết và phần chưa biết."),
    ],
    examples: [
      example("g2mea-e1", "Đo không bắt đầu từ 0", "Đoạn từ vạch 2 đến vạch 9 dài bao nhiêu?", ["Đầu đoạn ở 2, cuối đoạn ở 9.", "Tính 9 - 2 = 7.", "Ghi đơn vị cm."], "Đoạn dài 7 cm.", "Thước đánh dấu từ 2 đến 9."),
      example("g2mea-e2", "Tìm đoạn thiếu", "Thanh dài 12 cm, một phần dài 5 cm. Phần còn lại dài bao nhiêu?", ["Toàn bộ gồm hai phần.", "Lấy 12 - 5 = 7.", "Kiểm tra 5 + 7 = 12."], "Phần còn lại dài 7 cm.", "Thanh 12 cm chia thành phần 5 cm và phần còn lại."),
    ],
  },
  {
    slug: "grade-3-polygon-properties",
    title: "Phân loại hình theo cạnh và đỉnh",
    grade: 3,
    domain: "GEOMETRY",
    outcomeId: "PLAVE-MOET2018-G3-GEO-01",
    skills: ["G3_USE_SHAPE_PROPERTIES", "G3_COUNT_EDGES", "G3_REASON_VERTICES"],
    prerequisiteSlugs: ["grade-2-shape-properties"],
    restrictions: ["Tập trung tam giác và tứ giác quen thuộc.", "Không dùng chứng minh hình học hình thức."],
    visual: "SHAPE_SCENE",
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT", "TEXT_INPUT"],
    levels: ["UNDERSTAND", "APPLY", "REASON"],
    misconceptions: ["APPEARANCE_ONLY", "SIDE_VERTEX_SWAP", "ROTATION_CHANGES_PROPERTY"],
    kind: "GEOMETRY_PRACTICE",
    theory: [
      section("g3geo-s1", "Thuộc tính không đổi", ["Số cạnh và số đỉnh không đổi khi hình di chuyển hoặc xoay.", "Thuộc tính giúp phân loại đáng tin cậy hơn vẻ ngoài."], "Một tứ giác ở hai tư thế."),
      section("g3geo-s2", "Tam giác", ["Mọi tam giác đều có ba cạnh và ba đỉnh.", "Độ dài cạnh có thể khác nhau nhưng vẫn là tam giác."], "Hai tam giác khác hình dáng cùng có ba cạnh."),
      section("g3geo-s3", "Tứ giác", ["Hình có bốn cạnh thẳng là một tứ giác.", "Hình vuông và chữ nhật là các tứ giác quen thuộc."], "Hình vuông và chữ nhật nằm trong nhóm tứ giác."),
      section("g3geo-s4", "Giải thích cách phân loại", ["Nêu đặc điểm quan sát được trước khi gọi tên.", "Một câu trả lời tốt gồm tên hình và lý do về cạnh, đỉnh."], "Khung câu: có ... cạnh và ... đỉnh nên là ..."),
    ],
    examples: [
      example("g3geo-e1", "Nhận biết tứ giác", "Hình có 4 cạnh thẳng và 4 đỉnh thuộc nhóm nào?", ["Đếm bốn cạnh thẳng.", "Kiểm tra bốn đỉnh.", "Định nghĩa tứ giác khớp cả hai đặc điểm."], "Hình đó là tứ giác.", "Tứ giác không đều với bốn cạnh được tô."),
      example("g3geo-e2", "Không bị đánh lừa bởi phép xoay", "Một hình vuông xoay nghiêng có còn là tứ giác không?", ["Xoay không đổi đường bao.", "Hình vẫn có bốn cạnh thẳng và bốn đỉnh.", "Do đó vẫn là tứ giác và vẫn là hình vuông."], "Có.", "Hình vuông xoay nghiêng với bốn cạnh đánh dấu."),
    ],
  },
  {
    slug: "grade-3-length-reasoning",
    title: "Đọc thước và giải bài toán độ dài",
    grade: 3,
    domain: "MEASUREMENT",
    outcomeId: "PLAVE-MOET2018-G3-MEA-01",
    skills: ["G3_READ_SCALE", "G3_COMBINE_LENGTHS", "G3_FIND_UNKNOWN_LENGTH"],
    prerequisiteSlugs: ["grade-2-length-calculations"],
    restrictions: ["Số đo nguyên và cùng đơn vị cm.", "Mọi bài toán nêu đủ dữ kiện."],
    visual: "MEASUREMENT_SCALE",
    answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT", "TEXT_INPUT"],
    levels: ["UNDERSTAND", "APPLY", "REASON"],
    misconceptions: ["COUNT_MARKS", "WRONG_OPERATION", "OMIT_MEASUREMENT_UNIT"],
    kind: "MEASUREMENT_PRACTICE",
    theory: [
      section("g3mea-s1", "Khoảng cách giữa hai vạch", ["Khoảng cách bằng số cuối trừ số đầu.", "Quy tắc này dùng được khi đoạn không bắt đầu ở 0."], "Thước có đầu đoạn tại 4 và cuối tại 11."),
      section("g3mea-s2", "Mô hình toàn bộ và các phần", ["Toàn bộ bằng tổng các phần nối tiếp.", "Sơ đồ đoạn thẳng giúp chọn phép cộng hay trừ."], "Một thanh gồm hai phần có ngoặc chỉ toàn bộ."),
      section("g3mea-s3", "Ghi đơn vị", ["Kết quả đo phải có số và đơn vị.", "Không cộng các số đo khác đơn vị nếu chưa đổi."], "Thẻ kết quả gồm ô số và nhãn cm."),
      section("g3mea-s4", "Kiểm tra kết quả", ["Độ dài không thể âm.", "Dùng phép tính ngược để kiểm tra phần thiếu."], "Phép cộng kiểm tra cho một phép trừ độ dài."),
    ],
    examples: [
      example("g3mea-e1", "Đọc đoạn trên thước", "Đoạn từ vạch 5 đến vạch 14 dài bao nhiêu?", ["Xác định đầu 5 và cuối 14.", "Tính 14 - 5 = 9.", "Gắn đơn vị cm."], "Đoạn dài 9 cm.", "Thước tô đoạn từ 5 đến 14."),
      example("g3mea-e2", "Tìm chiều dài phần thứ hai", "Hai đoạn nối nhau dài 18 cm; đoạn đầu 7 cm. Đoạn sau dài bao nhiêu?", ["Toàn bộ 18 cm gồm hai phần.", "Lấy 18 - 7 = 11.", "Kiểm tra 7 + 11 = 18."], "Đoạn sau dài 11 cm.", "Thanh 18 cm chia tại vạch 7 cm."),
    ],
  },
];
