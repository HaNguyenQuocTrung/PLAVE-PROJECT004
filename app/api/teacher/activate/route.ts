import { NextResponse, type NextRequest } from "next/server";

import { isSameOriginRequest } from "@/lib/auth/same-origin";
import { parseTeacherActivationRequest } from "@/lib/teacher/contracts";
import { activateTeacherAccount } from "@/lib/teacher/server";

const invalidRequest = {
  ok: false,
  error: {
    code: "INVALID_REQUEST",
    message: "Thông tin xác minh giáo viên chưa hợp lệ.",
  },
};

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(invalidRequest, {
      status: 403,
      headers: noStoreHeaders,
    });
  }

  const contentLength = Number(
    request.headers.get("content-length") ?? "0",
  );
  if (!Number.isFinite(contentLength) || contentLength > 4096) {
    return NextResponse.json(invalidRequest, {
      status: 413,
      headers: noStoreHeaders,
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(invalidRequest, {
      status: 400,
      headers: noStoreHeaders,
    });
  }

  const input = parseTeacherActivationRequest(body);
  if (!input) {
    return NextResponse.json(invalidRequest, {
      status: 400,
      headers: noStoreHeaders,
    });
  }

  const result = await activateTeacherAccount(input);
  const response = result.ok
    ? {
        ok: true,
        data: { fullName: result.fullName },
      }
    : {
        ok: false,
        error: {
          code: result.code,
          message: result.message,
        },
      };

  return NextResponse.json(response, {
    status: result.status,
    headers: noStoreHeaders,
  });
}
