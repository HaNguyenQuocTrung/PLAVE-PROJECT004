import { NextResponse, type NextRequest } from "next/server";

import { isSameOriginRequest } from "@/lib/auth/same-origin";
import { parseCreateClassroomRequest } from "@/lib/classrooms/contracts";
import { createTeacherClassroom } from "@/lib/classrooms/server";

const invalidRequest = {
  ok: false,
  error: {
    code: "INVALID_REQUEST",
    message: "Thông tin lớp học chưa hợp lệ.",
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
  if (!Number.isFinite(contentLength) || contentLength > 2048) {
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

  const input = parseCreateClassroomRequest(body);
  if (!input) {
    return NextResponse.json(invalidRequest, {
      status: 400,
      headers: noStoreHeaders,
    });
  }

  const result = await createTeacherClassroom(input);
  const response = result.ok
    ? {
        ok: true,
        data: {
          classroom_id: result.classroom.classroomId,
          name: result.classroom.name,
          grade: result.classroom.grade,
          class_code: result.classroom.classCode,
          status: result.classroom.status,
          created_at: result.classroom.createdAt,
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
