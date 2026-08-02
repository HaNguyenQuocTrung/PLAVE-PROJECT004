import { AI_TUTOR_PROVIDERS, type AiTutorProviderId } from "./contracts.ts";

export type AiTutorConfig = Readonly<{
  enabled: true;
  provider: AiTutorProviderId;
  model: string;
  maxMessageCharacters: number;
  maxHistoryTurns: number;
  maxRequestBytes: number;
  maxOutputTokens: number;
  requestsPerMinute: number;
  dailyRequestLimit: number;
  timeoutMs: number;
  testMode: boolean;
}>;

export type AiTutorConfigResult =
  | Readonly<{ ok: true; config: AiTutorConfig }>
  | Readonly<{
      ok: false;
      code: "AI_TUTOR_DISABLED" | "AI_CONFIGURATION_INVALID" | "AI_PROVIDER_NOT_IMPLEMENTED";
    }>;

function parseBoundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  if (value === undefined || value === "") return fallback;
  if (!/^\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

function validSecret(value: string | undefined) {
  return Boolean(value && value.length >= 20 && value.length <= 512 && !/\s/u.test(value));
}

export function getAiTutorConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
): AiTutorConfigResult {
  if (environment.PLAVE_AI_TUTOR_ENABLED !== "true") {
    return { ok: false, code: "AI_TUTOR_DISABLED" };
  }
  const provider = environment.PLAVE_AI_PROVIDER;
  if (!AI_TUTOR_PROVIDERS.includes(provider as AiTutorProviderId)) {
    return { ok: false, code: "AI_CONFIGURATION_INVALID" };
  }
  const providerId = provider as AiTutorProviderId;
  if (provider === "DEEPSEEK") {
    return { ok: false, code: "AI_PROVIDER_NOT_IMPLEMENTED" };
  }
  const providerConfiguration =
    providerId === "GOOGLE"
      ? {
          apiKey: environment.GOOGLE_API_KEY,
          model: environment.GOOGLE_AI_MODEL?.trim(),
        }
      : {
          apiKey: environment.OPENAI_API_KEY,
          model: environment.OPENAI_MODEL?.trim(),
        };
  const limits = {
    maxMessageCharacters: parseBoundedInteger(environment.PLAVE_AI_MAX_MESSAGE_CHARACTERS, 2_000, 100, 8_000),
    maxHistoryTurns: parseBoundedInteger(environment.PLAVE_AI_MAX_HISTORY_TURNS, 12, 1, 30),
    maxRequestBytes: parseBoundedInteger(environment.PLAVE_AI_MAX_REQUEST_BYTES, 32_768, 4_096, 131_072),
    maxOutputTokens: parseBoundedInteger(environment.PLAVE_AI_MAX_OUTPUT_TOKENS, 4_096, 1_024, 8_192),
    requestsPerMinute: parseBoundedInteger(environment.PLAVE_AI_REQUESTS_PER_MINUTE, 6, 1, 30),
    dailyRequestLimit: parseBoundedInteger(environment.PLAVE_AI_DAILY_REQUEST_LIMIT, 80, 1, 1_000),
    timeoutMs: parseBoundedInteger(environment.PLAVE_AI_TIMEOUT_MS, 30_000, 3_000, 120_000),
  };
  if (
    !validSecret(providerConfiguration.apiKey) ||
    !providerConfiguration.model ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,79}$/u.test(providerConfiguration.model) ||
    Object.values(limits).some((value) => value === null)
  ) {
    return { ok: false, code: "AI_CONFIGURATION_INVALID" };
  }
  const testMode =
    environment.PLAVE_AI_TUTOR_TEST_MODE === "true" &&
    environment.NODE_ENV !== "production";
  return {
    ok: true,
    config: {
      enabled: true,
      provider: providerId,
      model: providerConfiguration.model,
      maxMessageCharacters: limits.maxMessageCharacters!,
      maxHistoryTurns: limits.maxHistoryTurns!,
      maxRequestBytes: limits.maxRequestBytes!,
      maxOutputTokens: limits.maxOutputTokens!,
      requestsPerMinute: limits.requestsPerMinute!,
      dailyRequestLimit: limits.dailyRequestLimit!,
      timeoutMs: limits.timeoutMs!,
      testMode,
    },
  };
}

export function getAiTutorPublicAvailability(
  environment: Readonly<Record<string, string | undefined>>,
) {
  const result = getAiTutorConfiguration(environment);
  return {
    available: result.ok,
    status: result.ok ? ("READY" as const) : result.code,
  };
}
