import type { AssignmentEffectiveState } from "./contracts.ts";

export const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

export type AssignmentDisplayState =
  | "OPEN"
  | "DUE_SOON"
  | "OVERDUE"
  | "CLOSED";

export function formatVietnamDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: VIETNAM_TIME_ZONE,
  }).format(new Date(value));
}

export function toVietnamDateTimeLocal(value: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: VIETNAM_TIME_ZONE,
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function parseVietnamDateTimeLocal(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+07:00`);
  if (Number.isNaN(date.getTime())) return null;
  return toVietnamDateTimeLocal(date.toISOString()) === value
    ? date.toISOString()
    : null;
}

export function getAssignmentDisplayState(
  effectiveState: AssignmentEffectiveState,
  dueAt: string | null,
  serverNow: string,
): AssignmentDisplayState {
  if (effectiveState === "CLOSED") return "CLOSED";
  if (effectiveState === "OVERDUE") return "OVERDUE";
  if (
    dueAt &&
    Date.parse(dueAt) - Date.parse(serverNow) <= 24 * 60 * 60 * 1000
  ) {
    return "DUE_SOON";
  }
  return "OPEN";
}

export function getAssignmentStateLabel(
  displayState: AssignmentDisplayState,
) {
  if (displayState === "CLOSED") return "Đã đóng";
  if (displayState === "OVERDUE") return "Đã quá hạn";
  if (displayState === "DUE_SOON") return "Sắp hết hạn";
  return "Đang mở";
}

export function getAssignmentDeadlineText(
  effectiveState: AssignmentEffectiveState,
  dueAt: string | null,
  serverNow: string,
) {
  if (effectiveState === "CLOSED") {
    return {
      exact: dueAt
        ? `Hạn nộp trước đây: ${formatVietnamDateTime(dueAt)}`
        : "Bài tập không có hạn nộp trước khi đóng.",
      remaining: "Giáo viên đã đóng bài.",
    };
  }
  if (effectiveState === "OVERDUE") {
    return {
      exact: dueAt
        ? `Hạn nộp: ${formatVietnamDateTime(dueAt)}`
        : "Hạn nộp không còn khả dụng.",
      remaining: "Đã quá hạn.",
    };
  }
  if (!dueAt) {
    return {
      exact: "Không giới hạn thời gian",
      remaining: "Bài tập đang mở.",
    };
  }

  const remainingMilliseconds =
    Date.parse(dueAt) - Date.parse(serverNow);
  const remainingMinutes = Math.max(
    1,
    Math.ceil(remainingMilliseconds / 60000),
  );
  const remaining =
    remainingMinutes >= 1440
      ? `Còn ${Math.ceil(remainingMinutes / 1440)} ngày.`
      : remainingMinutes >= 60
        ? `Còn ${Math.ceil(remainingMinutes / 60)} giờ.`
        : `Còn ${remainingMinutes} phút.`;
  return {
    exact: `Hạn nộp: ${formatVietnamDateTime(dueAt)}`,
    remaining,
  };
}
