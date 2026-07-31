import assert from "node:assert/strict";
import test from "node:test";
import { checkPreviewAnswer, generatePreviewUnit } from "../lib/curriculum/engine.ts";
import { validatePreviewUnit } from "../lib/curriculum/validation.ts";

test("source-locked Grade 2 data/chance unit is deterministic and semantic", () => {
  const draft = generatePreviewUnit("grade-2-data-and-chance");
  assert.deepEqual(validatePreviewUnit(draft), { valid: true, errors: [] });
  assert.equal(draft.questions.length, 12);
  assert.equal(draft.solutions.length, 12);
  assert.equal(new Set(draft.questions.map((item) => item.skillFamily)).size, 3);
  assert.deepEqual(
    generatePreviewUnit("grade-2-data-and-chance", "repeat"),
    generatePreviewUnit("grade-2-data-and-chance", "repeat"),
  );
  for (const solution of draft.solutions) {
    assert.equal(
      checkPreviewAnswer(draft.unit.slug, solution.questionCode, solution.correctAnswer)?.correct,
      true,
    );
  }
});

test("frequency totals and event classes are independently consistent", () => {
  const draft = generatePreviewUnit("grade-2-data-and-chance", "semantic");
  for (const audit of draft.audits.slice(0, 4)) {
    const values = Object.fromEntries(audit.parameters.map((item) => [item.name, Number(item.value)]));
    const solution = draft.solutions.find((item) => item.questionCode === audit.questionCode);
    const question = draft.questions.find((item) => item.code === audit.questionCode);
    assert.ok(solution && question);
    const expected = values.countA + values.countB;
    const resolved = question.options?.find((item) => item.key === solution.correctAnswer)?.label ?? solution.correctAnswer;
    assert.equal(Number(resolved), expected);
  }
  assert.ok(draft.solutions.slice(8).every((item) => ["có thể", "chắc chắn", "không thể"].some((label) => item.steps.at(-1)?.includes(label))));
  assert.ok(draft.questions.every((item) => item.visual.type === "DATA_DISPLAY"));
  assert.ok(draft.questions.every((item) => !("correctAnswer" in item)));
});
