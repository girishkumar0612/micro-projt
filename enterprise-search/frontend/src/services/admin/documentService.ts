// Admin → Document management service.
//
// Currently serves MOCK data shaped like a real API response. To connect a live
// backend later, replace the function bodies with httpClient calls — the
// UploadDropzone and DocumentTable components need no changes.

import type { AdminDocument, AdminDocumentsResponse, UploadResult } from '@/types';

// Small artificial delay so loading/uploading states are visible and honest.
const LATENCY_MS = 400;

function delay<T>(value: T, ms = LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const MAX_UPLOAD_MB = 20;

const MOCK_ADMIN_DOCUMENTS: AdminDocument[] = [
  {
    id: 'd1',
    name: 'Employee Handbook 2026.pdf',
    size_kb: 1420,
    chunks: 34,
    department: 'HR',
    access: 'Internal',
    roles: [],
    uploaded_at: '2026-08-10T09:12:00Z',
    status: 'ready',
  },
  {
    id: 'd2',
    name: 'Code of Conduct v2.5.pdf',
    size_kb: 612,
    chunks: 16,
    department: 'Legal',
    access: 'Internal',
    roles: ['hr', 'legal', 'manager'],
    uploaded_at: '2026-08-09T14:40:00Z',
    status: 'ready',
  },
  {
    id: 'd3',
    name: 'Executive Compensation Plan.pdf',
    size_kb: 340,
    chunks: 9,
    department: 'Finance',
    access: 'Confidential',
    roles: ['admin', 'finance'],
    uploaded_at: '2026-08-08T11:05:00Z',
    status: 'ready',
  },
  {
    id: 'd4',
    name: 'Information Security Handbook.pdf',
    size_kb: 2210,
    chunks: 48,
    department: 'Security',
    access: 'Internal',
    roles: ['security', 'it'],
    uploaded_at: '2026-08-07T16:22:00Z',
    status: 'ready',
  },
  {
    id: 'd5',
    name: 'Marketing Brand Guidelines.pdf',
    size_kb: 8750,
    chunks: 21,
    department: 'Marketing',
    access: 'Internal',
    roles: ['marketing'],
    uploaded_at: '2026-08-06T10:30:00Z',
    status: 'processing',
  },
  {
    id: 'd6',
    name: 'M&A Due Diligence Notes.pdf',
    size_kb: 5120,
    chunks: 0,
    department: 'Finance',
    access: 'Confidential',
    roles: ['admin', 'finance', 'legal'],
    uploaded_at: '2026-08-05T13:55:00Z',
    status: 'failed',
  },
  {
    id: 'd7',
    name: 'Remote Work Policy.pdf',
    size_kb: 205,
    chunks: 6,
    department: 'HR',
    access: 'Internal',
    roles: [],
    uploaded_at: '2026-08-04T08:15:00Z',
    status: 'ready',
  },
  {
    id: 'd8',
    name: 'Procurement Playbook.pdf',
    size_kb: 980,
    chunks: 27,
    department: 'Operations',
    access: 'Internal',
    roles: ['operations', 'finance', 'manager'],
    uploaded_at: '2026-08-03T12:00:00Z',
    status: 'ready',
  },
  {
    id: 'd9',
    name: '2026 Benefits & Insurance.pdf',
    size_kb: 1340,
    chunks: 31,
    department: 'HR',
    access: 'Confidential',
    roles: ['admin', 'hr'],
    uploaded_at: '2026-08-02T09:48:00Z',
    status: 'ready',
  },
  {
    id: 'd10',
    name: 'Sales Compensation Plan.pdf',
    size_kb: 720,
    chunks: 14,
    department: 'Finance',
    access: 'Confidential',
    roles: ['admin', 'finance', 'operations'],
    uploaded_at: '2026-07-31T15:30:00Z',
    status: 'ready',
  },
];

export async function getAdminDocuments(): Promise<AdminDocumentsResponse> {
  // TODO: replace with `httpClient.get<AdminDocumentsResponse>(ENDPOINTS.adminDocuments)`
  // when the backend exposes GET /admin/documents.
  return delay({ documents: MOCK_ADMIN_DOCUMENTS, total: MOCK_ADMIN_DOCUMENTS.length });
}

export async function uploadAdminDocument(name: string): Promise<UploadResult> {
  // TODO: replace with a multipart POST via httpClient once the backend
  // exposes POST /admin/documents (mirror apiService.uploadDocument).
  const id = `new-${Math.random().toString(36).slice(2, 9)}`;
  return delay(
    {
      id,
      name,
      status: 'processing',
      message: `${name} received — indexing in progress.`,
    },
    1500,
  );
}
