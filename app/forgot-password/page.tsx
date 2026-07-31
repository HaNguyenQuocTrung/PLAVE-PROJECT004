"use client";

import Link from "next/link";
import { type FormEvent, useRef, useState, useTransition } from "react";

import { requestPasswordReset } from "@/app/forgot-password/actions";
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
    <section className="auth-page auth-page--compact page-shell">
      <div className="auth-intro">
        <p className="eyebrow">Khôi phục tài khoản</p>
        <h1>Quên mật khẩu?</h1>
        <p>
          Nhập email. Phản hồi luôn giống nhau để bảo vệ thông tin tài khoản.
        </p>
      </div>
      <form className="auth-card" onSubmit={submit} noValidate>
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
        <Button type="submit" fullWidth disabled={isPending}>
          {isPending ? "Đang gửi yêu cầu…" : "Gửi hướng dẫn"}
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
