import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/0026_grade1_subtraction_within_100_no_borrow.sql",
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

function isNoBorrowSubtraction(minuend, subtrahend) {
  return (
    Number.isInteger(minuend) &&
    Number.isInteger(subtrahend) &&
    minuend >= 0 &&
    subtrahend >= 0 &&
    minuend <= 100 &&
    subtrahend <= 100 &&
    minuend >= subtrahend &&
    minuend - subtrahend <= 100 &&
    minuend % 10 >= subtrahend % 10
  );
}

function expectedResponse(question) {
  if (question.answer_role === "DIFFERENCE") {
    return question.minuend - question.subtrahend;
  }
  if (question.answer_role === "MINUEND") {
    return question.minuend;
  }
  if (question.answer_role === "SUBTRAHEND") {
    return question.subtrahend;
  }
  return null;
}

function readFirstInteger(value) {
  const match = String(value).match(/\d+/);
  return match ? Number(match[0]) : null;
}

const lesson = readTaggedJson("lesson");
const questions = readTaggedJson("questions");
const solutions = readTaggedJson("solutions");
const expectedSkills = [
  "SUBTRACT_TENS_WITHIN_100",
  "SUBTRACT_TWO_DIGIT_NO_BORROW",
  "MISSING_NUMBER_SUBTRACTION_100",
  "SUBTRACTION_WORD_PROBLEM_100",
];

assertCondition(
  source.includes(
    "'grade-1-subtraction-within-100-no-borrow',\n  1,\n  'Phép trừ trong phạm vi 100 không mượn'",
  ),
  "Thiếu unit Phép trừ trong phạm vi 100 không mượn.",
);
assertCondition(
  source.includes(
    "9,\n  'grade-1-addition-within-100-no-carry'\n)",
  ),
  "Prerequisite hoặc display_order của unit không đúng.",
);
assertCondition(
  /^begin;[\s\S]*do \$validation\$[\s\S]*commit;\s*$/i.test(source),
  "Migration phải atomic và validation phải đứng trước COMMIT.",
);
assertCondition(
  Array.isArray(lesson.sections) && lesson.sections.length === 6,
  "Bài học cần đúng 6 phần lý thuyết.",
);
assertCondition(
  Array.isArray(lesson.worked_examples) &&
    lesson.worked_examples.length === 2,
  "Bài học cần đúng 2 ví dụ từng bước.",
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
  "Mỗi ví dụ phải có ít nhất hai bước có ý nghĩa.",
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
    Number.isInteger(question.minuend) &&
      Number.isInteger(question.subtrahend) &&
      Number.isInteger(question.expected_answer),
    `${question.code} thiếu metadata số học có cấu trúc.`,
  );
  assertCondition(
    isNoBorrowSubtraction(question.minuend, question.subtrahend),
    `${question.code} có phép trừ mượn, âm hoặc vượt phạm vi: ${question.minuend} − ${question.subtrahend}.`,
  );
  assertCondition(
    expectedResponse(question) === question.expected_answer,
    `${question.code} có expected_answer không khớp vai trò cần trả lời.`,
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
    !/(hai bước|sau đó.+(?:cộng|trừ|bớt|thêm))/i.test(question.prompt),
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
    assertCondition(
      readFirstInteger(question.options[solution.correct_answer]) ===
        question.expected_answer,
      `Đáp án trắc nghiệm của ${question.code} không khớp phép tính.`,
    );
  } else {
    assertCondition(
      question.question_type === "NUMBER_INPUT" &&
        question.options === null,
      `${question.code} nhập số không được có options.`,
    );
    assertCondition(
      /^(0|[1-9][0-9]?|100)$/.test(solution.correct_answer),
      `Đáp án số của ${question.code} ngoài phạm vi 0–100.`,
    );
    assertCondition(
      Number(solution.correct_answer) === question.expected_answer,
      `Đáp án nhập số của ${question.code} không khớp phép tính.`,
    );
  }

  const visibleContent = [
    question.prompt,
    ...Object.values(question.options ?? {}),
    ...solution.solution_steps,
    solution.explanation,
    solution.hint,
  ].join(" ");

  assertCondition(
    !/\d\s*[+×÷*/]\s*\d/.test(visibleContent),
    `${question.code} chứa phép toán ngoài phép trừ.`,
  );

  const subtractionFacts = [
    ...visibleContent.matchAll(
      /(\d+)\s*[-−]\s*(\d+)\s*=\s*(\d+)/g,
    ),
  ].map((match) => [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ]);
  assertCondition(
    subtractionFacts.length > 0,
    `${question.code} không có phép trừ đầy đủ để kiểm chứng.`,
  );
  for (const [minuend, subtrahend, difference] of subtractionFacts) {
    assertCondition(
      isNoBorrowSubtraction(minuend, subtrahend) &&
        minuend - subtrahend === difference,
      `${question.code} có phép trừ sai, cần mượn hoặc vượt 100: ${minuend} − ${subtrahend} = ${difference}.`,
    );
  }
}

assertCondition(
  [...solutionByQuestion.keys()].every((code) =>
    questions.some((question) => question.code === code),
  ),
  "Có lời giải không thuộc bộ câu hỏi.",
);

const questionInsert = source.match(
  /insert into public\.questions\s*\(([\s\S]*?)\)\s*select/i,
);
assertCondition(Boolean(questionInsert), "Không tìm thấy INSERT questions.");
assertCondition(
  !/(minuend|subtrahend|answer_role|expected_answer)/.test(
    questionInsert[1],
  ),
  "Metadata kiểm chứng không được ghi vào bảng questions.",
);
assertCondition(
  /v_submit_definition !~ 'not between 0 and 100'/.test(source),
  "Migration chưa xác minh boundary NUMBER_INPUT 0–100.",
);
assertCondition(
  !/jsonb_object_length/.test(source),
  "Không được dùng hàm jsonb_object_length không tương thích.",
);
assertCondition(
  !/grant\s+select\s+on\s+(table\s+)?public\.question_solutions/i.test(
    source,
  ),
  "Migration không được cấp SELECT trực tiếp vào lời giải.",
);
assertCondition(
  !/grant\s+(insert|update|delete)\s+on\s+(table\s+)?public\.(questions|question_solutions|practice_attempts|practice_answers)/i.test(
    source,
  ),
  "Migration không được cấp direct mutation cho browser.",
);

console.log(
  "Grade 1 no-borrow subtraction-to-100 validation passed: 6 sections, 2 examples, 24 questions, 16 MCQ, 8 number input, 4×6 skills.",
);
