export type AssignmentQuestionType =
  | "MULTIPLE_CHOICE"
  | "NUMBER_INPUT"
  | "TEXT_INPUT";
export type TeacherQuestionStatus = "ACTIVE" | "ARCHIVED";
export type AssignmentStatus = "PUBLISHED" | "CLOSED";
export type AssignmentEffectiveState = "OPEN" | "OVERDUE" | "CLOSED";
export type AssignmentSubmissionStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED";

export type AssignmentOptions = {
  A: string;
  B: string;
  C: string;
  D: string;
};

export type TeacherQuestion = {
  questionId: string;
  grade: number;
  questionType: AssignmentQuestionType;
  prompt: string;
  options: AssignmentOptions | null;
  correctAnswer: string;
  solutionSteps: string[];
  explanation: string;
  status: TeacherQuestionStatus;
  createdAt: string;
};

export type TeacherQuestionLibrary = {
  questions: TeacherQuestion[];
};

export type TeacherAssignmentSummary = {
  assignmentId: string;
  classroomName: string;
  grade: number;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  status: AssignmentStatus;
  effectiveState: AssignmentEffectiveState;
  closedAt: string | null;
  serverNow: string;
  totalCount: number;
  publishedAt: string;
  submittedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  studentCount: number;
};

export type TeacherAssignmentList = {
  assignments: TeacherAssignmentSummary[];
};

export type AssignmentRosterStudent = {
  studentDisplayName: string;
  grade: number;
  submissionStatus: AssignmentSubmissionStatus;
  answeredCount: number;
  correctCount: number | null;
  totalCount: number;
  scorePercent: number | null;
  submittedAt: string | null;
};

export type TeacherAssignmentRoster = {
  assignment: Omit<
    TeacherAssignmentSummary,
    | "submittedCount"
    | "inProgressCount"
    | "notStartedCount"
    | "studentCount"
  >;
  students: AssignmentRosterStudent[];
};

export type StudentAssignmentSummary = {
  assignmentId: string;
  classroomName: string;
  teacherDisplayName: string;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  status: AssignmentStatus;
  effectiveState: AssignmentEffectiveState;
  closedAt: string | null;
  serverNow: string;
  totalCount: number;
  publishedAt: string;
  submissionStatus: AssignmentSubmissionStatus;
  answeredCount: number;
  correctCount: number | null;
  scorePercent: number | null;
  submittedAt: string | null;
};

export type StudentAssignmentList = {
  assignments: StudentAssignmentSummary[];
};

export type AssignmentRunnerQuestion = {
  questionId: string;
  displayOrder: number;
  questionType: AssignmentQuestionType;
  prompt: string;
  options: AssignmentOptions | null;
  visual: Record<string, unknown> | null;
  draftAnswer: string | null;
};

export type AssignmentRunnerState = {
  submissionId: string;
  submissionStatus: "IN_PROGRESS" | "SUBMITTED";
  revision: number;
  answeredCount: number;
  totalCount: number;
  assignment: {
    assignmentId: string;
    classroomName: string;
    teacherDisplayName: string;
    title: string;
    instructions: string | null;
    dueAt: string | null;
    status: AssignmentStatus;
    effectiveState: AssignmentEffectiveState;
    closedAt: string | null;
    serverNow: string;
    totalCount: number;
    publishedAt: string;
  };
  questions: AssignmentRunnerQuestion[];
};

export type AssignmentReviewItem = {
  displayOrder: number;
  questionType: AssignmentQuestionType;
  prompt: string;
  options: AssignmentOptions | null;
  visual: Record<string, unknown> | null;
  studentAnswer: string;
  isCorrect: boolean;
  correctAnswer: string;
  solutionSteps: string[];
  explanation: string;
};

export type AssignmentReview = {
  assignment: {
    assignmentId: string;
    classroomName: string;
    teacherDisplayName: string;
    title: string;
    instructions: string | null;
    dueAt: string | null;
    publishedAt: string;
  };
  correctCount: number;
  totalCount: number;
  scorePercent: number;
  submittedAt: string;
  answers: AssignmentReviewItem[];
};

export type CreateTeacherQuestionInput = {
  grade: number;
  questionType: AssignmentQuestionType;
  prompt: string;
  options: AssignmentOptions | null;
  correctAnswer: string;
  solutionSteps: string[];
  explanation: string;
  requestId: string;
};

export type PublishTeacherAssignmentInput = {
  classroomId: string;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  questionIds: string[];
  requestId: string;
};

export type SafeAssignmentErrorCode =
  | "AUTH_REQUIRED"
  | "ACCESS_DENIED"
  | "INVALID_REQUEST"
  | "QUESTION_UNAVAILABLE"
  | "ASSIGNMENT_UNAVAILABLE"
  | "ASSIGNMENT_CLOSED"
  | "ASSIGNMENT_OVERDUE"
  | "DEADLINE_INVALID"
  | "SUBMISSION_UNAVAILABLE"
  | "ANSWERS_INCOMPLETE"
  | "STATE_CONFLICT"
  | "REQUEST_FAILED";

export type AssignmentLifecycleAction =
  | "UPDATE_DEADLINE"
  | "CLOSE"
  | "REOPEN";

export type AssignmentLifecycleRequest =
  | {
      assignmentId: string;
      action: "CLOSE";
    }
  | {
      assignmentId: string;
      action: "UPDATE_DEADLINE" | "REOPEN";
      dueAt: string | null;
    };

export type AssignmentLifecycleResult = {
  assignmentId: string;
  status: AssignmentStatus;
  effectiveState: AssignmentEffectiveState;
  dueAt: string | null;
  closedAt: string | null;
  serverNow: string;
};

export type AssignmentApiError = {
  ok: false;
  error: {
    code: SafeAssignmentErrorCode;
    message: string;
  };
};

export type AssignmentApiSuccess<T> = {
  ok: true;
  data: T;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isTrimmedString(
  value: unknown,
  minimum: number,
  maximum: number,
): value is string {
  return (
    typeof value === "string" &&
    value === value.trim() &&
    value.length >= minimum &&
    value.length <= maximum
  );
}

function isOptionalString(
  value: unknown,
  maximum: number,
): value is string | null {
  return value === null || isTrimmedString(value, 1, maximum);
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

function isOptionalTimestamp(value: unknown): value is string | null {
  return value === null || isTimestamp(value);
}

function isInteger(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function isScore(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 100;
}

function isQuestionType(
  value: unknown,
): value is AssignmentQuestionType {
  return (
    value === "MULTIPLE_CHOICE" ||
    value === "NUMBER_INPUT" ||
    value === "TEXT_INPUT"
  );
}

function isAssignmentStatus(value: unknown): value is AssignmentStatus {
  return value === "PUBLISHED" || value === "CLOSED";
}

function isAssignmentEffectiveState(
  value: unknown,
): value is AssignmentEffectiveState {
  return (
    value === "OPEN" ||
    value === "OVERDUE" ||
    value === "CLOSED"
  );
}

function isSubmissionStatus(
  value: unknown,
): value is AssignmentSubmissionStatus {
  return (
    value === "NOT_STARTED" ||
    value === "IN_PROGRESS" ||
    value === "SUBMITTED"
  );
}

function isNormalizedAnswer(
  questionType: AssignmentQuestionType,
  value: unknown,
): value is string {
  if (typeof value !== "string") return false;
  if (questionType === "MULTIPLE_CHOICE") {
    return /^[A-D]$/.test(value);
  }
  if (questionType === "TEXT_INPUT") {
    return (
      value.length >= 1 &&
      value.length <= 200 &&
      value.trim() === value
    );
  }
  return (
    /^-?[0-9]{1,6}$/.test(value) &&
    Number(value) >= -100000 &&
    Number(value) <= 100000 &&
    String(Number(value)) === value
  );
}

export function isAssignmentUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function normalizeQuestionPrompt(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeAssignmentTitle(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function parseAssignmentOptions(
  value: unknown,
): AssignmentOptions | null {
  if (!isRecord(value)) return null;
  const keys = Object.keys(value).sort();
  if (
    keys.join(",") !== "A,B,C,D" ||
    !isTrimmedString(value.A, 1, 500) ||
    !isTrimmedString(value.B, 1, 500) ||
    !isTrimmedString(value.C, 1, 500) ||
    !isTrimmedString(value.D, 1, 500)
  ) {
    return null;
  }
  return { A: value.A, B: value.B, C: value.C, D: value.D };
}

function parseSolutionSteps(value: unknown): string[] | null {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 12 ||
    !value.every((item) => isTrimmedString(item, 1, 1000))
  ) {
    return null;
  }
  return [...value];
}

function parseTeacherQuestionRow(value: unknown): TeacherQuestion | null {
  if (
    !isRecord(value) ||
    !isAssignmentUuid(value.question_id) ||
    !isInteger(value.grade, 1, 9) ||
    !isQuestionType(value.question_type) ||
    !isTrimmedString(value.prompt, 3, 500) ||
    !isNormalizedAnswer(value.question_type, value.correct_answer) ||
    !isTrimmedString(value.explanation, 3, 500) ||
    (value.status !== "ACTIVE" && value.status !== "ARCHIVED") ||
    !isTimestamp(value.created_at)
  ) {
    return null;
  }

  const options =
    value.question_type === "MULTIPLE_CHOICE"
      ? parseAssignmentOptions(value.options)
      : null;
  const steps = parseSolutionSteps(value.solution_steps);
  if (
    !steps ||
    (value.question_type === "MULTIPLE_CHOICE" && !options) ||
    (value.question_type === "NUMBER_INPUT" && value.options !== null)
  ) {
    return null;
  }

  return {
    questionId: value.question_id,
    grade: value.grade,
    questionType: value.question_type,
    prompt: value.prompt,
    options,
    correctAnswer: value.correct_answer,
    solutionSteps: steps,
    explanation: value.explanation,
    status: value.status,
    createdAt: value.created_at,
  };
}

export function parseTeacherQuestionRpcResult(
  value: unknown,
): TeacherQuestion | null {
  return parseTeacherQuestionRow(value);
}

export function parseTeacherQuestionLibraryRpc(
  value: unknown,
): TeacherQuestionLibrary | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["questions"]) ||
    !Array.isArray(value.questions)
  ) {
    return null;
  }
  const questions: TeacherQuestion[] = [];
  for (const row of value.questions) {
    const question = parseTeacherQuestionRow(row);
    if (!question) return null;
    questions.push(question);
  }
  return { questions };
}

function parseTeacherAssignmentRow(
  value: unknown,
  includeCounts: boolean,
): TeacherAssignmentSummary | Omit<
  TeacherAssignmentSummary,
  | "submittedCount"
  | "inProgressCount"
  | "notStartedCount"
  | "studentCount"
> | null {
  if (
    !isRecord(value) ||
    !isAssignmentUuid(value.assignment_id) ||
    !isTrimmedString(value.classroom_name, 2, 80) ||
    !isInteger(value.grade, 1, 9) ||
    !isTrimmedString(value.title, 3, 120) ||
    !isOptionalString(value.instructions, 1000) ||
    !isOptionalTimestamp(value.due_at) ||
    !isAssignmentStatus(value.status) ||
    !isAssignmentEffectiveState(value.effective_state) ||
    !isOptionalTimestamp(value.closed_at) ||
    !isTimestamp(value.server_now) ||
    !isInteger(value.total_count, 1, 50) ||
    !isTimestamp(value.published_at)
  ) {
    return null;
  }

  const base = {
    assignmentId: value.assignment_id,
    classroomName: value.classroom_name,
    grade: value.grade,
    title: value.title,
    instructions: value.instructions,
    dueAt: value.due_at,
    status: value.status,
    effectiveState: value.effective_state,
    closedAt: value.closed_at,
    serverNow: value.server_now,
    totalCount: value.total_count,
    publishedAt: value.published_at,
  };
  if (!includeCounts) return base;
  if (
    !isInteger(value.submitted_count, 0, 1000000) ||
    !isInteger(value.in_progress_count, 0, 1000000) ||
    !isInteger(value.not_started_count, 0, 1000000) ||
    !isInteger(value.student_count, 0, 1000000)
  ) {
    return null;
  }
  if (
    value.submitted_count +
      value.in_progress_count +
      value.not_started_count !==
    value.student_count
  ) {
    return null;
  }
  return {
    ...base,
    submittedCount: value.submitted_count,
    inProgressCount: value.in_progress_count,
    notStartedCount: value.not_started_count,
    studentCount: value.student_count,
  };
}

export function parseTeacherAssignmentListRpc(
  value: unknown,
): TeacherAssignmentList | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["assignments"]) ||
    !Array.isArray(value.assignments)
  ) {
    return null;
  }
  const assignments: TeacherAssignmentSummary[] = [];
  for (const row of value.assignments) {
    const assignment = parseTeacherAssignmentRow(row, true);
    if (!assignment || !("studentCount" in assignment)) return null;
    assignments.push(assignment);
  }
  return { assignments };
}

export function parsePublishedAssignmentRpcResult(value: unknown) {
  if (
    !isRecord(value) ||
    !isAssignmentUuid(value.assignment_id) ||
    !isTrimmedString(value.classroom_name, 2, 80) ||
    !isTrimmedString(value.title, 3, 120) ||
    value.status !== "PUBLISHED" ||
    !isInteger(value.total_count, 1, 50) ||
    !isOptionalTimestamp(value.due_at) ||
    !isTimestamp(value.published_at)
  ) {
    return null;
  }
  return {
    assignmentId: value.assignment_id,
    classroomName: value.classroom_name,
    title: value.title,
    status: value.status,
    totalCount: value.total_count,
    dueAt: value.due_at,
    publishedAt: value.published_at,
  };
}

export function parseTeacherAssignmentRosterRpc(
  value: unknown,
): TeacherAssignmentRoster | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["assignment", "students"]) ||
    !Array.isArray(value.students)
  ) {
    return null;
  }
  const assignment = parseTeacherAssignmentRow(value.assignment, false);
  if (!assignment || "studentCount" in assignment) return null;

  const students: AssignmentRosterStudent[] = [];
  for (const row of value.students) {
    if (
      !isRecord(row) ||
      !isTrimmedString(row.student_display_name, 2, 100) ||
      !isInteger(row.grade, 1, 9) ||
      !isSubmissionStatus(row.submission_status) ||
      !isInteger(row.answered_count, 0, 50) ||
      !isInteger(row.total_count, 1, 50) ||
      (row.correct_count !== null &&
        !isInteger(row.correct_count, 0, row.total_count)) ||
      (row.score_percent !== null && !isScore(row.score_percent)) ||
      !isOptionalTimestamp(row.submitted_at)
    ) {
      return null;
    }
    students.push({
      studentDisplayName: row.student_display_name,
      grade: row.grade,
      submissionStatus: row.submission_status,
      answeredCount: row.answered_count,
      correctCount: row.correct_count,
      totalCount: row.total_count,
      scorePercent: row.score_percent,
      submittedAt: row.submitted_at,
    });
  }
  return { assignment, students };
}

function parseStudentAssignmentRow(
  value: unknown,
): StudentAssignmentSummary | null {
  if (
    !isRecord(value) ||
    !isAssignmentUuid(value.assignment_id) ||
    !isTrimmedString(value.classroom_name, 2, 80) ||
    !isTrimmedString(value.teacher_display_name, 2, 100) ||
    !isTrimmedString(value.title, 3, 120) ||
    !isOptionalString(value.instructions, 1000) ||
    !isOptionalTimestamp(value.due_at) ||
    !isAssignmentStatus(value.status) ||
    !isAssignmentEffectiveState(value.effective_state) ||
    !isOptionalTimestamp(value.closed_at) ||
    !isTimestamp(value.server_now) ||
    !isInteger(value.total_count, 1, 50) ||
    !isTimestamp(value.published_at) ||
    !isSubmissionStatus(value.submission_status) ||
    !isInteger(value.answered_count, 0, value.total_count) ||
    (value.correct_count !== null &&
      !isInteger(value.correct_count, 0, value.total_count)) ||
    (value.score_percent !== null && !isScore(value.score_percent)) ||
    !isOptionalTimestamp(value.submitted_at)
  ) {
    return null;
  }
  return {
    assignmentId: value.assignment_id,
    classroomName: value.classroom_name,
    teacherDisplayName: value.teacher_display_name,
    title: value.title,
    instructions: value.instructions,
    dueAt: value.due_at,
    status: value.status,
    effectiveState: value.effective_state,
    closedAt: value.closed_at,
    serverNow: value.server_now,
    totalCount: value.total_count,
    publishedAt: value.published_at,
    submissionStatus: value.submission_status,
    answeredCount: value.answered_count,
    correctCount: value.correct_count,
    scorePercent: value.score_percent,
    submittedAt: value.submitted_at,
  };
}

export function parseStudentAssignmentListRpc(
  value: unknown,
): StudentAssignmentList | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["assignments"]) ||
    !Array.isArray(value.assignments)
  ) {
    return null;
  }
  const assignments: StudentAssignmentSummary[] = [];
  for (const row of value.assignments) {
    const assignment = parseStudentAssignmentRow(row);
    if (!assignment) return null;
    assignments.push(assignment);
  }
  return { assignments };
}

export function parseAssignmentStartRpc(value: unknown) {
  if (
    !isRecord(value) ||
    !isAssignmentUuid(value.submission_id) ||
    !isAssignmentUuid(value.assignment_id) ||
    (value.status !== "IN_PROGRESS" && value.status !== "SUBMITTED")
  ) {
    return null;
  }
  return {
    submissionId: value.submission_id,
    assignmentId: value.assignment_id,
    status: value.status,
  };
}

function parseRunnerAssignment(value: unknown) {
  if (
    !isRecord(value) ||
    !isAssignmentUuid(value.assignment_id) ||
    !isTrimmedString(value.classroom_name, 2, 80) ||
    !isTrimmedString(value.teacher_display_name, 2, 100) ||
    !isTrimmedString(value.title, 3, 120) ||
    !isOptionalString(value.instructions, 1000) ||
    !isOptionalTimestamp(value.due_at) ||
    !isAssignmentStatus(value.status) ||
    !isAssignmentEffectiveState(value.effective_state) ||
    !isOptionalTimestamp(value.closed_at) ||
    !isTimestamp(value.server_now) ||
    !isInteger(value.total_count, 1, 50) ||
    !isTimestamp(value.published_at)
  ) {
    return null;
  }
  return {
    assignmentId: value.assignment_id,
    classroomName: value.classroom_name,
    teacherDisplayName: value.teacher_display_name,
    title: value.title,
    instructions: value.instructions,
    dueAt: value.due_at,
    status: value.status,
    effectiveState: value.effective_state,
    closedAt: value.closed_at,
    serverNow: value.server_now,
    totalCount: value.total_count,
    publishedAt: value.published_at,
  };
}

export function parseAssignmentRunnerStateRpc(
  value: unknown,
): AssignmentRunnerState | null {
  if (
    !isRecord(value) ||
    !isAssignmentUuid(value.submission_id) ||
    (value.submission_status !== "IN_PROGRESS" &&
      value.submission_status !== "SUBMITTED") ||
    !isInteger(value.answered_count, 0, 50) ||
    !isInteger(value.total_count, 1, 50) ||
    !(
      value.revision === undefined ||
      isInteger(value.revision, 0, 1_000_000)
    ) ||
    !Array.isArray(value.questions)
  ) {
    return null;
  }
  const assignment = parseRunnerAssignment(value.assignment);
  if (!assignment || assignment.totalCount !== value.total_count) return null;

  const questions: AssignmentRunnerQuestion[] = [];
  for (const row of value.questions) {
    if (
      !isRecord(row) ||
      !isAssignmentUuid(row.question_id) ||
      !isInteger(row.display_order, 1, value.total_count) ||
      !isQuestionType(row.question_type) ||
      !isTrimmedString(row.prompt, 3, 2000) ||
      !(
        row.visual === undefined ||
        row.visual === null ||
        isRecord(row.visual)
      ) ||
      (row.draft_answer !== null &&
        !isNormalizedAnswer(row.question_type, row.draft_answer))
    ) {
      return null;
    }
    const options =
      row.question_type === "MULTIPLE_CHOICE"
        ? parseAssignmentOptions(row.options)
        : null;
    if (
      (row.question_type === "MULTIPLE_CHOICE" && !options) ||
      (row.question_type !== "MULTIPLE_CHOICE" && row.options !== null)
    ) {
      return null;
    }
    questions.push({
      questionId: row.question_id,
      displayOrder: row.display_order,
      questionType: row.question_type,
      prompt: row.prompt,
      options,
      visual:
        row.visual === undefined || row.visual === null
          ? null
          : row.visual,
      draftAnswer: row.draft_answer,
    });
  }
  if (
    questions.length !== value.total_count ||
    new Set(questions.map((question) => question.questionId)).size !==
      questions.length
  ) {
    return null;
  }
  return {
    submissionId: value.submission_id,
    submissionStatus: value.submission_status,
    revision: value.revision ?? 0,
    answeredCount: value.answered_count,
    totalCount: value.total_count,
    assignment,
    questions,
  };
}

export function parseDraftSaveRpc(value: unknown) {
  if (
    !isRecord(value) ||
    !isAssignmentUuid(value.question_id) ||
    !isNonEmptyString(value.normalized_answer) ||
    !isInteger(value.answered_count, 0, 50) ||
    !isInteger(value.total_count, 1, 50) ||
    !(
      value.revision === undefined ||
      isInteger(value.revision, 0, 1_000_000)
    ) ||
    !(
      value.replayed === undefined ||
      typeof value.replayed === "boolean"
    )
  ) {
    return null;
  }
  return {
    questionId: value.question_id,
    normalizedAnswer: value.normalized_answer,
    answeredCount: value.answered_count,
    totalCount: value.total_count,
    revision: value.revision ?? 0,
    replayed: value.replayed ?? false,
  };
}

export function parseAssignmentSubmitRpc(value: unknown) {
  if (
    !isRecord(value) ||
    value.status !== "SUBMITTED" ||
    !isInteger(value.correct_count, 0, 50) ||
    !isInteger(value.total_count, 1, 50) ||
    !isScore(value.score_percent) ||
    !isTimestamp(value.submitted_at) ||
    !(
      value.revision === undefined ||
      isInteger(value.revision, 0, 1_000_000)
    ) ||
    !(
      value.replayed === undefined ||
      typeof value.replayed === "boolean"
    )
  ) {
    return null;
  }
  return {
    status: value.status,
    correctCount: value.correct_count,
    totalCount: value.total_count,
    scorePercent: value.score_percent,
    submittedAt: value.submitted_at,
    revision: value.revision ?? 0,
    replayed: value.replayed ?? false,
  };
}

export function parseAssignmentReviewRpc(
  value: unknown,
): AssignmentReview | null {
  if (
    !isRecord(value) ||
    !isInteger(value.correct_count, 0, 50) ||
    !isInteger(value.total_count, 1, 50) ||
    !isScore(value.score_percent) ||
    !isTimestamp(value.submitted_at) ||
    !Array.isArray(value.answers)
  ) {
    return null;
  }
  const assignment = value.assignment;
  if (
    !isRecord(assignment) ||
    !isAssignmentUuid(assignment.assignment_id) ||
    !isTrimmedString(assignment.classroom_name, 2, 80) ||
    !isTrimmedString(assignment.teacher_display_name, 2, 100) ||
    !isTrimmedString(assignment.title, 3, 120) ||
    !isOptionalString(assignment.instructions, 1000) ||
    !isOptionalTimestamp(assignment.due_at) ||
    !isTimestamp(assignment.published_at)
  ) {
    return null;
  }

  const answers: AssignmentReviewItem[] = [];
  for (const row of value.answers) {
    if (
      !isRecord(row) ||
      !isInteger(row.display_order, 1, value.total_count) ||
      !isQuestionType(row.question_type) ||
      !isTrimmedString(row.prompt, 3, 2000) ||
      !(
        row.visual === undefined ||
        row.visual === null ||
        isRecord(row.visual)
      ) ||
      !isNormalizedAnswer(row.question_type, row.student_answer) ||
      typeof row.is_correct !== "boolean" ||
      !isTrimmedString(row.correct_answer, 1, 200) ||
      !isTrimmedString(row.explanation, 3, 2000)
    ) {
      return null;
    }
    const options =
      row.question_type === "MULTIPLE_CHOICE"
        ? parseAssignmentOptions(row.options)
        : null;
    const steps = parseSolutionSteps(row.solution_steps);
    if (
      !steps ||
      (row.question_type === "MULTIPLE_CHOICE" && !options) ||
      (row.question_type !== "MULTIPLE_CHOICE" && row.options !== null)
    ) {
      return null;
    }
    answers.push({
      displayOrder: row.display_order,
      questionType: row.question_type,
      prompt: row.prompt,
      options,
      visual:
        row.visual === undefined || row.visual === null
          ? null
          : row.visual,
      studentAnswer: row.student_answer,
      isCorrect: row.is_correct,
      correctAnswer: row.correct_answer,
      solutionSteps: steps,
      explanation: row.explanation,
    });
  }
  if (answers.length !== value.total_count) return null;
  return {
    assignment: {
      assignmentId: assignment.assignment_id,
      classroomName: assignment.classroom_name,
      teacherDisplayName: assignment.teacher_display_name,
      title: assignment.title,
      instructions: assignment.instructions,
      dueAt: assignment.due_at,
      publishedAt: assignment.published_at,
    },
    correctCount: value.correct_count,
    totalCount: value.total_count,
    scorePercent: value.score_percent,
    submittedAt: value.submitted_at,
    answers,
  };
}

export function parseCreateTeacherQuestionInput(
  value: unknown,
): CreateTeacherQuestionInput | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "grade",
      "questionType",
      "prompt",
      "options",
      "correctAnswer",
      "solutionSteps",
      "explanation",
      "requestId",
    ]) ||
    !isInteger(value.grade, 1, 9) ||
    !isQuestionType(value.questionType) ||
    value.questionType === "TEXT_INPUT" ||
    typeof value.prompt !== "string" ||
    typeof value.correctAnswer !== "string" ||
    typeof value.explanation !== "string" ||
    !isAssignmentUuid(value.requestId)
  ) {
    return null;
  }
  const prompt = normalizeQuestionPrompt(value.prompt);
  const explanation = normalizeQuestionPrompt(value.explanation);
  const steps = Array.isArray(value.solutionSteps)
    ? value.solutionSteps.map((step) =>
        typeof step === "string" ? step.trim() : step,
      )
    : null;
  const parsedSteps = parseSolutionSteps(steps);
  const options =
    value.questionType === "MULTIPLE_CHOICE"
      ? parseAssignmentOptions(value.options)
      : null;
  if (
    prompt.length < 3 ||
    prompt.length > 500 ||
    explanation.length < 3 ||
    explanation.length > 500 ||
    !parsedSteps ||
    (value.questionType === "MULTIPLE_CHOICE" && !options) ||
    (value.questionType === "NUMBER_INPUT" && value.options !== null)
  ) {
    return null;
  }
  const correctAnswer = value.correctAnswer.trim().toUpperCase();
  if (
    (value.questionType === "MULTIPLE_CHOICE" &&
      !/^[A-D]$/.test(correctAnswer)) ||
    (value.questionType === "NUMBER_INPUT" &&
      (!/^-?[0-9]{1,6}$/.test(correctAnswer) ||
        Number(correctAnswer) < -100000 ||
        Number(correctAnswer) > 100000))
  ) {
    return null;
  }
  return {
    grade: value.grade,
    questionType: value.questionType,
    prompt,
    options,
    correctAnswer:
      value.questionType === "NUMBER_INPUT"
        ? String(Number(correctAnswer))
        : correctAnswer,
    solutionSteps: parsedSteps,
    explanation,
    requestId: value.requestId,
  };
}

export function parsePublishAssignmentInput(
  value: unknown,
): PublishTeacherAssignmentInput | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "classroomId",
      "title",
      "instructions",
      "dueAt",
      "questionIds",
      "requestId",
    ]) ||
    !isAssignmentUuid(value.classroomId) ||
    typeof value.title !== "string" ||
    !(value.instructions === null || typeof value.instructions === "string") ||
    !(value.dueAt === null || typeof value.dueAt === "string") ||
    !Array.isArray(value.questionIds) ||
    value.questionIds.length < 1 ||
    value.questionIds.length > 50 ||
    !value.questionIds.every(isAssignmentUuid) ||
    new Set(value.questionIds).size !== value.questionIds.length ||
    !isAssignmentUuid(value.requestId)
  ) {
    return null;
  }
  const title = normalizeAssignmentTitle(value.title);
  const instructions =
    value.instructions === null
      ? null
      : normalizeQuestionPrompt(value.instructions) || null;
  if (
    title.length < 3 ||
    title.length > 120 ||
    (instructions !== null && instructions.length > 1000) ||
    (value.dueAt !== null &&
      (Number.isNaN(Date.parse(value.dueAt)) ||
        Date.parse(value.dueAt) < Date.now()))
  ) {
    return null;
  }
  return {
    classroomId: value.classroomId,
    title,
    instructions,
    dueAt: value.dueAt,
    questionIds: [...value.questionIds],
    requestId: value.requestId,
  };
}

export function parseAssignmentIdInput(
  value: unknown,
  key: "assignmentId" | "questionId" | "submissionId",
) {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [key]) ||
    !isAssignmentUuid(value[key])
  ) {
    return null;
  }
  return value[key];
}

export function parseDraftAnswerInput(value: unknown) {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["submissionId", "questionId", "answer"]) ||
    !isAssignmentUuid(value.submissionId) ||
    !isAssignmentUuid(value.questionId) ||
    typeof value.answer !== "string" ||
    value.answer.length < 1 ||
    value.answer.length > 20
  ) {
    return null;
  }
  return {
    submissionId: value.submissionId,
    questionId: value.questionId,
    answer: value.answer,
  };
}

export function parseDraftAnswerV2Input(value: unknown) {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "submissionId",
      "questionId",
      "answer",
      "expectedRevision",
      "idempotencyKey",
    ]) ||
    !isAssignmentUuid(value.submissionId) ||
    !isAssignmentUuid(value.questionId) ||
    typeof value.answer !== "string" ||
    value.answer.length < 1 ||
    value.answer.length > 200 ||
    !isInteger(value.expectedRevision, 0, 1_000_000) ||
    !isAssignmentUuid(value.idempotencyKey)
  ) {
    return null;
  }
  return {
    submissionId: value.submissionId,
    questionId: value.questionId,
    answer: value.answer,
    expectedRevision: value.expectedRevision,
    idempotencyKey: value.idempotencyKey,
  };
}

export function parseAssignmentSubmitV2Input(value: unknown) {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "submissionId",
      "expectedRevision",
      "idempotencyKey",
    ]) ||
    !isAssignmentUuid(value.submissionId) ||
    !isInteger(value.expectedRevision, 0, 1_000_000) ||
    !isAssignmentUuid(value.idempotencyKey)
  ) {
    return null;
  }
  return {
    submissionId: value.submissionId,
    expectedRevision: value.expectedRevision,
    idempotencyKey: value.idempotencyKey,
  };
}

export function parseAssignmentApiError(
  value: unknown,
): AssignmentApiError["error"] | null {
  if (
    !isRecord(value) ||
    value.ok !== false ||
    !isRecord(value.error)
  ) {
    return null;
  }
  const error = value.error;
  if (
    typeof error.code !== "string" ||
    typeof error.message !== "string"
  ) {
    return null;
  }
  const errorCode = error.code;
  const errorMessage = error.message;
  const safeCodes: SafeAssignmentErrorCode[] = [
    "AUTH_REQUIRED",
    "ACCESS_DENIED",
    "INVALID_REQUEST",
    "QUESTION_UNAVAILABLE",
    "ASSIGNMENT_UNAVAILABLE",
    "ASSIGNMENT_CLOSED",
    "ASSIGNMENT_OVERDUE",
    "DEADLINE_INVALID",
    "SUBMISSION_UNAVAILABLE",
    "ANSWERS_INCOMPLETE",
    "STATE_CONFLICT",
    "REQUEST_FAILED",
  ];
  const code = safeCodes.find((item) => item === errorCode);
  return code ? { code, message: errorMessage } : null;
}

export function parseAssignmentLifecycleRequest(
  value: unknown,
): AssignmentLifecycleRequest | null {
  if (
    !isRecord(value) ||
    !isAssignmentUuid(value.assignmentId) ||
    (value.action !== "UPDATE_DEADLINE" &&
      value.action !== "CLOSE" &&
      value.action !== "REOPEN")
  ) {
    return null;
  }

  if (value.action === "CLOSE") {
    return hasOnlyKeys(value, ["assignmentId", "action"])
      ? {
          assignmentId: value.assignmentId,
          action: value.action,
        }
      : null;
  }

  if (
    !hasOnlyKeys(value, ["assignmentId", "action", "dueAt"]) ||
    !(
      value.dueAt === null ||
      (typeof value.dueAt === "string" &&
        !Number.isNaN(Date.parse(value.dueAt)))
    )
  ) {
    return null;
  }

  return {
    assignmentId: value.assignmentId,
    action: value.action,
    dueAt: value.dueAt,
  };
}

export function parseAssignmentLifecycleRpcResult(
  value: unknown,
): AssignmentLifecycleResult | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "assignment_id",
      "status",
      "due_at",
      "closed_at",
      "effective_state",
      "server_now",
    ]) ||
    !isAssignmentUuid(value.assignment_id) ||
    !isAssignmentStatus(value.status) ||
    !isOptionalTimestamp(value.due_at) ||
    !isOptionalTimestamp(value.closed_at) ||
    !isAssignmentEffectiveState(value.effective_state) ||
    !isTimestamp(value.server_now)
  ) {
    return null;
  }

  if (
    (value.status === "CLOSED" &&
      (value.effective_state !== "CLOSED" ||
        value.closed_at === null)) ||
    (value.status === "PUBLISHED" && value.closed_at !== null)
  ) {
    return null;
  }

  return {
    assignmentId: value.assignment_id,
    status: value.status,
    dueAt: value.due_at,
    closedAt: value.closed_at,
    effectiveState: value.effective_state,
    serverNow: value.server_now,
  };
}

export function parseAssignmentLifecycleApiResponse(value: unknown) {
  return parseAssignmentApiSuccess(value, (data) => {
    if (
      !isRecord(data) ||
      !hasOnlyKeys(data, [
        "assignmentId",
        "status",
        "dueAt",
        "closedAt",
        "effectiveState",
        "serverNow",
      ])
    ) {
      return null;
    }
    return parseAssignmentLifecycleRpcResult({
      assignment_id: data.assignmentId,
      status: data.status,
      due_at: data.dueAt,
      closed_at: data.closedAt,
      effective_state: data.effectiveState,
      server_now: data.serverNow,
    });
  });
}

export function parseAssignmentApiSuccess<T>(
  value: unknown,
  parser: (data: unknown) => T | null,
): T | null {
  if (!isRecord(value) || value.ok !== true || !("data" in value)) {
    return null;
  }
  return parser(value.data);
}

export function parseCreatedQuestionApiResponse(value: unknown) {
  return parseAssignmentApiSuccess(value, (data) => {
    if (!isRecord(data)) return null;
    return parseTeacherQuestionRow({
      question_id: data.questionId,
      grade: data.grade,
      question_type: data.questionType,
      prompt: data.prompt,
      options: data.options,
      correct_answer: data.correctAnswer,
      solution_steps: data.solutionSteps,
      explanation: data.explanation,
      status: data.status,
      created_at: data.createdAt,
    });
  });
}

export function parseTeacherQuestionLibraryApiResponse(value: unknown) {
  return parseAssignmentApiSuccess(value, (data) => {
    if (
      !isRecord(data) ||
      !hasOnlyKeys(data, ["questions"]) ||
      !Array.isArray(data.questions)
    ) {
      return null;
    }
    return parseTeacherQuestionLibraryRpc({
      questions: data.questions.map((question) => {
        if (!isRecord(question)) return question;
        return {
          question_id: question.questionId,
          grade: question.grade,
          question_type: question.questionType,
          prompt: question.prompt,
          options: question.options,
          correct_answer: question.correctAnswer,
          solution_steps: question.solutionSteps,
          explanation: question.explanation,
          status: question.status,
          created_at: question.createdAt,
        };
      }),
    });
  });
}

export function parsePublishedAssignmentApiResponse(value: unknown) {
  return parseAssignmentApiSuccess(value, (data) => {
    if (!isRecord(data)) return null;
    return parsePublishedAssignmentRpcResult({
      assignment_id: data.assignmentId,
      classroom_name: data.classroomName,
      title: data.title,
      status: data.status,
      total_count: data.totalCount,
      due_at: data.dueAt,
      published_at: data.publishedAt,
    });
  });
}

export function parseAssignmentStartApiResponse(value: unknown) {
  return parseAssignmentApiSuccess(value, (data) => {
    if (!isRecord(data)) return null;
    return parseAssignmentStartRpc({
      submission_id: data.submissionId,
      assignment_id: data.assignmentId,
      status: data.status,
    });
  });
}

export function parseDraftSaveApiResponse(value: unknown) {
  return parseAssignmentApiSuccess(value, (data) => {
    if (!isRecord(data)) return null;
    return parseDraftSaveRpc({
      question_id: data.questionId,
      normalized_answer: data.normalizedAnswer,
      answered_count: data.answeredCount,
      total_count: data.totalCount,
      revision: data.revision,
      replayed: data.replayed,
    });
  });
}

export function parseAssignmentSubmitApiResponse(value: unknown) {
  return parseAssignmentApiSuccess(value, (data) => {
    if (!isRecord(data)) return null;
    return parseAssignmentSubmitRpc({
      status: data.status,
      correct_count: data.correctCount,
      total_count: data.totalCount,
      score_percent: data.scorePercent,
      submitted_at: data.submittedAt,
      revision: data.revision,
      replayed: data.replayed,
    });
  });
}

export function parseAssignmentRunnerStateApiResponse(value: unknown) {
  return parseAssignmentApiSuccess(value, (data) => {
    if (!isRecord(data) || !isRecord(data.assignment)) return null;
    const questions = Array.isArray(data.questions)
      ? data.questions.map((question) => {
          if (!isRecord(question)) return question;
          return {
            question_id: question.questionId,
            display_order: question.displayOrder,
            question_type: question.questionType,
            prompt: question.prompt,
            options: question.options,
            visual: question.visual,
            draft_answer: question.draftAnswer,
          };
        })
      : data.questions;
    return parseAssignmentRunnerStateRpc({
      submission_id: data.submissionId,
      submission_status: data.submissionStatus,
      revision: data.revision,
      answered_count: data.answeredCount,
      total_count: data.totalCount,
      assignment: {
        assignment_id: data.assignment.assignmentId,
        classroom_name: data.assignment.classroomName,
        teacher_display_name: data.assignment.teacherDisplayName,
        title: data.assignment.title,
        instructions: data.assignment.instructions,
        due_at: data.assignment.dueAt,
        status: data.assignment.status,
        effective_state: data.assignment.effectiveState,
        closed_at: data.assignment.closedAt,
        server_now: data.assignment.serverNow,
        total_count: data.assignment.totalCount,
        published_at: data.assignment.publishedAt,
      },
      questions,
    });
  });
}

export function parseArchivedQuestionApiResponse(value: unknown) {
  return parseQuestionStatusApiResponse(value, "ARCHIVED");
}

export function parseRestoredQuestionApiResponse(value: unknown) {
  return parseQuestionStatusApiResponse(value, "ACTIVE");
}

function parseQuestionStatusApiResponse(
  value: unknown,
  expectedStatus: TeacherQuestionStatus,
) {
  return parseAssignmentApiSuccess(value, (data) => {
    if (
      !isRecord(data) ||
      !hasOnlyKeys(data, ["status"]) ||
      data.status !== expectedStatus
    ) {
      return null;
    }
    return { status: data.status };
  });
}
