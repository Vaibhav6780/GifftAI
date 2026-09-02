import Link from "next/link";
import { services } from "@/data/services";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";
import { ArrowRight } from "./MagneticButton";

export function HomeServices() {
  return (
    <section className="relative border-y border-line/10 bg-bg-2">
      <div
        className="pointer-events-none absolute inset-0 grid-field opacity-[0.5]"
        aria-hidden="true"
      />
      <div className="shell relative py-24 sm:py-32">
        <SectionHeading
          eyebrow="Capabilities"
          title="What we build"
          intro="From the first architecture diagram to production deployment, we build software around the way your business actually works."
        />

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line/20 bg-line/10 shadow-elev-2 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <Reveal key={s.id} delay={i % 3} className="group bg-surface">
              <Link
                href={`/services#${s.id}`}
                className="flex h-full flex-col gap-3 p-6 transition-colors duration-300 hover:bg-surface-3 sm:p-8"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-accent">{s.index}</span>
                  <span className="h-px flex-1 bg-line/15" />
                </div>
                <h3 className="text-lg text-ink transition-colors group-hover:text-accent">
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted">{s.summary}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs text-muted transition-all duration-300 group-hover:gap-2.5 group-hover:text-ink">
                  Learn more
                  <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>

        <div className="mt-12">
          <Link
            href="/services"
            className="inline-flex items-center gap-1.5 text-sm text-ink link-underline"
          >
            See all services
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
