import type { Dispatch, FormEvent, SetStateAction } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
} from 'lucide-react'

import { BrandMark } from '@/components/brand/BrandMark'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface AuthScreenProps {
  authMode: 'login' | 'register'
  setAuthMode: Dispatch<SetStateAction<'login' | 'register'>>
  email: string
  setEmail: Dispatch<SetStateAction<string>>
  password: string
  setPassword: Dispatch<SetStateAction<string>>
  name: string
  setName: Dispatch<SetStateAction<string>>
  authStatus: string
  isAuthBusy: boolean
  pocketBaseUrl: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function AuthScreen({
  authMode,
  setAuthMode,
  email,
  setEmail,
  password,
  setPassword,
  name,
  setName,
  authStatus,
  isAuthBusy,
  pocketBaseUrl,
  onSubmit,
}: AuthScreenProps) {
  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_12%_18%,rgba(15,118,110,0.14),transparent_28%),linear-gradient(135deg,#faf7ef_0%,#f8fbf8_48%,#eef7f5_100%)] px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100svh-2.5rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="order-2 grid gap-6 lg:order-1">
          <BrandMark />
          <div className="max-w-2xl space-y-5">
            <Badge
              variant="outline"
              className="border-primary/20 bg-background/70 text-primary"
            >
              <Sparkles aria-hidden="true" />
              Editorial finance workspace
            </Badge>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold leading-tight tracking-normal text-balance sm:text-5xl">
                Your money map, written like a ledger.
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground">
                Track cash, bank accounts, transfers, and everyday spending in
                a private workspace built around quick manual entry.
              </p>
            </div>
          </div>

          <MoneyPreview />
        </section>

        <Card className="order-1 border-primary/10 bg-background/90 shadow-xl shadow-primary/5 backdrop-blur lg:order-2">
          <CardHeader className="gap-4">
            <div className="flex items-center justify-between gap-3">
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary hover:bg-primary/10"
              >
                <ShieldCheck aria-hidden="true" />
                Private workspace
              </Badge>
              <Badge variant="outline">PHP</Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl">
                {authMode === 'login' ? 'Welcome back' : 'Create your ledger'}
              </CardTitle>
              <CardDescription>
                {authMode === 'login'
                  ? 'Sign in to continue tracking your balances and activity.'
                  : 'Start with a secure account, then add your first balance source.'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5" onSubmit={onSubmit}>
              <Tabs
                value={authMode}
                onValueChange={(value) =>
                  setAuthMode(value as 'login' | 'register')
                }
              >
                <TabsList className="grid h-10 w-full grid-cols-2 rounded-md bg-secondary/80">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>
              </Tabs>

              {authMode === 'register' && (
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ashley Santos"
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  required
                  autoComplete="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="password">Password</Label>
                  {authMode === 'register' && (
                    <span className="text-xs text-muted-foreground">
                      Minimum 8 characters
                    </span>
                  )}
                </div>
                <Input
                  id="password"
                  required
                  autoComplete={
                    authMode === 'login' ? 'current-password' : 'new-password'
                  }
                  minLength={8}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={
                    authMode === 'login'
                      ? 'Enter your password'
                      : 'At least 8 characters'
                  }
                />
              </div>
              <Button className="h-11" disabled={isAuthBusy}>
                {isAuthBusy && <Loader2 className="animate-spin" />}
                {authMode === 'login' ? 'Open dashboard' : 'Create account'}
              </Button>
              {authStatus && (
                <Alert variant="destructive" role="alert">
                  <AlertCircle aria-hidden="true" />
                  <AlertTitle>Authentication failed</AlertTitle>
                  <AlertDescription>{authStatus}</AlertDescription>
                </Alert>
              )}
            </form>

            <Separator className="my-5" />
            <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <TrustItem icon={LockKeyhole} label="Manual tracking" />
              <TrustItem icon={WalletCards} label="Account owned" />
              <TrustItem icon={CheckCircle2} label="Asia/Manila" />
            </div>
            <p className="mt-5 truncate text-xs text-muted-foreground">
              System endpoint: {pocketBaseUrl}
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function MoneyPreview() {
  return (
    <div
      className="grid max-w-2xl gap-4 rounded-xl border border-primary/10 bg-background/75 p-4 shadow-xl shadow-primary/5 backdrop-blur"
      aria-label="Kashley dashboard preview"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Available balance
          </p>
          <p className="text-3xl font-semibold tracking-normal">₱84,250.00</p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
          <TrendingUp aria-hidden="true" />
          +12.4% this month
        </Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <PreviewStat label="Income" value="+₱36,000" tone="income" />
        <PreviewStat label="Spend" value="-₱18,420" tone="expense" />
        <PreviewStat label="Transfer" value="₱9,000" tone="transfer" />
      </div>
      <div className="grid gap-2">
        {[
          ['Groceries', 'Food', '-₱1,240.00'],
          ['Payroll', 'Income', '+₱28,000.00'],
          ['Savings sweep', 'Transfer', '₱4,500.00'],
        ].map(([merchant, label, amount]) => (
          <div
            key={merchant}
            className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border bg-card px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium">{merchant}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            <p className="text-sm font-semibold">{amount}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function PreviewStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'income' | 'expense' | 'transfer'
}) {
  const toneClass = {
    income: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    expense: 'border-rose-200 bg-rose-50 text-rose-900',
    transfer: 'border-sky-200 bg-sky-50 text-sky-900',
  }[tone]

  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass}`}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}

function TrustItem({
  icon: Icon,
  label,
}: {
  icon: typeof LockKeyhole
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-primary" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
