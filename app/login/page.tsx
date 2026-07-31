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
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";

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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [notice, setNotice] = useState("");
  const [successNotice, setSuccessNotice] = useState("");
  const [isPending, startTransition] = useTransition();
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

    startTransition(async () => {
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
    });
  };

  return (
    <section className="auth-page page-shell">
      <div className="auth-intro">
        <p className="eyebrow">Chào mừng trở lại</p>
        <h1>Đăng nhập PLAVE</h1>
        <p>
          Dùng tài khoản đã xác nhận để tiếp tục onboarding hoặc mở dashboard.
        </p>
      </div>

      <form className="auth-card" onSubmit={submit} noValidate>
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

        <FormField
          id="login-password"
          label="Mật khẩu"
          type={showPassword ? "text" : "password"}
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
          action={
            <button
              className="field__action"
              type="button"
              disabled={isPending}
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              aria-pressed={showPassword}
            >
              {showPassword ? "Ẩn" : "Hiện"}
            </button>
          }
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

        <Button type="submit" fullWidth disabled={isPending}>
          {isPending ? "Đang đăng nhập…" : "Đăng nhập"}
        </Button>

        {notice ? (
          <p className="form-error-box" role="alert">
            {notice}
          </p>
        ) : null}
        {successNotice ? (
          <p className="form-success" role="status">
            {successNotice}
          </p>
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
