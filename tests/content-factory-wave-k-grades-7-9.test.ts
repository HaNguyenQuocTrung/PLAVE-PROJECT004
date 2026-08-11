import test from "node:test";
import assert from "node:assert/strict";
import { getWaveKGradePacks } from "../lib/content-factory/wave-k-packs.ts";
import { verifyWaveKShard } from "../lib/content-factory/wave-k-shards.ts";

test("Wave K Grades 7-9 shard keeps only exact deterministic candidates", () => {
  const shard = verifyWaveKShard([7, 8, 9]);
  assert.equal(shard.status, "PASSED");
  assert.deepEqual(shard.errors, []);
  for (const pack of getWaveKGradePacks([7, 8, 9])) {
    const counts = new Map<string, number>();
    for (const question of pack.questions) counts.set(question.skillId, (counts.get(question.skillId) ?? 0) + 1);
    assert.ok([...counts.values()].every((count) => count === 6));
    assert.equal(new Set(pack.questions.map((question) => question.duplicateFingerprint)).size, pack.questions.length);
  }
});
