import { useState, useCallback, useEffect } from 'react'
import axiosClient from '../api/axiosClient'

export function useDocuments() {
  const [documents, setDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await axiosClient.get('/documents')
      setDocuments(res.data)
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load documents.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // deleteDocument is only called from the admin page; the backend
  // still validates X-Admin-Token before allowing the delete.
  const deleteDocument = useCallback(async (id) => {
    await axiosClient.delete(`/documents/${id}`)
    setDocuments((prev) => prev.filter((d) => d.id !== id))
  }, [])

  // updateDocumentAccess patches only department + allowed_roles.
  // The backend enforces admin-only via X-Admin-Token.
  // Returns the updated document so the caller can patch local state.
  const updateDocumentAccess = useCallback(async (id, { department, allowed_roles }) => {
    const res = await axiosClient.patch(`/documents/${id}/access`, {
      department,
      allowed_roles,
    })
    // Patch the document in the local list so the table updates immediately
    // without a full re-fetch.
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...res.data } : d))
    )
    return res.data
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  return { documents, isLoading, error, fetchDocuments, deleteDocument, updateDocumentAccess }
}
