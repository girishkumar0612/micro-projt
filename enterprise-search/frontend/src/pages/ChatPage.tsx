import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Send, RotateCcw, Sparkles, BookOpen, History, Plus, Pencil, Trash2, MessageSquare } from 'lucide-react';
import { useChatStore, chatTitle, chatPreview } from '@/store/chatStore';
import { useAutoScroll } from '@/hooks';
import { renderMarkdown, cn, timeAgo } from '@/utils';
import { ActionButtons } from '@/components/actions/ActionButtons';
import { Dots, Modal, Button } from '@/components/ui';
import { useUIStore } from '@/store/uiStore';
import type { ChatMessage, ChatSession } from '@/types';

const QUICK_PROMPTS = [
  'How do I apply for leave?',
  'What are the WFH rules?',
  'How do I get reimbursed for travel?',
  'How do I request a new monitor?',
];

export function ChatPage() {
  const {
    messages,
    isTyping,
    sendMessage,
    clearChat,
    retryLast,
    sessions,
    activeSessionId,
    loadHistory,
    createSession,
    loadSession,
    deleteSession,
    renameSession,
  } = useChatStore();
  const [searchParams] = useSearchParams();
  const [input, setInput] = useState('');
  const [modal, setModal] = useState<{ name: string; payload?: unknown } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1024,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ChatSession | null>(null);
  const navigate = useNavigate();
  const { ref, onScroll } = useAutoScroll(messages);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleOpenDoc = useCallback((id: string) => {
    navigate(`/documents?id=${id}`);
  }, [navigate]);

  const handleOpenModal = useCallback((name: string, payload?: unknown) => {
    setModal({ name, payload });
  }, []);

  const submit = () => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    sendMessage(text);
  };

  useEffect(() => {
    const prompt = searchParams.get('prompt');
    if (prompt && messages.length === 1 && !isTyping) {
      sendMessage(prompt);
    }
  }, [isTyping, messages.length, searchParams, sendMessage]);

  // ⌘K focuses input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const handleNewChat = () => {
    createSession();
    setEditingId(null);
  };

  const startRename = (session: ChatSession) => {
    setEditingId(session.id);
    setDraft(chatTitle(session) === 'New chat' ? '' : chatTitle(session));
  };

  const commitRename = (sessionId: string) => {
    const title = draft.trim();
    if (title) renameSession(sessionId, title);
    setEditingId(null);
    setDraft('');
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteSession(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="relative flex h-full min-h-0">
      {/* Mobile backdrop */}
      {historyOpen && (
        <div
          className="fixed inset-0 z-30 bg-surface-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setHistoryOpen(false)}
        />
      )}

      {/* History panel */}
      <aside
        className={cn(
          'w-72 shrink-0 flex-col border-r border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900',
          'fixed inset-y-0 left-0 z-40 lg:static lg:z-auto',
          historyOpen ? 'flex' : 'hidden',
        )}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-surface-200 dark:border-surface-800 shrink-0">
          <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">Chat history</p>
          <button
            onClick={handleNewChat}
            className="p-2 rounded-lg text-surface-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            title="New chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-0.5">
          {sessions.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-surface-400">No conversations yet.</p>
          )}
          {sessions.map((session) => (
            <HistoryRow
              key={session.id}
              session={session}
              active={session.id === activeSessionId}
              editing={editingId === session.id}
              draft={draft}
              setDraft={setDraft}
              onOpen={() => {
                loadSession(session.id);
                if (window.innerWidth < 1024) setHistoryOpen(false);
              }}
              onRename={() => startRename(session)}
              onCommit={() => commitRename(session.id)}
              onCancel={() => setEditingId(null)}
              onDelete={() => setDeleteTarget(session)}
            />
          ))}
        </div>

        <div className="px-4 py-3 border-t border-surface-200 dark:border-surface-800 shrink-0">
          <p className="text-[11px] text-surface-400 dark:text-surface-500 leading-relaxed">
            Conversations are saved locally in this browser, per account.
          </p>
        </div>
      </aside>

      {/* Chat */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-4 shrink-0">
          <button
            onClick={() => setHistoryOpen((o) => !o)}
            className={cn(
              'inline-flex items-center gap-2 h-9 px-3 rounded-xl text-sm font-medium transition-colors',
              historyOpen
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                : 'text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800',
            )}
            title="Chat history"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </button>
          {activeSession && (
            <span className="truncate text-xs text-surface-400 dark:text-surface-500">
              {chatTitle(activeSession)}
            </span>
          )}
        </div>

        <div className="flex flex-col h-full max-w-4xl w-full mx-auto">
          {/* Messages */}
          <div ref={ref} onScroll={onScroll} className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-6 py-6 space-y-6">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onOpenDocument={handleOpenDoc}
                onOpenModal={handleOpenModal}
                onRetry={retryLast}
              />
            ))}
          </div>

          {/* Quick prompts (only when chat is fresh) */}
          {messages.length <= 1 && !isTyping && (
            <div className="px-4 sm:px-6 pb-2">
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm text-surface-600 dark:text-surface-300 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:border-brand-300 dark:hover:border-brand-500/40 hover:text-brand-700 dark:hover:text-brand-300 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-4 sm:px-6 pb-6 pt-2">
            <div className="relative">
              <div className="flex items-end gap-2 p-2 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 shadow-soft focus-within:border-brand-400 dark:focus-within:border-brand-500/50 transition-colors">
                <button
                  onClick={clearChat}
                  className="p-2.5 rounded-xl text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors shrink-0"
                  title="New chat"
                >
                  <RotateCcw className="w-4.5 h-4.5" />
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  placeholder="Ask about policies, SOPs, or workflows…"
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-sm text-surface-900 dark:text-surface-50 placeholder:text-surface-400 outline-none py-2.5 max-h-40 scrollbar-thin"
                />
                <button
                  onClick={submit}
                  disabled={!input.trim() || isTyping}
                  className="p-2.5 rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </div>
              <p className="text-[11px] text-surface-400 dark:text-surface-500 mt-2 text-center">
                Atlas can search knowledge and trigger actions. Press Enter to send, Shift+Enter for a new line.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Action modals (e.g. Apply for Leave) */}
      <LeaveFormModal
        open={modal?.name === 'leave_form'}
        onClose={() => setModal(null)}
      />

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete conversation?"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-surface-600 dark:text-surface-300">
          &quot;{deleteTarget ? chatTitle(deleteTarget) : ''}&quot; and its messages will be
          permanently removed from your history.
        </p>
      </Modal>
    </div>
  );
}

function HistoryRow({
  session,
  active,
  editing,
  draft,
  setDraft,
  onOpen,
  onRename,
  onCommit,
  onCancel,
  onDelete,
}: {
  session: ChatSession;
  active: boolean;
  editing: boolean;
  draft: string;
  setDraft: (v: string) => void;
  onOpen: () => void;
  onRename: () => void;
  onCommit: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const title = chatTitle(session);
  const preview = chatPreview(session);

  if (editing) {
    return (
      <div className="px-3 py-2.5 rounded-xl border border-brand-300 dark:border-brand-500/40 bg-white dark:bg-surface-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onCommit();
          }}
        >
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
              }
            }}
            onBlur={() => {
              if (draft.trim()) onCommit();
              else onCancel();
            }}
            placeholder="Name this conversation"
            className="w-full bg-transparent text-sm text-surface-900 dark:text-surface-50 placeholder:text-surface-400 outline-none"
          />
        </form>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={onCommit}
            className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
          >
            Save
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onCancel}
            className="text-xs text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex items-center rounded-xl">
      <button
        onClick={onOpen}
        className={cn(
          'flex-1 min-w-0 text-left px-3 py-2.5 pr-12 rounded-xl transition-colors',
          active
            ? 'bg-brand-50 dark:bg-brand-500/10'
            : 'hover:bg-surface-100 dark:hover:bg-surface-800',
        )}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 shrink-0 text-surface-400 dark:text-surface-500" />
          <p
            className={cn(
              'truncate text-sm font-medium',
              active ? 'text-brand-700 dark:text-brand-300' : 'text-surface-800 dark:text-surface-100',
            )}
          >
            {title}
          </p>
        </div>
        {preview && (
          <p className="truncate pl-[22px] text-xs text-surface-400 dark:text-surface-500 mt-0.5">{preview}</p>
        )}
        <p className="pl-[22px] text-[10px] text-surface-400/80 dark:text-surface-500/80 mt-1">
          {timeAgo(session.updatedAt)}
        </p>
      </button>

      <div className="absolute right-2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onRename}
          className="p-1.5 rounded-lg text-surface-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          title="Rename"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function LeaveFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pushToast = useUIStore((s) => s.pushToast);
  const [type, setType] = useState('Annual Leave');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    if (!start || !end) {
      pushToast({ title: 'Pick your dates', description: 'Please select a start and end date.', variant: 'error' });
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onClose();
      setType('Annual Leave');
      setStart('');
      setEnd('');
      pushToast({ title: 'Leave request submitted', description: `${type} from ${start} to ${end} sent for approval.`, variant: 'success' });
    }, 700);
  };

  return (
    <Modal open={open} onClose={onClose} title="Apply for Leave" footer={<Button onClick={submit} loading={submitting}>Submit request</Button>}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">Leave type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm text-surface-900 dark:text-surface-50 outline-none focus:border-brand-400 dark:focus:border-brand-500/50"
          >
            <option>Annual Leave</option>
            <option>Sick Leave</option>
            <option>Parental Leave</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">Start date</label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm text-surface-900 dark:text-surface-50 outline-none focus:border-brand-400 dark:focus:border-brand-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">End date</label>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm text-surface-900 dark:text-surface-50 outline-none focus:border-brand-400 dark:focus:border-brand-500/50"
            />
          </div>
        </div>
        <p className="text-xs text-surface-400 leading-relaxed">
          This opens the HR portal flow. Full-time employees accrue 1.75 days/month (21 days/year).
        </p>
      </div>
    </Modal>
  );
}

function MessageBubble({
  message,
  onOpenDocument,
  onOpenModal,
  onRetry,
}: {
  message: ChatMessage;
  onOpenDocument: (id: string) => void;
  onOpenModal: (name: string, payload?: unknown) => void;
  onRetry: () => void;
}) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end animate-slide-up">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-brand-600 text-white px-4 py-3 shadow-sm">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 animate-slide-up">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-4 h-4 text-white" />
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        {message.pending ? (
          <div className="flex items-center gap-2 py-2">
            <Dots />
            <span className="text-sm text-surface-400">Searching knowledge base…</span>
          </div>
        ) : (
          <>
            <div
              className={cn(
                'rounded-2xl rounded-tl-md px-4 py-3',
                message.error
                  ? 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20'
                  : 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-soft',
              )}
            >
              <div
                className="text-sm leading-relaxed [&_p]:text-surface-700 dark:[&_p]:text-surface-200 [&_li]:text-surface-700 dark:[&_li]:text-surface-200 [&_strong]:text-surface-900 dark:[&_strong]:text-surface-50"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
              />
            </div>

            {message.actions && message.actions.length > 0 && (
              <ActionButtons actions={message.actions} onOpenDocument={onOpenDocument} onOpenModal={onOpenModal} />
            )}

            {message.citations && message.citations.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {message.citations.map((c) => (
                  <button
                    key={c.documentId}
                    onClick={() => onOpenDocument(c.documentId)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-surface-500 dark:text-surface-400 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                  >
                    <BookOpen className="w-3 h-3" />
                    {c.title}
                  </button>
                ))}
              </div>
            )}

            {message.error && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 hover:underline"
              >
                <RotateCcw className="w-3 h-3" /> Try again
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
