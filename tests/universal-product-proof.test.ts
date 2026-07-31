import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("universal PLAVE draft proof is complete and private solutions are separated", async () => {
  const artifact = JSON.parse(await readFile("artifacts/generated-candidates/universal-1638-proof.json", "utf8"));
  assert.equal(artifact.manifest.requested, 1638);
  assert.equal(artifact.manifest.generated, 1638);
  assert.equal(artifact.manifest.independentlySolved, 1638);
  assert.equal(artifact.manifest.validated, 1638);
  assert.equal(artifact.status, "DRAFT_REVIEW_REQUIRED");
  assert.equal(artifact.manifest.publicationApproved, 0);
  assert.equal(artifact.publicQuestions.length, 1638);
  assert.equal(artifact.privateSolutions.length, 1638);
  assert.ok(artifact.publicQuestions.every((q: Record<string, unknown>) => !Object.hasOwn(q, "answer") && !Object.hasOwn(q, "correctIndex")));
});
