function firstForwardedValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

const localDevelopmentHosts = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
]);

function isEquivalentDevelopmentOrigin(
  actual: URL,
  expected: URL,
  environment: string | undefined,
) {
  return (
    environment === "development" &&
    actual.protocol === expected.protocol &&
    actual.port === expected.port &&
    localDevelopmentHosts.has(actual.hostname.toLowerCase()) &&
    localDevelopmentHosts.has(expected.hostname.toLowerCase())
  );
}

export function isSameOriginRequest(
  request: Request,
  environment: string | undefined = process.env.NODE_ENV,
) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);
    const expectedHost =
      firstForwardedValue(request.headers.get("x-forwarded-host")) ??
      request.headers.get("host") ??
      requestUrl.host;
    const forwardedProtocol = firstForwardedValue(
      request.headers.get("x-forwarded-proto"),
    );
    const expectedProtocol = forwardedProtocol
      ? `${forwardedProtocol}:`
      : requestUrl.protocol;
    const expectedOrigin = new URL(`${expectedProtocol}//${expectedHost}`);

    return (
      originUrl.origin === expectedOrigin.origin ||
      isEquivalentDevelopmentOrigin(
        originUrl,
        expectedOrigin,
        environment,
      )
    );
  } catch {
    return false;
  }
}
