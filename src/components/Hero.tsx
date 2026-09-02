"use client";

import { motion } from "framer-motion";
import { HeroComposition } from "./HeroComposition";
import { MagneticButton, ArrowRight } from "./MagneticButton";

const proof = [
  { v: "25 years", k: "of service" },
  { v: "99.9%", k: "uptime target" },
  { v: "2 weeks", k: "to first release" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 sm:pt-40">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] grid-field opacity-[0.5]" />
      <div
        className="pointer-events-none absolute -right-40 -top-24 h-[560px] w-[560px] rounded-full opacity-70 blur-3xl"
        style={{ background: "var(--glow-warm)" }}
      />
      <div
        className="pointer-events-none absolute -left-48 top-40 h-[440px] w-[440px] rounded-full opacity-60 blur-3xl"
        style={{ background: "var(--glow-cool)" }}
      />

      <div className="shell relative grid items-center gap-12 pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-28">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="chip font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            Software engineering · AI · Products
          </motion.span>

          <h1 className="mt-6 text-display-lg text-ink">
            {["We build software", "that moves", "businesses forward."].map(
              (line, i) => (
                <span key={i} className="block overflow-hidden pb-[0.08em]">
                  <motion.span
                    className="block"
                    initial={{ y: "110%" }}
                    animate={{ y: 0 }}
                    transition={{
                      duration: 0.9,
                      delay: 0.1 + i * 0.09,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    {i === 2 ? (
                      <>
                        <span className="text-gradient">businesses</span> forward.
                      </>
                    ) : (
                      line
                    )}
                  </motion.span>
                </span>
              ),
            )}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-7 max-w-xl text-lg leading-relaxed text-muted"
          >
            GIFFT AI designs and engineers web applications, SaaS platforms, AI
            systems and business software built for real-world scale.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.62 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <MagneticButton href="/contact">
              Start a Project
              <ArrowRight />
            </MagneticButton>
            <MagneticButton href="/projects" variant="ghost">
              Explore Our Work
              <ArrowRight />
            </MagneticButton>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.74 }}
            className="mt-12 flex flex-wrap gap-x-10 gap-y-5 border-t border-line/15 pt-6"
          >
            {proof.map((p) => (
              <div key={p.k}>
                <dt className="font-display text-2xl text-ink">{p.v}</dt>
                <dd className="mt-0.5 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">
                  {p.k}
                </dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <HeroComposition />
        </motion.div>
      </div>
    </section>
  );
}
