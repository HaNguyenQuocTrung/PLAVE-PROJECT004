export const visualSystemV2 = {
  color: {
    navy: "#0B1F46",
    blue: "#1768E5",
    sky: "#64C8F4",
    skyPale: "#F1F8FF",
    surface: "#FFFFFF",
    textPrimary: "#10213F",
    textSecondary: "#52637D",
    border: "#D7E4F0",
    success: "#087F6B",
    warning: "#A86405",
    error: "#BE3344",
    recommendation: "#F2B84B",
    competency: "#6556D9",
    focus: "#0B74DE",
  },
  type: {
    display: "clamp(3rem, 7vw, 5.6rem)",
    pageTitle: "clamp(2.25rem, 4.8vw, 4rem)",
    sectionHeading: "clamp(1.55rem, 3vw, 2.35rem)",
    cardHeading: "1.125rem",
    body: "1rem",
    supporting: "0.9375rem",
    label: "0.875rem",
    caption: "0.78rem",
    button: "0.9375rem",
  },
  space: {
    pageInline: "clamp(1rem, 3vw, 2.5rem)",
    section: "clamp(4rem, 9vw, 7rem)",
  },
  radius: { small: "10px", medium: "16px", large: "24px" },
  shadow: {
    floating: "0 20px 60px -42px rgba(11, 31, 70, 0.42)",
  },
  content: { default: "76rem", learning: "68rem", practice: "60rem" },
  breakpoint: { mobile: 700, applicationShell: 980 },
  touchTarget: 48,
} as const;

export type VisualSystemV2 = typeof visualSystemV2;
