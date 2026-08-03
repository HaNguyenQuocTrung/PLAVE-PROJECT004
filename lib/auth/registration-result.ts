export type RegistrationRole = "STUDENT" | "PARENT" | "TEACHER";

export type RegistrationOutcome =
  | "CREATED_SESSION"
  | "CREATED_REQUIRES_CONFIRMATION"
  | "CREATED_EMAIL_DELIVERY_UNCERTAIN"
  | "EMAIL_RATE_LIMITED"
  | "DATABASE_TRIGGER_FAILED"
  | "USER_ALREADY_EXISTS"
  | "SERVICE_UNAVAILABLE"
  | "VALIDATION_FAILED";

type AuthErrorLike = Readonly<{
  code?: string;
  message?: string;
  status?: number;
}>;

type SignUpDataLike = Readonly<{
  session: unknown | null;
  user: Readonly<{ identities?: readonly unknown[] | null }> | null;
}>;

export type RegistrationResult = Readonly<{
  ok: boolean;
  outcome: RegistrationOutcome;
  message: string;
}>;

export function buildRegistrationMetadata(
  role: RegistrationRole,
  grade: number | null,
) {
  return role === "STUDENT" ? { role, grade } : { role };
}

export function validationFailure(message: string): RegistrationResult {
  return { ok: false, outcome: "VALIDATION_FAILED", message };
}

export function registrationServiceUnavailable(): RegistrationResult {
  return {
    ok: false,
    outcome: "SERVICE_UNAVAILABLE",
    message:
      "Chưa thể kết nối dịch vụ đăng ký. Tài khoản chưa được tạo; vui lòng thử lại sau.",
  };
}

export function classifySignUpResult(
  data: SignUpDataLike,
  error: AuthErrorLike | null,
): RegistrationResult {
  const code = error?.code?.toLowerCase() ?? "";
  const message = error?.message?.toLowerCase() ?? "";

  if (
    code === "user_already_exists" ||
    message.includes("already registered") ||
    (!error && data.user?.identities?.length === 0)
  ) {
    return {
      ok: true,
      outcome: "USER_ALREADY_EXISTS",
      message:
        "Nếu thông tin hợp lệ, PLAVE sẽ gửi hướng dẫn xác nhận đến email này. Hãy kiểm tra cả thư rác trước khi thử đăng nhập.",
    };
  }

  if (
    error?.status === 429 ||
    code.includes("rate_limit") ||
    message.includes("rate limit") ||
    message.includes("email rate")
  ) {
    return {
      ok: false,
      outcome: "EMAIL_RATE_LIMITED",
      message:
        "Dịch vụ email đang giới hạn tần suất. Không cần đăng ký lại; hãy chờ rồi kiểm tra hộp thư.",
    };
  }

  if (
    code === "unexpected_failure" &&
    (message.includes("database") || message.includes("saving new user")) ||
    message.includes("database error saving new user") ||
    message.includes("trigger")
  ) {
    return {
      ok: false,
      outcome: "DATABASE_TRIGGER_FAILED",
      message:
        "Tài khoản chưa được tạo vì hồ sơ hệ thống không thể khởi tạo. Vui lòng thử lại sau.",
    };
  }

  if (error) {
    const deliveryUncertain =
      code.includes("email") ||
      code.includes("smtp") ||
      message.includes("email") ||
      message.includes("mail") ||
      message.includes("smtp");
    return deliveryUncertain
      ? {
          ok: true,
          outcome: "CREATED_EMAIL_DELIVERY_UNCERTAIN",
          message:
            "Yêu cầu đăng ký đã được xử lý nhưng chưa thể xác nhận email đã gửi. Tài khoản có thể đã được tạo; không đăng ký lại.",
        }
      : {
          ok: false,
          outcome: "VALIDATION_FAILED",
          message: "Yêu cầu đăng ký không được chấp nhận. Vui lòng kiểm tra thông tin.",
        };
  }

  if (data.session) {
    return {
      ok: true,
      outcome: "CREATED_SESSION",
      message: "Tài khoản đã được tạo. Bạn có thể đăng nhập để tiếp tục.",
    };
  }

  return {
    ok: true,
    outcome: "CREATED_REQUIRES_CONFIRMATION",
    message: "Tài khoản đã được tạo và đang chờ xác nhận email.",
  };
}

export function uncertainTransportResult(): RegistrationResult {
  return {
    ok: true,
    outcome: "CREATED_EMAIL_DELIVERY_UNCERTAIN",
    message:
      "Kết nối kết thúc trước khi PLAVE nhận được kết quả. Tài khoản có thể đã được tạo; không đăng ký lại.",
  };
}
