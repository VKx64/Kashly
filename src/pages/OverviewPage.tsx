import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useState } from "react";
import { Eye, EyeOff, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ChartPoint,
  ChartRange,
  DebtSummary,
  Entry,
  GoalView,
  MonthSummary,
  NeedEnvelope,
  OverviewStats,
  UpcomingRecurring,
  ViewKey,
  WalletView,
} from "@/types/app";
import type { AccountRecord } from "@/types/finance";
import { peso } from "@/utils/formatters";
import { chartRangeOptions } from "@/constants/mockData";

const frequencyLabel: Record<UpcomingRecurring["frequency"], string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  yearly: "Yearly",
};

// Small trend pill. `goodWhenUp` decides the color: an increase in income is
// green, but an increase in expenses is red. A null value (no prior period to
// compare against) renders as a neutral "New" chip.
function TrendChip({ value, goodWhenUp = true, neutral = false }: { value: number | null; goodWhenUp?: boolean; neutral?: boolean }) {
  if (value === null) {
    return <span className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-medium text-zinc-400">New</span>;
  }
  const up = value >= 0;
  const Arrow = up ? TrendingUp : TrendingDown;
  const tone = neutral
    ? "border-white/10 bg-white/5 text-zinc-300"
    : (goodWhenUp ? up : !up)
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : "border-rose-400/20 bg-rose-400/10 text-rose-300";
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-medium ${tone}`}>
      <Arrow className="h-3 w-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

// Module-level flag so the cashflow chart animates at most once per page load.
let cashflowHasAnimated = false;

export function OverviewPage({
  stats,
  entries,
  chartData,
  range,
  setRange,
  debtSummary,
  setActiveView,
  wallets,
  setEditingAccount,
  setIsAccountOpen,
  todayIncome,
  todayExpense,
  needs,
  monthSummary,
  onDistribute,
  goals,
  upcomingRecurring,
}: {
  stats: OverviewStats;
  entries: Entry[];
  chartData: ChartPoint[];
  range: ChartRange;
  setRange: (range: ChartRange) => void;
  debtSummary: DebtSummary;
  setActiveView: (view: ViewKey) => void;
  wallets: WalletView[];
  setEditingAccount: (account: AccountRecord | null) => void;
  setIsAccountOpen: (open: boolean) => void;
  todayIncome: number;
  todayExpense: number;
  needs: NeedEnvelope[];
  monthSummary: MonthSummary;
  onDistribute: () => void;
  goals: GoalView[];
  upcomingRecurring: UpcomingRecurring[];
}) {
  const [balanceHidden, setBalanceHidden] = useState(false);
  const EyeIcon = balanceHidden ? EyeOff : Eye;
  const masked = "₱••••••";

  // Mark animated after first mount so subsequent visits skip the draw animation.
  const animateChart = !cashflowHasAnimated;
  if (!cashflowHasAnimated) cashflowHasAnimated = true;

  return (
    <>
      <section className="grid items-stretch gap-4 xl:grid-cols-[1.05fr_1.6fr]">
        <div className="h-full">
          <Card className="relative h-full overflow-hidden rounded-[1.25rem] border-white/10 bg-[radial-gradient(circle_at_85%_15%,rgba(16,185,129,0.16),transparent_34%),linear-gradient(135deg,#18181b,#09090b)] text-white shadow-2xl shadow-black/30">
            <div className="pointer-events-none absolute right-5 top-14 h-16 w-36 opacity-35">
              <svg viewBox="0 0 240 90" className="h-full w-full">
                <path d="M2 70 C38 42, 58 72, 88 45 S143 35, 168 48 S206 38, 238 12" fill="none" stroke="rgba(52,211,153,.62)" strokeWidth="3" />
                <path d="M2 70 C38 42, 58 72, 88 45 S143 35, 168 48 S206 38, 238 12 L238 90 L2 90 Z" fill="rgba(16,185,129,.10)" />
              </svg>
            </div>
            <CardContent className="relative flex h-full flex-col p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-zinc-400">Net Balance</p>
                  <button
                    type="button"
                    onClick={() => setBalanceHidden((h) => !h)}
                    title={balanceHidden ? "Show balance" : "Hide balance"}
                    aria-label={balanceHidden ? "Show balance" : "Hide balance"}
                    className="rounded-md p-0.5 text-zinc-500 transition hover:bg-white/10 hover:text-zinc-300"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </div>
                <TrendChip value={stats.balanceTrend} goodWhenUp />
              </div>
              <div className="mt-4 max-w-[62%]">
                <h2 className="text-4xl font-semibold tracking-tight text-zinc-50">{balanceHidden ? masked : peso(stats.balance)}</h2>
                <p className="mt-3 text-sm text-zinc-500">Across {wallets.length} {wallets.length === 1 ? "wallet" : "wallets"} · last 30 days</p>
              </div>
              {/* Income / Expense / Transactions sub-cards — "New" pills removed */}
              <div className="mt-5 grid grid-cols-3 gap-2.5">
                <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.055] p-3">
                  <p className="truncate text-xs text-zinc-500">Income</p>
                  <p className="mt-2 truncate text-base font-semibold text-zinc-100 sm:text-lg">{balanceHidden ? masked : peso(stats.income)}</p>
                </div>
                <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.055] p-3">
                  <p className="truncate text-xs text-zinc-500">Expenses</p>
                  <p className="mt-2 truncate text-base font-semibold text-zinc-100 sm:text-lg">{balanceHidden ? masked : peso(stats.expense)}</p>
                </div>
                <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.055] p-3">
                  <p className="truncate text-xs text-zinc-500">Transactions</p>
                  <p className="mt-2 truncate text-base font-semibold text-zinc-100 sm:text-lg">{stats.transactions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="h-full">
          <Card className="h-full rounded-[1.25rem] border-white/10 bg-white/[0.04] text-white">
            <CardHeader className="flex flex-col gap-4 p-5 pb-1 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div><CardTitle className="text-base">Cashflow pulse</CardTitle><p className="text-sm text-zinc-400">Income vs expenses across the selected period</p></div>
              <div className="grid w-full grid-cols-3 gap-1 rounded-lg border border-white/10 bg-black/20 p-1 sm:w-auto">
                {chartRangeOptions.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRange(value)}
                    className={`h-8 rounded-md px-3 text-xs font-semibold transition ${range === value ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-400 hover:bg-white/10 hover:text-white"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="h-[230px] p-2 pr-5">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 24, bottom: 4 }}>
                  <defs><linearGradient id="income" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="currentColor" stopOpacity={0.28} /><stop offset="95%" stopColor="currentColor" stopOpacity={0} /></linearGradient><linearGradient id="expense" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="currentColor" stopOpacity={0.2} /><stop offset="95%" stopColor="currentColor" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#a1a1aa", fontSize: 12 }} /><YAxis hide />
                  <Tooltip contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,.12)", borderRadius: 18 }} labelStyle={{ color: "#fff" }} formatter={(value, name) => [peso(Number(value)), name === "income" ? "Income" : "Expense"]} />
                  <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={3} fill="url(#income)" isAnimationActive={animateChart} />
                  <Area type="monotone" dataKey="expense" stroke="#fb7185" strokeWidth={3} fill="url(#expense)" isAnimationActive={animateChart} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Ready to assign — amount and Distribute button share one row */}
      <section className="mt-4">
        <Card className="overflow-hidden rounded-[1.25rem] border-white/10 bg-white/[0.04] text-white">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-400/10 text-emerald-300">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200">Ready to assign</p>
                <p className="text-xs text-zinc-500">{peso(monthSummary.income)} earned · {peso(monthSummary.allocated)} assigned this month</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-xl font-semibold ${monthSummary.readyToAssign < 0 ? "text-rose-300" : "text-zinc-50"}`}>{peso(monthSummary.readyToAssign)}</span>
              <button
                type="button"
                onClick={onDistribute}
                disabled={monthSummary.readyToAssign <= 0}
                title={monthSummary.readyToAssign > 0 ? "Distribute your unassigned income" : "Log income this month to distribute it."}
                className="h-10 rounded-lg bg-white px-4 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-40"
              >
                Distribute
              </button>
            </div>
          </CardContent>
        </Card>
      </section>

      {debtSummary.active.length > 0 && (
        <section className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            ["Total owed", peso(debtSummary.totalOwed), "text-rose-300"],
            ["Unpaid debts", debtSummary.active.length, "text-zinc-100"],
            ["Paid debts", debtSummary.paid.length, "text-emerald-300"],
            ["Next due", debtSummary.nextDue ? `${debtSummary.nextDue.debt.name} · ${debtSummary.nextDue.due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "None", "text-zinc-100"],
          ].map(([label, value, color]) => (
            <button key={label as string} type="button" onClick={() => setActiveView("debts")} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.06]">
              <p className="text-xs text-zinc-500">{label}</p>
              <p className={`mt-2 truncate text-lg font-semibold ${color}`}>{value}</p>
            </button>
          ))}
        </section>
      )}

      {/* Row 1: Wallets | Recent Activity | Upcoming Recurring */}
      <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.15fr_0.9fr]">
        <Card className="rounded-[1.25rem] border-white/10 bg-white/[0.04] text-white">
          <CardHeader className="p-5"><button type="button" className="w-fit text-left transition hover:text-zinc-300" onClick={() => setActiveView("accounts")}><CardTitle className="text-base">Wallets</CardTitle></button></CardHeader>
          <CardContent className="space-y-2.5 p-5 pt-0">
            {wallets.map((wallet) => {
              const Icon = wallet.icon;
              return (
                <div key={wallet.name} className={`group overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br ${wallet.accent} p-3.5 transition hover:border-white/20`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black/20 ${wallet.text}`}><Icon className="h-4 w-4" /></div>
                      <p className="truncate text-sm font-semibold leading-none">{wallet.name}</p>
                    </div>
                    <p className={wallet.balance < 0 ? "shrink-0 text-sm font-semibold text-rose-300" : "shrink-0 text-sm font-semibold text-zinc-100"}>{peso(wallet.balance)}</p>
                  </div>
                </div>
              );
            })}
            <button type="button" onClick={() => { setEditingAccount(null); setIsAccountOpen(true); }} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 px-4 text-sm text-zinc-400 transition hover:border-white/30 hover:bg-white/[0.04] hover:text-white"><Plus className="h-4 w-4" /> Add Wallet</button>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-[1.25rem] border-white/10 bg-white/[0.04] text-white">
          <CardHeader className="p-5 pb-3"><button type="button" className="w-fit text-left transition hover:text-zinc-300" onClick={() => setActiveView("transactions")}><CardTitle className="text-base">Recent activity</CardTitle></button></CardHeader>
          <CardContent className="space-y-4 p-5 pt-0">
            <div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.06] p-3"><p className="text-xs text-zinc-500">Today in</p><p className="mt-1 text-sm font-semibold text-emerald-300">{peso(todayIncome)}</p></div><div className="rounded-xl border border-rose-400/10 bg-rose-400/[0.06] p-3"><p className="text-xs text-zinc-500">Today out</p><p className="mt-1 text-sm font-semibold text-rose-300">{peso(todayExpense)}</p></div></div>
            {entries.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">No transactions yet. Add your first entry to see it here.</p>
            ) : (
              <div className="max-h-[310px] space-y-3 overflow-auto pr-1">
                {entries.slice(0, 10).map((tx, index) => {
                  const Icon = tx.icon;
                  const isIncome = tx.amount > 0;
                  return <button key={tx.id || `${tx.title}-${index}`} type="button" onClick={() => setActiveView("transactions")} className={`group flex w-full items-center justify-between rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-white/20 ${isIncome ? "border-emerald-400/10 bg-emerald-400/[0.045] hover:bg-emerald-400/[0.07]" : "border-rose-400/10 bg-rose-400/[0.04] hover:bg-rose-400/[0.065]"}`}><div className="flex min-w-0 items-center gap-3"><div className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg ${isIncome ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}><Icon className="h-5 w-5" /></div><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold text-zinc-100">{tx.title}</p><span className={`hidden rounded-lg px-2 py-0.5 text-[10px] font-medium sm:inline-flex ${isIncome ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>{tx.category}</span></div><p className="mt-1 truncate text-xs text-zinc-500">{tx.wallet}</p></div></div><div className="ml-4 shrink-0 text-right"><p className={`text-sm font-semibold ${isIncome ? "text-emerald-300" : "text-zinc-100"}`}>{peso(tx.amount)}</p><p className="mt-1 text-[11px] text-zinc-600">{tx.createdAt || "Logged"}</p></div></button>;
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Recurring — moved here to sit next to Recent Activity */}
        <Card className="rounded-[1.25rem] border-white/10 bg-white/[0.04] text-white">
          <CardHeader className="p-5"><CardTitle className="text-base">Upcoming recurring</CardTitle></CardHeader>
          <CardContent className="space-y-2.5 p-5 pt-0">
            {upcomingRecurring.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">No recurring transactions scheduled. Add one in PocketBase to see upcoming bills and income.</p>
            ) : (
              upcomingRecurring.map((item) => {
                const isIncome = item.type === "income";
                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 transition hover:border-white/20">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-100">{item.merchant}</p>
                      <p className="mt-1 truncate text-xs text-zinc-500">{frequencyLabel[item.frequency]} · {item.account}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-semibold ${isIncome ? "text-emerald-300" : "text-zinc-100"}`}>{isIncome ? "+" : "-"}{peso(item.amount)}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">{item.nextRun.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </section>

      {/* Row 2: Needs (styled like Goals) | Savings Goals — matched pair */}
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Needs — restyled to match Savings Goals card */}
        <Card className="rounded-[1.25rem] border-white/10 bg-white/[0.04] text-white">
          <CardHeader className="p-5"><button type="button" className="w-fit text-left transition hover:text-zinc-300" onClick={() => setActiveView("needs")}><CardTitle className="text-base">Needs</CardTitle></button></CardHeader>
          <CardContent className="space-y-2.5 p-5 pt-0">
            {needs.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">No needs yet. Define your monthly needs, then fund them from income.</p>
            ) : (
              needs.slice(0, 6).map((need) => {
                const over = need.available < 0;
                const pct = need.percentFunded;
                return (
                  <div key={need.id} className="space-y-2.5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{need.name}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">{peso(need.funded)} of {peso(need.target)}</p>
                      </div>
                      <p className={`shrink-0 text-sm font-semibold ${over ? "text-rose-300" : "text-zinc-100"}`}>{pct}%</p>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: over ? "#fb7185" : undefined }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Savings Goals — header icon and count badge removed */}
        <Card className="rounded-[1.25rem] border-white/10 bg-white/[0.04] text-white">
          <CardHeader className="p-5"><CardTitle className="text-base">Savings goals</CardTitle></CardHeader>
          <CardContent className="space-y-2.5 p-5 pt-0">
            {goals.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">No savings goals yet. Create one in PocketBase to track progress toward a target.</p>
            ) : (
              goals.map((goal) => (
                <div key={goal.id} className="space-y-2.5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><p className="truncate text-sm font-medium">{goal.name}</p>{goal.isCompleted && <span className="rounded-md bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">Reached</span>}</div>
                      <p className="mt-0.5 text-xs text-zinc-500">{peso(goal.current)} of {peso(goal.target)}{goal.targetDate ? ` · by ${goal.targetDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : ""}</p>
                    </div>
                    <p className={`shrink-0 text-sm font-semibold ${goal.isCompleted ? "text-emerald-300" : "text-zinc-100"}`}>{goal.percent}%</p>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(goal.percent, 100)}%`, backgroundColor: goal.isCompleted ? "#34d399" : undefined }} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
