// Admin → Monitoring service.
//
// Currently serves MOCK data shaped like a real API response so the page works
// standalone. To connect a live backend later, replace the bodies of the
// exported functions with httpClient calls (see src/services/apiClient.ts) —
// no component changes required.

import type {
  ActivityLogEntry,
  DocumentActivityItem,
  MonitoringResponse,
  SecurityEvent,
} from '@/types';

// Small artificial delay so loading states are visible and honest.
const LATENCY_MS = 350;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

export const MONITORING_EVENTS = [
  'all',
  'Query',
  'RBAC denied',
  'Unauthorized access',
  'Prompt injection',
  'Out-of-scope query',
  'Guardrail block',
  'Policy upload',
  'Duplicate attempt',
  'Deletion',
  'Access change',
  'Summary generation',
] as const;

const MOCK_SECURITY_EVENTS: SecurityEvent[] = [
  { type: 'rbac_denied', label: 'RBAC access denied', count: 14, delta: '+3 today' },
  { type: 'unauthorized', label: 'Unauthorized access', count: 6, delta: '+1 today' },
  { type: 'prompt_injection', label: 'Prompt injection attempts', count: 9, delta: '+4 today' },
  { type: 'out_of_scope', label: 'Out-of-scope queries', count: 22, delta: '+5 today' },
  { type: 'guardrail_block', label: 'Guardrail blocks', count: 11, delta: '+2 today' },
];

const MOCK_DOCUMENT_ACTIVITY: DocumentActivityItem[] = [
  { type: 'upload', label: 'Policy uploads', count: 38, tone: 'success' },
  { type: 'duplicate', label: 'Duplicate attempts', count: 7, tone: 'warn' },
  { type: 'delete', label: 'Deletions', count: 4, tone: 'danger' },
  { type: 'access_change', label: 'Access / role changes', count: 12, tone: 'info' },
  { type: 'summary', label: 'Summary generations', count: 51, tone: 'info' },
];

const MOCK_LOG: ActivityLogEntry[] = [
  {
    id: 'm1',
    timestamp: '2026-08-12T08:47:00Z',
    user: 'alex.morgan',
    role: 'hr',
    event: 'Query',
    document: 'Leave Policy',
    detail: '"How many sick days do I have left?" answered from 3 chunks.',
    result: 'Success',
  },
  {
    id: 'm2',
    timestamp: '2026-08-12T08:31:00Z',
    user: 'dev.patel',
    role: 'employee',
    event: 'RBAC denied',
    document: 'Executive Comp Plan',
    detail: 'Tried to open a Confidential document outside allowed roles.',
    result: 'Blocked',
  },
  {
    id: 'm3',
    timestamp: '2026-08-12T08:12:00Z',
    user: 'system',
    role: 'guardrail',
    event: 'Prompt injection',
    document: null,
    detail: 'Attempted system-prompt override detected and neutralized.',
    result: 'Blocked',
  },
  {
    id: 'm4',
    timestamp: '2026-08-12T07:58:00Z',
    user: 'sana.rao',
    role: 'operations',
    event: 'Out-of-scope query',
    document: null,
    detail: 'Question outside company corpus — refused without source.',
    result: 'Blocked',
  },
  {
    id: 'm5',
    timestamp: '2026-08-12T07:40:00Z',
    user: 'maria.g',
    role: 'admin',
    event: 'Policy upload',
    document: 'Code of Conduct v2.5',
    detail: 'PDF uploaded, 6 chunks indexed, visible to all roles.',
    result: 'Success',
  },
  {
    id: 'm6',
    timestamp: '2026-08-12T07:22:00Z',
    user: 'jake.l',
    role: 'finance',
    event: 'Duplicate attempt',
    document: 'Expense Policy 2026.pdf',
    detail: 'Rejected — identical hash already present in the library.',
    result: 'Blocked',
  },
  {
    id: 'm7',
    timestamp: '2026-08-12T06:55:00Z',
    user: 'maria.g',
    role: 'admin',
    event: 'Access change',
    document: 'Security Handbook',
    detail: 'Restricted visibility to roles: security, it.',
    result: 'Success',
  },
  {
    id: 'm8',
    timestamp: '2026-08-11T18:12:00Z',
    user: 'nina.k',
    role: 'legal',
    event: 'Summary generation',
    document: 'NDA Master Template',
    detail: 'Auto-generated 2-page executive summary.',
    result: 'Success',
  },
  {
    id: 'm9',
    timestamp: '2026-08-11T17:30:00Z',
    user: 'dev.patel',
    role: 'employee',
    event: 'Unauthorized access',
    document: 'Merger Plans (Draft)',
    detail: 'Direct API call with insufficient privileges blocked.',
    result: 'Blocked',
  },
  {
    id: 'm10',
    timestamp: '2026-08-11T16:44:00Z',
    user: 'alex.morgan',
    role: 'hr',
    event: 'Deletion',
    document: 'Outdated Benefits 2021.pdf',
    detail: 'Removed from library and vector store (6 chunks).',
    result: 'Success',
  },
  {
    id: 'm11',
    timestamp: '2026-08-11T15:20:00Z',
    user: 'omar.f',
    role: 'manager',
    event: 'Guardrail block',
    document: null,
    detail: 'Request to reveal other employees\' salaries — refused by policy.',
    result: 'Blocked',
  },
  {
    id: 'm12',
    timestamp: '2026-08-11T14:05:00Z',
    user: 'system',
    role: 'guardrail',
    event: 'Prompt injection',
    document: null,
    detail: 'Jailbreak-style payload in chat input detected.',
    result: 'Blocked',
  },
  {
    id: 'm13',
    timestamp: '2026-08-11T13:12:00Z',
    user: 'sana.rao',
    role: 'operations',
    event: 'Query',
    document: 'Procurement & Vendor Mgmt',
    detail: 'Asked about PO approval thresholds — 2 chunks cited.',
    result: 'Success',
  },
  {
    id: 'm14',
    timestamp: '2026-08-11T11:48:00Z',
    user: 'maria.g',
    role: 'admin',
    event: 'Access change',
    document: 'Executive Comp Plan',
    detail: 'Set access to Confidential; roles: admin, finance.',
    result: 'Success',
  },
  {
    id: 'm15',
    timestamp: '2026-08-11T09:30:00Z',
    user: 'jake.l',
    role: 'finance',
    event: 'Query',
    document: 'Expense Policy',
    detail: 'Reimbursement cutoff question answered.',
    result: 'Success',
  },
];

const MOCK_RESPONSE: MonitoringResponse = {
  summary: {
    totalQueries: 1284,
    queriesToday: 96,
    activeUsers: 42,
    conversations: 318,
    successful: 1196,
    failed: 88,
  },
  securityEvents: MOCK_SECURITY_EVENTS,
  documentActivity: MOCK_DOCUMENT_ACTIVITY,
  log: MOCK_LOG,
};

export async function getMonitoringSummary(): Promise<MonitoringResponse> {
  // TODO: replace with `httpClient.get<MonitoringResponse>(ENDPOINTS.adminMonitoring)`
  // when the backend exposes GET /admin/monitoring.
  return delay(MOCK_RESPONSE);
}
