export const SUPABASE_PROXY_AUTH_TIMEOUT_MS = 1_500;
export const SUPABASE_SERVER_AUTH_TIMEOUT_MS = 4_000;
export const SUPABASE_SERVER_REQUEST_TIMEOUT_MS = 8_000;

const transientStatuses = new Set([408, 425, 429]);
const transientAuthBody = JSON.stringify({
  code: "plave_auth_temporarily_unavailable",
  msg: "Authentication temporarily unavailable",
});

function isAuthRequest(input: Parameters<typeof fetch>[0]) {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  try {
    return new URL(url).pathname.includes("/auth/v1/");
  } catch {
    return false;
  }
}

function isTransientStatus(status: number) {
  return transientStatuses.has(status) || status >= 500;
}

function transientAuthResponse() {
  return new Response(transientAuthBody, {
    status: 400,
    headers: {
      "content-type": "application/json",
      "x-supabase-api-version": "2024-01-01",
    },
  });
}

export function createSupabaseFailSafeFetch(options: Readonly<{
  authTimeoutMs: number;
  requestTimeoutMs?: number;
  fetchImpl?: typeof fetch;
}>) {
  const fetchImpl = options.fetchImpl ?? fetch;
  let transientAuthFailure = false;

  const failSafeFetch: typeof fetch = async (input, init) => {
    const authRequest = isAuthRequest(input);
    const timeoutMs = authRequest
      ? options.authTimeoutMs
      : (options.requestTimeoutMs ?? options.authTimeoutMs);
    const controller = new AbortController();
    const existingSignal = init?.signal;
    const abortFromExistingSignal = () => controller.abort();
    if (existingSignal?.aborted) controller.abort();
    else {
      existingSignal?.addEventListener("abort", abortFromExistingSignal, {
        once: true,
      });
    }
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(input, {
        ...init,
        signal: controller.signal,
      });
      if (authRequest && isTransientStatus(response.status)) {
        transientAuthFailure = true;
        return transientAuthResponse();
      }
      return response;
    } catch (error) {
      if (authRequest) {
        transientAuthFailure = true;
        return transientAuthResponse();
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      existingSignal?.removeEventListener("abort", abortFromExistingSignal);
    }
  };

  return {
    fetch: failSafeFetch,
    didTransientAuthFailure() {
      return transientAuthFailure;
    },
  };
}
