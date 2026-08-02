"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { parseCurriculumAttemptApiState } from "@/lib/curriculum-runtime/contracts";

type UniversalCurriculumStartButtonProps = {
  unitSlug: string;
  label?: string;
  fullWidth?: boolean;
};

export function UniversalCurriculumStartButton({
  unitSlug,
  label = "Bắt đầu luyện tập",
  fullWidth = false,
}: UniversalCurriculumStartButtonProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const idempotencyKey = useRef<string | null>(null);

  const start = async () => {
    if (submitting) return;
    performance.clearMarks("plave:start-practice-click");
    performance.clearMarks("plave:start-practice-response");
    performance.clearMarks("plave:start-practice-route-push");
    performance.clearMeasures("plave:start-practice-api");
    performance.clearMeasures("plave:start-practice-client-transition");
    performance.clearMeasures("plave:start-practice-total-transition");
    performance.mark("plave:start-practice-click");
    setSubmitting(true);
    setError("");
    idempotencyKey.current ??= crypto.randomUUID();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6_000);
    try {
      const response = await fetch("/api/curriculum-runtime/start", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitSlug,
          idempotencyKey: idempotencyKey.current,
        }),
        signal: controller.signal,
      });
      const payload = (await response.json()) as unknown;
      performance.mark("plave:start-practice-response");
      performance.measure(
        "plave:start-practice-api",
        "plave:start-practice-click",
        "plave:start-practice-response",
      );
      if (
        response.ok &&
        typeof payload === "object" &&
        payload !== null &&
        "data" in payload
      ) {
        const state = parseCurriculumAttemptApiState(payload.data);
        if (state) {
          idempotencyKey.current = null;
          performance.mark("plave:start-practice-route-push");
          router.push(`/curriculum-practice/${state.attemptId}`);
          return;
        }
      }
      const apiError =
        typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof payload.error === "object" &&
        payload.error !== null
          ? payload.error
          : null;
      setError(
        apiError &&
          "message" in apiError &&
          typeof apiError.message === "string"
          ? apiError.message
          : "Chưa thể mở bài luyện tập. Em hãy thử lại.",
      );
    } catch (requestError) {
      const timedOut =
        requestError instanceof DOMException &&
        requestError.name === "AbortError";
      const failureKind = timedOut ? "CLIENT_TIMEOUT" : "NETWORK_ERROR";
      setError(
        failureKind === "CLIENT_TIMEOUT"
          ? "Yêu cầu mất quá nhiều thời gian. Em có thể thử lại an toàn."
          : "Mất kết nối khi mở bài. Em có thể thử lại an toàn.",
      );
    } finally {
      window.clearTimeout(timeout);
      setSubmitting(false);
    }
  };

  return (
    <div
      className={
        fullWidth
          ? "start-practice start-practice--full"
          : "start-practice"
      }
    >
      <Button
        disabled={submitting}
        fullWidth={fullWidth}
        loading={submitting}
        onClick={start}
      >
        {label}
      </Button>
      {error ? (
        <div className="form-error-box" role="alert">
          <p>{error}</p>
          <Button disabled={submitting} onClick={start} variant="secondary">
            Thử lại
          </Button>
        </div>
      ) : null}
    </div>
  );
}
