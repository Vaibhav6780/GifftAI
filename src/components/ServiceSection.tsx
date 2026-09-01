import type { Service } from "@/data/services";
import { SystemPreview } from "./SystemPreview";
import { Reveal, RevealText } from "./Reveal";

const previews = [
  "console",
  "dashboard",
  "graph",
  "browser",
  "mobile",
  "dashboard",
  "console",
  "graph",
] as const;

export function ServiceSection({
  service,
  index,
}: {
  service: Service;
  index: number;
}) {
  const flip = index % 2 === 1;

  return (
    <section
      id={service.id}
      className="scroll-mt-24 border-t border-line/10 py-20 sm:py-28"
    >
      <div className="shell grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className={flip ? "lg:order-2" : ""}>
          <div className="flex items-baseline gap-4">
            <span className="font-mono text-sm text-accent">{service.index}</span>
            <span className="h-px flex-1 bg-line/15" />
          </div>
          <h2 className="mt-5 text-display-sm text-ink">
            <RevealText text={service.title} />
          </h2>
          <Reveal delay={1}>
            <p className="mt-4 text-lg leading-relaxed text-ink/80">
              {service.summary}
            </p>
          </Reveal>
          <Reveal delay={2}>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
              {service.detail}
            </p>
          </Reveal>
          <Reveal delay={3}>
            <ul className="mt-6 flex flex-wrap gap-2">
              {service.deliverables.map((d) => (
                <li
                  key={d}
                  className="rounded-full border border-line/15 px-3 py-1 text-xs text-muted"
                >
                  {d}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal className={flip ? "lg:order-1" : ""}>
          <div className="overflow-hidden rounded-xl border border-line/10 bg-surface-2 p-4 sm:p-10">
            <SystemPreview
              variant={previews[index % previews.length]}
              label={`${service.title} illustration`}
              className="aspect-[4/3]"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
