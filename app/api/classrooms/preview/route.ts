import { NextResponse, type NextRequest } from "next/server";

import { isSameOriginRequest } from "@/lib/auth/same-origin";
import { parseClassroomCodeRequest } from "@/lib/classrooms/contracts";
import { previewClassroom } from "@/lib/classrooms/server";

const invalidRequest = {
  ok: false,
  error: {
    code: "INVALID_REQUEST",
    message:
      "Không tìm thấy lớp học phù hợp. Vui lòng kiểm tra lại mã.",
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

  const classCode = parseClassroomCodeRequest(body);
  if (!classCode) {
    return NextResponse.json(invalidRequest, {
      status: 400,
      headers: noStoreHeaders,
    });
  }

  const result = await previewClassroom(classCode);
  const response = result.ok
    ? {
        ok: true,
        data: {
          classroomName: result.preview.classroomName,
          grade: result.preview.grade,
          teacherDisplayName: result.preview.teacherDisplayName,
          membershipStatus: result.preview.membershipStatus,
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
    headers: noStoreHeaders,
  });
}
