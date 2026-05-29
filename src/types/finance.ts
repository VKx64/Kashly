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
  qr?: string
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
  name?: string
  amount: number
  priority?: number
  icon?: string
  color?: string
  isActive?: boolean
}

export interface AllocationRecord extends BaseRecord {
  user: string
  budget?: string
  goal?: string
  debt?: string
  sourceTransaction?: string
  amount: number
  date: string
  note?: string
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
  monthlyTarget?: number
  priority?: number
  icon?: string
}

export interface DebtRecord extends BaseRecord {
  user: string
  name: string
  kind: DebtKind
  direction?: "owe" | "lent"
  amount: number
  paidAmount: number
  dueDate?: string
  notes?: string
  isArchived: boolean
  monthlyPayment?: number
  priority?: number
  icon?: string
}

export type SubscriptionFrequency = "weekly" | "monthly" | "yearly"

export interface SubscriptionRecord extends BaseRecord {
  user: string
  name: string
  amount: number
  account?: string
  category?: string
  frequency: SubscriptionFrequency
  nextBillingDate?: string
  icon?: string
  color?: string
  isActive: boolean
  notes?: string
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
