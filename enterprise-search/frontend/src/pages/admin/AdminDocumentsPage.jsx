/**
 * Admin Portal — Document Management
 * Upload flow: dropzone → AI summary (Groq) → review/edit → configure RBAC → index
 */
import { useState } from 'react'
import {
  ShieldCheck, FileStack, Users, Globe, Upload,
  ChevronRight, Info, CheckCircle2, Sparkles, Pencil, Loader2, Lock,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import AppShell from '../../components/layout/AppShell'
import UploadDropzone from '../../components/documents/UploadDropzone'
import DocumentTable from '../../components/documents/DocumentTable'
import Modal from '../../components/common/Modal'
import Button from '../../components/common/Button'
import { useDocuments } from '../../hooks/useDocuments'
import { useToast } from '../../components/common/Toast'
import axiosClient from '../../api/axiosClient'

const DEPARTMENTS = ['General', 'Human Resources', 'Finance', 'IT', 'Legal', 'Operations', 'Marketing']

const ACCESS_LEVELS = [
  { value: 'public',       label: 'Company-Wide', description: 'All employees',  icon: Globe,       activeColors: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 text-emerald-700' },
  { value: 'internal',     label: 'Internal',     description: 'Specific roles', icon: Users,       activeColors: 'border-amber-500 bg-amber-50 ring-2 ring-amber-200 text-amber-700'         },
  { value: 'confidential', label: 'Confidential', description: 'Restricted',     icon: ShieldCheck, activeColors: 'border-red-500 bg-red-50 ring-2 ring-red-200 text-red-700'                 },
]

const ROLE_CONFIG = {
  admin:   { label: 'Admin',   bg: 'bg-violet-100',  text: 'text-violet-700',  border: 'border-violet-200',  activeBg: 'bg-violet-600',  activeText: 'text-white' },
  hr:      { label: 'HR',      bg: 'bg-pink-100',    text: 'text-pink-700',    border: 'border-pink-200',    activeBg: 'bg-pink-600',    activeText: 'text-white' },
  finance: { label: 'Finance', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', activeBg: 'bg-emerald-600', activeText: 'text-white' },
  it:      { label: 'IT',      bg: 'bg-orange-100',  text: 'text-orange-700',  border: 'border-orange-200',  activeBg: 'bg-orange-600',  activeText: 'text-white' },
}
const ALL_ROLES = Object.keys(ROLE_CONFIG)
const DEFAULT_META = { department: 'General', access_level: 'internal', allowed_roles: ['admin'] }

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl bg-white border border-ink/[0.06] px-5 py-4 shadow-sm">
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-xl font-semibold font-display text-ink leading-tight">{value}</p>
        <p className="text-xs text-ink-soft mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────
const STEPS = ['Upload', 'AI Summary', 'Configure', 'Index']
const STEP_MAP = { summarizing: 'AI Summary', configuring: 'Configure', uploading: 'Index' }
function Breadcrumb({ step }) {
  const active = STEP_MAP[step] ?? ''
  return (
    <div className="flex items-center gap-1.5 px-6 pt-4 pb-1 text-[11px] font-medium select-none">
      {STEPS.map((s, i) => (
        <span key={s} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={10} className="text-ink-faint" />}
          <span className={s === active ? 'text-brand-indigo font-semibold' : 'text-ink-faint'}>{s}</span>
        </span>
      ))}
    </div>
  )
}

// ── Summarizing spinner ───────────────────────────────────────────────────────
function SummarizingPanel({ filename }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-8 text-center">
      <div className="relative h-14 w-14">
        <div className="h-14 w-14 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-lg shadow-brand-indigo/20">
          <Sparkles size={22} className="text-white" />
        </div>
        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white border-2 border-brand-indigo/20 flex items-center justify-center">
          <Loader2 size={11} className="animate-spin text-brand-indigo" />
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">Generating AI summary…</p>
        <p className="text-xs text-ink-soft mt-1 max-w-xs">
          Groq is reading <span className="font-medium text-ink">{filename}</span> and writing a concise overview.
        </p>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div key={i} className="h-1.5 w-1.5 rounded-full bg-brand-indigo"
            animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
        ))}
      </div>
    </div>
  )
}

// ── Duplicate-policy banner ───────────────────────────────────────────────────
function DuplicateBanner({ detail, onDismiss }) {
  return (
    <motion.div
      key="dup-banner"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3.5 mx-6 mt-4"
      role="alert"
    >
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100">
        <Lock size={14} className="text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800">🔒 Duplicate Policy Detected</p>
        <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
          This exact policy version has already been uploaded.
          {detail ? <><br /><span className="opacity-80">{detail}</span></> : null}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 mt-0.5 text-amber-500 hover:text-amber-700 transition-colors p-0.5 rounded"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </motion.div>
  )
}


export default function AdminDocumentsPage() {
  const { documents, isLoading, fetchDocuments, deleteDocument } = useDocuments()
  const { showToast } = useToast()

  const [step, setStep] = useState('idle')   // idle | summarizing | configuring | uploading
  const [pendingFile, setPendingFile] = useState(null)
  const [summary, setSummary] = useState('')
  const [meta, setMeta] = useState(DEFAULT_META)
  const [progress, setProgress] = useState(0)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  // Set to { detail: string } when backend returns DUPLICATE_DOCUMENT (409)
  const [duplicateError, setDuplicateError] = useState(null)

  const resetFlow = () => {
    setStep('idle')
    setPendingFile(null)
    setSummary('')
    setMeta(DEFAULT_META)
    setProgress(0)
    setDuplicateError(null)
  }

  const toggleRole = (role) =>
    setMeta((prev) => ({
      ...prev,
      allowed_roles: prev.allowed_roles.includes(role)
        ? prev.allowed_roles.filter((r) => r !== role)
        : [...prev.allowed_roles, role],
    }))

  // File chosen → call /summarize immediately
  const handleFileSelected = async (file) => {
    setPendingFile(file)
    setSummary('')
    setMeta(DEFAULT_META)
    setDuplicateError(null)
    setStep('summarizing')
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await axiosClient.post('/summarize', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSummary(res.data.summary)
    } catch (err) {
      showToast(err.friendlyMessage || 'Could not generate summary — enter one manually.', 'error')
      setSummary('')
    }
    setStep('configuring')
  }

  // Admin confirmed → upload with summary + RBAC meta
  const handleUploadConfirm = async () => {
    if (!pendingFile) return
    if (meta.allowed_roles.length === 0) { showToast('Select at least one allowed role.', 'error'); return }
    setStep('uploading')
    setDuplicateError(null)
    setProgress(0)
    const fd = new FormData()
    fd.append('file', pendingFile)
    fd.append('department', meta.department)
    fd.append('access_level', meta.access_level)
    fd.append('allowed_roles', meta.allowed_roles.join(','))
    fd.append('summary', summary.trim())
    try {
      await axiosClient.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => { if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100)) },
      })
      showToast(`"${pendingFile.name}" uploaded and indexed.`, 'success')
      resetFlow()
      fetchDocuments()
    } catch (err) {
      // 409 DUPLICATE_DOCUMENT → show the dedicated inline banner, not a toast
      if (err.response?.data?.code === 'DUPLICATE_DOCUMENT') {
        setDuplicateError({ detail: err.response.data.detail })
        setStep('configuring')
      } else {
        showToast(err.friendlyMessage || 'Upload failed.', 'error')
        setStep('configuring')
      }
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteDocument(pendingDelete.id)
      showToast(`"${pendingDelete.filename}" deleted.`, 'success')
    } catch (err) {
      showToast(err.friendlyMessage || 'Delete failed.', 'error')
    } finally {
      setDeleting(false)
      setPendingDelete(null)
    }
  }

  const ready      = documents.filter((d) => d.status === 'ready').length
  const totalRoles = [...new Set(documents.flatMap((d) => d.allowed_roles?.split(',').map((r) => r.trim()) ?? []))].length

  return (
    <AppShell title="Document Management">
      <div className="max-w-5xl mx-auto px-5 md:px-8 py-8 flex flex-col gap-7">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-lg bg-brand-gradient flex items-center justify-center">
              <ShieldCheck size={14} className="text-white" />
            </div>
            <h2 className="font-display text-xl font-semibold text-ink">Document Management</h2>
          </div>
          <p className="text-sm text-ink-soft leading-relaxed">
            Upload PDFs and assign RBAC metadata. Access is enforced at search time.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard icon={FileStack}    label="Total documents" value={documents.length} color="bg-brand-indigo/10 text-brand-indigo" />
          <StatCard icon={CheckCircle2} label="Ready to search"  value={ready}           color="bg-emerald-100 text-emerald-600" />
          <StatCard icon={Users}        label="Roles covered"    value={totalRoles}       color="bg-violet-100 text-violet-600" />
        </div>

        {/* Upload section */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Upload size={14} className="text-ink-faint" />
            <h3 className="text-sm font-semibold text-ink">Upload a document</h3>
          </div>

          <AnimatePresence mode="wait">
            {step === 'idle' ? (
              <motion.div key="dropzone" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                <UploadDropzone onFileSelected={handleFileSelected} uploading={false} progress={0} />
              </motion.div>
            ) : (
              <motion.div key="card" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}
                className="rounded-2xl border border-ink/[0.07] bg-white shadow-sm overflow-hidden">

                {/* Card header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-ink/[0.06] bg-canvas/60">
                  <div className="h-8 w-8 rounded-lg bg-brand-gradient flex items-center justify-center shrink-0">
                    <Upload size={14} className="text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-faint font-medium">Selected file</p>
                    <p className="text-sm font-semibold text-ink truncate">{pendingFile?.name}</p>
                  </div>
                  <span className="text-[11px] font-medium text-ink-faint bg-ink/[0.04] rounded-lg px-2.5 py-1 shrink-0">
                    {pendingFile ? (pendingFile.size / 1024).toFixed(0) : 0} KB
                  </span>
                </div>

                <Breadcrumb step={step} />

                {/* Duplicate-policy banner — shown inline so the admin can read it
                    clearly without the flow resetting; Cancel clears the file */}
                <AnimatePresence>
                  {duplicateError && (
                    <DuplicateBanner
                      detail={duplicateError.detail}
                      onDismiss={() => setDuplicateError(null)}
                    />
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {/* ── Summarizing ── */}
                  {step === 'summarizing' && (
                    <motion.div key="summarizing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <SummarizingPanel filename={pendingFile?.name} />
                    </motion.div>
                  )}

                  {/* ── Configuring / Uploading ── */}
                  {(step === 'configuring' || step === 'uploading') && (
                    <motion.div key="configuring" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="px-6 pb-6 pt-4 flex flex-col gap-6">

                      {/* AI Summary */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-ink-soft tracking-wide uppercase">AI-Generated Summary</label>
                          <div className="flex items-center gap-1 text-[11px] text-brand-indigo font-medium">
                            <Pencil size={10} /> Editable
                          </div>
                        </div>
                        <div className="relative">
                          <textarea value={summary} onChange={(e) => setSummary(e.target.value)}
                            placeholder="No summary generated — enter a manual description of this document."
                            rows={4} disabled={step === 'uploading'}
                            className="w-full rounded-xl border border-ink/10 bg-canvas px-3.5 py-3 text-sm text-ink
                              placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-indigo/25
                              focus:border-brand-indigo transition-all resize-none leading-relaxed
                              disabled:opacity-60 disabled:cursor-not-allowed" />
                          {summary && (
                            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-brand-indigo/10 text-brand-indigo rounded-lg px-2 py-0.5">
                              <Sparkles size={10} />
                              <span className="text-[10px] font-semibold">Groq</span>
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-ink-faint">
                          Stored as document metadata and shown in the library. Edit to correct any inaccuracies before indexing.
                        </p>
                      </div>

                      {/* Department */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-ink-soft tracking-wide uppercase">Department</label>
                        <select value={meta.department} onChange={(e) => setMeta((p) => ({ ...p, department: e.target.value }))}
                          disabled={step === 'uploading'}
                          className="rounded-xl border border-ink/10 bg-canvas px-3.5 py-2.5 text-sm text-ink
                            focus:outline-none focus:ring-2 focus:ring-brand-indigo/25 focus:border-brand-indigo
                            transition-all appearance-none cursor-pointer disabled:opacity-60">
                          {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                        </select>
                      </div>

                      {/* Access Level */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-ink-soft tracking-wide uppercase">Access Level</label>
                        <div className="grid grid-cols-3 gap-2.5">
                          {ACCESS_LEVELS.map((lvl) => {
                            const Icon = lvl.icon
                            const active = meta.access_level === lvl.value
                            return (
                              <button key={lvl.value} type="button"
                                onClick={() => step !== 'uploading' && setMeta((p) => ({ ...p, access_level: lvl.value }))}
                                className={`relative flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3.5
                                  text-center transition-all duration-150 focus:outline-none
                                  ${active ? lvl.activeColors : 'border-ink/10 bg-white hover:border-ink/20 hover:bg-canvas/80'}
                                  ${step === 'uploading' ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                {active && <CheckCircle2 size={13} className="absolute top-2 right-2 text-current opacity-70" />}
                                <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${active ? 'bg-current/10' : 'bg-ink/[0.04]'}`}>
                                  <Icon size={14} className={active ? 'text-current' : 'text-ink-faint'} />
                                </div>
                                <span className={`text-xs font-semibold leading-tight ${active ? 'text-current' : 'text-ink'}`}>{lvl.label}</span>
                                <span className={`text-[10px] leading-tight ${active ? 'text-current/70' : 'text-ink-faint'}`}>{lvl.description}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Allowed Roles */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-ink-soft tracking-wide uppercase">Allowed Roles</label>
                          <span className="text-[11px] text-ink-faint">{meta.allowed_roles.length} of {ALL_ROLES.length} selected</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {ALL_ROLES.map((role) => {
                            const cfg = ROLE_CONFIG[role]
                            const selected = meta.allowed_roles.includes(role)
                            return (
                              <button key={role} type="button"
                                onClick={() => step !== 'uploading' && toggleRole(role)}
                                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5
                                  text-xs font-medium transition-all duration-150 focus:outline-none
                                  ${selected ? `${cfg.activeBg} ${cfg.activeText} border-transparent shadow-sm` : `${cfg.bg} ${cfg.text} ${cfg.border} hover:opacity-80`}
                                  ${step === 'uploading' ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                {selected && <CheckCircle2 size={11} strokeWidth={2.5} />}
                                {cfg.label}
                              </button>
                            )
                          })}
                        </div>
                        {meta.allowed_roles.length === 0 && (
                          <div className="flex items-center gap-1.5 text-[11px] text-state-danger mt-0.5">
                            <Info size={11} /> At least one role must be selected.
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 pt-1 border-t border-ink/[0.06]">
                        <Button onClick={handleUploadConfirm} disabled={step === 'uploading' || meta.allowed_roles.length === 0}>
                          {step === 'uploading' ? `Uploading… ${progress}%` : 'Upload & Index'}
                        </Button>
                        <Button variant="ghost" onClick={resetFlow} disabled={step === 'uploading'}>Cancel</Button>
                        {step === 'uploading' && (
                          <div className="flex-1 ml-2">
                            <div className="h-1.5 rounded-full bg-ink/[0.07] overflow-hidden">
                              <motion.div className="h-full bg-brand-gradient rounded-full"
                                initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Document library */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileStack size={14} className="text-ink-faint" />
              <h3 className="text-sm font-semibold text-ink">Document Library</h3>
            </div>
            {documents.length > 0 && (
              <span className="text-xs text-ink-faint bg-ink/[0.04] rounded-lg px-2.5 py-1 font-medium">
                {documents.length} {documents.length === 1 ? 'document' : 'documents'}
              </span>
            )}
          </div>
          <DocumentTable documents={documents} isLoading={isLoading} onDelete={setPendingDelete} isAdmin={true} showMeta={true} />
        </section>
      </div>

      {/* Delete modal */}
      <Modal open={!!pendingDelete} onClose={() => !deleting && setPendingDelete(null)} title="Delete this document?"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setPendingDelete(null)} disabled={deleting}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </>
        }>
        <p>
          <span className="font-medium text-ink">"{pendingDelete?.filename}"</span> will be permanently
          removed along with all its indexed vectors. This action cannot be undone.
        </p>
      </Modal>
    </AppShell>
  )
}
