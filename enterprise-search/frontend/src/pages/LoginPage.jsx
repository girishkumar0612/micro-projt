import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Button from '../components/common/Button'

// Demo credential hint cards shown below the form
const DEMO_USERS = [
  { name: 'Admin User',    username: 'admin', role: 'admin',    color: 'text-brand-indigo' },
  { name: 'Alice Johnson', username: 'alice', role: 'employee', color: 'text-state-success' },
  { name: 'Bob Smith',     username: 'bob',   role: 'hr',       color: 'text-brand-violet' },
  { name: 'Carol White',   username: 'carol', role: 'finance',  color: 'text-state-warning' },
  { name: 'Dave Lee',      username: 'dave',  role: 'it',       color: 'text-brand-cyan' },
]

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const from = location.state?.from?.pathname || null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Tiny artificial delay so the demo feels like a real login
    await new Promise((r) => setTimeout(r, 300))

    const result = login(username, password)
    setLoading(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    // Redirect: honour the "from" location, otherwise go to the right portal
    if (from && from !== '/login') {
      navigate(from, { replace: true })
    } else if (result.user.role === 'admin') {
      navigate('/admin/documents', { replace: true })
    } else {
      navigate('/employee/chat', { replace: true })
    }
  }

  const fillDemo = (u) => {
    setUsername(u.username)
    setPassword(`${u.username}123`)
    setError('')
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="h-12 w-12 rounded-2xl bg-brand-gradient flex items-center justify-center font-display font-bold text-xl text-white mb-3 animate-pulseGlow">
            N
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink">Welcome to Nexus</h1>
          <p className="text-sm text-ink-soft mt-1">Sign in to access your enterprise knowledge base</p>
        </motion.div>

        {/* Login card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl border border-ink/5 shadow-sm p-8"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink-soft" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. alice"
                className="rounded-xl border border-ink/10 bg-canvas px-3.5 py-2.5 text-sm text-ink
                  placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-indigo/30
                  focus:border-brand-indigo transition-all"
                required
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink-soft" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-xl border border-ink/10 bg-canvas px-3.5 py-2.5 text-sm text-ink
                    placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-indigo/30
                    focus:border-brand-indigo transition-all pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-soft transition-colors"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-xs text-state-danger bg-state-danger/5 border border-state-danger/15 rounded-xl px-3 py-2.5"
              >
                <AlertCircle size={13} className="shrink-0" />
                {error}
              </motion.div>
            )}

            <Button type="submit" disabled={loading} className="w-full mt-1">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </motion.div>

        {/* Demo credential hints */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mt-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={13} className="text-ink-faint" />
            <span className="text-xs text-ink-faint font-medium uppercase tracking-wide">Demo accounts — click to autofill</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {DEMO_USERS.map((u) => (
              <button
                key={u.username}
                type="button"
                onClick={() => fillDemo(u)}
                className="flex items-center justify-between rounded-xl border border-ink/5 bg-white px-4 py-2.5
                  text-xs hover:border-brand-indigo/30 hover:bg-brand-gradient-soft transition-all text-left"
              >
                <div>
                  <span className="font-medium text-ink">{u.name}</span>
                  <span className="text-ink-faint ml-2">· {u.username} / {u.username}123</span>
                </div>
                <span className={`font-semibold uppercase tracking-wide ${u.color}`}>{u.role}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
