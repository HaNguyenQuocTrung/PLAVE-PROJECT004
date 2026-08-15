import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const image = process.argv[2];
assert.ok(image && /^[a-z0-9][a-z0-9./:_@-]{0,199}$/u.test(image));

function docker(args: string[]) {
  const result = spawnSync("docker", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.equal(result.status, 0, "DOCKER_IMAGE_INSPECTION_FAILED");
  return result.stdout;
}

const inspection = JSON.parse(docker(["image", "inspect", image])) as Array<{
  Config: {
    User: string;
    WorkingDir: string;
    Entrypoint: string[] | null;
    Cmd: string[] | null;
    Env: string[];
    ExposedPorts?: Record<string, object>;
    Healthcheck?: { Test?: string[] };
    Labels?: Record<string, string>;
  };
}>;
assert.equal(inspection.length, 1);
const config = inspection[0]!.Config;
assert.equal(config.User, "1000:1000");
assert.equal(config.WorkingDir, "/app");
assert.deepEqual(config.Entrypoint ?? [], []);
assert.deepEqual(config.Cmd, ["node", "server.js"]);
assert.ok(config.ExposedPorts?.["3000/tcp"]);
assert.match((config.Healthcheck?.Test ?? []).join(" "), /127[.]0[.]0[.]1:3000\/api\/health\/live/u);

const permittedRuntimeEnvironment = new Set([
  "NODE_ENV=production",
  "NEXT_TELEMETRY_DISABLED=1",
  "HOSTNAME=0.0.0.0",
  "PORT=3000",
]);
for (const entry of config.Env) {
  if (/^(?:PATH|NODE_VERSION|YARN_VERSION)=/u.test(entry)) continue;
  assert.equal(permittedRuntimeEnvironment.has(entry), true, `UNEXPECTED_IMAGE_ENVIRONMENT_NAME=${entry.split("=", 1)[0]}`);
}
const labels = JSON.stringify(config.Labels ?? {});
assert.doesNotMatch(labels, /\/Users\/|\/private\/tmp|email|uuid|password|token/iu);

const history = docker(["history", "--no-trunc", "--format", "{{.CreatedBy}}", image]);
assert.doesNotMatch(history, /GOOGLE_API_KEY|OPENAI_API_KEY|SERVICE_ROLE|DATABASE_PASSWORD|SUPABASE_PASSWORD/iu);
assert.doesNotMatch(history, /(?:supabase|prisma|database).*(?:migrate|seed)|(?:migrate|seed).*(?:supabase|prisma|database)/iu);

process.stdout.write("DOCKER_IMAGE_METADATA=PASS user=1000:1000 workdir=/app port=3000\n");
