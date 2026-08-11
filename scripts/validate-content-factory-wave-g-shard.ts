import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { gradeOneWaveGOracleRows } from "../lib/content-factory/grade1-wave-g.ts";
import { simulateCombinedWaveABCDEFGCandidate } from "../lib/content-factory/simulation.ts";
import { auditIndependentCandidatePack } from "../lib/content-factory/wave-a-independent-audit.ts";
import { combinedWaveABCDEFGGradePacks, waveGGradePacks, waveGProgressionContracts } from "../lib/content-factory/wave-g-packs.ts";
import { validateGradePack } from "../lib/content-factory/validation.ts";

const grade = Number(process.argv.find((argument) => argument.startsWith("--grade="))?.slice("--grade=".length));
if (!Number.isInteger(grade) || grade < 1 || grade > 9) throw new Error("WAVE_G_SHARD_GRADE_INVALID");
const pack = waveGGradePacks.find((entry) => entry.grade === grade)!;
const combined = combinedWaveABCDEFGGradePacks.find((entry) => entry.grade === grade)!;
const contract = waveGProgressionContracts.find((entry) => entry.grade === grade)!;
const diagnostics = [...validateGradePack(pack), ...validateGradePack(combined)].filter((entry) => entry.severity === "ERROR" || entry.severity === "WARNING");
const expected = pack.production?.candidateEligible ?? 0;
const independentErrors = grade === 1 ? [] : auditIndependentCandidatePack(pack, { expectedQuestions: expected }).errors;
const gradeOneFailClosed = grade !== 1 || (expected === 0 && pack.questions.length === 0 && pack.quarantinedQuestions?.length === 6
  && gradeOneWaveGOracleRows.every((row) => row.status === "AUTOMATED_VERIFICATION_INSUFFICIENT"));
if (diagnostics.length || independentErrors.length || pack.questions.length !== expected || !gradeOneFailClosed || expected > 24 || (grade > 1 && expected < 1)) {
  throw new Error(`WAVE_G_SHARD_FAILED:G${grade}:${[...diagnostics.map((entry) => entry.code), ...independentErrors].join(",")}`);
}
if (buildDeterministicBundle([pack]).bundleHash !== buildDeterministicBundle([pack]).bundleHash) throw new Error(`WAVE_G_SHARD_NONDETERMINISTIC:G${grade}`);
const simulation = simulateCombinedWaveABCDEFGCandidate(combined, contract);
if (!simulation.emptyPool.failedClosed || !simulation.historyPreserved || !simulation.nextActions.alwaysValid) throw new Error(`WAVE_G_SHARD_SIMULATION_FAILED:G${grade}`);
console.log(`WAVE_G_SHARD_OK grade=${grade} eligible=${expected} insufficient=${pack.production?.verificationInsufficient ?? 0} candidate=${pack.candidate?.bundleHash}`);
