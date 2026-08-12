// Real HTTP client built on axios. Currently dormant — the app uses mockApi while
// USE_MOCK is true. When a backend is ready, flip USE_MOCK in apiService.ts to false
// and this client takes over with zero UI changes.

import axios, { type AxiosInstance, AxiosError } from 'axios';
import type { ApiError } from '@/types';

// Defaults to the local FastAPI backend (matching the backend's CORS config for
// http://localhost:5173). Override with VITE_API_BASE_URL in production.
export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';

export const httpClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // RAG answers can take a while on first request
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Info': 'atlas-web/1.0',
  },
});

// Attach auth headers if present:
// - Bearer token for future user sessions.
// - X-Admin-Token for admin-only endpoints (upload / delete) as required by the backend.
httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('atlas.auth.token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const adminToken = localStorage.getItem('atlas.admin.token');
  if (adminToken) {
    config.headers['X-Admin-Token'] = adminToken;
  }
  return config;
});

// Normalize errors into our ApiError shape so the UI never sees axios internals.
// The backend responds with { error, detail, code }; axios errors carry their own message.
// A 401 means the session token is invalid or stale (e.g. the backend restarted /
// its token DB changed) — clear the session so the router redirects to /login.
httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; detail?: string; code?: string }>) => {
    const status = error.response?.status;
    if (status === 401) {
      void import('@/store/authStore').then(({ useAuthStore }) =>
        useAuthStore.getState().logout(),
      );
    }
    const data = error.response?.data as
      | { message?: unknown; detail?: unknown; code?: unknown }
      | undefined;
    // FastAPI validation errors arrive as { detail: [{ type, loc, msg, input }, ...] }.
    // Coerce to a single readable string so the UI never renders raw objects.
    let message: string | undefined;
    if (typeof data?.message === 'string') message = data.message;
    else if (typeof data?.detail === 'string') message = data.detail;
    else if (Array.isArray(data?.detail)) {
      message = data.detail
        .map((d: { msg?: unknown }) => (typeof d?.msg === 'string' ? d.msg : 'Invalid input'))
        .join(' ');
    }
    const normalized: ApiError = {
      message:
        message ??
        (error.response ? 'Something went wrong. Please try again.' : "We couldn't reach the knowledge service. Please check your connection and try again."),
      code: typeof data?.code === 'string' ? data.code : String(error.code ?? 'unknown_error'),
      demoMode: false,
    };
    return Promise.reject(normalized);
  },
);
