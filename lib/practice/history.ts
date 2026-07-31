import type { PracticeAttempt } from "./contracts.ts";

export type PracticeHistoryItem = PracticeAttempt & {
  attemptNumber: number;
  percent: number;
};

export type LessonPracticeState =
  | {
      kind: "START";
      activeAttempt: null;
      latestCompletedAttempt: null;
      primaryLabel: "Bắt đầu luyện tập";
    }
  | {
      kind: "CONTINUE";
      activeAttempt: PracticeHistoryItem;
      latestCompletedAttempt: PracticeHistoryItem | null;
      primaryLabel: "Tiếp tục luyện tập";
    }
  | {
      kind: "RETAKE";
      activeAttempt: null;
      latestCompletedAttempt: PracticeHistoryItem;
      primaryLabel: "Làm lượt mới";
    };

function compareAttempts(
  first: PracticeAttempt,
  second: PracticeAttempt,
) {
  const byStart =
    new Date(first.startedAt).getTime() - new Date(second.startedAt).getTime();
  return byStart || first.id.localeCompare(second.id);
}

export function buildPracticeHistory(
  attempts: PracticeAttempt[],
): PracticeHistoryItem[] {
  const unitAttemptNumbers = new Map<string, number>();
  return [...attempts]
    .sort(compareAttempts)
    .map((attempt) => {
      const attemptNumber =
        (unitAttemptNumbers.get(attempt.unitSlug) ?? 0) + 1;
      unitAttemptNumbers.set(attempt.unitSlug, attemptNumber);
      return {
        ...attempt,
        attemptNumber,
        percent: Math.round(
          (attempt.correctCount / attempt.totalQuestions) * 100,
        ),
      };
    })
    .reverse();
}

export function getLessonPracticeState(
  history: PracticeHistoryItem[],
): LessonPracticeState {
  const activeAttempt =
    history.find((attempt) => attempt.status === "IN_PROGRESS") ?? null;
  const latestCompletedAttempt =
    history.find((attempt) => attempt.status === "COMPLETED") ?? null;

  if (activeAttempt) {
    return {
      kind: "CONTINUE",
      activeAttempt,
      latestCompletedAttempt,
      primaryLabel: "Tiếp tục luyện tập",
    };
  }

  if (latestCompletedAttempt) {
    return {
      kind: "RETAKE",
      activeAttempt: null,
      latestCompletedAttempt,
      primaryLabel: "Làm lượt mới",
    };
  }

  return {
    kind: "START",
    activeAttempt: null,
    latestCompletedAttempt: null,
    primaryLabel: "Bắt đầu luyện tập",
  };
}

export function getAttemptNumber(
  history: PracticeHistoryItem[],
  attemptId: string,
) {
  return (
    history.find((attempt) => attempt.id === attemptId)?.attemptNumber ?? null
  );
}

export function shouldResumeExistingAttempt(
  history: PracticeHistoryItem[],
) {
  return history.some((attempt) => attempt.status === "IN_PROGRESS");
}

export function hasUniqueQuestionOrder(attempt: PracticeAttempt) {
  return (
    attempt.questionOrder.length === attempt.totalQuestions &&
    new Set(attempt.questionOrder).size === attempt.totalQuestions
  );
}
