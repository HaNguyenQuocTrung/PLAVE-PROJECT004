export type HeaderNavigationItem = {
  href: string;
  label: string;
  activePrefixes: string[];
  disabled?: boolean;
  badge?: string;
  exact?: boolean;
};

export type HeaderRole = "STUDENT" | "PARENT" | "TEACHER" | null;

const protectedPaths = [
  "/dashboard",
  "/onboarding",
  "/update-password",
  "/learn",
  "/lessons",
  "/goals",
  "/connections",
  "/classrooms",
  "/assignments",
  "/diagnostic",
  "/grade-1",
  "/parent",
  "/profile",
  "/settings",
  "/practice",
  "/review",
  "/results",
  "/curriculum-practice",
  "/learning-progress",
  "/learning-history",
  "/teacher",
] as const;

const authEntryPaths = ["/login", "/register"] as const;

export function getHeaderNavigation(
  authenticated: boolean,
  role: HeaderRole = null,
  onboardingCompleted = true,
): HeaderNavigationItem[] {
  if (authenticated) {
    if (!onboardingCompleted) return [];

    if (role === "STUDENT") {
      return [
        {
          href: "/dashboard",
          label: "Tổng quan",
          activePrefixes: ["/dashboard", "/diagnostic", "/grade-1"],
        },
        {
          href: "/learn",
          label: "Lý thuyết",
          activePrefixes: ["/learn"],
        },
        {
          href: "/lessons",
          label: "Bài học",
          activePrefixes: ["/lessons", "/practice", "/assignments"],
        },
        {
          href: "/results",
          label: "Kết quả",
          activePrefixes: ["/results", "/review"],
        },
        {
          href: "/goals",
          label: "Mục tiêu",
          activePrefixes: ["/goals"],
        },
      ];
    }

    if (role === "TEACHER") {
      return [
        {
          href: "/teacher",
          label: "Tổng quan",
          activePrefixes: ["/teacher"],
          exact: true,
        },
        {
          href: "/teacher/classrooms",
          label: "Lớp học",
          activePrefixes: ["/teacher/classrooms"],
        },
        {
          href: "/teacher/questions",
          label: "Kho câu hỏi",
          activePrefixes: ["/teacher/questions"],
        },
        {
          href: "/teacher/assignments",
          label: "Bài tập",
          activePrefixes: ["/teacher/assignments"],
        },
        {
          href: "/teacher/profile",
          label: "Hồ sơ",
          activePrefixes: ["/teacher/profile"],
        },
      ];
    }

    return [
      {
        href: "/dashboard",
        label: "Tổng quan",
        activePrefixes: ["/dashboard", "/parent"],
      },
      {
        href: "/connections",
        label: "Kết nối",
        activePrefixes: ["/connections"],
      },
    ];
  }

  return [
    { href: "/", label: "Trang chủ", activePrefixes: ["/"] },
    { href: "/demo", label: "Học thử", activePrefixes: ["/demo"] },
    { href: "/about", label: "Giới thiệu", activePrefixes: ["/about"] },
    { href: "/login", label: "Đăng nhập", activePrefixes: ["/login"] },
    { href: "/register", label: "Đăng ký", activePrefixes: ["/register"] },
  ];
}

export function getHeaderLogoHref(
  authenticated: boolean,
  onboardingCompleted = true,
  role: HeaderRole = null,
) {
  if (!authenticated) return "/";
  if (role === "TEACHER") {
    return onboardingCompleted ? "/teacher" : "/teacher/onboarding";
  }
  return onboardingCompleted ? "/dashboard" : "/onboarding";
}

export function isHeaderItemActive(
  pathname: string,
  item: HeaderNavigationItem,
) {
  if (item.exact) return pathname === item.href;
  return item.activePrefixes.some((prefix) => {
    if (prefix === "/") return pathname === "/";
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

function matchesPath(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export type AuthNavigationDecision = "ALLOW" | "LOGIN" | "DASHBOARD";

export function getAuthNavigationDecision(
  pathname: string,
  authenticated: boolean,
): AuthNavigationDecision {
  if (
    authenticated &&
    authEntryPaths.some((path) => matchesPath(pathname, path))
  ) {
    return "DASHBOARD";
  }

  if (
    !authenticated &&
    protectedPaths.some((path) => matchesPath(pathname, path))
  ) {
    return "LOGIN";
  }

  return "ALLOW";
}
