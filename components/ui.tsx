import clsx from "clsx";
import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-beam text-ink-950 font-bold shadow-[var(--glow-beam)] hover:bg-beam-strong active:bg-beam disabled:shadow-none",
  secondary:
    "border border-line-strong bg-ink-800 text-text font-semibold hover:border-beam hover:bg-ink-700",
  ghost: "text-muted font-semibold hover:text-text hover:bg-ink-800",
  danger: "border border-gap/60 bg-gap/10 text-gap font-semibold hover:bg-gap/20",
};

/** Shared button classes, so links that look like buttons can't drift from Button. */
export function buttonClass({ variant = "primary", size = "md", className }: { variant?: Variant; size?: "sm" | "md" | "lg"; className?: string } = {}) {
  return clsx(
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-card transition-[background-color,border-color,color,transform,box-shadow] duration-[var(--dur-fast)] ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100",
    size === "sm" && "min-h-10 px-3.5 text-sm",
    size === "md" && "min-h-12 px-5 text-base",
    size === "lg" && "min-h-14 px-7 text-lg",
    variants[variant],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...rest
}: ComponentProps<"button"> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, className })}
      {...rest}
    >
      {loading && <Loader2 aria-hidden className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

/** Small uppercase-free kicker used sparingly for context, e.g. "Question 3 of 8". */
export function Meta({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={clsx("text-sm font-semibold text-faint", className)}>{children}</p>;
}

export function Wordmark({ className, children, size = "md" }: { className?: string; children: ReactNode; size?: "md" | "lg" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center font-display font-bold tracking-tight",
        size === "lg" ? "gap-3 text-3xl sm:text-[2.6rem]" : "gap-2.5 text-2xl sm:text-[1.7rem]",
        className,
      )}
    >
      <svg aria-hidden viewBox="0 0 24 24" className={size === "lg" ? "size-10 sm:size-14" : "size-8 sm:size-9"}>
        <circle cx="12" cy="5" r="2.6" fill="none" stroke="var(--color-beam)" strokeWidth="1.8" />
        <circle cx="5.5" cy="18" r="2.6" fill="none" stroke="var(--color-solid)" strokeWidth="1.8" />
        <circle cx="18.5" cy="18" r="2.6" fill="var(--color-root)" />
        <path d="M11 7.3 6.6 15.6M13 7.3l4.4 8.3" stroke="var(--color-line-strong)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {children}
    </span>
  );
}
