import { normalizeStudentCode } from "./contracts.ts";

export type ConnectionAction =
  | "APPROVE"
  | "REJECT"
  | "CANCEL"
  | "REVOKE";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseStudentCodeRequest(value: unknown) {
  if (
    !isRecord(value) ||
    typeof value.studentCode !== "string" ||
    value.studentCode.length > 32
  ) {
    return null;
  }

  const studentCode = normalizeStudentCode(value.studentCode);
  return studentCode || null;
}

export function parseConnectionActionRequest(value: unknown) {
  if (
    !isRecord(value) ||
    typeof value.connectionId !== "string" ||
    !uuidPattern.test(value.connectionId) ||
    (value.action !== "APPROVE" &&
      value.action !== "REJECT" &&
      value.action !== "CANCEL" &&
      value.action !== "REVOKE")
  ) {
    return null;
  }

  return {
    connectionId: value.connectionId,
    action: value.action as ConnectionAction,
  };
}
