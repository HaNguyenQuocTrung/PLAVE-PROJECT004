"use client";

import Link from "next/link";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/Button";
import type {
  CurriculumAssignmentDomain,
  CurriculumAssignmentSelectionMode,
  TeacherCurriculumCatalog,
  TeacherCurriculumDraft,
} from "@/lib/assignments/curriculum-contracts";
import type { TeacherClassroomSummary } from "@/lib/classrooms/contracts";
import { fetchWithClientTimeout } from "@/lib/http/client-request";

type Props = {
  classrooms: TeacherClassroomSummary[];
};

const domainLabels: Record<CurriculumAssignmentDomain, string> = {
  NUMBERS_AND_OPERATIONS: "Số và phép tính",
  ALGEBRA_AND_PREALGEBRA: "Đại số",
  GEOMETRY: "Hình học",
  MEASUREMENT: "Đo lường",
  STATISTICS_AND_PROBABILITY: "Thống kê và xác suất",
  APPLIED_PROBLEM_SOLVING: "Giải quyết vấn đề",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function TeacherCurriculumAssignmentBuilder({
  classrooms,
}: Props) {
  const [classroomId, setClassroomId] = useState(
    classrooms[0]?.classroomId ?? "",
  );
  const [catalog, setCatalog] = useState<TeacherCurriculumCatalog | null>(
    null,
  );
  const [unitId, setUnitId] = useState("");
  const [domain, setDomain] = useState("");
  const [outcomeId, setOutcomeId] = useState("");
  const [skillId, setSkillId] = useState("");
  const [mode, setMode] =
    useState<CurriculumAssignmentSelectionMode>("DETERMINISTIC");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>(
    [],
  );
  const [questionCount, setQuestionCount] = useState(6);
  const [seed, setSeed] = useState("plave-assignment-seed-v1");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [draft, setDraft] = useState<TeacherCurriculumDraft | null>(null);
  const [pending, setPending] = useState("");
  const [notice, setNotice] = useState("");
  const feedbackRef = useRef<HTMLDivElement>(null);
  const classroom = classrooms.find(
    (item) => item.classroomId === classroomId,
  );

  const outcomeChoices = useMemo(() => {
    const choices = new Map<string, string>();
    catalog?.questions.forEach((question) =>
      question.officialOutcomeIds.forEach((id, index) =>
        choices.set(id, question.officialOutcomeTitles[index] ?? id),
      ),
    );
    return [...choices.entries()];
  }, [catalog]);
  const skillChoices = useMemo(() => {
    const choices = new Map<string, string>();
    catalog?.questions.forEach((question) =>
      choices.set(question.skillId, question.skillTitle),
    );
    return [...choices.entries()];
  }, [catalog]);

  const focusFeedback = useCallback(() => {
    window.requestAnimationFrame(() => feedbackRef.current?.focus());
  }, []);

  const loadCatalog = useCallback(async (
    nextClassroomId: string,
    filters?: {
      unitId?: string;
      domain?: string;
      outcomeId?: string;
      skillId?: string;
    },
  ) => {
    if (!nextClassroomId) return;
    setPending("LOAD");
    setNotice("");
    try {
      const query = new URLSearchParams({ classroomId: nextClassroomId });
      if (filters?.unitId) query.set("unitId", filters.unitId);
      if (filters?.domain) query.set("domain", filters.domain);
      if (filters?.outcomeId) query.set("outcomeId", filters.outcomeId);
      if (filters?.skillId) query.set("skillId", filters.skillId);
      const response = await fetchWithClientTimeout(
        `/api/teacher/curriculum?${query.toString()}`,
        { cache: "no-store" },
      );
      const payload: unknown = await response.json();
      if (
        !response.ok ||
        !isRecord(payload) ||
        payload.ok !== true ||
        !isRecord(payload.data)
      ) {
        const message =
          isRecord(payload) &&
          isRecord(payload.error) &&
          typeof payload.error.message === "string"
            ? payload.error.message
            : "Chưa thể tải chương trình cho lớp này.";
        setCatalog(null);
        setNotice(message);
        return;
      }
      setCatalog(payload.data as TeacherCurriculumCatalog);
      setSelectedQuestionIds([]);
    } catch {
      setCatalog(null);
      setNotice("Không thể kết nối để tải chương trình.");
    } finally {
      setPending("");
      focusFeedback();
    }
  }, [focusFeedback]);

  const applyFilters = async () => {
    await loadCatalog(classroomId, {
      unitId,
      domain,
      outcomeId,
      skillId,
    });
  };

  const saveDraft = async () => {
    if (!classroom || !catalog) return;
    const ids = mode === "MANUAL" ? selectedQuestionIds : null;
    if (
      !title.trim() ||
      (mode === "MANUAL" && selectedQuestionIds.length === 0) ||
      (mode === "DETERMINISTIC" &&
        !unitId &&
        !outcomeId &&
        !skillId)
    ) {
      setNotice(
        "Hãy nhập tên bài và chọn phạm vi hoặc câu hỏi trước khi lưu.",
      );
      focusFeedback();
      return;
    }
    setPending("DRAFT");
    setNotice("");
    try {
      const response = await fetchWithClientTimeout(
        "/api/teacher/curriculum/drafts",
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classroomId,
          title: title.trim(),
          instructions: instructions.trim() || null,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
          selectionMode: mode,
          unitId: unitId || null,
          outcomeId: outcomeId || null,
          skillId: skillId || null,
          questionIds: ids,
          questionCount:
            mode === "MANUAL" ? selectedQuestionIds.length : questionCount,
          deterministicSeed: seed,
          requestId: crypto.randomUUID(),
        }),
        },
      );
      const payload: unknown = await response.json();
      if (
        !response.ok ||
        !isRecord(payload) ||
        payload.ok !== true ||
        !isRecord(payload.data)
      ) {
        const message =
          isRecord(payload) &&
          isRecord(payload.error) &&
          typeof payload.error.message === "string"
            ? payload.error.message
            : "Chưa thể lưu bản nháp.";
        setNotice(message);
        return;
      }
      setDraft(payload.data as TeacherCurriculumDraft);
      setNotice(
        "Đã lưu bản nháp bất biến. Chưa học sinh nào nhận bài cho đến khi giáo viên giao.",
      );
    } catch {
      setNotice("Không thể kết nối để lưu bản nháp.");
    } finally {
      setPending("");
      focusFeedback();
    }
  };

  const publishDraft = async () => {
    if (!draft) return;
    setPending("PUBLISH");
    setNotice("");
    try {
      const response = await fetchWithClientTimeout(
        "/api/teacher/curriculum/drafts/publish",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            draftId: draft.draftId,
            requestId: crypto.randomUUID(),
          }),
        },
      );
      const payload: unknown = await response.json();
      if (
        !response.ok ||
        !isRecord(payload) ||
        payload.ok !== true ||
        !isRecord(payload.data) ||
        typeof payload.data.assignmentId !== "string"
      ) {
        const message =
          isRecord(payload) &&
          isRecord(payload.error) &&
          typeof payload.error.message === "string"
            ? payload.error.message
            : "Chưa thể giao bài.";
        setNotice(message);
        return;
      }
      setDraft({
        ...draft,
        status: "PUBLISHED",
        publishedAssignmentId: payload.data.assignmentId,
      });
      setNotice("Đã giao bài cho lớp. Học sinh có thể bắt đầu hoặc tiếp tục.");
    } catch {
      setNotice("Không thể kết nối để giao bài.");
    } finally {
      setPending("");
      focusFeedback();
    }
  };

  return (
    <section
      className="teacher-curriculum-builder"
      aria-labelledby="teacher-curriculum-builder-title"
    >
      <header>
        <p className="eyebrow">Chương trình Toán Lớp 1–9</p>
        <h1 id="teacher-curriculum-builder-title">
          Tạo bài từ ngân hàng chương trình
        </h1>
        <p>
          Câu hỏi được lấy từ release bank đã kiểm định tự động. Đáp án và lời
          giải chỉ được database dùng để chấm sau khi học sinh nộp.
        </p>
      </header>

      {!classrooms.length ? (
        <div className="parent-empty-state">
          <h2>Chưa có lớp học</h2>
          <p>Tạo lớp và duyệt học sinh trước khi giao bài.</p>
          <Button href="/teacher/classrooms">Quản lý lớp học</Button>
        </div>
      ) : (
        <>
          <div className="teacher-curriculum-form-grid">
            <label>
              Lớp học
              <select
                value={classroomId}
                onChange={(event) => {
                  const nextClassroomId = event.target.value;
                  setClassroomId(nextClassroomId);
                  setUnitId("");
                  setDomain("");
                  setOutcomeId("");
                  setSkillId("");
                  setDraft(null);
                  void loadCatalog(nextClassroomId);
                }}
                disabled={Boolean(pending)}
              >
                {classrooms.map((item) => (
                  <option key={item.classroomId} value={item.classroomId}>
                    {item.name} · Lớp {item.grade}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Mạch kiến thức
              <select
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                disabled={Boolean(pending)}
              >
                <option value="">Tất cả</option>
                {Object.entries(domainLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Chủ đề
              <select
                value={unitId}
                onChange={(event) => {
                  setUnitId(event.target.value);
                  setOutcomeId("");
                  setSkillId("");
                }}
                disabled={!catalog || Boolean(pending)}
              >
                <option value="">Chọn chủ đề</option>
                {catalog?.units
                  .filter((unit) => !domain || unit.domain === domain)
                  .map((unit) => (
                    <option key={unit.unitId} value={unit.unitId}>
                      {unit.title}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Mục tiêu chương trình
              <select
                value={outcomeId}
                onChange={(event) => setOutcomeId(event.target.value)}
                disabled={!catalog || Boolean(pending)}
              >
                <option value="">Tất cả mục tiêu</option>
                {outcomeChoices.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Kỹ năng
              <select
                value={skillId}
                onChange={(event) => setSkillId(event.target.value)}
                disabled={!catalog || Boolean(pending)}
              >
                <option value="">Tất cả kỹ năng</option>
                {skillChoices.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="secondary"
              onClick={() => void applyFilters()}
              disabled={Boolean(pending)}
            >
              {pending === "LOAD"
                ? "Đang tải…"
                : catalog
                  ? "Áp dụng bộ lọc"
                  : "Tải chương trình"}
            </Button>
          </div>

          {catalog ? (
            <>
              <fieldset className="teacher-curriculum-mode">
                <legend>Cách chọn câu</legend>
                {(["DETERMINISTIC", "MANUAL"] as const).map((value) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="curriculum-selection-mode"
                      value={value}
                      checked={mode === value}
                      onChange={() => {
                        setMode(value);
                        setDraft(null);
                      }}
                    />
                    <span>
                      {value === "DETERMINISTIC"
                        ? "Hệ thống chọn xác định từ phạm vi và seed"
                        : "Giáo viên chọn thủ công câu public"}
                    </span>
                  </label>
                ))}
              </fieldset>

              {mode === "DETERMINISTIC" ? (
                <div className="teacher-curriculum-form-grid">
                  <label>
                    Số câu
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={questionCount}
                      onChange={(event) =>
                        setQuestionCount(Number(event.target.value))
                      }
                    />
                  </label>
                  <label>
                    Seed xác định
                    <input
                      value={seed}
                      minLength={4}
                      maxLength={100}
                      onChange={(event) => setSeed(event.target.value)}
                    />
                  </label>
                </div>
              ) : (
                <ul className="teacher-curriculum-question-list">
                  {catalog.questions.map((question) => (
                    <li key={question.questionId}>
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedQuestionIds.includes(
                            question.questionId,
                          )}
                          onChange={(event) =>
                            setSelectedQuestionIds((current) =>
                              event.target.checked
                                ? [...current, question.questionId]
                                : current.filter(
                                    (id) => id !== question.questionId,
                                  ),
                            )
                          }
                        />
                        <span>
                          <strong>{question.prompt}</strong>
                          <small>
                            {question.unitTitle} · {question.skillTitle}
                          </small>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}

              <div className="teacher-curriculum-form-grid">
                <label>
                  Tên bài tập
                  <input
                    value={title}
                    minLength={3}
                    maxLength={120}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>
                <label>
                  Hạn nộp (không bắt buộc)
                  <input
                    type="datetime-local"
                    value={dueAt}
                    onChange={(event) => setDueAt(event.target.value)}
                  />
                </label>
                <label className="teacher-curriculum-wide">
                  Hướng dẫn
                  <textarea
                    value={instructions}
                    maxLength={1000}
                    onChange={(event) =>
                      setInstructions(event.target.value)
                    }
                  />
                </label>
              </div>

              <div className="button-row teacher-curriculum-actions">
                <Button
                  onClick={() => void saveDraft()}
                  disabled={Boolean(pending) || draft?.status === "PUBLISHED"}
                >
                  {pending === "DRAFT" ? "Đang lưu…" : "Lưu bản nháp"}
                </Button>
                {draft?.status === "DRAFT" ? (
                  <Button
                    variant="secondary"
                    onClick={() => void publishDraft()}
                    disabled={Boolean(pending)}
                  >
                    {pending === "PUBLISH" ? "Đang giao…" : "Giao cho lớp"}
                  </Button>
                ) : null}
                {draft?.publishedAssignmentId ? (
                  <Link
                    className="button button--secondary"
                    href={`/teacher/assignments/${draft.publishedAssignmentId}`}
                  >
                    Xem bài đã giao
                  </Link>
                ) : null}
              </div>
            </>
          ) : pending !== "LOAD" ? (
            <div className="parent-empty-state">
              <h2>Chương trình chưa sẵn sàng</h2>
              <p>
                Release phải được bật trong môi trường local trước khi giáo
                viên tạo bài.
              </p>
            </div>
          ) : null}
        </>
      )}

      <div
        ref={feedbackRef}
        tabIndex={-1}
        aria-live="polite"
        className="teacher-curriculum-feedback"
      >
        {notice ? (
          <p
            className={
              notice.startsWith("Đã ") ? "form-success" : "form-error-box"
            }
            role="status"
          >
            {notice}
          </p>
        ) : null}
      </div>
    </section>
  );
}
