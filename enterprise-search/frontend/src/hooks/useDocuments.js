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

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  return { documents, isLoading, error, fetchDocuments, deleteDocument }
}
