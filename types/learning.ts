export type DemoQuestionType = "multiple-choice" | "number-input";

export type DemoChoice = {
  id: string;
  label: "A" | "B" | "C" | "D";
  value: string;
  text: string;
};

export type DemoQuestion = {
  id: string;
  type: DemoQuestionType;
  prompt: string;
  choices?: readonly DemoChoice[];
  correctAnswer: string;
  explanation: readonly string[];
  skill: string;
};

export type DemoExample = {
  title: string;
  prompt: string;
  steps: readonly string[];
  answer: string;
};

export type DemoLesson = {
  id: string;
  title: string;
  subtitle: string;
  objectives: readonly string[];
  explanation: readonly string[];
  examples: readonly DemoExample[];
  questions: readonly DemoQuestion[];
};
