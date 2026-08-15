import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { canonicalize } from "../lib/content-factory/canonical.ts";
import {
  buildGradesTwoToNineReleaseIntegrationReceipt,
  RELEASE_INTEGRATION_CHECKSUM_PATH,
  RELEASE_INTEGRATION_RECEIPT_PATH,
} from "../lib/release-integration/receipt.ts";

const root = process.cwd();
const built = buildGradesTwoToNineReleaseIntegrationReceipt(root);
for (const [path, value] of [
  [RELEASE_INTEGRATION_RECEIPT_PATH, built.receipt],
  [RELEASE_INTEGRATION_CHECKSUM_PATH, built.checksumManifest],
] as const) {
  const output = resolve(root, path);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${canonicalize(value)}\n`, "utf8");
}
console.log(`GRADES_2_9_RELEASE_RECEIPT_OK compatibility=${built.receipt.compatibilityHash} receipt=${built.receipt.receiptHash}`);
