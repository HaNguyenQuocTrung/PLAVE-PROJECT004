import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/0004_grade1_numbers_to_10.sql",
);
const source = readFileSync(migrationPath, "utf8");

function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

const questionStart = source.indexOf("insert into public.questions (");
const solutionStart = source.indexOf(
  "insert into public.question_solutions (",
);
const validationStart = source.indexOf("do $content_validation$");

assertCondition(
  questionStart >= 0 &&
    solutionStart > questionStart &&
    validationStart > solutionStart,
  "Không xác định được phạm vi seed bài nền tảng.",
);

const questionBlock = source.slice(questionStart, solutionStart);
const solutionBlock = source.slice(solutionStart, validationStart);
const questionCodes = [
  ...questionBlock.matchAll(/'g1-n10-q(\d{2})'/g),
].map((match) => match[0]);
const solutionCodes = [
  ...solutionBlock.matchAll(/'g1-n10-q(\d{2})'/g),
].map((match) => match[0]);
const expectedSkills = [
  "COUNT_RECOGNIZE",
  "READ_WRITE_MATCH",
  "SEQUENCE_COMPARE_ORDER",
  "COMPOSE_DECOMPOSE",
];

assertCondition(
  questionCodes.length === 24 && new Set(questionCodes).size === 24,
  "Bài nền tảng phải có đúng 24 question code.",
);
assertCondition(
  solutionCodes.length === 24 && new Set(solutionCodes).size === 24,
  "Bài nền tảng phải có đúng 24 solution.",
);
assertCondition(
  (questionBlock.match(/'MULTIPLE_CHOICE'/g) ?? []).length === 16,
  "Bài nền tảng phải có đúng 16 câu trắc nghiệm.",
);
assertCondition(
  (questionBlock.match(/'NUMBER_INPUT'/g) ?? []).length === 8,
  "Bài nền tảng phải có đúng 8 câu nhập số.",
);

for (const skill of expectedSkills) {
  assertCondition(
    (questionBlock.match(new RegExp(`'${skill}'`, "g")) ?? []).length === 6,
    `Kỹ năng nền tảng ${skill} phải có đúng 6 câu.`,
  );
}

const optionPayloads = [
  ...questionBlock.matchAll(/'(\{"A":.*?\})'::jsonb/g),
].map((match) => JSON.parse(match[1]));
assertCondition(
  optionPayloads.length === 16,
  "Mọi câu trắc nghiệm nền tảng phải có options JSON.",
);
for (const options of optionPayloads) {
  const keys = Object.keys(options).sort();
  assertCondition(
    keys.join(",") === "A,B,C,D" &&
      keys.every(
        (key) =>
          typeof options[key] === "string" &&
          options[key].trim().length > 0,
      ),
    "Options bài nền tảng phải có đúng A–D và không được rỗng.",
  );
}

assertCondition(
  /v_question_count <> 24/.test(source) &&
    /v_solution_count <> 24/.test(source) &&
    /v_mcq_count <> 16/.test(source) &&
    /v_number_count <> 8/.test(source),
  "Migration nền tảng thiếu validation count.",
);

console.log(
  "Grade 1 foundation content validation passed: 24 questions, 16 MCQ, 8 number input, 4×6 skills.",
);
