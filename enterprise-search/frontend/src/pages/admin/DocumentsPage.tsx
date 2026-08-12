import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { UploadDropzone } from '@/components/admin/documents/UploadDropzone';
import { DocumentTable } from '@/components/admin/documents/DocumentTable';
import { getAdminDocuments } from '@/services/admin/documentService';
import type { AdminDocument, UploadResult } from '@/types';
import { cn } from '@/utils';

export function DocumentsPage() {
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<UploadResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminDocuments();
      setDocuments(res.documents);
    } catch (e) {
      setError(String((e as { message?: string })?.message ?? 'Failed to load documents.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUploaded = (result: UploadResult) => {
    setNotice(result);
    setDocuments((prev) => [
      {
        id: result.id,
        name: result.name,
        size_kb: 0,
        chunks: 0,
        department: '—',
        access: 'Internal',
        roles: [],
        uploaded_at: new Date().toISOString(),
        status: 'processing',
      },
      ...prev,
    ]);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {notice && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
          )}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {notice.message}
          <button onClick={() => setNotice(null)} className="ml-auto text-emerald-500 hover:text-emerald-700 text-xs">
            Dismiss
          </button>
        </div>
      )}

      <UploadDropzone onUploaded={handleUploaded} />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size={28} />
        </div>
      ) : error ? (
        <div className="text-center py-16 text-sm text-red-500">{error}</div>
      ) : (
        <DocumentTable documents={documents} />
      )}
    </div>
  );
}
