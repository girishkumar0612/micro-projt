import { create } from 'zustand';
import type { ChatMessage } from '@/types';
import { apiService } from '@/services';

interface ChatState {
  sessionId: string | null;
  messages: ChatMessage[];
  isTyping: boolean;
  error: string | null;

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

export const useChatStore = create<ChatState>((set, get) => ({
  sessionId: null,
  messages: [WELCOME],
  isTyping: false,
  error: null,

  sendMessage: async (text) => {
    if (!text.trim() || get().isTyping) return;

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: text,
      createdAt: nowISO(),
    };
    const pendingId = uid();
    const pendingMsg: ChatMessage = {
      id: pendingId,
      role: 'assistant',
      content: '',
      createdAt: nowISO(),
      pending: true,
    };

    set((s) => ({
      messages: [...s.messages, userMsg, pendingMsg],
      isTyping: true,
      error: null,
    }));

    try {
      const res = await apiService.chat({
        message: text,
        sessionId: get().sessionId ?? undefined,
        history: get()
          .messages.filter((m) => !m.pending)
          .slice(-6)
          .map((m) => ({ role: m.role, content: m.content })),
      });

      set((s) => ({
        sessionId: res.sessionId,
        isTyping: false,
        messages: s.messages.map((m) =>
          m.id === pendingId ? { ...res.message, id: pendingId } : m,
        ),
      }));
    } catch (e) {
      const err = e as { message?: string; demoMode?: boolean };
      const demoFallback =
        "I couldn't reach the knowledge service right now. This is likely because the backend isn't connected — you're in **demo mode**. Try again, or browse the Documents tab.";
      const liveFallback =
        "I couldn't get an answer right now. Please try again in a moment, or browse the Documents tab.";
      set((s) => ({
        isTyping: false,
        error: err?.message ?? 'Failed to get a response.',
        messages: s.messages.map((m) =>
          m.id === pendingId
            ? {
                ...m,
                pending: false,
                error: true,
                content: err?.message
                  ? `I hit a snag: ${err.message}\n\nYou can try again, or browse the Documents tab.`
                  : err?.demoMode
                    ? demoFallback
                    : liveFallback,
                actions: [
                  { id: uid(), label: 'Browse Documents', type: 'navigate', target: '/documents', variant: 'secondary', icon: 'FileText' },
                ],
              }
            : m,
        ),
      }));
    }
  },

  clearChat: () =>
    set({ messages: [{ ...WELCOME, id: 'welcome', createdAt: nowISO() }], sessionId: null, error: null }),

  retryLast: async () => {
    const msgs = get().messages;
    const lastUser = [...msgs].reverse().find((m) => m.role === 'user' && !m.pending);
    if (!lastUser) return;
    // remove trailing assistant error/pending
    set((s) => {
      const idx = s.messages.findIndex((m) => m.id === lastUser.id);
      return { messages: s.messages.slice(0, idx + 1) };
    });
    await get().sendMessage(lastUser.content);
  },
}));
