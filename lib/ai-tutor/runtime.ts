import { createHash } from "node:crypto";

import type { AiTutorConfig } from "./config";
import {
  isTutorStreamEvent,
  type TutorClientRequest,
  type TutorErrorCode,
  type TutorLatencyMetrics,
  type TutorRequest,
  type TutorStreamEvent,
  type TutorUsage,
} from "./contracts.ts";
import {
  buildTutorGenerationPlan,
  evaluateTutorSafety,
} from "./prompt.ts";
import type { AiTutorProvider } from "./provider.ts";
import { AiTutorProviderError } from "./provider.ts";

type RuntimeState = {
  conversationOwners: Map<string, { owner: string; touchedAt: number }>;
  activeConversations: Set<string>;
  seenMessages: Map<string, { signature: string; createdAt: number }>;
  minuteRequests: Map<string, number[]>;
  dailyRequests: Map<string, number>;
};

const globalRuntime = globalThis as typeof globalThis & {
  __plaveAiTutorRuntime?: RuntimeState;
};

const runtimeState: RuntimeState =
  globalRuntime.__plaveAiTutorRuntime ?? {
    conversationOwners: new Map(),
    activeConversations: new Set(),
    seenMessages: new Map(),
    minuteRequests: new Map(),
    dailyRequests: new Map(),
  };

globalRuntime.__plaveAiTutorRuntime = runtimeState;

export type TutorStartFailure = Readonly<{
  ok: false;
  code: TutorErrorCode;
  retryable: boolean;
}>;

export type TutorStartSuccess = Readonly<{
  ok: true;
  stream: AsyncIterable<TutorStreamEvent>;
}>;

function fingerprint(value: string) {
  return createHash("sha256").update(`plave-ai-tutor:${value}`).digest("hex");
}

function requestSignature(input: TutorClientRequest) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        conversationId: input.conversationId,
        messageId: input.messageId,
        message: input.message,
        history: input.history,
        context: input.context ?? null,
        responseMode: input.responseMode ?? null,
      }),
    )
    .digest("hex");
}

function prune(now: number) {
  const oneDayAgo = now - 86_400_000;
  for (const [key, item] of runtimeState.seenMessages) {
    if (item.createdAt < oneDayAgo) runtimeState.seenMessages.delete(key);
  }
  for (const [key, item] of runtimeState.conversationOwners) {
    if (item.touchedAt < oneDayAgo && !runtimeState.activeConversations.has(key)) {
      runtimeState.conversationOwners.delete(key);
    }
  }
}

function consumeRateLimit(owner: string, config: AiTutorConfig, now: number) {
  const minute = (runtimeState.minuteRequests.get(owner) ?? []).filter(
    (timestamp) => timestamp > now - 60_000,
  );
  if (minute.length >= config.requestsPerMinute) {
    runtimeState.minuteRequests.set(owner, minute);
    return "AI_RATE_LIMITED" as const;
  }
  const dayKey = `${owner}:${new Date(now).toISOString().slice(0, 10)}`;
  const daily = runtimeState.dailyRequests.get(dayKey) ?? 0;
  if (daily >= config.dailyRequestLimit) return "AI_DAILY_LIMIT_REACHED" as const;
  minute.push(now);
  runtimeState.minuteRequests.set(owner, minute);
  runtimeState.dailyRequests.set(dayKey, daily + 1);
  return null;
}

function publicError(code: TutorErrorCode): TutorStreamEvent {
  const messages: Partial<Record<TutorErrorCode, string>> = {
    AI_RESPONSE_TRUNCATED:
      "Câu trả lời bị gián đoạn trước khi hoàn tất. Em có thể yêu cầu tiếp tục.",
    AI_PROVIDER_TIMEOUT: "AI Tutor mất quá nhiều thời gian để trả lời. Em có thể thử lại sau.",
    AI_STREAM_INTERRUPTED:
      "Kết nối phản hồi bị gián đoạn. Phần đã nhận vẫn được giữ lại.",
    AI_SAFETY_BLOCKED:
      "Phản hồi đã dừng vì bộ lọc an toàn. Em hãy diễn đạt lại câu hỏi Toán.",
    AI_EMPTY_RESPONSE:
      "AI Tutor chưa tạo được nội dung. Em có thể thử lại.",
    AI_STREAM_ABORTED: "Đã dừng câu trả lời theo yêu cầu của em.",
    AI_MALFORMED_PROVIDER_EVENT: "Phản hồi AI không đúng định dạng an toàn.",
  };
  return {
    type: "error",
    code,
    message: messages[code] ?? "AI Tutor chưa thể trả lời lúc này. Em có thể thử lại.",
    retryable: [
      "AI_RESPONSE_TRUNCATED",
      "AI_PROVIDER_TIMEOUT",
      "AI_STREAM_INTERRUPTED",
      "AI_EMPTY_RESPONSE",
      "AI_PROVIDER_ERROR",
    ].includes(code),
  };
}

function logUsage(input: {
  provider: string;
  model: string;
  startedAt: number;
  usage: TutorUsage | null;
  metrics: TutorLatencyMetrics | null;
  outcome: "SUCCESS" | "ERROR" | "ABORTED";
  errorClass?: string;
}) {
  console.info(
    JSON.stringify({
      event: "ai_tutor_usage",
      provider: input.provider,
      model: input.model,
      timestamp: new Date().toISOString(),
      latencyMs: Math.max(0, Date.now() - input.startedAt),
      inputTokens: input.usage?.inputTokens ?? null,
      outputTokens: input.usage?.outputTokens ?? null,
      thinkingTokens: input.usage?.thinkingTokens ?? null,
      totalTokens: input.usage?.totalTokens ?? null,
      requestAcceptedAtEpochMs:
        input.metrics?.requestAcceptedAtEpochMs ?? null,
      requestAcceptedToProviderStartMs:
        input.metrics?.requestAcceptedToProviderStartMs ?? null,
      authContextMs: input.metrics?.authContextMs ?? null,
      supabaseClientMs: input.metrics?.supabaseClientMs ?? null,
      authUserMs: input.metrics?.authUserMs ?? null,
      profileMs: input.metrics?.profileMs ?? null,
      studentProfileMs: input.metrics?.studentProfileMs ?? null,
      serverPreparationMs: input.metrics?.serverPreparationMs ?? null,
      providerTimeToFirstChunkMs:
        input.metrics?.providerTimeToFirstChunkMs ?? null,
      providerTimeToFirstTextMs:
        input.metrics?.providerTimeToFirstTextMs ?? null,
      providerTotalGenerationMs:
        input.metrics?.providerTotalGenerationMs ?? null,
      streamBufferingMs: input.metrics?.streamBufferingMs ?? null,
      chunkCount: input.metrics?.chunkCount ?? 0,
      finishReason: input.metrics?.finishReason ?? null,
      outcome: input.outcome,
      errorClass: input.errorClass ?? null,
    }),
  );
}

async function* localResponse(
  messageId: string,
  text: string,
): AsyncIterable<TutorStreamEvent> {
  yield { type: "message_start", messageId };
  yield { type: "text_delta", delta: text };
  yield { type: "message_complete", messageId };
}

export function startAuthenticatedTutorStream(input: Readonly<{
  userId: string;
  grade: number;
  clientRequest: TutorClientRequest;
  config: AiTutorConfig;
  provider: AiTutorProvider;
  requestSignal: AbortSignal;
  timings?: Readonly<{
    requestAcceptedAt: number;
    authContextMs: number;
    supabaseClientMs: number | null;
    authUserMs: number | null;
    profileMs: number | null;
    studentProfileMs: number | null;
    serverPreparationMs: number;
  }>;
}>): TutorStartFailure | TutorStartSuccess {
  const now = Date.now();
  prune(now);
  const owner = fingerprint(input.userId);
  const conversationKey = input.clientRequest.conversationId;
  const boundOwner = runtimeState.conversationOwners.get(conversationKey);
  if (boundOwner && boundOwner.owner !== owner) {
    return { ok: false, code: "AI_CONVERSATION_FORBIDDEN", retryable: false };
  }
  runtimeState.conversationOwners.set(conversationKey, { owner, touchedAt: now });
  const activeKey = `${owner}:${conversationKey}`;
  if (runtimeState.activeConversations.has(activeKey)) {
    return { ok: false, code: "AI_CONCURRENT_REQUEST", retryable: false };
  }
  const messageKey = `${activeKey}:${input.clientRequest.messageId}`;
  const signature = requestSignature(input.clientRequest);
  const previous = runtimeState.seenMessages.get(messageKey);
  if (previous) {
    return { ok: false, code: "AI_DUPLICATE_REQUEST", retryable: false };
  }
  const rateFailure = consumeRateLimit(owner, input.config, now);
  if (rateFailure) return { ok: false, code: rateFailure, retryable: true };
  runtimeState.seenMessages.set(messageKey, { signature, createdAt: now });
  runtimeState.activeConversations.add(activeKey);

  const safety = evaluateTutorSafety(input.clientRequest.message);
  if (safety.action === "LOCAL_RESPONSE") {
    return {
      ok: true,
      stream: (async function* () {
        try {
          yield* localResponse(input.clientRequest.messageId, safety.text);
        } finally {
          runtimeState.activeConversations.delete(activeKey);
        }
      })(),
    };
  }

  return {
    ok: true,
    stream: (async function* () {
      const startedAt = Date.now();
      const timeoutController = new AbortController();
      let timedOut = false;
      const abortFromClient = () => timeoutController.abort();
      if (input.requestSignal.aborted) timeoutController.abort();
      else input.requestSignal.addEventListener("abort", abortFromClient, { once: true });
      const timeout = setTimeout(() => {
        timedOut = true;
        timeoutController.abort();
      }, input.config.timeoutMs);
      let usage: TutorUsage | null = null;
      let metrics: TutorLatencyMetrics | null = null;
      let complete = false;
      const generationPlan = buildTutorGenerationPlan({
        message: input.clientRequest.message,
        grade: input.grade,
        preferredMode: input.clientRequest.responseMode,
        configuredMaxOutputTokens: input.config.maxOutputTokens,
      });
      const providerStartedAt = performance.now();
      const providerStartedAtWallClock = Date.now();
      let runtimeFirstTextMs: number | null = null;
      const providerRequest: TutorRequest = {
        ...input.clientRequest,
        grade: input.grade,
        safetyIdentifier: `plave_${owner.slice(0, 32)}`,
        responseMode: generationPlan.responseMode,
        complexity: generationPlan.complexity,
        thinkingLevel: generationPlan.thinkingLevel,
        maxOutputTokens: generationPlan.maxOutputTokens,
        timeoutMs: input.config.timeoutMs,
        signal: timeoutController.signal,
      };
      try {
        for await (const event of input.provider.streamTutorResponse(providerRequest)) {
          if (!isTutorStreamEvent(event)) {
            throw new AiTutorProviderError("AI_MALFORMED_PROVIDER_EVENT");
          }
          if (event.type === "usage") usage = event.usage;
          if (event.type === "text_delta" && runtimeFirstTextMs === null) {
            runtimeFirstTextMs = performance.now() - providerStartedAt;
          }
          if (event.type === "metrics") {
            const requestAcceptedToProviderStartMs = input.timings
              ? Math.max(
                  0,
                  providerStartedAtWallClock -
                    input.timings.requestAcceptedAt,
                )
              : null;
            const buffering =
              runtimeFirstTextMs === null ||
              event.metrics.providerTimeToFirstTextMs === null
                ? null
                : Math.max(
                    0,
                    runtimeFirstTextMs -
                      event.metrics.providerTimeToFirstTextMs,
                  );
            metrics = {
              ...event.metrics,
              requestAcceptedAtEpochMs:
                input.timings?.requestAcceptedAt ?? null,
              requestAcceptedToProviderStartMs,
              authContextMs: input.timings?.authContextMs ?? null,
              supabaseClientMs:
                input.timings?.supabaseClientMs ?? null,
              authUserMs: input.timings?.authUserMs ?? null,
              profileMs: input.timings?.profileMs ?? null,
              studentProfileMs:
                input.timings?.studentProfileMs ?? null,
              serverPreparationMs:
                input.timings?.serverPreparationMs ?? null,
              runtimeTimeToFirstTextMs: runtimeFirstTextMs,
              streamBufferingMs: buffering,
            };
            yield { type: "metrics", metrics };
            continue;
          }
          if (event.type === "message_complete") complete = true;
          yield event;
        }
        if (!complete) {
          const code = timedOut
            ? "AI_PROVIDER_TIMEOUT"
            : input.requestSignal.aborted
              ? "AI_STREAM_ABORTED"
              : "AI_STREAM_INTERRUPTED";
          yield publicError(code);
          logUsage({
            provider: input.provider.id,
            model: input.provider.model,
            startedAt,
            usage,
            metrics,
            outcome: code === "AI_STREAM_ABORTED" ? "ABORTED" : "ERROR",
            errorClass: code,
          });
          return;
        }
        logUsage({
          provider: input.provider.id,
          model: input.provider.model,
          startedAt,
          usage,
          metrics,
          outcome: "SUCCESS",
        });
      } catch (error) {
        const code: TutorErrorCode = timedOut
          ? "AI_PROVIDER_TIMEOUT"
          : input.requestSignal.aborted
            ? "AI_STREAM_ABORTED"
            : error instanceof AiTutorProviderError
              ? error.code
              : "AI_PROVIDER_ERROR";
        yield publicError(code);
        logUsage({
          provider: input.provider.id,
          model: input.provider.model,
          startedAt,
          usage,
          metrics,
          outcome: code === "AI_STREAM_ABORTED" ? "ABORTED" : "ERROR",
          errorClass: code,
        });
      } finally {
        clearTimeout(timeout);
        input.requestSignal.removeEventListener("abort", abortFromClient);
        runtimeState.activeConversations.delete(activeKey);
      }
    })(),
  };
}

export function resetAiTutorRuntimeForTests() {
  runtimeState.conversationOwners.clear();
  runtimeState.activeConversations.clear();
  runtimeState.seenMessages.clear();
  runtimeState.minuteRequests.clear();
  runtimeState.dailyRequests.clear();
}
