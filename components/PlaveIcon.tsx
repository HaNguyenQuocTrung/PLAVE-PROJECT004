type PlaveIconName =
  | "home"
  | "lessons"
  | "progress"
  | "history"
  | "goal"
  | "classroom"
  | "questions"
  | "assignment"
  | "profile"
  | "connections"
  | "student"
  | "parent"
  | "teacher"
  | "check"
  | "arrow"
  | "tutor";

export function getNavigationIcon(href: string): PlaveIconName {
  if (href.includes("questions")) return "questions";
  if (href.includes("assignments")) return "assignment";
  if (href.includes("classrooms")) return "classroom";
  if (href.includes("connections")) return "connections";
  if (href.includes("learning-progress")) return "progress";
  if (href.includes("results") || href.includes("history")) return "history";
  if (href.includes("lessons")) return "lessons";
  if (href.includes("goals")) return "goal";
  if (href.includes("profile")) return "profile";
  if (href.includes("tutor")) return "tutor";
  return "home";
}

export function PlaveIcon({
  name,
  className = "",
}: Readonly<{ name: PlaveIconName; className?: string }>) {
  const common = {
    className: `plave-icon ${className}`.trim(),
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const paths: Record<PlaveIconName, React.ReactNode> = {
    home: <><path d="m3.5 10.5 8.5-7 8.5 7"/><path d="M5.5 9.5v10h13v-10M9 19.5v-6h6v6"/></>,
    lessons: <><path d="M4 4.5h11.5A2.5 2.5 0 0 1 18 7v12H6.5A2.5 2.5 0 0 1 4 16.5z"/><path d="M18 19V7.5h2v9a2.5 2.5 0 0 1-2 2.5ZM8 9h6M8 13h5"/></>,
    progress: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/><path d="m4 7 6-4 6 6 5-5"/></>,
    history: <><path d="M4 5v5h5"/><path d="M5.3 17.5a8 8 0 1 0-.8-8"/><path d="M12 7v5l3 2"/></>,
    goal: <><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="m14.5 9.5 6-6M16 3.5h4.5V8"/></>,
    classroom: <><path d="M3 20V7l9-4 9 4v13"/><path d="M8 20v-5h8v5M7 9h2M11 9h2M15 9h2"/></>,
    questions: <><path d="M5 4h14v16H5z"/><path d="M9.5 9a2.5 2.5 0 1 1 3 2.45c-.5.16-.5.55-.5 1.05M12 16h.01"/></>,
    assignment: <><path d="M7 4h10l2 3v13H5V7z"/><path d="M9 3v4h6V3M8.5 12h7M8.5 16h5"/></>,
    profile: <><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>,
    connections: <><circle cx="8" cy="8" r="3"/><circle cx="17" cy="15" r="3"/><path d="m10.5 9.5 4 3.5M2.5 19a5.5 5.5 0 0 1 8-4.9M14 7.5a4.5 4.5 0 0 1 6.5 4"/></>,
    student: <><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0M4 5l8-3 8 3-8 3z"/></>,
    parent: <><path d="M3.5 20a6 6 0 0 1 12 0"/><circle cx="9.5" cy="9" r="3.5"/><path d="M15 10.5a3 3 0 0 1 4.5 2.6M16.5 16a4.5 4.5 0 0 1 4 4"/></>,
    teacher: <><path d="M4 4h16v11H4zM9 20h6M12 15v5"/><path d="m8 10 2.2-2.2L12 9.5l3-3"/></>,
    check: <path d="m5 12.5 4.2 4L19 7"/>,
    arrow: <><path d="M4 12h15M14 6l6 6-6 6"/></>,
    tutor: <><path d="M5 5.5h14v10H9l-4 3z"/><path d="M9 10h.01M12 10h.01M15 10h.01"/><path d="M8 3.5 9.5 2M16 3.5 14.5 2"/></>,
  };

  return <svg {...common}>{paths[name]}</svg>;
}
