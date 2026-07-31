import { executeReadOnlyPostApplyDiagnostic } from "./project004-remote-dev-operations.ts";

try {
  const counts = executeReadOnlyPostApplyDiagnostic();
  process.stdout.write("REMOTE_PROJECT_IDENTITY=PASS\n");
  process.stdout.write("REMOTE_MIGRATIONS=PASS\n");
  process.stdout.write(
    `REMOTE_MIGRATIONS_COUNT=${counts.migrationRows}\n`,
  );
  process.stdout.write("REMOTE_SCHEMA_DEPENDENCIES=PASS\n");
  process.stdout.write("REMOTE_AUTH_TRIGGER=PASS\n");
  process.stdout.write("REMOTE_RLS_GRANTS=PASS\n");
  process.stdout.write("REMOTE_CURRICULUM_COUNTS=PASS\n");
  process.stdout.write(`REMOTE_UNITS_COUNT=${counts.units}\n`);
  process.stdout.write(
    `REMOTE_PUBLIC_QUESTIONS_COUNT=${counts.publicQuestions}\n`,
  );
  process.stdout.write(
    `REMOTE_PRIVATE_SOLUTIONS_COUNT=${counts.privateSolutions}\n`,
  );
  process.stdout.write(
    `REMOTE_OFFICIAL_OUTCOMES_COUNT=${counts.officialOutcomes}\n`,
  );
  process.stdout.write("REMOTE_USERS_HISTORY_EMPTY=PASS\n");
  process.stdout.write("REMOTE_RELEASE_INACTIVE=PASS\n");
  process.stdout.write(
    "PROJECT004_REMOTE_DEV_POST_APPLY_DIAGNOSTIC=PASS\n",
  );
} catch {
  process.stdout.write(
    "PROJECT004_REMOTE_DEV_POST_APPLY_DIAGNOSTIC=FAIL\n",
  );
  process.exitCode = 1;
}
