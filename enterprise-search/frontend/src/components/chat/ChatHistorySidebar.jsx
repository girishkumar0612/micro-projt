/**
 * ChatHistorySidebar
 *
 * Shows the user's persisted conversation list under "Chat History" in the
 * sidebar. Clicking a conversation loads it; the active one is highlighted.
 * A trash icon on hover allows deletion.
 */
import { useEffect, useState, useCallback } from 'react'
import { Trash2, MessageSquare, Loader2 } from 'lucide-react'
import { listConversations, deleteConversation } from '../../api/conversationsApi'

export default function ChatHistorySidebar({
  activeConversationId,
  onSelect,
  onDelete,
  refreshTrigger,
}) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listConversations()
      setConversations(data)
    } catch {
      // Silently ignore — history is supplementary
    } finally {
      setLoading(false)
    }
  }, [])

  // Reload whenever the parent signals a change (new message sent, conversation
  // deleted, new chat started) via the refreshTrigger counter.
  useEffect(() => {
    fetchHistory()
  }, [fetchHistory, refreshTrigger])

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    setDeletingId(id)
    try {
      await deleteConversation(id)
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (onDelete) onDelete(id)
    } catch {
      // ignore
    } finally {
      setDeletingId(null)
    }
  }

  if (loading && conversations.length === 0) {
    return (
      <div className="flex items-center gap-2 px-2 py-3 text-xs text-ink-faint">
        <Loader2 size={12} className="animate-spin" />
        Loading history…
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <p className="text-xs text-ink-faint px-2">No conversations yet.</p>
    )
  }

  return (
    <ul className="flex flex-col gap-0.5">
      {conversations.map((conv) => {
        const isActive = conv.id === activeConversationId
        return (
          <li
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors
              ${isActive
                ? 'bg-white/15 text-white'
                : 'text-ink-faint hover:bg-white/5 hover:text-white'
              }`}
          >
            <MessageSquare size={13} className="shrink-0 opacity-60" />
            <span className="flex-1 text-xs truncate" title={conv.title}>
              {conv.title}
            </span>
            {/* Delete button — visible on hover */}
            <button
              onClick={(e) => handleDelete(e, conv.id)}
              title="Delete conversation"
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity
                p-0.5 rounded hover:text-state-danger"
            >
              {deletingId === conv.id
                ? <Loader2 size={12} className="animate-spin" />
                : <Trash2 size={12} />
              }
            </button>
          </li>
        )
      })}
    </ul>
  )
}
