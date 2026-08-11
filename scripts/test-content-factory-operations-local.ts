import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const container = `plave-content-factory-${randomBytes(6).toString("hex")}`;
function docker(args: readonly string[], input?: string, allowFailure = false) {
  const result = spawnSync("docker", [...args], { encoding: "utf8", input, env: { ...process.env } });
  if (!allowFailure && result.status !== 0) {
    const diagnostic = result.stderr.trim().split("\n").slice(-2).join(" | ").replace(/[\r\n]+/gu, " ");
    throw new Error(`LOCAL_OPERATION_PROOF_FAILED:${args[0]}:${diagnostic}`);
  }
  return result;
}
const imageRows = docker(["image", "ls", "--no-trunc", "--format", "{{.ID}} {{.Repository}}:{{.Tag}}"]);
const imageId = imageRows.stdout.split("\n").find((row) => row.endsWith(" postgres:16-alpine"))?.split(" ")[0];
if (!imageId?.startsWith("sha256:")) throw new Error("LOCAL_POSTGRES_16_IMAGE_NOT_AVAILABLE");
const variables = ["-v", "grade=4", "-v", "unit_slug=fixture-grade-4-candidate", "-v", "candidate_id=fixture-grade-4-candidate-rc1", "-v", "candidate_version=fixture-1.0.0", "-v", "bundle_hash=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "-v", "policy_version=fixture-policy-1.0.0"];
try {
  docker(["run", "--detach", "--pull=never", "--network=none", "--tmpfs", "/var/lib/postgresql/data", "--name", container, "-e", "POSTGRES_PASSWORD=fixture-only", imageId]);
  let consecutiveReady = 0;
  for (let attempt = 0; attempt < 80 && consecutiveReady < 3; attempt += 1) {
    consecutiveReady = docker(["exec", container, "pg_isready", "-U", "postgres"], undefined, true).status === 0 ? consecutiveReady + 1 : 0;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
  if (consecutiveReady < 3) throw new Error("LOCAL_POSTGRES_NOT_READY");
  const psql = ["exec", "-i", container, "psql", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-U", "postgres"];
  docker(psql, readFileSync("tests/fixtures/content-factory-operations-schema.sql", "utf8"));
  docker([...psql, ...variables], readFileSync("supabase/operations/candidate-controlled-pilot/ACTIVATE_CANDIDATE.sql", "utf8"));
  const stateSql = "select (runtime_enabled::int)::text || (controlled_pilot_enabled::int)::text || (retention_runtime_enabled::int)::text from public.adaptive_practice_releases";
  const active = docker([...psql, "-Atc", stateSql]).stdout.trim();
  if (active !== "110") throw new Error("LOCAL_ACTIVATION_POSTCONDITION_FAILED");
  docker([...psql, ...variables, "-v", "resume_policy=PAUSE_RESUME_PRESERVE_HISTORY"], readFileSync("supabase/operations/candidate-controlled-pilot/DEACTIVATE_CANDIDATE.sql", "utf8"));
  const inactive = docker([...psql, "-Atc", stateSql]).stdout.trim();
  if (inactive !== "000") throw new Error("LOCAL_DEACTIVATION_POSTCONDITION_FAILED");
  const activation = readFileSync("supabase/operations/candidate-controlled-pilot/ACTIVATE_CANDIDATE.sql", "utf8");
  const forcedFailure = activation.replace(/commit;\s*$/u, "select 1 / 0;\ncommit;\n");
  if (forcedFailure === activation || docker([...psql, ...variables], forcedFailure, true).status === 0) throw new Error("LOCAL_FORCED_FAILURE_NOT_TRIGGERED");
  const rollback = docker([...psql, "-Atc", stateSql]).stdout.trim();
  if (rollback !== "000") throw new Error("LOCAL_OPERATION_ROLLBACK_FAILED");
  console.log("CONTENT_FACTORY_OPERATIONS_LOCAL activation=PASS deactivation=PASS rollback=PASS publishedPorts=0");
} finally {
  docker(["rm", "--force", container], undefined, true);
}
