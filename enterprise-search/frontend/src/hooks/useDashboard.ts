import { useEffect, useState } from 'react';
import type { DashboardResponse } from '@/types';
import { apiService } from '@/services';

export function useDashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiService
      .getDashboard()
      .then((res) => active && setData(res))
      .catch((e) => active && setError((e as { message?: string })?.message ?? 'Failed to load dashboard.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { data, loading, error };
}
