"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState, useTransition } from "react";

import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { createOnboardingSubmissionGate } from "@/lib/onboarding/client-flow";
import { missingRegistrationGradeMessage } from "@/lib/onboarding/validation";

type OnboardingFormProps = {
  role: "STUDENT" | "PARENT";
  initialFullName: string;
  registeredGrade: number | null;
};

export function OnboardingForm({
  role,
  initialFullName,
  registeredGrade,
}: OnboardingFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [birthDate, setBirthDate] = useState("");
  const [nameError, setNameError] = useState("");
  const [dateError, setDateError] = useState("");
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();
  const submissionGateRef = useRef(createOnboardingSubmissionGate());
  const fullNameRef = useRef<HTMLInputElement>(null);
  const birthDateRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().slice(0, 10);
  const registeredGradeMissing =
    role === "STUDENT" && registeredGrade === null;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;

    const normalizedName = fullName.replace(/\s+/g, " ").trim();
    let hasError = false;
    setNotice("");

    if (normalizedName.length < 2 || normalizedName.length > 100) {
      setNameError("Họ và tên cần có từ 2 đến 100 ký tự.");
      fullNameRef.current?.focus();
      hasError = true;
    } else {
      setNameError("");
    }

    if (registeredGradeMissing) {
      setNotice(missingRegistrationGradeMessage);
      hasError = true;
    }

    if (birthDate && birthDate > today) {
      setDateError("Ngày sinh không được nằm trong tương lai.");
      if (!hasError) birthDateRef.current?.focus();
      hasError = true;
    } else {
      setDateError("");
    }

    if (hasError) return;

    if (!submissionGateRef.current.tryStart()) return;

    startTransition(async () => {
      let result: { ok: boolean; message: string };

      try {
        const response = await fetch("/api/onboarding", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: normalizedName,
            birthDate: role === "STUDENT" ? birthDate : "",
          }),
        });
        const payload: unknown = await response.json();

        if (
          typeof payload !== "object" ||
          payload === null ||
          !("ok" in payload) ||
          typeof payload.ok !== "boolean" ||
          !("message" in payload) ||
          typeof payload.message !== "string"
        ) {
          throw new Error("invalid response");
        }

        result = { ok: payload.ok, message: payload.message };
      } catch {
        result = {
          ok: false,
          message: "Chưa thể kết nối dịch vụ hồ sơ. Vui lòng thử lại sau.",
        };
      }

      if (!result.ok) {
        submissionGateRef.current.reset();
        setNotice(result.message);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    });
  };

  return (
    <form className="auth-card" onSubmit={submit} noValidate>
      <FormField
        id="onboarding-full-name"
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
        inputRef={fullNameRef}
        disabled={isPending}
      />

      {role === "STUDENT" ? (
        <>
          <div
            className={`registered-grade-card ${
              registeredGradeMissing
                ? "registered-grade-card--missing"
                : ""
            }`}
            aria-describedby={
              registeredGradeMissing
                ? "registered-grade-error"
                : "registered-grade-hint"
            }
          >
            <span>Lớp đã chọn khi đăng ký</span>
            <strong>
              {registeredGrade === null
                ? "Chưa tìm thấy"
                : `Lớp ${registeredGrade}`}
            </strong>
            {registeredGradeMissing ? (
              <p id="registered-grade-error" role="alert">
                {missingRegistrationGradeMessage}
              </p>
            ) : (
              <p id="registered-grade-hint">
                PLAVE sẽ dùng lớp này để chuẩn bị nội dung học phù hợp cho em.
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="onboarding-birth-date">
              Ngày sinh (không bắt buộc)
            </label>
            <div
              className={`field__control ${
                dateError ? "field__control--error" : ""
              }`}
            >
              <input
                ref={birthDateRef}
                id="onboarding-birth-date"
                name="onboarding-birth-date"
                type="date"
                value={birthDate}
                max={today}
                disabled={isPending}
                onChange={(event) => {
                  setBirthDate(event.target.value);
                  setDateError("");
                }}
                autoComplete="bday"
                aria-invalid={Boolean(dateError)}
                aria-describedby={
                  dateError
                    ? "onboarding-birth-date-hint onboarding-birth-date-error"
                    : "onboarding-birth-date-hint"
                }
              />
            </div>
            <p className="field__hint" id="onboarding-birth-date-hint">
              Ngày sinh được giữ riêng tư, không hiển thị công khai.
            </p>
            {dateError ? (
              <p
                className="field__error"
                id="onboarding-birth-date-error"
                role="alert"
              >
                {dateError}
              </p>
            ) : null}
          </div>
        </>
      ) : (
        <p className="role-note">
          Sau khi hoàn tất hồ sơ, bạn có thể nhập mã học sinh để gửi yêu cầu
          kết nối. Học sinh phải đồng ý trước khi kết nối được thiết lập.
        </p>
      )}

      <Button
        type="submit"
        fullWidth
        disabled={isPending || registeredGradeMissing}
      >
        {isPending ? "Đang hoàn tất hồ sơ…" : "Hoàn tất hồ sơ"}
      </Button>
      {notice ? (
        <p className="form-error-box" role="alert">
          {notice}
        </p>
      ) : null}
    </form>
  );
}
