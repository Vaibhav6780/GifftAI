/**
 * SystemPreview — the visual identity motif.
 *
 * Abstract, art-directed fragments of software: dashboards, browser windows,
 * consoles, graphs and mobile frames. No stock imagery, no fake 3D — just
 * line, grid and a single restrained accent. Renders identically in both
 * themes because every colour is a theme token.
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
      className={`relative overflow-hidden rounded-lg border bg-surface ${className}`}
      role="img"
      aria-label={label ?? `${variant} interface preview`}
    >
      <div className="absolute inset-0 grid-field opacity-60" />
      <div className="relative h-full w-full p-4 sm:p-6">
        {variant === "dashboard" && <Dashboard />}
        {variant === "browser" && <Browser />}
        {variant === "mobile" && <Mobile />}
        {variant === "console" && <Console />}
        {variant === "graph" && <Graph />}
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-line/10" />
    </div>
  );
}

function Chrome() {
  return (
    <div className="mb-4 flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full border border-line/30" />
      <span className="h-2 w-2 rounded-full border border-line/30" />
      <span className="h-2 w-2 rounded-full border border-line/30" />
    </div>
  );
}

function Bar({ w, accent = false }: { w: string; accent?: boolean }) {
  return (
    <span
      className={`block h-2 rounded-full ${accent ? "bg-accent/70" : "bg-line/12"}`}
      style={{ width: w }}
    />
  );
}

function Dashboard() {
  return (
    <div className="flex h-full flex-col gap-4">
      <Chrome />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-md border p-3">
            <span className="mb-2 block h-1.5 w-8 rounded-full bg-line/15" />
            <span className="block font-mono text-sm text-ink">
              {["128", "42.6k", "99.9%"][i]}
            </span>
          </div>
        ))}
      </div>
      <div className="flex-1 rounded-md border p-3">
        <div className="flex h-full items-end gap-1.5">
          {[38, 52, 30, 64, 46, 72, 55, 84, 60, 92, 70, 78].map((h, i) => (
            <span
              key={i}
              className={`w-full rounded-sm ${i === 9 ? "bg-accent/70" : "bg-line/12"}`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Bar w="80%" />
        <Bar w="55%" accent />
        <Bar w="68%" />
      </div>
    </div>
  );
}

function Browser() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-3">
        <Chrome />
        <span className="ml-1 block h-4 flex-1 rounded-full border" />
      </div>
      <div className="grid flex-1 grid-cols-5 gap-3">
        <div className="col-span-2 space-y-2.5 rounded-md border p-3">
          <Bar w="70%" />
          <Bar w="90%" />
          <Bar w="50%" accent />
          <Bar w="80%" />
          <Bar w="40%" />
        </div>
        <div className="col-span-3 rounded-md border p-3">
          <span className="mb-3 block h-2.5 w-1/2 rounded-full bg-ink/70" />
          <div className="space-y-2">
            <Bar w="100%" />
            <Bar w="92%" />
            <Bar w="96%" />
            <Bar w="60%" />
          </div>
          <span className="mt-4 inline-block h-6 w-24 rounded-full bg-accent/70" />
        </div>
      </div>
    </div>
  );
}

function Mobile() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-full max-h-[280px] w-[150px] rounded-[1.6rem] border p-3">
        <span className="mx-auto mb-4 block h-1 w-8 rounded-full bg-line/20" />
        <span className="mb-3 block h-2.5 w-2/3 rounded-full bg-ink/70" />
        <div className="space-y-2.5">
          <div className="rounded-md border p-2.5">
            <Bar w="80%" />
            <span className="mt-2 block" />
            <Bar w="55%" accent />
          </div>
          <div className="rounded-md border p-2.5">
            <Bar w="70%" />
            <span className="mt-2 block" />
            <Bar w="45%" />
          </div>
          <div className="rounded-md border p-2.5">
            <Bar w="65%" />
          </div>
        </div>
        <span className="mt-4 block h-7 w-full rounded-full bg-accent/70" />
      </div>
    </div>
  );
}

function Console() {
  const lines = [
    { indent: 0, w: "42%", tag: "▸" },
    { indent: 1, w: "70%" },
    { indent: 1, w: "58%", accent: true },
    { indent: 2, w: "64%" },
    { indent: 0, w: "38%", tag: "▸" },
    { indent: 1, w: "76%" },
    { indent: 1, w: "50%" },
    { indent: 2, w: "44%", accent: true },
  ];
  return (
    <div className="flex h-full flex-col gap-4">
      <Chrome />
      <div className="flex-1 space-y-2.5 font-mono">
        {lines.map((l, i) => (
          <div
            key={i}
            className="flex items-center gap-2"
            style={{ paddingLeft: `${l.indent * 16}px` }}
          >
            <span className="text-[10px] text-faint">
              {String(i + 1).padStart(2, "0")}
            </span>
            {l.tag ? (
              <span className="text-[10px] text-accent">{l.tag}</span>
            ) : null}
            <span
              className={`block h-2 rounded-full ${l.accent ? "bg-accent/70" : "bg-line/12"}`}
              style={{ width: l.w }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function Graph() {
  return (
    <div className="flex h-full flex-col gap-4">
      <Chrome />
      <svg viewBox="0 0 240 140" className="w-full flex-1" fill="none">
        <g stroke="currentColor" className="text-line/15" strokeWidth="1">
          <line x1="0" y1="35" x2="240" y2="35" />
          <line x1="0" y1="70" x2="240" y2="70" />
          <line x1="0" y1="105" x2="240" y2="105" />
        </g>
        <path
          d="M0 110 C 40 90, 55 40, 90 55 S 150 120, 185 60 S 220 20, 240 30"
          stroke="currentColor"
          className="text-line/25"
          strokeWidth="1.5"
        />
        <path
          d="M0 120 C 45 110, 60 70, 100 78 S 160 40, 200 66 S 228 55, 240 58"
          stroke="rgb(var(--accent))"
          strokeWidth="2"
        />
        {[
          [100, 78],
          [200, 66],
          [240, 58],
        ].map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r="3"
            fill="rgb(var(--bg))"
            stroke="rgb(var(--accent))"
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="grid grid-cols-4 gap-2">
        {["MRR", "Churn", "NRR", "CAC"].map((k) => (
          <div key={k} className="rounded-md border p-2">
            <span className="block font-mono text-[9px] uppercase tracking-wider text-faint">
              {k}
            </span>
            <span className="mt-1 block h-1.5 w-6 rounded-full bg-line/15" />
          </div>
        ))}
      </div>
    </div>
  );
}
