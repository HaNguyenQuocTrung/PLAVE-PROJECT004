import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/0033_grade1_completion_summary.sql",
  ),
  "utf8",
);

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(`Grade 1 completion migration validation failed: ${message}`);
  }
}

assertCondition(
  (source.match(/^begin;$/gm) ?? []).length === 1 &&
    (source.match(/^commit;$/gm) ?? []).length === 1,
  "migration must contain exactly one BEGIN and one COMMIT",
);

const functionDefinition =
  source.match(
    /create or replace function public\.get_parent_child_grade1_completion_summary[\s\S]*?\n\$\$;/,
  )?.[0] ?? "";

for (const fragment of [
  "security definer",
  "set search_path = ''",
  "auth.uid()",
  "profile.role = 'PARENT'",
  "profile.onboarding_completed",
  "connection.parent_user_id = v_current_user_id",
  "connection.status = 'APPROVED'",
  "student.grade = 1",
  "completed_attempt.status = 'COMPLETED'",
  "active_attempt.status = 'IN_PROGRESS'",
]) {
  assertCondition(
    functionDefinition.includes(fragment),
    `RPC is missing ${fragment}`,
  );
}

assertCondition(
  !/(?:question_solutions|practice_answers|diagnostic_answers|student_answer|correct_answer|solution_steps)/i.test(
    functionDefinition,
  ),
  "RPC must not read or return answer-level data",
);
assertCondition(
  !/\b(?:insert into|update|delete from|truncate|alter table|drop table)\b/i.test(
    source,
  ),
  "migration must be additive and read-only",
);
assertCondition(
  !/pg_catalog\.coalesce/i.test(source),
  "COALESCE must not be schema-qualified",
);
assertCondition(
  !/pg_catalog\.position\s*\(/i.test(source),
  "POSITION with IN syntax must not be schema-qualified",
);

for (const fragment of [
  "from public;",
  "from anon;",
  "to authenticated;",
  "do $validation$",
  "procedure.prosecdef",
  "search_path=\"\"",
  "pg_catalog.aclexplode",
  "pg_catalog.strpos",
]) {
  assertCondition(source.includes(fragment), `missing validation fragment ${fragment}`);
}

console.log(
  "Grade 1 completion migration static validation passed: read-only Parent aggregate RPC, approved-connection authorization, safe search_path and restricted grants.",
);
