import { createOfficialSourceMap } from "./official-source-map.ts";
import type { FactoryGrade } from "./types.ts";

export type WaveEPlanRow = Readonly<{
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
  { grade: 1, title: "Lớp phủ bằng chứng thứ tự ngày trong tuần", sourceOutcomeIds: [], prerequisiteGapClosed: "Adds independently verifiable calendar sequence evidence from the immutable time/calendar unit.", deferredGap: "Clock, schedule and image-dependent calendar items remain AUTOMATED_VERIFICATION_INSUFFICIENT." },
  { grade: 2, title: "Quan hệ đơn vị độ dài, chuyển đổi và đường gấp khúc", sourceOutcomeIds: ["MOET2018-G2-GEO-P027-012", "MOET2018-G2-GEO-P027-017", "MOET2018-G2-GEO-P027-019"], prerequisiteGapClosed: "Builds exact length measurement and polyline calculation needed for later perimeter work.", deferredGap: "Estimation and tool-use outcomes remain excluded where a tolerance or physical-action oracle is absent." },
  { grade: 3, title: "Độ dài, chuyển đổi số đo và chu vi", sourceOutcomeIds: ["MOET2018-G3-GEO-P032-015", "MOET2018-G3-GEO-P032-021", "MOET2018-G3-GEO-P032-022"], prerequisiteGapClosed: "Extends Grade 2 length relations into exact conversions and perimeter calculations.", deferredGap: "Physical measuring and estimation outcomes remain outside automated eligibility." },
  { grade: 4, title: "Chuyển đổi và tính toán các số đo", sourceOutcomeIds: ["MOET2018-G4-GEO-P038-013"], prerequisiteGapClosed: "Supplies exact unit conversions across length, area, mass, capacity and time before applied measurement.", deferredGap: "Angle drawing/measurement and estimation remain excluded without a visual/tolerance contract." },
  { grade: 5, title: "Chuyển đổi và tính toán thể tích, thời gian", sourceOutcomeIds: ["MOET2018-G5-GEO-P044-013"], prerequisiteGapClosed: "Adds exact volume and time conversion required for later solid measurement.", deferredGap: "Volume estimation and net construction remain excluded as visual/tolerance-dependent." },
  { grade: 6, title: "Chu vi và diện tích các hình phẳng đặc biệt", sourceOutcomeIds: ["MOET2018-G6-GEO-P051-003"], prerequisiteGapClosed: "Connects exact number/fraction work to complete-dimension perimeter and area problems.", deferredGap: "Software construction and open symmetry work remain outside the deterministic response contract." },
  { grade: 7, title: "Diện tích xung quanh và thể tích lăng trụ đứng", sourceOutcomeIds: ["MOET2018-G7-GEO-P058-001", "MOET2018-G7-GEO-P058-005"], prerequisiteGapClosed: "Introduces exact solid measurement using right-prism dimensions and rational arithmetic.", deferredGap: "Open construction and diagram-recognition outcomes remain excluded." },
  { grade: 8, title: "Diện tích xung quanh và thể tích hình chóp đều", sourceOutcomeIds: ["MOET2018-G8-GEO-P065-001", "MOET2018-G8-GEO-P065-005"], prerequisiteGapClosed: "Continues prism measurement into regular triangular and square pyramids with complete dimensions.", deferredGap: "Diagram construction and unbounded applied modelling remain excluded." },
  { grade: 9, title: "Diện tích và thể tích hình trụ, hình nón, hình cầu", sourceOutcomeIds: ["MOET2018-G9-GEO-P073-001", "MOET2018-G9-GEO-P073-006", "MOET2018-G9-GEO-P073-007"], prerequisiteGapClosed: "Completes a source-backed solid-measurement path using exact coefficients of π.", deferredGap: "Approximate physical measurement and open practical modelling remain excluded." },
] as const;

export const waveEPlan: readonly WaveEPlanRow[] = plans.map((plan) => {
  if (plan.grade === 1) return { ...plan, authoritativePages: [], gradeOneLegacyEvidence: true,
    selectionReason: ["IMMUTABLE_VERIFIED_REPOSITORY_SOURCE", "INDEPENDENT_PUBLIC_BOUNDARY_ORACLE", "PARTIAL_ELIGIBILITY_WITH_EXPLICIT_QUARANTINE", "NO_LEGACY_REWRITE"], curriculumCompletionClaim: false };
  const sourceMap = createOfficialSourceMap(plan.grade);
  const rows = plan.sourceOutcomeIds.map((outcomeId) => {
    const row = sourceMap.find((entry) => entry.officialOutcomeId === outcomeId);
    if (!row || row.sourceClassification !== "SOURCE_VERIFIED") throw new Error(`WAVE_E_SOURCE_OUTCOME_MISSING:${outcomeId}`);
    if (row.automatedVerificationCapability === "INSUFFICIENT") throw new Error(`WAVE_E_SOURCE_AUTOMATION_INSUFFICIENT:${outcomeId}`);
    return row;
  });
  return { ...plan, authoritativePages: [...new Set(rows.flatMap((row) => {
    const pages: number[] = [];
    for (let page = row.sourceReference.pages.start; page <= row.sourceReference.pages.end; page += 1) pages.push(page);
    return pages;
  }))].sort((left, right) => left - right), gradeOneLegacyEvidence: false,
    selectionReason: ["SOURCE_VERIFIED", "UNCOVERED_BY_WAVES_A_TO_D", "MEASUREMENT_GEOMETRY_PRIORITY", "DETERMINISTIC_INDEPENDENT_ORACLE"], curriculumCompletionClaim: false };
});

export function getWaveEPlan(grade: FactoryGrade) {
  const plan = waveEPlan.find((entry) => entry.grade === grade);
  if (!plan) throw new Error(`WAVE_E_PLAN_MISSING:G${grade}`);
  return plan;
}
