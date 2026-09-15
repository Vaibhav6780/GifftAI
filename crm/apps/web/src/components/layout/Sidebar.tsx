import {
  AlarmClock,
  Banknote,
  Building,
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  HandCoins,
  History,
  LayoutDashboard,
  LifeBuoy,
  ListTodo,
  Mail,
  MessageCircle,
  Newspaper,
  Plug,
  ScrollText,
  Send,
  ShieldCheck,
  Target,
  UserCheck,
  UserSquare2,
  Users,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import clsx from "clsx";
import type { PermissionKey } from "@gifftai/shared";
import { useAuthStore } from "../../features/auth/authStore";
import { useIsPrivileged } from "../../hooks/usePermission";

const navItems: { to: string; label: string; icon: typeof Users; permission?: PermissionKey }[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  // No permission gate — every employee can submit/view their own WFH & Leave requests,
  // same as GET /auth/me needing no permission.
  { to: "/attendance-requests", label: "WFH/Leave Requests", icon: CalendarClock },
  { to: "/converted-users", label: "Converted Users", icon: UserCheck, permission: "leads:read" },
];

function getCrmNavItems(
  currentUserId: string | undefined,
  isPrivileged: boolean,
): { to: string; label: string; icon: typeof Users; permission: PermissionKey }[] {
  return [
    // GifftAI CRM: primary brand is GIFTTAI — all lead navigation defaults to brand=GIFTTAI.
    { to: "/leads?brand=GIFTTAI", label: "Leads", icon: Target, permission: "leads:read" },
    // Same "self by default, editable for privileged" convention as Tasks below — a
    // follow-up is only actionable by its lead's owner (or an admin), so a regular
    // employee's worklist should start scoped to their own follow-ups.
    {
      to: isPrivileged
        ? "/leads/followups?brand=GIFTTAI"
        : `/leads/followups?brand=GIFTTAI&ownerId=${currentUserId ?? ""}`,
      label: "Follow-ups",
      icon: AlarmClock,
      permission: "leads:read",
    },
    // No owner scoping (unlike Follow-ups above) — this is a read-only activity view, same
    // as the main Leads list which every leads:read holder already sees unscoped.
    { to: "/leads/contacted?brand=GIFTTAI", label: "Contacted Today", icon: History, permission: "leads:read" },
    { to: "/whatsapp/inbox", label: "WhatsApp Inbox", icon: MessageCircle, permission: "leads:read" },
    { to: "/telegram/inbox", label: "Telegram Inbox", icon: Send, permission: "leads:read" },
    { to: "/mail", label: "Mail", icon: Mail, permission: "mail:read" },
    { to: "/contacts", label: "Contacts", icon: UserSquare2, permission: "contacts:read" },
    { to: "/companies", label: "Companies", icon: Building, permission: "companies:read" },
    // tickets:read is deliberately excluded from Admin's wildcard grant in
    // prisma/seed.ts, so this link only ever renders for Super Admin and the
    // Support Agent role (which holds it explicitly) — same pattern as Audit
    // Log below, but scoped to the team that actually works tickets.
    { to: "/tickets", label: "Tickets", icon: LifeBuoy, permission: "tickets:read" },
    // Regular employees land on "assigned to me" first — the filter bar on TasksListPage
    // can still be cleared to browse everyone's tasks for anyone with broader tasks:read
    // visibility. Admin/Super Admin skip straight to the unfiltered list, since they're
    // the ones who need the whole-team view by default.
    {
      to: isPrivileged ? "/tasks" : `/tasks?assignedToId=${currentUserId ?? ""}`,
      label: "Tasks",
      icon: ListTodo,
      permission: "tasks:read",
    },
  ];
}

const adminNavItems: { to: string; label: string; icon: typeof Users; permission: PermissionKey }[] = [
  { to: "/users", label: "Users", icon: Users, permission: "users:read" },
  { to: "/roles", label: "Roles", icon: ShieldCheck, permission: "roles:read" },
  { to: "/departments", label: "Departments", icon: Building2, permission: "departments:read" },
  { to: "/attendance", label: "Attendance", icon: Clock, permission: "attendance:read" },
  {
    to: "/attendance-requests/review",
    label: "WFH/Leave Approvals",
    icon: CalendarClock,
    permission: "attendance_requests:approve",
  },
  // audit:read is deliberately excluded from Admin's grant in prisma/seed.ts, so this
  // link only ever renders for Super Admin — same pattern as Attendance Approvals above.
  { to: "/audit", label: "Audit Log", icon: ScrollText, permission: "audit:read" },
  // Live requests proxied from gifftai.com — rm_requests:read is Super-Admin-only by
  // default in prisma/seed.ts, same convention as audit:read/tickets:read above, since
  // this surfaces real fund movement (RM Funding Requests' two-admin approve→credit flow).
  { to: "/rm-requests/funding", label: "RM Funding Requests", icon: Banknote, permission: "rm_requests:read" },
  { to: "/rm-requests/manual", label: "RM Manual Requests", icon: HandCoins, permission: "rm_requests:read" },
  // Manages gifftai.com/blog posts via that repo's admin API (same posts as
  // admin.gifftai.com). blog:read is Super-Admin-only by default in prisma/seed.ts,
  // same convention as RM/Audit above — grant to a marketing role via the Roles UI.
  { to: "/blog", label: "Blog", icon: Newspaper, permission: "blog:read" },
];

const settingsNavItems: { to: string; label: string; icon: typeof Users; permission: PermissionKey }[] = [
  { to: "/settings/integrations", label: "Integrations", icon: Plug, permission: "settings:manage_integrations" },
];

function navLinkClassName(isActive: boolean) {
  return clsx(
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-500"
      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
  );
}

interface SidebarProps {
  isMobileOpen: boolean;
  onClose: () => void;
  isDesktopHidden: boolean;
  onToggleDesktop: () => void;
}

export function Sidebar({ isMobileOpen, onClose, isDesktopHidden, onToggleDesktop }: SidebarProps) {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isPrivileged = useIsPrivileged();
  const crmNavItems = getCrmNavItems(currentUserId, isPrivileged);
  const visibleNavItems = navItems.filter((item) => !item.permission || permissions.includes(item.permission));
  const visibleCrmItems = crmNavItems.filter((item) => permissions.includes(item.permission));
  const visibleAdminItems = adminNavItems.filter((item) => permissions.includes(item.permission));
  const visibleSettingsItems = settingsNavItems.filter((item) => permissions.includes(item.permission));

  return (
    <>
      {/* Backdrop, mobile only: tapping it closes the drawer */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 sm:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white transition-all duration-200 ease-in-out dark:border-slate-800 dark:bg-slate-900",
          "sm:static sm:z-auto sm:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          isDesktopHidden ? "sm:w-0 sm:border-r-0" : "sm:w-60",
        )}
      >
        {/* Fixed width regardless of the <aside>'s animated width, so content clips via the
            parent's overflow-hidden instead of reflowing/wrapping mid-animation. */}
        <div className="flex h-full w-64 shrink-0 flex-col sm:w-60">
          <div className="flex h-16 shrink-0 items-center justify-between px-5 text-lg font-semibold text-slate-900 dark:text-slate-100">
            GifftAI CRM
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation menu"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 sm:hidden dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X size={20} />
            </button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
            {visibleNavItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => navLinkClassName(isActive)}>
                <Icon size={18} />
                {label}
              </NavLink>
            ))}

            {visibleCrmItems.length > 0 && (
              <>
                <div className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  GifftAI
                </div>
                {visibleCrmItems.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => navLinkClassName(isActive)}>
                    <Icon size={18} />
                    {label}
                  </NavLink>
                ))}
              </>
            )}

            {visibleAdminItems.length > 0 && (
              <>
                <div className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Administration
                </div>
                {visibleAdminItems.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => navLinkClassName(isActive)}>
                    <Icon size={18} />
                    {label}
                  </NavLink>
                ))}
              </>
            )}

            {visibleSettingsItems.length > 0 && (
              <>
                <div className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Settings
                </div>
                {visibleSettingsItems.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => navLinkClassName(isActive)}>
                    <Icon size={18} />
                    {label}
                  </NavLink>
                ))}
              </>
            )}
          </nav>
        </div>
      </aside>
      {/* A sibling of <aside>, not a child -- the aside clips to overflow-hidden while its
          width animates to 0 when collapsed, which would hide a child button along with it.
          Fixed positioning (relative to the viewport, not the aside) keeps this clickable
          in both states, tracking the sidebar's edge as it animates. */}
      <button
        type="button"
        onClick={onToggleDesktop}
        aria-label={isDesktopHidden ? "Show sidebar" : "Hide sidebar"}
        className={clsx(
          "fixed top-1/2 z-50 hidden -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white p-1 text-slate-500 shadow-md transition-[left] duration-200 ease-in-out hover:bg-slate-100 hover:text-slate-700 sm:flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
          isDesktopHidden ? "left-1" : "left-[14.5rem]",
        )}
      >
        {isDesktopHidden ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </>
  );
}
