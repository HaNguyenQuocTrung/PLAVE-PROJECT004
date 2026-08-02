import "server-only";

import {
  getAiTutorConfiguration as resolveAiTutorConfiguration,
  getAiTutorPublicAvailability as resolveAiTutorPublicAvailability,
} from "./config-values.ts";

const AI_TUTOR_RUNTIME_ENVIRONMENT_KEYS = [
  "NODE_ENV",
  "PLAVE_AI_TUTOR_ENABLED",
  "PLAVE_AI_PROVIDER",
  "GOOGLE_API_KEY",
  "GOOGLE_AI_MODEL",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "PLAVE_AI_MAX_MESSAGE_CHARACTERS",
  "PLAVE_AI_MAX_HISTORY_TURNS",
  "PLAVE_AI_MAX_REQUEST_BYTES",
  "PLAVE_AI_MAX_OUTPUT_TOKENS",
  "PLAVE_AI_REQUESTS_PER_MINUTE",
  "PLAVE_AI_DAILY_REQUEST_LIMIT",
  "PLAVE_AI_TIMEOUT_MS",
  "PLAVE_AI_TUTOR_TEST_MODE",
] as const;

function readServerEnvironmentValue(key: string) {
  const runtimeProcess = Reflect.get(globalThis, "process") as
    | { env?: unknown }
    | undefined;
  const runtimeEnvironment = runtimeProcess
    ? Reflect.get(runtimeProcess, "env")
    : undefined;
  if (!runtimeEnvironment || typeof runtimeEnvironment !== "object") {
    return undefined;
  }
  const value = Reflect.get(runtimeEnvironment, key);
  return typeof value === "string" ? value : undefined;
}

function readRuntimeEnvironment() {
  const environment: Record<string, string | undefined> = {};
  for (const key of AI_TUTOR_RUNTIME_ENVIRONMENT_KEYS) {
    environment[key] = readServerEnvironmentValue(key);
  }
  return environment;
}

export function getAiTutorConfiguration() {
  return resolveAiTutorConfiguration(readRuntimeEnvironment());
}

export function getAiTutorPublicAvailability() {
  return resolveAiTutorPublicAvailability(readRuntimeEnvironment());
}

export function getAiTutorProviderSecret(provider: "GOOGLE" | "OPENAI") {
  const keyName = provider === "GOOGLE" ? "GOOGLE_API_KEY" : "OPENAI_API_KEY";
  const value = readServerEnvironmentValue(keyName);
  if (typeof value !== "string" || !value) {
    throw new Error("AI_CONFIGURATION_INVALID");
  }
  return value;
}

export type {
  AiTutorConfig,
  AiTutorConfigResult,
} from "./config-values.ts";
