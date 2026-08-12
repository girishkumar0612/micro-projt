import type { KnowledgeDocument, ActivityItem, PopularDocument, SearchSuggestion, AuthUser } from '@/types';

// Demo accounts. Password is the same as the username + "123" (hr/hr123, etc.).
// Mirrors the backend's seeded users.
export const MOCK_USERS: AuthUser[] = [
  { username: 'admin', role: 'admin', displayName: 'Admin' },
  { username: 'hr', role: 'hr', displayName: 'HR Officer' },
  { username: 'manager', role: 'manager', displayName: 'Team Manager' },
  { username: 'it', role: 'it', displayName: 'IT Support' },
  { username: 'finance', role: 'finance', displayName: 'Finance' },
  { username: 'operations', role: 'operations', displayName: 'Operations' },
  { username: 'legal', role: 'legal', displayName: 'Legal Counsel' },
  { username: 'security', role: 'security', displayName: 'Security' },
  { username: 'employee', role: 'employee', displayName: 'Employee' },
];

export const MOCK_ROLES = MOCK_USERS.map((u) => u.role);

export const MOCK_DOCUMENTS: KnowledgeDocument[] = [
  {
    id: '1',
    title: 'Leave Policy',
    category: 'HR',
    summary: 'Comprehensive guide to paid time off, sick leave, and parental leave entitlements.',
    tags: ['leave', 'vacation', 'pto', 'sick', 'parental'],
    version: '3.2',
    updatedAt: '2026-07-14T10:00:00Z',
    readTimeMins: 6,
    author: 'Priya Nair, Head of People',
    roles: [],
    content: `# Leave Policy

## Overview
All full-time employees are entitled to paid time off. This document outlines the categories, accrual rates, and the process for requesting leave.

## Leave Categories

### Annual Leave (Vacation)
- **Accrual**: 1.75 days per month (21 days/year).
- **Carryover**: Up to 10 unused days roll into the next calendar year.
- **Advance booking**: Requests must be submitted at least 5 business days in advance.

### Sick Leave
- **Entitlement**: 12 paid sick days per calendar year.
- **Documentation**: A medical certificate is required for 3+ consecutive sick days.
- **Notification**: Notify your manager and HR before 9:30 AM on the first day.

### Parental Leave
- **Maternity**: 26 weeks of paid leave.
- **Paternity**: 4 weeks of paid leave within 6 months of birth/adoption.
- **Adoption**: 16 weeks of paid leave for the primary caregiver.

## How to Apply
1. Open the HR Portal → **My Leave**.
2. Select leave type and date range.
3. Add a reason and submit.
4. Your manager receives an automated approval request.

> Leave during probation (first 90 days) is limited to sick leave only.

## Contact
For questions, contact **people@company.com** or use the "Contact HR" action in this assistant.`,
  },
  {
    id: '2',
    title: 'Work From Home (WFH) Policy',
    category: 'HR',
    summary: 'Guidelines for remote work eligibility, equipment, and hybrid schedules.',
    tags: ['wfh', 'remote', 'hybrid', 'work from home'],
    version: '2.1',
    updatedAt: '2026-06-30T14:00:00Z',
    readTimeMins: 4,
    author: 'Priya Nair, Head of People',
    content: `# Work From Home Policy

## Eligibility
All employees who have completed their probation period are eligible for hybrid work. Up to **3 days per week** may be worked remotely, subject to team-level norms.

## Core Hours
- **Mandatory in-office days**: Tuesday and Thursday.
- **Core collaboration hours**: 10:00 AM – 4:00 PM (local time).
- Outside core hours, flexible scheduling applies.

## Equipment
The company provides:
- One ergonomic chair for home use (request via IT).
- A monitor, keyboard, and mouse if needed.
- Monthly internet stipend of **$40** (auto-added to payroll).

## Expectations
- Be reachable on Slack during core hours.
- Keep your calendar updated with focus blocks.
- Video on for client-facing and cross-team meetings.

## Expense Reimbursement
Home-office equipment beyond the standard kit is reimbursed up to **$200/year**. Submit receipts through the Finance portal under "WFH Allowance".`,
  },
  {
    id: '3',
    title: 'Expense Reimbursement Process',
    category: 'Finance',
    summary: 'How to submit expenses, approval thresholds, and reimbursement timelines.',
    tags: ['reimbursement', 'expense', 'finance', 'travel'],
    version: '4.0',
    updatedAt: '2026-08-01T09:00:00Z',
    readTimeMins: 5,
    author: 'Marcus Chen, CFO',
    roles: ['finance', 'manager'],
    content: `# Expense Reimbursement Process

## Submitting an Expense
1. Open the **Finance Portal** → **New Expense**.
2. Select a category (Travel, Meals, Equipment, Misc).
3. Upload the receipt (PDF/JPG, max 10 MB).
4. Add project code if the expense is billable.
5. Submit for approval.

## Approval Thresholds
| Amount | Approver |
|--------|----------|
| Up to $100 | Direct manager |
| $100 – $1,000 | Manager + Finance |
| $1,000+ | Manager + Finance + CFO |

## Reimbursement Timeline
- Approved expenses are reimbursed in the **next payroll cycle**.
- Cut-off for monthly payroll: the **15th of each month**.
- Expenses submitted after the cut-off roll to the following cycle.

## Travel Expenses
- Book flights and hotels through the approved travel portal.
- Per diem for domestic travel: **$60/day**.
- Per diem for international travel: **$120/day**.

## Common Rejections
- Missing or illegible receipts.
- Expense submitted more than **30 days** after the transaction.
- Personal expenses without a clear business justification.`,
  },
  {
    id: '4',
    title: 'IT Equipment Request Guide',
    category: 'IT',
    summary: 'Request laptops, peripherals, software access, and account provisioning.',
    tags: ['equipment', 'laptop', 'software', 'access', 'it'],
    version: '5.3',
    updatedAt: '2026-07-22T11:30:00Z',
    readTimeMins: 4,
    author: 'Dana Ortiz, IT Lead',
    roles: ['it'],
    content: `# IT Equipment Request Guide

## Standard Kit
Every new hire receives:
- MacBook Pro 14" (or Dell XPS for Windows roles).
- Docking station, 27" monitor, keyboard, mouse.
- Headset for calls.

## Requesting Additional Equipment
1. Go to **IT Service Desk** → **New Request**.
2. Choose a category: Hardware, Software, Access.
3. Provide business justification.
4. Standard turnaround: **3 business days**.

## Software Access
Common requests:
- **GitHub**: Request via Service Desk → "Repository Access".
- **Figma**: Email design-ops@company.com with project name.
- **AWS Console**: Requires manager + security approval.

## Account Provisioning
New accounts are created within **24 hours** of the IT ticket. You will receive credentials via your personal email.

## Lost or Stolen Devices
Report immediately to **security@company.com** and lock the device via Find My / Prey. A replacement is issued within 2 business days.`,
  },
  {
    id: '5',
    title: 'Information Security Handbook',
    category: 'Security',
    summary: 'Password standards, MFA, data handling, and incident reporting.',
    tags: ['security', 'password', 'mfa', 'phishing', 'data', 'incident'],
    version: '6.1',
    updatedAt: '2026-08-05T08:00:00Z',
    readTimeMins: 7,
    author: 'Sarah Kim, CISO',
    roles: ['security', 'it'],
    content: `# Information Security Handbook

## Passwords
- Use the company password manager (1Password).
- Minimum 14 characters; no reuse across services.
- Never share credentials, even with IT.

## Multi-Factor Authentication (MFA)
MFA is **mandatory** for:
- Company email
- VPN
- AWS / cloud consoles
- Any system holding customer data

Use a hardware key (YubiKey) or the authenticator app. SMS-based MFA is **not** permitted.

## Data Handling
| Classification | Examples | Storage |
|----------------|----------|---------|
| Public | Marketing assets | Anywhere |
| Internal | SOPs, org charts | Company cloud |
| Confidential | Customer data, financials | Encrypted, access-controlled |
| Restricted | PII, credentials | Vault only |

## Phishing
- Suspicious emails: use the **"Report Phishing"** button in your mail client.
- Never click links or download attachments from unknown senders.
- IT will never ask for your password.

## Incident Reporting
Report any suspected breach, lost device, or suspicious activity to **security@company.com** or call the 24/7 hotline. There is **no blame** for reporting — speed matters.`,
  },
  {
    id: '6',
    title: 'Code of Conduct',
    category: 'Legal',
    summary: 'Workplace behavior standards, anti-harassment, and reporting channels.',
    tags: ['conduct', 'ethics', 'harassment', 'legal', 'workplace'],
    version: '2.4',
    updatedAt: '2026-05-18T12:00:00Z',
    readTimeMins: 8,
    author: 'James Whitfield, General Counsel',
    roles: ['hr', 'legal', 'manager'],
    content: `# Code of Conduct

## Our Principles
We are committed to a workplace built on respect, integrity, and accountability. Every employee is expected to uphold these values.

## Respect in the Workplace
- Treat colleagues, clients, and partners with dignity.
- No harassment, discrimination, or bullying of any kind.
- Diverse perspectives are an asset — listen before you respond.

## Anti-Harassment
Harassment in any form — verbal, physical, digital — is strictly prohibited. This includes:
- Offensive jokes or comments.
- Unwelcome advances.
- Retaliation against anyone who reports misconduct.

## Reporting a Concern
You can report confidentially and without retaliation:
1. Your manager or skip-level manager.
2. **people@company.com**.
3. The anonymous ethics hotline: **1-800-XXX-XXXX**.

## Conflicts of Interest
Disclose any outside employment, investments, or relationships that could conflict with the company's interests. Use the annual disclosure form.

## Consequences
Violations may result in disciplinary action up to and including termination. Severity is assessed case by case.`,
  },
  {
    id: '7',
    title: 'Onboarding Checklist',
    category: 'Operations',
    summary: 'First-week tasks for new hires: accounts, tools, and introductions.',
    tags: ['onboarding', 'new hire', 'checklist', 'first week'],
    version: '1.8',
    updatedAt: '2026-07-01T10:00:00Z',
    readTimeMins: 3,
    author: 'Priya Nair, Head of People',
    content: `# Onboarding Checklist

## Day 1
- [ ] Collect laptop and access badge from IT.
- [ ] Set up company email and MFA.
- [ ] Meet your manager for a welcome 1:1.
- [ ] Complete tax and payroll forms in the HR portal.

## Day 2–3
- [ ] Join your team's Slack channels.
- [ ] Get access to GitHub / Jira / Figma (request via IT Service Desk).
- [ ] Schedule intro chats with 3 teammates.
- [ ] Review the Code of Conduct and Security Handbook.

## Week 1
- [ ] Complete the "Company 101" training module.
- [ ] Set up your 1:1 cadence with your manager.
- [ ] Pick up your first small task with your tech lead.

## Week 2
- [ ] 30-day check-in with your manager.
- [ ] Submit any pending equipment requests.
- [ ] Add your bio to the company wiki.`,
  },
  {
    id: '8',
    title: 'Procurement & Vendor Management',
    category: 'Operations',
    summary: 'How to raise purchase orders, vendor onboarding, and spending limits.',
    tags: ['procurement', 'vendor', 'purchase order', 'spending'],
    version: '3.0',
    updatedAt: '2026-06-12T15:00:00Z',
    readTimeMins: 5,
    author: 'Marcus Chen, CFO',
    roles: ['operations', 'finance', 'manager'],
    content: `# Procurement & Vendor Management

## Raising a Purchase Order
1. Create a PO in the **Procurement Portal**.
2. Attach at least 2 quotes for purchases over $500.
3. Route for approval based on the threshold table.
4. PO must be approved **before** the commitment is made.

## Spending Limits
| Role | Single PO limit |
|------|-----------------|
| IC | $500 |
| Manager | $5,000 |
| Director | $25,000 |
| VP+ | $100,000 |

## Vendor Onboarding
- Security review is required for any vendor accessing company data.
- Legal review of the MSA/SOW before signing.
- Vendors are added to the system only after both reviews clear.

## Renewals
Procurement sends renewal reminders 60 and 30 days out. No auto-renewals without explicit owner sign-off.`,
  },
];

export const MOCK_POPULAR_DOCUMENTS: PopularDocument[] = [
  { documentId: '1', title: 'Leave Policy', category: 'HR', views: 1284 },
  { documentId: '5', title: 'Information Security Handbook', category: 'Security', views: 942 },
  { documentId: '2', title: 'Work From Home (WFH) Policy', category: 'HR', views: 876 },
  { documentId: '3', title: 'Expense Reimbursement Process', category: 'Finance', views: 653 },
  { documentId: '4', title: 'IT Equipment Request Guide', category: 'IT', views: 521 },
];

export const MOCK_RECENT_SEARCHES: string[] = [
  'How do I apply for leave?',
  'WFH rules for new joiners',
  'Reimbursement for travel',
  'How to reset my password',
  'Procurement spending limits',
];

export const MOCK_SUGGESTIONS: SearchSuggestion[] = [
  { text: 'Leave policy', category: 'HR', source: 'popular' },
  { text: 'WFH rules', category: 'HR', source: 'popular' },
  { text: 'Reimbursement process', category: 'Finance', source: 'popular' },
  { text: 'How to reset my password', category: 'IT', source: 'popular' },
  { text: 'Procurement spending limits', category: 'Operations', source: 'popular' },
  { text: 'What is the parental leave entitlement?', source: 'ai' },
  { text: 'How do I report a security incident?', category: 'Security', source: 'ai' },
  { text: 'Equipment request for new monitor', category: 'IT', source: 'ai' },
];

export const MOCK_ACTIVITY: ActivityItem[] = [
  { id: 'a1', type: 'chat', label: 'Asked about leave policy', detail: 'Leave Policy', timestamp: '2026-08-11T09:14:00Z' },
  { id: 'a2', type: 'document_view', label: 'Opened document', detail: 'Information Security Handbook', timestamp: '2026-08-11T08:42:00Z' },
  { id: 'a3', type: 'action', label: 'Triggered workflow', detail: 'Apply for Leave', timestamp: '2026-08-10T17:05:00Z' },
  { id: 'a4', type: 'search', label: 'Searched for', detail: 'WFH rules', timestamp: '2026-08-10T15:20:00Z' },
  { id: 'a5', type: 'chat', label: 'Asked about reimbursement', detail: 'Expense Reimbursement Process', timestamp: '2026-08-10T11:33:00Z' },
  { id: 'a6', type: 'document_view', label: 'Opened document', detail: 'Onboarding Checklist', timestamp: '2026-08-09T14:10:00Z' },
  { id: 'a7', type: 'action', label: 'Triggered workflow', detail: 'Contact HR', timestamp: '2026-08-09T10:48:00Z' },
  { id: 'a8', type: 'search', label: 'Searched for', detail: 'procurement vendor', timestamp: '2026-08-08T16:22:00Z' },
];
