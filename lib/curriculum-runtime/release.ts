import { createHash } from "node:crypto";

import inventoryJson from "../../docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json" with {
  type: "json",
};
import { generatePreviewUnit } from "../curriculum/engine.ts";
import { curriculumUnits } from "../curriculum/registry.ts";
import {
  studentLearningGoals,
  studentUnitTitle,
} from "../curriculum/student-facing.ts";
import type {
  PreviewOption,
  PreviewVisualSpec,
} from "../curriculum/types.ts";

export const UNIVERSAL_CURRICULUM_RELEASE_ID = "plave-math-grades-1-9-v1";
export const UNIVERSAL_CURRICULUM_CONTENT_VERSION =
  "2026.07.30-draft.1";
export const UNIVERSAL_CURRICULUM_GENERATOR_VERSION =
  "vertical-preview-v1";
export const UNIVERSAL_CURRICULUM_SEED =
  "plave-curriculum-preview-v1";
export const UNIVERSAL_MASTERY_POLICY_VERSION =
  "product-hypothesis-v1";

type InventoryRecord = Readonly<{
  id: string;
  conciseParaphrase: string;
}>;

type Inventory = Readonly<{
  source: Readonly<{ sha256: string }>;
  outcomes: readonly InventoryRecord[];
}>;

const inventory = inventoryJson as Inventory;
const outcomeTitles = new Map(
  inventory.outcomes.map((outcome) => [
    outcome.id,
    outcome.conciseParaphrase,
  ]),
);

export type MaterializedCurriculumUnit = Readonly<{
  releaseId: string;
  unitId: string;
  grade: number;
  domain: string;
  title: string;
  description: string;
  learningGoals: readonly string[];
  theory: unknown;
  workedExamples: unknown;
  officialOutcomeIds: readonly string[];
  skillIds: readonly string[];
  displayOrder: number;
  totalQuestions: number;
}>;

export type MaterializedCurriculumQuestion = Readonly<{
  releaseId: string;
  unitId: string;
  questionId: string;
  displayOrder: number;
  answerType: "MULTIPLE_CHOICE" | "NUMBER_INPUT" | "TEXT_INPUT";
  prompt: string;
  options: readonly PreviewOption[] | null;
  visual: PreviewVisualSpec;
  cognitiveLevel: "UNDERSTAND" | "APPLY" | "REASON";
  officialOutcomeIds: readonly string[];
  officialOutcomeTitles: readonly string[];
  skillId: string;
  skillTitle: string;
  questionPayloadHash: string;
}>;

export type MaterializedCurriculumSolution = Readonly<{
  releaseId: string;
  questionId: string;
  normalizedCorrectAnswer: string;
  correctAnswer: string;
  solutionSteps: readonly string[];
  feedback: string;
  solutionPayloadHash: string;
}>;

export type UniversalCurriculumRelease = Readonly<{
  release: Readonly<{
    releaseId: string;
    contentVersion: string;
    curriculumSourceFingerprint: string;
    generatorVersion: string;
    deterministicSeed: string;
    masteryPolicyVersion: string;
    status: "DRAFT";
    activationState: "INACTIVE";
  }>;
  units: readonly MaterializedCurriculumUnit[];
  questions: readonly MaterializedCurriculumQuestion[];
  solutions: readonly MaterializedCurriculumSolution[];
  hashes: Readonly<{
    publicPayloadSha256: string;
    privateSolutionSha256: string;
    bundleSha256: string;
  }>;
}>;

export type UniversalCurriculumReleaseManifest = Readonly<{
  schemaVersion: 1;
  releaseId: string;
  contentVersion: string;
  curriculumSourceFingerprint: string;
  generatorVersion: string;
  deterministicSeed: string;
  masteryPolicyVersion: string;
  status: "DRAFT";
  activationState: "INACTIVE";
  grades: readonly number[];
  unitCount: number;
  questionCount: number;
  solutionCount: number;
  publicPayloadSha256: string;
  privateSolutionSha256: string;
  bundleSha256: string;
}>;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value: unknown) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function normalizeCurriculumAnswer(answer: string) {
  return answer
    .trim()
    .replace(",", ".")
    .replace(/\s+/g, "")
    .toLocaleLowerCase("vi");
}

function getQuestionOutcomeIds(
  fallbackIds: readonly string[],
  audit: Readonly<{
    primaryOfficialOutcomeId?: string;
    supportingOfficialOutcomeIds?: readonly string[];
  }>,
) {
  const mapped = [
    audit.primaryOfficialOutcomeId,
    ...(audit.supportingOfficialOutcomeIds ?? []),
  ].filter((value): value is string => Boolean(value));
  return [...new Set(mapped.length > 0 ? mapped : fallbackIds)];
}

function getSkillTitle(
  unit: (typeof curriculumUnits)[number],
  skillId: string,
) {
  const index = Math.max(0, unit.skillFamilies.indexOf(skillId));
  return (
    unit.theory[index % Math.max(unit.theory.length, 1)]?.title ??
    studentUnitTitle(unit)
  );
}

export function buildUniversalCurriculumRelease(): UniversalCurriculumRelease {
  const units: MaterializedCurriculumUnit[] = [];
  const questions: MaterializedCurriculumQuestion[] = [];
  const solutions: MaterializedCurriculumSolution[] = [];

  curriculumUnits.forEach((unit, unitIndex) => {
    const draft = generatePreviewUnit(unit.slug, UNIVERSAL_CURRICULUM_SEED);
    units.push({
      releaseId: UNIVERSAL_CURRICULUM_RELEASE_ID,
      unitId: unit.slug,
      grade: unit.grade,
      domain: unit.domain,
      title: studentUnitTitle(unit),
      description:
        unit.theory[0]?.explanation[0] ??
        `Bài học Toán lớp ${unit.grade} theo chương trình chính thức.`,
      learningGoals: studentLearningGoals(unit),
      theory: unit.theory,
      workedExamples: unit.examples,
      officialOutcomeIds: unit.officialOutcomeIds,
      skillIds: unit.skillFamilies,
      displayOrder: unitIndex + 1,
      totalQuestions: draft.questions.length,
    });

    draft.questions.forEach((question, questionIndex) => {
      const audit = draft.audits[questionIndex];
      const solution = draft.solutions[questionIndex];
      if (!audit || !solution || solution.questionCode !== question.code) {
        throw new Error(`Release pairing failed for ${question.code}.`);
      }
      const officialOutcomeIds = getQuestionOutcomeIds(
        unit.officialOutcomeIds,
        audit,
      );
      const publicPayload = {
        releaseId: UNIVERSAL_CURRICULUM_RELEASE_ID,
        unitId: unit.slug,
        questionId: question.code,
        displayOrder: questionIndex + 1,
        answerType: question.answerType,
        prompt: question.prompt,
        options: question.options,
        visual: question.visual,
        cognitiveLevel: question.cognitiveLevel,
        officialOutcomeIds,
        officialOutcomeTitles: officialOutcomeIds.map(
          (id) => outcomeTitles.get(id) ?? "Mục tiêu học tập của bài",
        ),
        skillId: question.skillFamily,
        skillTitle: getSkillTitle(unit, question.skillFamily),
      } as const;
      questions.push({
        ...publicPayload,
        questionPayloadHash: sha256(publicPayload),
      });

      const privatePayload = {
        releaseId: UNIVERSAL_CURRICULUM_RELEASE_ID,
        questionId: question.code,
        normalizedCorrectAnswer: normalizeCurriculumAnswer(
          solution.correctAnswer,
        ),
        correctAnswer: solution.correctAnswer,
        solutionSteps: solution.steps,
        feedback: solution.feedback,
      } as const;
      solutions.push({
        ...privatePayload,
        solutionPayloadHash: sha256(privatePayload),
      });
    });
  });

  const release = {
    releaseId: UNIVERSAL_CURRICULUM_RELEASE_ID,
    contentVersion: UNIVERSAL_CURRICULUM_CONTENT_VERSION,
    curriculumSourceFingerprint: inventory.source.sha256,
    generatorVersion: UNIVERSAL_CURRICULUM_GENERATOR_VERSION,
    deterministicSeed: UNIVERSAL_CURRICULUM_SEED,
    masteryPolicyVersion: UNIVERSAL_MASTERY_POLICY_VERSION,
    status: "DRAFT" as const,
    activationState: "INACTIVE" as const,
  };
  const immutableReleaseBinding = {
    releaseId: release.releaseId,
    contentVersion: release.contentVersion,
    curriculumSourceFingerprint: release.curriculumSourceFingerprint,
    generatorVersion: release.generatorVersion,
    deterministicSeed: release.deterministicSeed,
    masteryPolicyVersion: release.masteryPolicyVersion,
  };
  const publicPayloadSha256 = sha256({
    release: immutableReleaseBinding,
    units,
    questions,
  });
  const privateSolutionSha256 = sha256(solutions);
  const bundleSha256 = sha256({
    publicPayloadSha256,
    privateSolutionSha256,
  });

  return {
    release,
    units,
    questions,
    solutions,
    hashes: {
      publicPayloadSha256,
      privateSolutionSha256,
      bundleSha256,
    },
  };
}

export function buildUniversalCurriculumReleaseManifest(
  release = buildUniversalCurriculumRelease(),
): UniversalCurriculumReleaseManifest {
  return {
    schemaVersion: 1,
    ...release.release,
    grades: [...new Set(release.units.map((unit) => unit.grade))],
    unitCount: release.units.length,
    questionCount: release.questions.length,
    solutionCount: release.solutions.length,
    ...release.hashes,
  };
}
