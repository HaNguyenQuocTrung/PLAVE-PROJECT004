import { PlaveIcon } from "@/components/PlaveIcon";

export function AuthBrandPanel({
  eyebrow,
  title,
  description,
}: Readonly<{
  eyebrow: string;
  title: string;
  description: string;
}>) {
  return (
    <div className="auth-brand-panel">
      <div className="auth-brand-panel__constellation" aria-hidden="true">
        <span>π</span><span>7</span><span>+</span>
      </div>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <ul>
        <li><PlaveIcon name="check" /> Nội dung Toán lớp 1–9</li>
        <li><PlaveIcon name="check" /> Học theo nhịp phù hợp</li>
        <li><PlaveIcon name="check" /> Tiến bộ không áp lực</li>
      </ul>
    </div>
  );
}
