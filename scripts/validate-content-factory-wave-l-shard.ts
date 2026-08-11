import { verifyWaveLGrades1To3Shard } from "../lib/content-factory/wave-l-grades-1-3.ts";
import { verifyWaveLGrades4To6Shard } from "../lib/content-factory/wave-l-grades-4-6.ts";
import { verifyWaveLGrades7To9Shard } from "../lib/content-factory/wave-l-grades-7-9.ts";

const shard = process.argv[2]; const validators = { "1-3": verifyWaveLGrades1To3Shard,
  "4-6": verifyWaveLGrades4To6Shard, "7-9": verifyWaveLGrades7To9Shard } as const;
if (!shard || !(shard in validators)) throw new Error("WAVE_L_SHARD_REQUIRED");
const result = validators[shard as keyof typeof validators]();
if (result.status !== "PASSED" || result.errors.length) throw new Error(`WAVE_L_SHARD_FAILED:${shard}:${result.errors.join(",")}`);
console.log(`WAVE_L_SHARD_OK shard=${shard} grades=${result.grades.join(",")} questions=${result.questionCount} skills=${result.skillCount}`);
