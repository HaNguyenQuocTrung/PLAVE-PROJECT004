export type AuthOperation =
  | "SIGN_UP"
  | "PASSWORD_RESET_EMAIL"
  | "RESEND_VERIFICATION_EMAIL"
  | "PASSWORD_LOGIN"
  | "VERIFY_EMAIL_OTP"
  | "REFRESH_SESSION"
  | "OTHER";

export type AuthThrottleClassification = Readonly<{
  kind: "EMAIL_RATE_LIMITED" | "THROTTLED";
}>;

const emailProducingOperations = new Set<AuthOperation>([
  "SIGN_UP",
  "PASSWORD_RESET_EMAIL",
  "RESEND_VERIFICATION_EMAIL",
]);

const generalThrottleCodes = new Set([
  "over_request_rate_limit",
  "over_sms_send_rate_limit",
]);

export const emailRateLimitMessage =
  "Dịch vụ email đang giới hạn tần suất. Không cần đăng ký lại; hãy chờ rồi kiểm tra hộp thư.";

export const neutralThrottleMessage =
  "Yêu cầu đang bị giới hạn tần suất. Vui lòng chờ rồi thử lại.";

function readStringField(error: unknown, field: "code" | "message") {
  if (!error || typeof error !== "object") return "";

  try {
    const value = (error as Record<string, unknown>)[field];
    return typeof value === "string"
      ? value.trim().toLowerCase().replace(/\s+/g, " ")
      : "";
  } catch {
    return "";
  }
}

function readStatus(error: unknown) {
  if (!error || typeof error !== "object") return null;

  try {
    const value = (error as Record<string, unknown>).status;
    return typeof value === "number" && Number.isInteger(value) ? value : null;
  } catch {
    return null;
  }
}

function hasNarrowEmailThrottleMessage(message: string) {
  return (
    /\b(?:email|e-mail) (?:send(?:ing)? )?rate limit(?:ed| exceeded)?\b/u.test(
      message,
    ) ||
    /\brate limit(?:ed| exceeded)? (?:for )?(?:sending )?(?:email|e-mail)s?\b/u.test(
      message,
    )
  );
}

function hasGeneralThrottleMessage(message: string) {
  return /\b(?:too many requests|rate limit(?:ed| exceeded)?)\b/u.test(message);
}

export function classifyAuthThrottle(
  operation: AuthOperation,
  error: unknown,
): AuthThrottleClassification | null {
  const code = readStringField(error, "code");
  const message = readStringField(error, "message");
  const status = readStatus(error);
  const hasEmailSignal =
    code === "over_email_send_rate_limit" ||
    hasNarrowEmailThrottleMessage(message);
  const hasThrottleSignal =
    status === 429 ||
    hasEmailSignal ||
    generalThrottleCodes.has(code) ||
    hasGeneralThrottleMessage(message);

  if (!hasThrottleSignal) return null;

  return {
    kind:
      emailProducingOperations.has(operation) && hasEmailSignal
        ? "EMAIL_RATE_LIMITED"
        : "THROTTLED",
  };
}

export function authThrottleMessage(
  classification: AuthThrottleClassification,
) {
  return classification.kind === "EMAIL_RATE_LIMITED"
    ? emailRateLimitMessage
    : neutralThrottleMessage;
}
