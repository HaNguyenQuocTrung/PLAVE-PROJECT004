import { createOfficialSourceMap } from "./official-source-map.ts";
import type { FactoryGrade } from "./types.ts";

export type WaveCPlanRow = Readonly<{
  grade: FactoryGrade;
  title: string;
  sourceOutcomeIds: readonly string[];
  authoritativePages: readonly number[];
  gradeOneLegacyEvidence: boolean;
  selectionReason: readonly string[];
  curriculumCompletionClaim: false;
}>;

const plans = [
  { grade: 1, title: "Lớp phủ bằng chứng phép trừ trong phạm vi 10", sourceOutcomeIds: [] },
  { grade: 2, title: "Bảng nhân 2, bảng nhân 5 và phép chia tương ứng", sourceOutcomeIds: ["MOET2018-G2-NUM-P025-006", "MOET2018-G2-NUM-P025-009", "MOET2018-G2-NUM-P025-017", "MOET2018-G2-NUM-P025-018"] },
  { grade: 3, title: "Phân số đơn vị và các phần bằng nhau", sourceOutcomeIds: ["MOET2018-G3-NUM-P031-023", "MOET2018-G3-NUM-P031-024"] },
  { grade: 4, title: "Rút gọn và quy đồng mẫu số", sourceOutcomeIds: ["MOET2018-G4-NUM-P036-021", "MOET2018-G4-NUM-P036-022"] },
  { grade: 5, title: "Khái niệm và phép tính số thập phân", sourceOutcomeIds: ["MOET2018-G5-NUM-P041-005", "MOET2018-G5-NUM-P041-008", "MOET2018-G5-NUM-P041-011", "MOET2018-G5-NUM-P042-019"] },
  { grade: 6, title: "Phép tính phân số", sourceOutcomeIds: ["MOET2018-G6-NAA-P049-040"] },
  { grade: 7, title: "Tỉ lệ thức và đại lượng tỉ lệ", sourceOutcomeIds: ["MOET2018-G7-NAA-P057-019", "MOET2018-G7-NAA-P057-020", "MOET2018-G7-NAA-P057-024", "MOET2018-G7-NAA-P057-028", "MOET2018-G7-NAA-P057-031", "MOET2018-G7-NAA-P057-032"] },
  { grade: 8, title: "Hằng đẳng thức và phân tích đa thức", sourceOutcomeIds: ["MOET2018-G8-NAA-P063-001", "MOET2018-G8-NAA-P063-003", "MOET2018-G8-NAA-P064-019"] },
  { grade: 9, title: "Bảng tần số ghép nhóm và biểu diễn dữ liệu", sourceOutcomeIds: ["MOET2018-G9-STA-P077-016", "MOET2018-G9-STA-P077-019"] },
] as const;

export const waveCPlan: readonly WaveCPlanRow[] = plans.map((plan) => {
  if (plan.grade === 1) return {
    ...plan,
    authoritativePages: [],
    gradeOneLegacyEvidence: true,
    selectionReason: ["IMMUTABLE_VERIFIED_REPOSITORY_SOURCE", "INDEPENDENT_SUBTRACTION_ORACLE", "NO_SOURCE_REWRITE"],
    curriculumCompletionClaim: false,
  };
  const sourceMap = createOfficialSourceMap(plan.grade);
  const rows = plan.sourceOutcomeIds.map((outcomeId) => {
    const row = sourceMap.find((entry) => entry.officialOutcomeId === outcomeId);
    if (!row || row.sourceClassification !== "SOURCE_VERIFIED") throw new Error(`WAVE_C_SOURCE_OUTCOME_MISSING:${outcomeId}`);
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
    selectionReason: ["SOURCE_VERIFIED", "DETERMINISTIC_MATHEMATICAL_ORACLE", "BOUNDED_WAVE_C_SLICE"],
    curriculumCompletionClaim: false,
  };
});

export function getWaveCPlan(grade: FactoryGrade) {
  const plan = waveCPlan.find((entry) => entry.grade === grade);
  if (!plan) throw new Error(`WAVE_C_PLAN_MISSING:G${grade}`);
  return plan;
}
