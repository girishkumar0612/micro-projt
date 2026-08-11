/**
 * Admin Portal — Monitoring Dashboard
 * Shows query stats, security events, document activity, and a filterable activity log.
 * Admin-only: backend enforces X-Admin-Token on all /api/admin/monitoring/* endpoints.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  BarChart2, ShieldAlert, FileStack, Users, CheckCircle2, XCircle,
  AlertTriangle, RefreshCw, Search, ChevronLeft, ChevronRight,
  MessageSquare, Lock, Trash2, Pencil, Sparkles, Copy, Activity,
  TrendingUp, Clock,
} from 'lucide-react'
import { motion } from 'framer-motion'
import AppShell from '../../components/layout/AppShell'
import axiosClient from '../../api/axiosClient'

// ── Event type metadata ───────────────────────────────────────────────────────
const EVENT_TYPES = [
  { value: '',                  label: 'All events' },
  { value: 'QUERY_SUCCESS',     label: 'Query — success' },
  { value: 'QUERY_FAILED',      label: 'Query — failed' },
  { value: 'RBAC_DENIED',       label: 'RBAC denied' },
  { value: 'DOC_UPLOADED',      label: 'Upload' },
  { value: 'DOC_DUPLICATE',     label: 'Duplicate upload' },
  { value: 'DOC_DELETED',       label: 'Delete' },
  { value: 'DOC_ACCESS_CHANGED','label': 'Access changed' },
  { value: 'SUMMARY_GENERATED', label: 'Summary generated' },
  { value: 'UNAUTH_ACCESS',     label: 'Unauthorized access' },
  { value: 'PROMPT_INJECTION',  label: 'Prompt injection' },
  { value: 'OUT_OF_SCOPE',      label: 'Out of scope' },
  { value: 'GUARDRAIL_BLOCKED', label: 'Guardrail blocked' },
]

const RESULTS = [
  { value: '',        label: 'All results' },
  { value: 'success', label: 'Success' },
  { value: 'denied',  label: 'Denied' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'failed',  label: 'Failed' },
  { value: 'info',    label: 'Info' },
]

const RESULT_STYLES = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  denied:  'bg-amber-50   text-amber-700   border-amber-200',
  blocked: 'bg-red-50     text-red-700     border-red-200',
  failed:  'bg-red-50     text-red-700     border-red-200',
  info:    'bg-sky-50     text-sky-700     border-sky-200',
}

const EVENT_ICONS = {
  QUERY_SUCCESS:     { Icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50' },
  QUERY_FAILED:      { Icon: XCircle,      cls: 'text-red-500    bg-red-50'      },
  QUERY_NO_DOCS:     { Icon: AlertTriangle,cls: 'text-amber-500  bg-amber-50'    },
  RBAC_DENIED:       { Icon: Lock,         cls: 'text-amber-600  bg-amber-50'    },
  UNAUTH_ACCESS:     { Icon: ShieldAlert,  cls: 'text-red-600    bg-red-50'      },
  PROMPT_INJECTION:  { Icon: ShieldAlert,  cls: 'text-red-600    bg-red-50'      },
  OUT_OF_SCOPE:      { Icon: AlertTriangle,cls: 'text-orange-500 bg-orange-50'   },
  GUARDRAIL_BLOCKED: { Icon: ShieldAlert,  cls: 'text-red-600    bg-red-50'      },
  DOC_UPLOADED:      { Icon: FileStack,    cls: 'text-indigo-600 bg-indigo-50'   },
  DOC_DUPLICATE:     { Icon: Copy,         cls: 'text-amber-600  bg-amber-50'    },
  DOC_DELETED:       { Icon: Trash2,       cls: 'text-red-500    bg-red-50'      },
  DOC_ACCESS_CHANGED:{ Icon: Pencil,       cls: 'text-sky-600    bg-sky-50'      },
  SUMMARY_GENERATED: { Icon: Sparkles,     cls: 'text-violet-600 bg-violet-50'   },
}

// ── Small shared components ───────────────────────────────────────────────────
function StatCard({ icon: Icon, iconCls, label, value, sub }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl bg-white border border-ink/[0.06] px-5 py-4 shadow-sm">
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${iconCls}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-semibold font-display text-ink leading-tight">{value ?? '—'}</p>
        <p className="text-xs text-ink-soft mt-0.5 truncate">{label}</p>
        {sub != null && <p className="text-[10px] text-ink-faint mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-6 w-6 rounded-lg bg-brand-gradient flex items-center justify-center">
        <Icon size={12} className="text-white" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {description && <p className="text-xs text-ink-faint">{description}</p>}
      </div>
    </div>
  )
}

function ResultBadge({ result }) {
  const cls = RESULT_STYLES[result] ?? 'bg-ink/5 text-ink-soft border-ink/10'
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${cls}`}>
      {result}
    </span>
  )
}

function EventTypeBadge({ type }) {
  const cfg = EVENT_ICONS[type] ?? { Icon: Activity, cls: 'text-ink-soft bg-ink/5' }
  const { Icon } = cfg
  const label = (EVENT_TYPES.find(e => e.value === type)?.label ?? type).replace(/^(Query — |DOC_)/, '')
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10px] font-semibold ${cfg.cls}`}>
      <Icon size={10} strokeWidth={2.5} />{label}
    </span>
  )
}

function formatTs(ts) {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch { return ts }
}

// ── Mini metric row ───────────────────────────────────────────────────────────
function MetricRow({ label, value, barColor, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-ink-soft w-40 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-ink/[0.06] overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs font-semibold text-ink w-8 text-right shrink-0">{value}</span>
    </div>
  )
}

// ── Activity log table ────────────────────────────────────────────────────────
function ActivityTable({ events, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2.5 py-16 text-ink-faint bg-white rounded-2xl border border-ink/[0.07]">
        <RefreshCw size={15} className="animate-spin text-brand-indigo" />
        <span className="text-sm">Loading events…</span>
      </div>
    )
  }
  if (!events.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 bg-white rounded-2xl border-2 border-dashed border-ink/[0.08] text-center">
        <Activity size={22} className="text-ink-faint" />
        <p className="text-sm font-semibold text-ink">No events found</p>
        <p className="text-xs text-ink-faint">Try adjusting your filters.</p>
      </div>
    )
  }
  return (
    <div className="rounded-2xl border border-ink/[0.07] bg-white overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-canvas/70 border-b border-ink/[0.06]">
              {['Timestamp','User','Role','Event','Document','Detail','Result'].map((h, i) => (
                <th key={h} className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-faint
                  ${i === 0 ? 'whitespace-nowrap' : ''}
                  ${i >= 4 ? 'hidden xl:table-cell' : ''}
                  ${i === 6 ? 'text-center' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((ev, idx) => (
              <tr key={ev.id}
                className={`border-b border-ink/[0.05] last:border-0 transition-colors hover:bg-canvas/40
                  ${idx % 2 === 0 ? '' : 'bg-canvas/20'}`}>
                <td className="px-4 py-3 text-[11px] text-ink-faint whitespace-nowrap font-mono">{formatTs(ev.timestamp)}</td>
                <td className="px-4 py-3">
                  <div className="text-[12px] font-medium text-ink">{ev.user_name || ev.user_id || '—'}</div>
                  {ev.user_name && ev.user_id && <div className="text-[10px] text-ink-faint">{ev.user_id}</div>}
                </td>
                <td className="px-4 py-3">
                  {ev.user_role
                    ? <span className="inline-block text-[10px] font-semibold uppercase tracking-wide rounded-full bg-brand-indigo/10 text-brand-indigo px-2 py-0.5">{ev.user_role}</span>
                    : <span className="text-ink-faint text-[11px]">—</span>}
                </td>
                <td className="px-4 py-3"><EventTypeBadge type={ev.event_type} /></td>
                <td className="px-4 py-3 hidden xl:table-cell">
                  <span className="text-[12px] text-ink-soft truncate max-w-[160px] block" title={ev.document_name}>{ev.document_name || '—'}</span>
                </td>
                <td className="px-4 py-3 hidden xl:table-cell">
                  <span className="text-[11px] text-ink-faint truncate max-w-[200px] block" title={ev.detail}>{ev.detail || '—'}</span>
                </td>
                <td className="px-4 py-3 text-center"><ResultBadge result={ev.result} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminMonitoringPage() {
  const [summary, setSummary]         = useState(null)
  const [summaryLoading, setSumLoad]  = useState(true)

  // Log state
  const [events, setEvents]           = useState([])
  const [eventsTotal, setEventsTotal] = useState(0)
  const [eventsLoading, setEvLoad]    = useState(true)

  // Filters
  const [search, setSearch]       = useState('')
  const [filterType, setFType]    = useState('')
  const [filterResult, setFRes]   = useState('')
  const [filterRole, setFRole]    = useState('')
  const [page, setPage]           = useState(1)
  const PAGE_SIZE = 50

  // ── Data fetching ───────────────────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    setSumLoad(true)
    try {
      const res = await axiosClient.get('/admin/monitoring/summary')
      setSummary(res.data)
    } catch { setSummary(null) }
    finally { setSumLoad(false) }
  }, [])

  const fetchEvents = useCallback(async () => {
    setEvLoad(true)
    try {
      const params = { page, page_size: PAGE_SIZE }
      if (search)       params.search      = search
      if (filterType)   params.event_type  = filterType
      if (filterResult) params.result      = filterResult
      if (filterRole)   params.user_role   = filterRole
      const res = await axiosClient.get('/admin/monitoring/events', { params })
      setEvents(res.data.events)
      setEventsTotal(res.data.total)
    } catch { setEvents([]); setEventsTotal(0) }
    finally { setEvLoad(false) }
  }, [page, search, filterType, filterResult, filterRole])

  useEffect(() => { fetchSummary() }, [fetchSummary])
  useEffect(() => { fetchEvents()  }, [fetchEvents])

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [search, filterType, filterResult, filterRole])

  const s = summary || {}
  const totalSecurity = (s.rbac_denied||0) + (s.unauth_access||0) + (s.prompt_injection||0)
                      + (s.out_of_scope||0) + (s.guardrail_blocked||0)
  const maxDocStat = Math.max(s.policy_uploads||0, s.duplicate_attempts||0,
                              s.policy_deletions||0, s.access_changes||0,
                              s.summary_generations||0, 1)
  const totalPages = Math.ceil(eventsTotal / PAGE_SIZE)

  return (
    <AppShell title="Monitoring">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-8 flex flex-col gap-8">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-7 w-7 rounded-lg bg-brand-gradient flex items-center justify-center">
                <BarChart2 size={14} className="text-white" />
              </div>
              <h2 className="font-display text-xl font-semibold text-ink">Monitoring</h2>
            </div>
            <p className="text-sm text-ink-soft">System activity, security events, and audit trail.</p>
          </div>
          <button
            onClick={() => { fetchSummary(); fetchEvents() }}
            className="flex items-center gap-2 text-xs font-medium text-ink-soft border border-ink/10 rounded-xl px-3 py-2 hover:border-brand-indigo/40 hover:text-brand-indigo transition-colors"
          >
            <RefreshCw size={13} className={summaryLoading || eventsLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* ── Query Activity stat cards ── */}
        <section>
          <SectionHeader icon={TrendingUp} title="Query Activity" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard icon={MessageSquare} iconCls="bg-brand-indigo/10 text-brand-indigo"  label="Total queries"       value={s.total_queries}        />
            <StatCard icon={Clock}         iconCls="bg-sky-100 text-sky-600"               label="Queries today"       value={s.queries_today}        />
            <StatCard icon={Users}         iconCls="bg-violet-100 text-violet-600"         label="Active users"        value={s.active_users}         />
            <StatCard icon={MessageSquare} iconCls="bg-indigo-100 text-indigo-600"         label="Conversations"       value={s.total_conversations}  />
            <StatCard icon={CheckCircle2}  iconCls="bg-emerald-100 text-emerald-600"       label="Successful"          value={s.successful_requests}  />
            <StatCard icon={XCircle}       iconCls="bg-red-100 text-red-500"               label="Failed"              value={s.failed_requests}      />
          </div>
        </section>

        {/* ── Security + Document side-by-side ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Security Events */}
          <section className="bg-white rounded-2xl border border-ink/[0.07] shadow-sm px-5 py-4">
            <SectionHeader icon={ShieldAlert} title="Security Events"
              description={`${totalSecurity} total security events recorded`} />
            <div className="flex flex-col gap-3 mt-3">
              <MetricRow label="RBAC access denied"     value={s.rbac_denied||0}         barColor="bg-amber-400"   max={Math.max(totalSecurity,1)} />
              <MetricRow label="Unauthorized access"    value={s.unauth_access||0}        barColor="bg-red-500"     max={Math.max(totalSecurity,1)} />
              <MetricRow label="Prompt injection"       value={s.prompt_injection||0}     barColor="bg-red-600"     max={Math.max(totalSecurity,1)} />
              <MetricRow label="Out-of-scope queries"   value={s.out_of_scope||0}         barColor="bg-orange-400"  max={Math.max(totalSecurity,1)} />
              <MetricRow label="Guardrail blocked"      value={s.guardrail_blocked||0}    barColor="bg-red-500"     max={Math.max(totalSecurity,1)} />
            </div>
          </section>

          {/* Document Activity */}
          <section className="bg-white rounded-2xl border border-ink/[0.07] shadow-sm px-5 py-4">
            <SectionHeader icon={FileStack} title="Document Activity" />
            <div className="flex flex-col gap-3 mt-3">
              <MetricRow label="Policy uploads"         value={s.policy_uploads||0}       barColor="bg-indigo-500"  max={maxDocStat} />
              <MetricRow label="Duplicate attempts"     value={s.duplicate_attempts||0}   barColor="bg-amber-500"   max={maxDocStat} />
              <MetricRow label="Policy deletions"       value={s.policy_deletions||0}     barColor="bg-red-500"     max={maxDocStat} />
              <MetricRow label="Access/role changes"    value={s.access_changes||0}       barColor="bg-sky-500"     max={maxDocStat} />
              <MetricRow label="Summary generations"    value={s.summary_generations||0}  barColor="bg-violet-500"  max={maxDocStat} />
            </div>
          </section>
        </div>

        {/* ── Activity Log ── */}
        <section className="flex flex-col gap-3">
          <SectionHeader icon={Activity} title="Activity Log"
            description={`${eventsTotal} events total`} />

          {/* Filter bar */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
              <input
                type="text"
                placeholder="Search actions, users, documents…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-xl border border-ink/10 bg-white pl-8 pr-3 py-2 text-xs text-ink
                  placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-indigo/25
                  focus:border-brand-indigo transition-all"
              />
            </div>
            {/* Event type */}
            <select value={filterType} onChange={e => setFType(e.target.value)}
              className="rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs text-ink
                focus:outline-none focus:ring-2 focus:ring-brand-indigo/25 focus:border-brand-indigo appearance-none cursor-pointer">
              {EVENT_TYPES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
            {/* Result */}
            <select value={filterResult} onChange={e => setFRes(e.target.value)}
              className="rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs text-ink
                focus:outline-none focus:ring-2 focus:ring-brand-indigo/25 focus:border-brand-indigo appearance-none cursor-pointer">
              {RESULTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            {/* Role */}
            <select value={filterRole} onChange={e => setFRole(e.target.value)}
              className="rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs text-ink
                focus:outline-none focus:ring-2 focus:ring-brand-indigo/25 focus:border-brand-indigo appearance-none cursor-pointer">
              {['','admin','hr','finance','it','marketing'].map(r => (
                <option key={r} value={r}>{r || 'All roles'}</option>
              ))}
            </select>
            {/* Clear */}
            {(search || filterType || filterResult || filterRole) && (
              <button onClick={() => { setSearch(''); setFType(''); setFRes(''); setFRole('') }}
                className="text-xs text-brand-indigo hover:underline">
                Clear filters
              </button>
            )}
          </div>

          <ActivityTable events={events} loading={eventsLoading} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-ink-faint mt-1">
              <span>
                Showing {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE, eventsTotal)} of {eventsTotal}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                  className="p-1.5 rounded-lg border border-ink/10 hover:border-brand-indigo/40 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronLeft size={13} />
                </button>
                <span className="font-medium text-ink">Page {page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-ink/10 hover:border-brand-indigo/40 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </section>

      </div>
    </AppShell>
  )
}
