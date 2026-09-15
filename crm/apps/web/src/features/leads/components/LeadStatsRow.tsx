import clsx from "clsx";
import type { LeadStatus, LeadStatusCounts } from "@gifftai/shared";
import { Skeleton } from "../../../components/ui/Skeleton";
import { STATUS_LABEL, STATUS_OPTIONS } from "../constants";

// Same literal colors STATUS_VARIANT already uses for the Status badge elsewhere on this
// page (White/Red/Yellow/Blue/Dark Gray, per the product spec) — reused here rather than
// introducing a separate palette, so "Hot" means the same red everywhere in the CRM, not
// just on this one row.
const TILE_STYLE: Record<LeadStatus, { activeRing: string; dot: string; text: string }> = {
  NEW: { activeRing: "ring-slate-400", dot: "bg-white ring-1 ring-inset ring-slate-300", text: "text-slate-700 dark:text-slate-300" },
  HOT: { activeRing: "ring-red-500", dot: "bg-red-500", text: "text-red-700 dark:text-red-400" },
  WARM: { activeRing: "ring-yellow-400", dot: "bg-yellow-400", text: "text-yellow-700 dark:text-yellow-400" },
  COLD: { activeRing: "ring-blue-500", dot: "bg-blue-500", text: "text-blue-700 dark:text-blue-400" },
  LOST: { activeRing: "ring-slate-600", dot: "bg-slate-700", text: "text-slate-800 dark:text-slate-300" },
};

interface TileProps {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  dotClassName?: string;
  activeRingClassName?: string;
  textClassName?: string;
}

function Tile({ label, value, active, onClick, dotClassName, activeRingClassName, textClassName }: TileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex min-w-[7.5rem] flex-1 flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900",
        active && clsx("ring-2 ring-offset-1 dark:ring-offset-slate-950", activeRingClassName),
      )}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        {dotClassName && <span className={clsx("size-1.5 rounded-full", dotClassName)} />}
        {label}
      </span>
      <span className={clsx("text-2xl font-semibold", textClassName ?? "text-slate-900 dark:text-slate-100")}>
        {value.toLocaleString()}
      </span>
    </button>
  );
}

export function LeadStatsRow({
  counts,
  isLoading,
  activeStatus,
  onSelectStatus,
}: {
  counts: LeadStatusCounts | undefined;
  isLoading: boolean;
  activeStatus: LeadStatus | "";
  onSelectStatus: (status: LeadStatus | "") => void;
}) {
  if (isLoading || !counts) {
    return (
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: STATUS_OPTIONS.length + 1 }).map((_, i) => (
          <Skeleton key={i} className="h-[4.5rem] min-w-[7.5rem] flex-1 rounded-xl" />
        ))}
      </div>
    );
  }

  const total = STATUS_OPTIONS.reduce((sum, status) => sum + counts[status], 0);

  return (
    <div className="flex flex-wrap gap-3">
      <Tile label="Total" value={total} active={activeStatus === ""} onClick={() => onSelectStatus("")} />
      {STATUS_OPTIONS.map((status) => (
        <Tile
          key={status}
          label={STATUS_LABEL[status]}
          value={counts[status]}
          active={activeStatus === status}
          onClick={() => onSelectStatus(activeStatus === status ? "" : status)}
          dotClassName={TILE_STYLE[status].dot}
          activeRingClassName={TILE_STYLE[status].activeRing}
          textClassName={TILE_STYLE[status].text}
        />
      ))}
    </div>
  );
}
