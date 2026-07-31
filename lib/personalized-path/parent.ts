import {
  diagnosticDomainLabels,
  type ParentDiagnosticSummary,
} from "../diagnostic/contracts.ts";
import type {
  ParentChildLearningDashboard,
} from "../parent-dashboard/contracts.ts";

export type ParentPersonalizedPathSummary = {
  focusTitle: string | null;
  focusStatus:
    | "Đang học"
    | "Bài được đề xuất"
    | "Đã hoàn thành nội dung hiện tại"
    | "Chưa có dữ liệu";
  reason: string;
  reviewDomainLabels: string[];
};

export function buildParentPersonalizedPathSummary(
  dashboard: ParentChildLearningDashboard,
  diagnostic: ParentDiagnosticSummary | null,
): ParentPersonalizedPathSummary {
  const reviewDomainLabels =
    diagnostic?.hasResult
      ? diagnostic.domains
          .filter((domain) => domain.level === "REVIEW")
          .map((domain) => diagnosticDomainLabels[domain.domain])
      : [];

  if (dashboard.currentPractice) {
    return {
      focusTitle: dashboard.currentPractice.unitTitle,
      focusStatus: "Đang học",
      reason: `Học sinh đã hoàn thành ${dashboard.currentPractice.answeredCount}/${dashboard.currentPractice.totalQuestions} câu trong lượt hiện tại.`,
      reviewDomainLabels,
    };
  }

  if (diagnostic?.hasResult) {
    if (diagnostic.recommendation.unitTitle) {
      return {
        focusTitle: diagnostic.recommendation.unitTitle,
        focusStatus: "Bài được đề xuất",
        reason: diagnostic.recommendation.explanation,
        reviewDomainLabels,
      };
    }
    return {
      focusTitle: null,
      focusStatus: "Đã hoàn thành nội dung hiện tại",
      reason: diagnostic.recommendation.explanation,
      reviewDomainLabels,
    };
  }

  return {
    focusTitle: null,
    focusStatus: "Chưa có dữ liệu",
    reason:
      dashboard.summary.completedAttemptCount > 0
        ? "Chưa có kết quả đánh giá gần nhất để đề xuất một bài cụ thể."
        : "Học sinh chưa có lượt luyện tập hoặc kết quả đánh giá hoàn thành.",
    reviewDomainLabels,
  };
}
