import "server-only";

import {
  parseParentGradeOneCompletionSummary,
  type ParentGradeOneCompletionSummary,
} from "@/lib/grade-one-completion/contracts";
import { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function loadParentGradeOneCompletionSummary(
  supabase: ServerSupabaseClient,
  connectionId: string,
): Promise<ParentGradeOneCompletionSummary | null> {
  const { data, error } = await supabase.rpc(
    "get_parent_child_grade1_completion_summary",
    { p_connection_id: connectionId },
  );
  if (error) return null;
  return parseParentGradeOneCompletionSummary(data);
}
