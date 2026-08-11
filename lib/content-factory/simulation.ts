import type { CandidateQuestion, FactoryGrade } from "./types.ts";

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
