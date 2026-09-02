import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeading } from "@/components/SectionHeading";
import { Reveal } from "@/components/Reveal";
import {
  companyStory,
  team,
  timeline,
  values,
} from "@/data/about";

export const metadata: Metadata = {
  title: "We solve hard software problems",
  description:
    "GIFFT AI is a small, senior software engineering and product studio. What we believe, how we work, and the people behind the work.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title="We solve hard software problems."
        subtitle="A small, senior studio that builds business-critical software — and stays close to it after launch."
      />

      {/* Company story */}
      <section className="shell border-t border-line/10 py-20 sm:py-28">
        <div className="grid gap-8 lg:grid-cols-[0.35fr_1fr] lg:gap-16">
          <span className="eyebrow flex items-center gap-2 lg:sticky lg:top-28 lg:self-start">
            <span className="h-px w-6 bg-accent" />
            Company story
          </span>
          <div className="space-y-5">
            {companyStory.map((p, i) => (
              <Reveal key={i} delay={i}>
                <p
                  className={`leading-relaxed ${
                    p.startsWith("//")
                      ? "font-mono text-sm text-faint"
                      : "text-lg text-ink/85"
                  }`}
                >
                  {p}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* What we believe */}
      <section className="border-y border-line/10 bg-surface-2/40">
        <div className="shell py-20 sm:py-28">
          <SectionHeading eyebrow="What we believe" title="Five principles we build by." />
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line/20 bg-line/10 shadow-elev-2 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v, i) => (
              <Reveal
                key={v.title}
                delay={i % 3}
                className="group bg-surface p-6 transition-colors hover:bg-surface-3 sm:p-8"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/12 font-mono text-xs text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-lg text-ink">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {v.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="shell border-t border-line/10 py-20 sm:py-28">
        <SectionHeading eyebrow="Timeline" title="A short history." />
        <ol className="mt-14 border-t border-line/10">
          {timeline.map((entry, i) => (
            <Reveal
              as="li"
              key={i}
              delay={i}
              className="grid gap-3 border-b border-line/10 py-6 sm:grid-cols-[8rem_1fr] sm:gap-8"
            >
              <span className="font-mono text-sm text-accent">{entry.year}</span>
              <div>
                <h3 className="text-lg text-ink">{entry.title}</h3>
                <p className="mt-1 font-mono text-sm text-faint">{entry.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Team */}
      <section className="shell border-t border-line/10 py-20 sm:py-28">
        <SectionHeading
          eyebrow="Team"
          title="The people who build it."
          intro="Replace these placeholders with your real team. The people who scope the work are the people who build it."
        />
        <div className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {team.map((member, i) => (
            <Reveal key={i} delay={i % 4}>
              <div className="card card-hover relative aspect-square overflow-hidden rounded-2xl">
                <div className="absolute inset-0 grid-field-strong opacity-40" />
                <div
                  className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full opacity-80 blur-2xl"
                  style={{ background: "var(--glow-warm)" }}
                />
                <div className="relative grid h-full place-items-center">
                  <svg
                    viewBox="0 0 48 48"
                    className="h-12 w-12 text-line/30"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <circle cx="24" cy="18" r="8" />
                    <path d="M8 42c2-9 8-13 16-13s14 4 16 13" />
                  </svg>
                </div>
              </div>
              <h3 className="mt-4 text-base text-ink">{member.name}</h3>
              <p className="text-sm text-muted">{member.role}</p>
              <p className="mt-1 font-mono text-xs text-faint">{member.focus}</p>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
