import { useMemo, useState } from 'react';
import { Search, ListFilter, Users, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/utils';
import { ROLE_LABELS } from '@/utils/roles';
import type { ActivityLogEntry, EventResult } from '@/types';

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

function ResultBadge({ result }: { result: EventResult }) {
  const success = result === 'Success';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        success
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
          : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
      )}
    >
      {success ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {result}
    </span>
  );
}

export function ActivityLogTable({ entries }: { entries: ActivityLogEntry[] }) {
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  const eventOptions = useMemo(
    () => ['all', ...Array.from(new Set(entries.map((e) => e.event)))],
    [entries],
  );
  const roleOptions = useMemo(
    () => ['all', ...Array.from(new Set(entries.map((e) => e.role)))],
    [entries],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (eventFilter !== 'all' && e.event !== eventFilter) return false;
      if (roleFilter !== 'all' && e.role !== roleFilter) return false;
      if (!q) return true;
      return (
        e.user.toLowerCase().includes(q) ||
        (e.document ?? '').toLowerCase().includes(q) ||
        e.event.toLowerCase().includes(q) ||
        e.detail.toLowerCase().includes(q)
      );
    });
  }, [entries, eventFilter, roleFilter, query]);

  return (
    <Card className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-surface-400" />
          <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Activity Log</h2>
        </div>
        <div className="sm:ml-auto flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2 h-9 px-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
            <Search className="w-3.5 h-3.5 text-surface-400 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search user, document, detail…"
              className="w-40 lg:w-52 bg-transparent text-xs text-surface-900 dark:text-surface-50 placeholder:text-surface-400 outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5 h-9 px-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
            <ListFilter className="w-3.5 h-3.5 text-surface-400 shrink-0" />
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="bg-transparent text-xs text-surface-700 dark:text-surface-200 outline-none cursor-pointer"
              aria-label="Filter by event"
            >
              {eventOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'all' ? 'All events' : opt}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5 h-9 px-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
            <Users className="w-3.5 h-3.5 text-surface-400 shrink-0" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-xs text-surface-700 dark:text-surface-200 outline-none cursor-pointer"
              aria-label="Filter by role"
            >
              {roleOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'all' ? 'All roles' : (ROLE_LABELS[opt] ?? opt)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-left text-sm min-w-[820px]">
          <thead>
            <tr className="border-b border-surface-200 dark:border-surface-800 text-[11px] uppercase tracking-wider text-surface-400">
              <th className="py-2.5 pr-4 font-semibold">Timestamp</th>
              <th className="py-2.5 pr-4 font-semibold">User</th>
              <th className="py-2.5 pr-4 font-semibold">Role</th>
              <th className="py-2.5 pr-4 font-semibold">Event</th>
              <th className="py-2.5 pr-4 font-semibold">Document</th>
              <th className="py-2.5 pr-4 font-semibold">Detail</th>
              <th className="py-2.5 font-semibold">Result</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr
                key={e.id}
                className="border-b border-surface-100 dark:border-surface-800/60 hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors"
              >
                <td className="py-3 pr-4 text-xs text-surface-500 dark:text-surface-400 whitespace-nowrap tabular-nums">
                  {formatTimestamp(e.timestamp)}
                </td>
                <td className="py-3 pr-4 font-medium text-surface-800 dark:text-surface-200 whitespace-nowrap">
                  {e.user}
                </td>
                <td className="py-3 pr-4">
                  <span className="text-xs text-surface-500 dark:text-surface-400">{ROLE_LABELS[e.role] ?? e.role}</span>
                </td>
                <td className="py-3 pr-4 text-xs text-surface-700 dark:text-surface-300 whitespace-nowrap">{e.event}</td>
                <td className="py-3 pr-4">
                  {e.document ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-surface-700 dark:text-surface-300">
                      <FileText className="w-3 h-3 text-surface-400 shrink-0" />
                      <span className="max-w-[180px] truncate">{e.document}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-surface-400">—</span>
                  )}
                </td>
                <td className="py-3 pr-4 text-xs text-surface-600 dark:text-surface-400 max-w-[260px]">
                  <span className="line-clamp-2">{e.detail}</span>
                </td>
                <td className="py-3 whitespace-nowrap">
                  <ResultBadge result={e.result} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-surface-400">
                  No activity matches the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
