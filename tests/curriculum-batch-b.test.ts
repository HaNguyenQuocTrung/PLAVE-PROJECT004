import { strict as assert } from "node:assert";
import test from "node:test";

import { checkPreviewAnswer, generatePreviewUnit } from "../lib/curriculum/engine.ts";
import { curriculumUnits, domainCoverage } from "../lib/curriculum/registry.ts";
import { validatePreviewUnit } from "../lib/curriculum/validation.ts";

const slugs = ([4, 5, 6] as const).flatMap((grade) => [
  `grade-${grade}-angle-reasoning`,
  `grade-${grade}-area-measurement`,
]);

test("Batch B closes geometry and measurement for Grades 4–6", () => {
  assert.equal(slugs.length, 6);
  for (const grade of [4, 5, 6]) {
    for (const domain of ["GEOMETRY", "MEASUREMENT"] as const) {
      assert.equal(
        domainCoverage.find((entry) => entry.grade === grade && entry.domain === domain)?.status,
        "TEACHABLE_IMPLEMENTED",
      );
    }
  }
});

test("Batch B units satisfy teaching, deterministic and answer contracts", () => {
  for (const slug of slugs) {
    const unit = curriculumUnits.find((candidate) => candidate.slug === slug);
    assert.ok(unit);
    assert.equal(unit.theory.length, 4);
    assert.equal(unit.examples.length, 2);
    assert.ok(unit.theory.every((item) => item.explanation.length >= 2));
    assert.ok(unit.examples.every((item) => item.steps.length >= 3));
    const draft = generatePreviewUnit(slug);
    assert.deepEqual(validatePreviewUnit(draft), { valid: true, errors: [] });
    assert.equal(draft.questions.length, 12);
    assert.equal(draft.solutions.length, 12);
    assert.deepEqual(
      generatePreviewUnit(slug, "batch-b-seed"),
      generatePreviewUnit(slug, "batch-b-seed"),
    );
    for (const solution of draft.solutions) {
      assert.equal(
        checkPreviewAnswer(slug, solution.questionCode, solution.correctAnswer)?.correct,
        true,
      );
    }
  }
});

test("Batch B angle and area units use exact typed visuals without leaking solutions", () => {
  for (const slug of slugs) {
    const draft = generatePreviewUnit(slug, "batch-b-visual");
    const expected = draft.unit.domain === "GEOMETRY" ? "ANGLE_DIAGRAM" : "AREA_MODEL";
    for (const question of draft.questions) {
      assert.equal(question.visual.type, expected);
      assert.equal("correctAnswer" in question, false);
      assert.equal("solutionSteps" in question, false);
      assert.doesNotMatch(question.prompt, /không đủ dữ kiện|không xác định/iu);
    }
  }
});

test("Batch B preserves unit semantics for angle and area formulas", () => {
  const angle = generatePreviewUnit("grade-6-angle-reasoning", "semantic-angle");
  assert.ok(angle.solutions.some((item) => item.steps.join(" ").includes("180°")));
  const area = generatePreviewUnit("grade-5-area-measurement", "semantic-area");
  assert.ok(area.solutions.some((item) => item.feedback.includes("chia 2")));
  assert.ok(area.solutions.some((item) => item.feedback.includes("cm²")));
});
