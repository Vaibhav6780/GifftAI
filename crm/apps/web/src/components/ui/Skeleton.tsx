import clsx from "clsx";

/** A pulse-animated placeholder bar for loading states that should keep the surrounding
 *  layout (headers, filters) in place instead of swapping the whole view for a spinner. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded bg-slate-200 dark:bg-slate-800", className)} />;
}
