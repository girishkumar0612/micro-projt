import { Modal, Badge, Button } from '@/components/ui';
import { renderMarkdown, formatDate } from '@/utils';
import { FileText, Clock, User, GitBranch, Download, Share2 } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import type { KnowledgeDocument } from '@/types';

interface Props {
  document: KnowledgeDocument | null;
  open: boolean;
  onClose: () => void;
}

export function DocumentViewer({ document: doc, open, onClose }: Props) {
  const pushToast = useUIStore((s) => s.pushToast);

  if (!doc) return null;

  return (
    <Modal open={open} onClose={onClose} size="xl" title={doc.title}>
      {/* Meta */}
      <div className="flex flex-wrap items-center gap-3 mb-5 pb-5 border-b border-surface-100 dark:border-surface-800">
        <Badge category={doc.category} />
        <span className="flex items-center gap-1.5 text-xs text-surface-400">
          <User className="w-3.5 h-3.5" /> {doc.author}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-surface-400">
          <Clock className="w-3.5 h-3.5" /> {doc.readTimeMins} min read
        </span>
        <span className="flex items-center gap-1.5 text-xs text-surface-400">
          <GitBranch className="w-3.5 h-3.5" /> v{doc.version}
        </span>
        <span className="text-xs text-surface-400 ml-auto">Updated {formatDate(doc.updatedAt)}</span>
      </div>

      {/* Content */}
      <div
        className="prose-sm max-w-none [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-5 [&_h1]:mb-3 [&_h1]:text-surface-900 dark:[&_h1]:text-surface-50 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-surface-900 dark:[&_h2]:text-surface-50 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-surface-800 dark:[&_h3]:text-surface-100 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-surface-700 dark:[&_p]:text-surface-300 [&_li]:text-sm [&_li]:text-surface-700 dark:[&_li]:text-surface-300 [&_strong]:text-surface-900 dark:[&_strong]:text-surface-50 [&_blockquote]:border-brand-400 [&_blockquote]:pl-3 [&_blockquote]:text-surface-600 dark:[&_blockquote]:text-surface-400 [&_blockquote]:italic [&_table]:w-full [&_table]:text-sm [&_th]:text-left [&_th]:font-semibold [&_th]:px-3 [&_th]:py-2 [&_th]:border-b [&_th]:border-surface-200 dark:[&_th]:border-surface-700 [&_td]:px-3 [&_td]:py-2 [&_td]:border-b [&_td]:border-surface-100 dark:[&_td]:border-surface-800"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.content) }}
      />

      {/* Footer actions */}
      <div className="flex gap-3 mt-6 pt-5 border-t border-surface-100 dark:border-surface-800">
        <Button
          variant="secondary"
          size="sm"
          icon={<Download className="w-4 h-4" />}
          onClick={() => pushToast({ title: 'Download started', description: `${doc.title}.pdf`, variant: 'success' })}
        >
          Download
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Share2 className="w-4 h-4" />}
          onClick={() => {
            navigator.clipboard?.writeText(window.location.href);
            pushToast({ title: 'Link copied', variant: 'success' });
          }}
        >
          Share
        </Button>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-surface-400">
          <FileText className="w-3.5 h-3.5" />
          {doc.tags.join(' · ')}
        </div>
      </div>
    </Modal>
  );
}
