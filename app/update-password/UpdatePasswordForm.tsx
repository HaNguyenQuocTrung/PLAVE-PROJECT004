"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState, useTransition } from "react";

import { updatePassword } from "@/app/update-password/actions";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";

type PasswordErrors = {
  password?: string;
  confirmPassword?: string;
};

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;

    setNotice("");
    const nextErrors: PasswordErrors = {};
    if (password.length < 8) {
      nextErrors.password = "Mật khẩu phải có ít nhất 8 ký tự.";
    }
    if (!confirmPassword) {
      nextErrors.confirmPassword = "Vui lòng nhập lại mật khẩu.";
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Hai mật khẩu chưa trùng nhau.";
    }

    setErrors(nextErrors);
    if (nextErrors.password) {
      passwordRef.current?.focus();
      return;
    }
    if (nextErrors.confirmPassword) {
      confirmPasswordRef.current?.focus();
      return;
    }

    startTransition(async () => {
      const result = await updatePassword({ password, confirmPassword });
      if (!result.ok) {
        setNotice(result.message);
        return;
      }

      setPassword("");
      setConfirmPassword("");
      router.replace("/login?reset=success");
      router.refresh();
    });
  };

  return (
    <form className="auth-card" onSubmit={submit} noValidate>
      <FormField
        id="new-password"
        label="Mật khẩu mới"
        type="password"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          setErrors((current) => ({ ...current, password: undefined }));
          setNotice("");
        }}
        autoComplete="new-password"
        required
        hint="Ít nhất 8 ký tự."
        error={errors.password}
        inputRef={passwordRef}
        disabled={isPending}
      />
      <FormField
        id="confirm-new-password"
        label="Xác nhận mật khẩu mới"
        type="password"
        value={confirmPassword}
        onChange={(event) => {
          setConfirmPassword(event.target.value);
          setErrors((current) => ({
            ...current,
            confirmPassword: undefined,
          }));
          setNotice("");
        }}
        autoComplete="new-password"
        required
        error={errors.confirmPassword}
        inputRef={confirmPasswordRef}
        disabled={isPending}
      />
      <Button type="submit" fullWidth disabled={isPending}>
        {isPending ? "Đang cập nhật…" : "Đặt mật khẩu mới"}
      </Button>
      {notice ? (
        <p className="form-error-box" role="alert">
          {notice}
        </p>
      ) : null}
    </form>
  );
}
