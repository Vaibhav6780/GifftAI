import Link from "next/link";
import { services } from "@/data/services";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";
import { ArrowRight } from "./MagneticButton";

export function HomeServices() {
  return (
    <section className="border-y border-line/10 bg-surface-2/40">
      <div className="shell py-24 sm:py-32">
        <SectionHeading
          eyebrow="Capabilities"
          title="What we build"
          intro="From the first architecture diagram to production deployment, we build software around the way your business actually works."
        />

        <div className="mt-14 grid divide-y divide-line/10 border-y border-line/10 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3">
          {services.map((s, i) => (
            <Reveal
              key={s.id}
              delay={i % 3}
              className="group border-line/10 sm:[&:nth-child(2n)]:border-l lg:[&:nth-child(2n)]:border-l-0 lg:[&:nth-child(3n-1)]:border-x"
            >
              <Link
                href={`/services#${s.id}`}
                className="flex h-full flex-col gap-3 p-6 transition-colors duration-300 hover:bg-surface sm:p-8"
              >
                <span className="font-mono text-xs text-faint">{s.index}</span>
                <h3 className="text-lg text-ink transition-colors group-hover:text-accent">
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted">{s.summary}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs text-muted transition-colors group-hover:text-ink">
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
