type FeedbackPanelProps = {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: readonly string[];
};

export function FeedbackPanel({
  isCorrect,
  correctAnswer,
  explanation,
}: FeedbackPanelProps) {
  return (
    <section
      className={`feedback ${isCorrect ? "feedback--correct" : "feedback--incorrect"}`}
      aria-live="polite"
      aria-labelledby="feedback-title"
    >
      <p className="feedback__status">
        <span aria-hidden="true">{isCorrect ? "✓" : "!"}</span>
        <strong id="feedback-title">
          {isCorrect ? "Chính xác!" : "Chưa đúng — mình cùng xem lại nhé."}
        </strong>
      </p>
      <p>
        Đáp án đúng: <strong>{correctAnswer}</strong>
      </p>
      <h3>Lời giải từng bước</h3>
      <ol>
        {explanation.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </section>
  );
}
