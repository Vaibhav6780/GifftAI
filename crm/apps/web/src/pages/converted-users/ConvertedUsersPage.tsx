import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Coins, Search, UserCheck, Users } from "lucide-react";
import clsx from "clsx";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Table, Tbody, Td, Th, Thead, Tr } from "../../components/ui/Table";
import { EmptyState } from "../../components/ui/EmptyState";
import { CONVERTED_USERS_DATA } from "./convertedUsersData";
import { AI_STAKING_DATA } from "./aiStakingData";
import type { AccountStatus, ConvertedUser, KycStatus, TradingStatus } from "./types";

// Static sample data (apps/web/src/pages/converted-users/convertedUsersData.ts and
// aiStakingData.ts) — no backend/database wiring yet. Replace with real API calls (and drop
// the client-side summary/search/pagination below) once those endpoints exist.
const PAGE_SIZE = 25;

const TRADING_STATUS_LABEL: Record<TradingStatus, string> = {
  active: "Active",
  inactive: "Inactive",
};

const TRADING_STATUS_VARIANT: Record<TradingStatus, "success" | "neutral"> = {
  active: "success",
  inactive: "neutral",
};

const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  active: "Active",
  dormant: "Dormant",
  suspended: "Suspended",
};

const ACCOUNT_STATUS_VARIANT: Record<AccountStatus, "success" | "neutral" | "danger"> = {
  active: "success",
  dormant: "neutral",
  suspended: "danger",
};

const KYC_STATUS_LABEL: Record<KycStatus, string> = {
  verified: "Verified",
  pending: "Pending",
  rejected: "Rejected",
};

const KYC_STATUS_VARIANT: Record<KycStatus, "success" | "warning" | "danger"> = {
  verified: "success",
  pending: "warning",
  rejected: "danger",
};

function formatCurrency(amount: number) {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

type ViewMode = "users" | "staking";
type UserFilterKey = "all" | "active-traders" | "has-deposits" | "has-withdrawals";

const USER_FILTERS: Record<UserFilterKey, { predicate: (u: ConvertedUser) => boolean; description: string }> = {
  all: {
    predicate: () => true,
    description: "All converted users.",
  },
  "active-traders": {
    predicate: (u) => u.tradingStatus === "active",
    description: "Users with at least one trade (Trading Status: Active).",
  },
  "has-deposits": {
    predicate: (u) => u.totalDeposits > 0,
    description: "Users with a completed KYC and at least one deposit.",
  },
  "has-withdrawals": {
    predicate: (u) => u.totalWithdrawals > 0,
    description: "Users who have made at least one withdrawal.",
  },
};

const summary = {
  registeredUsers: CONVERTED_USERS_DATA.length,
  activeTraders: CONVERTED_USERS_DATA.filter(USER_FILTERS["active-traders"].predicate).length,
  totalDeposits: CONVERTED_USERS_DATA.reduce((sum, u) => sum + u.totalDeposits, 0),
  totalWithdrawals: CONVERTED_USERS_DATA.reduce((sum, u) => sum + u.totalWithdrawals, 0),
  aiStaking: AI_STAKING_DATA.reduce((sum, s) => sum + s.amount, 0),
};

type TileKey = UserFilterKey | "ai-staking";

const summaryTiles: {
  key: TileKey;
  label: string;
  value: string;
  icon: typeof Users;
  iconClassName: string;
}[] = [
  {
    key: "all",
    label: "Registered Users",
    value: summary.registeredUsers.toLocaleString("en-US"),
    icon: Users,
    iconClassName: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-500",
  },
  {
    key: "active-traders",
    label: "Active Traders",
    value: summary.activeTraders.toLocaleString("en-US"),
    icon: UserCheck,
    iconClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  {
    key: "has-deposits",
    label: "Total Deposits",
    value: formatCurrency(summary.totalDeposits),
    icon: ArrowDownToLine,
    iconClassName: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  },
  {
    key: "has-withdrawals",
    label: "Total Withdrawals",
    value: formatCurrency(summary.totalWithdrawals),
    icon: ArrowUpFromLine,
    iconClassName: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  },
  {
    key: "ai-staking",
    label: "AI Staking",
    value: formatCurrency(summary.aiStaking),
    icon: Coins,
    iconClassName: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  },
];

export function ConvertedUsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("users");
  const [userFilter, setUserFilter] = useState<UserFilterKey>("all");

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return CONVERTED_USERS_DATA.filter(USER_FILTERS[userFilter].predicate).filter(
      (u) =>
        !query ||
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.country.toLowerCase().includes(query) ||
        u.id.toLowerCase().includes(query),
    );
  }, [search, userFilter]);

  const filteredStaking = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return AI_STAKING_DATA;
    return AI_STAKING_DATA.filter(
      (s) =>
        s.investor.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.country.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query),
    );
  }, [search]);

  const filtered = viewMode === "users" ? filteredUsers : filteredStaking;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pageStaking = filteredStaking.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleTileClick(key: TileKey) {
    setSearch("");
    setPage(1);
    if (key === "ai-staking") {
      setViewMode((prev) => (prev === "staking" ? "users" : "staking"));
      return;
    }
    setViewMode("users");
    setUserFilter((prev) => (prev === key ? "all" : key));
  }

  const isTileActive = (key: TileKey) =>
    key === "ai-staking" ? viewMode === "staking" : viewMode === "users" && userFilter === key;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Converted Users</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Users who have converted from leads to trading accounts. Static preview data — not yet connected to live figures.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {summaryTiles.map(({ key, label, value, icon: Icon, iconClassName }) => {
          const isActive = isTileActive(key);
          return (
            <Card
              key={key}
              role="button"
              tabIndex={0}
              onClick={() => handleTileClick(key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleTileClick(key);
                }
              }}
              className={clsx(
                "flex cursor-pointer items-center gap-4 p-4 text-left transition-shadow hover:shadow-md",
                isActive && "ring-2 ring-brand-500 dark:ring-brand-500",
              )}
            >
              <div className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}>
                <Icon size={20} />
              </div>
              <div>
                <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input
            placeholder={
              viewMode === "users"
                ? "Search by name, email, country, or user ID"
                : "Search by investor, email, country, or staking ID"
            }
            value={search}
            className="pl-9"
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span>
            {viewMode === "users"
              ? USER_FILTERS[userFilter].description
              : `AI staking positions across ${AI_STAKING_DATA.length.toLocaleString("en-US")} accounts.`}
          </span>
          {(viewMode === "staking" || userFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setViewMode("users");
                setUserFilter("all");
                setSearch("");
                setPage(1);
              }}
            >
              Clear filter
            </Button>
          )}
        </div>
      </Card>

      {viewMode === "users" ? (
        <Table>
          <Thead>
            <Tr>
              <Th>User</Th>
              <Th>Country</Th>
              <Th>Registration Date</Th>
              <Th>KYC Status</Th>
              <Th>Trading Status</Th>
              <Th>Total Trades</Th>
              <Th>Total Deposits</Th>
              <Th>Total Withdrawals</Th>
              <Th>Account Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {pageUsers.map((user) => (
              <Tr key={user.id}>
                <Td className="font-medium text-slate-900 dark:text-slate-100">
                  {user.name}
                  <div className="text-xs font-normal text-slate-500 dark:text-slate-400">{user.email}</div>
                </Td>
                <Td>{user.country}</Td>
                <Td className="whitespace-nowrap">{formatDate(user.registrationDate)}</Td>
                <Td>
                  <Badge variant={KYC_STATUS_VARIANT[user.kycStatus]}>{KYC_STATUS_LABEL[user.kycStatus]}</Badge>
                </Td>
                <Td>
                  <Badge variant={TRADING_STATUS_VARIANT[user.tradingStatus]}>
                    {TRADING_STATUS_LABEL[user.tradingStatus]}
                  </Badge>
                </Td>
                <Td>{user.totalTrades.toLocaleString("en-US")}</Td>
                <Td className="font-mono">{formatCurrency(user.totalDeposits)}</Td>
                <Td className="font-mono">{formatCurrency(user.totalWithdrawals)}</Td>
                <Td>
                  <Badge variant={ACCOUNT_STATUS_VARIANT[user.accountStatus]}>
                    {ACCOUNT_STATUS_LABEL[user.accountStatus]}
                  </Badge>
                </Td>
              </Tr>
            ))}
            {pageUsers.length === 0 && (
              <Tr>
                <Td colSpan={9}>
                  <EmptyState
                    icon={Users}
                    title="No users found"
                    description="Try adjusting your search or clearing the selected filter."
                  />
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Investor</Th>
              <Th>Country</Th>
              <Th>Staking Date</Th>
              <Th>Amount</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {pageStaking.map((stake) => (
              <Tr key={stake.id}>
                <Td className="font-medium text-slate-900 dark:text-slate-100">
                  <div className="flex items-center gap-2">
                    {stake.investor}
                    {stake.investor.startsWith("ProsperTech") && <Badge variant="blue">Corporate</Badge>}
                  </div>
                  <div className="text-xs font-normal text-slate-500 dark:text-slate-400">{stake.email}</div>
                </Td>
                <Td>{stake.country}</Td>
                <Td className="whitespace-nowrap">{formatDate(stake.stakingDate)}</Td>
                <Td className="font-mono">{formatCurrency(stake.amount)}</Td>
                <Td>
                  <Badge variant="success">Active</Badge>
                </Td>
              </Tr>
            ))}
            {filteredStaking.length === 0 && (
              <Tr>
                <Td colSpan={5}>
                  <EmptyState icon={Coins} title="No staking positions found" description="Try adjusting your search." />
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      )}

      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>
            Page {currentPage} of {totalPages} (
            {filtered.length.toLocaleString("en-US")} {viewMode === "users" ? "users" : "staking positions"})
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
