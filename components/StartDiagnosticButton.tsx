"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import {
  createDiagnosticSingleFlightGate,
  parseDiagnosticStartApiResponse,
  readDiagnosticResponse,
} from "@/lib/diagnostic/client-flow";
import {
  parseDiagnosticApiError,
  parseDiagnosticAttemptSummary,
} from "@/lib/diagnostic/contracts";

type StartDiagnosticButtonProps = {
  label: string;
};

function parseCurrentAttempt(value: unknown) {
  if (
    typeof value !== "object" ||
    value === null ||
    !("ok" in value) ||
    value.ok !== true ||
    !("data" in value) ||
    typeof value.data !== "object" ||
    value.data === null ||
    !("attempt" in value.data)
  ) {
    return null;
  }
  if (value.data.attempt === null) return { attempt: null };
  if (
    typeof value.data.attempt !== "object" ||
    value.data.attempt === null
  ) {
    return null;
  }
  const attempt = parseDiagnosticAttemptSummary({
    id:
      "id" in value.data.attempt ? value.data.attempt.id : undefined,
    status:
      "status" in value.data.attempt
        ? value.data.attempt.status
        : undefined,
    answered_count:
      "answeredCount" in value.data.attempt
        ? value.data.attempt.answeredCount
        : undefined,
    correct_count:
      "correctCount" in value.data.attempt
        ? value.data.attempt.correctCount
        : undefined,
    recommendation_unit_slug:
      "recommendationUnitSlug" in value.data.attempt
        ? value.data.attempt.recommendationUnitSlug
        : undefined,
    recommendation_reason_code:
      "recommendationReasonCode" in value.data.attempt
        ? value.data.attempt.recommendationReasonCode
        : undefined,
    recommendation_explanation:
      "recommendationExplanation" in value.data.attempt
        ? value.data.attempt.recommendationExplanation
        : undefined,
    started_at:
      "startedAt" in value.data.attempt
        ? value.data.attempt.startedAt
        : undefined,
    completed_at:
      "completedAt" in value.data.attempt
        ? value.data.attempt.completedAt
        : undefined,
  });
  return attempt ? { attempt } : null;
}

export function StartDiagnosticButton({
  label,
}: StartDiagnosticButtonProps) {
  const router = useRouter();
  const [requestGate] = useState(createDiagnosticSingleFlightGate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const startDiagnostic = () => {
    if (requestGate.isActive()) return;

    void requestGate.run(async () => {
      setIsSubmitting(true);
      setError("");
      try {
        let apiError: ReturnType<typeof parseDiagnosticApiError> = null;
        try {
          const response = await fetch("/api/diagnostic/start", {
            method: "POST",
            credentials: "same-origin",
          });
          const payload = await readDiagnosticResponse(response);
          if (payload.ok) {
            const parsed = parseDiagnosticStartApiResponse(payload.value);
            if (parsed) {
              router.push(`/diagnostic/${parsed.data.attemptId}`);
              return;
            }
          }
          apiError = parseDiagnosticApiError(payload.value);
        } catch {
          // Reconcile with a read-only request; never retry the POST.
        }

        if (apiError?.error.code === "AUTH_REQUIRED") {
          router.push("/login");
          return;
        }
        if (apiError && apiError.error.code !== "REQUEST_FAILED") {
          setError(apiError.error.message);
          return;
        }

        try {
          const response = await fetch("/api/diagnostic/current", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
          });
          const payload = await readDiagnosticResponse(response);
          const current = payload.ok
            ? parseCurrentAttempt(payload.value)
            : null;
          if (current?.attempt?.status === "IN_PROGRESS") {
            router.push(`/diagnostic/${current.attempt.id}`);
            return;
          }
        } catch {
          // A safe message is shown below.
        }

        setError(
          "Chưa thể mở bài đánh giá. Vui lòng kiểm tra kết nối và thử lại.",
        );
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  return (
    <div className="start-practice start-practice--full">
      <Button
        disabled={isSubmitting}
        fullWidth
        onClick={startDiagnostic}
      >
        {isSubmitting ? "Đang bắt đầu đánh giá…" : label}
      </Button>
      {error ? (
        <p className="form-error-box" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
