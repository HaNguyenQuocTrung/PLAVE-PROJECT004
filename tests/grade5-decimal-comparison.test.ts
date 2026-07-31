import { strict as assert } from "node:assert";
import test from "node:test";

import {
  explainDecimalComparison,
  generatePreviewUnit,
} from "../lib/curriculum/engine.ts";
import { getCurriculumUnit } from "../lib/curriculum/registry.ts";

const cases = [
  ["1,9", "2", "<"],
  ["2", "2,0", "="],
  ["2,05", "2,5", "<"],
  ["0,9", "0,89", ">"],
  ["10,01", "9,99", ">"],
  ["3,140", "3,14", "="],
] as const;

test("Grade 5 decimal comparisons use place value for all required edges", () => {
  for (const [left, right, relation] of cases) {
    const comparison = explainDecimalComparison(left, right);
    assert.equal(comparison.relation, relation, `${left} ${right}`);
    const teaching = [...comparison.steps, comparison.feedback].join(" ");
    assert.match(teaching, /phần nguyên/u);
    assert.match(teaching, /tận cùng bên phải phần thập phân/u);
    assert.doesNotMatch(
      teaching,
      /(?:nhiều|ít) chữ số hơn[^.]{0,30}(?:lớn|bé)|(?:dài|ngắn) hơn[^.]{0,30}(?:lớn|bé)/iu,
    );
    assert.doesNotMatch(teaching, /thêm số 0 (?:vào|ở) bên trái/iu);
  }
});

test("the exact 1,9 and 2 teaching sequence compares integer parts first", () => {
  const comparison = explainDecimalComparison("1,9", "2");
  assert.equal(comparison.relation, "<");
  assert.match(comparison.steps[0], /2,0/u);
  assert.match(comparison.steps[1], /1 < 2/u);
  assert.match(comparison.steps.at(-1) ?? "", /1,9 < 2,0/u);
});

test("Grade 5 theory, example, feedback and solutions share the safe method", () => {
  const unit = getCurriculumUnit("grade-5-decimal-operations");
  assert.ok(unit);
  const content = JSON.stringify({
    theory: unit.theory,
    examples: unit.examples,
  });
  assert.match(content, /So sánh phần nguyên trước/u);
  assert.match(content, /1,9 < 2,0 nên 1,9 < 2/u);
  assert.match(content, /tận cùng bên phải phần thập phân/u);
  assert.doesNotMatch(
    content,
    /(?:nhiều|ít) chữ số hơn[^.]{0,30}(?:lớn|bé)|(?:dài|ngắn) hơn[^.]{0,30}(?:lớn|bé)/iu,
  );

  const draft = generatePreviewUnit(unit.slug);
  const comparisons = draft.solutions.slice(4, 8);
  assert.equal(comparisons.length, 4);
  for (const solution of comparisons) {
    assert.match(solution.feedback, /So sánh phần nguyên trước/u);
    assert.match(solution.steps.join(" "), /phần nguyên/iu);
    assert.doesNotMatch(
      solution.steps.join(" "),
      /(?:dựa|căn cứ) vào độ dài[^.]{0,30}(?:lớn|bé|thứ tự)/iu,
    );
  }
});

test("Grade 5 decimal generation remains deterministic", () => {
  const first = generatePreviewUnit(
    "grade-5-decimal-operations",
    "decimal-semantic-regression",
  );
  const second = generatePreviewUnit(
    "grade-5-decimal-operations",
    "decimal-semantic-regression",
  );
  assert.deepEqual(first, second);
});
