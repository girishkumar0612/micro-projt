/**
 * Conversation history API helpers.
 * All calls go through axiosClient which automatically attaches
 * X-User-Role and X-User-Id headers from localStorage.
 */
import axiosClient from './axiosClient'

/**
 * Fetch the current user's conversation list (newest first).
 * @returns {Promise<Array<{id, title, created_at, updated_at}>>}
 */
export async function listConversations() {
  const res = await axiosClient.get('/conversations')
  return res.data
}

/**
 * Load a single conversation with all its messages.
 * The backend verifies ownership — a 404 is returned for any ID
 * that doesn't belong to the current user.
 * @param {string} conversationId
 * @returns {Promise<{id, title, created_at, updated_at, messages: Array}>}
 */
export async function getConversation(conversationId) {
  const res = await axiosClient.get(`/conversations/${conversationId}`)
  return res.data
}

/**
 * Delete a conversation (and all its messages) by ID.
 * Only the owning user may delete their own conversations.
 * @param {string} conversationId
 */
export async function deleteConversation(conversationId) {
  const res = await axiosClient.delete(`/conversations/${conversationId}`)
  return res.data
}
