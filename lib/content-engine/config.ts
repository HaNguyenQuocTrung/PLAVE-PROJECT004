import {
  supportedGrades,
  type Grade,
  type SkillFamilyConfig,
  type ValidationResult,
} from "./types.ts";

function hasDuplicates<T>(values: readonly T[]) {
  return new Set(values).size !== values.length;
}

export function isSupportedGrade(value: number): value is Grade {
  return supportedGrades.some((grade) => grade === value);
}

export function validateSkillFamilyConfig(
  config: SkillFamilyConfig,
): ValidationResult {
  const errors: string[] = [];

  if (!/^[A-Z][A-Z0-9_]{2,63}$/.test(config.id)) {
    errors.push("Skill family ID phải là mã in hoa an toàn.");
  }
  if (config.label.trim().length < 3 || config.label.length > 100) {
    errors.push("Nhãn skill family không hợp lệ.");
  }
  if (!isSupportedGrade(config.grade)) {
    errors.push("Grade phải nằm trong phạm vi 1–9.");
  }
  if (
    !Number.isSafeInteger(config.minValue) ||
    !Number.isSafeInteger(config.maxValue) ||
    config.minValue > config.maxValue
  ) {
    errors.push("Phạm vi giá trị phải là hai số nguyên an toàn theo thứ tự.");
  }
  if (config.numberType === "WHOLE_NON_NEGATIVE" && config.minValue < 0) {
    errors.push("Số tự nhiên không âm không được có minValue âm.");
  }
  if (
    !Number.isInteger(config.digitCount.minimum) ||
    !Number.isInteger(config.digitCount.maximum) ||
    config.digitCount.minimum < 1 ||
    config.digitCount.maximum > 12 ||
    config.digitCount.minimum > config.digitCount.maximum
  ) {
    errors.push("digitCount phải là khoảng nguyên hợp lệ từ 1 đến 12.");
  } else if (
    String(Math.max(Math.abs(config.minValue), Math.abs(config.maxValue)))
      .length > config.digitCount.maximum
  ) {
    errors.push("digitCount không bao phủ maxValue đã cấu hình.");
  }
  if (
    config.allowedOperations.length === 0 ||
    hasDuplicates(config.allowedOperations)
  ) {
    errors.push("allowedOperations phải có giá trị và không trùng.");
  }
  if (
    config.multiplicationTables.some(
      (table) => !Number.isInteger(table) || table < 1 || table > 12,
    ) ||
    hasDuplicates(config.multiplicationTables)
  ) {
    errors.push("multiplicationTables chỉ nhận bảng 1–12 không trùng.");
  }
  if (
    config.divisionTables.some(
      (table) => !Number.isInteger(table) || table < 1 || table > 12,
    ) ||
    hasDuplicates(config.divisionTables)
  ) {
    errors.push("divisionTables chỉ nhận bảng 1–12 không trùng.");
  }
  if (
    config.multiplicationTables.length > 0 &&
    !config.allowedOperations.includes("MULTIPLY")
  ) {
    errors.push("Có bảng nhân nhưng MULTIPLY không được cho phép.");
  }
  if (
    config.divisionTables.length > 0 &&
    !config.allowedOperations.includes("DIVIDE")
  ) {
    errors.push("Có bảng chia nhưng DIVIDE không được cho phép.");
  }
  if (
    !Number.isInteger(config.numberOfSteps) ||
    config.numberOfSteps < 1 ||
    config.numberOfSteps > 5
  ) {
    errors.push("numberOfSteps phải nằm trong phạm vi 1–5.");
  }
  if (config.answerType.length === 0 || hasDuplicates(config.answerType)) {
    errors.push("answerType phải có giá trị và không trùng.");
  }
  if (
    config.accessibilityDescription.trim().length < 12 ||
    config.accessibilityDescription.length > 240 ||
    /[<>]|(?:https?:|data:|javascript:)/i.test(
      config.accessibilityDescription,
    )
  ) {
    errors.push("accessibilityDescription không an toàn hoặc quá ngắn.");
  }
  if (
    config.misconceptionTags.length === 0 ||
    hasDuplicates(config.misconceptionTags)
  ) {
    errors.push("misconceptionTags phải có giá trị và không trùng.");
  }

  return { valid: errors.length === 0, errors };
}
