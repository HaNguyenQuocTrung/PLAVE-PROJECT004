import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/0030_grade1_cube_and_cuboid.sql",
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
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

const skills = [
  "CUBE_RECOGNITION",
  "CUBOID_RECOGNITION",
  "REAL_OBJECT_CLASSIFICATION",
  "SIMPLE_BLOCK_COMPOSITION",
];
const expectedTypeDistribution = {
  CUBE_RECOGNITION: { MULTIPLE_CHOICE: 4, NUMBER_INPUT: 2 },
  CUBOID_RECOGNITION: { MULTIPLE_CHOICE: 4, NUMBER_INPUT: 2 },
  REAL_OBJECT_CLASSIFICATION: { MULTIPLE_CHOICE: 6, NUMBER_INPUT: 0 },
  SIMPLE_BLOCK_COMPOSITION: { MULTIPLE_CHOICE: 2, NUMBER_INPUT: 4 },
};
const appearances = new Set([
  "PLAIN",
  "BLOCK",
  "DICE",
  "GIFT_BOX",
  "BOOK",
  "BRICK",
  "SHOEBOX",
]);

function validateNoUnsafeFields(value, path = "visual_spec") {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validateNoUnsafeFields(item, `${path}[${index}]`),
    );
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    assertCondition(
      !/^(?:html|svg|script|url|src|href|dataUrl|on[A-Z]|is_correct|correct_answer|solution|answer)$/i.test(
        key,
      ),
      `${path}: field ${key} không được phép.`,
    );
    validateNoUnsafeFields(child, `${path}.${key}`);
  }
}

function validateVisualSpec(spec, code) {
  assertCondition(
    spec &&
      typeof spec === "object" &&
      !Array.isArray(spec) &&
      hasExactKeys(spec, ["description", "items", "kind"]) &&
      spec.kind === "SOLID_SCENE" &&
      isSafeText(spec.description, 12, 240) &&
      Array.isArray(spec.items) &&
      spec.items.length >= 1 &&
      spec.items.length <= 10,
    `${code}: SOLID_SCENE không hợp lệ.`,
  );
  validateNoUnsafeFields(spec);
  assertCondition(
    !/(?:đáp án|đúng là|sai là|answer is|correct is)/i.test(spec.description),
    `${code}: mô tả visual làm lộ đáp án.`,
  );

  const ids = new Set();
  const labels = new Set();
  const cells = new Set();
  for (const item of spec.items) {
    const cell = `${item.row}:${item.column}`;
    assertCondition(
      hasExactKeys(item, [
        "appearance",
        "column",
        "depth",
        "frontHeight",
        "frontWidth",
        "id",
        "label",
        "row",
      ]) &&
        typeof item.id === "string" &&
        /^[a-z][a-z0-9-]{0,19}$/.test(item.id) &&
        !ids.has(item.id) &&
        isSafeText(item.label, 1, 16) &&
        !labels.has(item.label) &&
        isIntegerInRange(item.row, 1, 2) &&
        isIntegerInRange(item.column, 1, 5) &&
        !cells.has(cell) &&
        isIntegerInRange(item.frontWidth, 10, 16) &&
        isIntegerInRange(item.frontHeight, 10, 18) &&
        isIntegerInRange(item.depth, 4, 6) &&
        appearances.has(item.appearance),
      `${code}: item visual không đúng allowlist hoặc bị chồng ô.`,
    );
    assertCondition(
      !["DICE", "GIFT_BOX"].includes(item.appearance) ||
        item.frontWidth === item.frontHeight,
      `${code}: vật dạng lập phương bị vẽ méo.`,
    );
    assertCondition(
      !["BOOK", "BRICK", "SHOEBOX"].includes(item.appearance) ||
        item.frontWidth !== item.frontHeight,
      `${code}: vật dạng hộp chữ nhật bị vẽ mơ hồ.`,
    );
    ids.add(item.id);
    labels.add(item.label);
    cells.add(cell);
  }
}

function itemCategory(item) {
  if (["DICE", "GIFT_BOX"].includes(item.appearance)) return "CUBE";
  if (["BOOK", "BRICK", "SHOEBOX"].includes(item.appearance)) {
    return "CUBOID";
  }
  return item.frontWidth === item.frontHeight ? "CUBE" : "CUBOID";
}

function getItem(question, id) {
  return question.visual_spec.items.find((item) => item.id === id);
}

function deriveExpectedAnswer(question) {
  const check = question.check;
  assertCondition(
    check && typeof check.kind === "string",
    `${question.code}: thiếu check deterministic.`,
  );

  if (["ITEM", "OBJECT"].includes(check.kind)) {
    const item = getItem(question, check.id);
    assertCondition(
      item && itemCategory(item) === check.category,
      `${question.code}: item không khớp category.`,
    );
    return question.expected_answer;
  }

  if (check.kind === "PAIR") {
    assertCondition(
      Array.isArray(check.ids) &&
        check.ids.length === 2 &&
        check.ids.every((id) => {
          const item = getItem(question, id);
          return item && itemCategory(item) === check.category;
        }),
      `${question.code}: cặp khối không khớp visual.`,
    );
    return question.expected_answer;
  }

  if (check.kind === "COUNT_CATEGORY") {
    const count = question.visual_spec.items.filter(
      (item) => itemCategory(item) === check.category,
    ).length;
    assertCondition(count === check.count, `${question.code}: số khối sai.`);
    return count;
  }

  if (check.kind === "COUNT_ALL") {
    assertCondition(
      question.visual_spec.items.length === check.count,
      `${question.code}: tổng số khối sai.`,
    );
    return question.question_type === "MULTIPLE_CHOICE"
      ? question.expected_answer
      : check.count;
  }

  if (check.kind === "CATEGORY_COUNTS") {
    const cubeCount = question.visual_spec.items.filter(
      (item) => itemCategory(item) === "CUBE",
    ).length;
    const cuboidCount = question.visual_spec.items.length - cubeCount;
    assertCondition(
      cubeCount === check.cube && cuboidCount === check.cuboid,
      `${question.code}: phân bố hai loại khối không khớp visual.`,
    );
    return question.expected_answer;
  }

  throw new Error(`${question.code}: check ${check.kind} không hỗ trợ.`);
}

const objectives = readTaggedJson("objectives");
const lesson = readTaggedJson("lesson");
const questions = readTaggedJson("questions");
const solutions = readTaggedJson("solutions");

assertCondition(
  Array.isArray(objectives) &&
    objectives.length === 4 &&
    objectives.every((objective) => isSafeText(objective, 20, 180)),
  "Mục tiêu học tập không hợp lệ.",
);
assertCondition(
  lesson.sections?.length === 6 &&
    lesson.worked_examples?.length === 2 &&
    lesson.sections.every(
      (section) =>
        isSafeText(section.code, 3, 48) &&
        isSafeText(section.title, 5, 80) &&
        Array.isArray(section.paragraphs) &&
        section.paragraphs.length >= 2 &&
        section.paragraphs.every((paragraph) =>
          isSafeText(paragraph, 20, 280),
        ),
    ) &&
    lesson.worked_examples.every(
      (example) =>
        isSafeText(example.title, 5, 100) &&
        Array.isArray(example.steps) &&
        example.steps.length >= 2 &&
        example.steps.every((step) => isSafeText(step, 15, 240)) &&
        isSafeText(example.answer, 10, 220),
    ),
  "Bài học phải có đúng 6 phần và 2 ví dụ từng bước.",
);

assertCondition(questions.length === 24, "Phải có đúng 24 câu hỏi.");
assertCondition(solutions.length === 24, "Phải có đúng 24 lời giải.");
assertCondition(
  questions.filter((question) => question.question_type === "MULTIPLE_CHOICE")
    .length === 16,
  "Phải có đúng 16 câu MULTIPLE_CHOICE.",
);
assertCondition(
  questions.filter((question) => question.question_type === "NUMBER_INPUT")
    .length === 8,
  "Phải có đúng 8 câu NUMBER_INPUT.",
);
assertCondition(
  new Set(questions.map((question) => question.code)).size === 24,
  "Question code bị trùng.",
);
assertCondition(
  new Set(questions.map((question) => question.prompt)).size === 24,
  "Prompt bị trùng.",
);

const solutionByQuestion = new Map(
  solutions.map((solution) => [solution.question_id, solution]),
);
for (const skill of skills) {
  const skillQuestions = questions.filter(
    (question) => question.skill_code === skill,
  );
  const expected = expectedTypeDistribution[skill];
  assertCondition(skillQuestions.length === 6, `${skill} phải có đúng 6 câu.`);
  for (const type of ["MULTIPLE_CHOICE", "NUMBER_INPUT"]) {
    assertCondition(
      skillQuestions.filter((question) => question.question_type === type)
        .length === expected[type],
      `${skill}: phân bố ${type} không đúng.`,
    );
  }
}

for (const question of questions) {
  assertCondition(
    skills.includes(question.skill_code) &&
      isSafeText(question.prompt, 10, 220) &&
      isIntegerInRange(question.display_order, 1, 24),
    `${question.code}: metadata câu hỏi không hợp lệ.`,
  );
  validateVisualSpec(question.visual_spec, question.code);
  const expectedAnswer = deriveExpectedAnswer(question);
  const solution = solutionByQuestion.get(question.code);
  assertCondition(solution, `${question.code}: thiếu solution.`);
  assertCondition(
    Array.isArray(solution.solution_steps) &&
      solution.solution_steps.length >= 2 &&
      solution.solution_steps.every((step) => isSafeText(step, 12, 260)) &&
      isSafeText(solution.explanation, 12, 260) &&
      isSafeText(solution.hint, 8, 180),
    `${question.code}: lời giải chưa đủ hai bước thực chất.`,
  );

  if (question.question_type === "MULTIPLE_CHOICE") {
    assertCondition(
      question.options &&
        hasExactKeys(question.options, ["A", "B", "C", "D"]) &&
        Object.values(question.options).every((option) =>
          isSafeText(option, 1, 110),
        ) &&
        new Set(Object.values(question.options)).size === 4 &&
        /^[A-D]$/.test(solution.correct_answer) &&
        question.options[solution.correct_answer] === expectedAnswer,
      `${question.code}: MCQ không có đúng một đáp án khớp visual.`,
    );
  } else {
    assertCondition(
      question.options === null &&
        Number.isInteger(expectedAnswer) &&
        isIntegerInRange(expectedAnswer, 0, 10) &&
        solution.correct_answer === String(expectedAnswer),
      `${question.code}: NUMBER_INPUT không khớp visual hoặc ngoài 0–10.`,
    );
  }
}

assertCondition(
  questions.every(
    (question, index) => question.display_order === index + 1,
  ),
  "display_order câu hỏi phải liên tục từ 1 đến 24.",
);
assertCondition(
  solutions.every((solution) => solutionByQuestion.has(solution.question_id)) &&
    new Set(solutions.map((solution) => solution.question_id)).size === 24,
  "Solution bị trùng hoặc không khớp question.",
);

const learnerFacingText = [
  ...lesson.sections.flatMap((section) => [
    section.title,
    ...section.paragraphs,
  ]),
  ...lesson.worked_examples.flatMap((example) => [
    example.title,
    ...example.steps,
    example.answer,
  ]),
  ...questions.flatMap((question) => [
    question.prompt,
    ...Object.values(question.options ?? {}),
    question.visual_spec.description,
  ]),
].join(" ");
assertCondition(
  !/(?:tiền Việt Nam|diện tích|thể tích|công thức|khai triển|khối ẩn|bị che khuất|phối cảnh đánh lừa)/i.test(
    learnerFacingText,
  ),
  "Nội dung vượt phạm vi hoặc dùng khối bị che khuất.",
);

assertCondition(
  /^begin;\s/.test(source) &&
    /\scommit;\s*$/.test(source) &&
    (source.match(/\bbegin;/g) ?? []).length === 1 &&
    (source.match(/\bcommit;/g) ?? []).length === 1,
  "Migration phải có đúng một BEGIN và COMMIT.",
);
assertCondition(
  source.includes("'grade-1-cube-and-cuboid'") &&
    source.includes("'grade-1-basic-geometry-and-position'") &&
    source.includes("display_order = 13") &&
    source.includes("private.is_valid_solid_visual_spec") &&
    source.includes("prerequisite_unit_slug") &&
    source.includes("start_or_resume_practice") &&
    !/create or replace function public[.]start_or_resume_practice/i.test(
      source,
    ),
  "Migration thiếu unit, prerequisite hoặc đã replace RPC generic không cần thiết.",
);
assertCondition(
  !/grant\s+select\s+on\s+(?:table\s+)?public[.]question_solutions/i.test(
    source,
  ) &&
    !/grant\s+(?:insert|update|delete)[\s\S]*public[.](?:practice_attempts|practice_answers)/i.test(
      source,
    ) &&
    !/service[_-]?role/i.test(source),
  "Migration mở quyền practice hoặc chứa service-role.",
);

console.log(
  "Grade 1 cube/cuboid validation passed: 24 questions, 16 MCQ, 8 number inputs, 4 skills × 6, no hidden blocks, and one typed SOLID_SCENE contract.",
);
