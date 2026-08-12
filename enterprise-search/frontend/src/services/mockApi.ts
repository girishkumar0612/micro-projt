// Mock backend. Implements the exact same contract as the real API service.
// The UI never imports this directly — it goes through apiService, which routes
// here when USE_MOCK is true and to httpClient when false.
//
// Role-based access is simulated here too: documents carry a `roles` list and the
// currently logged-in user (from localStorage) only sees/gets answers from the
// documents their role is allowed to access.

import type {
  AuthUser,
  ChatRequest,
  ChatResponse,
  DashboardResponse,
  DocumentResponse,
  DocumentsResponse,
  LoginRequest,
  LoginResponse,
  SearchRequest,
  SearchResponse,
  SuggestionsRequest,
  SuggestionsResponse,
  WorkflowRequest,
  WorkflowResponse,
  AssistantAction,
  Citation,
  ChatMessage,
  KnowledgeDocument,
  SearchResult,
  SearchSuggestion,
  WorkflowId,
} from '@/types';
import {
  MOCK_DOCUMENTS,
  MOCK_ACTIVITY,
  MOCK_POPULAR_DOCUMENTS,
  MOCK_RECENT_SEARCHES,
  MOCK_SUGGESTIONS,
  MOCK_USERS,
} from './mockData';

// Simulate network latency so the UI exercises its loading states.
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const uid = () => Math.random().toString(36).slice(2, 11);
const nowISO = () => new Date().toISOString();

// ---- Role-based access (mirrors the backend) ----

function getCurrentUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('atlas.auth.user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function canAccessDoc(doc: KnowledgeDocument, user: AuthUser | null): boolean {
  if (!doc.roles || doc.roles.length === 0) return true;
  if (!user) return false;
  if (user.role === 'admin') return true;
  return doc.roles.includes(user.role);
}

function accessibleDocs(user: AuthUser | null): KnowledgeDocument[] {
  return [...MOCK_DOCUMENTS, ...uploadedDocs].filter((d) => canAccessDoc(d, user));
}

// Docs added at runtime via mockApi.uploadDocument (in-memory only).
const uploadedDocs: KnowledgeDocument[] = [];

// ---- Intent matching (lightweight, keyword-based) ----

interface Intent {
  answer: string;
  actions: AssistantAction[];
  citations: Citation[];
}

function findRelevantDocs(query: string, docs: KnowledgeDocument[]) {
  const q = query.toLowerCase();
  return docs.filter(
    (d) =>
      d.tags.some((t) => q.includes(t)) ||
      d.title.toLowerCase().split(/\W+/).some((w) => w.length > 3 && q.includes(w)) ||
      d.category.toLowerCase() === q.trim(),
  );
}

function buildIntent(query: string): Intent {
  const q = query.toLowerCase();
  const user = getCurrentUser();
  const docs = accessibleDocs(user);
  const accessibleIds = new Set(docs.map((d) => d.id));
  const relevant = findRelevantDocs(q, docs);

  const citationsFor = (list: KnowledgeDocument[]): Citation[] =>
    list.slice(0, 3).map((d) => ({ documentId: d.id, title: d.title, snippet: d.summary }));

  // Each candidate is gated on the accessibility of its primary document, so a
  // restricted answer is never leaked to an unauthorized role (mirrors RAG).
  const candidates: { pattern: RegExp; build: () => Intent }[] = [
    {
      pattern: /(leave|vacation|pto|time off|sick|parental|maternity|paternity)/,
      build: () => ({
        answer:
          'You can apply for leave through the HR Portal. Full-time employees accrue **1.75 days/month** (21 days/year), and up to 10 unused days carry over. Sick leave provides 12 paid days/year, and parental leave offers up to 26 weeks for primary caregivers.\n\nTo apply, go to **HR Portal → My Leave**, pick your dates, and submit. Your manager gets an automatic approval request.',
        actions: [
          { id: uid(), label: 'Open Leave Policy', type: 'open_document', target: '1', variant: 'secondary', icon: 'FileText' },
          { id: uid(), label: 'Apply for Leave', type: 'workflow', target: 'apply_leave', variant: 'primary', icon: 'CalendarPlus' },
          { id: uid(), label: 'Contact HR', type: 'workflow', target: 'contact_hr', variant: 'ghost', icon: 'MessageSquare' },
        ],
        citations: citationsFor(MOCK_DOCUMENTS.filter((d) => d.id === '1')),
      }),
    },
    {
      pattern: /(wfh|work from home|remote|hybrid|home office)/,
      build: () => ({
        answer:
          'Employees past probation can work remotely up to **3 days/week**. Tuesday and Thursday are mandatory in-office days, with core collaboration hours from 10 AM – 4 PM.\n\nThe company provides an ergonomic chair, a monitor kit, and a **$40/month** internet stipend. Additional home-office equipment is reimbursed up to **$200/year** via the Finance portal.',
        actions: [
          { id: uid(), label: 'Open WFH Policy', type: 'open_document', target: '2', variant: 'secondary', icon: 'FileText' },
          { id: uid(), label: 'Request Equipment', type: 'workflow', target: 'request_equipment', variant: 'primary', icon: 'Laptop' },
        ],
        citations: citationsFor(MOCK_DOCUMENTS.filter((d) => d.id === '2')),
      }),
    },
    {
      pattern: /(reimburs|expense|travel|per diem|receipt)/,
      build: () => ({
        answer:
          'Submit expenses through the **Finance Portal → New Expense**. Upload a receipt, pick a category, and route for approval. Approvals follow a tiered threshold: up to $100 (manager), $100–$1k (manager + finance), $1k+ (manager + finance + CFO).\n\nApproved expenses are paid in the **next payroll cycle**. Submit by the 15th to make the current cycle. Per diem: $60/day domestic, $120/day international.',
        actions: [
          { id: uid(), label: 'Open Reimbursement Process', type: 'open_document', target: '3', variant: 'secondary', icon: 'FileText' },
          { id: uid(), label: 'Contact Finance', type: 'workflow', target: 'contact_hr', variant: 'ghost', icon: 'MessageSquare' },
        ],
        citations: citationsFor(MOCK_DOCUMENTS.filter((d) => d.id === '3')),
      }),
    },
    {
      pattern: /(equipment|laptop|monitor|keyboard|mouse|software|access|password|reset)/,
      build: () => ({
        answer:
          'Request equipment or software access through the **IT Service Desk → New Request**. Standard turnaround is **3 business days**. For password resets, use the self-service portal or contact IT directly.\n\nNew hires receive a MacBook Pro, docking station, 27" monitor, and headset. Additional peripherals are requested with a business justification.',
        actions: [
          { id: uid(), label: 'Open IT Guide', type: 'open_document', target: '4', variant: 'secondary', icon: 'FileText' },
          { id: uid(), label: 'Request Equipment', type: 'workflow', target: 'request_equipment', variant: 'primary', icon: 'Laptop' },
          { id: uid(), label: 'Report an Issue', type: 'workflow', target: 'report_issue', variant: 'ghost', icon: 'AlertTriangle' },
        ],
        citations: citationsFor(MOCK_DOCUMENTS.filter((d) => d.id === '4')),
      }),
    },
    {
      pattern: /(security|password|mfa|phishing|incident|breach|data handling)/,
      build: () => ({
        answer:
          'Security is everyone’s responsibility. **MFA is mandatory** for email, VPN, and cloud consoles — use a hardware key or authenticator app (SMS is not allowed). Use 1Password for credentials; never share them.\n\nReport phishing with the "Report Phishing" button. For incidents (lost device, suspected breach), email **security@company.com** or call the 24/7 hotline immediately — there is no blame for reporting.',
        actions: [
          { id: uid(), label: 'Open Security Handbook', type: 'open_document', target: '5', variant: 'secondary', icon: 'FileText' },
          { id: uid(), label: 'Report an Issue', type: 'workflow', target: 'report_issue', variant: 'primary', icon: 'AlertTriangle' },
        ],
        citations: citationsFor(MOCK_DOCUMENTS.filter((d) => d.id === '5')),
      }),
    },
    {
      pattern: /(onboard|new hire|first week|checklist|join)/,
      build: () => ({
        answer:
          'New hires: on Day 1, collect your laptop from IT, set up email + MFA, and meet your manager. Over the first week, join Slack channels, request tool access via the IT Service Desk, and complete the "Company 101" module.\n\nA 30-day check-in with your manager is scheduled in Week 2.',
        actions: [
          { id: uid(), label: 'Open Onboarding Checklist', type: 'open_document', target: '7', variant: 'secondary', icon: 'FileText' },
          { id: uid(), label: 'Request Equipment', type: 'workflow', target: 'request_equipment', variant: 'primary', icon: 'Laptop' },
        ],
        citations: citationsFor(MOCK_DOCUMENTS.filter((d) => d.id === '7')),
      }),
    },
    {
      pattern: /(procurement|vendor|purchase order|spending|po)/,
      build: () => ({
        answer:
          'Raise a Purchase Order in the **Procurement Portal**. Attach 2+ quotes for purchases over $500. Approval thresholds: IC $500, Manager $5k, Director $25k, VP+ $100k. Vendors accessing company data need security + legal review before onboarding.\n\nRenewals require explicit owner sign-off — no auto-renewals.',
        actions: [
          { id: uid(), label: 'Open Procurement Guide', type: 'open_document', target: '8', variant: 'secondary', icon: 'FileText' },
          { id: uid(), label: 'Contact Finance', type: 'workflow', target: 'contact_hr', variant: 'ghost', icon: 'MessageSquare' },
        ],
        citations: citationsFor(MOCK_DOCUMENTS.filter((d) => d.id === '8')),
      }),
    },
    {
      pattern: /(conduct|ethics|harassment|hr|people|report)/,
      build: () => ({
        answer:
          'Our Code of Conduct commits everyone to respect, integrity, and accountability. Harassment of any kind is prohibited. You can report concerns confidentially to your manager, **people@company.com**, or the anonymous ethics hotline — retaliation is not tolerated.\n\nFor HR-specific questions (leave, WFH, payroll), I can route you to the right workflow.',
        actions: [
          { id: uid(), label: 'Open Code of Conduct', type: 'open_document', target: '6', variant: 'secondary', icon: 'FileText' },
          { id: uid(), label: 'Contact HR', type: 'workflow', target: 'contact_hr', variant: 'primary', icon: 'MessageSquare' },
        ],
        citations: citationsFor(MOCK_DOCUMENTS.filter((d) => d.id === '6')),
      }),
    },
  ];

  for (const candidate of candidates) {
    if (!candidate.pattern.test(q)) continue;
    const intent = candidate.build();
    const primaryDocId = intent.actions.find((a) => a.type === 'open_document')?.target;
    if (primaryDocId && !accessibleIds.has(primaryDocId)) {
      continue; // restricted — do not leak the answer to this role
    }
    return {
      answer: intent.answer,
      actions: intent.actions.filter((a) => a.type !== 'open_document' || accessibleIds.has(a.target)),
      citations: intent.citations.filter((c) => accessibleIds.has(c.documentId)),
    };
  }

  return {
    answer:
      relevant.length > 0
        ? `I found ${relevant.length} relevant document${relevant.length > 1 ? 's' : ''} for "${query}". Here's the most relevant: **${relevant[0].title}** — ${relevant[0].summary}\n\nWould you like me to open it, or refine your question?`
        : `I couldn't find an exact match for "${query}" in the documents you can access. Try asking about **leave, WFH, expenses, equipment, security, onboarding, or procurement** — or browse the Documents tab.`,
    actions: relevant.slice(0, 2).map((d) => ({
      id: uid(),
      label: `Open ${d.title}`,
      type: 'open_document' as const,
      target: d.id,
      variant: 'secondary' as const,
      icon: 'FileText',
    })),
    citations: citationsFor(relevant),
  };
}

// ---- Public mock API (mirrors the ApiService interface) ----

export const mockApi = {
  async login(req: LoginRequest): Promise<LoginResponse> {
    await delay(rand(300, 700));
    const user = MOCK_USERS.find((u) => u.username === req.username.trim().toLowerCase());
    const expected = `${req.username.trim().toLowerCase()}123`;
    if (!user || req.password !== expected) {
      throw { message: 'Invalid username or password.', code: 'invalid_credentials', demoMode: true };
    }
    return { token: `mock-${user.username}-${uid()}`, user };
  },

  async uploadDocument(file: File, roles?: string[]): Promise<{ id: string; filename: string; status: string }> {
    await delay(rand(400, 900));
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
      throw { message: 'Only administrators can upload documents.', code: 'forbidden', demoMode: true };
    }
    const id = uid();
    uploadedDocs.push({
      id,
      title: file.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' '),
      category: 'Other',
      summary: `Uploaded by ${user.displayName}. Content is being indexed.`,
      content: `Uploaded document: ${file.name} (${file.size} bytes).`,
      tags: ['uploaded'],
      updatedAt: nowISO(),
      version: '1.0',
      readTimeMins: 1,
      author: user.displayName,
      roles,
    });
    return { id, filename: file.name, status: 'processing' };
  },

  async chat(req: ChatRequest): Promise<ChatResponse> {
    await delay(rand(600, 1300));
    const intent = buildIntent(req.message);
    const message: ChatMessage = {
      id: uid(),
      role: 'assistant',
      content: intent.answer,
      actions: intent.actions,
      citations: intent.citations,
      createdAt: nowISO(),
    };
    return { message, sessionId: req.sessionId ?? uid() };
  },

  async getDocuments(): Promise<DocumentsResponse> {
    await delay(rand(200, 500));
    return { documents: accessibleDocs(getCurrentUser()) };
  },

  async getDocument(id: string): Promise<DocumentResponse> {
    await delay(rand(150, 400));
    const doc = MOCK_DOCUMENTS.find((d) => d.id === id);
    if (!doc) {
      throw { message: 'Document not found', code: 'not_found', demoMode: true };
    }
    if (!canAccessDoc(doc, getCurrentUser())) {
      throw { message: 'You do not have access to this document.', code: 'forbidden', demoMode: true };
    }
    return { document: doc };
  },

  async search(req: SearchRequest): Promise<SearchResponse> {
    await delay(rand(250, 600));
    const q = req.query.toLowerCase().trim();
    const words = q.split(/\W+/).filter((w) => w.length > 2);
    const docs = accessibleDocs(getCurrentUser());
    const results: SearchResult[] = docs.map((d) => {
      const text = (d.title + ' ' + d.summary + ' ' + d.tags.join(' ') + ' ' + d.content).toLowerCase();
      let score = 0;
      if (d.title.toLowerCase().includes(q) && q.length > 2) score += 5;
      for (const w of words) {
        if (text.includes(w)) score += 1;
        if (d.tags.some((t) => t.includes(w))) score += 2;
      }
      return {
        documentId: d.id,
        title: d.title,
        category: d.category,
        snippet: d.summary,
        score,
        updatedAt: d.updatedAt,
      };
    })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, req.limit ?? 8);
    return { results, query: req.query, tookMs: rand(40, 180) };
  },

  async getSuggestions(req: SuggestionsRequest): Promise<SuggestionsResponse> {
    await delay(rand(80, 200));
    const q = req.query.toLowerCase().trim();
    const docs = accessibleDocs(getCurrentUser());
    let suggestions: SearchSuggestion[];
    if (!q) {
      suggestions = MOCK_SUGGESTIONS.slice(0, 5);
    } else {
      suggestions = MOCK_SUGGESTIONS.filter((s) => s.text.toLowerCase().includes(q));
      const docMatches = docs.filter((d) => d.title.toLowerCase().includes(q)).map(
        (d) => ({ text: d.title, category: d.category, source: 'document' as const }),
      );
      suggestions = [...suggestions, ...docMatches].slice(0, 6);
    }
    return { suggestions };
  },

  async getDashboard(): Promise<DashboardResponse> {
    await delay(rand(200, 500));
    return {
      stats: {
        totalDocuments: accessibleDocs(getCurrentUser()).length,
        totalChats: 342,
        actionsTaken: 87,
        avgResponseMs: 820,
      },
      activity: MOCK_ACTIVITY,
      popularDocuments: MOCK_POPULAR_DOCUMENTS,
      recentSearches: MOCK_RECENT_SEARCHES,
    };
  },

  async runWorkflow(req: WorkflowRequest): Promise<WorkflowResponse> {
    await delay(rand(500, 1100));
    const messages: Record<WorkflowId, string> = {
      apply_leave: 'Leave request started. Opening the HR Portal leave form…',
      contact_hr: 'Connecting you with an HR representative. A ticket has been created.',
      request_equipment: 'Equipment request submitted to the IT Service Desk.',
      report_issue: 'Issue reported. The IT/Security team has been notified.',
    };
    return {
      result: {
        id: uid(),
        workflowId: req.workflowId,
        status: 'completed',
        message: messages[req.workflowId] ?? 'Workflow completed.',
        createdAt: nowISO(),
      },
    };
  },
};
