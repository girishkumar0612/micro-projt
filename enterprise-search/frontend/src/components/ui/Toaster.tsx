import { CheckCircle2, AlertCircle, Info, Loader2, X } from 'lucide-react';
import { useUIStore, type Toast } from '@/store/uiStore';
import { cn } from '@/utils';

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  loading: Loader2,
};

const styles = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-brand-500',
  loading: 'text-brand-500',
};

export function Toaster() {
  const toasts = useUIStore((s) => s.toasts);
  const dismiss = useUIStore((s) => s.dismissToast);

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 w-[360px] max-w-[calc(100vw-2rem)]">
      {toasts.map((t: Toast) => {
        const Icon = icons[t.variant];
        return (
          <div
            key={t.id}
            className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-surface-800 shadow-float border border-surface-200 dark:border-surface-700 animate-slide-in-right"
          >
            <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', styles[t.variant], t.variant === 'loading' && 'animate-spin')} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">{t.title}</p>
              {t.description && (
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{t.description}</p>
              )}
            </div>
            {t.variant !== 'loading' && (
              <button
                onClick={() => dismiss(t.id)}
                className="p-0.5 rounded text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
