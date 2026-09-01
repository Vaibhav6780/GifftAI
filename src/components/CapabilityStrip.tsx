"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const capabilities = [
  "Software Engineering",
  "AI & Automation",
  "SaaS",
  "Web Apps",
  "Mobile",
  "Business Systems",
];

export function CapabilityStrip() {
  const reduced = useReducedMotion();
  const row = [...capabilities, ...capabilities];

  return (
    <section
      aria-label="Capabilities"
      className="border-y border-line/10 py-6 sm:py-8"
    >
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-bg to-transparent sm:w-28" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-bg to-transparent sm:w-28" />

        {reduced ? (
          <div className="shell flex flex-wrap justify-center gap-x-8 gap-y-3">
            {capabilities.map((c) => (
              <Item key={c} label={c} />
            ))}
          </div>
        ) : (
          <motion.div
            className="flex w-max gap-10 pr-10"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          >
            {row.map((c, i) => (
              <Item key={i} label={c} />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}

function Item({ label }: { label: string }) {
  return (
    <span className="flex shrink-0 items-center gap-3 text-sm text-muted">
      <span className="h-1 w-1 rounded-full bg-accent" />
      {label}
    </span>
  );
}
