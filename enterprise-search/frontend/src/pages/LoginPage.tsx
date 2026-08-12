import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Sparkles, Lock, User, Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { isDemoMode } from '@/services';

const DEMO_ACCOUNTS = [
  { username: 'admin', label: 'Admin' },
  { username: 'hr', label: 'HR' },
  { username: 'manager', label: 'Manager' },
  { username: 'it', label: 'IT' },
  { username: 'finance', label: 'Finance' },
];

export function LoginPage() {
  const { token, login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to={from} replace />;

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (u: string) => {
    setUsername(u);
    setPassword(`${u}123`);
    setError(null);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-50 px-4 dark:bg-surface-950">
      <div className="pointer-events-none absolute -top-40 right-[-10rem] h-[28rem] w-[28rem] rounded-full bg-brand-400/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-10rem] left-[-8rem] h-96 w-96 rounded-full bg-accent-400/10 blur-3xl" />

      <div className="relative w-full max-w-md animate-scale-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-950 dark:text-surface-50">
            Welcome to <span className="gradient-text">Atlas</span>
          </h1>
          <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
            Sign in to search your company knowledge. Answers are scoped to your role.
          </p>
        </div>

        <Card className="p-6 shadow-float sm:p-8">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-surface-600 dark:text-surface-300">Username</label>
              <div className="flex items-center gap-2 h-11 rounded-xl border border-surface-200 dark:border-surface-700 bg-white px-3 dark:bg-surface-800 focus-within:border-brand-400 dark:focus-within:border-brand-500/50 transition-colors">
                <User className="h-4 w-4 shrink-0 text-surface-400" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin, hr, manager, it"
                  autoFocus
                  autoComplete="username"
                  className="flex-1 bg-transparent text-sm text-surface-900 outline-none placeholder:text-surface-400 dark:text-surface-50"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-surface-600 dark:text-surface-300">Password</label>
              <div className="flex items-center gap-2 h-11 rounded-xl border border-surface-200 dark:border-surface-700 bg-white px-3 dark:bg-surface-800 focus-within:border-brand-400 dark:focus-within:border-brand-500/50 transition-colors">
                <Lock className="h-4 w-4 shrink-0 text-surface-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="flex-1 bg-transparent text-sm text-surface-900 outline-none placeholder:text-surface-400 dark:text-surface-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
                  aria-label="Toggle password visibility"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} icon={<LogIn className="h-4 w-4" />} className="w-full">
              Sign in
            </Button>
          </form>

          <div className="mt-6 border-t border-surface-100 pt-5 dark:border-surface-800">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-surface-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Quick demo accounts {isDemoMode() && '(mock mode)'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.username}
                  onClick={() => fillDemo(a.username)}
                  className="rounded-lg border border-surface-200 px-2.5 py-1.5 text-xs font-medium text-surface-600 transition-colors hover:border-brand-300 hover:text-brand-700 dark:border-surface-700 dark:text-surface-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
                >
                  {a.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-surface-400">
              Passwords use the pattern <code className="rounded bg-surface-100 px-1 font-mono dark:bg-surface-800">username + 123</code> (e.g. <code className="rounded bg-surface-100 px-1 font-mono dark:bg-surface-800">hr123</code>).
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
