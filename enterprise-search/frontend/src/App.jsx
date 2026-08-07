import AppRouter from './router/AppRouter'
import { AdminProvider } from './context/AdminContext'
import { ToastProvider } from './components/common/Toast'

export default function App() {
  return (
    <AdminProvider>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </AdminProvider>
  )
}
