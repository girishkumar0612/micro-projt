import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Moon, Sun, Search } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/utils';

const titles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Welcome to Atlas', subtitle: 'Your company knowledge, made actionable.' },
  '/chat': { title: 'AI Assistant', subtitle: 'Ask anything. Take action.' },
  '/search': { title: 'Search', subtitle: 'Find policies, SOPs, and manuals.' },
  '/documents': { title: 'Documents', subtitle: 'Browse the knowledge base.' },
  '/dashboard': { title: 'Dashboard', subtitle: 'Your activity at a glance.' },
  '/admin/monitoring': { title: 'Monitoring', subtitle: 'Usage, security, and activity overview.' },
  '/admin/documents': { title: 'Document Management', subtitle: 'Manage policies and access.' },
};

export function Topbar() {
  const { theme, toggleTheme, toggleSidebar } = useUIStore();
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const meta = titles[location.pathname] ?? { title: 'Atlas', subtitle: '' };
  const initials = user ? user.username.slice(0, 2).toUpperCase() : '??';

  return (
    <header className="sticky top-0 z-20 h-16 flex items-center gap-3 px-4 sm:px-6 glass border-b border-surface-200 dark:border-surface-800">
      <button
        onClick={toggleSidebar}
        className="lg:hidden p-2 rounded-lg text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-surface-900 dark:text-surface-50 leading-none">
          {meta.title}
        </h1>
        <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 hidden sm:block">{meta.subtitle}</p>
      </div>

      {/* Quick search */}
      <button
        onClick={() => navigate('/search')}
        className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-sm text-surface-400 hover:border-surface-300 dark:hover:border-surface-600 transition-colors w-48 lg:w-64"
      >
        <Search className="w-4 h-4" />
        <span>Search…</span>
        <kbd className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded border border-surface-200 dark:border-surface-700 text-surface-400">⌘K</kbd>
      </button>

      <button
        onClick={toggleTheme}
        className={cn(
          'p-2.5 rounded-xl transition-colors',
          theme === 'dark'
            ? 'text-amber-400 hover:bg-surface-800'
            : 'text-surface-600 hover:bg-surface-100',
        )}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-semibold shrink-0"
        title={user?.displayName}
      >
        {initials}
      </div>
    </header>
  );
}
