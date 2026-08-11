import { createOfficialSourceMap } from "./official-source-map.ts";
import type { FactoryGrade } from "./types.ts";

export type WaveHPlanRow = Readonly<{
  grade: FactoryGrade;
  title: string;
  sourceOutcomeIds: readonly string[];
  authoritativePages: readonly number[];
  gradeOneLegacyEvidence: boolean;
  selectionReason: readonly string[];
  prerequisiteGapClosed: string;
  reasoningRequirement: string;
  deferredGap: string;
  curriculumCompletionClaim: false;
}>;

const plans = [
  { grade: 1, title: "Lớp phủ bằng chứng bài toán cộng trong phạm vi 100", sourceOutcomeIds: [], prerequisiteGapClosed: "Connects immutable public word-problem prompts to independently verified addition reasoning without changing legacy content.", reasoningRequirement: "One applied combine-groups step; Grade 1 has no retained source-backed multi-step slice in the immutable runtime.", deferredGap: "Any legacy row lacking all public operands, a unique interpretation or image-independent evidence remains quarantined." },
  { grade: 2, title: "Bài toán vận dụng đo lường", sourceOutcomeIds: ["MOET2018-G2-GEO-P027-011"], prerequisiteGapClosed: "Applies retained arithmetic and measurement skills to complete public quantities and consistent units.", reasoningRequirement: "Applied one- and two-operation measurement structures with explicit unit conversion or comparison.", deferredGap: "P028-002 experiential measurement and estimation remains AUTOMATED_VERIFICATION_INSUFFICIENT in the canonical inventory." },
  { grade: 3, title: "Bài toán thực tiễn có đến hai bước", sourceOutcomeIds: ["MOET2018-G3-NUM-P030-013"], prerequisiteGapClosed: "Combines retained arithmetic fluency with explicit intermediate quantities and simple comparison relations.", reasoningRequirement: "Exactly specified two-step operation chains with independently checked intermediate results.", deferredGap: "Open measurement experience and visual construction outcomes remain excluded." },
  { grade: 4, title: "Bài toán phân số hai đến ba bước", sourceOutcomeIds: ["MOET2018-G4-NUM-P037-025"], prerequisiteGapClosed: "Applies retained fraction arithmetic to bounded multi-step part, remainder and total relationships.", reasoningRequirement: "Two- or three-step exact rational chains with positive-domain and context constraints.", deferredGap: "Open-ended fraction modelling remains excluded." },
  { grade: 5, title: "Bài toán số tự nhiên có đến bốn bước", sourceOutcomeIds: ["MOET2018-G5-NUM-P040-002"], prerequisiteGapClosed: "Extends natural-number fluency to direct dependent quantities across several intermediate steps.", reasoningRequirement: "Two- to four-step integer chains with every dependency and unit public.", deferredGap: "Subjective optimization and unspecified estimation remain excluded." },
  { grade: 6, title: "Bài toán thập phân, tỉ số và phần trăm", sourceOutcomeIds: ["MOET2018-G6-NAA-P050-044"], prerequisiteGapClosed: "Combines retained decimal and percentage operations in synthetic, fully specified applied contexts.", reasoningRequirement: "Multi-step rate/base/percentage chains with exact finite decimals and declared precision.", deferredGap: "Real credit products, external rates and unsupported factual claims remain excluded." },
  { grade: 7, title: "Bài toán thực tiễn với số hữu tỉ", sourceOutcomeIds: ["MOET2018-G7-NAA-P056-005"], prerequisiteGapClosed: "Applies retained rational arithmetic to motion, measurement and aggregate quantities.", reasoningRequirement: "Distinct rational operation chains with complete units and nonzero denominators.", deferredGap: "Tax outcome P062-002 remains AUTOMATED_VERIFICATION_INSUFFICIENT." },
  { grade: 8, title: "Bài toán hàm số bậc nhất trong chuyển động", sourceOutcomeIds: ["MOET2018-G8-NAA-P065-025"], prerequisiteGapClosed: "Connects retained algebraic evaluation to explicit linear rules and applied motion quantities.", reasoningRequirement: "Forward, inverse and composed linear-function reasoning with nonzero coefficients and complete units.", deferredGap: "Open interdisciplinary rule explanation P070-008 remains AUTOMATED_VERIFICATION_INSUFFICIENT." },
  { grade: 9, title: "Bài toán thực tiễn bằng phương trình bậc hai", sourceOutcomeIds: ["MOET2018-G9-NAA-P072-022"], prerequisiteGapClosed: "Applies retained algebra to bounded quadratic models with a unique context-valid root.", reasoningRequirement: "Construct, solve and context-filter quadratic roots using fully public integer parameters.", deferredGap: "Growth and investment-planning outcomes P078-001/P078-004 remain AUTOMATED_VERIFICATION_INSUFFICIENT." },
] as const;

export const waveHPlan: readonly WaveHPlanRow[] = plans.map((plan) => {
  if (plan.grade === 1) return { ...plan, authoritativePages: [], gradeOneLegacyEvidence: true,
    selectionReason: ["IMMUTABLE_VERIFIED_REPOSITORY_SOURCE", "PUBLIC_WORD_PROBLEM_OPERANDS", "INDEPENDENT_SEMANTIC_PARITY", "NO_LEGACY_REWRITE"], curriculumCompletionClaim: false };
  const sourceMap = createOfficialSourceMap(plan.grade);
  const rows = plan.sourceOutcomeIds.map((outcomeId) => {
    const row = sourceMap.find((entry) => entry.officialOutcomeId === outcomeId);
    if (!row || row.sourceClassification !== "SOURCE_VERIFIED") throw new Error(`WAVE_H_SOURCE_OUTCOME_MISSING:${outcomeId}`);
    if (row.automatedVerificationCapability === "INSUFFICIENT") throw new Error(`WAVE_H_SOURCE_AUTOMATION_INSUFFICIENT:${outcomeId}`);
    return row;
  });
  return { ...plan, authoritativePages: [...new Set(rows.flatMap((row) => {
    const pages: number[] = [];
    for (let page = row.sourceReference.pages.start; page <= row.sourceReference.pages.end; page += 1) pages.push(page);
    return pages;
  }))].sort((left, right) => left - right), gradeOneLegacyEvidence: false,
    selectionReason: ["SOURCE_VERIFIED", "UNCOVERED_BY_WAVES_A_TO_G", "APPLIED_MULTI_STEP_PRIORITY", "DETERMINISTIC_REASONING_ORACLE"], curriculumCompletionClaim: false };
});

export function getWaveHPlan(grade: FactoryGrade) {
  const plan = waveHPlan.find((entry) => entry.grade === grade);
  if (!plan) throw new Error(`WAVE_H_PLAN_MISSING:G${grade}`);
  return plan;
}
