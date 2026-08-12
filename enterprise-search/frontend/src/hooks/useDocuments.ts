import { useCallback, useEffect, useState } from 'react';
import type { KnowledgeDocument } from '@/types';
import { apiService } from '@/services';

interface DocumentsState {
  documents: KnowledgeDocument[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
}

export function useDocuments(): DocumentsState {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getDocuments();
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

  return { documents, loading, error, load };
}
