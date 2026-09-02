import { Reveal, RevealText } from "./Reveal";

const flow = [
  {
    k: "01",
    t: "Start from the problem",
    d: "We map how the work actually happens before a line of code is written.",
  },
  {
    k: "02",
    t: "Model the system",
    d: "A single coherent data model and the smallest set of moving parts that fits it.",
  },
  {
    k: "03",
    t: "Make it hold up",
    d: "Fast, observable, tested and ready to grow into for years, not months.",
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
              Most business software accumulates rather than resolves. A tool
              here, an integration there, a spreadsheet to hold it together —
              until the system nobody designed becomes the system everybody
              depends on.
            </p>
          </Reveal>
          <Reveal delay={2}>
            <p>
              We work the other way around. We start from the problem, model
              how the work actually happens, and build the smallest coherent
              system that makes it better. Then we make it fast, observable and
              ready to grow into.
            </p>
          </Reveal>
          <Reveal delay={3}>
            <p className="font-serif text-lg italic text-ink">
              The result should feel obvious in hindsight — and quietly hold up
              for years.
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
