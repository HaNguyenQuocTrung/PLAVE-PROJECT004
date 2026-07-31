import { isSameOriginRequest } from "@/lib/auth/same-origin";

export async function readAssignmentRequest(
  request: Request,
  maximumBytes = 8192,
) {
  if (!isSameOriginRequest(request)) {
    return { ok: false as const, status: 403 };
  }

  const contentLength = Number(
    request.headers.get("content-length") ?? "0",
  );
  if (!Number.isFinite(contentLength) || contentLength > maximumBytes) {
    return { ok: false as const, status: 413 };
  }

  try {
    const body: unknown = await request.json();
    return { ok: true as const, body };
  } catch {
    return { ok: false as const, status: 400 };
  }
}
