import type { HTMLAttributes } from "react";
import clsx from "clsx";

type Variant = "neutral" | "success" | "warning" | "danger" | "info" | "white" | "yellow" | "blue" | "charcoal";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  danger: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  info: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-500",
  // Literal-color variants (as opposed to the semantic ones above) — added for the Lead
  // status badges, which call for exact colors (White/Red/Yellow/Blue/Dark Gray) rather
  // than a success/warning/danger meaning. Kept white/dark-gray fixed in both themes
  // (not palette-swapped) since "White" and "Dark Gray" are the literal spec, not a
  // light/dark-mode-relative choice.
  white: "bg-white text-slate-700 border border-slate-300 dark:bg-white dark:text-slate-700 dark:border-slate-300",
  yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  charcoal: "bg-slate-700 text-white dark:bg-slate-600 dark:text-slate-100",
};

export function Badge({ variant = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
