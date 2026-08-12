// The single API surface the rest of the app imports. UI code never touches
// mockApi or httpClient directly — it calls these functions.
//
// To go live with a real backend:
//   1. Set VITE_USE_MOCK=false (or flip USE_MOCK below).
//   2. Set VITE_API_BASE_URL to your API origin.
//   3. Ensure the backend implements the contracts in src/types/api.ts.
// No UI changes required.

import type {
  AssistantAction,
  ChatRequest,
  ChatResponse,
  ChatMessage,
  Citation,
  DashboardResponse,
  DocumentResponse,
  DocumentsResponse,
  KnowledgeDocument,
  LoginRequest,
  LoginResponse,
  SearchRequest,
  SearchResponse,
  SuggestionsRequest,
  SuggestionsResponse,
  WorkflowRequest,
  WorkflowResponse,
  ApiError,
  ActionType,
} from '@/types';
import { httpClient } from './apiClient';
import { mockApi } from './mockApi';
import { ENDPOINTS } from './endpoints';

// Toggle. Read from env so it can be flipped at build/deploy time without code edits.
// True by default → the app runs fully on mock data until a backend is available.
export const USE_MOCK =
  (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false';

export const isDemoMode = () => USE_MOCK;

function asApiError(e: unknown): ApiError {
  if (typeof e === 'object' && e !== null && 'message' in e) return e as ApiError;
  return { message: 'Unexpected error', code: 'unknown', demoMode: USE_MOCK };
}

// ---------------------------------------------------------------------------
// Response normalization helpers.
//
// The backend can answer with arbitrary JSON (e.g. { message, actions } or
// { answer, source, chunks }). These helpers extract clean text + action buttons
// so the UI NEVER renders raw JSON, `{}` or `undefined`.
// ---------------------------------------------------------------------------

const ACTION_TYPES: ActionType[] = ['navigate', 'open_document', 'open_modal', 'workflow', 'link'];
const ACTION_VARIANTS = ['primary', 'secondary', 'ghost'];

const uid = () => Math.random().toString(36).slice(2, 11);
const nowISO = () => new Date().toISOString();

function asString(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object' && v !== null) {
    const o = v as Record<string, unknown>;
    const nested = asString(o.text) ?? asString(o.content) ?? asString(o.value);
    return nested;
  }
  return null;
}

function normalizeAction(a: unknown, index: number): AssistantAction | null {
  if (typeof a !== 'object' || a === null) return null;
  const o = a as Record<string, unknown>;
  const label = asString(o.label) ?? asString(o.title);
  if (!label) return null;
  const rawType = String(o.type ?? 'navigate');
  const type: ActionType = (ACTION_TYPES as string[]).includes(rawType) ? (rawType as ActionType) : 'navigate';
  const rawVariant = String(o.variant ?? 'secondary');
  const variant = (ACTION_VARIANTS as string[]).includes(rawVariant) ? (rawVariant as AssistantAction['variant']) : 'secondary';
  return {
    id: asString(o.id) ?? `action-${index}`,
    label,
    type,
    target: asString(o.target) ?? asString(o.path) ?? asString(o.url) ?? '/',
    variant,
    icon: asString(o.icon) ?? undefined,
  };
}

function normalizeCitations(citations: unknown, chunks: unknown): Citation[] {
  const out: Citation[] = [];
  if (Array.isArray(citations)) {
    for (const c of citations) {
      if (typeof c !== 'object' || c === null) continue;
      const o = c as Record<string, unknown>;
      const title = asString(o.title) ?? asString(o.source);
      if (!title) continue;
      out.push({
        documentId: asString(o.documentId) ?? asString(o.id) ?? title,
        title,
        snippet: asString(o.snippet) ?? asString(o.text) ?? '',
      });
    }
  }
  if (Array.isArray(chunks) && out.length === 0) {
    for (const c of chunks) {
      if (typeof c !== 'object' || c === null) continue;
      const o = c as Record<string, unknown>;
      const text = asString(o.text);
      const title = asString(o.source) ?? asString(o.documentTitle) ?? 'Source';
      if (!text) continue;
      out.push({ documentId: title, title, snippet: text.slice(0, 160) });
    }
  }
  return out.slice(0, 4);
}

// Core fix: whatever JSON the backend returns, extract a clean text message and
// turn any `actions` array into buttons. Raw JSON is never passed to the UI.
export function normalizeChatResponse(raw: unknown): ChatResponse {
  const o = (raw ?? {}) as Record<string, unknown>;
  const content =
    asString(o.message) ??
    asString(o.answer) ??
    asString(o.content) ??
    asString(o.text) ??
    'I received a response, but there was nothing to show.';

  const actions = Array.isArray(o.actions)
    ? o.actions.map(normalizeAction).filter((a): a is AssistantAction => a !== null)
    : [];
  const citations = normalizeCitations(o.citations, o.chunks);

  const message: ChatMessage = {
    id: uid(),
    role: 'assistant',
    content,
    actions,
    citations,
    createdAt: nowISO(),
  };
  return { message, sessionId: asString(o.sessionId) ?? uid() };
}

// Backend documents arrive as { id, filename, size_kb, chunks_indexed, status, uploaded_at }.
// Map them into the frontend's KnowledgeDocument shape so pages render cleanly.
function toKnowledgeDocument(d: Record<string, unknown>): KnowledgeDocument {
  const filename = asString(d.filename) ?? 'Untitled document';
  const status = asString(d.status) ?? 'ready';
  return {
    id: asString(d.id) ?? filename,
    title: filename,
    category: 'Other',
    summary:
      status === 'ready'
        ? `Uploaded document · ${Number(d.chunks_indexed) || 0} indexed chunks.`
        : 'This document is still being processed.',
    content: `# ${filename}\n\n_No text preview is available for uploaded PDFs. Ask the assistant a question to get answers sourced from this document._`,
    tags: [],
    updatedAt: asString(d.uploaded_at) ?? nowISO(),
    version: '1.0',
    readTimeMins: 0,
    author: 'Uploaded document',
  };
}

// ---- Real API calls (used when USE_MOCK is false) ----
// The FastAPI backend implements /ask, /documents and /health. Endpoints it does
// not expose yet (search, dashboard, workflows) gracefully fall back to the mock
// so every page keeps working in live mode.
const realApi = {
  async login(req: LoginRequest): Promise<LoginResponse> {
    const { data } = await httpClient.post<LoginResponse>(ENDPOINTS.login, req);
    return data;
  },

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const { data } = await httpClient.post<unknown>(ENDPOINTS.ask, {
      question: req.message,
    });
    return normalizeChatResponse(data);
  },

  async getDocuments(): Promise<DocumentsResponse> {
    const { data } = await httpClient.get<unknown[]>(ENDPOINTS.documents);
    const list = Array.isArray(data) ? data : [];
    return { documents: list.map((d) => toKnowledgeDocument(d as Record<string, unknown>)) };
  },

  async getDocument(id: string): Promise<DocumentResponse> {
    const { documents } = await realApi.getDocuments();
    const document = documents.find((d) => d.id === id);
    if (!document) {
      throw { message: 'Document not found', code: 'not_found', demoMode: false };
    }
    return { document };
  },

  // Not implemented by the backend yet — mock fallback keeps the UI functional.
  async search(req: SearchRequest): Promise<SearchResponse> {
    return mockApi.search(req);
  },
  async getSuggestions(req: SuggestionsRequest): Promise<SuggestionsResponse> {
    return mockApi.getSuggestions(req);
  },
  async getDashboard(): Promise<DashboardResponse> {
    return mockApi.getDashboard();
  },
  async runWorkflow(req: WorkflowRequest): Promise<WorkflowResponse> {
    return mockApi.runWorkflow(req);
  },

  async uploadDocument(file: File, roles?: string[]): Promise<{ id: string; filename: string; status: string }> {
    const form = new FormData();
    form.append('file', file);
    if (roles && roles.length > 0) form.append('roles', JSON.stringify(roles));
    // The instance default Content-Type is application/json; for FormData we must
    // clear it so the browser/axios sets "multipart/form-data" with a boundary.
    const { data } = await httpClient.post<{ id: string; filename: string; status: string }>(
      ENDPOINTS.upload,
      form,
      { headers: { 'Content-Type': undefined } },
    );
    return data;
  },
};

// ---- Facade ----
// Every method wraps in try/catch and returns a typed error on failure so the
// UI can show a graceful "demo mode" banner instead of crashing.

export const apiService = {
  USE_MOCK,

  async login(req: LoginRequest): Promise<LoginResponse> {
    try {
      return USE_MOCK ? await mockApi.login(req) : await realApi.login(req);
    } catch (e) {
      throw asApiError(e);
    }
  },

  async uploadDocument(file: File, roles?: string[]): Promise<{ id: string; filename: string; status: string }> {
    try {
      return USE_MOCK
        ? await mockApi.uploadDocument(file, roles)
        : await realApi.uploadDocument(file, roles);
    } catch (e) {
      throw asApiError(e);
    }
  },

  async chat(req: ChatRequest): Promise<ChatResponse> {
    try {
      return USE_MOCK ? await mockApi.chat(req) : await realApi.chat(req);
    } catch (e) {
      throw asApiError(e);
    }
  },

  async getDocuments(): Promise<DocumentsResponse> {
    try {
      return USE_MOCK ? await mockApi.getDocuments() : await realApi.getDocuments();
    } catch (e) {
      throw asApiError(e);
    }
  },

  async getDocument(id: string): Promise<DocumentResponse> {
    try {
      return USE_MOCK ? await mockApi.getDocument(id) : await realApi.getDocument(id);
    } catch (e) {
      throw asApiError(e);
    }
  },

  async search(req: SearchRequest): Promise<SearchResponse> {
    try {
      return USE_MOCK ? await mockApi.search(req) : await realApi.search(req);
    } catch (e) {
      throw asApiError(e);
    }
  },

  async getSuggestions(req: SuggestionsRequest): Promise<SuggestionsResponse> {
    try {
      return USE_MOCK ? await mockApi.getSuggestions(req) : await realApi.getSuggestions(req);
    } catch (e) {
      throw asApiError(e);
    }
  },

  async getDashboard(): Promise<DashboardResponse> {
    try {
      return USE_MOCK ? await mockApi.getDashboard() : await realApi.getDashboard();
    } catch (e) {
      throw asApiError(e);
    }
  },

  async runWorkflow(req: WorkflowRequest): Promise<WorkflowResponse> {
    try {
      return USE_MOCK ? await mockApi.runWorkflow(req) : await realApi.runWorkflow(req);
    } catch (e) {
      throw asApiError(e);
    }
  },
};
