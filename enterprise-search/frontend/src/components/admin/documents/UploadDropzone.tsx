import { useRef, useState } from 'react';
import { FileText, UploadCloud, X, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/utils';
import { MAX_UPLOAD_MB, uploadAdminDocument } from '@/services/admin/documentService';
import type { UploadResult } from '@/types';

const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

interface Props {
  onUploaded: (result: UploadResult) => void;
}

export function UploadDropzone({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const accept = (f: File | undefined) => {
    setError(null);
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are accepted.');
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setError(`File exceeds the ${MAX_UPLOAD_MB} MB limit (${(f.size / (1024 * 1024)).toFixed(1)} MB).`);
      return;
    }
    setFile(f);
  };

  const reset = () => {
    setFile(null);
    setProgress(0);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const submit = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    setProgress(0);

    // Simulated upload progress while the service handles the request.
    const ticker = setInterval(() => {
      setProgress((p) => (p >= 92 ? p : Math.min(92, p + 8 + Math.random() * 14)));
    }, 220);

    try {
      const result = await uploadAdminDocument(file.name);
      clearInterval(ticker);
      setProgress(100);
      setTimeout(() => {
        reset();
        onUploaded(result);
      }, 350);
    } catch (e) {
      clearInterval(ticker);
      setError(String((e as { message?: string })?.message ?? 'Upload failed.'));
      setUploading(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
          <UploadCloud className="h-4.5 w-4.5 text-brand-600 dark:text-brand-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Upload a policy document</h3>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            PDF only · up to {MAX_UPLOAD_MB} MB
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
          accept(e.dataTransfer.files?.[0]);
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
          onChange={(e) => accept(e.target.files?.[0])}
        />
        <FileText className="h-8 w-8 text-surface-300 dark:text-surface-600" />
        {file ? (
          <>
            <p className="text-sm font-medium text-surface-900 dark:text-surface-50">{file.name}</p>
            <p className="text-xs text-surface-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
          </>
        ) : (
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Drag &amp; drop a PDF here, or <span className="font-medium text-brand-600 dark:text-brand-400">browse</span>
          </p>
        )}
      </div>

      {error && (
        <p className="mt-4 flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      {file && !error && (
        <div className="mt-4">
          {uploading ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-surface-500 dark:text-surface-400">Uploading…</span>
                <span className="text-xs font-medium text-surface-700 dark:text-surface-200 tabular-nums">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-500 transition-[width] duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-xl border border-surface-200 dark:border-surface-700 px-3 py-2 text-xs font-medium text-surface-600 dark:text-surface-300 transition-colors hover:bg-surface-50 dark:hover:bg-surface-800"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
              <button
                onClick={submit}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-700"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Upload document
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
