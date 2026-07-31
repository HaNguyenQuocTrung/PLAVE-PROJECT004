import "server-only";

import {
  parseTeacherAssignmentAnalysis,
  parseTeacherClassGradebook,
} from "@/lib/gradebook/contracts";
import { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type TeacherAssignmentCurriculumEvidence = {
  evidenceSource: "TEACHER_ASSIGNMENT";
  masteryClaim: false;
  outcomes: {
    title: string;
    evidenceCount: number;
    correctCount: number;
    accuracyPercent: number | null;
  }[];
  skills: {
    title: string;
    evidenceCount: number;
    correctCount: number;
    accuracyPercent: number | null;
  }[];
};

function parseCurriculumEvidence(
  value: unknown,
): TeacherAssignmentCurriculumEvidence | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("evidence_source" in value) ||
    value.evidence_source !== "TEACHER_ASSIGNMENT" ||
    !("mastery_claim" in value) ||
    value.mastery_claim !== false ||
    !("outcomes" in value) ||
    !Array.isArray(value.outcomes) ||
    !("skills" in value) ||
    !Array.isArray(value.skills)
  ) {
    return null;
  }
  const parseItems = (items: unknown[]) =>
    items.map((item) => {
      if (
        typeof item !== "object" ||
        item === null ||
        !("title" in item) ||
        typeof item.title !== "string" ||
        !("evidence_count" in item) ||
        typeof item.evidence_count !== "number" ||
        !("correct_count" in item) ||
        typeof item.correct_count !== "number" ||
        !("accuracy_percent" in item) ||
        !(
          item.accuracy_percent === null ||
          typeof item.accuracy_percent === "number"
        )
      ) {
        return null;
      }
      return {
        title: item.title,
        evidenceCount: item.evidence_count,
        correctCount: item.correct_count,
        accuracyPercent: item.accuracy_percent,
      };
    });
  const outcomes = parseItems(value.outcomes);
  const skills = parseItems(value.skills);
  if (
    outcomes.some((item) => item === null) ||
    skills.some((item) => item === null)
  ) {
    return null;
  }
  return {
    evidenceSource: "TEACHER_ASSIGNMENT",
    masteryClaim: false,
    outcomes: outcomes as TeacherAssignmentCurriculumEvidence["outcomes"],
    skills: skills as TeacherAssignmentCurriculumEvidence["skills"],
  };
}

export async function loadTeacherClassGradebook(
  supabase: ServerSupabaseClient,
  classroomId: string,
  assignmentId: string | null,
) {
  const { data, error } = await supabase.rpc(
    "get_teacher_class_gradebook",
    {
      p_classroom_id: classroomId,
      p_assignment_id: assignmentId,
    },
  );
  if (error) {
    return {
      ok: false as const,
      reason: "UNAVAILABLE" as const,
      message: "Chưa thể tải bảng điểm. Vui lòng thử lại.",
    };
  }
  if (data === null) {
    return {
      ok: false as const,
      reason: "NOT_FOUND" as const,
      message: "Không tìm thấy bảng điểm phù hợp.",
    };
  }
  const gradebook = parseTeacherClassGradebook(data);
  return gradebook
    ? { ok: true as const, gradebook }
    : {
        ok: false as const,
        reason: "UNAVAILABLE" as const,
        message: "Dữ liệu bảng điểm chưa sẵn sàng.",
      };
}

export async function loadTeacherAssignmentAnalysis(
  supabase: ServerSupabaseClient,
  assignmentId: string,
) {
  const { data, error } = await supabase.rpc(
    "get_teacher_assignment_analysis",
    { p_assignment_id: assignmentId },
  );
  if (error) {
    return {
      ok: false as const,
      reason: "UNAVAILABLE" as const,
      message: "Chưa thể tải phân tích bài tập. Vui lòng thử lại.",
    };
  }
  if (data === null) {
    return {
      ok: false as const,
      reason: "NOT_FOUND" as const,
      message: "Không tìm thấy phân tích phù hợp.",
    };
  }
  const analysis = parseTeacherAssignmentAnalysis(data);
  return analysis
    ? { ok: true as const, analysis }
    : {
        ok: false as const,
        reason: "UNAVAILABLE" as const,
        message: "Dữ liệu phân tích chưa sẵn sàng.",
      };
}

export async function loadTeacherAssignmentCurriculumEvidence(
  supabase: ServerSupabaseClient,
  assignmentId: string,
) {
  const { data, error } = await supabase.rpc(
    "get_teacher_assignment_curriculum_evidence",
    { p_assignment_id: assignmentId },
  );
  if (error || data === null) return null;
  return parseCurriculumEvidence(data);
}
