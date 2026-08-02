import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { UniversalCurriculumRunner } from "@/app/curriculum-practice/[attemptId]/UniversalCurriculumRunner";
import type {
  CurriculumAttemptQuestion,
  CurriculumAttemptState,
} from "@/lib/curriculum-runtime/contracts";

export const metadata = { title: "Generator product audit" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type AuditSample = Readonly<{
  sampleId: string;
  variant: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  grade: number | null;
  publicQuestion: CurriculumAttemptQuestion | null;
}>;

type AuditIndex = Readonly<{ samples: readonly AuditSample[] }>;

type PageProps = Readonly<{
  searchParams: Promise<{
    sample?: string;
    state?: string;
  }>;
}>;

export default async function GeneratorProductAuditPage({
  searchParams,
}: PageProps) {
  const host = (await headers()).get("host")?.split(":")[0] ?? "";
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.PLAVE_GENERATOR_PRODUCT_AUDIT_UI !== "true" ||
    (host !== "127.0.0.1" && host !== "localhost")
  ) {
    notFound();
  }

  const query = await searchParams;
  const index = JSON.parse(
    readFileSync(
      resolve(
        process.cwd(),
        "artifacts/generator-product-audit/sample-index.json",
      ),
      "utf8",
    ),
  ) as AuditIndex;
  const requested = query.sample ?? "NUMBER_COMPARISON:MEDIUM:1";
  const sample = index.samples.find((item) => item.sampleId === requested);
  if (!sample?.publicQuestion) notFound();

  const numericFixture = query.state === "numeric-static";
  const question: CurriculumAttemptQuestion = numericFixture
    ? {
        questionId: "audit-static-number-input",
        position: 1,
        prompt: "Đối chứng static bank: nhập kết quả của 8 + 7.",
        answerType: "NUMBER_INPUT",
        options: null,
        visual: {
          type: "TEXT_ONLY",
          description:
            "Đối chứng renderer nhập số; semantic generator hiện không sinh answer type này.",
        },
        cognitiveLevel: "UNDERSTAND",
        generatorV2: null,
      }
    : sample.publicQuestion;
  const completed = query.state === "completed";
  const empty = query.state === "empty";
  const initialState: CurriculumAttemptState = {
    runtimeMode: "STATIC",
    attemptId: "00000000-0000-4000-8000-000000000008",
    releaseId: "generator-product-audit-local",
    contentVersion: "sprint-8a",
    unitId: "generator-product-audit",
    unitTitle: numericFixture
      ? "Đối chứng static bank · Nhập số"
      : "Bài luyện tập kiểm tra cục bộ",
    grade: sample.grade ?? 9,
    status: completed ? "COMPLETED" : "IN_PROGRESS",
    revision: completed ? 12 : 0,
    answeredCount: completed ? 12 : 0,
    correctCount: completed ? 4 : 0,
    totalQuestions: 12,
    startedAt: "2026-08-01T00:00:00.000Z",
    completedAt: completed ? "2026-08-01T00:12:00.000Z" : null,
    currentQuestion: completed || empty ? null : question,
    feedback: null,
  };

  return (
    <div
      className="practice-page practice-focus-shell page-shell universal-practice-page"
      data-generator-product-audit
    >
      <UniversalCurriculumRunner
        initialState={initialState}
        runtimeMode="ON_DEMAND"
      />
    </div>
  );
}
