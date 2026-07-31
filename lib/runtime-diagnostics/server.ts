import "server-only";

import { randomBytes } from "node:crypto";
import { performance } from "node:perf_hooks";

export type RuntimeStage =
  | "supabase_client"
  | "auth_user"
  | "profile"
  | "student_profile"
  | "request_body"
  | "progress"
  | "generation"
  | "rpc"
  | "response_mapping";

type RuntimeStageDurations = Partial<Record<RuntimeStage, number>>;

function roundMilliseconds(value: number) {
  return Math.round(value * 10) / 10;
}

function safePath(request: Request) {
  try {
    return new URL(request.url).pathname;
  } catch {
    return "/invalid";
  }
}

export function safeUpstreamCode(value: unknown) {
  return typeof value === "string" && /^[A-Z0-9_]{1,32}$/.test(value)
    ? value
    : undefined;
}

export function createRuntimeTrace(request: Request) {
  const startedAt = performance.now();
  const correlationId = `cr_${randomBytes(9).toString("base64url")}`;
  const path = safePath(request);
  const stages: RuntimeStageDurations = {};
  let finished = false;

  function record(stage: RuntimeStage, durationMs: number) {
    stages[stage] = roundMilliseconds(
      (stages[stage] ?? 0) + Math.max(0, durationMs),
    );
  }

  async function measure<T>(
    stage: RuntimeStage,
    operation: () => PromiseLike<T> | T,
  ): Promise<T> {
    const stageStartedAt = performance.now();
    try {
      return await operation();
    } finally {
      record(stage, performance.now() - stageStartedAt);
    }
  }

  function finish(
    httpStatus: number,
    serverErrorCode: string,
    upstreamCode?: string,
  ) {
    const totalDurationMs = roundMilliseconds(performance.now() - startedAt);
    const safeProviderCode = safeUpstreamCode(upstreamCode);
    if (!finished) {
      finished = true;
      const event = {
        event: "runtime_request",
        correlation_id: correlationId,
        api_path: path,
        http_status: httpStatus,
        server_error_code: safeUpstreamCode(serverErrorCode) ?? "UNKNOWN",
        duration_ms: totalDurationMs,
        stages_ms: stages,
        ...(safeProviderCode ? { upstream_code: safeProviderCode } : {}),
      };
      const serialized = JSON.stringify(event);
      if (httpStatus >= 500) console.error(serialized);
      else console.info(serialized);
    }

    const timing = [
      ...Object.entries(stages).map(
        ([stage, duration]) => `${stage};dur=${duration}`,
      ),
      `total;dur=${totalDurationMs}`,
    ].join(", ");
    return {
      "Cache-Control": "no-store",
      "Server-Timing": timing,
      "X-PLAVE-Correlation-ID": correlationId,
    };
  }

  return {
    correlationId,
    finish,
    measure,
    record,
  };
}
