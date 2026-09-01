"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { processSteps } from "@/data/services";
import { SectionHeading } from "./SectionHeading";

export function ProcessSection() {
  const [active, setActive] = useState(0);

  return (
    <section className="shell py-24 sm:py-32">
      <SectionHeading
        eyebrow="How we work"
        title="From first diagram to production."
        intro="A deliberate path from understanding the problem to running the system at scale."
      />

      <div className="mt-16 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <ul className="flex flex-col">
          {processSteps.map((step, i) => {
            const isActive = i === active;
            return (
              <li key={step.index}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setActive(i)}
                  className="group flex w-full items-center gap-5 border-b border-line/10 py-5 text-left"
                  aria-expanded={isActive}
                >
                  <span
                    className={`font-mono text-sm transition-colors ${
                      isActive ? "text-accent" : "text-faint"
                    }`}
                  >
                    {step.index}
                  </span>
                  <span
                    className={`font-display text-2xl transition-colors sm:text-3xl ${
                      isActive ? "text-ink" : "text-muted group-hover:text-ink"
                    }`}
                  >
                    {step.title}
                  </span>
                  <span
                    className={`ml-auto h-px transition-all duration-500 ease-out-expo ${
                      isActive ? "w-10 bg-accent" : "w-4 bg-line/25"
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ul>

        <div className="relative min-h-[220px] rounded-xl border border-line/10 bg-surface-2 p-8">
          <div className="absolute inset-0 grid-field opacity-50" />
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
                Step {processSteps[active].index}
              </span>
              <h3 className="mt-3 text-2xl text-ink">
                {processSteps[active].title}
              </h3>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
                {processSteps[active].body}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
