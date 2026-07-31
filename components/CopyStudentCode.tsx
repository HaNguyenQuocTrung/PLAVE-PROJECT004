"use client";

import { useState } from "react";

import { Button } from "@/components/Button";

type CopyStudentCodeProps = {
  code: string;
};

export function CopyStudentCode({ code }: CopyStudentCodeProps) {
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
    <div className="copy-code">
      <Button variant="secondary" onClick={copyCode}>
        {status === "COPIED" ? "Đã sao chép mã" : "Sao chép mã"}
      </Button>
      <p className="copy-code__status" aria-live="polite">
        {status === "COPIED"
          ? "Đã sao chép mã"
          : status === "FAILED"
            ? "Chưa thể sao chép. Em có thể chọn và sao chép mã thủ công."
            : ""}
      </p>
    </div>
  );
}
