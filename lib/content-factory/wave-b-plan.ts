import { createOfficialSourceMap } from "./official-source-map.ts";
import type { FactoryGrade } from "./types.ts";

export type WaveBPlanRow = Readonly<{
  grade: FactoryGrade;
  title: string;
  sourceOutcomeIds: readonly string[];
  authoritativePages: readonly number[];
  gradeOneLegacyEvidence: boolean;
  selectionReason: readonly string[];
  recommendedWaveC: string;
  curriculumCompletionClaim: false;
}>;

const plans = [
  { grade: 1, title: "Lớp phủ bằng chứng phép cộng trong phạm vi 10", sourceOutcomeIds: [], recommendedWaveC: "Lớp phủ bằng chứng phép trừ trong phạm vi 10" },
  { grade: 2, title: "Cộng và trừ thành thạo", sourceOutcomeIds: ["MOET2018-G2-NUM-P025-011", "MOET2018-G2-NUM-P025-012", "MOET2018-G2-NUM-P025-013", "MOET2018-G2-NUM-P025-015"], recommendedWaveC: "Bảng nhân 2, bảng nhân 5 và phép chia tương ứng" },
  { grade: 3, title: "Bảng nhân chia và phép nhân, chia với số có một chữ số", sourceOutcomeIds: ["MOET2018-G3-NUM-P029-010", "MOET2018-G3-NUM-P030-017", "MOET2018-G3-NUM-P030-018"], recommendedWaveC: "Phân số đơn vị và biểu diễn phần bằng nhau" },
  { grade: 4, title: "Nhận biết, phân số bằng nhau và so sánh phân số", sourceOutcomeIds: ["MOET2018-G4-NUM-P036-018", "MOET2018-G4-NUM-P036-019", "MOET2018-G4-NUM-P036-020"], recommendedWaveC: "Rút gọn và quy đồng mẫu số" },
  { grade: 5, title: "Phân số: rút gọn, so sánh và phép tính", sourceOutcomeIds: ["MOET2018-G5-NUM-P041-010", "MOET2018-G5-NUM-P041-009", "MOET2018-G5-NUM-P041-013", "MOET2018-G5-NUM-P041-012"], recommendedWaveC: "Số thập phân: giá trị vị trí, so sánh và sắp xếp" },
  { grade: 6, title: "Ước, bội, số nguyên tố, phân tích thừa số, ƯCLN và BCNN", sourceOutcomeIds: ["MOET2018-G6-NAA-P047-006", "MOET2018-G6-NAA-P048-018", "MOET2018-G6-NAA-P048-027", "MOET2018-G6-NAA-P048-030"], recommendedWaveC: "Phân số và phép tính phân số" },
  { grade: 7, title: "Xác suất trong không gian mẫu hữu hạn đơn giản", sourceOutcomeIds: ["MOET2018-G7-STA-P062-010"], recommendedWaveC: "Tỉ lệ thức và đại lượng tỉ lệ" },
  { grade: 8, title: "Định lí Pythagore với tam giác vuông có độ dài nguyên", sourceOutcomeIds: ["MOET2018-G8-GEO-P065-002", "MOET2018-G8-GEO-P065-006", "MOET2018-G8-GEO-P066-007"], recommendedWaveC: "Hằng đẳng thức và phân tích đa thức" },
  { grade: 9, title: "Tần số, tần số tương đối và xác suất trong không gian mẫu hữu hạn", sourceOutcomeIds: ["MOET2018-G9-STA-P076-011", "MOET2018-G9-STA-P077-015", "MOET2018-G9-STA-P077-020", "MOET2018-G9-STA-P077-021"], recommendedWaveC: "Bảng tần số ghép nhóm và biểu diễn dữ liệu" },
] as const;

export const waveBPlan: readonly WaveBPlanRow[] = plans.map((plan) => {
  if (plan.grade === 1) return {
    ...plan,
    authoritativePages: [],
    gradeOneLegacyEvidence: true,
    selectionReason: ["IMMUTABLE_VERIFIED_REPOSITORY_SOURCE", "INDEPENDENT_INTEGER_ORACLE", "NO_SOURCE_REWRITE"],
    curriculumCompletionClaim: false,
  };
  const sourceMap = createOfficialSourceMap(plan.grade);
  const rows = plan.sourceOutcomeIds.map((outcomeId) => {
    const row = sourceMap.find((entry) => entry.officialOutcomeId === outcomeId);
    if (!row || row.sourceClassification !== "SOURCE_VERIFIED") throw new Error(`WAVE_B_SOURCE_OUTCOME_MISSING:${outcomeId}`);
    return row;
  });
  return {
    ...plan,
    authoritativePages: [...new Set(rows.flatMap((row) => {
      const pages: number[] = [];
      for (let page = row.sourceReference.pages.start; page <= row.sourceReference.pages.end; page += 1) pages.push(page);
      return pages;
    }))].sort((left, right) => left - right),
    gradeOneLegacyEvidence: false,
    selectionReason: ["SOURCE_VERIFIED", "DETERMINISTIC_MATHEMATICAL_ORACLE", "BOUNDED_WAVE_B_SLICE"],
    curriculumCompletionClaim: false,
  };
});

export function getWaveBPlan(grade: FactoryGrade) {
  const plan = waveBPlan.find((entry) => entry.grade === grade);
  if (!plan) throw new Error(`WAVE_B_PLAN_MISSING:G${grade}`);
  return plan;
}
