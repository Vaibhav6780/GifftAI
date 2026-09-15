import { useEffect, useState } from "react";
import { Building2, Clock, Wifi, WifiOff } from "lucide-react";
import { isPastOvertimeCutoff } from "@gifftai/shared";
import { useExtendOvertime, useGoOffline, useGoOnline, useMyAttendanceStatus } from "../api";
import { useAuthStore } from "../../auth/authStore";
import { API_URL } from "../../../lib/apiClient";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Modal } from "../../../components/ui/Modal";
import { toast } from "../../../components/ui/Toast";

/** "20:00" -> "8:00 PM" -- `overtimeExtensionTime`/`extendedExitTime` (as HH:mm) is a fixed
 *  admin-configured wall-clock time, not a full timestamp, so it needs its own formatter
 *  rather than `new Date(...).toLocaleTimeString()`. */
function formatHHmm(hhmm: string): string {
  const [hours, minutes] = hhmm.split(":").map(Number) as [number, number];
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/** Re-renders this component roughly once a minute so the "Extend Hours" button appears on
 *  its own once 6:30 PM IST passes, without needing a page refresh. */
function useOvertimeCutoffTick(): boolean {
  const [pastCutoff, setPastCutoff] = useState(() => isPastOvertimeCutoff());

  useEffect(() => {
    const interval = setInterval(() => setPastCutoff(isPastOvertimeCutoff()), 60_000);
    return () => clearInterval(interval);
  }, []);

  return pastCutoff;
}

/**
 * A Remote session has no heartbeat to notice it went stale, so closing the tab (without
 * clicking Offline or logging out) has to actively tell the server. `pagehide` + a raw
 * `fetch(..., { keepalive: true })` is the reliable way to fire a request during unload —
 * `navigator.sendBeacon` can't attach the Authorization header this API needs. Office
 * sessions intentionally don't get this listener: they're entry/exit-only and stay open
 * until the Offline button is clicked, even across a browser close.
 */
function useCloseRemoteSessionOnUnload(isOnline: boolean, isRemote: boolean) {
  useEffect(() => {
    if (!isOnline || !isRemote) return;

    function handlePageHide() {
      const accessToken = useAuthStore.getState().accessToken;
      if (!accessToken) return;
      fetch(`${API_URL}/attendance/offline`, {
        method: "POST",
        keepalive: true,
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => {});
    }

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [isOnline, isRemote]);
}

export function AttendanceToggle() {
  const { data: status, isLoading } = useMyAttendanceStatus();
  const goOnline = useGoOnline();
  const goOffline = useGoOffline();
  const extendOvertime = useExtendOvertime();
  const pastCutoff = useOvertimeCutoffTick();
  const [extendModalOpen, setExtendModalOpen] = useState(false);

  const isOnline = status?.status === "ONLINE";
  const isRemote = status?.location === "REMOTE";
  useCloseRemoteSessionOnUnload(isOnline, isRemote);

  if (isLoading || !status) return null;

  const canExtendOvertime = isOnline && pastCutoff && !status.extendedExitTime;

  function handleClick() {
    if (isOnline) {
      goOffline.mutate(undefined, {
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to go offline"),
      });
    } else {
      goOnline.mutate(undefined, {
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to go online"),
      });
    }
  }

  function handleConfirmExtend() {
    extendOvertime.mutate(undefined, {
      onSuccess: (updated) => {
        setExtendModalOpen(false);
        const time = updated.extendedExitTime
          ? new Date(updated.extendedExitTime).toLocaleTimeString()
          : formatHHmm(updated.overtimeExtensionTime);
        toast.success(`Hours extended until ${time}`);
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to extend hours"),
    });
  }

  return (
    <div className="flex items-center gap-2">
      {isOnline && (
        <Badge variant={status.location === "OFFICE" ? "info" : "warning"}>
          <Building2 size={12} />
          {status.location === "OFFICE" ? "Office" : "Remote"}
        </Badge>
      )}
      {isOnline && status.extendedExitTime && (
        <Badge variant="info">
          <Clock size={12} />
          Extended to {new Date(status.extendedExitTime).toLocaleTimeString()}
        </Badge>
      )}
      {canExtendOvertime && (
        <Button size="sm" variant="secondary" onClick={() => setExtendModalOpen(true)}>
          <Clock size={16} />
          <span className="hidden sm:inline">Extend Hours</span>
        </Button>
      )}
      <Button
        size="sm"
        variant={isOnline ? "secondary" : "primary"}
        onClick={handleClick}
        isLoading={goOnline.isPending || goOffline.isPending}
      >
        {isOnline ? <WifiOff size={16} /> : <Wifi size={16} />}
        <span className="hidden sm:inline">{isOnline ? "Go Offline" : "Go Online"}</span>
      </Button>

      <Modal open={extendModalOpen} onClose={() => setExtendModalOpen(false)} title="Extend Hours">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Extend your hours until <strong>{formatHHmm(status.overtimeExtensionTime)}</strong>? Only available
            from the office network, and can be used once per attendance day — your actual logout time is still
            recorded separately when you go offline.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setExtendModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmExtend} isLoading={extendOvertime.isPending}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
