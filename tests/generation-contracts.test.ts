import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canonicalContractHash, validateOutcomeGenerationContract } from "../lib/generation-contracts/schema.ts";

test("authored contract package has 375 provenance-bearing drafts", () => {
  const value = JSON.parse(readFileSync("artifacts/generation-contracts/universal-v1-contracts.json", "utf8"));
  assert.equal(value.authored, 375);
  assert.equal(value.contracts.length, 375);
  assert.ok(value.contracts.every((contract: unknown) => validateOutcomeGenerationContract(contract)));
  assert.ok(value.contracts.every((contract: { canonicalContractHash: string }) => {
    const { canonicalContractHash: hash, ...withoutHash } = contract;
    return hash === canonicalContractHash(withoutHash as never);
  }));
});

test("blocked contracts remain explicitly blocked and are never approved", () => {
  const value = JSON.parse(readFileSync("artifacts/generation-contracts/universal-v1-contracts.json", "utf8"));
  assert.equal(value.summary.byStatus.BLOCKED_SOURCE_REQUIRED, 132);
  assert.equal(value.contracts.filter((contract: { reviewStatus: string }) => contract.reviewStatus === "APPROVED").length, 0);
});
