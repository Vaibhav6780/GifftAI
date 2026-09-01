"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { projects } from "@/data/projects";
import { SystemPreview } from "./SystemPreview";
import { SectionHeading } from "./SectionHeading";
import { MagneticButton, ArrowRight } from "./MagneticButton";

export function SelectedWork() {
  const [feature, ...rest] = projects;
  const pairs = rest.slice(0, 4);

  return (
    <section className="shell py-24 sm:py-32">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow="Portfolio"
          title="Selected work"
          intro="Products, platforms and systems engineered around real business problems."
        />
        <Link
          href="/projects"
          className="hidden shrink-0 items-center gap-1.5 text-sm text-ink link-underline sm:inline-flex"
        >
          All projects
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Feature — Project 01 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="group mt-16"
      >
        <Link href={`/projects/${feature.slug}`} className="block">
          <div className="flex items-baseline gap-4">
            <span className="font-mono text-sm text-accent">01</span>
            <span className="h-px flex-1 bg-line/15" />
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted">
              {feature.category}
            </span>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-line/10 bg-surface-2 p-4 sm:p-12">
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            >
              <SystemPreview
                variant={feature.preview}
                label={`${feature.title} preview`}
                className="aspect-[16/9]"
              />
            </motion.div>
          </div>

          <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-end">
            <h3 className="text-display-sm text-ink transition-colors group-hover:text-accent">
              {feature.title}
            </h3>
            <div>
              <p className="max-w-lg text-base leading-relaxed text-muted">
                {feature.summary}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {feature.technologies.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-line/15 px-2.5 py-1 text-[0.7rem] text-muted"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm text-ink link-underline">
                View Case Study
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Alternating pairs */}
      <div className="mt-24 grid gap-x-10 gap-y-20 sm:grid-cols-2">
        {pairs.map((project, i) => (
          <motion.article
            key={project.slug}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className={`group ${i % 2 === 1 ? "sm:mt-24" : ""}`}
          >
            <Link href={`/projects/${project.slug}`} className="block">
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-sm text-accent">
                  {String(i + 2).padStart(2, "0")}
                </span>
                <span className="h-px flex-1 bg-line/15" />
                <span className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted">
                  {project.category}
                </span>
              </div>
              <div className="mt-5 overflow-hidden rounded-xl border border-line/10 bg-surface-2 p-4 sm:p-7">
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  <SystemPreview
                    variant={project.preview}
                    label={`${project.title} preview`}
                    className="aspect-[4/3]"
                  />
                </motion.div>
              </div>
              <h3 className="mt-5 text-xl text-ink transition-colors group-hover:text-accent">
                {project.title}
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
                {project.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm text-ink link-underline">
                View Case Study
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </motion.article>
        ))}
      </div>

      <div className="mt-20 flex justify-center sm:hidden">
        <MagneticButton href="/projects" variant="ghost">
          All projects
          <ArrowRight />
        </MagneticButton>
      </div>
    </section>
  );
}
