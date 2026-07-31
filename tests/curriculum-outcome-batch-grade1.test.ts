import assert from "node:assert/strict";
import test from "node:test";

import {
  checkPreviewAnswer,
  generatePreviewUnit,
} from "../lib/curriculum/engine.ts";
import { curriculumUnits } from "../lib/curriculum/registry.ts";
import { validatePreviewUnit } from "../lib/curriculum/validation.ts";

const slug = "grade-1-number-operations-to-100-preview";

test("Grade 1 outcome batch is a source-mapped teachable preview unit", () => {
  const unit = curriculumUnits.find((candidate) => candidate.slug === slug);
  assert.ok(unit);
  assert.equal(unit.grade, 1);
  assert.equal(unit.domain, "NUMBERS_AND_OPERATIONS");
  assert.equal(unit.kind, "GRADE1_NUMBER_OPERATIONS_TO_100");
  assert.equal(unit.theory.length, 4);
  assert.ok(unit.theory.every((section) => section.explanation.length >= 2));
  assert.ok(unit.examples.length >= 2);
  assert.equal(unit.generationStatus, "DRAFT_GENERATED");
  assert.equal(unit.sourceValidationStatus, "OFFICIAL_SOURCE_MAPPED");
});

test("Grade 1 outcome batch is deterministic, separated and validator-passed", () => {
  const first = generatePreviewUnit(slug);
  const deterministic = generatePreviewUnit(slug, "grade1-outcomes-a");
  const repeated = generatePreviewUnit(slug, "grade1-outcomes-a");
  const variant = generatePreviewUnit(slug, "grade1-outcomes-b");
  assert.deepEqual(deterministic, repeated);
  assert.notDeepEqual(deterministic.questions, variant.questions);
  assert.deepEqual(validatePreviewUnit(first), { valid: true, errors: [] });
  assert.equal(first.questions.length, 12);
  assert.equal(first.solutions.length, 12);
  assert.equal(first.audits.length, 12);
  assert.equal(new Set(first.questions.map((question) => question.skillFamily)).size, 3);
  assert.ok(
    first.questions.every(
      (question) =>
        question.visual.type === "PLACE_VALUE_CHART" &&
        !Object.hasOwn(question, "correctAnswer") &&
        !Object.hasOwn(question, "solutionSteps") &&
        (question.options?.every(
          (option) => !/không đủ dữ kiện|không xác định/iu.test(option.label),
        ) ??
          true),
    ),
  );
  for (const solution of first.solutions) {
    assert.equal(
      checkPreviewAnswer(slug, solution.questionCode, solution.correctAnswer)
        ?.correct,
      true,
    );
  }
});

test("Grade 1 outcome batch enforces place value, no regrouping and round tens", () => {
  const draft = generatePreviewUnit(slug, "grade1-outcomes-semantics");
  const [placeValue, arithmetic, mental] = [
    draft.questions.slice(0, 4),
    draft.questions.slice(4, 8),
    draft.questions.slice(8, 12),
  ];
  assert.ok(placeValue.every((question) => /chục.*đơn vị/iu.test(question.prompt)));
  assert.ok(
    arithmetic.every((question) => /không cần (nhớ|mượn)/iu.test(question.prompt)),
  );
  assert.ok(mental.every((question) => /tính nhẩm/iu.test(question.prompt)));

  for (const audit of draft.audits.slice(4, 8)) {
    const left = Number(audit.parameters.find(({ name }) => name === "left")?.value);
    const right = Number(audit.parameters.find(({ name }) => name === "right")?.value);
    const solution = draft.solutions.find(
      (candidate) => candidate.questionCode === audit.questionCode,
    );
    assert.ok(solution);
    const answer = Number(solution.correctAnswer);
    if (left >= right && left - right === answer) {
      assert.ok(left % 10 >= right % 10, audit.questionCode);
    } else {
      assert.ok((left % 10) + (right % 10) < 10, audit.questionCode);
    }
  }

  for (const audit of draft.audits.slice(8)) {
    const left = Number(audit.parameters.find(({ name }) => name === "left")?.value);
    const right = Number(audit.parameters.find(({ name }) => name === "right")?.value);
    assert.equal(left % 10, 0);
    assert.equal(right % 10, 0);
  }
});
