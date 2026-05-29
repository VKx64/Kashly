import { ArrowDownLeft, ArrowUpRight, Car, CreditCard, ShoppingBag, Target, Utensils, Wallet } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import type { AccountRecord, AllocationRecord, CategoryRecord, DebtRecord, FinanceUser, GoalRecord, TransactionRecord } from "@/types/finance";
import type { ChartPoint, CategoryView, ChartRange, DistributeTarget, Entry, ExpandedBudget, ExpandedRecurring, ExpandedTransaction, GoalView, MonthSummary, NeedEnvelope, OverviewStats, UpcomingRecurring, WalletView } from "@/types/app";
import { accountMeta } from "@/constants/mockData";
import { getIcon } from "@/constants/icons";

export function getTotals(entries: { amount: number }[], walletItems: WalletView[]) {
  const walletBalance = walletItems.reduce((sum, wallet) => sum + wallet.balance, 0);
  const income = entries.filter((entry) => entry.amount > 0).reduce((sum, entry) => sum + entry.amount, 0);
  const expense = Math.abs(entries.filter((entry) => entry.amount < 0).reduce((sum, entry) => sum + entry.amount, 0));
  return { balance: walletBalance, income, expense };
}

export function getVisibleCategories(type: string, categoryItems: CategoryView[]) {
  return categoryItems.filter((category) => category.kind === type || (type === "income" && category.name === "Other"));
}

export function getCategoryMeta(category: string | CategoryView) {
  if (typeof category !== "string") return category as CategoryView;
  const meta = {
    Income: { icon: ArrowDownLeft, text: "text-emerald-300", label: "Money received" },
    Dining: { icon: Utensils, text: "text-amber-300", label: "Food & drinks" },
    Bills: { icon: CreditCard, text: "text-rose-300", label: "Recurring payments" },
    Transport: { icon: Car, text: "text-sky-300", label: "Commute & travel" },
    Shopping: { icon: ShoppingBag, text: "text-violet-300", label: "Purchases" },
    Savings: { icon: Target, text: "text-emerald-300", label: "Saved money" },
    Other: { icon: Wallet, text: "text-zinc-300", label: "Uncategorized" },
  };
  const fallback = meta[category as keyof typeof meta] || meta.Other;
  return { name: category, kind: category === "Income" ? "income" : "expense", ...fallback } as CategoryView;
}

export function getGridLimitLabel(count: number, label: string) {
  return count > 0 ? `${count} ${label}${count === 1 ? "" : "s"}` : `No ${label}s`;
}

export function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function getCurrentTimeInputValue() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function getUserInitials(user: FinanceUser) {
  const source = (user.name || user.email || "K").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function getCalendarCells(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let index = 0; index < startOffset; index += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function toDateInputValue(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getAuthUser() {
  return pb.authStore.model as unknown as FinanceUser | null;
}

export function mapAccountToWallet(account: AccountRecord): WalletView {
  const meta = accountMeta[account.type] || accountMeta.other;
  return {
    id: account.id,
    name: account.name,
    type: account.type.replace("_", " "),
    balance: account.currentBalance ?? 0,
    ...meta,
  };
}

export function mapCategoryToView(category: CategoryRecord): CategoryView {
  const meta = getCategoryMeta(category.name);
  return {
    id: category.id,
    name: category.name,
    kind: category.kind,
    label: meta.label,
    icon: getIcon(category.icon),
    text: meta.text,
  };
}

export function getTransactionIcon(transaction: ExpandedTransaction) {
  const categoryName = transaction.expand?.category?.name || "";
  if (transaction.type === "income") return ArrowDownLeft;
  if (categoryName === "Bills") return CreditCard;
  if (categoryName === "Transport") return Car;
  if (categoryName === "Shopping") return ShoppingBag;
  return ArrowUpRight;
}

export function mapTransactionToEntry(transaction: ExpandedTransaction): Entry {
  const signedAmount = transaction.type === "expense" ? -transaction.amount : transaction.amount;
  const occurredAt = new Date(transaction.occurredAt);
  return {
    id: transaction.id,
    title: transaction.merchant || transaction.expand?.category?.name || "Transaction",
    amount: signedAmount,
    type: transaction.type,
    category: transaction.expand?.category?.name || "Other",
    categoryId: transaction.category,
    wallet: transaction.expand?.account?.name || "Wallet",
    walletId: transaction.account,
    createdAt: Number.isNaN(occurredAt.getTime())
      ? "Logged"
      : occurredAt.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }),
    note: transaction.notes || "",
    debtId: transaction.debt,
    icon: getTransactionIcon(transaction),
  };
}

export function getBalanceDelta(type: string, amount: number) {
  if (type === "income") return Math.abs(amount);
  if (type === "expense") return -Math.abs(amount);
  return 0;
}

export function getTransactionBalanceDelta(transaction: Pick<TransactionRecord, "type" | "amount">) {
  return getBalanceDelta(transaction.type, transaction.amount);
}

export function toDateTimeParts(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: getTodayInputValue(), time: getCurrentTimeInputValue() };
  }
  return {
    date: date.toISOString().slice(0, 10),
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  };
}

export function buildChartData(transactions: ExpandedTransaction[], range: ChartRange): ChartPoint[] {
  const now = new Date();

  if (range === "week") {
    return Array.from({ length: 7 }, (_, index) => {
      const bucketStart = new Date(now);
      bucketStart.setHours(0, 0, 0, 0);
      bucketStart.setDate(bucketStart.getDate() - (6 - index));
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setHours(23, 59, 59, 999);
      const point = {
        day: index === 6 ? "Today" : bucketStart.toLocaleDateString("en-US", { weekday: "short" }),
        income: 0,
        expense: 0,
      };

      transactions.forEach((transaction) => {
        const date = new Date(transaction.occurredAt);
        if (date >= bucketStart && date <= bucketEnd) {
          if (transaction.type === "income") point.income += transaction.amount;
          if (transaction.type === "expense") point.expense += transaction.amount;
        }
      });

      return point;
    });
  }

  if (range === "year") {
    return Array.from({ length: 12 }, (_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
      const bucketStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const bucketEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
      const point = {
        day: monthDate.toLocaleDateString("en-US", { month: "short" }),
        income: 0,
        expense: 0,
      };

      transactions.forEach((transaction) => {
        const date = new Date(transaction.occurredAt);
        if (date >= bucketStart && date <= bucketEnd) {
          if (transaction.type === "income") point.income += transaction.amount;
          if (transaction.type === "expense") point.expense += transaction.amount;
        }
      });

      return point;
    });
  }

  return Array.from({ length: 8 }, (_, index) => {
    const bucketEnd = new Date(now);
    bucketEnd.setHours(23, 59, 59, 999);
    bucketEnd.setDate(bucketEnd.getDate() - (7 - index) * 4);
    const bucketStart = new Date(bucketEnd);
    bucketStart.setHours(0, 0, 0, 0);
    bucketStart.setDate(bucketStart.getDate() - 3);
    const point = {
      day: index === 7 ? "Today" : bucketEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      income: 0,
      expense: 0,
    };

    transactions.forEach((transaction) => {
      const date = new Date(transaction.occurredAt);
      if (date >= bucketStart && date <= bucketEnd) {
        if (transaction.type === "income") point.income += transaction.amount;
        if (transaction.type === "expense") point.expense += transaction.amount;
      }
    });

    return point;
  });
}

export function buildOccurredAt(dateValue: string, timeValue: string) {
  return new Date(`${dateValue}T${timeValue || "00:00"}:00`).toISOString();
}

export function dataTimestampFromEntry(entry: Entry) {
  if (entry.date && entry.time) return `${entry.date}T${entry.time}:00`;
  if (!entry.createdAt || entry.createdAt === "Logged") return new Date().toISOString();
  const parsed = new Date(entry.createdAt);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export function getDebtRemaining(debt: import("@/types/finance").DebtRecord) {
  return Math.max(0, (debt.amount || 0) - (debt.paidAmount || 0));
}

export function getDebtDueDate(debt: import("@/types/finance").DebtRecord) {
  if (debt.dueDate) {
    const due = new Date(debt.dueDate);
    if (!Number.isNaN(due.getTime())) return due;
  }
  return null;
}

export function getDebtSummary(debts: import("@/types/finance").DebtRecord[]) {
  // Debts the user owes (direction "owe" or unset — backward compat).
  const owedDebts = debts.filter((debt) => debt.direction !== "lent");
  const lentDebts = debts.filter((debt) => debt.direction === "lent");

  const active = owedDebts.filter((debt) => !debt.isArchived && getDebtRemaining(debt) > 0);
  const paid = owedDebts.filter((debt) => !debt.isArchived && getDebtRemaining(debt) <= 0);
  const totalOwed = active.reduce((sum, debt) => sum + getDebtRemaining(debt), 0);
  const totalPaid = owedDebts.filter((debt) => !debt.isArchived).reduce((sum, debt) => sum + Math.max(0, debt.paidAmount || 0), 0);
  const nextDue = active
    .map((debt) => ({ debt, due: getDebtDueDate(debt) }))
    .filter((item): item is { debt: import("@/types/finance").DebtRecord; due: Date } => Boolean(item.due))
    .sort((a, b) => a.due.getTime() - b.due.getTime())[0];

  const lentActive = lentDebts.filter((debt) => !debt.isArchived && getDebtRemaining(debt) > 0);
  const totalLent = lentActive.reduce((sum, debt) => sum + getDebtRemaining(debt), 0);

  return { active, paid, totalOwed, totalPaid, nextDue: nextDue ?? null, lentActive, totalLent };
}

export function getCategoryUsage(categoryId: string, transactions: import("@/types/app").ExpandedTransaction[], budgets: import("@/types/app").ExpandedBudget[]) {
  return {
    transactions: transactions.filter((transaction) => transaction.category === categoryId).length,
    budgets: budgets.filter((budget) => budget.category === categoryId).length,
  };
}

export function getAccountUsage(accountId: string, transactions: import("@/types/app").ExpandedTransaction[]) {
  return transactions.filter((transaction) => transaction.account === accountId || transaction.transferAccount === accountId).length;
}

// Real period-over-period stats for the overview headline: the last 30 days
// versus the 30 days before that. The balance trend reconstructs the wallet
// total 30 days ago by removing the net cashflow since then.
export function getOverviewStats(transactions: ExpandedTransaction[], walletBalance: number): OverviewStats {
  const now = Date.now();
  const day = 86_400_000;
  const curStart = now - 30 * day;
  const prevStart = now - 60 * day;

  let income = 0;
  let expense = 0;
  let count = 0;
  let prevIncome = 0;
  let prevExpense = 0;
  let prevCount = 0;

  for (const transaction of transactions) {
    const time = new Date(transaction.occurredAt).getTime();
    if (Number.isNaN(time)) continue;
    if (time >= curStart && time <= now) {
      count += 1;
      if (transaction.type === "income") income += transaction.amount;
      else if (transaction.type === "expense") expense += transaction.amount;
    } else if (time >= prevStart && time < curStart) {
      prevCount += 1;
      if (transaction.type === "income") prevIncome += transaction.amount;
      else if (transaction.type === "expense") prevExpense += transaction.amount;
    }
  }

  const netCurrent = income - expense;
  const balance30dAgo = walletBalance - netCurrent;
  const pct = (current: number, previous: number) =>
    previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100;

  return {
    balance: walletBalance,
    income,
    expense,
    transactions: count,
    balanceTrend: balance30dAgo === 0 ? null : (netCurrent / Math.abs(balance30dAgo)) * 100,
    incomeTrend: pct(income, prevIncome),
    expenseTrend: pct(expense, prevExpense),
    transactionTrend: pct(count, prevCount),
  };
}

export function getGoalView(goal: GoalRecord, allocations: AllocationRecord[] = []): GoalView {
  const target = goal.targetAmount || 0;
  const funded = allocations.filter((a) => a.goal === goal.id).reduce((sum, a) => sum + (a.amount || 0), 0);
  const current = (goal.currentAmount || 0) + funded;
  const percent = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const parsedDate = goal.targetDate ? new Date(goal.targetDate) : null;
  return {
    id: goal.id,
    name: goal.name,
    icon: goal.icon,
    current,
    target,
    percent,
    remaining: Math.max(target - current, 0),
    targetDate: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
    isCompleted: goal.isCompleted || (target > 0 && current >= target),
  };
}

export function getActiveGoals(goals: GoalRecord[], allocations: AllocationRecord[] = []): GoalView[] {
  return goals
    .map((goal) => getGoalView(goal, allocations))
    .sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted) || b.percent - a.percent);
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function monthKey(value: string | Date = new Date()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 7);
  return date.toISOString().slice(0, 7);
}

// Build the per-month envelope view for each active need: funded by allocations,
// drawn down by expenses in its category.
export function getNeedEnvelopes(
  budgets: ExpandedBudget[],
  allocations: AllocationRecord[],
  transactions: ExpandedTransaction[],
  month: string = monthKey(),
): NeedEnvelope[] {
  return budgets
    .filter((budget) => budget.isActive !== false)
    .map((budget) => {
      const funded = allocations
        .filter((a) => a.budget === budget.id && monthKey(a.date) === month)
        .reduce((sum, a) => sum + (a.amount || 0), 0);
      const spent = transactions
        .filter((t) => t.type === "expense" && t.category === budget.category && monthKey(t.occurredAt) === month)
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      const target = budget.amount || 0;
      return {
        id: budget.id,
        name: budget.name || budget.expand?.category?.name || "Need",
        categoryId: budget.category,
        icon: budget.icon || "tag",
        color: budget.color || "#34d399",
        priority: budget.priority ?? 0,
        target,
        funded,
        spent,
        available: funded - spent,
        toFund: Math.max(target - funded, 0),
        percentFunded: target > 0 ? Math.min(Math.round((funded / target) * 100), 100) : 0,
        isActive: budget.isActive !== false,
      };
    })
    .sort((a, b) => a.priority - b.priority || b.target - a.target);
}

export function getMonthSummary(
  transactions: ExpandedTransaction[],
  allocations: AllocationRecord[],
  month: string = monthKey(),
): MonthSummary {
  const income = transactions
    .filter((t) => t.type === "income" && monthKey(t.occurredAt) === month)
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const allocated = allocations
    .filter((a) => monthKey(a.date) === month)
    .reduce((sum, a) => sum + (a.amount || 0), 0);
  return { monthKey: month, income, allocated, readyToAssign: income - allocated };
}

// Fundable targets for the distribute flow: underfunded needs first, then debts,
// then goals — each capped by how much it still needs this month.
export function getDistributeTargets(
  needs: NeedEnvelope[],
  goals: GoalRecord[],
  debts: DebtRecord[],
  allocations: AllocationRecord[],
  month: string = monthKey(),
): DistributeTarget[] {
  const needTargets: DistributeTarget[] = needs
    .filter((need) => need.isActive && need.toFund > 0)
    .map((need) => ({ kind: "budget", id: need.id, name: need.name, icon: need.icon, color: need.color, priority: need.priority, toFund: need.toFund }));

  const debtTargets: DistributeTarget[] = debts
    .filter((debt) => !debt.isArchived && debt.direction !== "lent" && (debt.amount || 0) - (debt.paidAmount || 0) > 0)
    .map((debt) => {
      const fundedThisMonth = allocations.filter((a) => a.debt === debt.id && monthKey(a.date) === month).reduce((sum, a) => sum + (a.amount || 0), 0);
      const remaining = Math.max((debt.amount || 0) - (debt.paidAmount || 0), 0);
      const monthly = debt.monthlyPayment && debt.monthlyPayment > 0 ? debt.monthlyPayment : remaining;
      const toFund = Math.max(Math.min(monthly, remaining) - fundedThisMonth, 0);
      return { kind: "debt" as const, id: debt.id, name: debt.name, icon: debt.icon || "card", color: "#fb7185", priority: debt.priority ?? 50, toFund };
    })
    .filter((target) => target.toFund > 0);

  const goalTargets: DistributeTarget[] = goals
    .filter((goal) => !goal.isCompleted)
    .map((goal) => {
      const fundedThisMonth = allocations.filter((a) => a.goal === goal.id && monthKey(a.date) === month).reduce((sum, a) => sum + (a.amount || 0), 0);
      const fundedAllTime = allocations.filter((a) => a.goal === goal.id).reduce((sum, a) => sum + (a.amount || 0), 0);
      const remainingToTarget = Math.max((goal.targetAmount || 0) - ((goal.currentAmount || 0) + fundedAllTime), 0);
      const monthly = goal.monthlyTarget && goal.monthlyTarget > 0 ? goal.monthlyTarget : remainingToTarget;
      const toFund = Math.max(Math.min(monthly, remainingToTarget) - fundedThisMonth, 0);
      return { kind: "goal" as const, id: goal.id, name: goal.name, icon: goal.icon || "target", color: "#38bdf8", priority: goal.priority ?? 100, toFund };
    })
    .filter((target) => target.toFund > 0);

  return [...needTargets, ...debtTargets, ...goalTargets].sort((a, b) => a.priority - b.priority);
}

// Proportional split: spread `amount` across targets in proportion to each
// target's remaining need. Any rounding drift lands on the largest target.
export function suggestProportional(amount: number, targets: DistributeTarget[]): number[] {
  const total = targets.reduce((sum, target) => sum + target.toFund, 0);
  if (amount <= 0 || total <= 0) return targets.map(() => 0);
  if (amount >= total) return targets.map((target) => round2(target.toFund));

  const rounded = targets.map((target) => round2((amount * target.toFund) / total));
  const drift = round2(amount - rounded.reduce((sum, value) => sum + value, 0));
  if (drift !== 0 && rounded.length > 0) {
    let maxIdx = 0;
    targets.forEach((target, index) => {
      if (target.toFund > targets[maxIdx].toFund) maxIdx = index;
    });
    rounded[maxIdx] = round2(rounded[maxIdx] + drift);
  }
  return rounded;
}

export function getSubscriptionSummary(subs: import("@/types/app").ExpandedSubscription[]): import("@/types/app").SubscriptionSummary {
  const active = subs.filter((sub) => sub.isActive);

  // Normalise each subscription's cost to a monthly equivalent.
  const totalMonthly = active.reduce((sum, sub) => {
    const amount = sub.amount || 0;
    if (sub.frequency === "weekly") return sum + (amount * 52) / 12;
    if (sub.frequency === "yearly") return sum + amount / 12;
    return sum + amount; // monthly
  }, 0);

  // The subscription with the soonest upcoming billing date.
  const nextUp = active
    .filter((sub) => Boolean(sub.nextBillingDate))
    .sort((a, b) => new Date(a.nextBillingDate!).getTime() - new Date(b.nextBillingDate!).getTime())[0] ?? null;

  return { totalMonthly: Math.round(totalMonthly * 100) / 100, activeCount: active.length, nextUp };
}

export function getUpcomingRecurring(recurring: ExpandedRecurring[], limit = 5): UpcomingRecurring[] {
  return recurring
    .filter((item) => item.isActive)
    .map((item) => ({
      id: item.id,
      merchant: item.merchant || item.expand?.category?.name || "Recurring",
      type: item.type,
      amount: item.amount,
      frequency: item.frequency,
      account: item.expand?.account?.name || "Wallet",
      category: item.expand?.category?.name || "—",
      nextRun: new Date(item.nextRunAt),
    }))
    .filter((item) => !Number.isNaN(item.nextRun.getTime()))
    .sort((a, b) => a.nextRun.getTime() - b.nextRun.getTime())
    .slice(0, limit);
}
