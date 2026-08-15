import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CURRENT_MASTERY_HELP,
  MISSING_VIETNAMESE_OUTCOME_LABEL,
  MISSING_VIETNAMESE_SKILL_LABEL,
  MISSING_VIETNAMESE_UNIT_LABEL,
  curriculumOutcomeStateText,
  getCurriculumOutcomeEvidenceState,
  getVietnameseOutcomeLabel,
  getVietnameseSkillLabel,
  getVietnameseUnitLabel,
  isVietnamesePresentationLabel,
} from "../lib/learning/presentation.ts";
import { getParentSkillLabel } from "../lib/parent-dashboard/contracts.ts";
import { getSkillLabel } from "../lib/practice/catalog.ts";
import { skillCodes } from "../lib/practice/contracts.ts";
import { buildGradesTwoToNineDatabaseRelease } from "../lib/release-integration/inventory.ts";
import { titleFromCanonicalVietnameseEvidence } from "../lib/learning/vietnamese-title-policy.ts";
import {
  parentMasteryLabels,
} from "../lib/parent-dashboard/universal-contracts.ts";
import {
  curriculumMasteryLabelText,
} from "../lib/curriculum-runtime/contracts.ts";

const parentComponent = readFileSync(
  new URL("../components/ParentUniversalProgress.tsx", import.meta.url),
  "utf8",
);
const studentComponent = readFileSync(
  new URL("../components/StudentCurriculumProgressView.tsx", import.meta.url),
  "utf8",
);
const studentHistoryComponent = readFileSync(
  new URL("../components/StudentCurriculumHistoryView.tsx", import.meta.url),
  "utf8",
);
const teacherComponent = readFileSync(
  new URL("../components/TeacherCurriculumAssignmentBuilder.tsx", import.meta.url),
  "utf8",
);
const reviewerComponent = readFileSync(
  new URL(
    "../app/internal/generator-v2-owner-review/GeneratorV2OwnerReview.tsx",
    import.meta.url,
  ),
  "utf8",
);
const parentMigration = readFileSync(
  new URL(
    "../supabase/migrations/0039_parent_teacher_universal_learning.sql",
    import.meta.url,
  ),
  "utf8",
);
const mappingSchemaMigration = readFileSync(
  new URL(
    "../supabase/migrations/0038_universal_curriculum_runtime_draft.sql",
    import.meta.url,
  ),
  "utf8",
);
const mappingMaterializer = readFileSync(
  new URL(
    "../scripts/materialize-universal-curriculum-local.ts",
    import.meta.url,
  ),
  "utf8",
);

test("every known Grade 1 skill has one shared Vietnamese presentation label", () => {
  assert.ok(skillCodes.length > 40);
  for (const skillCode of skillCodes) {
    const canonical = getSkillLabel(skillCode);
    assert.notEqual(canonical, "Kỹ năng đang được cập nhật");
    assert.equal(getParentSkillLabel(skillCode), canonical);
    assert.equal(getVietnameseSkillLabel({ skillId: skillCode }), canonical);
    assert.equal(isVietnamesePresentationLabel(canonical), true);
  }
});

test("legacy SQL title casing resolves through stable skill identifiers, not six page-specific translations", () => {
  const observed = new Map([
    ["Add Teen And Ones No Carry", "Cộng số có hai chữ số với số có một chữ số"],
    ["Add Ten And Ones", "Cộng 10 và các đơn vị"],
    ["Add Using Tens Ones", "Cộng theo chục và đơn vị"],
    ["Addition Calculation", "Tính tổng trong phạm vi 10"],
    ["Addition Meaning", "Ý nghĩa của phép cộng"],
    ["Addition Subtraction Relation", "Liên hệ phép cộng và phép trừ"],
  ]);
  for (const [rawTitle, expected] of observed) {
    assert.equal(getVietnameseSkillLabel({ label: rawTitle }), expected);
  }
  assert.equal(
    getVietnameseSkillLabel({ label: "Count Recognize đến 100" }),
    "Đếm và nhận biết số đến 100",
  );
});

test("Grades 2–9 Vietnamese metadata passes through while raw IDs and English labels fail closed", () => {
  const canonicalSkill = "Thực hiện được phép cộng và phép trừ trong phạm vi 1000.";
  const canonicalOutcome = "Đọc và phân tích dữ liệu từ bảng thống kê.";
  assert.equal(
    getVietnameseSkillLabel({
      skillId: "moet2018-g2-num-p025-011",
      label: canonicalSkill,
    }),
    canonicalSkill,
  );
  assert.equal(
    getVietnameseOutcomeLabel({
      outcomeId: "moet2018-g7-sta-p063-001-objective",
      label: canonicalOutcome,
    }),
    canonicalOutcome,
  );
  assert.equal(
    getVietnameseSkillLabel({ label: "UNRELEASED_INTERNAL_SKILL" }),
    MISSING_VIETNAMESE_SKILL_LABEL,
  );
  assert.equal(
    getVietnameseSkillLabel({ skillId: "UNRELEASED_INTERNAL_SKILL" }),
    MISSING_VIETNAMESE_SKILL_LABEL,
  );
  assert.equal(
    getVietnameseOutcomeLabel({ label: "Official Outcome Internal Label" }),
    MISSING_VIETNAMESE_OUTCOME_LABEL,
  );
  assert.equal(
    getVietnameseUnitLabel({
      unitId: "grade-8-linear-equations-p0",
      label: "grade 8 linear equations p0",
    }),
    "Chủ đề Toán học",
  );
});

test("the full Grades 2–9 release inventory resolves every unit, skill and outcome to Vietnamese", () => {
  const release = buildGradesTwoToNineDatabaseRelease();
  const units = release.grades.flatMap((grade) => grade.units);
  const questions = release.grades.flatMap((grade) => grade.questions);
  const skills = new Map(
    questions.map((question) => [question.skillId, question.skillTitle]),
  );
  const outcomes = new Map(
    questions.flatMap((question) =>
      question.officialOutcomeIds.map((outcomeId, index) => [
        outcomeId,
        question.officialOutcomeTitles[index],
      ]),
    ),
  );

  assert.equal(release.grades.length, 8);
  assert.equal(units.length, 163);
  assert.equal(skills.size, 287);
  assert.equal(outcomes.size, 287);
  let missingBefore = 0;
  let rawExposureBefore = 0;
  for (const unit of units) {
    if (!isVietnamesePresentationLabel(unit.title)) missingBefore += 1;
    if (/\bgrade [2-9]\b|\bp[01]\b/iu.test(unit.title)) {
      rawExposureBefore += 1;
    }
    const displayed = getVietnameseUnitLabel({
      unitId: unit.unitId,
      label: unit.title,
    });
    assert.equal(isVietnamesePresentationLabel(displayed), true, unit.unitId);
    assert.doesNotMatch(displayed, /\bgrade [1-9]\b|\bp[01]\b/iu, unit.unitId);
    assert.notEqual(displayed, MISSING_VIETNAMESE_UNIT_LABEL, unit.unitId);
  }
  assert.equal(missingBefore, 162);
  assert.equal(rawExposureBefore, 162);
  for (const [skillId, label] of skills) {
    const displayed = getVietnameseSkillLabel({ skillId, label });
    assert.notEqual(displayed, MISSING_VIETNAMESE_SKILL_LABEL);
    assert.equal(isVietnamesePresentationLabel(displayed), true);
  }

  for (const [outcomeId, label] of outcomes) {
    const displayed = getVietnameseOutcomeLabel({ outcomeId, label });
    assert.notEqual(displayed, MISSING_VIETNAMESE_OUTCOME_LABEL);
    assert.equal(isVietnamesePresentationLabel(displayed), true);
  }
});

test("generated Vietnamese unit labels are canonical, reproducible and source-provenanced", () => {
  const artifact = JSON.parse(
    readFileSync(
      new URL(
        "../content/releases/grades-2-9/vietnamese-curriculum-labels.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as {
    schemaVersion: string;
    artifactHash: string;
    provenance: {
      sourceInventoryHash: string;
      sourceMigrationSha256: string;
    };
    counts: { grades: number; units: number; runtimeUnits: number };
    units: readonly {
      unitId: string;
      grade: number;
      title: string;
      sourceField: "TITLE" | "DESCRIPTION" | "LEARNING_GOAL";
      sourceIndex: number;
    }[];
  };
  const release = buildGradesTwoToNineDatabaseRelease();
  const releaseUnits = new Map(
    release.grades.flatMap((grade) =>
      grade.units.map((unit) => [unit.unitId, unit] as const),
    ),
  );
  assert.equal(artifact.schemaVersion, "plave-vietnamese-curriculum-labels-v1");
  assert.equal(artifact.provenance.sourceInventoryHash, release.inventoryHash);
  assert.equal(artifact.counts.grades, 8);
  assert.equal(artifact.counts.units, 163);
  assert.equal(artifact.counts.runtimeUnits, 128);
  assert.equal(new Set(artifact.units.map((unit) => unit.unitId)).size, 163);
  assert.equal(
    artifact.provenance.sourceMigrationSha256,
    createHash("sha256")
      .update(
        readFileSync(
          new URL(
            "../supabase/migrations/0045_grades_2_9_local_public_release.sql",
            import.meta.url,
          ),
        ),
      )
      .digest("hex"),
  );
  for (const localized of artifact.units) {
    const source = releaseUnits.get(localized.unitId);
    assert.ok(source, localized.unitId);
    const evidence = localized.sourceField === "TITLE"
      ? source.title
      : localized.sourceField === "DESCRIPTION"
        ? source.description
        : source.learningGoals[localized.sourceIndex];
    assert.equal(
      localized.title,
      titleFromCanonicalVietnameseEvidence(evidence),
      localized.unitId,
    );
  }
});

test("curriculum outcome evidence states distinguish no activity, missing mapping, insufficient and available evidence", () => {
  assert.equal(
    getCurriculumOutcomeEvidenceState({ totalLearningEvidence: 0, outcomes: [] }),
    "NO_ACTIVITY",
  );
  assert.equal(
    getCurriculumOutcomeEvidenceState({ totalLearningEvidence: 12, outcomes: [] }),
    "MAPPING_NOT_AVAILABLE",
  );
  assert.equal(
    getCurriculumOutcomeEvidenceState({
      totalLearningEvidence: 12,
      outcomes: [{ evidenceCount: 2 }],
    }),
    "INSUFFICIENT_EVIDENCE",
  );
  assert.equal(
    getCurriculumOutcomeEvidenceState({
      totalLearningEvidence: 12,
      outcomes: [{ evidenceCount: 3 }],
    }),
    "EVIDENCE_AVAILABLE",
  );
  assert.match(
    curriculumOutcomeStateText.MAPPING_NOT_AVAILABLE.description,
    /Kết quả theo kỹ năng vẫn được hiển thị bên cạnh/u,
  );
});

test("Parent and Student use truthful outcome states and query errors remain fail closed", () => {
  for (const source of [parentComponent, studentComponent]) {
    assert.match(source, /getCurriculumOutcomeEvidenceState/u);
    assert.match(source, /data-curriculum-outcome-state/u);
    assert.match(source, /getVietnameseOutcomeLabel/u);
    assert.match(source, /getVietnameseSkillLabel/u);
  }
  assert.doesNotMatch(
    parentComponent,
    /Chưa có bằng chứng học tập theo mục tiêu chương trình\./u,
  );
  assert.match(parentComponent, /role="status"/u);
  assert.match(CURRENT_MASTERY_HELP, /không phải đánh giá chính thức/u);
  assert.match(CURRENT_MASTERY_HELP, /ít nhất 6 bằng chứng/u);
});

test("repository truth keeps Grade 1 outcome mapping explicit and non-fabricated", () => {
  assert.match(
    mappingSchemaMigration,
    /create table public\.curriculum_legacy_grade1_outcome_mappings/u,
  );
  assert.doesNotMatch(
    mappingSchemaMigration,
    /insert into public\.curriculum_legacy_grade1_outcome_mappings/u,
  );
  assert.match(
    mappingMaterializer,
    /LEGACY_UNIT_ALIGNED_PRODUCT_MAPPING_V1/u,
  );
  assert.match(
    parentMigration,
    /where mapping\.release_id = v_release_id/u,
  );
  assert.match(parentMigration, /LEGACY_QUESTION_SKILL/u);
  assert.match(parentMigration, /initcap\(replace\(question\.skill_code/u);
});

test("Student, Parent, Teacher and Reviewer all consume presentation labels instead of raw metadata", () => {
  assert.match(studentComponent, /getVietnameseSkillLabel/u);
  assert.match(studentHistoryComponent, /getVietnameseUnitLabel/u);
  assert.match(parentComponent, /getVietnameseSkillLabel/u);
  assert.match(teacherComponent, /getVietnameseSkillLabel/u);
  assert.match(reviewerComponent, /reviewDecisionPresentationLabels/u);
  assert.match(reviewerComponent, /difficultyPresentationLabels/u);
  assert.doesNotMatch(reviewerComponent, />Approved</u);
  assert.doesNotMatch(reviewerComponent, />Rejected</u);
  assert.doesNotMatch(reviewerComponent, />Needs revision</u);
  assert.equal(
    parentMasteryLabels.MASTERED,
    curriculumMasteryLabelText.MASTERED,
  );
  assert.equal(
    parentMasteryLabels.MASTERED,
    "Đạt mức thành thạo theo tiêu chí hiện tại",
  );
});
