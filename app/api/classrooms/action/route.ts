import { NextResponse, type NextRequest } from "next/server";

import { isSameOriginRequest } from "@/lib/auth/same-origin";
import { parseClassroomActionRequest } from "@/lib/classrooms/contracts";
import { updateClassroomMembership } from "@/lib/classrooms/server";

const invalidRequest = {
  ok: false,
  error: {
    code: "INVALID_REQUEST",
    message: "Yêu cầu cập nhật lớp học chưa hợp lệ.",
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
  if (!Number.isFinite(contentLength) || contentLength > 1024) {
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

  const input = parseClassroomActionRequest(body);
  if (!input) {
    return NextResponse.json(invalidRequest, {
      status: 400,
      headers: noStoreHeaders,
    });
  }

  const result = await updateClassroomMembership(
    input.membershipId,
    input.action,
  );
  const response = result.ok
    ? { ok: true }
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
