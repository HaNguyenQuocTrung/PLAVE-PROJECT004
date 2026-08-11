import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const validator = fileURLToPath(new URL("./validate-content-factory-wave-l-shard.ts", import.meta.url));
const shards = ["1-3", "4-6", "7-9"] as const;
const results = await Promise.all(shards.map((shard) => new Promise<{ shard: string; code: number; output: string }>((resolve) => {
  const child = spawn(process.execPath, ["--no-warnings", "--experimental-strip-types", validator, shard], {
    cwd: process.cwd(), env: { PATH: "/usr/bin:/bin", LC_ALL: "C", NODE_ENV: "test", npm_config_offline: "true" },
    stdio: ["ignore", "pipe", "pipe"] });
  let output = ""; child.stdout.on("data", (chunk) => { output += String(chunk); });
  child.stderr.on("data", (chunk) => { output += String(chunk); });
  child.on("close", (code) => resolve({ shard, code: code ?? 1, output }));
})));
for (const result of results) process.stdout.write(result.output);
const failed = results.filter((result) => result.code !== 0);
if (failed.length) throw new Error(`WAVE_L_PARALLEL_SHARDS_FAILED:${failed.map((entry) => entry.shard).join(",")}`);
console.log("WAVE_L_PARALLEL_SHARDS_OK shards=3 grades=9");
