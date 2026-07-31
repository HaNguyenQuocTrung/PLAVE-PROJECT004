"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { createTeacherActivationGate } from "@/lib/teacher/client-flow";
import {
  normalizeTeacherFullName,
  normalizeTeacherInvitationCode,
  parseTeacherActivationApiError,
  parseTeacherActivationApiResponse,
} from "@/lib/teacher/contracts";
import {
  fetchWithClientTimeout,
  getClientRequestErrorMessage,
} from "@/lib/http/client-request";

type TeacherOnboardingFormProps = {
  initialFullName: string;
};

export function TeacherOnboardingForm({
  initialFullName,
}: TeacherOnboardingFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [invitationCode, setInvitationCode] = useState("");
  const [nameError, setNameError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const gateRef = useRef(createTeacherActivationGate());
  const nameRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || !gateRef.current.tryStart()) return;

    const normalizedName = normalizeTeacherFullName(fullName);
    const normalizedCode =
      normalizeTeacherInvitationCode(invitationCode);
    let invalid = false;
    setNotice("");

    if (normalizedName.length < 2 || normalizedName.length > 100) {
      setNameError("Họ và tên cần có từ 2 đến 100 ký tự.");
      nameRef.current?.focus();
      invalid = true;
    } else {
      setNameError("");
    }

    if (!/^PLV-TCH-[0-9A-F]{32}$/.test(normalizedCode)) {
      setCodeError("Mã mời chưa đúng định dạng.");
      if (!invalid) codeRef.current?.focus();
      invalid = true;
    } else {
      setCodeError("");
    }

    if (invalid) {
      gateRef.current.reset();
      return;
    }

    setPending(true);
    try {
      const response = await fetchWithClientTimeout(
        "/api/teacher/activate",
        {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: normalizedName,
          invitationCode: normalizedCode,
        }),
        },
      );
      const payload: unknown = await response.json();
      const result = parseTeacherActivationApiResponse(payload);

      if (result) {
        setInvitationCode("");
        router.replace("/teacher");
        router.refresh();
        return;
      }

      const error = parseTeacherActivationApiError(payload);
      setNotice(
        error?.message ??
          "Chưa thể xác minh giáo viên. Vui lòng kiểm tra và thử lại.",
      );
    } catch (error) {
      setNotice(
        getClientRequestErrorMessage(
          error,
          "TEACHER_ACTIVATION_TIMEOUT",
          "Chưa thể xác nhận kết quả xác minh. Vui lòng tải lại trang trước khi thử lại.",
        ),
      );
    } finally {
      setPending(false);
      gateRef.current.reset();
    }
  };

  return (
    <form className="auth-card" onSubmit={submit} noValidate>
      <FormField
        id="teacher-full-name"
        label="Họ và tên"
        value={fullName}
        onChange={(event) => {
          setFullName(event.target.value);
          setNameError("");
          setNotice("");
        }}
        autoComplete="name"
        required
        error={nameError}
        inputRef={nameRef}
        disabled={pending}
      />
      <FormField
        id="teacher-invitation-code"
        label="Mã mời giáo viên"
        value={invitationCode}
        onChange={(event) => {
          setInvitationCode(event.target.value);
          setCodeError("");
          setNotice("");
        }}
        autoComplete="off"
        inputMode="text"
        required
        hint="Mã chỉ dùng một lần. PLAVE không lưu mã trong trình duyệt."
        error={codeError}
        inputRef={codeRef}
        disabled={pending}
      />
      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "Đang xác minh…" : "Xác minh và hoàn tất hồ sơ"}
      </Button>
      {notice ? (
        <p className="form-error-box" role="alert">
          {notice}
        </p>
      ) : null}
    </form>
  );
}
