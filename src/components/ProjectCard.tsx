"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Project } from "@/data/projects";
import { SystemPreview } from "./SystemPreview";
import { ArrowRight } from "./MagneticButton";

export function ProjectCard({
  project,
  priority = "feature",
}: {
  project: Project;
  priority?: Project["layout"];
}) {
  const isFeature = priority === "feature" || priority === "wide";

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="group"
    >
      <Link href={`/projects/${project.slug}`} className="block">
        <div className="relative overflow-hidden rounded-xl border border-line/10 bg-surface-2">
          <motion.div
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="p-4 sm:p-8"
          >
            <SystemPreview
              variant={project.preview}
              label={`${project.title} preview`}
              className={isFeature ? "aspect-[16/10]" : "aspect-[4/3]"}
            />
          </motion.div>
          <div className="pointer-events-none absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-line/20 bg-bg/70 opacity-0 backdrop-blur transition-all duration-500 ease-out-expo group-hover:opacity-100">
            <ArrowRight className="h-4 w-4 text-ink" />
          </div>
        </div>

        <div className="mt-5 flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-accent">
                {project.category}
              </span>
              <span className="text-xs text-faint">{project.year}</span>
            </div>
            <h3 className="mt-2 text-xl text-ink transition-colors group-hover:text-accent">
              {project.title}
            </h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
              {project.description}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {project.technologies.slice(0, 4).map((t) => (
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
      </Link>
    </motion.article>
  );
}
