import "server-only";

import {
  parseAssignmentReviewRpc,
  parseAssignmentLifecycleRpcResult,
  parseAssignmentRunnerStateRpc,
  parseAssignmentStartRpc,
  parseAssignmentSubmitRpc,
  parseDraftSaveRpc,
  parsePublishedAssignmentRpcResult,
  parseStudentAssignmentListRpc,
  parseTeacherAssignmentListRpc,
  parseTeacherAssignmentRosterRpc,
  parseTeacherQuestionLibraryRpc,
  parseTeacherQuestionRpcResult,
  type CreateTeacherQuestionInput,
  type AssignmentLifecycleRequest,
  type PublishTeacherAssignmentInput,
} from "@/lib/assignments/contracts";
import { getStudentLearningContext } from "@/lib/practice/server";
import { createClient } from "@/lib/supabase/server";
import { getTeacherAccount } from "@/lib/teacher/server";
import {
  parseTeacherCurriculumCatalog,
  parseTeacherCurriculumDraft,
  type CreateCurriculumAssignmentDraftInput,
} from "@/lib/assignments/curriculum-contracts";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

const unavailableMessage =
  "Chưa thể xử lý bài tập lúc này. Vui lòng thử lại.";

function accessFailure(reason: string) {
  if (reason === "UNAUTHENTICATED") {
    return {
      ok: false as const,
      status: 401,
      code: "AUTH_REQUIRED" as const,
      message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    };
  }
  return {
    ok: false as const,
    status: 403,
    code: "ACCESS_DENIED" as const,
    message: "Tài khoản không có quyền thực hiện thao tác này.",
  };
}

async function getTeacherAccess() {
  const account = await getTeacherAccount();
  if (!account.ok) return accessFailure(account.reason);
  return { ok: true as const, supabase: account.supabase };
}

export async function loadTeacherCurriculumCatalog(input: {
  classroomId: string;
  unitId?: string | null;
  domain?: string | null;
  outcomeId?: string | null;
  skillId?: string | null;
  limit?: number;
  offset?: number;
}) {
  const access = await getTeacherAccess();
  if (!access.ok) return access;
  const { data, error } = await access.supabase.rpc(
    "get_teacher_curriculum_catalog",
    {
      p_classroom_id: input.classroomId,
      p_unit_id: input.unitId ?? null,
      p_domain: input.domain ?? null,
      p_outcome_id: input.outcomeId ?? null,
      p_skill_id: input.skillId ?? null,
      p_limit: input.limit ?? 24,
      p_offset: input.offset ?? 0,
    },
  );
  const catalog = parseTeacherCurriculumCatalog(data);
  if (error || !catalog) {
    return {
      ok: false as const,
      status: 409,
      code: "ASSIGNMENT_UNAVAILABLE" as const,
      message:
        "Chương trình chưa được mở cho giao bài hoặc dữ liệu chưa sẵn sàng.",
    };
  }
  return { ok: true as const, status: 200, catalog };
}

export async function createTeacherCurriculumDraft(
  input: CreateCurriculumAssignmentDraftInput,
) {
  const access = await getTeacherAccess();
  if (!access.ok) return access;
  const { data, error } = await access.supabase.rpc(
    "create_teacher_curriculum_assignment_draft",
    {
      p_classroom_id: input.classroomId,
      p_title: input.title,
      p_instructions: input.instructions,
      p_due_at: input.dueAt,
      p_selection_mode: input.selectionMode,
      p_unit_id: input.unitId,
      p_outcome_id: input.outcomeId,
      p_skill_id: input.skillId,
      p_question_ids: input.questionIds,
      p_question_count: input.questionCount,
      p_deterministic_seed: input.deterministicSeed,
      p_request_id: input.requestId,
    },
  );
  const draft = parseTeacherCurriculumDraft(data);
  if (error || !draft) {
    return {
      ok: false as const,
      status: 409,
      code: "ASSIGNMENT_UNAVAILABLE" as const,
      message:
        "Chưa thể lưu bản nháp từ chương trình. Hãy kiểm tra lớp và nội dung đã chọn.",
    };
  }
  return { ok: true as const, status: 200, draft };
}

export async function publishTeacherCurriculumDraft(input: {
  draftId: string;
  requestId: string;
}) {
  const access = await getTeacherAccess();
  if (!access.ok) return access;
  const { data, error } = await access.supabase.rpc(
    "publish_teacher_curriculum_assignment_draft",
    {
      p_draft_id: input.draftId,
      p_request_id: input.requestId,
    },
  );
  if (
    error ||
    typeof data !== "object" ||
    data === null ||
    !("assignment_id" in data) ||
    typeof data.assignment_id !== "string"
  ) {
    return {
      ok: false as const,
      status: 409,
      code: "ASSIGNMENT_UNAVAILABLE" as const,
      message:
        "Chưa thể giao bản nháp này. Nội dung được giữ nguyên để thử lại.",
    };
  }
  return {
    ok: true as const,
    status: 200,
    assignmentId: data.assignment_id,
  };
}

async function getStudentAccess() {
  const access = await getStudentLearningContext();
  if (!access.ok) return accessFailure(access.reason);
  return { ok: true as const, supabase: access.supabase };
}

export async function loadTeacherQuestionLibrary(
  supabase: ServerSupabaseClient,
) {
  const { data, error } = await supabase.rpc("get_my_teacher_questions");
  if (error) {
    return {
      ok: false as const,
      message: "Chưa thể tải kho câu hỏi. Vui lòng thử lại.",
    };
  }
  const library = parseTeacherQuestionLibraryRpc(data);
  return library
    ? { ok: true as const, library }
    : {
        ok: false as const,
        message: "Dữ liệu kho câu hỏi chưa sẵn sàng.",
      };
}

export async function loadTeacherAssignments(
  supabase: ServerSupabaseClient,
) {
  const { data, error } = await supabase.rpc(
    "get_my_teacher_assignments",
  );
  if (error) {
    return {
      ok: false as const,
      message: "Chưa thể tải danh sách bài tập. Vui lòng thử lại.",
    };
  }
  const list = parseTeacherAssignmentListRpc(data);
  return list
    ? { ok: true as const, list }
    : {
        ok: false as const,
        message: "Dữ liệu bài tập chưa sẵn sàng.",
      };
}

export async function loadTeacherAssignmentRoster(
  supabase: ServerSupabaseClient,
  assignmentId: string,
) {
  const { data, error } = await supabase.rpc(
    "get_teacher_assignment_roster",
    { p_assignment_id: assignmentId },
  );
  if (error) {
    return {
      ok: false as const,
      reason: "UNAVAILABLE" as const,
      message: "Chưa thể tải kết quả bài tập. Vui lòng thử lại.",
    };
  }
  if (data === null) {
    return {
      ok: false as const,
      reason: "NOT_FOUND" as const,
      message: "Không tìm thấy bài tập.",
    };
  }
  const roster = parseTeacherAssignmentRosterRpc(data);
  return roster
    ? { ok: true as const, roster }
    : {
        ok: false as const,
        reason: "UNAVAILABLE" as const,
        message: "Dữ liệu kết quả chưa sẵn sàng.",
      };
}

export async function loadStudentAssignments(
  supabase: ServerSupabaseClient,
) {
  const { data, error } = await supabase.rpc(
    "get_my_student_assignments",
  );
  if (error) {
    return {
      ok: false as const,
      message: "Chưa thể tải bài giáo viên giao. Vui lòng thử lại.",
    };
  }
  const list = parseStudentAssignmentListRpc(data);
  return list
    ? { ok: true as const, list }
    : {
        ok: false as const,
        message: "Dữ liệu bài tập chưa sẵn sàng.",
      };
}

export async function loadAssignmentRunnerState(
  supabase: ServerSupabaseClient,
  assignmentId: string,
) {
  const { data, error } = await supabase.rpc(
    "get_assignment_submission_state",
    { p_assignment_id: assignmentId },
  );
  if (error) {
    return {
      ok: false as const,
      reason: "UNAVAILABLE" as const,
      message: "Chưa thể tải bài tập. Vui lòng thử lại.",
    };
  }
  if (data === null) {
    return {
      ok: false as const,
      reason: "NOT_FOUND" as const,
      message: "Bài tập chưa được bắt đầu hoặc không còn khả dụng.",
    };
  }
  const state = parseAssignmentRunnerStateRpc(data);
  return state
    ? { ok: true as const, state }
    : {
        ok: false as const,
        reason: "UNAVAILABLE" as const,
        message: "Dữ liệu bài tập chưa sẵn sàng.",
      };
}

export async function loadAssignmentReview(
  supabase: ServerSupabaseClient,
  assignmentId: string,
) {
  const { data, error } = await supabase.rpc(
    "get_assignment_submission_review",
    { p_assignment_id: assignmentId },
  );
  if (error) {
    return {
      ok: false as const,
      reason: "UNAVAILABLE" as const,
      message: "Chưa thể tải kết quả bài tập. Vui lòng thử lại.",
    };
  }
  if (data === null) {
    return {
      ok: false as const,
      reason: "NOT_FOUND" as const,
      message: "Kết quả bài tập chưa sẵn sàng.",
    };
  }
  const review = parseAssignmentReviewRpc(data);
  return review
    ? { ok: true as const, review }
    : {
        ok: false as const,
        reason: "UNAVAILABLE" as const,
        message: "Dữ liệu kết quả chưa sẵn sàng.",
      };
}

export async function createTeacherQuestion(
  input: CreateTeacherQuestionInput,
) {
  const access = await getTeacherAccess();
  if (!access.ok) return access;

  const { data, error } = await access.supabase.rpc(
    "create_teacher_question",
    {
      p_grade: input.grade,
      p_question_type: input.questionType,
      p_prompt: input.prompt,
      p_options: input.options,
      p_correct_answer: input.correctAnswer,
      p_solution_steps: input.solutionSteps,
      p_explanation: input.explanation,
      p_request_id: input.requestId,
    },
  );
  const question = parseTeacherQuestionRpcResult(data);
  if (error || !question) {
    return {
      ok: false as const,
      status: 409,
      code: "QUESTION_UNAVAILABLE" as const,
      message: "Chưa thể lưu câu hỏi. Vui lòng kiểm tra và thử lại.",
    };
  }
  return { ok: true as const, status: 200, question };
}

export async function archiveTeacherQuestion(questionId: string) {
  const access = await getTeacherAccess();
  if (!access.ok) return access;

  const { data, error } = await access.supabase.rpc(
    "archive_teacher_question",
    { p_question_id: questionId },
  );
  const valid =
    typeof data === "object" &&
    data !== null &&
    "status" in data &&
    data.status === "ARCHIVED";
  if (error || !valid) {
    return {
      ok: false as const,
      status: 409,
      code: "STATE_CONFLICT" as const,
      message:
        "Chưa thể ngừng sử dụng câu hỏi. Danh sách đã được cập nhật.",
    };
  }
  return { ok: true as const, status: 200 };
}

export async function restoreTeacherQuestion(questionId: string) {
  const access = await getTeacherAccess();
  if (!access.ok) return access;

  const { data, error } = await access.supabase.rpc(
    "restore_teacher_question",
    { p_question_id: questionId },
  );
  const valid =
    typeof data === "object" &&
    data !== null &&
    "status" in data &&
    data.status === "ACTIVE";
  if (error || !valid) {
    return {
      ok: false as const,
      status: 409,
      code: "STATE_CONFLICT" as const,
      message:
        "Chưa thể khôi phục câu hỏi. Danh sách đã được cập nhật.",
    };
  }
  return { ok: true as const, status: 200 };
}

export async function publishTeacherAssignment(
  input: PublishTeacherAssignmentInput,
) {
  const access = await getTeacherAccess();
  if (!access.ok) return access;

  const { data, error } = await access.supabase.rpc(
    "publish_teacher_assignment",
    {
      p_classroom_id: input.classroomId,
      p_title: input.title,
      p_instructions: input.instructions,
      p_due_at: input.dueAt,
      p_question_ids: input.questionIds,
      p_request_id: input.requestId,
    },
  );
  const assignment = parsePublishedAssignmentRpcResult(data);
  if (error || !assignment) {
    return {
      ok: false as const,
      status: 409,
      code: "ASSIGNMENT_UNAVAILABLE" as const,
      message:
        "Chưa thể giao bài. Vui lòng kiểm tra lớp, câu hỏi và hạn nộp.",
    };
  }
  return { ok: true as const, status: 200, assignment };
}

export async function updateTeacherAssignmentLifecycle(
  input: AssignmentLifecycleRequest,
) {
  const access = await getTeacherAccess();
  if (!access.ok) return access;

  const rpc =
    input.action === "UPDATE_DEADLINE"
      ? "update_teacher_assignment_deadline"
      : input.action === "CLOSE"
        ? "close_teacher_assignment"
        : "reopen_teacher_assignment";
  const parameters =
    input.action === "CLOSE"
      ? { p_assignment_id: input.assignmentId }
      : {
          p_assignment_id: input.assignmentId,
          p_due_at: input.dueAt,
        };
  const { data, error } = await access.supabase.rpc(rpc, parameters);

  if (error) {
    const invalidDeadline =
      error.message === "Assignment deadline unavailable";
    return {
      ok: false as const,
      status: 409,
      code: invalidDeadline
        ? ("DEADLINE_INVALID" as const)
        : ("STATE_CONFLICT" as const),
      message: invalidDeadline
        ? "Hạn nộp phải nằm trong tương lai theo giờ Việt Nam."
        : "Trạng thái bài tập đã thay đổi. Vui lòng tải lại trang.",
    };
  }

  if (data === null) {
    return {
      ok: false as const,
      status: 404,
      code: "ASSIGNMENT_UNAVAILABLE" as const,
      message: "Không tìm thấy bài tập phù hợp.",
    };
  }

  const result = parseAssignmentLifecycleRpcResult(data);
  if (!result) {
    return {
      ok: false as const,
      status: 502,
      code: "REQUEST_FAILED" as const,
      message: unavailableMessage,
    };
  }
  return { ok: true as const, status: 200, result };
}

export async function startAssignmentSubmission(assignmentId: string) {
  const access = await getStudentAccess();
  if (!access.ok) return access;

  const { data, error } = await access.supabase.rpc(
    "start_or_resume_assignment_submission",
    { p_assignment_id: assignmentId },
  );
  const submission = parseAssignmentStartRpc(data);
  if (error || !submission) {
    return {
      ok: false as const,
      status: 409,
      code: "ASSIGNMENT_UNAVAILABLE" as const,
      message:
        "Bài tập đã đóng, quá hạn hoặc không còn khả dụng cho tài khoản này.",
    };
  }
  return { ok: true as const, status: 200, submission };
}

export async function saveAssignmentDraft(
  submissionId: string,
  questionId: string,
  answer: string,
  expectedRevision: number,
  idempotencyKey: string,
) {
  const access = await getStudentAccess();
  if (!access.ok) return access;

  const { data, error } = await access.supabase.rpc(
    "save_assignment_draft_answer_v2",
    {
      p_submission_id: submissionId,
      p_question_id: questionId,
      p_answer: answer,
      p_expected_revision: expectedRevision,
      p_idempotency_key: idempotencyKey,
    },
  );
  const result = parseDraftSaveRpc(data);
  if (error || !result) {
    const conflict = error?.message === "ASSIGNMENT:STATE_CONFLICT";
    return {
      ok: false as const,
      status: 409,
      code: conflict
        ? ("STATE_CONFLICT" as const)
        : ("SUBMISSION_UNAVAILABLE" as const),
      message: conflict
        ? "Bài làm đã thay đổi ở nơi khác. Trang sẽ tải lại dữ liệu mới nhất."
        : "Bài tập đã đóng hoặc quá hạn nên không thể lưu câu trả lời.",
    };
  }
  return { ok: true as const, status: 200, result };
}

export async function submitAssignment(
  submissionId: string,
  expectedRevision: number,
  idempotencyKey: string,
) {
  const access = await getStudentAccess();
  if (!access.ok) return access;

  const { data, error } = await access.supabase.rpc(
    "submit_assignment_submission_v2",
    {
      p_submission_id: submissionId,
      p_expected_revision: expectedRevision,
      p_idempotency_key: idempotencyKey,
    },
  );
  if (error) {
    const incomplete =
      error.message === "ASSIGNMENT:ANSWERS_INCOMPLETE";
    const conflict = error.message === "ASSIGNMENT:STATE_CONFLICT";
    return {
      ok: false as const,
      status: 409,
      code: conflict
        ? ("STATE_CONFLICT" as const)
        : incomplete
          ? ("ANSWERS_INCOMPLETE" as const)
          : ("SUBMISSION_UNAVAILABLE" as const),
      message: conflict
        ? "Bài làm đã thay đổi ở nơi khác. Vui lòng kiểm tra lại trước khi nộp."
        : incomplete
        ? "Em cần trả lời đủ các câu trước khi nộp bài."
        : "Bài tập đã đóng hoặc quá hạn nên không thể nộp thêm.",
    };
  }
  const result = parseAssignmentSubmitRpc(data);
  if (!result) {
    return {
      ok: false as const,
      status: 502,
      code: "REQUEST_FAILED" as const,
      message: unavailableMessage,
    };
  }
  return { ok: true as const, status: 200, result };
}
