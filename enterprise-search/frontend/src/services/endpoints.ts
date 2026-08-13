// Centralized endpoint paths. Both the real API client and mock API reference these,
// so changing a path here updates both layers.
//
// Paths are relative to BASE_URL (default http://localhost:8000/api) — the FastAPI
// backend prefixes every route with /api.

export const ENDPOINTS = {
  // Real backend endpoints (FastAPI)
  login: '/auth/login',
  ask: '/ask',
  documents: '/documents',
  document: (id: string) => `/documents/${id}`,
  documentSummary: (id: string) => `/documents/${id}/summary`,
  upload: '/upload',
  health: '/health',

  // Planned backend endpoints — the current backend does not expose these yet.
  // The service layer falls back to mock data for them so the UI never breaks.
  chat: '/chat',
  search: '/search',
  suggestions: '/search/suggestions',
  dashboard: '/dashboard',
  workflow: '/workflow',
} as const;

export type Endpoint = typeof ENDPOINTS[keyof typeof ENDPOINTS] | string;
