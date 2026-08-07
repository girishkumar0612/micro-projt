/**
 * Admin Portal — Document Management
 * Admins can upload PDFs with RBAC metadata (department, access level, allowed roles)
 * and delete existing documents.
 *
 * UI: Modern enterprise SaaS style (Microsoft/Atlassian-inspired).
 * Logic: Unchanged.
 */
import { useState } from 'react'
import {
  ShieldCheck, FileStack, Users, Globe, Upload,
  ChevronRight, Info, CheckCircle2,
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
  {
    value: 'public',
    label: 'Company-Wide',
    description: 'All employees',
    icon: Globe,
    colors: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    activeColors: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
  {
    value: 'internal',
    label: 'Internal',
    description: 'Specific roles only',
    icon: Users,
    colors: 'border-amber-200 bg-amber-50 text-amber-700',
    activeColors: 'border-amber-500 bg-amber-50 ring-2 ring-amber-200',
    dot: 'bg-amber-500',
  },
  {
    value: 'confidential',
    label: 'Confidential',
    description: 'Restricted access',
    icon: ShieldCheck,
    colors: 'border-red-200 bg-red-50 text-red-700',
    activeColors: 'border-red-500 bg-red-50 ring-2 ring-red-200',
    dot: 'bg-red-500',
  },
]

const ROLE_CONFIG = {
  admin:    { label: 'Admin',    bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', activeBg: 'bg-violet-600', activeText: 'text-white' },
  employee: { label: 'Employee', bg: 'bg-sky-100',    text: 'text-sky-700',    border: 'border-sky-200',    activeBg: 'bg-sky-600',    activeText: 'text-white' },
  hr:       { label: 'HR',       bg: 'bg-pink-100',   text: 'text-pink-700',   border: 'border-pink-200',   activeBg: 'bg-pink-600',   activeText: 'text-white' },
  finance:  { label: 'Finance',  bg: 'bg-emerald-100',text: 'text-emerald-700',border: 'border-emerald-200',activeBg: 'bg-emerald-600',activeText: 'text-white' },
  it:       { label: 'IT',       bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', activeBg: 'bg-orange-600', activeText: 'text-white' },
}

const ALL_ROLES = Object.keys(ROLE_CONFIG)

const DEFAULT_META = {
  department: 'General',
  access_level: 'internal',
  allowed_roles: ['admin', 'employee'],
}

// ── small stat card ────────────────────────────────────────────────────────────
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

export default function AdminDocumentsPage() {
  const { documents, isLoading, fetchDocuments, deleteDocument } = useDocuments()
  const { showToast } = useToast()

  // Upload state
  const [pendingFile, setPendingFile] = useState(null)
  const [meta, setMeta] = useState(DEFAULT_META)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  // Delete state
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const toggleRole = (role) => {
    setMeta((prev) => {
      const has = prev.allowed_roles.includes(role)
      const next = has
        ? prev.allowed_roles.filter((r) => r !== role)
        : [...prev.allowed_roles, role]
      return { ...prev, allowed_roles: next }
    })
  }

  const handleFileSelected = (file) => {
    setPendingFile(file)
    setMeta(DEFAULT_META)
  }

  const handleUploadConfirm = async () => {
    if (!pendingFile) return
    if (meta.allowed_roles.length === 0) {
      showToast('Select at least one allowed role.', 'error')
      return
    }
    setUploading(true)
    setProgress(0)

    const formData = new FormData()
    formData.append('file', pendingFile)
    formData.append('department', meta.department)
    formData.append('access_level', meta.access_level)
    formData.append('allowed_roles', meta.allowed_roles.join(','))

    try {
      await axiosClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100))
        },
      })
      showToast(`"${pendingFile.name}" uploaded and indexed.`, 'success')
      setPendingFile(null)
      fetchDocuments()
    } catch (err) {
      showToast(err.friendlyMessage || 'Upload failed.', 'error')
    } finally {
      setUploading(false)
      setProgress(0)
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

  // Derived stats
  const ready      = documents.filter((d) => d.status === 'ready').length
  const totalRoles = [...new Set(documents.flatMap((d) => d.allowed_roles?.split(',').map((r) => r.trim()) ?? []))].length

  return (
    <AppShell title="Document Management">
      <div className="max-w-5xl mx-auto px-5 md:px-8 py-8 flex flex-col gap-7">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-7 w-7 rounded-lg bg-brand-gradient flex items-center justify-center">
                <ShieldCheck size={14} className="text-white" />
              </div>
              <h2 className="font-display text-xl font-semibold text-ink">Document Management</h2>
            </div>
            <p className="text-sm text-ink-soft leading-relaxed">
              Upload PDFs and assign RBAC metadata. Access is enforced at search time — employees
              only retrieve content their role permits.
            </p>
          </div>
        </div>

        {/* ── Stats strip ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard icon={FileStack} label="Total documents"   value={documents.length} color="bg-brand-indigo/10 text-brand-indigo" />
          <StatCard icon={CheckCircle2} label="Ready to search" value={ready}            color="bg-emerald-100 text-emerald-600" />
          <StatCard icon={Users}      label="Roles covered"    value={totalRoles}        color="bg-violet-100 text-violet-600" />
        </div>

        {/* ── Upload section ───────────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Upload size={14} className="text-ink-faint" />
            <h3 className="text-sm font-semibold text-ink">Upload a document</h3>
          </div>

          <AnimatePresence mode="wait">
            {!pendingFile ? (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <UploadDropzone
                  onFileSelected={handleFileSelected}
                  uploading={uploading}
                  progress={progress}
                />
              </motion.div>
            ) : (
              <motion.div
                key="metaform"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="rounded-2xl border border-ink/[0.07] bg-white shadow-sm overflow-hidden"
              >
                {/* Form header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-ink/[0.06] bg-canvas/60">
                  <div className="h-8 w-8 rounded-lg bg-brand-gradient flex items-center justify-center shrink-0">
                    <Upload size={14} className="text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-ink-faint font-medium">Configuring access for</p>
                    <p className="text-sm font-semibold text-ink truncate">{pendingFile.name}</p>
                  </div>
                  <span className="text-[11px] font-medium text-ink-faint bg-ink/[0.04] rounded-lg px-2.5 py-1 shrink-0">
                    {(pendingFile.size / 1024).toFixed(0)} KB
                  </span>
                </div>

                {/* Breadcrumb step hint */}
                <div className="flex items-center gap-1.5 px-6 pt-4 pb-1 text-[11px] text-ink-faint font-medium select-none">
                  <span className="text-brand-indigo">Upload</span>
                  <ChevronRight size={11} />
                  <span className="text-ink-soft font-semibold">Configure access</span>
                  <ChevronRight size={11} />
                  <span>Index</span>
                </div>

                <div className="px-6 pb-6 pt-4 flex flex-col gap-6">

                  {/* Department */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-ink-soft tracking-wide uppercase">
                      Department
                    </label>
                    <select
                      value={meta.department}
                      onChange={(e) => setMeta((p) => ({ ...p, department: e.target.value }))}
                      className="rounded-xl border border-ink/10 bg-canvas px-3.5 py-2.5 text-sm text-ink
                        focus:outline-none focus:ring-2 focus:ring-brand-indigo/25 focus:border-brand-indigo
                        transition-all appearance-none cursor-pointer"
                    >
                      {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                    </select>
                  </div>

                  {/* Access Level */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-ink-soft tracking-wide uppercase">
                      Access Level
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {ACCESS_LEVELS.map((lvl) => {
                        const Icon = lvl.icon
                        const active = meta.access_level === lvl.value
                        return (
                          <button
                            key={lvl.value}
                            type="button"
                            onClick={() => setMeta((p) => ({ ...p, access_level: lvl.value }))}
                            className={`relative flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3.5
                              text-center transition-all duration-150 focus:outline-none
                              ${active ? lvl.activeColors : 'border-ink/10 bg-white hover:border-ink/20 hover:bg-canvas/80'}`}
                          >
                            {active && (
                              <CheckCircle2 size={13} className="absolute top-2 right-2 text-current opacity-70" />
                            )}
                            <div className={`h-7 w-7 rounded-lg flex items-center justify-center
                              ${active ? 'bg-current/10' : 'bg-ink/[0.04]'}`}>
                              <Icon size={14} className={active ? 'text-current' : 'text-ink-faint'} />
                            </div>
                            <span className={`text-xs font-semibold leading-tight ${active ? 'text-current' : 'text-ink'}`}>
                              {lvl.label}
                            </span>
                            <span className={`text-[10px] leading-tight ${active ? 'text-current/70' : 'text-ink-faint'}`}>
                              {lvl.description}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Allowed Roles */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-ink-soft tracking-wide uppercase">
                        Allowed Roles
                      </label>
                      <span className="text-[11px] text-ink-faint">
                        {meta.allowed_roles.length} of {ALL_ROLES.length} selected
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ALL_ROLES.map((role) => {
                        const cfg = ROLE_CONFIG[role]
                        const selected = meta.allowed_roles.includes(role)
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => toggleRole(role)}
                            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5
                              text-xs font-medium transition-all duration-150 focus:outline-none
                              ${selected
                                ? `${cfg.activeBg} ${cfg.activeText} border-transparent shadow-sm`
                                : `${cfg.bg} ${cfg.text} ${cfg.border} hover:opacity-80`
                              }`}
                          >
                            {selected && <CheckCircle2 size={11} strokeWidth={2.5} />}
                            {cfg.label}
                          </button>
                        )
                      })}
                    </div>
                    {meta.allowed_roles.length === 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-state-danger mt-0.5">
                        <Info size={11} />
                        At least one role must be selected.
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-1 border-t border-ink/[0.06]">
                    <Button onClick={handleUploadConfirm} disabled={uploading || meta.allowed_roles.length === 0} icon={Upload}>
                      {uploading ? `Uploading… ${progress}%` : 'Upload & Index'}
                    </Button>
                    <Button variant="ghost" onClick={() => setPendingFile(null)} disabled={uploading}>
                      Cancel
                    </Button>
                    {uploading && (
                      <div className="flex-1 ml-2">
                        <div className="h-1.5 rounded-full bg-ink/[0.07] overflow-hidden">
                          <motion.div
                            className="h-full bg-brand-gradient rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ── Document library ─────────────────────────────────────────────── */}
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

          <DocumentTable
            documents={documents}
            isLoading={isLoading}
            onDelete={setPendingDelete}
            isAdmin={true}
            showMeta={true}
          />
        </section>
      </div>

      {/* ── Delete confirmation modal ─────────────────────────────────────── */}
      <Modal
        open={!!pendingDelete}
        onClose={() => !deleting && setPendingDelete(null)}
        title="Delete this document?"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setPendingDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </>
        }
      >
        <p>
          <span className="font-medium text-ink">"{pendingDelete?.filename}"</span> will be
          permanently removed along with all its indexed vectors. This action cannot be undone.
        </p>
      </Modal>
    </AppShell>
  )
}
