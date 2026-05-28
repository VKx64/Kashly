import type { AccountType, TransactionType } from '@/types/finance'

export const accountTypes: AccountType[] = [
  'cash',
  'bank',
  'credit_card',
  'e_wallet',
  'savings',
  'investment',
  'other',
]

export const transactionTypes: TransactionType[] = [
  'expense',
  'income',
  'transfer',
]

export const defaultCategoryColor = '#0f766e'

export const categoryColorPresets = [
  '#0f766e',
  '#2563eb',
  '#7c3aed',
  '#d97706',
  '#dc2626',
  '#64748b',
]
