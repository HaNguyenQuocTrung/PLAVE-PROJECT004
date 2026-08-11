import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { simulateCombinedWaveABCDECandidate } from "../lib/content-factory/simulation.ts";
import { auditIndependentCandidatePack } from "../lib/content-factory/wave-a-independent-audit.ts";
import { combinedWaveABCDEGradePacks, waveEGradePacks, waveEProgressionContracts } from "../lib/content-factory/wave-e-packs.ts";
import { validateGradePack } from "../lib/content-factory/validation.ts";

const grade = Number(process.argv.find((argument) => argument.startsWith("--grade="))?.slice("--grade=".length));
if (!Number.isInteger(grade) || grade < 1 || grade > 9) throw new Error("WAVE_E_SHARD_GRADE_INVALID");
const pack = waveEGradePacks.find((entry) => entry.grade === grade)!;
const combined = combinedWaveABCDEGradePacks.find((entry) => entry.grade === grade)!;
const contract = waveEProgressionContracts.find((entry) => entry.grade === grade)!;
const diagnostics = [...validateGradePack(pack), ...validateGradePack(combined)].filter((entry) => entry.severity === "ERROR" || entry.severity === "WARNING");
const independent = auditIndependentCandidatePack(pack, { expectedQuestions: pack.questions.length });
const expected = grade === 1 ? 6 : 24;
if (diagnostics.length || independent.errors.length || pack.questions.length !== expected || pack.production?.candidateEligible !== expected) {
  throw new Error(`WAVE_E_SHARD_FAILED:G${grade}:${[...diagnostics.map((entry) => entry.code), ...independent.errors].join(",")}`);
}
if (buildDeterministicBundle([pack]).bundleHash !== buildDeterministicBundle([pack]).bundleHash) throw new Error(`WAVE_E_SHARD_NONDETERMINISTIC:G${grade}`);
const simulation = simulateCombinedWaveABCDECandidate(combined, contract);
if (!simulation.emptyPool.failedClosed || !simulation.historyPreserved || !simulation.nextActions.alwaysValid) throw new Error(`WAVE_E_SHARD_SIMULATION_FAILED:G${grade}`);
console.log(`WAVE_E_SHARD_OK grade=${grade} eligible=${expected} insufficient=${pack.production?.verificationInsufficient ?? 0} candidate=${pack.candidate?.bundleHash}`);
