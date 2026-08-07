import { useState } from 'react'
import { ShieldOff } from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import UploadDropzone from '../components/documents/UploadDropzone'
import DocumentTable from '../components/documents/DocumentTable'
import Modal from '../components/common/Modal'
import Button from '../components/common/Button'
import { useDocuments } from '../hooks/useDocuments'
import { useAdmin } from '../context/AdminContext'
import { useToast } from '../components/common/Toast'

export default function DocumentsPage() {
  const { documents, isLoading, uploadDocument, deleteDocument } = useDocuments()
  const { isAdmin } = useAdmin()
  const { showToast } = useToast()

  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const handleFileSelected = async (file) => {
    if (!isAdmin) {
      showToast('Unlock admin mode from the sidebar to upload documents.', 'error')
      return
    }
    setUploading(true)
    setProgress(0)
    try {
      await uploadDocument(file, setProgress)
      showToast(`"${file.name}" uploaded and indexed.`, 'success')
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
    <AppShell title="Document management">
      <div className="max-w-4xl mx-auto px-4 md:px-0 py-8 flex flex-col gap-6">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Documents</h2>
          <p className="text-sm text-ink-soft mt-1">
            Upload PDFs to make them searchable. The vector index rebuilds automatically.
          </p>
        </div>

        {!isAdmin && (
          <div className="flex items-center gap-2.5 rounded-xl bg-state-warning/10 text-state-warning text-xs font-medium px-4 py-3">
            <ShieldOff size={14} />
            Viewing in read-only mode. Unlock admin mode from the sidebar to upload or delete documents.
          </div>
        )}

        <UploadDropzone
          onFileSelected={handleFileSelected}
          uploading={uploading}
          progress={progress}
        />

        <DocumentTable
          documents={documents}
          isLoading={isLoading}
          onDelete={setPendingDelete}
          isAdmin={isAdmin}
        />
      </div>

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
