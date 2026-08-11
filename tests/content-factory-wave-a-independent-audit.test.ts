import assert from "node:assert/strict";
import test from "node:test";
import { productionGradePacks } from "../lib/content-factory/packs.ts";
import { auditWaveACandidates } from "../lib/content-factory/wave-a-independent-audit.ts";
import { validateGradePack } from "../lib/content-factory/validation.ts";

test("all 192 Wave A questions pass the independent oracle and diversity gate", () => {
  const rows = auditWaveACandidates(productionGradePacks);
  assert.equal(rows.length, 8);
  assert.equal(rows.reduce((sum, row) => sum + row.questions, 0), 192);
  assert.equal(rows.reduce((sum, row) => sum + row.independentlyVerified, 0), 192);
  assert.deepEqual(rows.flatMap((row) => row.errors), []);
  assert.ok(rows.every((row) => row.promptStructures >= 4));
});

test("question blueprint contracts bind exact grade, skill, difficulty and answer type", () => {
  for (const pack of productionGradePacks.filter((candidate) => candidate.grade >= 2)) {
    const errors = validateGradePack(pack).filter((diagnostic) => diagnostic.code.startsWith("BLUEPRINT_"));
    assert.deepEqual(errors, [], `Grade ${pack.grade} blueprint binding drift`);
    for (const question of pack.questions) {
      const blueprint = pack.blueprints.find((candidate) => candidate.id === question.blueprintId);
      assert.ok(blueprint);
      assert.equal(blueprint.grade, question.grade);
      assert.equal(blueprint.skillId, question.skillId);
      assert.equal(blueprint.difficulty, question.difficulty);
      assert.equal(blueprint.questionType, question.answer.type);
    }
  }
});

test("Grade 8 and Grade 9 contain multiple exact mathematical structures", () => {
  const rows = auditWaveACandidates(productionGradePacks);
  for (const grade of [8, 9]) {
    const row = rows.find((candidate) => candidate.grade === grade);
    assert.ok(row);
    assert.ok(row.promptStructures >= 4);
    assert.equal(row.skillCount, 2);
  }
});
