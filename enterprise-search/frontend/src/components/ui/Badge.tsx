import { cn } from '@/utils';
import type { DocumentCategory } from '@/types';

const styles: Record<string, string> = {
  HR: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  IT: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  Finance: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  Legal: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  Operations: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  Security: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
};

export function Badge({
  category,
  className,
}: {
  category: DocumentCategory | string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        styles[category] ?? 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300',
        className,
      )}
    >
      {category}
    </span>
  );
}
