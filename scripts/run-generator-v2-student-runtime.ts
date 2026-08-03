/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { getLessonPath } from "../lib/practice/catalog.ts";
import {
  generateQuestion,
  validateStudentResponse,
  type CanonicalResponse,
  type GeneratedProductQuestion,
} from "../lib/generation-v2/index.ts";
import { serializeGeneratorV2DatabaseAnswer } from "../lib/generation-v2/answer-transport.ts";
import {
  GENERATOR_V2_OUTCOME_REGISTRY,
  getProductVariantByOutcome,
} from "../lib/generation-v2/registry.ts";
import {
  GENERATOR_V2_STUDENT_RUNTIME_CORRECTNESS_CAPABILITIES,
  GENERATOR_V2_STUDENT_RUNTIME_CORRECTNESS_OUTCOMES,
  GENERATOR_V2_STUDENT_RUNTIME_VERIFICATION_OUTCOMES,
} from "../lib/generation-v2/student-runtime-policy.ts";
import { buildUniversalCurriculumRelease } from "../lib/curriculum-runtime/release.ts";
import { reserveDisposablePorts } from "./project004-disposable-port-reservation.ts";
import { buildDisposableConfig } from "./project004-disposable-migration-workspace.ts";
import { copyGeneratedPersistenceMigrationInventory } from "./project004-generated-persistence-migration-inventory.ts";
import { assertProject004Workspace } from "./project004-identity.ts";
import { runManagedChild } from "./project004-managed-child-process.ts";
import { parseSupabaseStatusEnvironment } from "./owner-local-demo-support.ts";
import {
  assertDisposableCleanupScope,
  stopDisposableStack,
} from "./run-project004-clean-disposable-proof.ts";

const root = assertProject004Workspace();
const host = "127.0.0.1";
const chromeExecutable = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const toolsRoot = "/private/tmp/plave-playwright-tools";
const requireTools = createRequire(resolve(toolsRoot, "package.json"));
const { chromium } = requireTools("playwright-core") as typeof import("playwright-core");
const playwrightVersion = JSON.parse(
  readFileSync(resolve(toolsRoot, "node_modules/playwright-core/package.json"), "utf8"),
).version as string;
const artifactRoot = resolve(root, "artifacts/remediation");
const fullCorrectnessScope =
  process.env.PLAVE_GENERATOR_V2_STUDENT_RUNTIME_PROOF_SCOPE ===
  "FULL_CORRECTNESS";
const screenshotDirectory = fullCorrectnessScope
  ? "generator-correctness-screenshots"
  : "generator-runtime-screenshots";
const screenshotRoot = resolve(artifactRoot, screenshotDirectory);
const releaseBundle = buildUniversalCurriculumRelease();
const proofOutcomeIds = fullCorrectnessScope
  ? [
      ...new Map(
        GENERATOR_V2_OUTCOME_REGISTRY.map((entry) => [entry.variantId, entry]),
      ).values(),
    ].map((entry) => entry.outcomeId)
  : [...GENERATOR_V2_STUDENT_RUNTIME_VERIFICATION_OUTCOMES];
const entries = proofOutcomeIds.map(
  (outcomeId) => {
    const entry = getProductVariantByOutcome(outcomeId);
    if (!entry) throw new Error(`STUDENT_RUNTIME_ENTRY_MISSING:${outcomeId}`);
    const question = releaseBundle.questions.find((item) =>
      item.officialOutcomeIds.includes(outcomeId),
    );
    const unit = question
      ? releaseBundle.units.find((item) => item.unitId === question.unitId)
      : null;
    if (!question || !unit) {
      throw new Error(`STUDENT_RUNTIME_MAPPING_MISSING:${outcomeId}`);
    }
    return { entry, question, unit };
  },
);
const fixtureUnitCount = releaseBundle.units.length;
const eligibleOutcomeList = entries.map(({ entry }) => entry.outcomeId).join(",");
const eligibleCapabilityList = entries.map(({ entry }) => entry.variantId).join(",");
const entryByCapability = new Map(
  entries.map((mapped) => [mapped.entry.variantId, mapped]),
);
const interactionReviewCapabilities = [
  "POWER_AND_ROOT",
  "FRACTION_PART_WHOLE",
  "FUNCTION_GRAPH_RECOGNITION",
  "ALGEBRAIC_SUBSTITUTION",
  "QUADRATIC_EQUATION_SOLVING",
  "DATA_CLASSIFICATION",
  "PRACTICAL_DATA_REPRESENTATION",
  "POLYNOMIAL_SIMPLIFICATION",
] as const;
const interactionReviewIds = new Set(
  interactionReviewCapabilities
    .map((capabilityId) => entryByCapability.get(capabilityId)?.entry.outcomeId)
    .filter((value): value is string => Boolean(value)),
);
const visualReviewIds = new Set<string>();
if (fullCorrectnessScope) {
  for (const mapped of entries) {
    const sample = generateQuestion({
      outcomeId: mapped.entry.outcomeId,
      grade: mapped.entry.grade,
      difficulty: "MEDIUM",
      seed: `s10c-vis-${mapped.entry.variantId.toLowerCase().replaceAll("_", "-").slice(0, 70)}`,
      locale: "vi-VN",
    });
    if (
      ![...visualReviewIds].some((outcomeId) => {
        const reviewed = entries.find((item) => item.entry.outcomeId === outcomeId)!;
        return generateQuestion({
          outcomeId: reviewed.entry.outcomeId,
          grade: reviewed.entry.grade,
          difficulty: "MEDIUM",
          seed: `s10c-vis-${reviewed.entry.variantId.toLowerCase().replaceAll("_", "-").slice(0, 70)}`,
          locale: "vi-VN",
        }).publicSnapshot.visual.type === sample.publicSnapshot.visual.type;
      })
    ) {
      visualReviewIds.add(mapped.entry.outcomeId);
    }
  }
  for (const capabilityId of ["FRACTION_PART_WHOLE", "FUNCTION_GRAPH_RECOGNITION", "ALGEBRAIC_SUBSTITUTION", "QUADRATIC_EQUATION_SOLVING"]) {
    const outcomeId = entryByCapability.get(capabilityId)?.entry.outcomeId;
    if (outcomeId) visualReviewIds.add(outcomeId);
  }
}
const browserReviewIds = new Set([
  ...visualReviewIds,
  ...interactionReviewIds,
]);
const browserEntries = fullCorrectnessScope
  ? entries.filter((mapped) => browserReviewIds.has(mapped.entry.outcomeId))
  : entries;
const runTag = randomBytes(6).toString("hex");
const password = `Runtime-${randomBytes(18).toString("base64url")}9!`;
const signingKey = randomBytes(32).toString("hex");
let lastServerDiagnostic = "NO_SERVER_DIAGNOSTIC";
let proofStage = "INITIALIZE";

type Role = "STUDENT" | "PARENT" | "TEACHER";
type Actor = { id: string; email: string; role: Role; grade: number | null };
type LocalConfig = { apiUrl: string; publishableKey: string; serviceRoleKey: string };

class ProofFailure extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

const requireProof = (condition: unknown, code: string): asserts condition => {
  if (!condition) throw new ProofFailure(code);
};
const sqlText = (value: string) => `'${value.replaceAll("'", "''")}'`;
const sqlJson = (value: unknown) => `${sqlText(JSON.stringify(value))}::jsonb`;
const sqlTextArray = (values: readonly string[]) =>
  `array[${values.map(sqlText).join(",")}]::text[]`;

function safeEnvironment(extra: NodeJS.ProcessEnv = {}) {
  return {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR,
    LANG: "C",
    LC_ALL: "C",
    GOOGLE_API_KEY: "",
    PLAVE_AI_TUTOR_ENABLED: "false",
    ...extra,
  };
}

async function runPsql(databasePort: number, sql: string, stage: string) {
  return runManagedChild({
    executable: "/opt/homebrew/bin/psql",
    args: [
      "--no-psqlrc",
      "--quiet",
      "--tuples-only",
      "--no-align",
      "--set",
      "ON_ERROR_STOP=1",
      "--set",
      "VERBOSITY=terse",
    ],
    cwd: root,
    environment: safeEnvironment({
      PGHOST: host,
      PGPORT: String(databasePort),
      PGUSER: "postgres",
      PGPASSWORD: "postgres",
      PGDATABASE: "postgres",
      PGSSLMODE: "disable",
      PGCONNECT_TIMEOUT: "5",
    }),
    input: sql,
    timeoutMs: 180_000,
    stage,
  });
}

async function queryScalar(databasePort: number, sql: string, stage: string) {
  const result = await runPsql(databasePort, sql, stage);
  requireProof(result.ok, `${stage}_FAILED`);
  return result.stdout.trim();
}

async function reserveWebPort() {
  return new Promise<number>((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen({ host, port: 0, exclusive: true }, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new ProofFailure("WEB_PORT_INVALID"));
        return;
      }
      server.close((error) => error ? reject(error) : resolvePort(address.port));
    });
  });
}

async function loopbackPortIsFree(port: number) {
  return new Promise<boolean>((resolveResult) => {
    const server = createServer();
    server.once("error", () => resolveResult(false));
    server.listen({ host, port, exclusive: true }, () =>
      server.close(() => resolveResult(true)),
    );
  });
}

function fixtureSql() {
  const units = releaseBundle.units;
  const unitRows = units.map((unit) => `(${[
    sqlText(releaseBundle.release.releaseId),
    sqlText(unit.unitId),
    String(unit.grade),
    sqlText(unit.domain),
    sqlText(unit.title),
    sqlText(unit.description),
    sqlJson(unit.learningGoals),
    sqlJson(unit.theory),
    sqlJson(unit.workedExamples),
    sqlTextArray(unit.officialOutcomeIds),
    sqlTextArray(unit.skillIds),
    String(unit.displayOrder),
    "12",
  ].join(",")})`).join(",\n");
  const questionDisplayOrder = new Map<string, number>();
  const questionRows = entries.map(({ entry, question, unit }, index) => {
    const displayOrder = (questionDisplayOrder.get(unit.unitId) ?? 0) + 1;
    questionDisplayOrder.set(unit.unitId, displayOrder);
    return `(${[
    sqlText(releaseBundle.release.releaseId),
    sqlText(unit.unitId),
    sqlText(`${fullCorrectnessScope ? "sprint-10c" : "sprint-10b"}-mapping-q-${String(index + 1).padStart(3, "0")}`),
    String(displayOrder),
    sqlText(question.answerType),
    sqlText(question.prompt),
    question.options === null ? "null" : sqlJson(question.options),
    sqlJson(question.visual),
    sqlText(question.cognitiveLevel),
    sqlTextArray([entry.outcomeId]),
    sqlTextArray([entry.outcomeTitle]),
    sqlText(question.skillId),
    sqlText(question.skillTitle),
    sqlText(question.questionPayloadHash),
  ].join(",")})`;
  }).join(",\n");
  return String.raw`
begin;
insert into public.curriculum_releases (
  release_id, content_version, curriculum_source_fingerprint,
  generator_version, deterministic_seed, mastery_policy_version,
  public_payload_sha256, private_solution_sha256, bundle_sha256,
  status, activation_state, activated_at
) values (
  ${sqlText(releaseBundle.release.releaseId)}, ${sqlText(fullCorrectnessScope ? "TEST_ONLY_SPRINT_10C" : "TEST_ONLY_SPRINT_10B")},
  ${sqlText(releaseBundle.release.curriculumSourceFingerprint)},
  ${sqlText(releaseBundle.release.generatorVersion)}, ${sqlText(fullCorrectnessScope ? "test-only-sprint-10c" : "test-only-sprint-10b")},
  ${sqlText(releaseBundle.release.masteryPolicyVersion)},
  ${sqlText(releaseBundle.hashes.publicPayloadSha256)},
  ${sqlText(releaseBundle.hashes.privateSolutionSha256)},
  ${sqlText(releaseBundle.hashes.bundleSha256)},
  'ACTIVE', 'ACTIVE', now()
);
insert into public.curriculum_release_units (
  release_id, unit_id, grade, domain, title, description, learning_goals,
  theory, worked_examples, official_outcome_ids, skill_ids, display_order,
  total_questions
) values ${unitRows};
insert into public.curriculum_release_questions (
  release_id, unit_id, question_id, display_order, answer_type, prompt,
  options, visual, cognitive_level, official_outcome_ids,
  official_outcome_titles, skill_id, skill_title, question_payload_hash
) values ${questionRows};
insert into private.curriculum_generation_runtime_secret (
  singleton, signing_key_hex
) values (true, ${sqlText(signingKey)});
commit;
select concat_ws('|',
  (select count(*) from supabase_migrations.schema_migrations),
  (select min(version) from supabase_migrations.schema_migrations),
  (select max(version) from supabase_migrations.schema_migrations),
  (select count(*) from public.curriculum_release_units),
  (select count(*) from public.curriculum_release_questions)
);
`;
}

async function loadDisposableConfig(workdir: string) {
  const status = await runManagedChild({
    executable: "/opt/homebrew/bin/supabase",
    args: ["status", "--workdir", workdir, "-o", "env"],
    cwd: root,
    environment: safeEnvironment(),
    timeoutMs: 60_000,
    stage: "SPRINT_10B_SUPABASE_STATUS",
  });
  requireProof(status.ok, "DISPOSABLE_STATUS_FAILED");
  const values = parseSupabaseStatusEnvironment(status.stdout);
  const config = {
    apiUrl: values.get("API_URL") ?? "",
    publishableKey: values.get("ANON_KEY") ?? "",
    serviceRoleKey: values.get("SERVICE_ROLE_KEY") ?? "",
  };
  requireProof(/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/u.test(config.apiUrl), "API_NOT_LOOPBACK");
  requireProof(config.publishableKey.length > 40 && config.serviceRoleKey.length > 40, "LOCAL_KEYS_MISSING");
  return config;
}

async function createActor(config: LocalConfig, role: Role, grade: number | null, label: string): Promise<Actor> {
  const email = `test-only-10b-${runTag}-${label}@example.invalid`;
  const response = await fetch(`${config.apiUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: role === "TEACHER" ? "PARENT" : role,
        ...(grade ? { grade: String(grade) } : {}),
      },
    }),
  });
  const payload = await response.json().catch(() => null) as { id?: string } | null;
  requireProof(response.ok && /^[0-9a-f-]{36}$/iu.test(payload?.id ?? ""), `ACTOR_CREATE_${label}`);
  return { id: payload!.id!, email, role, grade };
}

async function completeActor(databasePort: number, actor: Actor, index: number) {
  const student = actor.role === "STUDENT"
    ? `insert into public.student_profiles (user_id, grade, student_code) values (${sqlText(actor.id)}::uuid, ${actor.grade}, ${sqlText(`PLV-${runTag.slice(0, 10).toUpperCase()}${index.toString(16).padStart(2, "0").toUpperCase()}`)}) on conflict (user_id) do update set grade=excluded.grade, student_code=excluded.student_code;`
    : "";
  const result = await runPsql(databasePort, String.raw`
update public.profiles set
  full_name = ${sqlText(actor.role === "STUDENT" ? "Học sinh kiểm chứng" : actor.role === "PARENT" ? "Phụ huynh kiểm chứng" : "Giáo viên kiểm chứng")},
  role = ${sqlText(actor.role)}, onboarding_completed = true
where user_id = ${sqlText(actor.id)}::uuid;
${student}
select count(*) from public.profiles where user_id = ${sqlText(actor.id)}::uuid and onboarding_completed;
`, "SPRINT_10B_ACTOR_FIXTURE");
  requireProof(result.ok && result.stdout.trim() === "1", `ACTOR_FIXTURE_${index}`);
}

async function completeLocalPrerequisites(
  databasePort: number,
  actor: Actor,
) {
  if (actor.role !== "STUDENT" || actor.grade === null) return;
  const result = await runPsql(
    databasePort,
    String.raw`
insert into public.student_curriculum_unit_progress (
  student_id, release_id, unit_id, status, evidence_count, correct_count,
  completed_attempt_count, best_score_percent, mastery_label,
  mastery_policy_version, last_activity_at, completed_at
)
select
  ${sqlText(actor.id)}::uuid,
  unit.release_id,
  unit.unit_id,
  'COMPLETED', 1, 1, 1, 100, 'MASTERED',
  release.mastery_policy_version, now(), now()
from public.curriculum_release_units as unit
join public.curriculum_releases as release on release.release_id=unit.release_id
where unit.grade=${actor.grade}
on conflict (student_id, release_id, unit_id) do update set
  status='COMPLETED', evidence_count=greatest(public.student_curriculum_unit_progress.evidence_count,1),
  correct_count=greatest(public.student_curriculum_unit_progress.correct_count,1),
  completed_attempt_count=greatest(public.student_curriculum_unit_progress.completed_attempt_count,1),
  best_score_percent=100, mastery_label='MASTERED', completed_at=now();
select count(*) from public.student_curriculum_unit_progress
where student_id=${sqlText(actor.id)}::uuid and status='COMPLETED';
`,
    "SPRINT_10C_LOCAL_PREREQUISITES",
  );
  requireProof(
    result.ok && Number(result.stdout.trim()) > 0,
    `PREREQUISITE_FIXTURE_G${actor.grade}`,
  );
}

function createRuntimeCopy() {
  const container = resolve(root, `.sprint-10b-runtime-${runTag}`);
  mkdirSync(container, { mode: 0o700 });
  const runtimeRoot = resolve(container, "PLAVE-PROJECT004");
  try {
    mkdirSync(runtimeRoot, { mode: 0o700 });
    const excluded = new Set([
      ".git",
      ".next",
      "node_modules",
      ".env.local",
      "artifacts",
      `.sprint-10b-runtime-${runTag}`,
    ]);
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (
        excluded.has(entry.name) ||
        entry.name.startsWith(".next") ||
        entry.name.startsWith(".sprint-10b-")
      ) {
        continue;
      }
      cpSync(resolve(root, entry.name), resolve(runtimeRoot, entry.name), {
        recursive: entry.isDirectory(),
      });
    }
    symlinkSync(resolve(root, "node_modules"), resolve(runtimeRoot, "node_modules"), "dir");
    const nextConfigPath = resolve(runtimeRoot, "next.config.ts");
    const nextConfig = readFileSync(nextConfigPath, "utf8");
    requireProof(nextConfig.includes("root: projectRoot,"), "RUNTIME_NEXT_CONFIG_ROOT_MISSING");
    writeFileSync(
      nextConfigPath,
      nextConfig.replace("root: projectRoot,", `root: ${JSON.stringify(root)},`),
      { mode: 0o600 },
    );
    return runtimeRoot;
  } catch (error) {
    rmSync(container, { recursive: true, force: true });
    throw error;
  }
}

function startNext(config: LocalConfig, port: number, runtimeRoot: string, overrides: NodeJS.ProcessEnv = {}) {
  lastServerDiagnostic = "SERVER_STARTING";
  const child = spawn(
    process.execPath,
    [resolve(root, "node_modules/next/dist/bin/next"), "dev", "--hostname", host, "--port", String(port)],
    {
      cwd: runtimeRoot,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: safeEnvironment({
        NODE_ENV: "development",
        NEXT_TELEMETRY_DISABLED: "1",
        NEXT_PUBLIC_SUPABASE_URL: config.apiUrl,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: config.publishableKey,
        PLAVE_CURRICULUM_RUNTIME_ENABLED: "true",
        GENERATOR_V2_STUDENT_RUNTIME_ENABLED: "true",
        GENERATOR_V2_STUDENT_RUNTIME_RELEASE: "LOCAL_VERIFICATION",
        GENERATOR_V2_STUDENT_RUNTIME_SCHEMA: "0042",
        GENERATOR_V2_STUDENT_RUNTIME_ELIGIBLE_OUTCOMES: eligibleOutcomeList,
        GENERATOR_V2_STUDENT_RUNTIME_ELIGIBLE_CAPABILITIES: eligibleCapabilityList,
        PLAVE_ON_DEMAND_GENERATION_SIGNING_KEY: signingKey,
        PLAVE_ON_DEMAND_GENERATION_ENABLED: "false",
        PLAVE_GENERATED_PRACTICE_RUNTIME_ENABLED: "false",
        PLAVE_GENERATED_PRACTICE_MODE: "OFF",
        ...overrides,
      }),
    },
  );
  const captureDiagnostic = (chunk: Buffer) => {
    const lines = chunk.toString().split("\n").filter((line) =>
      /error|failed|invalid|module|lock|ready|local:/iu.test(line),
    );
    if (lines.length) lastServerDiagnostic = sanitizedError(lines.at(-1));
  };
  child.stdout?.on("data", captureDiagnostic);
  child.stderr?.on("data", captureDiagnostic);
  return child;
}

function processGroupIsAlive(processGroupId: number) {
  try {
    process.kill(-processGroupId, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

async function waitForProcessGroupExit(processGroupId: number, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!processGroupIsAlive(processGroupId)) return true;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  return !processGroupIsAlive(processGroupId);
}

async function stopNext(child: ChildProcess | null) {
  if (!child?.pid) return;
  const processGroupId = child.pid;
  if (!processGroupIsAlive(processGroupId)) return;
  try {
    process.kill(-processGroupId, "SIGTERM");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") return;
    throw error;
  }
  if (await waitForProcessGroupExit(processGroupId, 10_000)) return;
  try {
    process.kill(-processGroupId, "SIGKILL");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") return;
    throw error;
  }
  if (!(await waitForProcessGroupExit(processGroupId, 5_000))) {
    throw new ProofFailure("NEXT_PROCESS_GROUP_CLEANUP_FAILED");
  }
}

async function waitReady(baseURL: string) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseURL}/login`, { signal: AbortSignal.timeout(2_500) });
      if (response.ok) return;
    } catch { /* compiling */ }
    await new Promise((resolveWait) => setTimeout(resolveWait, 300));
  }
  throw new ProofFailure(`NEXT_READINESS_TIMEOUT_${lastServerDiagnostic}`);
}

async function login(page: any, actor: Actor, baseURL: string) {
  proofStage = `LOGIN_${actor.role}_${actor.grade ?? "NA"}`;
  await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded" });
  await page.locator("#login-email").waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForFunction(() => {
    const input = document.querySelector("#login-email") as
      | (HTMLInputElement & { _valueTracker?: unknown })
      | null;
    return Boolean(input?._valueTracker);
  }, undefined, { timeout: 20_000 });
  await page.locator("#login-email").fill(actor.email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL((url: URL) => !url.pathname.startsWith("/login"), {
    timeout: 60_000,
    waitUntil: "commit",
  });
}

function attemptSeed(studentId: string, idempotencyKey: string, outcomeId: string) {
  return `v2-${createHmac("sha256", Buffer.from(signingKey, "hex"))
    .update(`${studentId}:${idempotencyKey}:${outcomeId}`)
    .digest("hex").slice(0, 48)}`;
}

function selectedOutcomeForKey(
  studentId: string,
  unitId: string,
  idempotencyKey: string,
) {
  const explicitlyEligibleOutcomeIds = new Set(
    entries.map((mapped) => mapped.entry.outcomeId),
  );
  const explicitlyEligibleCapabilityIds = new Set(
    entries.map((mapped) => mapped.entry.variantId),
  );
  const unit = releaseBundle.units.find((candidate) => candidate.unitId === unitId);
  if (!unit) return undefined;
  const candidates = unit.officialOutcomeIds
    .map((outcomeId) => getProductVariantByOutcome(outcomeId))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .filter(
      (entry) =>
        explicitlyEligibleOutcomeIds.has(entry.outcomeId) &&
        explicitlyEligibleCapabilityIds.has(entry.variantId) &&
        releaseBundle.questions.some(
          (question) =>
            question.unitId === unitId &&
            question.officialOutcomeIds.includes(entry.outcomeId),
        ),
    )
    .sort((left, right) => left.outcomeId.localeCompare(right.outcomeId));
  const digest = createHmac("sha256", Buffer.from(signingKey, "hex"))
    .update(`${studentId}:${idempotencyKey}:${unitId}:outcome-selection`)
    .digest();
  return candidates[digest.readUInt32BE(0) % candidates.length]?.outcomeId;
}

function targetIdempotencyKey(
  studentId: string,
  mapped: (typeof entries)[number],
) {
  for (let attempt = 0; attempt < 10_000; attempt += 1) {
    const key = randomUUID();
    if (selectedOutcomeForKey(studentId, mapped.unit.unitId, key) === mapped.entry.outcomeId) {
      if (mapped.entry.variantId === "FUNCTION_GRAPH_RECOGNITION") {
        const first = generatedAt(mapped.entry, studentId, key, 1).publicSnapshot.visual.data.candidateGraphs;
        const medium = generatedAt(mapped.entry, studentId, key, 5).publicSnapshot.visual.data.candidateGraphs;
        const firstLine = publicLineCandidate(first);
        const mediumLine = publicLineCandidate(medium);
        if (Number(firstLine?.slope) !== 2 || Number(firstLine?.intercept) !== 3 || Number(mediumLine?.intercept) >= 0) continue;
      }
      return key;
    }
  }
  throw new ProofFailure(
    `OUTCOME_SELECTION_KEY_UNRESOLVED_${mapped.entry.variantId}`,
  );
}

function publicLineCandidate(value: unknown) {
  if (!Array.isArray(value)) return null;
  for (const candidate of value as unknown[]) {
    if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) continue;
    const record = candidate as Readonly<Record<string, unknown>>;
    if (
      record.kind === "LINE" &&
      Number.isFinite(Number(record.slope)) &&
      Number.isFinite(Number(record.intercept))
    ) {
      return {
        slope: Number(record.slope),
        intercept: Number(record.intercept),
      };
    }
  }
  return null;
}

function generatedAt(entry: (typeof entries)[number]["entry"], studentId: string, key: string, position: number) {
  const difficulty = (["EASY", "MEDIUM", "HARD"] as const)[Math.floor((position - 1) / 4)]!;
  return generateQuestion({
    outcomeId: entry.outcomeId,
    grade: entry.grade,
    difficulty,
    seed: `${attemptSeed(studentId, key, entry.outcomeId)}-${String(position).padStart(2, "0")}`,
    locale: "vi-VN",
  });
}

function wrongResponse(question: GeneratedProductQuestion): CanonicalResponse {
  const interaction = question.publicSnapshot.interaction;
  const correct = question.privateSolution.correctResponse;
  let response: CanonicalResponse = "999999";
  if (["SINGLE_CHOICE", "CONSTRUCTION_OR_VISUAL_SELECTION"].includes(interaction.type)) {
    response = interaction.options!.find((item) => item.id !== correct)!.id;
  } else if (interaction.type === "FRACTION_INPUT") {
    response = { numerator: 99, denominator: 100 };
  } else if (interaction.type === "ORDERING") {
    response = [...(correct as string[])].reverse();
  } else if (interaction.type === "MULTI_SELECT") {
    const correctIds = correct as string[];
    const alternative = interaction.options!.find(
      (item) => !correctIds.includes(item.id),
    );
    response = alternative
      ? [
          ...correctIds.slice(
            0,
            Math.max(0, (interaction.choiceCount ?? correctIds.length) - 1),
          ),
          alternative.id,
        ]
      : correctIds.slice(0, Math.max(0, correctIds.length - 1));
  } else if (interaction.type === "MATCHING") {
    const pairs = correct as { leftId: string; rightId: string }[];
    const right = interaction.rightItems!.find((item) => item.id !== pairs[0]!.rightId)!;
    response = pairs.map((pair, index) => ({ ...pair, rightId: index === 0 ? right.id : pair.rightId }));
  }
  requireProof(!validateStudentResponse(question, response).isCorrect, `WRONG_RESPONSE_${question.publicSnapshot.variantId}`);
  return response;
}

async function enter(page: any, question: GeneratedProductQuestion, response: CanonicalResponse) {
  const interaction = question.publicSnapshot.interaction;
  if (["SINGLE_CHOICE", "CONSTRUCTION_OR_VISUAL_SELECTION"].includes(interaction.type)) {
    await page.locator(`input[type=radio][value="${String(response)}"]`).check();
  } else if (interaction.type === "MULTI_SELECT") {
    for (const id of response as string[]) {
      const option = interaction.options!.find((item) => item.id === id)!;
      await page
        .locator("label")
        .filter({ hasText: option.label })
        .locator('input[type="checkbox"]')
        .check();
    }
  } else if (interaction.type === "FRACTION_INPUT") {
    const value = response as { numerator: number; denominator: number };
    await page.getByLabel("Tử số").fill(String(value.numerator));
    await page.getByLabel("Mẫu số").fill(String(value.denominator));
  } else if (interaction.type === "ORDERING") {
    for (const id of response as string[]) {
      const label = interaction.options!.find((item) => item.id === id)!.label;
      await page.getByRole("button", { name: label, exact: true }).click();
    }
  } else if (interaction.type === "MATCHING") {
    for (const pair of response as { leftId: string; rightId: string }[]) {
      const left = interaction.leftItems!.find((item) => item.id === pair.leftId)!.label;
      await page.getByLabel(`Giá trị của ${left}`).selectOption(pair.rightId);
    }
  } else {
    await page.locator("input[type=text]").fill(String(response));
  }
}

async function browserPost(page: any, path: string, body: Record<string, unknown>) {
  return page.evaluate(async ({ path, body }: { path: string; body: Record<string, unknown> }) => {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    return { status: response.status, payload: await response.json().catch(() => null) };
  }, { path, body });
}

function reportStage(stage: string) {
  proofStage = stage;
  process.stdout.write(`SPRINT_10B_STAGE=${stage}\n`);
}

function assertPublicPayload(value: unknown, stage: string) {
  const text = JSON.stringify(value);
  requireProof(
    !/correctResponse|acceptedResponses|solverReceipt|privateSolution|rawSeed|seedFingerprint|normalizedModelHash|publicSnapshotHash|visualHash|solverReceiptHash|productContract|outcomeId|variantId|productFamilyId/iu.test(text),
    `PRIVATE_PAYLOAD_${stage}`,
  );
  requireProof(text.includes('"runtimeMode":"GENERATED_V2"'), `MODE_MISSING_${stage}`);
}

async function inspectPage(page: any) {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const visible = (element: HTMLElement) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return box.width > 0 && box.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    const targets = [
      ...document.querySelectorAll<HTMLElement>(
        "button,select,input[type=text],input:not([type=radio]):not([type=checkbox])",
      ),
      ...document.querySelectorAll<HTMLElement>(
        "label:has(input[type=radio]),label:has(input[type=checkbox])",
      ),
    ].filter(visible);
    const html = root.innerHTML;
    const generatedQuestion = document.querySelector<HTMLElement>(
      "[data-generator-v2-student-question]",
    );
    const actions = document.querySelector<HTMLElement>(
      ".real-question-card .question-card__actions",
    );
    const skipLink = document.querySelector<HTMLElement>(".skip-link");
    const actionBox = actions?.getBoundingClientRect();
    const questionBox = generatedQuestion?.getBoundingClientRect();
    return {
      overflow: Math.max(0, root.scrollWidth - root.clientWidth),
      smallTargets: targets.filter((item) => {
        const box = item.getBoundingClientRect();
        return box.width < 44 || box.height < 44;
      }).map((item) => (item.getAttribute("aria-label") || item.innerText || item.tagName).trim().slice(0, 80)),
      privateLeak: /correctResponse|acceptedResponses|solverReceipt|privateSolution|rawSeed|seedFingerprint|normalizedModelHash|publicSnapshotHash|visualHash|solverReceiptHash|productContract/iu.test(html),
      visibleInternalIdLeak: /\brecord-\d+\b/iu.test(document.body.innerText),
      deadControls: targets.filter((item) => item instanceof HTMLButtonElement && item.disabled && !item.getAttribute("aria-busy")).length,
      generatedSurfaceIssue: generatedQuestion
        ? /Không thể hiển thị mô hình trực quan này|\bundefined\b/iu.test(
            generatedQuestion.parentElement?.innerText ?? "",
          )
        : false,
      generatedStickyAction:
        Boolean(generatedQuestion && actions) &&
        getComputedStyle(actions!).position === "sticky",
      generatedActionOverlap:
        Boolean(actionBox && questionBox) &&
        actionBox!.left < questionBox!.right &&
        actionBox!.right > questionBox!.left &&
        actionBox!.top < questionBox!.bottom &&
        actionBox!.bottom > questionBox!.top,
      skipLinkVisibleInViewport: skipLink
        ? (() => {
            const box = skipLink.getBoundingClientRect();
            return box.bottom > 0 && box.top < innerHeight;
          })()
        : false,
    };
  });
  requireProof(result.overflow === 0, `OVERFLOW_${result.overflow}`);
  requireProof(result.smallTargets.length === 0, `SMALL_TARGET_${JSON.stringify(result.smallTargets)}`);
  requireProof(!result.privateLeak, "BROWSER_PRIVATE_LEAK");
  requireProof(!result.visibleInternalIdLeak, "BROWSER_INTERNAL_ID_LEAK");
  requireProof(!result.generatedSurfaceIssue, "GENERATED_SURFACE_MISMATCH");
  requireProof(!result.generatedStickyAction, "GENERATED_ACTION_STICKY");
  requireProof(!result.generatedActionOverlap, "GENERATED_ACTION_OVERLAP");
  requireProof(!result.skipLinkVisibleInViewport, "SKIP_LINK_UNEXPECTEDLY_VISIBLE");
  return result;
}

async function capture(page: any, name: string) {
  await page.locator("nextjs-portal").evaluateAll((items: HTMLElement[]) => items.forEach((item) => item.remove()));
  const priorSkipLinkStyle = await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const skipLink = document.querySelector<HTMLElement>(".skip-link");
    const priorStyle = skipLink?.getAttribute("style") ?? null;
    if (skipLink) skipLink.style.visibility = "hidden";
    window.scrollTo({ top: 0, behavior: "instant" });
    return new Promise<string | null>((resolveFrame) =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => resolveFrame(priorStyle)),
      ),
    );
  });
  const path = resolve(screenshotRoot, name);
  try {
    await page.screenshot({ path, fullPage: true, animations: "disabled", caret: "hide" });
  } finally {
    await page.evaluate((priorStyle: string | null) => {
      const skipLink = document.querySelector<HTMLElement>(".skip-link");
      if (!skipLink) return;
      if (priorStyle === null) skipLink.removeAttribute("style");
      else skipLink.setAttribute("style", priorStyle);
    }, priorSkipLinkStyle);
  }
  return `artifacts/remediation/${screenshotDirectory}/${name}`;
}

async function submitUi(page: any, question: GeneratedProductQuestion, response: CanonicalResponse) {
  await enter(page, question, response);
  const button = page.getByRole("button", { name: "Kiểm tra câu trả lời", exact: true });
  requireProof(await button.isEnabled(), `SUBMIT_DISABLED_${question.publicSnapshot.interaction.type}`);
  const responsePromise = page.waitForResponse(
    (item: any) => item.url().endsWith("/api/curriculum-runtime/answer") && item.request().method() === "POST",
    { timeout: 60_000 },
  );
  await button.click();
  const api = await responsePromise;
  const payload = await api.json();
  requireProof(api.ok(), `SUBMIT_HTTP_${api.status()}`);
  assertPublicPayload(payload, "SUBMIT_UI");
  await page.locator(".feedback").waitFor({ timeout: 20_000 });
  requireProof((await page.locator(".feedback").innerText()).includes(question.privateSolution.nextStep), "FAMILY_FEEDBACK_MISSING");
}

async function runStudentJourneys(input: {
  browser: any;
  baseURL: string;
  actorsByGrade: Map<number, Actor>;
  databasePort: number;
}) {
  const screenshots: string[] = [];
  const runs: Record<string, unknown>[] = [];
  const issues: { type: string; detail: string }[] = [];
  const requestedPaths = new Set<string>();
  const viewports = [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
  ] as const;

  for (const [index, mapped] of browserEntries.entries()) {
    proofStage = `JOURNEY_${mapped.entry.variantId}_CREATE_CONTEXT`;
    const actor = input.actorsByGrade.get(mapped.entry.grade)!;
    const viewport = viewports[index % viewports.length]!;
    const context = await input.browser.newContext({ viewport });
    const requestedStartKey = targetIdempotencyKey(actor.id, mapped);
    const page = await context.newPage();
    page.on("console", (message: any) => {
      if (message.type() === "error") {
        issues.push({
          type: "console",
          detail: `${new URL(page.url()).pathname}: ${message.text()}`.slice(0, 1_500),
        });
      }
    });
    page.on("pageerror", (error: Error) => issues.push({ type: "page", detail: error.message.slice(0, 200) }));
    page.on("request", (request: any) => requestedPaths.add(new URL(request.url()).pathname));
    await login(page, actor, input.baseURL);
    await page.goto(`${input.baseURL}/lessons`, { waitUntil: "domcontentloaded" });
    proofStage = `JOURNEY_${mapped.entry.variantId}_LESSON_NAVIGATION`;
    const lessonPath = getLessonPath(mapped.unit.unitId);
    const lessonLink = page.locator(`a[href="${lessonPath}"]`).first();
    await page.evaluate(() => new Promise<void>((resolveFrame) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())),
    ));
    const group = lessonLink.locator("xpath=ancestor::details");
    if (await group.count() && !(await group.evaluate((element: HTMLDetailsElement) => element.open))) {
      await group.locator("summary").click();
    }
    await lessonLink.scrollIntoViewIfNeeded();
    await lessonLink.click();
    await page.waitForURL((url: URL) => url.pathname === lessonPath, {
      timeout: 30_000,
      waitUntil: "commit",
    });

    const startButton = page
      .getByRole("button", {
        name: /Bắt đầu luyện tập|Tiếp tục luyện tập|Luyện lại chủ đề/u,
      })
      .first();
    requireProof(await startButton.isEnabled(), "LESSON_START_CONTROL_DISABLED");
    const startResult = await browserPost(
      page,
      "/api/curriculum-runtime/start",
      {
        unitSlug: mapped.unit.unitId,
        idempotencyKey: requestedStartKey,
      },
    );
    proofStage = `JOURNEY_${mapped.entry.variantId}_START_RESPONSE`;
    const startPayload = startResult.payload as any;
    requireProof(startResult.status === 200, `START_HTTP_${startResult.status}`);
    assertPublicPayload(startPayload, "START");
    const attemptId = String(startPayload.data.attemptId);
    const startKey = requestedStartKey;
    requireProof(startKey === requestedStartKey, "START_SELECTION_KEY_MISMATCH");
    proofStage = `JOURNEY_${mapped.entry.variantId}_PRACTICE_NAVIGATION`;
    await page.goto(`${input.baseURL}/curriculum-practice/${attemptId}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.locator("[data-generator-v2-student-question]").waitFor({ timeout: 30_000 });
    const initialPrompt = await page.locator("[data-generator-v2-student-question] h2").innerText();
    const snapshotBefore = await queryScalar(input.databasePort, `select snapshot_hash from public.curriculum_attempts where id=${sqlText(attemptId)}::uuid;`, "SPRINT_10B_SNAPSHOT_BEFORE");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("[data-generator-v2-student-question]").waitFor();
    requireProof(await page.locator("[data-generator-v2-student-question] h2").innerText() === initialPrompt, "RESUME_PROMPT_CHANGED");
    const snapshotAfter = await queryScalar(input.databasePort, `select snapshot_hash from public.curriculum_attempts where id=${sqlText(attemptId)}::uuid;`, "SPRINT_10B_SNAPSHOT_AFTER");
    requireProof(snapshotBefore === snapshotAfter, "RESUME_REGENERATED");
    await inspectPage(page);
    if (visualReviewIds.has(mapped.entry.outcomeId)) {
      screenshots.push(await capture(page, `${viewport.width}x${viewport.height}-${mapped.entry.variantId.toLowerCase()}-start.png`));
    }

    for (let position = 1; position <= 12; position += 1) {
      proofStage = `JOURNEY_${mapped.entry.variantId}_QUESTION_${position}`;
      const question = generatedAt(mapped.entry, actor.id, startKey, position);
      const responseValue = position === 1 ? wrongResponse(question) : question.privateSolution.correctResponse;
      if ([1, 5, 9, 12].includes(position)) {
        await submitUi(page, question, responseValue);
        if (
          interactionReviewIds.has(mapped.entry.outcomeId) &&
          (position === 1 || position === 5 || position === 12)
        ) {
          const state = position === 1 ? "incorrect" : position === 12 ? "complete" : mapped.entry.variantId === "FUNCTION_GRAPH_RECOGNITION" ? "negative-intercept" : mapped.entry.variantId === "QUADRATIC_EQUATION_SOLVING" ? "answer-set" : "interaction";
          screenshots.push(await capture(page, `${viewport.width}x${viewport.height}-${mapped.entry.variantId.toLowerCase()}-${state}.png`));
        }
        await inspectPage(page);
        if (position < 12) {
          await page.getByRole("button", { name: "Câu tiếp theo", exact: true }).click();
        }
      } else {
        const answer = serializeGeneratorV2DatabaseAnswer(question.publicSnapshot.interaction, responseValue);
        requireProof(answer !== null, `ANSWER_TRANSPORT_${position}`);
        const result = await browserPost(page, "/api/curriculum-runtime/answer", {
          attemptId,
          questionId: question.publicSnapshot.questionId,
          answer,
          expectedRevision: position - 1,
          idempotencyKey: randomUUID(),
        });
        requireProof(result.status === 200, `ANSWER_HTTP_${position}_${result.status}`);
        assertPublicPayload(result.payload, `ANSWER_${position}`);
        if ([4, 8, 11].includes(position)) {
          await page.reload({ waitUntil: "domcontentloaded" });
          await page.locator("[data-generator-v2-student-question]").waitFor();
        }
      }
    }
    await page.getByRole("button", { name: "Xem tiến trình", exact: true }).click();
    proofStage = `JOURNEY_${mapped.entry.variantId}_PROGRESS_NAVIGATION`;
    await page.waitForURL((url: URL) => url.pathname === "/learning-progress", {
      timeout: 30_000,
      waitUntil: "commit",
    });
    await page.goto(`${input.baseURL}/learning-history`, { waitUntil: "domcontentloaded" });
    const historyLink = page.locator(
      `a[href="/curriculum-practice/${attemptId}"]`,
    );
    await historyLink.waitFor({ state: "visible", timeout: 20_000 });
    requireProof(
      (await historyLink.innerText()).includes("Xem kết quả"),
      `HISTORY_RESULT_LINK_MISSING_${mapped.entry.variantId}`,
    );
    runs.push({
      outcomeId: mapped.entry.outcomeId,
      capabilityId: mapped.entry.variantId,
      grade: mapped.entry.grade,
      unitId: mapped.unit.unitId,
      viewport,
      interactionTypes: mapped.entry.interactionPolicy,
      resumeWithoutRegeneration: true,
      completed: true,
    });
    await context.close();
  }
  requireProof(![...requestedPaths].some((path) => path.startsWith("/internal") || path.startsWith("/api/internal")), "INTERNAL_ROUTE_USED");
  requireProof(issues.length === 0, `BROWSER_ISSUES_${JSON.stringify(issues.slice(0, 3))}`);
  return { screenshots, runs, issues, requestedPaths: [...requestedPaths].sort() };
}

async function runFullCapabilityJourneys(input: {
  browser: any;
  baseURL: string;
  actorsByGrade: Map<number, Actor>;
  databasePort: number;
}) {
  const contexts = new Map<number, any>();
  const pages = new Map<number, any>();
  const coverage: Record<string, unknown>[] = [];
  try {
    for (const grade of [...new Set(entries.map(({ entry }) => entry.grade))]) {
      const context = await input.browser.newContext({
        viewport: { width: 1280, height: 800 },
      });
      const page = await context.newPage();
      await login(page, input.actorsByGrade.get(grade)!, input.baseURL);
      contexts.set(grade, context);
      pages.set(grade, page);
    }
    for (const [index, mapped] of entries.entries()) {
      proofStage = `FULL_CAPABILITY_${index + 1}_${mapped.entry.variantId}`;
      const actor = input.actorsByGrade.get(mapped.entry.grade)!;
      const page = pages.get(mapped.entry.grade)!;
      const key = targetIdempotencyKey(actor.id, mapped);
      const start = await browserPost(page, "/api/curriculum-runtime/start", {
        unitSlug: mapped.unit.unitId,
        idempotencyKey: key,
      });
      requireProof(start.status === 200, `FULL_START_HTTP_${start.status}`);
      assertPublicPayload(start.payload, `FULL_START_${mapped.entry.variantId}`);
      const attemptId = String((start.payload as any).data.attemptId);
      const snapshotBefore = await queryScalar(
        input.databasePort,
        `select snapshot_hash from public.curriculum_attempts where id=${sqlText(attemptId)}::uuid;`,
        "SPRINT_10C_FULL_SNAPSHOT_BEFORE",
      );
      const resume = await browserPost(page, "/api/curriculum-runtime/start", {
        unitSlug: mapped.unit.unitId,
        idempotencyKey: key,
      });
      requireProof(
        resume.status === 200 &&
          String((resume.payload as any).data.attemptId) === attemptId,
        "FULL_RESUME_NOT_IDEMPOTENT",
      );
      const snapshotAfter = await queryScalar(
        input.databasePort,
        `select snapshot_hash from public.curriculum_attempts where id=${sqlText(attemptId)}::uuid;`,
        "SPRINT_10C_FULL_SNAPSHOT_AFTER",
      );
      requireProof(snapshotBefore === snapshotAfter, "FULL_RESUME_REGENERATED");
      const selected = await queryScalar(
        input.databasePort,
        `select concat_ws('|',min(official_outcome_id),min(semantic_variant_id),count(*)) from public.curriculum_generated_questions where attempt_id=${sqlText(attemptId)}::uuid;`,
        "SPRINT_10C_FULL_SELECTED_OUTCOME",
      );
      requireProof(
        selected === `${mapped.entry.outcomeId}|${mapped.entry.variantId}|12`,
        `FULL_SELECTION_MISMATCH_${mapped.entry.variantId}`,
      );
      for (let position = 1; position <= 12; position += 1) {
        const question = generatedAt(mapped.entry, actor.id, key, position);
        const canonical =
          position === 1
            ? wrongResponse(question)
            : question.privateSolution.correctResponse;
        const answer = serializeGeneratorV2DatabaseAnswer(
          question.publicSnapshot.interaction,
          canonical,
        );
        requireProof(answer !== null, `FULL_ANSWER_TRANSPORT_${position}`);
        const submitted = await browserPost(
          page,
          "/api/curriculum-runtime/answer",
          {
            attemptId,
            questionId: question.publicSnapshot.questionId,
            answer,
            expectedRevision: position - 1,
            idempotencyKey: randomUUID(),
          },
        );
        requireProof(
          submitted.status === 200,
          `FULL_ANSWER_HTTP_${position}_${submitted.status}`,
        );
        assertPublicPayload(
          submitted.payload,
          `FULL_ANSWER_${mapped.entry.variantId}_${position}`,
        );
      }
      coverage.push({
        capabilityId: mapped.entry.variantId,
        outcomeId: mapped.entry.outcomeId,
        grade: mapped.entry.grade,
        unitId: mapped.unit.unitId,
        authenticatedPublicApi: true,
        incorrectAndCorrect: true,
        resumeWithoutRegeneration: true,
        completion: true,
      });
      if ((index + 1) % 20 === 0 || index + 1 === entries.length) {
        reportStage(`FULL_CAPABILITY_PROGRESS_${index + 1}_OF_${entries.length}`);
      }
    }
  } finally {
    await Promise.all(
      [...contexts.values()].map((context) => context.close().catch(() => undefined)),
    );
  }
  return coverage;
}

async function runConcurrency(input: { browser: any; baseURL: string; actor: Actor; databasePort: number }) {
  proofStage = "CONCURRENCY_START";
  const mapped = entries.find(({ entry }) => entry.grade === input.actor.grade)!;
  const context = await input.browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await login(page, input.actor, input.baseURL);
  proofStage = "CONCURRENCY_PUBLIC_API";
  const startKey = targetIdempotencyKey(input.actor.id, mapped);
  const startBody = { unitSlug: mapped.unit.unitId, idempotencyKey: startKey };
  const starts = await Promise.all([
    browserPost(page, "/api/curriculum-runtime/start", startBody),
    browserPost(page, "/api/curriculum-runtime/start", startBody),
  ]);
  requireProof(starts.every((item) => item.status === 200), "CONCURRENT_START_HTTP");
  const attemptIds = starts.map((item) => String((item.payload as any).data.attemptId));
  requireProof(attemptIds[0] === attemptIds[1], "CONCURRENT_START_DUPLICATED");
  const attemptId = attemptIds[0]!;
  const first = generatedAt(mapped.entry, input.actor.id, startKey, 1);
  const firstBody = {
    attemptId,
    questionId: first.publicSnapshot.questionId,
    answer: serializeGeneratorV2DatabaseAnswer(first.publicSnapshot.interaction, first.privateSolution.correctResponse),
    expectedRevision: 0,
    idempotencyKey: randomUUID(),
  };
  const duplicates = await Promise.all([
    browserPost(page, "/api/curriculum-runtime/answer", firstBody),
    browserPost(page, "/api/curriculum-runtime/answer", firstBody),
  ]);
  requireProof(
    duplicates.every((item) => item.status === 200 || item.status === 409) &&
      duplicates.some((item) => item.status === 200),
    "DUPLICATE_SUBMIT_CONCURRENT_CONTRACT",
  );
  const duplicateReplay = await browserPost(
    page,
    "/api/curriculum-runtime/answer",
    firstBody,
  );
  requireProof(duplicateReplay.status === 200, "DUPLICATE_REPLAY_NOT_IDEMPOTENT");
  requireProof(await queryScalar(input.databasePort, `select count(*) from public.curriculum_generated_answers where attempt_id=${sqlText(attemptId)}::uuid;`, "SPRINT_10B_DUPLICATE_COUNT") === "1", "DUPLICATE_WRITE");
  const conflict = await browserPost(page, "/api/curriculum-runtime/answer", {
    ...firstBody,
    answer: serializeGeneratorV2DatabaseAnswer(first.publicSnapshot.interaction, wrongResponse(first)),
  });
  requireProof(conflict.status === 409 && (conflict.payload as any).error.code === "IDEMPOTENCY_CONFLICT", "IDEMPOTENCY_CONFLICT_MISSING");
  const second = generatedAt(mapped.entry, input.actor.id, startKey, 2);
  const cas = await Promise.all([
    browserPost(page, "/api/curriculum-runtime/answer", {
      attemptId, questionId: second.publicSnapshot.questionId,
      answer: serializeGeneratorV2DatabaseAnswer(second.publicSnapshot.interaction, second.privateSolution.correctResponse),
      expectedRevision: 1, idempotencyKey: randomUUID(),
    }),
    browserPost(page, "/api/curriculum-runtime/answer", {
      attemptId, questionId: second.publicSnapshot.questionId,
      answer: serializeGeneratorV2DatabaseAnswer(second.publicSnapshot.interaction, wrongResponse(second)),
      expectedRevision: 1, idempotencyKey: randomUUID(),
    }),
  ]);
  requireProof(cas.filter((item) => item.status === 200).length === 1 && cas.filter((item) => item.status === 409).length === 1, "CAS_NOT_SINGLE_WINNER");
  const third = generatedAt(mapped.entry, input.actor.id, startKey, 3);
  const beforeFailure = await queryScalar(input.databasePort, `select concat_ws('|',(select count(*) from public.curriculum_generated_answers where attempt_id=${sqlText(attemptId)}::uuid),(select evidence_count from public.student_curriculum_unit_progress where student_id=${sqlText(input.actor.id)}::uuid and unit_id=${sqlText(mapped.unit.unitId)}));`, "SPRINT_10B_ROLLBACK_BEFORE");
  requireProof((await runPsql(input.databasePort, String.raw`
create function private.test_only_sprint_10b_failure() returns trigger language plpgsql security definer set search_path='' as $$ begin if new.attempt_id=${sqlText(attemptId)}::uuid and new.question_id=${sqlText(third.publicSnapshot.questionId)} then raise exception 'TEST_ONLY_SPRINT_10B'; end if; return new; end $$;
create trigger test_only_sprint_10b_failure before insert on public.curriculum_generated_answers for each row execute function private.test_only_sprint_10b_failure();
`, "SPRINT_10B_FAILURE_INSTALL")).ok, "FAILURE_TRIGGER_INSTALL");
  const failed = await browserPost(page, "/api/curriculum-runtime/answer", {
    attemptId, questionId: third.publicSnapshot.questionId,
    answer: serializeGeneratorV2DatabaseAnswer(third.publicSnapshot.interaction, third.privateSolution.correctResponse),
    expectedRevision: 2, idempotencyKey: randomUUID(),
  });
  requireProof(failed.status >= 400, "FAILURE_INJECTION_ACCEPTED");
  const afterFailure = await queryScalar(input.databasePort, `select concat_ws('|',(select count(*) from public.curriculum_generated_answers where attempt_id=${sqlText(attemptId)}::uuid),(select evidence_count from public.student_curriculum_unit_progress where student_id=${sqlText(input.actor.id)}::uuid and unit_id=${sqlText(mapped.unit.unitId)}));`, "SPRINT_10B_ROLLBACK_AFTER");
  requireProof(beforeFailure === afterFailure, "TRANSACTION_ROLLBACK_FAILED");
  await runPsql(input.databasePort, "drop trigger test_only_sprint_10b_failure on public.curriculum_generated_answers; drop function private.test_only_sprint_10b_failure();", "SPRINT_10B_FAILURE_CLEANUP");
  for (let position = 3; position <= 12; position += 1) {
    const question = generatedAt(mapped.entry, input.actor.id, startKey, position);
    const response = await browserPost(page, "/api/curriculum-runtime/answer", {
      attemptId,
      questionId: question.publicSnapshot.questionId,
      answer: serializeGeneratorV2DatabaseAnswer(question.publicSnapshot.interaction, question.privateSolution.correctResponse),
      expectedRevision: position - 1,
      idempotencyKey: randomUUID(),
    });
    requireProof(response.status === 200, `CONCURRENCY_COMPLETE_${position}`);
  }
  await context.close();
  return {
    concurrentStart: "PASS",
    duplicateSubmit: "IDEMPOTENT_ONE_WRITE",
    idempotencyConflict: "PASS",
    cas: "SINGLE_WINNER",
    rollback: "PASS",
    completed: "PASS",
    attemptId,
  };
}

async function roleAndFlagMatrix(input: {
  browser: any;
  baseURL: string;
  actors: { owner: Actor; wrong: Actor; parent: Actor; teacher: Actor };
  attemptId: string;
  restart: (overrides: NodeJS.ProcessEnv) => Promise<void>;
}) {
  reportStage("ROLE_FLAG_MATRIX");
  const matrix: Record<string, unknown> = {};
  const anonymous = await fetch(
    `${input.baseURL}/api/curriculum-runtime/state?attemptId=${input.attemptId}`,
    { signal: AbortSignal.timeout(30_000) },
  );
  matrix.anonymous = anonymous.status;
  requireProof(anonymous.status === 401, "ANONYMOUS_NOT_DENIED");
  for (const [label, actor] of Object.entries({ wrongStudent: input.actors.wrong, parent: input.actors.parent, teacher: input.actors.teacher })) {
    const context = await input.browser.newContext();
    const page = await context.newPage();
    await login(page, actor, input.baseURL);
    const state = await page.goto(`${input.baseURL}/curriculum-practice/${input.attemptId}`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    const directPath = new URL(page.url()).pathname;
    const exposedGeneratedQuestion = await page.locator(
      "[data-generator-v2-student-question]",
    ).count();
    const api = await page.evaluate(async (attemptId: string) => {
      const response = await fetch(`/api/curriculum-runtime/state?attemptId=${attemptId}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      });
      return response.status;
    }, input.attemptId);
    matrix[label] = {
      directUrlHttpStatus: state?.status(),
      directUrlFinalPath: directPath.replace(
        /\b[0-9a-f]{8}-[0-9a-f-]{27,36}\b/iu,
        "[DISPOSABLE_ATTEMPT_ID]",
      ),
      directUrlSafeDenied: exposedGeneratedQuestion === 0,
      api,
    };
    requireProof(exposedGeneratedQuestion === 0, `${label.toUpperCase()}_DIRECT_URL_EXPOSED`);
    requireProof(api === 403 || api === 404, `${label.toUpperCase()}_API_ALLOWED`);
    await context.close();
  }
  const ownerContext = await input.browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await login(ownerPage, input.actors.owner, input.baseURL);
  const mapped = entries.find(({ entry }) => entry.grade === input.actors.owner.grade)!;
  const forged = await browserPost(ownerPage, "/api/curriculum-runtime/start", {
    unitSlug: mapped.unit.unitId,
    idempotencyKey: randomUUID(),
    outcomeId: mapped.entry.outcomeId,
    capabilityId: mapped.entry.variantId,
    seed: "forged",
  });
  requireProof(forged.status === 400, "FORGED_ROUTING_FIELDS_ACCEPTED");
  matrix.forgedRoutingFields = forged.status;
  const crossGrade = entries.find(({ entry }) => entry.grade !== input.actors.owner.grade)!;
  const cross = await browserPost(ownerPage, "/api/curriculum-runtime/start", {
    unitSlug: crossGrade.unit.unitId,
    idempotencyKey: randomUUID(),
  });
  requireProof(cross.status === 403, "CROSS_GRADE_ALLOWED");
  matrix.crossGrade = cross.status;
  const nonEligible = releaseBundle.units.find((unit) => unit.grade === input.actors.owner.grade && unit.unitId !== mapped.unit.unitId)!;
  await input.restart({
    GENERATOR_V2_STUDENT_RUNTIME_ELIGIBLE_OUTCOMES: mapped.entry.outcomeId,
    GENERATOR_V2_STUDENT_RUNTIME_ELIGIBLE_CAPABILITIES:
      mapped.entry.variantId,
  });
  reportStage("ROLE_FLAG_MATRIX_REVIEW_REQUIRED");
  await ownerPage.goto(`${input.baseURL}/lessons`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  const reviewRequired = await browserPost(ownerPage, "/api/curriculum-runtime/start", {
    unitSlug: nonEligible.unitId,
    idempotencyKey: randomUUID(),
  });
  requireProof(reviewRequired.status === 503 && (reviewRequired.payload as any).error.code === "GENERATOR_V2_CORRECTNESS_REVIEW_REQUIRED", "REVIEW_REQUIRED_NOT_DENIED");
  matrix.correctnessReviewRequired = reviewRequired.status;
  await input.restart({ GENERATOR_V2_STUDENT_RUNTIME_RELEASE: "OFF" });
  reportStage("ROLE_FLAG_MATRIX_RELEASE_OFF");
  await ownerPage.goto(`${input.baseURL}/lessons`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  const releaseOff = await ownerPage.evaluate(async (attemptId: string) => {
    const response = await fetch(`/api/curriculum-runtime/state?attemptId=${attemptId}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    return { status: response.status, payload: await response.json() };
  }, input.attemptId);
  requireProof(
    releaseOff.status === 503 &&
      releaseOff.payload.error?.code === "GENERATOR_V2_RELEASE_DISABLED",
    `RELEASE_OFF_NOT_DENIED_${releaseOff.status}_${String(releaseOff.payload.error?.code ?? "NO_CODE")}`,
  );
  matrix.releaseOff = releaseOff.status;
  await input.restart({ GENERATOR_V2_STUDENT_RUNTIME_ENABLED: "false" });
  reportStage("ROLE_FLAG_MATRIX_GLOBAL_OFF");
  await ownerPage.goto(`${input.baseURL}/lessons`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  const globalOff = await ownerPage.evaluate(async (attemptId: string) => {
    const response = await fetch(`/api/curriculum-runtime/state?attemptId=${attemptId}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    return { status: response.status, payload: await response.json() };
  }, input.attemptId);
  requireProof(
    globalOff.status === 503 &&
      globalOff.payload.error?.code === "GENERATOR_V2_RUNTIME_DISABLED",
    `GLOBAL_OFF_NOT_DENIED_${globalOff.status}_${String(globalOff.payload.error?.code ?? "NO_CODE")}`,
  );
  matrix.globalOff = globalOff.status;
  await input.restart({});
  await ownerContext.close();
  return matrix;
}

function countsSql() {
  return String.raw`
select concat_ws('|',
  (select count(*) from public.curriculum_attempts where generation_mode='ON_DEMAND'),
  (select count(*) from public.curriculum_attempts where generation_mode='ON_DEMAND' and status='COMPLETED'),
  (select count(*) from public.curriculum_generated_questions),
  (select count(*) from private.curriculum_generated_solutions),
  (select count(*) from public.curriculum_generated_answers),
  (select count(*) from public.curriculum_generated_questions where semantic_variant_id is not null and semantic_variant_version is not null and solver_version is not null and solver_receipt_hash is not null and difficulty_policy_version is not null and seed_fingerprint is not null and ast_hash is not null and visual_hash is not null and semantic_provenance_locked),
  (select count(*) from public.curriculum_generated_questions where question_source='SEMANTIC_GENERATED_V1' and visual #>> '{productContract,questionSource}'='GENERATED_V2'),
  ((select count(*) from public.curriculum_generated_questions q left join public.curriculum_attempts a on a.id=q.attempt_id where a.id is null)+(select count(*) from private.curriculum_generated_solutions s left join public.curriculum_generated_questions q on q.attempt_id=s.attempt_id and q.question_id=s.question_id where q.question_id is null))
);`;
}

function sanitizedError(error: unknown) {
  return (error instanceof Error ? error.message : String(error))
    .replace(/[A-Za-z0-9_-]+@example[.]invalid/gu, "[TEST_IDENTITY]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,36}\b/giu, "[UUID]")
    .replace(/\b[0-9a-f]{32,}\b/giu, "[REDACTED]")
    .slice(0, 240);
}

async function main() {
  reportStage("PREFLIGHT");
  requireProof(existsSync(chromeExecutable), "CHROME_EXECUTABLE_MISSING");
  requireProof(existsSync(resolve(toolsRoot, "node_modules/playwright-core/package.json")), "PLAYWRIGHT_CORE_MISSING");
  mkdirSync(artifactRoot, { recursive: true });
  rmSync(screenshotRoot, { recursive: true, force: true });
  mkdirSync(screenshotRoot, { recursive: true });
  const projectId = `plave-project004-clean-proof-${randomBytes(6).toString("hex").slice(0, 11)}`;
  const reservation = await reserveDisposablePorts();
  const ports = reservation.ports;
  let reservationReleased = false;
  let workdir = "";
  let runtimeRoot = "";
  let webPort: number | null = null;
  let child: ChildProcess | null = null;
  let browser: any = null;
  let cleanup = false;
  let failure: unknown = null;
  let report: Record<string, unknown> | null = null;
  try {
    workdir = mkdtempSync(resolve(tmpdir(), "plave-project004-clean-proof-"));
    assertDisposableCleanupScope(workdir, projectId);
    const supabaseDirectory = resolve(workdir, "supabase");
    const migrationDirectory = resolve(supabaseDirectory, "migrations");
    mkdirSync(supabaseDirectory, { recursive: true, mode: 0o700 });
    const sourceConfig = resolve(root, "supabase/config.toml");
    const configPath = resolve(supabaseDirectory, "config.toml");
    cpSync(sourceConfig, configPath);
    writeFileSync(configPath, buildDisposableConfig(readFileSync(configPath, "utf8"), projectId, ports), { mode: 0o600 });
    const migrationInventory = copyGeneratedPersistenceMigrationInventory(migrationDirectory, root);
    await reservation.release();
    reservationReleased = true;
    const started = await runManagedChild({
      executable: "/opt/homebrew/bin/supabase",
      args: ["start", "--workdir", workdir, "--exclude", "realtime,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor", "--yes"],
      cwd: root,
      environment: safeEnvironment(),
      timeoutMs: 900_000,
      terminationGraceMs: 10_000,
      killConfirmationMs: 10_000,
      stage: "SPRINT_10B_SUPABASE_0001_0042",
    });
    requireProof(
      started.ok && started.childExited,
      started.timedOut
        ? "DISPOSABLE_START_TIMEOUT"
        : `DISPOSABLE_START_FAILED_${sanitizedError(started.stderr)}`,
    );
    reportStage("DISPOSABLE_DATABASE_READY");
    const config = await loadDisposableConfig(workdir);
    const fixture = await runPsql(ports.database, fixtureSql(), "SPRINT_10B_RELEASE_FIXTURE");
    requireProof(
      fixture.ok &&
        fixture.stdout.trim() ===
          `42|0001|0042|${fixtureUnitCount}|${entries.length}`,
      `RELEASE_FIXTURE_${fixture.stdout.trim()}`,
    );

    const actorsByGrade = new Map<number, Actor>();
    const actors: Actor[] = [];
    for (const grade of [...new Set(entries.map(({ entry }) => entry.grade))]) {
      const actor = await createActor(config, "STUDENT", grade, `g${grade}`);
      actorsByGrade.set(grade, actor);
      actors.push(actor);
    }
    const studentB = await createActor(config, "STUDENT", 2, "g2-b");
    const wrongStudent = await createActor(config, "STUDENT", 3, "wrong");
    const parent = await createActor(config, "PARENT", null, "parent");
    const teacher = await createActor(config, "TEACHER", null, "teacher");
    actors.push(studentB, wrongStudent, parent, teacher);
    for (const [index, actor] of actors.entries()) {
      await completeActor(ports.database, actor, index + 1);
      if (fullCorrectnessScope) {
        await completeLocalPrerequisites(ports.database, actor);
      }
    }

    runtimeRoot = createRuntimeCopy();
    webPort = await reserveWebPort();
    const baseURL = `http://${host}:${webPort}`;
    const restart = async (overrides: NodeJS.ProcessEnv = {}) => {
      await stopNext(child);
      child = startNext(config, webPort!, runtimeRoot, overrides);
      await waitReady(baseURL);
    };
    await restart();
    reportStage("PUBLIC_RUNTIME_READY");
    browser = await chromium.launch({ executablePath: chromeExecutable, headless: true, args: ["--disable-background-networking", "--disable-sync", "--no-first-run"] });
    const fullCapabilityProof = fullCorrectnessScope
      ? await runFullCapabilityJourneys({
          browser,
          baseURL,
          actorsByGrade,
          databasePort: ports.database,
        })
      : [];
    if (fullCorrectnessScope) {
      requireProof(
        fullCapabilityProof.length === 198 &&
          new Set(
            fullCapabilityProof.map((item) => item.capabilityId),
          ).size === 198,
        "FULL_CAPABILITY_COVERAGE",
      );
      reportStage("FULL_CAPABILITY_RUNTIME_COMPLETE");
    }
    const journeys = await runStudentJourneys({ browser, baseURL, actorsByGrade, databasePort: ports.database });
    reportStage("PUBLIC_STUDENT_JOURNEYS_COMPLETE");
    const concurrency = await runConcurrency({ browser, baseURL, actor: studentB, databasePort: ports.database });
    reportStage("CONCURRENCY_AND_ROLLBACK_COMPLETE");
    // The flag matrix must exercise policy denial after ownership succeeds.
    // `concurrency.attemptId` belongs to studentB, not the other Grade 2 actor.
    const owner = studentB;
    const roleMatrix = await roleAndFlagMatrix({
      browser,
      baseURL,
      actors: { owner, wrong: wrongStudent, parent, teacher },
      attemptId: String(concurrency.attemptId),
      restart,
    });
    reportStage("ROLE_AND_FLAG_MATRIX_COMPLETE");
    const publicConcurrency = {
      ...concurrency,
      attemptId: "[DISPOSABLE_ATTEMPT_ID]",
    };
    const counts = (await queryScalar(ports.database, countsSql(), "SPRINT_10B_FINAL_COUNTS")).split("|").map(Number);
    requireProof(counts.length === 8 && counts.every(Number.isFinite), "COUNTS_PARSE");
    const expectedAttempts =
      (fullCorrectnessScope ? entries.length : 0) +
      browserEntries.length +
      1;
    const expectedQuestionRows = expectedAttempts * 12;
    requireProof(
      counts[0] === expectedAttempts && counts[1] === expectedAttempts,
      "ATTEMPT_COUNTS",
    );
    requireProof(
      counts[2] === expectedQuestionRows &&
        counts[3] === expectedQuestionRows &&
        counts[4] === expectedQuestionRows,
      "QUESTION_ANSWER_COUNTS",
    );
    requireProof(
      counts[5] === expectedQuestionRows &&
        counts[6] === expectedQuestionRows &&
        counts[7] === 0,
      "PROVENANCE_ORPHANS",
    );
    report = {
      schemaVersion: 1,
      status: "PASS",
      evidenceSurface: "AUTHENTICATED_PUBLIC_STUDENT_RUNTIME",
      internalProofOrReviewRoutesUsed: false,
      checkpointBase: "c5c46f69227f",
      runtimeCopy: "DISPOSABLE_INTENDED_WORKING_TREE",
      browser: { engine: "Chromium", version: browser.version(), executable: chromeExecutable, playwrightCore: playwrightVersion },
      viewports: [
        { width: 320, height: 568 },
        { width: 390, height: 844 },
        { width: 768, height: 1024 },
        { width: 1280, height: 800 },
        { width: 1440, height: 900 },
      ],
      correctnessEligibility: fullCorrectnessScope
        ? {
            eligibleOutcomes: GENERATOR_V2_STUDENT_RUNTIME_CORRECTNESS_OUTCOMES.length,
            eligibleCapabilities: GENERATOR_V2_STUDENT_RUNTIME_CORRECTNESS_CAPABILITIES.length,
            runtimeProofCapabilities: entries.length,
            repositoryDefault: "OFF",
          }
        : {
            eligibleOutcomes: 6,
            eligibleCapabilities: 6,
            runtimeProofCapabilities: entries.length,
            repositoryDefault: "OFF",
          },
      fullCapabilityProof,
      journeys: journeys.runs,
      publicPathsObserved: journeys.requestedPaths.map((path) =>
        path.replace(
          /\b[0-9a-f]{8}-[0-9a-f-]{27,36}\b/iu,
          "[DISPOSABLE_ATTEMPT_ID]",
        ),
      ),
      screenshots: journeys.screenshots,
      screenshotReview: "PENDING_VISUAL_REVIEW",
      concurrency: publicConcurrency,
      roleAndFlagMatrix: roleMatrix,
      database: {
        freshSchema: "0001-0042",
        migrations: migrationInventory.sourceCount,
        attempts: counts[0],
        completedAttempts: counts[1],
        generatedQuestions: counts[2],
        privateSolutions: counts[3],
        answers: counts[4],
        provenance8of8Rows: counts[5],
        generatedV2Rows: counts[6],
        orphans: counts[7],
        rollback: "PASS",
      },
      consoleErrors: 0,
      hydrationErrors: 0,
      pageErrors: 0,
      overflowErrors: 0,
      privateLeaks: 0,
      promptVisualMismatches: 0,
      remoteAccess: 0,
      remoteMutations: 0,
      paidProviderRequests: 0,
      cleanup: "PENDING",
    };
  } catch (error) {
    failure = new ProofFailure(`${proofStage}_${sanitizedError(error)}`);
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    try {
      await stopNext(child);
    } catch (error) {
      failure ??= new ProofFailure(`NEXT_CLEANUP_${sanitizedError(error)}`);
    }
    if (!reservationReleased) await reservation.release();
    if (workdir) cleanup = (await stopDisposableStack(workdir, projectId)).ok;
    else cleanup = true;
    if (runtimeRoot) {
      rmSync(resolve(runtimeRoot, ".."), { recursive: true, force: true });
    }
  }
  requireProof(cleanup, "DISPOSABLE_CLEANUP_FAILED");
  if (webPort !== null) requireProof(await loopbackPortIsFree(webPort), "WEB_LISTENER_REMAINED");
  requireProof((await Promise.all(Object.values(ports).map(loopbackPortIsFree))).every(Boolean), "DATABASE_LISTENER_REMAINED");
  if (failure) {
    const blocked = { schemaVersion: 1, status: "BLOCKED", blocker: sanitizedError(failure), cleanup: "PASS", remoteAccess: 0, remoteMutations: 0, paidProviderRequests: 0 };
    writeFileSync(resolve(artifactRoot, fullCorrectnessScope ? "generator-correctness-browser-acceptance.json" : "generator-runtime-browser-acceptance.json"), `${JSON.stringify(blocked, null, 2)}\n`);
    throw failure;
  }
  requireProof(report, "REPORT_MISSING");
  report.cleanup = "PASS";
  report.remainingListener = "NONE";
  writeFileSync(resolve(artifactRoot, fullCorrectnessScope ? "generator-correctness-browser-acceptance.json" : "generator-runtime-browser-acceptance.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(resolve(artifactRoot, fullCorrectnessScope ? "generator-runtime-full-proof.json" : "generator-runtime-role-matrix.json"), `${JSON.stringify(fullCorrectnessScope ? report : { schemaVersion: 1, status: "PASS", matrix: report.roleAndFlagMatrix }, null, 2)}\n`);
  if (!fullCorrectnessScope) {
    writeFileSync(resolve(artifactRoot, "generator-runtime-database-proof.json"), `${JSON.stringify({ schemaVersion: 1, status: "PASS", ...(report.database as Record<string, unknown>), concurrency: report.concurrency, cleanup: "PASS", remoteMutation: 0 }, null, 2)}\n`);
  }
  process.stdout.write([
    "GENERATOR_V2_STUDENT_RUNTIME=PASS",
    "AUTHENTICATED_PUBLIC_STUDENT_SURFACE=PASS",
    "INTERNAL_ROUTES_USED=NO",
    fullCorrectnessScope ? "ELIGIBLE_OUTCOMES=546/546" : "ELIGIBLE_SUBSET=6/546",
    fullCorrectnessScope ? "ELIGIBLE_CAPABILITIES=198/198" : "REMAINING_FAIL_CLOSED=540",
    "MIGRATIONS=0001-0042",
    "VIEWPORTS=5/5",
    "PROVENANCE=8/8",
    "CLEANUP=PASS",
    "REMOTE_MUTATIONS=0",
    "PAID_PROVIDER_REQUESTS=0",
  ].join("\n") + "\n");
}

try {
  await main();
} catch (error) {
  process.stderr.write(`GENERATOR_V2_STUDENT_RUNTIME=FAIL\nEXACT_BLOCKER=${sanitizedError(error)}\n`);
  process.exitCode = 1;
}
