/**
 * AuthContext — hardcoded users, localStorage session.
 * This is a college MVP RBAC demo; no real auth server needed.
 *
 * Hardcoded user roster:
 *   admin    / admin123     → role: admin
 *   bob      / bob123       → role: hr
 *   carol    / carol123     → role: finance
 *   dave     / dave123      → role: it
 *   eve      / eve123       → role: marketing
 *   frank    / frank123     → role: operations
 */
import { createContext, useContext, useState, useCallback } from 'react'

const USERS = [
  { id: 'u1', username: 'admin', password: 'admin123', name: 'Admin User',    role: 'admin',      department: 'Administration' },
  { id: 'u3', username: 'bob',   password: 'bob123',   name: 'Bob Smith',     role: 'hr',         department: 'Human Resources' },
  { id: 'u4', username: 'carol', password: 'carol123', name: 'Carol White',   role: 'finance',    department: 'Finance' },
  { id: 'u5', username: 'dave',  password: 'dave123',  name: 'Dave Lee',      role: 'it',         department: 'IT' },
  { id: 'u6', username: 'eve',   password: 'eve123',   name: 'Eve Garcia',    role: 'marketing',  department: 'Marketing' },
  { id: 'u7', username: 'frank', password: 'frank123', name: 'Frank Torres',  role: 'operations', department: 'Operations' },
]

const STORAGE_KEY = 'nexus_user'

const AuthContext = createContext(null)

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(loadStoredUser)

  const login = useCallback((username, password) => {
    const user = USERS.find(
      (u) => u.username === username.trim() && u.password === password
    )
    if (!user) {
      return { success: false, error: 'Invalid username or password.' }
    }
    // Store without password
    const { password: _pw, ...safeUser } = user
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeUser))
    setCurrentUser(safeUser)
    return { success: true, user: safeUser }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setCurrentUser(null)
  }, [])

  const isAdmin = currentUser?.role === 'admin'

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
