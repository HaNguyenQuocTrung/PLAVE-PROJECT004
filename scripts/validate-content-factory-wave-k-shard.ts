import { verifyWaveKShard, waveKShardGrades } from "../lib/content-factory/wave-k-shards.ts";

const shard = process.argv[2] as keyof typeof waveKShardGrades;
if (!shard || !waveKShardGrades[shard]) throw new Error("WAVE_K_SHARD_REQUIRED");
const result = verifyWaveKShard(waveKShardGrades[shard]);
if (result.errors.length) throw new Error(`WAVE_K_SHARD_FAILED:${shard}:${result.errors.slice(0, 30).join(",")}`);
console.log(`WAVE_K_SHARD_OK shard=${shard} grades=${result.grades.join(",")} inventory=${result.inventoryRows} skills=${result.producedSkills} questions=${result.questions} domain_batches=${result.domainBatches.length}`);

