import type {
  AiTutorProviderId,
  TutorRequest,
  TutorStreamEvent,
} from "./contracts.ts";
import type { AiTutorProvider } from "./provider.ts";

function mockAnswer(message: string, grade: number) {
  if (/công thức dài|long mathematical/iu.test(message)) {
    return `Ví dụ trình bày Toán lớp ${grade}:\n\n1. Đặt biểu thức A = 2 × (x + 3) − 4.\n2. Phân phối: A = 2x + 6 − 4.\n3. Thu gọn: A = 2x + 2.\n\nNếu A = 12 thì 2x + 2 = 12, nên 2x = 10 và x = 5. Em hãy thay x = 5 vào biểu thức ban đầu để tự kiểm tra.`;
  }
  if (/dừng|abort/iu.test(message)) {
    return "Mình sẽ viết chậm để em có thể thử nút Dừng. Trước hết, hãy xác định dữ kiện đã biết. Sau đó chọn phép tính phù hợp. Cuối cùng kiểm tra lại đơn vị và kết quả.";
  }
  if (/sai|giải thích/iu.test(message)) {
    return `Mình chưa vội đưa đáp án. Với bài lớp ${grade}, em hãy kiểm tra phép tính ở bước đầu tiên: xác định đại lượng cần tìm, rồi so sánh phép tính của em với dữ kiện trong đề.`;
  }
  return `Gợi ý cho bài Toán lớp ${grade}:\n1. Gạch chân dữ kiện đã biết.\n2. Nói rõ đề bài hỏi gì.\n3. Chọn phép tính phù hợp và kiểm tra lại kết quả.\n\nEm thử viết bước 1 trước nhé.`;
}

export class MockAiTutorProvider implements AiTutorProvider {
  readonly id: AiTutorProviderId;
  readonly model: string;

  constructor(model: string, provider: AiTutorProviderId = "OPENAI") {
    this.model = model;
    this.id = provider;
  }

  async *streamTutorResponse(input: TutorRequest): AsyncIterable<TutorStreamEvent> {
    yield { type: "message_start", messageId: input.messageId };
    const answer = mockAnswer(input.message, input.grade);
    for (let index = 0; index < answer.length; index += 18) {
      if (input.signal.aborted) return;
      await new Promise((resolve) => setTimeout(resolve, 45));
      yield { type: "text_delta", delta: answer.slice(index, index + 18) };
    }
    yield {
      type: "usage",
      usage: {
        provider: this.id,
        model: this.model,
        inputTokens: 24,
        outputTokens: 48,
        thinkingTokens: 0,
        totalTokens: 72,
      },
    };
    yield { type: "message_complete", messageId: input.messageId };
  }
}
