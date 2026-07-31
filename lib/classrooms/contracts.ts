export const classroomCodePattern =
  /^PLV-CLS-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ClassroomMembershipStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "LEFT"
  | "REMOVED";

export type ActiveClassroomMembershipStatus = "PENDING" | "APPROVED";

export type TeacherClassroomSummary = {
  classroomId: string;
  name: string;
  grade: number;
  classCode: string;
  status: "ACTIVE";
  createdAt: string;
  pendingCount: number;
  approvedCount: number;
};

export type TeacherClassroomState = {
  classrooms: TeacherClassroomSummary[];
};

export type ClassroomRosterItem = {
  membershipId: string;
  status: ActiveClassroomMembershipStatus;
  studentDisplayName: string;
  grade: number;
  requestedAt: string;
  respondedAt: string | null;
};

export type TeacherClassroomDetail = {
  classroom: Omit<
    TeacherClassroomSummary,
    "pendingCount" | "approvedCount"
  >;
  memberships: ClassroomRosterItem[];
};

export type ClassroomPreview = {
  classroomName: string;
  grade: number;
  teacherDisplayName: string;
  membershipStatus: ClassroomMembershipStatus | null;
};

export type StudentClassroomMembership = {
  membershipId: string;
  classroomName: string;
  grade: number;
  teacherDisplayName: string;
  status: ActiveClassroomMembershipStatus;
  requestedAt: string;
  respondedAt: string | null;
};

export type StudentClassroomState = {
  memberships: StudentClassroomMembership[];
};

export type ClassroomAction =
  | "TEACHER_APPROVE"
  | "TEACHER_REJECT"
  | "STUDENT_CANCEL"
  | "STUDENT_LEAVE"
  | "TEACHER_REMOVE";

export type CreateClassroomRequest = {
  name: string;
  grade: number;
  requestId: string;
};

type ClassroomActionRequest = {
  membershipId: string;
  action: ClassroomAction;
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

function isGrade(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 9
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0
  );
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

function isActiveMembershipStatus(
  value: unknown,
): value is ActiveClassroomMembershipStatus {
  return value === "PENDING" || value === "APPROVED";
}

function isMembershipStatus(
  value: unknown,
): value is ClassroomMembershipStatus {
  return (
    value === "PENDING" ||
    value === "APPROVED" ||
    value === "REJECTED" ||
    value === "CANCELLED" ||
    value === "LEFT" ||
    value === "REMOVED"
  );
}

function isDisplayName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim() === value &&
    value.length >= 2 &&
    value.length <= 100
  );
}

function parseTeacherClassroom(
  value: unknown,
  includeCounts: boolean,
): TeacherClassroomSummary | Omit<
  TeacherClassroomSummary,
  "pendingCount" | "approvedCount"
> | null {
  if (!isRecord(value)) return null;

  const allowedKeys = [
    "classroom_id",
    "name",
    "grade",
    "class_code",
    "status",
    "created_at",
    ...(includeCounts ? ["pending_count", "approved_count"] : []),
  ];

  if (
    !hasOnlyKeys(value, allowedKeys) ||
    typeof value.classroom_id !== "string" ||
    !uuidPattern.test(value.classroom_id) ||
    typeof value.name !== "string" ||
    value.name.trim() !== value.name ||
    value.name.length < 2 ||
    value.name.length > 80 ||
    !isGrade(value.grade) ||
    typeof value.class_code !== "string" ||
    !classroomCodePattern.test(value.class_code) ||
    value.status !== "ACTIVE" ||
    !isTimestamp(value.created_at)
  ) {
    return null;
  }

  const base = {
    classroomId: value.classroom_id,
    name: value.name,
    grade: value.grade,
    classCode: value.class_code,
    status: "ACTIVE" as const,
    createdAt: value.created_at,
  };

  if (!includeCounts) return base;
  if (
    !isNonNegativeInteger(value.pending_count) ||
    !isNonNegativeInteger(value.approved_count)
  ) {
    return null;
  }

  return {
    ...base,
    pendingCount: value.pending_count,
    approvedCount: value.approved_count,
  };
}

export function normalizeClassroomCode(value: string) {
  return value.trim().toUpperCase();
}

export function normalizeClassroomName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function parseCreateClassroomRequest(
  value: unknown,
): CreateClassroomRequest | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["name", "grade", "requestId"]) ||
    typeof value.name !== "string" ||
    !isGrade(value.grade) ||
    !isUuid(value.requestId)
  ) {
    return null;
  }

  const name = normalizeClassroomName(value.name);
  if (name.length < 2 || name.length > 80) return null;

  return {
    name,
    grade: value.grade,
    requestId: value.requestId,
  };
}

export function parseClassroomCodeRequest(value: unknown) {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["classCode"]) ||
    typeof value.classCode !== "string"
  ) {
    return null;
  }

  const classCode = normalizeClassroomCode(value.classCode);
  return classroomCodePattern.test(classCode) ? classCode : null;
}

export function parseClassroomActionRequest(
  value: unknown,
): ClassroomActionRequest | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["membershipId", "action"]) ||
    !isUuid(value.membershipId) ||
    (value.action !== "TEACHER_APPROVE" &&
      value.action !== "TEACHER_REJECT" &&
      value.action !== "STUDENT_CANCEL" &&
      value.action !== "STUDENT_LEAVE" &&
      value.action !== "TEACHER_REMOVE")
  ) {
    return null;
  }

  return {
    membershipId: value.membershipId,
    action: value.action,
  };
}

export function parseTeacherClassroomResult(
  value: unknown,
): TeacherClassroomSummary | null {
  const parsed = parseTeacherClassroom(value, true);
  if (!parsed || !("pendingCount" in parsed)) return null;
  return parsed;
}

export function parseCreatedClassroomResult(
  value: unknown,
): Omit<
  TeacherClassroomSummary,
  "pendingCount" | "approvedCount"
> | null {
  return parseTeacherClassroom(value, false);
}

export function parseTeacherClassroomState(
  value: unknown,
): TeacherClassroomState | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["classrooms"]) ||
    !Array.isArray(value.classrooms)
  ) {
    return null;
  }

  const classrooms: TeacherClassroomSummary[] = [];
  for (const item of value.classrooms) {
    const classroom = parseTeacherClassroomResult(item);
    if (!classroom) return null;
    classrooms.push(classroom);
  }

  return { classrooms };
}

export function parseTeacherClassroomDetail(
  value: unknown,
): TeacherClassroomDetail | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["classroom", "memberships"]) ||
    !Array.isArray(value.memberships)
  ) {
    return null;
  }

  const classroom = parseCreatedClassroomResult(value.classroom);
  if (!classroom) return null;

  const memberships: ClassroomRosterItem[] = [];
  for (const item of value.memberships) {
    if (
      !isRecord(item) ||
      !hasOnlyKeys(item, [
        "membership_id",
        "status",
        "student_display_name",
        "grade",
        "requested_at",
        "responded_at",
      ]) ||
      !isUuid(item.membership_id) ||
      !isActiveMembershipStatus(item.status) ||
      !isDisplayName(item.student_display_name) ||
      !isGrade(item.grade) ||
      !isTimestamp(item.requested_at) ||
      (item.responded_at !== null &&
        !isTimestamp(item.responded_at))
    ) {
      return null;
    }

    memberships.push({
      membershipId: item.membership_id,
      status: item.status,
      studentDisplayName: item.student_display_name,
      grade: item.grade,
      requestedAt: item.requested_at,
      respondedAt: item.responded_at,
    });
  }

  return { classroom, memberships };
}

export function parseClassroomPreview(
  value: unknown,
): ClassroomPreview | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "found",
      "classroom_name",
      "grade",
      "teacher_display_name",
      "membership_status",
    ]) ||
    value.found !== true ||
    typeof value.classroom_name !== "string" ||
    value.classroom_name.trim() !== value.classroom_name ||
    value.classroom_name.length < 2 ||
    value.classroom_name.length > 80 ||
    !isGrade(value.grade) ||
    !isDisplayName(value.teacher_display_name) ||
    (value.membership_status !== null &&
      !isMembershipStatus(value.membership_status))
  ) {
    return null;
  }

  return {
    classroomName: value.classroom_name,
    grade: value.grade,
    teacherDisplayName: value.teacher_display_name,
    membershipStatus: value.membership_status,
  };
}

export function isClassroomNotFound(value: unknown) {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["found"]) &&
    value.found === false
  );
}

export function parseStudentClassroomState(
  value: unknown,
): StudentClassroomState | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["memberships"]) ||
    !Array.isArray(value.memberships)
  ) {
    return null;
  }

  const memberships: StudentClassroomMembership[] = [];
  for (const item of value.memberships) {
    if (
      !isRecord(item) ||
      !hasOnlyKeys(item, [
        "membership_id",
        "classroom_name",
        "grade",
        "teacher_display_name",
        "status",
        "requested_at",
        "responded_at",
      ]) ||
      !isUuid(item.membership_id) ||
      typeof item.classroom_name !== "string" ||
      item.classroom_name.trim() !== item.classroom_name ||
      item.classroom_name.length < 2 ||
      item.classroom_name.length > 80 ||
      !isGrade(item.grade) ||
      !isDisplayName(item.teacher_display_name) ||
      !isActiveMembershipStatus(item.status) ||
      !isTimestamp(item.requested_at) ||
      (item.responded_at !== null &&
        !isTimestamp(item.responded_at))
    ) {
      return null;
    }

    memberships.push({
      membershipId: item.membership_id,
      classroomName: item.classroom_name,
      grade: item.grade,
      teacherDisplayName: item.teacher_display_name,
      status: item.status,
      requestedAt: item.requested_at,
      respondedAt: item.responded_at,
    });
  }

  return { memberships };
}

export function parseClassroomRequestResult(value: unknown) {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["created", "status"]) &&
    value.created === true &&
    isActiveMembershipStatus(value.status)
  );
}

export function parseClassroomMutationResult(
  value: unknown,
  expectedStatus:
    | "APPROVED"
    | "REJECTED"
    | "CANCELLED"
    | "LEFT"
    | "REMOVED",
) {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["status"]) &&
    value.status === expectedStatus
  );
}

export function parseClassroomApiError(value: unknown) {
  if (
    !isRecord(value) ||
    value.ok !== false ||
    !hasOnlyKeys(value, ["ok", "error"]) ||
    !isRecord(value.error) ||
    !hasOnlyKeys(value.error, ["code", "message"]) ||
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

export function parseClassroomApiSuccess(value: unknown) {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["ok"]) &&
    value.ok === true
  );
}

export function parseCreatedClassroomApiResponse(value: unknown) {
  if (
    !isRecord(value) ||
    value.ok !== true ||
    !hasOnlyKeys(value, ["ok", "data"])
  ) {
    return null;
  }
  return parseCreatedClassroomResult(value.data);
}

export function parseClassroomPreviewApiResponse(value: unknown) {
  if (
    !isRecord(value) ||
    value.ok !== true ||
    !hasOnlyKeys(value, ["ok", "data"])
  ) {
    return null;
  }

  if (!isRecord(value.data)) return null;
  return parseClassroomPreview({
    found: true,
    classroom_name: value.data.classroomName,
    grade: value.data.grade,
    teacher_display_name: value.data.teacherDisplayName,
    membership_status: value.data.membershipStatus,
  });
}
