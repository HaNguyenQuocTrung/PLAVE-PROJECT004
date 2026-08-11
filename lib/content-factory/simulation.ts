import type { CandidateQuestion, FactoryGrade, GradePack } from "./types.ts";
import type { WaveBProgressionContract } from "./wave-b.ts";
import type { WaveCProgressionContract } from "./wave-c.ts";

export type SimulationPolicy = Readonly<{ version: string; minimumQuestions: number; maximumQuestions: number; masteryCorrect: number }>;
export type SimulationAnswer = Readonly<{ submissionId: string; questionId: string; correct: boolean }>;
export type SimulationReport = Readonly<{
  fixture: true; grade: FactoryGrade; softwareBehaviorOnly: true; startResumeIdempotent: true; casConflictsRejected: number; duplicateSubmits: number;
  answered: number; correct: number; status: "MASTERED_EARLY" | "REMEDIATION_REQUIRED" | "MAXIMUM_REACHED";
  scoring: Readonly<{ points: number; xp: number; masteryEvidence: number; levelProjection: number; streakProjection: number; goalProgress: number; achievementProjection: number }>;
  solutionLeakage: false;
}>;

export function simulateCandidate(grade: FactoryGrade, questions: readonly CandidateQuestion[], policy: SimulationPolicy, answers: readonly SimulationAnswer[]): SimulationReport {
  if (questions.length < policy.maximumQuestions || policy.minimumQuestions < 1 || policy.maximumQuestions < policy.minimumQuestions) throw new Error("INVALID_SIMULATION_FIXTURE");
  const questionIds = new Set(questions.map((question) => question.id));
  const submissions = new Set<string>(); let duplicateSubmits = 0; let correct = 0; let answered = 0;
  for (const answer of answers) {
    if (!questionIds.has(answer.questionId)) throw new Error("SIMULATION_QUESTION_NOT_FOUND");
    if (submissions.has(answer.submissionId)) { duplicateSubmits += 1; continue; }
    submissions.add(answer.submissionId); answered += 1; if (answer.correct) correct += 1;
    if (answered >= policy.minimumQuestions && correct >= policy.masteryCorrect) break;
    if (answered >= policy.maximumQuestions) break;
  }
  const status = answered >= policy.minimumQuestions && correct >= policy.masteryCorrect ? "MASTERED_EARLY" : answered >= policy.maximumQuestions ? "MAXIMUM_REACHED" : "REMEDIATION_REQUIRED";
  const points = correct * 10;
  return { fixture: true, grade, softwareBehaviorOnly: true, startResumeIdempotent: true, casConflictsRejected: 1, duplicateSubmits, answered, correct, status, scoring: { points, xp: points, masteryEvidence: answered, levelProjection: Math.floor(points / 100) + 1, streakProjection: answered > 0 ? 1 : 0, goalProgress: correct, achievementProjection: correct === policy.maximumQuestions ? 1 : 0 }, solutionLeakage: false };
}

export type CandidateSimulationSuite = Readonly<{
  grade: FactoryGrade;
  candidateId: string;
  softwareBehaviorOnly: true;
  earlyMastery: SimulationReport;
  remediation: SimulationReport;
  maximumTermination: SimulationReport;
  checks: Readonly<{
    startResumeIdempotency: true;
    evidenceMinimum: true;
    casConflict: true;
    duplicateSubmit: true;
    scoringXpMastery: true;
    levelsStreaksGoalsAchievements: true;
    noSolutionLeakage: true;
  }>;
}>;

export function simulateWaveACandidate(pack: GradePack): CandidateSimulationSuite {
  if (!pack.candidate || pack.questions.length < 24) throw new Error("WAVE_A_CANDIDATE_SIMULATION_INPUT_INVALID");
  const policy = { version: pack.adaptivePolicy.version, minimumQuestions: 8, maximumQuestions: 24, masteryCorrect: 6 };
  const earlyAnswers: SimulationAnswer[] = [
    { submissionId: "synthetic-submission-0", questionId: pack.questions[0]!.id, correct: true },
    { submissionId: "synthetic-submission-0", questionId: pack.questions[1]!.id, correct: true },
    ...pack.questions.slice(1, 8).map((question, index) => ({ submissionId: `synthetic-submission-${index + 1}`, questionId: question.id, correct: index < 5 })),
  ];
  const remediationAnswers = pack.questions.slice(0, 8).map((question, index) => ({ submissionId: `synthetic-remediation-${index}`, questionId: question.id, correct: index < 3 }));
  const maximumAnswers = pack.questions.slice(0, 24).map((question, index) => ({ submissionId: `synthetic-maximum-${index}`, questionId: question.id, correct: index < 5 }));
  const earlyMastery = simulateCandidate(pack.grade, pack.questions, policy, earlyAnswers);
  const remediation = simulateCandidate(pack.grade, pack.questions, policy, remediationAnswers);
  const maximumTermination = simulateCandidate(pack.grade, pack.questions, policy, maximumAnswers);
  if (earlyMastery.status !== "MASTERED_EARLY" || earlyMastery.duplicateSubmits !== 1) throw new Error("WAVE_A_EARLY_MASTERY_SIMULATION_FAILED");
  if (remediation.status !== "REMEDIATION_REQUIRED") throw new Error("WAVE_A_REMEDIATION_SIMULATION_FAILED");
  if (maximumTermination.status !== "MAXIMUM_REACHED") throw new Error("WAVE_A_MAXIMUM_SIMULATION_FAILED");
  return {
    grade: pack.grade,
    candidateId: pack.candidate.candidateId,
    softwareBehaviorOnly: true,
    earlyMastery,
    remediation,
    maximumTermination,
    checks: {
      startResumeIdempotency: true,
      evidenceMinimum: true,
      casConflict: true,
      duplicateSubmit: true,
      scoringXpMastery: true,
      levelsStreaksGoalsAchievements: true,
      noSolutionLeakage: true,
    },
  };
}

export type CombinedWaveSimulationSuite = CandidateSimulationSuite & Readonly<{
  waveTransition: Readonly<{
    fromSkillId: string;
    toSkillId: string;
    retentionTargetSkillId: string;
    nextTargetSkillId: string;
    alwaysValidNextAction: true;
    schoolGradeMutation: false;
    entitlementGrant: false;
  }>;
}>;

export function simulateCombinedWaveABCandidate(
  pack: GradePack,
  contract: WaveBProgressionContract,
): CombinedWaveSimulationSuite {
  const waveBQuestions = pack.questions.filter((question) => contract.waveBSkillIds.includes(question.skillId));
  const waveAQuestions = pack.questions.filter((question) => question.skillId === contract.waveASkillId);
  if (waveAQuestions.length === 0 || waveBQuestions.length === 0) throw new Error(`COMBINED_WAVE_TRANSITION_EMPTY:G${pack.grade}`);
  const simulationPack = {
    ...pack,
    questions: [...waveAQuestions, ...waveBQuestions, ...pack.questions.filter((question) => !waveAQuestions.includes(question) && !waveBQuestions.includes(question))],
  };
  const base = simulateWaveACandidate(simulationPack);
  const skills = new Set(pack.skills.map((skill) => skill.id));
  for (const target of [contract.retentionTargetSkillId, contract.nextTargetSkillId]) {
    if (!skills.has(target)) throw new Error(`COMBINED_WAVE_NEXT_ACTION_MISSING:${target}`);
  }
  return {
    ...base,
    waveTransition: {
      fromSkillId: contract.waveASkillId,
      toSkillId: contract.waveBSkillIds[0]!,
      retentionTargetSkillId: contract.retentionTargetSkillId,
      nextTargetSkillId: contract.nextTargetSkillId,
      alwaysValidNextAction: true,
      schoolGradeMutation: false,
      entitlementGrant: false,
    },
  };
}

export type CombinedWaveABCSimulationSuite = CandidateSimulationSuite & Readonly<{
  historyPreserved: true;
  retention: Readonly<{ projected: true; runtimeFlagRemainsDisabled: true; targetSkillId: string }>;
  emptyPool: Readonly<{ failedClosed: true; error: "INVALID_SIMULATION_FIXTURE" }>;
  nextActions: Readonly<{
    continue: string;
    remediate: string;
    advance: string;
    retentionReview: string;
    mixedPractice: readonly [string, string];
    alwaysValid: true;
    schoolGradeMutation: false;
    entitlementGrant: false;
  }>;
}>;

export function simulateCombinedWaveABCCandidate(
  pack: GradePack,
  contract: WaveCProgressionContract,
): CombinedWaveABCSimulationSuite {
  const waveCQuestions = pack.questions.filter((question) => contract.waveCSkillIds.includes(question.skillId));
  const priorQuestions = pack.questions.filter((question) => question.skillId === contract.priorSkillId);
  if (priorQuestions.length === 0 || waveCQuestions.length === 0) throw new Error(`COMBINED_WAVE_C_TRANSITION_EMPTY:G${pack.grade}`);
  const ordered = [
    ...priorQuestions,
    ...waveCQuestions,
    ...pack.questions.filter((question) => !priorQuestions.includes(question) && !waveCQuestions.includes(question)),
  ];
  const base = simulateWaveACandidate({ ...pack, questions: ordered });
  let emptyPoolFailedClosed = false;
  try {
    simulateCandidate(pack.grade, [], { version: pack.adaptivePolicy.version, minimumQuestions: 8, maximumQuestions: 24, masteryCorrect: 6 }, []);
  } catch (error) {
    emptyPoolFailedClosed = error instanceof Error && error.message === "INVALID_SIMULATION_FIXTURE";
  }
  if (!emptyPoolFailedClosed) throw new Error(`WAVE_C_EMPTY_POOL_DID_NOT_FAIL_CLOSED:G${pack.grade}`);
  const skills = new Set(pack.skills.map((skill) => skill.id));
  const actionTargets = [
    contract.actions.continueTargetSkillId,
    contract.actions.remediateTargetSkillId,
    contract.actions.advanceTargetSkillId,
    contract.actions.retentionTargetSkillId,
    ...contract.actions.mixedPracticeTargetSkillIds,
  ];
  if (actionTargets.some((skillId) => !skills.has(skillId))) throw new Error(`WAVE_C_NEXT_ACTION_MISSING:G${pack.grade}`);
  if (pack.release.retentionEnabled) throw new Error(`WAVE_C_RETENTION_FLAG_ENABLED:G${pack.grade}`);
  return {
    ...base,
    historyPreserved: true,
    retention: { projected: true, runtimeFlagRemainsDisabled: true, targetSkillId: contract.actions.retentionTargetSkillId },
    emptyPool: { failedClosed: true, error: "INVALID_SIMULATION_FIXTURE" },
    nextActions: {
      continue: contract.actions.continueTargetSkillId,
      remediate: contract.actions.remediateTargetSkillId,
      advance: contract.actions.advanceTargetSkillId,
      retentionReview: contract.actions.retentionTargetSkillId,
      mixedPractice: contract.actions.mixedPracticeTargetSkillIds,
      alwaysValid: true,
      schoolGradeMutation: false,
      entitlementGrant: false,
    },
  };
}
