// Core domain models shared across the app.

export type ID = string;

export type DocumentCategory =
  | 'HR'
  | 'IT'
  | 'Finance'
  | 'Legal'
  | 'Operations'
  | 'Security'
  | 'Other';

export interface KnowledgeDocument {
  id: ID;
  title: string;
  category: DocumentCategory;
  summary: string;
  content: string;
  tags: string[];
  updatedAt: string; // ISO
  version: string;
  readTimeMins: number;
  author: string;
  /** Roles allowed to see this document. Empty/undefined = everyone. */
  roles?: string[];
}

// ---- Auth ----

export interface AuthUser {
  username: string;
  role: string;
  displayName: string;
}

export interface DocumentSnippet {
  id: ID;
  title: string;
  category: DocumentCategory;
  summary: string;
  updatedAt: string;
  readTimeMins: number;
}

// ---- Chat ----

export type MessageRole = 'user' | 'assistant' | 'system';

export type ActionType = 'navigate' | 'open_document' | 'open_modal' | 'workflow' | 'link';

export interface AssistantAction {
  id: ID;
  label: string;
  type: ActionType;
  target: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: string;
}

export interface Citation {
  documentId: ID;
  title: string;
  snippet: string;
}

export interface ChatMessage {
  id: ID;
  role: MessageRole;
  content: string;
  actions?: AssistantAction[];
  citations?: Citation[];
  createdAt: string;
  pending?: boolean;
  error?: boolean;
}

export interface ChatSession {
  id: ID;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

// ---- Search ----

export interface SearchSuggestion {
  text: string;
  category?: DocumentCategory;
  source: 'recent' | 'popular' | 'document' | 'ai';
}

export interface SearchResult {
  documentId: ID;
  title: string;
  category: DocumentCategory;
  snippet: string;
  score: number;
  updatedAt: string;
}

// ---- Dashboard ----

export interface ActivityItem {
  id: ID;
  type: 'search' | 'chat' | 'document_view' | 'action';
  label: string;
  detail?: string;
  timestamp: string;
}

export interface DashboardStats {
  totalDocuments: number;
  totalChats: number;
  actionsTaken: number;
  avgResponseMs: number;
}

export interface PopularDocument {
  documentId: ID;
  title: string;
  category: DocumentCategory;
  views: number;
}

// ---- Workflows ----
// Actions with type "workflow" map to these known workflows.
export type WorkflowId = 'apply_leave' | 'contact_hr' | 'request_equipment' | 'report_issue';

export interface WorkflowResult {
  id: ID;
  workflowId: WorkflowId;
  status: 'started' | 'completed' | 'failed';
  message: string;
  createdAt: string;
}
