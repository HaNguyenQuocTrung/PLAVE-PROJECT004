import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { canonicalize, sha256 } from "./canonical.ts";

export const WAVE_M_INPUT_SCOPE_VERSION = "plave-wave-m-input-scope-v2" as const;

const waveMInputRules = Object.freeze([
  { directory: "lib/content-factory", file: /^wave-m(?:-.+)?\.ts$/u },
  { directory: "scripts", file: /^(?:audit|build|run)-.*wave-m.*\.ts$/u },
  { directory: "tests", file: /^content-factory-wave-m.*\.test\.ts$/u },
] as const);

export function waveMInputFiles(root: string) {
  return waveMInputRules.flatMap(({ directory, file }) => readdirSync(resolve(root, directory), { withFileTypes: true })
    .filter((entry) => entry.isFile() && file.test(entry.name)).map((entry) => join(root, directory, entry.name))).sort();
}

export function buildWaveMInputScope(root: string) {
  const files = waveMInputFiles(root);
  const inputs = files.map((file) => ({ path: relative(root, file), sha256: sha256(readFileSync(file)) }));
  return { scopeVersion: WAVE_M_INPUT_SCOPE_VERSION, inputCount: inputs.length, inputs,
    inputDigest: sha256(canonicalize({ scopeVersion: WAVE_M_INPUT_SCOPE_VERSION, inputs })) } as const;
}
