import type { ReactNode } from "react";
import { Reveal, RevealText } from "./Reveal";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden border-b border-line/10 pt-32 sm:pt-40">
      <div className="pointer-events-none absolute inset-0 grid-field opacity-[0.45]" />
      <div
        className="pointer-events-none absolute -right-32 -top-20 h-[440px] w-[440px] rounded-full opacity-70 blur-3xl"
        style={{ background: "var(--glow-warm)" }}
      />
      <div
        className="pointer-events-none absolute -left-40 top-24 h-[360px] w-[360px] rounded-full opacity-60 blur-3xl"
        style={{ background: "var(--glow-cool)" }}
      />
      <div className="shell relative pb-16 sm:pb-20">
        <Reveal>
          <span className="chip font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {eyebrow}
          </span>
        </Reveal>
        <h1 className="mt-6 max-w-4xl text-display-md text-ink">
          <RevealText text={title} />
        </h1>
        {subtitle ? (
          <Reveal delay={1}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              {subtitle}
            </p>
          </Reveal>
        ) : null}
        {children ? <div className="mt-10">{children}</div> : null}
      </div>
    </header>
  );
}
