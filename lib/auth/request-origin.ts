import "server-only";

import { headers } from "next/headers";

export async function getRequestOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  if (origin) {
    try {
      const parsed = new URL(origin);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.origin;
      }
    } catch {
      // Fall through to the proxy headers.
    }
  }

  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = (forwardedHost ?? requestHeaders.get("host"))?.split(",")[0];
  const forwardedProtocol = requestHeaders
    .get("x-forwarded-proto")
    ?.split(",")[0];
  const protocol = forwardedProtocol === "https" ? "https" : "http";

  if (!host) {
    throw new Error("Không xác định được địa chỉ website cho callback.");
  }

  const parsed = new URL(`${protocol}://${host}`);
  return parsed.origin;
}
