import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  MISSING_VIETNAMESE_LEARNING_LABEL,
  MISSING_VIETNAMESE_OUTCOME_LABEL,
  MISSING_VIETNAMESE_SKILL_LABEL,
  MISSING_VIETNAMESE_UNIT_LABEL,
  getVietnameseLearningLabel,
  getVietnameseOutcomeLabel,
  getVietnameseSkillLabel,
  getVietnameseUnitLabel,
  isVietnamesePresentationLabel,
} from "../lib/learning/presentation.ts";

const forbiddenRenderedText =
  /Chưa có tên|\bUnknown\b|\bUntitled\b|grade 2 applied measurement p0/iu;
const forbiddenSourceLiteral =
  /["'`](?:Chưa có tên|Unknown|Untitled|grade 2 applied measurement p0)/iu;

const studentFacingFiles = [
  "app/dashboard/page.tsx",
  "app/lessons/page.tsx",
  "app/learn/page.tsx",
  "app/learn/[gradeSlug]/[lessonSlug]/page.tsx",
  "app/curriculum-practice/[attemptId]/UniversalCurriculumRunner.tsx",
  "app/adaptive-practice/[attemptId]/AdaptivePracticeRunner.tsx",
  "app/results/page.tsx",
  "app/learning-history/page.tsx",
  "app/learning-progress/page.tsx",
  "app/goals/page.tsx",
  "app/profile/page.tsx",
  "components/CompetencyLearningPathPanel.tsx",
  "components/PersonalizedRecommendationCard.tsx",
  "components/ReleasedCurriculumCatalog.tsx",
  "components/ReleasedCurriculumLesson.tsx",
  "components/StudentCurriculumHistoryView.tsx",
  "components/StudentCurriculumProgressView.tsx",
] as const;

test("Student-facing routes contain no missing-title placeholder or observed raw identifier", () => {
  for (const path of studentFacingFiles) {
    assert.doesNotMatch(readFileSync(path, "utf8"), forbiddenSourceLiteral, path);
  }
  for (const fallback of [
    MISSING_VIETNAMESE_LEARNING_LABEL,
    MISSING_VIETNAMESE_OUTCOME_LABEL,
    MISSING_VIETNAMESE_SKILL_LABEL,
    MISSING_VIETNAMESE_UNIT_LABEL,
  ]) {
    assert.doesNotMatch(fallback, forbiddenRenderedText);
    assert.equal(isVietnamesePresentationLabel(fallback), true);
  }
});

test("progress, history, results and runtime resolve historical raw unit titles by stable unit id", () => {
  const expected =
    "Giải quyết được một số vấn đề thực tiễn liên quan đến đo lường các đại lượng đã học";
  for (const label of [
    "grade 2 applied measurement p0",
    "grade-2-applied-measurement-p0",
    null,
  ]) {
    assert.equal(
      getVietnameseUnitLabel({
        unitId: "grade-2-applied-measurement-p0",
        label,
      }),
      expected,
    );
  }
});

test("topic, skill and outcome fallbacks fail closed in Vietnamese without echoing identifiers", () => {
  const unit = getVietnameseUnitLabel({
    unitId: "unmapped-internal-unit-p0",
    label: "grade 9 unmapped internal unit p0",
  });
  const skill = getVietnameseSkillLabel({
    skillId: "INTERNAL_SKILL_KEY",
    label: "Internal Skill Key",
  });
  const outcome = getVietnameseOutcomeLabel({
    outcomeId: "internal-outcome-key",
    label: "Internal Outcome Key",
  });
  const learning = getVietnameseLearningLabel({
    identifier: "internal-topic-key",
    label: "Internal Topic Key",
    nearestVietnameseLabel: "Phép cộng và phép trừ trong phạm vi 1000",
  });
  assert.equal(unit, "Chủ đề Toán học");
  assert.equal(skill, "Kỹ năng Toán học");
  assert.equal(outcome, "Mục tiêu học tập của bài");
  assert.equal(learning, "Phép cộng và phép trừ trong phạm vi 1000");
  for (const label of [unit, skill, outcome, learning]) {
    assert.equal(isVietnamesePresentationLabel(label), true);
    assert.doesNotMatch(label, /internal|grade|p0|key/iu);
  }
});
