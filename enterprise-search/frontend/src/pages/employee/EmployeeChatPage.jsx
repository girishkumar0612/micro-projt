/**
 * Employee Portal — Chat
 *
 * Wraps useChat (now persistent) and passes the conversation history props
 * to the Sidebar via AppShell.  The RBAC filtering continues to happen
 * transparently on the backend via the X-User-Role header.
 */
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import AppShell from '../../components/layout/AppShell'
import ChatBubble from '../../components/chat/ChatBubble'
import ChatInput from '../../components/chat/ChatInput'
import TypingIndicator from '../../components/chat/TypingIndicator'
import { useChat } from '../../hooks/useChat'

const SUGGESTIONS = [
  'How many casual leaves are allowed?',
  'What is the reimbursement policy for travel?',
  "Summarize the company's remote work policy.",
]

export default function EmployeeChatPage() {
  const { currentUser } = useAuth()
  const {
    messages,
    isThinking,
    conversationId,
    sendMessage,
    loadConversation,
    clearChat,
  } = useChat()
  const bottomRef = useRef(null)

  // Bumped after every sent message or new chat to refresh the sidebar list
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0)

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  // After a message is sent and the backend returns a conversation_id,
  // nudge the sidebar to re-fetch its list.
  const prevConvIdRef = useRef(null)
  useEffect(() => {
    if (conversationId && conversationId !== prevConvIdRef.current) {
      prevConvIdRef.current = conversationId
      setHistoryRefreshTrigger((n) => n + 1)
    }
  }, [conversationId])

  const handleSend = async (question) => {
    await sendMessage(question)
    // Trigger a sidebar refresh after the message round-trip so the
    // conversation title shows up (the backend sets it on first message).
    setHistoryRefreshTrigger((n) => n + 1)
  }

  const handleNewChat = () => {
    clearChat()
    setHistoryRefreshTrigger((n) => n + 1)
  }

  const handleSelectConversation = async (id) => {
    await loadConversation(id)
  }

  const handleConversationDeleted = (deletedId) => {
    // If the deleted conversation is the active one, start fresh
    if (deletedId === conversationId) {
      clearChat()
    }
    setHistoryRefreshTrigger((n) => n + 1)
  }

  return (
    <AppShell
      title="Ask a question"
      sidebarProps={{
        onNewChat: handleNewChat,
        onSelectConversation: handleSelectConversation,
        activeConversationId: conversationId,
        historyRefreshTrigger,
        onConversationDeleted: handleConversationDeleted,
      }}
    >
      <div className="flex flex-col h-full max-w-3xl mx-auto w-full px-4 md:px-0">
        <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-5">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center py-16"
            >
              <div className="h-12 w-12 rounded-2xl bg-brand-gradient flex items-center justify-center mb-4 animate-pulseGlow">
                <Sparkles size={20} className="text-white" />
              </div>
              <h2 className="font-display text-lg font-semibold text-ink">
                Hi {currentUser?.name?.split(' ')[0]}, ask anything about your documents
              </h2>
              <p className="text-sm text-ink-soft mt-1.5 max-w-sm">
                You can only access documents permitted for your role ({currentUser?.role}).
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-6 max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="text-xs rounded-full border border-ink/10 bg-white px-3.5 py-2 text-ink-soft
                      hover:border-brand-indigo/40 hover:text-brand-indigo transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
              {messages.map((m) => (
                <ChatBubble key={m.id} message={m} />
              ))}
              {isThinking && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 shrink-0 rounded-full bg-brand-gradient flex items-center justify-center">
                    <Sparkles size={15} className="text-white" />
                  </div>
                  <TypingIndicator />
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="sticky bottom-0 pb-5 pt-2 bg-gradient-to-t from-canvas via-canvas to-transparent">
          <ChatInput onSend={handleSend} disabled={isThinking} />
          <p className="text-[11px] text-ink-faint text-center mt-2">
            Nexus answers only from documents your role ({currentUser?.role}) is permitted to access.
          </p>
        </div>
      </div>
    </AppShell>
  )
}
