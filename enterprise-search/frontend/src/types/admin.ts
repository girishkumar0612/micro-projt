// Admin module types — Monitoring + Document Management.
// Keep these aligned with the shapes a real backend would return so the
// service layer can be swapped from mock to live with no UI changes.

// ---- Monitoring ----

export type EventResult = 'Success' | 'Blocked';

export interface MonitoringSummary {
  totalQueries: number;
  queriesToday: number;
  activeUsers: number;
  conversations: number;
  successful: number;
  failed: number;
}

export type SecurityEventType =
  | 'rbac_denied'
  | 'unauthorized'
  | 'prompt_injection'
  | 'out_of_scope'
  | 'guardrail_block';

export interface SecurityEvent {
  type: SecurityEventType;
  label: string;
  count: number;
  delta: string;
}

export type DocumentActivityType =
  | 'upload'
  | 'duplicate'
  | 'delete'
  | 'access_change'
  | 'summary';

export interface DocumentActivityItem {
  type: DocumentActivityType;
  label: string;
  count: number;
  tone: 'success' | 'warn' | 'danger' | 'info';
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string; // ISO
  user: string;
  role: string;
  event: string;
  document: string | null;
  detail: string;
  result: EventResult;
}

export interface MonitoringResponse {
  summary: MonitoringSummary;
  securityEvents: SecurityEvent[];
  documentActivity: DocumentActivityItem[];
  log: ActivityLogEntry[];
}

// ---- Document management ----

export type DocumentAccess = 'Confidential' | 'Internal';
export type AdminDocumentStatus = 'ready' | 'processing' | 'failed';

export interface AdminDocument {
  id: string;
  name: string;
  size_kb: number;
  chunks: number;
  department: string;
  access: DocumentAccess;
  roles: string[];
  uploaded_at: string; // ISO
  status: AdminDocumentStatus;
  /** Auto-generated executive summary ('' = not generated yet). */
  summary?: string;
}

export interface AdminDocumentsResponse {
  documents: AdminDocument[];
  total: number;
}

export interface UploadResult {
  id: string;
  name: string;
  status: AdminDocumentStatus;
  message: string;
  department: string;
  access: DocumentAccess;
  /** Executive summary generated for the uploaded document. */
  summary?: string;
}
