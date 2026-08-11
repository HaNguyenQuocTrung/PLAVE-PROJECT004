import { createOfficialSourceMap } from "./official-source-map.ts";
import type { FactoryGrade } from "./types.ts";

export type WaveDPlanRow = Readonly<{
  grade: FactoryGrade;
  title: string;
  sourceOutcomeIds: readonly string[];
  authoritativePages: readonly number[];
  gradeOneLegacyEvidence: boolean;
  selectionReason: readonly string[];
  prerequisiteGapClosed: string;
  curriculumCompletionClaim: false;
}>;

const plans = [
  { grade: 1, title: "Lớp phủ bằng chứng các số trong phạm vi 20", sourceOutcomeIds: [], prerequisiteGapClosed: "Continues from Wave C subtraction into the immutable next legacy unit without replacing content." },
  { grade: 2, title: "Ý nghĩa phép tính và bài toán thực tiễn một bước", sourceOutcomeIds: ["MOET2018-G2-NUM-P025-010", "MOET2018-G2-NUM-P026-020"], prerequisiteGapClosed: "Applies the Wave C multiplication/division tables in bounded one-step exact-integer contexts." },
  { grade: 3, title: "Diện tích, xăng-ti-mét vuông và diện tích hình chữ nhật, hình vuông", sourceOutcomeIds: ["MOET2018-G3-GEO-P032-012", "MOET2018-G3-GEO-P032-013", "MOET2018-G3-GEO-P033-025"], prerequisiteGapClosed: "Moves from Wave C equal parts to unit-square area counting and exact rectangle/square area." },
  { grade: 4, title: "Nhân và chia hai phân số", sourceOutcomeIds: ["MOET2018-G4-NUM-P037-026"], prerequisiteGapClosed: "Continues directly from Wave C fraction reduction with exact reduced-rational operations." },
  { grade: 5, title: "Nhân và chia số thập phân", sourceOutcomeIds: ["MOET2018-G5-NUM-P042-018", "MOET2018-G5-NUM-P042-020"], prerequisiteGapClosed: "Completes deterministic decimal operations after Wave C concepts, comparison, addition and subtraction." },
  { grade: 6, title: "Phân số của một số và bài toán ngược", sourceOutcomeIds: ["MOET2018-G6-NAA-P049-042"], prerequisiteGapClosed: "Applies Wave C fraction arithmetic to exact fraction-of-quantity and inverse calculations." },
  { grade: 7, title: "Nghiệm, giá trị và phép toán đa thức một biến", sourceOutcomeIds: ["MOET2018-G7-NAA-P058-033", "MOET2018-G7-NAA-P058-034", "MOET2018-G7-NAA-P058-035"], prerequisiteGapClosed: "Extends Wave C proportional algebra into deterministic polynomial substitution and coefficient operations." },
  { grade: 8, title: "Hệ số góc và quan hệ hai đường thẳng", sourceOutcomeIds: ["MOET2018-G8-NAA-P064-009", "MOET2018-G8-NAA-P064-013"], prerequisiteGapClosed: "Extends Wave C symbolic algebra to exact slope extraction and line-relation reasoning." },
  { grade: 9, title: "Góc ở tâm, góc nội tiếp và số đo cung", sourceOutcomeIds: ["MOET2018-G9-GEO-P075-020", "MOET2018-G9-GEO-P075-021"], prerequisiteGapClosed: "Adds a source-verified exact-angle geometry slice after Wave C grouped-frequency data." },
] as const;

export const waveDPlan: readonly WaveDPlanRow[] = plans.map((plan) => {
  if (plan.grade === 1) return {
    ...plan,
    authoritativePages: [],
    gradeOneLegacyEvidence: true,
    selectionReason: ["IMMUTABLE_VERIFIED_REPOSITORY_SOURCE", "INDEPENDENT_PUBLIC_BOUNDARY_ORACLE", "NO_LEGACY_REWRITE"],
    curriculumCompletionClaim: false,
  };
  const sourceMap = createOfficialSourceMap(plan.grade);
  const rows = plan.sourceOutcomeIds.map((outcomeId) => {
    const row = sourceMap.find((entry) => entry.officialOutcomeId === outcomeId);
    if (!row || row.sourceClassification !== "SOURCE_VERIFIED") throw new Error(`WAVE_D_SOURCE_OUTCOME_MISSING:${outcomeId}`);
    if (row.automatedVerificationCapability === "INSUFFICIENT") throw new Error(`WAVE_D_SOURCE_AUTOMATION_INSUFFICIENT:${outcomeId}`);
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
    selectionReason: ["SOURCE_VERIFIED", "UNCOVERED_BY_WAVES_A_TO_C", "DETERMINISTIC_INDEPENDENT_ORACLE", "BOUNDED_WAVE_D_SLICE"],
    curriculumCompletionClaim: false,
  };
});

export function getWaveDPlan(grade: FactoryGrade) {
  const plan = waveDPlan.find((entry) => entry.grade === grade);
  if (!plan) throw new Error(`WAVE_D_PLAN_MISSING:G${grade}`);
  return plan;
}
