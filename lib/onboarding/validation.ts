export type OnboardingSubmission = {
  fullName: string;
  birthDate: string;
};

export const missingRegistrationGradeMessage =
  "PLAVE chưa tìm thấy lớp em đã chọn. Vui lòng đăng xuất, đăng ký lại và chọn lớp từ 1 đến 9.";

export function isValidRegistrationGrade(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 9
  );
}

export function parseOnboardingSubmission(
  value: unknown,
): OnboardingSubmission | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("fullName" in value) ||
    typeof value.fullName !== "string" ||
    !("birthDate" in value) ||
    typeof value.birthDate !== "string"
  ) {
    return null;
  }

  const keys = Object.keys(value);
  if (
    keys.length !== 2 ||
    keys.some((key) => key !== "fullName" && key !== "birthDate")
  ) {
    return null;
  }

  return {
    fullName: value.fullName,
    birthDate: value.birthDate,
  };
}
