import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "../app/api/curriculum-preview/check/route.ts";
import { generatePreviewUnit } from "../lib/curriculum/engine.ts";
import { curriculumUnits } from "../lib/curriculum/registry.ts";

function request(body: unknown) {
  return new Request("http://localhost/api/curriculum-preview/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("answer endpoint reveals feedback only after POST submission", async () => {
  const unit = curriculumUnits[7];
  const draft = generatePreviewUnit(unit.slug);
  const question = draft.questions[0];
  const solution = draft.solutions[0];

  const response = await POST(
    request({
      unitSlug: unit.slug,
      questionCode: question.code,
      answer: solution.correctAnswer,
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = (await response.json()) as {
    correct: boolean;
    correctAnswer: string;
    steps: string[];
  };
  assert.equal(body.correct, true);
  assert.equal(body.correctAnswer, solution.correctAnswer);
  assert.deepEqual(body.steps, solution.steps);
});

test("answer endpoint fails closed for malformed and cross-unit requests", async () => {
  const malformed = await POST(
    request({ unitSlug: "../bad", questionCode: "bad", answer: "1" }),
  );
  assert.equal(malformed.status, 400);

  const firstDraft = generatePreviewUnit(curriculumUnits[0].slug);
  const crossUnit = await POST(
    request({
      unitSlug: curriculumUnits[1].slug,
      questionCode: firstDraft.questions[0].code,
      answer: "1",
    }),
  );
  assert.equal(crossUnit.status, 404);
});
