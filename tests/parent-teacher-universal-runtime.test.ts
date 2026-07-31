import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  parseAssignmentSubmitV2Input,
  parseDraftAnswerV2Input,
} from "../lib/assignments/contracts.ts";
import {
  parseCreateCurriculumAssignmentDraftInput,
  parseTeacherCurriculumCatalog,
} from "../lib/assignments/curriculum-contracts.ts";
import { parseParentUniversalProgress } from "../lib/parent-dashboard/universal-contracts.ts";
import {
  parsePerGradeEvidence,
  perGradeCheckNames,
} from "../scripts/universal-collaboration-evidence.ts";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/0039_parent_teacher_universal_learning.sql",
    import.meta.url,
  ),
  "utf8",
);
const teacherBuilder = readFileSync(
  new URL(
    "../components/TeacherCurriculumAssignmentBuilder.tsx",
    import.meta.url,
  ),
  "utf8",
);
const parentComponent = readFileSync(
  new URL("../components/ParentUniversalProgress.tsx", import.meta.url),
  "utf8",
);
const assignmentRunner = readFileSync(
  new URL("../components/AssignmentRunner.tsx", import.meta.url),
  "utf8",
);
const assignmentServer = readFileSync(
  new URL("../lib/assignments/server.ts", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const localRunner = readFileSync(
  new URL(
    "../scripts/run-parent-teacher-universal-local-integration.ts",
    import.meta.url,
  ),
  "utf8",
);
const localVerification = readFileSync(
  new URL(
    "../supabase/operations/verify_0039_parent_teacher_universal_local.sql",
    import.meta.url,
  ),
  "utf8",
);
const localFixture = readFileSync(
  new URL(
    "../tests/fixtures/parent-teacher-universal-local-users.sql",
    import.meta.url,
  ),
  "utf8",
);
const runtimeStatus = JSON.parse(
  readFileSync(
    new URL(
      "../docs/operations/PARENT_TEACHER_UNIVERSAL_RUNTIME_STATUS.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as {
  perGradeEvidenceMatrix: Array<Record<string, unknown>>;
  regressionPackages: Record<string, { classification: string }>;
};

const id = "11111111-1111-4111-8111-111111111111";
const id2 = "22222222-2222-4222-8222-222222222222";

test("0039 is additive, atomic and keeps private authority in SQL", () => {
  assert.match(migration, /^begin;/);
  assert.match(migration, /\ncommit;\s*$/);
  assert.doesNotMatch(migration, /\bservice_role\b/i);
  assert.doesNotMatch(migration, /alter table public\.practice_attempts/);
  assert.doesNotMatch(migration, /update public\.practice_attempts/);
  assert.match(
    migration,
    /create or replace function public\.submit_assignment_submission_v2/,
  );
  assert.match(migration, /private\.curriculum_release_solutions/);
  assert.match(migration, /ASSIGNMENT:STATE_CONFLICT/);
  assert.match(migration, /ASSIGNMENT:IDEMPOTENCY_CONFLICT/);
  assert.match(migration, /set search_path = ''/);
  assert.match(
    migration,
    /alter table private\.assignment_submission_mutations\s+force row level security/,
  );
  assert.match(
    migration,
    /revoke execute on function public\.submit_assignment_submission\(uuid\)\s+from authenticated/,
  );
});

test("teacher curriculum catalog and draft contracts never contain solutions", () => {
  const catalog = parseTeacherCurriculumCatalog({
    release_id: "plave-math-grades-1-9-v1",
    grade: 7,
    units: [
      {
        unit_id: "grade-7-data",
        title: "Dữ liệu",
        domain: "STATISTICS_AND_PROBABILITY",
        official_outcome_ids: ["g7-outcome-1"],
        skill_ids: ["DATA"],
        total_questions: 12,
      },
    ],
    questions: [
      {
        question_id: "grade-7-data-q01",
        unit_id: "grade-7-data",
        unit_title: "Dữ liệu",
        domain: "STATISTICS_AND_PROBABILITY",
        answer_type: "MULTIPLE_CHOICE",
        prompt: "Chọn đáp án đúng.",
        options: [
          { key: "A", label: "1" },
          { key: "B", label: "2" },
          { key: "C", label: "3" },
          { key: "D", label: "4" },
        ],
        visual: {},
        cognitive_level: "APPLY",
        official_outcome_ids: ["g7-outcome-1"],
        official_outcome_titles: ["Đọc và phân tích dữ liệu"],
        skill_id: "DATA",
        skill_title: "Phân tích dữ liệu",
      },
    ],
    total_questions: 12,
    limit: 24,
    offset: 0,
  });
  assert.ok(catalog);
  assert.equal(
    "correctAnswer" in catalog.questions[0],
    false,
  );
  assert.equal("solution" in catalog.questions[0], false);

  assert.ok(
    parseCreateCurriculumAssignmentDraftInput({
      classroomId: id,
      title: "Ôn tập dữ liệu",
      instructions: null,
      dueAt: null,
      selectionMode: "DETERMINISTIC",
      unitId: "grade-7-data",
      outcomeId: null,
      skillId: null,
      questionIds: null,
      questionCount: 6,
      deterministicSeed: "grade7-data-v1",
      requestId: id2,
    }),
  );
});

test("assignment mutation requests require JWT-owned IDs, CAS and idempotency", () => {
  assert.deepEqual(
    parseDraftAnswerV2Input({
      submissionId: id,
      questionId: id2,
      answer: "A",
      expectedRevision: 3,
      idempotencyKey: "33333333-3333-4333-8333-333333333333",
    }),
    {
      submissionId: id,
      questionId: id2,
      answer: "A",
      expectedRevision: 3,
      idempotencyKey: "33333333-3333-4333-8333-333333333333",
    },
  );
  assert.equal(
    parseDraftAnswerV2Input({
      submissionId: id,
      questionId: id2,
      answer: "A",
    }),
    null,
  );
  assert.ok(
    parseAssignmentSubmitV2Input({
      submissionId: id,
      expectedRevision: 4,
      idempotencyKey: id2,
    }),
  );
});

test("parent universal read model distinguishes Grade 1 and assignment evidence", () => {
  const parsed = parseParentUniversalProgress({
    student: { display_name: "Học sinh thử", grade: 1 },
    compatibility_mode: "LEGACY_GRADE1_AGGREGATED",
    mastery_policy_version: "product-hypothesis-v1",
    mastery_explanation: "Đây không phải chẩn đoán khoa học.",
    summary: {
      attempt_count: 2,
      completed_attempt_count: 1,
      started_unit_count: 1,
      completed_unit_count: 1,
      total_answered: 12,
      total_correct: 9,
      accuracy_percent: 75,
      last_activity_at: "2026-07-31T00:00:00.000Z",
      mastery_label: "PROFICIENT",
    },
    units: [
      {
        unit_id: "grade-1-numbers",
        title: "Các số",
        status: "COMPLETED",
        evidence_count: 12,
        correct_count: 9,
        accuracy_percent: 75,
        mastery_label: "PROFICIENT",
        last_activity_at: "2026-07-31T00:00:00.000Z",
        source: "LEGACY_GRADE1",
      },
    ],
    outcomes: [],
    skills: [],
    attempts: [],
    strengths: [],
    needs_practice: [],
    assignment_summary: {
      attempt_count: 1,
      completed_count: 1,
      answered_count: 2,
      correct_count: 1,
      accuracy_percent: 50,
      last_activity_at: "2026-07-31T00:00:00.000Z",
      evidence_source: "TEACHER_ASSIGNMENT",
    },
    assignment_outcomes: [],
    assignment_skills: [],
  });
  assert.ok(parsed);
  assert.equal(parsed.compatibilityMode, "LEGACY_GRADE1_AGGREGATED");
  assert.equal(parsed.assignmentSummary.evidenceSource, "TEACHER_ASSIGNMENT");
});

test("integrated Parent and Teacher UI states are student-learning focused", () => {
  assert.match(parentComponent, /Theo yêu cầu chương trình/);
  assert.match(parentComponent, /Kết quả assignment riêng biệt/);
  assert.match(parentComponent, /không cộng trùng lượt học/);
  assert.match(teacherBuilder, /Hệ thống chọn xác định từ phạm vi và seed/);
  assert.match(teacherBuilder, /Lưu bản nháp/);
  assert.match(teacherBuilder, /Giao cho lớp/);
  assert.doesNotMatch(teacherBuilder, /correctAnswer|solutionSteps/);
  assert.match(assignmentRunner, /expectedRevision: revision/);
  assert.match(assignmentRunner, /idempotencyKey/);
  assert.match(assignmentRunner, /CurriculumVisual/);
});

test("Parent, Teacher and Student assignment UI preserve responsive contracts", () => {
  assert.match(
    styles,
    /\.teacher-curriculum-form-grid[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
  );
  assert.match(
    styles,
    /@media \(max-width: 700px\)[\s\S]*\.teacher-curriculum-form-grid[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
  );
  assert.match(styles, /min-height:\s*44px/);
  assert.match(styles, /overflow-wrap:\s*anywhere/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
  assert.match(
    styles,
    /\.assignment-question-visual svg[\s\S]*max-width:\s*100%/,
  );
});

test("live-local runner preserves preconditions and owns the complete lifecycle", () => {
  assert.match(localRunner, /PRECONDITION UNIVERSAL_COLLABORATION/);
  assert.match(localRunner, /UNIVERSAL_0038_SCHEMA/);
  assert.match(localRunner, /UNIVERSAL_COLLABORATION_BASE_SCHEMA/);
  assert.match(localRunner, /UNIVERSAL_COLLABORATION_0039_SCHEMA/);
  assert.match(localRunner, /SCHEMA_FINGERPRINT_MISMATCH/);
  assert.match(localRunner, /PARTIAL_PRIOR_APPLY/);
  assert.match(localRunner, /materializeInactiveRelease\(\)/);
  assert.match(localRunner, /psqlFile\(\s*verification/);
  assert.match(localRunner, /finally \{/);
  assert.match(localRunner, /psqlFile\(cleanup, "Final synthetic cleanup"\)/);
  assert.match(localRunner, /psqlFile\(deactivate, "Final release deactivation"\)/);
  assert.match(localRunner, /release is not DRAFT\/INACTIVE/);
  assert.match(
    localRunner,
    /no database session was established and no database mutation occurred/,
  );
  assert.doesNotMatch(
    localRunner,
    /drop\s+table|delete\s+from\s+public\.curriculum_release/i,
  );
});

test("live acceptance is represented by nine independent database evidence rows", () => {
  assert.equal(runtimeStatus.perGradeEvidenceMatrix.length, 9);
  assert.deepEqual(
    runtimeStatus.perGradeEvidenceMatrix.map((row) => row.grade),
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  for (const row of runtimeStatus.perGradeEvidenceMatrix) {
    assert.equal(row.evidenceType, "LIVE_LOCAL_DATABASE");
    assert.ok(["PASS", "FAIL", "NOT_RUN"].includes(String(row.overall)));
  }
  assert.match(localFixture, /from generate_series\(1, 9\) as grade/);
  assert.match(localVerification, /for v_grade in 1\.\.9 loop/);
  assert.match(localVerification, /PER_GRADE_EVIDENCE_JSON=/);
  for (const check of [
    "curriculum_visible",
    "independent_practice_started",
    "database_graded_answer",
    "attempt_history_persisted",
    "unit_outcome_skill_progress",
    "linked_parent_progress",
    "unlinked_parent_denied",
    "teacher_assignment_published",
    "student_assignment_submitted",
    "teacher_gradebook_evidence",
    "wrong_grade_cross_classroom_denied",
    "no_solution_leak_before_submit",
  ]) {
    assert.match(localVerification, new RegExp(check));
  }
  assert.equal(
    runtimeStatus.regressionPackages.grade1Legacy.classification,
    "REGRESSION_ONLY_NOT_A_PER_GRADE_ACCEPTANCE_SUBSTITUTE",
  );
  assert.equal(
    runtimeStatus.regressionPackages.grade2AdaptiveFrozen.classification,
    "REGRESSION_ONLY_NOT_A_PER_GRADE_ACCEPTANCE_SUBSTITUTE",
  );
});

test("all 0039 synthetic student codes satisfy the canonical database constraint", () => {
  const studentProfileInsert = localFixture.match(
    /insert into public\.student_profiles \(user_id, grade, student_code\)\s*values([\s\S]*?);/i,
  );
  assert.ok(studentProfileInsert);
  const rows = [
    ...studentProfileInsert[1].matchAll(
      /\(\s*'[^']+'\s*,\s*([1-9])\s*,\s*'(PLV-[^']+)'\s*\)/g,
    ),
  ].map((match) => ({
    grade: Number(match[1]),
    studentCode: match[2],
  }));

  assert.equal(rows.length, 9);
  assert.deepEqual(
    rows.map((row) => row.grade).sort((left, right) => left - right),
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  for (const row of rows) {
    assert.match(row.studentCode, /^PLV-[0-9A-F]{12}$/);
  }
  assert.equal(
    new Set(rows.map((row) => row.studentCode)).size,
    rows.length,
  );
});

test("0039 fixtures use canonical consent and classroom lifecycle transitions", () => {
  const connectionInserts = [
    ...localFixture.matchAll(
      /insert into public\.parent_student_connections([\s\S]*?);/gi,
    ),
  ].map((match) => match[1]);
  assert.ok(connectionInserts.length >= 2);
  for (const insert of connectionInserts) {
    assert.match(insert, /'PENDING'/);
    assert.doesNotMatch(
      insert,
      /'(?:APPROVED|REJECTED|CANCELLED|REVOKED)'/,
    );
  }
  assert.doesNotMatch(
    localFixture,
    /update\s+public\.parent_student_connections/i,
  );
  assert.match(localFixture, /public\.respond_parent_connection_request\(/);
  assert.match(localFixture, /public\.revoke_parent_student_connection\(/);
  assert.match(
    localFixture,
    /perform set_config\('request\.jwt\.claim\.sub', '', true\)/,
  );

  assert.match(
    localFixture,
    /insert into public\.teacher_invitations[\s\S]*?'AVAILABLE'/,
  );
  assert.match(localFixture, /public\.activate_teacher_invitation\(/);
  assert.doesNotMatch(
    localFixture,
    /insert into public\.teacher_profiles/i,
  );

  const membershipInsert = localFixture.match(
    /insert into public\.classroom_memberships([\s\S]*?);/i,
  );
  assert.ok(membershipInsert);
  assert.match(membershipInsert[1], /'PENDING'/);
  assert.doesNotMatch(membershipInsert[1], /'APPROVED'/);
  assert.match(localFixture, /public\.respond_classroom_membership\(/);

  assert.match(
    localVerification,
    /public\.create_teacher_curriculum_assignment_draft\(/,
  );
  assert.match(
    localVerification,
    /public\.publish_teacher_curriculum_assignment_draft\(/,
  );
  assert.match(
    localVerification,
    /public\.submit_assignment_submission_v2\(/,
  );
  assert.match(localVerification, /public\.close_teacher_assignment\(/);
  assert.match(localVerification, /public\.reopen_teacher_assignment\(/);
});

test("0039 verification and application use the exact curriculum draft RPC signature", () => {
  assert.match(
    migration,
    /create or replace function public\.create_teacher_curriculum_assignment_draft\(\s*p_classroom_id uuid,\s*p_title text,\s*p_instructions text,\s*p_due_at timestamptz,\s*p_selection_mode text,\s*p_unit_id text,\s*p_outcome_id text,\s*p_skill_id text,\s*p_question_ids text\[\],\s*p_question_count smallint,\s*p_deterministic_seed text,\s*p_request_id uuid\s*\)/,
  );
  assert.match(
    migration,
    /on function public\.create_teacher_curriculum_assignment_draft\(\s*uuid, text, text, timestamptz, text, text, text, text,\s*text\[\], smallint, text, uuid\s*\) to authenticated/,
  );

  const verificationCalls = [
    ...localVerification.matchAll(
      /public\.create_teacher_curriculum_assignment_draft\(([\s\S]*?)\n    \);/g,
    ),
  ].map((match) => match[1]);
  assert.equal(verificationCalls.length, 2);
  for (const call of verificationCalls) {
    for (const parameter of [
      "p_classroom_id",
      "p_title",
      "p_instructions",
      "p_due_at",
      "p_selection_mode",
      "p_unit_id",
      "p_outcome_id",
      "p_skill_id",
      "p_question_ids",
      "p_question_count",
      "p_deterministic_seed",
      "p_request_id",
    ]) {
      assert.match(call, new RegExp(`\\b${parameter}\\s*=>`));
    }
    assert.match(call, /p_due_at\s*=>\s*null::timestamptz/);
    assert.match(call, /p_question_count\s*=>\s*[12]::smallint/);
    assert.match(
      call,
      /p_question_ids\s*=>\s*(?:null|array\[v_wrong_question_id\])::text\[\]/,
    );
  }

  const applicationCall = assignmentServer.match(
    /rpc\(\s*"create_teacher_curriculum_assignment_draft",\s*\{([\s\S]*?)\n    \},\s*\)/,
  );
  assert.ok(applicationCall);
  for (const parameter of [
    "p_classroom_id",
    "p_title",
    "p_instructions",
    "p_due_at",
    "p_selection_mode",
    "p_unit_id",
    "p_outcome_id",
    "p_skill_id",
    "p_question_ids",
    "p_question_count",
    "p_deterministic_seed",
    "p_request_id",
  ]) {
    assert.match(applicationCall[1], new RegExp(`\\b${parameter}:`));
  }

  assert.match(
    localVerification,
    /public\.reopen_teacher_assignment\(\s*p_assignment_id => v_assignment_id,\s*p_due_at => null::timestamptz\s*\)/,
  );
  assert.doesNotMatch(
    localVerification,
    /public\.(?:create_teacher_curriculum_assignment_draft|get_teacher_curriculum_catalog|reopen_teacher_assignment)\([\s\S]*?\bnull\s*[,)]/,
  );
});

test("0039 evidence marker serializes JSONB as text and parser requires exact Grades 1-9 PASS rows", () => {
  assert.match(
    localVerification,
    /select concat\(\s*'PER_GRADE_EVIDENCE_JSON=',\s*jsonb_build_object\([\s\S]*?\)::text\s*\)\s*from per_grade_acceptance_evidence;/,
  );
  assert.doesNotMatch(
    localVerification,
    /'PER_GRADE_EVIDENCE_JSON='\s*\|\|\s*jsonb?_build_object\(/,
  );
  assert.equal(
    localVerification.match(/PER_GRADE_EVIDENCE_JSON=/g)?.length,
    1,
  );

  const makeRow = (grade: number) => ({
    grade,
    evidenceType: "LIVE_LOCAL_DATABASE",
    ...Object.fromEntries(perGradeCheckNames.map((name) => [name, "PASS"])),
    overall: "PASS",
  });
  const makeMarker = (grades: Array<Record<string, unknown>>) =>
    `PER_GRADE_EVIDENCE_JSON=${JSON.stringify({
      evidenceType: "LIVE_LOCAL_DATABASE",
      grades,
    })}`;
  const validRows = Array.from({ length: 9 }, (_, index) =>
    makeRow(index + 1),
  );

  assert.deepEqual(
    parsePerGradeEvidence(makeMarker(validRows)).map((row) => row.grade),
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  assert.throws(
    () =>
      parsePerGradeEvidence(
        `${makeMarker(validRows)}\n${makeMarker(validRows)}`,
      ),
    /exactly one per-grade evidence marker/,
  );
  assert.throws(
    () =>
      parsePerGradeEvidence(
        makeMarker([...validRows.slice(0, 8), makeRow(8)]),
      ),
    /invalid or duplicate grade row/,
  );
  assert.throws(
    () => parsePerGradeEvidence(makeMarker(validRows.slice(0, 8))),
    /invalid envelope/,
  );
  assert.throws(
    () =>
      parsePerGradeEvidence(
        makeMarker(
          validRows.map((row) =>
            row.grade === 5
              ? { ...row, linkedParentProgress: "FAIL" }
              : row,
          ),
        ),
      ),
    /Grade 5 failed live check linkedParentProgress/,
  );
  assert.throws(
    () =>
      parsePerGradeEvidence(
        makeMarker(
          validRows.map((row) =>
            row.grade === 9 ? { ...row, unexpected: "PASS" } : row,
          ),
        ),
      ),
    /invalid or duplicate grade row/,
  );
});
