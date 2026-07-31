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
  evidenceSource: "CURRENT_STUDENT_CURRICULUM_PROGRESS";
}>;

export function buildStudentCompetencyDashboard(input: Readonly<{
  progress: StudentCurriculumProgress;
  now: Date;
  adaptivePilotEnabled: boolean;
}>): StudentCompetencyDashboard | null {
  if (input.progress.grade < 1 || input.progress.grade > 9) return null;
  const units = curriculumUnits.filter(
    (unit) => unit.grade === input.progress.grade,
  );
  const progressByUnit = new Map(
    input.progress.units.map((unit) => [unit.unitId, unit]),
  );
  const skills = units.map((unit) => {
    const observed = progressByUnit.get(unit.slug);
    const competency = computeSkillCompetencyFromSummary({
      now: input.now,
      summary: {
        skillId: unit.slug,
        schoolGrade: input.progress.grade,
        evidenceCount: observed?.evidenceCount ?? 0,
        correctCount: observed?.correctCount ?? 0,
        lastPracticedAt: observed?.lastActivityAt ?? null,
        hintDataAvailable: false,
        difficultyDataAvailable: false,
        retentionDataAvailable: false,
      },
    });
    return { ...competency, displayName: unit.title };
  });
  const recommendation = recommendNextLearningPath({
    schoolGrade: input.progress.grade,
    competencies: skills,
    candidates: units.map((unit) => ({
      candidateId: unit.slug,
      skillId: unit.slug,
      schoolGrade: unit.grade,
      title: unit.title,
      curriculumOrder: units.indexOf(unit),
      sequenceRelevance: 100 - units.indexOf(unit),
      unfinishedEngagement:
        progressByUnit.get(unit.slug)?.status === "IN_PROGRESS" ? 100 : 0,
      active: true,
      visible: true,
      pilotOnly: false,
      // Cross-grade prerequisites are outside this current-grade progress
      // payload; same-grade prerequisites remain fail-closed in the engine.
      prerequisiteSkillIds: unit.prerequisiteSlugs.filter((slug) =>
        units.some((candidate) => candidate.slug === slug),
      ),
    })),
    now: input.now,
    adaptivePilotEnabled: input.adaptivePilotEnabled,
  });
  return {
    schoolGrade: input.progress.grade,
    skills,
    recommendation,
    evidenceSource: "CURRENT_STUDENT_CURRICULUM_PROGRESS",
  };
}
