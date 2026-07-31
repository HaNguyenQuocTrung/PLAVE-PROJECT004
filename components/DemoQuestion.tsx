"use client";

import type { DemoQuestion as DemoQuestionType } from "@/types/learning";

type DemoQuestionProps = {
  question: DemoQuestionType;
  answer: string;
  checked: boolean;
  errorId?: string;
  onAnswerChange: (answer: string) => void;
};

export function DemoQuestion({
  question,
  answer,
  checked,
  errorId,
  onAnswerChange,
}: DemoQuestionProps) {
  if (question.type === "number-input") {
    return (
      <div className="demo-question">
        <p className="demo-question__prompt">{question.prompt}</p>
        <label className="number-answer" htmlFor={`${question.id}-answer`}>
          Câu trả lời của em
          <input
            id={`${question.id}-answer`}
            name={`${question.id}-answer`}
            type="number"
            inputMode="numeric"
            min="0"
            max="10"
            step="1"
            value={answer}
            disabled={checked}
            onChange={(event) => onAnswerChange(event.target.value)}
            aria-describedby={
              errorId ? `${question.id}-help ${errorId}` : `${question.id}-help`
            }
          />
        </label>
        <p className="field__hint" id={`${question.id}-help`}>
          Nhập một số từ 0 đến 10.
        </p>
      </div>
    );
  }

  return (
    <fieldset className="demo-question" aria-describedby={errorId}>
      <legend className="demo-question__prompt">{question.prompt}</legend>
      <div className="choice-grid">
        {question.choices?.map((choice) => (
          <label
            key={choice.id}
            className={`choice ${answer === choice.value ? "choice--selected" : ""}`}
          >
            <input
              type="radio"
              name={question.id}
              value={choice.value}
              checked={answer === choice.value}
              disabled={checked}
              onChange={() => onAnswerChange(choice.value)}
            />
            <span className="choice__label" aria-hidden="true">
              {choice.label}
            </span>
            <span>{choice.text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
