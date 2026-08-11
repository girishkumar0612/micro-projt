import { useState } from 'react'
import { FileText, Trash2, Loader2, Globe, Users, ShieldCheck, CheckCircle2, Clock, AlertCircle, ChevronDown, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Badge configs ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  ready:    { label: 'Ready',    icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  indexing: { label: 'Indexing', icon: Clock,        cls: 'bg-amber-50   text-amber-700   border-amber-200'   },
  failed:   { label: 'Failed',   icon: AlertCircle,  cls: 'bg-red-50     text-red-700     border-red-200'     },
}

const ACCESS_CONFIG = {
  public:       { label: 'Company-Wide', icon: Globe,       cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  internal:     { label: 'Internal',     icon: Users,       cls: 'bg-amber-50   text-amber-700   border-amber-200'   },
  confidential: { label: 'Confidential', icon: ShieldCheck, cls: 'bg-red-50     text-red-700     border-red-200'     },
}

const ROLE_CONFIG = {
  admin:     { label: 'Admin',     cls: 'bg-violet-100  text-violet-700  border-violet-200'  },
  hr:        { label: 'HR',        cls: 'bg-pink-100    text-pink-700    border-pink-200'    },
  finance:   { label: 'Finance',   cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  it:        { label: 'IT',        cls: 'bg-orange-100  text-orange-700  border-orange-200'  },
  marketing: { label: 'Marketing', cls: 'bg-rose-100    text-rose-700    border-rose-200'    },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  try { return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) }
  catch { return dateStr }
}

function colSpan(showMeta, isAdmin) {
  // Document + Size + Chunks + (Dept + Access + Roles if showMeta) + Uploaded + Status + (action if isAdmin)
  return 3 + (showMeta ? 3 : 0) + 1 + 1 + (isAdmin ? 1 : 0)
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, icon: CheckCircle2, cls: 'bg-ink/5 text-ink-soft border-ink/10' }
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cfg.cls}`}>
      <Icon size={11} strokeWidth={2.5} />{cfg.label}
    </span>
  )
}

function AccessBadge({ level }) {
  const cfg = ACCESS_CONFIG[level] ?? { label: level, icon: Globe, cls: 'bg-ink/5 text-ink-soft border-ink/10' }
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${cfg.cls}`}>
      <Icon size={11} strokeWidth={2.5} />{cfg.label}
    </span>
  )
}

function RoleChip({ role }) {
  const cfg = ROLE_CONFIG[role.trim()] ?? { label: role, cls: 'bg-ink/5 text-ink-soft border-ink/10' }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function EmptyState({ isAdmin }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-ink/[0.08] bg-white py-16 px-8 text-center">
      <div className="h-14 w-14 rounded-2xl bg-brand-gradient-soft flex items-center justify-center">
        <FileText size={22} className="text-brand-indigo" />
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">No documents yet</p>
        <p className="text-xs text-ink-faint mt-1 max-w-xs">
          {isAdmin ? 'Upload a PDF above — it will be extracted, chunked, and indexed automatically.' : 'No documents have been shared with your role yet.'}
        </p>
      </div>
    </motion.div>
  )
}

// ── Summary expand row ────────────────────────────────────────────────────────
function SummaryRow({ summary, span }) {
  return (
    <tr>
      <td colSpan={span} className="px-5 pb-4 pt-0">
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="rounded-xl bg-brand-indigo/[0.04] border border-brand-indigo/10 px-4 py-3 flex gap-2.5">
          <Sparkles size={13} className="text-brand-indigo shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-brand-indigo mb-1">AI Summary</p>
            <p className="text-xs text-ink-soft leading-relaxed">{summary}</p>
          </div>
        </motion.div>
      </td>
    </tr>
  )
}

// ── Th helper ─────────────────────────────────────────────────────────────────
function Th({ children, first, last, hidden }) {
  const hiddenCls = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell' }[hidden] ?? ''
  return (
    <th className={`px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-faint
      ${first ? 'pl-5' : ''} ${last ? 'pr-4 text-right w-12' : ''} ${hiddenCls}`}>
      {children}
    </th>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DocumentTable({ documents, isLoading, onDelete, isAdmin, showMeta = false }) {
  const [expandedId, setExpandedId] = useState(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2.5 py-16 text-ink-faint rounded-2xl bg-white border border-ink/[0.06]">
        <Loader2 size={16} className="animate-spin text-brand-indigo" />
        <span className="text-sm">Loading documents…</span>
      </div>
    )
  }

  if (documents.length === 0) return <EmptyState isAdmin={isAdmin} />

  const span = colSpan(showMeta, isAdmin)

  return (
    <div className="rounded-2xl border border-ink/[0.07] bg-white overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-canvas/70 border-b border-ink/[0.06]">
              <Th first>Document</Th>
              <Th hidden="sm">Size</Th>
              <Th hidden="md">Chunks</Th>
              {showMeta && <Th hidden="lg">Department</Th>}
              {showMeta && <Th hidden="lg">Access</Th>}
              {showMeta && <Th hidden="xl">Roles</Th>}
              <Th hidden="sm">Uploaded</Th>
              <Th>Status</Th>
              {isAdmin && <Th last />}
            </tr>
          </thead>

          <tbody>
            <AnimatePresence initial={false}>
              {documents.map((doc, idx) => {
                const isExpanded = expandedId === doc.id
                const hasSummary = !!doc.summary?.trim()

                return (
                  <>
                    <motion.tr key={doc.id}
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.18, delay: idx * 0.03 }}
                      className={`group border-b border-ink/[0.05] transition-colors duration-150
                        ${isExpanded ? 'bg-canvas/60 border-b-0' : 'last:border-0 hover:bg-canvas/50'}`}>

                      {/* Document name + summary toggle */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-brand-gradient-soft flex items-center justify-center shrink-0 border border-brand-indigo/10 group-hover:border-brand-indigo/20 transition-colors">
                            <FileText size={15} className="text-brand-indigo" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-ink truncate max-w-[140px] lg:max-w-[200px] text-[13px]">{doc.filename}</p>
                              {hasSummary && (
                                <button onClick={() => setExpandedId(isExpanded ? null : doc.id)}
                                  title={isExpanded ? 'Hide summary' : 'View summary'}
                                  className="shrink-0 flex items-center gap-0.5 rounded-md bg-brand-indigo/10 text-brand-indigo px-1.5 py-0.5 text-[10px] font-semibold hover:bg-brand-indigo/20 transition-colors">
                                  <Sparkles size={9} />
                                  <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                    <ChevronDown size={9} />
                                  </motion.span>
                                </button>
                              )}
                            </div>
                            {showMeta && <p className="text-[11px] text-ink-faint truncate lg:hidden mt-0.5">{doc.department}</p>}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <span className="text-[13px] text-ink-soft">{doc.size_kb} KB</span>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <span className="inline-flex items-center rounded-lg bg-ink/[0.04] px-2 py-0.5 text-[12px] font-medium text-ink-soft">
                          {doc.chunks_indexed}
                        </span>
                      </td>

                      {showMeta && <td className="px-5 py-3.5 hidden lg:table-cell"><span className="text-[13px] text-ink-soft">{doc.department}</span></td>}
                      {showMeta && <td className="px-5 py-3.5 hidden lg:table-cell"><AccessBadge level={doc.access_level} /></td>}
                      {showMeta && (
                        <td className="px-5 py-3.5 hidden xl:table-cell">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {doc.allowed_roles?.split(',').map((r) => <RoleChip key={r} role={r} />)}
                          </div>
                        </td>
                      )}

                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <span className="text-[12px] text-ink-faint">{formatDate(doc.uploaded_at)}</span>
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={doc.status} /></td>

                      {isAdmin && (
                        <td className="px-4 py-3.5 text-right">
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                            onClick={() => onDelete(doc)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-150
                              inline-flex items-center justify-center h-8 w-8 rounded-lg
                              text-ink-faint hover:text-red-600 hover:bg-red-50
                              border border-transparent hover:border-red-200 transition-colors"
                            aria-label={`Delete ${doc.filename}`}>
                            <Trash2 size={14} />
                          </motion.button>
                        </td>
                      )}
                    </motion.tr>

                    {/* Summary expand row */}
                    <AnimatePresence>
                      {isExpanded && hasSummary && (
                        <SummaryRow key={`${doc.id}-summary`} summary={doc.summary} span={span} />
                      )}
                    </AnimatePresence>
                  </>
                )
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-ink/[0.05] bg-canvas/40 flex items-center justify-between">
        <span className="text-[11px] text-ink-faint">{documents.length} {documents.length === 1 ? 'document' : 'documents'} total</span>
        <span className="text-[11px] text-ink-faint">{documents.filter((d) => d.status === 'ready').length} ready</span>
      </div>
    </div>
  )
}
