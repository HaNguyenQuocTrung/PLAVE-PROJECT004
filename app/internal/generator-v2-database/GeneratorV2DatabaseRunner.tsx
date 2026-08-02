"use client";

import { useEffect, useRef, useState } from "react";

import type {
  CanonicalResponse,
  ProductDifficulty,
  ProductInteractionContract,
  ProductVariantId,
  ProductVisual,
  PublicQuestionSnapshot,
} from "@/lib/generation-v2/types";
import {
  AnswerControl,
  QuestionVisual,
  isAnswerReady,
} from "@/app/internal/generator-v2/GeneratorV2LocalRunner";
import {
  displayGeneratorV2DatabaseAnswer,
  serializeGeneratorV2DatabaseAnswer,
} from "@/lib/generation-v2/answer-transport";

import styles from "@/app/internal/generator-v2/generator-v2.module.css";

type DatabaseQuestion = {
  questionId: string;
  position: number;
  prompt: string;
  answerType: string;
  options: readonly { key: string; label: string }[] | null;
  visual: Record<string, unknown>;
  cognitiveLevel: string;
};
type DatabaseFeedback = {
  questionId: string;
  isCorrect: boolean;
  correctAnswer: string;
  solutionSteps: readonly string[];
  feedback: string;
};
type DatabaseState = {
  attemptId: string;
  unitTitle: string;
  grade: number;
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  revision: number;
  answeredCount: number;
  correctCount: number;
  totalQuestions: number;
  currentQuestion: DatabaseQuestion | null;
  feedback: DatabaseFeedback | null;
};
type Entry = {
  variantId: ProductVariantId;
  outcomeId: string;
  grade: number;
  title: string;
  family: string;
};

export function GeneratorV2DatabaseRunner({ entries }: { entries: readonly Entry[] }) {
  const feedbackRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<DatabaseState | null>(null);
  const [submittedQuestion, setSubmittedQuestion] = useState<PublicQuestionSnapshot | null>(null);
  const [difficulty, setDifficulty] = useState<ProductDifficulty>("HARD");
  const [answer, setAnswer] = useState<CanonicalResponse>("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [historyCount, setHistoryCount] = useState(0);
  const current = state?.currentQuestion ? toPublicQuestion(state.currentQuestion) : null;
  const question = state?.feedback ? submittedQuestion : current;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    const attemptId = new URL(window.location.href).searchParams.get("attempt");
    if (attemptId) {
      void fetch(`/api/internal/generator-v2-database/state?attemptId=${encodeURIComponent(attemptId)}`, { cache: "no-store" })
        .then((response) => response.json())
        .then((payload) => {
          if (payload.data) setState(payload.data);
          else setError("Chưa thể khôi phục lượt luyện tập.");
        });
    }
    void refreshHistory(setHistoryCount);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (state?.feedback) requestAnimationFrame(() => feedbackRef.current?.focus());
  }, [state?.feedback]);

  useEffect(() => {
    if (state?.status === "COMPLETED" && !state.feedback) {
      void refreshHistory(setHistoryCount);
    }
  }, [state?.status, state?.feedback]);

  async function start(entry: Entry) {
    setBusy(true);
    setError("");
    const response = await fetch("/api/internal/generator-v2-database/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outcomeId: entry.outcomeId,
        difficulty,
        idempotencyKey: crypto.randomUUID(),
      }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok || !payload.data) {
      setError(`Chưa thể mở bài luyện tập (${payload.error?.code ?? "REQUEST_FAILED"}).`);
      return;
    }
    setState(payload.data);
    setAnswer("");
    setSubmittedQuestion(null);
    const url = new URL(window.location.href);
    url.searchParams.set("attempt", payload.data.attemptId);
    window.history.replaceState({}, "", url);
  }

  async function submit() {
    if (!state || !question || state.feedback || busy || !isAnswerReady(question, answer)) return;
    const answerTransport = serializeGeneratorV2DatabaseAnswer(
      question.interaction,
      answer,
    );
    if (answerTransport === null) {
      setError("Câu trả lời chưa hợp lệ.");
      return;
    }
    setBusy(true);
    setError("");
    const response = await fetch("/api/internal/generator-v2-database/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attemptId: state.attemptId,
        questionId: question.questionId,
        answer: answerTransport,
        expectedRevision: state.revision,
        idempotencyKey: crypto.randomUUID(),
      }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok || !payload.data) {
      setError(`Câu trả lời chưa được ghi nhận (${payload.error?.code ?? "REQUEST_FAILED"}).`);
      return;
    }
    setSubmittedQuestion(question);
    setState(payload.data);
  }

  function next() {
    if (!state?.feedback) return;
    setState({ ...state, feedback: null });
    setSubmittedQuestion(null);
    setAnswer("");
  }

  if (!state) {
    return (
      <main className={styles.shell} data-generator-v2-database-catalog data-client-ready={ready}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>PLAVE · Generator V2 · Database proof</p>
          <h1>Chọn năng lực Toán của lớp {entries[0]?.grade}</h1>
          <p>Câu hỏi sẽ được tạo, ký và lưu vào database cục bộ trước khi hiển thị.</p>
          <label className={styles.difficulty}>Mức độ
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as ProductDifficulty)}>
              <option value="EASY">Cơ bản</option><option value="MEDIUM">Vận dụng</option><option value="HARD">Thử thách</option>
            </select>
          </label>
        </header>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <section className={styles.variantGrid} aria-label="Năng lực Generator V2 của lớp hiện tại">
          {entries.map((entry) => <article className={styles.variant} key={entry.outcomeId} data-variant={entry.variantId} data-outcome={entry.outcomeId}>
            <span>Lớp {entry.grade}</span><h2>{entry.title}</h2><p>{entry.family.replaceAll("_", " ")}</p>
            <button disabled={!ready || busy} onClick={() => void start(entry)}>Bắt đầu luyện tập</button>
          </article>)}
        </section>
        <p className={styles.history}>Lượt database đã hoàn thành: {historyCount}</p>
      </main>
    );
  }

  if (state.status === "COMPLETED" && !state.feedback) {
    return <main className={styles.shell}><section className={styles.complete} data-result-summary>
      <span className={styles.completeIcon} aria-hidden="true">✓</span><p className={styles.eyebrow}>Đã lưu vào lịch sử</p>
      <h1>Em đã hoàn thành {state.totalQuestions} câu</h1><p className={styles.score}>Đúng {state.correctCount}/{state.totalQuestions} câu</p>
      <p>Lượt học đã được hoàn tất đúng một lần trong database disposable.</p>
      <p data-history-count>Lịch sử hiện có {historyCount} lượt.</p>
    </section></main>;
  }

  if (!question) return <main className={styles.shell}><h1>Chưa thể tải câu hỏi</h1></main>;
  const progress = Math.round((state.answeredCount / state.totalQuestions) * 100);
  const activeOutcomeTitle = entries.find((entry) => entry.outcomeId === question.outcomeId)?.title ?? state.unitTitle;
  return <main className={styles.practiceShell} data-generator-v2-database-runtime>
    <header className={styles.practiceHeader}><div><p className={styles.eyebrow}>Lớp {state.grade} · Đã persist</p><h1>{activeOutcomeTitle}</h1></div></header>
    <div className={styles.progressRow}><div><span style={{ width: `${progress}%` }} /></div><p>Câu {Math.min(state.answeredCount + 1, state.totalQuestions)}/{state.totalQuestions}</p></div>
    <section className={styles.questionCard}>
      <QuestionVisual question={question} /><h2>{question.publicPrompt}</h2><p className={styles.instruction}>{question.accessibility.responseInstruction}</p>
      <AnswerControl question={question} value={answer} onChange={setAnswer} disabled={Boolean(state.feedback) || busy} />
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {state.feedback ? <div ref={feedbackRef} tabIndex={-1} className={`${styles.feedback} ${state.feedback.isCorrect ? styles.correct : styles.incorrect}`} data-feedback={state.feedback.isCorrect ? "correct" : "incorrect"} aria-live="polite">
        <h3>{state.feedback.isCorrect ? "Chính xác" : "Mình xem lại nhé"}</h3><p>{state.feedback.feedback}</p><p><strong>Đáp án:</strong> {displayGeneratorV2DatabaseAnswer(question.interaction, state.feedback.correctAnswer)}</p>
        <ol>{state.feedback.solutionSteps.map((step) => <li key={step}>{step}</li>)}</ol>
      </div> : null}
      <div className={styles.actions}>{state.feedback ? <button onClick={next}>{state.status === "COMPLETED" ? "Xem kết quả" : "Câu tiếp theo"}</button> : <button disabled={busy || !isAnswerReady(question, answer)} onClick={() => void submit()}>{busy ? "Đang kiểm tra…" : "Kiểm tra"}</button>}</div>
    </section>
  </main>;
}

function toPublicQuestion(question: DatabaseQuestion): PublicQuestionSnapshot | null {
  const contract = question.visual.productContract;
  if (!isRecord(contract) || !isRecord(contract.interaction) || !isRecord(contract.accessibility) || !isRecord(question.visual.data)) return null;
  return {
    schemaVersion: 2,
    questionId: question.questionId,
    grade: Number(contract.grade),
    outcomeId: String(contract.outcomeId),
    productFamilyId: String(contract.productFamilyId),
    variantId: String(contract.variantId) as ProductVariantId,
    variantVersion: "product-v2-1",
    difficulty: String(contract.difficulty) as ProductDifficulty,
    publicPrompt: question.prompt,
    publicData: isRecord(contract.publicData) ? contract.publicData : {},
    interaction: contract.interaction as ProductInteractionContract,
    visual: {
      type: String(question.visual.type) as ProductVisual["type"],
      description: String(question.visual.description),
      data: question.visual.data,
    },
    accessibility: {
      prompt: String(contract.accessibility.prompt),
      visualAlternative: String(contract.accessibility.visualAlternative),
      responseInstruction: String(contract.accessibility.responseInstruction),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function refreshHistory(setCount: (count: number) => void) {
  const response = await fetch("/api/internal/generator-v2-database/history", { cache: "no-store" });
  const payload = await response.json().catch(() => null);
  if (payload?.data?.attempts) setCount(payload.data.attempts.filter((item: { status: string }) => item.status === "COMPLETED").length);
}
