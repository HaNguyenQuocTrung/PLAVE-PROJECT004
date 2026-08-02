"use client";

import Link from "next/link";
import { type FormEvent, useRef, useState, useTransition } from "react";

import { requestPasswordReset } from "@/app/forgot-password/actions";
import { AuthBrandPanel } from "@/components/AuthBrandPanel";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();
  const emailRef = useRef<HTMLInputElement>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;

    setNotice("");
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Vui lòng nhập email.");
      emailRef.current?.focus();
      return;
    }
    if (!emailPattern.test(normalizedEmail)) {
      setError("Email chưa đúng định dạng.");
      emailRef.current?.focus();
      return;
    }

    setError("");
    startTransition(async () => {
      const result = await requestPasswordReset({ email: normalizedEmail });
      setNotice(result.message);
    });
  };

  return (
    <section className="auth-page auth-page--v2 auth-page--compact page-shell">
      <AuthBrandPanel
        eyebrow="Tài khoản an toàn"
        title="Trở lại nhịp học của bạn."
        description="Khôi phục quyền truy cập mà không làm lộ thông tin tài khoản."
      />
      <form className="auth-card auth-card--v2" onSubmit={submit} noValidate>
        <div className="auth-card__heading">
          <p className="eyebrow">Khôi phục tài khoản</p>
          <h2>Quên mật khẩu?</h2>
          <p>Nhập email để nhận hướng dẫn đặt lại mật khẩu.</p>
        </div>
        <FormField
          id="forgot-email"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError("");
            setNotice("");
          }}
          autoComplete="email"
          required
          error={error}
          inputRef={emailRef}
          inputMode="email"
          placeholder="ban@example.com"
          disabled={isPending}
        />
        <Button type="submit" fullWidth disabled={isPending} loading={isPending}>
          Gửi hướng dẫn
        </Button>
        {notice ? (
          <p className="form-success" role="status">
            {notice}
          </p>
        ) : null}
        <p className="auth-card__footer">
          <Link href="/login">Quay lại đăng nhập</Link>
        </p>
      </form>
    </section>
  );
}
