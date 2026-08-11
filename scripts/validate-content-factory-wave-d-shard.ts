import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { simulateCombinedWaveABCDCandidate } from "../lib/content-factory/simulation.ts";
import { auditIndependentCandidatePack } from "../lib/content-factory/wave-a-independent-audit.ts";
import { combinedWaveABCDGradePacks, waveDGradePacks, waveDProgressionContracts } from "../lib/content-factory/wave-d-packs.ts";
import { validateGradePack } from "../lib/content-factory/validation.ts";

const raw = process.argv.find((argument) => argument.startsWith("--grade="))?.slice("--grade=".length);
const grade = Number(raw);
if (!Number.isInteger(grade) || grade < 1 || grade > 9) throw new Error("WAVE_D_SHARD_GRADE_INVALID");
const pack = waveDGradePacks.find((entry) => entry.grade === grade)!;
const combined = combinedWaveABCDGradePacks.find((entry) => entry.grade === grade)!;
const contract = waveDProgressionContracts.find((entry) => entry.grade === grade)!;
const diagnostics = [...validateGradePack(pack), ...validateGradePack(combined)].filter((entry) => entry.severity === "ERROR" || entry.severity === "WARNING");
const independent = auditIndependentCandidatePack(pack);
if (diagnostics.length > 0 || independent.errors.length > 0 || pack.questions.length !== 24 || pack.production?.candidateEligible !== 24) {
  throw new Error(`WAVE_D_SHARD_FAILED:G${grade}:${[...diagnostics.map((entry) => entry.code), ...independent.errors].join(",")}`);
}
const first = buildDeterministicBundle([pack]);
const second = buildDeterministicBundle([pack]);
if (first.bundleHash !== second.bundleHash) throw new Error(`WAVE_D_SHARD_NONDETERMINISTIC:G${grade}`);
const simulation = simulateCombinedWaveABCDCandidate(combined, contract);
if (!simulation.emptyPool.failedClosed || !simulation.historyPreserved || !simulation.nextActions.alwaysValid) throw new Error(`WAVE_D_SHARD_SIMULATION_FAILED:G${grade}`);
console.log(`WAVE_D_SHARD_OK grade=${grade} questions=24 candidate=${pack.candidate?.bundleHash}`);
