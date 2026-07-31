"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import {
  parseCurriculumAttemptApiState,
} from "@/lib/curriculum-runtime/contracts";
import {
  fetchWithClientTimeout,
  getClientRequestErrorMessage,
} from "@/lib/http/client-request";

export function AdaptiveOnDemandStartButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const idempotencyKey = useRef<string | null>(null);

  const start = async () => {
    if (pending) return;
    performance.clearMarks("plave:start-practice-click");
    performance.clearMarks("plave:start-practice-response");
    performance.clearMarks("plave:start-practice-route-push");
    performance.clearMeasures("plave:start-practice-api");
    performance.clearMeasures("plave:start-practice-client-transition");
    performance.clearMeasures("plave:start-practice-total-transition");
    performance.mark("plave:start-practice-click");
    setPending(true);
    setError("");
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const response = await fetchWithClientTimeout(
        "/api/on-demand-curriculum/start",
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idempotencyKey: idempotencyKey.current,
          }),
        },
      );
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
          router.push(`/on-demand-practice/${state.attemptId}`);
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
      const message =
        apiError &&
        "message" in apiError &&
        typeof apiError.message === "string"
          ? apiError.message
          : "Chưa thể mở lượt luyện phù hợp.";
      const code =
        apiError &&
        "code" in apiError &&
        typeof apiError.code === "string"
          ? apiError.code
          : "REQUEST_FAILED";
      setError(`${message} (mã ${code})`);
    } catch (requestError) {
      setError(
        getClientRequestErrorMessage(
          requestError,
          "ON_DEMAND_START_TIMEOUT",
          "Kết nối bị gián đoạn. Em có thể thử lại an toàn.",
        ),
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="start-practice">
      <Button onClick={start} disabled={pending}>
        {pending
          ? "Đang tạo lượt luyện…"
          : "Luyện tập được tạo theo năng lực"}
      </Button>
      {error ? (
        <div className="form-error-box" role="alert">
          <p>{error}</p>
          <Button onClick={start} disabled={pending} variant="secondary">
            Thử lại
          </Button>
        </div>
      ) : null}
    </div>
  );
}
