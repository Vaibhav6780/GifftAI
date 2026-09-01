"use client";

import { motion } from "framer-motion";
import { HeroComposition } from "./HeroComposition";
import { MagneticButton, ArrowRight } from "./MagneticButton";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 sm:pt-40">
      <div className="absolute inset-x-0 top-0 h-[60vh] grid-field opacity-40" />
      <div
        className="pointer-events-none absolute -right-40 -top-20 h-[520px] w-[520px] rounded-full opacity-[0.10] blur-3xl"
        style={{ background: "rgb(var(--accent))" }}
      />

      <div className="shell relative grid items-center gap-12 pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-28">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="eyebrow flex items-center gap-2"
          >
            <span className="h-px w-6 bg-accent" />
            Software engineering · AI · Products
          </motion.span>

          <h1 className="mt-6 text-display-lg text-ink">
            {["We build software", "that moves", "businesses forward."].map(
              (line, i) => (
                <span key={i} className="block overflow-hidden">
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
                        that moves{" "}
                        <span className="text-accent">businesses</span> forward.
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
