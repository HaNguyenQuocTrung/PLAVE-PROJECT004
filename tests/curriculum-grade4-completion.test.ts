import assert from "node:assert/strict";
import test from "node:test";

import {
  checkPreviewAnswer,
  generatePreviewUnit,
} from "../lib/curriculum/engine.ts";
import {
  grade4CompletionTargetOutcomeIds,
} from "../lib/curriculum/grade4-completion.ts";
import { curriculumUnits } from "../lib/curriculum/registry.ts";
import {
  validateCurriculumRegistry,
  validatePreviewUnit,
} from "../lib/curriculum/validation.ts";

const units = curriculumUnits.filter(
  (unit) => unit.kind === "GRADE4_OUTCOME_COMPLETION",
);
type Draft = ReturnType<typeof generatePreviewUnit>;
type Audit = Draft["audits"][number];

function raw(audit: Audit, name: string) {
  const value = audit.parameters.find((item) => item.name === name)?.value;
  assert.notEqual(value, undefined, `${audit.questionCode}/${name}`);
  return value as string | number;
}
const number = (audit: Audit, name: string) => Number(raw(audit, name));

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

function expected(outcomeId: string, audit: Audit): string {
  switch (outcomeId) {
    case "MOET2018-G4-NUM-P034-001":
      return String(
        number(audit, "millions") * 1_000_000 +
          number(audit, "thousands") * 1_000 +
          number(audit, "units"),
      );
    case "MOET2018-G4-NUM-P034-002":
      return String(number(audit, "value") + 1);
    case "MOET2018-G4-NUM-P034-003":
      assert.ok(number(audit, "left") < number(audit, "right"));
      return "<";
    case "MOET2018-G4-NUM-P034-004":
      return String(number(audit, "digit") * number(audit, "place"));
    case "MOET2018-G4-NUM-P034-005":
      return number(audit, "value") % 2 === 0 ? "số chẵn" : "số lẻ";
    case "MOET2018-G4-NUM-P035-006":
      return String(number(audit, "a") + 2 * number(audit, "b"));
    case "MOET2018-G4-NUM-P035-007":
      return String(number(audit, "rounded"));
    case "MOET2018-G4-NUM-P035-010":
      return String(number(audit, "value") * number(audit, "factor"));
    case "MOET2018-G4-NUM-P035-012":
    case "MOET2018-G4-STA-P039-007":
      return String(
        (number(audit, "value0") +
          number(audit, "value1") +
          number(audit, "value2")) /
          3,
      );
    case "MOET2018-G4-NUM-P035-013":
    case "MOET2018-G4-NUM-P035-014":
      return String(
        number(audit, "left") +
          number(audit, "middle") +
          number(audit, "right"),
      );
    case "MOET2018-G4-NUM-P035-015":
      return String(
        number(audit, "left") *
          number(audit, "middle") *
          number(audit, "right"),
      );
    case "MOET2018-G4-NUM-P036-016":
      return `${number(audit, "numerator")}/${number(audit, "denominator")}`;
    case "MOET2018-G4-NUM-P036-021":
      return `${number(audit, "numerator") * number(audit, "scale")}/${
        number(audit, "denominator") * number(audit, "scale")
      }`;
    case "MOET2018-G4-NUM-P036-022":
      return `${number(audit, "numerator") / number(audit, "divisor")}/${
        number(audit, "denominator") / number(audit, "divisor")
      }`;
    case "MOET2018-G4-NUM-P036-023":
      return String(
        number(audit, "a") * (number(audit, "b") + number(audit, "c")),
      );
    case "MOET2018-G4-NUM-P036-024": {
      const numerators = [0, 1, 2, 3].map((index) =>
        number(audit, `numerator${index}`),
      );
      return `${Math.max(...numerators)}/${number(audit, "denominator")}`;
    }
    case "MOET2018-G4-NUM-P037-025":
      return String(
        (number(audit, "whole") / number(audit, "denominator")) *
          number(audit, "numerator"),
      );
    case "MOET2018-G4-NUM-P037-026": {
      const a = number(audit, "a");
      const b = number(audit, "b");
      const c = number(audit, "c");
      const d = number(audit, "d");
      assert.ok(b !== 0 && c !== 0 && d !== 0);
      const division = raw(audit, "operation") === "DIVIDE";
      const numerator = division ? a * d : a * c;
      const denominator = division ? b * c : b * d;
      const divisor = number(audit, "divisor");
      return `${numerator / divisor}/${denominator / divisor}`;
    }
    case "MOET2018-G4-GEO-P037-001":
      return "êke";
    case "MOET2018-G4-GEO-P037-004":
      return "hình thoi";
    case "MOET2018-G4-GEO-P037-005":
      return "tại điểm đầu";
    case "MOET2018-G4-GEO-P037-006":
      return "vuông góc";
    case "MOET2018-G4-GEO-P038-009":
      return String(number(audit, "minutes") * 60);
    case "MOET2018-G4-GEO-P038-010":
      return "đúng";
    case "MOET2018-G4-STA-P038-001":
      return String(audit.parameters.length);
    case "MOET2018-G4-GEO-P038-011":
      return "bình đong";
    case "MOET2018-G4-GEO-P038-014":
      return "3 tạ";
    case "MOET2018-G4-STA-P039-003":
      assert.ok(number(audit, "scale") > 0);
      return String(number(audit, "countA") - number(audit, "countB"));
    case "MOET2018-G4-STA-P039-005":
      return String(number(audit, "step"));
    case "MOET2018-G4-EXP-P039-001":
      return `${number(audit, "width") * number(audit, "height")} dm²`;
    case "MOET2018-G4-EXP-P040-002":
      return String(number(audit, "paid") - number(audit, "cost"));
    case "MOET2018-G4-EXP-P040-003":
      assert.equal(
        number(audit, "countA") + number(audit, "countB"),
        number(audit, "total"),
      );
      return String(number(audit, "countA") - number(audit, "countB"));
    default:
      assert.fail(`Missing Grade 4 recomputation for ${outcomeId}.`);
  }
}

test("Grade 4 completion maps the exact 34-outcome backlog", () => {
  assert.equal(units.length, 9);
  assert.equal(grade4CompletionTargetOutcomeIds.length, 34);
  assert.equal(new Set(grade4CompletionTargetOutcomeIds).size, 34);
  assert.deepEqual(validateCurriculumRegistry(), { valid: true, errors: [] });
  assert.deepEqual(
    units.flatMap((unit) => unit.officialOutcomeIds).sort(),
    [...grade4CompletionTargetOutcomeIds].sort(),
  );
  for (const unit of units) {
    assert.equal(unit.grade, 4);
    assert.equal(unit.theory.length, 4);
    for (const outcomeId of unit.officialOutcomeIds) {
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
        `${outcomeId}/worked-example`,
      );
    }
  }
});

test("every Grade 4 outcome has diverse deterministic evidence and no leak", () => {
  for (const unit of units) {
    const draft = generatePreviewUnit(unit.slug);
    assert.deepEqual(validatePreviewUnit(draft), { valid: true, errors: [] });
    assert.deepEqual(draft, generatePreviewUnit(unit.slug));
    assert.notDeepEqual(
      draft.questions,
      generatePreviewUnit(unit.slug, "grade4-completion-variant").questions,
    );
    for (const outcomeId of unit.officialOutcomeIds) {
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
      assert.ok(audits.length >= 3, outcomeId);
      assert.ok(
        new Set(questions.map((question) => question.answerType)).size >= 2,
        `${outcomeId}/answer-types`,
      );
      assert.ok(
        new Set(audits.map((audit) => audit.evidenceForm)).size >= 2,
        `${outcomeId}/evidence-forms`,
      );
      assert.equal(solutions.length, audits.length);
      assert.ok(
        questions.every(
          (question) =>
            !Object.hasOwn(question, "correctAnswer") &&
            !Object.hasOwn(question, "solutionSteps") &&
            (question.options === null ||
              (question.options.length === 4 &&
                new Set(question.options.map((option) => option.label)).size ===
                  4)),
        ),
      );
      assert.ok(
        solutions.every(
          (solution) =>
            solution.steps.length >= 3 &&
            solution.feedback.length >= 28 &&
            checkPreviewAnswer(
              unit.slug,
              solution.questionCode,
              solution.correctAnswer,
            )?.correct,
        ),
      );
    }
  }
});

test("Grade 4 arithmetic, fraction, geometry, unit and data semantics recompute", () => {
  for (const unit of units) {
    const draft = generatePreviewUnit(unit.slug, "grade4-semantic-boundaries");
    for (const audit of draft.audits) {
      const outcomeId = audit.primaryOfficialOutcomeId;
      assert.ok(outcomeId);
      assert.equal(
        answerLabel(draft, audit),
        expected(outcomeId, audit),
        audit.questionCode,
      );
      const question = draft.questions.find(
        (candidate) => candidate.code === audit.questionCode,
      );
      assert.ok(question);
      assert.equal(
        question.visual.type,
        audit.visualRequirement ?? unit.requiredVisual,
      );
    }
  }
});

test("Grade 4 fraction multiplication and division both have direct evidence", () => {
  const unit = units.find(
    (candidate) => candidate.slug === "grade-4-fraction-reasoning-p1",
  );
  assert.ok(unit);
  const draft = generatePreviewUnit(unit.slug, "grade4-fraction-operations");
  const audits = draft.audits.filter(
    (audit) =>
      audit.primaryOfficialOutcomeId === "MOET2018-G4-NUM-P037-026",
  );
  assert.deepEqual(
    new Set(audits.map((audit) => raw(audit, "operation"))),
    new Set(["MULTIPLY", "DIVIDE"]),
  );
  assert.ok(
    unit.examples.filter((example) =>
      example.officialOutcomeIds?.includes("MOET2018-G4-NUM-P037-026"),
    ).length >= 2,
  );
});
