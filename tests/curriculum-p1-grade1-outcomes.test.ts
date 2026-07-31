import assert from "node:assert/strict";
import test from "node:test";

import { generatePreviewUnit } from "../lib/curriculum/engine.ts";
import {
  grade1P1TargetOutcomeIds,
} from "../lib/curriculum/p0-outcome-expansion.ts";
import { curriculumUnits } from "../lib/curriculum/registry.ts";
import { validatePreviewUnit } from "../lib/curriculum/validation.ts";

const units = curriculumUnits.filter(
  (unit) => unit.kind === "P1_OUTCOME_COMPLETION" && unit.grade === 1,
);

test("Grade 1 P1 target list has seven source-locked official outcomes", () => {
  assert.equal(grade1P1TargetOutcomeIds.length, 7);
  assert.equal(new Set(grade1P1TargetOutcomeIds).size, 7);
  assert.equal(units.length, 2);
  assert.deepEqual(
    units.flatMap((unit) => unit.officialOutcomeIds).sort(),
    [...grade1P1TargetOutcomeIds].sort(),
  );
});

test("each Grade 1 P1 outcome has direct theory, example and diverse practice", () => {
  for (const unit of units) {
    const draft = generatePreviewUnit(unit.slug);
    assert.deepEqual(validatePreviewUnit(draft), { valid: true, errors: [] });
    assert.deepEqual(draft, generatePreviewUnit(unit.slug));
    assert.notDeepEqual(
      draft.questions,
      generatePreviewUnit(unit.slug, "grade1-p1-variant").questions,
    );
    for (const outcomeId of unit.officialOutcomeIds) {
      assert.ok(
        unit.theory.some((section) =>
          section.officialOutcomeIds?.includes(outcomeId),
        ),
      );
      assert.ok(
        unit.examples.some((example) =>
          example.officialOutcomeIds?.includes(outcomeId),
        ),
      );
      const audits = draft.audits.filter(
        (audit) => audit.primaryOfficialOutcomeId === outcomeId,
      );
      const codes = new Set(audits.map((audit) => audit.questionCode));
      const questions = draft.questions.filter((question) => codes.has(question.code));
      const solutions = draft.solutions.filter((solution) =>
        codes.has(solution.questionCode),
      );
      assert.ok(audits.length >= 3);
      assert.ok(new Set(questions.map((question) => question.answerType)).size >= 2);
      assert.ok(new Set(audits.map((audit) => audit.evidenceForm)).size >= 2);
      assert.equal(solutions.length, audits.length);
      assert.ok(
        solutions.every(
          (solution) =>
            solution.steps.length >= 2 && solution.feedback.length >= 24,
        ),
      );
    }
  }
});

test("Grade 1 P1 clock, calendar, position and centimetre semantics are exact", () => {
  for (const unit of units) {
    const draft = generatePreviewUnit(unit.slug, "grade1-p1-semantics");
    for (const audit of draft.audits) {
      const outcomeId = audit.primaryOfficialOutcomeId;
      const question = draft.questions.find(
        (candidate) => candidate.code === audit.questionCode,
      );
      const solution = draft.solutions.find(
        (candidate) => candidate.questionCode === audit.questionCode,
      );
      assert.ok(outcomeId);
      assert.ok(question);
      assert.ok(solution);
      assert.ok(!Object.hasOwn(question, "correctAnswer"));
      if (outcomeId === "MOET2018-G1-GEO-P023-009") {
        assert.match(question.prompt, /kim phút chỉ số 12/iu);
      }
      if (outcomeId === "MOET2018-G1-GEO-P023-014") {
        const hour = audit.parameters.find((item) => item.name === "hour")?.value;
        const correctLabel = question.options
          ? question.options.find((option) => option.key === solution.correctAnswer)?.label
          : solution.correctAnswer;
        assert.equal(correctLabel, `${hour} giờ đúng`);
      }
      if (outcomeId === "MOET2018-G1-GEO-P023-010") {
        assert.match(question.prompt, /ngày liền sau/iu);
      }
      if (outcomeId === "MOET2018-G1-GEO-P023-015") {
        assert.match(question.prompt, /thứ.*tháng/iu);
      }
      if (outcomeId === "MOET2018-G1-EXP-P024-001") {
        assert.match(question.prompt, /lấy bàn làm mốc/iu);
      }
      if (outcomeId === "MOET2018-G1-EXP-P024-002") {
        const start = Number(
          audit.parameters.find((item) => item.name === "start")?.value,
        );
        const add = Number(
          audit.parameters.find((item) => item.name === "add")?.value,
        );
        const correctLabel = question.options
          ? question.options.find((option) => option.key === solution.correctAnswer)?.label
          : solution.correctAnswer;
        assert.equal(correctLabel, String(start + add));
      }
      if (outcomeId === "MOET2018-G1-EXP-P024-003") {
        assert.equal(
          audit.parameters.find((item) => item.name === "start")?.value,
          0,
        );
        assert.match(question.prompt, /cm/iu);
      }
    }
  }
});
