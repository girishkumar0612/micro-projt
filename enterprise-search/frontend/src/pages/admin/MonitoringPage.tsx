import { useEffect, useState } from 'react';
import { MessageSquare, Activity, Users, MessagesSquare, CheckCircle2, XCircle } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { SummaryCard, type SummaryCardData } from '@/components/admin/monitoring/SummaryCard';
import { SecurityEvents } from '@/components/admin/monitoring/SecurityEvents';
import { DocumentActivity } from '@/components/admin/monitoring/DocumentActivity';
import { ActivityLogTable } from '@/components/admin/monitoring/ActivityLogTable';
import { getMonitoringSummary } from '@/services/admin/monitoringService';
import type { MonitoringResponse } from '@/types';

export function MonitoringPage() {
  const [data, setData] = useState<MonitoringResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getMonitoringSummary()
      .then((res) => active && setData(res))
      .catch((e) =>
        active && setError(String((e as { message?: string })?.message ?? 'Failed to load monitoring data.')),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={28} />
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-center py-24 text-sm text-red-500">{error ?? 'No data.'}</div>;
  }

  const { summary } = data;
  const cards: SummaryCardData[] = [
    { id: 'total', label: 'Total queries', value: summary.totalQueries, icon: MessageSquare, tone: 'brand' },
    { id: 'today', label: 'Queries today', value: summary.queriesToday, icon: Activity, tone: 'blue' },
    { id: 'users', label: 'Active users', value: summary.activeUsers, icon: Users, tone: 'violet' },
    { id: 'convos', label: 'Conversations', value: summary.conversations, icon: MessagesSquare, tone: 'amber' },
    { id: 'ok', label: 'Successful', value: summary.successful, icon: CheckCircle2, tone: 'emerald' },
    { id: 'failed', label: 'Failed', value: summary.failed, icon: XCircle, tone: 'red' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card) => (
          <SummaryCard key={card.id} data={card} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SecurityEvents events={data.securityEvents} />
        <DocumentActivity items={data.documentActivity} />
      </div>

      <ActivityLogTable entries={data.log} />
    </div>
  );
}
