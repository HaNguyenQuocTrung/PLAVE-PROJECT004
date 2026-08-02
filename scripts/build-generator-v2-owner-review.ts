import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildFullOwnerReviewManifestSamples } from "../lib/generation-v2/owner-review.ts";
import { assertProject004Workspace } from "./project004-identity.ts";

const root = assertProject004Workspace();
const directory = resolve(root, "artifacts/generator-v2-owner-review");
const manifestPath = resolve(directory, "manifest.json");
if (existsSync(manifestPath)) {
  const existing = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    ownerDecision?: unknown;
  };
  if (existing.ownerDecision !== null && existing.ownerDecision !== undefined) {
    throw new Error("OWNER_REVIEW_REBUILD_REJECTED_AFTER_OWNER_DECISION");
  }
}
const samples = buildFullOwnerReviewManifestSamples();
const capabilityCount = new Set(samples.map((sample) => sample.capabilityId)).size;

mkdirSync(directory, { recursive: true });
writeFileSync(manifestPath, `${JSON.stringify({
  schemaVersion: 2,
  generatedAt: null,
  productScope: "GENERATOR_V2_CANONICAL_546_BOUNDED_CAPABILITY_REVIEW",
  sampleCount: samples.length,
  canonicalCapabilities: capabilityCount,
  grades: [...new Set(samples.map((sample) => sample.grade))].sort(),
  domains: [...new Set(samples.map((sample) => sample.domain))].sort(),
  difficulties: [...new Set(samples.map((sample) => sample.difficulty))].sort(),
  interactionTypes: [...new Set(samples.map((sample) => sample.interactionType))].sort(),
  visualTypes: [...new Set(samples.map((sample) => sample.visualType))].sort(),
  privateSolutionIncluded: false,
  ownerDecision: null,
  ownerNotes: null,
  allowedDecisions: ["APPROVE", "REJECT", "NEEDS_REVISION"],
  traceability: ["outcomeId", "capabilityId", "grade", "difficulty", "seed", "domain", "interactionType", "expectedSkill", "reviewUrl", "reviewState"],
  selectionPolicy: "One deterministic public-only sample per canonical capability, plus only the minimum interaction-surface supplements needed for complete interaction coverage.",
  samples,
}, null, 2)}\n`);

process.stdout.write(`OWNER_REVIEW_SAMPLES=${samples.length}\n`);
process.stdout.write(`OWNER_REVIEW_CAPABILITIES=${capabilityCount}\n`);
process.stdout.write("OWNER_DECISION=NOT_RECORDED\nPRIVATE_SOLUTION_INCLUDED=NO\n");
