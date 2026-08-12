import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'info' | 'loading';
  duration?: number;
}

interface UIState {
  theme: Theme;
  sidebarOpen: boolean;
  toasts: Toast[];
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  toggleSidebar: () => void;
  setSidebar: (open: boolean) => void;
  pushToast: (t: Omit<Toast, 'id'>) => string;
  dismissToast: (id: string) => void;
  updateToast: (id: string, patch: Partial<Toast>) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      sidebarOpen: true,
      toasts: [],

      toggleTheme: () =>
        set((s) => {
          const next: Theme = s.theme === 'dark' ? 'light' : 'dark';
          applyTheme(next);
          return { theme: next };
        }),
      setTheme: (t) => {
        applyTheme(t);
        set({ theme: t });
      },
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebar: (open) => set({ sidebarOpen: open }),

      pushToast: (t) => {
        const id = Math.random().toString(36).slice(2, 9);
        set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
        if (t.variant !== 'loading' && t.duration !== 0) {
          setTimeout(() => get().dismissToast(id), t.duration ?? 4000);
        }
        return id;
      },
      dismissToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      updateToast: (id, patch) =>
        set((s) => ({
          toasts: s.toasts.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
    }),
    {
      name: 'atlas-ui',
      partialize: (s) => ({ theme: s.theme, sidebarOpen: s.sidebarOpen }),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}
