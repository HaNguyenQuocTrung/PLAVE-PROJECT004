"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import type {
  CanonicalResponse,
  FeedbackContract,
  ProductDifficulty,
  ProductVariantId,
  PublicQuestionSnapshot,
} from "@/lib/generation-v2/types";

import styles from "./generator-v2.module.css";

type State = Readonly<{
  variantId: ProductVariantId;
  grade: number;
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

type Entry = Readonly<{ outcomeId: string; variantId: ProductVariantId; grade: number; title: string; family: string }>;

const VISUAL_SHAPE_LABELS: Readonly<Record<string, string>> = {
  CUBE: "hình lập phương",
  RECTANGULAR_PRISM: "hình hộp chữ nhật",
  TRIANGULAR_PRISM: "lăng trụ đứng tam giác",
  QUADRILATERAL_PRISM: "lăng trụ đứng tứ giác",
  TRIANGULAR_PYRAMID: "hình chóp tam giác",
  SQUARE_PYRAMID: "hình chóp tứ giác đều",
  TRIANGLE: "hình tam giác",
  EQUILATERAL_TRIANGLE: "tam giác đều",
  QUADRILATERAL: "hình tứ giác",
  SQUARE: "hình vuông",
  RECTANGLE: "hình chữ nhật",
  RHOMBUS: "hình thoi",
  PARALLELOGRAM: "hình bình hành",
  TRAPEZOID: "hình thang",
  ISOSCELES_TRAPEZOID: "hình thang cân",
  REGULAR_HEXAGON: "hình lục giác đều",
};

function visualShapeLabel(shape: string) {
  return VISUAL_SHAPE_LABELS[shape] ?? "hình đã cho";
}

export function GeneratorV2LocalRunner({ entries }: { entries: readonly Entry[] }) {
  const feedbackRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State | null>(null);
  const [clientReady, setClientReady] = useState(false);
  const [submittedQuestion, setSubmittedQuestion] = useState<PublicQuestionSnapshot | null>(null);
  const [difficulty, setDifficulty] = useState<ProductDifficulty>("HARD");
  const [answer, setAnswer] = useState<CanonicalResponse>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [historyCount, setHistoryCount] = useState(0);
  const question = state?.feedback ? submittedQuestion : state?.currentQuestion;

  useEffect(() => {
    const readyFrame = requestAnimationFrame(() => setClientReady(true));
    void fetch("/api/internal/generator-v2/state", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (payload.data) setState(payload.data);
        setHistoryCount(payload.history?.completedAttempts ?? 0);
      });
    return () => cancelAnimationFrame(readyFrame);
  }, []);

  useEffect(() => {
    if (state?.feedback) requestAnimationFrame(() => feedbackRef.current?.focus());
  }, [state?.feedback]);

  useEffect(() => {
    if ((state?.answeredCount === 0 && state.status === "IN_PROGRESS") || (state?.status === "COMPLETED" && !state.feedback)) {
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
    }
  }, [state?.answeredCount, state?.feedback, state?.status]);

  async function start(outcomeId: string) {
    setBusy(true);
    setError("");
    const response = await fetch("/api/internal/generator-v2/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcomeId, difficulty }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok || !payload.data) return setError("Chưa thể mở bài luyện tập cục bộ.");
    setState(payload.data);
    setSubmittedQuestion(null);
    setAnswer("");
  }

  async function submit() {
    if (!state || !question || state.feedback || busy || !isAnswerReady(question, answer)) return;
    setBusy(true);
    setError("");
    const submissionKey = `submission-${crypto.randomUUID().replaceAll("-", "")}`;
    const response = await fetch("/api/internal/generator-v2/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.questionId, response: answer, expectedRevision: state.revision, submissionKey }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok || !payload.state) return setError("Câu trả lời chưa được ghi nhận. Em có thể thử lại an toàn.");
    setSubmittedQuestion(question);
    setState(payload.state);
  }

  function next() {
    if (!state?.feedback) return;
    setState({ ...state, feedback: null });
    setSubmittedQuestion(null);
    setAnswer("");
  }

  if (!state) {
    return (
      <main className={styles.shell} data-client-ready={clientReady}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>PLAVE · Generator V2</p>
          <h1>Chọn một năng lực Toán để luyện tập</h1>
          <p>Các outcome Generator V2 thật được tạo, kiểm tra và giữ nguyên trong suốt lần học.</p>
          <label className={styles.difficulty}>Mức độ
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as ProductDifficulty)}>
              <option value="EASY">Cơ bản</option><option value="MEDIUM">Vận dụng</option><option value="HARD">Thử thách</option>
            </select>
          </label>
        </header>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <section className={styles.variantGrid} aria-label="Các năng lực trong vertical slice">
          {entries.map((entry) => (
            <article className={styles.variant} key={entry.outcomeId} data-variant={entry.variantId} data-outcome={entry.outcomeId}>
              <span>Lớp {entry.grade} · {entry.outcomeId}</span><h2>{entry.title}</h2><p>{familyLabel(entry.family)}</p>
              <button disabled={busy || !clientReady} onClick={() => void start(entry.outcomeId)}>Bắt đầu luyện tập</button>
            </article>
          ))}
        </section>
        <p className={styles.history}>Lượt đã hoàn thành trong phiên local: {historyCount}</p>
      </main>
    );
  }

  if (state.status === "COMPLETED" && !state.feedback) {
    return (
      <main className={styles.shell}>
        <section className={styles.complete} data-result-summary>
          <span className={styles.completeIcon} aria-hidden="true">✓</span>
          <p className={styles.eyebrow}>Đã hoàn thành</p>
          <h1>Em đã hoàn thành 12 câu</h1>
          <p className={styles.score}>Đúng {state.correctCount}/{state.totalQuestions} câu</p>
          <p>Kết quả đã được ghi nhận đúng một lần trong phiên kiểm chứng local.</p>
          <button onClick={() => setState(null)}>Chọn năng lực khác</button>
        </section>
      </main>
    );
  }

  if (!question) return <main className={styles.shell}><h1>Chưa thể tải câu hỏi</h1></main>;
  const progress = Math.round((state.answeredCount / state.totalQuestions) * 100);
  return (
    <main className={styles.practiceShell} data-generator-v2-runtime>
      <header className={styles.practiceHeader}>
        <div><p className={styles.eyebrow}>Lớp {state.grade} · {difficultyLabel(state.difficulty)}</p><h1>{state.unitTitle}</h1></div>
        <button className={styles.quiet} onClick={() => setState(null)}>Đổi bài</button>
      </header>
      <div className={styles.progressRow}><div><span style={{ width: `${progress}%` }} /></div><p>Câu {Math.min(state.answeredCount + 1, 12)}/12</p></div>
      <section className={styles.questionCard} data-variant={state.variantId}>
        <QuestionVisual question={question} />
        <h2>{question.publicPrompt}</h2>
        <p className={styles.instruction}>{question.accessibility.responseInstruction}</p>
        <AnswerControl question={question} value={answer} onChange={setAnswer} disabled={Boolean(state.feedback) || busy} />
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {state.feedback ? (
          <div ref={feedbackRef} tabIndex={-1} className={`${styles.feedback} ${state.feedback.isCorrect ? styles.correct : styles.incorrect}`} data-feedback={state.feedback.isCorrect ? "correct" : "incorrect"} aria-live="polite">
            <h3>{state.feedback.headline}</h3><p>{state.feedback.explanation}</p>
            <p><strong>Đáp án:</strong> {state.feedback.correctAnswer}</p>
            <ol>{state.feedback.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            <p className={styles.nextStep}>{state.feedback.nextStep}</p>
          </div>
        ) : null}
        <div className={styles.actions}>
          {state.feedback ? <button onClick={next}>{state.status === "COMPLETED" ? "Xem kết quả" : "Câu tiếp theo"}</button> : <button disabled={busy || !isAnswerReady(question, answer)} onClick={() => void submit()}>{busy ? "Đang kiểm tra…" : "Kiểm tra"}</button>}
        </div>
      </section>
    </main>
  );
}

export function AnswerControl({ question, value, onChange, disabled }: { question: PublicQuestionSnapshot; value: CanonicalResponse; onChange: (value: CanonicalResponse) => void; disabled: boolean }) {
  const interaction = question.interaction;
  if (["SINGLE_CHOICE", "CONSTRUCTION_OR_VISUAL_SELECTION"].includes(interaction.type)) return (
    <fieldset className={styles.choices}><legend className="sr-only">Chọn một đáp án</legend>{interaction.options?.map((option) => (
      <label className={value === option.id ? styles.selected : ""} key={option.id}><input type="radio" name="answer" value={option.id} checked={value === option.id} onChange={() => onChange(option.id)} disabled={disabled} /><span>{option.label}</span></label>
    ))}</fieldset>
  );
  if (interaction.type === "MULTI_SELECT") {
    const selected = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
    return <fieldset className={styles.choices}><legend className="sr-only">Chọn các đáp án đúng</legend>{interaction.options?.map((option) => <label className={selected.includes(option.id) ? styles.selected : ""} key={option.id}><input type="checkbox" checked={selected.includes(option.id)} onChange={() => onChange(selected.includes(option.id) ? selected.filter((id) => id !== option.id) : [...selected, option.id])} disabled={disabled} /><span>{option.label}</span></label>)}</fieldset>;
  }
  if (interaction.type === "FRACTION_INPUT") {
    const fraction = typeof value === "object" && !Array.isArray(value) && "numerator" in value ? value : { numerator: 0, denominator: 0 };
    return <div className={styles.fractionInput}><label>Tử số<input aria-label="Tử số" inputMode="numeric" value={fraction.numerator || ""} onChange={(event) => onChange({ ...fraction, numerator: Number(event.target.value) })} disabled={disabled} /></label><span aria-hidden="true" /><label>Mẫu số<input aria-label="Mẫu số" inputMode="numeric" value={fraction.denominator || ""} onChange={(event) => onChange({ ...fraction, denominator: Number(event.target.value) })} disabled={disabled} /></label></div>;
  }
  if (interaction.type === "ORDERING") {
    const ordered = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
    return <div className={styles.ordering}><p>Thứ tự đã chọn: {ordered.length ? ordered.join(" → ") : "Chưa có"}</p><div>{interaction.options?.map((option) => <button type="button" key={option.id} disabled={disabled || ordered.includes(option.id)} onClick={() => onChange([...ordered, option.id])}>{option.label}</button>)}</div><button type="button" className={styles.reset} disabled={disabled || !ordered.length} onClick={() => onChange([])}>Xếp lại</button></div>;
  }
  if (interaction.type === "MATCHING") {
    const pairs = Array.isArray(value) ? value.filter((item): item is { leftId: string; rightId: string } => typeof item === "object") : [];
    return <div className={styles.matching}>{interaction.leftItems?.map((left) => <label key={left.id}><span>{left.label} =</span><select aria-label={`Giá trị của ${left.label}`} disabled={disabled} value={pairs.find((pair) => pair.leftId === left.id)?.rightId ?? ""} onChange={(event) => onChange([...pairs.filter((pair) => pair.leftId !== left.id), { leftId: left.id, rightId: event.target.value }])}><option value="">Chọn</option>{interaction.rightItems?.map((right) => <option key={right.id} value={right.id}>{right.label}</option>)}</select></label>)}</div>;
  }
  return <label className={styles.textInput}>{interaction.inputLabel ?? "Câu trả lời"}<input type="text" inputMode={interaction.inputMode ?? "numeric"} value={typeof value === "string" || typeof value === "number" ? value : ""} onChange={(event) => onChange(event.target.value)} disabled={disabled} />{interaction.unitLabel ? <span>{interaction.unitLabel}</span> : null}</label>;
}

export function QuestionVisual({ question }: { question: PublicQuestionSnapshot }) {
  const { visual } = question;
  const data = visual.data;
  if (visual.type === "NONE") return null;
  if (visual.type === "OBJECT_GROUPS") {
    const groupSizes = Array.isArray(data.groups)
      ? data.groups.map(Number)
      : Array.from({ length: Number(data.groups ?? 2) }, () => Number(data.itemsPerGroup ?? 1));
    return <div className={styles.objectGroups} role="img" aria-label={visual.description}>{groupSizes.map((size, group) => <div key={group}>{Array.from({ length: Math.min(size, 10) }, (_, item) => <span key={item} />)}</div>)}</div>;
  }
  if (visual.type === "FRACTION_MODEL") {
    const totalParts = Math.max(1, Number(data.totalParts));
    return <div className={styles.fractionModel} role="img" aria-label={visual.description} style={{ gridTemplateColumns: `repeat(${totalParts}, minmax(6px, 1fr))` }}>{Array.from({ length: totalParts }, (_, index) => <span className={numberList(data.highlightedParts).includes(index) ? styles.filled : ""} key={index} />)}</div>;
  }
  if (visual.type === "PLACE_VALUE_CHART") {
    const columns = stringList(data.columns);
    const scale = Math.max(1, Number(data.scale ?? 1));
    const decimalPlaces = Number.isInteger(Math.log10(scale)) ? Math.log10(scale) : 0;
    const firstFractionalColumn = columns.findIndex((column) => column.startsWith("Phần"));
    const integerColumnCount = firstFractionalColumn === -1 ? columns.length : firstFractionalColumn;
    const fractionalColumnCount = columns.length - integerColumnCount;
    const rows = numberList(data.values).map((raw) => {
      const absolute = Math.abs(raw);
      const integerDigits = String(Math.floor(absolute / scale)).padStart(integerColumnCount, "0").slice(-integerColumnCount);
      const fractionalDigits = String(absolute % scale).padStart(decimalPlaces, "0").padEnd(fractionalColumnCount, "0").slice(0, fractionalColumnCount);
      const digits = [...integerDigits, ...fractionalDigits];
      if (raw < 0 && digits.length > 0) digits[0] = `−${digits[0]}`;
      return digits;
    });
    return <div className={styles.tableWrap} role="img" aria-label={visual.description}><table><caption>Bảng giá trị theo hàng</caption><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((digits, rowIndex) => <tr key={rowIndex}>{digits.map((digit, index) => <td key={index}>{digit}</td>)}</tr>)}</tbody></table></div>;
  }
  if (visual.type === "SHAPE_DIAGRAM" && data.shape === "SYMMETRY") {
    const symmetry = String(data.symmetry);
    return <svg className={styles.shape} role="img" aria-label={visual.description} viewBox="0 0 320 180">{symmetry === "CENTER" ? <><rect x="80" y="38" width="160" height="104" rx="18" /><circle cx="160" cy="90" r="6" /><text x="121" y="169">Tâm đối xứng</text></> : symmetry === "HORIZONTAL_AXIS" ? <><ellipse cx="160" cy="90" rx="92" ry="50" /><line x1="55" y1="90" x2="265" y2="90" strokeDasharray="8 6" /><text x="111" y="169">Trục đối xứng</text></> : <><ellipse cx="160" cy="90" rx="55" ry="72" /><line x1="160" y1="8" x2="160" y2="172" strokeDasharray="8 6" /><text x="111" y="169">Trục đối xứng</text></>}</svg>;
  }
  if (visual.type === "SHAPE_DIAGRAM") {
    const shape = String(data.shape ?? "GEOMETRY");
    const values = numberList(data.values);
    if (["MIDLINE_DEFINITION", "MIDLINE_LENGTH"].includes(String(data.operation))) {
      return <svg className={styles.shape} role="img" aria-label={visual.description} viewBox="0 0 320 180"><path d="M45 150 L160 25 L275 150 Z" /><line x1="102.5" y1="87.5" x2="217.5" y2="87.5" strokeWidth="4" /><circle cx="102.5" cy="87.5" r="4" /><circle cx="217.5" cy="87.5" r="4" /><text x="35" y="168">A</text><text x="155" y="20">B</text><text x="278" y="168">C</text><text x="86" y="80">M</text><text x="225" y="80">N</text>{data.operation === "MIDLINE_LENGTH" ? <><text x="151" y="111">MN = ?</text><text x="143" y="168">AC = {values[0]}</text></> : <text x="127" y="111">đường trung bình MN</text>}</svg>;
    }
    const grid = data.operation === "SELECT_GRID_DRAWING"
      ? <g opacity=".35">{Array.from({ length: 11 }, (_, index) => <g key={index}><line x1={35 + index * 25} y1="20" x2={35 + index * 25} y2="170" /><line x1="35" y1={20 + index * 15} x2="285" y2={20 + index * 15} /></g>)}</g>
      : null;
    if (["TRIANGLE", "EQUILATERAL_TRIANGLE", "RIGHT_TRIANGLE", "TRIANGLE_SPECIAL_LINE", "TWO_TRIANGLES", "SIMILAR_TRIANGLES"].includes(shape)) {
      return <svg className={styles.shape} role="img" aria-label={visual.description} viewBox="0 0 320 180">{grid}<path d="M45 145 L145 32 L250 145 Z" />{shape === "RIGHT_TRIANGLE" ? <path d="M45 145 h18 v-18" /> : null}{shape === "TRIANGLE_SPECIAL_LINE" ? <line x1="145" y1="32" x2="145" y2="145" strokeDasharray="7 5" /> : null}{shape === "TWO_TRIANGLES" || shape === "SIMILAR_TRIANGLES" ? <path d="M205 120 L252 65 L295 120 Z" /> : null}<text x="34" y="163">A</text><text x="140" y="25">B</text><text x="253" y="163">C</text>{values.slice(0, 3).map((value, index) => <text key={index} x={[75, 184, 139][index]} y={[87, 88, 164][index]}>{value}</text>)}</svg>;
    }
    if (["CIRCLE", "CIRCLE_ANGLES", "CIRCLE_RELATION", "INSCRIBED_CIRCUMSCRIBED"].includes(shape)) {
      return <svg className={styles.shape} role="img" aria-label={visual.description} viewBox="0 0 320 180"><circle cx="160" cy="90" r="62" /><circle cx="160" cy="90" r="4" /><line x1="98" y1="90" x2="222" y2="90" />{shape === "CIRCLE_ANGLES" ? <><line x1="115" y1="47" x2="210" y2="124" /><line x1="115" y1="47" x2="160" y2="90" /></> : null}{shape === "INSCRIBED_CIRCUMSCRIBED" ? <path d="M160 30 L106 126 L214 126 Z" /> : null}{shape === "CIRCLE_RELATION" ? <circle cx="252" cy="90" r="30" /> : null}<text x="149" y="82">O</text><text x="87" y="84">A</text><text x="226" y="84">B</text>{values.slice(0, 3).map((value, index) => <text key={index} x={105 + index * 65} y="166">{value}</text>)}</svg>;
    }
    if (shape === "ANGLE" || shape === "LINES") {
      return <svg className={styles.shape} role="img" aria-label={visual.description} viewBox="0 0 320 180"><line x1="55" y1="135" x2="260" y2="135" /><line x1="55" y1="135" x2={shape === "LINES" ? 245 : 210} y2="35" />{shape === "LINES" ? <line x1="65" y1="45" x2="270" y2="45" /> : <path d="M94 135 A39 39 0 0 0 87 115" />}<text x="80" y="122">{values[0] ?? ""}°</text></svg>;
    }
    if (shape === "POINT_LINE") {
      return <svg className={styles.shape} role="img" aria-label={visual.description} viewBox="0 0 320 180"><line x1="35" y1="90" x2="285" y2="90" />{values.map((value, index) => <g key={index}><circle cx={70 + index * 90} cy="90" r="5" /><text x={62 + index * 90} y="76">{String.fromCharCode(65 + index)}({value})</text></g>)}</svg>;
    }
    if (["CUBE", "RECTANGULAR_PRISM", "TRIANGULAR_PRISM", "QUADRILATERAL_PRISM", "TRIANGULAR_PYRAMID", "SQUARE_PYRAMID"].includes(shape)) {
      return <svg className={styles.shape} role="img" aria-label={visual.description} viewBox="0 0 320 180"><path d="M80 55 H220 V145 H80 Z M80 55 L120 28 H260 V118 L220 145 M220 55 L260 28 M260 118 H220" /><text x="160" y="168" textAnchor="middle">{visualShapeLabel(shape)}</text></svg>;
    }
    if (shape === "SPHERE" || shape === "CYLINDER") return <svg className={styles.shape} role="img" aria-label={visual.description} viewBox="0 0 320 180">{shape === "SPHERE" ? <><circle cx="160" cy="90" r="60" /><ellipse cx="160" cy="90" rx="60" ry="18" /></> : <><ellipse cx="160" cy="45" rx="55" ry="18" /><path d="M105 45 V135 M215 45 V135" /><ellipse cx="160" cy="135" rx="55" ry="18" /></>}</svg>;
    if (shape === "REGULAR_POLYGON" || shape === "REGULAR_HEXAGON") return <svg className={styles.shape} role="img" aria-label={visual.description} viewBox="0 0 320 180"><path d="M160 24 L224 61 L224 129 L160 166 L96 129 L96 61 Z" />{data.operation === "SELECT_HEXAGON_ASSEMBLY" ? <><line x1="160" y1="95" x2="160" y2="24" /><line x1="160" y1="95" x2="224" y2="61" /><line x1="160" y1="95" x2="224" y2="129" /><line x1="160" y1="95" x2="160" y2="166" /><line x1="160" y1="95" x2="96" y2="129" /><line x1="160" y1="95" x2="96" y2="61" /></> : <line x1="160" y1="15" x2="160" y2="170" strokeDasharray="7 5" />}</svg>;
    if (["SHAPE_ASSEMBLY", "FOLD_CUT_ASSEMBLY", "DECORATIVE_ASSEMBLY", "APPLIED_SHAPE_CONSTRUCTION", "SHAPE_CONSTRUCTION"].includes(shape)) return <svg className={styles.shape} role="img" aria-label={visual.description} viewBox="0 0 320 180"><path d="M35 135 L95 35 L155 135 Z M95 35 L155 135 L215 35 Z" /><path d="M238 55 H298 V115 H238 Z" /><path d="M215 85 H230" /><text x="95" y="158" textAnchor="middle">các mảnh ghép</text><text x="268" y="138" textAnchor="middle">hình ghép</text></svg>;
    if (["CIRCLE_WITH_COMPASS", "RIGHT_ANGLE_AND_CIRCLE", "CIRCLE_TRIANGLE_POLYGON_DRAWING"].includes(shape)) return <svg className={styles.shape} role="img" aria-label={visual.description} viewBox="0 0 320 180"><circle cx="105" cy="92" r="48" /><circle cx="105" cy="92" r="4" /><line x1="105" y1="92" x2="153" y2="92" />{shape !== "CIRCLE_WITH_COMPASS" ? <path d="M195 142 V72 H265" /> : <path d="M195 35 L235 145 M195 35 L160 145" />}<text x="80" y="160">đường tròn</text></svg>;
    if (["SYMMETRY_FOLD", "ANGLE_BISECTOR_PARALLEL_PRISM", "SOFTWARE_GEOMETRY", "PYRAMID_PERSPECTIVE", "SIMILARITY_DRAWING"].includes(shape)) return <svg className={styles.shape} role="img" aria-label={visual.description} viewBox="0 0 320 180">{shape === "SYMMETRY_FOLD" ? <><path d="M80 145 Q160 20 240 145 Z" /><line x1="160" y1="25" x2="160" y2="155" strokeDasharray="7 5" /></> : shape === "ANGLE_BISECTOR_PARALLEL_PRISM" ? <><path d="M40 140 L145 40 L255 140" /><line x1="145" y1="40" x2="145" y2="140" strokeDasharray="7 5" /><line x1="65" y1="112" x2="225" y2="112" /></> : shape === "PYRAMID_PERSPECTIVE" ? <><path d="M160 28 L70 145 H250 Z M160 28 L160 145" /><line x1="70" y1="145" x2="160" y2="105" strokeDasharray="7 5" /><line x1="250" y1="145" x2="160" y2="105" strokeDasharray="7 5" /></> : shape === "SIMILARITY_DRAWING" ? <><path d="M35 140 L90 55 L145 140 Z M180 140 L225 70 L270 140 Z" /></> : <><rect x="45" y="28" width="230" height="125" rx="8" /><line x1="45" y1="53" x2="275" y2="53" /><path d="M85 130 L140 72 L205 130 Z" /></>}</svg>;
    if (shape === "PROOF") {
      const theorem = String(data.theorem ?? "");
      return <svg className={styles.shape} role="img" aria-label={visual.description} viewBox="0 0 320 180">{theorem === "ISOSCELES_BASE_ANGLES" ? <><path d="M55 145 L160 30 L265 145 Z" /><path d="M89 108 l10 7 M221 108 l-10 7" /></> : theorem === "PARALLEL_ALTERNATE_ANGLES" ? <><line x1="45" y1="45" x2="275" y2="45" /><line x1="45" y1="135" x2="275" y2="135" /><line x1="105" y1="15" x2="215" y2="165" /><path d="M122 45 A24 24 0 0 0 130 63 M190 117 A24 24 0 0 0 198 135" /></> : <><line x1="55" y1="35" x2="265" y2="145" /><line x1="55" y1="145" x2="265" y2="35" /><path d="M139 79 A28 28 0 0 0 139 101 M181 79 A28 28 0 0 1 181 101" /></>}<text x="102" y="171">Sơ đồ chứng minh</text></svg>;
    }
    if (shape === "SPATIAL_SCENE") {
      const relation = String(data.relation ?? "LEFT");
      const ball = relation === "ABOVE" ? { x: 110, y: 40 } : relation === "BELOW" ? { x: 110, y: 135 } : relation === "RIGHT" ? { x: 245, y: 95 } : relation === "BETWEEN" ? { x: 160, y: 95 } : relation === "IN_FRONT" ? { x: 150, y: 120 } : { x: 75, y: 95 };
      const box = relation === "ABOVE" ? { x: 75, y: 100 } : relation === "BELOW" ? { x: 75, y: 20 } : relation === "RIGHT" ? { x: 55, y: 63 } : relation === "BETWEEN" ? { x: 35, y: 63 } : relation === "IN_FRONT" ? { x: 160, y: 45 } : { x: 205, y: 63 };
      const ballLabel = relation === "ABOVE" ? { x: 145, y: 46 } : relation === "BELOW" ? { x: 145, y: 142 } : relation === "IN_FRONT" ? { x: 110, y: 165 } : { x: ball.x - 30, y: Math.min(174, ball.y + 40) };
      const boxLabel = relation === "ABOVE" ? { x: 155, y: 135 } : relation === "BELOW" ? { x: 155, y: 55 } : relation === "IN_FRONT" ? { x: 163, y: 34 } : { x: box.x + 3, y: Math.min(174, box.y + 82) };
      return <svg className={styles.shape} role="img" aria-label={visual.description} viewBox="0 0 320 180"><rect x={box.x} y={box.y} width="70" height="64" />{relation === "BETWEEN" ? <rect x="215" y="63" width="70" height="64" /> : null}<circle cx={ball.x} cy={ball.y} r="25" /><text x={ballLabel.x} y={ballLabel.y}>quả bóng</text><text x={boxLabel.x} y={boxLabel.y}>chiếc hộp</text></svg>;
    }
    const polygonPath = shape === "RHOMBUS"
      ? "M160 25 L260 90 L160 155 L60 90 Z"
      : shape === "PARALLELOGRAM"
        ? "M95 35 H270 L225 145 H50 Z"
        : shape === "TRAPEZOID" || shape === "ISOSCELES_TRAPEZOID"
          ? "M105 35 H215 L270 145 H50 Z"
          : shape === "SQUARE"
            ? "M105 35 H215 V145 H105 Z"
            : "M70 35 H250 V145 H70 Z";
    return <svg className={styles.shape} role="img" aria-label={visual.description} viewBox="0 0 320 180">{grid}<path d={polygonPath} /><text x="55" y="30">A</text><text x="260" y="30">B</text><text x="260" y="165">C</text><text x="55" y="165">D</text><text x="160" y="95" textAnchor="middle">{visualShapeLabel(shape)}</text></svg>;
  }
  if (visual.type === "MEASUREMENT_MODEL") {
    const values = numberList(data.values);
    const operation = String(data.operation ?? "MEASURE");
    if (values.length === 0 && data.sourceDisplay) return <div className={styles.measure} role="img" aria-label={visual.description}><span>{String(data.sourceDisplay)}</span><i>→</i><strong>{String(data.target)}</strong></div>;
    if (operation === "READ_CLOCK") {
      const hour = values[0] ?? 12; const minute = values[1] ?? 0; const minuteAngle = minute * 6; const hourAngle = (hour % 12) * 30 + minute / 2;
      return <svg className={styles.shape} role="img" aria-label={visual.description} viewBox="0 0 320 180"><circle cx="160" cy="90" r="66" /><text x="153" y="38">12</text><text x="214" y="96">3</text><text x="157" y="151">6</text><text x="97" y="96">9</text><line x1="160" y1="90" x2={160 + Math.sin(hourAngle * Math.PI / 180) * 36} y2={90 - Math.cos(hourAngle * Math.PI / 180) * 36} /><line x1="160" y1="90" x2={160 + Math.sin(minuteAngle * Math.PI / 180) * 53} y2={90 - Math.cos(minuteAngle * Math.PI / 180) * 53} /><circle cx="160" cy="90" r="4" /></svg>;
    }
    if (operation === "SUM_POLYLINE") return <svg className={styles.shape} role="img" aria-label={visual.description} viewBox="0 0 320 180"><polyline points="25,135 80,55 140,120 205,42 290,120" />{values.slice(0, 4).map((value, index) => <text key={index} x={45 + index * 65} y={index % 2 ? 92 : 112}>{value} {String(data.unit ?? "cm")}</text>)}</svg>;
    const measurementLabels = stringList(data.labels);
    return <div className={styles.tableWrap} role="img" aria-label={visual.description}><table><caption>Bảng dữ kiện đo lường</caption><tbody>{values.map((value, index) => <tr key={index}><th>{measurementLabels[index] ?? `Dữ kiện ${index + 1}`}</th><td>{value} {String(data.unit ?? "")}</td></tr>)}</tbody></table></div>;
  }
  if (visual.type === "AREA_MODEL") {
    const cut = numberList(data.cut); const values = numberList(data.values); const shape = String(data.shape ?? "RECTANGLE");
    if (values.length) return <svg className={styles.shape} role="img" aria-label={visual.description} viewBox="0 0 320 190">{shape.includes("CIRCLE") ? <><circle cx="160" cy="92" r="65" /><line x1="160" y1="92" x2="225" y2="92" /><text x="184" y="84">r={values[0]}</text>{shape === "CIRCLE_MEASURE" && values[2] ? <circle cx="160" cy="92" r={Math.max(18, 65 * values[2] / values[0])} /> : null}</> : shape === "TRIANGLE" ? <><path d="M55 150 L145 35 L270 150 Z" /><line x1="145" y1="35" x2="145" y2="150" strokeDasharray="7 5" /><text x="145" y="171">{values[0]}</text><text x="151" y="95">{values[1]}</text></> : shape === "TRAPEZOID" ? <><path d="M55 150 L100 42 H220 L270 150 Z" /><text x="145" y="35">{values[2]}</text><text x="145" y="171">{values[0]}</text><text x="75" y="100">h={values[1]}</text></> : <><rect x="55" y="40" width="210" height="115" /><text x="145" y="33">{values[0]}</text><text x="270" y="103">{values[1]}</text></>}</svg>;
    return <svg className={styles.shape} role="img" aria-label={visual.description} viewBox="0 0 320 190"><path d={cut.length ? "M45 30 H270 V155 H190 V105 H45 Z" : "M45 30 H270 V155 H45 Z"} /><text x="140" y="22">{String(data.width)} {String(data.unit)}</text><text x="275" y="95">{String(data.height)} {String(data.unit)}</text>{cut.length ? <><text x="221" y="98">{cut[0]} {String(data.unit)}</text><text x="158" y="138">{cut[1]} {String(data.unit)}</text></> : null}</svg>;
  }
  if (visual.type === "BAR_CHART") { const values = numberList(data.values); const labels = stringList(data.labels); const max = Math.max(...values); return <div className={styles.chart} role="img" aria-label={visual.description}>{values.map((value, index) => <div key={labels[index]}><span style={{ height: `${Math.max(15, value / max * 125)}px` }}><b>{value}</b></span><small>{labels[index]}</small></div>)}</div>; }
  if (visual.type === "DATA_TABLE" && data.operation === "DENOMINATION") {
    const value = Number(visualRows(data)[0]?.value ?? 0);
    return <div className={styles.banknote} role="img" aria-label={visual.description}><span>NGÂN HÀNG NHÀ NƯỚC VIỆT NAM</span><strong>{value.toLocaleString("vi-VN")}</strong><b>ĐỒNG</b></div>;
  }
  if (["EXPERIMENT_TABLE", "DATA_TABLE"].includes(visual.type)) {
    const rows = visualRows(data);
    return <div className={styles.tableWrap} role="img" aria-label={visual.description} style={{ width: "100%", maxWidth: "100%" }}><table style={{ width: "100%", minWidth: "100%" }}><caption>{visual.description}</caption><thead><tr>{Object.keys(rows[0] ?? {}).map((key) => <th key={key}>{key === "name" ? "Nhóm" : key === "favorable" ? "Thuận lợi" : key === "total" ? "Tổng lần thử" : "Giá trị"}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{Object.values(row).map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>;
  }
  if (visual.type === "NUMBER_LINE") { const values = numberList(data.values); const minimum = Number(data.minimum ?? Math.min(...values) - 2); const maximum = Number(data.maximum ?? Math.max(...values) + 2); const marked = Number(data.marked ?? values[0] ?? minimum); const markerPosition = maximum === minimum ? 50 : Math.max(0, Math.min(100, ((marked - minimum) / (maximum - minimum)) * 100)); return <div className={`${styles.measure} ${styles.numberLine}`} role="img" aria-label={visual.description}><strong>{minimum}</strong><span aria-hidden="true" style={{ "--marker-position": `${markerPosition}%` } as CSSProperties} /><strong>{maximum}</strong></div>; }
  if (visual.type === "COORDINATE_GRAPH") {
    const coefficients = numberList(data.coefficients);
    const graphKind = String(data.graphKind ?? "FUNCTION");
    const waveDValues = numberList(data.values);
    if (graphKind === "POINT") {
      const x = waveDValues[0] ?? 0; const y = waveDValues[1] ?? 0;
      return <svg className={styles.shape} role="img" aria-label={visual.description} viewBox="0 0 320 180"><line x1="20" y1="90" x2="300" y2="90" /><line x1="160" y1="10" x2="160" y2="170" /><circle cx={160 + x * 10} cy={90 - y * 8} r="6" /><text x={168 + x * 10} y={84 - y * 8}>M({x}; {y})</text><text x="292" y="82">x</text><text x="168" y="18">y</text></svg>;
    }
    if (["LINE", "TWO_LINES", "LINE_CANDIDATES", "PARABOLA_CANDIDATES"].includes(graphKind)) {
      const slope = waveDValues[0] ?? 1; const intercept = waveDValues[1] ?? 0;
      const linePoints = (a: number, b: number) => `${30},${90 - (a * -5 + b) * 7} 290,${90 - (a * 5 + b) * 7}`;
      const parabola = Array.from({ length: 25 }, (_, index) => { const x = -4 + index / 3; const a = waveDValues[0] ?? 1; const h = waveDValues[1] ?? 0; const k = waveDValues[2] ?? 0; return `${32 + (x + 4) * 32},${90 - Math.max(-9, Math.min(9, a * (x - h) ** 2 + k)) * 7}`; }).join(" ");
      return <svg className={styles.shape} role="img" aria-label={visual.description} viewBox="0 0 320 180"><line x1="20" y1="90" x2="300" y2="90" /><line x1="160" y1="10" x2="160" y2="170" />{graphKind === "PARABOLA_CANDIDATES" ? <polyline points={parabola} className={styles.graphStroke} /> : <><polyline points={linePoints(slope, intercept)} className={styles.graphStroke} />{graphKind === "TWO_LINES" ? <polyline points={linePoints(waveDValues[2] ?? -1, waveDValues[3] ?? 0)} className={styles.graphStrokeAlt} /> : null}</>}<text x="292" y="82">x</text><text x="168" y="18">y</text></svg>;
    }
    if (graphKind === "FUNCTION_GRAPH_RECOGNITION") {
      const candidates = Array.isArray(data.candidateGraphs)
        ? data.candidateGraphs.filter(isGraphCandidate)
        : [];
      return <div className={styles.graphCandidates} role="img" aria-label={visual.description}>{candidates.map((candidate) => <figure key={candidate.id}><svg viewBox="0 0 240 140" aria-hidden="true"><line x1="16" y1="70" x2="224" y2="70" /><line x1="120" y1="12" x2="120" y2="128" />{candidate.kind === "LINE" ? <line x1="28" y1="112" x2="212" y2="28" className={styles.graphStroke} /> : candidate.kind === "CIRCLE" ? <circle cx="120" cy="70" r="42" className={styles.graphStroke} /> : candidate.kind === "SIDEWAYS_PARABOLA" ? <path d="M42 25 Q190 70 42 115" className={styles.graphStroke} /> : <line x1="160" y1="18" x2="160" y2="122" className={styles.graphStroke} />}</svg><figcaption>{candidate.label}</figcaption></figure>)}</div>;
    }
    if (graphKind === "LINEAR_SYSTEM_SOLUTION_CHECK") {
      const system = numberList(data.system);
      const solution = numberList(data.solution);
      const linePoints = (a: number, b: number, c: number) => [-5, 5].map((x) => `${160 + x * 24},${90 - Math.max(-65, Math.min(65, ((c - a * x) / b) * 8))}`).join(" ");
      return <svg className={styles.shape} role="img" aria-label={visual.description} viewBox="0 0 320 180"><line x1="20" y1="90" x2="300" y2="90" /><line x1="160" y1="10" x2="160" y2="170" /><polyline points={linePoints(system[0] ?? 1, system[1] ?? 1, system[2] ?? 0)} className={styles.graphStroke} /><polyline points={linePoints(system[3] ?? 1, system[4] ?? -1, system[5] ?? 0)} className={styles.graphStrokeAlt} />{solution.length === 2 ? <circle cx={160 + solution[0]! * 24} cy={90 - solution[1]! * 8} r="5" /> : null}<text x="292" y="82">x</text><text x="168" y="18">y</text></svg>;
    }
    const isQuadratic = graphKind === "QUADRATIC_GRAPH_SYMMETRY" || graphKind === "QUADRATIC_MODELING";
    const explicitAxis = Number(data.axis);
    const axis = Number.isFinite(explicitAxis)
      ? explicitAxis
      : coefficients[0]
        ? -(coefficients[1] ?? 0) / (2 * coefficients[0])
        : 0;
    const roots = numberList(data.roots);
    const xMinimum = graphKind === "QUADRATIC_MODELING" && roots.length === 2 ? Math.min(...roots) - 1 : axis - 4;
    const xMaximum = graphKind === "QUADRATIC_MODELING" && roots.length === 2 ? Math.max(...roots) + 1 : axis + 4;
    const samples = Array.from({ length: 25 }, (_, index) => xMinimum + (xMaximum - xMinimum) * index / 24);
    const rawPoints = samples.map((x) => ({ x, y: isQuadratic ? (coefficients[0] ?? 1) * x * x + (coefficients[1] ?? 0) * x + (coefficients[2] ?? 0) : (coefficients[0] ?? 1) * x + (coefficients[1] ?? 0) }));
    const yMaximum = Math.max(1, ...rawPoints.map((point) => Math.abs(point.y)));
    const points = rawPoints.map((point) => `${32 + (point.x - xMinimum) / Math.max(1, xMaximum - xMinimum) * 256},${90 - point.y / yMaximum * 65}`).join(" ");
    const axisPosition = 32 + (axis - xMinimum) / Math.max(1, xMaximum - xMinimum) * 256;
    return <svg className={styles.shape} role="img" aria-label={visual.description} viewBox="0 0 320 180"><line x1="20" y1="90" x2="300" y2="90" /><line x1="160" y1="10" x2="160" y2="170" />{graphKind === "QUADRATIC_GRAPH_SYMMETRY" ? <line x1={axisPosition} y1="12" x2={axisPosition} y2="168" strokeDasharray="7 6" /> : null}<polyline points={points} className={styles.graphStroke} /><text x="292" y="82">x</text><text x="168" y="18">y</text></svg>;
  }
  return <div className={styles.measure} role="img" aria-label={visual.description}><span>{String(data.sourceDisplay ?? data.value ?? "")}</span>{data.sourceDisplay ? null : <strong>{String(data.source ?? "")}</strong>}<i>→</i><strong>{String(data.target ?? "")}</strong></div>;
}

const stringList = (value: unknown) => Array.isArray(value) ? value.map(String) : [];
const numberList = (value: unknown) => Array.isArray(value) ? value.map(Number) : [];
const isVisualRow = (value: unknown): value is Record<string, string | number> =>
  typeof value === "object" && value !== null && !Array.isArray(value) && Object.values(value).every((cell) => typeof cell === "string" || typeof cell === "number");
const isGraphCandidate = (value: unknown): value is { id: string; label: string; kind: "LINE" | "CIRCLE" | "SIDEWAYS_PARABOLA" | "VERTICAL_LINE" } =>
  typeof value === "object" && value !== null && !Array.isArray(value) && "id" in value && typeof value.id === "string" && "label" in value && typeof value.label === "string" && "kind" in value && ["LINE", "CIRCLE", "SIDEWAYS_PARABOLA", "VERTICAL_LINE"].includes(String(value.kind));
function visualRows(data: Readonly<Record<string, unknown>>) {
  if (Array.isArray(data.rows)) return data.rows.filter(isVisualRow);
  const values = numberList(data.values);
  return stringList(data.labels).map((label, index) => ({ name: label, value: values[index] ?? 0 }));
}

export function isAnswerReady(question: PublicQuestionSnapshot, value: CanonicalResponse) {
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return question.interaction.type === "MATCHING" ? value.length === question.interaction.leftItems?.length : question.interaction.type === "ORDERING" ? value.length === question.interaction.options?.length : value.length === question.interaction.choiceCount;
  return "denominator" in value && value.denominator > 0;
}
const difficultyLabel = (value: ProductDifficulty) => value === "EASY" ? "Cơ bản" : value === "MEDIUM" ? "Vận dụng" : "Thử thách";
const familyLabel = (value: string) => ({ WHOLE_NUMBER_OPERATIONS: "Số và phép tính", PLACE_VALUE: "Cấu tạo số", FRACTIONS: "Phân số", ALGEBRA: "Đại số", GEOMETRY: "Hình học", MEASUREMENT: "Đo lường", GEOMETRY_MEASUREMENT: "Hình học và đo lường", STATISTICS: "Thống kê", PROBABILITY: "Xác suất", APPLIED_MATHEMATICS: "Toán ứng dụng", MATHEMATICAL_REASONING: "Lập luận toán học" }[value] ?? value);
