import assert from "node:assert/strict";
import test from "node:test";

import { generatePreviewUnit } from "../lib/curriculum/engine.ts";
import {
  grade3P1TargetOutcomeIds,
} from "../lib/curriculum/p0-outcome-expansion.ts";
import { curriculumUnits } from "../lib/curriculum/registry.ts";
import { validatePreviewUnit } from "../lib/curriculum/validation.ts";

const unit = curriculumUnits.find(
  (candidate) => candidate.slug === "grade-3-number-sense-to-100000-p1",
);
assert.ok(unit);

test("Grade 3 number-sense batch maps four exact official P1 outcomes", () => {
  assert.equal(grade3P1TargetOutcomeIds.length, 4);
  assert.deepEqual(unit.officialOutcomeIds, grade3P1TargetOutcomeIds);
  assert.ok(
    unit.officialOutcomeIds.every((outcomeId) =>
      unit.theory.some((section) =>
        section.officialOutcomeIds?.includes(outcomeId),
      ),
    ),
  );
  assert.ok(
    unit.officialOutcomeIds.every((outcomeId) =>
      unit.examples.some((example) =>
        example.officialOutcomeIds?.includes(outcomeId),
      ),
    ),
  );
});

test("Grade 3 number-sense practice is deterministic, diverse and separated", () => {
  const draft = generatePreviewUnit(unit.slug);
  assert.deepEqual(validatePreviewUnit(draft), { valid: true, errors: [] });
  assert.deepEqual(draft, generatePreviewUnit(unit.slug));
  assert.notDeepEqual(
    draft.questions,
    generatePreviewUnit(unit.slug, "grade3-number-variant").questions,
  );
  for (const outcomeId of unit.officialOutcomeIds) {
    const audits = draft.audits.filter(
      (audit) => audit.primaryOfficialOutcomeId === outcomeId,
    );
    const codes = new Set(audits.map((audit) => audit.questionCode));
    const questions = draft.questions.filter((question) => codes.has(question.code));
    assert.equal(audits.length, 3);
    assert.ok(new Set(questions.map((question) => question.answerType)).size >= 2);
    assert.ok(new Set(audits.map((audit) => audit.evidenceForm)).size >= 2);
    assert.ok(
      questions.every(
        (question) =>
          !Object.hasOwn(question, "correctAnswer") &&
          draft.solutions.some(
            (solution) =>
              solution.questionCode === question.code &&
              solution.steps.length >= 2 &&
              solution.feedback.length >= 24,
          ),
      ),
    );
  }
});

test("Grade 3 number-sense answers independently satisfy place-value rules", () => {
  const draft = generatePreviewUnit(unit.slug, "grade3-number-semantics");
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
    const value = Number(
      audit.parameters.find((item) => item.name === "value")?.value,
    );
    switch (audit.primaryOfficialOutcomeId) {
      case "MOET2018-G3-NUM-P029-001":
        assert.equal(answer, String(value));
        assert.ok(value >= 10_000 && value <= 100_000);
        break;
      case "MOET2018-G3-NUM-P029-002":
        assert.equal(
          answer,
          String(
            audit.parameters.find((item) => item.name === "rounded")?.value,
          ),
        );
        assert.equal(Number(answer) % 100, 0);
        break;
      case "MOET2018-G3-NUM-P029-003":
        assert.equal(answer, "<");
        assert.ok(
          Number(audit.parameters.find((item) => item.name === "left")?.value) <
            Number(audit.parameters.find((item) => item.name === "right")?.value),
        );
        break;
      case "MOET2018-G3-NUM-P029-004": {
        const parts = ["tenThousands", "thousands", "hundreds", "ones"].map(
          (name) =>
            Number(
              audit.parameters.find((item) => item.name === name)?.value,
            ),
        );
        const recomputed =
          parts[0] * 10_000 + parts[1] * 1_000 + parts[2] * 100 + parts[3];
        assert.equal(recomputed, value);
        break;
      }
      default:
        assert.fail(`Unexpected outcome ${audit.primaryOfficialOutcomeId}`);
    }
  }
});
