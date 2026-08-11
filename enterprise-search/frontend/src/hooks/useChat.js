/**
 * useChat — persistent chat hook.
 *
 * - Each exchange is saved to the backend and associated with the current
 *   user's conversation history.
 * - Supports loading an existing conversation from history.
 * - "New Chat" clears the local state so the next message creates a fresh
 *   conversation on the backend.
 * - All error messages (access-restricted, LLM errors, guardrails, etc.) are
 *   preserved and re-hydrated from the backend on reload.
 */
import { useState, useCallback } from 'react'
import axiosClient from '../api/axiosClient'
import { getConversation } from '../api/conversationsApi'

let idCounter = 0
const nextId = () => `msg_${Date.now()}_${idCounter++}`

/**
 * Convert a raw message object from the backend into the local shape
 * expected by ChatBubble.
 */
function hydrateMessage(raw) {
  let chunks = []
  try {
    chunks = JSON.parse(raw.sources_json || '[]')
  } catch {
    chunks = []
  }
  return {
    id: raw.id || nextId(),
    role: raw.role,
    text: raw.content,
    source: raw.source || null,
    chunks,
    error: raw.is_error || false,
    errorCode: raw.error_code || null,
  }
}

export function useChat() {
  // Current in-memory messages array (displayed in ChatBubble list)
  const [messages, setMessages] = useState([])
  // The backend conversation_id currently active (null = no conversation yet)
  const [conversationId, setConversationId] = useState(null)
  const [isThinking, setIsThinking] = useState(false)

  // ── Send a message ──────────────────────────────────────────────────────
  const sendMessage = useCallback(async (question) => {
    const trimmed = question.trim()
    if (!trimmed) return

    // Optimistically add the user bubble immediately
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: trimmed }])
    setIsThinking(true)

    try {
      const res = await axiosClient.post('/ask', {
        question: trimmed,
        // Pass the active conversation_id so subsequent messages are appended
        // to the same conversation.  null → backend creates a new one.
        conversation_id: conversationId ?? undefined,
      })
      const { answer, source, chunks, conversation_id } = res.data

      // Persist the conversation_id returned by the backend
      if (conversation_id && !conversationId) {
        setConversationId(conversation_id)
      }

      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'assistant',
          text: answer,
          source,
          chunks: chunks || [],
        },
      ])
    } catch (err) {
      // Error responses are persisted by the backend; surface them in the UI
      // and keep the conversation_id if we already have one so the history
      // entry stays open.
      const code = err.response?.data?.code || null
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'assistant',
          text: err.friendlyMessage || 'Something went wrong answering that question.',
          error: true,
          errorCode: code,
        },
      ])
    } finally {
      setIsThinking(false)
    }
  }, [conversationId])

  // ── Load a conversation from history ────────────────────────────────────
  const loadConversation = useCallback(async (id) => {
    if (!id) return
    try {
      const conv = await getConversation(id)
      setConversationId(conv.id)
      setMessages(conv.messages.map(hydrateMessage))
    } catch (err) {
      // 404 = conversation doesn't belong to this user (or deleted).
      // Silently start fresh rather than exposing the error.
      console.warn('Could not load conversation:', err?.friendlyMessage)
      setConversationId(null)
      setMessages([])
    }
  }, [])

  // ── New Chat ─────────────────────────────────────────────────────────────
  const clearChat = useCallback(() => {
    setMessages([])
    setConversationId(null)
  }, [])

  return {
    messages,
    isThinking,
    conversationId,
    sendMessage,
    loadConversation,
    clearChat,
  }
}
