export const AUTH_REQUEST_STATE_HEADER = "x-plave-auth-request-state";
export const AUTH_FAILURE_COOLDOWN_MS = 10_000;

export type AuthRequestState =
  | "ANONYMOUS"
  | "RECOVERED"
  | "UNAVAILABLE";

export type RequestCookie = Readonly<{
  name: string;
  value: string;
}>;

export type SupabaseAuthCookieState = Readonly<{
  kind: "ABSENT" | "MALFORMED" | "PRESENT";
  names: readonly string[];
}>;

const BASE64_PREFIX = "base64-";

export function getSupabaseAuthStorageKey(url: string) {
  const hostname = new URL(url).hostname;
  const projectReference = hostname.split(".")[0];
  if (!projectReference) throw new Error("SUPABASE_AUTH_STORAGE_KEY_INVALID");
  return `sb-${projectReference}-auth-token`;
}

function isAuthCookieName(name: string, storageKey: string) {
  return name === storageKey || new RegExp(`^${escapeRegExp(storageKey)}\\.\\d+$`, "u").test(name);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/gu, "+").replace(/_/gu, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(`${normalized}${padding}`);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function isSessionShape(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const session = value as Record<string, unknown>;
  return (
    typeof session.access_token === "string" &&
    session.access_token.length > 0 &&
    typeof session.refresh_token === "string" &&
    session.refresh_token.length > 0 &&
    typeof session.expires_at === "number" &&
    Number.isFinite(session.expires_at)
  );
}

export function inspectSupabaseAuthCookie(
  cookies: readonly RequestCookie[],
  url: string,
): SupabaseAuthCookieState {
  const storageKey = getSupabaseAuthStorageKey(url);
  const matching = cookies.filter(({ name }) => isAuthCookieName(name, storageKey));
  const names = [...new Set(matching.map(({ name }) => name))].sort();
  if (matching.length === 0) return { kind: "ABSENT", names };

  const base = matching.filter(({ name }) => name === storageKey);
  const chunks = matching.filter(({ name }) => name !== storageKey);
  if (base.length > 1 || (base.length > 0 && chunks.length > 0)) {
    return { kind: "MALFORMED", names };
  }

  let encoded: string;
  if (base.length === 1) {
    encoded = base[0]?.value ?? "";
  } else {
    const indexed = chunks
      .map((cookie) => ({
        cookie,
        index: Number(cookie.name.slice(storageKey.length + 1)),
      }))
      .sort((left, right) => left.index - right.index);
    const contiguous = indexed.every(
      ({ index }, position) => index === position,
    );
    if (!contiguous || indexed.length !== names.length) {
      return { kind: "MALFORMED", names };
    }
    encoded = indexed.map(({ cookie }) => cookie.value).join("");
  }

  try {
    const serialized = encoded.startsWith(BASE64_PREFIX)
      ? decodeBase64Url(encoded.slice(BASE64_PREFIX.length))
      : encoded;
    return isSessionShape(JSON.parse(serialized))
      ? { kind: "PRESENT", names }
      : { kind: "MALFORMED", names };
  } catch {
    return { kind: "MALFORMED", names };
  }
}

export function readAuthRequestState(
  headers: Pick<Headers, "get">,
): AuthRequestState | null {
  const value = headers.get(AUTH_REQUEST_STATE_HEADER);
  return value === "ANONYMOUS" || value === "RECOVERED" || value === "UNAVAILABLE"
    ? value
    : null;
}

export function createAuthFailureCircuit(
  cooldownMs = AUTH_FAILURE_COOLDOWN_MS,
  now: () => number = Date.now,
) {
  let unavailableUntil = 0;
  let diagnosticUntil = 0;

  return {
    isOpen() {
      return now() < unavailableUntil;
    },
    markUnavailable(log: (message: string) => void = console.warn) {
      const current = now();
      unavailableUntil = Math.max(unavailableUntil, current + cooldownMs);
      if (current >= diagnosticUntil) {
        diagnosticUntil = current + cooldownMs;
        log(
          "PLAVE_AUTH_CHECK=TEMPORARILY_UNAVAILABLE; PUBLIC_FALLBACK=ENABLED; RETRY=DEFERRED",
        );
        return true;
      }
      return false;
    },
    markAvailable() {
      unavailableUntil = 0;
    },
  };
}
