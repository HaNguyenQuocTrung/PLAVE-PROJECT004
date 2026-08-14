import {
  parseStudentScoringSummary,
  type CurriculumAttemptState,
  type StudentScoringSummary,
} from "./contracts.ts";
import {
  buildCurriculumXpCompletionProjection,
  type XpCompletionProjection,
} from "../scoring/completion.ts";

type ScoringRpcResult = Readonly<{ data: unknown; error: unknown }>;

export async function loadCanonicalStudentScoringSummary(
  call: () => PromiseLike<ScoringRpcResult>,
): Promise<StudentScoringSummary | null> {
  const { data, error } = await call();
  return error ? null : parseStudentScoringSummary(data);
}

export function attachCanonicalXpCompletion(
  state: CurriculumAttemptState,
  summary: StudentScoringSummary,
): CurriculumAttemptState {
  if (!state.scoring) return state;
  return {
    ...state,
    xpCompletion: buildCurriculumXpCompletionProjection(
      state.scoring,
      summary,
    ),
  };
}

export function requireCanonicalXpCompletion(
  state: CurriculumAttemptState,
  summary: StudentScoringSummary | null,
): Readonly<{
  state: CurriculumAttemptState;
  projection: XpCompletionProjection;
}> | null {
  if (!state.scoring || !summary) return null;
  const completedState = attachCanonicalXpCompletion(state, summary);
  return completedState.xpCompletion
    ? { state: completedState, projection: completedState.xpCompletion }
    : null;
}

export async function projectCanonicalXpAfterCommit(
  state: CurriculumAttemptState,
  call: () => PromiseLike<ScoringRpcResult>,
): Promise<CurriculumAttemptState | null> {
  if (state.status !== "COMPLETED") return state;
  const summary = await loadCanonicalStudentScoringSummary(call);
  return requireCanonicalXpCompletion(state, summary)?.state ?? null;
}
