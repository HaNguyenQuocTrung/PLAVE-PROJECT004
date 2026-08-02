import type { TutorResponseMode } from "./contracts.ts";

const TERMINAL_PUNCTUATION = /[.!?…][\])”’'"]*$/u;
const CLEAR_MATH_TERMINAL = /(?:=|≈|≤|≥|<|>)\s*-?\d+(?:[.,/]\d+)?[%°]?[\])]*$/u;
const ACTION_LANGUAGE =
  /\b(hãy|thử|bước|đầu tiên|tính|viết|đặt|so sánh|kiểm tra|quan sát)\b/iu;
const STRUCTURE_LANGUAGE =
  /(?:^|\n)\s*(?:[-•]|\d+[.)])|\b(bước|ví dụ|lỗi thường gặp|kiểm tra)\b/iu;

export type TutorResponseQuality = Readonly<{
  complete: boolean;
  wordCount: number;
  hasTerminalPunctuation: boolean;
  hasGuidingQuestion: boolean;
  hasAction: boolean;
  hasStructure: boolean;
}>;

export function evaluateTutorResponseCompleteness(
  text: string,
  mode: TutorResponseMode,
): TutorResponseQuality {
  const normalized = text.replace(/\s+/gu, " ").trim();
  const wordCount = normalized ? normalized.split(/\s+/u).length : 0;
  const hasTerminalPunctuation =
    TERMINAL_PUNCTUATION.test(normalized) ||
    CLEAR_MATH_TERMINAL.test(normalized);
  const hasGuidingQuestion = normalized.includes("?");
  const hasAction = ACTION_LANGUAGE.test(normalized);
  const hasStructure = STRUCTURE_LANGUAGE.test(text);
  const baseComplete =
    normalized.length >= 80 && wordCount >= 18 && hasTerminalPunctuation;
  const contractComplete =
    mode === "HINT"
      ? hasAction && hasGuidingQuestion
      : mode === "EXPLAIN" || mode === "FULL_SOLUTION"
        ? hasStructure && hasGuidingQuestion
        : mode === "EXAMPLE"
          ? hasStructure && hasGuidingQuestion
          : hasAction && hasGuidingQuestion;
  return {
    complete: baseComplete && contractComplete,
    wordCount,
    hasTerminalPunctuation,
    hasGuidingQuestion,
    hasAction,
    hasStructure,
  };
}
