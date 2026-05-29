import {
  CalendarDays,
  Car,
  CreditCard,
  Landmark,
  LayoutDashboard,
  Settings,
  ShoppingBag,
  Tags,
  Target,
  TrendingDown,
  TrendingUp,
  Utensils,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AccountType } from "@/types/finance";
import type { ChartRange, ViewKey, WalletView } from "@/types/app";

export const fallbackWallets = [
  { name: "BPI", type: "Bank", balance: 0, icon: Landmark, accent: "from-blue-500/20 to-indigo-500/10", text: "text-blue-300" },
  { name: "Cash Wallet", type: "Cash", balance: -486, icon: Wallet, accent: "from-emerald-500/20 to-teal-500/10", text: "text-emerald-300" },
  { name: "Maya Savings", type: "Savings", balance: 8500, icon: Target, accent: "from-violet-500/20 to-fuchsia-500/10", text: "text-violet-300" },
];

export const fallbackBudgets = [
  { name: "Shopping", spent: 1200, limit: 2000, icon: ShoppingBag, color: "bg-violet-400", iconColor: "text-violet-300", iconBg: "bg-violet-500/15" },
  { name: "Dining Out", spent: 450, limit: 600, icon: Utensils, color: "bg-amber-400", iconColor: "text-amber-300", iconBg: "bg-amber-500/15" },
  { name: "Transportation", spent: 300, limit: 600, icon: Car, color: "bg-sky-400", iconColor: "text-sky-300", iconBg: "bg-sky-500/15" },
];

export const fallbackCategories = ["Income", "Dining", "Bills", "Transport", "Shopping", "Savings", "Other"];

export const DEFAULT_CATEGORIES: { name: string; kind: "income" | "expense"; color: string; icon: string }[] = [
  { name: "Income", kind: "income", color: "#10b981", icon: "income" },
  { name: "Dining", kind: "expense", color: "#f59e0b", icon: "dining" },
  { name: "Bills", kind: "expense", color: "#ef4444", icon: "bills" },
  { name: "Transport", kind: "expense", color: "#3b82f6", icon: "transport" },
  { name: "Shopping", kind: "expense", color: "#8b5cf6", icon: "shopping" },
  { name: "Savings", kind: "expense", color: "#06b6d4", icon: "savings" },
  { name: "Other", kind: "expense", color: "#64748b", icon: "other" },
];

export const accountMeta: Record<AccountType, Pick<WalletView, "icon" | "accent" | "text">> = {
  bank: { icon: Landmark, accent: "from-blue-500/20 to-indigo-500/10", text: "text-blue-300" },
  cash: { icon: Wallet, accent: "from-emerald-500/20 to-teal-500/10", text: "text-emerald-300" },
  savings: { icon: Target, accent: "from-violet-500/20 to-fuchsia-500/10", text: "text-violet-300" },
  credit_card: { icon: CreditCard, accent: "from-rose-500/20 to-pink-500/10", text: "text-rose-300" },
  e_wallet: { icon: Wallet, accent: "from-cyan-500/20 to-sky-500/10", text: "text-cyan-300" },
  investment: { icon: TrendingUp, accent: "from-amber-500/20 to-orange-500/10", text: "text-amber-300" },
  other: { icon: Wallet, accent: "from-zinc-500/20 to-slate-500/10", text: "text-zinc-300" },
};

export const transactionTypeOptions: [string, string, LucideIcon][] = [
  ["expense", "Expense", TrendingDown],
  ["income", "Income", TrendingUp],
];

export const chartRangeOptions: [ChartRange, string][] = [
  ["week", "Week"],
  ["month", "Month"],
  ["year", "Year"],
];

export const navigationItems: [LucideIcon, string, ViewKey | null][] = [
  [LayoutDashboard, "Overview", "overview"],
  [CreditCard, "Transactions", "transactions"],
  [Wallet, "Accounts", "accounts"],
  [Tags, "Categories", "categories"],
  [Landmark, "Debts", "debts"],
  [CalendarDays, "Reports", null],
  [Settings, "Settings", null],
];

export const accountTypeOptions: AccountType[] = ["cash", "bank", "credit_card", "e_wallet", "savings", "investment", "other"];

export const debtKindOptions: import("@/types/finance").DebtKind[] = ["personal", "credit_card", "installment"];

export const emptyDebtAdvancedFilters: import("@/types/app").DebtAdvancedFilters = {
  query: "",
  kind: "all",
  dueFrom: "",
  dueTo: "",
  minLeft: "",
  maxLeft: "",
};
