import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  FileText,
  Zap,
  Clock,
  TrendingUp,
  Search,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { useDashboard } from '@/hooks';
import { Card, Badge, Spinner } from '@/components/ui';
import { timeAgo, cn } from '@/utils';
import type { ActivityItem } from '@/types';

const activityIcons = {
  search: Search,
  chat: MessageSquare,
  document_view: FileText,
  action: Zap,
};

const activityColors = {
  search: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
  chat: 'text-brand-500 bg-brand-50 dark:bg-brand-500/10',
  document_view: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10',
  action: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
};

export function DashboardPage() {
  const { data, loading, error } = useDashboard();
  const navigate = useNavigate();

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

  const { stats, activity, popularDocuments, recentSearches } = data;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Documents" value={stats.totalDocuments} accent="brand" />
        <StatCard icon={MessageSquare} label="Conversations" value={stats.totalChats} accent="blue" />
        <StatCard icon={Zap} label="Actions Taken" value={stats.actionsTaken} accent="amber" />
        <StatCard icon={Clock} label="Avg Response" value={`${stats.avgResponseMs}ms`} accent="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity feed */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-surface-400" />
            <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Recent Activity</h2>
          </div>
          <div className="space-y-1">
            {activity.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </div>
        </Card>

        {/* Recent searches */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-4 h-4 text-surface-400" />
            <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Recent Searches</h2>
          </div>
          <div className="space-y-1">
            {recentSearches.map((q, i) => (
              <button
                key={i}
                onClick={() => navigate(`/search?q=${encodeURIComponent(q)}`)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors group"
              >
                <Clock className="w-3.5 h-3.5 text-surface-400 shrink-0" />
                <span className="flex-1 text-left truncate">{q}</span>
                <ArrowRight className="w-3.5 h-3.5 text-surface-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Popular documents */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-surface-400" />
          <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Popular Documents</h2>
        </div>
        <div className="space-y-2">
          {popularDocuments.map((d, i) => (
            <button
              key={d.documentId}
              onClick={() => navigate(`/documents?id=${d.documentId}`)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors group"
            >
              <span className="text-sm font-mono text-surface-400 w-5 text-center">{i + 1}</span>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-surface-900 dark:text-surface-50 truncate">{d.title}</p>
              </div>
              <Badge category={d.category} />
              <span className="text-xs text-surface-400">{d.views} views</span>
              <ArrowRight className="w-4 h-4 text-surface-300 group-hover:text-brand-500 transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

const accentMap = {
  brand: 'text-brand-600 bg-brand-50 dark:bg-brand-500/10',
  blue: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10',
  amber: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10',
  violet: 'text-violet-600 bg-violet-50 dark:bg-violet-500/10',
};

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof FileText;
  label: string;
  value: string | number;
  accent: keyof typeof accentMap;
}) {
  return (
    <Card className="p-5">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', accentMap[accent])}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-surface-900 dark:text-surface-50 tabular-nums">{value}</p>
      <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{label}</p>
    </Card>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = activityIcons[item.type];
  return (
    <div className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', activityColors[item.type])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-surface-700 dark:text-surface-200">
          {item.label}{' '}
          {item.detail && <span className="font-medium text-surface-900 dark:text-surface-50">{item.detail}</span>}
        </p>
      </div>
      <span className="text-xs text-surface-400 shrink-0">{timeAgo(item.timestamp)}</span>
    </div>
  );
}
