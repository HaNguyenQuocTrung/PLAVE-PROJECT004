type ProgressBarProps = {
  value: number;
  total: number;
  label: string;
};

export function ProgressBar({ value, total, label }: ProgressBarProps) {
  const percent = total === 0 ? 0 : Math.round((value / total) * 100);

  return (
    <div className="progress">
      <div className="progress__label">
        <span>{label}</span>
        <strong>
          {value}/{total}
        </strong>
      </div>
      <div
        className="progress__track"
        role="progressbar"
        aria-label={`${label}: ${value} trên ${total}`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={value}
      >
        <span className="progress__value" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
