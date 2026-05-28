import type {
  AccountRecord,
  CategoryRecord,
  GoalRecord,
  TransactionRecord,
  TransactionType,
} from '@/types/finance'

export type DailyCashflowMode = 'expense' | 'income'

export interface DailyCashflowCell {
  date: Date
  dateKey: string
  amount: number
  count: number
  weekIndex: number
  dayIndex: number
  level: 0 | 1 | 2 | 3 | 4
}

export interface DailyCashflowSummary {
  cells: DailyCashflowCell[]
  activeDays: number
  totalAmount: number
  transactionCount: number
  startDate: Date
  endDate: Date
}

export function getTransactionTotals(transactions: TransactionRecord[]) {
  return transactions.reduce(
    (running, transaction) => {
      if (transaction.type === 'income') running.income += transaction.amount
      if (transaction.type === 'expense') running.expenses += transaction.amount
      return running
    },
    { income: 0, expenses: 0 },
  )
}

export function getAccountTotal(accounts: AccountRecord[]) {
  return accounts.reduce(
    (running, account) =>
      account.isArchived ? running : running + account.currentBalance,
    0,
  )
}

export function getActiveAccounts(accounts: AccountRecord[]) {
  return accounts.filter((account) => !account.isArchived)
}

export function getActiveGoals(goals: GoalRecord[]) {
  return goals.filter((goal) => !goal.isCompleted)
}

export function getUsableCategories(
  categories: CategoryRecord[],
  transactionType: TransactionType,
) {
  return categories.filter(
    (category) =>
      !category.isArchived &&
      (transactionType === 'income'
        ? category.kind === 'income'
        : category.kind === 'expense'),
  )
}

export function getAccountById(accounts: AccountRecord[], id?: string) {
  return accounts.find((account) => account.id === id)
}

export function getCategoryById(categories: CategoryRecord[], id?: string) {
  return categories.find((category) => category.id === id)
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getLocalDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function addLocalDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function getQuantile(sortedValues: number[], quantile: number) {
  if (sortedValues.length === 0) return 0
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil(sortedValues.length * quantile) - 1),
  )
  return sortedValues[index]
}

export function getDailyCashflowSummary(
  transactions: TransactionRecord[],
  mode: DailyCashflowMode,
  today = new Date(),
): DailyCashflowSummary {
  const dayCount = 365
  const todayStart = startOfLocalDay(today)
  const startDate = addLocalDays(todayStart, -(dayCount - 1))
  const endDate = todayStart
  const startKey = getLocalDateKey(startDate)
  const endKey = getLocalDateKey(endDate)
  const todayKey = getLocalDateKey(todayStart)
  const dailyTotals = new Map<string, { amount: number; count: number }>()

  for (const transaction of transactions) {
    if (transaction.type !== mode) continue

    const occurredAt = new Date(transaction.occurredAt)
    if (Number.isNaN(occurredAt.getTime())) continue

    const dateKey = getLocalDateKey(occurredAt)
    if (dateKey < startKey || dateKey > endKey || dateKey > todayKey) continue

    const current = dailyTotals.get(dateKey) ?? { amount: 0, count: 0 }
    dailyTotals.set(dateKey, {
      amount: current.amount + Math.abs(transaction.amount),
      count: current.count + 1,
    })
  }

  const nonZeroAmounts = Array.from(dailyTotals.values())
    .map((day) => day.amount)
    .filter((amount) => amount > 0)
    .sort((left, right) => left - right)
  const thresholds = [
    getQuantile(nonZeroAmounts, 0.25),
    getQuantile(nonZeroAmounts, 0.5),
    getQuantile(nonZeroAmounts, 0.75),
  ]

  const cells: DailyCashflowCell[] = []
  let activeDays = 0
  let totalAmount = 0
  let transactionCount = 0

  for (let dayOffset = 0; dayOffset < dayCount; dayOffset += 1) {
    const date = addLocalDays(startDate, dayOffset)
    const dateKey = getLocalDateKey(date)
    const dayTotal = dailyTotals.get(dateKey)
    const amount = dayTotal?.amount ?? 0
    const count = dayTotal?.count ?? 0
    const level = amount === 0
      ? 0
      : amount > thresholds[2]
        ? 4
        : amount > thresholds[1]
          ? 3
          : amount > thresholds[0]
            ? 2
            : 1

    if (amount > 0) {
      activeDays += 1
      totalAmount += amount
      transactionCount += count
    }

    cells.push({
      date,
      dateKey,
      amount,
      count,
      weekIndex: Math.floor(dayOffset / 7),
      dayIndex: dayOffset % 7,
      level,
    })
  }

  return {
    cells,
    activeDays,
    totalAmount,
    transactionCount,
    startDate,
    endDate,
  }
}
