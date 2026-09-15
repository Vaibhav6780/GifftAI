import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useRealtimeSync } from "../../hooks/useRealtimeSync";

const SIDEBAR_HIDDEN_KEY = "sidebarHidden";

export function AppShell() {
  useRealtimeSync();
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  // Desktop-only "hide the sidebar" toggle, independent of the mobile drawer above --
  // persisted so the choice survives a reload instead of resetting every time.
  const [isSidebarHidden, setSidebarHidden] = useState(() => localStorage.getItem(SIDEBAR_HIDDEN_KEY) === "1");
  const { pathname } = useLocation();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_HIDDEN_KEY, isSidebarHidden ? "1" : "0");
  }, [isSidebarHidden]);

  // Close the mobile drawer whenever the route changes, e.g. after tapping a nav link.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Prevent the page behind the drawer from scrolling while it's open on mobile.
  useEffect(() => {
    document.body.style.overflow = isMobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileNavOpen]);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar
        isMobileOpen={isMobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        isDesktopHidden={isSidebarHidden}
        onToggleDesktop={() => setSidebarHidden((v) => !v)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
