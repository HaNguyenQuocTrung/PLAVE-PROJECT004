import { createHash } from "node:crypto";

const STABLE_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;

export function assertStableId(value: string, label = "identifier") {
  if (!STABLE_ID.test(value)) throw new Error(`${label}: INVALID_STABLE_ID`);
}

export function assertNfc(value: string, label = "display text") {
  if (value !== value.normalize("NFC")) throw new Error(`${label}: NON_NFC_TEXT`);
}

export function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("NON_JSON_NUMBER");
    return JSON.stringify(value);
  }
  if (typeof value !== "object") throw new Error("NON_JSON_VALUE");
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(object[key])}`).join(",")}}`;
}

export function sha256(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizedDefinition(value: string) {
  return value.normalize("NFC").replace(/\r\n?/gu, "\n").replace(/[ \t]+/gu, " ").trim();
}
