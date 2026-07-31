import assert from "node:assert/strict";
import test from "node:test";

import { checkPreviewAnswer, generatePreviewUnit } from "../lib/curriculum/engine.ts";
import { grade5CompletionTargetOutcomeIds } from "../lib/curriculum/grade5-completion.ts";
import { curriculumUnits } from "../lib/curriculum/registry.ts";
import { validateCurriculumRegistry, validatePreviewUnit } from "../lib/curriculum/validation.ts";

const units = curriculumUnits.filter((unit) => unit.kind === "GRADE5_OUTCOME_COMPLETION");
type Draft = ReturnType<typeof generatePreviewUnit>;
type Audit = Draft["audits"][number];
const raw = (audit: Audit, name: string) => {
  const value = audit.parameters.find((item) => item.name === name)?.value;
  assert.notEqual(value, undefined, `${audit.questionCode}/${name}`);
  return value as string | number;
};
const num = (audit: Audit, name: string) => Number(raw(audit, name));
const label = (draft: Draft, audit: Audit) => {
  const question = draft.questions.find((item) => item.code === audit.questionCode);
  const solution = draft.solutions.find((item) => item.questionCode === audit.questionCode);
  assert.ok(question);
  assert.ok(solution);
  if (!question.options) return solution.correctAnswer;
  const option = question.options.find((item) => item.key === solution.correctAnswer);
  assert.ok(option);
  return option.label;
};
const display = (value: number) =>
  (value / 100).toLocaleString("vi-VN", {
    minimumFractionDigits: value % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

function expected(id: string, audit: Audit): string {
  switch (id) {
    case "MOET2018-G5-NUM-P040-001":
      return audit.parameters.map((item) => Number(item.value)).sort((a, b) => a - b).map((value) => value.toLocaleString("vi-VN")).join(", ");
    case "MOET2018-G5-NUM-P040-003":
      return String(num(audit, "dividend") / num(audit, "divisor"));
    case "MOET2018-G5-NUM-P040-004":
      return String(num(audit, "a") * num(audit, "b") * num(audit, "c"));
    case "MOET2018-G5-NUM-P041-006":
      return String(num(audit, "whole") - num(audit, "whole") / num(audit, "denominator") * num(audit, "numerator"));
    case "MOET2018-G5-NUM-P041-007": {
      const numerator = num(audit, "numerator"), denominator = num(audit, "denominator");
      return `${Math.floor(numerator / denominator)} ${numerator % denominator}/${denominator}`;
    }
    case "MOET2018-G5-NUM-P041-008":
      return String(num(audit, "hundredths"));
    case "MOET2018-G5-NUM-P041-013":
      return `${num(audit, "a") * num(audit, "d") + num(audit, "c") * num(audit, "b")}/${num(audit, "b") * num(audit, "d")}`;
    case "MOET2018-G5-NUM-P042-015":
      return String(num(audit, "leftHundredths") + num(audit, "rightHundredths"));
    case "MOET2018-G5-NUM-P042-016":
      return String(num(audit, "rounded"));
    case "MOET2018-G5-NUM-P042-017":
      return String(num(audit, "mapCm") * num(audit, "ratio") / 100);
    case "MOET2018-G5-NUM-P042-018":
      assert.ok(num(audit, "divisorHundredths") !== 0);
      return String(num(audit, "dividendHundredths") / num(audit, "divisorHundredths"));
    case "MOET2018-G5-NUM-P042-020":
      return String(num(audit, "left") * num(audit, "rightHundredths"));
    case "MOET2018-G5-NUM-P042-021":
      return String(num(audit, "valueHundredths") * num(audit, "factor"));
    case "MOET2018-G5-NUM-P042-022":
      return [0, 1, 2, 3].map((index) => num(audit, `value${index}Hundredths`)).sort((a, b) => a - b).map(display).join("; ");
    case "MOET2018-G5-NUM-P042-023":
      return String(10 * num(audit, "cHundredths"));
    case "MOET2018-G5-GEO-P043-001":
      return "êke";
    case "MOET2018-G5-GEO-P043-002":
      return String(num(audit, "layers") * num(audit, "perLayer"));
    case "MOET2018-G5-GEO-P043-003":
      return String(num(audit, "km2") * 100);
    case "MOET2018-G5-GEO-P043-004":
      return "6";
    case "MOET2018-G5-NUM-P043-024":
      return String(num(audit, "whole") * num(audit, "percent") / 100);
    case "MOET2018-G5-GEO-P044-008":
      return String(num(audit, "speed") * num(audit, "time"));
    case "MOET2018-G5-GEO-P044-009":
      return String(num(audit, "cm3"));
    case "MOET2018-G5-GEO-P044-010":
      assert.ok(num(audit, "time") !== 0);
      return String(num(audit, "distance") / num(audit, "time"));
    case "MOET2018-G5-GEO-P044-011":
      return "bình đong";
    case "MOET2018-G5-GEO-P044-012":
      return "ước lượng, chọn cân, đặt túi, đọc kg";
    case "MOET2018-G5-GEO-P044-013":
      return String(num(audit, "dm3Hundredths") * 10);
    case "MOET2018-G5-GEO-P044-014":
      return String(num(audit, "length") * num(audit, "width") * num(audit, "height"));
    case "MOET2018-G5-STA-P045-003":
      return String(num(audit, "total") * num(audit, "percent") / 100);
    case "MOET2018-G5-STA-P045-004":
    case "MOET2018-G5-EXP-P046-002":
      return String(num(audit, "step"));
    case "MOET2018-G5-STA-P045-005":
      return "biểu đồ quạt tròn";
    case "MOET2018-G5-STA-P045-007":
      assert.ok(num(audit, "total") !== 0);
      return "25";
    case "MOET2018-G5-STA-P045-008":
      return "20";
    case "MOET2018-G5-EXP-P046-001":
      return String(num(audit, "cost") * num(audit, "rate") / 100);
    case "MOET2018-G5-EXP-P046-003":
      return String(num(audit, "speedHundredths") * num(audit, "timeHundredths"));
    default:
      assert.fail(`Missing Grade 5 recomputation: ${id}`);
  }
}

test("Grade 5 completion maps all 35 exact source outcomes", () => {
  assert.equal(units.length, 9);
  assert.equal(grade5CompletionTargetOutcomeIds.length, 35);
  assert.equal(new Set(grade5CompletionTargetOutcomeIds).size, 35);
  assert.deepEqual(validateCurriculumRegistry(), { valid: true, errors: [] });
  assert.deepEqual(units.flatMap((unit) => unit.officialOutcomeIds).sort(), [...grade5CompletionTargetOutcomeIds].sort());
  for (const unit of units) {
    assert.equal(unit.grade, 5);
    assert.ok(unit.theory.length >= 4 && unit.theory.length <= 6);
    assert.ok(unit.examples.length >= 2);
    for (const outcomeId of unit.officialOutcomeIds) {
      assert.ok(unit.theory.some((section) => section.officialOutcomeIds?.includes(outcomeId)), `${outcomeId}/theory`);
      assert.ok(unit.examples.some((example) => example.officialOutcomeIds?.includes(outcomeId)), `${outcomeId}/example`);
    }
  }
});

test("Grade 5 evidence is deterministic, diverse, collision-free and separated", () => {
  for (const unit of units) {
    const draft = generatePreviewUnit(unit.slug);
    assert.deepEqual(validatePreviewUnit(draft), { valid: true, errors: [] });
    assert.deepEqual(draft, generatePreviewUnit(unit.slug));
    assert.notDeepEqual(draft.questions, generatePreviewUnit(unit.slug, "grade5-variant").questions);
    for (const outcomeId of unit.officialOutcomeIds) {
      const audits = draft.audits.filter((audit) => audit.primaryOfficialOutcomeId === outcomeId);
      const codes = new Set(audits.map((audit) => audit.questionCode));
      const questions = draft.questions.filter((question) => codes.has(question.code));
      const solutions = draft.solutions.filter((solution) => codes.has(solution.questionCode));
      assert.ok(audits.length >= 3, outcomeId);
      assert.ok(new Set(audits.map((audit) => audit.evidenceForm)).size >= 2);
      assert.ok(new Set(questions.map((question) => question.answerType)).size >= 2);
      assert.equal(new Set(questions.map((question) => question.prompt)).size, questions.length, `${outcomeId}/prompt-collision`);
      assert.equal(solutions.length, audits.length);
      assert.ok(questions.every((question) => !Object.hasOwn(question, "correctAnswer") && !Object.hasOwn(question, "solutionSteps")));
      assert.ok(solutions.every((solution) => solution.steps.length >= 3 && solution.feedback.length >= 28 && checkPreviewAnswer(unit.slug, solution.questionCode, solution.correctAnswer)?.correct));
    }
  }
});

test("Grade 5 answers independently satisfy number, decimal, geometry and data semantics", () => {
  for (const unit of units) {
    const draft = generatePreviewUnit(unit.slug, "grade5-semantic-boundaries");
    for (const audit of draft.audits) {
      assert.ok(audit.primaryOfficialOutcomeId);
      assert.equal(label(draft, audit), expected(audit.primaryOfficialOutcomeId, audit), audit.questionCode);
      const question = draft.questions.find((item) => item.code === audit.questionCode);
      assert.ok(question);
      assert.equal(question.visual.type, audit.visualRequirement ?? unit.requiredVisual);
      assert.ok(question.options === null || new Set(question.options.map((option) => option.label)).size === 4);
    }
  }
});

test("Grade 5 decimal ordering preserves value-place correction", () => {
  const unit = units.find((candidate) => candidate.slug === "grade-5-decimal-relations-map-p1");
  assert.ok(unit);
  const draft = generatePreviewUnit(unit.slug, "grade5-decimal-correction");
  const ordering = draft.audits.filter((audit) => audit.primaryOfficialOutcomeId === "MOET2018-G5-NUM-P042-022");
  assert.ok(ordering.length >= 3);
  for (const audit of ordering) {
    const values = [0, 1, 2, 3].map((index) => num(audit, `value${index}Hundredths`));
    assert.deepEqual([...values].sort((a, b) => a - b).map(display).join("; "), expected("MOET2018-G5-NUM-P042-022", audit));
  }
});
