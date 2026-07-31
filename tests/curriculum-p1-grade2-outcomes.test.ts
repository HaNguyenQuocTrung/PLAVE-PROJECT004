import assert from "node:assert/strict";
import test from "node:test";

import { generatePreviewUnit } from "../lib/curriculum/engine.ts";
import {
  grade2P1TargetOutcomeIds,
} from "../lib/curriculum/p0-outcome-expansion.ts";
import { curriculumUnits } from "../lib/curriculum/registry.ts";
import { validatePreviewUnit } from "../lib/curriculum/validation.ts";

const units = curriculumUnits.filter(
  (unit) => unit.kind === "P1_OUTCOME_COMPLETION" && unit.grade === 2,
);

test("Grade 2 P1 target list has six exact source-locked outcomes", () => {
  assert.equal(grade2P1TargetOutcomeIds.length, 6);
  assert.equal(new Set(grade2P1TargetOutcomeIds).size, 6);
  assert.equal(units.length, 3);
  assert.deepEqual(
    units.flatMap((unit) => unit.officialOutcomeIds).sort(),
    [...grade2P1TargetOutcomeIds].sort(),
  );
});

test("every Grade 2 P1 outcome is taught, exemplified and assessed diversely", () => {
  for (const unit of units) {
    const draft = generatePreviewUnit(unit.slug);
    assert.deepEqual(validatePreviewUnit(draft), { valid: true, errors: [] });
    assert.deepEqual(draft, generatePreviewUnit(unit.slug));
    assert.notDeepEqual(
      draft.questions,
      generatePreviewUnit(unit.slug, "grade2-p1-variant").questions,
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

test("Grade 2 P1 arithmetic, measurement and data invariants recompute", () => {
  for (const unit of units) {
    const draft = generatePreviewUnit(unit.slug, "grade2-p1-semantics");
    for (const audit of draft.audits) {
      const question = draft.questions.find(
        (candidate) => candidate.code === audit.questionCode,
      );
      const solution = draft.solutions.find(
        (candidate) => candidate.questionCode === audit.questionCode,
      );
      assert.ok(question);
      assert.ok(solution);
      const answer = question.options
        ? question.options.find((option) => option.key === solution.correctAnswer)?.label
        : solution.correctAnswer;
      switch (audit.primaryOfficialOutcomeId) {
        case "MOET2018-G2-NUM-P025-006":
          assert.ok(answer === "tích" || answer === "số chia");
          assert.notEqual(
            Number(
              audit.parameters.find((item) => item.name === "divisor")?.value,
            ),
            0,
          );
          break;
        case "MOET2018-G2-GEO-P026-004":
          assert.equal(answer, "Túi A");
          break;
        case "MOET2018-G2-GEO-P027-013":
          assert.equal(
            answer,
            String(audit.parameters.find((item) => item.name === "end")?.value),
          );
          break;
        case "MOET2018-G2-STA-P028-003": {
          const a = Number(
            audit.parameters.find((item) => item.name === "countA")?.value,
          );
          const b = Number(
            audit.parameters.find((item) => item.name === "countB")?.value,
          );
          assert.equal(answer, `Táo nhiều hơn cam ${a - b} bạn`);
          break;
        }
        case "MOET2018-G2-EXP-P028-001": {
          const a = Number(
            audit.parameters.find((item) => item.name === "countA")?.value,
          );
          const b = Number(
            audit.parameters.find((item) => item.name === "countB")?.value,
          );
          assert.equal(answer, String(a + b));
          break;
        }
        case "MOET2018-G2-EXP-P028-002": {
          const hour = Number(
            audit.parameters.find((item) => item.name === "hour")?.value,
          );
          assert.equal(answer, `${hour + 1} giờ 30 phút`);
          break;
        }
        default:
          assert.fail(`Unexpected Grade 2 outcome ${audit.primaryOfficialOutcomeId}`);
      }
    }
  }
});
