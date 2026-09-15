import { LogOut, Menu } from "lucide-react";
import { useAuthStore } from "../../features/auth/authStore";
import { useLogout } from "../../features/auth/api";
import { AttendanceToggle } from "../../features/attendance/components/AttendanceToggle";
import { ThemeToggle } from "./ThemeToggle";

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation menu"
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 sm:hidden dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <Menu size={20} />
      </button>
      <div className="flex items-center gap-3">
        <AttendanceToggle />
        <ThemeToggle />
        {user && (
          <div className="flex items-center gap-2 text-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {initials(user.firstName, user.lastName)}
            </span>
            <span className="hidden text-slate-700 sm:inline dark:text-slate-200">
              {user.firstName} {user.lastName}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => logout.mutate()}
          aria-label="Log out"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
