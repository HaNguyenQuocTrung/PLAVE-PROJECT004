import { createOfficialSourceMap } from "./official-source-map.ts";
import type { FactoryGrade } from "./types.ts";

export type WaveGPlanRow = Readonly<{
  grade: FactoryGrade;
  title: string;
  sourceOutcomeIds: readonly string[];
  authoritativePages: readonly number[];
  gradeOneLegacyEvidence: boolean;
  selectionReason: readonly string[];
  prerequisiteGapClosed: string;
  deferredGap: string;
  curriculumCompletionClaim: false;
}>;

const plans = [
  { grade: 1, title: "Lớp phủ bằng chứng đếm hình trong dữ liệu trực quan", sourceOutcomeIds: [], prerequisiteGapClosed: "Audits the nearest immutable legacy classify/count slice after no standalone Grade 1 statistics unit was retained.", deferredGap: "All six selected prompts omit the pictured dataset and therefore remain AUTOMATED_VERIFICATION_INSUFFICIENT; no visual content is inferred." },
  { grade: 2, title: "Đọc biểu đồ tranh, nhận xét và thu thập/phân loại dữ liệu", sourceOutcomeIds: ["MOET2018-G2-STA-P028-001", "MOET2018-G2-STA-P028-003", "MOET2018-G2-STA-P028-004"], prerequisiteGapClosed: "Introduces complete public pictograph datasets, exact totals and category comparisons.", deferredGap: "P028-002 chance terminology is deferred because this slice prioritizes exact data representation." },
  { grade: 3, title: "Đọc bảng số liệu, nhận xét và thu thập/phân loại dữ liệu", sourceOutcomeIds: ["MOET2018-G3-STA-P033-001", "MOET2018-G3-STA-P033-002", "MOET2018-G3-STA-P033-004"], prerequisiteGapClosed: "Extends Grade 2 category counts into complete tables, totals and exact comparisons.", deferredGap: "P033-003 one-trial chance remains a separate probability slice." },
  { grade: 4, title: "Số trung bình cộng của dữ liệu", sourceOutcomeIds: ["MOET2018-G4-STA-P039-007"], prerequisiteGapClosed: "Adds exact descriptive-statistics aggregation after table and chart reading.", deferredGap: "Visual chart inference without an explicit public dataset remains excluded." },
  { grade: 5, title: "Liên hệ thống kê với phân số, số thập phân và phần trăm", sourceOutcomeIds: ["MOET2018-G5-STA-P045-007"], prerequisiteGapClosed: "Connects retained percentage arithmetic to exact frequency proportions.", deferredGap: "Open survey design and unrepresented chart details remain excluded." },
  { grade: 6, title: "Xác suất thực nghiệm", sourceOutcomeIds: ["MOET2018-G6-STA-P054-011"], prerequisiteGapClosed: "Introduces bounded empirical probability through exact event and trial counts.", deferredGap: "Unbounded experiments and ambiguous event definitions remain excluded." },
  { grade: 7, title: "Biểu đồ tròn, biểu đồ đoạn thẳng và biến thiên dữ liệu", sourceOutcomeIds: ["MOET2018-G7-STA-P061-001", "MOET2018-G7-STA-P061-002", "MOET2018-G7-STA-P061-007"], prerequisiteGapClosed: "Extends finite probability with complete public chart datasets, totals and exact changes.", deferredGap: "Any chart whose values are available only in an image remains excluded." },
  { grade: 8, title: "Xác suất thực nghiệm và xác suất lí thuyết", sourceOutcomeIds: ["MOET2018-G8-STA-P069-011", "MOET2018-G8-STA-P069-014"], prerequisiteGapClosed: "Adds exact comparison of empirical ratios with complete finite sample-space probabilities.", deferredGap: "Non-equiprobable or incompletely specified experiments remain excluded." },
  { grade: 9, title: "Phát hiện dữ liệu biểu diễn không hợp lệ", sourceOutcomeIds: ["MOET2018-G9-STA-P076-008"], prerequisiteGapClosed: "Adds malformed-data detection after retained grouped-frequency work without duplicating prior frequency questions.", deferredGap: "Image-only misleading-chart features remain excluded unless encoded in the public candidate dataset." },
] as const;

export const waveGPlan: readonly WaveGPlanRow[] = plans.map((plan) => {
  if (plan.grade === 1) return { ...plan, authoritativePages: [], gradeOneLegacyEvidence: true,
    selectionReason: ["IMMUTABLE_VERIFIED_REPOSITORY_SOURCE", "NO_RETAINED_GRADE_ONE_STATISTICS_SLICE", "DATA_LIKE_VISUAL_COUNT_FALLBACK", "FAIL_CLOSED_VISUAL_QUARANTINE", "NO_LEGACY_REWRITE"], curriculumCompletionClaim: false };
  const sourceMap = createOfficialSourceMap(plan.grade);
  const rows = plan.sourceOutcomeIds.map((outcomeId) => {
    const row = sourceMap.find((entry) => entry.officialOutcomeId === outcomeId);
    if (!row || row.sourceClassification !== "SOURCE_VERIFIED") throw new Error(`WAVE_G_SOURCE_OUTCOME_MISSING:${outcomeId}`);
    if (row.automatedVerificationCapability === "INSUFFICIENT") throw new Error(`WAVE_G_SOURCE_AUTOMATION_INSUFFICIENT:${outcomeId}`);
    return row;
  });
  return { ...plan, authoritativePages: [...new Set(rows.flatMap((row) => {
    const pages: number[] = [];
    for (let page = row.sourceReference.pages.start; page <= row.sourceReference.pages.end; page += 1) pages.push(page);
    return pages;
  }))].sort((left, right) => left - right), gradeOneLegacyEvidence: false,
    selectionReason: ["SOURCE_VERIFIED", "UNCOVERED_BY_WAVES_A_TO_F", "STATISTICS_DATA_PROBABILITY_PRIORITY", "DETERMINISTIC_INDEPENDENT_ORACLE"], curriculumCompletionClaim: false };
});

export function getWaveGPlan(grade: FactoryGrade) {
  const plan = waveGPlan.find((entry) => entry.grade === grade);
  if (!plan) throw new Error(`WAVE_G_PLAN_MISSING:G${grade}`);
  return plan;
}
