"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import {
  projects,
  projectCategories,
  type ProjectCategory,
} from "@/data/projects";
import { ProjectCard } from "./ProjectCard";

type Filter = ProjectCategory | "All";

export function ProjectExplorer() {
  const [filter, setFilter] = useState<Filter>("All");

  const visible = useMemo(() => {
    if (filter === "All") return projects;
    return projects.filter((p) => p.categories.includes(filter));
  }, [filter]);

  return (
    <div className="shell py-16 sm:py-20">
      <LayoutGroup>
        <div
          role="tablist"
          aria-label="Filter projects"
          className="flex flex-wrap gap-2"
        >
          {projectCategories.map((cat) => {
            const active = cat === filter;
            return (
              <button
                key={cat}
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(cat)}
                className={`relative rounded-full px-4 py-2 text-sm transition-colors duration-300 ${
                  active ? "text-bg" : "text-muted hover:text-ink"
                }`}
              >
                {active ? (
                  <motion.span
                    layoutId="filter-pill"
                    className="absolute inset-0 rounded-full bg-ink"
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  />
                ) : (
                  <span className="absolute inset-0 rounded-full border border-line/15" />
                )}
                <span className="relative">{cat}</span>
              </button>
            );
          })}
        </div>
      </LayoutGroup>

      <p className="mt-6 font-mono text-xs text-faint">
        {visible.length.toString().padStart(2, "0")} project
        {visible.length === 1 ? "" : "s"}
      </p>

      <motion.div layout className="mt-10 grid gap-x-10 gap-y-16 sm:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {visible.map((project) => (
            <motion.div
              key={project.slug}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <ProjectCard project={project} priority={project.layout} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
