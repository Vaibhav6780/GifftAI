import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2.5 ${className}`}
      aria-label="GIFFT AI — home"
    >
      <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-[9px] border border-line/15 bg-surface shadow-elev-1 transition-transform duration-300 group-hover:-translate-y-0.5">
        <svg viewBox="0 0 28 28" className="h-6 w-6" fill="none" aria-hidden="true">
          <rect
            x="1"
            y="1"
            width="26"
            height="26"
            rx="7"
            stroke="currentColor"
            className="text-line/15"
          />
          {/* connected-nodes motif */}
          <path
            d="M9 9l10 10M19 9L9 19"
            stroke="currentColor"
            className="text-line/25"
            strokeWidth="1"
          />
          <circle cx="9" cy="9" r="2.4" fill="rgb(var(--accent))" />
          <circle cx="19" cy="19" r="2.4" fill="currentColor" className="text-ink" />
          <circle cx="19" cy="9" r="1.6" fill="currentColor" className="text-muted" />
          <circle cx="9" cy="19" r="1.6" fill="currentColor" className="text-muted" />
        </svg>
      </span>
      <span className="text-sm font-medium tracking-tight text-ink">
        GIFFT<span className="text-accent"> AI</span>
      </span>
    </Link>
  );
}
