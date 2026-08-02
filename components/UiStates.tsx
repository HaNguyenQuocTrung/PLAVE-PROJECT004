import type { ReactNode } from "react";

import { Button } from "@/components/Button";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "error";

export function StatusBadge({
  children,
  tone = "neutral",
}: Readonly<{ children: ReactNode; tone?: StatusTone }>) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>;
}

export function Alert({
  children,
  title,
  tone = "info",
}: Readonly<{
  children: ReactNode;
  title?: string;
  tone?: Exclude<StatusTone, "neutral">;
}>) {
  return (
    <div
      className={`ui-alert ui-alert--${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {title ? <strong>{title}</strong> : null}
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: Readonly<{
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}>) {
  return (
    <section className="empty-state empty-state--large" aria-label={title}>
      <span className="empty-state__mark" aria-hidden="true" />
      <h2>{title}</h2>
      <p>{description}</p>
      {actionHref && actionLabel ? (
        <Button href={actionHref}>{actionLabel}</Button>
      ) : null}
    </section>
  );
}

export function LoadingState({ label = "Đang tải nội dung…" }: Readonly<{ label?: string }>) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-state__spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function Skeleton({ lines = 3 }: Readonly<{ lines?: number }>) {
  return (
    <div className="skeleton" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

