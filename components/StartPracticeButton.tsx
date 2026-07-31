"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { parsePracticeApiError } from "@/lib/practice/contracts";
import {
  createSingleFlightGate,
  getStartPracticeDestination,
  readResponseJsonOnce,
  reconcileStartedPractice,
} from "@/lib/practice/client-flow";

type StartPracticeButtonProps = {
  label: string;
  unitSlug: string;
  fullWidth?: boolean;
};

export function StartPracticeButton({
  label,
  unitSlug,
  fullWidth = false,
}: StartPracticeButtonProps) {
  const router = useRouter();
  const [requestGate] = useState(createSingleFlightGate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const startPractice = () => {
    if (requestGate.isActive()) return;

    void requestGate.run(async () => {
      setIsSubmitting(true);
      setError("");

      try {
        let apiError: ReturnType<typeof parsePracticeApiError> = null;

        try {
          const response = await fetch("/api/practice/start", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ unitSlug }),
          });
          const payload = await readResponseJsonOnce(response);

          if (payload.ok) {
            const destination = getStartPracticeDestination(payload.value);
            if (destination) {
              router.push(destination);
              return;
            }
            apiError = parsePracticeApiError(payload.value);
          }
        } catch {
          // The mutation may have committed before the response was interrupted.
        }

        if (apiError?.error.code === "AUTH_REQUIRED") {
          router.push("/login");
          return;
        }

        if (apiError && apiError.error.code !== "REQUEST_FAILED") {
          setError(apiError.error.message);
          return;
        }

        const reconciliation = await reconcileStartedPractice(
          fetch,
          unitSlug,
        );
        if (reconciliation.kind === "RECOVERED") {
          router.push(`/practice/${reconciliation.attempt.id}`);
          return;
        }

        setError(
          reconciliation.kind === "NOT_FOUND"
            ? "Lượt luyện tập chưa được tạo. Em có thể thử lại."
            : "Chưa thể mở bài luyện tập. Vui lòng kiểm tra kết nối và thử lại.",
        );
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  return (
    <div className={fullWidth ? "start-practice start-practice--full" : "start-practice"}>
      <Button
        disabled={isSubmitting}
        fullWidth={fullWidth}
        onClick={startPractice}
      >
        {isSubmitting ? "Đang mở bài luyện tập…" : label}
      </Button>
      {error ? (
        <p className="form-error-box" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
