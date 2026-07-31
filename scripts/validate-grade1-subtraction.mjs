import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/0019_grade1_subtraction_within_10.sql",
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

const questions = readTaggedJson("questions");
const solutions = readTaggedJson("solutions");
const expectedSkills = [
  "SUBTRACTION_MEANING",
  "SUBTRACTION_CALCULATION",
  "ADDITION_SUBTRACTION_RELATION",
  "ONE_STEP_SUBTRACTION_WORD_PROBLEM",
];

assertCondition(
  source.includes(
    "'grade-1-subtraction-within-10',\n  1,\n  'Phép trừ trong phạm vi 10'",
  ),
  "Thiếu unit phép trừ lớp 1.",
);
assertCondition(
  source.includes(
    "3,\n  'grade-1-addition-within-10'\n);",
  ),
  "Prerequisite phép trừ phải là bài phép cộng.",
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
  "Nội dung câu hỏi bị trùng.",
);
assertCondition(
  new Set(solutions.map((solution) => solution.question_id)).size === 24,
  "Lời giải bị trùng question_id.",
);

const solutionByQuestion = new Map(
  solutions.map((solution) => [solution.question_id, solution]),
);

for (const skill of expectedSkills) {
  assertCondition(
    questions.filter((question) => question.skill_code === skill).length ===
      6,
    `Kỹ năng ${skill} phải có đúng 6 câu.`,
  );
}

for (const question of questions) {
  assertCondition(
    !Object.hasOwn(question, "correct_answer") &&
      !Object.hasOwn(question, "solution_steps") &&
      !Object.hasOwn(question, "explanation") &&
      !Object.hasOwn(question, "hint"),
    `Questions đang chứa đáp án hoặc lời giải của ${question.code}.`,
  );

  const solution = solutionByQuestion.get(question.code);
  assertCondition(Boolean(solution), `Thiếu lời giải cho ${question.code}.`);
  assertCondition(
    Array.isArray(solution.solution_steps) &&
      solution.solution_steps.length >= 2 &&
      solution.solution_steps.every(
        (step) => typeof step === "string" && step.trim().length > 0,
      ),
    `Lời giải ${question.code} cần ít nhất hai bước.`,
  );
  assertCondition(
    typeof solution.explanation === "string" &&
      solution.explanation.trim().length > 0 &&
      typeof solution.hint === "string" &&
      solution.hint.trim().length > 0,
    `Lời giải ${question.code} thiếu giải thích hoặc gợi ý.`,
  );
  assertCondition(
    !/(placeholder|todo|tbd)/i.test(
      `${question.prompt} ${solution.explanation} ${solution.hint}`,
    ),
    `Còn placeholder trong ${question.code}.`,
  );
  assertCondition(
    !/(sau đó|tiếp theo).*(thêm|bớt|lấy|cho|ăn|bay)/i.test(
      question.prompt,
    ),
    `${question.code} có dấu hiệu là bài toán hai bước.`,
  );

  if (question.question_type === "MULTIPLE_CHOICE") {
    const keys = Object.keys(question.options ?? {}).sort();
    assertCondition(
      keys.join(",") === "A,B,C,D",
      `${question.code} phải có đúng lựa chọn A–D.`,
    );
    assertCondition(
      keys.every(
        (key) =>
          typeof question.options[key] === "string" &&
          question.options[key].trim().length > 0,
      ),
      `${question.code} có lựa chọn rỗng.`,
    );
    assertCondition(
      keys.includes(solution.correct_answer),
      `Đáp án ${question.code} không thuộc A–D.`,
    );
  } else {
    assertCondition(
      question.options === null,
      `${question.code} nhập số không được có options.`,
    );
    assertCondition(
      /^([0-9]|10)$/.test(solution.correct_answer),
      `Đáp án số của ${question.code} ngoài phạm vi 0–10.`,
    );
  }

  const visibleMath = [
    question.prompt,
    ...Object.values(question.options ?? {}),
    ...solution.solution_steps,
    solution.explanation,
  ].join(" ");

  for (const match of visibleMath.matchAll(/(\d+)\s*-\s*(\d+)/g)) {
    const minuend = Number(match[1]);
    const subtrahend = Number(match[2]);
    assertCondition(
      minuend >= 0 &&
        minuend <= 10 &&
        subtrahend >= 0 &&
        subtrahend <= minuend,
      `${question.code} chứa phép trừ âm hoặc vượt phạm vi 10.`,
    );
  }

  for (const match of visibleMath.matchAll(/\d+/g)) {
    assertCondition(
      Number(match[0]) <= 10,
      `${question.code} chứa số lớn hơn 10.`,
    );
  }
}

assertCondition(
  [...solutionByQuestion.keys()].every((code) =>
    questions.some((question) => question.code === code),
  ),
  "Có lời giải không thuộc bộ câu hỏi.",
);

console.log(
  "Grade 1 subtraction content validation passed: 24 questions, 16 MCQ, 8 number input, 4×6 skills.",
);
