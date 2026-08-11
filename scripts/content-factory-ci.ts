import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

type Shard = Readonly<{ id: string; grades: string; checks?: readonly string[] }>;
const config = JSON.parse(readFileSync("ci/content-factory-shards.json", "utf8")) as { remoteCiEnabled: boolean; shards: Shard[] };
if (config.remoteCiEnabled) throw new Error("REMOTE_CI_MUST_REMAIN_DISABLED_DURING_SPRINT");

function run(args: readonly string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, ["--no-warnings", "--experimental-strip-types", "scripts/content-factory.ts", ...args], { stdio: "inherit", env: { ...process.env } });
    child.once("error", reject); child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`CONTENT_FACTORY_SHARD_FAILED:${args.join(":")}`)));
  });
}

const gradeShards = config.shards.filter((shard) => !shard.checks);
await Promise.all(gradeShards.map(async (shard) => {
  await run(["validate", `--grades=${shard.grades}`, "--dry-run"]);
  if (shard.grades !== "1") await run(["source-map", `--grades=${shard.grades}`, "--dry-run"]);
  await run(["bundle", `--grades=${shard.grades}`, "--dry-run"]);
  await run(["simulate", `--grades=${shard.grades}`, "--dry-run"]);
}));
await run(["validate", "--grades=1-9", "--dry-run"]);
await run(["coverage", "--grades=1-9"]);
await run(["report", "--grades=1-9"]);
console.log(`CONTENT_FACTORY_CI shards=${gradeShards.length}+cross-grade status=PASS remoteCiEnabled=false`);
