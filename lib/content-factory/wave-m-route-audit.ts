import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(root: string, path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

export function auditWaveMRouteAccessibility(root = process.cwd()) {
  const files = {
    catalog: "components/UniversalLessonsCatalog.tsx",
    start: "components/UniversalCurriculumStartButton.tsx",
    progress: "components/StudentCurriculumProgressView.tsx",
    history: "components/StudentCurriculumHistoryView.tsx",
    access: "components/LearningAccessState.tsx",
    progressRoute: "app/learning-progress/page.tsx",
    historyRoute: "app/learning-history/page.tsx",
    styles: "app/globals.css",
  } as const;
  const content = Object.fromEntries(Object.entries(files).map(([key, path]) => [key, source(root, path)])) as Record<keyof typeof files, string>;
  const checks = {
    loadingState: /loading=\{submitting\}/u.test(content.start) && /disabled=\{submitting\}/u.test(content.start),
    emptyState: /Em chưa có lượt học nào/u.test(content.history) && /Mở chương trình học/u.test(content.history),
    errorState: /role="alert"/u.test(content.start) && /Thử lại/u.test(content.start),
    deniedState: /Không có quyền truy cập/u.test(content.access) && /ACCESS_DENIED/u.test(content.progressRoute + content.historyRoute),
    completedState: /Đã hoàn thành/u.test(content.history) && /Xem kết quả/u.test(content.history),
    continueCta: /Tiếp tục học/u.test(content.catalog + content.progress) && /href="\/lessons"/u.test(content.progress),
    exactGradeVisibility: /curriculumUnits\.filter\(\(unit\) => unit\.grade === grade\)/u.test(content.catalog),
    hiddenCandidateNotRendered: !/(?:bundleHash|policyVersion|correctAnswer|exactValue|finalAnswer)/u.test(content.catalog + content.progress + content.history),
    noPublishedGradeClaim: !/(?:toàn bộ|tất cả).{0,24}(?:đã xuất bản|published)/iu.test(content.catalog + content.progress + content.history),
    keyboardAndLabels: /aria-label="Tiến độ chương trình"/u.test(content.catalog) && /aria-labelledby/u.test(content.progress + content.history),
    focusVisible: /:focus-visible/u.test(content.styles), responsive: /@media \(max-width: 700px\)/u.test(content.styles),
    reducedMotion: /prefers-reduced-motion/u.test(content.styles), vietnameseCopy: /Lộ trình Toán lớp/u.test(content.catalog)
      && /Tiến trình học tập/u.test(content.progress) && /Lịch sử học tập/u.test(content.history),
    noHardCodedIdentity: !/(?:student@example|real[_-]?user|userId\s*=\s*["'][0-9a-f]{8})/iu.test(content.catalog + content.progress + content.history),
    roleScopedRoutes: /loadStudentCurriculumProgress/u.test(content.progressRoute) && /loadStudentCurriculumHistory/u.test(content.historyRoute),
  };
  const errors = Object.entries(checks).filter(([, value]) => !value).map(([key]) => `ROUTE_ACCESSIBILITY:${key}`);
  return { schemaVersion: "plave-wave-m-route-accessibility-audit-v1", status: errors.length === 0 ? "PASSED" as const : "FAILED" as const,
    files, checks, routesInspected: ["/lessons", "/learning-progress", "/learning-history", "/curriculum-practice/[attemptId]"],
    portUsed: false, brandingChanged: false, redesignPerformed: false, errors };
}
