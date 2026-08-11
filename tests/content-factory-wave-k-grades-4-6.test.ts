import test from "node:test";
import assert from "node:assert/strict";
import { getWaveKGradePacks } from "../lib/content-factory/wave-k-packs.ts";
import { verifyWaveKShard } from "../lib/content-factory/wave-k-shards.ts";

test("Wave K Grades 4-6 shard has source-bound hidden six-case pools", () => {
  const shard = verifyWaveKShard([4, 5, 6]);
  assert.equal(shard.status, "PASSED");
  assert.deepEqual(shard.errors, []);
  for (const pack of getWaveKGradePacks([4, 5, 6])) {
    assert.ok(pack.questions.length > 0);
    assert.equal(pack.release.publication, "DRAFT");
    assert.equal(pack.release.visibility, "HIDDEN");
    assert.equal(pack.release.pilotEnabled || pack.release.runtimeEnabled || pack.release.retentionEnabled, false);
    assert.ok(pack.questions.every((question) => !question.published && !question.pilotEligible
      && question.provenance.sourceReferenceIds.length > 0 && question.validationReceiptIds!.length > 0));
  }
});
