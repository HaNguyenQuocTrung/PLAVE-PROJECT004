import assert from "node:assert/strict";
import test from "node:test";

import type {
  TutorRequest,
  TutorStreamEvent,
} from "../lib/ai-tutor/contracts.ts";
import { GoogleAiTutorProvider } from "../lib/ai-tutor/google-provider.ts";
import {
  buildTutorGenerationPlan,
  buildTutorInstructions,
} from "../lib/ai-tutor/prompt.ts";
import { evaluateTutorResponseCompleteness } from "../lib/ai-tutor/response-quality.ts";

const BASE_REQUEST: TutorRequest = {
  conversationId: "conversation_quality_1234",
  messageId: "message_quality_123456",
  message: "Gợi ý cách cộng 27 và 15.",
  history: [],
  grade: 2,
  safetyIdentifier: "plave_quality_test",
  responseMode: "HINT",
  complexity: "SIMPLE",
  thinkingLevel: "minimal",
  maxOutputTokens: 2_048,
  timeoutMs: 2_000,
  signal: new AbortController().signal,
};

async function captureProvider(
  provider: GoogleAiTutorProvider,
  request: TutorRequest = BASE_REQUEST,
) {
  const events: TutorStreamEvent[] = [];
  let error: Error | null = null;
  try {
    for await (const event of provider.streamTutorResponse(request)) {
      events.push(event);
    }
  } catch (caught) {
    error = caught instanceof Error ? caught : new Error(String(caught));
  }
  return { events, error };
}

function providerFor(chunks: ReadonlyArray<Record<string, unknown>>) {
  return new GoogleAiTutorProvider({
    apiKey: "TEST_ONLY_NOT_A_REAL_GOOGLE_KEY",
    model: "gemini-3.5-flash",
    timeoutMs: 2_000,
    client: {
      models: {
        async generateContentStream() {
          return (async function* () {
            for (const chunk of chunks) yield chunk;
          })();
        },
      },
    } as never,
  });
}

test("generation plan keeps server-owned bounded thinking tiers and sufficient output", () => {
  assert.deepEqual(
    buildTutorGenerationPlan({
      message: "Gợi ý cách cộng có nhớ 27 + 15.",
      grade: 2,
      configuredMaxOutputTokens: 8_192,
    }),
    {
      responseMode: "HINT",
      complexity: "SIMPLE",
      thinkingLevel: "minimal",
      maxOutputTokens: 2_048,
    },
  );
  assert.deepEqual(
    buildTutorGenerationPlan({
      message: "Giải thích cách cộng hai phân số khác mẫu số.",
      grade: 6,
      configuredMaxOutputTokens: 8_192,
    }),
    {
      responseMode: "EXPLAIN",
      complexity: "STANDARD",
      thinkingLevel: "low",
      maxOutputTokens: 3_072,
    },
  );
  assert.equal(
    buildTutorGenerationPlan({
      message: "Giải thích từng bước, có ví dụ và lỗi thường gặp.",
      grade: 7,
      preferredMode: "EXPLAIN",
      configuredMaxOutputTokens: 8_192,
    }).responseMode,
    "EXPLAIN",
  );
  assert.deepEqual(
    buildTutorGenerationPlan({
      message: "Cho lời giải đầy đủ: chứng minh hai tam giác đồng dạng rồi giải phương trình nhiều bước.",
      grade: 9,
      configuredMaxOutputTokens: 8_192,
    }),
    {
      responseMode: "FULL_SOLUTION",
      complexity: "ADVANCED",
      thinkingLevel: "medium",
      maxOutputTokens: 4_096,
    },
  );
});

test("pedagogical response modes are explicit and grade-bounded", () => {
  for (const mode of [
    "HINT",
    "EXPLAIN",
    "EXAMPLE",
    "CHECK_MY_WORK",
    "FULL_SOLUTION",
  ] as const) {
    const instructions = buildTutorInstructions(7, {
      responseMode: mode,
      complexity: "STANDARD",
    });
    assert.match(instructions, new RegExp(`Chế độ ${mode}`, "u"));
    assert.match(instructions, /học sinh lớp 7/u);
    assert.match(instructions, /Bắt buộc hoàn tất câu cuối bằng dấu câu/u);
    assert.doesNotMatch(instructions, /API_KEY=/u);
  }
});

test("MAX_TOKENS never becomes message_complete and preserves finish telemetry", async () => {
  const result = await captureProvider(
    providerFor([
      {
        text: "Để làm phép cộng có nhớ thật",
        candidates: [{ finishReason: "MAX_TOKENS" }],
        usageMetadata: {
          promptTokenCount: 120,
          candidatesTokenCount: 18,
          thoughtsTokenCount: 180,
          totalTokenCount: 318,
        },
      },
    ]),
  );
  assert.equal(result.error?.message, "AI_RESPONSE_TRUNCATED");
  assert.equal(
    result.events.some((event) => event.type === "message_complete"),
    false,
  );
  const metrics = result.events.find((event) => event.type === "metrics");
  assert.equal(metrics?.type === "metrics" ? metrics.metrics.finishReason : null, "MAX_TOKENS");
  const usage = result.events.find((event) => event.type === "usage");
  assert.equal(usage?.type === "usage" ? usage.usage.thinkingTokens : null, 180);
});

test("abnormal close and structurally incomplete STOP have distinct closed errors", async () => {
  const completeText =
    "Bước 1: hãy đặt 27 trên 15 sao cho hàng đơn vị thẳng nhau. Bước đầu tiên là tính 7 + 5 ở hàng đơn vị rồi ghi phần đơn vị và nhớ sang hàng chục. Em tính được 7 + 5 bằng bao nhiêu?";
  const closed = await captureProvider(providerFor([{ text: completeText }]));
  assert.equal(closed.error?.message, "AI_STREAM_INTERRUPTED");

  const incomplete = await captureProvider(
    providerFor([
      {
        text: "Để làm phép cộng có nhớ thật",
        candidates: [{ finishReason: "STOP" }],
      },
    ]),
  );
  assert.equal(incomplete.error?.message, "AI_RESPONSE_TRUNCATED");
});

test("provider deadline errors become AI_PROVIDER_TIMEOUT without raw error leakage", async () => {
  const provider = new GoogleAiTutorProvider({
    apiKey: "TEST_ONLY_NOT_A_REAL_GOOGLE_KEY",
    model: "gemini-3.6-flash",
    timeoutMs: 2_000,
    client: {
      models: {
        async generateContentStream() {
          const error = new Error("provider deadline exceeded with private detail");
          error.name = "ApiError";
          throw error;
        },
      },
    } as never,
  });
  const result = await captureProvider(provider);
  assert.equal(result.error?.message, "AI_PROVIDER_TIMEOUT");
  assert.doesNotMatch(result.error?.message ?? "", /private detail/u);
  const metrics = result.events.find((event) => event.type === "metrics");
  assert.equal(
    metrics?.type === "metrics" ? metrics.metrics.finishReason : null,
    "TIMEOUT",
  );
});

test("bounded representative math samples cover grades 1–9 without claiming absolute LLM correctness", () => {
  const samples = [
    [1, "addition-with-carrying", /7 \+ 5 = 12/u, "Bước 1: hãy cộng hàng đơn vị trước: 7 + 5 = 12, viết 2 và nhớ 1 chục. Sau đó em cộng hàng chục cùng số nhớ. Em thử nói bước tiếp theo là phép cộng nào?"],
    [2, "subtraction-with-borrowing", /43 - 22 = 21/u, "Bước 1: với 43 - 22, hãy trừ hàng đơn vị 3 - 2 = 1. Bước 2: trừ hàng chục 4 - 2 = 2, nên 43 - 22 = 21. Em kiểm tra lại bằng phép cộng 21 + 22 được bao nhiêu?"],
    [3, "multiplication-division", /24/u, "Bước 1: 6 nhóm, mỗi nhóm 4 vật, nên ta tính 6 × 4 = 24. Phép chia ngược lại là 24 : 6 = 4. Em có thể dùng phép chia nào khác để kiểm tra kết quả?"],
    [4, "measurement", /230 cm/u, "Bước 1: hãy nhớ 1 m = 100 cm. Vì thế 2 m = 200 cm; cộng thêm 30 cm ta được 230 cm. Lỗi thường gặp là cộng 2 với 30 ngay. Em đổi 3 m 5 cm ra xăng-ti-mét được không?"],
    [5, "applied-word-problem", /24/u, "Bước 1: mỗi hộp có 8 bút và có 3 hộp, nên phép tính phù hợp là 3 × 8 = 24 bút. Ta dùng phép nhân vì các nhóm bằng nhau. Em sẽ dùng phép tính nào nếu bớt đi 5 bút?"],
    [6, "fractions", /= 1/u, "Bước 1: hai phân số 3/4 và 1/4 có cùng mẫu số. Ta cộng tử số: 3 + 1 = 4, giữ mẫu 4, nên 4/4 = 1. Lỗi thường gặp là cộng cả mẫu số. Em giải thích vì sao vẫn giữ mẫu 4 được không?"],
    [7, "algebra", /x = 4/u, "Bước 1: với 2x + 3 = 11, hãy trừ 3 ở cả hai vế để được 2x = 8. Bước 2: chia cả hai vế cho 2, nên x = 4. Em thay 4 vào vế trái để kiểm tra được bao nhiêu?"],
    [7, "statistics", /4/u, "Bước 1: số trung bình của 2, 4, 6 bằng tổng chia cho số giá trị: (2 + 4 + 6) : 3 = 4. Lỗi thường gặp là quên chia cho 3. Em thử tính trung bình của 3, 6, 9 nhé?"],
    [8, "probability", /1\/2/u, "Bước 1: một con xúc xắc công bằng có 6 kết quả. Các số chẵn là 2, 4, 6, tức 3 kết quả thuận lợi, nên xác suất là 3/6 = 1/2. Em hãy nêu các kết quả thuận lợi khi cần ra số lớn hơn 4?"],
    [9, "geometry", /15 cm²/u, "Bước 1: diện tích hình chữ nhật bằng chiều dài nhân chiều rộng. Với chiều dài 5 cm và chiều rộng 3 cm, ta có 5 × 3 = 15 cm². Lỗi thường gặp là dùng công thức chu vi. Em sẽ tính chu vi hình này thế nào?"],
  ] as const;

  for (const [grade, topic, expected, response] of samples) {
    assert.ok(grade >= 1 && grade <= 9, topic);
    assert.match(response, expected, topic);
    assert.equal(
      evaluateTutorResponseCompleteness(response, "FULL_SOLUTION").complete,
      true,
      topic,
    );
  }

  const hint =
    "Mục tiêu là cộng đúng hàng đơn vị trước. Bước đầu tiên: hãy đặt 27 trên 15 sao cho 7 thẳng với 5, rồi tính 7 + 5. Nếu tổng có hai chữ số, em viết chữ số nào ở hàng đơn vị và nhớ gì sang hàng chục?";
  assert.equal(evaluateTutorResponseCompleteness(hint, "HINT").complete, true);
  assert.doesNotMatch(hint, /(?:đáp án|kết quả)(?: là)? 42/iu);
});
