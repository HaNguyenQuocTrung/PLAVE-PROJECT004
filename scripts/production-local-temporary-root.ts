import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export function createProductionLocalTemporaryRoot(
  temporaryParent = tmpdir(),
): string {
  const resolvedParent = resolve(temporaryParent);
  try {
    if (!statSync(resolvedParent).isDirectory()) {
      throw new Error("PRODUCTION_LOCAL_TEMP_PARENT_INVALID");
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "PRODUCTION_LOCAL_TEMP_PARENT_INVALID"
    ) {
      throw error;
    }
    throw new Error("PRODUCTION_LOCAL_TEMP_PARENT_INVALID");
  }
  return mkdtempSync(join(resolvedParent, "plave-production-local-"));
}
