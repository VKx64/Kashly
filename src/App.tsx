import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Car,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Edit3,
  Eye,
  Filter,
  Landmark,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  ShoppingBag,
  Tags,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Utensils,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { POCKETBASE_URL, pb } from "@/lib/pocketbase";
import type { AccountRecord, AccountType, BudgetRecord, CategoryRecord, DebtKind, DebtRecord, FinanceUser, TransactionRecord } from "@/types/finance";

const fallbackWallets = [
  { name: "BPI", type: "Bank", balance: 0, icon: Landmark, accent: "from-blue-500/20 to-indigo-500/10", text: "text-blue-300" },
  { name: "Cash Wallet", type: "Cash", balance: -486, icon: Wallet, accent: "from-emerald-500/20 to-teal-500/10", text: "text-emerald-300" },
  { name: "Maya Savings", type: "Savings", balance: 8500, icon: Target, accent: "from-violet-500/20 to-fuchsia-500/10", text: "text-violet-300" },
];

const fallbackBudgets = [
  { name: "Shopping", spent: 1200, limit: 2000, icon: ShoppingBag, color: "bg-violet-400", iconColor: "text-violet-300", iconBg: "bg-violet-500/15" },
  { name: "Dining Out", spent: 450, limit: 600, icon: Utensils, color: "bg-amber-400", iconColor: "text-amber-300", iconBg: "bg-amber-500/15" },
  { name: "Transportation", spent: 300, limit: 600, icon: Car, color: "bg-sky-400", iconColor: "text-sky-300", iconBg: "bg-sky-500/15" },
];

const fallbackCategories = ["Income", "Dining", "Bills", "Transport", "Shopping", "Savings", "Other"];

const DEFAULT_CATEGORIES: { name: string; kind: "income" | "expense"; color: string; icon: string }[] = [
  { name: "Income", kind: "income", color: "#10b981", icon: "income" },
  { name: "Dining", kind: "expense", color: "#f59e0b", icon: "dining" },
  { name: "Bills", kind: "expense", color: "#ef4444", icon: "bills" },
  { name: "Transport", kind: "expense", color: "#3b82f6", icon: "transport" },
  { name: "Shopping", kind: "expense", color: "#8b5cf6", icon: "shopping" },
  { name: "Savings", kind: "expense", color: "#06b6d4", icon: "savings" },
  { name: "Other", kind: "expense", color: "#64748b", icon: "other" },
];

type WalletView = {
  id: string;
  name: string;
  type: string;
  balance: number;
  icon: LucideIcon;
  accent: string;
  text: string;
};

type CategoryView = {
  id?: string;
  name: string;
  kind: "income" | "expense";
  label: string;
  icon: LucideIcon;
  text: string;
};

type ExpandedTransaction = TransactionRecord & {
  expand?: {
    account?: AccountRecord;
    category?: CategoryRecord;
  };
};

type ExpandedBudget = BudgetRecord & {
  expand?: {
    category?: CategoryRecord;
  };
};

type TransactionFormEntry = {
  id?: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  wallet: string;
  date?: string;
  time?: string;
  note?: string;
};

type DashboardData = {
  accounts: AccountRecord[];
  categories: CategoryRecord[];
  transactions: ExpandedTransaction[];
  budgets: ExpandedBudget[];
  debts: DebtRecord[];
};

const accountMeta: Record<AccountType, Pick<WalletView, "icon" | "accent" | "text">> = {
  bank: { icon: Landmark, accent: "from-blue-500/20 to-indigo-500/10", text: "text-blue-300" },
  cash: { icon: Wallet, accent: "from-emerald-500/20 to-teal-500/10", text: "text-emerald-300" },
  savings: { icon: Target, accent: "from-violet-500/20 to-fuchsia-500/10", text: "text-violet-300" },
  credit_card: { icon: CreditCard, accent: "from-rose-500/20 to-pink-500/10", text: "text-rose-300" },
  e_wallet: { icon: Wallet, accent: "from-cyan-500/20 to-sky-500/10", text: "text-cyan-300" },
  investment: { icon: TrendingUp, accent: "from-amber-500/20 to-orange-500/10", text: "text-amber-300" },
  other: { icon: Wallet, accent: "from-zinc-500/20 to-slate-500/10", text: "text-zinc-300" },
};

const transactionTypeOptions: [string, string, LucideIcon][] = [
  ["expense", "Expense", TrendingDown],
  ["income", "Income", TrendingUp],
];

type ViewKey = "overview" | "transactions" | "accounts" | "categories" | "debts";
type ChartRange = "week" | "month" | "year";

const chartRangeOptions: [ChartRange, string][] = [
  ["week", "Week"],
  ["month", "Month"],
  ["year", "Year"],
];

const navigationItems: [LucideIcon, string, ViewKey | null][] = [
  [LayoutDashboard, "Overview", "overview"],
  [CreditCard, "Transactions", "transactions"],
  [Wallet, "Accounts", "accounts"],
  [Tags, "Categories", "categories"],
  [Landmark, "Debts", "debts"],
  [CalendarDays, "Reports", null],
  [Settings, "Settings", null],
];

function peso(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}₱${Math.abs(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function sanitizeAmount(value: string) {
  return value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
}

function getTotals(entries: { amount: number }[], walletItems: WalletView[]) {
  const walletBalance = walletItems.reduce((sum, wallet) => sum + wallet.balance, 0);
  const income = entries.filter((entry) => entry.amount > 0).reduce((sum, entry) => sum + entry.amount, 0);
  const expense = Math.abs(entries.filter((entry) => entry.amount < 0).reduce((sum, entry) => sum + entry.amount, 0));
  return { balance: walletBalance, income, expense };
}

function getVisibleCategories(type: string, categoryItems: CategoryView[]) {
  return categoryItems.filter((category) => category.kind === type || (type === "income" && category.name === "Other"));
}

function getCategoryMeta(category: string | CategoryView) {
  if (typeof category !== "string") return category;
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

function getGridLimitLabel(count: number, label: string) {
  return count > 0 ? `${count} ${label}${count === 1 ? "" : "s"}` : `No ${label}s`;
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentTimeInputValue() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function getUserInitials(user: FinanceUser) {
  const source = (user.name || user.email || "K").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function formatTransactionDate(value: string) {
  if (!value) return "Today";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Today";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTransactionDateTime(dateValue: string, timeValue: string) {
  const date = formatTransactionDate(dateValue);
  if (!timeValue) return date;
  const [hoursRaw, minutesRaw] = timeValue.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return date;
  const meridiem = hours >= 12 ? "PM" : "AM";
  const twelveHour = hours % 12 || 12;
  return `${date}, ${twelveHour}:${String(minutes).padStart(2, "0")} ${meridiem}`;
}

function getCalendarCells(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let index = 0; index < startOffset; index += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toDateInputValue(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getAuthUser() {
  return pb.authStore.model as unknown as FinanceUser | null;
}

function mapAccountToWallet(account: AccountRecord): WalletView {
  const meta = accountMeta[account.type] || accountMeta.other;
  return {
    id: account.id,
    name: account.name,
    type: account.type.replace("_", " "),
    balance: account.currentBalance ?? 0,
    ...meta,
  };
}

function mapCategoryToView(category: CategoryRecord): CategoryView {
  const meta = getCategoryMeta(category.name);
  return {
    id: category.id,
    name: category.name,
    kind: category.kind,
    label: meta.label,
    icon: meta.icon,
    text: meta.text,
  };
}

function getTransactionIcon(transaction: ExpandedTransaction) {
  const categoryName = transaction.expand?.category?.name || "";
  if (transaction.type === "income") return ArrowDownLeft;
  if (categoryName === "Bills") return CreditCard;
  if (categoryName === "Transport") return Car;
  if (categoryName === "Shopping") return ShoppingBag;
  return ArrowUpRight;
}

function mapTransactionToEntry(transaction: ExpandedTransaction): Entry {
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

function getBalanceDelta(type: string, amount: number) {
  if (type === "income") return Math.abs(amount);
  if (type === "expense") return -Math.abs(amount);
  return 0;
}

function getTransactionBalanceDelta(transaction: Pick<TransactionRecord, "type" | "amount">) {
  return getBalanceDelta(transaction.type, transaction.amount);
}

function toDateTimeParts(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: getTodayInputValue(), time: getCurrentTimeInputValue() };
  }
  return {
    date: date.toISOString().slice(0, 10),
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  };
}

function buildChartData(transactions: ExpandedTransaction[], range: ChartRange) {
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

function buildOccurredAt(dateValue: string, timeValue: string) {
  return new Date(`${dateValue}T${timeValue || "00:00"}:00`).toISOString();
}

function runDashboardSelfTests() {
  const sampleEntries = [{ amount: 100 }, { amount: -25 }, { amount: -10 }];
  const totals = getTotals(sampleEntries, fallbackWallets.map((wallet, index) => ({ ...wallet, id: `fallback-${index}` })));
  console.assert(peso(486) === "₱486.00", "peso formats positive values");
  console.assert(peso(-486) === "-₱486.00", "peso formats negative values");
  console.assert(totals.income === 100, "getTotals calculates income");
  console.assert(totals.expense === 35, "getTotals calculates expenses as absolute value");
  const categoryViews = fallbackCategories.map((category) => getCategoryMeta(category));
  console.assert(getVisibleCategories("income", categoryViews).some((category) => category.name === "Income"), "income categories include Income");
  console.assert(!getVisibleCategories("expense", categoryViews).some((category) => category.name === "Income"), "expense categories exclude Income");
  console.assert(getTotals([], fallbackWallets.map((wallet, index) => ({ ...wallet, id: `fallback-${index}` }))).balance === fallbackWallets.reduce((sum, wallet) => sum + wallet.balance, 0), "empty entries use wallet balance");
  console.assert(getTotals(sampleEntries, fallbackWallets.map((wallet, index) => ({ ...wallet, id: `fallback-${index}` }))).balance === fallbackWallets.reduce((sum, wallet) => sum + wallet.balance, 0), "transaction totals do not double-count account balances");
  console.assert(getGridLimitLabel(1, "wallet") === "1 wallet", "grid label handles singular count");
  console.assert(getGridLimitLabel(4, "wallet") === "4 wallets", "grid label handles plural count");
  console.assert(formatTransactionDate("2026-05-26") === "May 26, 2026", "date formatter handles transaction dates");
  console.assert(formatTransactionDateTime("2026-05-26", "14:05") === "May 26, 2026, 2:05 PM", "date time formatter handles transaction timestamps");
  console.assert(toDateInputValue(2026, 4, 26) === "2026-05-26", "calendar date value uses YYYY-MM-DD");
  console.assert(sanitizeAmount("12a.3.4") === "12.34", "amount sanitizer keeps only one decimal point");
  console.assert(getCategoryMeta("Dining").label === "Food & drinks", "category metadata returns Dining label");
  console.assert(getCalendarCells(2026, 4).includes(26), "calendar cells include a valid month day");
  console.assert(getBalanceDelta("income", 500) === 500, "income increases account balance");
  console.assert(getBalanceDelta("expense", 500) === -500, "expense decreases account balance");
  console.assert(buildChartData([], "week").length === 7, "weekly chart has seven daily buckets");
  console.assert(buildChartData([], "month").length === 8, "monthly chart has eight buckets");
  console.assert(buildChartData([], "year").length === 12, "yearly chart has twelve monthly buckets");
}

if (typeof window !== "undefined") runDashboardSelfTests();

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{children}</p>;
}

type Entry = {
  id?: string;
  title: string;
  amount: number;
  type: string;
  category: string;
  wallet: string;
  createdAt?: string;
  icon: LucideIcon;
  date?: string;
  time?: string;
  note?: string;
  categoryId?: string;
  walletId?: string;
  debtId?: string;
};

function dataTimestampFromEntry(entry: Entry) {
  if (entry.date && entry.time) return `${entry.date}T${entry.time}:00`;
  if (!entry.createdAt || entry.createdAt === "Logged") return new Date().toISOString();
  const parsed = new Date(entry.createdAt);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function AddEntryModal({
  open,
  onClose,
  onAdd,
  wallets,
  categories,
  isSaving,
  editEntry,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (entry: TransactionFormEntry) => Promise<void>;
  wallets: WalletView[];
  categories: CategoryView[];
  isSaving: boolean;
  editEntry?: Entry | null;
}) {
  const nowDate = getTodayInputValue();
  const initialParts = editEntry ? toDateTimeParts(dataTimestampFromEntry(editEntry)) : { date: nowDate, time: getCurrentTimeInputValue() };
  const initialForm = {
    type: editEntry?.type === "income" ? "income" : "expense",
    title: editEntry?.title || "",
    amount: editEntry ? String(Math.abs(editEntry.amount)) : "",
    date: initialParts.date,
    time: initialParts.time,
    category: editEntry?.category || categories.find((category) => category.kind === "expense")?.name || "Dining",
    wallet: editEntry?.wallet || wallets[0]?.name || "",
    note: editEntry?.note || "",
  };
  const [form, setForm] = useState(initialForm);
  const [isDateTimeOpen, setIsDateTimeOpen] = useState(false);
  const [clockMode, setClockMode] = useState("minute");
  const [dateTimeStep, setDateTimeStep] = useState("date");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const date = new Date(`${initialForm.date}T00:00:00`);
    return { year: date.getFullYear(), month: date.getMonth() };
  });


  const amount = Number(form.amount);
  const visibleCategories = getVisibleCategories(form.type, categories);
  const isReady = form.title.trim().length > 0 && amount > 0 && wallets.length > 0;
  const selectedWallet = wallets.find((wallet) => wallet.name === form.wallet) || wallets[0] || { ...fallbackWallets[0], id: "fallback-empty" };
  const SelectedWalletIcon = selectedWallet.icon;
  const calendarCells = getCalendarCells(calendarMonth.year, calendarMonth.month);
  const yearOptions = Array.from({ length: 11 }, (_, index) => new Date().getFullYear() - 5 + index);
  const selectedDay = form.date ? Number(form.date.split("-")[2]) : null;
  const selectedMonth = form.date ? Number(form.date.split("-")[1]) - 1 : null;
  const selectedYear = form.date ? Number(form.date.split("-")[0]) : null;
  const [selectedHourRaw, selectedMinuteRaw] = form.time.split(":");
  const selectedHour = Number(selectedHourRaw || 0);
  const selectedMinute = Number(selectedMinuteRaw || 0);
  const minuteAngle = (selectedMinute / 60) * 360 - 90;
  const hourAngle = ((selectedHour % 12) / 12) * 360 + (selectedMinute / 60) * 30 - 90;

  const update = (key: string, value: string) => {
    setForm((current) => {
      const next = { ...current, [key]: key === "amount" ? sanitizeAmount(value) : value };
      if (key === "type" && value === "income") {
        next.category = categories.find((category) => category.kind === "income")?.name || "Income";
        next.wallet = wallets[0]?.name || "";
      }
      if (key === "type" && value === "expense" && current.category === "Income") {
        next.category = categories.find((category) => category.kind === "expense")?.name || "Dining";
        next.wallet = wallets[0]?.name || "";
      }
      return next;
    });
  };

  const setNow = () => {
    const date = getTodayInputValue();
    const monthDate = new Date(`${date}T00:00:00`);
    setCalendarMonth({ year: monthDate.getFullYear(), month: monthDate.getMonth() });
    setForm((current) => ({ ...current, date, time: getCurrentTimeInputValue() }));
  };

  const moveCalendarMonth = (direction: number) => {
    setCalendarMonth((current) => {
      const date = new Date(current.year, current.month + direction, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  };

  const setClockFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX) + Math.PI / 2;
    const normalized = (angle + Math.PI * 2) % (Math.PI * 2);

    if (clockMode === "hour") {
      let hour12 = Math.round((normalized / (Math.PI * 2)) * 12) % 12;
      if (hour12 === 0) hour12 = 12;

      const isPM = selectedHour >= 12;
      const nextHour = isPM ? (hour12 === 12 ? 12 : hour12 + 12) : hour12 === 12 ? 0 : hour12;
      update("time", `${String(nextHour).padStart(2, "0")}:${String(selectedMinute).padStart(2, "0")}`);
      return;
    }

    const minutes = Math.round((normalized / (Math.PI * 2)) * 60) % 60;
    update("time", `${String(selectedHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
  };

  const submitEntry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isReady) return;
    const signedAmount = form.type === "expense" ? -Math.abs(amount) : Math.abs(amount);
    await onAdd({
      id: editEntry?.id,
      title: form.title.trim(),
      amount: signedAmount,
      type: form.type as "income" | "expense",
      category: form.category,
      wallet: form.wallet,
      date: form.date,
      time: form.time,
      note: form.note.trim(),
    });
    setForm({ type: "expense", title: "", amount: "", date: getTodayInputValue(), time: getCurrentTimeInputValue(), category: categories.find((category) => category.kind === "expense")?.name || "Dining", wallet: wallets[0]?.name || "", note: "" });
    setIsDateTimeOpen(false);
    setDateTimeStep("date");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.form
            onSubmit={submitEntry}
            onMouseDown={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="flex max-h-[calc(100vh-2rem)] w-[min(94vw,860px)] flex-col overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-950 text-white shadow-2xl shadow-black/60"
          >
            <div className="flex shrink-0 items-start justify-between border-b border-white/10 bg-white/[0.025] p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Transaction</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">{editEntry ? "Edit transaction" : "Add transaction"}</h2>
                <p className="mt-1 text-sm text-zinc-400">{editEntry ? "Changes will update the matching wallet balance." : "Date stays as now unless you choose to change it."}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-x-hidden overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/[0.06] p-1.5">
                {transactionTypeOptions.map(([value, label, Icon]) => (
                  <button
                    key={value as string}
                    type="button"
                    onClick={() => update("type", value as string)}
                    className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${form.type === value ? "bg-white text-zinc-950" : "text-zinc-400 hover:bg-white/10 hover:text-white"}`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel>Amount</FieldLabel>
                    <div className="mt-2 flex h-12 items-center rounded-lg border border-white/10 bg-black/20 px-3 focus-within:border-white/25 focus-within:bg-black/30">
                      <span className="mr-2 text-lg font-semibold text-zinc-500">₱</span>
                      <input
                        autoFocus
                        value={form.amount}
                        onChange={(event) => update("amount", event.target.value)}
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        className="min-w-0 flex-1 bg-transparent text-xl font-semibold tracking-tight text-white outline-none placeholder:text-zinc-700"
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Description</FieldLabel>
                    <input
                      value={form.title}
                      onChange={(event) => update("title", event.target.value)}
                      placeholder={form.type === "income" ? "Client payment, allowance, refund..." : "Food, bill, groceries..."}
                      className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/25 focus:bg-black/30"
                    />
                  </div>

                  <div>
                    <FieldLabel>Note</FieldLabel>
                    <textarea
                      value={form.note}
                      onChange={(event) => update("note", event.target.value)}
                      placeholder="Optional detail, reference, or reminder"
                      rows={5}
                      className="mt-2 h-[170px] w-full resize-none rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/25 focus:bg-black/30"
                    />
                  </div>

                  <div>
                    <FieldLabel>Date & time</FieldLabel>
                    <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-zinc-300">
                            <CalendarDays className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-zinc-100">{formatTransactionDateTime(form.date, form.time)}</p>
                            <p className="text-xs text-zinc-600">Defaults to now</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setIsDateTimeOpen((current) => !current);
                            setDateTimeStep("date");
                          }}
                          className="h-8 rounded-lg px-3 text-xs text-zinc-300 hover:bg-white/10 hover:text-white"
                        >
                          {isDateTimeOpen ? "Done" : "Change"}
                        </Button>
                      </div>

                      {isDateTimeOpen && (
                        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.025] p-3">
                          <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-white/[0.05] p-1">
                            {[
                              ["date", "1. Date"],
                              ["time", "2. Time"],
                            ].map(([value, label]) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setDateTimeStep(value)}
                                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${dateTimeStep === value ? "bg-white text-zinc-950" : "text-zinc-500 hover:bg-white/10 hover:text-white"}`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>

                          {dateTimeStep === "date" ? (
                            <div>
                              <div className="mb-3 grid grid-cols-[1fr_0.8fr_auto_auto] gap-2">
                                <select
                                  value={calendarMonth.month}
                                  onChange={(event) => setCalendarMonth((current) => ({ ...current, month: Number(event.target.value) }))}
                                  className="h-9 rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark] focus:border-white/25"
                                >
                                  {Array.from({ length: 12 }, (_, month) => (
                                    <option key={month} value={month}>
                                      {new Date(2026, month, 1).toLocaleDateString("en-US", { month: "long" })}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={calendarMonth.year}
                                  onChange={(event) => setCalendarMonth((current) => ({ ...current, year: Number(event.target.value) }))}
                                  className="h-9 rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark] focus:border-white/25"
                                >
                                  {yearOptions.map((year) => (
                                    <option key={year} value={year}>
                                      {year}
                                    </option>
                                  ))}
                                </select>
                                <button type="button" onClick={() => moveCalendarMonth(-1)} className="rounded-lg p-2 text-zinc-500 hover:bg-white/10 hover:text-white">
                                  <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button type="button" onClick={() => moveCalendarMonth(1)} className="rounded-lg p-2 text-zinc-500 hover:bg-white/10 hover:text-white">
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                              </div>

                              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase text-zinc-600">
                                {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                                  <span key={`${day}-${index}`}>{day}</span>
                                ))}
                              </div>
                              <div className="mt-1 grid grid-cols-7 gap-1">
                                {calendarCells.map((day, index) => {
                                  const selected = day && selectedDay === day && selectedMonth === calendarMonth.month && selectedYear === calendarMonth.year;
                                  return (
                                    <button
                                      key={`${day || "empty"}-${index}`}
                                      type="button"
                                      disabled={!day}
                                      onClick={() => {
                                        if (!day) return;
                                        update("date", toDateInputValue(calendarMonth.year, calendarMonth.month, day));
                                        setDateTimeStep("time");
                                      }}
                                      className={`h-8 rounded-md text-xs transition ${selected ? "bg-white text-zinc-950" : day ? "text-zinc-300 hover:bg-white/10 hover:text-white" : "cursor-default text-transparent"}`}
                                    >
                                      {day || ""}
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-zinc-600">
                                <span>Pick a date first. After selecting one, you'll choose the time.</span>
                                <Button type="button" variant="ghost" onClick={setNow} className="h-7 rounded-lg px-2 text-xs text-zinc-400 hover:bg-white/10 hover:text-white">
                                  Use now
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-[96px_1fr] items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
                              <div
                                role="slider"
                                tabIndex={0}
                                aria-label={clockMode === "hour" ? "Drag to set hour" : "Drag to set minutes"}
                                className="relative grid h-24 w-24 touch-none place-items-center rounded-full border border-white/10 bg-black/30"
                                onPointerDown={(event) => {
                                  event.currentTarget.setPointerCapture(event.pointerId);
                                  setClockFromPointer(event);
                                }}
                                onPointerMove={(event) => {
                                  if (event.buttons === 1) setClockFromPointer(event);
                                }}
                              >
                                <div className="absolute h-1.5 w-1.5 rounded-full bg-white" />
                                <div className={`absolute left-1/2 top-1/2 h-[2px] w-7 origin-left ${clockMode === "hour" ? "bg-white" : "bg-zinc-600"}`} style={{ transform: `rotate(${hourAngle}deg)` }} />
                                <div className={`absolute left-1/2 top-1/2 h-[2px] w-10 origin-left ${clockMode === "minute" ? "bg-emerald-300" : "bg-zinc-500"}`} style={{ transform: `rotate(${minuteAngle}deg)` }} />
                                <Clock3 className="h-4 w-4 text-zinc-600" />
                              </div>
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-xs text-zinc-500">Selected</p>
                                    <p className="mt-1 text-sm font-semibold text-zinc-100">{formatTransactionDateTime(form.date, form.time)}</p>
                                  </div>
                                  <Button type="button" variant="ghost" onClick={() => setDateTimeStep("date")} className="h-7 rounded-lg px-2 text-xs text-zinc-400 hover:bg-white/10 hover:text-white">
                                    Change date
                                  </Button>
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-white/[0.05] p-1">
                                  {[
                                    ["hour", "Hour"],
                                    ["minute", "Minute"],
                                  ].map(([value, label]) => (
                                    <button
                                      key={value}
                                      type="button"
                                      onClick={() => setClockMode(value)}
                                      className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${clockMode === value ? "bg-white text-zinc-950" : "text-zinc-500 hover:bg-white/10 hover:text-white"}`}
                                    >
                                      {label}
                                    </button>
                                  ))}
                                </div>
                                <input
                                  value={form.time}
                                  onChange={(event) => update("time", event.target.value)}
                                  type="time"
                                  className="mt-3 h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark] focus:border-white/25"
                                />
                                <p className="mt-2 text-[11px] text-zinc-600">Choose Hour or Minute, then drag the clock hand.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-[0.9fr_1.1fr]">
                <div className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <FieldLabel>Category</FieldLabel>
                    <span className="text-[11px] text-zinc-600">{getGridLimitLabel(visibleCategories.length, "category")}</span>
                  </div>
                  <div className="min-w-0 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="flex w-max snap-x snap-mandatory gap-2">
                      {visibleCategories.map((category) => {
                        const meta = getCategoryMeta(category);
                        const Icon = meta.icon;
                        const isSelected = form.category === category.name;
                        return (
                          <button
                            key={category.id || category.name}
                            type="button"
                            onClick={() => update("category", category.name)}
                            className={`w-[132px] shrink-0 snap-start rounded-lg border p-3 text-left transition ${isSelected ? "border-white/30 bg-white/[0.09]" : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]"}`}
                          >
                            <span className={`grid h-8 w-8 place-items-center rounded-lg bg-black/20 ${meta.text}`}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="mt-2 block truncate text-xs font-medium text-zinc-200">{category.name}</span>
                            <span className="mt-1 block truncate text-xs text-zinc-600">{meta.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <FieldLabel>Wallet</FieldLabel>
                    <span className="text-[11px] text-zinc-600">{getGridLimitLabel(wallets.length, "wallet")}</span>
                  </div>
                  <div className="min-w-0 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="flex w-max snap-x snap-mandatory gap-2">
                      {wallets.map((wallet) => {
                        const Icon = wallet.icon;
                        const isSelected = form.wallet === wallet.name;
                        return (
                          <button
                            key={wallet.name}
                            type="button"
                            onClick={() => update("wallet", wallet.name)}
                            className={`w-[132px] shrink-0 snap-start rounded-lg border p-3 text-left transition ${isSelected ? "border-white/30 bg-white/[0.09]" : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]"}`}
                          >
                            <span className={`grid h-8 w-8 place-items-center rounded-lg bg-black/20 ${wallet.text}`}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="mt-2 block truncate text-xs font-medium text-zinc-200">{wallet.name}</span>
                            <span className={wallet.balance < 0 ? "mt-1 block truncate text-xs font-semibold text-rose-300" : "mt-1 block truncate text-xs font-semibold text-zinc-500"}>
                              {peso(wallet.balance)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-zinc-950/95 p-5 backdrop-blur">
              <div className="flex min-w-0 items-center gap-3 text-xs text-zinc-500">
                <SelectedWalletIcon className={`h-4 w-4 ${selectedWallet.text}`} />
                <span className="truncate">Saving to {form.wallet} · {formatTransactionDateTime(form.date, form.time)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">
                  Cancel
                </Button>
                <Button type="submit" disabled={!isReady || isSaving} className="rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40">
                  {isSaving ? "Saving..." : editEntry ? "Save changes" : "Save transaction"}
                </Button>
              </div>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type TransactionFilters = {
  query: string;
  type: "all" | "income" | "expense";
  accountId: string;
  categoryId: string;
  from: string;
  to: string;
  sort: "newest" | "oldest" | "amountHigh" | "amountLow";
};

const emptyFilters: TransactionFilters = {
  query: "",
  type: "all",
  accountId: "all",
  categoryId: "all",
  from: "",
  to: "",
  sort: "newest",
};

function filterTransactions(entries: Entry[], filters: TransactionFilters) {
  const query = filters.query.trim().toLowerCase();
  return entries
    .filter((entry) => {
      if (filters.type !== "all" && entry.type !== filters.type) return false;
      if (filters.accountId !== "all" && entry.walletId !== filters.accountId) return false;
      if (filters.categoryId !== "all" && entry.categoryId !== filters.categoryId) return false;
      if (filters.from && dataTimestampFromEntry(entry).slice(0, 10) < filters.from) return false;
      if (filters.to && dataTimestampFromEntry(entry).slice(0, 10) > filters.to) return false;
      if (!query) return true;
      return [entry.title, entry.note, entry.wallet, entry.category].some((value) => (value || "").toLowerCase().includes(query));
    })
    .sort((a, b) => {
      if (filters.sort === "oldest") return dataTimestampFromEntry(a).localeCompare(dataTimestampFromEntry(b));
      if (filters.sort === "amountHigh") return Math.abs(b.amount) - Math.abs(a.amount);
      if (filters.sort === "amountLow") return Math.abs(a.amount) - Math.abs(b.amount);
      return dataTimestampFromEntry(b).localeCompare(dataTimestampFromEntry(a));
    });
}

function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="w-[min(92vw,420px)] rounded-[1.25rem] border border-white/10 bg-zinc-950 p-5 text-white shadow-2xl" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-zinc-400">{description}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={busy} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">Cancel</Button>
              <Button type="button" onClick={onConfirm} disabled={busy} className="rounded-lg bg-rose-500 text-white hover:bg-rose-400">{busy ? "Working..." : confirmLabel}</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TransactionsPage({
  entries,
  wallets,
  categories,
  onAdd,
  onEdit,
  onDelete,
}: {
  entries: Entry[];
  wallets: WalletView[];
  categories: CategoryView[];
  onAdd: () => void;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
}) {
  const [filters, setFilters] = useState<TransactionFilters>(emptyFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filteredEntries = useMemo(() => filterTransactions(entries, filters), [entries, filters]);
  const hasAdvancedFilters = filters.query !== emptyFilters.query || filters.accountId !== emptyFilters.accountId || filters.categoryId !== emptyFilters.categoryId || filters.from !== emptyFilters.from || filters.to !== emptyFilters.to || filters.sort !== emptyFilters.sort;
  const clearAdvancedFilters = () => setFilters((current) => ({ ...emptyFilters, type: current.type }));

  return (
    <div className="space-y-4">
      <Card className="rounded-[1.25rem] border-white/10 bg-white/[0.04] text-white">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={() => setIsFilterOpen(true)} className={`grid h-8 w-8 place-items-center rounded-lg border transition ${hasAdvancedFilters ? "border-white/25 bg-white text-zinc-950" : "border-white/10 bg-black/20 text-zinc-400 hover:bg-white/10 hover:text-white"}`} title="Transaction filters"><Filter className="h-4 w-4" /></button>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-black/20 p-1 text-xs">
              {(["all", "income", "expense"] as const).map((type) => <button key={type} type="button" onClick={() => setFilters((current) => ({ ...current, type, categoryId: "all" }))} className={`rounded-md px-4 py-1.5 capitalize transition ${filters.type === type ? "bg-white text-zinc-950" : "text-zinc-400 hover:bg-white/10 hover:text-white"}`}>{type}</button>)}
            </div>
            {hasAdvancedFilters && <button type="button" onClick={clearAdvancedFilters} className="rounded-lg px-2 py-1.5 text-xs text-zinc-500 transition hover:bg-white/10 hover:text-white">Clear filters</button>}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button onClick={onAdd} className="h-8 rounded-lg bg-white px-3 text-xs text-zinc-950 hover:bg-zinc-200"><Plus className="h-3.5 w-3.5" /> Transaction</Button>
          </div>
        </div>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-zinc-200">No transactions yet</p>
              <p className="mt-1 text-sm text-zinc-500">Add one manually to start tracking activity.</p>
              <div className="mt-4 flex justify-center gap-2"><Button onClick={onAdd} className="rounded-lg bg-white text-zinc-950 hover:bg-zinc-200"><Plus className="h-4 w-4" /> Add transaction</Button></div>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-zinc-200">No transactions match these filters</p>
              {hasAdvancedFilters && <Button type="button" variant="ghost" onClick={clearAdvancedFilters} className="mt-3 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">Clear filters</Button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[1060px]">
                <div className="grid grid-cols-[minmax(320px,1.15fr)_minmax(280px,1.1fr)_150px_170px_130px_84px] gap-x-4 border-b border-white/10 px-4 py-2 text-xs uppercase tracking-[0.14em] text-zinc-600">
                  <span>Transaction</span>
                  <span>Wallet</span>
                  <span>Category</span>
                  <span>Date</span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Manage</span>
                </div>
                {filteredEntries.map((entry) => {
                  const Icon = entry.icon;
                  const isIncome = entry.amount > 0;
                  return (
                    <div key={entry.id || `${entry.title}-${entry.createdAt}`} className="grid grid-cols-[minmax(320px,1.15fr)_minmax(280px,1.1fr)_150px_170px_130px_84px] items-center gap-x-4 border-b border-white/10 px-4 py-2.5 text-sm transition last:border-b-0 hover:bg-white/[0.025]">
                      <button type="button" onClick={() => !entry.debtId && onEdit(entry)} className="flex min-w-0 items-center gap-3 text-left" title={entry.debtId ? "Edit from Debts to keep balances in sync" : undefined}>
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${isIncome ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}><Icon className="h-4 w-4" /></span>
                        <span className="min-w-0"><span className="block truncate font-medium text-zinc-100">{entry.title}</span><span className="block truncate text-xs text-zinc-600">{entry.note || "No note"}</span></span>
                      </button>
                      <p className="truncate text-zinc-400" title={entry.wallet}>{entry.wallet}</p>
                      <p className={isIncome ? "truncate text-emerald-300" : "truncate text-rose-300"}>{entry.category}</p>
                      <p className="text-zinc-500">{entry.createdAt || "Logged"}</p>
                      <p className={`text-right font-semibold ${isIncome ? "text-emerald-300" : "text-rose-300"}`}>{peso(entry.amount)}</p>
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="ghost" size="icon-sm" disabled={Boolean(entry.debtId)} onClick={() => onEdit(entry)} title="Edit" className="h-8 w-8 rounded-md text-zinc-400 hover:bg-white/10 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"><Edit3 className="h-4 w-4" /></Button>
                        <Button type="button" variant="ghost" size="icon-sm" disabled={Boolean(entry.debtId)} onClick={() => onDelete(entry)} title="Delete" className="h-8 w-8 rounded-md text-rose-300 hover:bg-rose-400/10 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setIsFilterOpen(false)}>
            <motion.div className="w-[min(92vw,680px)] overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-950 text-white shadow-2xl" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} onMouseDown={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between border-b border-white/10 p-5"><div><p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Filters</p><h2 className="mt-1 text-xl font-semibold">Transaction filters</h2></div><Button type="button" variant="ghost" size="icon" onClick={() => setIsFilterOpen(false)} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></Button></div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="sm:col-span-2"><FieldLabel>Search</FieldLabel><input value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="Merchant, notes, account" className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25" /></div>
                <div><FieldLabel>Wallet</FieldLabel><select value={filters.accountId} onChange={(event) => setFilters((current) => ({ ...current, accountId: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]"><option value="all">All wallets</option>{wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select></div>
                <div><FieldLabel>Category</FieldLabel><select value={filters.categoryId} onChange={(event) => setFilters((current) => ({ ...current, categoryId: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]"><option value="all">All categories</option>{categories.filter((category) => filters.type === "all" || category.kind === filters.type).map((category) => <option key={category.id || category.name} value={category.id || category.name}>{category.name}</option>)}</select></div>
                <div><FieldLabel>From</FieldLabel><input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]" /></div>
                <div><FieldLabel>To</FieldLabel><input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]" /></div>
                <div><FieldLabel>Sort</FieldLabel><select value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value as TransactionFilters["sort"] }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="amountHigh">Highest amount</option><option value="amountLow">Lowest amount</option></select></div>
              </div>
              <div className="flex justify-end gap-2 border-t border-white/10 p-5"><Button type="button" variant="ghost" onClick={clearAdvancedFilters} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">Clear</Button><Button type="button" onClick={() => setIsFilterOpen(false)} className="rounded-lg bg-white text-zinc-950 hover:bg-zinc-200">Apply</Button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const accountTypeOptions: AccountType[] = ["cash", "bank", "credit_card", "e_wallet", "savings", "investment", "other"];

type CategoryFormValue = {
  id?: string;
  name: string;
  kind: "income" | "expense";
  color: string;
  icon: string;
  isArchived: boolean;
};

type AccountFormValue = {
  id?: string;
  name: string;
  type: AccountType;
  startingBalance: number;
  currentBalance: number;
  isArchived: boolean;
};

function CategoryModal({
  open,
  onClose,
  onSave,
  isSaving,
  category,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (value: CategoryFormValue) => Promise<void>;
  isSaving: boolean;
  category?: CategoryRecord | null;
}) {
  const [form, setForm] = useState<CategoryFormValue>({
    id: category?.id,
    name: category?.name || "",
    kind: category?.kind || "expense",
    color: category?.color || "#8b5cf6",
    icon: category?.icon || "other",
    isArchived: Boolean(category?.isArchived),
  });

  const ready = form.name.trim().length > 0 && /^#[0-9a-fA-F]{6}$/.test(form.color);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.form
            onSubmit={(event) => {
              event.preventDefault();
              if (ready) void onSave({ ...form, name: form.name.trim() });
            }}
            onMouseDown={(event) => event.stopPropagation()}
            className="w-[min(92vw,520px)] overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-950 text-white shadow-2xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
          >
            <div className="flex items-start justify-between border-b border-white/10 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Category</p>
                <h2 className="mt-1 text-xl font-semibold">{category ? "Edit category" : "Add category"}</h2>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <FieldLabel>Name</FieldLabel>
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Food, Salary, Utilities..." className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Kind</FieldLabel>
                  <select value={form.kind} onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value as "income" | "expense" }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]">
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Color</FieldLabel>
                  <div className="mt-2 flex h-11 items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3">
                    <input type="color" value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} className="h-7 w-9 rounded border-0 bg-transparent" />
                    <input value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none" />
                  </div>
                </div>
              </div>
              <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm">
                <span><span className="block font-medium text-zinc-200">Archived</span><span className="text-xs text-zinc-500">Hide from new transaction forms.</span></span>
                <input type="checkbox" checked={form.isArchived} onChange={(event) => setForm((current) => ({ ...current, isArchived: event.target.checked }))} />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-white/10 p-5">
              <Button type="button" variant="ghost" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">Cancel</Button>
              <Button type="submit" disabled={!ready || isSaving} className="rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-40">{isSaving ? "Saving..." : "Save category"}</Button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AccountModal({
  open,
  onClose,
  onSave,
  isSaving,
  account,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (value: AccountFormValue) => Promise<void>;
  isSaving: boolean;
  account?: AccountRecord | null;
}) {
  const [form, setForm] = useState<AccountFormValue>({
    id: account?.id,
    name: account?.name || "",
    type: account?.type || "cash",
    startingBalance: account?.startingBalance || 0,
    currentBalance: account?.currentBalance || 0,
    isArchived: Boolean(account?.isArchived),
  });
  const ready = form.name.trim().length > 0 && Number.isFinite(form.startingBalance) && Number.isFinite(form.currentBalance);
  const currentBalanceValue = account ? account.currentBalance || 0 : form.startingBalance;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.form
            onSubmit={(event) => {
              event.preventDefault();
              if (ready) void onSave({ ...form, name: form.name.trim() });
            }}
            onMouseDown={(event) => event.stopPropagation()}
            className="w-[min(92vw,560px)] overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-950 text-white shadow-2xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
          >
            <div className="flex items-start justify-between border-b border-white/10 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Account</p>
                <h2 className="mt-1 text-xl font-semibold">{account ? "Edit account" : "Add account"}</h2>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <FieldLabel>Name</FieldLabel>
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Cash, BPI, Maya..." className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <FieldLabel>Type</FieldLabel>
                  <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as AccountType }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]">
                    {accountTypeOptions.map((type) => <option key={type} value={type}>{type.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>Starting</FieldLabel>
                  <input type="number" step="0.01" value={form.startingBalance} onChange={(event) => {
                    const nextBalance = Number(event.target.value);
                    setForm((current) => ({ ...current, startingBalance: nextBalance, currentBalance: account ? current.currentBalance : nextBalance }));
                  }} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]" />
                </div>
                <div>
                  <FieldLabel>Current</FieldLabel>
                  <input type="number" step="0.01" value={currentBalanceValue} disabled={Boolean(account)} onChange={(event) => setForm((current) => ({ ...current, currentBalance: Number(event.target.value) }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none disabled:opacity-60 [color-scheme:dark]" />
                </div>
              </div>
              {account && <p className="rounded-lg border border-amber-400/15 bg-amber-400/10 p-3 text-xs text-amber-200">Current balance is controlled by transactions. Edit the name, type, archive state, or starting balance metadata here.</p>}
              <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm">
                <span><span className="block font-medium text-zinc-200">Archived</span><span className="text-xs text-zinc-500">Hide from new transaction forms.</span></span>
                <input type="checkbox" checked={form.isArchived} onChange={(event) => setForm((current) => ({ ...current, isArchived: event.target.checked }))} />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-white/10 p-5">
              <Button type="button" variant="ghost" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">Cancel</Button>
              <Button type="submit" disabled={!ready || isSaving} className="rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-40">{isSaving ? "Saving..." : "Save account"}</Button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type CategoryFilters = {
  query: string;
  kind: "all" | "income" | "expense";
  status: "active" | "archived" | "all";
  sort: "name" | "kind" | "mostUsed" | "newest";
};

type AccountFilters = {
  query: string;
  type: "all" | AccountType;
  status: "active" | "archived" | "all";
  balance: "all" | "positive" | "zero" | "negative";
  sort: "balanceHigh" | "balanceLow" | "name" | "type" | "newest";
};

const emptyCategoryFilters: CategoryFilters = { query: "", kind: "all", status: "active", sort: "name" };
const emptyAccountFilters: AccountFilters = { query: "", type: "all", status: "active", balance: "all", sort: "balanceHigh" };

function getCategoryUsage(categoryId: string, transactions: ExpandedTransaction[], budgets: ExpandedBudget[]) {
  return {
    transactions: transactions.filter((transaction) => transaction.category === categoryId).length,
    budgets: budgets.filter((budget) => budget.category === categoryId).length,
  };
}

function getAccountUsage(accountId: string, transactions: ExpandedTransaction[]) {
  return transactions.filter((transaction) => transaction.account === accountId || transaction.transferAccount === accountId).length;
}

function filterCategoryRecords(categories: CategoryRecord[], filters: CategoryFilters, transactions: ExpandedTransaction[], budgets: ExpandedBudget[]) {
  const query = filters.query.trim().toLowerCase();
  return categories
    .filter((category) => {
      if (filters.kind !== "all" && category.kind !== filters.kind) return false;
      if (filters.status === "active" && category.isArchived) return false;
      if (filters.status === "archived" && !category.isArchived) return false;
      if (!query) return true;
      return [category.name, category.icon].some((value) => (value || "").toLowerCase().includes(query));
    })
    .sort((a, b) => {
      if (filters.sort === "kind") return `${a.kind}-${a.name}`.localeCompare(`${b.kind}-${b.name}`);
      if (filters.sort === "mostUsed") {
        const aUsage = getCategoryUsage(a.id, transactions, budgets);
        const bUsage = getCategoryUsage(b.id, transactions, budgets);
        return bUsage.transactions + bUsage.budgets - (aUsage.transactions + aUsage.budgets);
      }
      if (filters.sort === "newest") return b.created.localeCompare(a.created);
      return a.name.localeCompare(b.name);
    });
}

function filterAccountRecords(accounts: AccountRecord[], filters: AccountFilters) {
  const query = filters.query.trim().toLowerCase();
  return accounts
    .filter((account) => {
      const balance = account.currentBalance || 0;
      if (filters.type !== "all" && account.type !== filters.type) return false;
      if (filters.status === "active" && account.isArchived) return false;
      if (filters.status === "archived" && !account.isArchived) return false;
      if (filters.balance === "positive" && balance <= 0) return false;
      if (filters.balance === "zero" && balance !== 0) return false;
      if (filters.balance === "negative" && balance >= 0) return false;
      if (!query) return true;
      return [account.name, account.type].some((value) => (value || "").toLowerCase().includes(query));
    })
    .sort((a, b) => {
      if (filters.sort === "balanceLow") return (a.currentBalance || 0) - (b.currentBalance || 0);
      if (filters.sort === "name") return a.name.localeCompare(b.name);
      if (filters.sort === "type") return `${a.type}-${a.name}`.localeCompare(`${b.type}-${b.name}`);
      if (filters.sort === "newest") return b.created.localeCompare(a.created);
      return (b.currentBalance || 0) - (a.currentBalance || 0);
    });
}

function CategoriesPage({
  categories,
  transactions,
  budgets,
  onAdd,
  onEdit,
  onArchive,
}: {
  categories: CategoryRecord[];
  transactions: ExpandedTransaction[];
  budgets: ExpandedBudget[];
  onAdd: () => void;
  onEdit: (category: CategoryRecord) => void;
  onArchive: (category: CategoryRecord) => void;
}) {
  const [filters, setFilters] = useState<CategoryFilters>(emptyCategoryFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const visibleCategories = useMemo(() => filterCategoryRecords(categories, filters, transactions, budgets), [budgets, categories, filters, transactions]);
  const hasAdvancedFilters = filters.query !== emptyCategoryFilters.query || filters.kind !== emptyCategoryFilters.kind || filters.sort !== emptyCategoryFilters.sort;
  const clearAdvancedFilters = () => setFilters((current) => ({ ...emptyCategoryFilters, status: current.status }));

  return (
    <div className="space-y-4">
      <section className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] text-white">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={() => setIsFilterOpen(true)} className={`grid h-8 w-8 place-items-center rounded-lg border transition ${hasAdvancedFilters ? "border-white/25 bg-white text-zinc-950" : "border-white/10 bg-black/20 text-zinc-400 hover:bg-white/10 hover:text-white"}`} title="Category filters">
              <Filter className="h-4 w-4" />
            </button>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-black/20 p-1 text-xs">
              {(["active", "archived", "all"] as const).map((status) => (
                <button key={status} type="button" onClick={() => setFilters((current) => ({ ...current, status }))} className={`rounded-md px-4 py-1.5 capitalize transition ${filters.status === status ? "bg-white text-zinc-950" : "text-zinc-400 hover:bg-white/10 hover:text-white"}`}>{status}</button>
              ))}
            </div>
            {hasAdvancedFilters && <button type="button" onClick={clearAdvancedFilters} className="rounded-lg px-2 py-1.5 text-xs text-zinc-500 transition hover:bg-white/10 hover:text-white">Clear filters</button>}
          </div>
          <Button onClick={onAdd} className="h-8 shrink-0 rounded-lg bg-white px-3 text-xs text-zinc-950 hover:bg-zinc-200"><Plus className="h-3.5 w-3.5" /> Category</Button>
        </div>
          {categories.length === 0 ? (
            <div className="p-10 text-center"><p className="text-sm font-semibold text-zinc-200">No categories yet</p></div>
          ) : visibleCategories.length === 0 ? (
            <div className="p-10 text-center"><p className="text-sm font-semibold text-zinc-200">No categories match these filters</p>{hasAdvancedFilters && <Button type="button" variant="ghost" onClick={clearAdvancedFilters} className="mt-3 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">Clear filters</Button>}</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[minmax(280px,1.4fr)_120px_150px_120px_112px] gap-x-8 border-b border-white/10 px-4 py-2 text-xs uppercase tracking-[0.14em] text-zinc-600">
                  <span>Category</span>
                  <span>Kind</span>
                  <span>Usage</span>
                  <span>Status</span>
                  <span className="text-right">Manage</span>
                </div>
                {visibleCategories.map((category) => {
                  const meta = getCategoryMeta(category.name);
                  const Icon = meta.icon;
                  const usage = getCategoryUsage(category.id, transactions, budgets);
                  return (
                    <div key={category.id} className="grid grid-cols-[minmax(280px,1.4fr)_120px_150px_120px_112px] items-center gap-x-8 border-b border-white/10 px-4 py-2.5 text-sm transition last:border-b-0 hover:bg-white/[0.025]">
                      <button type="button" onClick={() => onEdit(category)} className="flex min-w-0 items-center gap-3 text-left">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-black/20 ${meta.text}`} style={{ border: `1px solid ${category.color}` }}><Icon className="h-4 w-4" /></span>
                        <span className="min-w-0"><span className="block truncate font-medium text-zinc-100">{category.name}</span><span className="block truncate text-xs text-zinc-600">{category.isSystem ? "System category" : "Custom category"}</span></span>
                      </button>
                      <p className={category.kind === "income" ? "capitalize text-emerald-300" : "capitalize text-rose-300"}>{category.kind}</p>
                      <p className="text-zinc-400">{usage.transactions} tx · {usage.budgets} budget</p>
                      <p className={category.isArchived ? "text-zinc-500" : "text-emerald-300"}>{category.isArchived ? "Archived" : "Active"}</p>
                      <div className="flex justify-end gap-1.5"><Button type="button" variant="ghost" size="icon-sm" onClick={() => onEdit(category)} title="Edit" className="h-8 w-8 rounded-md text-zinc-400 hover:bg-white/10 hover:text-zinc-200"><Edit3 className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon-sm" onClick={() => onArchive(category)} title={category.isArchived ? "Restore" : "Archive"} className="h-8 w-8 rounded-md text-amber-300 hover:bg-amber-400/10 hover:text-amber-200"><Archive className="h-4 w-4" /></Button></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
      </section>

      <AnimatePresence>
        {isFilterOpen && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setIsFilterOpen(false)}>
            <motion.div className="w-[min(92vw,520px)] overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-950 text-white shadow-2xl" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} onMouseDown={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between border-b border-white/10 p-5"><div><p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Filters</p><h2 className="mt-1 text-xl font-semibold">Category filters</h2></div><Button type="button" variant="ghost" size="icon" onClick={() => setIsFilterOpen(false)} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></Button></div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="sm:col-span-2"><FieldLabel>Search</FieldLabel><input value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="Category name" className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25" /></div>
                <div><FieldLabel>Kind</FieldLabel><select value={filters.kind} onChange={(event) => setFilters((current) => ({ ...current, kind: event.target.value as CategoryFilters["kind"] }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]"><option value="all">All kinds</option><option value="income">Income</option><option value="expense">Expense</option></select></div>
                <div><FieldLabel>Sort</FieldLabel><select value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value as CategoryFilters["sort"] }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]"><option value="name">Name</option><option value="kind">Kind</option><option value="mostUsed">Most used</option><option value="newest">Newest</option></select></div>
              </div>
              <div className="flex justify-end gap-2 border-t border-white/10 p-5"><Button type="button" variant="ghost" onClick={clearAdvancedFilters} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">Clear</Button><Button type="button" onClick={() => setIsFilterOpen(false)} className="rounded-lg bg-white text-zinc-950 hover:bg-zinc-200">Apply</Button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccountsPage({
  accounts,
  transactions,
  onAdd,
  onEdit,
  onArchive,
}: {
  accounts: AccountRecord[];
  transactions: ExpandedTransaction[];
  onAdd: () => void;
  onEdit: (account: AccountRecord) => void;
  onArchive: (account: AccountRecord) => void;
}) {
  const [filters, setFilters] = useState<AccountFilters>(emptyAccountFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const visibleAccounts = useMemo(() => filterAccountRecords(accounts, filters), [accounts, filters]);
  const hasAdvancedFilters = filters.query !== emptyAccountFilters.query || filters.type !== emptyAccountFilters.type || filters.balance !== emptyAccountFilters.balance || filters.sort !== emptyAccountFilters.sort;
  const clearAdvancedFilters = () => setFilters((current) => ({ ...emptyAccountFilters, status: current.status }));

  return (
    <div className="space-y-4">
      <section className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] text-white">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={() => setIsFilterOpen(true)} className={`grid h-8 w-8 place-items-center rounded-lg border transition ${hasAdvancedFilters ? "border-white/25 bg-white text-zinc-950" : "border-white/10 bg-black/20 text-zinc-400 hover:bg-white/10 hover:text-white"}`} title="Account filters"><Filter className="h-4 w-4" /></button>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-black/20 p-1 text-xs">
              {(["active", "archived", "all"] as const).map((status) => <button key={status} type="button" onClick={() => setFilters((current) => ({ ...current, status }))} className={`rounded-md px-4 py-1.5 capitalize transition ${filters.status === status ? "bg-white text-zinc-950" : "text-zinc-400 hover:bg-white/10 hover:text-white"}`}>{status}</button>)}
            </div>
            {hasAdvancedFilters && <button type="button" onClick={clearAdvancedFilters} className="rounded-lg px-2 py-1.5 text-xs text-zinc-500 transition hover:bg-white/10 hover:text-white">Clear filters</button>}
          </div>
          <Button onClick={onAdd} className="h-8 shrink-0 rounded-lg bg-white px-3 text-xs text-zinc-950 hover:bg-zinc-200"><Plus className="h-3.5 w-3.5" /> Account</Button>
        </div>
          {accounts.length === 0 ? (
            <div className="p-10 text-center"><p className="text-sm font-semibold text-zinc-200">No accounts yet</p></div>
          ) : visibleAccounts.length === 0 ? (
            <div className="p-10 text-center"><p className="text-sm font-semibold text-zinc-200">No accounts match these filters</p>{hasAdvancedFilters && <Button type="button" variant="ghost" onClick={clearAdvancedFilters} className="mt-3 rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">Clear filters</Button>}</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-[minmax(260px,1.4fr)_120px_140px_140px_110px_112px] gap-x-8 border-b border-white/10 px-4 py-2 text-xs uppercase tracking-[0.14em] text-zinc-600"><span>Account</span><span>Type</span><span>Starting</span><span>Current</span><span>Usage</span><span className="text-right">Manage</span></div>
                {visibleAccounts.map((account) => {
                  const wallet = mapAccountToWallet(account);
                  const Icon = wallet.icon;
                  const usage = getAccountUsage(account.id, transactions);
                  return (
                    <div key={account.id} className="grid grid-cols-[minmax(260px,1.4fr)_120px_140px_140px_110px_112px] items-center gap-x-8 border-b border-white/10 px-4 py-2.5 text-sm transition last:border-b-0 hover:bg-white/[0.025]">
                      <button type="button" onClick={() => onEdit(account)} className="flex min-w-0 items-center gap-3 text-left"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-black/20 ${wallet.text}`}><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate font-medium text-zinc-100">{account.name}</span><span className={account.isArchived ? "block truncate text-xs text-zinc-500" : "block truncate text-xs text-emerald-300"}>{account.isArchived ? "Archived" : "Active"}</span></span></button>
                      <p className="capitalize text-zinc-400">{account.type.replace("_", " ")}</p>
                      <p className="text-zinc-400">{peso(account.startingBalance || 0)}</p>
                      <p className={(account.currentBalance || 0) < 0 ? "font-semibold text-rose-300" : "font-semibold text-zinc-100"}>{peso(account.currentBalance || 0)}</p>
                      <p className="text-zinc-400">{usage} tx</p>
                      <div className="flex justify-end gap-1.5"><Button type="button" variant="ghost" size="icon-sm" onClick={() => onEdit(account)} title="Edit" className="h-8 w-8 rounded-md text-zinc-400 hover:bg-white/10 hover:text-zinc-200"><Edit3 className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon-sm" onClick={() => onArchive(account)} title={account.isArchived ? "Restore" : "Archive"} className="h-8 w-8 rounded-md text-amber-300 hover:bg-amber-400/10 hover:text-amber-200"><Archive className="h-4 w-4" /></Button></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
      </section>

      <AnimatePresence>
        {isFilterOpen && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setIsFilterOpen(false)}>
            <motion.div className="w-[min(92vw,560px)] overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-950 text-white shadow-2xl" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} onMouseDown={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between border-b border-white/10 p-5"><div><p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Filters</p><h2 className="mt-1 text-xl font-semibold">Account filters</h2></div><Button type="button" variant="ghost" size="icon" onClick={() => setIsFilterOpen(false)} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></Button></div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="sm:col-span-2"><FieldLabel>Search</FieldLabel><input value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="Account name" className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25" /></div>
                <div><FieldLabel>Type</FieldLabel><select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value as AccountFilters["type"] }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]"><option value="all">All types</option>{accountTypeOptions.map((type) => <option key={type} value={type}>{type.replace("_", " ")}</option>)}</select></div>
                <div><FieldLabel>Balance</FieldLabel><select value={filters.balance} onChange={(event) => setFilters((current) => ({ ...current, balance: event.target.value as AccountFilters["balance"] }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]"><option value="all">All balances</option><option value="positive">Positive</option><option value="zero">Zero</option><option value="negative">Negative</option></select></div>
                <div><FieldLabel>Sort</FieldLabel><select value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value as AccountFilters["sort"] }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]"><option value="balanceHigh">Balance high</option><option value="balanceLow">Balance low</option><option value="name">Name</option><option value="type">Type</option><option value="newest">Newest</option></select></div>
              </div>
              <div className="flex justify-end gap-2 border-t border-white/10 p-5"><Button type="button" variant="ghost" onClick={clearAdvancedFilters} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">Clear</Button><Button type="button" onClick={() => setIsFilterOpen(false)} className="rounded-lg bg-white text-zinc-950 hover:bg-zinc-200">Apply</Button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const debtKindOptions: DebtKind[] = ["personal", "credit_card", "installment"];

type DebtFormValue = {
  id?: string;
  name: string;
  kind: DebtKind;
  amount: number;
  paidAmount: number;
  dueDate: string;
  notes: string;
  isArchived: boolean;
};

type DebtPaymentValue = {
  debt: DebtRecord;
  accountId: string;
  categoryId: string;
  amount: number;
  date: string;
  notes: string;
  createTransaction: boolean;
};

type DebtAdvancedFilters = {
  query: string;
  kind: DebtKind | "all";
  dueFrom: string;
  dueTo: string;
  minLeft: string;
  maxLeft: string;
};

const emptyDebtAdvancedFilters: DebtAdvancedFilters = {
  query: "",
  kind: "all",
  dueFrom: "",
  dueTo: "",
  minLeft: "",
  maxLeft: "",
};

function getDebtRemaining(debt: DebtRecord) {
  return Math.max(0, (debt.amount || 0) - (debt.paidAmount || 0));
}

function getDebtDueDate(debt: DebtRecord) {
  if (debt.dueDate) {
    const due = new Date(debt.dueDate);
    if (!Number.isNaN(due.getTime())) return due;
  }
  return null;
}

function getDebtSummary(debts: DebtRecord[]) {
  const active = debts.filter((debt) => !debt.isArchived && getDebtRemaining(debt) > 0);
  const paid = debts.filter((debt) => !debt.isArchived && getDebtRemaining(debt) <= 0);
  const totalOwed = active.reduce((sum, debt) => sum + getDebtRemaining(debt), 0);
  const totalPaid = debts.filter((debt) => !debt.isArchived).reduce((sum, debt) => sum + Math.max(0, debt.paidAmount || 0), 0);
  const nextDue = active
    .map((debt) => ({ debt, due: getDebtDueDate(debt) }))
    .filter((item): item is { debt: DebtRecord; due: Date } => Boolean(item.due))
    .sort((a, b) => a.due.getTime() - b.due.getTime())[0];

  return { active, paid, totalOwed, totalPaid, nextDue };
}

function DebtModal({
  open,
  onClose,
  onSave,
  isSaving,
  debt,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (value: DebtFormValue) => Promise<void>;
  isSaving: boolean;
  debt?: DebtRecord | null;
}) {
  const [form, setForm] = useState<DebtFormValue>({
    id: debt?.id,
    name: debt?.name || "",
    kind: debt?.kind || "personal",
    amount: debt?.amount || 0,
    paidAmount: debt?.paidAmount || 0,
    dueDate: debt?.dueDate ? debt.dueDate.slice(0, 10) : "",
    notes: debt?.notes || "",
    isArchived: Boolean(debt?.isArchived),
  });
  const ready = form.name.trim().length > 0 && form.amount > 0 && form.paidAmount >= 0;

  const updateNumber = (key: keyof DebtFormValue, value: string) => {
    setForm((current) => ({ ...current, [key]: Number(value) || 0 }));
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.form
            onSubmit={(event) => {
              event.preventDefault();
              if (ready) void onSave({ ...form, name: form.name.trim(), paidAmount: Math.min(form.paidAmount, form.amount) });
            }}
            onMouseDown={(event) => event.stopPropagation()}
            className="flex max-h-[calc(100vh-2rem)] w-[min(94vw,560px)] flex-col overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-950 text-white shadow-2xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
          >
            <div className="flex items-start justify-between border-b border-white/10 p-5">
              <div><p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Debt</p><h2 className="mt-1 text-xl font-semibold">{debt ? "Edit" : "Add debt"}</h2></div>
              <Button type="button" variant="ghost" size="icon" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid flex-1 gap-4 overflow-auto p-5 sm:grid-cols-2">
              <div><FieldLabel>Who / what</FieldLabel><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Gemuel, BPI card, Phone installment..." className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25" /></div>
              <div><FieldLabel>Type</FieldLabel><select value={form.kind} onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value as DebtKind }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]">{debtKindOptions.map((kind) => <option key={kind} value={kind}>{kind.replace("_", " ")}</option>)}</select></div>
              <div><FieldLabel>Amount owed</FieldLabel><input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => updateNumber("amount", event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]" /></div>
              <div><FieldLabel>Already paid</FieldLabel><input type="number" min="0" step="0.01" value={form.paidAmount} onChange={(event) => updateNumber("paidAmount", event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]" /></div>
              <div><FieldLabel>Due date</FieldLabel><input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]" /></div>
              <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm sm:mt-6"><span><span className="block font-medium text-zinc-200">Archived</span><span className="text-xs text-zinc-500">Hide from list.</span></span><input type="checkbox" checked={form.isArchived} onChange={(event) => setForm((current) => ({ ...current, isArchived: event.target.checked }))} /></label>
              <div className="sm:col-span-2"><FieldLabel>Note</FieldLabel><textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} placeholder="711 food last night" className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25" /></div>
            </div>
            <div className="flex justify-end gap-2 border-t border-white/10 p-5"><Button type="button" variant="ghost" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">Cancel</Button><Button type="submit" disabled={!ready || isSaving} className="rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-40">{isSaving ? "Saving..." : "Save debt"}</Button></div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DebtPaymentModal({
  debt,
  accounts,
  categories,
  isSaving,
  onClose,
  onSave,
}: {
  debt: DebtRecord | null;
  accounts: AccountRecord[];
  categories: CategoryRecord[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (value: DebtPaymentValue) => Promise<void>;
}) {
  const activeAccounts = accounts.filter((account) => !account.isArchived);
  const expenseCategories = categories.filter((category) => !category.isArchived && category.kind === "expense");
  const [amount, setAmount] = useState(debt ? String(getDebtRemaining(debt)) : "");
  const [accountId, setAccountId] = useState(activeAccounts[0]?.id || "");
  const [categoryId, setCategoryId] = useState(expenseCategories[0]?.id || "");
  const [date, setDate] = useState(getTodayInputValue());
  const [notes, setNotes] = useState("");
  const [createTransaction, setCreateTransaction] = useState(true);
  const parsedAmount = Number(amount);
  const ready = Boolean(debt && parsedAmount > 0 && (!createTransaction || (accountId && categoryId)));

  return (
    <AnimatePresence>
      {debt && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.form
            onSubmit={(event) => {
              event.preventDefault();
              if (ready) void onSave({ debt, accountId, categoryId, amount: parsedAmount, date, notes: notes.trim(), createTransaction });
            }}
            onMouseDown={(event) => event.stopPropagation()}
            className="w-[min(92vw,520px)] overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-950 text-white shadow-2xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
          >
            <div className="flex items-start justify-between border-b border-white/10 p-5"><div><p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Debt payment</p><h2 className="mt-1 text-xl font-semibold">Pay {debt.name}</h2><p className="mt-1 text-sm text-zinc-400">Log a partial or full payment.</p></div><Button type="button" variant="ghost" size="icon" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></Button></div>
            <div className="space-y-4 p-5">
              <div><FieldLabel>Amount</FieldLabel><div className="mt-2 flex h-11 items-center rounded-lg border border-white/10 bg-black/20 px-3"><span className="mr-2 text-zinc-500">₱</span><input value={amount} onChange={(event) => setAmount(sanitizeAmount(event.target.value))} inputMode="decimal" placeholder="0.00" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600" /></div></div>
              <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm"><span><span className="block font-medium text-zinc-200">Create expense transaction</span><span className="text-xs text-zinc-500">Also decrease selected wallet/account.</span></span><input type="checkbox" checked={createTransaction} onChange={(event) => setCreateTransaction(event.target.checked)} /></label>
              {createTransaction && <div><FieldLabel>Funding account</FieldLabel><select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]">{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {peso(account.currentBalance || 0)}</option>)}</select></div>}
              {createTransaction && <div><FieldLabel>Category</FieldLabel><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]">{expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>}
              <div><FieldLabel>Date</FieldLabel><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]" /></div>
              <div><FieldLabel>Notes</FieldLabel><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Confirmation number or detail" className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600" /></div>
            </div>
            <div className="flex justify-end gap-2 border-t border-white/10 p-5"><Button type="button" variant="ghost" onClick={onClose} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">Cancel</Button><Button type="submit" disabled={!ready || isSaving} className="rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-40">{isSaving ? "Recording..." : "Record payment"}</Button></div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DebtsPage({
  debts,
  onAdd,
  onEdit,
  onDelete,
  onPay,
}: {
  debts: DebtRecord[];
  onAdd: () => void;
  onEdit: (debt: DebtRecord) => void;
  onDelete: (debt: DebtRecord) => void;
  onPay: (debt: DebtRecord) => void;
}) {
  const [filter, setFilter] = useState<"unpaid" | "paid" | "all">("unpaid");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<DebtAdvancedFilters>(emptyDebtAdvancedFilters);
  const hasAdvancedFilters = JSON.stringify(advancedFilters) !== JSON.stringify(emptyDebtAdvancedFilters);
  const visibleDebts = debts.filter((debt) => {
    const remaining = getDebtRemaining(debt);
    const due = getDebtDueDate(debt);
    const query = advancedFilters.query.trim().toLowerCase();
    const minLeft = advancedFilters.minLeft ? Number(advancedFilters.minLeft) : null;
    const maxLeft = advancedFilters.maxLeft ? Number(advancedFilters.maxLeft) : null;

    if (debt.isArchived) return false;
    if (filter !== "all" && (filter === "paid" ? remaining > 0 : remaining <= 0)) return false;
    if (advancedFilters.kind !== "all" && debt.kind !== advancedFilters.kind) return false;
    if (advancedFilters.dueFrom && (!due || due.toISOString().slice(0, 10) < advancedFilters.dueFrom)) return false;
    if (advancedFilters.dueTo && (!due || due.toISOString().slice(0, 10) > advancedFilters.dueTo)) return false;
    if (minLeft !== null && remaining < minLeft) return false;
    if (maxLeft !== null && remaining > maxLeft) return false;
    if (query && ![debt.name, debt.notes, debt.kind].some((value) => (value || "").toLowerCase().includes(query))) return false;
    return true;
  }).sort((a, b) => (getDebtDueDate(a)?.getTime() || Infinity) - (getDebtDueDate(b)?.getTime() || Infinity));

  return (
    <div className="space-y-4">
      <section className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] text-white">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={() => setIsFilterOpen(true)} className={`grid h-8 w-8 place-items-center rounded-lg border transition ${hasAdvancedFilters ? "border-white/25 bg-white text-zinc-950" : "border-white/10 bg-black/20 text-zinc-400 hover:bg-white/10 hover:text-white"}`} title="Advanced filters">
              <Filter className="h-4 w-4" />
            </button>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-black/20 p-1 text-xs">
              {(["unpaid", "paid", "all"] as const).map((item) => (
                <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-md px-4 py-1.5 capitalize transition ${filter === item ? "bg-white text-zinc-950" : "text-zinc-400 hover:bg-white/10 hover:text-white"}`}>{item}</button>
              ))}
            </div>
            {hasAdvancedFilters && <button type="button" onClick={() => setAdvancedFilters(emptyDebtAdvancedFilters)} className="rounded-lg px-2 py-1.5 text-xs text-zinc-500 transition hover:bg-white/10 hover:text-white">Clear filters</button>}
          </div>
          <Button onClick={onAdd} className="h-8 shrink-0 rounded-lg bg-white px-3 text-xs text-zinc-950 hover:bg-zinc-200"><Plus className="h-3.5 w-3.5" /> Debt</Button>
        </div>

        {debts.length === 0 ? (
          <div className="p-10 text-center"><p className="text-sm font-semibold text-zinc-200">No debts yet</p><p className="mt-1 text-sm text-zinc-500">Add Gemuel, a card balance, or an installment.</p></div>
        ) : visibleDebts.length === 0 ? (
          <div className="p-10 text-center"><p className="text-sm font-semibold text-zinc-200">Nothing here</p></div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[1040px]">
              <div className="grid grid-cols-[minmax(280px,1.4fr)_110px_110px_120px_150px_132px] gap-x-8 border-b border-white/10 px-4 py-2 text-xs uppercase tracking-[0.14em] text-zinc-600">
                <span>Name</span>
                <span>Type</span>
                <span>Due</span>
                <span className="text-right">Paid</span>
                <span className="text-right">Left</span>
                <span className="text-right">Manage</span>
              </div>
            {visibleDebts.map((debt) => {
              const remaining = getDebtRemaining(debt);
              const due = getDebtDueDate(debt);
              const isPaid = remaining <= 0;
              return (
                <div key={debt.id} className="grid grid-cols-[minmax(280px,1.4fr)_110px_110px_120px_150px_132px] items-center gap-x-8 border-b border-white/10 px-4 py-2.5 text-sm transition last:border-b-0 hover:bg-white/[0.025]">
                  <button type="button" onClick={() => onEdit(debt)} className="min-w-0 text-left">
                    <p className="truncate font-medium text-zinc-100">{debt.name}</p>
                    <p className="mt-0.5 truncate text-xs text-zinc-600">{debt.notes || "No note"}</p>
                  </button>
                  <p className="capitalize text-zinc-400">{debt.kind.replace("_", " ")}</p>
                  <p className="text-zinc-500">{due ? due.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "-"}</p>
                  <p className="text-right text-zinc-400">{peso(debt.paidAmount || 0)}</p>
                  <p className={`text-right font-semibold ${isPaid ? "text-emerald-300" : "text-rose-300"}`}>{isPaid ? "Paid" : peso(remaining)}</p>
                  <div className="flex items-center justify-end gap-1.5">
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => onPay(debt)} disabled={isPaid} title={isPaid ? "Settled" : "Pay"} className="h-8 w-8 rounded-md text-emerald-300 hover:bg-emerald-400/10 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-25"><CheckSquare className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => onEdit(debt)} title="Edit" className="h-8 w-8 rounded-md text-zinc-400 hover:bg-white/10 hover:text-zinc-200"><Edit3 className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => onDelete(debt)} title="Remove" className="h-8 w-8 rounded-md text-rose-300 hover:bg-rose-400/10 hover:text-rose-200"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}
      </section>

      <AnimatePresence>
        {isFilterOpen && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setIsFilterOpen(false)}>
            <motion.div className="w-[min(92vw,520px)] overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-950 text-white shadow-2xl" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} onMouseDown={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between border-b border-white/10 p-5"><div><p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Filters</p><h2 className="mt-1 text-xl font-semibold">Debt filters</h2></div><Button type="button" variant="ghost" size="icon" onClick={() => setIsFilterOpen(false)} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></Button></div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="sm:col-span-2"><FieldLabel>Search</FieldLabel><input value={advancedFilters.query} onChange={(event) => setAdvancedFilters((current) => ({ ...current, query: event.target.value }))} placeholder="Name or note" className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25" /></div>
                <div><FieldLabel>Type</FieldLabel><select value={advancedFilters.kind} onChange={(event) => setAdvancedFilters((current) => ({ ...current, kind: event.target.value as DebtAdvancedFilters["kind"] }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]"><option value="all">All types</option>{debtKindOptions.map((kind) => <option key={kind} value={kind}>{kind.replace("_", " ")}</option>)}</select></div>
                <div><FieldLabel>Min left</FieldLabel><input type="number" min="0" step="0.01" value={advancedFilters.minLeft} onChange={(event) => setAdvancedFilters((current) => ({ ...current, minLeft: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]" /></div>
                <div><FieldLabel>Due from</FieldLabel><input type="date" value={advancedFilters.dueFrom} onChange={(event) => setAdvancedFilters((current) => ({ ...current, dueFrom: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]" /></div>
                <div><FieldLabel>Due to</FieldLabel><input type="date" value={advancedFilters.dueTo} onChange={(event) => setAdvancedFilters((current) => ({ ...current, dueTo: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]" /></div>
                <div><FieldLabel>Max left</FieldLabel><input type="number" min="0" step="0.01" value={advancedFilters.maxLeft} onChange={(event) => setAdvancedFilters((current) => ({ ...current, maxLeft: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none [color-scheme:dark]" /></div>
              </div>
              <div className="flex justify-end gap-2 border-t border-white/10 p-5"><Button type="button" variant="ghost" onClick={() => setAdvancedFilters(emptyDebtAdvancedFilters)} className="rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white">Clear</Button><Button type="button" onClick={() => setIsFilterOpen(false)} className="rounded-lg bg-white text-zinc-950 hover:bg-zinc-200">Apply</Button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FinanceDashboardRedesign({ user, onLogout }: { user: FinanceUser; onLogout: () => void }) {
  const [range, setRange] = useState<ChartRange>("month");
  const [activeView, setActiveView] = useState<ViewKey>("overview");
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<Entry | null>(null);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryRecord | null>(null);
  const [archiveCategory, setArchiveCategory] = useState<CategoryRecord | null>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountRecord | null>(null);
  const [archiveAccount, setArchiveAccount] = useState<AccountRecord | null>(null);
  const [isDebtOpen, setIsDebtOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtRecord | null>(null);
  const [deleteDebt, setDeleteDebt] = useState<DebtRecord | null>(null);
  const [paymentDebt, setPaymentDebt] = useState<DebtRecord | null>(null);
  const [data, setData] = useState<DashboardData>({ accounts: [], categories: [], transactions: [], budgets: [], debts: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setError("");
    try {
      const filter = pb.filter("user = {:uid}", { uid: user.id });
      const [accounts, categories, transactions, budgets, debts] = await Promise.all([
        pb.collection("accounts").getFullList({ filter, sort: "name" }),
        pb.collection("categories").getFullList({ filter, sort: "kind,name" }),
        pb.collection("transactions").getFullList({ filter, sort: "-occurredAt", expand: "account,category" }),
        pb.collection("budgets").getFullList({ filter, sort: "-month", expand: "category" }),
        pb.collection("debts").getFullList({ filter, sort: "dueDate,name" }),
      ]);

      setData({
        accounts: accounts as unknown as AccountRecord[],
        categories: categories as unknown as CategoryRecord[],
        transactions: transactions as unknown as ExpandedTransaction[],
        budgets: budgets as unknown as ExpandedBudget[],
        debts: debts as unknown as DebtRecord[],
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load PocketBase data.");
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  const seedCategories = useCallback(async () => {
    const existing = await pb.collection("categories").getFullList({
      filter: pb.filter("user = {:uid}", { uid: user.id }),
    });
    if (existing.length > 0) return;

    await Promise.all(
      DEFAULT_CATEGORIES.map((category) =>
        pb.collection("categories").create({
          user: user.id,
          name: category.name,
          kind: category.kind,
          color: category.color,
          icon: category.icon,
          isSystem: true,
          isArchived: false,
        }),
      ),
    );
  }, [user.id]);

  useEffect(() => {
    void seedCategories().then(loadData);
  }, [seedCategories, loadData]);

  const wallets = useMemo(() => data.accounts.filter((account) => !account.isArchived).map(mapAccountToWallet), [data.accounts]);
  const categoryViews = useMemo(() => data.categories.filter((category) => !category.isArchived).map(mapCategoryToView), [data.categories]);
  const entries = useMemo(() => data.transactions.map(mapTransactionToEntry), [data.transactions]);
  const chartData = useMemo(() => buildChartData(data.transactions, range), [data.transactions, range]);
  const totals = useMemo(() => getTotals(entries, wallets), [entries, wallets]);
  const todayKey = getTodayInputValue();
  const todayIncome = data.transactions.filter((tx) => tx.type === "income" && tx.occurredAt.slice(0, 10) === todayKey).reduce((sum, tx) => sum + tx.amount, 0);
  const todayExpense = data.transactions.filter((tx) => tx.type === "expense" && tx.occurredAt.slice(0, 10) === todayKey).reduce((sum, tx) => sum + tx.amount, 0);
  const budgets = useMemo(() => {
    const mapped = data.budgets.map((budget, index) => {
      const categoryName = budget.expand?.category?.name || "Budget";
      const spent = data.transactions
        .filter((tx) => tx.type === "expense" && tx.category === budget.category && tx.occurredAt.slice(0, 7) === budget.month.slice(0, 7))
        .reduce((sum, tx) => sum + tx.amount, 0);
      const fallback = fallbackBudgets[index % fallbackBudgets.length];
      return {
        name: categoryName,
        spent,
        limit: budget.amount,
        icon: getCategoryMeta(categoryName).icon,
        color: fallback.color,
        iconColor: getCategoryMeta(categoryName).text,
        iconBg: fallback.iconBg,
      };
    });

    return mapped.length > 0 ? mapped : [];
  }, [data.budgets, data.transactions]);
  const debtSummary = useMemo(() => getDebtSummary(data.debts), [data.debts]);

  const applyAccountDelta = async (account: AccountRecord, delta: number) => {
    await pb.collection("accounts").update(account.id, {
      currentBalance: (account.currentBalance || 0) + delta,
    });
  };

  const addEntry = async (entry: TransactionFormEntry) => {
    const account = data.accounts.find((item) => item.name === entry.wallet);
    const category = data.categories.find((item) => item.name === entry.category && item.kind === entry.type);
    if (!account) {
      setError("Create a wallet in PocketBase before adding a transaction.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const amount = Math.abs(entry.amount);
      const payload = {
        user: user.id,
        account: account.id,
        category: category?.id,
        type: entry.type,
        amount,
        occurredAt: buildOccurredAt(entry.date || getTodayInputValue(), entry.time || getCurrentTimeInputValue()),
        merchant: entry.title,
        notes: entry.note,
        isRecurringGenerated: false,
      };

      if (entry.id) {
        const original = data.transactions.find((transaction) => transaction.id === entry.id);
        if (!original) throw new Error("Original transaction was not found.");
        await pb.collection("transactions").update(entry.id, payload);
        const oldAccount = data.accounts.find((item) => item.id === original.account);
        const oldDelta = -getTransactionBalanceDelta(original);
        const newDelta = getBalanceDelta(entry.type, amount);
        if (oldAccount && oldAccount.id !== account.id) {
          await applyAccountDelta(oldAccount, oldDelta);
          await applyAccountDelta(account, newDelta);
        } else if (oldAccount) {
          await applyAccountDelta(oldAccount, oldDelta + newDelta);
        }
      } else {
        const created = await pb.collection("transactions").create(payload);
        try {
          await applyAccountDelta(account, getBalanceDelta(entry.type, amount));
        } catch (balanceError) {
          await pb.collection("transactions").delete(created.id);
          throw balanceError;
        }
      }

      await loadData();
      setEditingEntry(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save transaction.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const deleteOneEntry = async (entry: Entry) => {
    if (!entry.id) return;
    const original = data.transactions.find((transaction) => transaction.id === entry.id);
    if (!original) return;
    const account = data.accounts.find((item) => item.id === original.account);
    setIsSaving(true);
    setError("");
    try {
      await pb.collection("transactions").delete(entry.id);
      if (account) await applyAccountDelta(account, -getTransactionBalanceDelta(original));
      setDeleteEntry(null);
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete transaction.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const saveCategory = async (category: CategoryFormValue) => {
    const duplicate = data.categories.some(
      (item) =>
        item.id !== category.id &&
        !item.isArchived &&
        !category.isArchived &&
        item.kind === category.kind &&
        item.name.trim().toLowerCase() === category.name.trim().toLowerCase(),
    );
    if (duplicate) {
      setError("An active category with that name already exists for this kind.");
      return;
    }

    const original = category.id ? data.categories.find((item) => item.id === category.id) : null;
    if (original && original.kind !== category.kind) {
      const usage = getCategoryUsage(original.id, data.transactions, data.budgets);
      if (usage.transactions > 0 || usage.budgets > 0) {
        setError("Category kind cannot change while transactions or budgets reference it.");
        return;
      }
    }

    setIsSaving(true);
    setError("");
    try {
      if (category.id) {
        await pb.collection("categories").update(category.id, {
          name: category.name,
          kind: category.kind,
          color: category.color,
          icon: category.icon,
          isArchived: category.isArchived,
        });
      } else {
        await pb.collection("categories").create({
          user: user.id,
          name: category.name,
          kind: category.kind,
          color: category.color,
          icon: category.icon,
          isSystem: false,
          isArchived: false,
        });
      }
      setIsCategoryOpen(false);
      setEditingCategory(null);
      await loadData();
    } catch (categoryError) {
      setError(categoryError instanceof Error ? categoryError.message : "Could not save category.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategoryArchive = async (category: CategoryRecord) => {
    if (!category.isArchived) {
      const remainingKindCount = data.categories.filter((item) => item.id !== category.id && !item.isArchived && item.kind === category.kind).length;
      if (remainingKindCount === 0) {
        setError(`Keep at least one active ${category.kind} category for transaction forms.`);
        setArchiveCategory(null);
        return;
      }
    }
    setIsSaving(true);
    setError("");
    try {
      await pb.collection("categories").update(category.id, { isArchived: !category.isArchived });
      setArchiveCategory(null);
      await loadData();
    } catch (categoryError) {
      setError(categoryError instanceof Error ? categoryError.message : "Could not update category.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const saveAccount = async (account: AccountFormValue) => {
    const duplicate = data.accounts.some(
      (item) => item.id !== account.id && !item.isArchived && !account.isArchived && item.name.trim().toLowerCase() === account.name.trim().toLowerCase(),
    );
    if (duplicate) {
      setError("An active account with that name already exists.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      if (account.id) {
        const original = data.accounts.find((item) => item.id === account.id);
        await pb.collection("accounts").update(account.id, {
          name: account.name,
          type: account.type,
          startingBalance: account.startingBalance,
          currentBalance: original?.currentBalance ?? account.currentBalance,
          isArchived: account.isArchived,
        });
      } else {
        await pb.collection("accounts").create({
          user: user.id,
          name: account.name,
          type: account.type,
          startingBalance: account.startingBalance,
          currentBalance: account.startingBalance,
          isArchived: false,
        });
      }
      setIsAccountOpen(false);
      setEditingAccount(null);
      await loadData();
    } catch (accountError) {
      setError(accountError instanceof Error ? accountError.message : "Could not save account.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAccountArchive = async (account: AccountRecord) => {
    if (!account.isArchived) {
      const remainingActive = data.accounts.filter((item) => item.id !== account.id && !item.isArchived).length;
      if (remainingActive === 0) {
        setError("Keep at least one active account for transaction forms.");
        setArchiveAccount(null);
        return;
      }
    }
    setIsSaving(true);
    setError("");
    try {
      await pb.collection("accounts").update(account.id, { isArchived: !account.isArchived });
      setArchiveAccount(null);
      await loadData();
    } catch (accountError) {
      setError(accountError instanceof Error ? accountError.message : "Could not update account.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const saveDebt = async (debt: DebtFormValue) => {
    const duplicate = data.debts.some((item) => item.id !== debt.id && !item.isArchived && !debt.isArchived && item.name.trim().toLowerCase() === debt.name.trim().toLowerCase());
    if (duplicate) {
      setError("An active debt with that name already exists.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const payload = {
        user: user.id,
        name: debt.name,
        kind: debt.kind,
        amount: debt.amount,
        paidAmount: Math.min(debt.paidAmount, debt.amount),
        dueDate: debt.dueDate ? buildOccurredAt(debt.dueDate, "00:00") : "",
        notes: debt.notes,
        isArchived: debt.isArchived,
      };

      if (debt.id) await pb.collection("debts").update(debt.id, payload);
      else await pb.collection("debts").create(payload);
      setIsDebtOpen(false);
      setEditingDebt(null);
      await loadData();
    } catch (debtError) {
      setError(debtError instanceof Error ? debtError.message : "Could not save debt.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const deleteOneDebt = async (debt: DebtRecord) => {
    setIsSaving(true);
    setError("");
    try {
      await pb.collection("debts").delete(debt.id);
      setDeleteDebt(null);
      await loadData();
    } catch (debtError) {
      setError(debtError instanceof Error ? debtError.message : "Could not delete debt.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const recordDebtPayment = async (payment: DebtPaymentValue) => {
    const account = payment.createTransaction ? data.accounts.find((item) => item.id === payment.accountId && !item.isArchived) : null;
    const category = payment.createTransaction ? data.categories.find((item) => item.id === payment.categoryId && !item.isArchived && item.kind === "expense") : null;
    if (payment.createTransaction && (!account || !category)) {
      setError("Choose an active account and expense category for the debt payment.");
      return;
    }

    setIsSaving(true);
    setError("");
    let createdTransactionId = "";
    let accountAdjusted = false;
    const nextPaidAmount = Math.min(payment.debt.amount || 0, (payment.debt.paidAmount || 0) + Math.abs(payment.amount));
    try {
      if (payment.createTransaction && account && category) {
        const created = await pb.collection("transactions").create({
          user: user.id,
          account: account.id,
          category: category.id,
          debt: payment.debt.id,
          type: "expense",
          amount: payment.amount,
          occurredAt: buildOccurredAt(payment.date, getCurrentTimeInputValue()),
          merchant: `Debt payment: ${payment.debt.name}`,
          notes: payment.notes,
          isRecurringGenerated: false,
        });
        createdTransactionId = created.id;
        await applyAccountDelta(account, -Math.abs(payment.amount));
        accountAdjusted = true;
      }
      await pb.collection("debts").update(payment.debt.id, {
        paidAmount: nextPaidAmount,
      });
      setPaymentDebt(null);
      await loadData();
    } catch (paymentError) {
      if (accountAdjusted) {
        try {
          if (account) await applyAccountDelta(account, Math.abs(payment.amount));
        } catch {
          // Reload below exposes the persisted state if rollback fails.
        }
      }
      if (createdTransactionId) {
        try {
          await pb.collection("transactions").delete(createdTransactionId);
        } catch {
          // Reload below exposes the persisted state if rollback fails.
        }
      }
      setError(paymentError instanceof Error ? paymentError.message : "Could not record debt payment.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="grid min-h-screen place-items-center bg-zinc-950 text-sm text-zinc-500">Loading your finances...</div>;
  }

  const userAvatarUrl = user.avatar ? pb.files.getURL(user, user.avatar) : "";
  const userInitials = getUserInitials(user);

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
                <p className="truncate text-sm font-semibold text-zinc-100">{user.name || "Kashley"}</p>
                <p className="truncate text-xs text-zinc-500">{user.email}</p>
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

          {activeView === "transactions" ? (
            <TransactionsPage
              entries={entries}
              wallets={wallets}
              categories={categoryViews}
              onAdd={() => {
                setEditingEntry(null);
                setIsAddEntryOpen(true);
              }}
              onEdit={(entry) => {
                setEditingEntry(entry);
                setIsAddEntryOpen(true);
              }}
              onDelete={setDeleteEntry}
            />
          ) : activeView === "accounts" ? (
            <AccountsPage
              accounts={data.accounts}
              transactions={data.transactions}
              onAdd={() => {
                setEditingAccount(null);
                setIsAccountOpen(true);
              }}
              onEdit={(account) => {
                setEditingAccount(account);
                setIsAccountOpen(true);
              }}
              onArchive={setArchiveAccount}
            />
          ) : activeView === "categories" ? (
            <CategoriesPage
              categories={data.categories}
              transactions={data.transactions}
              budgets={data.budgets}
              onAdd={() => {
                setEditingCategory(null);
                setIsCategoryOpen(true);
              }}
              onEdit={(category) => {
                setEditingCategory(category);
                setIsCategoryOpen(true);
              }}
              onArchive={setArchiveCategory}
            />
          ) : activeView === "debts" ? (
            <DebtsPage
              debts={data.debts}
              onAdd={() => {
                setEditingDebt(null);
                setIsDebtOpen(true);
              }}
              onEdit={(debt) => {
                setEditingDebt(debt);
                setIsDebtOpen(true);
              }}
              onDelete={setDeleteDebt}
              onPay={setPaymentDebt}
            />
          ) : (
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
                <CardContent className="relative flex h-full flex-col p-5 pb-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2"><p className="text-sm font-medium text-zinc-400">Net Balance</p><Eye className="h-4 w-4 text-zinc-600" /></div>
                    <Badge className="rounded-lg bg-white/10 px-3 py-1.5 text-zinc-200 hover:bg-white/10">Last 30 days</Badge>
                  </div>
                  <div className="mt-4 max-w-[62%]">
                    <h2 className="text-4xl font-semibold tracking-tight text-zinc-50">{peso(totals.balance)}</h2>
                    <div className="mt-3 flex items-center gap-3"><span className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">↗ 12.4%</span><span className="text-sm text-zinc-500">vs last 30 days</span></div>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-2.5">
                    {[
                      ["Income", peso(totals.income), "+100%", "text-emerald-300"],
                      ["Expenses", peso(totals.expense), "+25%", "text-rose-300"],
                      ["Transactions", entries.length, "this period", "text-zinc-500"],
                    ].map(([label, value, helper, color]) => (
                      <div key={label} className="min-w-0 rounded-xl border border-white/10 bg-white/[0.055] p-3">
                        <p className="truncate text-xs text-zinc-500">{label}</p>
                        <div className="mt-2 min-w-0 space-y-1"><p className="truncate text-base font-semibold text-zinc-100 sm:text-lg">{value}</p><span className={`block truncate text-xs font-medium ${color}`}>{helper}</span></div>
                      </div>
                    ))}
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
                      <Tooltip contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,.12)", borderRadius: 18 }} labelStyle={{ color: "#fff" }} />
                      <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={3} fill="url(#income)" /><Area type="monotone" dataKey="expense" stroke="#fb7185" strokeWidth={3} fill="url(#expense)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </section>

          {debtSummary.active.length > 0 && (
            <section className="mt-4 grid gap-3 md:grid-cols-4">
              {[
                ["Total owed", peso(debtSummary.totalOwed), "text-rose-300"],
                ["Unpaid debts", debtSummary.active.length, "text-zinc-100"],
                ["Paid debts", debtSummary.paid.length, "text-emerald-300"],
                ["Next due", debtSummary.nextDue ? `${debtSummary.nextDue.debt.name} · ${debtSummary.nextDue.due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "None", "text-zinc-100"],
              ].map(([label, value, color]) => (
                <button key={label} type="button" onClick={() => setActiveView("debts")} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.06]">
                  <p className="text-xs text-zinc-500">{label}</p>
                  <p className={`mt-2 truncate text-lg font-semibold ${color}`}>{value}</p>
                </button>
              ))}
            </section>
          )}

          <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.15fr_0.9fr]">
            <Card className="rounded-[1.25rem] border-white/10 bg-white/[0.04] text-white">
              <CardHeader className="p-5"><button type="button" className="w-fit text-left transition hover:text-zinc-300" onClick={() => setActiveView("accounts")}><CardTitle className="text-base">Wallets</CardTitle></button></CardHeader>
              <CardContent className="space-y-2.5 p-5 pt-0">
                {wallets.map((wallet) => {
                  const Icon = wallet.icon;
                  return <div key={wallet.name} className={`group overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br ${wallet.accent} p-3.5 transition hover:border-white/20`}><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black/20 ${wallet.text}`}><Icon className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold leading-none">{wallet.name}</p><p className="mt-1 truncate text-xs text-zinc-500">{wallet.type} account</p></div></div><p className={wallet.balance < 0 ? "shrink-0 text-sm font-semibold text-rose-300" : "shrink-0 text-sm font-semibold text-zinc-100"}>{peso(wallet.balance)}</p></div><div className="mt-3 flex items-center justify-between text-xs text-zinc-500"><span>Available balance</span><span>{wallet.balance < 0 ? "Needs attention" : "Active"}</span></div></div>;
                })}
                <button type="button" onClick={() => { setEditingAccount(null); setIsAccountOpen(true); }} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 px-4 text-sm text-zinc-400 transition hover:border-white/30 hover:bg-white/[0.04] hover:text-white"><Plus className="h-4 w-4" /> Add Wallet</button>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden rounded-[1.25rem] border-white/10 bg-white/[0.04] text-white">
              <CardHeader className="p-5 pb-3"><button type="button" className="w-fit text-left transition hover:text-zinc-300" onClick={() => console.log("Navigate to recent activity view all")}><CardTitle className="text-base">Recent activity</CardTitle></button></CardHeader>
              <CardContent className="space-y-4 p-5 pt-0">
                <div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.06] p-3"><p className="text-xs text-zinc-500">Today in</p><p className="mt-1 text-sm font-semibold text-emerald-300">{peso(todayIncome)}</p></div><div className="rounded-xl border border-rose-400/10 bg-rose-400/[0.06] p-3"><p className="text-xs text-zinc-500">Today out</p><p className="mt-1 text-sm font-semibold text-rose-300">{peso(todayExpense)}</p></div></div>
                <div className="max-h-[310px] space-y-3 overflow-auto pr-1">
                  {entries.map((tx, index) => {
                    const Icon = tx.icon;
                    const isIncome = tx.amount > 0;
                    return <button key={`${tx.title}-${index}`} type="button" className={`group flex w-full items-center justify-between rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-white/20 ${isIncome ? "border-emerald-400/10 bg-emerald-400/[0.045] hover:bg-emerald-400/[0.07]" : "border-rose-400/10 bg-rose-400/[0.04] hover:bg-rose-400/[0.065]"}`}><div className="flex min-w-0 items-center gap-3"><div className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg ${isIncome ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}><Icon className="h-5 w-5" /></div><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold text-zinc-100">{tx.title}</p><span className={`hidden rounded-lg px-2 py-0.5 text-[10px] font-medium sm:inline-flex ${isIncome ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>{tx.category}</span></div><p className="mt-1 truncate text-xs text-zinc-500">{tx.wallet}</p></div></div><div className="ml-4 shrink-0 text-right"><p className={`text-sm font-semibold ${isIncome ? "text-emerald-300" : "text-zinc-100"}`}>{peso(tx.amount)}</p><p className="mt-1 text-[11px] text-zinc-600">{tx.createdAt || "Logged"}</p></div></button>;
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.25rem] border-white/10 bg-white/[0.04] text-white">
              <CardHeader className="p-5"><button type="button" className="w-fit text-left transition hover:text-zinc-300" onClick={() => console.log("Navigate to budget health view all")}><CardTitle className="text-base">Budget health</CardTitle></button></CardHeader>
              <CardContent className="space-y-5 p-5 pt-0">
                {budgets.map((budget) => {
                  const percent = Math.round((budget.spent / budget.limit) * 100);
                  const Icon = budget.icon;
                  return <div key={budget.name} className="space-y-3"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><div className={`grid h-10 w-10 place-items-center rounded-lg ${budget.iconBg} ${budget.iconColor}`}><Icon className="h-5 w-5" /></div><div><p className="text-sm font-medium">{budget.name}</p><p className="text-xs text-zinc-500">{peso(budget.spent)} spent</p></div></div><div className="text-right text-xs"><p className="font-semibold text-zinc-100">{peso(budget.limit - budget.spent)} left</p><p className="mt-1 text-zinc-500">{percent}% of {peso(budget.limit)}</p></div></div><div className="h-2.5 overflow-hidden rounded-lg bg-white/10"><div className={`h-full rounded-lg ${budget.color} shadow-[0_0_18px_rgba(255,255,255,.18)]`} style={{ width: `${percent}%` }} /></div></div>;
                })}
                <Button variant="outline" className="w-full rounded-lg border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/10 hover:text-white"><Plus className="mr-2 h-4 w-4" /> Create Budget</Button>
              </CardContent>
            </Card>
          </section>
            </>
          )}
        </main>
      </div>
      <AddEntryModal
        key={`${isAddEntryOpen ? "open" : "closed"}-${editingEntry?.id || "new"}-${data.accounts.length}-${data.categories.length}`}
        open={isAddEntryOpen}
        onClose={() => {
          setIsAddEntryOpen(false);
          setEditingEntry(null);
        }}
        onAdd={addEntry}
        wallets={wallets}
        categories={categoryViews}
        isSaving={isSaving}
        editEntry={editingEntry}
      />
      <CategoryModal
        key={`${isCategoryOpen ? "open" : "closed"}-${editingCategory?.id || "new"}`}
        open={isCategoryOpen}
        onClose={() => {
          setIsCategoryOpen(false);
          setEditingCategory(null);
        }}
        onSave={saveCategory}
        isSaving={isSaving}
        category={editingCategory}
      />
      <AccountModal
        key={`${isAccountOpen ? "open" : "closed"}-${editingAccount?.id || "new"}`}
        open={isAccountOpen}
        onClose={() => {
          setIsAccountOpen(false);
          setEditingAccount(null);
        }}
        onSave={saveAccount}
        isSaving={isSaving}
        account={editingAccount}
      />
      <DebtModal
        key={`${isDebtOpen ? "open" : "closed"}-${editingDebt?.id || "new"}`}
        open={isDebtOpen}
        onClose={() => {
          setIsDebtOpen(false);
          setEditingDebt(null);
        }}
        onSave={saveDebt}
        isSaving={isSaving}
        debt={editingDebt}
      />
      <DebtPaymentModal
        key={`${paymentDebt?.id || "no-payment"}-${data.accounts.length}-${data.categories.length}`}
        debt={paymentDebt}
        accounts={data.accounts}
        categories={data.categories}
        isSaving={isSaving}
        onClose={() => setPaymentDebt(null)}
        onSave={recordDebtPayment}
      />
      <ConfirmModal
        open={Boolean(deleteEntry)}
        title="Delete transaction"
        description={deleteEntry ? `Delete "${deleteEntry.title}" for ${peso(deleteEntry.amount)}? This will update the linked wallet balance.` : ""}
        confirmLabel="Delete"
        busy={isSaving}
        onClose={() => setDeleteEntry(null)}
        onConfirm={() => deleteEntry && void deleteOneEntry(deleteEntry)}
      />
      <ConfirmModal
        open={Boolean(archiveCategory)}
        title={archiveCategory?.isArchived ? "Restore category" : "Archive category"}
        description={archiveCategory ? `${archiveCategory.isArchived ? "Restore" : "Archive"} "${archiveCategory.name}"? Historical transactions will keep using it, but archived categories are hidden from new transaction forms.` : ""}
        confirmLabel={archiveCategory?.isArchived ? "Restore" : "Archive"}
        busy={isSaving}
        onClose={() => setArchiveCategory(null)}
        onConfirm={() => archiveCategory && void toggleCategoryArchive(archiveCategory)}
      />
      <ConfirmModal
        open={Boolean(archiveAccount)}
        title={archiveAccount?.isArchived ? "Restore account" : "Archive account"}
        description={archiveAccount ? `${archiveAccount.isArchived ? "Restore" : "Archive"} "${archiveAccount.name}"? Historical transactions will keep using it, but archived accounts are hidden from new transaction forms.` : ""}
        confirmLabel={archiveAccount?.isArchived ? "Restore" : "Archive"}
        busy={isSaving}
        onClose={() => setArchiveAccount(null)}
        onConfirm={() => archiveAccount && void toggleAccountArchive(archiveAccount)}
      />
      <ConfirmModal
        open={Boolean(deleteDebt)}
        title="Delete debt"
        description={deleteDebt ? `Delete "${deleteDebt.name}"? Linked transactions will remain, but the debt balance and payoff plan will be removed.` : ""}
        confirmLabel="Delete"
        busy={isSaving}
        onClose={() => setDeleteDebt(null)}
        onConfirm={() => deleteDebt && void deleteOneDebt(deleteDebt)}
      />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<FinanceUser | null>(getAuthUser());
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authStatus, setAuthStatus] = useState("");
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    return pb.authStore.onChange(() => {
      setUser(getAuthUser());
    });
  }, []);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAuthBusy(true);
    setAuthStatus("");

    try {
      if (authMode === "register") {
        await pb.collection("users").create({
          email,
          password,
          passwordConfirm: password,
          name,
          defaultCurrency: "PHP",
          timezone: "Asia/Manila",
        });
      }

      await pb.collection("users").authWithPassword(email, password);
      setEmail("");
      setPassword("");
      setName("");
    } catch (authError) {
      setAuthStatus(authError instanceof Error ? authError.message : "Authentication failed. Check the PocketBase server and schema.");
    } finally {
      setIsAuthBusy(false);
    }
  }

  function logout() {
    pb.authStore.clear();
    setUser(null);
  }

  if (!user) {
    return (
      <AuthScreen
        authMode={authMode}
        setAuthMode={setAuthMode}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        name={name}
        setName={setName}
        authStatus={authStatus}
        isAuthBusy={isAuthBusy}
        pocketBaseUrl={POCKETBASE_URL}
        onSubmit={handleAuth}
      />
    );
  }

  return <FinanceDashboardRedesign user={user} onLogout={logout} />;
}
