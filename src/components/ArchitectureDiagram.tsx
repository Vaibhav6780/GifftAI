import type { ArchitectureLayer } from "@/data/projects";
import { Reveal } from "./Reveal";

export function ArchitectureDiagram({
  layers,
}: {
  layers: ArchitectureLayer[];
}) {
  return (
    <div className="relative rounded-xl border border-line/10 bg-surface-2 p-6 sm:p-10">
      <div className="absolute inset-0 grid-field opacity-40" />
      <ol className="relative flex flex-col">
        {layers.map((layer, i) => (
          <Reveal as="li" key={layer.label} delay={i}>
            <div className="flex flex-col gap-2 rounded-lg border border-line/10 bg-bg/60 p-4 backdrop-blur sm:flex-row sm:items-center sm:gap-6 sm:p-5">
              <div className="flex items-center gap-3 sm:w-52 sm:shrink-0">
                <span className="font-mono text-[0.7rem] text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-display text-lg text-ink">
                  {layer.label}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted">
                {layer.detail}
              </p>
            </div>
            {i < layers.length - 1 ? (
              <div
                className="ml-[1.15rem] h-6 w-px bg-line/25 sm:ml-[6.5rem]"
                aria-hidden="true"
              />
            ) : null}
          </Reveal>
        ))}
      </ol>
    </div>
  );
}
