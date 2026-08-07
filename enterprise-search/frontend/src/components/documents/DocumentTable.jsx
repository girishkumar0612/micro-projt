import { FileText, Trash2, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const STATUS_STYLES = {
  ready:    'bg-state-success/10 text-state-success',
  indexing: 'bg-state-warning/10 text-state-warning',
  failed:   'bg-state-danger/10 text-state-danger',
}

const ACCESS_STYLES = {
  public:       'bg-state-success/10 text-state-success',
  internal:     'bg-state-warning/10 text-state-warning',
  confidential: 'bg-state-danger/10 text-state-danger',
}

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export default function DocumentTable({ documents, isLoading, onDelete, isAdmin, showMeta = false }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-ink-faint gap-2">
        <Loader2 size={18} className="animate-spin" /> Loading documents…
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-16 rounded-2xl border border-dashed border-ink/10 bg-white">
        <FileText size={28} className="mx-auto mb-3 text-ink-faint" />
        <p className="text-sm text-ink-soft font-medium">No documents available</p>
        <p className="text-xs text-ink-faint mt-1">
          {isAdmin ? 'Upload a PDF above to make it searchable.' : 'No documents have been shared with your role yet.'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-ink/5 bg-white overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/5 text-left text-xs uppercase tracking-wider text-ink-faint">
              <th className="px-5 py-3 font-medium">Document</th>
              <th className="px-5 py-3 font-medium hidden sm:table-cell">Size</th>
              <th className="px-5 py-3 font-medium hidden md:table-cell">Chunks</th>
              {showMeta && <th className="px-5 py-3 font-medium hidden lg:table-cell">Department</th>}
              {showMeta && <th className="px-5 py-3 font-medium hidden lg:table-cell">Access</th>}
              {showMeta && <th className="px-5 py-3 font-medium hidden xl:table-cell">Roles</th>}
              <th className="px-5 py-3 font-medium hidden sm:table-cell">Uploaded</th>
              <th className="px-5 py-3 font-medium">Status</th>
              {isAdmin && <th className="px-5 py-3 font-medium text-right">Action</th>}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {documents.map((doc) => (
                <motion.tr
                  key={doc.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="border-b border-ink/5 last:border-0 hover:bg-canvas/60 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-brand-gradient-soft flex items-center justify-center shrink-0">
                        <FileText size={14} className="text-brand-indigo" />
                      </div>
                      <span className="font-medium text-ink truncate max-w-[180px]">{doc.filename}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-ink-soft hidden sm:table-cell">{doc.size_kb} KB</td>
                  <td className="px-5 py-3.5 text-ink-soft hidden md:table-cell">{doc.chunks_indexed}</td>
                  {showMeta && (
                    <td className="px-5 py-3.5 text-ink-soft hidden lg:table-cell text-xs">{doc.department}</td>
                  )}
                  {showMeta && (
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ACCESS_STYLES[doc.access_level] || 'bg-ink/5 text-ink-soft'}`}>
                        {doc.access_level}
                      </span>
                    </td>
                  )}
                  {showMeta && (
                    <td className="px-5 py-3.5 hidden xl:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {doc.allowed_roles?.split(',').map((r) => (
                          <span key={r} className="rounded-full bg-brand-gradient-soft text-brand-indigo text-[10px] font-medium px-2 py-0.5 capitalize">
                            {r.trim()}
                          </span>
                        ))}
                      </div>
                    </td>
                  )}
                  <td className="px-5 py-3.5 text-ink-soft hidden sm:table-cell text-xs">{formatDate(doc.uploaded_at)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[doc.status] || 'bg-ink/5 text-ink-soft'}`}>
                      {doc.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => onDelete(doc)}
                        className="text-ink-faint hover:text-state-danger transition-colors p-1.5 rounded-lg hover:bg-state-danger/5"
                        aria-label={`Delete ${doc.filename}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  )
}
