import { NextResponse } from "next/server";

import { loadTeacherCurriculumCatalog } from "@/lib/assignments/server";

const headers = { "Cache-Control": "no-store" };
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const classroomId = url.searchParams.get("classroomId");
  const unitId = url.searchParams.get("unitId");
  const domain = url.searchParams.get("domain");
  const outcomeId = url.searchParams.get("outcomeId");
  const skillId = url.searchParams.get("skillId");
  if (
    !classroomId ||
    !uuidPattern.test(classroomId) ||
    (unitId !== null && !slugPattern.test(unitId)) ||
    (domain !== null && !/^[A-Z_]{3,60}$/.test(domain)) ||
    (outcomeId !== null && outcomeId.length > 160) ||
    (skillId !== null && skillId.length > 160)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Bộ lọc chương trình chưa hợp lệ.",
        },
      },
      { status: 400, headers },
    );
  }
  const result = await loadTeacherCurriculumCatalog({
    classroomId,
    unitId,
    domain,
    outcomeId,
    skillId,
    limit: 24,
    offset: 0,
  });
  return NextResponse.json(
    result.ok
      ? { ok: true, data: result.catalog }
      : {
          ok: false,
          error: { code: result.code, message: result.message },
        },
    { status: result.status, headers },
  );
}
