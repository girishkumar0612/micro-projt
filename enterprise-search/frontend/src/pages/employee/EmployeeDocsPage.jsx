/**
 * Employee Portal — My Documents (read-only)
 * Shows only the documents the employee's role is permitted to access.
 * The backend filters the list; the frontend just renders it.
 */
import { Info } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import DocumentTable from '../../components/documents/DocumentTable'
import { useDocuments } from '../../hooks/useDocuments'
import { useAuth } from '../../context/AuthContext'

export default function EmployeeDocsPage() {
  const { documents, isLoading } = useDocuments()
  const { currentUser } = useAuth()

  return (
    <AppShell title="My Documents">
      <div className="max-w-4xl mx-auto px-4 md:px-0 py-8 flex flex-col gap-6">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">My Documents</h2>
          <p className="text-sm text-ink-soft mt-1">
            Documents accessible to your role: <span className="font-medium text-brand-indigo capitalize">{currentUser?.role}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl bg-brand-indigo/5 text-brand-indigo text-xs font-medium px-4 py-3">
          <Info size={14} />
          This is a read-only view. Contact your administrator to request access to additional documents.
        </div>

        <DocumentTable
          documents={documents}
          isLoading={isLoading}
          isAdmin={false}
          showMeta={false}
        />
      </div>
    </AppShell>
  )
}
