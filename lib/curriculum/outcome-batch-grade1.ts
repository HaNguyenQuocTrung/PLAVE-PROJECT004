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

type Grade1OutcomeUnitSeed = Readonly<{
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

export const grade1NumberOperationsOutcome: CurriculumOutcome = {
  id: "PLAVE-MOET2018-G1-NUM-TO100-02",
  grade: 1,
  domain: "NUMBERS_AND_OPERATIONS",
  summary:
    "Nhận biết chục và đơn vị; cộng, trừ không nhớ trong phạm vi 100; cộng, trừ nhẩm các số tròn chục.",
  sourceReferenceIds: ["MOET-MATH-2018"],
  status: "OFFICIAL_SOURCE_MAPPED",
};

export const grade1NumberOperationsUnitSeed: Grade1OutcomeUnitSeed = {
  slug: "grade-1-number-operations-to-100-preview",
  title: "Chục, đơn vị và tính toán đến 100",
  grade: 1,
  domain: "NUMBERS_AND_OPERATIONS",
  outcomeId: grade1NumberOperationsOutcome.id,
  skills: [
    "G1_TENS_ONES_TO_100",
    "G1_ADD_SUB_NO_REGROUP_TO_100",
    "G1_MENTAL_ROUND_TENS",
  ],
  prerequisiteSlugs: [],
  restrictions: [
    "Chỉ dùng số tự nhiên từ 0 đến 100.",
    "Phép cộng không có nhớ và phép trừ không có mượn.",
    "Tính nhẩm chỉ dùng các số tròn chục.",
  ],
  visual: "PLACE_VALUE_CHART",
  answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT"],
  levels: ["UNDERSTAND", "APPLY"],
  misconceptions: [
    "TENS_ONES_SWAPPED",
    "REGROUPING_INCORRECTLY",
    "ROUND_TENS_AS_ONES",
  ],
  kind: "GRADE1_NUMBER_OPERATIONS_TO_100",
  theory: [
    section(
      "g1n100-s1",
      "Chục và đơn vị",
      [
        "Mười đơn vị tạo thành một chục.",
        "Trong số có hai chữ số, chữ số bên trái chỉ số chục và chữ số bên phải chỉ số đơn vị.",
      ],
      "Bảng hai cột Chục và Đơn vị biểu diễn một số có hai chữ số.",
    ),
    section(
      "g1n100-s2",
      "Số tròn chục",
      [
        "Số tròn chục có chữ số hàng đơn vị bằng 0.",
        "Các số 10, 20, 30 đến 100 được tạo bởi các chục đầy đủ.",
      ],
      "Các bó mười được đặt vào cột Chục và cột Đơn vị ghi 0.",
    ),
    section(
      "g1n100-s3",
      "Cộng, trừ không nhớ",
      [
        "Cộng hoặc trừ các đơn vị với nhau, rồi các chục với nhau.",
        "Không nhớ nghĩa là tổng các đơn vị chưa đến 10; không mượn nghĩa là số đơn vị bị trừ không lớn hơn số đơn vị ban đầu.",
      ],
      "Hai bảng Chục–Đơn vị được căn thẳng hàng để cộng hoặc trừ từng cột.",
    ),
    section(
      "g1n100-s4",
      "Tính nhẩm số tròn chục",
      [
        "Có thể coi mỗi số tròn chục là một số bó mười.",
        "Cộng hoặc trừ số bó mười rồi viết thêm chữ số 0 ở hàng đơn vị.",
      ],
      "Các bó mười được gộp hoặc bớt đi, bên dưới là phép tính số tròn chục.",
    ),
  ],
  examples: [
    example(
      "g1n100-e1",
      "Đọc chục và đơn vị",
      "Số 47 có mấy chục và mấy đơn vị?",
      [
        "Đặt 47 vào bảng Chục–Đơn vị.",
        "Chữ số 4 ở hàng chục nên có 4 chục.",
        "Chữ số 7 ở hàng đơn vị nên có 7 đơn vị.",
      ],
      "47 có 4 chục và 7 đơn vị.",
      "Bảng Chục–Đơn vị có 4 ở cột Chục và 7 ở cột Đơn vị.",
    ),
    example(
      "g1n100-e2",
      "Cộng không nhớ",
      "Tính 32 + 25.",
      [
        "Cộng đơn vị: 2 + 5 = 7, chưa đến 10 nên không nhớ.",
        "Cộng chục: 3 chục + 2 chục = 5 chục.",
        "Ghép 5 chục và 7 đơn vị được 57.",
      ],
      "32 + 25 = 57.",
      "Hai số 32 và 25 đặt thẳng cột Chục–Đơn vị, kết quả là 57.",
    ),
    example(
      "g1n100-e3",
      "Trừ nhẩm số tròn chục",
      "Tính nhẩm 80 − 30.",
      [
        "80 là 8 chục và 30 là 3 chục.",
        "Lấy 8 chục trừ 3 chục được 5 chục.",
        "5 chục là 50.",
      ],
      "80 − 30 = 50.",
      "Tám bó mười bớt ba bó mười, còn năm bó mười.",
    ),
  ],
};
