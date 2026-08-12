import { FileUp, Copy, Trash2, UserCog, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/utils';
import type { DocumentActivityItem, DocumentActivityType } from '@/types';

const activityMeta: Record<DocumentActivityType, { icon: LucideIcon; tone: string }> = {
  upload: { icon: FileUp, tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400' },
  duplicate: { icon: Copy, tone: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400' },
  delete: { icon: Trash2, tone: 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400' },
  access_change: { icon: UserCog, tone: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400' },
  summary: { icon: FileText, tone: 'text-violet-600 bg-violet-50 dark:bg-violet-500/10 dark:text-violet-400' },
};

export function DocumentActivity({ items }: { items: DocumentActivityItem[] }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-4 h-4 text-surface-400" />
        <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Document Activity</h2>
      </div>
      <ul className="space-y-3">
        {items.map((a) => {
          const meta = activityMeta[a.type];
          const Icon = meta.icon;
          return (
            <li key={a.type} className="flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', meta.tone)}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">{a.label}</p>
                <p className="text-[11px] text-surface-400">Last 30 days</p>
              </div>
              <span className="text-lg font-bold text-surface-900 dark:text-surface-50 tabular-nums">{a.count}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
