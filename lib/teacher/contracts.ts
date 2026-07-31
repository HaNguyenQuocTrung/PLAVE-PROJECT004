export type TeacherActivationRequest = {
  fullName: string;
  invitationCode: string;
};

const teacherInvitationPattern = /^PLV-TCH-[0-9A-F]{32}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
) {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

export function normalizeTeacherInvitationCode(value: string) {
  return value.trim().toUpperCase();
}

export function isTeacherInvitationCode(value: unknown): value is string {
  return (
    typeof value === "string" &&
    teacherInvitationPattern.test(normalizeTeacherInvitationCode(value))
  );
}

export function normalizeTeacherFullName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function parseTeacherActivationRequest(
  value: unknown,
): TeacherActivationRequest | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["fullName", "invitationCode"]) ||
    typeof value.fullName !== "string" ||
    typeof value.invitationCode !== "string"
  ) {
    return null;
  }

  const fullName = normalizeTeacherFullName(value.fullName);
  const invitationCode = normalizeTeacherInvitationCode(
    value.invitationCode,
  );

  if (
    fullName.length < 2 ||
    fullName.length > 100 ||
    !teacherInvitationPattern.test(invitationCode)
  ) {
    return null;
  }

  return { fullName, invitationCode };
}

export function parseTeacherActivationRpcResult(value: unknown) {
  if (
    !isRecord(value) ||
    typeof value.activated !== "boolean" ||
    !hasOnlyKeys(
      value,
      value.activated ? ["activated", "full_name"] : ["activated"],
    )
  ) {
    return null;
  }

  if (!value.activated) {
    return { activated: false as const };
  }

  if (
    typeof value.full_name !== "string" ||
    value.full_name !== normalizeTeacherFullName(value.full_name) ||
    value.full_name.length < 2 ||
    value.full_name.length > 100
  ) {
    return null;
  }

  return {
    activated: true as const,
    fullName: value.full_name,
  };
}

export function parseTeacherProfileRpcResult(value: unknown) {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "full_name",
      "activation_status",
      "activated_at",
    ]) ||
    typeof value.full_name !== "string" ||
    value.full_name !== normalizeTeacherFullName(value.full_name) ||
    value.full_name.length < 2 ||
    value.full_name.length > 100 ||
    value.activation_status !== "ACTIVE" ||
    typeof value.activated_at !== "string" ||
    Number.isNaN(Date.parse(value.activated_at))
  ) {
    return null;
  }

  return {
    fullName: value.full_name,
    activatedAt: value.activated_at,
  };
}

export function parseTeacherActivationApiResponse(value: unknown) {
  if (
    !isRecord(value) ||
    value.ok !== true ||
    !hasOnlyKeys(value, ["ok", "data"]) ||
    !isRecord(value.data) ||
    !hasOnlyKeys(value.data, ["fullName"]) ||
    typeof value.data.fullName !== "string"
  ) {
    return null;
  }

  const fullName = normalizeTeacherFullName(value.data.fullName);
  if (
    fullName !== value.data.fullName ||
    fullName.length < 2 ||
    fullName.length > 100
  ) {
    return null;
  }

  return { fullName };
}

export function parseTeacherActivationApiError(value: unknown) {
  if (
    !isRecord(value) ||
    value.ok !== false ||
    !isRecord(value.error) ||
    typeof value.error.code !== "string" ||
    typeof value.error.message !== "string"
  ) {
    return null;
  }

  return {
    code: value.error.code,
    message: value.error.message,
  };
}
