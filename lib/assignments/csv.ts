import type {
  AssignmentRosterStudent,
  TeacherAssignmentRoster,
} from "./contracts.ts";
import { formatVietnamDateTime } from "./deadline.ts";

const UTF8_BOM = "\uFEFF";

function neutralizeFormula(value: string) {
  return /^[\t\r]|^\s*[=+\-@]/.test(value) ? `'${value}` : value;
}

function escapeCsvField(value: string) {
  const safe = neutralizeFormula(value);
  return `"${safe.replaceAll('"', '""')}"`;
}

function statusLabel(student: AssignmentRosterStudent) {
  if (student.submissionStatus === "NOT_STARTED") return "Chưa bắt đầu";
  if (student.submissionStatus === "IN_PROGRESS") return "Đang làm";
  return "Đã nộp";
}

export function buildAssignmentGradebookCsv(
  roster: TeacherAssignmentRoster,
) {
  const header = [
    "STT",
    "Họ và tên học sinh",
    "Trạng thái",
    "Số câu đúng",
    "Tổng số câu",
    "Tỷ lệ",
    "Thời điểm nộp",
  ];
  const rows = roster.students.map((student, index) => {
    const submitted = student.submissionStatus === "SUBMITTED";
    return [
      String(index + 1),
      student.studentDisplayName,
      statusLabel(student),
      submitted ? String(student.correctCount) : "",
      String(student.totalCount),
      submitted ? `${student.scorePercent}%` : "",
      submitted && student.submittedAt
        ? formatVietnamDateTime(student.submittedAt)
        : "",
    ];
  });

  return (
    UTF8_BOM +
    [header, ...rows]
      .map((row) => row.map(escapeCsvField).join(","))
      .join("\r\n") +
    "\r\n"
  );
}
