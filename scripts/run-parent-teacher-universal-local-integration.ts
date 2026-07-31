import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  parsePerGradeEvidence,
  type PerGradeEvidence,
} from "./universal-collaboration-evidence.ts";
import { loadOwnerLocalSupabase } from "./owner-local-demo-support.ts";
import {
  assertProject004Workspace,
} from "./project004-identity.ts";

const root = assertProject004Workspace();
const databaseUrl =
  process.env.PLAVE_LOCAL_DATABASE_URL ??
  loadOwnerLocalSupabase().databaseUrl.toString();
const localDatabaseUrl = databaseUrl;

const parsedUrl = new URL(localDatabaseUrl);
if (
  !["postgres:", "postgresql:"].includes(parsedUrl.protocol) ||
  !["127.0.0.1", "localhost", "::1"].includes(parsedUrl.hostname)
) {
  throw new Error(
    "Only the disposable PROJECT004 loopback PostgreSQL database is allowed.",
  );
}

const migration0038 = resolve(
  root,
  "supabase/migrations/0038_universal_curriculum_runtime_draft.sql",
);
const migration0039 = resolve(
  root,
  "supabase/migrations/0039_parent_teacher_universal_learning.sql",
);
const verification = resolve(
  root,
  "supabase/operations/verify_0039_parent_teacher_universal_local.sql",
);
const cleanup = resolve(
  root,
  "supabase/operations/cleanup_0039_parent_teacher_universal_local.sql",
);
const deactivate = resolve(
  root,
  "supabase/operations/deactivate_0038_universal_curriculum_local.sql",
);
const statusPath = resolve(
  root,
  "docs/operations/PARENT_TEACHER_UNIVERSAL_RUNTIME_STATUS.json",
);

const universalSchemaObjects = [
  "public.curriculum_releases",
  "public.curriculum_release_units",
  "public.curriculum_release_questions",
  "private.curriculum_release_solutions",
  "public.curriculum_legacy_grade1_outcome_mappings",
  "public.curriculum_attempts",
  "public.curriculum_answers",
  "public.student_curriculum_unit_progress",
  "public.student_curriculum_outcome_progress",
  "public.student_curriculum_skill_progress",
] as const;

const collaborationBaseObjects = [
  "public.teacher_questions",
  "public.teacher_question_solutions",
  "public.teacher_assignments",
  "public.teacher_assignment_items",
  "public.assignment_submissions",
  "public.assignment_answers",
  "public.classrooms",
  "public.classroom_memberships",
  "public.teacher_profiles",
  "public.parent_student_connections",
  "public.profiles",
  "public.student_profiles",
] as const;

const collaboration0039Objects = [
  "public.teacher_curriculum_assignment_drafts",
  "public.teacher_curriculum_assignment_draft_items",
  "private.assignment_submission_mutations",
  "public.student_assignment_outcome_progress",
  "public.student_assignment_skill_progress",
] as const;

const collaboration0039Functions = [
  "public.get_teacher_curriculum_catalog(uuid,text,text,text,text,integer,integer)",
  "public.create_teacher_curriculum_assignment_draft(uuid,text,text,timestamp with time zone,text,text,text,text,text[],smallint,text,uuid)",
  "public.publish_teacher_curriculum_assignment_draft(uuid,uuid)",
  "public.get_my_teacher_curriculum_drafts()",
  "public.save_assignment_draft_answer_v2(uuid,uuid,text,integer,uuid)",
  "public.submit_assignment_submission_v2(uuid,integer,uuid)",
  "public.get_teacher_assignment_curriculum_evidence(uuid)",
  "public.get_parent_child_universal_progress(uuid)",
] as const;

type Presence = Readonly<{
  name: string;
  present: boolean;
}>;

let databaseReachable = false;

function runPsql(
  args: readonly string[],
  options: Readonly<{
    input?: string;
    inheritOutput?: boolean;
    label: string;
  }>,
) {
  const result = spawnSync(
    "psql",
    [
      "-X",
      "--set",
      "ON_ERROR_STOP=1",
      ...args,
      localDatabaseUrl,
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: process.env,
      input: options.input,
    },
  );
  if (options.inheritOutput) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
  if (result.status !== 0) {
    if (!options.inheritOutput && result.stderr) {
      process.stderr.write(result.stderr);
    }
    throw new Error(`${options.label} failed.`);
  }
  databaseReachable = true;
  return result.stdout.trim();
}

function psqlFile(path: string, label: string) {
  return runPsql(["--file", path], {
    inheritOutput: true,
    label,
  });
}

function recordDatabasePassStatus(perGradeEvidence: readonly PerGradeEvidence[]) {
  const status = JSON.parse(
    readFileSync(statusPath, "utf8"),
  ) as Record<string, unknown>;
  status.decision = "NOT_READY_FOR_OWNER_BROWSER_DEMO";
  status.reason =
    "All nine per-grade Parent/Teacher/Student live-local database journeys and cleanup postconditions passed, but Owner browser acceptance remains failed. Database evidence cannot raise browser demo readiness.";
  status.perGradeEvidenceMatrix = perGradeEvidence;
  status.verification = {
    ...(typeof status.verification === "object" &&
    status.verification !== null
      ? status.verification
      : {}),
    liveLocalParentTeacher: "PASS",
    liveLocalPerGrade: "9/9 PASS",
  };
  status.findings = {
    blocker: 1,
    high: 0,
    medium: 0,
  };
  status.remainingOwnerAction =
    "Owner must rerun registration/login, warm navigation, start practice, submit and persistence after runtime verification passes. Remote remains unchanged.";
  writeFileSync(statusPath, `${JSON.stringify(status, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

function query(sql: string, label: string) {
  return runPsql(["-At", "--field-separator", "\t"], {
    input: sql,
    label,
  });
}

function relationPresence(
  names: readonly string[],
  label: string,
): Presence[] {
  const values = names
    .map((name) => `('${name.replaceAll("'", "''")}')`)
    .join(",");
  const output = query(
    `
      select candidate.name,
        (pg_catalog.to_regclass(candidate.name) is not null)::integer
      from (values ${values}) as candidate(name)
      order by candidate.name;
    `,
    label,
  );
  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [name, present] = line.split("\t");
      return { name, present: present === "1" };
    });
}

function functionPresence(
  names: readonly string[],
  label: string,
): Presence[] {
  const values = names
    .map((name) => `('${name.replaceAll("'", "''")}')`)
    .join(",");
  const output = query(
    `
      select candidate.name,
        (pg_catalog.to_regprocedure(candidate.name) is not null)::integer
      from (values ${values}) as candidate(name)
      order by candidate.name;
    `,
    label,
  );
  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [name, present] = line.split("\t");
      return { name, present: present === "1" };
    });
}

function printPresence(
  preconditionName: string,
  values: readonly Presence[],
) {
  process.stdout.write(`PRECONDITION ${preconditionName}\n`);
  for (const value of values) {
    process.stdout.write(
      `  ${value.name}: ${value.present ? "PRESENT" : "MISSING"}\n`,
    );
  }
}

function allPresent(values: readonly Presence[]) {
  return values.every((value) => value.present);
}

function allAbsent(values: readonly Presence[]) {
  return values.every((value) => !value.present);
}

function requireCompleteFingerprint(
  name: string,
  values: readonly Presence[],
) {
  printPresence(name, values);
  if (!allPresent(values)) {
    throw new Error(`${name}: SCHEMA_FINGERPRINT_MISMATCH`);
  }
}

function printSafeDatabaseState() {
  const state = query(
    `
      select 'release_rows', count(*)::text
      from public.curriculum_releases
      union all
      select 'release_draft_inactive', count(*)::text
      from public.curriculum_releases
      where status = 'DRAFT' and activation_state = 'INACTIVE'
      union all
      select 'release_active', count(*)::text
      from public.curriculum_releases
      where status = 'ACTIVE' or activation_state = 'ACTIVE'
      union all
      select 'unit_count', count(*)::text
      from public.curriculum_release_units
      union all
      select 'public_question_count', count(*)::text
      from public.curriculum_release_questions
      union all
      select 'private_solution_count', count(*)::text
      from private.curriculum_release_solutions
      union all
      select 'official_outcome_count', count(distinct outcome_id)::text
      from public.curriculum_release_units as unit
      cross join lateral unnest(unit.official_outcome_ids)
        as outcome(outcome_id)
      union all
      select 'synthetic_user_count', count(*)::text
      from auth.users
      where email like 'collaboration-%@plave.local.invalid';
    `,
    "Safe aggregate diagnostics",
  );
  process.stdout.write("SAFE_DATABASE_STATE\n");
  process.stdout.write(
    state
      .split("\n")
      .filter(Boolean)
      .map((line) => `  ${line.replace("\t", ": ")}`)
      .join("\n") + "\n",
  );
}

function releaseCounts() {
  const output = query(
    `
      select
        (select count(*) from public.curriculum_releases),
        (select count(*) from public.curriculum_release_units),
        (select count(*) from public.curriculum_release_questions),
        (select count(*) from private.curriculum_release_solutions),
        (
          select count(distinct outcome_id)
          from public.curriculum_release_units as unit
          cross join lateral unnest(unit.official_outcome_ids)
            as outcome(outcome_id)
        );
    `,
    "Release count preflight",
  );
  const values = output.split("\t").map(Number);
  if (values.length !== 5 || values.some((value) => !Number.isInteger(value))) {
    throw new Error("RELEASE_CONTENT_FINGERPRINT: INVALID_COUNT_RESULT");
  }
  return {
    releases: values[0],
    units: values[1],
    questions: values[2],
    solutions: values[3],
    outcomes: values[4],
  };
}

function materializeInactiveRelease() {
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      resolve(root, "scripts/materialize-universal-curriculum-local.ts"),
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        PLAVE_LOCAL_DATABASE_URL: localDatabaseUrl,
        PLAVE_LOCAL_CURRICULUM_ACTIVATE: "false",
      },
    },
  );
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error("Local inactive curriculum materialization failed.");
  }
}

function ensureUniversalSchemaAndContent() {
  let universalPresence = relationPresence(
    universalSchemaObjects,
    "Inspect universal schema",
  );
  printPresence("UNIVERSAL_0038_SCHEMA", universalPresence);
  if (allAbsent(universalPresence)) {
    process.stdout.write(
      "LIFECYCLE universal schema absent: applying migration 0038 locally.\n",
    );
    psqlFile(migration0038, "Apply local migration 0038");
    universalPresence = relationPresence(
      universalSchemaObjects,
      "Reinspect universal schema",
    );
  }
  requireCompleteFingerprint("UNIVERSAL_0038_SCHEMA", universalPresence);

  const counts = releaseCounts();
  if (
    counts.releases === 0 &&
    counts.units === 0 &&
    counts.questions === 0 &&
    counts.solutions === 0 &&
    counts.outcomes === 0
  ) {
    process.stdout.write(
      "LIFECYCLE universal release absent: materializing DRAFT/INACTIVE.\n",
    );
    materializeInactiveRelease();
  }

  const materialized = releaseCounts();
  if (
    materialized.releases !== 1 ||
    materialized.units !== 171 ||
    materialized.questions !== 2052 ||
    materialized.solutions !== 2052 ||
    materialized.outcomes !== 546
  ) {
    throw new Error(
      "RELEASE_CONTENT_FINGERPRINT: expected 1/171/2052/2052/546.",
    );
  }
}

function collaboration0039Presence() {
  return [
    ...relationPresence(
      collaboration0039Objects,
      "Inspect 0039 relations",
    ),
    ...functionPresence(
      collaboration0039Functions,
      "Inspect 0039 functions",
    ),
  ];
}

function ensureCollaborationSchema() {
  requireCompleteFingerprint(
    "UNIVERSAL_COLLABORATION_BASE_SCHEMA",
    relationPresence(
      collaborationBaseObjects,
      "Inspect collaboration base schema",
    ),
  );

  let current0039 = collaboration0039Presence();
  printPresence("UNIVERSAL_COLLABORATION_0039_SCHEMA", current0039);
  if (allAbsent(current0039)) {
    process.stdout.write(
      "LIFECYCLE 0039 schema absent: applying migration 0039 locally.\n",
    );
    psqlFile(migration0039, "Apply local migration 0039");
    current0039 = collaboration0039Presence();
  } else if (!allPresent(current0039)) {
    throw new Error(
      "UNIVERSAL_COLLABORATION_0039_SCHEMA: PARTIAL_PRIOR_APPLY",
    );
  } else {
    process.stdout.write(
      "LIFECYCLE migration 0039 already applied: schema fingerprint PASS.\n",
    );
  }
  requireCompleteFingerprint(
    "UNIVERSAL_COLLABORATION_0039_SCHEMA",
    current0039,
  );
}

function hasComplete0039Schema() {
  try {
    return allPresent(collaboration0039Presence());
  } catch {
    return false;
  }
}

function hasCompleteUniversalSchema() {
  try {
    return allPresent(
      relationPresence(
        universalSchemaObjects,
        "Inspect universal cleanup schema",
      ),
    );
  } catch {
    return false;
  }
}

let primaryFailure: unknown = null;
let livePerGradeEvidence: PerGradeEvidence[] | null = null;
try {
  process.stdout.write(
    "PRECONDITION UNIVERSAL_COLLABORATION (migration 0039 DO block)\n",
  );
  const exact0039DoBlock = relationPresence(
    [
      "public.curriculum_releases",
      "public.curriculum_release_units",
      "public.curriculum_release_questions",
      "private.curriculum_release_solutions",
      "public.teacher_assignments",
      "public.parent_student_connections",
    ],
    "Inspect exact migration 0039 precondition",
  );
  printPresence("UNIVERSAL_COLLABORATION", exact0039DoBlock);

  ensureUniversalSchemaAndContent();
  ensureCollaborationSchema();

  // A prior interrupted local run may have left only deterministic fixture
  // residue or an ACTIVE release. Normalize it before the verification
  // transaction; the exact same cleanup runs again in finally.
  psqlFile(cleanup, "Pre-verification synthetic cleanup");
  printSafeDatabaseState();

  const verificationOutput = psqlFile(
    verification,
    "Parent/Teacher live-local verification",
  );
  livePerGradeEvidence = parsePerGradeEvidence(verificationOutput);
} catch (error) {
  primaryFailure = error;
  throw error;
} finally {
  let cleanupFailure: unknown = null;
  try {
    if (!databaseReachable) {
      process.stderr.write(
        "CLEANUP_NOT_REQUIRED: no database session was established and no database mutation occurred.\n",
      );
    } else if (hasComplete0039Schema()) {
      psqlFile(cleanup, "Final synthetic cleanup");
    } else if (hasCompleteUniversalSchema()) {
      psqlFile(deactivate, "Final release deactivation");
    }
  } catch (error) {
    cleanupFailure = error;
    process.stderr.write(
      `CLEANUP_FAILED: ${
        error instanceof Error ? error.message : "unknown cleanup error"
      }\n`,
    );
  }

  try {
    if (databaseReachable && hasCompleteUniversalSchema()) {
      printSafeDatabaseState();
      const releaseState = query(
        `
          select count(*)
          from public.curriculum_releases
          where status <> 'DRAFT'
            or activation_state <> 'INACTIVE'
            or activated_at is not null;
        `,
        "Final release-state verification",
      );
      if (releaseState !== "0") {
        throw new Error(
          "Cleanup verification failed: release is not DRAFT/INACTIVE.",
        );
      }
    }
    if (databaseReachable && hasComplete0039Schema()) {
      const syntheticCount = query(
        `
          select count(*)
          from auth.users
          where email like 'collaboration-%@plave.local.invalid';
        `,
        "Final synthetic-residue verification",
      );
      if (syntheticCount !== "0") {
        throw new Error(
          "Cleanup verification failed: synthetic collaboration users remain.",
        );
      }
    }
  } catch (error) {
    cleanupFailure ??= error;
  }

  if (cleanupFailure && !primaryFailure) {
    throw cleanupFailure;
  }
}

if (!livePerGradeEvidence) {
  throw new Error("Live per-grade acceptance evidence is unavailable.");
}
recordDatabasePassStatus(livePerGradeEvidence);
process.stdout.write(
  "0039 Parent/Teacher local integration and cleanup: PASS\n",
);
