import { checkPreviewAnswer } from "../../../../lib/curriculum/engine.ts";

type RequestBody = {
  unitSlug?: unknown;
  questionCode?: unknown;
  answer?: unknown;
};

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  if (
    typeof body.unitSlug !== "string" ||
    typeof body.questionCode !== "string" ||
    typeof body.answer !== "string" ||
    body.answer.length > 80 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.unitSlug) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*-q\d{2}$/.test(body.questionCode)
  ) {
    return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const result = checkPreviewAnswer(
    body.unitSlug,
    body.questionCode,
    body.answer,
  );
  if (!result) {
    return Response.json({ error: "QUESTION_NOT_FOUND" }, { status: 404 });
  }

  return Response.json(result, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
