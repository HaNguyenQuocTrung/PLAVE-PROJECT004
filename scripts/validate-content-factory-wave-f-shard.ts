import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { simulateCombinedWaveABCDEFCandidate } from "../lib/content-factory/simulation.ts";
import { auditIndependentCandidatePack } from "../lib/content-factory/wave-a-independent-audit.ts";
import { combinedWaveABCDEFGradePacks, waveFGradePacks, waveFProgressionContracts } from "../lib/content-factory/wave-f-packs.ts";
import { validateGradePack } from "../lib/content-factory/validation.ts";

const grade = Number(process.argv.find((argument) => argument.startsWith("--grade="))?.slice("--grade=".length));
if (!Number.isInteger(grade) || grade < 1 || grade > 9) throw new Error("WAVE_F_SHARD_GRADE_INVALID");
const pack = waveFGradePacks.find((entry) => entry.grade === grade)!;
const combined = combinedWaveABCDEFGradePacks.find((entry) => entry.grade === grade)!;
const contract = waveFProgressionContracts.find((entry) => entry.grade === grade)!;
const diagnostics = [...validateGradePack(pack), ...validateGradePack(combined)].filter((entry) => entry.severity === "ERROR" || entry.severity === "WARNING");
const independent = auditIndependentCandidatePack(pack, { expectedQuestions: pack.questions.length });
const expected = pack.production?.candidateEligible ?? 0;
if (diagnostics.length || independent.errors.length || pack.questions.length !== expected || expected < 1 || expected > 24) {
  throw new Error(`WAVE_F_SHARD_FAILED:G${grade}:${[...diagnostics.map((entry) => entry.code), ...independent.errors].join(",")}`);
}
if (buildDeterministicBundle([pack]).bundleHash !== buildDeterministicBundle([pack]).bundleHash) throw new Error(`WAVE_F_SHARD_NONDETERMINISTIC:G${grade}`);
const simulation = simulateCombinedWaveABCDEFCandidate(combined, contract);
if (!simulation.emptyPool.failedClosed || !simulation.historyPreserved || !simulation.nextActions.alwaysValid) throw new Error(`WAVE_F_SHARD_SIMULATION_FAILED:G${grade}`);
console.log(`WAVE_F_SHARD_OK grade=${grade} eligible=${expected} insufficient=${pack.production?.verificationInsufficient ?? 0} candidate=${pack.candidate?.bundleHash}`);
