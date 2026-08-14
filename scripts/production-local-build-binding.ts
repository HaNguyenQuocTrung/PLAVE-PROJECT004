import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export type ProductionLocalPublicRuntimeSource =
  | "EXPLICIT_ENVIRONMENT"
  | "VALIDATED_RUNTIME_FILE";

const schemaVersion = "plave-production-local-build-binding-v1";
const bindingFile = ".plave-public-runtime-binding.json";

export function writeProductionLocalBuildBinding(
  buildRoot: string,
  source: ProductionLocalPublicRuntimeSource,
) {
  writeFileSync(
    resolve(buildRoot, bindingFile),
    `${JSON.stringify({ schemaVersion, source })}\n`,
    { encoding: "utf8", flag: "wx", mode: 0o600 },
  );
}

export function assertProductionLocalBuildBinding(
  buildRoot: string,
  expectedSource: ProductionLocalPublicRuntimeSource,
) {
  let value: unknown;
  try {
    value = JSON.parse(
      readFileSync(resolve(buildRoot, bindingFile), "utf8"),
    );
  } catch {
    throw new Error("PRODUCTION_LOCAL_BUILD_RUNTIME_BINDING_INVALID");
  }
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(",") !== "schemaVersion,source" ||
    (value as Record<string, unknown>).schemaVersion !== schemaVersion ||
    (value as Record<string, unknown>).source !== expectedSource
  ) {
    throw new Error("PRODUCTION_LOCAL_BUILD_RUNTIME_BINDING_INVALID");
  }
}
