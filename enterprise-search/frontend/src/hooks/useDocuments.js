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

  const uploadDocument = useCallback(
    async (file, onProgress) => {
      const formData = new FormData()
      formData.append('file', file)
      await axiosClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (onProgress && evt.total) {
            onProgress(Math.round((evt.loaded / evt.total) * 100))
          }
        },
      })
      await fetchDocuments()
    },
    [fetchDocuments]
  )

  const deleteDocument = useCallback(
    async (id) => {
      await axiosClient.delete(`/documents/${id}`)
      setDocuments((prev) => prev.filter((d) => d.id !== id))
    },
    []
  )

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  return { documents, isLoading, error, fetchDocuments, uploadDocument, deleteDocument }
}
