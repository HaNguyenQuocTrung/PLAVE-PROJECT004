import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const node = process.execPath;
if (!existsSync(node)) throw new Error("WAVE_J_LOCAL_NODE_MISSING");
for (const shard of ["1-3", "4-6", "7-9"] as const) {
  const result = spawnSync(node, ["--experimental-strip-types", "scripts/validate-content-factory-wave-j-shard.ts", shard],
    { cwd: process.cwd(), env: { ...process.env, npm_config_offline: "true" }, encoding: "utf8" });
  process.stdout.write(result.stdout); process.stderr.write(result.stderr);
  if (result.status !== 0) throw new Error(`WAVE_J_SHARD_PROCESS_FAILED:${shard}`);
}
console.log("WAVE_J_SHARDS_OK shards=3 grades=9 network_attempts=0");
