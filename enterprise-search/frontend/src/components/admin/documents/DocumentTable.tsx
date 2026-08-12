import { useMemo, useState } from 'react';
import { FileText, HardDrive, Layers, CalendarDays, Lock, Globe } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { cn } from '@/utils';
import { ROLE_LABELS, ROLE_BADGE_STYLES } from '@/utils/roles';
import type { AdminDocument, DocumentAccess } from '@/types';
import { DocumentStatusBadge } from './DocumentStatusBadge';

const PAGE_SIZE = 6;

function formatSize(kb: number): string {
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${Math.round(kb)} KB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function AccessBadge({ access }: { access: DocumentAccess }) {
  const confidential = access === 'Confidential';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        confidential
          ? 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300'
          : 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
      )}
    >
      {confidential ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
      {access}
    </span>
  );
}

export function DocumentTable({ documents }: { documents: AdminDocument[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(documents.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (current - 1) * PAGE_SIZE;
    return documents.slice(start, start + PAGE_SIZE);
  }, [documents, current]);

  const pageNumbers = useMemo(() => {
    const out: (number | '…')[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - current) <= 1) out.push(i);
      else if (out[out.length - 1] !== '…') out.push('…');
    }
    return out;
  }, [totalPages, current]);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-surface-400" />
          <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Document Library</h2>
        </div>
        <span className="text-xs text-surface-400">
          {documents.length} document{documents.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-left text-sm min-w-[760px]">
          <thead>
            <tr className="border-b border-surface-200 dark:border-surface-800 text-[11px] uppercase tracking-wider text-surface-400">
              <th className="py-2.5 pr-4 font-semibold">Document name</th>
              <th className="py-2.5 pr-4 font-semibold">Size</th>
              <th className="py-2.5 pr-4 font-semibold">Chunks</th>
              <th className="py-2.5 pr-4 font-semibold">Department</th>
              <th className="py-2.5 pr-4 font-semibold">Access</th>
              <th className="py-2.5 pr-4 font-semibold">Roles</th>
              <th className="py-2.5 font-semibold">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((d) => (
              <tr
                key={d.id}
                className="border-b border-surface-100 dark:border-surface-800/60 hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors"
              >
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-surface-800 dark:text-surface-200 truncate max-w-[220px]">{d.name}</p>
                      <div className="mt-0.5"><DocumentStatusBadge status={d.status} /></div>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <span className="inline-flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-300 whitespace-nowrap">
                    <HardDrive className="w-3 h-3 text-surface-400" />
                    {formatSize(d.size_kb)}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <span className="inline-flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-300">
                    <Layers className="w-3 h-3 text-surface-400" />
                    {d.chunks}
                  </span>
                </td>
                <td className="py-3 pr-4"><Badge category={d.department} /></td>
                <td className="py-3 pr-4"><AccessBadge access={d.access} /></td>
                <td className="py-3 pr-4">
                  {d.roles.length === 0 ? (
                    <span className="text-xs text-surface-400">All roles</span>
                  ) : (
                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                      {d.roles.map((r) => (
                        <span
                          key={r}
                          className={cn(
                            'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                            ROLE_BADGE_STYLES[r] ?? ROLE_BADGE_STYLES.viewer,
                          )}
                        >
                          {ROLE_LABELS[r] ?? r}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs text-surface-500 dark:text-surface-400 whitespace-nowrap">
                    <CalendarDays className="w-3 h-3 text-surface-400" />
                    {formatDate(d.uploaded_at)}
                  </span>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-surface-400">
                  No documents in the library yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-1.5 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={current === 1}
            className="h-8 px-3 rounded-lg text-xs font-medium text-surface-600 dark:text-surface-300 border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          {pageNumbers.map((n, i) =>
            n === '…' ? (
              <span key={`ellipsis-${i}`} className="px-1 text-xs text-surface-400">
                …
              </span>
            ) : (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={cn(
                  'h-8 w-8 rounded-lg text-xs font-medium transition-colors',
                  n === current
                    ? 'bg-brand-600 text-white'
                    : 'text-surface-600 dark:text-surface-300 border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800',
                )}
              >
                {n}
              </button>
            ),
          )}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={current === totalPages}
            className="h-8 px-3 rounded-lg text-xs font-medium text-surface-600 dark:text-surface-300 border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </Card>
  );
}
