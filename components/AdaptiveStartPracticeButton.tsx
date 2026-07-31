"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { parseAdaptiveApiResponse } from "@/lib/practice/adaptive-api";

type AdaptiveStartPracticeButtonProps = {
  label: string;
  unitSlug: string;
  fullWidth?: boolean;
};

export function AdaptiveStartPracticeButton({
  label,
  unitSlug,
  fullWidth = false,
}: AdaptiveStartPracticeButtonProps) {
  const router = useRouter();
  const idempotencyKey = useRef<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [manualRetry, setManualRetry] = useState(false);

  const startPractice = async () => {
    if (isSubmitting) return;
    idempotencyKey.current ??= crypto.randomUUID();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/adaptive-practice/start", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitSlug,
          idempotencyKey: idempotencyKey.current,
        }),
      });
      const payload: unknown = await response.json();
      const parsed = parseAdaptiveApiResponse(payload, false);

      if (parsed?.ok) {
        idempotencyKey.current = null;
        router.push(`/adaptive-practice/${parsed.data.attemptId}`);
        return;
      }
      if (parsed?.error.code === "AUTH_REQUIRED") {
        router.push("/login");
        return;
      }
      if (parsed) {
        setError(parsed.error.message);
        setManualRetry(
          parsed.error.retry.action === "SAME_IDEMPOTENCY_KEY_RETRY",
        );
        return;
      }
      setError("Chưa thể mở bài luyện tập. Vui lòng thử lại sau.");
      setManualRetry(true);
    } catch {
      // Do not retry this POST automatically. A manual retry reuses the same
      // idempotency key so a committed start cannot create another attempt.
      setError(
        "Chưa nhận được phản hồi. Em có thể thử lại mà không tạo lượt trùng.",
      );
      setManualRetry(true);
    } finally {
      setIsSubmitting(false);
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
        disabled={isSubmitting}
        fullWidth={fullWidth}
        onClick={() => void startPractice()}
      >
        {isSubmitting
          ? "Đang bắt đầu luyện tập…"
          : manualRetry
            ? "Thử mở lại"
            : label}
      </Button>
      {error ? (
        <p className="form-error-box" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
