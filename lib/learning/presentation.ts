import { getSkillLabel, skillLabels } from "../practice/catalog.ts";

export const MISSING_VIETNAMESE_SKILL_LABEL =
  "Chưa có tên kỹ năng tiếng Việt";
export const MISSING_VIETNAMESE_OUTCOME_LABEL =
  "Chưa có tên mục tiêu bằng tiếng Việt";
export const MISSING_VIETNAMESE_UNIT_LABEL =
  "Chưa có tên chủ đề tiếng Việt";
export const MISSING_VIETNAMESE_LEARNING_LABEL =
  "Chưa có tên nội dung học tập bằng tiếng Việt";

const VIETNAMESE_CHARACTER = /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/iu;
const INTERNAL_IDENTIFIER =
  /^(?:[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+|[a-z0-9]+(?:-[a-z0-9]+){2,})$/u;

function compact(value: string | null | undefined) {
  return value?.trim().replace(/\s+/gu, " ") ?? "";
}

function normalizedLegacySkillKey(value: string) {
  return compact(value)
    .replaceAll("_", " ")
    .replace(/\s+đến\s+/giu, " to ")
    .toLocaleLowerCase("vi");
}

const LEGACY_SKILL_CODE_BY_PRESENTED_TITLE = new Map(
  Object.keys(skillLabels).map((skillCode) => [
    normalizedLegacySkillKey(skillCode),
    skillCode,
  ]),
);
const KNOWN_LEGACY_SKILL_CODES = new Set<string>(Object.keys(skillLabels));

export function isVietnamesePresentationLabel(
  value: string | null | undefined,
) {
  const candidate = compact(value);
  return candidate.length >= 2 && VIETNAMESE_CHARACTER.test(candidate);
}

function knownLegacySkillCode(
  skillId: string | null | undefined,
  label: string | null | undefined,
) {
  const candidateId = compact(skillId);
  if (KNOWN_LEGACY_SKILL_CODES.has(candidateId)) return candidateId;
  return LEGACY_SKILL_CODE_BY_PRESENTED_TITLE.get(
    normalizedLegacySkillKey(compact(label)),
  );
}

export function getVietnameseSkillLabel(input: {
  skillId?: string | null;
  label?: string | null;
}) {
  const legacySkillCode = knownLegacySkillCode(input.skillId, input.label);
  if (legacySkillCode) return getSkillLabel(legacySkillCode);
  const label = compact(input.label);
  return isVietnamesePresentationLabel(label)
    ? label
    : MISSING_VIETNAMESE_SKILL_LABEL;
}

export function getVietnameseOutcomeLabel(input: {
  outcomeId?: string | null;
  label?: string | null;
}) {
  const label = compact(input.label);
  if (isVietnamesePresentationLabel(label)) return label;
  return MISSING_VIETNAMESE_OUTCOME_LABEL;
}

export function getVietnameseUnitLabel(input: {
  unitId?: string | null;
  label?: string | null;
  description?: string | null;
}) {
  const label = compact(input.label);
  if (
    label.length >= 2 &&
    !INTERNAL_IDENTIFIER.test(label) &&
    (isVietnamesePresentationLabel(label) || !/^[\x00-\x7F]+$/u.test(label))
  ) {
    return label;
  }
  const description = compact(input.description);
  if (isVietnamesePresentationLabel(description) && description.length <= 180) {
    return description;
  }
  return MISSING_VIETNAMESE_UNIT_LABEL;
}

export function getVietnameseLearningLabel(input: {
  identifier?: string | null;
  label?: string | null;
}) {
  const skillLabel = getVietnameseSkillLabel({
    skillId: input.identifier,
    label: input.label,
  });
  if (skillLabel !== MISSING_VIETNAMESE_SKILL_LABEL) return skillLabel;
  const label = compact(input.label);
  return isVietnamesePresentationLabel(label)
    ? label
    : MISSING_VIETNAMESE_LEARNING_LABEL;
}

export type CurriculumOutcomeEvidenceState =
  | "NO_ACTIVITY"
  | "MAPPING_NOT_AVAILABLE"
  | "INSUFFICIENT_EVIDENCE"
  | "EVIDENCE_AVAILABLE";

export function getCurriculumOutcomeEvidenceState(input: {
  totalLearningEvidence: number;
  outcomes: readonly { evidenceCount: number }[];
}): CurriculumOutcomeEvidenceState {
  if (input.totalLearningEvidence === 0) return "NO_ACTIVITY";
  if (input.outcomes.length === 0) return "MAPPING_NOT_AVAILABLE";
  if (input.outcomes.every((outcome) => outcome.evidenceCount < 3)) {
    return "INSUFFICIENT_EVIDENCE";
  }
  return "EVIDENCE_AVAILABLE";
}

export const curriculumOutcomeStateText: Readonly<
  Record<
    Exclude<CurriculumOutcomeEvidenceState, "EVIDENCE_AVAILABLE">,
    { title: string; description: string }
  >
> = {
  NO_ACTIVITY: {
    title: "Chưa có hoạt động học tập",
    description:
      "Khi học sinh trả lời câu hỏi trong một lượt học được lưu, bằng chứng phù hợp sẽ xuất hiện tại đây.",
  },
  MAPPING_NOT_AVAILABLE: {
    title: "Chưa có liên kết mục tiêu chương trình",
    description:
      "Chưa có dữ liệu liên kết với mục tiêu chương trình. Kết quả theo kỹ năng vẫn được hiển thị bên cạnh.",
  },
  INSUFFICIENT_EVIDENCE: {
    title: "Đã có liên kết, cần thêm bằng chứng",
    description:
      "Hoạt động đã được liên kết với mục tiêu chương trình, nhưng số câu hiện có chưa đủ cho ngưỡng đánh giá ổn định của PLAVE.",
  },
};

export const CURRENT_MASTERY_HELP =
  "Mỗi nhãn hiển thị số câu làm bằng chứng và tỷ lệ đúng. Theo tiêu chí PLAVE hiện tại, mức đạt yêu cầu cần ít nhất 4 bằng chứng, còn mức thành thạo cần ít nhất 6 bằng chứng, độ chính xác từ 85% và 3 kết quả gần nhất đều đúng. Đây là chỉ báo trong PLAVE, không phải đánh giá chính thức của nhà trường.";

export const difficultyPresentationLabels: Readonly<Record<string, string>> = {
  EASY: "Dễ",
  MEDIUM: "Trung bình",
  HARD: "Khó",
};

export const reviewDecisionPresentationLabels: Readonly<
  Record<string, string>
> = {
  APPROVE: "Chấp nhận",
  REJECT: "Từ chối",
  NEEDS_REVISION: "Cần chỉnh sửa",
  UNREVIEWED: "Chưa đánh giá",
};

export const curriculumDomainPresentationLabels: Readonly<
  Record<string, string>
> = {
  NUMBERS_AND_OPERATIONS: "Số và phép tính",
  ALGEBRA_AND_PREALGEBRA: "Đại số",
  GEOMETRY: "Hình học",
  MEASUREMENT: "Đo lường",
  STATISTICS_AND_PROBABILITY: "Thống kê và xác suất",
  APPLIED_PROBLEM_SOLVING: "Vận dụng giải quyết vấn đề",
};

export const interactionPresentationLabels: Readonly<Record<string, string>> = {
  SINGLE_CHOICE: "Chọn một đáp án",
  MULTI_SELECT: "Chọn nhiều đáp án",
  ORDERING: "Sắp xếp",
  MATCHING: "Ghép cặp",
  INTEGER_INPUT: "Nhập số nguyên",
  DECIMAL_INPUT: "Nhập số thập phân",
  FRACTION_INPUT: "Nhập phân số",
  SHORT_STRUCTURED_RESPONSE: "Trả lời ngắn",
  TABLE_OR_CHART_RESPONSE: "Trả lời từ bảng hoặc biểu đồ",
  CONSTRUCTION_OR_VISUAL_SELECTION: "Chọn hình hoặc cách dựng",
};

export function getPresentationEnumLabel(
  value: string,
  labels: Readonly<Record<string, string>>,
  fallback: string,
) {
  return labels[value] ?? fallback;
}
