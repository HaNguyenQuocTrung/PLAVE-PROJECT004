import {
  buildXpCompletionResultView,
  type XpCompletionProjection,
} from "@/lib/scoring/completion";

export function XpCompletionSummary({
  projection,
  totalLabel = "Tổng XP hiện tại",
  ariaLabel = "Kết quả XP của lượt học",
}: Readonly<{
  projection: XpCompletionProjection | null | undefined;
  totalLabel?: string;
  ariaLabel?: string;
}>) {
  const view = buildXpCompletionResultView(projection);
  if (view.kind === "UNAVAILABLE") {
    return (
      <div
        className="xp-projection-unavailable"
        data-xp-projection="UNAVAILABLE"
        role="alert"
      >
        <strong>Kết quả XP chưa sẵn sàng</strong>
        <p>{view.message}</p>
      </div>
    );
  }
  return (
    <div
      className="scoring-result xp-completion-summary"
      aria-label={ariaLabel}
      data-xp-projection="READY"
    >
      <div>
        <span>XP lượt này</span>
        <strong data-xp-value={String(view.projection.attemptXpEarned)}>
          {view.attemptXpText}
        </strong>
      </div>
      <div>
        <span>{totalLabel}</span>
        <strong data-xp-value={String(view.projection.totalXpAfter)}>
          {view.totalXpText}
        </strong>
      </div>
      <p data-xp-completion-reason={view.projection.reason}>
        {view.reasonText}
      </p>
    </div>
  );
}
