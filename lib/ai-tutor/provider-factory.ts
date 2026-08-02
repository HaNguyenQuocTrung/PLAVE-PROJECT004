import "server-only";

import { getAiTutorProviderSecret, type AiTutorConfig } from "./config.ts";
import { GoogleAiTutorProvider } from "./google-provider.ts";
import { MockAiTutorProvider } from "./mock-provider.ts";
import { OpenAiTutorProvider } from "./openai-provider.ts";
import type { AiTutorProvider } from "./provider.ts";

export function createAiTutorProvider(config: AiTutorConfig): AiTutorProvider {
  if (config.testMode) return new MockAiTutorProvider(config.model, config.provider);
  if (config.provider === "OPENAI") {
    return new OpenAiTutorProvider({
      apiKey: getAiTutorProviderSecret("OPENAI"),
      model: config.model,
      timeoutMs: config.timeoutMs,
    });
  }
  if (config.provider === "GOOGLE") {
    return new GoogleAiTutorProvider({
      apiKey: getAiTutorProviderSecret("GOOGLE"),
      model: config.model,
      timeoutMs: config.timeoutMs,
    });
  }
  throw new Error("AI_PROVIDER_NOT_IMPLEMENTED");
}
