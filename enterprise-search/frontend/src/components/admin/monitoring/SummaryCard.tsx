import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/utils';

export interface SummaryCardData {
  id: string;
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone: 'brand' | 'blue' | 'emerald' | 'amber' | 'red' | 'violet';
}

const toneMap: Record<SummaryCardData['tone'], string> = {
  brand: 'text-brand-600 bg-brand-50 dark:bg-brand-500/10 dark:text-brand-400',
  blue: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400',
  emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400',
  amber: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400',
  red: 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400',
  violet: 'text-violet-600 bg-violet-50 dark:bg-violet-500/10 dark:text-violet-400',
};

export function SummaryCard({ data }: { data: SummaryCardData }) {
  const Icon = data.icon;
  return (
    <Card className="p-5">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', toneMap[data.tone])}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-surface-900 dark:text-surface-50 tabular-nums">{data.value}</p>
      <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{data.label}</p>
    </Card>
  );
}
