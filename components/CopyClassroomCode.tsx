"use client";

import { useState } from "react";

import { Button } from "@/components/Button";

type CopyClassroomCodeProps = {
  code: string;
};

export function CopyClassroomCode({ code }: CopyClassroomCodeProps) {
  const [status, setStatus] = useState<"IDLE" | "COPIED" | "FAILED">("IDLE");

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("COPIED");
    } catch {
      setStatus("FAILED");
    }
  };

  return (
    <div className="copy-code classroom-code-copy">
      <Button variant="secondary" onClick={copyCode}>
        {status === "COPIED" ? "Đã sao chép mã" : "Sao chép mã lớp"}
      </Button>
      <p className="copy-code__status" aria-live="polite">
        {status === "COPIED"
          ? "Đã sao chép mã lớp"
          : status === "FAILED"
            ? "Chưa thể sao chép. Bạn có thể chọn và sao chép mã thủ công."
            : ""}
      </p>
    </div>
  );
}
