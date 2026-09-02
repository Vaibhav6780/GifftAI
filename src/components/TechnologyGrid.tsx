"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { technologyMap } from "@/data/technologies";

export function TechnologyGrid() {
  const [active, setActive] = useState<string>(technologyMap[0].name);
  const current =
    technologyMap.find((c) => c.name === active) ?? technologyMap[0];

  return (
    <div className="shell py-16 sm:py-24">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        {/* Category spine */}
        <ul className="flex flex-col">
          {technologyMap.map((cat, i) => {
            const isActive = cat.name === active;
            return (
              <li key={cat.name}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(cat.name)}
                  onFocus={() => setActive(cat.name)}
                  onClick={() => setActive(cat.name)}
                  className="group flex w-full items-center gap-4 border-b border-line/10 py-4 text-left"
                >
                  <span className="font-mono text-[0.7rem] text-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`font-display text-xl transition-colors sm:text-2xl ${
                      isActive
                        ? "text-ink"
                        : "text-muted group-hover:text-ink"
                    }`}
                  >
                    {cat.name}
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

        {/* Detail panel */}
        <motion.div
          key={current.name}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="panel relative self-start overflow-hidden rounded-2xl p-8 shadow-elev-2 sm:p-10"
        >
          <div className="absolute inset-0 grid-field-strong opacity-[0.5]" />
          <div
            className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full opacity-80 blur-2xl"
            style={{ background: "var(--glow-cool)" }}
          />
          <div className="relative">
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
              {current.name}
            </h3>
            <p className="mt-3 max-w-md text-lg leading-relaxed text-ink">
              {current.note}
            </p>
            <div className="mt-8 flex flex-wrap gap-2.5">
              {current.items.map((item) => (
                <span
                  key={item}
                  className="chip bg-surface/80 px-3.5 py-1.5 text-sm text-ink"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
