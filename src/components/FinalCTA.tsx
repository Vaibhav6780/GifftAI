import { MagneticButton, ArrowRight } from "./MagneticButton";
import { Reveal, RevealText } from "./Reveal";

export function FinalCTA({
  heading = "Let's discuss what you're building.",
  sub = "Share what you intend to build and we will help translate it into a practical technical plan.",
}: {
  heading?: string;
  sub?: string;
}) {
  return (
    <section className="relative overflow-hidden border-y border-line/10 bg-bg-2">
      <div className="absolute inset-0 grid-field opacity-[0.55]" />
      <div
        className="pointer-events-none absolute -left-1/4 top-1/2 h-[460px] w-[460px] -translate-y-1/2 rounded-full opacity-90 blur-3xl"
        style={{ background: "var(--glow-warm)" }}
      />
      <div
        className="pointer-events-none absolute -right-1/4 top-0 h-[380px] w-[380px] rounded-full opacity-80 blur-3xl"
        style={{ background: "var(--glow-cool)" }}
      />
      <div className="shell relative py-24 sm:py-32">
        <div className="flex flex-col items-start gap-8">
          <h2 className="max-w-4xl text-display-md text-ink">
            <RevealText text={heading} />
          </h2>
          <Reveal delay={1}>
            <p className="max-w-lg text-lg leading-relaxed text-muted">{sub}</p>
          </Reveal>
          <Reveal delay={2}>
            <MagneticButton href="/contact">
              Start a Project
              <ArrowRight />
            </MagneticButton>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
