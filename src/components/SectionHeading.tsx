import type { ReactNode } from "react";
import { Reveal, RevealText } from "./Reveal";

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "left",
  className = "",
}: {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-4 ${
        align === "center" ? "items-center text-center" : "items-start"
      } ${className}`}
    >
      {eyebrow ? (
        <Reveal>
          <span className="eyebrow flex items-center gap-2">
            <span className="h-px w-6 bg-accent" />
            {eyebrow}
          </span>
        </Reveal>
      ) : null}
      <h2 className="max-w-3xl text-display-sm text-ink">
        <RevealText text={title} />
      </h2>
      {intro ? (
        <Reveal delay={1}>
          <p
            className={`max-w-xl text-base leading-relaxed text-muted ${
              align === "center" ? "mx-auto" : ""
            }`}
          >
            {intro}
          </p>
        </Reveal>
      ) : null}
    </div>
  );
}
