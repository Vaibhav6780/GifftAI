"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * An original interactive technical composition — a small living software
 * system. Layered UI fragments, a data-flow layer and connected nodes,
 * with a restrained pointer parallax. Reads well in both themes.
 */
export function HeroComposition() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), {
    stiffness: 120,
    damping: 18,
  });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), {
    stiffness: 120,
    damping: 18,
  });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function reset() {
    mx.set(0);
    my.set(0);
  }

  const d1 = reduced ? 0 : 14;
  const d2 = reduced ? 0 : 26;
  const d3 = reduced ? 0 : 40;

  const l1 = {
    x: useTransform(mx, [-0.5, 0.5], [-d1, d1]),
    y: useTransform(my, [-0.5, 0.5], [-d1, d1]),
  };
  const l2 = {
    x: useTransform(mx, [-0.5, 0.5], [-d2, d2]),
    y: useTransform(my, [-0.5, 0.5], [-d2, d2]),
  };
  const l3 = {
    x: useTransform(mx, [-0.5, 0.5], [-d3, d3]),
    y: useTransform(my, [-0.5, 0.5], [-d3, d3]),
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className="relative aspect-[4/3] w-full select-none [perspective:1400px]"
    >
      <motion.div
        style={{ rotateX: reduced ? 0 : rx, rotateY: reduced ? 0 : ry }}
        className="relative h-full w-full [transform-style:preserve-3d]"
      >
        {/* connection / data-flow layer */}
        <svg
          viewBox="0 0 400 300"
          className="absolute inset-0 h-full w-full overflow-visible"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="flow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0" />
              <stop offset="50%" stopColor="rgb(var(--accent))" stopOpacity="0.9" />
              <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g stroke="currentColor" className="text-line/20" strokeWidth="1">
            <path d="M70 90 C 140 90, 150 200, 220 200" />
            <path d="M220 200 C 290 200, 300 110, 340 110" />
            <path d="M70 90 C 120 40, 260 40, 340 110" />
            <path d="M150 250 L 300 250" />
          </g>
          {!reduced && (
            <>
              <motion.circle
                r="3"
                fill="rgb(var(--accent))"
                initial={{ offsetDistance: "0%" }}
                animate={{ offsetDistance: "100%" }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                style={{
                  offsetPath:
                    'path("M70 90 C 140 90, 150 200, 220 200 C 290 200, 300 110, 340 110")',
                }}
              />
              <motion.circle
                r="2"
                fill="currentColor"
                className="text-ink"
                initial={{ offsetDistance: "0%" }}
                animate={{ offsetDistance: "100%" }}
                transition={{
                  duration: 5.5,
                  repeat: Infinity,
                  ease: "linear",
                  delay: 1,
                }}
                style={{
                  offsetPath: 'path("M70 90 C 120 40, 260 40, 340 110")',
                }}
              />
            </>
          )}
          {[
            [70, 90],
            [220, 200],
            [340, 110],
            [150, 250],
            [300, 250],
          ].map(([cx, cy], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={i === 0 ? 4 : 3}
              fill="rgb(var(--bg))"
              stroke={i === 0 ? "rgb(var(--accent))" : "currentColor"}
              className={i === 0 ? "" : "text-line/40"}
              strokeWidth="1.5"
            />
          ))}
        </svg>

        {/* Back panel — analytics */}
        <motion.div
          style={{ ...l1, translateZ: 0 }}
          className="absolute right-[4%] top-[6%] w-[52%] rounded-lg border bg-surface p-3 shadow-[0_20px_60px_-30px_rgb(var(--shadow-color)/0.35)]"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-wider text-faint">
              throughput
            </span>
            <span className="font-mono text-[9px] text-accent">live</span>
          </div>
          <div className="flex h-16 items-end gap-1">
            {[40, 58, 34, 70, 52, 82, 60, 92, 74].map((h, i) => (
              <span
                key={i}
                className={`w-full rounded-sm ${i === 7 ? "bg-accent/80" : "bg-line/15"}`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </motion.div>

        {/* Mid panel — console */}
        <motion.div
          style={l2}
          className="absolute left-[2%] top-[26%] w-[46%] rounded-lg border bg-surface p-3 shadow-[0_24px_70px_-32px_rgb(var(--shadow-color)/0.4)]"
        >
          <div className="mb-2 flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full border border-line/40" />
            <span className="h-1.5 w-1.5 rounded-full border border-line/40" />
            <span className="h-1.5 w-1.5 rounded-full border border-line/40" />
          </div>
          <div className="space-y-1.5 font-mono">
            {[
              { w: "72%", a: false },
              { w: "54%", a: true },
              { w: "63%", a: false },
              { w: "40%", a: false },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-[8px] text-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={`block h-1.5 rounded-full ${r.a ? "bg-accent/80" : "bg-line/15"}`}
                  style={{ width: r.w }}
                />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Front card — metric */}
        <motion.div
          style={l3}
          className="absolute bottom-[8%] right-[10%] w-[40%] rounded-lg border bg-surface p-4 shadow-[0_30px_80px_-30px_rgb(var(--shadow-color)/0.45)]"
        >
          <span className="font-mono text-[9px] uppercase tracking-wider text-faint">
            uptime
          </span>
          <p className="mt-1 font-display text-2xl text-ink">99.98%</p>
          <div className="mt-3 h-1 w-full rounded-full bg-line/15">
            <span className="block h-full w-[92%] rounded-full bg-accent" />
          </div>
        </motion.div>

        {/* floating annotation */}
        <motion.div
          style={l3}
          className="absolute left-[8%] top-[8%] flex items-center gap-1.5 rounded-full border bg-bg/80 px-2.5 py-1 backdrop-blur"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted">
            system.ok
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}
