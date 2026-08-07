import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ── RBAC header ──────────────────────────────────────────────────────────────
// Reads the logged-in user from localStorage and attaches:
//   X-User-Role   → used by ALL endpoints for role-based filtering
//   X-Admin-Token → attached only when the role is "admin" (upload / delete)
//
// The admin token is hardcoded here for the MVP demo. In a real system
// this would come from a JWT claim verified on the server.
const DEMO_ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || 'admin123'

axiosClient.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('nexus_user')
    if (raw) {
      const user = JSON.parse(raw)
      if (user?.role) {
        config.headers['X-User-Role'] = user.role
      }
      if (user?.role === 'admin') {
        config.headers['X-Admin-Token'] = DEMO_ADMIN_TOKEN
      }
    }
  } catch {
    // localStorage unavailable — proceed without headers
  }
  return config
})

// ── Error normalisation ───────────────────────────────────────────────────────
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail =
      error.response?.data?.detail ||
      error.message ||
      'Something went wrong. Please try again.'
    return Promise.reject({ ...error, friendlyMessage: detail })
  }
)

export default axiosClient
