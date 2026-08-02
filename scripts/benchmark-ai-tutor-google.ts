import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { GoogleGenAI } from "@google/genai";

import { getAiTutorConfiguration } from "../lib/ai-tutor/config-values.ts";
import { getAiTutorProviderSecret } from "../lib/ai-tutor/config.ts";
import type {
  TutorErrorCode,
  TutorRequest,
  TutorResponseMode,
  TutorStreamEvent,
} from "../lib/ai-tutor/contracts.ts";
import { GoogleAiTutorProvider } from "../lib/ai-tutor/google-provider.ts";
import { buildTutorGenerationPlan } from "../lib/ai-tutor/prompt.ts";
import { evaluateTutorResponseCompleteness } from "../lib/ai-tutor/response-quality.ts";
import { assertProject004Workspace } from "./project004-identity.ts";

const MODELS = [
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
] as const;
const MAX_PAID_REQUESTS = 6;
const root = assertProject004Workspace();
const artifactDirectory = resolve(root, "artifacts/ai-tutor-quality");

type PromptDefinition = Readonly<{
  id: "ADDITION_WITH_CARRYING" | "FRACTION_COMPARISON";
  grade: number;
  mode: TutorResponseMode;
  message: string;
}>;

const PROMPTS: readonly PromptDefinition[] = [
  {
    id: "ADDITION_WITH_CARRYING",
    grade: 2,
    mode: "HINT",
    message:
      "Em cần một gợi ý để tự làm phép cộng có nhớ 27 + 15. Đừng cho đáp án cuối ngay; hãy cho bước đầu tiên và hỏi em một câu nhỏ.",
  },
  {
    id: "FRACTION_COMPARISON",
    grade: 7,
    mode: "EXPLAIN",
    message:
      "Giải thích từng bước cách so sánh 3/4 và 2/3, có ví dụ, lỗi thường gặp và một câu kiểm tra hiểu bài.",
  },
];

function round(value: number | null) {
  return value === null ? null : Math.round(value * 10) / 10;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function stableError(error: unknown): TutorErrorCode | "AI_BENCHMARK_FAILED" {
  if (error instanceof Error && /^AI_[A-Z0-9_]+$/u.test(error.message)) {
    return error.message as TutorErrorCode;
  }
  return "AI_BENCHMARK_FAILED";
}

function reviewResponse(prompt: PromptDefinition, output: string) {
  const completion = evaluateTutorResponseCompleteness(output, prompt.mode);
  const normalized = output.normalize("NFC");
  if (prompt.id === "ADDITION_WITH_CARRYING") {
    const finalAnswerLeaked = /(?:27\s*\+\s*15\s*=\s*42|kết quả(?: cuối)?(?: là|:)\s*42)/iu.test(
      normalized,
    );
    const mathEvidence = /7\s*\+\s*5|hàng đơn vị|nhớ\s*(?:1|một)/iu.test(
      normalized,
    );
    return {
      ...completion,
      mathematicalCorrectness: mathEvidence && !finalAnswerLeaked,
      vietnameseTutoringQuality:
        completion.hasAction && completion.hasGuidingQuestion,
      gradeAppropriate: !/(đồng dư|ma trận|đạo hàm|tích phân)/iu.test(normalized),
      hintDidNotRevealFinalAnswer: !finalAnswerLeaked,
    };
  }
  const comparisonCorrect =
    /(?:3\s*\/\s*4).{0,80}(?:lớn hơn|>|greater).{0,80}(?:2\s*\/\s*3)|(?:9\s*\/\s*12).{0,80}(?:8\s*\/\s*12)/isu.test(
      normalized,
    );
  const methodEvidence =
    /(?:quy đồng|mẫu chung|nhân chéo|9\s*\/\s*12|8\s*\/\s*12)/iu.test(
      normalized,
    );
  return {
    ...completion,
    mathematicalCorrectness: comparisonCorrect && methodEvidence,
    vietnameseTutoringQuality:
      completion.hasStructure && completion.hasGuidingQuestion,
    gradeAppropriate: !/(đạo hàm|tích phân|không gian Hilbert)/iu.test(normalized),
    hintDidNotRevealFinalAnswer: null,
  };
}

async function listAvailableModels(apiKey: string) {
  const client = new GoogleGenAI({ apiKey });
  const available = new Map<
    string,
    Readonly<{ generateContent: boolean; outputTokenLimit: number | null }>
  >();
  const pager = await client.models.list({ config: { pageSize: 100 } });
  for await (const model of pager) {
    const id = model.name?.replace(/^models\//u, "") ?? "";
    if (!MODELS.includes(id as (typeof MODELS)[number])) continue;
    available.set(id, {
      generateContent: model.supportedActions?.includes("generateContent") ?? false,
      outputTokenLimit:
        typeof model.outputTokenLimit === "number" ? model.outputTokenLimit : null,
    });
  }
  return available;
}

async function runRequest(input: {
  apiKey: string;
  model: (typeof MODELS)[number];
  prompt: PromptDefinition;
  index: number;
}) {
  const plan = buildTutorGenerationPlan({
    message: input.prompt.message,
    grade: input.prompt.grade,
    preferredMode: input.prompt.mode,
    configuredMaxOutputTokens: 4_096,
  });
  const request: TutorRequest = {
    conversationId: `conversation_benchmark_${String(input.index).padStart(4, "0")}`,
    messageId: `message_benchmark_${String(input.index).padStart(6, "0")}`,
    message: input.prompt.message,
    history: [],
    grade: input.prompt.grade,
    safetyIdentifier: "plave_bounded_model_benchmark",
    responseMode: plan.responseMode,
    complexity: plan.complexity,
    thinkingLevel: plan.thinkingLevel,
    maxOutputTokens: plan.maxOutputTokens,
    timeoutMs: 30_000,
    signal: new AbortController().signal,
  };
  const provider = new GoogleAiTutorProvider({
    apiKey: input.apiKey,
    model: input.model,
    timeoutMs: request.timeoutMs,
  });
  const events: TutorStreamEvent[] = [];
  let output = "";
  let errorCode: string | null = null;
  try {
    for await (const event of provider.streamTutorResponse(request)) {
      events.push(event);
      if (event.type === "text_delta") output += event.delta;
    }
  } catch (error) {
    errorCode = stableError(error);
  }
  const metrics = events.find(
    (event): event is Extract<TutorStreamEvent, { type: "metrics" }> =>
      event.type === "metrics",
  )?.metrics ?? null;
  const usage = events.find(
    (event): event is Extract<TutorStreamEvent, { type: "usage" }> =>
      event.type === "usage",
  )?.usage ?? null;
  const review = reviewResponse(input.prompt, output);
  return {
    model: input.model,
    promptId: input.prompt.id,
    responseMode: plan.responseMode,
    complexity: plan.complexity,
    thinkingLevel: plan.thinkingLevel,
    maxOutputTokens: plan.maxOutputTokens,
    completed:
      events.some((event) => event.type === "message_complete") && !errorCode,
    errorCode,
    timeToFirstProviderChunkMs: round(
      metrics?.providerTimeToFirstChunkMs ?? null,
    ),
    timeToFirstVisibleTokenMs: round(
      metrics?.providerTimeToFirstTextMs ?? null,
    ),
    totalLatencyMs: round(metrics?.providerTotalGenerationMs ?? null),
    chunkCount: metrics?.chunkCount ?? 0,
    textDeltaCount: metrics?.textDeltaCount ?? 0,
    finishReason: metrics?.finishReason ?? null,
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
    thinkingTokens: usage?.thinkingTokens ?? null,
    totalTokens: usage?.totalTokens ?? null,
    outputCharacters: output.length,
    outputWords: review.wordCount,
    completeness: review.complete,
    terminalPunctuation: review.hasTerminalPunctuation,
    mathematicalCorrectness: review.mathematicalCorrectness,
    vietnameseTutoringQuality: review.vietnameseTutoringQuality,
    gradeAppropriate: review.gradeAppropriate,
    hintDidNotRevealFinalAnswer: review.hintDidNotRevealFinalAnswer,
    responseTextStored: false,
  };
}

function aggregate(
  model: (typeof MODELS)[number],
  results: Awaited<ReturnType<typeof runRequest>>[],
) {
  const modelResults = results.filter((result) => result.model === model);
  const reviewedPass = modelResults.filter(
    (result) =>
      result.completed &&
      result.completeness &&
      result.mathematicalCorrectness &&
      result.vietnameseTutoringQuality &&
      result.gradeAppropriate &&
      result.hintDidNotRevealFinalAnswer !== false,
  ).length;
  return {
    model,
    requests: modelResults.length,
    completed: modelResults.filter((result) => result.completed).length,
    reviewedPass,
    medianTimeToFirstVisibleTokenMs: round(
      median(
        modelResults.flatMap((result) =>
          result.timeToFirstVisibleTokenMs === null
            ? []
            : [result.timeToFirstVisibleTokenMs],
        ),
      ),
    ),
    medianTotalLatencyMs: round(
      median(
        modelResults.flatMap((result) =>
          result.totalLatencyMs === null ? [] : [result.totalLatencyMs],
        ),
      ),
    ),
    inputTokens: modelResults.reduce(
      (sum, result) => sum + (result.inputTokens ?? 0),
      0,
    ),
    outputTokens: modelResults.reduce(
      (sum, result) => sum + (result.outputTokens ?? 0),
      0,
    ),
    thinkingTokens: modelResults.reduce(
      (sum, result) => sum + (result.thinkingTokens ?? 0),
      0,
    ),
  };
}

function writeJson(name: string, value: unknown) {
  writeFileSync(
    resolve(artifactDirectory, name),
    `${JSON.stringify(value, null, 2)}\n`,
    { mode: 0o600 },
  );
}

async function main() {
  mkdirSync(resolve(artifactDirectory, "screenshots"), { recursive: true });
  const configuration = getAiTutorConfiguration(process.env);
  if (!configuration.ok || configuration.config.provider !== "GOOGLE") {
    throw new Error("AI_CONFIGURATION_INVALID");
  }
  if (configuration.config.testMode) throw new Error("AI_REAL_PROVIDER_REQUIRED");
  const apiKey = getAiTutorProviderSecret("GOOGLE");

  const listed = await listAvailableModels(apiKey);
  const availability = MODELS.map((model) => ({
    model,
    listed: listed.has(model),
    generateContent: listed.get(model)?.generateContent ?? false,
    outputTokenLimit: listed.get(model)?.outputTokenLimit ?? null,
  }));
  if (availability.some((model) => !model.listed || !model.generateContent)) {
    writeJson("model-benchmark.json", {
      status: "BLOCKED_MODEL_UNAVAILABLE",
      officialAccountListingVerified: true,
      availability,
      paidRequestsAttempted: 0,
      maximumPaidRequests: MAX_PAID_REQUESTS,
      promptsOrResponsesStored: false,
      secretsLogged: false,
    });
    throw new Error("AI_MODEL_UNAVAILABLE");
  }

  const results: Awaited<ReturnType<typeof runRequest>>[] = [];
  for (const model of MODELS) {
    for (const prompt of PROMPTS) {
      if (results.length >= MAX_PAID_REQUESTS) {
        throw new Error("AI_BENCHMARK_REQUEST_BOUND_EXCEEDED");
      }
      results.push(
        await runRequest({
          apiKey,
          model,
          prompt,
          index: results.length + 1,
        }),
      );
    }
  }
  const models = MODELS.map((model) => aggregate(model, results));
  const ranked = [...models].sort(
    (left, right) =>
      right.reviewedPass - left.reviewedPass ||
      right.completed - left.completed ||
      (left.medianTotalLatencyMs ?? Number.POSITIVE_INFINITY) -
        (right.medianTotalLatencyMs ?? Number.POSITIVE_INFINITY) ||
      (left.medianTimeToFirstVisibleTokenMs ?? Number.POSITIVE_INFINITY) -
        (right.medianTimeToFirstVisibleTokenMs ?? Number.POSITIVE_INFINITY),
  );
  const selected = ranked[0] ?? null;
  const selectedSimple = results.find(
    (result) =>
      result.model === selected?.model &&
      result.promptId === "ADDITION_WITH_CARRYING",
  );
  const qualityPass = selected?.reviewedPass === PROMPTS.length;
  const latencyPass = Boolean(
    selectedSimple?.timeToFirstVisibleTokenMs !== null &&
      selectedSimple?.timeToFirstVisibleTokenMs !== undefined &&
      selectedSimple.timeToFirstVisibleTokenMs <= 4_000 &&
      selectedSimple.totalLatencyMs !== null &&
      selectedSimple.totalLatencyMs <= 10_000,
  );
  const status = qualityPass
    ? latencyPass
      ? "PASS"
      : "QUALITY_PASS_LATENCY_TARGET_MISSED"
    : "QUALITY_REVIEW_FAILED";

  writeJson("model-benchmark.json", {
    status,
    generatedAt: new Date().toISOString(),
    sdk: "@google/genai",
    officialAccountListingVerified: true,
    availability,
    fixedPromptIds: PROMPTS.map((prompt) => prompt.id),
    promptTextStored: false,
    responseTextStored: false,
    paidRequestsAttempted: results.length,
    maximumPaidRequests: MAX_PAID_REQUESTS,
    results,
    models,
    selectedDefault: selected?.model ?? null,
    selectionRule:
      "reviewed quality pass count, completion count, median total latency, then first-visible latency",
    secretsLogged: false,
  });
  writeJson("latency.json", {
    status,
    measurementScope: "DIRECT_REAL_GOOGLE_PROVIDER_LOCAL_PROCESS",
    selectedModel: selected?.model ?? null,
    targets: {
      simpleMedianFirstVisibleTokenMs: 4_000,
      simpleMedianTotalResponseMs: 10_000,
    },
    selectedSimple: selectedSimple
      ? {
          timeToFirstProviderChunkMs:
            selectedSimple.timeToFirstProviderChunkMs,
          timeToFirstVisibleTokenMs:
            selectedSimple.timeToFirstVisibleTokenMs,
          totalLatencyMs: selectedSimple.totalLatencyMs,
          thinkingTokens: selectedSimple.thinkingTokens,
          outputTokens: selectedSimple.outputTokens,
          finishReason: selectedSimple.finishReason,
          chunkCount: selectedSimple.chunkCount,
        }
      : null,
    providerModelAggregates: models,
    authenticatedBrowserBreakdown: "PENDING_BROWSER_ACCEPTANCE",
    authContextMs: null,
    serverPreparationMs: null,
    streamBufferingMs: null,
    clientRenderingMs: null,
    latencyTargetMet: latencyPass,
    secretsLogged: false,
  });
  writeJson("review-samples.json", {
    status: qualityPass ? "BOUNDED_REVIEW_PASS" : "BOUNDED_REVIEW_FAILED",
    disclaimer:
      "This is a bounded rubric review of six samples, not a claim of absolute LLM mathematical correctness.",
    sampleCount: results.length,
    responseTextStored: false,
    samples: results.map((result) => ({
      model: result.model,
      promptId: result.promptId,
      completed: result.completed,
      completeness: result.completeness,
      mathematicalCorrectness: result.mathematicalCorrectness,
      vietnameseTutoringQuality: result.vietnameseTutoringQuality,
      gradeAppropriate: result.gradeAppropriate,
      hintDidNotRevealFinalAnswer: result.hintDidNotRevealFinalAnswer,
      outputWords: result.outputWords,
      finishReason: result.finishReason,
      errorCode: result.errorCode,
    })),
  });
  writeJson("report.json", {
    status,
    selectedModel: selected?.model ?? null,
    qualityPass,
    latencyTargetMet: latencyPass,
    paidRequestsAttempted: results.length,
    maximumPaidRequests: MAX_PAID_REQUESTS,
    truncatedCompletedResponses: results.filter(
      (result) =>
        result.completed && result.finishReason && result.finishReason !== "STOP",
    ).length,
    emptyResponses: results.filter((result) => result.outputCharacters === 0)
      .length,
    selectedModelMathematicallyInvalidReviewedSamples: results.filter(
      (result) =>
        result.model === selected?.model && !result.mathematicalCorrectness,
    ).length,
    allBenchmarkCandidatesMathematicallyInvalidReviewedSamples: results.filter(
      (result) => !result.mathematicalCorrectness,
    ).length,
    browserAcceptance: "PENDING",
    ownerReview: "REQUIRED",
    secretsLogged: false,
    fullConversationStored: false,
  });
  process.stdout.write(
    `AI_TUTOR_MODEL_BENCHMARK=${status}\nPAID_REQUESTS_ATTEMPTED=${results.length}\nSELECTED_MODEL=${selected?.model ?? "NONE"}\nSECRETS_LOGGED=NO\n`,
  );
  if (!qualityPass) process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  process.stdout.write(
    `AI_TUTOR_MODEL_BENCHMARK=BLOCKED\nERROR_CODE=${stableError(error)}\nSECRETS_LOGGED=NO\n`,
  );
  process.exitCode = 1;
}
