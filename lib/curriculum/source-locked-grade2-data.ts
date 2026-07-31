import type { CurriculumOutcome, CurriculumUnit } from "./types.ts";

export const grade2DataOutcome: CurriculumOutcome = {
  id: "PLAVE-MOET2018-G2-DATA-CHANCE-01",
  grade: 2,
  domain: "STATISTICS_AND_PROBABILITY",
  summary:
    "Thu thập, phân loại, kiểm đếm, đọc biểu đồ tranh và mô tả sự kiện là có thể, chắc chắn hoặc không thể.",
  sourceReferenceIds: ["MOET-MATH-2018"],
  status: "OFFICIAL_SOURCE_MAPPED",
};

export const grade2DataUnitSeed = {
  slug: "grade-2-data-and-chance",
  title: "Dữ liệu và khả năng xảy ra",
  grade: 2,
  domain: "STATISTICS_AND_PROBABILITY",
  outcomeId: grade2DataOutcome.id,
  skills: ["G2_TALLY_DATA", "G2_READ_PICTOGRAPH", "G2_CLASSIFY_EVENT"],
  prerequisiteSlugs: ["grade-1-numbers-to-10"],
  restrictions: [
    "Mỗi biểu tượng đại diện đúng một đối tượng.",
    "Không tính xác suất bằng phân số hoặc phần trăm.",
  ],
  visual: "DATA_DISPLAY",
  answers: ["MULTIPLE_CHOICE", "NUMBER_INPUT", "TEXT_INPUT"],
  levels: ["UNDERSTAND", "APPLY", "REASON"],
  misconceptions: ["MISCOUNT_SYMBOL", "IGNORE_CATEGORY", "UNLIKELY_MEANS_IMPOSSIBLE"],
  kind: "GRADE2_DATA_CHANCE",
  theory: [
    { id: "g2data-s1", title: "Thu thập và phân loại", explanation: ["Mỗi quan sát được xếp vào đúng một nhóm đã nêu.", "Tên nhóm phải rõ để không đếm một vật hai lần."], visualDescription: "Bảng hai nhóm có nhãn và số biểu tượng tương ứng." },
    { id: "g2data-s2", title: "Kiểm đếm", explanation: ["Đếm từng biểu tượng đúng một lần.", "Tổng tần số bằng tổng số quan sát."], visualDescription: "Các cột biểu tượng được căn hàng để kiểm đếm." },
    { id: "g2data-s3", title: "Đọc biểu đồ tranh", explanation: ["Đọc chú giải trước; trong chủ đề này một biểu tượng là một đối tượng.", "So sánh số biểu tượng để nhận xét nhóm nhiều hơn hoặc ít hơn."], visualDescription: "Biểu đồ tranh có nhãn nhóm và chú giải một biểu tượng bằng một." },
    { id: "g2data-s4", title: "Có thể, chắc chắn, không thể", explanation: ["Chắc chắn khi mọi kết quả đều làm sự kiện xảy ra.", "Không thể khi không có kết quả phù hợp; các trường hợp còn lại là có thể."], visualDescription: "Tập kết quả hữu hạn được liệt kê bằng thẻ có nhãn." },
  ],
  examples: [
    { id: "g2data-e1", title: "Đọc số biểu tượng", prompt: "Biểu đồ có 4 hình tròn ở nhóm A. Nhóm A có bao nhiêu quan sát?", steps: ["Chú giải cho biết một hình là một quan sát.", "Đếm bốn hình đúng một lần.", "Ghi kết quả 4."], answer: "4 quan sát.", visualDescription: "Nhóm A có bốn biểu tượng hình tròn." },
    { id: "g2data-e2", title: "Phân loại sự kiện", prompt: "Túi chỉ có thẻ tròn và vuông. Lấy được thẻ tam giác có thể xảy ra không?", steps: ["Liệt kê kết quả: tròn hoặc vuông.", "Tam giác không nằm trong tập kết quả.", "Sự kiện không thể xảy ra."], answer: "Không thể.", visualDescription: "Hai loại thẻ tròn và vuông, không có thẻ tam giác." },
  ],
} as const satisfies {
  grade: CurriculumUnit["grade"];
  domain: CurriculumUnit["domain"];
  [key: string]: unknown;
};
