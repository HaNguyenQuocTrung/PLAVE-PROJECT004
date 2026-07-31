import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function fail(message) {
  throw new Error(`Grade 1 release validation failed: ${message}`);
}

function assertCondition(condition, message) {
  if (!condition) fail(message);
}

const expectedUnits = [
  {
    migration: "0004_grade1_numbers_to_10.sql",
    slug: "grade-1-numbers-to-10",
    title: "Các số trong phạm vi 10",
    displayOrder: 1,
    prerequisite: null,
    skills: [
      "COUNT_RECOGNIZE",
      "READ_WRITE_MATCH",
      "SEQUENCE_COMPARE_ORDER",
      "COMPOSE_DECOMPOSE",
    ],
  },
  {
    migration: "0018_grade1_addition_within_10.sql",
    slug: "grade-1-addition-within-10",
    title: "Phép cộng trong phạm vi 10",
    displayOrder: 2,
    prerequisite: "grade-1-numbers-to-10",
    skills: [
      "ADDITION_MEANING",
      "ADDITION_CALCULATION",
      "NUMBER_BONDS",
      "ONE_STEP_WORD_PROBLEM",
    ],
  },
  {
    migration: "0019_grade1_subtraction_within_10.sql",
    slug: "grade-1-subtraction-within-10",
    title: "Phép trừ trong phạm vi 10",
    displayOrder: 3,
    prerequisite: "grade-1-addition-within-10",
    skills: [
      "SUBTRACTION_MEANING",
      "SUBTRACTION_CALCULATION",
      "ADDITION_SUBTRACTION_RELATION",
      "ONE_STEP_SUBTRACTION_WORD_PROBLEM",
    ],
  },
  {
    migration: "0020_grade1_numbers_to_20.sql",
    slug: "grade-1-numbers-to-20",
    title: "Các số trong phạm vi 20",
    displayOrder: 4,
    prerequisite: "grade-1-subtraction-within-10",
    skills: [
      "COUNT_READ_WRITE_TO_20",
      "SEQUENCE_TO_20",
      "COMPARE_ORDER_TO_20",
      "TENS_ONES_TO_20",
    ],
  },
  {
    migration: "0021_grade1_addition_within_20_no_carry.sql",
    slug: "grade-1-addition-within-20-no-carry",
    title: "Phép cộng trong phạm vi 20 không nhớ",
    displayOrder: 5,
    prerequisite: "grade-1-numbers-to-20",
    skills: [
      "ADD_TEN_AND_ONES",
      "ADD_TEEN_AND_ONES_NO_CARRY",
      "ADD_USING_TENS_ONES",
      "ONE_STEP_ADDITION_TO_20",
    ],
  },
  {
    migration: "0023_grade1_subtraction_within_20_no_borrow.sql",
    slug: "grade-1-subtraction-within-20-no-borrow",
    title: "Phép trừ trong phạm vi 20 không mượn",
    displayOrder: 6,
    prerequisite: "grade-1-addition-within-20-no-carry",
    skills: [
      "SUBTRACTION_MEANING",
      "SUBTRACTION_WITHIN_20_NO_BORROW",
      "MISSING_NUMBER_SUBTRACTION",
      "SUBTRACTION_WORD_PROBLEM",
    ],
  },
  {
    migration: "0024_grade1_numbers_to_100.sql",
    slug: "grade-1-numbers-to-100",
    title: "Các số trong phạm vi 100",
    displayOrder: 7,
    prerequisite: "grade-1-subtraction-within-20-no-borrow",
    skills: [
      "COUNT_RECOGNIZE_TO_100",
      "READ_WRITE_TO_100",
      "TENS_ONES_COMPOSE",
      "COMPARE_ORDER_TO_100",
    ],
  },
  {
    migration: "0025_grade1_addition_within_100_no_carry.sql",
    slug: "grade-1-addition-within-100-no-carry",
    title: "Phép cộng trong phạm vi 100 không nhớ",
    displayOrder: 8,
    prerequisite: "grade-1-numbers-to-100",
    skills: [
      "ADD_TENS_WITHIN_100",
      "ADD_TWO_DIGIT_NO_CARRY",
      "MISSING_NUMBER_ADDITION_100",
      "ADDITION_WORD_PROBLEM_100",
    ],
  },
  {
    migration: "0026_grade1_subtraction_within_100_no_borrow.sql",
    slug: "grade-1-subtraction-within-100-no-borrow",
    title: "Phép trừ trong phạm vi 100 không mượn",
    displayOrder: 9,
    prerequisite: "grade-1-addition-within-100-no-carry",
    skills: [
      "SUBTRACT_TENS_WITHIN_100",
      "SUBTRACT_TWO_DIGIT_NO_BORROW",
      "MISSING_NUMBER_SUBTRACTION_100",
      "SUBTRACTION_WORD_PROBLEM_100",
    ],
  },
  {
    migration: "0027_grade1_basic_geometry_and_position.sql",
    slug: "grade-1-basic-geometry-and-position",
    title: "Hình học và vị trí cơ bản",
    displayOrder: 10,
    prerequisite: "grade-1-subtraction-within-100-no-borrow",
    skills: [
      "RECOGNIZE_BASIC_SHAPES",
      "COMPARE_AND_SORT_SHAPES",
      "POSITION_RELATIONS",
      "COUNT_SHAPES_IN_PICTURE",
    ],
  },
  {
    migration: "0028_grade1_length_measurement.sql",
    slug: "grade-1-length-measurement",
    title: "Đo độ dài và so sánh độ dài",
    displayOrder: 11,
    prerequisite: "grade-1-basic-geometry-and-position",
    skills: [
      "COMPARE_LENGTHS",
      "ORDER_BY_LENGTH",
      "MEASURE_WITH_EQUAL_UNITS",
      "READ_SIMPLE_MEASUREMENT",
    ],
  },
  {
    migration: "0029_grade1_time_clock_calendar.sql",
    slug: "grade-1-time-clock-calendar",
    title: "Thời gian, đồng hồ và lịch",
    displayOrder: 12,
    prerequisite: "grade-1-length-measurement",
    skills: [
      "READ_WHOLE_HOURS",
      "ORDER_DAILY_EVENTS",
      "DAYS_OF_WEEK",
      "READ_SIMPLE_CALENDAR",
    ],
  },
  {
    migration: "0030_grade1_cube_and_cuboid.sql",
    slug: "grade-1-cube-and-cuboid",
    title: "Khối lập phương và khối hộp chữ nhật",
    displayOrder: 13,
    prerequisite: "grade-1-basic-geometry-and-position",
    skills: [
      "CUBE_RECOGNITION",
      "CUBOID_RECOGNITION",
      "REAL_OBJECT_CLASSIFICATION",
      "SIMPLE_BLOCK_COMPOSITION",
    ],
  },
];

assertCondition(expectedUnits.length === 13, "release catalog must have 13 units");
assertCondition(
  new Set(expectedUnits.map((unit) => unit.slug)).size === 13,
  "unit slugs must be unique",
);
assertCondition(
  new Set(expectedUnits.map((unit) => unit.displayOrder)).size === 13,
  "display orders must be unique",
);

const unitBySlug = new Map(expectedUnits.map((unit) => [unit.slug, unit]));
for (const unit of expectedUnits) {
  if (unit.prerequisite) {
    assertCondition(
      unitBySlug.has(unit.prerequisite),
      `${unit.slug} references a missing prerequisite`,
    );
    assertCondition(
      unit.prerequisite !== unit.slug,
      `${unit.slug} must not reference itself`,
    );
  }
}

function visitPrerequisites(slug, visiting, visited) {
  if (visited.has(slug)) return;
  if (visiting.has(slug)) fail(`prerequisite cycle detected at ${slug}`);
  visiting.add(slug);
  const prerequisite = unitBySlug.get(slug)?.prerequisite;
  if (prerequisite) visitPrerequisites(prerequisite, visiting, visited);
  visiting.delete(slug);
  visited.add(slug);
}

const visited = new Set();
for (const unit of expectedUnits) {
  visitPrerequisites(unit.slug, new Set(), visited);
}

const globalQuestionCodes = new Set();
const globalSolutionCodes = new Set();

function readTaggedJson(source, tag, migration) {
  const match = source.match(
    new RegExp(`\\$${tag}\\$(\\[[\\s\\S]*?\\])\\$${tag}\\$`),
  );
  assertCondition(match, `${migration}: missing $${tag}$ payload`);
  return JSON.parse(match[1]);
}

function readTaggedText(source, tag, migration) {
  const marker = `$${tag}$`;
  const start = source.indexOf(marker);
  const end = source.indexOf(marker, start + marker.length);
  assertCondition(
    start >= 0 && end > start,
    `${migration}: missing $${tag}$ payload`,
  );
  return source.slice(start + marker.length, end);
}

function validateTaggedContent(source, unit) {
  const questions = readTaggedJson(source, "questions", unit.migration);
  const solutions = readTaggedJson(source, "solutions", unit.migration);
  assertCondition(questions.length === 24, `${unit.slug}: expected 24 questions`);
  assertCondition(solutions.length === 24, `${unit.slug}: expected 24 solutions`);
  assertCondition(
    questions.filter((question) => question.question_type === "MULTIPLE_CHOICE")
      .length === 16,
    `${unit.slug}: expected 16 MCQ`,
  );
  assertCondition(
    questions.filter((question) => question.question_type === "NUMBER_INPUT")
      .length === 8,
    `${unit.slug}: expected 8 NUMBER_INPUT`,
  );
  assertCondition(
    new Set(questions.map((question) => question.code)).size === 24,
    `${unit.slug}: duplicate question code`,
  );
  assertCondition(
    new Set(questions.map((question) => question.prompt)).size === 24,
    `${unit.slug}: duplicate prompt`,
  );

  const solutionCodes = new Set(
    solutions.map((solution) => solution.question_id),
  );
  assertCondition(
    solutionCodes.size === 24,
    `${unit.slug}: duplicate solution or missing question solution`,
  );

  for (const skill of unit.skills) {
    assertCondition(
      questions.filter((question) => question.skill_code === skill).length ===
        6,
      `${unit.slug}: ${skill} must contain 6 questions`,
    );
  }

  for (const question of questions) {
    assertCondition(
      !globalQuestionCodes.has(question.code),
      `global duplicate question code ${question.code}`,
    );
    globalQuestionCodes.add(question.code);
    assertCondition(
      solutionCodes.has(question.code),
      `${question.code}: missing solution`,
    );
    if (question.question_type === "MULTIPLE_CHOICE") {
      assertCondition(
        question.options &&
          Object.keys(question.options).sort().join(",") === "A,B,C,D" &&
          Object.values(question.options).every(
            (option) =>
              typeof option === "string" && option.trim().length > 0,
          ),
        `${question.code}: MCQ must have non-empty A-D`,
      );
    } else {
      assertCondition(
        question.options === null,
        `${question.code}: NUMBER_INPUT must not have options`,
      );
    }
    if (question.visual_spec !== undefined && question.visual_spec !== null) {
      assertCondition(
        typeof question.visual_spec.description === "string" &&
          question.visual_spec.description.trim().length >= 12,
        `${question.code}: visual must have an accessible description`,
      );
    }
  }
  for (const solution of solutions) {
    assertCondition(
      !globalSolutionCodes.has(solution.question_id),
      `global duplicate solution ${solution.question_id}`,
    );
    globalSolutionCodes.add(solution.question_id);
    assertCondition(
      Array.isArray(solution.solution_steps) &&
        solution.solution_steps.length >= 2,
      `${solution.question_id}: solution must contain at least two steps`,
    );
  }
}

function validateFoundationContent(source, unit) {
  const questionStart = source.indexOf("insert into public.questions (");
  const solutionStart = source.indexOf(
    "insert into public.question_solutions (",
  );
  const validationStart = source.indexOf("do $content_validation$");
  assertCondition(
    questionStart >= 0 &&
      solutionStart > questionStart &&
      validationStart > solutionStart,
    `${unit.slug}: unable to locate foundation seed`,
  );
  const questionBlock = source.slice(questionStart, solutionStart);
  const solutionBlock = source.slice(solutionStart, validationStart);
  const questionCodes = [
    ...questionBlock.matchAll(/'g1-n10-q(\d{2})'/g),
  ].map((match) => `g1-n10-q${match[1]}`);
  const solutionCodes = [
    ...solutionBlock.matchAll(/'g1-n10-q(\d{2})'/g),
  ].map((match) => `g1-n10-q${match[1]}`);
  assertCondition(
    questionCodes.length === 24 && new Set(questionCodes).size === 24,
    `${unit.slug}: expected 24 foundation questions`,
  );
  assertCondition(
    solutionCodes.length === 24 && new Set(solutionCodes).size === 24,
    `${unit.slug}: expected 24 foundation solutions`,
  );
  assertCondition(
    (questionBlock.match(/'MULTIPLE_CHOICE'/g) ?? []).length === 16,
    `${unit.slug}: expected 16 foundation MCQ`,
  );
  assertCondition(
    (questionBlock.match(/'NUMBER_INPUT'/g) ?? []).length === 8,
    `${unit.slug}: expected 8 foundation NUMBER_INPUT`,
  );
  for (const skill of unit.skills) {
    assertCondition(
      (questionBlock.match(new RegExp(`'${skill}'`, "g")) ?? []).length === 6,
      `${unit.slug}: ${skill} must contain 6 questions`,
    );
  }
  for (const code of questionCodes) {
    assertCondition(
      !globalQuestionCodes.has(code),
      `global duplicate question code ${code}`,
    );
    globalQuestionCodes.add(code);
  }
  for (const code of solutionCodes) {
    assertCondition(
      !globalSolutionCodes.has(code),
      `global duplicate solution ${code}`,
    );
    globalSolutionCodes.add(code);
  }
}

for (const unit of expectedUnits) {
  const source = readFileSync(
    join(root, "supabase/migrations", unit.migration),
    "utf8",
  );
  const metadata = source.match(
    /insert into public\.learning_units[\s\S]*?values\s*\(\s*'([^']+)',\s*(\d+),\s*'([^']+)'/,
  );
  const tail = source.match(
    /\}\$lesson\$::jsonb,\s*24,\s*true,\s*(\d+)(?:,\s*'([^']+)')?\s*\)/,
  );
  assertCondition(metadata && tail, `${unit.migration}: invalid unit metadata`);
  assertCondition(metadata[1] === unit.slug, `${unit.migration}: wrong slug`);
  assertCondition(Number(metadata[2]) === 1, `${unit.slug}: grade must be 1`);
  assertCondition(metadata[3] === unit.title, `${unit.slug}: wrong title`);
  assertCondition(
    Number(tail[1]) === unit.displayOrder,
    `${unit.slug}: wrong display order`,
  );
  assertCondition(
    (tail[2] ?? null) === unit.prerequisite,
    `${unit.slug}: wrong prerequisite`,
  );
  const seededContent =
    unit.displayOrder === 1
      ? source.slice(0, source.indexOf("do $content_validation$"))
      : ["objectives", "lesson", "questions", "solutions"]
          .map((tag) => readTaggedText(source, tag, unit.migration))
          .join("\n");
  assertCondition(
    !/(?:Tiền Việt Nam|mệnh giá|tờ tiền|đồng xu)/i.test(seededContent),
    `${unit.slug}: out-of-scope money content found`,
  );

  if (unit.displayOrder === 1) {
    validateFoundationContent(source, unit);
  } else {
    validateTaggedContent(source, unit);
  }
}

assertCondition(
  globalQuestionCodes.size === 13 * 24,
  "release must contain 312 unique questions",
);
assertCondition(
  globalSolutionCodes.size === 13 * 24,
  "release must contain 312 unique solutions",
);
for (const code of globalSolutionCodes) {
  assertCondition(
    globalQuestionCodes.has(code),
    `orphan solution found for ${code}`,
  );
}

console.log(
  "Grade 1 release technical validation passed: 13 published units, valid prerequisite graph, 312 questions, 312 solutions, 208 MCQ, 104 NUMBER_INPUT, and 52 skill groups.",
);
console.warn(
  "CONTENT_GOVERNANCE_NOTICE: technical release integrity passed; this does not imply Ministry endorsement or expert review. Official-source validation and Owner publication decisions are tracked independently.",
);
