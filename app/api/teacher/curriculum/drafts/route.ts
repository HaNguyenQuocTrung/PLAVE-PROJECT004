import { NextResponse } from "next/server";

import { parseCreateCurriculumAssignmentDraftInput } from "@/lib/assignments/curriculum-contracts";
import { readAssignmentRequest } from "@/lib/assignments/request";
import { createTeacherCurriculumDraft } from "@/lib/assignments/server";

const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const requestData = await readAssignmentRequest(request, 12_000);
  const input = requestData.ok
    ? parseCreateCurriculumAssignmentDraftInput(requestData.body)
    : null;
  if (!requestData.ok || !input) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Thông tin bản nháp chưa hợp lệ.",
        },
      },
      { status: requestData.ok ? 400 : requestData.status, headers },
    );
  }
  const result = await createTeacherCurriculumDraft(input);
  return NextResponse.json(
    result.ok
      ? { ok: true, data: result.draft }
      : {
          ok: false,
          error: { code: result.code, message: result.message },
        },
    { status: result.status, headers },
  );
}
