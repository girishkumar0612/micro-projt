import { useState, useCallback } from 'react'
import axiosClient from '../api/axiosClient'

let idCounter = 0
const nextId = () => `msg_${Date.now()}_${idCounter++}`

/**
 * In-memory chat session (no persistence, per project decision).
 * messages: [{ id, role: 'user' | 'assistant', text, source?, chunks?, error? }]
 */
export function useChat() {
  const [messages, setMessages] = useState([])
  const [isThinking, setIsThinking] = useState(false)

  const sendMessage = useCallback(async (question) => {
    const trimmed = question.trim()
    if (!trimmed) return

    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: trimmed }])
    setIsThinking(true)

    try {
      const res = await axiosClient.post('/ask', { question: trimmed })
      const { answer, source, chunks } = res.data
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'assistant', text: answer, source, chunks: chunks || [] },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'assistant',
          text: err.friendlyMessage || 'Something went wrong answering that question.',
          error: true,
        },
      ])
    } finally {
      setIsThinking(false)
    }
  }, [])

  const clearChat = useCallback(() => setMessages([]), [])

  return { messages, isThinking, sendMessage, clearChat }
}
