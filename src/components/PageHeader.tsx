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
      <div className="absolute inset-0 grid-field opacity-30" />
      <div className="shell relative pb-16 sm:pb-20">
        <Reveal>
          <span className="eyebrow flex items-center gap-2">
            <span className="h-px w-6 bg-accent" />
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
