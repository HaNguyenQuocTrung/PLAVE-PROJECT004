import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/0027_grade1_basic_geometry_and_position.sql",
);
const source = readFileSync(migrationPath, "utf8");

function readTaggedJson(tag) {
  const marker = `$${tag}$`;
  const start = source.indexOf(marker);
  const end = source.indexOf(marker, start + marker.length);
  if (start < 0 || end < 0) {
    throw new Error(`Không tìm thấy payload ${tag}.`);
  }
  return JSON.parse(source.slice(start + marker.length, end));
}

function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function hasExactKeys(value, allowedKeys) {
  const actual = Object.keys(value).sort();
  const expected = [...allowedKeys].sort();
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

const shapes = new Set(["CIRCLE", "TRIANGLE", "SQUARE", "RECTANGLE"]);
const shapeNames = {
  CIRCLE: "Hình tròn",
  TRIANGLE: "Hình tam giác",
  SQUARE: "Hình vuông",
  RECTANGLE: "Hình chữ nhật",
};
const skillCodes = [
  "RECOGNIZE_BASIC_SHAPES",
  "COMPARE_AND_SORT_SHAPES",
  "POSITION_RELATIONS",
  "COUNT_SHAPES_IN_PICTURE",
];

function validateVisualSpec(spec, questionCode) {
  assertCondition(
    spec &&
      hasExactKeys(spec, ["description", "items", "kind"]) &&
      spec.kind === "SHAPE_SCENE",
    `${questionCode}: visual_spec phải dùng đúng contract SHAPE_SCENE.`,
  );
  assertCondition(
    isSafeText(spec.description, 12, 240),
    `${questionCode}: mô tả visual không an toàn hoặc không hợp lệ.`,
  );
  assertCondition(
    Array.isArray(spec.items) &&
      spec.items.length >= 1 &&
      spec.items.length <= 8,
    `${questionCode}: visual cần từ 1 đến 8 hình.`,
  );

  const ids = new Set();
  for (const item of spec.items) {
    assertCondition(
      item &&
        hasExactKeys(item, [
          "height",
          "id",
          "label",
          "shape",
          "width",
          "x",
          "y",
        ]),
      `${questionCode}: visual item chứa field ngoài allowlist.`,
    );
    assertCondition(
      typeof item.id === "string" &&
        /^[a-z][a-z0-9-]{0,19}$/.test(item.id) &&
        !ids.has(item.id),
      `${questionCode}: id hình không hợp lệ hoặc bị trùng.`,
    );
    ids.add(item.id);
    assertCondition(
      shapes.has(item.shape),
      `${questionCode}: loại hình không thuộc allowlist.`,
    );
    assertCondition(
      [item.x, item.y, item.width, item.height].every(Number.isInteger) &&
        item.x >= 0 &&
        item.x <= 88 &&
        item.y >= 0 &&
        item.y <= 88 &&
        item.width >= 12 &&
        item.width <= 32 &&
        item.height >= 12 &&
        item.height <= 32 &&
        item.x + item.width <= 100 &&
        item.y + item.height <= 100,
      `${questionCode}: tọa độ hoặc kích thước hình ngoài giới hạn.`,
    );
    assertCondition(
      isSafeText(item.label, 1, 20),
      `${questionCode}: nhãn hình không an toàn hoặc bị thiếu.`,
    );
    if (["CIRCLE", "TRIANGLE", "SQUARE"].includes(item.shape)) {
      assertCondition(
        item.width === item.height,
        `${questionCode}: hình ${item.shape} phải giữ đúng tỉ lệ.`,
      );
    } else {
      assertCondition(
        item.width !== item.height,
        `${questionCode}: hình chữ nhật phải khác hình vuông.`,
      );
    }
  }
}

function itemById(question, id) {
  return question.visual_spec.items.find((item) => item.id === id);
}

function centerX(item) {
  return item.x + item.width / 2;
}

function centerY(item) {
  return item.y + item.height / 2;
}

function overlaps(first, second) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

function deriveExpectedAnswer(question) {
  const check = question.check;
  assertCondition(
    check && typeof check.kind === "string",
    `${question.code}: thiếu kiểm tra ngữ nghĩa visual.`,
  );

  if (check.kind === "ITEM_SHAPE") {
    const target = itemById(question, check.target);
    assertCondition(
      target?.shape === check.shape,
      `${question.code}: hình đích không khớp dữ liệu kiểm tra.`,
    );
    return shapeNames[check.shape];
  } else if (check.kind === "COUNT_SHAPE") {
    const count = question.visual_spec.items.filter(
      (item) => item.shape === check.shape,
    ).length;
    assertCondition(
      count === check.count,
      `${question.code}: đáp án đếm hình không khớp visual.`,
    );
    return count;
  } else if (check.kind === "COUNT_ALL") {
    assertCondition(
      question.visual_spec.items.length === check.count,
      `${question.code}: tổng số hình không khớp visual.`,
    );
    return check.count;
  } else if (check.kind === "PAIR_SHAPE") {
    assertCondition(
      Array.isArray(check.targets) &&
        check.targets.length === 2 &&
        check.targets.every(
          (id) => itemById(question, id)?.shape === check.shape,
        ) &&
        question.visual_spec.items.filter(
          (item) => item.shape === check.shape,
        ).length === 2,
      `${question.code}: cặp hình cùng loại không xác định duy nhất.`,
    );
    const first = itemById(question, check.targets[0]);
    const second = itemById(question, check.targets[1]);
    return `Hình ${first.label} và hình ${second.label}`;
  } else if (check.kind === "ODD_SHAPE") {
    const target = itemById(question, check.target);
    const others = question.visual_spec.items.filter(
      (item) => item.id !== check.target,
    );
    assertCondition(
      target &&
        others.length === 3 &&
        new Set(others.map((item) => item.shape)).size === 1 &&
        others[0].shape !== target.shape,
      `${question.code}: hình khác loại không xác định duy nhất.`,
    );
    return `Hình ${target.label}`;
  } else if (check.kind === "RELATION") {
    const target = itemById(question, check.target);
    const reference = itemById(question, check.reference);
    assertCondition(
      target && reference,
      `${question.code}: thiếu hình trong quan hệ vị trí.`,
    );
    if (check.relation === "LEFT") {
      assertCondition(
        centerX(target) < centerX(reference),
        `${question.code}: quan hệ trái không khớp tọa độ.`,
      );
      return "Bên trái";
    } else if (check.relation === "ABOVE") {
      assertCondition(
        centerY(target) < centerY(reference),
        `${question.code}: quan hệ trên không khớp tọa độ.`,
      );
      return "Phía trên";
    } else if (check.relation === "BELOW") {
      assertCondition(
        centerY(target) > centerY(reference),
        `${question.code}: quan hệ dưới không khớp tọa độ.`,
      );
      return "Phía dưới";
    } else {
      throw new Error(`${question.code}: quan hệ vị trí ngoài allowlist.`);
    }
  } else if (check.kind === "BETWEEN") {
    const target = itemById(question, check.target);
    const left = itemById(question, check.left);
    const right = itemById(question, check.right);
    assertCondition(
      target &&
        left &&
        right &&
        centerX(left) < centerX(target) &&
        centerX(target) < centerX(right),
      `${question.code}: quan hệ ở giữa không khớp tọa độ.`,
    );
    return "Ở giữa";
  } else if (check.kind === "FRONT") {
    const target = itemById(question, check.target);
    const reference = itemById(question, check.reference);
    const targetIndex = question.visual_spec.items.findIndex(
      (item) => item.id === check.target,
    );
    const referenceIndex = question.visual_spec.items.findIndex(
      (item) => item.id === check.reference,
    );
    assertCondition(
      target &&
        reference &&
        targetIndex > referenceIndex &&
        overlaps(target, reference),
      `${question.code}: quan hệ trước/sau không khớp thứ tự vẽ.`,
    );
    return `${shapeNames[target.shape]} ${target.label}`;
  } else {
    throw new Error(`${question.code}: loại kiểm tra visual ngoài allowlist.`);
  }

  return question.expected_answer;
}

const lesson = readTaggedJson("lesson");
const questions = readTaggedJson("questions");
const solutions = readTaggedJson("solutions");

assertCondition(
  /^begin;[\s\S]*do \$validation\$[\s\S]*commit;\s*$/i.test(source),
  "Migration phải atomic và có validation trước COMMIT.",
);
assertCondition(
  source.includes("'grade-1-basic-geometry-and-position'") &&
    source.includes("'Hình học và vị trí cơ bản'"),
  "Thiếu unit Hình học và vị trí cơ bản.",
);
assertCondition(
  source.includes(
    "10,\n  'grade-1-subtraction-within-100-no-borrow'\n)",
  ),
  "Prerequisite hoặc display_order không đúng.",
);
assertCondition(
  Array.isArray(lesson.sections) && lesson.sections.length === 6,
  "Bài học phải có đúng 6 phần.",
);
assertCondition(
  Array.isArray(lesson.worked_examples) &&
    lesson.worked_examples.length === 2,
  "Bài học phải có đúng 2 ví dụ.",
);
assertCondition(
  lesson.worked_examples.every(
    (example) =>
      Array.isArray(example.steps) &&
      example.steps.length >= 2 &&
      example.steps.every(
        (step) => typeof step === "string" && step.trim().length > 0,
      ),
  ),
  "Mỗi ví dụ cần ít nhất hai bước.",
);

assertCondition(questions.length === 24, "Cần đúng 24 câu hỏi.");
assertCondition(solutions.length === 24, "Cần đúng 24 lời giải.");
assertCondition(
  questions.filter(
    (question) => question.question_type === "MULTIPLE_CHOICE",
  ).length === 16,
  "Cần đúng 16 câu trắc nghiệm.",
);
assertCondition(
  questions.filter(
    (question) => question.question_type === "NUMBER_INPUT",
  ).length === 8,
  "Cần đúng 8 câu nhập số.",
);
assertCondition(
  new Set(questions.map((question) => question.code)).size === 24,
  "Mã câu hỏi bị trùng.",
);
assertCondition(
  new Set(questions.map((question) => question.prompt)).size === 24,
  "Prompt câu hỏi bị trùng.",
);

for (const skillCode of skillCodes) {
  assertCondition(
    questions.filter((question) => question.skill_code === skillCode)
      .length === 6,
    `${skillCode} phải có đúng 6 câu.`,
  );
}

const solutionByQuestion = new Map(
  solutions.map((solution) => [solution.question_id, solution]),
);
assertCondition(
  solutionByQuestion.size === 24,
  "Solution question_id bị trùng.",
);

for (const question of questions) {
  assertCondition(
    typeof question.code === "string" &&
      /^g1-geo-q\d{2}$/.test(question.code),
    "Question code không đúng convention.",
  );
  assertCondition(
    typeof question.prompt === "string" &&
      question.prompt === question.prompt.trim() &&
      question.prompt.length >= 12,
    `${question.code}: prompt không hợp lệ.`,
  );
  assertCondition(
    !/(?:màu|đỏ|xanh|vàng|tím|cam)/i.test(question.prompt),
    `${question.code}: câu hỏi không được dựa vào màu sắc.`,
  );
  validateVisualSpec(question.visual_spec, question.code);

  const solution = solutionByQuestion.get(question.code);
  assertCondition(solution, `${question.code}: thiếu lời giải.`);
  assertCondition(
    Array.isArray(solution.solution_steps) &&
      solution.solution_steps.length >= 2 &&
      solution.solution_steps.every(
        (step) => typeof step === "string" && step.trim().length > 0,
      ),
    `${question.code}: lời giải cần ít nhất hai bước.`,
  );

  const derivedExpected = deriveExpectedAnswer(question);
  if (question.question_type === "MULTIPLE_CHOICE") {
    assertCondition(
      question.options &&
        hasExactKeys(question.options, ["A", "B", "C", "D"]) &&
        Object.values(question.options).every(
          (option) => typeof option === "string" && option.trim().length > 0,
        ) &&
        new Set(Object.values(question.options)).size === 4,
      `${question.code}: MCQ phải có đúng A–D và không trùng lựa chọn.`,
    );
    assertCondition(
      /^[A-D]$/.test(solution.correct_answer) &&
        question.options[solution.correct_answer] ===
          String(derivedExpected),
      `${question.code}: đáp án MCQ không khớp visual.`,
    );
  } else {
    assertCondition(
      question.question_type === "NUMBER_INPUT" &&
        question.options === null &&
        /bao nhiêu/i.test(question.prompt) &&
        ["COUNT_SHAPE", "COUNT_ALL"].includes(question.check.kind),
      `${question.code}: NUMBER_INPUT chỉ được dùng để đếm hình.`,
    );
    const answer = Number(solution.correct_answer);
    assertCondition(
      Number.isInteger(answer) &&
        answer >= 0 &&
        answer <= 8 &&
        answer === derivedExpected &&
        answer === question.expected_answer,
      `${question.code}: đáp án nhập số không khớp visual.`,
    );
  }
}

assertCondition(
  !/(?:<script|<svg|onerror\s*=|javascript:|data:text\/html|https?:\/\/)/i.test(
    JSON.stringify(questions.map((question) => question.visual_spec)),
  ),
  "visual_spec chứa HTML, script, SVG string hoặc URL ngoài.",
);
assertCondition(
  !/grant\s+(?:select|insert|update|delete)[\s\S]*question_solutions/i.test(
    source,
  ),
  "Migration không được mở direct table access tới lời giải.",
);
assertCondition(
  !/jsonb_object_length/i.test(source),
  "Không dùng jsonb_object_length không tương thích.",
);
assertCondition(
  /add constraint questions_visual_spec_check[\s\S]*visual_spec is null[\s\S]*private\.is_valid_practice_visual_spec\(visual_spec\)/i.test(
    source,
  ),
  "Thiếu database CHECK cho visual_spec.",
);
assertCondition(
  source.includes("'visual_spec', question.visual_spec"),
  "Review RPC phải trả visual_spec sau khi câu đã được chấm.",
);
assertCondition(
  !/visual_spec::text[\s\S]{0,160}(?:answer|correct|solution|html|script)/i.test(
    source,
  ),
  "Không được quét substring trên toàn JSON vì field description chứa chuỗi script.",
);

console.log(
  "PASS Sprint 5I content: 1 unit, 6 sections, 2 examples, 24 questions, 16 MCQ, 8 NUMBER_INPUT, 4 skills × 6, 24 typed visuals and 24 solutions.",
);
