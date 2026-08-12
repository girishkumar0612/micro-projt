import { ShieldAlert, ShieldX, Bot, SearchX, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/utils';
import type { SecurityEvent, SecurityEventType } from '@/types';

const eventMeta: Record<SecurityEventType, { icon: LucideIcon; tone: string }> = {
  rbac_denied: { icon: ShieldX, tone: 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400' },
  unauthorized: { icon: ShieldAlert, tone: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400' },
  prompt_injection: { icon: Bot, tone: 'text-violet-600 bg-violet-50 dark:bg-violet-500/10 dark:text-violet-400' },
  out_of_scope: { icon: SearchX, tone: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400' },
  guardrail_block: { icon: ShieldCheck, tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400' },
};

export function SecurityEvents({ events }: { events: SecurityEvent[] }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="w-4 h-4 text-surface-400" />
        <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Security Events</h2>
      </div>
      <ul className="space-y-3">
        {events.map((e) => {
          const meta = eventMeta[e.type];
          const Icon = meta.icon;
          return (
            <li key={e.type} className="flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', meta.tone)}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">{e.label}</p>
                <p className="text-[11px] text-surface-400">{e.delta}</p>
              </div>
              <span className="text-lg font-bold text-surface-900 dark:text-surface-50 tabular-nums">{e.count}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
