import {
  parseDiagnosticStartRpcResult,
  parseDiagnosticStateRpcResult,
  parseDiagnosticSubmitRpcResult,
  type DiagnosticApiSuccess,
  type DiagnosticStartResult,
  type DiagnosticState,
  type DiagnosticSubmitResult,
} from "./contracts.ts";

export function createDiagnosticSingleFlightGate() {
  let active = false;
  return {
    isActive: () => active,
    run: async <Result>(operation: () => Promise<Result>) => {
      if (active) return null;
      active = true;
      try {
        return await operation();
      } finally {
        active = false;
      }
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readDiagnosticResponse(response: Response) {
  try {
    return { ok: response.ok, value: (await response.json()) as unknown };
  } catch {
    return { ok: false, value: null };
  }
}

export function parseDiagnosticStartApiResponse(
  value: unknown,
): DiagnosticApiSuccess<DiagnosticStartResult> | null {
  if (!isRecord(value) || value.ok !== true || !("data" in value)) {
    return null;
  }
  const data = parseDiagnosticStartRpcResult({
    attempt_id: isRecord(value.data) ? value.data.attemptId : undefined,
    status: isRecord(value.data) ? value.data.status : undefined,
    question_order: isRecord(value.data)
      ? value.data.questionOrder
      : undefined,
    total_questions: isRecord(value.data)
      ? value.data.totalQuestions
      : undefined,
    answered_count: isRecord(value.data)
      ? value.data.answeredCount
      : undefined,
    started_at: isRecord(value.data) ? value.data.startedAt : undefined,
  });
  return data ? { ok: true, data } : null;
}

export function parseDiagnosticSubmitApiResponse(
  value: unknown,
): DiagnosticApiSuccess<DiagnosticSubmitResult> | null {
  if (!isRecord(value) || value.ok !== true || !("data" in value)) {
    return null;
  }
  const data = parseDiagnosticSubmitRpcResult({
    answered_count: isRecord(value.data)
      ? value.data.answeredCount
      : undefined,
    total_questions: isRecord(value.data)
      ? value.data.totalQuestions
      : undefined,
    completed: isRecord(value.data) ? value.data.completed : undefined,
  });
  return data ? { ok: true, data } : null;
}

export function parseDiagnosticStateApiResponse(
  value: unknown,
): DiagnosticApiSuccess<DiagnosticState> | null {
  if (!isRecord(value) || value.ok !== true || !("data" in value)) {
    return null;
  }
  if (!isRecord(value.data)) return null;
  const data = parseDiagnosticStateRpcResult({
    attempt_id: value.data.attemptId,
    status: value.data.status,
    question_order: value.data.questionOrder,
    total_questions: value.data.totalQuestions,
    answered_count: value.data.answeredCount,
    answered_question_ids: value.data.answeredQuestionIds,
    started_at: value.data.startedAt,
    completed_at: value.data.completedAt,
    questions: Array.isArray(value.data.questions)
      ? value.data.questions.map((question) =>
          isRecord(question)
            ? {
                code: question.code,
                unit_slug: question.unitSlug,
                unit_title: question.unitTitle,
                question_type: question.questionType,
                prompt: question.prompt,
                options: question.options,
                visual_spec: question.visualSpec,
                skill_code: question.skillCode,
                difficulty: question.difficulty,
                display_order: question.displayOrder,
                domain: question.domain,
              }
            : question,
        )
      : value.data.questions,
  });
  return data ? { ok: true, data } : null;
}
