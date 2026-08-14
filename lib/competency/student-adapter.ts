import type { StudentCurriculumProgress } from "../curriculum-runtime/contracts.ts";
import { curriculumUnits } from "../curriculum/registry.ts";
import {
  computeSkillCompetencyFromSummary,
  recommendNextLearningPath,
  type LearningPathRecommendation,
  type SkillCompetency,
} from "./engine.ts";

export type StudentCompetencyDashboard = Readonly<{
  schoolGrade: number;
  skills: readonly SkillCompetency[];
  recommendation: LearningPathRecommendation | null;
  recommendedUnit: StudentCurriculumProgress["units"][number] | null;
  evidenceSource: "CURRENT_STUDENT_CURRICULUM_PROGRESS";
}>;

export function buildStudentCompetencyDashboard(input: Readonly<{
  progress: StudentCurriculumProgress;
  now: Date;
  adaptivePilotEnabled: boolean;
  runtimeEligibleUnitIds?: ReadonlySet<string>;
}>): StudentCompetencyDashboard | null {
  if (input.progress.grade < 1 || input.progress.grade > 9) return null;
  // The progress payload is the database-authorized runtime inventory. The
  // source registry may contain draft, hidden, pool-limited, or superseded
  // units, so it is metadata-only here and must never create candidates.
  const registryBySlug = new Map(
    curriculumUnits
      .filter((unit) => unit.grade === input.progress.grade)
      .map((unit) => [unit.slug, unit]),
  );
  const units = input.runtimeEligibleUnitIds
    ? input.progress.units.filter((unit) =>
        input.runtimeEligibleUnitIds?.has(unit.unitId),
      )
    : input.progress.units;
  const authorizedUnitIds = new Set(units.map((unit) => unit.unitId));
  const progressByUnit = new Map(
    input.progress.units.map((unit) => [unit.unitId, unit]),
  );
  const skills = units.map((unit) => {
    const observed = progressByUnit.get(unit.unitId);
    const competency = computeSkillCompetencyFromSummary({
      now: input.now,
      summary: {
        skillId: unit.unitId,
        schoolGrade: input.progress.grade,
        evidenceCount: observed?.evidenceCount ?? 0,
        correctCount: observed?.correctCount ?? 0,
        lastPracticedAt: observed?.lastActivityAt ?? null,
        hintDataAvailable: false,
        difficultyDataAvailable: false,
        retentionDataAvailable: false,
      },
    });
    return { ...competency, displayName: observed?.title ?? unit.title };
  });
  const recommendation = recommendNextLearningPath({
    schoolGrade: input.progress.grade,
    competencies: skills,
    candidates: units.map((unit, index) => {
      const sourceUnit = registryBySlug.get(unit.unitId);
      return {
        candidateId: unit.unitId,
        skillId: unit.unitId,
        schoolGrade: input.progress.grade,
        title: unit.title,
        curriculumOrder: index,
        sequenceRelevance: 100 - index,
        unfinishedEngagement: unit.status === "IN_PROGRESS" ? 100 : 0,
        active: true,
        visible: true,
        pilotOnly: false,
        // Registry prerequisites can only constrain already-authorized units;
        // they can never pull a source-only unit into the runtime inventory.
        prerequisiteSkillIds: (sourceUnit?.prerequisiteSlugs ?? []).filter(
          (slug) => authorizedUnitIds.has(slug),
        ),
      };
    }),
    now: input.now,
    adaptivePilotEnabled: input.adaptivePilotEnabled,
  });
  return {
    schoolGrade: input.progress.grade,
    skills,
    recommendation,
    recommendedUnit: recommendation
      ? progressByUnit.get(recommendation.candidateId) ?? null
      : null,
    evidenceSource: "CURRENT_STUDENT_CURRICULUM_PROGRESS",
  };
}
