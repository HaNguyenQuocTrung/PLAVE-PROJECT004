import "server-only";

import { randomBytes } from "node:crypto";

import {
  GENERATOR_V2_OUTCOME_REGISTRY,
  generateQuestion,
  publicQuestionOnly,
  validateStudentResponse,
  type CanonicalResponse,
  type FeedbackContract,
  type GeneratedProductQuestion,
  type ProductDifficulty,
  type ProductVariantId,
  type PublicQuestionSnapshot,
} from "./index.ts";

export type LocalV2State = Readonly<{
  attemptToken: string;
  variantId: ProductVariantId;
  outcomeId: string;
  grade: number;
  unitId: string;
  unitTitle: string;
  difficulty: ProductDifficulty;
  status: "IN_PROGRESS" | "COMPLETED";
  revision: number;
  answeredCount: number;
  correctCount: number;
  totalQuestions: 12;
  currentQuestion: PublicQuestionSnapshot | null;
  feedback: (FeedbackContract & { questionId: string; correctAnswer: string }) | null;
}>;

type Attempt = {
  token: string;
  variantId: ProductVariantId;
  outcomeId: string;
  difficulty: ProductDifficulty;
  questions: readonly GeneratedProductQuestion[];
  revision: number;
  answeredCount: number;
  correctCount: number;
  status: "IN_PROGRESS" | "COMPLETED";
  submissions: Map<string, { questionId: string; response: string; state: LocalV2State }>;
};

type RuntimeStore = { attempts: Map<string, Attempt>; completed: number };
const globalRuntime = globalThis as typeof globalThis & { __plaveGeneratorV2Runtime?: RuntimeStore };
const store = globalRuntime.__plaveGeneratorV2Runtime ?? { attempts: new Map(), completed: 0 };
globalRuntime.__plaveGeneratorV2Runtime = store;

function entryFor(outcomeId: string) {
  const entry = GENERATOR_V2_OUTCOME_REGISTRY.find((item) => item.outcomeId === outcomeId);
  if (!entry) throw new Error("GENERATION_V2:LOCAL_OUTCOME_UNKNOWN");
  return entry;
}

function stateFor(attempt: Attempt, feedback: LocalV2State["feedback"] = null): LocalV2State {
  const entry = entryFor(attempt.outcomeId);
  const question = attempt.status === "COMPLETED" ? null : attempt.questions[attempt.answeredCount];
  return {
    attemptToken: attempt.token,
    variantId: attempt.variantId,
    outcomeId: entry.outcomeId,
    grade: entry.grade,
    unitId: entry.unitId,
    unitTitle: entry.outcomeTitle,
    difficulty: attempt.difficulty,
    status: attempt.status,
    revision: attempt.revision,
    answeredCount: attempt.answeredCount,
    correctCount: attempt.correctCount,
    totalQuestions: 12,
    currentQuestion: question ? publicQuestionOnly(question) : null,
    feedback,
  };
}

export function startLocalV2Attempt(outcomeId: string, difficulty: ProductDifficulty) {
  const entry = entryFor(outcomeId);
  const questions = Array.from({ length: 12 }, (_, index) => generateQuestion({
    outcomeId: entry.outcomeId,
    grade: entry.grade,
    difficulty,
    seed: `sprint8ca-browser-${entry.grade}-${entry.outcomeId.toLowerCase()}-${difficulty.toLowerCase()}-${String(index + 1).padStart(2, "0")}`,
    locale: "vi-VN",
  }));
  const token = `v2-${randomBytes(18).toString("hex")}`;
  const attempt: Attempt = {
    token,
    variantId: entry.variantId,
    outcomeId: entry.outcomeId,
    difficulty,
    questions,
    revision: 0,
    answeredCount: 0,
    correctCount: 0,
    status: "IN_PROGRESS",
    submissions: new Map(),
  };
  store.attempts.set(token, attempt);
  return stateFor(attempt);
}

export function getLocalV2Attempt(token: string) {
  const attempt = store.attempts.get(token);
  return attempt ? stateFor(attempt) : null;
}

export function submitLocalV2Answer(input: Readonly<{
  token: string;
  questionId: string;
  response: CanonicalResponse;
  expectedRevision: number;
  submissionKey: string;
}>) {
  const attempt = store.attempts.get(input.token);
  if (!attempt) return { ok: false as const, code: "ATTEMPT_NOT_FOUND" };
  const responseHash = JSON.stringify(input.response);
  const existing = attempt.submissions.get(input.submissionKey);
  if (existing) {
    if (existing.questionId !== input.questionId || existing.response !== responseHash) return { ok: false as const, code: "IDEMPOTENCY_CONFLICT" };
    return { ok: true as const, state: existing.state, duplicate: true };
  }
  if (attempt.status !== "IN_PROGRESS" || input.expectedRevision !== attempt.revision) return { ok: false as const, code: "REVISION_CONFLICT" };
  const question = attempt.questions[attempt.answeredCount];
  if (!question || question.publicSnapshot.questionId !== input.questionId) return { ok: false as const, code: "QUESTION_MISMATCH" };
  const feedback = validateStudentResponse(question, input.response);
  attempt.answeredCount += 1;
  attempt.correctCount += feedback.isCorrect ? 1 : 0;
  attempt.revision += 1;
  if (attempt.answeredCount === 12) {
    attempt.status = "COMPLETED";
    store.completed += 1;
  }
  const state = stateFor(attempt, {
    ...feedback,
    questionId: question.publicSnapshot.questionId,
    correctAnswer: formatCorrectAnswer(question),
  });
  attempt.submissions.set(input.submissionKey, { questionId: input.questionId, response: responseHash, state });
  return { ok: true as const, state, duplicate: false };
}

function formatCorrectAnswer(question: GeneratedProductQuestion) {
  const value = question.privateSolution.correctResponse;
  const options = question.publicSnapshot.interaction.options ?? [];
  if (typeof value === "string") return options.find((option) => option.id === value)?.label ?? value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => typeof item === "string" ? (options.find((option) => option.id === item)?.label ?? item) : `${item.leftId} = ${item.rightId}`).join("; ");
  }
  if ("numerator" in value) return `${value.numerator}/${value.denominator}`;
  const option = options.find((item) => item.id === String(value));
  return option?.label ?? String(value);
}

export function localV2HistorySummary() {
  return { completedAttempts: store.completed };
}

export function isLocalV2RequestAllowed(request: Request) {
  if (process.env.NODE_ENV !== "development" || process.env.PLAVE_GENERATOR_V2_LOCAL !== "true") return false;
  const url = new URL(request.url);
  return url.hostname === "127.0.0.1" || url.hostname === "localhost";
}
