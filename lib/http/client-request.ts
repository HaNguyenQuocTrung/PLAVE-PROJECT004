export const CLIENT_REQUEST_TIMEOUT_MS = 8_000;

export class ClientRequestTimeoutError extends Error {
  constructor() {
    super("CLIENT_REQUEST_TIMEOUT");
    this.name = "ClientRequestTimeoutError";
  }
}

export async function fetchWithClientTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = CLIENT_REQUEST_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const existingSignal = init.signal;
  let timedOut = false;
  const abort = () => controller.abort();
  if (existingSignal?.aborted) abort();
  else existingSignal?.addEventListener("abort", abort, { once: true });
  const timeout = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) throw new ClientRequestTimeoutError();
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
    existingSignal?.removeEventListener("abort", abort);
  }
}

export function getClientRequestErrorMessage(
  error: unknown,
  code: string,
  fallback: string,
) {
  return error instanceof ClientRequestTimeoutError
    ? `Phản hồi đang mất nhiều thời gian (mã ${code}). Vui lòng thử lại; thao tác được bảo vệ để không tạo dữ liệu trùng.`
    : fallback;
}
