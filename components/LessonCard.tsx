import type { ReactNode } from "react";

type LessonCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function LessonCard({
  eyebrow,
  title,
  description,
  children,
}: LessonCardProps) {
  return (
    <article className="lesson-card">
      <p className="eyebrow">{eyebrow}</p>
      <h3>{title}</h3>
      <p>{description}</p>
      {children ? <div className="lesson-card__action">{children}</div> : null}
    </article>
  );
}
