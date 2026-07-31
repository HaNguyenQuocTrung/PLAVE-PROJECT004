import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/0028_grade1_length_measurement.sql",
);
const source = readFileSync(migrationPath, "utf8");

function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function readTaggedJson(tag) {
  const marker = `$${tag}$`;
  const start = source.indexOf(marker);
  const end = source.indexOf(marker, start + marker.length);
  assertCondition(start >= 0 && end >= 0, `Không tìm thấy payload ${tag}.`);
  return JSON.parse(source.slice(start + marker.length, end));
}

function hasExactKeys(value, keys) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function isSafeText(value, minimum, maximum) {
  return (
    typeof value === "string" &&
    value === value.trim() &&
    value.length >= minimum &&
    value.length <= maximum &&
    !/[<>]/.test(value) &&
    !/(?:https?:|data:|javascript:|www\.)/i.test(value)
  );
}

function isIntegerInRange(value, minimum, maximum) {
  return (
    Number.isInteger(value) && value >= minimum && value <= maximum
  );
}

const skillCodes = [
  "COMPARE_LENGTHS",
  "ORDER_BY_LENGTH",
  "MEASURE_WITH_EQUAL_UNITS",
  "READ_SIMPLE_MEASUREMENT",
];
const patterns = new Set(["SOLID", "DASHED", "DOUBLE"]);

function validateLengthComparison(spec, questionCode) {
  assertCondition(
    hasExactKeys(spec, ["description", "items", "kind"]) &&
      Array.isArray(spec.items) &&
      spec.items.length >= 2 &&
      spec.items.length <= 4,
    `${questionCode}: LENGTH_COMPARISON sai contract.`,
  );
  const ids = new Set();
  const labels = new Set();
  for (const item of spec.items) {
    assertCondition(
      hasExactKeys(item, [
        "id",
        "label",
        "length",
        "pattern",
        "startX",
        "y",
      ]),
      `${questionCode}: item so sánh chứa field ngoài allowlist.`,
    );
    assertCondition(
      typeof item.id === "string" &&
        /^[a-z][a-z0-9-]{0,19}$/.test(item.id) &&
        !ids.has(item.id),
      `${questionCode}: id dải không hợp lệ hoặc trùng.`,
    );
    assertCondition(
      isSafeText(item.label, 1, 24) && !labels.has(item.label),
      `${questionCode}: nhãn dải không hợp lệ hoặc trùng.`,
    );
    assertCondition(
      isIntegerInRange(item.startX, 5, 70) &&
        isIntegerInRange(item.y, 10, 82) &&
        isIntegerInRange(item.length, 10, 80) &&
        item.startX + item.length <= 95 &&
        patterns.has(item.pattern),
      `${questionCode}: tọa độ, độ dài hoặc kiểu nét không hợp lệ.`,
    );
    ids.add(item.id);
    labels.add(item.label);
  }
  assertCondition(
    new Set(spec.items.map((item) => item.startX)).size === 1,
    `${questionCode}: các vật so sánh phải cùng điểm bắt đầu.`,
  );
}

function validateEqualUnits(spec, questionCode) {
  assertCondition(
    hasExactKeys(spec, [
      "description",
      "endX",
      "kind",
      "objectLabel",
      "startX",
      "unitLabel",
      "unitWidth",
      "y",
    ]) &&
      isSafeText(spec.objectLabel, 1, 32) &&
      isSafeText(spec.unitLabel, 1, 20) &&
      isIntegerInRange(spec.startX, 5, 30) &&
      isIntegerInRange(spec.endX, 30, 95) &&
      spec.endX > spec.startX &&
      isIntegerInRange(spec.y, 20, 65) &&
      isIntegerInRange(spec.unitWidth, 5, 15) &&
      (spec.endX - spec.startX) % spec.unitWidth === 0 &&
      (spec.endX - spec.startX) / spec.unitWidth >= 2 &&
      (spec.endX - spec.startX) / spec.unitWidth <= 10,
    `${questionCode}: EQUAL_UNIT_MEASUREMENT sai contract.`,
  );
}

function validateRuler(spec, questionCode) {
  assertCondition(
    hasExactKeys(spec, [
      "description",
      "endValue",
      "kind",
      "maxValue",
      "objectLabel",
      "startValue",
      "unitLabel",
    ]) &&
      isSafeText(spec.objectLabel, 1, 32) &&
      spec.unitLabel === "cm" &&
      spec.startValue === 0 &&
      isIntegerInRange(spec.endValue, 1, 10) &&
      isIntegerInRange(spec.maxValue, 5, 10) &&
      spec.endValue <= spec.maxValue,
    `${questionCode}: SIMPLE_RULER sai contract bảo thủ 0–10 cm.`,
  );
}

function validateVisualSpec(spec, questionCode) {
  assertCondition(
    spec &&
      typeof spec === "object" &&
      !Array.isArray(spec) &&
      isSafeText(spec.description, 12, 240),
    `${questionCode}: visual_spec hoặc mô tả accessibility không hợp lệ.`,
  );
  assertCondition(
    !/(?:correct|answer|đáp án|đúng|sai|dài nhất|ngắn nhất)/i.test(
      JSON.stringify(spec),
    ),
    `${questionCode}: visual_spec chứa nhãn đáp án hoặc đúng/sai.`,
  );

  if (spec.kind === "LENGTH_COMPARISON") {
    validateLengthComparison(spec, questionCode);
  } else if (spec.kind === "EQUAL_UNIT_MEASUREMENT") {
    validateEqualUnits(spec, questionCode);
  } else if (spec.kind === "SIMPLE_RULER") {
    validateRuler(spec, questionCode);
  } else {
    throw new Error(`${questionCode}: loại visual ngoài allowlist.`);
  }
}

function itemById(question, id) {
  return question.visual_spec.items.find((item) => item.id === id);
}

function sortedIds(question, direction = "ASC") {
  return [...question.visual_spec.items]
    .sort((first, second) =>
      direction === "ASC"
        ? first.length - second.length
        : second.length - first.length,
    )
    .map((item) => item.id);
}

function labelList(question, ids) {
  return ids.map((id) => itemById(question, id)?.label).join(", ");
}

function deriveExpectedAnswer(question) {
  const check = question.check;
  assertCondition(
    check && typeof check.kind === "string",
    `${question.code}: thiếu phép kiểm tra visual.`,
  );

  if (check.kind === "LONGEST" || check.kind === "SHORTEST") {
    const direction = check.kind === "LONGEST" ? "DESC" : "ASC";
    const ordered = sortedIds(question, direction);
    const target = itemById(question, check.target);
    assertCondition(
      target &&
        ordered[0] === check.target &&
        question.visual_spec.items.filter(
          (item) => item.length === target.length,
        ).length === 1,
      `${question.code}: vật dài/ngắn nhất không duy nhất.`,
    );
    return `Dải ${target.label}`;
  }

  if (check.kind === "RELATION_EQUAL") {
    const [first, second] = check.targets.map((id) =>
      itemById(question, id),
    );
    assertCondition(
      first && second && first.length === second.length,
      `${question.code}: quan hệ bằng nhau không khớp visual.`,
    );
    return `${first.label} dài bằng ${second.label}`;
  }

  if (check.kind === "COUNT_LONGER_THAN") {
    const reference = itemById(question, check.reference);
    const count = question.visual_spec.items.filter(
      (item) => item.length > reference.length,
    ).length;
    assertCondition(
      reference && count === check.count,
      `${question.code}: số vật dài hơn không khớp visual.`,
    );
    return count;
  }

  if (check.kind === "COUNT_EQUAL_TO") {
    const reference = itemById(question, check.reference);
    const count = question.visual_spec.items.filter(
      (item) => item.length === reference.length,
    ).length;
    assertCondition(
      reference && count === check.count,
      `${question.code}: số vật dài bằng không khớp visual.`,
    );
    return count;
  }

  if (check.kind === "ORDER_ASC" || check.kind === "ORDER_DESC") {
    const direction = check.kind === "ORDER_ASC" ? "ASC" : "DESC";
    const derived = sortedIds(question, direction);
    assertCondition(
      derived.join(",") === check.targets.join(",") &&
        new Set(
          question.visual_spec.items.map((item) => item.length),
        ).size === question.visual_spec.items.length,
      `${question.code}: thứ tự độ dài không xác định duy nhất.`,
    );
    return labelList(question, derived);
  }

  if (check.kind === "MIDDLE") {
    const ordered = sortedIds(question);
    assertCondition(
      ordered.length === 3 && ordered[1] === check.target,
      `${question.code}: vật ở giữa không khớp visual.`,
    );
    return `Dải ${itemById(question, check.target).label}`;
  }

  if (check.kind === "POSITION_ASC") {
    const ordered = sortedIds(question);
    const position = ordered.indexOf(check.target) + 1;
    assertCondition(
      position === check.position,
      `${question.code}: vị trí sắp xếp không khớp visual.`,
    );
    return position;
  }

  if (check.kind === "COUNT_SHORTER_THAN") {
    const reference = itemById(question, check.reference);
    const count = question.visual_spec.items.filter(
      (item) => item.length < reference.length,
    ).length;
    assertCondition(
      reference && count === check.count,
      `${question.code}: số vật ngắn hơn không khớp visual.`,
    );
    return count;
  }

  if (check.kind === "MEASURE_EQUAL_UNITS") {
    const count =
      (question.visual_spec.endX - question.visual_spec.startX) /
      question.visual_spec.unitWidth;
    assertCondition(
      count === check.count,
      `${question.code}: số đơn vị không khớp visual.`,
    );
    return count;
  }

  if (check.kind === "READ_RULER") {
    const value =
      question.visual_spec.endValue - question.visual_spec.startValue;
    assertCondition(
      value === check.value,
      `${question.code}: số đo không khớp visual.`,
    );
    return question.question_type === "MULTIPLE_CHOICE"
      ? `${value} cm`
      : value;
  }

  throw new Error(`${question.code}: phép kiểm tra ngoài allowlist.`);
}

const objectives = readTaggedJson("objectives");
const lesson = readTaggedJson("lesson");
const questions = readTaggedJson("questions");
const solutions = readTaggedJson("solutions");

assertCondition(
  Array.isArray(objectives) &&
    objectives.length === 4 &&
    objectives.every((objective) => isSafeText(objective, 10, 180)),
  "Unit phải có bốn mục tiêu rõ ràng.",
);
assertCondition(
  lesson.sections?.length === 6 &&
    lesson.worked_examples?.length === 2,
  "Bài đo độ dài phải có đúng 6 phần và 2 ví dụ.",
);
assertCondition(
  lesson.sections.every(
    (section) =>
      isSafeText(section.code, 3, 50) &&
      isSafeText(section.title, 3, 100) &&
      Array.isArray(section.paragraphs) &&
      section.paragraphs.length >= 2 &&
      section.paragraphs.every((paragraph) =>
        isSafeText(paragraph, 12, 300),
      ),
  ),
  "Mỗi phần lý thuyết phải có nội dung an toàn và đủ ý.",
);
assertCondition(
  lesson.worked_examples.every(
    (example) =>
      isSafeText(example.title, 3, 100) &&
      Array.isArray(example.steps) &&
      example.steps.length >= 2 &&
      example.steps.every((step) => isSafeText(step, 12, 260)) &&
      isSafeText(example.answer, 3, 180),
  ),
  "Mỗi ví dụ phải có ít nhất hai bước và kết luận.",
);

assertCondition(questions.length === 24, "Phải có đúng 24 câu hỏi.");
assertCondition(solutions.length === 24, "Phải có đúng 24 lời giải.");
assertCondition(
  questions.filter(
    (question) => question.question_type === "MULTIPLE_CHOICE",
  ).length === 16,
  "Phải có đúng 16 câu trắc nghiệm.",
);
assertCondition(
  questions.filter(
    (question) => question.question_type === "NUMBER_INPUT",
  ).length === 8,
  "Phải có đúng 8 câu nhập số.",
);

const codes = new Set();
const prompts = new Set();
const solutionByQuestion = new Map(
  solutions.map((solution) => [solution.question_id, solution]),
);

for (const skillCode of skillCodes) {
  assertCondition(
    questions.filter((question) => question.skill_code === skillCode)
      .length === 6,
    `${skillCode}: phải có đúng 6 câu.`,
  );
}

for (const question of questions) {
  assertCondition(
    /^g1-len-q(?:0[1-9]|1[0-9]|2[0-4])$/.test(question.code) &&
      !codes.has(question.code),
    `${question.code}: mã câu không hợp lệ hoặc bị trùng.`,
  );
  assertCondition(
    isSafeText(question.prompt, 8, 220) &&
      !prompts.has(question.prompt),
    `${question.code}: prompt không hợp lệ hoặc bị trùng.`,
  );
  codes.add(question.code);
  prompts.add(question.prompt);
  assertCondition(
    skillCodes.includes(question.skill_code),
    `${question.code}: skill ngoài phạm vi Sprint 5J.`,
  );
  validateVisualSpec(question.visual_spec, question.code);

  const expectedAnswer = deriveExpectedAnswer(question);
  assertCondition(
    String(expectedAnswer) === String(question.expected_answer),
    `${question.code}: expected_answer không khớp dữ liệu hình.`,
  );

  const solution = solutionByQuestion.get(question.code);
  assertCondition(
    solution &&
      Array.isArray(solution.solution_steps) &&
      solution.solution_steps.length >= 2 &&
      solution.solution_steps.every((step) => isSafeText(step, 10, 260)) &&
      isSafeText(solution.explanation, 8, 260) &&
      isSafeText(solution.hint, 8, 180),
    `${question.code}: thiếu lời giải hai bước, giải thích hoặc gợi ý.`,
  );

  if (question.question_type === "MULTIPLE_CHOICE") {
    assertCondition(
      question.options &&
        hasExactKeys(question.options, ["A", "B", "C", "D"]) &&
        Object.values(question.options).every((option) =>
          isSafeText(option, 1, 100),
        ) &&
        new Set(Object.values(question.options)).size === 4,
      `${question.code}: MCQ phải có đúng bốn lựa chọn khác nhau A–D.`,
    );
    const matchingOptions = Object.entries(question.options).filter(
      ([, value]) => value === String(expectedAnswer),
    );
    assertCondition(
      matchingOptions.length === 1 &&
        solution.correct_answer === matchingOptions[0][0],
      `${question.code}: MCQ không có đúng một đáp án khớp visual.`,
    );
  } else {
    assertCondition(
      question.options === null &&
        isIntegerInRange(expectedAnswer, 0, 100) &&
        solution.correct_answer === String(expectedAnswer),
      `${question.code}: NUMBER_INPUT hoặc đáp án số không hợp lệ.`,
    );
  }
}

assertCondition(
  solutionByQuestion.size === questions.length &&
    solutions.every((solution) => codes.has(solution.question_id)),
  "Mỗi câu phải có đúng một lời giải tương ứng.",
);
assertCondition(
  !/(?:\bkm\b|ki-lô-mét|chu vi|diện tích|số thập phân)/i.test(
    JSON.stringify({ objectives, lesson, questions }),
  ),
  "Nội dung vượt phạm vi bảo thủ của unit.",
);
assertCondition(
  /begin;/i.test(source) &&
    /commit;/i.test(source) &&
    /grade-1-basic-geometry-and-position/.test(source) &&
    /display_order[\s\S]*11/.test(source) &&
    /private[.]is_valid_practice_visual_spec/.test(source) &&
    source.includes("v_start_definition !~ 'auth[.]uid'") &&
    /prerequisite_unit_slug/.test(source) &&
    /has_table_privilege/.test(source) &&
    /question_solutions/.test(source),
  "Migration thiếu atomicity, prerequisite hoặc security validation.",
);
assertCondition(
  !/grant\s+select\s+on\s+(?:table\s+)?public[.]question_solutions/i.test(
    source,
  ) &&
    !/service[_-]?role/i.test(source),
  "Migration không được mở solution hoặc dùng service-role.",
);

console.log(
  "PASS: Đo độ dài — 6 phần, 2 ví dụ, 24 câu (16 MCQ + 8 NUMBER_INPUT), 4 kỹ năng × 6, visual và đáp án khớp.",
);
