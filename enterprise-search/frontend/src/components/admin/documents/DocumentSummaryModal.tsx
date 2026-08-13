import { useEffect, useState } from 'react';
import { FileText, FileSearch, Loader2, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui';
import { getDocumentSummary } from '@/services/admin/documentService';
import type { AdminDocument } from '@/types';
import { DocumentStatusBadge } from './DocumentStatusBadge';

interface Props {
  document: AdminDocument | null;
  onClose: () => void;
}

export function DocumentSummaryModal({ document, onClose }: Props) {
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!document) return;
    setLoading(true);
    setError(null);
    setSummary(document.summary ?? '');
    getDocumentSummary(document.id)
      .then((res) => setSummary(res.summary))
      .catch((e) =>
        setError(String((e as { message?: string })?.message ?? 'Could not load the summary.')),
      )
      .finally(() => setLoading(false));
  }, [document]);

  return (
    <Modal open={!!document} onClose={onClose} title="Document summary" size="lg">
      {document ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
              <FileText className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-surface-900 dark:text-surface-50 break-words">
                {document.name}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <DocumentStatusBadge status={document.status} />
                <span className="text-xs text-surface-400">
                  {document.chunks} chunk{document.chunks === 1 ? '' : 's'} indexed
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-surface-400">
              <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
              Generating summary…
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          ) : summary.trim() ? (
            <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 px-4 py-4">
              <div className="flex items-center gap-1.5 mb-2">
                <FileSearch className="w-3.5 h-3.5 text-brand-500" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                  Executive summary
                </p>
              </div>
              <p className="text-sm leading-relaxed text-surface-700 dark:text-surface-200 whitespace-pre-wrap">
                {summary}
              </p>
            </div>
          ) : (
            <p className="text-sm text-surface-500 dark:text-surface-400">
              No summary is available for this document yet. It may still be processing.
            </p>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
