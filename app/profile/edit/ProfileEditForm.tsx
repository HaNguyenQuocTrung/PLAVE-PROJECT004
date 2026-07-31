"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState, useTransition } from "react";

import { updateStudentProfile } from "@/app/profile/edit/actions";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { createProfileSubmissionGate } from "@/lib/profile/client-flow";
import { validateStudentProfileInput } from "@/lib/profile/validation";

type ProfileEditFormProps = {
  initialFullName: string;
  initialBirthDate: string;
  grade: number;
  studentCode: string;
};

export function ProfileEditForm({
  initialFullName,
  initialBirthDate,
  grade,
  studentCode,
}: ProfileEditFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [birthDate, setBirthDate] = useState(initialBirthDate);
  const [nameError, setNameError] = useState("");
  const [dateError, setDateError] = useState("");
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();
  const submissionGateRef = useRef(createProfileSubmissionGate());
  const nameRef = useRef<HTMLInputElement>(null);
  const birthDateRef = useRef<HTMLInputElement>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending || !submissionGateRef.current.tryStart()) return;

    setNotice("");
    const validation = validateStudentProfileInput({
      fullName,
      birthDate,
    });

    if (!validation.ok) {
      setNameError(validation.fieldErrors.fullName ?? "");
      setDateError(validation.fieldErrors.birthDate ?? "");
      submissionGateRef.current.reset();

      if (validation.fieldErrors.fullName) {
        nameRef.current?.focus();
      } else if (validation.fieldErrors.birthDate) {
        birthDateRef.current?.focus();
      }
      return;
    }

    setNameError("");
    setDateError("");

    startTransition(async () => {
      const result = await updateStudentProfile({
        fullName: validation.value.fullName,
        birthDate: validation.value.birthDate ?? "",
      });

      if (!result.ok) {
        setNameError(result.fieldErrors.fullName ?? "");
        setDateError(result.fieldErrors.birthDate ?? "");
        setNotice(result.message);
        submissionGateRef.current.reset();
        return;
      }

      submissionGateRef.current.reset();
      router.replace("/profile?updated=1");
      router.refresh();
    });
  };

  return (
    <form className="profile-edit-card" onSubmit={submit} noValidate>
      <div className="profile-edit-card__fields">
        <FormField
          id="profile-full-name"
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
          disabled={isPending}
        />
        <FormField
          id="profile-birth-date"
          label="Ngày sinh (không bắt buộc)"
          type="date"
          value={birthDate}
          onChange={(event) => {
            setBirthDate(event.target.value);
            setDateError("");
            setNotice("");
          }}
          autoComplete="bday"
          hint="Ngày sinh được giữ riêng tư và không hiển thị công khai."
          error={dateError}
          inputRef={birthDateRef}
          disabled={isPending}
        />
      </div>

      <section
        className="profile-readonly"
        aria-labelledby="readonly-profile-title"
      >
        <h2 id="readonly-profile-title">Thông tin không thể thay đổi</h2>
        <p>
          Những thông tin này được bảo vệ để giữ đúng tài khoản và lộ trình học.
        </p>
        <dl>
          <div>
            <dt>Vai trò</dt>
            <dd>Học sinh</dd>
          </div>
          <div>
            <dt>Lớp hiện tại</dt>
            <dd>Lớp {grade}</dd>
          </div>
          <div>
            <dt>Mã học sinh</dt>
            <dd>
              <code>{studentCode}</code>
            </dd>
          </div>
        </dl>
      </section>

      {notice ? (
        <p className="form-error-box" role="alert">
          {notice}
        </p>
      ) : null}

      <div className="profile-form-actions">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Đang lưu…" : "Lưu thay đổi"}
        </Button>
        <Link className="button button--quiet" href="/profile">
          Hủy
        </Link>
      </div>
    </form>
  );
}
