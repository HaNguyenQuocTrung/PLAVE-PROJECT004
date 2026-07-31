import type {
  CurriculumDomain,
  CurriculumUnit,
} from "./types.ts";

export const curriculumDomainLabels: Readonly<
  Record<CurriculumDomain, string>
> = {
  NUMBERS_AND_OPERATIONS: "Số và phép tính",
  ALGEBRA_AND_PREALGEBRA: "Đại số",
  GEOMETRY: "Hình học",
  MEASUREMENT: "Đo lường",
  STATISTICS_AND_PROBABILITY: "Thống kê và xác suất",
  APPLIED_PROBLEM_SOLVING: "Giải quyết vấn đề",
};

export function studentUnitTitle(unit: CurriculumUnit) {
  const title = unit.title
    .replace(/\s+\(Lớp \d+, trang \d+\)/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  const shortened =
    title.length <= 96
      ? title
      : `${title.slice(0, 93).replace(/\s+\S*$/u, "").trimEnd()}…`;
  return shortened.charAt(0).toLocaleUpperCase("vi") + shortened.slice(1);
}

export function studentLearningGoals(unit: CurriculumUnit) {
  return unit.theory.slice(0, 4).map((section) =>
    section.title
      .replace(/\s+\(Lớp \d+, trang \d+\)/gu, "")
      .replace(/\s+/gu, " ")
      .trim(),
  );
}
