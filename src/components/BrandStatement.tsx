import { Reveal, RevealText } from "./Reveal";

const flow = [
  {
    k: "01",
    t: "Start from the problem",
    d: "We map how the work is carried out before any code is written.",
  },
  {
    k: "02",
    t: "Model the system",
    d: "A single coherent data model and the smallest set of components that supports it.",
  },
  {
    k: "03",
    t: "Build it to last",
    d: "Fast, observable and tested, and designed to be extended over the years ahead.",
  },
];

export function BrandStatement() {
  return (
    <section className="shell py-24 sm:py-32">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <h2 className="text-display-sm leading-[1.1] text-ink">
          <RevealText text="Software should solve problems, not create more of them." />
        </h2>
        <div className="flex flex-col gap-5 text-base leading-relaxed text-muted lg:pt-2">
          <Reveal delay={1}>
            <p>
              Most business software accumulates rather than resolves.
              Individual tools, point integrations and supporting spreadsheets
              combine over time into a system that no one designed but that the
              organisation now depends on.
            </p>
          </Reveal>
          <Reveal delay={2}>
            <p>
              We take the opposite approach. We begin with the problem, model
              how the work is actually carried out, and build the smallest
              coherent system that improves it. We then make that system fast,
              observable and ready to extend.
            </p>
          </Reveal>
          <Reveal delay={3}>
            <p className="font-serif text-lg italic text-ink">
              The result should appear obvious in hindsight and remain
              dependable for years.
            </p>
          </Reveal>
        </div>
      </div>

      <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-line/20 bg-line/10 shadow-elev-2 sm:mt-20 sm:grid-cols-3">
        {flow.map((f, i) => (
          <Reveal
            key={f.k}
            delay={i}
            className="group relative bg-surface p-6 transition-colors duration-300 hover:bg-surface-3 sm:p-8"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-accent">{f.k}</span>
              <span className="h-px flex-1 bg-line/20" />
              {i < flow.length - 1 ? (
                <span className="hidden font-mono text-faint sm:inline">→</span>
              ) : null}
            </div>
            <h3 className="mt-4 font-display text-lg text-ink">{f.t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{f.d}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
