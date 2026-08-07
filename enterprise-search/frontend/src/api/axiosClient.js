import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attaches the admin token (kept only in memory, not localStorage) to
// requests when present. Set via AdminContext -> setAdminToken().
let adminToken = null
export function setAdminToken(token) {
  adminToken = token
}
export function getAdminToken() {
  return adminToken
}

axiosClient.interceptors.request.use((config) => {
  if (adminToken) {
    config.headers['X-Admin-Token'] = adminToken
  }
  return config
})

// Normalizes backend error envelope { error, detail, code } into a
// single readable message for the UI.
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
