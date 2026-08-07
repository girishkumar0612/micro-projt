import { createContext, useContext, useState, useCallback } from 'react'
import { setAdminToken } from '../api/axiosClient'

const AdminContext = createContext(null)

export function AdminProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false)

  // Unlocks admin mode by storing the token in memory only (never persisted).
  // The actual validity is confirmed server-side on the next admin action.
  const unlock = useCallback((token) => {
    setAdminToken(token)
    setIsAdmin(true)
  }, [])

  const lock = useCallback(() => {
    setAdminToken(null)
    setIsAdmin(false)
  }, [])

  return (
    <AdminContext.Provider value={{ isAdmin, unlock, lock }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider')
  return ctx
}
