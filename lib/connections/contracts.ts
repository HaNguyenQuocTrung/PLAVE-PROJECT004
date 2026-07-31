export const studentCodePattern = /^PLV-[0-9A-F]{12}$/;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ActiveConnectionStatus = "PENDING" | "APPROVED";
export type ConnectionViewerRole = "STUDENT" | "PARENT";

export type StudentConnectionPreview = {
  maskedStudentName: string;
  grade: number;
};

export type ConnectionSummary = {
  connectionId: string;
  status: ActiveConnectionStatus;
  displayName: string;
  grade: number | null;
  requestedAt: string;
  respondedAt: string | null;
};

export type ConnectionState = {
  viewerRole: ConnectionViewerRole;
  connections: ConnectionSummary[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
) {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

export function normalizeStudentCode(value: string) {
  return value.trim().toUpperCase();
}

export function parseStudentConnectionPreview(
  value: unknown,
): StudentConnectionPreview | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["found", "masked_student_name", "grade"]) ||
    value.found !== true ||
    typeof value.masked_student_name !== "string" ||
    value.masked_student_name.length < 2 ||
    !Number.isInteger(value.grade) ||
    Number(value.grade) < 1 ||
    Number(value.grade) > 9
  ) {
    return null;
  }

  return {
    maskedStudentName: value.masked_student_name,
    grade: Number(value.grade),
  };
}

export function isStudentConnectionNotFound(value: unknown) {
  return isRecord(value) && value.found === false;
}

export function parseConnectionState(value: unknown): ConnectionState | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["viewer_role", "connections"]) ||
    (value.viewer_role !== "STUDENT" && value.viewer_role !== "PARENT") ||
    !Array.isArray(value.connections)
  ) {
    return null;
  }

  const connections: ConnectionSummary[] = [];
  for (const item of value.connections) {
    if (
      !isRecord(item) ||
      !hasOnlyKeys(item, [
        "connection_id",
        "status",
        "display_name",
        "grade",
        "requested_at",
        "responded_at",
      ]) ||
      typeof item.connection_id !== "string" ||
      !uuidPattern.test(item.connection_id) ||
      (item.status !== "PENDING" && item.status !== "APPROVED") ||
      typeof item.display_name !== "string" ||
      item.display_name.trim().length < 2 ||
      (item.grade !== null &&
        (!Number.isInteger(item.grade) ||
          Number(item.grade) < 1 ||
          Number(item.grade) > 9)) ||
      typeof item.requested_at !== "string" ||
      (item.responded_at !== null &&
        typeof item.responded_at !== "string")
    ) {
      return null;
    }

    connections.push({
      connectionId: item.connection_id,
      status: item.status,
      displayName: item.display_name,
      grade: item.grade === null ? null : Number(item.grade),
      requestedAt: item.requested_at,
      respondedAt: item.responded_at,
    });
  }

  return {
    viewerRole: value.viewer_role,
    connections,
  };
}

export function parseConnectionMutationResult(
  value: unknown,
  allowedStatuses: readonly string[],
) {
  return (
    isRecord(value) &&
    typeof value.status === "string" &&
    allowedStatuses.includes(value.status)
  );
}

export function parseConnectionRequestResult(value: unknown) {
  return (
    isRecord(value) &&
    value.created === true &&
    (value.status === "PENDING" || value.status === "APPROVED")
  );
}
