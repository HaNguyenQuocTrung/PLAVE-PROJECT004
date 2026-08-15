const originalFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
  const value =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  let authRequest = false;
  try {
    authRequest = new URL(value).pathname.includes("/auth/v1/");
  } catch {
    // Invalid URLs remain the original fetch implementation's responsibility.
  }
  if (authRequest) {
    process.stderr.write("PLAVE_AUTH_TEST_ADAPTER=NETWORK_FAILURE\n");
    throw new TypeError("synthetic auth network failure");
  }
  return originalFetch(input, init);
};
