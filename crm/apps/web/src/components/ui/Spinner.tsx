import clsx from "clsx";

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={clsx(
        "h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent",
        className,
      )}
    />
  );
}

/** Centered full-width loading placeholder — the same block every list/detail page uses
 *  while its query is in flight. */
export function PageSpinner() {
  return (
    <div className="flex justify-center py-12">
      <Spinner />
    </div>
  );
}
