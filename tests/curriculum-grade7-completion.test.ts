import assert from "node:assert/strict";
import test from "node:test";

import {
  checkPreviewAnswer,
  generatePreviewUnit,
} from "../lib/curriculum/engine.ts";
import { grade7CompletionTargetOutcomeIds } from "../lib/curriculum/grade7-completion.ts";
import { curriculumUnits } from "../lib/curriculum/registry.ts";
import {
  validateCurriculumRegistry,
  validatePreviewUnit,
} from "../lib/curriculum/validation.ts";

const unit = curriculumUnits.find(
  (candidate) => candidate.kind === "GRADE7_OUTCOME_COMPLETION",
);
type Draft = ReturnType<typeof generatePreviewUnit>;
type Audit = Draft["audits"][number];

function num(audit: Audit, name: string) {
  const value = audit.parameters.find((item) => item.name === name)?.value;
  assert.notEqual(value, undefined, `${audit.questionCode}/${name}`);
  return Number(value);
}

function answerLabel(draft: Draft, audit: Audit) {
  const question = draft.questions.find(
    (candidate) => candidate.code === audit.questionCode,
  );
  const solution = draft.solutions.find(
    (candidate) => candidate.questionCode === audit.questionCode,
  );
  assert.ok(question);
  assert.ok(solution);
  if (!question.options) return solution.correctAnswer;
  const option = question.options.find(
    (candidate) => candidate.key === solution.correctAnswer,
  );
  assert.ok(option);
  return option.label;
}

test("Grade 7 rational-number batch maps four exact page-55 outcomes", () => {
  assert.ok(unit);
  assert.equal(unit.grade, 7);
  assert.equal(grade7CompletionTargetOutcomeIds.length, 4);
  assert.deepEqual(
    [...unit.officialOutcomeIds].sort(),
    [...grade7CompletionTargetOutcomeIds].sort(),
  );
  assert.equal(unit.theory.length, 4);
  assert.equal(unit.examples.length, 4);
  assert.deepEqual(validateCurriculumRegistry(), { valid: true, errors: [] });
  for (const outcomeId of grade7CompletionTargetOutcomeIds) {
    assert.ok(
      unit.theory.some((section) =>
        section.officialOutcomeIds?.includes(outcomeId),
      ),
      `${outcomeId}/theory`,
    );
    assert.ok(
      unit.examples.some((example) =>
        example.officialOutcomeIds?.includes(outcomeId),
      ),
      `${outcomeId}/example`,
    );
  }
});

test("Grade 7 rational evidence is deterministic, diverse and leak-free", () => {
  assert.ok(unit);
  const draft = generatePreviewUnit(unit.slug);
  assert.deepEqual(validatePreviewUnit(draft), { valid: true, errors: [] });
  assert.deepEqual(draft, generatePreviewUnit(unit.slug));
  assert.notDeepEqual(
    draft.questions,
    generatePreviewUnit(unit.slug, "grade7-rational-variant").questions,
  );
  for (const outcomeId of grade7CompletionTargetOutcomeIds) {
    const audits = draft.audits.filter(
      (audit) => audit.primaryOfficialOutcomeId === outcomeId,
    );
    const codes = new Set(audits.map((audit) => audit.questionCode));
    const questions = draft.questions.filter((question) =>
      codes.has(question.code),
    );
    const solutions = draft.solutions.filter((solution) =>
      codes.has(solution.questionCode),
    );
    assert.equal(audits.length, 3);
    assert.ok(new Set(audits.map((audit) => audit.evidenceForm)).size >= 2);
    assert.ok(new Set(questions.map((question) => question.answerType)).size >= 2);
    assert.equal(
      new Set(questions.map((question) => question.prompt)).size,
      questions.length,
    );
    assert.ok(
      questions.every(
        (question) =>
          !Object.hasOwn(question, "correctAnswer") &&
          !Object.hasOwn(question, "solutionSteps"),
      ),
    );
    assert.ok(
      solutions.every(
        (solution) =>
          solution.steps.length >= 3 &&
          checkPreviewAnswer(
            unit.slug,
            solution.questionCode,
            solution.correctAnswer,
          )?.correct,
      ),
    );
  }
});

test("Grade 7 rational answers independently satisfy sign, denominator and set semantics", () => {
  assert.ok(unit);
  const draft = generatePreviewUnit(unit.slug, "grade7-rational-boundaries");
  for (const audit of draft.audits) {
    const numerator = audit.parameters.some(
      (parameter) => parameter.name === "numerator",
    )
      ? num(audit, "numerator")
      : null;
    const denominator = num(audit, "denominator");
    assert.notEqual(denominator, 0);
    let expected: string;
    switch (audit.primaryOfficialOutcomeId) {
      case "MOET2018-G7-NAA-P055-001":
        assert.ok(numerator !== null && numerator < 0);
        expected = `bên trái 0, cách 0 ${Math.abs(
          numerator,
        )}/${denominator} đơn vị`;
        break;
      case "MOET2018-G7-NAA-P055-002":
        assert.ok(numerator !== null);
        expected = `${-numerator}/${denominator}`;
        break;
      case "MOET2018-G7-NAA-P055-003":
      case "MOET2018-G7-NAA-P055-004":
        expected = "có";
        break;
      default:
        assert.fail(`Unexpected Grade 7 outcome ${audit.primaryOfficialOutcomeId}`);
    }
    assert.equal(answerLabel(draft, audit), expected, audit.questionCode);
    const question = draft.questions.find(
      (candidate) => candidate.code === audit.questionCode,
    );
    assert.ok(question);
    assert.equal(question.visual.type, audit.visualRequirement ?? "NUMBER_LINE");
  }
});
