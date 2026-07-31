export type GradebookAssignmentStatus = "PUBLISHED" | "CLOSED";
export type GradebookSubmissionStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED";
export type GradebookQuestionType =
  | "MULTIPLE_CHOICE"
  | "NUMBER_INPUT"
  | "TEXT_INPUT";
export type QuestionInsightStatus =
  | "INSUFFICIENT_DATA"
  | "NEEDS_REVIEW"
  | "ON_TRACK";

export type GradebookAssignment = {
  assignmentId: string;
  title: string;
  status: GradebookAssignmentStatus;
  totalCount: number;
  publishedAt: string;
  dueAt: string | null;
  submittedCount: number;
};

export type GradebookStudent = {
  studentDisplayName: string;
  submissionStatus: GradebookSubmissionStatus;
  answeredCount: number;
  totalCount: number;
  correctCount: number | null;
  scorePercent: number | null;
  submittedAt: string | null;
};

export type TeacherClassGradebook = {
  classroom: {
    classroomName: string;
    grade: number;
    studentCount: number;
  };
  assignments: GradebookAssignment[];
  selectedAssignment: Omit<GradebookAssignment, "submittedCount"> | null;
  students: GradebookStudent[];
};

export type AssignmentQuestionAnalytics = {
  displayOrder: number;
  questionType: GradebookQuestionType;
  prompt: string;
  answeredCount: number;
  correctCount: number;
  incorrectCount: number;
  accuracyPercent: number | null;
  insightStatus: QuestionInsightStatus;
};

export type TeacherAssignmentAnalysis = {
  assignment: {
    assignmentTitle: string;
    classroomName: string;
    grade: number;
    status: GradebookAssignmentStatus;
    totalCount: number;
    publishedAt: string;
    dueAt: string | null;
  };
  studentCount: number;
  notStartedCount: number;
  inProgressCount: number;
  submittedCount: number;
  averageScorePercent: number | null;
  completionRate: number | null;
  minimumSubmissionsForInsight: 3;
  reviewAccuracyThreshold: 50;
  questions: AssignmentQuestionAnalytics[];
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

function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

function isTrimmedText(
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

function isPercentage(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
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

function isAssignmentStatus(
  value: unknown,
): value is GradebookAssignmentStatus {
  return value === "PUBLISHED" || value === "CLOSED";
}

function isSubmissionStatus(
  value: unknown,
): value is GradebookSubmissionStatus {
  return (
    value === "NOT_STARTED" ||
    value === "IN_PROGRESS" ||
    value === "SUBMITTED"
  );
}

function parseAssignment(
  value: unknown,
  includeSubmittedCount: boolean,
): GradebookAssignment | Omit<GradebookAssignment, "submittedCount"> | null {
  if (
    !isRecord(value) ||
    !isUuid(value.assignment_id) ||
    !isTrimmedText(value.title, 3, 120) ||
    !isAssignmentStatus(value.status) ||
    !isInteger(value.total_count, 1, 50) ||
    !isTimestamp(value.published_at) ||
    !isOptionalTimestamp(value.due_at)
  ) {
    return null;
  }

  const base = {
    assignmentId: value.assignment_id,
    title: value.title,
    status: value.status,
    totalCount: value.total_count,
    publishedAt: value.published_at,
    dueAt: value.due_at,
  };
  if (!includeSubmittedCount) return base;
  if (!isInteger(value.submitted_count, 0, 1000000)) return null;
  return { ...base, submittedCount: value.submitted_count };
}

function parseGradebookStudent(
  value: unknown,
): GradebookStudent | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "student_display_name",
      "submission_status",
      "answered_count",
      "total_count",
      "correct_count",
      "score_percent",
      "submitted_at",
    ]) ||
    !isTrimmedText(value.student_display_name, 2, 100) ||
    !isSubmissionStatus(value.submission_status) ||
    !isInteger(value.total_count, 1, 50) ||
    !isInteger(value.answered_count, 0, value.total_count)
  ) {
    return null;
  }

  if (value.submission_status === "SUBMITTED") {
    if (
      value.answered_count !== value.total_count ||
      !isInteger(value.correct_count, 0, value.total_count) ||
      !isPercentage(value.score_percent) ||
      !isTimestamp(value.submitted_at)
    ) {
      return null;
    }
  } else if (
    value.correct_count !== null ||
    value.score_percent !== null ||
    value.submitted_at !== null
  ) {
    return null;
  }

  return {
    studentDisplayName: value.student_display_name,
    submissionStatus: value.submission_status,
    answeredCount: value.answered_count,
    totalCount: value.total_count,
    correctCount:
      value.submission_status === "SUBMITTED"
        ? value.correct_count
        : null,
    scorePercent:
      value.submission_status === "SUBMITTED"
        ? value.score_percent
        : null,
    submittedAt:
      value.submission_status === "SUBMITTED"
        ? value.submitted_at
        : null,
  };
}

export function parseTeacherClassGradebook(
  value: unknown,
): TeacherClassGradebook | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "classroom",
      "assignments",
      "selected_assignment",
      "students",
    ]) ||
    !isRecord(value.classroom) ||
    !hasOnlyKeys(value.classroom, [
      "classroom_name",
      "grade",
      "student_count",
    ]) ||
    !isTrimmedText(value.classroom.classroom_name, 2, 80) ||
    !isInteger(value.classroom.grade, 1, 9) ||
    !isInteger(value.classroom.student_count, 0, 1000000) ||
    !Array.isArray(value.assignments) ||
    !Array.isArray(value.students)
  ) {
    return null;
  }

  const assignments: GradebookAssignment[] = [];
  for (const row of value.assignments) {
    const assignment = parseAssignment(row, true);
    if (!assignment || !("submittedCount" in assignment)) return null;
    assignments.push(assignment);
  }

  const selectedAssignment =
    value.selected_assignment === null
      ? null
      : parseAssignment(value.selected_assignment, false);
  if (
    value.selected_assignment !== null &&
    (!selectedAssignment || "submittedCount" in selectedAssignment)
  ) {
    return null;
  }
  if (
    selectedAssignment &&
    !assignments.some(
      (assignment) =>
        assignment.assignmentId === selectedAssignment.assignmentId,
    )
  ) {
    return null;
  }

  const students: GradebookStudent[] = [];
  for (const row of value.students) {
    const student = parseGradebookStudent(row);
    if (!student) return null;
    if (
      selectedAssignment &&
      student.totalCount !== selectedAssignment.totalCount
    ) {
      return null;
    }
    students.push(student);
  }
  if (
    students.length !== value.classroom.student_count ||
    (!selectedAssignment && students.length > 0)
  ) {
    return null;
  }

  return {
    classroom: {
      classroomName: value.classroom.classroom_name,
      grade: value.classroom.grade,
      studentCount: value.classroom.student_count,
    },
    assignments,
    selectedAssignment:
      selectedAssignment &&
      !("submittedCount" in selectedAssignment)
        ? selectedAssignment
        : null,
    students,
  };
}

function parseQuestionAnalytics(
  value: unknown,
  submittedCount: number,
): AssignmentQuestionAnalytics | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "display_order",
      "question_type",
      "prompt",
      "answered_count",
      "correct_count",
      "incorrect_count",
      "accuracy_percent",
      "insight_status",
    ]) ||
    !isInteger(value.display_order, 1, 50) ||
    (value.question_type !== "MULTIPLE_CHOICE" &&
      value.question_type !== "NUMBER_INPUT" &&
      value.question_type !== "TEXT_INPUT") ||
    !isTrimmedText(value.prompt, 3, 2000) ||
    !isInteger(value.answered_count, 0, submittedCount) ||
    !isInteger(value.correct_count, 0, value.answered_count) ||
    !isInteger(value.incorrect_count, 0, value.answered_count) ||
    value.correct_count + value.incorrect_count !== value.answered_count ||
    (value.accuracy_percent !== null &&
      !isPercentage(value.accuracy_percent)) ||
    (value.insight_status !== "INSUFFICIENT_DATA" &&
      value.insight_status !== "NEEDS_REVIEW" &&
      value.insight_status !== "ON_TRACK")
  ) {
    return null;
  }
  if (
    (value.answered_count === 0 && value.accuracy_percent !== null) ||
    (value.answered_count > 0 && value.accuracy_percent === null) ||
    (submittedCount < 3 &&
      value.insight_status !== "INSUFFICIENT_DATA") ||
    (submittedCount >= 3 &&
      value.answered_count > 0 &&
      value.accuracy_percent !== null &&
      value.insight_status === "NEEDS_REVIEW" &&
      value.accuracy_percent >= 50) ||
    (submittedCount >= 3 &&
      value.answered_count > 0 &&
      value.accuracy_percent !== null &&
      value.insight_status === "ON_TRACK" &&
      value.accuracy_percent < 50)
  ) {
    return null;
  }

  return {
    displayOrder: value.display_order,
    questionType: value.question_type,
    prompt: value.prompt,
    answeredCount: value.answered_count,
    correctCount: value.correct_count,
    incorrectCount: value.incorrect_count,
    accuracyPercent: value.accuracy_percent,
    insightStatus: value.insight_status,
  };
}

export function parseTeacherAssignmentAnalysis(
  value: unknown,
): TeacherAssignmentAnalysis | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "assignment",
      "student_count",
      "not_started_count",
      "in_progress_count",
      "submitted_count",
      "average_score_percent",
      "completion_rate",
      "minimum_submissions_for_insight",
      "review_accuracy_threshold",
      "questions",
    ]) ||
    !isRecord(value.assignment) ||
    !hasOnlyKeys(value.assignment, [
      "assignment_title",
      "classroom_name",
      "grade",
      "status",
      "total_count",
      "published_at",
      "due_at",
    ]) ||
    !isTrimmedText(value.assignment.assignment_title, 3, 120) ||
    !isTrimmedText(value.assignment.classroom_name, 2, 80) ||
    !isInteger(value.assignment.grade, 1, 9) ||
    !isAssignmentStatus(value.assignment.status) ||
    !isInteger(value.assignment.total_count, 1, 50) ||
    !isTimestamp(value.assignment.published_at) ||
    !isOptionalTimestamp(value.assignment.due_at) ||
    !isInteger(value.student_count, 0, 1000000) ||
    !isInteger(value.not_started_count, 0, value.student_count) ||
    !isInteger(value.in_progress_count, 0, value.student_count) ||
    !isInteger(value.submitted_count, 0, value.student_count) ||
    value.not_started_count +
      value.in_progress_count +
      value.submitted_count !==
      value.student_count ||
    (value.average_score_percent !== null &&
      !isPercentage(value.average_score_percent)) ||
    (value.completion_rate !== null &&
      !isPercentage(value.completion_rate)) ||
    value.minimum_submissions_for_insight !== 3 ||
    value.review_accuracy_threshold !== 50 ||
    !Array.isArray(value.questions)
  ) {
    return null;
  }

  if (
    (value.submitted_count === 0 &&
      value.average_score_percent !== null) ||
    (value.submitted_count > 0 &&
      value.average_score_percent === null) ||
    (value.student_count === 0 && value.completion_rate !== null) ||
    (value.student_count > 0 && value.completion_rate === null)
  ) {
    return null;
  }

  const questions: AssignmentQuestionAnalytics[] = [];
  const displayOrders = new Set<number>();
  for (const row of value.questions) {
    const question = parseQuestionAnalytics(row, value.submitted_count);
    if (!question || displayOrders.has(question.displayOrder)) return null;
    displayOrders.add(question.displayOrder);
    questions.push(question);
  }
  if (questions.length !== value.assignment.total_count) return null;

  return {
    assignment: {
      assignmentTitle: value.assignment.assignment_title,
      classroomName: value.assignment.classroom_name,
      grade: value.assignment.grade,
      status: value.assignment.status,
      totalCount: value.assignment.total_count,
      publishedAt: value.assignment.published_at,
      dueAt: value.assignment.due_at,
    },
    studentCount: value.student_count,
    notStartedCount: value.not_started_count,
    inProgressCount: value.in_progress_count,
    submittedCount: value.submitted_count,
    averageScorePercent: value.average_score_percent,
    completionRate: value.completion_rate,
    minimumSubmissionsForInsight: 3,
    reviewAccuracyThreshold: 50,
    questions,
  };
}

export function getQuestionsNeedingReview(
  analysis: TeacherAssignmentAnalysis,
) {
  return analysis.questions
    .filter((question) => question.insightStatus === "NEEDS_REVIEW")
    .sort(
      (left, right) =>
        right.incorrectCount - left.incorrectCount ||
        left.displayOrder - right.displayOrder,
    );
}
