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
  slug: string; title: string; grade: CurriculumUnit["grade"];
  domain: CurriculumUnit["domain"]; outcomeId: string;
  skills: readonly [string, string, string]; prerequisiteSlugs: readonly string[];
  restrictions: readonly string[]; visual: VisualRequirement;
  answers: readonly PreviewAnswerType[]; levels: readonly PreviewCognitiveLevel[];
  misconceptions: readonly string[]; kind: VerticalUnitKind;
  theory: readonly TheorySection[]; examples: readonly WorkedExample[];
}>;

const s = (id: string, title: string, explanation: readonly string[], visualDescription: string): TheorySection =>
  ({ id, title, explanation, visualDescription });
const e = (id: string, title: string, prompt: string, steps: readonly string[], answer: string, visualDescription: string): WorkedExample =>
  ({ id, title, prompt, steps, answer, visualDescription });

const outcome = (
  grade: 4 | 5 | 6,
  code: string,
  domain: "GEOMETRY" | "MEASUREMENT",
  summary: string,
): CurriculumOutcome => ({
  id: `PLAVE-MOET2018-G${grade}-${code}-01`,
  grade,
  domain,
  summary,
  sourceReferenceIds: ["MOET-MATH-2018"],
  status: "OFFICIAL_SOURCE_MAPPED",
});

export const batchBOutcomes = [
  outcome(4, "GEO", "GEOMETRY", "Nhận biết, so sánh góc nhọn, góc vuông, góc tù và vận dụng số đo góc đơn giản."),
  outcome(4, "MEA", "MEASUREMENT", "Tính chu vi, diện tích hình chữ nhật, hình vuông với số đo cùng đơn vị."),
  outcome(5, "GEO", "GEOMETRY", "Sử dụng số đo để phân loại góc và tìm góc kề trên đường thẳng trong trường hợp quen thuộc."),
  outcome(5, "MEA", "MEASUREMENT", "Tính diện tích tam giác, hình chữ nhật và giải thích vai trò đáy, chiều cao."),
  outcome(6, "GEO", "GEOMETRY", "Nhận biết loại góc, quan hệ góc và vận dụng tổng ba góc trong tam giác."),
  outcome(6, "MEA", "MEASUREMENT", "Vận dụng công thức chu vi, diện tích hình phẳng trong bài toán đo lường có đủ dữ kiện."),
] as const;

const angleTheory = (prefix: string, advanced: boolean): readonly TheorySection[] => [
  s(`${prefix}-s1`, "Số đo góc", ["Góc được đo bằng độ, kí hiệu °.", "Số đo cho biết độ mở, không phụ thuộc độ dài hai tia."], "Hai tia chung gốc tạo một góc có cung đánh dấu."),
  s(`${prefix}-s2`, "Phân loại góc", ["Góc nhọn bé hơn 90°, góc vuông bằng 90°.", "Góc tù lớn hơn 90° và bé hơn 180°."], "Ba góc nhọn, vuông, tù đặt cạnh nhau."),
  s(`${prefix}-s3`, "Góc trên đường thẳng", ["Hai góc kề tạo thành góc bẹt có tổng 180°.", "Muốn tìm góc thiếu, lấy 180° trừ góc đã biết."], "Một đường thẳng và một tia chia góc bẹt."),
  s(`${prefix}-s4`, advanced ? "Góc trong tam giác" : "Giải thích bằng mốc 90°", advanced
    ? ["Tổng ba góc trong một tam giác bằng 180°.", "Góc thiếu bằng 180° trừ tổng hai góc còn lại."]
    : ["So sánh độ mở với góc vuông.", "Nêu cả số đo và loại góc để giải thích."],
    advanced ? "Tam giác có ba cung góc trong." : "Một góc vuông làm mốc so sánh."),
];

const areaTheory = (prefix: string, triangle: boolean): readonly TheorySection[] => [
  s(`${prefix}-s1`, "Đơn vị diện tích", ["Diện tích đo phần mặt phẳng được phủ.", "Đơn vị vuông như cm² khác với đơn vị độ dài cm."], "Lưới ô vuông phủ kín một hình."),
  s(`${prefix}-s2`, "Hình chữ nhật", ["Diện tích bằng chiều dài nhân chiều rộng.", "Hai số đo phải cùng đơn vị trước khi nhân."], "Hình chữ nhật chia thành hàng và cột ô vuông."),
  s(`${prefix}-s3`, "Chu vi và diện tích", ["Chu vi đo đường bao, diện tích đo phần bên trong.", "Không dùng công thức chu vi để trả lời câu hỏi diện tích."], "Đường bao đậm và phần bên trong tô nhạt."),
  s(`${prefix}-s4`, triangle ? "Diện tích tam giác" : "Tìm cạnh chưa biết", triangle
    ? ["Diện tích tam giác bằng đáy nhân chiều cao rồi chia 2.", "Chiều cao phải vuông góc với đáy đã chọn."]
    : ["Từ diện tích và một cạnh, chia để tìm cạnh còn lại.", "Thay lại công thức để kiểm tra."],
    triangle ? "Tam giác có đáy và đường cao vuông góc." : "Hình chữ nhật có một cạnh để trống."),
];

const angleExamples = (prefix: string, advanced: boolean): readonly WorkedExample[] => [
  e(`${prefix}-e1`, "Phân loại góc", "Góc 120° thuộc loại nào?", ["So sánh 120° với 90° và 180°.", "120° lớn hơn 90° nhưng nhỏ hơn 180°.", "Theo định nghĩa, đó là góc tù."], "Góc tù.", "Góc mở 120° có cung chỉ số đo."),
  e(`${prefix}-e2`, advanced ? "Góc thiếu trong tam giác" : "Góc kề trên đường thẳng", advanced ? "Tam giác có hai góc 50° và 60°. Góc còn lại bằng bao nhiêu?" : "Một góc 70° kề với góc chưa biết trên đường thẳng. Tìm góc chưa biết.",
    advanced ? ["Tổng ba góc là 180°.", "Cộng 50° + 60° = 110°.", "Lấy 180° - 110° = 70°."]
      : ["Hai góc kề trên đường thẳng có tổng 180°.", "Lấy 180° - 70°.", "Góc còn lại bằng 110°."],
    advanced ? "70°." : "110°.", "Sơ đồ góc với phần chưa biết được đánh dấu."),
];

const areaExamples = (prefix: string, triangle: boolean): readonly WorkedExample[] => [
  e(`${prefix}-e1`, "Diện tích hình chữ nhật", "Hình chữ nhật dài 8 cm, rộng 3 cm có diện tích bao nhiêu?", ["Dữ kiện cùng đơn vị cm.", "Nhân 8 × 3 = 24.", "Diện tích dùng đơn vị cm²."], "24 cm².", "Hình chữ nhật 8 cột và 3 hàng ô vuông."),
  e(`${prefix}-e2`, triangle ? "Diện tích tam giác" : "Tìm chiều rộng", triangle ? "Tam giác có đáy 10 cm, cao 4 cm. Tính diện tích." : "Hình chữ nhật diện tích 30 cm², dài 6 cm. Tìm chiều rộng.",
    triangle ? ["Nhân đáy với chiều cao: 10 × 4 = 40.", "Chia 2 vì tam giác bằng nửa hình chữ nhật tương ứng.", "40 ÷ 2 = 20 cm²."]
      : ["Dùng diện tích = dài × rộng.", "Lấy 30 ÷ 6 = 5.", "Kiểm tra 6 × 5 = 30."],
    triangle ? "20 cm²." : "5 cm.", triangle ? "Tam giác có đường cao 4 cm trên đáy 10 cm." : "Hình chữ nhật có cạnh dài 6 cm và cạnh còn lại chưa biết."),
];

export const batchBUnitSeeds: readonly Seed[] = ([4, 5, 6] as const).flatMap((grade) => {
  const advanced = grade === 6;
  const triangle = grade >= 5;
  const previousGeometry = grade === 4 ? "grade-3-polygon-properties" : `grade-${grade - 1}-angle-reasoning`;
  const previousMeasurement = grade === 4 ? "grade-3-length-reasoning" : `grade-${grade - 1}-area-measurement`;
  return [
    {
      slug: `grade-${grade}-angle-reasoning`,
      title: grade === 6 ? "Góc và tam giác" : "Số đo và phân loại góc",
      grade, domain: "GEOMETRY", outcomeId: `PLAVE-MOET2018-G${grade}-GEO-01`,
      skills: [`G${grade}_CLASSIFY_ANGLE`, `G${grade}_STRAIGHT_ANGLE`, `G${grade}_ANGLE_REASONING`],
      prerequisiteSlugs: [previousGeometry],
      restrictions: ["Số đo nguyên từ 10° đến 170°.", advanced ? "Dùng tổng góc tam giác trong trường hợp đủ dữ kiện." : "Chưa dùng chứng minh hình học hình thức."],
      visual: "ANGLE_DIAGRAM", answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT", "TEXT_INPUT"],
      levels: ["UNDERSTAND", "APPLY", "REASON"], misconceptions: ["RAY_LENGTH_CHANGES_ANGLE", "ANGLE_TYPE_BOUNDARY", "SUBTRACT_FROM_360"],
      kind: "ANGLE_PRACTICE", theory: angleTheory(`g${grade}geo`, advanced), examples: angleExamples(`g${grade}geo`, advanced),
    },
    {
      slug: `grade-${grade}-area-measurement`,
      title: triangle ? "Diện tích hình chữ nhật và tam giác" : "Chu vi và diện tích hình chữ nhật",
      grade, domain: "MEASUREMENT", outcomeId: `PLAVE-MOET2018-G${grade}-MEA-01`,
      skills: [`G${grade}_RECTANGLE_AREA`, `G${grade}_PERIMETER_AREA`, `G${grade}_FIND_MEASURE`],
      prerequisiteSlugs: [previousMeasurement],
      restrictions: ["Số đo dương và cùng đơn vị.", "Không trộn lẫn cm với cm².", ...(triangle ? ["Chiều cao tam giác vuông góc với đáy."] : [])],
      visual: "AREA_MODEL", answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT"],
      levels: ["UNDERSTAND", "APPLY", "REASON"], misconceptions: ["PERIMETER_FOR_AREA", "DROP_SQUARE_UNIT", "TRIANGLE_MISSING_HALF"],
      kind: "AREA_MEASUREMENT_PRACTICE", theory: areaTheory(`g${grade}mea`, triangle), examples: areaExamples(`g${grade}mea`, triangle),
    },
  ] as readonly Seed[];
});
