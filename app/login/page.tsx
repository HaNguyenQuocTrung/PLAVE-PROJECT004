"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import { loginWithPassword } from "@/app/login/actions";
import { createAuthSubmissionGate } from "@/lib/auth/client-flow";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { PasswordField } from "@/components/PasswordField";
import { Alert } from "@/components/UiStates";
import { AuthBrandPanel } from "@/components/AuthBrandPanel";

const rememberedEmailKey = "plave_remembered_email";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LoginErrors = {
  email?: string;
  password?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [notice, setNotice] = useState("");
  const [successNotice, setSuccessNotice] = useState("");
  const [isPending, startTransition] = useTransition();
  const submissionGateRef = useRef(createAuthSubmissionGate());
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const hasEditedEmail = useRef(false);

  useEffect(() => {
    const hydrationTask = window.setTimeout(() => {
      const search = new URLSearchParams(window.location.search);
      if (search.get("reset") === "success") {
        setSuccessNotice(
          "Mật khẩu đã được cập nhật. Hãy đăng nhập bằng mật khẩu mới.",
        );
      } else if (search.get("error") === "confirm") {
        setNotice(
          "Liên kết xác nhận không hợp lệ hoặc đã hết hạn. Vui lòng thử lại từ email mới nhất.",
        );
      } else if (search.get("error") === "recovery") {
        setNotice(
          "Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Hãy yêu cầu một email mới.",
        );
      } else if (search.get("error") === "session-invalid") {
        setNotice("Phiên đăng nhập cũ không còn hợp lệ. Vui lòng đăng nhập lại.");
      } else if (search.get("error") === "auth-unavailable") {
        setNotice(
          "Tạm thời chưa thể xác minh đăng nhập. Vui lòng thử lại sau; phiên hiện có chưa bị xóa.",
        );
      }

      const remembered = window.localStorage.getItem(rememberedEmailKey);
      if (remembered && !hasEditedEmail.current) {
        setEmail(remembered);
        setRememberEmail(true);
      }
    }, 0);

    return () => window.clearTimeout(hydrationTask);
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;

    setNotice("");
    setSuccessNotice("");
    const nextErrors: LoginErrors = {};
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      nextErrors.email = "Vui lòng nhập email.";
    } else if (!emailPattern.test(normalizedEmail)) {
      nextErrors.email = "Email chưa đúng định dạng.";
    }
    if (!password) {
      nextErrors.password = "Vui lòng nhập mật khẩu.";
    }

    setErrors(nextErrors);
    if (nextErrors.email) {
      emailRef.current?.focus();
      return;
    }
    if (nextErrors.password) {
      passwordRef.current?.focus();
      return;
    }

    if (!submissionGateRef.current.tryStart()) return;

    startTransition(async () => {
      try {
        const result = await loginWithPassword({
          email: normalizedEmail,
          password,
        });

        if (!result.ok || !result.destination) {
          setNotice(result.message);
          return;
        }

        if (rememberEmail) {
          window.localStorage.setItem(rememberedEmailKey, normalizedEmail);
        } else {
          window.localStorage.removeItem(rememberedEmailKey);
        }

        setPassword("");
        router.replace(result.destination);
        router.refresh();
      } finally {
        submissionGateRef.current.reset();
      }
    });
  };

  return (
    <section className="auth-page auth-page--v2 page-shell">
      <AuthBrandPanel
        eyebrow="Chào mừng trở lại"
        title="Tiếp tục hành trình của bạn."
        description="Đăng nhập để trở lại đúng bài học, tiến độ và không gian PLAVE của bạn."
      />

      <form className="auth-card auth-card--v2" onSubmit={submit} noValidate>
        <div className="auth-card__heading">
          <p className="eyebrow">Tài khoản PLAVE</p>
          <h2>Đăng nhập</h2>
          <p>Nhập email và mật khẩu đã đăng ký.</p>
        </div>
        <FormField
          id="login-email"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => {
            hasEditedEmail.current = true;
            setEmail(event.target.value);
            setErrors((current) => ({ ...current, email: undefined }));
            setNotice("");
          }}
          autoComplete="email"
          placeholder="ban@example.com"
          required
          error={errors.email}
          inputRef={emailRef}
          inputMode="email"
          disabled={isPending}
        />

        <PasswordField
          id="login-password"
          label="Mật khẩu"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setErrors((current) => ({ ...current, password: undefined }));
            setNotice("");
          }}
          autoComplete="current-password"
          required
          error={errors.password}
          inputRef={passwordRef}
          disabled={isPending}
        />

        <div className="form-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={rememberEmail}
              disabled={isPending}
              onChange={(event) => setRememberEmail(event.target.checked)}
            />
            Ghi nhớ email
          </label>
          <Link href="/forgot-password">Quên mật khẩu?</Link>
        </div>

        <Button type="submit" fullWidth disabled={isPending} loading={isPending}>
          Đăng nhập
        </Button>

        {notice ? (
          <Alert tone="error">{notice}</Alert>
        ) : null}
        {successNotice ? (
          <Alert tone="success">{successNotice}</Alert>
        ) : null}

        <p className="auth-card__footer">
          Chưa có tài khoản? <Link href="/register">Đăng ký</Link>
        </p>
        <p className="privacy-note">
          Chỉ email được ghi nhớ khi bạn chọn ô phía trên. PLAVE không lưu mật
          khẩu.
        </p>
      </form>
    </section>
  );
}
