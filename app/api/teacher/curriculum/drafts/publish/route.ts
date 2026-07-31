import { NextResponse } from "next/server";

import { readAssignmentRequest } from "@/lib/assignments/request";
import { publishTeacherCurriculumDraft } from "@/lib/assignments/server";

const headers = { "Cache-Control": "no-store" };
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const requestData = await readAssignmentRequest(request, 1024);
  const body =
    requestData.ok &&
    typeof requestData.body === "object" &&
    requestData.body !== null
      ? (requestData.body as Record<string, unknown>)
      : null;
  if (
    !body ||
    Object.keys(body).some(
      (key) => !["draftId", "requestId"].includes(key),
    ) ||
    typeof body.draftId !== "string" ||
    !uuidPattern.test(body.draftId) ||
    typeof body.requestId !== "string" ||
    !uuidPattern.test(body.requestId)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Yêu cầu giao bản nháp chưa hợp lệ.",
        },
      },
      { status: requestData.ok ? 400 : requestData.status, headers },
    );
  }
  const result = await publishTeacherCurriculumDraft({
    draftId: body.draftId,
    requestId: body.requestId,
  });
  return NextResponse.json(
    result.ok
      ? { ok: true, data: { assignmentId: result.assignmentId } }
      : {
          ok: false,
          error: { code: result.code, message: result.message },
        },
    { status: result.status, headers },
  );
}
