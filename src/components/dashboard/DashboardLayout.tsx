import React from "react";
import { Bell, LogOut, LayoutDashboard, Send, Wallet, Tag, CreditCard, PiggyBank, Target, CalendarClock, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FinanceUser } from "@/types/finance";
import type { ViewKey } from "@/types/app";

const navigationItems: readonly [React.ElementType, string, ViewKey | null][] = [
  [LayoutDashboard, "Overview", "overview"],
  [Send, "Transactions", "transactions"],
  [Wallet, "Wallets", "accounts"],
  [Tag, "Categories", "categories"],
  [PiggyBank, "Budgets", "needs"],
  [CreditCard, "Debts", "debts"],
  [Target, "Goals", "goals"],
  [CalendarClock, "Subscriptions", "subscriptions"],
  [MoreHorizontal, "More", null],
];

export function DashboardLayout({
  user,
  activeView,
  setActiveView,
  onLogout,
  error,
  userAvatarUrl,
  children,
}: {
  user: FinanceUser;
  activeView: ViewKey;
  setActiveView: (view: ViewKey) => void;
  onLogout: () => void;
  error?: string;
  userAvatarUrl?: string;
  children: React.ReactNode;
}) {
  const userInitials = (user.email || "KA").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-50">
      <div className="flex w-full gap-4 p-4 lg:gap-6 lg:p-6">
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-72 shrink-0 flex-col rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 lg:flex">
          <nav className="flex-1 space-y-1">
            {navigationItems.map(([Icon, label, key]) => (
              <button
                key={label as string}
                type="button"
                disabled={!key}
                onClick={() => key && setActiveView(key)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm ${key && activeView === key ? "bg-white text-zinc-950" : "text-zinc-400 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-6 border-t border-white/10 pt-4">
            <div className="flex min-w-0 items-center gap-3 rounded-xl bg-black/20 p-3">
              {userAvatarUrl ? (
                <img src={userAvatarUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white text-sm font-bold text-zinc-950">{userInitials}</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-100">{user.email}</p>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" title="Notifications" className="h-8 w-8 shrink-0 rounded-lg text-zinc-500 hover:bg-white/10 hover:text-white">
                <Bell className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" onClick={onLogout} title="Logout" className="h-8 w-8 shrink-0 rounded-lg text-zinc-500 hover:bg-white/10 hover:text-white">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          {error && <div className="mb-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</div>}
          {children}
        </main>
      </div>
    </div>
  );
}
