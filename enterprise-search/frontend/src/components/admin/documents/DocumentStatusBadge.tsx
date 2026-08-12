import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils';
import type { AdminDocumentStatus } from '@/types';

const statusStyles: Record<AdminDocumentStatus, string> = {
  ready: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  processing: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  failed: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
};

const statusLabels: Record<AdminDocumentStatus, string> = {
  ready: 'Ready',
  processing: 'Processing',
  failed: 'Failed',
};

export function DocumentStatusBadge({ status }: { status: AdminDocumentStatus }) {
  const Icon = status === 'ready' ? CheckCircle2 : status === 'processing' ? Loader2 : AlertTriangle;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        statusStyles[status],
      )}
    >
      <Icon className={cn('h-3 w-3', status === 'processing' && 'animate-spin')} />
      {statusLabels[status]}
    </span>
  );
}
