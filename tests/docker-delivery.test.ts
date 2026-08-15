import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("Dockerfile is pinned, multi-stage, standalone and non-root", () => {
  const source = read("Dockerfile");
  const fromLines = [...source.matchAll(/^FROM (\S+) AS /gmu)].map((match) => match[1]);
  assert.equal(fromLines.length, 3);
  assert.equal(new Set(fromLines).size, 1);
  assert.match(fromLines[0] ?? "", /node:22[.]16[.]0-bookworm-slim@sha256:[0-9a-f]{64}/u);
  assert.equal([...source.matchAll(/^FROM /gmu)].length, 3);
  assert.doesNotMatch(source, /:latest\b/u);
  assert.match(source, /npm ci --ignore-scripts --no-audit --no-fund/u);
  assert.match(source, /COPY --from=builder[\s\S]*[.]next\/standalone/u);
  assert.match(source, /^USER 1000:1000$/mu);
  assert.match(source, /^WORKDIR \/app$/mu);
  assert.match(source, /^EXPOSE 3000$/mu);
  assert.match(source, /^ENTRYPOINT \[\]$/mu);
  assert.match(source, /^CMD \["node", "server[.]js"\]$/mu);
  assert.match(source, /HEALTHCHECK[\s\S]*127[.]0[.]0[.]1:3000\/api\/health\/live/u);
  assert.doesNotMatch(source, /ARG\s+(?:GOOGLE|OPENAI|.*SECRET|.*PASSWORD|.*TOKEN|.*SERVICE_ROLE)/iu);
  assert.doesNotMatch(source, /(?:supabase|prisma|database).*(?:migrate|seed)|(?:migrate|seed).*(?:supabase|prisma|database)/iu);
  assert.doesNotMatch(source, /apt-get|apk add|sudo|privileged|docker[.]sock/iu);

  const nextConfig = read("next.config.ts");
  assert.match(nextConfig, /PLAVE_DOCKER_BUILD/u);
  assert.match(nextConfig, /output: "standalone"/u);
  assert.match(nextConfig, /productionBrowserSourceMaps: false/u);
});

test("Docker build context excludes private and development-only material", () => {
  const source = read(".dockerignore");
  for (const pattern of [
    ".git",
    ".github",
    ".next",
    "node_modules",
    "coverage",
    "tests",
    "docs/*",
    "artifacts",
    ".env",
    ".env.*",
    "*.dump",
    "*.backup",
  ]) assert.match(source, new RegExp(`^${pattern.replaceAll(".", "[.]").replaceAll("*", ".*")}$`, "mu"), pattern);
  assert.match(source, /^![.]env[.]example$/mu);
  assert.match(source, /^![.]env[.]docker[.]example$/mu);
  assert.match(source, /^!supabase\/config[.]toml$/mu);
  assert.match(source, /^!docs\/curriculum\/GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS[.]json$/mu);
});

test("Compose is application-only, loopback-bound and hardened", () => {
  const source = read("compose.yaml");
  assert.match(source, /127[.]0[.]0[.]1:3100:3000/u);
  assert.doesNotMatch(source, /(?:^|\s)(?:postgres|db|database|supabase):\s*$/mu);
  assert.doesNotMatch(source, /0[.]0[.]0[.]0:|host_network|network_mode:\s*host|docker[.]sock|privileged:\s*true/iu);
  assert.match(source, /init:\s*true/u);
  assert.match(source, /user:\s*"1000:1000"/u);
  assert.match(source, /pull_policy:\s*never/u);
  assert.match(source, /restart:\s*unless-stopped/u);
  assert.match(source, /read_only:\s*true/u);
  assert.match(source, /no-new-privileges:true/u);
  assert.match(source, /cap_drop:[\s\S]*- ALL/u);
  assert.match(source, /\/tmp:[^\n]*noexec/u);
  assert.match(source, /\/app\/[.]next\/cache:[^\n]*uid=1000[^\n]*gid=1000/u);
  assert.doesNotMatch(source, /GOOGLE_API_KEY|OPENAI_API_KEY|SERVICE_ROLE|PASSWORD|migrate|seed/iu);
  assert.doesNotMatch(source, /volumes:/u);
});

test("Docker environment example is synthetic and features fail closed", () => {
  const source = read(".env.docker.example");
  assert.match(source, /NEXT_PUBLIC_SUPABASE_URL=http:\/\/127[.]0[.]0[.]1:54321/u);
  assert.match(source, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=plave_docker_example_publishable_key/u);
  const assignments = source.split("\n").filter((line) => line && !line.startsWith("#"));
  assert.equal(assignments.length, 2);
  assert.doesNotMatch(assignments.join("\n"), /https:\/\/|service_role|password|secret|GOOGLE_API_KEY|OPENAI_API_KEY/iu);

  const compose = read("compose.yaml");
  for (const assignment of [
    "PLAVE_GRADES_2_9_RELEASE_MODE: HIDDEN",
    'PLAVE_CURRICULUM_RUNTIME_ENABLED: "false"',
    'PLAVE_ADAPTIVE_PRACTICE_RUNTIME_ENABLED: "false"',
    'PLAVE_AI_TUTOR_ENABLED: "false"',
  ]) assert.ok(compose.includes(assignment));
});

test("package and CI expose one safe Docker verification contract", () => {
  const manifest = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
  assert.equal(manifest.scripts["build:docker"], "next build --webpack");
  assert.match(manifest.scripts["docker:build"] ?? "", /--env-file [.]env[.]docker[.]local/u);
  assert.match(manifest.scripts["docker:compose:up"] ?? "", /--env-file [.]env[.]docker[.]local/u);
  assert.match(manifest.scripts["docker:compose:down"] ?? "", /--env-file [.]env[.]docker[.]local/u);
  assert.match(manifest.scripts["docker:verify"] ?? "", /docker-delivery[.]test[.]ts/u);

  const workflow = read(".github/workflows/plave-quality-gate.yml");
  assert.match(workflow, /name: Secure application-only Docker delivery/u);
  assert.match(workflow, /docker build[\s\S]*--platform linux\/amd64/u);
  assert.match(workflow, /docker compose --env-file [.]env[.]docker[.]example config/u);
  assert.match(workflow, /scripts\/verify-docker-runtime[.]ts/u);
  assert.match(workflow, /GRADES_1_TO_9_OFFICIAL_OUTCOME_STATUS/u);
  assert.doesNotMatch(workflow, /docker (?:push|login)|ghcr[.]io|service_role/iu);
});
