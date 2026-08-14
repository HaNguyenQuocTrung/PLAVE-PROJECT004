import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export type ProductionLocalPublicRuntimeSource =
  | "EXPLICIT_ENVIRONMENT"
  | "VALIDATED_RUNTIME_FILE";
export type ProductionLocalApplicationMode =
  | "FULL_APPLICATION_AI_RUNTIME_REQUIRED";

const schemaVersion = "plave-production-local-build-binding-v2";
const bindingFile = ".plave-public-runtime-binding.json";

export function writeProductionLocalBuildBinding(
  buildRoot: string,
  source: ProductionLocalPublicRuntimeSource,
  mode: ProductionLocalApplicationMode,
) {
  writeFileSync(
    resolve(buildRoot, bindingFile),
    `${JSON.stringify({ schemaVersion, source, mode })}\n`,
    { encoding: "utf8", flag: "wx", mode: 0o600 },
  );
}

export function assertProductionLocalBuildBinding(
  buildRoot: string,
  expectedSource: ProductionLocalPublicRuntimeSource,
  expectedMode: ProductionLocalApplicationMode,
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
    Object.keys(value).sort().join(",") !== "mode,schemaVersion,source" ||
    (value as Record<string, unknown>).schemaVersion !== schemaVersion ||
    (value as Record<string, unknown>).source !== expectedSource ||
    (value as Record<string, unknown>).mode !== expectedMode
  ) {
    throw new Error("PRODUCTION_LOCAL_BUILD_RUNTIME_BINDING_INVALID");
  }
}
