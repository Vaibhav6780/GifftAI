import { Reveal, RevealText } from "./Reveal";

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
    </section>
  );
}
