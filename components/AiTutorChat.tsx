"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { PlaveIcon } from "@/components/PlaveIcon";
import {
  isTutorStreamEvent,
  type TutorClientRequest,
  type TutorErrorCode,
  type TutorLatencyMetrics,
  type TutorMessage,
  type TutorResponseMode,
  type TutorStreamEvent,
} from "@/lib/ai-tutor/contracts";

import styles from "@/app/tutor/tutor.module.css";

type DisplayMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  state: "complete" | "streaming" | "error" | "stopped" | "truncated";
};

type AvailabilityCode =
  | "READY"
  | "AI_TUTOR_DISABLED"
  | "AI_CONFIGURATION_INVALID"
  | "AI_PROVIDER_NOT_IMPLEMENTED";

type Props = Readonly<{
  grade: number;
  available: boolean;
  availabilityCode: AvailabilityCode;
  maxMessageCharacters: number;
}>;

const ERROR_COPY: Partial<Record<TutorErrorCode, string>> = {
  AI_TUTOR_DISABLED: "AI Tutor chưa được bật cho môi trường này.",
  AI_CONFIGURATION_INVALID: "AI Tutor đang chờ cấu hình an toàn từ Owner.",
  AI_PROVIDER_NOT_IMPLEMENTED: "Nhà cung cấp AI đã chọn chưa được hỗ trợ.",
  AI_AUTH_REQUIRED: "Phiên đăng nhập đã hết hạn. Em hãy đăng nhập lại.",
  AI_STUDENT_ONLY: "AI Tutor hiện chỉ dành cho tài khoản Học sinh.",
  AI_INVALID_REQUEST: "Tin nhắn không đúng định dạng an toàn.",
  AI_REQUEST_TOO_LARGE: "Tin nhắn quá dài. Em hãy rút gọn câu hỏi.",
  AI_HISTORY_LIMIT: "Cuộc trò chuyện đã dài. Em hãy mở cuộc trò chuyện mới.",
  AI_RATE_LIMITED: "Em gửi hơi nhanh. Hãy chờ một chút rồi thử lại.",
  AI_DAILY_LIMIT_REACHED: "Đã đạt giới hạn sử dụng hôm nay.",
  AI_CONCURRENT_REQUEST: "AI Tutor đang trả lời. Em hãy dừng hoặc chờ hoàn tất.",
  AI_DUPLICATE_REQUEST: "Tin nhắn này đã được gửi rồi.",
  AI_CONVERSATION_FORBIDDEN: "Cuộc trò chuyện này không thuộc phiên học của em.",
  AI_RESPONSE_TRUNCATED: "Câu trả lời bị gián đoạn trước khi hoàn tất.",
  AI_PROVIDER_TIMEOUT: "AI Tutor phản hồi quá lâu. Em có thể thử lại.",
  AI_STREAM_INTERRUPTED: "Kết nối phản hồi bị gián đoạn.",
  AI_SAFETY_BLOCKED: "Phản hồi đã dừng vì bộ lọc an toàn.",
  AI_EMPTY_RESPONSE: "AI Tutor chưa tạo được nội dung. Em có thể thử lại.",
  AI_PROVIDER_ERROR: "AI Tutor chưa thể trả lời lúc này.",
  AI_STREAM_ABORTED: "Đã dừng câu trả lời.",
  AI_MALFORMED_PROVIDER_EVENT: "Phản hồi AI không đúng định dạng an toàn.",
};

const RESPONSE_MODE_CHIPS: ReadonlyArray<
  Readonly<{ mode: TutorResponseMode; label: string }>
> = [
  { mode: "HINT", label: "Gợi ý" },
  { mode: "EXPLAIN", label: "Giải thích" },
  { mode: "EXAMPLE", label: "Ví dụ tương tự" },
  { mode: "CHECK_MY_WORK", label: "Kiểm tra bài của em" },
];

function newIdentifier(prefix: string) {
  const random = globalThis.crypto.randomUUID().replaceAll("-", "_");
  return `${prefix}_${random}`;
}

function monotonicNow() {
  return performance.now();
}

function suggestionsForGrade(grade: number) {
  if (grade <= 3) {
    return [
      "Gợi ý cho em cách làm phép cộng có nhớ.",
      "Giải thích cho em hàng chục và hàng đơn vị.",
      "Cho em một bài Toán có lời văn tương tự.",
    ];
  }
  if (grade <= 6) {
    return [
      "Gợi ý cách so sánh hai phân số.",
      "Giải thích sự khác nhau giữa chu vi và diện tích.",
      "Cho em một ví dụ đổi đơn vị đo.",
    ];
  }
  return [
    "Gợi ý bước đầu để giải phương trình này.",
    "Giải thích cách đọc biểu đồ mà chưa đưa đáp án.",
    "Cho em một ví dụ xác suất tương tự.",
  ];
}

function availabilityCopy(code: AvailabilityCode) {
  return code === "READY"
    ? "AI Tutor sẵn sàng."
    : ERROR_COPY[code] ?? "AI Tutor chưa sẵn sàng.";
}

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getServerOnlineSnapshot() {
  return true;
}

async function readErrorCode(response: Response): Promise<TutorErrorCode> {
  try {
    const body = (await response.json()) as {
      error?: { code?: TutorErrorCode };
    };
    return body.error?.code ?? "AI_PROVIDER_ERROR";
  } catch {
    return "AI_PROVIDER_ERROR";
  }
}

export function AiTutorChat({
  grade,
  available,
  availabilityCode,
  maxMessageCharacters,
}: Props) {
  const [conversationId, setConversationId] = useState(() => newIdentifier("conversation"));
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [composer, setComposer] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [responseMode, setResponseMode] =
    useState<TutorResponseMode>("HINT");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const online = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerOnlineSnapshot,
  );
  const [status, setStatus] = useState(
    available
      ? "AI Tutor sẵn sàng khi em gửi câu hỏi."
      : availabilityCopy(availabilityCode),
  );
  const [errorCode, setErrorCode] = useState<TutorErrorCode | null>(null);
  const [confirmAction, setConfirmAction] = useState<"clear" | "new" | null>(null);
  const [lastQuestion, setLastQuestion] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const activeRequestRef = useRef(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const streamStartedAtRef = useRef<number | null>(null);
  const suggestions = useMemo(() => suggestionsForGrade(grade), [grade]);

  useEffect(() => {
    if (!messages.length) return;
    const container = messagesRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!streaming) return;
    const timer = window.setInterval(() => {
      const startedAt = streamStartedAtRef.current;
      if (startedAt !== null) {
        setElapsedSeconds(
          Math.max(0, Math.floor((monotonicNow() - startedAt) / 1_000)),
        );
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [streaming]);

  useEffect(() => {
    if (!confirmAction) return;
    confirmButtonRef.current?.focus();
    const close = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setConfirmAction(null);
        composerRef.current?.focus();
        return;
      }
      if (event.key === "Tab") {
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled])',
          ) ?? [],
        );
        if (!focusable.length) return;
        const first = focusable[0]!;
        const last = focusable.at(-1)!;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [confirmAction]);

  const historyBeforeSend = (): TutorMessage[] =>
    messages
      .filter((message) => message.state === "complete")
      .map((message) => ({ role: message.role, content: message.content }));

  const updateAssistant = (
    id: string,
    updater: (message: DisplayMessage) => DisplayMessage,
  ) => {
    setMessages((current) =>
      current.map((message) => (message.id === id ? updater(message) : message)),
    );
  };

  const sendMessage = async (
    rawMessage: string,
    options?: Readonly<{ history?: TutorMessage[] }>,
  ) => {
    const message = rawMessage.trim();
    if (
      !message ||
      activeRequestRef.current ||
      streaming ||
      !available ||
      !online ||
      !conversationId ||
      message.length > maxMessageCharacters
    ) {
      return;
    }
    activeRequestRef.current = true;
    const messageId = newIdentifier("message");
    const assistantId = newIdentifier("assistant");
    const history = options?.history ?? historyBeforeSend();
    const payload: TutorClientRequest = {
      conversationId,
      messageId,
      message,
      history,
      responseMode,
    };
    setComposer("");
    setLastQuestion(message);
    setErrorCode(null);
    setMessages((current) => [
      ...current,
      { id: messageId, role: "user", content: message, state: "complete" },
      { id: assistantId, role: "assistant", content: "", state: "streaming" },
    ]);
    setStreaming(true);
    setElapsedSeconds(0);
    await Promise.resolve();
    streamStartedAtRef.current = monotonicNow();
    setStatus("AI Tutor đang suy nghĩ…");
    const controller = new AbortController();
    abortRef.current = controller;
    const uiStartedAt = monotonicNow();
    let firstVisibleTokenMs: number | null = null;
    let terminalErrorCode: TutorErrorCode | null = null;
    let serverMetrics: TutorLatencyMetrics | null = null;
    try {
      const response = await fetch("/api/tutor/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const code = await readErrorCode(response);
        throw Object.assign(new Error(code), { code });
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;
      const handleLine = (line: string) => {
        if (!line.trim()) return;
        let event: unknown;
        try {
          event = JSON.parse(line);
        } catch {
          throw Object.assign(new Error("AI_MALFORMED_PROVIDER_EVENT"), {
            code: "AI_MALFORMED_PROVIDER_EVENT" as const,
          });
        }
        if (!isTutorStreamEvent(event)) {
          throw Object.assign(new Error("AI_MALFORMED_PROVIDER_EVENT"), {
            code: "AI_MALFORMED_PROVIDER_EVENT" as const,
          });
        }
        const typedEvent: TutorStreamEvent = event;
        if (typedEvent.type === "text_delta") {
          if (firstVisibleTokenMs === null) {
            window.requestAnimationFrame(() => {
              firstVisibleTokenMs ??= monotonicNow() - uiStartedAt;
            });
          }
          setStatus("AI Tutor đang trả lời…");
          updateAssistant(assistantId, (current) => ({
            ...current,
            content: current.content + typedEvent.delta,
          }));
        } else if (typedEvent.type === "message_complete") {
          completed = true;
        } else if (typedEvent.type === "metrics") {
          serverMetrics = typedEvent.metrics;
        } else if (typedEvent.type === "error") {
          terminalErrorCode = typedEvent.code;
          setErrorCode(typedEvent.code);
          setStatus(typedEvent.message);
          const interrupted =
            typedEvent.code === "AI_RESPONSE_TRUNCATED" ||
            typedEvent.code === "AI_STREAM_INTERRUPTED";
          updateAssistant(assistantId, (current) => ({
            ...current,
            content: current.content || typedEvent.message,
            state:
              typedEvent.code === "AI_STREAM_ABORTED"
                ? "stopped"
                : interrupted
                  ? "truncated"
                  : "error",
          }));
        }
      };
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) handleLine(line);
      }
      buffer += decoder.decode();
      if (buffer.trim()) handleLine(buffer);
      if (completed && !terminalErrorCode) {
        await new Promise<void>((resolveFrame) =>
          window.requestAnimationFrame(() => resolveFrame()),
        );
        updateAssistant(assistantId, (current) => ({
          ...current,
          state: "complete",
        }));
        setStatus("AI Tutor đã trả lời xong.");
      } else if (!controller.signal.aborted && !terminalErrorCode) {
        throw Object.assign(new Error("AI_STREAM_INTERRUPTED"), {
          code: "AI_STREAM_INTERRUPTED" as const,
        });
      }
    } catch (error) {
      const aborted = controller.signal.aborted;
      const code = aborted
        ? "AI_STREAM_ABORTED"
        : typeof error === "object" && error && "code" in error
          ? (error.code as TutorErrorCode)
          : "AI_STREAM_INTERRUPTED";
      terminalErrorCode = code;
      const messageText = ERROR_COPY[code] ?? "AI Tutor chưa thể trả lời lúc này.";
      setErrorCode(code);
      setStatus(messageText);
      updateAssistant(assistantId, (current) => ({
        ...current,
        content: current.content || messageText,
        state: aborted
          ? "stopped"
          : code === "AI_RESPONSE_TRUNCATED" ||
              code === "AI_STREAM_INTERRUPTED"
            ? "truncated"
            : "error",
      }));
    } finally {
      const uiCompletionMs = monotonicNow() - uiStartedAt;
      const detail = {
        ...(serverMetrics ?? {}),
        clientFirstVisibleTokenMs: firstVisibleTokenMs,
        uiCompletionMs,
        outcome:
          terminalErrorCode ??
          (controller.signal.aborted ? "AI_STREAM_ABORTED" : "SUCCESS"),
      };
      window.dispatchEvent(
        new CustomEvent("plave-ai-tutor-metrics", { detail }),
      );
      console.info(JSON.stringify({ event: "ai_tutor_client_latency", ...detail }));
      if (abortRef.current === controller) abortRef.current = null;
      activeRequestRef.current = false;
      streamStartedAtRef.current = null;
      setElapsedSeconds(0);
      setStreaming(false);
      window.requestAnimationFrame(() => composerRef.current?.focus());
    }
  };

  const continueInterruptedResponse = () => {
    const partial = [...messages]
      .reverse()
      .find(
        (message) =>
          message.role === "assistant" &&
          message.state === "truncated" &&
          message.content,
      );
    if (!partial) return;
    void sendMessage(
      "Tiếp tục câu trả lời từ đúng chỗ vừa dừng, không lặp lại phần đã có.",
      {
        history: [
          ...historyBeforeSend(),
          { role: "assistant", content: partial.content },
        ],
      },
    );
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendMessage(composer);
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!streaming) void sendMessage(composer);
    }
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
    setStatus("Đang dừng câu trả lời…");
  };

  const confirmReset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setLastQuestion("");
    setErrorCode(null);
    if (confirmAction === "new") {
      setConversationId(newIdentifier("conversation"));
      setStatus("Đã mở cuộc trò chuyện mới.");
    } else {
      setStatus("Đã xóa nội dung cuộc trò chuyện hiện tại.");
    }
    setConfirmAction(null);
    window.requestAnimationFrame(() => composerRef.current?.focus());
  };

  const copyResponse = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setStatus("Đã sao chép câu trả lời.");
    } catch {
      setStatus("Chưa thể sao chép. Em có thể chọn và sao chép văn bản thủ công.");
    }
  };

  const disabled = !available || !online || streaming || !conversationId;
  const overLimit = composer.length > maxMessageCharacters;
  const interrupted =
    errorCode === "AI_RESPONSE_TRUNCATED" ||
    errorCode === "AI_STREAM_INTERRUPTED";
  const waitingForFirstToken =
    streaming &&
    messages.some(
      (message) =>
        message.role === "assistant" &&
        message.state === "streaming" &&
        !message.content,
    );

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar} aria-label="Cuộc trò chuyện AI Tutor">
        <div className={styles.sidebarHeading}>
          <span className={styles.piMark} aria-hidden="true">π</span>
          <div>
            <strong>AI Tutor</strong>
            <span>Toán lớp {grade}</span>
          </div>
        </div>
        <button
          className={styles.newConversation}
          type="button"
          onClick={() => (messages.length ? setConfirmAction("new") : setConversationId(newIdentifier("conversation")))}
        >
          <span aria-hidden="true">＋</span>
          Cuộc trò chuyện mới
        </button>
        <div className={styles.conversationCurrent} aria-current="page">
          <span aria-hidden="true" />
          <div>
            <strong>Phiên hiện tại</strong>
            <small>{messages.length ? `${messages.length} tin nhắn` : "Chưa có tin nhắn"}</small>
          </div>
        </div>
        <p className={styles.privacyNote}>
          Không chia sẻ mật khẩu, số điện thoại hoặc địa chỉ. Cuộc trò chuyện MVP chưa được lưu sau khi đóng trang.
        </p>
      </aside>

      <section className={styles.workspace} aria-labelledby="tutor-title">
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Học theo nhịp của em</p>
            <h1 id="tutor-title">Hỏi AI Tutor</h1>
            <p>Nhận gợi ý từng bước cho Toán lớp {grade}. Em vẫn là người tự hoàn thành bài.</p>
          </div>
          {messages.length ? (
            <button
              className={styles.clearButton}
              type="button"
              disabled={streaming}
              onClick={() => setConfirmAction("clear")}
            >
              Xóa cuộc trò chuyện
            </button>
          ) : null}
        </header>

        <div className={styles.alerts}>
          {!available ? (
            <div className={styles.unavailable} role="status">
              <span className={styles.piMark} aria-hidden="true">π</span>
              <div>
                <h2>AI Tutor đang chờ cấu hình</h2>
                <p>{availabilityCopy(availabilityCode)}</p>
              </div>
            </div>
          ) : null}

          {!online ? (
            <div className={styles.offline} role="alert">
              Em đang ngoại tuyến. Tin nhắn sẽ không được gửi cho đến khi có mạng lại.
            </div>
          ) : null}
        </div>

        <div ref={messagesRef} className={styles.messages} aria-label="Nội dung cuộc trò chuyện">
          {!messages.length ? (
            <div className={styles.welcome}>
              <div className={styles.welcomeArt} aria-hidden="true">
                <span>π</span><i /><i /><i />
              </div>
              <p className="eyebrow">Xin chào</p>
              <h2>Em muốn hiểu phần Toán nào?</h2>
              <p>
                Hãy gửi đề bài hoặc nói phần em chưa hiểu. AI Tutor sẽ bắt đầu bằng một gợi ý vừa đủ.
              </p>
              <div className={styles.suggestions} aria-label="Câu hỏi gợi ý">
                {suggestions.map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion}
                    disabled={!available || !online}
                    onClick={() => void sendMessage(suggestion)}
                  >
                    <span aria-hidden="true">↗</span>
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <article
                className={`${styles.message} ${
                  message.role === "user" ? styles.userMessage : styles.assistantMessage
                }`}
                key={message.id}
                data-role={message.role}
                data-state={message.state}
              >
                <div className={styles.messageAvatar} aria-hidden="true">
                  {message.role === "assistant" ? "π" : "Em"}
                </div>
                <div className={styles.messageBody}>
                  <div className={styles.messageMeta}>
                    <strong>{message.role === "assistant" ? "AI Tutor" : "Em"}</strong>
                    {message.state === "streaming" ? <span>Đang trả lời…</span> : null}
                    {message.state === "stopped" ? <span>Đã dừng</span> : null}
                    {message.state === "truncated" ? <span>Câu trả lời bị gián đoạn</span> : null}
                  </div>
                  <p>{message.content || "…"}</p>
                  {message.role === "assistant" && message.content ? (
                    <button
                      className={styles.copyButton}
                      type="button"
                      onClick={() => void copyResponse(message.content)}
                    >
                      Sao chép
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>

        <div className={styles.recoveryArea}>
          <div className={styles.liveStatus} role="status" aria-live="polite" aria-atomic="true">
            {status}
          </div>

          {waitingForFirstToken ? (
            <div className={styles.thinkingStatus} role="status">
              <span aria-hidden="true" />
              AI Tutor đang suy nghĩ…
              {elapsedSeconds >= 3 ? <small>{elapsedSeconds} giây</small> : null}
            </div>
          ) : null}

          {errorCode && lastQuestion && !streaming ? (
            <div className={styles.recovery}>
              <span>{ERROR_COPY[errorCode] ?? "Có lỗi khi trả lời."}</span>
              {interrupted ? (
                <button type="button" onClick={continueInterruptedResponse}>
                  Tiếp tục câu trả lời
                </button>
              ) : null}
              <button type="button" onClick={() => void sendMessage(lastQuestion)}>Thử lại</button>
              <button type="button" onClick={() => void sendMessage(lastQuestion)}>Tạo lại</button>
            </div>
          ) : null}
        </div>

        <form className={styles.composer} onSubmit={handleSubmit}>
          <fieldset className={styles.modeSelector} disabled={streaming || !available}>
            <legend>Cách AI Tutor hỗ trợ</legend>
            <div className={styles.modeChips}>
              {RESPONSE_MODE_CHIPS.map((chip) => (
                <button
                  className={styles.modeChip}
                  type="button"
                  key={chip.mode}
                  data-selected={responseMode === chip.mode || undefined}
                  aria-pressed={responseMode === chip.mode}
                  onClick={() => setResponseMode(chip.mode)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </fieldset>
          <label htmlFor="ai-tutor-message">Câu hỏi Toán của em</label>
          <div className={styles.composerBox}>
            <textarea
              id="ai-tutor-message"
              ref={composerRef}
              rows={2}
              value={composer}
              maxLength={maxMessageCharacters + 1}
              disabled={!available || streaming}
              placeholder="Ví dụ: Gợi ý cho em bước đầu của bài này…"
              onChange={(event) => setComposer(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              aria-describedby="ai-tutor-composer-help"
              aria-invalid={overLimit || undefined}
            />
            {streaming ? (
              <button className={styles.stopButton} type="button" onClick={stopStreaming}>
                <span aria-hidden="true" /> Dừng
              </button>
            ) : (
              <button
                className={styles.sendButton}
                type="submit"
                disabled={disabled || overLimit || !composer.trim()}
                aria-label="Gửi câu hỏi cho AI Tutor"
              >
                <PlaveIcon name="arrow" />
              </button>
            )}
          </div>
          <div className={styles.composerHelp} id="ai-tutor-composer-help">
            <span>Enter để gửi · Shift + Enter để xuống dòng</span>
            <span className={overLimit ? styles.limitError : undefined}>
              {composer.length}/{maxMessageCharacters}
            </span>
          </div>
        </form>
      </section>

      {confirmAction ? (
        <div className={styles.dialogBackdrop}>
          <div ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="tutor-confirm-title">
            <h2 id="tutor-confirm-title">
              {confirmAction === "new" ? "Mở cuộc trò chuyện mới?" : "Xóa cuộc trò chuyện này?"}
            </h2>
            <p>Nội dung hiện tại chưa được lưu và sẽ không thể khôi phục.</p>
            <div>
              <button
                ref={confirmButtonRef}
                className="button button--destructive"
                type="button"
                onClick={confirmReset}
              >
                {confirmAction === "new" ? "Mở cuộc trò chuyện mới" : "Xóa nội dung"}
              </button>
              <button className="button button--secondary" type="button" onClick={() => setConfirmAction(null)}>
                Giữ lại
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
