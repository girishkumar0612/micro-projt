// API request/response contracts. These mirror what a real backend would return.
// The mock API implements these exactly so swapping is a one-line change.

import type {
  AuthUser,
  ChatMessage,
  DashboardStats,
  ActivityItem,
  KnowledgeDocument,
  PopularDocument,
  SearchResult,
  SearchSuggestion,
  WorkflowResult,
  WorkflowId,
} from './domain';

// ---- Auth ----

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  history?: { role: string; content: string }[];
}

export interface ChatResponse {
  message: ChatMessage;
  sessionId: string;
}

export interface SearchRequest {
  query: string;
  limit?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  tookMs: number;
}

export interface SuggestionsRequest {
  query: string;
}

export interface SuggestionsResponse {
  suggestions: SearchSuggestion[];
}

export interface DashboardResponse {
  stats: DashboardStats;
  activity: ActivityItem[];
  popularDocuments: PopularDocument[];
  recentSearches: string[];
}

export interface WorkflowRequest {
  workflowId: WorkflowId;
  payload?: Record<string, unknown>;
}

export interface WorkflowResponse {
  result: WorkflowResult;
}

export interface ApiError {
  message: string;
  code: string;
  demoMode: boolean;
}

export interface DocumentsResponse {
  documents: KnowledgeDocument[];
}

export interface DocumentResponse {
  document: KnowledgeDocument;
}
