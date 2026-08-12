import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { canonicalize } from "../lib/content-factory/canonical.ts";
import {
  buildFinalLocalAcceptance,
  FINAL_LOCAL_CHECKSUM_PATH,
  FINAL_LOCAL_DOCUMENTATION_MANIFEST_PATH,
  FINAL_LOCAL_MATRIX_PATH,
  FINAL_LOCAL_RECEIPT_PATH,
} from "../lib/release-integration/final-local-acceptance.ts";

const root = process.cwd();
const built = buildFinalLocalAcceptance(root);
for (const [path, value] of [
  [FINAL_LOCAL_MATRIX_PATH, built.matrix],
  [FINAL_LOCAL_DOCUMENTATION_MANIFEST_PATH, built.documentationManifest],
  [FINAL_LOCAL_CHECKSUM_PATH, built.checksumManifest],
  [FINAL_LOCAL_RECEIPT_PATH, built.receipt],
] as const) {
  const output = resolve(root, path);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${canonicalize(value)}\n`, "utf8");
}
console.log(`FINAL_LOCAL_ACCEPTANCE_OK matrix=${built.matrix.matrixHash} receipt=${built.receipt.receiptHash}`);
