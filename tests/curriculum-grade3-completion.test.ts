import assert from "node:assert/strict";
import test from "node:test";

import {
  checkPreviewAnswer,
  generatePreviewUnit,
} from "../lib/curriculum/engine.ts";
import {
  grade3CompletionTargetOutcomeIds,
} from "../lib/curriculum/grade3-completion.ts";
import { curriculumUnits } from "../lib/curriculum/registry.ts";
import {
  validateCurriculumRegistry,
  validatePreviewUnit,
} from "../lib/curriculum/validation.ts";

const units = curriculumUnits.filter(
  (unit) => unit.kind === "GRADE3_OUTCOME_COMPLETION",
);

type Draft = ReturnType<typeof generatePreviewUnit>;
type Audit = Draft["audits"][number];

function parameter(audit: Audit, name: string) {
  const value = audit.parameters.find((item) => item.name === name)?.value;
  assert.notEqual(value, undefined, `${audit.questionCode}/${name}`);
  return value as string | number;
}

function number(audit: Audit, name: string) {
  return Number(parameter(audit, name));
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

function expectedAnswer(outcomeId: string, audit: Audit) {
  switch (outcomeId) {
    case "MOET2018-G3-NUM-P029-005":
      return new Map([
        [4, "IV"],
        [9, "IX"],
        [14, "XIV"],
        [19, "XIX"],
      ]).get(number(audit, "value"));
    case "MOET2018-G3-NUM-P029-006":
      assert.equal(number(audit, "value") % 10_000, 0);
      return "có";
    case "MOET2018-G3-NUM-P029-007":
      return String(
        number(audit, "left") +
          number(audit, "middle") +
          number(audit, "right"),
      );
    case "MOET2018-G3-NUM-P029-008":
      return String(number(audit, "left") + number(audit, "right"));
    case "MOET2018-G3-NUM-P029-009":
      return audit.parameters
        .map((item) => Number(item.value))
        .sort((left, right) => left - right)
        .map((value) => value.toLocaleString("vi-VN"))
        .join(", ");
    case "MOET2018-G3-NUM-P029-011":
      return String(
        Math.max(...audit.parameters.map((item) => Number(item.value))),
      );
    case "MOET2018-G3-NUM-P030-012":
      return audit.parameters.some((item) => item.name === "dividend")
        ? String(number(audit, "dividend") / number(audit, "divisor"))
        : String(number(audit, "left") + number(audit, "right"));
    case "MOET2018-G3-NUM-P030-014":
      return "12 + 3 × 2";
    case "MOET2018-G3-NUM-P030-015":
      return String(number(audit, "groups") * number(audit, "itemsPerGroup"));
    case "MOET2018-G3-NUM-P030-016": {
      const divisor = number(audit, "divisor");
      const quotient = number(audit, "quotient");
      const remainder = number(audit, "remainder");
      assert.ok(divisor > 0);
      assert.ok(remainder >= 0 && remainder < divisor);
      assert.equal(
        number(audit, "dividend"),
        divisor * quotient + remainder,
      );
      return remainder === 0 ? String(quotient) : `${quotient} dư ${remainder}`;
    }
    case "MOET2018-G3-NUM-P030-019":
      return String(
        number(audit, "left") *
          (number(audit, "inside") - number(audit, "subtract")),
      );
    case "MOET2018-G3-NUM-P030-020":
      return String(number(audit, "add") + number(audit, "factor") * 5);
    case "MOET2018-G3-NUM-P030-022":
      return String(number(audit, "total") - number(audit, "known"));
    case "MOET2018-G3-GEO-P031-001":
      return "hình chữ nhật";
    case "MOET2018-G3-GEO-P031-002":
      assert.equal(number(audit, "end") % 2, 0);
      return "trung điểm";
    case "MOET2018-G3-GEO-P031-003":
      assert.equal(number(audit, "angle"), 90);
      return "góc vuông";
    case "MOET2018-G3-GEO-P031-007":
      return "compa";
    case "MOET2018-G3-GEO-P031-008":
      return "êke";
    case "MOET2018-G3-GEO-P031-009":
      return "4";
    case "MOET2018-G3-GEO-P032-011":
      return `${number(audit, "hour")} giờ ${number(audit, "minute")} phút`;
    case "MOET2018-G3-GEO-P032-012":
      return "Hình A";
    case "MOET2018-G3-GEO-P032-013":
      return `${number(audit, "width") * number(audit, "height")} cm²`;
    case "MOET2018-G3-GEO-P032-014":
    case "MOET2018-G3-GEO-P032-016":
      return String(number(audit, "end") * 1000);
    case "MOET2018-G3-GEO-P032-017":
      return `${number(audit, "end")} °C`;
    case "MOET2018-G3-GEO-P032-018":
      return `${number(audit, "value").toLocaleString("vi-VN")} đồng`;
    case "MOET2018-G3-GEO-P032-019": {
      const months = [
        "Tháng Một",
        "Tháng Hai",
        "Tháng Ba",
        "Tháng Tư",
        "Tháng Năm",
        "Tháng Sáu",
        "Tháng Bảy",
        "Tháng Tám",
        "Tháng Chín",
        "Tháng Mười",
        "Tháng Mười một",
        "Tháng Mười hai",
      ];
      return months[number(audit, "month")];
    }
    case "MOET2018-G3-GEO-P032-020":
      return "nhiệt kế";
    case "MOET2018-G3-GEO-P033-023":
      return String(
        number(audit, "litres") * 1000 + number(audit, "millilitres"),
      );
    case "MOET2018-G3-STA-P033-004":
      return String(number(audit, "countA") + number(audit, "countB"));
    case "MOET2018-G3-GEO-P033-024":
      return "2 kg";
    case "MOET2018-G3-GEO-P033-025":
      return String(number(audit, "width") * number(audit, "height"));
    case "MOET2018-G3-EXP-P034-001":
      return `${number(audit, "width") * number(audit, "height")} dm²`;
    case "MOET2018-G3-EXP-P034-002":
      return String(number(audit, "countA") + number(audit, "countB"));
    default:
      assert.fail(`Missing Grade 3 recomputation for ${outcomeId}.`);
  }
}

test("Grade 3 completion covers all 34 exact remaining outcomes", () => {
  assert.equal(units.length, 10);
  assert.equal(grade3CompletionTargetOutcomeIds.length, 34);
  assert.equal(new Set(grade3CompletionTargetOutcomeIds).size, 34);
  assert.deepEqual(validateCurriculumRegistry(), { valid: true, errors: [] });
  assert.deepEqual(
    units.flatMap((unit) => unit.officialOutcomeIds).sort(),
    [...grade3CompletionTargetOutcomeIds].sort(),
  );
  for (const unit of units) {
    assert.equal(unit.grade, 3);
    assert.equal(unit.theory.length, 4);
    for (const outcomeId of unit.officialOutcomeIds) {
      assert.ok(
        unit.theory.some((section) =>
          section.officialOutcomeIds?.includes(outcomeId),
        ),
        `${unit.slug}/${outcomeId}/theory`,
      );
      assert.ok(
        unit.examples.some((example) =>
          example.officialOutcomeIds?.includes(outcomeId),
        ),
        `${unit.slug}/${outcomeId}/example`,
      );
    }
  }
});

test("Grade 3 completion is deterministic, diverse and solution-separated", () => {
  for (const unit of units) {
    const draft = generatePreviewUnit(unit.slug);
    assert.deepEqual(validatePreviewUnit(draft), { valid: true, errors: [] });
    assert.deepEqual(draft, generatePreviewUnit(unit.slug));
    assert.notDeepEqual(
      draft.questions,
      generatePreviewUnit(unit.slug, "grade3-completion-variant").questions,
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
            !Object.hasOwn(question, "solutionSteps"),
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

test("Grade 3 completion answers satisfy independent domain recomputation", () => {
  for (const unit of units) {
    const draft = generatePreviewUnit(unit.slug, "grade3-semantic-boundaries");
    for (const audit of draft.audits) {
      const outcomeId = audit.primaryOfficialOutcomeId;
      assert.ok(outcomeId);
      assert.equal(
        answerLabel(draft, audit),
        expectedAnswer(outcomeId, audit),
        audit.questionCode,
      );
      const question = draft.questions.find(
        (candidate) => candidate.code === audit.questionCode,
      );
      assert.ok(question);
      assert.ok(
        question.options === null ||
          (question.options.length === 4 &&
            new Set(question.options.map((option) => option.label)).size === 4),
        `${question.code}/unambiguous-options`,
      );
      assert.equal(
        question.visual.type,
        audit.visualRequirement ?? unit.requiredVisual,
        `${question.code}/prompt-visual`,
      );
    }
  }
});
