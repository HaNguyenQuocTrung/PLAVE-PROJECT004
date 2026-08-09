"use client";

import Link from "next/link";
import { type FormEvent, useRef, useState, useTransition } from "react";

import { registerAccount } from "@/app/register/actions";
import { createAuthSubmissionGate } from "@/lib/auth/client-flow";
import type { RegistrationOutcome } from "@/lib/auth/registration-result";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { PasswordField } from "@/components/PasswordField";
import {
  RoleSelector,
  type RegistrationRole,
} from "@/components/RoleSelector";
import { AuthBrandPanel } from "@/components/AuthBrandPanel";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RegisterField =
  | "role"
  | "grade"
  | "invitationCode"
  | "email"
  | "password"
  | "confirmPassword"
  | "terms";

type RegisterErrors = Partial<Record<RegisterField, string>>;

const roleLabels: Record<RegistrationRole, string> = {
  student: "Học sinh",
  parent: "Phụ huynh",
  teacher: "Giáo viên",
};

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<RegistrationRole | null>(null);
  const [grade, setGrade] = useState("1");
  const [invitationCode, setInvitationCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [notice, setNotice] = useState("");
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registrationOutcome, setRegistrationOutcome] =
    useState<RegistrationOutcome | null>(null);
  const [isPending, startTransition] = useTransition();
  const submissionGateRef = useRef(createAuthSubmissionGate());

  const roleGroupRef = useRef<HTMLFieldSetElement>(null);
  const gradeRef = useRef<HTMLSelectElement>(null);
  const invitationCodeRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

  const chooseRole = (nextRole: RegistrationRole) => {
    setRole(nextRole);
    setErrors((current) => ({ ...current, role: undefined }));
    setNotice("");
  };

  const continueToDetails = () => {
    if (!role) {
      setErrors({ role: "Vui lòng chọn một vai trò để tiếp tục." });
      roleGroupRef.current?.focus();
      return;
    }
    setErrors({});
    setStep(2);
    window.requestAnimationFrame(() => emailRef.current?.focus());
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending || !role) return;

    setNotice("");
    const nextErrors: RegisterErrors = {};
    const normalizedEmail = email.trim().toLowerCase();

    if (role === "student" && !/^[1-9]$/.test(grade)) {
      nextErrors.grade = "Vui lòng chọn lớp từ 1 đến 9.";
    }
    if (
      role === "teacher" &&
      !/^PLV-TCH-[0-9A-F]{32}$/.test(
        invitationCode.trim().toUpperCase(),
      )
    ) {
      nextErrors.invitationCode = "Mã mời giáo viên chưa đúng định dạng.";
    }
    if (!normalizedEmail) {
      nextErrors.email = "Vui lòng nhập email.";
    } else if (!emailPattern.test(normalizedEmail)) {
      nextErrors.email = "Email chưa đúng định dạng.";
    }
    if (!password) {
      nextErrors.password = "Vui lòng nhập mật khẩu.";
    } else if (password.length < 8) {
      nextErrors.password = "Mật khẩu phải có ít nhất 8 ký tự.";
    }
    if (!confirmPassword) {
      nextErrors.confirmPassword = "Vui lòng nhập lại mật khẩu.";
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Hai mật khẩu chưa trùng nhau.";
    }
    if (!acceptedTerms) {
      nextErrors.terms = "Bạn cần đồng ý với điều khoản để tiếp tục.";
    }

    setErrors(nextErrors);
    const firstError: Array<
      [RegisterField, { focus: () => void } | null]
    > = [
      ["grade", gradeRef.current],
      ["invitationCode", invitationCodeRef.current],
      ["email", emailRef.current],
      ["password", passwordRef.current],
      ["confirmPassword", confirmPasswordRef.current],
      ["terms", termsRef.current],
    ];
    const target = firstError.find(([field]) => nextErrors[field]);
    if (target) {
      target[1]?.focus();
      return;
    }

    if (!submissionGateRef.current.tryStart()) return;

    startTransition(async () => {
      try {
        const result = await registerAccount({
          role:
            role === "student"
              ? "STUDENT"
              : role === "parent"
                ? "PARENT"
                : "TEACHER",
          grade: role === "student" ? Number(grade) : null,
          invitationCode:
            role === "teacher"
              ? invitationCode.trim().toUpperCase()
              : null,
          email: normalizedEmail,
          password,
          confirmPassword,
          acceptedTerms,
        });

        if (!result.ok) {
          setNotice(result.message);
          return;
        }

        setPassword("");
        setConfirmPassword("");
        setInvitationCode("");
        setNotice(result.message);
        setRegistrationOutcome(result.outcome);
        setRegistrationComplete(true);
      } finally {
        submissionGateRef.current.reset();
      }
    });
  };

  if (registrationComplete) {
    const confirmationExpected =
      registrationOutcome === "CREATED_REQUIRES_CONFIRMATION" ||
      registrationOutcome === "USER_ALREADY_EXISTS";
    const deliveryUncertain =
      registrationOutcome === "CREATED_EMAIL_DELIVERY_UNCERTAIN";
    return (
      <section className="content-page page-shell" aria-live="polite">
        <p className="eyebrow">
          {deliveryUncertain ? "Cần kiểm tra" : "Đăng ký đã được xử lý"}
        </p>
        <h1>
          {confirmationExpected
            ? "Kiểm tra email để tiếp tục"
            : deliveryUncertain
              ? "Tài khoản có thể đã được tạo"
              : "Tài khoản đã được tạo"}
        </h1>
        <p>
          {notice}
        </p>
        {confirmationExpected ? (
          <p>
            Hãy mở liên kết trong email để tiếp tục{" "}
            {role === "teacher" ? "xác minh giáo viên" : "hoàn tất hồ sơ"}.
          </p>
        ) : null}
        {deliveryUncertain ? (
          <p>
            Hãy kiểm tra hộp thư và thử đăng nhập. PLAVE sẽ không tự gửi lại
            email hoặc tự lặp lại yêu cầu đăng ký.
          </p>
        ) : null}
        {role === "teacher" ? (
          <p>
            Hãy giữ mã mời ở nơi riêng tư. Sau khi xác nhận email, bạn cần nhập
            lại mã để hoàn tất xác minh.
          </p>
        ) : null}
        <p>
          Chưa xác nhận? Bạn vẫn có thể học bài demo mà không cần tài khoản.
        </p>
        <div className="page-actions">
          <Button href="/login">Quay về đăng nhập</Button>
          <Button href="/demo" variant="secondary">
            Học thử
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="register-page register-page--v2 page-shell">
      <AuthBrandPanel
        eyebrow="Bắt đầu với PLAVE"
        title="Mỗi vai trò, một không gian phù hợp."
        description="Chọn cách bạn đồng hành cùng việc học Toán. Học sinh và phụ huynh đăng ký trực tiếp; giáo viên dùng mã mời riêng."
      />

      <div className="register-workspace">
      <div className="step-indicator" aria-label={`Bước ${step} trên 2`}>
        <span className="step-indicator__active">
          <strong>1</strong> Chọn vai trò
        </span>
        <span className={step >= 2 ? "step-indicator__active" : ""}>
          <strong>2</strong> Tạo tài khoản
        </span>
      </div>

      {step === 1 ? (
        <div className="auth-card auth-card--v2">
          <RoleSelector
            selectedRole={role}
            onChange={chooseRole}
            error={errors.role}
            groupRef={roleGroupRef}
          />
          <Button onClick={continueToDetails} fullWidth disabled={!role}>
            Tiếp tục
          </Button>
          <p className="auth-card__footer">
            Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
          </p>
        </div>
      ) : (
        <form className="auth-card auth-card--v2 register-form" onSubmit={submit} noValidate>
          <div className="selected-role">
            <span>Vai trò đã chọn</span>
            <strong>{role ? roleLabels[role] : "Chưa chọn"}</strong>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setStep(1);
                setErrors({});
                setNotice("");
                window.requestAnimationFrame(() =>
                  roleGroupRef.current?.focus(),
                );
              }}
            >
              Thay đổi
            </button>
          </div>

          {role === "student" ? (
            <div className="field">
              <label htmlFor="register-grade">
                Lớp <span aria-hidden="true">*</span>
              </label>
              <div
                className={`field__control ${
                  errors.grade ? "field__control--error" : ""
                }`}
              >
                <select
                  ref={gradeRef}
                  id="register-grade"
                  name="register-grade"
                  value={grade}
                  disabled={isPending}
                  onChange={(event) => {
                    setGrade(event.target.value);
                    setErrors((current) => ({
                      ...current,
                      grade: undefined,
                    }));
                  }}
                  aria-invalid={Boolean(errors.grade)}
                  aria-describedby={
                    errors.grade ? "register-grade-error" : undefined
                  }
                >
                  {Array.from({ length: 9 }, (_, index) => index + 1).map(
                    (item) => (
                      <option key={item} value={item}>
                        Lớp {item}
                      </option>
                    ),
                  )}
                </select>
              </div>
              {errors.grade ? (
                <p
                  className="field__error"
                  id="register-grade-error"
                  role="alert"
                >
                  {errors.grade}
                </p>
              ) : null}
            </div>
          ) : role === "parent" ? (
            <p className="role-note">
              Sau khi hoàn tất hồ sơ, bạn có thể gửi yêu cầu kết nối bằng mã
              học sinh. Học sinh sẽ là người đồng ý hoặc từ chối.
            </p>
          ) : (
            <>
              <FormField
                id="register-teacher-invitation"
                label="Mã mời giáo viên"
                value={invitationCode}
                onChange={(event) => {
                  setInvitationCode(event.target.value);
                  setErrors((current) => ({
                    ...current,
                    invitationCode: undefined,
                  }));
                  setNotice("");
                }}
                autoComplete="off"
                inputMode="text"
                required
                hint="Mã không được lưu vào tài khoản. Bạn sẽ nhập lại sau khi xác nhận email."
                error={errors.invitationCode}
                inputRef={invitationCodeRef}
                disabled={isPending}
              />
              <p className="role-note">
                Hãy giữ mã mời ở nơi riêng tư để hoàn tất xác minh sau khi mở
                email xác nhận.
              </p>
            </>
          )}

          <FormField
            id="register-email"
            label="Email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrors((current) => ({ ...current, email: undefined }));
              setNotice("");
            }}
            autoComplete="email"
            inputMode="email"
            placeholder="Enter your email address"
            required
            error={errors.email}
            inputRef={emailRef}
            disabled={isPending}
          />

          <div className="form-grid">
            <PasswordField
              id="register-password"
              label="Mật khẩu"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrors((current) => ({
                  ...current,
                  password: undefined,
                }));
                setNotice("");
              }}
              autoComplete="new-password"
              required
              hint="Ít nhất 8 ký tự. Không dùng lại mật khẩu của tài khoản khác."
              error={errors.password}
              inputRef={passwordRef}
              disabled={isPending}
            />
            <PasswordField
              id="register-confirm-password"
              label="Xác nhận mật khẩu"
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
          </div>

          <div className="terms-field">
            <label className="checkbox-label">
              <input
                ref={termsRef}
                type="checkbox"
                checked={acceptedTerms}
                disabled={isPending}
                onChange={(event) => {
                  setAcceptedTerms(event.target.checked);
                  setErrors((current) => ({
                    ...current,
                    terms: undefined,
                  }));
                  setNotice("");
                }}
                aria-invalid={Boolean(errors.terms)}
                aria-describedby={errors.terms ? "terms-error" : undefined}
              />
              <span>
                Tôi đồng ý với <Link href="/terms">Điều khoản sử dụng</Link> và{" "}
                <Link href="/privacy">Chính sách quyền riêng tư</Link>.
              </span>
            </label>
            {errors.terms ? (
              <p className="field__error" id="terms-error" role="alert">
                {errors.terms}
              </p>
            ) : null}
          </div>

          <Button type="submit" fullWidth disabled={isPending} loading={isPending}>
            Tạo tài khoản
          </Button>

          {notice ? (
            <p className="form-error-box" role="alert">
              {notice}
            </p>
          ) : null}

          <p className="privacy-note">
            PLAVE không hiển thị mật khẩu của bạn trong hồ sơ.
          </p>
        </form>
      )}
      </div>
    </section>
  );
}
