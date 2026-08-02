import type { Metadata } from "next";

import { CurriculumPreviewRunner } from "./CurriculumPreviewRunner";
import {
  getCurriculumUnit,
  curriculumUnits,
  getRepresentativeUnitForGrade,
} from "@/lib/curriculum/registry";
import { generatePreviewUnit } from "@/lib/curriculum/engine";
import { createCurriculumVisualSpec } from "@/lib/curriculum/visual";
import {
  curriculumDomainLabels,
  studentLearningGoals,
  studentUnitTitle,
} from "@/lib/curriculum/student-facing";
import { CurriculumVisual } from "./CurriculumVisual";

export const metadata: Metadata = {
  title: "Curriculum Preview — Toán Lớp 1–9",
  description:
    "Bản xem trước cục bộ nội dung Toán Lớp 1–9 do PLAVE tạo, chưa xuất bản.",
};

type PreviewPageProps = {
  searchParams: Promise<{ grade?: string; unit?: string }>;
};

export default async function CurriculumPreviewPage({
  searchParams,
}: PreviewPageProps) {
  const parameters = await searchParams;
  const requestedGrade = Number(parameters.grade);
  const grade =
    Number.isInteger(requestedGrade) &&
    requestedGrade >= 1 &&
    requestedGrade <= 9
      ? requestedGrade
      : 1;
  const requestedUnit =
    typeof parameters.unit === "string"
      ? getCurriculumUnit(parameters.unit)
      : null;
  const unit =
    (requestedUnit?.grade === grade ? requestedUnit : null) ??
    getRepresentativeUnitForGrade(grade) ??
    getRepresentativeUnitForGrade(1);

  if (!unit) {
    return (
      <div className="page-shell preview-page preview-page--v2">
        <div className="preview-empty-state" role="status">
          <h1>Chưa có chủ đề để học</h1>
          <p>Hãy quay lại sau hoặc chọn một bài học thử khác.</p>
          <a className="button button--secondary" href="/demo">
            Mở bài học thử
          </a>
        </div>
      </div>
    );
  }

  const draft = generatePreviewUnit(unit.slug);
  const gradeUnits = curriculumUnits.filter(
    (candidate) => candidate.grade === unit.grade,
  );
  const unitTitle = studentUnitTitle(unit);

  return (
    <div className="page-shell preview-page preview-page--v2" id="preview-content">
      <header className="preview-hero">
        <p className="eyebrow">Học thử Toán · Lớp 1–9</p>
        <h1>Chọn một chủ đề và bắt đầu học</h1>
        <p>
          Đọc bài học ngắn, xem ví dụ rồi luyện tập từng câu. Kết quả chỉ lưu
          trên màn hình trong lượt học này.
        </p>
      </header>

      <nav className="grade-picker" aria-label="Chọn lớp">
        {Array.from({ length: 9 }, (_, index) => index + 1).map(
          (candidateGrade) => (
          <a
            aria-current={candidateGrade === unit.grade ? "page" : undefined}
            className={candidateGrade === unit.grade ? "is-active" : ""}
            href={`/curriculum-preview?grade=${candidateGrade}`}
            key={candidateGrade}
          >
            Lớp {candidateGrade}
          </a>
          ),
        )}
      </nav>

      <section
        className="preview-unit-list"
        id="unit-list"
        aria-labelledby="unit-list-title"
      >
        <div className="preview-section-heading">
          <div>
            <p className="section-number">Lớp {unit.grade}</p>
            <h2 id="unit-list-title">Chọn chủ đề</h2>
          </div>
          <p>
            {gradeUnits.length} chủ đề
          </p>
        </div>
        <div className="preview-card-grid">
          {gradeUnits.map((candidate) => {
            const active = candidate.slug === unit.slug;
            return (
              <article className={active ? "is-active" : undefined} key={candidate.slug}>
                <p className="preview-unit-domain">
                  {curriculumDomainLabels[candidate.domain]}
                  {active ? (
                    <span className="preview-status-badge">Đang học</span>
                  ) : null}
                </p>
                <h3>{studentUnitTitle(candidate)}</h3>
                <p className="preview-unit-meta">
                  Bài học · Ví dụ từng bước · 12 câu luyện tập
                </p>
                <a
                  aria-current={active ? "page" : undefined}
                  className="button button--secondary"
                  href={`/curriculum-preview?grade=${candidate.grade}&unit=${candidate.slug}#theory-title`}
                >
                  {active ? "Tiếp tục chủ đề" : "Mở chủ đề"}
                </a>
              </article>
            );
          })}
        </div>
      </section>

      <section className="preview-theory" aria-labelledby="theory-title">
        <p className="section-number">Phần 1</p>
        <h2 id="theory-title">Bài học: {unitTitle}</h2>
        <div className="preview-learning-goals">
          <h3>Mục tiêu học</h3>
          <ul>
            {studentLearningGoals(unit).map((goal) => (
              <li key={goal}>{goal}</li>
            ))}
          </ul>
        </div>
        <div className="preview-card-grid">
          {unit.theory.map((section) => (
            <article className="preview-card" key={section.id}>
              <h3>{section.title}</h3>
              {section.explanation.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <CurriculumVisual
                spec={createCurriculumVisualSpec({
                  type: unit.requiredVisual,
                  description: section.visualDescription,
                  identity: section.id,
                })}
              />
            </article>
          ))}
        </div>
      </section>

      <section className="preview-examples" aria-labelledby="examples-title">
        <p className="section-number">Phần 2</p>
        <h2 id="examples-title">Ví dụ từng bước</h2>
        <div className="preview-card-grid">
          {unit.examples.map((example) => (
            <article className="preview-card" key={example.id}>
              <h3>{example.title}</h3>
              <p>{example.prompt}</p>
              <ol>
                {example.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p>
                <strong>Kết luận:</strong> {example.answer}
              </p>
              <CurriculumVisual
                spec={createCurriculumVisualSpec({
                  type: unit.requiredVisual,
                  description: example.visualDescription,
                  identity: example.id,
                })}
              />
            </article>
          ))}
        </div>
      </section>

      <CurriculumPreviewRunner
        grade={unit.grade}
        questions={draft.questions}
        unitSlug={unit.slug}
        unitTitle={unitTitle}
      />

      <nav className="preview-footer-nav" aria-label="Điều hướng chủ đề">
        <a href="#unit-list">Quay lại danh sách chủ đề</a>
        <a href="#preview-content">Lên đầu trang</a>
      </nav>
    </div>
  );
}
