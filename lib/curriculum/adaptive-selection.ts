import inventoryJson from "../../docs/curriculum/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS.json" with {
  type: "json",
};

import {
  isTrueParametricOutcome,
  type OnDemandSelectionReason,
} from "./on-demand-generation.ts";
import { curriculumUnits } from "./registry.ts";
import type { CurriculumGrade } from "./types.ts";
import type {
  CurriculumMasteryLabel,
  StudentCurriculumProgress,
} from "../curriculum-runtime/contracts.ts";
import {
  buildUniversalCurriculumRelease,
} from "../curriculum-runtime/release.ts";
import {
  buildOutcomeSemanticContract,
} from "../generation-semantic/variant-engine.ts";
import type { OutcomeDescriptor } from "../generation-semantic/engine.ts";

export const ADAPTIVE_SELECTION_POLICY_VERSION =
  "product-hypothesis-adaptive-v1" as const;

export const adaptiveSelectionHypotheses = {
  frequentErrorMinimumEvidence: 3,
  frequentErrorAccuracy: 0.6,
  weakEvidenceAccuracy: 0.7,
  prerequisiteSecureAccuracy: 0.75,
  retentionDueDays: 21,
} as const;

type InventoryOutcome = Readonly<{
  id: string;
  grade: number;
  conciseParaphrase: string;
  mappedUnitIds: readonly string[];
  prerequisiteOutcomeIds: readonly string[];
  implementationEvidence?: Readonly<{
    primaryQuestionCodes: readonly string[];
  }>;
}>;

type Inventory = Readonly<{
  outcomes: readonly InventoryOutcome[];
}>;

type Evidence = Readonly<{
  evidenceCount: number;
  correctCount: number;
  masteryLabel: CurriculumMasteryLabel;
  lastActivityAt: string | null;
}>;

export type AdaptiveCurriculumRecommendation = Readonly<{
  policyVersion: typeof ADAPTIVE_SELECTION_POLICY_VERSION;
  hypothesisStatus: "PRODUCT_HYPOTHESIS";
  grade: CurriculumGrade;
  unitId: string;
  outcomeId: string;
  outcomeTitle: string;
  preferredSkillId: string | null;
  reasonCode: OnDemandSelectionReason;
  explanation: string;
  score: number;
}>;

const inventory = inventoryJson as Inventory;
const release = buildUniversalCurriculumRelease();
const unitById = new Map(curriculumUnits.map((unit) => [unit.slug, unit]));
const outcomeById = new Map(
  inventory.outcomes.map((outcome) => [outcome.id, outcome]),
);
const releaseQuestionsByOutcome = new Map<string, typeof release.questions>();
for (const question of release.questions) {
  for (const outcomeId of question.officialOutcomeIds) {
    const current = releaseQuestionsByOutcome.get(outcomeId) ?? [];
    releaseQuestionsByOutcome.set(outcomeId, [...current, question]);
  }
}

function normalizedTitle(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
}

function accuracy(evidence: Evidence | null) {
  return evidence && evidence.evidenceCount > 0
    ? evidence.correctCount / evidence.evidenceCount
    : null;
}

function daysSince(value: string | null, now: Date) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? Math.max(0, (now.getTime() - timestamp) / 86_400_000)
    : null;
}

function hasSafeTemplateInUnit(
  outcome: InventoryOutcome,
  unitId: string,
) {
  return Boolean(
    outcome.implementationEvidence?.primaryQuestionCodes.some(
      (questionCode) => questionCode.startsWith(`${unitId}-q`),
    ),
  );
}

function evidenceFromProgress(
  progress: StudentCurriculumProgress,
  title: string,
): Evidence | null {
  const normalized = normalizedTitle(title);
  const item = progress.outcomes.find(
    (candidate) => normalizedTitle(candidate.title) === normalized,
  );
  return item
    ? {
        evidenceCount: item.evidenceCount,
        correctCount: item.correctCount,
        masteryLabel: item.masteryLabel,
        lastActivityAt: item.lastActivityAt,
      }
    : null;
}

function skillEvidenceScore(
  progress: StudentCurriculumProgress,
  outcomeId: string,
) {
  const question = releaseQuestionsByOutcome.get(outcomeId)?.[0];
  if (!question) return { score: 0, skillId: null };
  const skill = progress.skills.find(
    (candidate) =>
      normalizedTitle(candidate.title) ===
      normalizedTitle(question.skillTitle),
  );
  if (!skill || skill.evidenceCount === 0) {
    return { score: 45, skillId: question.skillId };
  }
  const skillAccuracy = skill.correctCount / skill.evidenceCount;
  return {
    score:
      skillAccuracy < adaptiveSelectionHypotheses.weakEvidenceAccuracy
        ? Math.round((1 - skillAccuracy) * 100)
        : 0,
    skillId: question.skillId,
  };
}

function scoreCandidate(
  outcome: InventoryOutcome,
  progress: StudentCurriculumProgress,
  now: Date,
) {
  const evidence = evidenceFromProgress(
    progress,
    outcome.conciseParaphrase,
  );
  const currentAccuracy = accuracy(evidence);
  const prerequisiteEvidence = outcome.prerequisiteOutcomeIds
    .map((id) => outcomeById.get(id))
    .filter((value): value is InventoryOutcome => Boolean(value))
    .map((prerequisite) =>
      evidenceFromProgress(progress, prerequisite.conciseParaphrase),
    );
  const prerequisiteNotSecure = prerequisiteEvidence.some((item) => {
    const value = accuracy(item);
    return (
      value === null ||
      value < adaptiveSelectionHypotheses.prerequisiteSecureAccuracy
    );
  });
  const skill = skillEvidenceScore(progress, outcome.id);

  if (!evidence || evidence.evidenceCount === 0) {
    return {
      score: prerequisiteNotSecure ? 780 : 1_000,
      reasonCode: prerequisiteNotSecure
        ? ("PREREQUISITE_NOT_SECURE" as const)
        : ("NO_EVIDENCE" as const),
      explanation: prerequisiteNotSecure
        ? "Hệ thống chọn phần nền tảng trong lớp hiện tại vì prerequisite chưa có đủ bằng chứng vững."
        : "Hệ thống chọn mục tiêu này vì em chưa có bằng chứng trả lời nào cho mục tiêu đó.",
      preferredSkillId: skill.skillId,
    };
  }
  if (
    evidence.evidenceCount >=
      adaptiveSelectionHypotheses.frequentErrorMinimumEvidence &&
    currentAccuracy !== null &&
    currentAccuracy < adaptiveSelectionHypotheses.frequentErrorAccuracy
  ) {
    return {
      score: 920 + Math.round((1 - currentAccuracy) * 60) + skill.score,
      reasonCode: "FREQUENT_ERRORS" as const,
      explanation:
        "Hệ thống chọn mục tiêu này vì nhiều câu trước còn sai; đây là ưu tiên luyện lại, không phải chẩn đoán năng lực.",
      preferredSkillId: skill.skillId,
    };
  }
  if (
    evidence.masteryLabel === "NEEDS_PRACTICE" ||
    evidence.masteryLabel === "DEVELOPING" ||
    (currentAccuracy !== null &&
      currentAccuracy < adaptiveSelectionHypotheses.weakEvidenceAccuracy)
  ) {
    return {
      score: 820 + skill.score,
      reasonCode: "WEAK_RECENT_EVIDENCE" as const,
      explanation:
        "Hệ thống chọn mục tiêu này vì bằng chứng gần đây hoặc mức độ vững hiện tại còn yếu.",
      preferredSkillId: skill.skillId,
    };
  }
  if (prerequisiteNotSecure) {
    return {
      score: 700 + skill.score,
      reasonCode: "PREREQUISITE_NOT_SECURE" as const,
      explanation:
        "Hệ thống ưu tiên củng cố prerequisite trong phạm vi lớp hiện tại trước khi tăng độ khó.",
      preferredSkillId: skill.skillId,
    };
  }
  const inactiveDays = daysSince(evidence.lastActivityAt, now);
  if (
    inactiveDays !== null &&
    inactiveDays >= adaptiveSelectionHypotheses.retentionDueDays
  ) {
    return {
      score: 600 + Math.min(100, Math.floor(inactiveDays)),
      reasonCode: "RETENTION_DUE" as const,
      explanation:
        "Hệ thống chọn ôn lại vì đã lâu em chưa tạo bằng chứng cho mục tiêu này.",
      preferredSkillId: skill.skillId,
    };
  }
  return {
    score: 300 + skill.score,
    reasonCode: "WEAK_RECENT_EVIDENCE" as const,
    explanation:
      "Hệ thống chọn mục tiêu có bằng chứng tương đối yếu hơn trong các mục tiêu an toàn cùng lớp.",
    preferredSkillId: skill.skillId,
  };
}

export function selectAdaptiveCurriculumRecommendation(input: Readonly<{
  grade: CurriculumGrade;
  progress: StudentCurriculumProgress;
  now?: Date;
  generatorScope?: "TRUE_PARAMETRIC" | "SEMANTIC_ALL";
}>): AdaptiveCurriculumRecommendation | null {
  if (input.progress.grade !== input.grade) return null;
  const now = input.now ?? new Date();
  const candidates = inventory.outcomes.flatMap((outcome) => {
    const semanticGeneration = input.generatorScope === "SEMANTIC_ALL";
    if (
      outcome.grade !== input.grade ||
      (!semanticGeneration && !isTrueParametricOutcome(outcome.id))
    ) {
      return [];
    }
    if (semanticGeneration) {
      try {
        buildOutcomeSemanticContract({
          id: outcome.id,
          grade: outcome.grade,
          strand: "",
          subdomain: "",
          description: outcome.conciseParaphrase,
        } satisfies OutcomeDescriptor);
      } catch {
        return [];
      }
    }
    const unitId = outcome.mappedUnitIds.find((candidate) => {
      const unit = unitById.get(candidate);
      return (
        unit?.grade === input.grade &&
        (semanticGeneration
          ? releaseQuestionsByOutcome
              .get(outcome.id)
              ?.some((question) => question.unitId === candidate) === true
          : hasSafeTemplateInUnit(outcome, candidate))
      );
    });
    if (!unitId) return [];
    const scored = scoreCandidate(outcome, input.progress, now);
    return [
      {
        policyVersion: ADAPTIVE_SELECTION_POLICY_VERSION,
        hypothesisStatus: "PRODUCT_HYPOTHESIS" as const,
        grade: input.grade,
        unitId,
        outcomeId: outcome.id,
        outcomeTitle: outcome.conciseParaphrase,
        preferredSkillId: scored.preferredSkillId,
        reasonCode: scored.reasonCode,
        explanation: scored.explanation,
        score: scored.score,
      },
    ];
  });
  return (
    candidates.sort(
      (left, right) =>
        right.score - left.score ||
        left.unitId.localeCompare(right.unitId) ||
        left.outcomeId.localeCompare(right.outcomeId),
    )[0] ?? null
  );
}
