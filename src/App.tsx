import { useState, useEffect, useMemo, useCallback } from "react";
import type { FormEvent } from "react";

import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import { OverviewPage } from "./pages/OverviewPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { AccountsPage } from "./pages/AccountsPage";
import { DebtsPage } from "./pages/DebtsPage";
import { BudgetsPage } from "./pages/BudgetsPage";
import { GoalsPage } from "./pages/GoalsPage";
import { SubscriptionsPage } from "./pages/SubscriptionsPage";
import { AddEntryModal } from "./components/modals/AddEntryModal";
import { CategoryModal } from "./components/modals/CategoryModal";
import { AccountModal } from "./components/modals/AccountModal";
import { DebtModal } from "./components/modals/DebtModal";
import { DebtPaymentModal } from "./components/modals/DebtPaymentModal";
import { BudgetModal } from "./components/modals/BudgetModal";
import { GoalModal } from "./components/modals/GoalModal";
import { DistributeModal } from "./components/modals/DistributeModal";
import { ConfirmModal } from "./components/modals/ConfirmModal";
import { SubscriptionModal } from "./components/modals/SubscriptionModal";
import { QrShareModal } from "./components/modals/QrShareModal";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { POCKETBASE_URL, pb } from "@/lib/pocketbase";
import { peso } from "@/utils/formatters";
import {
  buildChartData,
  buildOccurredAt,
  getActiveGoals,
  getAuthUser,
  getBalanceDelta,
  getCategoryUsage,
  getCurrentTimeInputValue,
  getDebtSummary,
  getDistributeTargets,
  getMonthSummary,
  getNeedEnvelopes,
  getOverviewStats,
  getTodayInputValue,
  getTotals,
  getTransactionBalanceDelta,
  getUpcomingRecurring,
  mapAccountToWallet,
  mapCategoryToView,
  mapTransactionToEntry,
} from "@/utils/helpers";
import type {
  AccountFormValue,
  AllocationValue,
  BudgetFormValue,
  CategoryFormValue,
  ChartRange,
  DashboardData,
  DebtFormValue,
  DebtPaymentValue,
  Entry,
  ExpandedBudget,
  ExpandedRecurring,
  ExpandedSubscription,
  ExpandedTransaction,
  GoalFormValue,
  SubscriptionFormValue,
  TransactionFormEntry,
  ViewKey,
} from "@/types/app";
import type { AccountRecord, AllocationRecord, BudgetRecord, CategoryRecord, DebtRecord, FinanceUser, GoalRecord, SubscriptionRecord } from "@/types/finance";

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
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetRecord | null>(null);
  const [deleteBudget, setDeleteBudget] = useState<BudgetRecord | null>(null);
  const [isGoalOpen, setIsGoalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalRecord | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<GoalRecord | null>(null);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionRecord | null>(null);
  const [deleteSubscription, setDeleteSubscription] = useState<ExpandedSubscription | null>(null);
  const [qrShareAccount, setQrShareAccount] = useState<AccountRecord | null>(null);
  const [distributeContext, setDistributeContext] = useState<{ amount: number; sourceTransaction?: string; date: string } | null>(null);
  const [data, setData] = useState<DashboardData>({ accounts: [], categories: [], transactions: [], budgets: [], debts: [], goals: [], recurring: [], allocations: [], subscriptions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setError("");
    try {
      const filter = pb.filter("user = {:uid}", { uid: user.id });
      const [accounts, categories, transactions, budgets, debts, goals, recurring, allocations, subscriptions] = await Promise.all([
        pb.collection("accounts").getFullList({ filter, sort: "name" }),
        pb.collection("categories").getFullList({ filter, sort: "kind,name" }),
        pb.collection("transactions").getFullList({ filter, sort: "-occurredAt", expand: "account,category" }),
        pb.collection("budgets").getFullList({ filter, sort: "priority,name", expand: "category" }),
        pb.collection("debts").getFullList({ filter, sort: "dueDate,name" }),
        pb.collection("goals").getFullList({ filter, sort: "isCompleted,targetDate" }),
        pb.collection("recurring_transactions").getFullList({ filter, sort: "nextRunAt", expand: "account,category" }),
        pb.collection("allocations").getFullList({ filter, sort: "-date" }),
        pb.collection("subscriptions").getFullList({ filter, sort: "name", expand: "account,category" }),
      ]);

      setData({
        accounts: accounts as unknown as AccountRecord[],
        categories: categories as unknown as CategoryRecord[],
        transactions: transactions as unknown as ExpandedTransaction[],
        budgets: budgets as unknown as ExpandedBudget[],
        debts: debts as unknown as DebtRecord[],
        goals: goals as unknown as GoalRecord[],
        recurring: recurring as unknown as ExpandedRecurring[],
        allocations: allocations as unknown as AllocationRecord[],
        subscriptions: subscriptions as unknown as ExpandedSubscription[],
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load PocketBase data.");
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const wallets = useMemo(() => data.accounts.filter((account) => !account.isArchived).map(mapAccountToWallet), [data.accounts]);
  const categoryViews = useMemo(() => data.categories.filter((category) => !category.isArchived).map(mapCategoryToView), [data.categories]);
  const entries = useMemo(() => data.transactions.map(mapTransactionToEntry), [data.transactions]);
  const chartData = useMemo(() => buildChartData(data.transactions, range), [data.transactions, range]);
  const totals = useMemo(() => getTotals(entries, wallets), [entries, wallets]);
  const todayKey = getTodayInputValue();
  const todayIncome = data.transactions.filter((tx) => tx.type === "income" && tx.occurredAt.slice(0, 10) === todayKey).reduce((sum, tx) => sum + tx.amount, 0);
  const todayExpense = data.transactions.filter((tx) => tx.type === "expense" && tx.occurredAt.slice(0, 10) === todayKey).reduce((sum, tx) => sum + tx.amount, 0);
  const needEnvelopes = useMemo(
    () => getNeedEnvelopes(data.budgets, data.allocations, data.transactions),
    [data.budgets, data.allocations, data.transactions],
  );
  const monthSummary = useMemo(
    () => getMonthSummary(data.transactions, data.allocations),
    [data.transactions, data.allocations],
  );
  const distributeTargets = useMemo(
    () => getDistributeTargets(needEnvelopes, data.goals, data.debts, data.allocations),
    [needEnvelopes, data.goals, data.debts, data.allocations],
  );
  const debtSummary = useMemo(() => getDebtSummary(data.debts), [data.debts]);
  const overviewStats = useMemo(() => getOverviewStats(data.transactions, totals.balance), [data.transactions, totals.balance]);
  const goalViews = useMemo(() => getActiveGoals(data.goals, data.allocations), [data.goals, data.allocations]);
  const upcomingRecurring = useMemo(() => getUpcomingRecurring(data.recurring), [data.recurring]);

  const saveSubscription = async (value: SubscriptionFormValue) => {
    if (!value.name.trim()) {
      setError("Name your subscription.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const payload = {
        user: user.id,
        name: value.name,
        amount: value.amount,
        account: value.accountId || undefined,
        category: value.categoryId || undefined,
        frequency: value.frequency,
        nextBillingDate: value.nextBillingDate || undefined,
        icon: value.icon,
        color: value.color,
        isActive: value.isActive,
        notes: value.notes,
      };
      if (value.id) await pb.collection("subscriptions").update(value.id, payload);
      else await pb.collection("subscriptions").create(payload);
      setIsSubscriptionOpen(false);
      setEditingSubscription(null);
      await loadData();
    } catch (subError) {
      setError(subError instanceof Error ? subError.message : "Could not save subscription.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const deleteOneSubscription = async (sub: ExpandedSubscription) => {
    setIsSaving(true);
    setError("");
    try {
      await pb.collection("subscriptions").delete(sub.id);
      setDeleteSubscription(null);
      await loadData();
    } catch (subError) {
      setError(subError instanceof Error ? subError.message : "Could not delete subscription.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const bulkArchiveAccounts = async (records: AccountRecord[]) => {
    setIsSaving(true);
    setError("");
    try {
      await Promise.all(records.map((record) => pb.collection("accounts").update(record.id, { isArchived: true })));
      await loadData();
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "Could not archive accounts.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const bulkArchiveCategories = async (records: CategoryRecord[]) => {
    setIsSaving(true);
    setError("");
    try {
      await Promise.all(records.map((record) => pb.collection("categories").update(record.id, { isArchived: true })));
      await loadData();
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "Could not archive categories.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const bulkDeleteCategories = async (records: CategoryRecord[]) => {
    setIsSaving(true);
    setError("");
    try {
      await Promise.all(records.map((record) => pb.collection("categories").delete(record.id)));
      await loadData();
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "Could not delete categories.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const bulkDeleteBudgets = async (records: import("@/types/app").NeedEnvelope[]) => {
    setIsSaving(true);
    setError("");
    try {
      await Promise.all(records.map((record) => pb.collection("budgets").delete(record.id)));
      await loadData();
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "Could not delete needs.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const bulkDeleteGoals = async (records: import("@/types/app").GoalView[]) => {
    setIsSaving(true);
    setError("");
    try {
      await Promise.all(records.map((record) => pb.collection("goals").delete(record.id)));
      await loadData();
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "Could not delete goals.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const bulkDeleteSubscriptions = async (records: ExpandedSubscription[]) => {
    setIsSaving(true);
    setError("");
    try {
      await Promise.all(records.map((record) => pb.collection("subscriptions").delete(record.id)));
      await loadData();
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "Could not delete subscriptions.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const bulkArchiveDebts = async (records: DebtRecord[]) => {
    setIsSaving(true);
    setError("");
    try {
      await Promise.all(records.map((record) => pb.collection("debts").update(record.id, { isArchived: true })));
      await loadData();
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "Could not archive debts.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const bulkDeleteDebts = async (records: DebtRecord[]) => {
    setIsSaving(true);
    setError("");
    try {
      await Promise.all(records.map((record) => pb.collection("debts").delete(record.id)));
      await loadData();
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "Could not delete debts.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const applyAccountDelta = async (account: AccountRecord, delta: number) => {
    await pb.collection("accounts").update(account.id, {
      currentBalance: (account.currentBalance || 0) + delta,
    });
  };

  const bulkDeleteTransactions = async (records: import("@/types/app").Entry[]) => {
    setIsSaving(true);
    setError("");
    try {
      // Mirror deleteOneEntry exactly for each record: delete the transaction then
      // reverse the account balance delta so balances stay correct. We do all
      // deletions + reversals before the single loadData() at the end.
      await Promise.all(
        records
          .filter((entry) => Boolean(entry.id))
          .map(async (entry) => {
            const original = data.transactions.find((tx) => tx.id === entry.id);
            if (!original) return;
            const account = data.accounts.find((item) => item.id === original.account);
            await pb.collection("transactions").delete(entry.id!);
            if (account) await applyAccountDelta(account, -getTransactionBalanceDelta(original));
          }),
      );
      await loadData();
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "Could not delete transactions.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
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
        if (account.qrFile || account.removeQr) {
          // File mutation requires multipart FormData
          const fd = new FormData();
          fd.append("name", account.name);
          fd.append("type", account.type);
          fd.append("startingBalance", String(account.startingBalance));
          fd.append("currentBalance", String(original?.currentBalance ?? account.currentBalance));
          fd.append("isArchived", String(account.isArchived));
          if (account.qrFile) {
            fd.append("qr", account.qrFile);
          } else {
            // Clear: send empty string so PocketBase deletes the file
            fd.append("qr", "");
          }
          await pb.collection("accounts").update(account.id, fd);
        } else {
          await pb.collection("accounts").update(account.id, {
            name: account.name,
            type: account.type,
            startingBalance: account.startingBalance,
            currentBalance: original?.currentBalance ?? account.currentBalance,
            isArchived: account.isArchived,
          });
        }
      } else {
        if (account.qrFile) {
          const fd = new FormData();
          fd.append("user", user.id);
          fd.append("name", account.name);
          fd.append("type", account.type);
          fd.append("startingBalance", String(account.startingBalance));
          fd.append("currentBalance", String(account.startingBalance));
          fd.append("isArchived", "false");
          fd.append("qr", account.qrFile);
          await pb.collection("accounts").create(fd);
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
    setIsSaving(true);
    setError("");
    try {
      const payload = {
        user: user.id,
        name: debt.name,
        kind: debt.kind,
        direction: debt.direction,
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
    // For lent debts, the "payment" is the borrower paying the user back — income.
    // For owe debts, the payment is the user paying out — expense.
    const isLent = payment.debt.direction === "lent";
    const expectedCategoryKind = isLent ? "income" : "expense";
    const account = payment.createTransaction ? data.accounts.find((item) => item.id === payment.accountId && !item.isArchived) : null;
    const category = payment.createTransaction ? data.categories.find((item) => item.id === payment.categoryId && !item.isArchived && item.kind === expectedCategoryKind) : null;
    if (payment.createTransaction && (!account || !category)) {
      setError(`Choose an active account and ${expectedCategoryKind} category for the debt payment.`);
      return;
    }

    setIsSaving(true);
    setError("");
    let createdTransactionId = "";
    let accountAdjusted = false;
    const nextPaidAmount = Math.min(payment.debt.amount || 0, (payment.debt.paidAmount || 0) + Math.abs(payment.amount));
    try {
      if (payment.createTransaction && account && category) {
        const txType = isLent ? "income" : "expense";
        // Balance delta: income adds, expense subtracts.
        const balanceDelta = isLent ? Math.abs(payment.amount) : -Math.abs(payment.amount);
        const created = await pb.collection("transactions").create({
          user: user.id,
          account: account.id,
          category: category.id,
          debt: payment.debt.id,
          type: txType,
          amount: payment.amount,
          occurredAt: buildOccurredAt(payment.date, getCurrentTimeInputValue()),
          merchant: isLent ? `Repayment received: ${payment.debt.name}` : `Debt payment: ${payment.debt.name}`,
          notes: payment.notes,
          isRecurringGenerated: false,
        });
        createdTransactionId = created.id;
        await applyAccountDelta(account, balanceDelta);
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
          const isLentRollback = payment.debt.direction === "lent";
          if (account) await applyAccountDelta(account, isLentRollback ? -Math.abs(payment.amount) : Math.abs(payment.amount));
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

  const saveBudget = async (value: BudgetFormValue) => {
    if (!value.category) {
      setError("Choose a category for this need.");
      return;
    }
    const duplicate = data.budgets.some((item) => item.id !== value.id && item.category === value.category);
    if (duplicate) {
      setError("A need already exists for that category.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const payload = {
        user: user.id,
        category: value.category,
        name: value.name,
        amount: value.amount,
        priority: value.priority,
        icon: value.icon,
        color: value.color,
        isActive: value.isActive,
      };
      if (value.id) await pb.collection("budgets").update(value.id, payload);
      else await pb.collection("budgets").create(payload);
      setIsBudgetOpen(false);
      setEditingBudget(null);
      await loadData();
    } catch (budgetError) {
      setError(budgetError instanceof Error ? budgetError.message : "Could not save need.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const deleteOneBudget = async (budget: BudgetRecord) => {
    setIsSaving(true);
    setError("");
    try {
      await pb.collection("budgets").delete(budget.id);
      setDeleteBudget(null);
      await loadData();
    } catch (budgetError) {
      setError(budgetError instanceof Error ? budgetError.message : "Could not delete need.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const saveGoal = async (value: GoalFormValue) => {
    if (!value.name.trim()) {
      setError("Name your goal.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const payload = {
        user: user.id,
        name: value.name.trim(),
        targetAmount: value.targetAmount,
        currentAmount: value.currentAmount,
        monthlyTarget: value.monthlyTarget,
        targetDate: value.targetDate ? buildOccurredAt(value.targetDate, "00:00") : "",
        icon: value.icon,
        priority: value.priority,
        isCompleted: value.isCompleted,
      };
      if (value.id) await pb.collection("goals").update(value.id, payload);
      else await pb.collection("goals").create(payload);
      setIsGoalOpen(false);
      setEditingGoal(null);
      await loadData();
    } catch (goalError) {
      setError(goalError instanceof Error ? goalError.message : "Could not save goal.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const deleteOneGoal = async (goal: GoalRecord) => {
    setIsSaving(true);
    setError("");
    try {
      await pb.collection("goals").delete(goal.id);
      setDeleteGoal(null);
      await loadData();
    } catch (goalError) {
      setError(goalError instanceof Error ? goalError.message : "Could not delete goal.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const createAllocations = async (lines: AllocationValue[]) => {
    const context = distributeContext;
    const valid = lines.filter((line) => line.amount > 0 && (line.budgetId || line.goalId || line.debtId));
    if (!context || valid.length === 0) {
      setDistributeContext(null);
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await Promise.all(
        valid.map((line) =>
          pb.collection("allocations").create({
            user: user.id,
            budget: line.budgetId,
            goal: line.goalId,
            debt: line.debtId,
            sourceTransaction: context.sourceTransaction,
            amount: Math.abs(line.amount),
            date: context.date,
          }),
        ),
      );
      setDistributeContext(null);
      await loadData();
    } catch (allocationError) {
      setError(allocationError instanceof Error ? allocationError.message : "Could not distribute income.");
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const openDistribute = () => {
    setDistributeContext({ amount: Math.max(monthSummary.readyToAssign, 0), date: getTodayInputValue() });
  };

  if (isLoading) {
    return <div className="grid min-h-screen place-items-center bg-zinc-950 text-sm text-zinc-500">Loading your finances...</div>;
  }

  const userAvatarUrl = user.avatar ? pb.files.getURL(user, user.avatar) : "";

  return (
    <>
      <DashboardLayout
        user={user}
        activeView={activeView}
      setActiveView={setActiveView}
      onLogout={onLogout}
      error={error}
      userAvatarUrl={userAvatarUrl}
    >
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
          onBulkDelete={bulkDeleteTransactions}
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
          onBulkArchive={bulkArchiveAccounts}
          onShowQr={setQrShareAccount}
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
          onBulkArchive={bulkArchiveCategories}
          onBulkDelete={bulkDeleteCategories}
        />
      ) : activeView === "needs" ? (
        <BudgetsPage
          needs={needEnvelopes}
          onAdd={() => {
            setEditingBudget(null);
            setIsBudgetOpen(true);
          }}
          onEdit={(id) => {
            setEditingBudget(data.budgets.find((item) => item.id === id) || null);
            setIsBudgetOpen(true);
          }}
          onDelete={(id) => setDeleteBudget(data.budgets.find((item) => item.id === id) || null)}
          onBulkDelete={bulkDeleteBudgets}
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
          onBulkArchive={bulkArchiveDebts}
          onBulkDelete={bulkDeleteDebts}
        />
      ) : activeView === "goals" ? (
        <GoalsPage
          goals={goalViews}
          onAdd={() => {
            setEditingGoal(null);
            setIsGoalOpen(true);
          }}
          onEdit={(id) => {
            setEditingGoal(data.goals.find((item) => item.id === id) || null);
            setIsGoalOpen(true);
          }}
          onDelete={(id) => setDeleteGoal(data.goals.find((item) => item.id === id) || null)}
          onBulkDelete={bulkDeleteGoals}
        />
      ) : activeView === "subscriptions" ? (
        <SubscriptionsPage
          subscriptions={data.subscriptions}
          onAdd={() => {
            setEditingSubscription(null);
            setIsSubscriptionOpen(true);
          }}
          onEdit={(sub) => {
            setEditingSubscription(sub);
            setIsSubscriptionOpen(true);
          }}
          onDelete={setDeleteSubscription}
          onBulkDelete={bulkDeleteSubscriptions}
        />
      ) : (
        <OverviewPage
          stats={overviewStats}
          entries={entries}
          chartData={chartData}
          range={range}
          setRange={setRange}
          debtSummary={debtSummary}
          setActiveView={setActiveView}
          wallets={wallets}
          setEditingAccount={setEditingAccount}
          setIsAccountOpen={setIsAccountOpen}
          todayIncome={todayIncome}
          todayExpense={todayExpense}
          needs={needEnvelopes}
          monthSummary={monthSummary}
          onDistribute={openDistribute}
          goals={goalViews}
          upcomingRecurring={upcomingRecurring}
        />
      )}
    </DashboardLayout>
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
      <BudgetModal
        key={`${isBudgetOpen ? "open" : "closed"}-${editingBudget?.id || "new"}`}
        open={isBudgetOpen}
        onClose={() => {
          setIsBudgetOpen(false);
          setEditingBudget(null);
        }}
        onSave={saveBudget}
        isSaving={isSaving}
        budget={editingBudget}
        categories={data.categories}
      />
      <GoalModal
        key={`${isGoalOpen ? "open" : "closed"}-${editingGoal?.id || "new"}`}
        open={isGoalOpen}
        onClose={() => {
          setIsGoalOpen(false);
          setEditingGoal(null);
        }}
        onSave={saveGoal}
        isSaving={isSaving}
        goal={editingGoal}
      />
      <DistributeModal
        key={distributeContext ? `dist-${distributeContext.date}-${distributeContext.amount}` : "dist-closed"}
        open={Boolean(distributeContext)}
        amount={distributeContext?.amount || 0}
        targets={distributeTargets}
        isSaving={isSaving}
        onClose={() => setDistributeContext(null)}
        onConfirm={createAllocations}
      />
      <ConfirmModal
        open={Boolean(deleteBudget)}
        title="Delete need"
        description={deleteBudget ? `Delete this need? Past allocations to it remain in history.` : ""}
        confirmLabel="Delete"
        busy={isSaving}
        onClose={() => setDeleteBudget(null)}
        onConfirm={() => deleteBudget && void deleteOneBudget(deleteBudget)}
      />
      <ConfirmModal
        open={Boolean(deleteGoal)}
        title="Delete goal"
        description={deleteGoal ? `Delete "${deleteGoal.name}"? Past allocations to it remain in history.` : ""}
        confirmLabel="Delete"
        busy={isSaving}
        onClose={() => setDeleteGoal(null)}
        onConfirm={() => deleteGoal && void deleteOneGoal(deleteGoal)}
      />
      <SubscriptionModal
        key={`${isSubscriptionOpen ? "open" : "closed"}-${editingSubscription?.id || "new"}`}
        open={isSubscriptionOpen}
        onClose={() => {
          setIsSubscriptionOpen(false);
          setEditingSubscription(null);
        }}
        onSave={saveSubscription}
        isSaving={isSaving}
        subscription={editingSubscription}
        accounts={data.accounts}
        categories={data.categories}
      />
      <QrShareModal account={qrShareAccount} onClose={() => setQrShareAccount(null)} onSaved={loadData} />
      <ConfirmModal
        open={Boolean(deleteSubscription)}
        title="Delete subscription"
        description={deleteSubscription ? `Delete "${deleteSubscription.name}"? This will remove the subscription record.` : ""}
        confirmLabel="Delete"
        busy={isSaving}
        onClose={() => setDeleteSubscription(null)}
        onConfirm={() => deleteSubscription && void deleteOneSubscription(deleteSubscription)}
      />
    </>
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
