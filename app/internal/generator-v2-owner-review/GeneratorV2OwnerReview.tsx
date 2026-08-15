"use client";

import { useEffect, useMemo, useState } from "react";

import { AnswerControl, QuestionVisual, isAnswerReady } from "@/app/internal/generator-v2/GeneratorV2LocalRunner";
import type { CanonicalResponse, ProductDifficulty, ProductVariantId, PublicQuestionSnapshot } from "@/lib/generation-v2";
import {
  curriculumDomainPresentationLabels,
  difficultyPresentationLabels,
  getPresentationEnumLabel,
  getVietnameseOutcomeLabel,
  interactionPresentationLabels,
  reviewDecisionPresentationLabels,
} from "@/lib/learning/presentation";

import styles from "./owner-review.module.css";

type Decision = "APPROVE" | "REJECT" | "NEEDS_REVISION";
type Sample = {
  sampleId: string;
  outcomeId: string;
  capabilityId: string;
  variantId: ProductVariantId;
  grade: number;
  domain: string;
  title: string;
  unitId: string;
  family: string;
  difficulty: ProductDifficulty;
  sampleNumber: number;
  question: PublicQuestionSnapshot;
};
type Feedback = { isCorrect: boolean; headline: string; explanation: string; steps: readonly string[]; nextStep: string };
type Review = { decision: Decision | ""; note: string };
type StoredDraft = { reviews: Record<string, Review>; selectedId: string };
const storageKey = "plave-generator-v2-owner-review-v2";
const decisions = ["APPROVE", "REJECT", "NEEDS_REVISION"] as const;

function safeDraft(value: string | null, sampleIds: ReadonlySet<string>): StoredDraft | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<StoredDraft>;
    if (!parsed.reviews || typeof parsed.reviews !== "object") return null;
    const reviews: Record<string, Review> = {};
    for (const [sampleId, review] of Object.entries(parsed.reviews)) {
      if (!sampleIds.has(sampleId) || !review || typeof review !== "object") continue;
      const decision = decisions.includes(review.decision as Decision) ? review.decision as Decision : "";
      const note = typeof review.note === "string" ? review.note.slice(0, 4_000) : "";
      reviews[sampleId] = { decision, note };
    }
    return {
      reviews,
      selectedId: sampleIds.has(parsed.selectedId ?? "") ? parsed.selectedId! : "",
    };
  } catch {
    return null;
  }
}

export function GeneratorV2OwnerReview({ samples }: { samples: readonly Sample[] }) {
  const sampleIds = useMemo(() => new Set(samples.map((sample) => sample.sampleId)), [samples]);
  const [selectedId, setSelectedId] = useState(samples[0]?.sampleId ?? "");
  const [answer, setAnswer] = useState<CanonicalResponse>("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [gradeFilter, setGradeFilter] = useState("ALL");
  const [domainFilter, setDomainFilter] = useState("ALL");
  const [difficultyFilter, setDifficultyFilter] = useState("ALL");
  const [interactionFilter, setInteractionFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [overallDecision, setOverallDecision] = useState<Decision | "">("");
  const [overallNote, setOverallNote] = useState("");
  const [saveState, setSaveState] = useState<"IDLE" | "SAVING" | "SAVED" | "ERROR">("IDLE");
  const [saveMessage, setSaveMessage] = useState("");

  const filtered = useMemo(() => samples.filter((item) =>
    (gradeFilter === "ALL" || String(item.grade) === gradeFilter) &&
    (domainFilter === "ALL" || item.domain === domainFilter) &&
    (difficultyFilter === "ALL" || item.difficulty === difficultyFilter) &&
    (interactionFilter === "ALL" || item.question.interaction.type === interactionFilter) &&
    (statusFilter === "ALL" || (reviews[item.sampleId]?.decision || "UNREVIEWED") === statusFilter)
  ), [difficultyFilter, domainFilter, gradeFilter, interactionFilter, reviews, samples, statusFilter]);
  const selected = filtered.find((item) => item.sampleId === selectedId) ?? filtered[0] ?? null;
  const selectedIndex = selected ? filtered.findIndex((item) => item.sampleId === selected.sampleId) : -1;
  const review: Review = selected ? reviews[selected.sampleId] ?? { decision: "", note: "" } : { decision: "", note: "" };
  const stats = useMemo(() => {
    const values = samples.map((sample) => reviews[sample.sampleId]?.decision ?? "");
    const approved = values.filter((value) => value === "APPROVE").length;
    const rejected = values.filter((value) => value === "REJECT").length;
    const needsRevision = values.filter((value) => value === "NEEDS_REVISION").length;
    const reviewed = approved + rejected + needsRevision;
    return { approved, rejected, needsRevision, reviewed, remaining: samples.length - reviewed };
  }, [reviews, samples]);
  const allReviewed = stats.reviewed === samples.length;

  useEffect(() => {
    const stored = safeDraft(window.localStorage.getItem(storageKey), sampleIds);
    const hashId = decodeURIComponent(window.location.hash.slice(1));
    const frame = window.requestAnimationFrame(() => {
      if (stored) {
        setReviews(stored.reviews);
        if (stored.selectedId) setSelectedId(stored.selectedId);
      }
      if (sampleIds.has(hashId)) setSelectedId(hashId);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [sampleIds]);

  function persistDraft(nextReviews: Record<string, Review>, nextSelectedId = selectedId) {
    window.localStorage.setItem(storageKey, JSON.stringify({ reviews: nextReviews, selectedId: nextSelectedId }));
  }

  function updateReview(next: Review) {
    if (!selected) return;
    const value = { ...reviews, [selected.sampleId]: next };
    setReviews(value);
    persistDraft(value, selected.sampleId);
  }

  async function check(action: "SUBMIT" | "PREVIEW_CORRECT" | "PREVIEW_INCORRECT") {
    if (!selected) return;
    const response = await fetch("/api/internal/generator-v2-owner-review/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sampleId: selected.sampleId, action, response: answer }),
    });
    const payload = await response.json();
    if (payload.data) setFeedback(payload.data);
  }

  function choose(sampleId: string) {
    setSelectedId(sampleId);
    setAnswer("");
    setFeedback(null);
    persistDraft(reviews, sampleId);
    window.history.replaceState(null, "", `#${encodeURIComponent(sampleId)}`);
  }

  function move(offset: number) {
    if (selectedIndex < 0) return;
    const next = filtered[selectedIndex + offset];
    if (next) choose(next.sampleId);
  }

  function exportReview() {
    const blob = new Blob([JSON.stringify({
      schemaVersion: 2,
      sampleCount: samples.length,
      summary: stats,
      overallDecision: overallDecision || null,
      overallNote,
      decisions: reviews,
      privateSolutionIncluded: false,
    }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "plave-generator-v2-owner-review.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function finalizeReview() {
    if (!allReviewed || !overallDecision || saveState === "SAVING") return;
    if (!window.confirm(`Ghi quyết định tổng thể “${reviewDecisionPresentationLabels[overallDecision]}” cho đủ 198/198 mẫu? Hành động này không tự suy ra từ số phiếu.`)) return;
    const completeReviews = Object.fromEntries(samples.map((sample) => [sample.sampleId, reviews[sample.sampleId]]));
    setSaveState("SAVING");
    setSaveMessage("");
    const response = await fetch("/api/internal/generator-v2-owner-review/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overallDecision, overallNote, decisions: completeReviews }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.data) {
      setSaveState("ERROR");
      setSaveMessage(payload?.error ?? "Không thể ghi quyết định Owner.");
      return;
    }
    setSaveState("SAVED");
    setSaveMessage("Đã ghi quyết định của Owner vào tệp manifest, kết quả JSON và tài liệu trạng thái.");
  }

  return <main className={styles.shell} data-owner-review-root>
    <header className={styles.header}>
      <div><p>PLAVE · Đánh giá cục bộ</p><h1>Đánh giá độ hữu ích của bộ sinh câu hỏi V2</h1><span>546 mục tiêu · 198 năng lực chuẩn hóa · gói đại diện có giới hạn.</span></div>
      <button onClick={exportReview}>Tải nháp JSON</button>
    </header>

    <section className={styles.progress} aria-label="Tiến độ đánh giá">
      <div><strong data-progress-reviewed>{stats.reviewed}/198</strong><span>Đã đánh giá</span></div>
      <div><strong>{stats.approved}</strong><span>Chấp nhận</span></div>
      <div><strong>{stats.rejected}</strong><span>Từ chối</span></div>
      <div><strong>{stats.needsRevision}</strong><span>Cần chỉnh sửa</span></div>
      <div><strong>{stats.remaining}</strong><span>Còn lại</span></div>
    </section>

    <details className={styles.checklist} open>
      <summary>Danh sách kiểm tra sản phẩm</summary>
      <ul>
        <li>Câu hỏi dễ hiểu và đúng độ tuổi; đúng kỹ năng và mục tiêu.</li>
        <li>Bài toán giải được, đủ dữ kiện; các mức dễ, trung bình và khó khác nhau thực chất.</li>
        <li>Cách tương tác phù hợp; hình, bảng hoặc biểu đồ đúng nghĩa.</li>
        <li>Đáp án sai hợp lý; phản hồi chỉ ra lỗi và bước tiếp theo.</li>
        <li>Tiếng Việt tự nhiên; không lặp lại, máy móc hoặc vô nghĩa.</li>
      </ul>
    </details>

    <section className={styles.filters} aria-label="Bộ lọc đánh giá">
      <label>Lớp<select value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)} data-filter="grade"><option value="ALL">Tất cả</option>{[1,2,3,4,5,6,7,8,9].map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select></label>
      <label>Mạch kiến thức<select value={domainFilter} onChange={(event) => setDomainFilter(event.target.value)} data-filter="domain"><option value="ALL">Tất cả</option>{[...new Set(samples.map((item) => item.domain))].sort().map((domain) => <option key={domain} value={domain}>{getPresentationEnumLabel(domain, curriculumDomainPresentationLabels, "Mạch kiến thức khác")}</option>)}</select></label>
      <label>Mức độ<select value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)} data-filter="difficulty"><option value="ALL">Tất cả</option><option value="EASY">Dễ</option><option value="MEDIUM">Trung bình</option><option value="HARD">Khó</option></select></label>
      <label>Tương tác<select value={interactionFilter} onChange={(event) => setInteractionFilter(event.target.value)} data-filter="interaction"><option value="ALL">Tất cả</option>{[...new Set(samples.map((item) => item.question.interaction.type))].sort().map((interaction) => <option key={interaction} value={interaction}>{getPresentationEnumLabel(interaction, interactionPresentationLabels, "Cách tương tác khác")}</option>)}</select></label>
      <label>Trạng thái<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} data-filter="status"><option value="ALL">Tất cả</option><option value="UNREVIEWED">Chưa đánh giá</option><option value="APPROVE">Chấp nhận</option><option value="REJECT">Từ chối</option><option value="NEEDS_REVISION">Cần chỉnh sửa</option></select></label>
    </section>

    <div className={styles.layout}>
      <aside className={styles.sidebar} aria-label="Danh sách mẫu">
        {filtered.map((item) => <button key={item.sampleId} aria-current={item.sampleId === selected?.sampleId ? "true" : undefined} onClick={() => choose(item.sampleId)} data-sample-id={item.sampleId} data-grade={item.grade} data-domain={item.domain} data-difficulty={item.difficulty} data-interaction={item.question.interaction.type}>
          <strong>Lớp {item.grade} · {difficultyPresentationLabels[item.difficulty]} · mẫu {item.sampleNumber}</strong><span>{getVietnameseOutcomeLabel({ outcomeId: item.outcomeId, label: item.title })}</span><em>{reviewDecisionPresentationLabels[reviews[item.sampleId]?.decision || "UNREVIEWED"]}</em>
        </button>)}
        {filtered.length === 0 ? <p className={styles.empty}>Không có mẫu khớp bộ lọc.</p> : null}
      </aside>

      {selected ? <section className={styles.review}>
        <div className={styles.navigation}><button disabled={selectedIndex <= 0} onClick={() => move(-1)} data-review-previous>← Trước</button><span>{selectedIndex + 1}/{filtered.length} trong bộ lọc</span><button disabled={selectedIndex >= filtered.length - 1} onClick={() => move(1)} data-review-next>Tiếp →</button></div>
        <div className={styles.meta}><span>Lớp {selected.grade}</span><span>{getPresentationEnumLabel(selected.domain, curriculumDomainPresentationLabels, "Mạch kiến thức khác")}</span><span>{difficultyPresentationLabels[selected.difficulty]}</span><span>{getPresentationEnumLabel(selected.question.interaction.type, interactionPresentationLabels, "Cách tương tác khác")}</span></div>
        <QuestionVisual question={selected.question} />
        <h2>{selected.question.publicPrompt}</h2>
        <p>{selected.question.accessibility.responseInstruction}</p>
        <AnswerControl question={selected.question} value={answer} onChange={setAnswer} disabled={Boolean(feedback)} />
        <div className={styles.feedbackActions}>
          <button disabled={!isAnswerReady(selected.question, answer)} onClick={() => void check("SUBMIT")} data-review-submit>Gửi câu trả lời đã chọn</button>
          <button onClick={() => void check("PREVIEW_CORRECT")}>Xem mẫu phản hồi đúng</button>
          <button onClick={() => void check("PREVIEW_INCORRECT")}>Xem mẫu phản hồi sai</button>
          {feedback ? <button onClick={() => { setFeedback(null); setAnswer(""); }}>Thử câu trả lời khác</button> : null}
        </div>
        {feedback ? <div className={feedback.isCorrect ? styles.correct : styles.incorrect} role="status" data-review-feedback>
          <h3>{feedback.headline}</h3><p>{feedback.explanation}</p><ol>{feedback.steps.map((step) => <li key={step}>{step}</li>)}</ol><p>{feedback.nextStep}</p>
        </div> : <p className={styles.privateNote}>Đáp án và lời giải không có trong trạng thái trình duyệt trước khi gửi. Phản hồi chỉ được tạo sau thao tác kiểm tra.</p>}
        <fieldset className={styles.decision} data-sample-decision><legend>Quyết định Owner cho mẫu này</legend>
          {decisions.map((value) => <label key={value}><input type="radio" name={`decision-${selected.sampleId}`} checked={review.decision === value} onChange={() => updateReview({ ...review, decision: value })} />{reviewDecisionPresentationLabels[value]}</label>)}
          <label>Ghi chú<textarea value={review.note} maxLength={4_000} onChange={(event) => updateReview({ ...review, note: event.target.value })} data-review-note /></label>
        </fieldset>
      </section> : <section className={styles.review}><h2>Không có mẫu khớp bộ lọc</h2><p>Đặt lại một hoặc nhiều bộ lọc để tiếp tục đánh giá.</p></section>}
    </div>

    <section className={styles.finalDecision} aria-label="Quyết định Owner tổng thể">
      <div><h2>Quyết định tổng thể</h2><p>Chỉ mở khi đủ 198 mẫu đã đánh giá. PLAVE không suy ra quyết định từ đa số phiếu; người đánh giá phải chọn rõ quyết định cuối.</p></div>
      <fieldset disabled={!allReviewed || saveState === "SAVED"}>
        <legend>Quyết định của người đánh giá</legend>
        {decisions.map((value) => <label key={value}><input type="radio" name="overall-decision" checked={overallDecision === value} onChange={() => setOverallDecision(value)} />{reviewDecisionPresentationLabels[value]}</label>)}
        <label>Ghi chú tổng thể<textarea value={overallNote} maxLength={4_000} onChange={(event) => setOverallNote(event.target.value)} /></label>
      </fieldset>
      <button disabled={!allReviewed || !overallDecision || saveState === "SAVING" || saveState === "SAVED"} onClick={() => void finalizeReview()} data-finalize-owner-review>Ghi quyết định Owner cuối cùng</button>
      {!allReviewed ? <p>Còn {stats.remaining} mẫu chưa đánh giá.</p> : null}
      {saveMessage ? <p role={saveState === "ERROR" ? "alert" : "status"}>{saveMessage}</p> : null}
    </section>
  </main>;
}
