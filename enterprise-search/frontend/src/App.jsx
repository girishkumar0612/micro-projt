import AppRouter from './router/AppRouter'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/common/Toast'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </AuthProvider>
  )
}
