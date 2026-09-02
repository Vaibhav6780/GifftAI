/**
 * SystemPreview — the visual identity motif.
 *
 * High-fidelity, art-directed fragments of software: dashboards, browser
 * windows, consoles, graphs and mobile frames. Built entirely from theme
 * tokens and a two-tone accent system (warm ember + cool steel), with real
 * depth — layered surfaces, inset highlights and elevation shadow.
 */
type Variant = "dashboard" | "browser" | "mobile" | "console" | "graph";

export function SystemPreview({
  variant,
  className = "",
  label,
}: {
  variant: Variant;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-line/20 bg-surface-2 shadow-elev-2 ${className}`}
      role="img"
      aria-label={label ?? `${variant} interface preview`}
    >
      {/* ambient tint */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-70 blur-2xl"
        style={{ background: "var(--glow-warm)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full opacity-70 blur-2xl"
        style={{ background: "var(--glow-cool)" }}
      />
      <div className="relative h-full w-full p-3.5 sm:p-5">
        {variant === "dashboard" && <Dashboard />}
        {variant === "browser" && <Browser />}
        {variant === "mobile" && <Mobile />}
        {variant === "console" && <Console />}
        {variant === "graph" && <Graph />}
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
    </div>
  );
}

/* ---------- shared primitives ---------- */

function TrafficLights() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full bg-accent/80" />
      <span className="h-2.5 w-2.5 rounded-full bg-accent-2/70" />
      <span className="h-2.5 w-2.5 rounded-full bg-line/25" />
    </div>
  );
}

function WindowBar({ url }: { url?: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-line/15 pb-3">
      <TrafficLights />
      {url ? (
        <span className="flex h-6 flex-1 items-center gap-1.5 rounded-md border border-line/15 bg-bg/60 px-2 font-mono text-[9px] text-faint">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-2/70" />
          {url}
        </span>
      ) : (
        <span className="h-6 flex-1 rounded-md border border-line/15 bg-bg/50" />
      )}
    </div>
  );
}

function Bar({ w, tone = "line" }: { w: string; tone?: "line" | "accent" | "accent2" }) {
  const bg =
    tone === "accent"
      ? "bg-accent/80"
      : tone === "accent2"
        ? "bg-accent-2/70"
        : "bg-line/15";
  return <span className={`block h-2 rounded-full ${bg}`} style={{ width: w }} />;
}

/* ---------- dashboard ---------- */

function Dashboard() {
  const stats = [
    { k: "Revenue", v: "$42.6k", d: "+12.4%", up: true },
    { k: "Active", v: "1,284", d: "+3.1%", up: true },
    { k: "Churn", v: "1.8%", d: "-0.4%", up: false },
  ];
  const bars = [38, 52, 30, 64, 46, 72, 55, 84, 60, 92, 70, 78];
  return (
    <div className="flex h-full flex-col gap-3">
      <WindowBar />
      <div className="grid grid-cols-3 gap-2.5">
        {stats.map((s) => (
          <div
            key={s.k}
            className="rounded-lg border border-line/15 bg-surface p-2.5 shadow-elev-1"
          >
            <span className="block font-mono text-[8px] uppercase tracking-wider text-faint">
              {s.k}
            </span>
            <span className="mt-1 block font-display text-sm text-ink">
              {s.v}
            </span>
            <span
              className={`mt-0.5 inline-block font-mono text-[8px] ${
                s.up ? "text-accent-2" : "text-accent"
              }`}
            >
              {s.d}
            </span>
          </div>
        ))}
      </div>
      <div className="flex-1 rounded-lg border border-line/15 bg-surface p-3 shadow-elev-1">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[8px] uppercase tracking-wider text-faint">
            Throughput
          </span>
          <span className="flex items-center gap-1 font-mono text-[8px] text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            live
          </span>
        </div>
        <div className="flex h-[calc(100%-1.25rem)] items-end gap-1">
          {bars.map((h, i) => (
            <span
              key={i}
              className={`w-full rounded-t ${
                i === 9 ? "bg-accent" : i === 7 ? "bg-accent-2/60" : "bg-line/15"
              }`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
      <div className="space-y-1.5 rounded-lg border border-line/15 bg-surface p-2.5">
        <Bar w="82%" />
        <Bar w="58%" tone="accent" />
        <Bar w="68%" tone="accent2" />
      </div>
    </div>
  );
}

/* ---------- browser ---------- */

function Browser() {
  return (
    <div className="flex h-full flex-col gap-3">
      <WindowBar url="app.gifftai.com/overview" />
      <div className="grid flex-1 grid-cols-5 gap-2.5">
        <div className="col-span-2 space-y-2 rounded-lg border border-line/15 bg-surface p-2.5 shadow-elev-1">
          <span className="mb-1 block h-1.5 w-10 rounded-full bg-accent/70" />
          <Bar w="80%" />
          <Bar w="95%" />
          <Bar w="60%" tone="accent2" />
          <Bar w="88%" />
          <Bar w="45%" />
          <Bar w="72%" />
        </div>
        <div className="col-span-3 flex flex-col rounded-lg border border-line/15 bg-surface p-3 shadow-elev-1">
          <span className="mb-2 block h-2.5 w-1/2 rounded-full bg-ink/75" />
          <div className="space-y-1.5">
            <Bar w="100%" />
            <Bar w="92%" />
            <Bar w="97%" />
            <Bar w="64%" />
          </div>
          <div className="mt-auto flex items-center gap-2 pt-3">
            <span
              className="inline-block h-6 w-20 rounded-full"
              style={{
                backgroundImage:
                  "linear-gradient(120deg, rgb(var(--accent)), rgb(var(--accent-hi)))",
              }}
            />
            <span className="inline-block h-6 w-14 rounded-full border border-line/20" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- mobile ---------- */

function Mobile() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="relative h-full max-h-[300px] w-[168px] rounded-[1.9rem] border border-line/25 bg-surface p-2.5 shadow-elev-3">
        <span className="pointer-events-none absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-line/25" />
        <div className="flex h-full flex-col gap-2.5 overflow-hidden rounded-[1.4rem] border border-line/15 bg-bg/60 p-2.5 pt-4">
          <div className="flex items-center justify-between">
            <span className="block h-2 w-14 rounded-full bg-ink/70" />
            <span className="h-5 w-5 rounded-full border border-line/20 bg-surface" />
          </div>
          <div
            className="rounded-lg p-2.5"
            style={{
              backgroundImage:
                "linear-gradient(135deg, rgb(var(--accent) / 0.16), rgb(var(--accent-2) / 0.12))",
            }}
          >
            <span className="block font-mono text-[8px] uppercase tracking-wider text-faint">
              Balance
            </span>
            <span className="mt-0.5 block font-display text-base text-ink">
              $8,412
            </span>
            <span className="mt-1 h-1 w-2/3 rounded-full bg-accent/70" />
          </div>
          {[
            { w: "80%", t: "accent" as const },
            { w: "62%", t: "accent2" as const },
            { w: "70%", t: "line" as const },
          ].map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-line/15 bg-surface p-2 shadow-elev-1"
            >
              <span className="h-6 w-6 shrink-0 rounded-md bg-line/12" />
              <div className="flex-1 space-y-1">
                <Bar w={r.w} tone={r.t} />
                <Bar w="40%" />
              </div>
            </div>
          ))}
          <span
            className="mt-auto block h-8 w-full rounded-full"
            style={{
              backgroundImage:
                "linear-gradient(120deg, rgb(var(--accent)), rgb(var(--accent-hi)))",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------- console ---------- */

function Console() {
  const lines = [
    { i: 0, w: "44%", tok: "kw" },
    { i: 1, w: "72%", tok: "str" },
    { i: 1, w: "58%", tok: "fn" },
    { i: 2, w: "66%", tok: "dim" },
    { i: 0, w: "40%", tok: "kw" },
    { i: 1, w: "78%", tok: "str" },
    { i: 1, w: "52%", tok: "dim" },
    { i: 2, w: "46%", tok: "fn" },
  ];
  const tokBg: Record<string, string> = {
    kw: "bg-accent/80",
    str: "bg-accent-2/60",
    fn: "bg-ink/40",
    dim: "bg-line/15",
  };
  return (
    <div className="flex h-full flex-col gap-3">
      <WindowBar />
      <div className="flex-1 space-y-2 rounded-lg border border-line/15 bg-surface p-3 font-mono shadow-elev-1">
        {lines.map((l, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2"
            style={{ paddingLeft: `${l.i * 14}px` }}
          >
            <span className="w-3 text-right text-[8px] text-faint">
              {idx + 1}
            </span>
            {l.i === 0 ? (
              <span className="text-[9px] text-accent">▸</span>
            ) : null}
            <span
              className={`block h-2 rounded-full ${tokBg[l.tok]}`}
              style={{ width: l.w }}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-line/15 bg-surface px-2.5 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-accent-2" />
        <span className="font-mono text-[8px] uppercase tracking-wider text-faint">
          build passed · 1.2s
        </span>
      </div>
    </div>
  );
}

/* ---------- graph ---------- */

function Graph() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[8px] uppercase tracking-wider text-faint">
          Retention cohort
        </span>
        <div className="flex items-center gap-2.5 font-mono text-[8px] text-faint">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> now
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-2" /> prev
          </span>
        </div>
      </div>
      <div className="flex-1 rounded-lg border border-line/15 bg-surface p-2.5 shadow-elev-1">
        <svg viewBox="0 0 240 120" className="h-full w-full" fill="none">
          <defs>
            <linearGradient id="sp-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.28" />
              <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g stroke="currentColor" className="text-line/15" strokeWidth="1">
            <line x1="0" y1="30" x2="240" y2="30" />
            <line x1="0" y1="60" x2="240" y2="60" />
            <line x1="0" y1="90" x2="240" y2="90" />
          </g>
          <path
            d="M0 96 C 40 88 62 66 100 70 S 162 36 200 54 S 230 50 240 50"
            stroke="rgb(var(--accent-2))"
            strokeWidth="1.75"
            strokeOpacity="0.85"
            strokeDasharray="3 3"
          />
          <path
            d="M0 104 L0 82 C 40 74 66 44 104 48 S 170 20 208 32 S 232 30 240 28 L240 104 Z"
            fill="url(#sp-fill)"
          />
          <path
            d="M0 82 C 40 74 66 44 104 48 S 170 20 208 32 S 232 30 240 28"
            stroke="rgb(var(--accent))"
            strokeWidth="2.25"
          />
          {[
            [104, 48],
            [208, 32],
            [240, 28],
          ].map(([cx, cy], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r="3"
              fill="rgb(var(--surface))"
              stroke="rgb(var(--accent))"
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[
          ["MRR", "accent"],
          ["NRR", "accent2"],
          ["CAC", "line"],
          ["LTV", "line"],
        ].map(([k, t]) => (
          <div
            key={k}
            className="rounded-lg border border-line/15 bg-surface p-1.5 shadow-elev-1"
          >
            <span className="block font-mono text-[8px] uppercase tracking-wider text-faint">
              {k}
            </span>
            <span
              className={`mt-1 block h-1.5 w-6 rounded-full ${
                t === "accent"
                  ? "bg-accent/80"
                  : t === "accent2"
                    ? "bg-accent-2/70"
                    : "bg-line/20"
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
