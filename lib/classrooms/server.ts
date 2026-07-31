import "server-only";

import {
  isClassroomNotFound,
  parseClassroomMutationResult,
  parseClassroomPreview,
  parseClassroomRequestResult,
  parseCreatedClassroomResult,
  parseStudentClassroomState,
  parseTeacherClassroomDetail,
  parseTeacherClassroomState,
  type ClassroomAction,
  type CreateClassroomRequest,
  type StudentClassroomState,
  type TeacherClassroomDetail,
  type TeacherClassroomState,
} from "@/lib/classrooms/contracts";
import { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;
type ClassroomActorRole = "STUDENT" | "TEACHER";

const classroomNotFoundMessage =
  "Không tìm thấy lớp học phù hợp. Vui lòng kiểm tra lại mã.";
const classroomUpdateMessage =
  "Chưa thể cập nhật lớp học. Vui lòng thử lại.";

async function getClassroomActor(expectedRole: ClassroomActorRole) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false as const,
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== expectedRole ||
    !profile.onboarding_completed
  ) {
    return {
      ok: false as const,
      status: 403,
      code: "ACCESS_DENIED",
      message: "Tài khoản không có quyền thực hiện thao tác này.",
    };
  }

  if (expectedRole === "TEACHER") {
    const { data: teacherProfile, error: teacherError } = await supabase.rpc(
      "get_my_teacher_profile",
    );
    if (teacherError || !teacherProfile) {
      return {
        ok: false as const,
        status: 403,
        code: "TEACHER_ACTIVATION_REQUIRED",
        message: "Tài khoản giáo viên chưa được xác minh.",
      };
    }
  } else {
    const { data: studentProfile, error: studentError } = await supabase
      .from("student_profiles")
      .select("grade")
      .eq("user_id", user.id)
      .maybeSingle();
    if (
      studentError ||
      !studentProfile ||
      !Number.isInteger(studentProfile.grade)
    ) {
      return {
        ok: false as const,
        status: 403,
        code: "STUDENT_PROFILE_REQUIRED",
        message: "Hồ sơ học sinh chưa sẵn sàng.",
      };
    }
  }

  return { ok: true as const, supabase };
}

export async function loadTeacherClassrooms(
  supabase: ServerSupabaseClient,
): Promise<
  | { ok: true; state: TeacherClassroomState }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc(
    "get_my_teacher_classrooms",
  );
  if (error) {
    return {
      ok: false,
      message: "Chưa thể tải danh sách lớp học. Vui lòng thử lại.",
    };
  }

  const state = parseTeacherClassroomState(data);
  if (!state) {
    return {
      ok: false,
      message: "Dữ liệu lớp học chưa sẵn sàng.",
    };
  }

  return { ok: true, state };
}

export async function loadTeacherClassroom(
  supabase: ServerSupabaseClient,
  classroomId: string,
): Promise<
  | { ok: true; detail: TeacherClassroomDetail }
  | { ok: false; reason: "NOT_FOUND" | "UNAVAILABLE"; message: string }
> {
  const { data, error } = await supabase.rpc("get_teacher_classroom", {
    p_classroom_id: classroomId,
  });

  if (error) {
    return {
      ok: false,
      reason: "UNAVAILABLE",
      message: "Chưa thể tải thông tin lớp học. Vui lòng thử lại.",
    };
  }
  if (data === null) {
    return {
      ok: false,
      reason: "NOT_FOUND",
      message: "Không tìm thấy lớp học.",
    };
  }

  const detail = parseTeacherClassroomDetail(data);
  if (!detail) {
    return {
      ok: false,
      reason: "UNAVAILABLE",
      message: "Dữ liệu lớp học chưa sẵn sàng.",
    };
  }

  return { ok: true, detail };
}

export async function loadStudentClassrooms(
  supabase: ServerSupabaseClient,
): Promise<
  | { ok: true; state: StudentClassroomState }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc(
    "get_my_classroom_memberships",
  );
  if (error) {
    return {
      ok: false,
      message: "Chưa thể tải lớp học của em. Vui lòng thử lại.",
    };
  }

  const state = parseStudentClassroomState(data);
  if (!state) {
    return {
      ok: false,
      message: "Dữ liệu lớp học chưa sẵn sàng.",
    };
  }

  return { ok: true, state };
}

export async function createTeacherClassroom(
  input: CreateClassroomRequest,
) {
  const access = await getClassroomActor("TEACHER");
  if (!access.ok) return access;

  const { data, error } = await access.supabase.rpc(
    "create_teacher_classroom",
    {
      p_name: input.name,
      p_grade: input.grade,
      p_request_id: input.requestId,
    },
  );
  const classroom = parseCreatedClassroomResult(data);

  if (error || !classroom) {
    return {
      ok: false as const,
      status: 409,
      code: "CLASSROOM_CREATE_FAILED",
      message: "Chưa thể tạo lớp học. Vui lòng thử lại.",
    };
  }

  return {
    ok: true as const,
    status: 200,
    classroom,
  };
}

export async function previewClassroom(classCode: string) {
  const access = await getClassroomActor("STUDENT");
  if (!access.ok) return access;

  const { data, error } = await access.supabase.rpc(
    "preview_classroom_by_code",
    { p_class_code: classCode },
  );

  if (error || isClassroomNotFound(data)) {
    return {
      ok: false as const,
      status: 200,
      code: "CLASSROOM_NOT_FOUND",
      message: classroomNotFoundMessage,
    };
  }

  const preview = parseClassroomPreview(data);
  if (!preview) {
    return {
      ok: false as const,
      status: 500,
      code: "CLASSROOM_PREVIEW_UNAVAILABLE",
      message: "Chưa thể tìm lớp học lúc này. Vui lòng thử lại.",
    };
  }

  return { ok: true as const, status: 200, preview };
}

export async function requestClassroomMembership(classCode: string) {
  const access = await getClassroomActor("STUDENT");
  if (!access.ok) return access;

  const { data, error } = await access.supabase.rpc(
    "request_classroom_membership",
    { p_class_code: classCode },
  );

  if (error || !parseClassroomRequestResult(data)) {
    return {
      ok: false as const,
      status: 200,
      code: "CLASSROOM_NOT_FOUND",
      message: classroomNotFoundMessage,
    };
  }

  return { ok: true as const, status: 200 };
}

export async function updateClassroomMembership(
  membershipId: string,
  action: ClassroomAction,
) {
  const teacherAction =
    action === "TEACHER_APPROVE" ||
    action === "TEACHER_REJECT" ||
    action === "TEACHER_REMOVE";
  const access = await getClassroomActor(
    teacherAction ? "TEACHER" : "STUDENT",
  );
  if (!access.ok) return access;

  const rpc =
    action === "TEACHER_APPROVE" || action === "TEACHER_REJECT"
      ? access.supabase.rpc("respond_classroom_membership", {
          p_membership_id: membershipId,
          p_decision:
            action === "TEACHER_APPROVE" ? "APPROVED" : "REJECTED",
        })
      : action === "STUDENT_CANCEL"
        ? access.supabase.rpc("cancel_classroom_membership_request", {
            p_membership_id: membershipId,
          })
        : action === "STUDENT_LEAVE"
          ? access.supabase.rpc("leave_classroom", {
              p_membership_id: membershipId,
            })
          : access.supabase.rpc("remove_classroom_student", {
              p_membership_id: membershipId,
            });

  const { data, error } = await rpc;
  const expectedStatus =
    action === "TEACHER_APPROVE"
      ? "APPROVED"
      : action === "TEACHER_REJECT"
        ? "REJECTED"
        : action === "STUDENT_CANCEL"
          ? "CANCELLED"
          : action === "STUDENT_LEAVE"
            ? "LEFT"
            : "REMOVED";

  if (
    error ||
    !parseClassroomMutationResult(data, expectedStatus)
  ) {
    return {
      ok: false as const,
      status: 409,
      code: "CLASSROOM_STATE_CONFLICT",
      message: classroomUpdateMessage,
    };
  }

  return { ok: true as const, status: 200 };
}
