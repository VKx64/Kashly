import type { LucideIcon } from "lucide-react";
import type { AccountRecord, AllocationRecord, BudgetRecord, CategoryRecord, DebtRecord, GoalRecord, RecurringFrequency, RecurringTransactionRecord, SubscriptionRecord, TransactionRecord } from "./finance";

export type WalletView = {
  id: string;
  name: string;
  type: string;
  balance: number;
  icon: LucideIcon;
  accent: string;
  text: string;
};

export type CategoryView = {
  id?: string;
  name: string;
  kind: "income" | "expense";
  label: string;
  icon: LucideIcon;
  text: string;
};

export type ExpandedTransaction = TransactionRecord & {
  expand?: {
    account?: AccountRecord;
    category?: CategoryRecord;
  };
};

export type ExpandedBudget = BudgetRecord & {
  expand?: {
    category?: CategoryRecord;
  };
};

export type ExpandedRecurring = RecurringTransactionRecord & {
  expand?: {
    account?: AccountRecord;
    category?: CategoryRecord;
  };
};

export type TransactionFormEntry = {
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

export type ExpandedSubscription = SubscriptionRecord & {
  expand?: {
    account?: AccountRecord;
    category?: CategoryRecord;
  };
};

export type SubscriptionFormValue = {
  id?: string;
  name: string;
  amount: number;
  accountId: string;
  categoryId: string;
  frequency: import("./finance").SubscriptionFrequency;
  nextBillingDate: string;
  icon: string;
  color: string;
  isActive: boolean;
  notes: string;
};

export type SubscriptionSummary = {
  totalMonthly: number;
  activeCount: number;
  nextUp: ExpandedSubscription | null;
};

export type DashboardData = {
  accounts: AccountRecord[];
  categories: CategoryRecord[];
  transactions: ExpandedTransaction[];
  budgets: ExpandedBudget[];
  debts: DebtRecord[];
  goals: GoalRecord[];
  recurring: ExpandedRecurring[];
  allocations: AllocationRecord[];
  subscriptions: ExpandedSubscription[];
};

export type ChartPoint = { day: string; income: number; expense: number };

// A monthly "need" envelope: a recurring target funded by income allocations
// and drawn down by expenses in its category. available = funded - spent.
export type NeedEnvelope = {
  id: string;
  name: string;
  categoryId: string;
  icon: string;
  color: string;
  priority: number;
  target: number;
  funded: number;
  spent: number;
  available: number;
  toFund: number;
  percentFunded: number;
  isActive: boolean;
};

export type BudgetFormValue = {
  id?: string;
  category: string;
  name: string;
  amount: number;
  priority: number;
  icon: string;
  color: string;
  isActive: boolean;
};

export type MonthSummary = {
  monthKey: string;
  income: number;
  allocated: number;
  readyToAssign: number;
};

export type DistributeTargetKind = "budget" | "goal" | "debt";

export type DistributeTarget = {
  kind: DistributeTargetKind;
  id: string;
  name: string;
  icon: string;
  color: string;
  priority: number;
  toFund: number;
};

export type DistributeLine = DistributeTarget & { amount: number };

export type AllocationValue = {
  budgetId?: string;
  goalId?: string;
  debtId?: string;
  amount: number;
};

export type GoalFormValue = {
  id?: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  monthlyTarget: number;
  targetDate: string;
  icon: string;
  priority: number;
  isCompleted: boolean;
};

export type DebtSummary = {
  active: DebtRecord[];
  paid: DebtRecord[];
  totalOwed: number;
  totalPaid: number;
  nextDue: { debt: DebtRecord; due: Date } | null;
  lentActive: DebtRecord[];
  totalLent: number;
};

export type OverviewStats = {
  balance: number;
  income: number;
  expense: number;
  transactions: number;
  balanceTrend: number | null;
  incomeTrend: number | null;
  expenseTrend: number | null;
  transactionTrend: number | null;
};

export type GoalView = {
  id: string;
  name: string;
  icon?: string;
  current: number;
  target: number;
  percent: number;
  remaining: number;
  targetDate: Date | null;
  isCompleted: boolean;
};

export type UpcomingRecurring = {
  id: string;
  merchant: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  frequency: RecurringFrequency;
  account: string;
  category: string;
  nextRun: Date;
};

export type ViewKey = "overview" | "transactions" | "accounts" | "categories" | "needs" | "debts" | "goals" | "subscriptions";
export type ChartRange = "week" | "month" | "year";

export type Entry = {
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

export type CategoryFormValue = {
  id?: string;
  name: string;
  kind: "income" | "expense";
  color: string;
  icon: string;
  isArchived: boolean;
};

export type AccountFormValue = {
  id?: string;
  name: string;
  type: import("./finance").AccountType;
  startingBalance: number;
  currentBalance: number;
  isArchived: boolean;
  /** Cropped QR image file ready to upload. Present when user selects a new image. */
  qrFile?: File | null;
  /** When true, instructs saveAccount to clear the existing QR from PocketBase. */
  removeQr?: boolean;
};

export type DebtFormValue = {
  id?: string;
  name: string;
  kind: import("./finance").DebtKind;
  direction: "owe" | "lent";
  amount: number;
  paidAmount: number;
  dueDate: string;
  notes: string;
  isArchived: boolean;
};

export type DebtPaymentValue = {
  debt: import("./finance").DebtRecord;
  accountId: string;
  categoryId: string;
  amount: number;
  date: string;
  notes: string;
  createTransaction: boolean;
};

export type DebtAdvancedFilters = {
  query: string;
  kind: import("./finance").DebtKind | "all";
  dueFrom: string;
  dueTo: string;
  minLeft: string;
  maxLeft: string;
};
