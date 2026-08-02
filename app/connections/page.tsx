import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/AccessDenied";
import { ConnectionsManager } from "@/components/ConnectionsManager";
import { LearningAccessState } from "@/components/LearningAccessState";
import { loadConnectionState } from "@/lib/connections/server";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Kết nối phụ huynh",
};

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return <LearningAccessState kind="UNAVAILABLE" />;
  }
  if (!profile.onboarding_completed) redirect("/onboarding");
  if (profile.role !== "STUDENT" && profile.role !== "PARENT") {
    return <AccessDenied />;
  }

  const result = await loadConnectionState(supabase);
  if (!result.ok || result.state.viewerRole !== profile.role) {
    return <LearningAccessState kind="UNAVAILABLE" />;
  }

  const isStudent = profile.role === "STUDENT";

  return (
    <div className="connections-page relationship-page--v2 page-shell">
      <header className="catalog-hero connections-hero">
        <p className="eyebrow">Kết nối có sự đồng ý</p>
        <h1>
          {isStudent
            ? "Quản lý kết nối phụ huynh"
            : "Quản lý kết nối học sinh"}
        </h1>
        <p>
          {isStudent
            ? "Em là người quyết định đồng ý, từ chối hoặc ngắt kết nối."
            : "Học sinh cần đồng ý trước khi bạn có thể xem tổng quan học tập."}
        </p>
      </header>
      <ConnectionsManager state={result.state} />
    </div>
  );
}
