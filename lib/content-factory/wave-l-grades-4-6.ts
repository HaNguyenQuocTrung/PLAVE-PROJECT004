import { canonicalize, sha256 } from "./canonical.ts";
import { combinedWaveABCDEFGHIJKGradePacks } from "./wave-k-packs.ts";
import {
  buildWaveLGradeInventory,
  simulateWaveLGrade,
  verifyWaveLGrade,
} from "./wave-l.ts";

const grades = [4, 5, 6] as const;
const packs = grades.map((grade) => {
  const pack = combinedWaveABCDEFGHIJKGradePacks.find((candidate) => candidate.grade === grade);
  if (!pack) throw new Error(`WAVE_L_GRADES_4_6_PACK_MISSING:G${grade}`);
  return pack;
});

export const waveLGrades4To6Inventories = packs.map(buildWaveLGradeInventory);
export const waveLGrades4To6Simulations = packs.map(simulateWaveLGrade);
export const waveLGrades4To6Verifications = packs.map(verifyWaveLGrade);

export const waveLGrades4To6Counts = packs.map((pack) => ({
  grade: pack.grade,
  candidateId: pack.candidate?.candidateId ?? null,
  candidateVersion: pack.candidate?.version ?? null,
  candidateHash: pack.candidate?.bundleHash ?? null,
  questions: pack.questions.length,
  skills: new Set(pack.questions.map((question) => question.skillId)).size,
  prerequisiteEdges: pack.prerequisites.length,
  publishedQuestions: pack.questions.filter((question) => question.published).length,
  pilotEligibleQuestions: pack.questions.filter((question) => question.pilotEligible).length,
})) as readonly Readonly<{
  grade: 4 | 5 | 6;
  candidateId: string | null;
  candidateVersion: string | null;
  candidateHash: string | null;
  questions: number;
  skills: number;
  prerequisiteEdges: number;
  publishedQuestions: number;
  pilotEligibleQuestions: number;
}>[];

const shardCore = {
  schemaVersion: "plave-wave-l-grades-4-6-shard-v1",
  grades,
  counts: waveLGrades4To6Counts,
  inventories: waveLGrades4To6Inventories,
  simulations: waveLGrades4To6Simulations,
  verifications: waveLGrades4To6Verifications,
  productionQuestionsAdded: 0,
  sourceWavesMutated: false,
} as const;

export const waveLGrades4To6ShardHash = sha256(canonicalize(shardCore));

export function verifyWaveLGrades4To6Shard() {
  const errors = waveLGrades4To6Verifications.flatMap((verification) =>
    verification.errors.map((error) => `G${verification.grade}:${error}`),
  );
  if (waveLGrades4To6Counts.some((row) => !row.candidateId || !row.candidateHash)) {
    errors.push("COMBINED_A_K_CANDIDATE_BINDING_MISSING");
  }
  if (waveLGrades4To6Counts.some((row) => row.publishedQuestions > 0 || row.pilotEligibleQuestions > 0)) {
    errors.push("HIDDEN_CANDIDATE_ISOLATION_DRIFT");
  }
  return {
    status: errors.length === 0 ? "PASSED" as const : "AUTOMATED_VERIFICATION_INSUFFICIENT" as const,
    errors,
    grades,
    gradeCount: grades.length,
    questionCount: waveLGrades4To6Counts.reduce((sum, row) => sum + row.questions, 0),
    skillCount: waveLGrades4To6Counts.reduce((sum, row) => sum + row.skills, 0),
    prerequisiteEdgeCount: waveLGrades4To6Counts.reduce((sum, row) => sum + row.prerequisiteEdges, 0),
    inventoryCount: waveLGrades4To6Inventories.length,
    simulationCount: waveLGrades4To6Simulations.length,
    productionQuestionsAdded: 0 as const,
    sourceWavesMutated: false as const,
    shardHash: waveLGrades4To6ShardHash,
  };
}
