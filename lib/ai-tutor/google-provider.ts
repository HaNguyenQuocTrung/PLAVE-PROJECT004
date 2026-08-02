import "server-only";

import {
  GoogleGenAI,
  ThinkingLevel,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from "@google/genai";

import type {
  TutorLatencyMetrics,
  TutorRequest,
  TutorStreamEvent,
  TutorUsage,
} from "./contracts.ts";
import { buildTutorContext, buildTutorInstructions } from "./prompt.ts";
import { AiTutorProviderError, type AiTutorProvider } from "./provider.ts";
import { evaluateTutorResponseCompleteness } from "./response-quality.ts";

type GoogleStreamingModels = Readonly<{
  generateContentStream(
    input: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>>;
}>;

type GoogleStreamingClient = Readonly<{ models: GoogleStreamingModels }>;

const SAFETY_FINISH_REASONS = new Set([
  "SAFETY",
  "BLOCKLIST",
  "PROHIBITED_CONTENT",
  "SPII",
  "IMAGE_SAFETY",
  "IMAGE_PROHIBITED_CONTENT",
]);

function tokenCount(value: number | undefined) {
  return Number.isSafeInteger(value) && (value ?? -1) >= 0 ? value! : null;
}

function finishReason(chunk: GenerateContentResponse) {
  const reasons =
    chunk.candidates
      ?.map((candidate) => candidate.finishReason && String(candidate.finishReason))
      .filter((value): value is string => Boolean(value)) ?? [];
  return reasons.at(-1) ?? null;
}

function supportsThinkingLevel(model: string) {
  return /^gemini-3(?:[.-]|$)/u.test(model);
}

function googleThinkingLevel(level: TutorRequest["thinkingLevel"]) {
  return {
    minimal: ThinkingLevel.MINIMAL,
    low: ThinkingLevel.LOW,
    medium: ThinkingLevel.MEDIUM,
  }[level];
}

export class GoogleAiTutorProvider implements AiTutorProvider {
  readonly id = "GOOGLE" as const;
  readonly model: string;
  private readonly client: GoogleStreamingClient;

  constructor(
    input: Readonly<{
      apiKey: string;
      model: string;
      timeoutMs: number;
      client?: GoogleStreamingClient;
    }>,
  ) {
    this.model = input.model;
    this.client =
      input.client ??
      new GoogleGenAI({
        apiKey: input.apiKey,
        httpOptions: {
          timeout: input.timeoutMs,
          retryOptions: { attempts: 1 },
        },
      });
  }

  async *streamTutorResponse(
    input: TutorRequest,
  ): AsyncIterable<TutorStreamEvent> {
    yield { type: "message_start", messageId: input.messageId };
    const providerStartedAt = performance.now();
    let firstChunkAt: number | null = null;
    let firstTextAt: number | null = null;
    let chunkCount = 0;
    let textDeltaCount = 0;
    let terminalReason: string | null = null;
    let output = "";
    let metricsEmitted = false;
    let usage: TutorUsage = {
      provider: "GOOGLE",
      model: this.model,
      inputTokens: null,
      outputTokens: null,
      thinkingTokens: null,
      totalTokens: null,
    };

    const latencyMetrics = (reason: string): TutorLatencyMetrics => ({
      requestAcceptedAtEpochMs: null,
      requestAcceptedToProviderStartMs: null,
      authContextMs: null,
      supabaseClientMs: null,
      authUserMs: null,
      profileMs: null,
      studentProfileMs: null,
      serverPreparationMs: null,
      providerTimeToFirstChunkMs:
        firstChunkAt === null ? null : firstChunkAt - providerStartedAt,
      providerTimeToFirstTextMs:
        firstTextAt === null ? null : firstTextAt - providerStartedAt,
      providerTotalGenerationMs: performance.now() - providerStartedAt,
      runtimeTimeToFirstTextMs: null,
      streamBufferingMs: null,
      chunkCount,
      textDeltaCount,
      finishReason: reason,
      responseMode: input.responseMode,
      complexity: input.complexity,
      thinkingLevel: input.thinkingLevel,
    });
    const emitTerminalMetadata = async function* (reason: string) {
      metricsEmitted = true;
      yield { type: "usage", usage } as const;
      yield {
        type: "metrics",
        metrics: latencyMetrics(reason),
      } as const;
    };

    try {
      const stream = await this.client.models.generateContentStream({
        model: this.model,
        contents: [
          ...input.history.map((message) => ({
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text: message.content }],
          })),
          { role: "user", parts: [{ text: input.message }] },
        ],
        config: {
          systemInstruction: `${buildTutorInstructions(input.grade, {
            responseMode: input.responseMode,
            complexity: input.complexity,
          })}${buildTutorContext(input.context)}`,
          maxOutputTokens: input.maxOutputTokens,
          ...(supportsThinkingLevel(this.model)
            ? {
                thinkingConfig: {
                  thinkingLevel: googleThinkingLevel(input.thinkingLevel),
                  includeThoughts: false,
                },
              }
            : {}),
          abortSignal: input.signal,
          httpOptions: {
            timeout: input.timeoutMs,
            retryOptions: { attempts: 1 },
          },
        },
      });

      for await (const chunk of stream) {
        const now = performance.now();
        chunkCount += 1;
        firstChunkAt ??= now;
        if (input.signal.aborted) {
          terminalReason = "ABORTED";
          break;
        }
        const reason = finishReason(chunk);
        if (reason) terminalReason = reason;
        if (
          chunk.promptFeedback?.blockReason ||
          (reason && SAFETY_FINISH_REASONS.has(reason))
        ) {
          terminalReason = reason ?? "PROMPT_BLOCKED";
          break;
        }
        const delta = chunk.text;
        if (delta) {
          firstTextAt ??= now;
          textDeltaCount += 1;
          output += delta;
          yield { type: "text_delta", delta };
        }
        if (chunk.usageMetadata) {
          usage = {
            provider: "GOOGLE",
            model: this.model,
            inputTokens: tokenCount(chunk.usageMetadata.promptTokenCount),
            outputTokens: tokenCount(chunk.usageMetadata.candidatesTokenCount),
            thinkingTokens: tokenCount(chunk.usageMetadata.thoughtsTokenCount),
            totalTokens: tokenCount(chunk.usageMetadata.totalTokenCount),
          };
        }
      }

      const reason = terminalReason ?? "STREAM_CLOSED_WITHOUT_FINISH_REASON";
      yield* emitTerminalMetadata(reason);
      if (input.signal.aborted || reason === "ABORTED") {
        throw new AiTutorProviderError("AI_STREAM_ABORTED");
      }
      if (SAFETY_FINISH_REASONS.has(reason) || reason === "PROMPT_BLOCKED") {
        throw new AiTutorProviderError("AI_SAFETY_BLOCKED");
      }
      if (reason === "MAX_TOKENS") {
        throw new AiTutorProviderError("AI_RESPONSE_TRUNCATED");
      }
      if (!output.trim()) {
        throw new AiTutorProviderError("AI_EMPTY_RESPONSE");
      }
      if (reason !== "STOP") {
        throw new AiTutorProviderError("AI_STREAM_INTERRUPTED");
      }
      if (
        !evaluateTutorResponseCompleteness(output, input.responseMode).complete
      ) {
        throw new AiTutorProviderError("AI_RESPONSE_TRUNCATED");
      }
      yield { type: "message_complete", messageId: input.messageId };
    } catch (error) {
      if (error instanceof AiTutorProviderError) throw error;
      const errorClass =
        error instanceof Error ? `${error.name} ${error.message}` : "";
      const code = input.signal.aborted
        ? "AI_STREAM_ABORTED"
        : /abort|timeout|timed out|deadline/iu.test(errorClass)
          ? "AI_PROVIDER_TIMEOUT"
          : "AI_PROVIDER_ERROR";
      if (!metricsEmitted) {
        yield* emitTerminalMetadata(
          code === "AI_PROVIDER_TIMEOUT" ? "TIMEOUT" : code,
        );
      }
      throw new AiTutorProviderError(code);
    }
  }
}
