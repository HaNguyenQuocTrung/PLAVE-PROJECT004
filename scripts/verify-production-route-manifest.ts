import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { productionLocalBuildContract } from "./production-local-build-contract.ts";

export const REVIEW_ROUTE_SOURCE = "app/review/[attemptId]/page.tsx";
export const REVIEW_ROUTE = "/review/[attemptId]";
export const REVIEW_APP_PATH = `${REVIEW_ROUTE}/page`;

export function verifyProductionReviewRoute(root = resolve(import.meta.dirname, "..")) {
  const source = resolve(root, REVIEW_ROUTE_SOURCE);
  const manifest = resolve(
    root,
    productionLocalBuildContract.distDirectory,
    "server/app-paths-manifest.json",
  );
  if (!existsSync(source)) throw new Error("PRODUCTION_ROUTE_SOURCE_MISSING");
  if (!existsSync(manifest)) throw new Error("PRODUCTION_ROUTE_MANIFEST_MISSING");
  const routes = JSON.parse(readFileSync(manifest, "utf8")) as Record<string, string>;
  if (!(REVIEW_APP_PATH in routes)) throw new Error("PRODUCTION_REVIEW_ROUTE_MISSING");
  console.log(`PRODUCTION_ROUTE_MANIFEST_OK route=${REVIEW_ROUTE}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyProductionReviewRoute();
}
