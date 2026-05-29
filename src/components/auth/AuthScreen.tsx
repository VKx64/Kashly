import { type Dispatch, type FormEvent, type SetStateAction, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'

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
  const [showPassword, setShowPassword] = useState(false)

  return (
    <main className="flex min-h-svh items-center justify-center bg-zinc-950 px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-[min(92vw,400px)]"
      >
        {/* Wordmark */}
        <div className="mb-6 text-center">
          <p className="text-2xl font-semibold tracking-tight text-white">
            kashley<span className="ml-0.5 text-zinc-500">.</span>
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {authMode === 'login'
              ? 'Sign in to your finances'
              : 'Create your account'}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/40">
          {/* Mode toggle */}
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-black/20 p-1">
            {(['login', 'register'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setAuthMode(mode)}
                className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                  authMode === mode
                    ? 'bg-white text-zinc-950'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {mode === 'login' ? 'Login' : 'Register'}
              </button>
            ))}
          </div>

          <form className="grid gap-3" onSubmit={onSubmit}>
            {authMode === 'register' && (
              <div className="grid gap-1.5">
                <label htmlFor="name" className="text-xs font-medium text-zinc-400">
                  Name
                </label>
                <input
                  id="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ashley Santos"
                  className="h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25 transition-colors"
                />
              </div>
            )}

            <div className="grid gap-1.5">
              <label htmlFor="email" className="text-xs font-medium text-zinc-400">
                Email
              </label>
              <input
                id="email"
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25 transition-colors"
              />
            </div>

            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-medium text-zinc-400">
                  Password
                </label>
                {authMode === 'register' && (
                  <span className="text-xs text-zinc-600">Min. 8 characters</span>
                )}
              </div>
              <div className="relative">
                <input
                  id="password"
                  required
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={authMode === 'login' ? 'Enter your password' : 'At least 8 characters'}
                  className="h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 pr-10 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {authStatus && (
              <p className="text-xs text-rose-400" role="alert">
                {authStatus}
              </p>
            )}

            <button
              type="submit"
              disabled={isAuthBusy}
              className="mt-1 h-11 w-full rounded-lg bg-white text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200 disabled:opacity-40"
            >
              {isAuthBusy
                ? 'Please wait…'
                : authMode === 'login'
                  ? 'Sign in'
                  : 'Create account'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-4 truncate text-center text-[11px] text-zinc-700">
          {pocketBaseUrl}
        </p>
      </motion.div>
    </main>
  )
}
