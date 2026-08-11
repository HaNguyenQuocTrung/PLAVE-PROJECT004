import { buildDeterministicBundle } from "../lib/content-factory/bundle.ts";
import { combinedWaveABCDEFGHIGradePacks, waveIGradeAudits } from "../lib/content-factory/wave-i-packs.ts";
import { simulateWaveIRemediation } from "../lib/content-factory/wave-i-simulation.ts";
import { validateGradePack } from "../lib/content-factory/validation.ts";

const grade = Number(process.argv.find((argument) => argument.startsWith("--grade="))?.slice(8));
if (!Number.isInteger(grade) || grade < 1 || grade > 9) throw new Error("WAVE_I_SHARD_GRADE_INVALID");
const pack = combinedWaveABCDEFGHIGradePacks.find((entry) => entry.grade === grade)!;
const audit = waveIGradeAudits.find((entry) => entry.grade === grade)!; const expected = grade === 1 ? 312 : 192;
const diagnostics = validateGradePack(pack).filter((entry) => entry.severity === "ERROR" || entry.severity === "WARNING");
const simulation = simulateWaveIRemediation(pack, audit);
if (diagnostics.length || pack.questions.length !== expected || audit.missingRemediationAfter.length || audit.missingAdvanceAfter.length
  || audit.bridgeQuestionIds.length || !simulation.checks.alwaysValidNextAction) throw new Error(`WAVE_I_SHARD_FAILED:G${grade}`);
const first = buildDeterministicBundle([pack]).bundleHash; const replay = buildDeterministicBundle([pack]).bundleHash;
if (first !== replay) throw new Error(`WAVE_I_SHARD_NONDETERMINISTIC:G${grade}`);
console.log(`WAVE_I_SHARD_OK grade=${grade} questions=${expected} skills=${audit.candidateSkillIds.length} edges=${audit.prerequisiteEvidence.length} bridges=0`);
