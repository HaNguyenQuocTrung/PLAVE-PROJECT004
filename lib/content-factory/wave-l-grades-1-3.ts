import { canonicalize, sha256 } from "./canonical.ts";
import { GRADE_ONE_SOURCE_DIGEST, gradeOneShadowCandidatePack } from "./grade1-shadow.ts";
import { combinedWaveABCDEFGHIJKGradePacks } from "./wave-k-packs.ts";
import { waveKGradeOneEvidenceCoverage } from "./wave-k-grade-one.ts";
import { buildWaveLGradeInventory, simulateWaveLGrade, verifyWaveLGrade } from "./wave-l.ts";

const grades = [1, 2, 3] as const;
const packs = grades.map((grade) => {
  const pack = combinedWaveABCDEFGHIJKGradePacks.find((candidate) => candidate.grade === grade);
  if (!pack) throw new Error(`WAVE_L_GRADES_1_3_PACK_MISSING:G${grade}`);
  return pack;
});

export const waveLGrades1To3Inventories = packs.map(buildWaveLGradeInventory);
export const waveLGrades1To3Simulations = packs.map(simulateWaveLGrade);
export const waveLGrades1To3Verifications = packs.map(verifyWaveLGrade);

export const waveLGrades1To3Counts = packs.map((pack) => ({
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
  grade: 1 | 2 | 3;
  candidateId: string | null;
  candidateVersion: string | null;
  candidateHash: string | null;
  questions: number;
  skills: number;
  prerequisiteEdges: number;
  publishedQuestions: number;
  pilotEligibleQuestions: number;
}>[];

export const waveLGrades1To3GradeOneBoundary = Object.freeze({
  units: 13,
  questions: 312,
  solutions: 312,
  diagnosticRows: 24,
  sourceDigest: GRADE_ONE_SOURCE_DIGEST,
  shadowCandidateHash: gradeOneShadowCandidatePack.candidate?.bundleHash ?? null,
  deterministicEvidence: waveKGradeOneEvidenceCoverage.deterministicEvidence,
  quarantined: waveKGradeOneEvidenceCoverage.quarantined,
  unknown: waveKGradeOneEvidenceCoverage.unknown,
  evidenceComplete: waveKGradeOneEvidenceCoverage.evidenceComplete,
  productionQuestionsAdded: 0,
  fixedRuntimeModified: false,
  legacyContentModified: false,
});

const shardCore = {
  schemaVersion: "plave-wave-l-grades-1-3-shard-v1",
  grades,
  counts: waveLGrades1To3Counts,
  inventories: waveLGrades1To3Inventories,
  simulations: waveLGrades1To3Simulations,
  verifications: waveLGrades1To3Verifications,
  gradeOneBoundary: waveLGrades1To3GradeOneBoundary,
  productionQuestionsAdded: 0,
  sourceWavesMutated: false,
} as const;

export const waveLGrades1To3ShardHash = sha256(canonicalize(shardCore));

export function verifyWaveLGrades1To3Shard() {
  const errors = waveLGrades1To3Verifications.flatMap((verification) =>
    verification.errors.map((error) => `G${verification.grade}:${error}`),
  );
  if (waveLGrades1To3Counts.some((row) => !row.candidateId || !row.candidateHash)) {
    errors.push("COMBINED_A_K_CANDIDATE_BINDING_MISSING");
  }
  if (waveLGrades1To3Counts.some((row) => row.publishedQuestions > 0 || row.pilotEligibleQuestions > 0)) {
    errors.push("HIDDEN_CANDIDATE_ISOLATION_DRIFT");
  }
  const gradeOne = packs[0]!;
  if (gradeOne.questions.length !== 312 || gradeOne.explanations.length !== 312 || gradeOne.units.length !== 13) {
    errors.push("GRADE_ONE_BOUNDARY_DRIFT");
  }
  if (GRADE_ONE_SOURCE_DIGEST !== waveKGradeOneEvidenceCoverage.sourceDigest) {
    errors.push("GRADE_ONE_SOURCE_DIGEST_DRIFT");
  }
  if (waveKGradeOneEvidenceCoverage.evidenceComplete || waveKGradeOneEvidenceCoverage.unknown === 0) {
    errors.push("GRADE_ONE_UNKNOWN_FAIL_CLOSED_DRIFT");
  }
  return {
    status: errors.length === 0 ? "PASSED" as const : "AUTOMATED_VERIFICATION_INSUFFICIENT" as const,
    errors,
    grades,
    gradeCount: grades.length,
    questionCount: waveLGrades1To3Counts.reduce((sum, row) => sum + row.questions, 0),
    skillCount: waveLGrades1To3Counts.reduce((sum, row) => sum + row.skills, 0),
    prerequisiteEdgeCount: waveLGrades1To3Counts.reduce((sum, row) => sum + row.prerequisiteEdges, 0),
    inventoryCount: waveLGrades1To3Inventories.length,
    simulationCount: waveLGrades1To3Simulations.length,
    productionQuestionsAdded: 0 as const,
    sourceWavesMutated: false as const,
    gradeOneUnknownPreserved: waveKGradeOneEvidenceCoverage.unknown,
    gradeOneQuarantinePreserved: waveKGradeOneEvidenceCoverage.quarantined,
    shardHash: waveLGrades1To3ShardHash,
  };
}

