import {
  PRACTICE_NUMBER_INPUT_MAX_DIGITS,
  parsePracticeAnswerStateApiResponse,
  parseStartPracticeApiResponse,
  parseStartPracticeStateApiResponse,
  parseSubmitPracticeApiResponse,
  type PracticeReviewAnswer,
  type StartPracticeResult,
  type SubmitPracticeResult,
} from "./contracts.ts";

export type GradedAnswer = SubmitPracticeResult & {
  studentAnswer: string;
};

export type GradedAnswers = Record<string, GradedAnswer>;

type JsonResponseLike = {
  json(): Promise<unknown>;
};

export type PracticeFetch = (
  input: string,
  init: RequestInit,
) => Promise<JsonResponseLike>;

export type JsonReadResult =
  | { ok: true; value: unknown }
  | { ok: false };

export async function readResponseJsonOnce(
  response: JsonResponseLike,
): Promise<JsonReadResult> {
  try {
    return { ok: true, value: await response.json() };
  } catch {
    return { ok: false };
  }
}

export function getStartPracticeDestination(payload: unknown): string | null {
  const response = parseStartPracticeApiResponse(payload);
  return response ? `/practice/${response.data.id}` : null;
}

export function getSubmitPracticeResult(
  payload: unknown,
): SubmitPracticeResult | null {
  return parseSubmitPracticeApiResponse(payload)?.data ?? null;
}

export function mergeGradedAnswer(
  current: GradedAnswers,
  questionId: string,
  studentAnswer: string,
  result: SubmitPracticeResult,
) {
  return {
    results: {
      ...current,
      [questionId]: {
        ...result,
        studentAnswer,
      },
    },
    answeredCount: result.answeredCount,
    correctCount: result.correctCount,
  };
}

export function canSubmitPracticeAnswer(
  result: GradedAnswer | undefined,
  requestActive: boolean,
  retryAllowed: boolean,
) {
  return !result && !requestActive && retryAllowed;
}

export function normalizePracticeNumberInput(value: string): string | null {
  const trimmed = value.trim();
  if (
    trimmed.length > PRACTICE_NUMBER_INPUT_MAX_DIGITS ||
    !/^(?:0|[1-9][0-9]*)$/.test(trimmed)
  ) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) ? String(parsed) : null;
}

export type SingleFlightResult<T> =
  | { started: false }
  | { started: true; value: T };

export type SingleFlightGate = {
  isActive(): boolean;
  run<T>(task: () => Promise<T>): Promise<SingleFlightResult<T>>;
};

export function createSingleFlightGate(): SingleFlightGate {
  let active = false;

  return {
    isActive() {
      return active;
    },
    async run<T>(task: () => Promise<T>) {
      if (active) return { started: false };
      active = true;
      try {
        return { started: true, value: await task() };
      } finally {
        active = false;
      }
    },
  };
}

export type StartReconciliation =
  | { kind: "RECOVERED"; attempt: StartPracticeResult }
  | { kind: "NOT_FOUND" }
  | { kind: "FAILED" };

export async function reconcileStartedPractice(
  fetcher: PracticeFetch,
  unitSlug: string,
): Promise<StartReconciliation> {
  try {
    const response = await fetcher(
      `/api/practice/state?mode=start&unitSlug=${encodeURIComponent(
        unitSlug,
      )}`,
      { method: "GET", cache: "no-store" },
    );
    const payload = await readResponseJsonOnce(response);
    if (!payload.ok) return { kind: "FAILED" };

    const parsed = parseStartPracticeStateApiResponse(payload.value);
    if (!parsed) return { kind: "FAILED" };
    return parsed.data.attempt
      ? { kind: "RECOVERED", attempt: parsed.data.attempt }
      : { kind: "NOT_FOUND" };
  } catch {
    return { kind: "FAILED" };
  }
}

export type AnswerReconciliation =
  | {
      kind: "RECOVERED";
      answer: PracticeReviewAnswer;
      result: SubmitPracticeResult;
    }
  | { kind: "NOT_SAVED" }
  | { kind: "FAILED" };

export async function reconcileSubmittedAnswer(
  fetcher: PracticeFetch,
  attemptId: string,
  questionId: string,
): Promise<AnswerReconciliation> {
  try {
    const query = new URLSearchParams({
      mode: "answer",
      attemptId,
      questionId,
    });
    const response = await fetcher(`/api/practice/state?${query.toString()}`, {
      method: "GET",
      cache: "no-store",
    });
    const payload = await readResponseJsonOnce(response);
    if (!payload.ok) return { kind: "FAILED" };

    const parsed = parsePracticeAnswerStateApiResponse(payload.value);
    if (!parsed) return { kind: "FAILED" };
    if (!parsed.data.answer) return { kind: "NOT_SAVED" };

    return {
      kind: "RECOVERED",
      answer: parsed.data.answer,
      result: {
        isCorrect: parsed.data.answer.isCorrect,
        correctAnswer: parsed.data.answer.correctAnswer,
        solutionSteps: parsed.data.answer.solutionSteps,
        explanation: parsed.data.answer.explanation,
        hint: parsed.data.answer.hint,
        answeredCount: parsed.data.answeredCount,
        correctCount: parsed.data.correctCount,
        completed: parsed.data.completed,
      },
    };
  } catch {
    return { kind: "FAILED" };
  }
}

export function getAnswerReconciliationFailure(
  reconciliation: Extract<AnswerReconciliation, { kind: "NOT_SAVED" | "FAILED" }>,
) {
  if (reconciliation.kind === "NOT_SAVED") {
    return {
      retryAllowed: true,
      message: "Câu trả lời chưa được lưu. Em có thể nhấn “Thử lại”.",
    };
  }

  return {
    retryAllowed: false,
    message:
      "Chưa thể xác nhận câu trả lời đã được lưu. Vui lòng kiểm tra kết nối rồi tải lại trang.",
  };
}
