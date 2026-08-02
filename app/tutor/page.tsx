import { redirect } from "next/navigation";

import { AiTutorChat } from "@/components/AiTutorChat";
import { AccessDenied } from "@/components/AccessDenied";
import { getAiTutorConfiguration } from "@/lib/ai-tutor/config";
import { getStudentLearningContext } from "@/lib/practice/server";

export const metadata = {
  title: "AI Tutor",
  description: "Hỏi và học Toán lớp 1–9 cùng AI Tutor của PLAVE.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TutorPage() {
  const access = await getStudentLearningContext();
  if (!access.ok) {
    if (access.reason === "UNAUTHENTICATED") redirect("/login");
    return <AccessDenied />;
  }
  const configuration = getAiTutorConfiguration();
  return (
    <AiTutorChat
      grade={access.grade}
      available={configuration.ok}
      availabilityCode={configuration.ok ? "READY" : configuration.code}
      maxMessageCharacters={
        configuration.ok ? configuration.config.maxMessageCharacters : 2_000
      }
    />
  );
}
