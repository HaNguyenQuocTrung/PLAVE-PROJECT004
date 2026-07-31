import LessonPage from "@/app/learn/[gradeSlug]/[lessonSlug]/page";

export const metadata = {
  title: "Các số trong phạm vi 10",
};

export default function GradeOneNumbersLessonPage() {
  return LessonPage({
    params: Promise.resolve({
      gradeSlug: "grade-1",
      lessonSlug: "numbers-to-10",
    }),
  });
}
