"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { CopyClassroomCode } from "@/components/CopyClassroomCode";
import { FormField } from "@/components/FormField";
import { createClassroomRequestGate } from "@/lib/classrooms/client-flow";
import {
  normalizeClassroomName,
  parseClassroomApiError,
  parseCreatedClassroomApiResponse,
  type TeacherClassroomSummary,
} from "@/lib/classrooms/contracts";
import {
  fetchWithClientTimeout,
  getClientRequestErrorMessage,
} from "@/lib/http/client-request";

type TeacherClassroomsManagerProps = {
  initialClassrooms: TeacherClassroomSummary[];
};

export function TeacherClassroomsManager({
  initialClassrooms,
}: TeacherClassroomsManagerProps) {
  const router = useRouter();
  const [classrooms, setClassrooms] = useState(initialClassrooms);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("1");
  const [nameError, setNameError] = useState("");
  const [gradeError, setGradeError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [createdClassroom, setCreatedClassroom] =
    useState<TeacherClassroomSummary | null>(null);
  const gateRef = useRef(createClassroomRequestGate());
  const requestIdRef = useRef<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const gradeRef = useRef<HTMLSelectElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || !gateRef.current.tryStart()) return;

    const normalizedName = normalizeClassroomName(name);
    const parsedGrade = Number(grade);
    let invalid = false;
    setNotice("");
    setCreatedClassroom(null);

    if (normalizedName.length < 2 || normalizedName.length > 80) {
      setNameError("Tên lớp cần có từ 2 đến 80 ký tự.");
      nameRef.current?.focus();
      invalid = true;
    } else {
      setNameError("");
    }

    if (
      !Number.isInteger(parsedGrade) ||
      parsedGrade < 1 ||
      parsedGrade > 9
    ) {
      setGradeError("Vui lòng chọn khối lớp từ 1 đến 9.");
      if (!invalid) gradeRef.current?.focus();
      invalid = true;
    } else {
      setGradeError("");
    }

    if (invalid) {
      gateRef.current.reset();
      requestIdRef.current = null;
      return;
    }

    setPending(true);
    requestIdRef.current ??= crypto.randomUUID();

    try {
      const response = await fetchWithClientTimeout(
        "/api/classrooms/create",
        {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: normalizedName,
          grade: parsedGrade,
          requestId: requestIdRef.current,
        }),
        },
      );
      const payload: unknown = await response.json();
      const created = parseCreatedClassroomApiResponse(payload);

      if (!created) {
        const error = parseClassroomApiError(payload);
        setNotice(
          error?.message ??
            "Chưa thể tạo lớp học. Vui lòng thử lại.",
        );
        return;
      }

      const summary: TeacherClassroomSummary = {
        ...created,
        pendingCount: 0,
        approvedCount: 0,
      };
      setClassrooms((current) => [
        summary,
        ...current.filter(
          (classroom) => classroom.classroomId !== summary.classroomId,
        ),
      ]);
      setCreatedClassroom(summary);
      setName("");
      requestIdRef.current = null;
      window.requestAnimationFrame(() => resultRef.current?.focus());
      router.refresh();
    } catch (error) {
      setNotice(
        getClientRequestErrorMessage(
          error,
          "CLASSROOM_CREATE_TIMEOUT",
          "Chưa thể xác nhận kết quả tạo lớp. Bạn có thể thử lại; PLAVE sẽ không tạo lớp trùng.",
        ),
      );
    } finally {
      setPending(false);
      gateRef.current.reset();
    }
  };

  return (
    <div className="teacher-classrooms-manager">
      <section
        className="classroom-create-card"
        aria-labelledby="classroom-create-title"
      >
        <div>
          <p className="eyebrow">Lớp học mới</p>
          <h2 id="classroom-create-title">Tạo lớp học</h2>
          <p>
            PLAVE sẽ tạo một mã ngẫu nhiên để bạn chia sẻ riêng với đúng học
            sinh.
          </p>
        </div>
        <form onSubmit={submit} noValidate>
          <FormField
            id="classroom-name"
            label="Tên lớp"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setNameError("");
              setNotice("");
            }}
            placeholder="Ví dụ: Toán 1A"
            autoComplete="off"
            required
            error={nameError}
            inputRef={nameRef}
            disabled={pending}
          />
          <div className="field">
            <label htmlFor="classroom-grade">
              Khối lớp <span aria-hidden="true">*</span>
            </label>
            <div
              className={`field__control ${
                gradeError ? "field__control--error" : ""
              }`}
            >
              <select
                id="classroom-grade"
                ref={gradeRef}
                value={grade}
                onChange={(event) => {
                  setGrade(event.target.value);
                  setGradeError("");
                  setNotice("");
                }}
                disabled={pending}
                aria-invalid={Boolean(gradeError)}
                aria-describedby={
                  gradeError ? "classroom-grade-error" : undefined
                }
              >
                {Array.from({ length: 9 }, (_, index) => index + 1).map(
                  (item) => (
                    <option key={item} value={item}>
                      Lớp {item}
                    </option>
                  ),
                )}
              </select>
            </div>
            {gradeError ? (
              <p
                className="field__error"
                id="classroom-grade-error"
                role="alert"
              >
                {gradeError}
              </p>
            ) : null}
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Đang tạo lớp…" : "Tạo lớp học"}
          </Button>
        </form>
      </section>

      <div ref={resultRef} tabIndex={-1} aria-live="polite">
        {notice ? (
          <p className="form-error-box" role="alert">
            {notice}
          </p>
        ) : null}
        {createdClassroom ? (
          <section
            className="classroom-created-card"
            aria-labelledby="classroom-created-title"
          >
            <div>
              <p className="eyebrow">Đã tạo lớp</p>
              <h2 id="classroom-created-title">
                {createdClassroom.name}
              </h2>
              <p>Lớp {createdClassroom.grade}</p>
              <code>{createdClassroom.classCode}</code>
              <p>
                Chỉ chia sẻ mã này với học sinh phù hợp. Học sinh vẫn cần gửi
                yêu cầu và được bạn đồng ý.
              </p>
            </div>
            <CopyClassroomCode code={createdClassroom.classCode} />
          </section>
        ) : null}
      </div>

      <section
        className="classroom-list-section"
        aria-labelledby="teacher-classrooms-title"
      >
        <div className="classroom-section-heading">
          <div>
            <p className="eyebrow">Đang quản lý</p>
            <h2 id="teacher-classrooms-title">Lớp học của bạn</h2>
          </div>
          <span>{classrooms.length}</span>
        </div>

        {classrooms.length > 0 ? (
          <ul className="classroom-grid">
            {classrooms.map((classroom) => (
              <li className="classroom-card" key={classroom.classroomId}>
                <div>
                  <span className="classroom-status">Đang hoạt động</span>
                  <h3>{classroom.name}</h3>
                  <p>Lớp {classroom.grade}</p>
                  <dl className="classroom-card__counts">
                    <div>
                      <dt>Chờ duyệt</dt>
                      <dd>{classroom.pendingCount}</dd>
                    </div>
                    <div>
                      <dt>Học sinh</dt>
                      <dd>{classroom.approvedCount}</dd>
                    </div>
                  </dl>
                </div>
                <Link
                  className="button button--primary"
                  href={`/teacher/classrooms/${classroom.classroomId}`}
                >
                  Quản lý lớp
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <h3>Bạn chưa có lớp học</h3>
            <p>
              Tạo lớp đầu tiên để nhận yêu cầu tham gia từ học sinh.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
