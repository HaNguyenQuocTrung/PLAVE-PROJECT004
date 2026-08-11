import { spawn } from "node:child_process";

function runGrade(grade: number) { return new Promise<void>((resolve, reject) => {
  const child = spawn(process.execPath, ["--no-warnings", "--experimental-strip-types", "scripts/validate-content-factory-wave-h-shard.ts", `--grade=${grade}`],
    { stdio: "inherit", env: { ...process.env, npm_config_offline: "true", npm_config_audit: "false", npm_config_update_notifier: "false" } });
  child.once("error", reject); child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`WAVE_H_GRADE_SHARD_FAILED:G${grade}`)));
}); }
await Promise.all([1, 2, 3, 4, 5, 6, 7, 8, 9].map(runGrade));
console.log("WAVE_H_NINE_GRADE_SHARDS_OK grades=1-9 remote=false network_attempts=0");
