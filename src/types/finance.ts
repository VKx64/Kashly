export type AccountType =
  | 'cash'
  | 'bank'
  | 'credit_card'
  | 'e_wallet'
  | 'savings'
  | 'investment'
  | 'other'

export type CategoryKind = 'income' | 'expense'
export type TransactionType = 'income' | 'expense' | 'transfer'
export type BudgetPeriod = 'monthly'
export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly'
export type DebtKind = 'personal' | 'credit_card' | 'installment'

export interface BaseRecord {
  id: string
  collectionId: string
  collectionName: string
  created: string
  updated: string
}

export interface FinanceUser extends BaseRecord {
  email: string
  name?: string
  avatar?: string
  defaultCurrency: string
  monthlyBudget?: number
  timezone: string
}

export interface AccountRecord extends BaseRecord {
  user: string
  name: string
  type: AccountType
  startingBalance: number
  currentBalance: number
  isArchived: boolean
}

export interface CategoryRecord extends BaseRecord {
  user: string
  name: string
  kind: CategoryKind
  color: string
  icon?: string
  isSystem: boolean
  isArchived: boolean
}

export interface TransactionRecord extends BaseRecord {
  user: string
  account: string
  category?: string
  debt?: string
  type: TransactionType
  amount: number
  occurredAt: string
  merchant?: string
  notes?: string
  transferAccount?: string
  isRecurringGenerated: boolean
}

export interface BudgetRecord extends BaseRecord {
  user: string
  category: string
  period: BudgetPeriod
  month: string
  amount: number
  alertThreshold?: number
}

export interface RecurringTransactionRecord extends BaseRecord {
  user: string
  account: string
  category?: string
  type: TransactionType
  amount: number
  merchant?: string
  notes?: string
  frequency: RecurringFrequency
  nextRunAt: string
  isActive: boolean
}

export interface GoalRecord extends BaseRecord {
  user: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate?: string
  account?: string
  isCompleted: boolean
}

export interface DebtRecord extends BaseRecord {
  user: string
  name: string
  kind: DebtKind
  amount: number
  paidAmount: number
  dueDate?: string
  notes?: string
  isArchived: boolean
}

export interface FinanceSnapshot {
  accounts: AccountRecord[]
  categories: CategoryRecord[]
  transactions: TransactionRecord[]
  budgets: BudgetRecord[]
  recurringTransactions: RecurringTransactionRecord[]
  goals: GoalRecord[]
  debts: DebtRecord[]
}
