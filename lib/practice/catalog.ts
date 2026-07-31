import {
  GRADE_ONE_BASIC_GEOMETRY_AND_POSITION_UNIT_SLUG,
  GRADE_ONE_CUBE_AND_CUBOID_UNIT_SLUG,
  GRADE_ONE_LENGTH_MEASUREMENT_UNIT_SLUG,
  GRADE_ONE_TIME_CLOCK_CALENDAR_UNIT_SLUG,
  GRADE_ONE_ADDITION_UNIT_SLUG,
  GRADE_ONE_ADDITION_WITHIN_20_NO_CARRY_UNIT_SLUG,
  GRADE_ONE_ADDITION_WITHIN_100_NO_CARRY_UNIT_SLUG,
  GRADE_ONE_NUMBERS_TO_20_UNIT_SLUG,
  GRADE_ONE_NUMBERS_TO_100_UNIT_SLUG,
  GRADE_ONE_SUBTRACTION_UNIT_SLUG,
  GRADE_ONE_SUBTRACTION_WITHIN_20_NO_BORROW_UNIT_SLUG,
  GRADE_ONE_SUBTRACTION_WITHIN_100_NO_BORROW_UNIT_SLUG,
  GRADE_ONE_UNIT_SLUG,
  type LearningUnit,
  type PracticeAttempt,
  type SkillCode,
} from "./contracts.ts";
import type { PracticeVisualSpec } from "./visual.ts";

export const BASE_UNIT_SLUG = GRADE_ONE_UNIT_SLUG;
export const ADDITION_UNIT_SLUG = GRADE_ONE_ADDITION_UNIT_SLUG;
export const SUBTRACTION_UNIT_SLUG = GRADE_ONE_SUBTRACTION_UNIT_SLUG;
export const NUMBERS_TO_20_UNIT_SLUG = GRADE_ONE_NUMBERS_TO_20_UNIT_SLUG;
export const ADDITION_TO_20_UNIT_SLUG =
  GRADE_ONE_ADDITION_WITHIN_20_NO_CARRY_UNIT_SLUG;
export const SUBTRACTION_TO_20_UNIT_SLUG =
  GRADE_ONE_SUBTRACTION_WITHIN_20_NO_BORROW_UNIT_SLUG;
export const NUMBERS_TO_100_UNIT_SLUG =
  GRADE_ONE_NUMBERS_TO_100_UNIT_SLUG;
export const ADDITION_TO_100_UNIT_SLUG =
  GRADE_ONE_ADDITION_WITHIN_100_NO_CARRY_UNIT_SLUG;
export const SUBTRACTION_TO_100_UNIT_SLUG =
  GRADE_ONE_SUBTRACTION_WITHIN_100_NO_BORROW_UNIT_SLUG;
export const BASIC_GEOMETRY_UNIT_SLUG =
  GRADE_ONE_BASIC_GEOMETRY_AND_POSITION_UNIT_SLUG;
export const LENGTH_MEASUREMENT_UNIT_SLUG =
  GRADE_ONE_LENGTH_MEASUREMENT_UNIT_SLUG;
export const TIME_CLOCK_CALENDAR_UNIT_SLUG =
  GRADE_ONE_TIME_CLOCK_CALENDAR_UNIT_SLUG;
export const CUBE_AND_CUBOID_UNIT_SLUG =
  GRADE_ONE_CUBE_AND_CUBOID_UNIT_SLUG;

export type UnitPresentation = {
  cardClassName: string;
  pageClassName: string;
  memoryHeading: string;
  operationVisual: {
    ariaLabel: string;
    left: string;
    operator: "+" | "−";
    right: string;
    result: string;
  } | null;
  lessonVisual?: PracticeVisualSpec;
};

const defaultPresentation: UnitPresentation = {
  cardClassName: "",
  pageClassName: "",
  memoryHeading: "Đếm chậm, đọc kỹ và kiểm tra từng bước",
  operationVisual: null,
};

const unitPresentations: Record<string, UnitPresentation> = {
  [ADDITION_UNIT_SLUG]: {
    cardClassName: "unit-card--addition",
    pageClassName: "real-learning-page--addition",
    memoryHeading: "Gộp lại, đếm tiếp và kiểm tra tổng",
    operationVisual: {
      ariaLabel: "Hai chấm tròn cộng ba chấm tròn bằng năm chấm tròn",
      left: "● ●",
      operator: "+",
      right: "● ● ●",
      result: "= 5",
    },
  },
  [SUBTRACTION_UNIT_SLUG]: {
    cardClassName: "unit-card--subtraction",
    pageClassName: "real-learning-page--subtraction",
    memoryHeading: "Bớt đi, đếm phần còn lại và kiểm tra kết quả",
    operationVisual: {
      ariaLabel: "Năm chấm tròn bớt hai chấm tròn còn ba chấm tròn",
      left: "● ● ● ● ●",
      operator: "−",
      right: "● ●",
      result: "= 3",
    },
  },
  [NUMBERS_TO_20_UNIT_SLUG]: {
    cardClassName: "unit-card--numbers-20",
    pageClassName: "real-learning-page--numbers-20",
    memoryHeading: "Nhìn hàng chục, đọc hàng đơn vị và kiểm tra trên dãy số",
    operationVisual: {
      ariaLabel: "Một chục và bảy đơn vị tạo thành số mười bảy",
      left: "1 chục",
      operator: "+",
      right: "7 đơn vị",
      result: "= 17",
    },
  },
  [ADDITION_TO_20_UNIT_SLUG]: {
    cardClassName: "unit-card--addition-20",
    pageClassName: "real-learning-page--addition-20",
    memoryHeading: "Giữ nguyên một chục, cộng các đơn vị và kiểm tra tổng",
    operationVisual: {
      ariaLabel:
        "Một chục ba đơn vị cộng năm đơn vị bằng một chục tám đơn vị",
      left: "1 chục 3 đơn vị",
      operator: "+",
      right: "5 đơn vị",
      result: "= 18",
    },
  },
  [SUBTRACTION_TO_20_UNIT_SLUG]: {
    cardClassName: "unit-card--subtraction-20",
    pageClassName: "real-learning-page--subtraction-20",
    memoryHeading:
      "Giữ nguyên một chục, bớt các đơn vị và kiểm tra bằng phép cộng",
    operationVisual: {
      ariaLabel:
        "Một chục bảy đơn vị bớt năm đơn vị còn một chục hai đơn vị",
      left: "1 chục 7 đơn vị",
      operator: "−",
      right: "5 đơn vị",
      result: "= 12",
    },
  },
  [NUMBERS_TO_100_UNIT_SLUG]: {
    cardClassName: "unit-card--numbers-100",
    pageClassName: "real-learning-page--numbers-100",
    memoryHeading:
      "Nhìn hàng chục, đọc hàng đơn vị và kiểm tra trên dãy số đến 100",
    operationVisual: {
      ariaLabel: "Sáu chục và bốn đơn vị tạo thành số sáu mươi tư",
      left: "6 chục",
      operator: "+",
      right: "4 đơn vị",
      result: "= 64",
    },
  },
  [ADDITION_TO_100_UNIT_SLUG]: {
    cardClassName: "unit-card--addition-100",
    pageClassName: "real-learning-page--addition-100",
    memoryHeading:
      "Cộng đơn vị với đơn vị, cộng chục với chục và kiểm tra không nhớ",
    operationVisual: {
      ariaLabel: "Ba mươi tư cộng hai mươi lăm bằng năm mươi chín",
      left: "34",
      operator: "+",
      right: "25",
      result: "= 59",
    },
  },
  [SUBTRACTION_TO_100_UNIT_SLUG]: {
    cardClassName: "unit-card--subtraction-100",
    pageClassName: "real-learning-page--subtraction-100",
    memoryHeading:
      "Trừ đơn vị khỏi đơn vị, trừ chục khỏi chục và kiểm tra không mượn",
    operationVisual: {
      ariaLabel: "Sáu mươi tám trừ hai mươi lăm bằng bốn mươi ba",
      left: "68",
      operator: "−",
      right: "25",
      result: "= 43",
    },
  },
  [BASIC_GEOMETRY_UNIT_SLUG]: {
    cardClassName: "unit-card--geometry",
    pageClassName: "real-learning-page--geometry",
    memoryHeading:
      "Quan sát cạnh, góc và vị trí rồi gọi đúng tên từng hình",
    operationVisual: null,
    lessonVisual: {
      kind: "SHAPE_SCENE",
      description:
        "Bốn hình cơ bản có nhãn A, B, C và D: hình tròn, hình tam giác, hình vuông và hình chữ nhật.",
      items: [
        {
          id: "circle",
          shape: "CIRCLE",
          x: 4,
          y: 34,
          width: 18,
          height: 18,
          label: "A",
        },
        {
          id: "triangle",
          shape: "TRIANGLE",
          x: 29,
          y: 34,
          width: 18,
          height: 18,
          label: "B",
        },
        {
          id: "square",
          shape: "SQUARE",
          x: 54,
          y: 34,
          width: 18,
          height: 18,
          label: "C",
        },
        {
          id: "rectangle",
          shape: "RECTANGLE",
          x: 77,
          y: 34,
          width: 22,
          height: 16,
          label: "D",
        },
      ],
    },
  },
  [LENGTH_MEASUREMENT_UNIT_SLUG]: {
    cardClassName: "unit-card--measurement",
    pageClassName: "real-learning-page--measurement",
    memoryHeading:
      "Đặt cùng điểm đầu, dùng đơn vị bằng nhau và đọc đúng vạch đo",
    operationVisual: null,
    lessonVisual: {
      kind: "SIMPLE_RULER",
      description:
        "Dải giấy đặt một đầu tại vạch 0 trên thước xăng-ti-mét; đầu còn lại trùng một vạch rõ ràng.",
      objectLabel: "Dải giấy",
      unitLabel: "cm",
      startValue: 0,
      endValue: 6,
      maxValue: 10,
    },
  },
  [TIME_CLOCK_CALENDAR_UNIT_SLUG]: {
    cardClassName: "unit-card--time",
    pageClassName: "real-learning-page--time",
    memoryHeading:
      "Kim phút ở số 12, đọc kim giờ và quan sát đúng thứ tự ngày",
    operationVisual: null,
    lessonVisual: {
      kind: "ANALOG_CLOCK",
      description:
        "Mặt đồng hồ minh họa giờ đúng với kim phút dài chỉ số 12 và kim giờ ngắn chỉ số 7.",
      hour: 7,
      minute: 0,
      hourAngle: 210,
      minuteAngle: 0,
    },
  },
  [CUBE_AND_CUBOID_UNIT_SLUG]: {
    cardClassName: "unit-card--solids",
    pageClassName: "real-learning-page--solids",
    memoryHeading:
      "Quan sát hình dáng, gọi đúng tên khối và đếm từng khối nhìn thấy",
    operationVisual: null,
    lessonVisual: {
      kind: "SOLID_SCENE",
      description:
        "Hai khối có nhãn A và B được vẽ tách rời bằng nét liền; một khối cân đều và một khối có mặt trước rộng hơn chiều cao.",
      items: [
        {
          id: "solid-a",
          label: "A",
          row: 1,
          column: 2,
          frontWidth: 14,
          frontHeight: 14,
          depth: 5,
          appearance: "BLOCK",
        },
        {
          id: "solid-b",
          label: "B",
          row: 1,
          column: 4,
          frontWidth: 16,
          frontHeight: 10,
          depth: 5,
          appearance: "PLAIN",
        },
      ],
    },
  },
};

const unitSkillCodes: Record<string, readonly SkillCode[]> = {
  [BASE_UNIT_SLUG]: [
    "COUNT_RECOGNIZE",
    "READ_WRITE_MATCH",
    "SEQUENCE_COMPARE_ORDER",
    "COMPOSE_DECOMPOSE",
  ],
  [ADDITION_UNIT_SLUG]: [
    "ADDITION_MEANING",
    "ADDITION_CALCULATION",
    "NUMBER_BONDS",
    "ONE_STEP_WORD_PROBLEM",
  ],
  [SUBTRACTION_UNIT_SLUG]: [
    "SUBTRACTION_MEANING",
    "SUBTRACTION_CALCULATION",
    "ADDITION_SUBTRACTION_RELATION",
    "ONE_STEP_SUBTRACTION_WORD_PROBLEM",
  ],
  [NUMBERS_TO_20_UNIT_SLUG]: [
    "COUNT_READ_WRITE_TO_20",
    "SEQUENCE_TO_20",
    "COMPARE_ORDER_TO_20",
    "TENS_ONES_TO_20",
  ],
  [ADDITION_TO_20_UNIT_SLUG]: [
    "ADD_TEN_AND_ONES",
    "ADD_TEEN_AND_ONES_NO_CARRY",
    "ADD_USING_TENS_ONES",
    "ONE_STEP_ADDITION_TO_20",
  ],
  [SUBTRACTION_TO_20_UNIT_SLUG]: [
    "SUBTRACTION_MEANING",
    "SUBTRACTION_WITHIN_20_NO_BORROW",
    "MISSING_NUMBER_SUBTRACTION",
    "SUBTRACTION_WORD_PROBLEM",
  ],
  [NUMBERS_TO_100_UNIT_SLUG]: [
    "COUNT_RECOGNIZE_TO_100",
    "READ_WRITE_TO_100",
    "TENS_ONES_COMPOSE",
    "COMPARE_ORDER_TO_100",
  ],
  [ADDITION_TO_100_UNIT_SLUG]: [
    "ADD_TENS_WITHIN_100",
    "ADD_TWO_DIGIT_NO_CARRY",
    "MISSING_NUMBER_ADDITION_100",
    "ADDITION_WORD_PROBLEM_100",
  ],
  [SUBTRACTION_TO_100_UNIT_SLUG]: [
    "SUBTRACT_TENS_WITHIN_100",
    "SUBTRACT_TWO_DIGIT_NO_BORROW",
    "MISSING_NUMBER_SUBTRACTION_100",
    "SUBTRACTION_WORD_PROBLEM_100",
  ],
  [BASIC_GEOMETRY_UNIT_SLUG]: [
    "RECOGNIZE_BASIC_SHAPES",
    "COMPARE_AND_SORT_SHAPES",
    "POSITION_RELATIONS",
    "COUNT_SHAPES_IN_PICTURE",
  ],
  [LENGTH_MEASUREMENT_UNIT_SLUG]: [
    "COMPARE_LENGTHS",
    "ORDER_BY_LENGTH",
    "MEASURE_WITH_EQUAL_UNITS",
    "READ_SIMPLE_MEASUREMENT",
  ],
  [TIME_CLOCK_CALENDAR_UNIT_SLUG]: [
    "READ_WHOLE_HOURS",
    "ORDER_DAILY_EVENTS",
    "DAYS_OF_WEEK",
    "READ_SIMPLE_CALENDAR",
  ],
  [CUBE_AND_CUBOID_UNIT_SLUG]: [
    "CUBE_RECOGNITION",
    "CUBOID_RECOGNITION",
    "REAL_OBJECT_CLASSIFICATION",
    "SIMPLE_BLOCK_COMPOSITION",
  ],
};

export const skillLabels: Record<SkillCode, string> = {
  COUNT_RECOGNIZE: "Đếm và nhận biết số lượng",
  READ_WRITE_MATCH: "Đọc, viết và ghép số",
  SEQUENCE_COMPARE_ORDER: "Số liền trước, số liền sau và so sánh",
  COMPOSE_DECOMPOSE: "Tách, gộp và cấu tạo số",
  ADDITION_MEANING: "Ý nghĩa của phép cộng",
  ADDITION_CALCULATION: "Tính tổng trong phạm vi 10",
  NUMBER_BONDS: "Các cách tạo thành một số",
  ONE_STEP_WORD_PROBLEM: "Bài toán có lời văn một bước",
  SUBTRACTION_MEANING: "Ý nghĩa của phép trừ",
  SUBTRACTION_CALCULATION: "Tính hiệu trong phạm vi 10",
  ADDITION_SUBTRACTION_RELATION: "Liên hệ phép cộng và phép trừ",
  ONE_STEP_SUBTRACTION_WORD_PROBLEM:
    "Bài toán trừ có lời văn một bước",
  COUNT_READ_WRITE_TO_20: "Đếm, đọc và viết số đến 20",
  SEQUENCE_TO_20: "Dãy số đến 20",
  COMPARE_ORDER_TO_20: "So sánh và sắp xếp",
  TENS_ONES_TO_20: "Chục và đơn vị",
  ADD_TEN_AND_ONES: "Cộng 10 và các đơn vị",
  ADD_TEEN_AND_ONES_NO_CARRY:
    "Cộng số có hai chữ số với số có một chữ số",
  ADD_USING_TENS_ONES: "Cộng theo chục và đơn vị",
  ONE_STEP_ADDITION_TO_20: "Bài toán cộng đến 20",
  SUBTRACTION_WITHIN_20_NO_BORROW:
    "Trừ trong phạm vi 20 không mượn",
  MISSING_NUMBER_SUBTRACTION: "Tìm số còn thiếu trong phép trừ",
  SUBTRACTION_WORD_PROBLEM: "Bài toán trừ đến 20",
  COUNT_RECOGNIZE_TO_100: "Đếm và nhận biết số đến 100",
  READ_WRITE_TO_100: "Đọc và viết số đến 100",
  TENS_ONES_COMPOSE: "Chục, đơn vị và cấu tạo số",
  COMPARE_ORDER_TO_100: "So sánh, sắp xếp và số liền kề",
  ADD_TENS_WITHIN_100: "Cộng các số tròn chục",
  ADD_TWO_DIGIT_NO_CARRY: "Cộng số có hai chữ số không nhớ",
  MISSING_NUMBER_ADDITION_100: "Tìm số còn thiếu trong phép cộng",
  ADDITION_WORD_PROBLEM_100: "Bài toán cộng trong phạm vi 100",
  SUBTRACT_TENS_WITHIN_100: "Trừ các số tròn chục",
  SUBTRACT_TWO_DIGIT_NO_BORROW:
    "Trừ số có hai chữ số không mượn",
  MISSING_NUMBER_SUBTRACTION_100:
    "Tìm số còn thiếu trong phép trừ",
  SUBTRACTION_WORD_PROBLEM_100:
    "Bài toán trừ trong phạm vi 100",
  RECOGNIZE_BASIC_SHAPES: "Nhận biết các hình cơ bản",
  COMPARE_AND_SORT_SHAPES: "So sánh và phân loại hình",
  POSITION_RELATIONS: "Nhận biết vị trí",
  COUNT_SHAPES_IN_PICTURE: "Đếm hình trong minh họa",
  COMPARE_LENGTHS: "So sánh độ dài",
  ORDER_BY_LENGTH: "Sắp xếp theo độ dài",
  MEASURE_WITH_EQUAL_UNITS: "Đo bằng đơn vị bằng nhau",
  READ_SIMPLE_MEASUREMENT: "Đọc phép đo đơn giản",
  READ_WHOLE_HOURS: "Đọc giờ đúng",
  ORDER_DAILY_EVENTS: "Sắp xếp hoạt động trong ngày",
  DAYS_OF_WEEK: "Các ngày trong tuần",
  READ_SIMPLE_CALENDAR: "Đọc lịch đơn giản",
  CUBE_RECOGNITION: "Nhận biết khối lập phương",
  CUBOID_RECOGNITION: "Nhận biết khối hộp chữ nhật",
  REAL_OBJECT_CLASSIFICATION: "Phân loại đồ vật theo hình khối",
  SIMPLE_BLOCK_COMPOSITION: "Ghép và đếm các khối đơn giản",
  NUMBER_RECOGNITION_TO_1000: "Nhận biết số trong phạm vi 1000",
  READ_WRITE_TO_1000: "Đọc và viết số trong phạm vi 1000",
  PLACE_VALUE_TO_1000: "Hàng trăm, chục và đơn vị",
  SEQUENCE_TO_1000: "So sánh và sắp xếp số đến 1000",
};

export function getUnitSkillCodes(unitSlug: string) {
  return unitSkillCodes[unitSlug] ?? [];
}

export function getSkillLabel(skillCode: SkillCode) {
  return skillLabels[skillCode] ?? "Kỹ năng đang được cập nhật";
}

export function getUnitPresentation(unitSlug: string): UnitPresentation {
  return unitPresentations[unitSlug] ?? defaultPresentation;
}

export function getLessonPath(unitSlug: string) {
  const match = /^grade-(\d+)-([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(
    unitSlug,
  );
  return match ? `/learn/grade-${match[1]}/${match[2]}` : "/learn";
}

export function getUnitSlugFromLessonRoute(
  gradeSlug: string,
  lessonSlug: string,
) {
  if (
    !/^grade-[1-9]$/.test(gradeSlug) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lessonSlug)
  ) {
    return null;
  }
  return `${gradeSlug}-${lessonSlug}`;
}

export function hasCompletedUnit(
  attempts: PracticeAttempt[],
  unitSlug: string,
) {
  return attempts.some(
    (attempt) =>
      attempt.unitSlug === unitSlug && attempt.status === "COMPLETED",
  );
}

export function isUnitPracticeUnlocked(
  unit: LearningUnit,
  attempts: PracticeAttempt[],
) {
  return (
    unit.prerequisiteUnitSlug === null ||
    hasCompletedUnit(attempts, unit.prerequisiteUnitSlug)
  );
}

export function getSuggestedUnit(
  units: LearningUnit[],
  attempts: PracticeAttempt[],
) {
  const firstIncomplete = units.find(
    (unit) => !hasCompletedUnit(attempts, unit.slug),
  );
  return firstIncomplete ?? units.at(-1) ?? null;
}
