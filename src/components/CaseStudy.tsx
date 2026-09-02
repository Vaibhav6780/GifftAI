import Link from "next/link";
import type { Project } from "@/data/projects";
import { SystemPreview } from "./SystemPreview";
import { ArchitectureDiagram } from "./ArchitectureDiagram";
import { MagneticButton, ArrowRight } from "./MagneticButton";
import { Reveal, RevealText } from "./Reveal";

function Block({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="shell border-t border-line/10 py-20 sm:py-28">
      <div className="grid gap-8 lg:grid-cols-[0.35fr_1fr] lg:gap-16">
        <Reveal>
          <span className="eyebrow flex items-center gap-2 lg:sticky lg:top-28">
            <span className="h-px w-6 bg-accent" />
            {eyebrow}
          </span>
        </Reveal>
        <div>{children}</div>
      </div>
    </section>
  );
}

export function CaseStudy({
  project,
  next,
}: {
  project: Project;
  next: Project;
}) {
  return (
    <article>
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-line/10 pt-32 sm:pt-40">
        <div className="absolute inset-0 grid-field opacity-30" />
        <div className="shell relative pb-16">
          <Reveal>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-accent">
                {project.category}
              </span>
              <span className="text-xs text-faint">{project.year}</span>
            </div>
          </Reveal>
          <h1 className="mt-5 max-w-4xl text-display-md text-ink">
            <RevealText text={project.title} />
          </h1>
          <Reveal delay={1}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              {project.description}
            </p>
          </Reveal>
          <Reveal delay={2}>
            <div className="mt-8 flex flex-wrap gap-3">
              {project.liveUrl ? (
                <MagneticButton href={project.liveUrl}>
                  Visit Product
                  <ArrowRight />
                </MagneticButton>
              ) : null}
              <MagneticButton href="/contact" variant="ghost">
                Discuss a Similar Project
                <ArrowRight />
              </MagneticButton>
            </div>
          </Reveal>
        </div>
        <div className="shell relative pb-16">
          <Reveal>
            <div className="card overflow-hidden rounded-[1.75rem] p-4 shadow-elev-3 sm:p-14">
              <SystemPreview
                variant={project.preview}
                label={`${project.title} product visual`}
                className="aspect-[16/9]"
              />
            </div>
          </Reveal>
        </div>
      </header>

      <Block eyebrow="The Challenge">
        <Reveal>
          <p className="text-2xl leading-snug text-ink sm:text-3xl">
            {project.challenge}
          </p>
        </Reveal>
      </Block>

      <Block eyebrow="The Solution">
        <Reveal>
          <p className="text-xl leading-relaxed text-muted">
            {project.solution}
          </p>
        </Reveal>
        <Reveal delay={1}>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {project.gallery.slice(0, 2).map((g) => (
              <figure key={g.caption}>
                <div className="card overflow-hidden rounded-xl p-4">
                  <SystemPreview
                    variant={g.preview}
                    label={g.caption}
                    className="aspect-[4/3]"
                  />
                </div>
                <figcaption className="mt-2 font-mono text-xs text-faint">
                  {g.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </Reveal>
      </Block>

      <Block eyebrow="Key Features">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-line/20 bg-line/10 shadow-elev-2 sm:grid-cols-2">
          {project.features.map((f, i) => (
            <Reveal
              key={f.title}
              delay={i % 2}
              className="group bg-surface p-6 transition-colors hover:bg-surface-3 sm:p-8"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/12 font-mono text-xs text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 text-lg text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            </Reveal>
          ))}
        </div>
      </Block>

      <Block eyebrow="Architecture">
        <ArchitectureDiagram layers={project.architecture} />
      </Block>

      <Block eyebrow="Technology">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {project.tech.map((group, i) => (
            <Reveal key={group.group} delay={i % 3}>
              <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                {group.group}
              </h3>
              <ul className="mt-3 space-y-1.5">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-ink"
                  >
                    <span className="h-1 w-1 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </Block>

      <Block eyebrow="Results">
        <ul className="grid gap-4 sm:grid-cols-2">
          {project.results.map((r, i) => (
            <Reveal
              as="li"
              key={r}
              delay={i % 2}
              className="card flex items-start gap-3 rounded-xl p-5"
            >
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span className="text-base text-ink">{r}</span>
            </Reveal>
          ))}
        </ul>
      </Block>

      <Block eyebrow="Gallery">
        <div className="space-y-6">
          {project.gallery.map((g) => (
            <Reveal key={g.caption}>
              <figure>
                <div className="card overflow-hidden rounded-2xl p-4 sm:p-10">
                  <SystemPreview
                    variant={g.preview}
                    label={g.caption}
                    className="aspect-[16/9]"
                  />
                </div>
                <figcaption className="mt-3 font-mono text-xs text-faint">
                  {g.caption}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </Block>

      {/* Next project */}
      <section className="shell border-t border-line/10 py-20 sm:py-28">
        <Link href={`/projects/${next.slug}`} className="group block">
          <span className="eyebrow">Next project</span>
          <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-display-sm text-ink transition-colors group-hover:text-accent">
              {next.title}
            </h2>
            <span className="inline-flex items-center gap-2 text-sm text-muted transition-colors group-hover:text-ink">
              View Case Study
              <ArrowRight />
            </span>
          </div>
          <div className="card card-hover mt-8 overflow-hidden rounded-[1.75rem] p-4 sm:p-12">
            <SystemPreview
              variant={next.preview}
              label={`${next.title} preview`}
              className="aspect-[16/9]"
            />
          </div>
        </Link>
      </section>
    </article>
  );
}
