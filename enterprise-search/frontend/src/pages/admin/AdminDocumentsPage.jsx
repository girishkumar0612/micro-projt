/**
 * Admin Portal — Document Management
 * Admins can upload PDFs with RBAC metadata (department, access level, allowed roles)
 * and delete existing documents.
 */
import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import UploadDropzone from '../../components/documents/UploadDropzone'
import DocumentTable from '../../components/documents/DocumentTable'
import Modal from '../../components/common/Modal'
import Button from '../../components/common/Button'
import { useDocuments } from '../../hooks/useDocuments'
import { useToast } from '../../components/common/Toast'
import axiosClient from '../../api/axiosClient'

const DEPARTMENTS = ['General', 'Human Resources', 'Finance', 'IT', 'Legal', 'Operations', 'Marketing']
const ACCESS_LEVELS = ['public', 'internal', 'confidential']
const ALL_ROLES = ['admin', 'employee', 'hr', 'finance', 'it']

const DEFAULT_META = {
  department: 'General',
  access_level: 'internal',
  allowed_roles: ['admin', 'employee'],
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

  // Step 1: file chosen → show metadata form
  const handleFileSelected = (file) => {
    setPendingFile(file)
    setMeta(DEFAULT_META)
  }

  // Step 2: admin fills metadata and confirms upload
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

  return (
    <AppShell title="Document Management">
      <div className="max-w-4xl mx-auto px-4 md:px-0 py-8 flex flex-col gap-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={16} className="text-brand-indigo" />
            <h2 className="font-display text-xl font-semibold text-ink">Admin Portal</h2>
          </div>
          <p className="text-sm text-ink-soft">
            Upload PDFs and assign RBAC metadata. Employees only see documents their role permits.
          </p>
        </div>

        {/* Upload area — shows dropzone or metadata form */}
        {!pendingFile ? (
          <UploadDropzone
            onFileSelected={handleFileSelected}
            uploading={uploading}
            progress={progress}
          />
        ) : (
          <div className="rounded-2xl border border-ink/5 bg-white p-6 flex flex-col gap-5 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-ink">Configure access for:</p>
              <p className="text-xs text-brand-indigo font-medium mt-0.5 truncate">{pendingFile.name}</p>
            </div>

            {/* Department */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink-soft">Department</label>
              <select
                value={meta.department}
                onChange={(e) => setMeta((p) => ({ ...p, department: e.target.value }))}
                className="rounded-xl border border-ink/10 bg-canvas px-3 py-2 text-sm text-ink
                  focus:outline-none focus:ring-2 focus:ring-brand-indigo/30 focus:border-brand-indigo"
              >
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>

            {/* Access Level */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink-soft">Access Level</label>
              <div className="flex gap-2">
                {ACCESS_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setMeta((p) => ({ ...p, access_level: lvl }))}
                    className={`flex-1 rounded-xl border py-2 text-xs font-medium capitalize transition-all
                      ${meta.access_level === lvl
                        ? 'border-brand-indigo bg-brand-gradient-soft text-brand-indigo'
                        : 'border-ink/10 text-ink-soft hover:border-brand-indigo/40'}`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Allowed Roles */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink-soft">Allowed Roles</label>
              <div className="flex flex-wrap gap-2">
                {ALL_ROLES.map((role) => {
                  const selected = meta.allowed_roles.includes(role)
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-all capitalize
                        ${selected
                          ? 'bg-brand-gradient text-white border-transparent'
                          : 'border-ink/10 text-ink-soft hover:border-brand-indigo/40'}`}
                    >
                      {role}
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-ink-faint">
                Selected: {meta.allowed_roles.length > 0 ? meta.allowed_roles.join(', ') : 'none'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button onClick={handleUploadConfirm} disabled={uploading}>
                {uploading ? `Uploading… ${progress}%` : 'Upload & Index'}
              </Button>
              <Button variant="ghost" onClick={() => setPendingFile(null)} disabled={uploading}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Document table — admin sees all + metadata columns */}
        <DocumentTable
          documents={documents}
          isLoading={isLoading}
          onDelete={setPendingDelete}
          isAdmin={true}
          showMeta={true}
        />
      </div>

      {/* Delete confirmation modal */}
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
          "{pendingDelete?.filename}" will be removed along with its indexed vectors. This can't be undone.
        </p>
      </Modal>
    </AppShell>
  )
}
