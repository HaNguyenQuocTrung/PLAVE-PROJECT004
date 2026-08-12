import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { productionLocalBuildContract } from "../scripts/production-local-build-contract.ts";
import { REVIEW_APP_PATH, verifyProductionReviewRoute } from "../scripts/verify-production-route-manifest.ts";

function workspace(route = true, manifest = true) {
  const root = mkdtempSync(resolve(tmpdir(), "plave-route-manifest-"));
  mkdirSync(resolve(root, "app/review/[attemptId]"), { recursive: true });
  if (route) writeFileSync(resolve(root, "app/review/[attemptId]/page.tsx"), "export default function Page() {}\n");
  if (manifest) {
    const serverRoot = resolve(root, productionLocalBuildContract.distDirectory, "server");
    mkdirSync(serverRoot, { recursive: true });
    writeFileSync(resolve(serverRoot, "app-paths-manifest.json"), JSON.stringify({ [REVIEW_APP_PATH]: "app/review/[attemptId]/page.js" }));
  }
  return root;
}

test("post-build review route requires both canonical source and generated manifest entry", () => {
  const root = workspace();
  try { assert.doesNotThrow(() => verifyProductionReviewRoute(root)); }
  finally { rmSync(root, { recursive: true, force: true }); }
});

test("post-build review route fails closed for missing source or manifest", () => {
  const withoutSource = workspace(false, true);
  const withoutManifest = workspace(true, false);
  try {
    assert.throws(() => verifyProductionReviewRoute(withoutSource), /PRODUCTION_ROUTE_SOURCE_MISSING/u);
    assert.throws(() => verifyProductionReviewRoute(withoutManifest), /PRODUCTION_ROUTE_MANIFEST_MISSING/u);
  } finally {
    rmSync(withoutSource, { recursive: true, force: true });
    rmSync(withoutManifest, { recursive: true, force: true });
  }
});
