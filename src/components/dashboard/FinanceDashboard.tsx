import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  BarChart2,
  Settings,
  Bell,
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Wallet,
  CreditCard,
  Target,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

import { pb } from '@/lib/pocketbase'
import { formatCurrency } from '@/lib/finance-format'
import type {
  AccountRecord,
  AccountType,
  BudgetRecord,
  CategoryRecord,
  FinanceUser,
  TransactionRecord,
} from '@/types/finance'

// ─── types ────────────────────────────────────────────────────────────────────

interface ExpandedTransaction extends TransactionRecord {
  expand?: {
    account?: AccountRecord
    category?: CategoryRecord
  }
}

interface ExpandedBudget extends BudgetRecord {
  expand?: {
    category?: CategoryRecord
  }
}

interface DashboardData {
  accounts: AccountRecord[]
  categories: CategoryRecord[]
  transactions: ExpandedTransaction[]
  budgets: ExpandedBudget[]
}

interface Props {
  user: FinanceUser
  onLogout: () => void
}

// ─── constants ────────────────────────────────────────────────────────────────

const PESO = (n: number) => formatCurrency(n, 'PHP')

const ACCOUNT_ICON: Record<AccountType, typeof Wallet> = {
  bank: Landmark,
  savings: Landmark,
  cash: Wallet,
  credit_card: CreditCard,
  e_wallet: Wallet,
  investment: Target,
  other: Wallet,
}

const ACCOUNT_COLOR: Record<AccountType, string> = {
  bank: 'text-blue-400',
  savings: 'text-emerald-400',
  cash: 'text-yellow-400',
  credit_card: 'text-rose-400',
  e_wallet: 'text-violet-400',
  investment: 'text-cyan-400',
  other: 'text-slate-400',
}

const BUDGET_COLORS = [
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-indigo-500',
]

// Default categories to seed if the user has none
const DEFAULT_CATEGORIES: { name: string; kind: 'income' | 'expense'; color: string }[] = [
  { name: 'Income', kind: 'income', color: '#10b981' },
  { name: 'Dining', kind: 'expense', color: '#f59e0b' },
  { name: 'Bills', kind: 'expense', color: '#ef4444' },
  { name: 'Transport', kind: 'expense', color: '#3b82f6' },
  { name: 'Shopping', kind: 'expense', color: '#8b5cf6' },
  { name: 'Savings', kind: 'expense', color: '#06b6d4' },
  { name: 'Other', kind: 'expense', color: '#64748b' },
]

// ─── cashflow aggregation ─────────────────────────────────────────────────────

type ChartRange = 'week' | 'month' | 'year'

interface ChartPoint {
  label: string
  income: number
  expense: number
}

function buildChartData(transactions: ExpandedTransaction[], range: ChartRange): ChartPoint[] {
  const now = new Date()

  if (range === 'week') {
    // Last 7 days
    const points: ChartPoint[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      points.push({
        label: d.toLocaleDateString('en-PH', { weekday: 'short' }),
        income: 0,
        expense: 0,
      })
      for (const tx of transactions) {
        if (tx.occurredAt.slice(0, 10) === key) {
          if (tx.type === 'income') points[points.length - 1].income += tx.amount
          if (tx.type === 'expense') points[points.length - 1].expense += tx.amount
        }
      }
    }
    return points
  }

  if (range === 'month') {
    // Last 30 days in ~4-day buckets (8 buckets)
    const BUCKET_SIZE = 4
    const BUCKETS = 8
    const points: ChartPoint[] = []
    for (let i = BUCKETS - 1; i >= 0; i--) {
      const bucketEnd = new Date(now)
      bucketEnd.setDate(bucketEnd.getDate() - i * BUCKET_SIZE)
      const bucketStart = new Date(bucketEnd)
      bucketStart.setDate(bucketStart.getDate() - BUCKET_SIZE + 1)
      const label = bucketEnd.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
      const point: ChartPoint = { label, income: 0, expense: 0 }
      for (const tx of transactions) {
        const d = new Date(tx.occurredAt)
        if (d >= bucketStart && d <= bucketEnd) {
          if (tx.type === 'income') point.income += tx.amount
          if (tx.type === 'expense') point.expense += tx.amount
        }
      }
      points.push(point)
    }
    return points
  }

  // year: last 12 calendar months
  const points: ChartPoint[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('en-PH', { month: 'short' })
    const point: ChartPoint = { label, income: 0, expense: 0 }
    for (const tx of transactions) {
      const td = new Date(tx.occurredAt)
      if (td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth()) {
        if (tx.type === 'income') point.income += tx.amount
        if (tx.type === 'expense') point.expense += tx.amount
      }
    }
    points.push(point)
  }
  return points
}

function rangeFilteredTransactions(transactions: ExpandedTransaction[], range: ChartRange) {
  const now = new Date()
  const cutoff = new Date(now)
  if (range === 'week') cutoff.setDate(cutoff.getDate() - 7)
  else if (range === 'month') cutoff.setDate(cutoff.getDate() - 30)
  else cutoff.setFullYear(cutoff.getFullYear() - 1)
  return transactions.filter((tx) => new Date(tx.occurredAt) >= cutoff)
}

// ─── analog clock drag helper ─────────────────────────────────────────────────

function angleToTime(angle: number, mode: 'hour' | 'minute'): number {
  // angle in degrees from 12-o'clock, clockwise
  const normalised = ((angle % 360) + 360) % 360
  if (mode === 'hour') return Math.round(normalised / 30) % 12
  return Math.round(normalised / 6) % 60
}

// ─── sub-components ───────────────────────────────────────────────────────────

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof LayoutDashboard
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-sm font-medium transition-colors
        ${active
          ? 'bg-violet-600/20 text-violet-300'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
        }`}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </button>
  )
}

// ─── AddEntryModal ─────────────────────────────────────────────────────────────

interface AddEntryModalProps {
  open: boolean
  onClose: () => void
  accounts: AccountRecord[]
  categories: CategoryRecord[]
  userId: string
  onSaved: () => void
}

function AddEntryModal({ open, onClose, accounts, categories, userId, onSaved }: AddEntryModalProps) {
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Date/time state
  const today = new Date()
  const [selectedDate, setSelectedDate] = useState(today)
  const [calendarMonth, setCalendarMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [hours, setHours] = useState(today.getHours() % 12 || 12)
  const [minutes, setMinutes] = useState(today.getMinutes())
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(today.getHours() < 12 ? 'AM' : 'PM')
  const [clockMode, setClockMode] = useState<'hour' | 'minute'>('hour')

  const clockRef = useRef<SVGSVGElement>(null)

  // Filter categories by type
  const filteredCategories = useMemo(
    () => categories.filter((c) => c.kind === type && !c.isArchived),
    [categories, type],
  )

  // Reset category when type changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCategoryId(filteredCategories[0]?.id ?? '')
  }, [type, filteredCategories])

  // Reset account when accounts load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!accountId && accounts[0]) setAccountId(accounts[0].id)
  }, [accounts, accountId])

  function resetForm() {
    setType('expense')
    setAmount('')
    setTitle('')
    setNote('')
    setError('')
    setBusy(false)
    const n = new Date()
    setSelectedDate(n)
    setHours(n.getHours() % 12 || 12)
    setMinutes(n.getMinutes())
    setAmpm(n.getHours() < 12 ? 'AM' : 'PM')
    setClockMode('hour')
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  // Calendar helpers
  const calYear = calendarMonth.getFullYear()
  const calMon = calendarMonth.getMonth()
  const firstDay = new Date(calYear, calMon, 1).getDay()
  const daysInMonth = new Date(calYear, calMon + 1, 0).getDate()
  const calCells: (number | null)[] = [
    ...Array<null>(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  function prevMonth() {
    setCalendarMonth(new Date(calYear, calMon - 1, 1))
  }
  function nextMonth() {
    setCalendarMonth(new Date(calYear, calMon + 1, 1))
  }
  function selectDay(day: number) {
    setSelectedDate(new Date(calYear, calMon, day))
  }

  // Analog clock drag
  function handleClockPointer(e: React.PointerEvent<SVGSVGElement>) {
    if (!clockRef.current) return
    const rect = clockRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90
    if (clockMode === 'hour') {
      const h = angleToTime(angle, 'hour') || 12
      setHours(h)
    } else {
      setMinutes(angleToTime(angle, 'minute'))
    }
  }

  function handleClockPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    handleClockPointer(e)
  }
  function handleClockPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (e.buttons !== 1) return
    handleClockPointer(e)
  }
  function handleClockPointerUp() {
    if (clockMode === 'hour') setClockMode('minute')
  }

  // Clock hand angles
  const hourAngle = ((hours % 12) / 12) * 360
  const minuteAngle = (minutes / 60) * 360

  function buildOccurredAt() {
    let h = hours % 12
    if (ampm === 'PM') h += 12
    const d = new Date(selectedDate)
    d.setHours(h, minutes, 0, 0)
    return d.toISOString()
  }

  async function handleSubmit() {
    setError('')
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) {
      setError('Enter a valid amount greater than 0.')
      return
    }
    if (!accountId) {
      setError('Select a wallet.')
      return
    }
    if (!categoryId) {
      setError('Select a category.')
      return
    }

    setBusy(true)
    try {
      await pb.collection('transactions').create({
        user: userId,
        account: accountId,
        category: categoryId,
        type,
        amount: amt,
        occurredAt: buildOccurredAt(),
        merchant: title.trim() || undefined,
        notes: note.trim() || undefined,
        isRecurringGenerated: false,
      })

      // Update account balance
      const acct = accounts.find((a) => a.id === accountId)
      if (acct) {
        await pb.collection('accounts').update(accountId, {
          currentBalance:
            type === 'income'
              ? acct.currentBalance + amt
              : acct.currentBalance - amt,
        })
      }

      onSaved()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save transaction.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Add Transaction</h2>
                <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
                  <X className="size-5" />
                </button>
              </div>

              {/* Type toggle */}
              <div className="flex bg-slate-800 rounded-xl p-1 mb-5">
                {(['expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                      type === t
                        ? t === 'expense'
                          ? 'bg-rose-500 text-white'
                          : 'bg-emerald-500 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Amount */}
              <div className="mb-4">
                <label className="block text-xs text-slate-400 mb-1.5">Amount (PHP)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-xl font-bold placeholder-slate-600 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Title */}
              <div className="mb-4">
                <label className="block text-xs text-slate-400 mb-1.5">Description</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What was this for?"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Note */}
              <div className="mb-4">
                <label className="block text-xs text-slate-400 mb-1.5">Note (optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Date picker */}
              <div className="mb-4">
                <label className="block text-xs text-slate-400 mb-1.5">Date</label>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
                  {/* Month nav */}
                  <div className="flex items-center justify-between mb-2">
                    <button onClick={prevMonth} className="text-slate-400 hover:text-white">
                      <ChevronLeft className="size-4" />
                    </button>
                    <span className="text-sm font-medium text-white">
                      {calendarMonth.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={nextMonth} className="text-slate-400 hover:text-white">
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                  {/* Day headers */}
                  <div className="grid grid-cols-7 text-center mb-1">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                      <span key={i} className="text-xs text-slate-500 py-1">{d}</span>
                    ))}
                  </div>
                  {/* Days */}
                  <div className="grid grid-cols-7 text-center gap-y-1">
                    {calCells.map((day, i) => {
                      if (!day) return <span key={i} />
                      const isSelected =
                        selectedDate.getDate() === day &&
                        selectedDate.getMonth() === calMon &&
                        selectedDate.getFullYear() === calYear
                      return (
                        <button
                          key={i}
                          onClick={() => selectDay(day)}
                          className={`size-7 mx-auto rounded-full text-xs font-medium transition-colors ${
                            isSelected
                              ? 'bg-violet-600 text-white'
                              : 'text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Analog clock */}
              <div className="mb-4">
                <label className="block text-xs text-slate-400 mb-1.5">
                  Time — click to set {clockMode === 'hour' ? 'hour' : 'minute'}
                </label>
                <div className="flex items-center gap-4">
                  <svg
                    ref={clockRef}
                    viewBox="0 0 100 100"
                    className="size-28 cursor-pointer shrink-0"
                    onPointerDown={handleClockPointerDown}
                    onPointerMove={handleClockPointerMove}
                    onPointerUp={handleClockPointerUp}
                  >
                    <circle cx="50" cy="50" r="48" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
                    {/* Hour ticks */}
                    {Array.from({ length: 12 }, (_, i) => {
                      const a = (i / 12) * Math.PI * 2 - Math.PI / 2
                      return (
                        <line
                          key={i}
                          x1={50 + 40 * Math.cos(a)}
                          y1={50 + 40 * Math.sin(a)}
                          x2={50 + 44 * Math.cos(a)}
                          y2={50 + 44 * Math.sin(a)}
                          stroke="#475569"
                          strokeWidth="1.5"
                        />
                      )
                    })}
                    {/* Hour hand */}
                    {clockMode === 'hour' && (
                      <line
                        x1="50" y1="50"
                        x2={50 + 28 * Math.sin((hourAngle * Math.PI) / 180)}
                        y2={50 - 28 * Math.cos((hourAngle * Math.PI) / 180)}
                        stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round"
                      />
                    )}
                    {/* Minute hand */}
                    {clockMode === 'minute' && (
                      <line
                        x1="50" y1="50"
                        x2={50 + 36 * Math.sin((minuteAngle * Math.PI) / 180)}
                        y2={50 - 36 * Math.cos((minuteAngle * Math.PI) / 180)}
                        stroke="#06b6d4" strokeWidth="2" strokeLinecap="round"
                      />
                    )}
                    <circle cx="50" cy="50" r="3" fill="#fff" />
                  </svg>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1 bg-slate-800 rounded-xl px-3 py-2 text-white text-lg font-bold tabular-nums">
                      <button
                        className={`${clockMode === 'hour' ? 'text-violet-400' : 'text-slate-300'}`}
                        onClick={() => setClockMode('hour')}
                      >
                        {String(hours).padStart(2, '0')}
                      </button>
                      <span className="text-slate-500">:</span>
                      <button
                        className={`${clockMode === 'minute' ? 'text-cyan-400' : 'text-slate-300'}`}
                        onClick={() => setClockMode('minute')}
                      >
                        {String(minutes).padStart(2, '0')}
                      </button>
                    </div>
                    <div className="flex gap-1">
                      {(['AM', 'PM'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setAmpm(p)}
                          className={`flex-1 text-xs py-1 rounded-lg transition-colors ${
                            ampm === p ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Category */}
              <div className="mb-4">
                <label className="block text-xs text-slate-400 mb-1.5">Category</label>
                {filteredCategories.length === 0 ? (
                  <p className="text-xs text-slate-500">No categories available for this type.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {filteredCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setCategoryId(cat.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          categoryId === cat.id
                            ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                            : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Wallet */}
              <div className="mb-5">
                <label className="block text-xs text-slate-400 mb-1.5">Wallet</label>
                <div className="flex flex-wrap gap-2">
                  {accounts.filter((a) => !a.isArchived).map((acct) => {
                    const Icon = ACCOUNT_ICON[acct.type] ?? Wallet
                    return (
                      <button
                        key={acct.id}
                        onClick={() => setAccountId(acct.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          accountId === acct.id
                            ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                            : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="size-3" />
                        {acct.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {error && <p className="text-rose-400 text-xs mb-4">{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={busy}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
              >
                {busy ? 'Saving...' : 'Save Transaction'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── AddWalletModal ────────────────────────────────────────────────────────────

interface AddWalletModalProps {
  open: boolean
  onClose: () => void
  userId: string
  onSaved: () => void
}

const ACCOUNT_TYPE_OPTIONS: AccountType[] = ['bank', 'savings', 'cash', 'credit_card', 'e_wallet', 'investment', 'other']

function AddWalletModal({ open, onClose, userId, onSaved }: AddWalletModalProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('bank')
  const [balance, setBalance] = useState('0.00')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function handleClose() {
    setName('')
    setType('bank')
    setBalance('0.00')
    setError('')
    onClose()
  }

  async function handleSubmit() {
    setError('')
    const bal = parseFloat(balance)
    if (!name.trim()) { setError('Enter a wallet name.'); return }
    if (isNaN(bal)) { setError('Enter a valid starting balance.'); return }
    setBusy(true)
    try {
      await pb.collection('accounts').create({
        user: userId,
        name: name.trim(),
        type,
        startingBalance: bal,
        currentBalance: bal,
        isArchived: false,
      })
      onSaved()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create wallet.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
          <motion.div
            className="relative z-10 w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Add Wallet</h2>
              <button onClick={handleClose} className="text-slate-400 hover:text-white">
                <X className="size-5" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1.5">Name</label>
              <input
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. BDO Savings"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1.5">Type</label>
              <select
                value={type} onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500"
              >
                {ACCOUNT_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="mb-5">
              <label className="block text-xs text-slate-400 mb-1.5">Starting Balance (PHP)</label>
              <input
                type="number" min="0" step="0.01"
                value={balance} onChange={(e) => setBalance(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500"
              />
            </div>
            {error && <p className="text-rose-400 text-xs mb-4">{error}</p>}
            <button
              onClick={handleSubmit} disabled={busy}
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
            >
              {busy ? 'Saving...' : 'Create Wallet'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── AddBudgetModal ────────────────────────────────────────────────────────────

interface AddBudgetModalProps {
  open: boolean
  onClose: () => void
  userId: string
  categories: CategoryRecord[]
  onSaved: () => void
}

function AddBudgetModal({ open, onClose, userId, categories, onSaved }: AddBudgetModalProps) {
  const expenseCategories = categories.filter((c) => c.kind === 'expense' && !c.isArchived)
  const [catId, setCatId] = useState(expenseCategories[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [month, setMonth] = useState(() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!catId && expenseCategories[0]) setCatId(expenseCategories[0].id)
  }, [catId, expenseCategories])

  function handleClose() {
    setAmount('')
    setError('')
    onClose()
  }

  async function handleSubmit() {
    setError('')
    const amt = parseFloat(amount)
    if (!catId) { setError('Select a category.'); return }
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid budget amount.'); return }
    setBusy(true)
    try {
      await pb.collection('budgets').create({
        user: userId,
        category: catId,
        period: 'monthly',
        month: `${month}-01`,
        amount: amt,
      })
      onSaved()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create budget.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
          <motion.div
            className="relative z-10 w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Create Budget</h2>
              <button onClick={handleClose} className="text-slate-400 hover:text-white">
                <X className="size-5" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1.5">Category</label>
              <select
                value={catId} onChange={(e) => setCatId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500"
              >
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1.5">Month</label>
              <input
                type="month" value={month} onChange={(e) => setMonth(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="mb-5">
              <label className="block text-xs text-slate-400 mb-1.5">Budget Limit (PHP)</label>
              <input
                type="number" min="0" step="0.01"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500"
              />
            </div>
            {error && <p className="text-rose-400 text-xs mb-4">{error}</p>}
            <button
              onClick={handleSubmit} disabled={busy}
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
            >
              {busy ? 'Saving...' : 'Create Budget'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── main dashboard ───────────────────────────────────────────────────────────

export function FinanceDashboard({ user, onLogout }: Props) {
  const [data, setData] = useState<DashboardData>({
    accounts: [],
    categories: [],
    transactions: [],
    budgets: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [chartRange, setChartRange] = useState<ChartRange>('month')
  const [activeNav, setActiveNav] = useState('Overview')

  const [showAddEntry, setShowAddEntry] = useState(false)
  const [showAddWallet, setShowAddWallet] = useState(false)
  const [showAddBudget, setShowAddBudget] = useState(false)

  const loadData = useCallback(async () => {
    setError('')
    const filter = pb.filter('user = {:uid}', { uid: user.id })
    try {
      const [accounts, categories, transactions, budgets] = await Promise.all([
        pb.collection('accounts').getFullList({ filter, sort: 'name' }),
        pb.collection('categories').getFullList({ filter, sort: 'kind,name' }),
        pb.collection('transactions').getFullList({
          filter,
          sort: '-occurredAt',
          expand: 'account,category',
        }),
        pb.collection('budgets').getFullList({
          filter,
          sort: '-month',
          expand: 'category',
        }),
      ])
      setData({
        accounts: accounts as unknown as AccountRecord[],
        categories: categories as unknown as CategoryRecord[],
        transactions: transactions as unknown as ExpandedTransaction[],
        budgets: budgets as unknown as ExpandedBudget[],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load data.')
    } finally {
      setLoading(false)
    }
  }, [user.id])

  // Seed default categories if user has none
  const seedCategories = useCallback(async () => {
    const existing = await pb.collection('categories').getFullList({
      filter: pb.filter('user = {:uid}', { uid: user.id }),
    })
    if (existing.length > 0) return
    await Promise.all(
      DEFAULT_CATEGORIES.map((cat) =>
        pb.collection('categories').create({
          user: user.id,
          name: cat.name,
          kind: cat.kind,
          color: cat.color,
          icon: '',
          isSystem: true,
          isArchived: false,
        }),
      ),
    )
  }, [user.id])

  useEffect(() => {
    void seedCategories().then(loadData)
  }, [seedCategories, loadData])

  // ── derived values ───────────────────────────────────────────────────────────

  const activeAccounts = useMemo(
    () => data.accounts.filter((a) => !a.isArchived),
    [data.accounts],
  )

  const netBalance = useMemo(
    () => activeAccounts.reduce((sum, a) => sum + a.currentBalance, 0),
    [activeAccounts],
  )

  const rangedTx = useMemo(
    () => rangeFilteredTransactions(data.transactions, chartRange),
    [data.transactions, chartRange],
  )

  const totalIncome = useMemo(
    () => rangedTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [rangedTx],
  )
  const totalExpense = useMemo(
    () => rangedTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [rangedTx],
  )

  const chartData = useMemo(() => buildChartData(data.transactions, chartRange), [data.transactions, chartRange])

  // Today's totals for the "today in/out" tiles
  const todayKey = new Date().toISOString().slice(0, 10)
  const todayIn = data.transactions
    .filter((t) => t.type === 'income' && t.occurredAt.slice(0, 10) === todayKey)
    .reduce((s, t) => s + t.amount, 0)
  const todayOut = data.transactions
    .filter((t) => t.type === 'expense' && t.occurredAt.slice(0, 10) === todayKey)
    .reduce((s, t) => s + t.amount, 0)

  // Budget health: compute spent per budget
  const budgetsWithSpent = useMemo(() => {
    return data.budgets.map((budget, idx) => {
      const budgetMonth = budget.month.slice(0, 7) // "YYYY-MM"
      const spent = data.transactions
        .filter(
          (t) =>
            t.type === 'expense' &&
            t.category === budget.category &&
            t.occurredAt.slice(0, 7) === budgetMonth,
        )
        .reduce((s, t) => s + t.amount, 0)
      const pct = budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0
      const color = BUDGET_COLORS[idx % BUDGET_COLORS.length]
      const categoryName = budget.expand?.category?.name ?? 'Budget'
      return { ...budget, spent, pct, color, categoryName }
    })
  }, [data.budgets, data.transactions])

  // ── render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">Loading your finances...</div>
      </div>
    )
  }

  const navItems = [
    { label: 'Overview', icon: LayoutDashboard },
    { label: 'Transactions', icon: ArrowLeftRight },
    { label: 'Budgets', icon: PieChart },
    { label: 'Reports', icon: BarChart2 },
    { label: 'Settings', icon: Settings },
  ]

  const recentTx = data.transactions.slice(0, 8)

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-slate-900/60 border-r border-slate-800 p-4">
        {/* Brand */}
        <div className="flex items-center gap-2 px-3 py-3 mb-6">
          <div className="size-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">K</span>
          </div>
          <span className="font-bold text-white text-sm">Kashley</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map(({ label, icon }) => (
            <NavItem
              key={label}
              icon={icon}
              label={label}
              active={activeNav === label}
              onClick={() => setActiveNav(label)}
            />
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-slate-800 pt-4 mt-4">
          <div className="flex items-center gap-3 px-3">
            <div className="size-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {(user.name ?? user.email).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user.name ?? user.email}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
            <button onClick={onLogout} className="text-slate-500 hover:text-rose-400 transition-colors" title="Sign out">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-4 px-6 py-4 border-b border-slate-800 bg-slate-900/40">
          <div className="flex-1 flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-2 max-w-sm">
            <Search className="size-4 text-slate-500 shrink-0" />
            <input
              placeholder="Search transactions..."
              className="bg-transparent text-sm text-white placeholder-slate-500 outline-none flex-1"
            />
          </div>
          <button className="relative text-slate-400 hover:text-white transition-colors">
            <Bell className="size-5" />
            <span className="absolute -top-0.5 -right-0.5 size-2 bg-violet-500 rounded-full" />
          </button>
          <button
            onClick={() => setShowAddEntry(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 transition-colors text-white text-sm font-semibold px-4 py-2 rounded-xl"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Transaction</span>
          </button>
        </header>

        {/* Body */}
        <main className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-xl">
              {error}
            </div>
          )}

          {/* Hero net balance card */}
          <div className="mb-6 p-6 bg-gradient-to-br from-violet-600/30 to-fuchsia-700/20 border border-violet-500/20 rounded-2xl">
            <p className="text-xs text-violet-300 mb-1 uppercase tracking-wider font-medium">Net Balance</p>
            <h1 className="text-4xl font-bold text-white mb-1">{PESO(netBalance)}</h1>
            {/* NOTE: +12.4% delta is stubbed — real month-over-month growth not yet computed */}
            <p className="text-xs text-slate-400">
              <span className="text-emerald-400 font-medium">Across {activeAccounts.length} wallet{activeAccounts.length !== 1 ? 's' : ''}</span>
            </p>

            {/* Income / Expense / Tx count tiles */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              <div className="bg-slate-900/50 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-0.5">Income</p>
                <p className="text-sm font-bold text-emerald-400">{PESO(totalIncome)}</p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-0.5">Expenses</p>
                <p className="text-sm font-bold text-rose-400">{PESO(totalExpense)}</p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-0.5">Transactions</p>
                <p className="text-sm font-bold text-violet-300">{rangedTx.length}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left column: cashflow + recent activity */}
            <div className="xl:col-span-2 flex flex-col gap-6">
              {/* Cashflow pulse */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-white">Cashflow Pulse</h2>
                  <div className="flex bg-slate-800 rounded-lg p-0.5 gap-0.5">
                    {(['week', 'month', 'year'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setChartRange(r)}
                        className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                          chartRange === r ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 10 }}
                      labelStyle={{ color: '#94a3b8', fontSize: 11 }}
                      itemStyle={{ fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fill="url(#incomeGrad)" name="Income" />
                    <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fill="url(#expenseGrad)" name="Expense" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Recent activity */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
                  <div className="flex gap-3">
                    <div className="bg-slate-800 rounded-xl px-3 py-1.5">
                      <p className="text-xs text-slate-400">Today In</p>
                      <p className="text-xs font-bold text-emerald-400">{PESO(todayIn)}</p>
                    </div>
                    <div className="bg-slate-800 rounded-xl px-3 py-1.5">
                      <p className="text-xs text-slate-400">Today Out</p>
                      <p className="text-xs font-bold text-rose-400">{PESO(todayOut)}</p>
                    </div>
                  </div>
                </div>
                {recentTx.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-6">No transactions yet. Add your first one!</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {recentTx.map((tx) => {
                      const isIncome = tx.type === 'income'
                      const Icon = isIncome ? ArrowDownLeft : ArrowUpRight
                      const categoryName = tx.expand?.category?.name ?? 'Uncategorized'
                      const accountName = tx.expand?.account?.name ?? 'Unknown'
                      const date = new Date(tx.occurredAt)
                      const dateStr = date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
                      return (
                        <div key={tx.id} className="flex items-center gap-3 py-2.5 border-b border-slate-800 last:border-0">
                          <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${isIncome ? 'bg-emerald-500/15' : 'bg-rose-500/15'}`}>
                            <Icon className={`size-4 ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{tx.merchant || categoryName}</p>
                            <p className="text-xs text-slate-500 truncate">{accountName} · {dateStr}</p>
                          </div>
                          <p className={`text-sm font-bold shrink-0 ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isIncome ? '+' : '−'}{PESO(tx.amount)}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right column: wallets + budget health */}
            <div className="flex flex-col gap-6">
              {/* Wallets */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-white">Wallets</h2>
                  <button
                    onClick={() => setShowAddWallet(true)}
                    className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    <Plus className="size-3.5" />
                    Add Wallet
                  </button>
                </div>
                {activeAccounts.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-4">No wallets yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {activeAccounts.map((acct) => {
                      const Icon = ACCOUNT_ICON[acct.type] ?? Wallet
                      const color = ACCOUNT_COLOR[acct.type] ?? 'text-slate-400'
                      return (
                        <div key={acct.id} className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl">
                          <div className="size-9 rounded-xl bg-slate-700 flex items-center justify-center shrink-0">
                            <Icon className={`size-4 ${color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{acct.name}</p>
                            <p className="text-xs text-slate-500 capitalize">{acct.type.replace('_', ' ')}</p>
                          </div>
                          <p className={`text-sm font-bold shrink-0 ${acct.currentBalance >= 0 ? 'text-white' : 'text-rose-400'}`}>
                            {PESO(acct.currentBalance)}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Budget health */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-white">Budget Health</h2>
                  <button
                    onClick={() => setShowAddBudget(true)}
                    className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    <Plus className="size-3.5" />
                    Create
                  </button>
                </div>
                {budgetsWithSpent.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-4">No budgets yet.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {budgetsWithSpent.map((b) => (
                      <div key={b.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-300">{b.categoryName}</span>
                          <span className="text-xs text-slate-500">{PESO(b.spent)} / {PESO(b.amount)}</span>
                        </div>
                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${b.pct >= 90 ? 'bg-rose-500' : b.color}`}
                            style={{ width: `${b.pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-0.5">
                          <span className="text-xs text-slate-600">{b.pct.toFixed(0)}% used</span>
                          <span className={`text-xs ${b.pct >= 90 ? 'text-rose-400' : 'text-slate-500'}`}>
                            {b.pct >= 100 ? 'Over budget' : `${PESO(b.amount - b.spent)} left`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      <AddEntryModal
        open={showAddEntry}
        onClose={() => setShowAddEntry(false)}
        accounts={activeAccounts}
        categories={data.categories}
        userId={user.id}
        onSaved={loadData}
      />
      <AddWalletModal
        open={showAddWallet}
        onClose={() => setShowAddWallet(false)}
        userId={user.id}
        onSaved={loadData}
      />
      <AddBudgetModal
        open={showAddBudget}
        onClose={() => setShowAddBudget(false)}
        userId={user.id}
        categories={data.categories}
        onSaved={loadData}
      />
    </div>
  )
}
