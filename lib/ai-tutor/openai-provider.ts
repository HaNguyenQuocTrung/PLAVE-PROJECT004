import "server-only";

import OpenAI from "openai";

import type {
  TutorLatencyMetrics,
  TutorRequest,
  TutorStreamEvent,
  TutorUsage,
} from "./contracts.ts";
import { buildTutorContext, buildTutorInstructions } from "./prompt.ts";
import { AiTutorProviderError, type AiTutorProvider } from "./provider.ts";
import { evaluateTutorResponseCompleteness } from "./response-quality.ts";

export class OpenAiTutorProvider implements AiTutorProvider {
  readonly id = "OPENAI" as const;
  readonly model: string;
  private readonly client: OpenAI;

  constructor(input: Readonly<{ apiKey: string; model: string; timeoutMs: number }>) {
    this.model = input.model;
    this.client = new OpenAI({
      apiKey: input.apiKey,
      maxRetries: 0,
      timeout: input.timeoutMs,
    });
  }

  async *streamTutorResponse(input: TutorRequest): AsyncIterable<TutorStreamEvent> {
    yield { type: "message_start", messageId: input.messageId };
    const startedAt = performance.now();
    let firstChunkAt: number | null = null;
    let firstTextAt: number | null = null;
    let chunkCount = 0;
    let textDeltaCount = 0;
    let output = "";
    let finishReason = "STREAM_CLOSED_WITHOUT_COMPLETION";
    let usage: TutorUsage = {
      provider: "OPENAI",
      model: this.model,
      inputTokens: null,
      outputTokens: null,
      thinkingTokens: null,
      totalTokens: null,
    };
    const metrics = (): TutorLatencyMetrics => ({
      requestAcceptedAtEpochMs: null,
      requestAcceptedToProviderStartMs: null,
      authContextMs: null,
      supabaseClientMs: null,
      authUserMs: null,
      profileMs: null,
      studentProfileMs: null,
      serverPreparationMs: null,
      providerTimeToFirstChunkMs:
        firstChunkAt === null ? null : firstChunkAt - startedAt,
      providerTimeToFirstTextMs:
        firstTextAt === null ? null : firstTextAt - startedAt,
      providerTotalGenerationMs: performance.now() - startedAt,
      runtimeTimeToFirstTextMs: null,
      streamBufferingMs: null,
      chunkCount,
      textDeltaCount,
      finishReason,
      responseMode: input.responseMode,
      complexity: input.complexity,
      thinkingLevel: input.thinkingLevel,
    });
    try {
      const stream = await this.client.responses.create(
        {
          model: this.model,
          instructions: `${buildTutorInstructions(input.grade, {
            responseMode: input.responseMode,
            complexity: input.complexity,
          })}${buildTutorContext(input.context)}`,
          input: [
            ...input.history.map((message) => ({
              role: message.role,
              content: message.content,
            })),
            { role: "user" as const, content: input.message },
          ],
          max_output_tokens: input.maxOutputTokens,
          safety_identifier: input.safetyIdentifier,
          store: false,
          stream: true,
        },
        { signal: input.signal, timeout: input.timeoutMs, maxRetries: 0 },
      );
      let completed = false;
      for await (const event of stream) {
        const now = performance.now();
        chunkCount += 1;
        firstChunkAt ??= now;
        if (input.signal.aborted) throw new AiTutorProviderError("AI_STREAM_ABORTED");
        if (event.type === "response.output_text.delta") {
          if (typeof event.delta !== "string" || !event.delta) {
            throw new AiTutorProviderError("AI_MALFORMED_PROVIDER_EVENT");
          }
          firstTextAt ??= now;
          textDeltaCount += 1;
          output += event.delta;
          yield { type: "text_delta", delta: event.delta };
        } else if (event.type === "response.completed") {
          completed = true;
          finishReason = "STOP";
          const responseUsage = event.response.usage;
          usage = {
            provider: "OPENAI",
            model: this.model,
            inputTokens: responseUsage?.input_tokens ?? null,
            outputTokens: responseUsage?.output_tokens ?? null,
            thinkingTokens:
              responseUsage?.output_tokens_details?.reasoning_tokens ?? null,
            totalTokens: responseUsage?.total_tokens ?? null,
          };
        } else if (event.type === "response.incomplete") {
          finishReason = "MAX_TOKENS_OR_INCOMPLETE";
          throw new AiTutorProviderError("AI_RESPONSE_TRUNCATED");
        } else if (event.type === "response.failed" || event.type === "error") {
          finishReason = "PROVIDER_ERROR";
          throw new AiTutorProviderError("AI_PROVIDER_ERROR");
        }
      }
      yield { type: "usage", usage };
      yield { type: "metrics", metrics: metrics() };
      if (!output.trim()) throw new AiTutorProviderError("AI_EMPTY_RESPONSE");
      if (!completed) throw new AiTutorProviderError("AI_STREAM_INTERRUPTED");
      if (!evaluateTutorResponseCompleteness(output, input.responseMode).complete) {
        throw new AiTutorProviderError("AI_RESPONSE_TRUNCATED");
      }
      yield { type: "message_complete", messageId: input.messageId };
    } catch (error) {
      if (error instanceof AiTutorProviderError) throw error;
      if (input.signal.aborted) throw new AiTutorProviderError("AI_STREAM_ABORTED");
      const errorClass =
        error instanceof Error ? `${error.name} ${error.message}` : "";
      if (/abort|timeout|timed out|deadline/iu.test(errorClass)) {
        throw new AiTutorProviderError("AI_PROVIDER_TIMEOUT");
      }
      throw new AiTutorProviderError("AI_PROVIDER_ERROR");
    }
  }
}
