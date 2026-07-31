import { strict as assert } from "node:assert";
import test from "node:test";

import {
  checkPreviewAnswer,
  generatePreviewUnit,
} from "../lib/curriculum/engine.ts";
import { curriculumUnits, domainCoverage } from "../lib/curriculum/registry.ts";
import { validatePreviewUnit } from "../lib/curriculum/validation.ts";

const slugs = [
  "grade-1-shapes",
  "grade-1-length-centimetres",
  "grade-2-shape-properties",
  "grade-2-length-calculations",
  "grade-3-polygon-properties",
  "grade-3-length-reasoning",
] as const;

test("Batch A closes geometry and measurement for Grades 1–3", () => {
  const units = curriculumUnits.filter((unit) =>
    slugs.includes(unit.slug as (typeof slugs)[number]),
  );
  assert.equal(units.length, 6);
  for (const grade of [1, 2, 3]) {
    for (const domain of ["GEOMETRY", "MEASUREMENT"] as const) {
      assert.ok(
        units.some((unit) => unit.grade === grade && unit.domain === domain),
        `Grade ${grade} ${domain}`,
      );
      assert.equal(
        domainCoverage.find(
          (entry) => entry.grade === grade && entry.domain === domain,
        )?.status,
        "TEACHABLE_IMPLEMENTED",
      );
    }
  }
});

test("every Batch A unit is deterministic, teachable and solution-consistent", () => {
  for (const slug of slugs) {
    const unit = curriculumUnits.find((candidate) => candidate.slug === slug);
    assert.ok(unit);
    assert.equal(unit.theory.length, 4);
    assert.ok(unit.theory.every((item) => item.explanation.length >= 2));
    assert.equal(unit.examples.length, 2);
    assert.ok(unit.examples.every((item) => item.steps.length >= 3));

    const first = generatePreviewUnit(slug);
    const deterministic = generatePreviewUnit(slug, "batch-a-deterministic");
    const repeated = generatePreviewUnit(slug, "batch-a-deterministic");
    assert.deepEqual(deterministic, repeated);
    assert.deepEqual(validatePreviewUnit(first), { valid: true, errors: [] });
    assert.equal(first.questions.length, 12);
    assert.equal(first.solutions.length, 12);
    assert.equal(new Set(first.questions.map((item) => item.skillFamily)).size, 3);
    for (const solution of first.solutions) {
      assert.equal(
        checkPreviewAnswer(slug, solution.questionCode, solution.correctAnswer)
          ?.correct,
        true,
      );
    }
  }
});

test("Batch A visual payloads match their domain without pre-submit solutions", () => {
  for (const slug of slugs) {
    const draft = generatePreviewUnit(slug, "batch-a-visual");
    const expectedType = draft.unit.domain === "GEOMETRY"
      ? "SHAPE_SCENE"
      : "MEASUREMENT_SCALE";
    for (const question of draft.questions) {
      assert.equal(question.visual.type, expectedType);
      assert.equal("correctAnswer" in question, false);
      assert.equal("solutionSteps" in question, false);
      assert.equal("correctAnswer" in question.visual, false);
    }
  }
});

test("Batch A generated questions contain complete, unambiguous data", () => {
  for (const slug of slugs) {
    const draft = generatePreviewUnit(slug, "batch-a-language");
    for (const question of draft.questions) {
      assert.ok(question.prompt.length >= 24);
      assert.doesNotMatch(question.prompt, /thiếu dữ kiện|không xác định/iu);
      if (question.options) {
        assert.equal(new Set(question.options.map((item) => item.label)).size, 4);
      }
    }
  }
});
