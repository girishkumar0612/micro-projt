import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * Wraps a route so only authenticated (and optionally role-matched) users can access it.
 *
 * Props:
 *   requiredRole — "admin" | "employee" | undefined
 *     undefined  → any logged-in user is allowed
 *     "admin"    → only users with role === "admin"
 *     "employee" → any non-admin logged-in user
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const { currentUser } = useAuth()
  const location = useLocation()

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole === 'admin' && currentUser.role !== 'admin') {
    return <Navigate to="/employee/chat" replace />
  }

  if (requiredRole === 'employee' && currentUser.role === 'admin') {
    return <Navigate to="/admin/documents" replace />
  }

  return children
}
