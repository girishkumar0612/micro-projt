// Admin → Document management service.
//
// Calls the real FastAPI backend (/api/documents, /api/upload). The backend
// auto-generates an executive summary when a document is uploaded and exposes
// it through the documents list plus GET /api/documents/{id}/summary.

import { httpClient } from '@/services/apiClient';
import { ENDPOINTS } from '@/services/endpoints';
import type { AdminDocument, AdminDocumentStatus, AdminDocumentsResponse, DocumentAccess, UploadResult } from '@/types';

export const MAX_UPLOAD_MB = 20;

export const DEPARTMENTS = ['HR', 'IT', 'Finance', 'Legal', 'Operations', 'Security', 'Other'] as const;

function asString(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v;
  if (typeof v === 'number') return String(v);
  return null;
}

const uid = () => Math.random().toString(36).slice(2, 11);

// Backend status "indexing" maps to the frontend's "processing".
function toStatus(raw: unknown): AdminDocumentStatus {
  const s = asString(raw) ?? 'processing';
  if (s === 'ready' || s === 'failed') return s;
  return 'processing';
}

function toAccess(raw: unknown): DocumentAccess {
  return asString(raw) === 'Confidential' ? 'Confidential' : 'Internal';
}

function toAdminDocument(d: Record<string, unknown>): AdminDocument {
  const filename = asString(d.filename) ?? 'Untitled document';
  return {
    id: asString(d.id) ?? filename,
    name: filename,
    size_kb: Number(d.size_kb) || 0,
    chunks: Number(d.chunks_indexed) || 0,
    department: asString(d.department) ?? 'Other',
    access: toAccess(d.access),
    roles: Array.isArray(d.roles) ? d.roles.filter((r) => typeof r === 'string') : [],
    uploaded_at: asString(d.uploaded_at) ?? new Date().toISOString(),
    status: toStatus(d.status),
    summary: asString(d.summary) ?? '',
  };
}

export async function getAdminDocuments(): Promise<AdminDocumentsResponse> {
  const { data } = await httpClient.get<unknown[]>(ENDPOINTS.documents);
  const list = Array.isArray(data)
    ? data.map((d) => toAdminDocument(d as Record<string, unknown>))
    : [];
  return { documents: list, total: list.length };
}

export interface UploadOptions {
  access?: DocumentAccess;
  department?: string;
}

export async function uploadAdminDocument(file: File, options: UploadOptions = {}): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('access', options.access ?? 'Internal');
  form.append('department', options.department ?? 'Other');
  const { data } = await httpClient.post<Record<string, unknown>>(
    ENDPOINTS.upload,
    form,
    { headers: { 'Content-Type': undefined } },
  );
  const status = toStatus(data.status);
  const name = asString(data.filename) ?? file.name;
  return {
    id: asString(data.id) ?? uid(),
    name,
    status,
    message:
      status === 'ready'
        ? `${name} uploaded and indexed.`
        : `${name} received — indexing in progress.`,
    department: asString(data.department) ?? options.department ?? 'Other',
    access: toAccess(data.access),
    summary: asString(data.summary) ?? '',
  };
}

export async function getDocumentSummary(
  id: string,
): Promise<{ documentId: string; filename: string; summary: string }> {
  const { data } = await httpClient.get<{
    document_id?: unknown;
    filename?: unknown;
    summary?: unknown;
  }>(ENDPOINTS.documentSummary(id));
  return {
    documentId: asString(data.document_id) ?? id,
    filename: asString(data.filename) ?? '',
    summary: asString(data.summary) ?? '',
  };
}
