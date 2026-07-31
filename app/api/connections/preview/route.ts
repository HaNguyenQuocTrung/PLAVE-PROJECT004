import { NextResponse, type NextRequest } from "next/server";

import { isSameOriginRequest } from "@/lib/auth/same-origin";
import { previewStudentConnection } from "@/lib/connections/server";
import { parseStudentCodeRequest } from "@/lib/connections/validation";

const invalidRequest = {
  ok: false,
  error: {
    code: "INVALID_REQUEST",
    message: "Yêu cầu tìm học sinh không hợp lệ.",
  },
};

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(invalidRequest, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength > 1024) {
    return NextResponse.json(invalidRequest, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(invalidRequest, { status: 400 });
  }

  const studentCode = parseStudentCodeRequest(body);
  if (!studentCode) {
    return NextResponse.json(invalidRequest, { status: 400 });
  }

  const result = await previewStudentConnection(studentCode);
  const response = result.ok
    ? {
        ok: true,
        data: {
          maskedStudentName: result.preview.maskedStudentName,
          grade: result.preview.grade,
        },
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
    headers: { "Cache-Control": "no-store" },
  });
}
