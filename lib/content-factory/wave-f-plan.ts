import { createOfficialSourceMap } from "./official-source-map.ts";
import type { FactoryGrade } from "./types.ts";

export type WaveFPlanRow = Readonly<{
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
  { grade: 1, title: "Lớp phủ bằng chứng cộng trong phạm vi 20 không nhớ", sourceOutcomeIds: [], prerequisiteGapClosed: "Adds independently verifiable teen-number addition evidence without changing the immutable legacy bank.", deferredGap: "Any row whose public prompt, options and protected explanation do not establish semantic parity remains AUTOMATED_VERIFICATION_INSUFFICIENT." },
  { grade: 2, title: "So sánh, tia số, sắp thứ tự và số lớn nhất/nhỏ nhất đến 1000", sourceOutcomeIds: ["MOET2018-G2-NUM-P025-007", "MOET2018-G2-NUM-P025-008", "MOET2018-G2-NUM-P025-014", "MOET2018-G2-NUM-P025-019"], prerequisiteGapClosed: "Extends place-value work into exact comparison, ordering and number-ray reasoning.", deferredGap: "The approximation sub-outcome remains excluded because this slice binds exact ordering only." },
  { grade: 3, title: "Chia có dư, biểu thức hai phép tính và thành phần chưa biết", sourceOutcomeIds: ["MOET2018-G3-NUM-P030-016", "MOET2018-G3-NUM-P030-019", "MOET2018-G3-NUM-P030-020", "MOET2018-G3-NUM-P030-022"], prerequisiteGapClosed: "Connects multiplication/division fluency to exact expression order and inverse-operation reasoning.", deferredGap: "Open word modelling and non-exact interpretations remain excluded." },
  { grade: 4, title: "Tính chất phân phối và giá trị biểu thức", sourceOutcomeIds: ["MOET2018-G4-NUM-P036-023"], prerequisiteGapClosed: "Extends exact multiplication into equivalent distributive forms and expression evaluation.", deferredGap: "Unbounded symbolic proof remains outside the deterministic answer contract." },
  { grade: 5, title: "Tỉ số phần trăm và giá trị phần trăm", sourceOutcomeIds: ["MOET2018-G5-NUM-P042-014"], prerequisiteGapClosed: "Builds exact percentage reasoning on retained decimal and fraction operations.", deferredGap: "Ambiguous or non-terminating contextual cases remain excluded." },
  { grade: 6, title: "Bốn phép tính với số thập phân có dấu", sourceOutcomeIds: ["MOET2018-G6-NAA-P050-047"], prerequisiteGapClosed: "Extends signed-number arithmetic into exact finite-decimal operations.", deferredGap: "Non-terminating division and ambiguous rounding remain excluded." },
  { grade: 7, title: "Tính giá trị biểu thức đại số", sourceOutcomeIds: ["MOET2018-G7-NAA-P057-030"], prerequisiteGapClosed: "Extends prior proportional and polynomial work through exact integer/rational substitution.", deferredGap: "Open symbolic modelling remains outside the deterministic response contract." },
  { grade: 8, title: "Biểu thức hữu tỉ, điều kiện xác định và tính chất", sourceOutcomeIds: ["MOET2018-G8-NAA-P064-010", "MOET2018-G8-NAA-P064-011"], prerequisiteGapClosed: "Adds exact domain restrictions, safe evaluation and equality under nonzero common scaling.", deferredGap: "Expressions with unresolved domain ambiguity remain excluded." },
  { grade: 9, title: "Bất phương trình bậc nhất một ẩn", sourceOutcomeIds: ["MOET2018-G9-NAA-P073-023"], prerequisiteGapClosed: "Extends linear algebra into exact inequality solving including negative-coefficient direction reversal.", deferredGap: "Graphical or open modelling outcomes remain excluded." },
] as const;

export const waveFPlan: readonly WaveFPlanRow[] = plans.map((plan) => {
  if (plan.grade === 1) return { ...plan, authoritativePages: [], gradeOneLegacyEvidence: true,
    selectionReason: ["IMMUTABLE_VERIFIED_REPOSITORY_SOURCE", "INDEPENDENT_PUBLIC_BOUNDARY_ORACLE", "PARTIAL_ELIGIBILITY_WITH_EXPLICIT_QUARANTINE", "NO_LEGACY_REWRITE"], curriculumCompletionClaim: false };
  const sourceMap = createOfficialSourceMap(plan.grade);
  const rows = plan.sourceOutcomeIds.map((outcomeId) => {
    const row = sourceMap.find((entry) => entry.officialOutcomeId === outcomeId);
    if (!row || row.sourceClassification !== "SOURCE_VERIFIED") throw new Error(`WAVE_F_SOURCE_OUTCOME_MISSING:${outcomeId}`);
    if (row.automatedVerificationCapability === "INSUFFICIENT") throw new Error(`WAVE_F_SOURCE_AUTOMATION_INSUFFICIENT:${outcomeId}`);
    return row;
  });
  return { ...plan, authoritativePages: [...new Set(rows.flatMap((row) => {
    const pages: number[] = [];
    for (let page = row.sourceReference.pages.start; page <= row.sourceReference.pages.end; page += 1) pages.push(page);
    return pages;
  }))].sort((left, right) => left - right), gradeOneLegacyEvidence: false,
    selectionReason: ["SOURCE_VERIFIED", "UNCOVERED_BY_WAVES_A_TO_E", "NUMBER_ALGEBRA_PRIORITY", "DETERMINISTIC_INDEPENDENT_ORACLE"], curriculumCompletionClaim: false };
});

export function getWaveFPlan(grade: FactoryGrade) {
  const plan = waveFPlan.find((entry) => entry.grade === grade);
  if (!plan) throw new Error(`WAVE_F_PLAN_MISSING:G${grade}`);
  return plan;
}
