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
      {/* glow + backdrop so the composition reads as a designed object */}
      <div
        className="pointer-events-none absolute -inset-8 rounded-[2rem] opacity-80 blur-2xl"
        style={{
          background:
            "radial-gradient(60% 60% at 65% 35%, var(--glow-warm), transparent 70%), radial-gradient(50% 50% at 20% 80%, var(--glow-cool), transparent 70%)",
        }}
      />
      <div className="absolute inset-0 rounded-2xl border border-line/15 bg-surface-3/60 shadow-elev-3 backdrop-blur-sm" />
      <div className="absolute inset-0 overflow-hidden rounded-2xl grid-field-strong opacity-[0.5]" />

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
              <circle
                r="3"
                fill="rgb(var(--accent))"
                className="animate-flow-dot"
                style={{
                  offsetPath:
                    'path("M70 90 C 140 90, 150 200, 220 200 C 290 200, 300 110, 340 110")',
                }}
              />
              <circle
                r="2.5"
                fill="rgb(var(--accent-2))"
                className="animate-flow-dot"
                style={{
                  offsetPath: 'path("M70 90 C 120 40, 260 40, 340 110")',
                  animationDuration: "5.5s",
                  animationDelay: "1s",
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
          className="card absolute right-[4%] top-[6%] w-[52%] rounded-lg p-3 shadow-elev-3"
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
                className={`w-full rounded-sm ${
                  i === 7 ? "bg-accent" : i === 5 ? "bg-accent-2/50" : "bg-line/15"
                }`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </motion.div>

        {/* Mid panel — console */}
        <motion.div
          style={l2}
          className="card absolute left-[2%] top-[26%] w-[46%] rounded-lg p-3 shadow-elev-3"
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
                  className={`block h-1.5 rounded-full ${
                    r.a ? "bg-accent" : i === 2 ? "bg-accent-2/50" : "bg-line/15"
                  }`}
                  style={{ width: r.w }}
                />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Front card — metric */}
        <motion.div
          style={l3}
          className="card absolute bottom-[8%] right-[10%] w-[40%] rounded-lg p-4 shadow-elev-4"
        >
          <span className="font-mono text-[9px] uppercase tracking-wider text-faint">
            uptime
          </span>
          <p className="mt-1 font-display text-2xl text-ink">99.98%</p>
          <div className="mt-3 h-1 w-full rounded-full bg-line/15">
            <span
              className="block h-full w-[92%] rounded-full"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, rgb(var(--accent-2)), rgb(var(--accent)))",
              }}
            />
          </div>
        </motion.div>

        {/* floating annotation */}
        <motion.div
          style={l3}
          className="glass absolute left-[8%] top-[8%] flex items-center gap-1.5 rounded-full border border-line/20 px-2.5 py-1 shadow-elev-2"
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
