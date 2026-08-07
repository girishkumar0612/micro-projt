import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ProtectedRoute from '../components/auth/ProtectedRoute'

import LoginPage         from '../pages/LoginPage'
import LandingPage       from '../pages/LandingPage'
import AdminDocumentsPage from '../pages/admin/AdminDocumentsPage'
import EmployeeChatPage  from '../pages/employee/EmployeeChatPage'
import EmployeeDocsPage  from '../pages/employee/EmployeeDocsPage'

function RootRedirect() {
  const { currentUser } = useAuth()
  if (!currentUser) return <Navigate to="/login" replace />
  if (currentUser.role === 'admin') return <Navigate to="/admin/documents" replace />
  return <Navigate to="/employee/chat" replace />
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Root — smart redirect based on role */}
        <Route path="/" element={<RootRedirect />} />

        {/* Legacy routes kept working so bookmarks don't break */}
        <Route path="/home" element={<LandingPage />} />

        {/* Admin portal */}
        <Route
          path="/admin/documents"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDocumentsPage />
            </ProtectedRoute>
          }
        />

        {/* Employee portal */}
        <Route
          path="/employee/chat"
          element={
            <ProtectedRoute requiredRole="employee">
              <EmployeeChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/documents"
          element={
            <ProtectedRoute requiredRole="employee">
              <EmployeeDocsPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
