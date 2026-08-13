import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  MessageSquare,
  FileText,
  LayoutDashboard,
  Search,
  Sparkles,
  X,
  Zap,
  LogOut,
  ShieldCheck,
  Gauge,
  FolderCog,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/utils';
import { isDemoMode } from '@/services';
import { ROLE_LABELS, ROLE_BADGE_STYLES } from '@/utils/roles';

const nav = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/chat', label: 'Assistant', icon: MessageSquare },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

const adminNav = [
  { to: '/admin/monitoring', label: 'Monitoring', icon: Gauge },
  { to: '/admin/documents', label: 'Documents', icon: FolderCog },
];

export function Sidebar() {
  const { sidebarOpen, setSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const demo = isDemoMode();

  // Admins manage documents from the Admin section; hide the Workspace
  // "Documents" entry so there is no duplicate.
  const visibleNav = user?.role === 'admin' ? nav.filter((n) => n.to !== '/documents') : nav;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-surface-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebar(false)}
        />
      )}

      <aside
        className={cn(
          'fixed lg:sticky top-0 z-40 h-screen w-[260px] shrink-0 flex flex-col border-r border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-surface-200 dark:border-surface-800">
          <button
            onClick={() => navigate('/') }
            className="flex items-center gap-2.5 group"
          >
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-surface-900 dark:text-surface-50 leading-none">Atlas</p>
              <p className="text-[11px] text-surface-500 dark:text-surface-400 mt-0.5">AI Knowledge Assistant</p>
            </div>
          </button>
          <button
            onClick={() => setSidebar(false)}
            className="lg:hidden p-1.5 rounded-lg text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
            Workspace
          </p>
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebar(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                    : 'text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn('w-[18px] h-[18px]', isActive && 'text-brand-600 dark:text-brand-400')} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}

          {user?.role === 'admin' && (
            <>
              <p className="px-3 mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                Admin
              </p>
              {adminNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebar(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                        : 'text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={cn('w-[18px] h-[18px]', isActive && 'text-brand-600 dark:text-brand-400')} />
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User + logout */}
        {user && (
          <div className="px-3 pb-3">
            <div className="rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-semibold text-white">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-surface-900 dark:text-surface-50">
                    {user.displayName}
                  </p>
                  <span
                    className={cn(
                      'mt-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                      ROLE_BADGE_STYLES[user.role] ?? ROLE_BADGE_STYLES.viewer,
                    )}
                  >
                    <ShieldCheck className="h-3 w-3" />
                    {ROLE_LABELS[user.role]}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 text-xs font-medium text-surface-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:text-surface-300 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </div>
        )}

        {/* Demo badge */}
        <div className="px-3 pb-4">
          {demo ? (
            <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Demo Mode</p>
              </div>
              <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 leading-relaxed">
                Running on a mock backend. Flip a single flag to connect a real API.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-soft" />
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Live Backend</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
