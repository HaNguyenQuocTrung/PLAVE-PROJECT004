import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  href?: string;
  variant?:
    | "primary"
    | "secondary"
    | "tertiary"
    | "quiet"
    | "destructive";
  fullWidth?: boolean;
  loading?: boolean;
};

export function Button({
  children,
  href,
  variant = "primary",
  fullWidth = false,
  loading = false,
  className = "",
  type = "button",
  disabled,
  ...buttonProps
}: ButtonProps) {
  const normalizedVariant = variant === "quiet" ? "tertiary" : variant;
  const classes = [
    "button",
    `button--${normalizedVariant}`,
    fullWidth ? "button--full" : "",
    loading ? "button--loading" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href && !disabled && !loading) {
    return (
      <Link className={classes} href={href}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <span className={classes} aria-disabled="true">
        {loading ? <span className="button__spinner" aria-hidden="true" /> : null}
        {children}
      </span>
    );
  }

  return (
    <button
      className={classes}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...buttonProps}
    >
      {loading ? <span className="button__spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
