import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const migrationPath = join(
  root,
  "supabase/migrations/0031_grade1_diagnostic.sql",
);
const migration = readFileSync(migrationPath, "utf8");
const runtimeFixPath = join(
  root,
  "supabase/migrations/0032_fix_grade1_diagnostic_runtime.sql",
);
const runtimeFix = readFileSync(runtimeFixPath, "utf8");

function fail(message) {
  throw new Error(`Grade 1 diagnostic validation failed: ${message}`);
}

const blueprintMatches = [
  ...migration.matchAll(
    /\(1,\s*(\d+),\s*'(NUMBER_SENSE|ARITHMETIC|GEOMETRY|MEASUREMENT_TIME)',\s*'([^']+)'\)/g,
  ),
];
if (blueprintMatches.length !== 24) {
  fail(`expected 24 blueprint rows, found ${blueprintMatches.length}`);
}

const positions = blueprintMatches.map((match) => Number(match[1]));
const questionIds = blueprintMatches.map((match) => match[3]);
if (
  new Set(positions).size !== 24 ||
  !positions.every((position) => position >= 1 && position <= 24)
) {
  fail("blueprint positions must be unique from 1 to 24");
}
if (new Set(questionIds).size !== 24) {
  fail("blueprint question IDs must be unique");
}

const requiredDomains = [
  "NUMBER_SENSE",
  "ARITHMETIC",
  "GEOMETRY",
  "MEASUREMENT_TIME",
];
for (const domain of requiredDomains) {
  const count = blueprintMatches.filter((match) => match[2] === domain).length;
  if (count !== 6) fail(`${domain} must contain exactly 6 questions`);
}

const migrationsDirectory = join(root, "supabase/migrations");
const questionRows = new Map();
for (const fileName of readdirSync(migrationsDirectory)) {
  if (!/^\d{4}_.+\.sql$/.test(fileName) || fileName >= "0031_") continue;
  const source = readFileSync(join(migrationsDirectory, fileName), "utf8");
  for (const block of source.matchAll(
    /\$questions\$(\[[\s\S]*?\])\$questions\$/g,
  )) {
    const rows = JSON.parse(block[1]);
    for (const row of rows) {
      questionRows.set(row.code, row);
    }
  }
}

const selectedQuestions = questionIds.map((questionId) => {
  const question = questionRows.get(questionId);
  if (!question) fail(`question ${questionId} is not seeded before 0031`);
  return question;
});
const mcqCount = selectedQuestions.filter(
  (question) => question.question_type === "MULTIPLE_CHOICE",
).length;
const numberCount = selectedQuestions.filter(
  (question) => question.question_type === "NUMBER_INPUT",
).length;
if (mcqCount !== 16 || numberCount !== 8) {
  fail(`expected 16 MCQ and 8 NUMBER_INPUT, found ${mcqCount} and ${numberCount}`);
}

for (const question of selectedQuestions) {
  if (
    question.question_type === "MULTIPLE_CHOICE" &&
    Object.keys(question.options ?? {}).sort().join(",") !== "A,B,C,D"
  ) {
    fail(`${question.code} does not have exactly A-D`);
  }
  if (
    question.question_type === "NUMBER_INPUT" &&
    question.options !== null
  ) {
    fail(`${question.code} NUMBER_INPUT must not have options`);
  }
}

const stateFunction =
  migration.match(
    /create or replace function public\.get_grade1_diagnostic_state[\s\S]*?revoke all on function public\.get_grade1_diagnostic_state/,
  )?.[0] ?? "";
if (!stateFunction || /question_solutions/.test(stateFunction)) {
  fail("in-progress diagnostic state must not read or return solutions");
}

const submitFunction =
  migration.match(
    /create or replace function public\.submit_grade1_diagnostic_answer[\s\S]*?revoke all on function public\.submit_grade1_diagnostic_answer/,
  )?.[0] ?? "";
if (
  !submitFunction ||
  !/pg_advisory_xact_lock/.test(submitFunction) ||
  !/< 0\.70/.test(submitFunction) ||
  !/NEXT_UNCOMPLETED_UNIT/.test(submitFunction) ||
  !/GRADE1_CURRENT_SCOPE_MASTERED/.test(submitFunction)
) {
  fail("submit RPC is missing concurrency or deterministic recommendation rules");
}

for (const requiredFragment of [
  "create table public.diagnostic_attempts",
  "create table public.diagnostic_answers",
  "create unique index diagnostic_attempts_one_in_progress_idx",
  "security definer",
  "set search_path = ''",
  "procedure.proconfig @> array['search_path=\"\"']::text[]",
  "enable row level security",
  "revoke all on table public.diagnostic_answers from authenticated",
  "grant select on table public.diagnostic_attempts to authenticated",
  "begin;",
  "commit;",
]) {
  if (!migration.toLowerCase().includes(requiredFragment.toLowerCase())) {
    fail(`missing security or lifecycle fragment: ${requiredFragment}`);
  }
}

for (const requiredFragment of [
  "begin;",
  "pg_catalog.pg_get_functiondef",
  "'pg_catalog.coalesce'",
  "'coalesce'",
  "get_grade1_diagnostic_state",
  "get_grade1_diagnostic_review",
  "procedure.proconfig @> array['search_path=\"\"']::text[]",
  "commit;",
]) {
  if (!runtimeFix.toLowerCase().includes(requiredFragment.toLowerCase())) {
    fail(`missing runtime repair fragment: ${requiredFragment}`);
  }
}

if (
  /\b(?:insert into|update|delete from|truncate)\s+public\.(?:diagnostic_attempts|diagnostic_answers|practice_attempts|practice_answers)/i.test(
    runtimeFix,
  )
) {
  fail("runtime repair must not mutate diagnostic or practice data");
}

console.log(
  "Grade 1 diagnostic validator passed: 24 curated questions, 4 domains × 6, 16 MCQ, 8 NUMBER_INPUT, and read-RPC runtime repair.",
);
