import { waveJShardGrades, verifyWaveJShard } from "../lib/content-factory/wave-j-shards.ts";

const key = process.argv[2] as keyof typeof waveJShardGrades;
const grades = waveJShardGrades[key];
if (!grades) throw new Error(`WAVE_J_SHARD_UNKNOWN:${process.argv[2] ?? "missing"}`);
const result = verifyWaveJShard(grades);
if (result.status !== "PASSED") throw new Error(`WAVE_J_SHARD_FAILED:${key}:${result.errors.join(",")}`);
console.log(`WAVE_J_SHARD_OK shard=${key} grades=${grades.join(",")} skills=${result.skills} gaps=${result.gapSkillsBefore}->${result.gapSkillsAfter} added=${result.addedQuestions}`);
