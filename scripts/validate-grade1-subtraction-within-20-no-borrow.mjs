import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/0023_grade1_subtraction_within_20_no_borrow.sql",
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

function isNoBorrowSubtraction(left, right) {
  return (
    Number.isInteger(left) &&
    Number.isInteger(right) &&
    left >= 0 &&
    left <= 20 &&
    right >= 0 &&
    right <= left &&
    left - right <= 20 &&
    left % 10 >= right % 10
  );
}

const questions = readTaggedJson("questions");
const solutions = readTaggedJson("solutions");
const expectedSkills = [
  "SUBTRACTION_MEANING",
  "SUBTRACTION_WITHIN_20_NO_BORROW",
  "MISSING_NUMBER_SUBTRACTION",
  "SUBTRACTION_WORD_PROBLEM",
];

assertCondition(
  source.includes(
    "'grade-1-subtraction-within-20-no-borrow',\n  1,\n  'Phép trừ trong phạm vi 20 không mượn'",
  ),
  "Thiếu unit phép trừ trong phạm vi 20 không mượn.",
);
assertCondition(
  source.includes(
    "6,\n  'grade-1-addition-within-20-no-carry'\n)",
  ),
  "Prerequisite hoặc display_order của unit không đúng.",
);
assertCondition(
  /^begin;[\s\S]*do \$validation\$[\s\S]*commit;\s*$/i.test(source),
  "Migration phải atomic và validation phải đứng trước COMMIT.",
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
assertCondition(
  questions.every((question) =>
    expectedSkills.includes(question.skill_code),
  ),
  "Bộ câu hỏi chứa skill ngoài bốn nhóm đã duyệt.",
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
    `Lời giải ${question.code} cần ít nhất hai bước có ý nghĩa.`,
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
    !/(sau đó|tiếp theo).*(bớt|lấy|cho|ăn|bay|mượn)/i.test(
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
      question.question_type === "NUMBER_INPUT" &&
        question.options === null,
      `${question.code} nhập số không được có options.`,
    );
    assertCondition(
      /^(0|[1-9]|1[0-9]|20)$/.test(solution.correct_answer),
      `Đáp án số của ${question.code} ngoài phạm vi 0–20.`,
    );
  }

  const visibleContent = [
    question.prompt,
    ...Object.values(question.options ?? {}),
    ...solution.solution_steps,
    solution.explanation,
    solution.hint,
  ].join(" ");

  for (const match of visibleContent.matchAll(/\d+/g)) {
    assertCondition(
      Number(match[0]) <= 20,
      `${question.code} chứa số lớn hơn 20.`,
    );
  }
  assertCondition(
    !/\d\s*[×÷*/]\s*\d/.test(visibleContent),
    `${question.code} chứa phép nhân hoặc chia.`,
  );

  const subtractionFacts = [
    ...visibleContent.matchAll(/(\d+)\s*[−-]\s*(\d+)/g),
  ].map((match) => [Number(match[1]), Number(match[2])]);
  assertCondition(
    subtractionFacts.length > 0,
    `${question.code} không có phép trừ kiểm chứng được.`,
  );
  for (const [left, right] of subtractionFacts) {
    assertCondition(
      isNoBorrowSubtraction(left, right),
      `${question.code} chứa phép trừ có mượn, âm hoặc vượt phạm vi 20: ${left} − ${right}.`,
    );
  }
}

assertCondition(
  [...solutionByQuestion.keys()].every((code) =>
    questions.some((question) => question.code === code),
  ),
  "Có lời giải không thuộc bộ câu hỏi.",
);
assertCondition(
  /v_normalized_answer::integer not between 0 and 20/.test(source),
  "RPC chấm bài chưa giới hạn NUMBER_INPUT trong phạm vi 0–20.",
);
assertCondition(
  !/grant\s+select\s+on\s+(table\s+)?public\.question_solutions/i.test(
    source,
  ),
  "Migration không được cấp SELECT trực tiếp vào lời giải.",
);

console.log(
  "Grade 1 no-borrow subtraction-to-20 validation passed: 24 questions, 16 MCQ, 8 number input, 4×6 skills.",
);
