export const AI_TUTOR_PROVIDERS = ["OPENAI", "GOOGLE", "DEEPSEEK"] as const;

export type AiTutorProviderId = (typeof AI_TUTOR_PROVIDERS)[number];

export const AI_TUTOR_RESPONSE_MODES = [
  "HINT",
  "EXPLAIN",
  "EXAMPLE",
  "CHECK_MY_WORK",
  "FULL_SOLUTION",
] as const;

export type TutorResponseMode =
  (typeof AI_TUTOR_RESPONSE_MODES)[number];

export const AI_TUTOR_COMPLEXITY_TIERS = [
  "SIMPLE",
  "STANDARD",
  "ADVANCED",
] as const;

export type TutorComplexity =
  (typeof AI_TUTOR_COMPLEXITY_TIERS)[number];

export type TutorThinkingLevel = "minimal" | "low" | "medium";

export type TutorMessage = Readonly<{
  role: "user" | "assistant";
  content: string;
}>;

export type TutorPublicContext = Readonly<{
  lessonTitle?: string;
  outcomeTitle?: string;
  publicQuestion?: string;
  studentAnswer?: string;
  publicFeedback?: string;
  answerSubmitted?: boolean;
}>;

export type TutorClientRequest = Readonly<{
  conversationId: string;
  messageId: string;
  message: string;
  history: TutorMessage[];
  context?: TutorPublicContext;
  responseMode?: TutorResponseMode;
}>;

export type TutorRequest = TutorClientRequest &
  Readonly<{
    grade: number;
    safetyIdentifier: string;
    maxOutputTokens: number;
    responseMode: TutorResponseMode;
    complexity: TutorComplexity;
    thinkingLevel: TutorThinkingLevel;
    timeoutMs: number;
    signal: AbortSignal;
  }>;

export type TutorErrorCode =
  | "AI_TUTOR_DISABLED"
  | "AI_CONFIGURATION_INVALID"
  | "AI_PROVIDER_NOT_IMPLEMENTED"
  | "AI_AUTH_REQUIRED"
  | "AI_STUDENT_ONLY"
  | "AI_INVALID_REQUEST"
  | "AI_REQUEST_TOO_LARGE"
  | "AI_HISTORY_LIMIT"
  | "AI_RATE_LIMITED"
  | "AI_DAILY_LIMIT_REACHED"
  | "AI_CONCURRENT_REQUEST"
  | "AI_DUPLICATE_REQUEST"
  | "AI_CONVERSATION_FORBIDDEN"
  | "AI_SAFETY_BLOCKED"
  | "AI_RESPONSE_TRUNCATED"
  | "AI_PROVIDER_TIMEOUT"
  | "AI_STREAM_INTERRUPTED"
  | "AI_EMPTY_RESPONSE"
  | "AI_PROVIDER_ERROR"
  | "AI_STREAM_ABORTED"
  | "AI_MALFORMED_PROVIDER_EVENT";

export const AI_TUTOR_ERROR_CODES = [
  "AI_TUTOR_DISABLED",
  "AI_CONFIGURATION_INVALID",
  "AI_PROVIDER_NOT_IMPLEMENTED",
  "AI_AUTH_REQUIRED",
  "AI_STUDENT_ONLY",
  "AI_INVALID_REQUEST",
  "AI_REQUEST_TOO_LARGE",
  "AI_HISTORY_LIMIT",
  "AI_RATE_LIMITED",
  "AI_DAILY_LIMIT_REACHED",
  "AI_CONCURRENT_REQUEST",
  "AI_DUPLICATE_REQUEST",
  "AI_CONVERSATION_FORBIDDEN",
  "AI_SAFETY_BLOCKED",
  "AI_RESPONSE_TRUNCATED",
  "AI_PROVIDER_TIMEOUT",
  "AI_STREAM_INTERRUPTED",
  "AI_EMPTY_RESPONSE",
  "AI_PROVIDER_ERROR",
  "AI_STREAM_ABORTED",
  "AI_MALFORMED_PROVIDER_EVENT",
] as const satisfies readonly TutorErrorCode[];

export type TutorUsage = Readonly<{
  provider: AiTutorProviderId;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  thinkingTokens: number | null;
  totalTokens: number | null;
}>;

export type TutorLatencyMetrics = Readonly<{
  requestAcceptedAtEpochMs: number | null;
  requestAcceptedToProviderStartMs: number | null;
  authContextMs: number | null;
  supabaseClientMs: number | null;
  authUserMs: number | null;
  profileMs: number | null;
  studentProfileMs: number | null;
  serverPreparationMs: number | null;
  providerTimeToFirstChunkMs: number | null;
  providerTimeToFirstTextMs: number | null;
  providerTotalGenerationMs: number;
  runtimeTimeToFirstTextMs: number | null;
  streamBufferingMs: number | null;
  chunkCount: number;
  textDeltaCount: number;
  finishReason: string;
  responseMode: TutorResponseMode;
  complexity: TutorComplexity;
  thinkingLevel: TutorThinkingLevel;
}>;

export type TutorStreamEvent =
  | Readonly<{ type: "message_start"; messageId: string }>
  | Readonly<{ type: "text_delta"; delta: string }>
  | Readonly<{ type: "message_complete"; messageId: string }>
  | Readonly<{ type: "usage"; usage: TutorUsage }>
  | Readonly<{ type: "metrics"; metrics: TutorLatencyMetrics }>
  | Readonly<{
      type: "error";
      code: TutorErrorCode;
      message: string;
      retryable: boolean;
    }>;

export type TutorRequestLimits = Readonly<{
  maxMessageCharacters: number;
  maxHistoryTurns: number;
  maxRequestBytes: number;
}>;

const IDENTIFIER_PATTERN = /^[a-zA-Z0-9_-]{12,80}$/u;
const ROOT_KEYS = new Set([
  "conversationId",
  "messageId",
  "message",
  "history",
  "context",
  "responseMode",
]);
const CONTEXT_KEYS = new Set([
  "lessonTitle",
  "outcomeTitle",
  "publicQuestion",
  "studentAnswer",
  "publicFeedback",
  "answerSubmitted",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: Set<string>) {
  return Object.keys(value).every((key) => keys.has(key));
}

function normalizeText(value: unknown, maximum: number) {
  if (typeof value !== "string") return null;
  const normalized = value
    .replace(/\r\n?/gu, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, "")
    .trim();
  if (!normalized || normalized.length > maximum) return null;
  return normalized;
}

function parsePublicContext(value: unknown): TutorPublicContext | null {
  if (value === undefined) return {};
  if (!isRecord(value) || !hasOnlyKeys(value, CONTEXT_KEYS)) return null;
  const answerSubmitted = value.answerSubmitted === true;
  const result: TutorPublicContext = {
    answerSubmitted,
  };
  for (const key of [
    "lessonTitle",
    "outcomeTitle",
    "publicQuestion",
    "publicFeedback",
  ] as const) {
    if (value[key] === undefined) continue;
    const parsed = normalizeText(value[key], 1_500);
    if (!parsed) return null;
    Object.assign(result, { [key]: parsed });
  }
  if (value.studentAnswer !== undefined) {
    if (!answerSubmitted) return null;
    const answer = normalizeText(value.studentAnswer, 500);
    if (!answer) return null;
    Object.assign(result, { studentAnswer: answer });
  }
  return result;
}

export type ParseTutorRequestResult =
  | Readonly<{ ok: true; value: TutorClientRequest }>
  | Readonly<{ ok: false; code: TutorErrorCode }>;

export function parseTutorClientRequest(
  value: unknown,
  limits: TutorRequestLimits,
): ParseTutorRequestResult {
  if (!isRecord(value) || !hasOnlyKeys(value, ROOT_KEYS)) {
    return { ok: false, code: "AI_INVALID_REQUEST" };
  }
  if (
    typeof value.conversationId !== "string" ||
    !IDENTIFIER_PATTERN.test(value.conversationId) ||
    typeof value.messageId !== "string" ||
    !IDENTIFIER_PATTERN.test(value.messageId)
  ) {
    return { ok: false, code: "AI_INVALID_REQUEST" };
  }
  const message = normalizeText(value.message, limits.maxMessageCharacters);
  if (!message) return { ok: false, code: "AI_REQUEST_TOO_LARGE" };
  if (!Array.isArray(value.history)) {
    return { ok: false, code: "AI_INVALID_REQUEST" };
  }
  if (value.history.length > limits.maxHistoryTurns * 2) {
    return { ok: false, code: "AI_HISTORY_LIMIT" };
  }
  const history: TutorMessage[] = [];
  for (const item of value.history) {
    if (
      !isRecord(item) ||
      !hasOnlyKeys(item, new Set(["role", "content"])) ||
      (item.role !== "user" && item.role !== "assistant")
    ) {
      return { ok: false, code: "AI_INVALID_REQUEST" };
    }
    const content = normalizeText(item.content, 6_000);
    if (!content) return { ok: false, code: "AI_HISTORY_LIMIT" };
    history.push({ role: item.role, content });
  }
  const context = parsePublicContext(value.context);
  if (!context) return { ok: false, code: "AI_INVALID_REQUEST" };
  if (
    value.responseMode !== undefined &&
    !AI_TUTOR_RESPONSE_MODES.includes(
      value.responseMode as TutorResponseMode,
    )
  ) {
    return { ok: false, code: "AI_INVALID_REQUEST" };
  }
  return {
    ok: true,
    value: {
      conversationId: value.conversationId,
      messageId: value.messageId,
      message,
      history,
      context,
      ...(value.responseMode === undefined
        ? {}
        : { responseMode: value.responseMode as TutorResponseMode }),
    },
  };
}

export function isTutorStreamEvent(value: unknown): value is TutorStreamEvent {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (value.type === "message_start" || value.type === "message_complete") {
    return (
      hasOnlyKeys(value, new Set(["type", "messageId"])) &&
      typeof value.messageId === "string" &&
      IDENTIFIER_PATTERN.test(value.messageId)
    );
  }
  if (value.type === "text_delta") {
    return (
      hasOnlyKeys(value, new Set(["type", "delta"])) &&
      typeof value.delta === "string" &&
      value.delta.length > 0 &&
      value.delta.length <= 16_000
    );
  }
  if (value.type === "usage") {
    const usage = value.usage;
    const validCount = (count: unknown) =>
      count === null ||
      (typeof count === "number" && Number.isSafeInteger(count) && count >= 0);
    return (
      hasOnlyKeys(value, new Set(["type", "usage"])) &&
      isRecord(usage) &&
      hasOnlyKeys(
        usage,
        new Set([
          "provider",
          "model",
          "inputTokens",
          "outputTokens",
          "thinkingTokens",
          "totalTokens",
        ]),
      ) &&
      AI_TUTOR_PROVIDERS.includes(usage.provider as AiTutorProviderId) &&
      typeof usage.model === "string" &&
      usage.model.length > 0 &&
      usage.model.length <= 80 &&
      validCount(usage.inputTokens) &&
      validCount(usage.outputTokens) &&
      validCount(usage.thinkingTokens) &&
      validCount(usage.totalTokens)
    );
  }
  if (value.type === "metrics") {
    const metrics = value.metrics;
    const nullableDuration = (duration: unknown) =>
      duration === null ||
      (typeof duration === "number" &&
        Number.isFinite(duration) &&
        duration >= 0);
    const count = (item: unknown) =>
      typeof item === "number" &&
      Number.isSafeInteger(item) &&
      item >= 0;
    if (!isRecord(metrics)) return false;
    return (
      hasOnlyKeys(
        metrics,
        new Set([
          "requestAcceptedToProviderStartMs",
          "requestAcceptedAtEpochMs",
          "authContextMs",
          "supabaseClientMs",
          "authUserMs",
          "profileMs",
          "studentProfileMs",
          "serverPreparationMs",
          "providerTimeToFirstChunkMs",
          "providerTimeToFirstTextMs",
          "providerTotalGenerationMs",
          "runtimeTimeToFirstTextMs",
          "streamBufferingMs",
          "chunkCount",
          "textDeltaCount",
          "finishReason",
          "responseMode",
          "complexity",
          "thinkingLevel",
        ]),
      ) &&
      nullableDuration(metrics.requestAcceptedAtEpochMs) &&
      nullableDuration(metrics.requestAcceptedToProviderStartMs) &&
      nullableDuration(metrics.authContextMs) &&
      nullableDuration(metrics.supabaseClientMs) &&
      nullableDuration(metrics.authUserMs) &&
      nullableDuration(metrics.profileMs) &&
      nullableDuration(metrics.studentProfileMs) &&
      nullableDuration(metrics.serverPreparationMs) &&
      nullableDuration(metrics.providerTimeToFirstChunkMs) &&
      nullableDuration(metrics.providerTimeToFirstTextMs) &&
      nullableDuration(metrics.providerTotalGenerationMs) &&
      nullableDuration(metrics.runtimeTimeToFirstTextMs) &&
      nullableDuration(metrics.streamBufferingMs) &&
      count(metrics.chunkCount) &&
      count(metrics.textDeltaCount) &&
      typeof metrics.finishReason === "string" &&
      metrics.finishReason.length > 0 &&
      metrics.finishReason.length <= 80 &&
      AI_TUTOR_RESPONSE_MODES.includes(
        metrics.responseMode as TutorResponseMode,
      ) &&
      AI_TUTOR_COMPLEXITY_TIERS.includes(
        metrics.complexity as TutorComplexity,
      ) &&
      ["minimal", "low", "medium"].includes(
        metrics.thinkingLevel as TutorThinkingLevel,
      )
    );
  }
  if (value.type === "error") {
    return (
      hasOnlyKeys(value, new Set(["type", "code", "message", "retryable"])) &&
      typeof value.code === "string" &&
      AI_TUTOR_ERROR_CODES.includes(value.code as TutorErrorCode) &&
      typeof value.message === "string" &&
      value.message.length > 0 &&
      value.message.length <= 500 &&
      typeof value.retryable === "boolean"
    );
  }
  return false;
}
