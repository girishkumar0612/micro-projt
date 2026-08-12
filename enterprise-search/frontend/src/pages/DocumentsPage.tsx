import { useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Search, Clock, Tag, Filter, Upload, ShieldCheck, Check, X } from 'lucide-react';
import { useDocuments } from '@/hooks';
import { Badge, Card, Spinner, Button } from '@/components/ui';
import { DocumentViewer } from '@/components/documents/DocumentViewer';
import { useAuthStore } from '@/store/authStore';
import { apiService } from '@/services';
import { formatDate, cn } from '@/utils';
import { ROLE_LABELS } from '@/utils/roles';
import type { DocumentCategory, KnowledgeDocument } from '@/types';

const CATEGORIES: (DocumentCategory | 'All')[] = [
  'All',
  'HR',
  'IT',
  'Finance',
  'Legal',
  'Operations',
  'Security',
];

const ROLE_OPTIONS = ['hr', 'manager', 'it', 'finance', 'operations', 'legal', 'security', 'employee'];

export function DocumentsPage() {
  const { documents, loading, error, load } = useDocuments();
  const user = useAuthStore((s) => s.user);
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState<DocumentCategory | 'All'>('All');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get('id') ?? null,
  );
  const isAdmin = user?.role === 'admin';

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      const matchCat = filter === 'All' || d.category === filter;
      const matchQuery =
        !query ||
        d.title.toLowerCase().includes(query.toLowerCase()) ||
        d.summary.toLowerCase().includes(query.toLowerCase()) ||
        d.tags.some((t) => t.includes(query.toLowerCase()));
      return matchCat && matchQuery;
    });
  }, [documents, filter, query]);

  const selected = documents.find((d) => d.id === selectedId) ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={28} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-24 text-sm text-red-500">{error}</div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2 h-11 px-3.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 flex-1">
          <Search className="w-4 h-4 text-surface-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter documents…"
            className="flex-1 bg-transparent text-sm text-surface-900 dark:text-surface-50 placeholder:text-surface-400 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
          <Filter className="w-4 h-4 text-surface-400 shrink-0" />
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                filter === c
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700',
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Admin upload */}
      {isAdmin && <UploadPanel onUploaded={load} />}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-10 h-10 text-surface-300 dark:text-surface-700 mx-auto mb-3" />
          <p className="text-sm text-surface-500">No documents found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} onOpen={() => setSelectedId(doc.id)} />
          ))}
        </div>
      )}

      <DocumentViewer
        document={selected}
        open={!!selected}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

function UploadPanel({ onUploaded }: { onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const pick = (f: File | undefined) => {
    setStatus(null);
    if (f) setFile(f);
  };

  const toggleRole = (r: string) =>
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const submit = async () => {
    if (!file) return;
    setUploading(true);
    setStatus(null);
    try {
      const res = await apiService.uploadDocument(file, roles.length ? roles : undefined);
      setStatus({ ok: true, text: `${res.filename} uploaded successfully (${roles.length ? roles.length + ' role' + (roles.length > 1 ? 's' : '') + ' restricted' : 'visible to everyone'}).` });
      setFile(null);
      setRoles([]);
      if (inputRef.current) inputRef.current.value = '';
      onUploaded();
    } catch (e) {
      setStatus({ ok: false, text: String((e as { message?: string })?.message ?? 'Upload failed.') });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="mb-8 p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
          <Upload className="h-4.5 w-4.5 text-brand-600 dark:text-brand-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-1.5">
            Upload a PDF
            <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              <ShieldCheck className="h-3 w-3" /> Admin
            </span>
          </h3>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Add a document to the knowledge base. You can restrict which roles can see and search it.
          </p>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
          dragging
            ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/10'
            : 'border-surface-200 hover:border-brand-300 dark:border-surface-700 dark:hover:border-brand-500/40',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        <FileText className="h-8 w-8 text-surface-300 dark:text-surface-600" />
        {file ? (
          <p className="text-sm font-medium text-surface-900 dark:text-surface-50">{file.name}</p>
        ) : (
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Drag &amp; drop a PDF here, or <span className="font-medium text-brand-600 dark:text-brand-400">browse</span>
          </p>
        )}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-surface-600 dark:text-surface-300">
          Restrict access to roles <span className="font-normal text-surface-400">(none selected = visible to everyone)</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ROLE_OPTIONS.map((r) => {
            const active = roles.includes(r);
            return (
              <button
                key={r}
                onClick={() => toggleRole(r)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500/50 dark:bg-brand-500/10 dark:text-brand-300'
                    : 'border-surface-200 text-surface-600 hover:border-surface-300 dark:border-surface-700 dark:text-surface-300',
                )}
              >
                {active ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 opacity-0" />}
                {ROLE_LABELS[r] ?? r}
              </button>
            );
          })}
        </div>
      </div>

      {status && (
        <p
          className={cn(
            'mt-4 rounded-lg border px-3 py-2 text-xs',
            status.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400',
          )}
        >
          {status.text}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <Button
          onClick={submit}
          disabled={!file}
          loading={uploading}
          icon={<Upload className="h-4 w-4" />}
        >
          {uploading ? 'Uploading…' : 'Upload document'}
        </Button>
      </div>
    </Card>
  );
}

function DocumentCard({ doc, onOpen }: { doc: KnowledgeDocument; onOpen: () => void }) {
  return (
    <Card hover onClick={onOpen} className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        </div>
        <Badge category={doc.category} />
      </div>
      <div>
        <h3 className="font-semibold text-surface-900 dark:text-surface-50 leading-snug">{doc.title}</h3>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1 line-clamp-2">{doc.summary}</p>
      </div>
      <div className="flex items-center gap-4 text-xs text-surface-400 mt-auto pt-2 border-t border-surface-100 dark:border-surface-800">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> {doc.readTimeMins} min read
        </span>
        <span>v{doc.version}</span>
        <span className="ml-auto">{formatDate(doc.updatedAt)}</span>
      </div>
      {doc.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {doc.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 text-[11px] text-surface-400"
            >
              <Tag className="w-2.5 h-2.5" />
              {t}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
