import { create } from 'zustand';
import type { ChatMessage, ChatSession } from '@/types';
import { apiService } from '@/services';

// Chat history is persisted in localStorage, keyed by the logged-in username,
// so each account gets its own saved conversations. The chat itself stays
// stateless on the backend — history lives entirely in the frontend.
const STORAGE_KEY = 'atlas.chat.sessions.v1';

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: ChatMessage[];
  isTyping: boolean;
  error: string | null;

  loadHistory: () => void;
  createSession: () => void;
  loadSession: (id: string) => void;
  deleteSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;

  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
  retryLast: () => Promise<void>;
}

const uid = () => Math.random().toString(36).slice(2, 11);
const nowISO = () => new Date().toISOString();

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm **Atlas**, your company knowledge assistant. Ask me anything about leave, WFH, expenses, equipment, security, onboarding, or procurement — and I'll not only answer, I can take action right from here.",
  actions: [
    { id: 'w1', label: 'How do I apply for leave?', type: 'workflow', target: 'apply_leave', variant: 'primary', icon: 'CalendarPlus' },
    { id: 'w2', label: 'What are the WFH rules?', type: 'navigate', target: '/search?q=WFH%20rules', variant: 'secondary', icon: 'Home' },
  ],
  createdAt: nowISO(),
};

// Same key the mock API / authStore use for the signed-in user.
function currentOwner(): string {
  try {
    const raw = localStorage.getItem('atlas.auth.user');
    const user = raw ? (JSON.parse(raw) as { username?: string }) : null;
    return user?.username || 'guest';
  } catch {
    return 'guest';
  }
}

function readStore(): Record<string, ChatSession[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, ChatSession[]>)
      : {};
  } catch {
    return {};
  }
}

function sessionsFor(owner: string): ChatSession[] {
  const list = readStore()[owner];
  return Array.isArray(list) ? list : [];
}

function writeStore(map: Record<string, ChatSession[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Storage may be full or unavailable — chat still works for this session.
  }
}

// Never persist messages that were mid-flight (pending). Everything else is safe.
function sanitize(session: ChatSession): ChatSession {
  return {
    ...session,
    title: session.title ?? '',
    messages: session.messages.filter((m) => !m.pending),
  };
}

function makeSession(messages: ChatMessage[]): ChatSession {
  const now = nowISO();
  return { id: uid(), title: '', createdAt: now, updatedAt: now, messages };
}

const freshSession = () => makeSession([{ ...WELCOME, id: uid() }]);

const snippet = (text: string) => {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 48 ? `${t.slice(0, 48).trimEnd()}…` : t;
};

export function chatTitle(session: ChatSession): string {
  if (session.title && session.title.trim()) return session.title;
  const firstUser = session.messages.find((m) => m.role === 'user');
  if (!firstUser) return 'New chat';
  return snippet(firstUser.content);
}

export function chatPreview(session: ChatSession): string {
  const last = [...session.messages].reverse().find((m) => m.role === 'user' || m.role === 'assistant');
  if (!last) return '';
  const text = last.content.replace(/[*_#`>]/g, '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return last.role === 'user' ? `You: ${text}` : text;
}

function initialSessions() {
  const owner = currentOwner();
  const existing = sessionsFor(owner)
    .map(sanitize)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (existing.length > 0) {
    const active = existing[0];
    return { sessions: existing, activeSessionId: active.id, messages: active.messages, isTyping: false, error: null };
  }
  const fresh = freshSession();
  writeStore({ ...readStore(), [owner]: [sanitize(fresh)] });
  return { sessions: [fresh], activeSessionId: fresh.id, messages: fresh.messages, isTyping: false, error: null };
}

export const useChatStore = create<ChatState>((set, get) => {
  const persist = () => {
    writeStore({ ...readStore(), [currentOwner()]: get().sessions.map(sanitize) });
  };

  return {
    ...initialSessions(),

    loadHistory: () => {
      const owner = currentOwner();
      const list = sessionsFor(owner)
        .map(sanitize)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      if (list.length === 0) {
        const fresh = freshSession();
        list.push(fresh);
        writeStore({ ...readStore(), [owner]: list.map(sanitize) });
      }
      const active = list.find((s) => s.id === get().activeSessionId) ?? list[0];
      set({ sessions: list, activeSessionId: active.id, messages: active.messages, error: null });
    },

    createSession: () => {
      const fresh = freshSession();
      set((s) => ({
        sessions: [fresh, ...s.sessions],
        activeSessionId: fresh.id,
        messages: fresh.messages,
        isTyping: false,
        error: null,
      }));
      persist();
    },

    loadSession: (id) => {
      const session = get().sessions.find((s) => s.id === id);
      if (!session) return;
      set({ activeSessionId: id, messages: session.messages, isTyping: false, error: null });
    },

    deleteSession: (id) => {
      const { sessions, activeSessionId } = get();
      const next = sessions.filter((s) => s.id !== id);
      let active = activeSessionId;
      if (active === id) {
        active = next[0]?.id ?? null;
        if (!active) {
          const fresh = freshSession();
          next.push(fresh);
          active = fresh.id;
        }
      }
      const messages = next.find((s) => s.id === active)?.messages ?? [];
      set({ sessions: next, activeSessionId: active, messages, isTyping: false, error: null });
      persist();
    },

    renameSession: (id, title) => {
      set((s) => ({
        sessions: s.sessions.map((sess) =>
          sess.id === id ? { ...sess, title: title.trim(), updatedAt: nowISO() } : sess,
        ),
      }));
      persist();
    },

    sendMessage: async (text) => {
      if (!text.trim() || get().isTyping) return;

      const userMsg: ChatMessage = {
        id: uid(),
        role: 'user',
        content: text,
        createdAt: nowISO(),
      };
      const pendingMsg: ChatMessage = {
        id: uid(),
        role: 'assistant',
        content: '',
        createdAt: nowISO(),
        pending: true,
      };

      const attach = (msgs: ChatMessage[]) =>
        set((s) => ({
          messages: msgs,
          isTyping: true,
          error: null,
          sessions: s.sessions.map((sess) => {
            if (sess.id !== s.activeSessionId) return sess;
            const isFirst = sess.messages.every((m) => m.role !== 'user');
            return {
              ...sess,
              title: sess.title || (isFirst ? snippet(text) : sess.title),
              messages: msgs,
              updatedAt: nowISO(),
            };
          }),
        }));

      attach([...get().messages, userMsg, pendingMsg]);

      try {
        const res = await apiService.chat({
          message: text,
          sessionId: get().activeSessionId ?? undefined,
          history: get()
            .messages.filter((m) => !m.pending)
            .slice(-6)
            .map((m) => ({ role: m.role, content: m.content })),
        });

        const answered = get().messages.map((m) =>
          m.id === pendingMsg.id ? { ...res.message, id: pendingMsg.id } : m,
        );
        set((s) => ({
          messages: answered,
          isTyping: false,
          sessions: s.sessions.map((sess) =>
            sess.id === s.activeSessionId ? { ...sess, messages: answered, updatedAt: nowISO() } : sess,
          ),
        }));
        persist();
      } catch (e) {
        const err = e as { message?: string; demoMode?: boolean };
        const demoFallback =
          "I couldn't reach the knowledge service right now. This is likely because the backend isn't connected — you're in **demo mode**. Try again, or browse the Documents tab.";
        const liveFallback =
          "I couldn't get an answer right now. Please try again in a moment, or browse the Documents tab.";
        const failed: ChatMessage = {
          id: pendingMsg.id,
          role: 'assistant',
          content: err?.message
            ? `I hit a snag: ${err.message}\n\nYou can try again, or browse the Documents tab.`
            : err?.demoMode
              ? demoFallback
              : liveFallback,
          actions: [
            { id: uid(), label: 'Browse Documents', type: 'navigate', target: '/documents', variant: 'secondary', icon: 'FileText' },
          ],
          createdAt: nowISO(),
          error: true,
        };
        set((s) => {
          const next = s.messages.map((m) => (m.id === pendingMsg.id ? failed : m));
          return {
            messages: next,
            isTyping: false,
            error: err?.message ?? 'Failed to get a response.',
            sessions: s.sessions.map((sess) =>
              sess.id === s.activeSessionId ? { ...sess, messages: next, updatedAt: nowISO() } : sess,
            ),
          };
        });
        persist();
      }
    },

    clearChat: () => get().createSession(),

    retryLast: async () => {
      const msgs = get().messages;
      const lastUser = [...msgs].reverse().find((m) => m.role === 'user' && !m.pending);
      if (!lastUser) return;
      const idx = msgs.findIndex((m) => m.id === lastUser.id);
      const trimmed = msgs.slice(0, idx + 1);
      set((s) => ({
        messages: trimmed,
        isTyping: false,
        error: null,
        sessions: s.sessions.map((sess) =>
          sess.id === s.activeSessionId ? { ...sess, messages: trimmed, updatedAt: nowISO() } : sess,
        ),
      }));
      await get().sendMessage(lastUser.content);
    },
  };
});
