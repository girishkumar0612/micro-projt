import type { AssistantAction } from '@/types';
import { resolveIcon } from './resolveIcon';
import { useActionRunner } from './useActionRunner';
import { cn } from '@/utils';

const variantClasses: Record<string, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20',
  secondary:
    'bg-surface-100 text-surface-700 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-200 dark:hover:bg-surface-700',
  ghost:
    'text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-500/10',
};

interface Props {
  actions: AssistantAction[];
  onOpenDocument: (id: string) => void;
  onOpenModal?: (name: string, payload?: unknown) => void;
  compact?: boolean;
}

export function ActionButtons({ actions, onOpenDocument, onOpenModal, compact }: Props) {
  const { run } = useActionRunner(onOpenDocument, onOpenModal);

  if (!actions?.length) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', compact ? 'mt-2' : 'mt-3')}>
      {actions.map((a) => {
        const Icon = resolveIcon(a.icon);
        const variant = a.variant ?? 'secondary';
        return (
          <button
            key={a.id}
            onClick={() => run(a)}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
              compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
              variantClasses[variant] ?? variantClasses.secondary,
            )}
          >
            <Icon className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            {a.label}
          </button>
        );
      })}
    </div>
  );
}
