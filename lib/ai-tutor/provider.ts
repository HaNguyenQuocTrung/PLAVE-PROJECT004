import type { TutorRequest, TutorStreamEvent } from "./contracts.ts";

export interface AiTutorProvider {
  readonly id: "OPENAI" | "GOOGLE" | "DEEPSEEK";
  readonly model: string;
  streamTutorResponse(input: TutorRequest): AsyncIterable<TutorStreamEvent>;
}

export class AiTutorProviderError extends Error {
  readonly code:
    | "AI_PROVIDER_TIMEOUT"
    | "AI_PROVIDER_ERROR"
    | "AI_SAFETY_BLOCKED"
    | "AI_RESPONSE_TRUNCATED"
    | "AI_STREAM_INTERRUPTED"
    | "AI_EMPTY_RESPONSE"
    | "AI_STREAM_ABORTED"
    | "AI_MALFORMED_PROVIDER_EVENT";

  constructor(
    code:
      | "AI_PROVIDER_TIMEOUT"
      | "AI_PROVIDER_ERROR"
      | "AI_SAFETY_BLOCKED"
      | "AI_RESPONSE_TRUNCATED"
      | "AI_STREAM_INTERRUPTED"
      | "AI_EMPTY_RESPONSE"
      | "AI_STREAM_ABORTED"
      | "AI_MALFORMED_PROVIDER_EVENT",
  ) {
    super(code);
    this.code = code;
    this.name = "AiTutorProviderError";
  }
}
