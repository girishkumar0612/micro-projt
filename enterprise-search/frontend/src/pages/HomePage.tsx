import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button, Card } from '@/components/ui';

const capabilities = [
  {
    icon: Search,
    title: 'Find answers instantly',
    description: 'Search policies, SOPs, and manuals with clear answers grounded in your company knowledge.',
  },
  {
    icon: Zap,
    title: 'Turn answers into action',
    description: 'Launch workflows like leave requests, equipment requests, and HR support without leaving the conversation.',
  },
  {
    icon: ShieldCheck,
    title: 'Built for trusted teams',
    description: 'Keep every answer connected to a source document so employees can verify important information.',
  },
];

const examples = ['How do I apply for leave?', 'What are the WFH rules?', 'How do I request a monitor?'];

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute -top-32 right-[-8rem] h-96 w-96 rounded-full bg-brand-400/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-10rem] left-[-8rem] h-96 w-96 rounded-full bg-accent-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-16">
        <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-slide-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300">
              <Sparkles className="h-3.5 w-3.5" />
              Your company knowledge, made actionable
            </div>
            <h2 className="max-w-2xl text-balance text-4xl font-bold leading-[1.12] tracking-tight text-surface-950 dark:text-surface-50 sm:text-5xl lg:text-6xl">
              Work smarter with your{' '}
              <span className="gradient-text">AI knowledge partner.</span>
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-surface-600 dark:text-surface-300 sm:text-lg">
              Atlas helps every employee find the right answer, understand the source, and take the next step in seconds.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" icon={<MessageSquare className="h-5 w-5" />} onClick={() => navigate('/chat')}>
                Ask Atlas
              </Button>
              <Button size="lg" variant="outline" icon={<FileText className="h-5 w-5" />} onClick={() => navigate('/documents')}>
                Browse knowledge
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-surface-500 dark:text-surface-400">
              {['Answers with sources', 'Action-ready workflows', 'Demo mode enabled'].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-500" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <Card className="relative overflow-hidden border-brand-100 bg-white/90 p-0 shadow-float dark:border-brand-500/20 dark:bg-surface-900/90 animate-scale-in">
            <div className="flex items-center justify-between border-b border-surface-200 px-5 py-4 dark:border-surface-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">Ask Atlas</p>
                  <p className="text-[11px] text-surface-400">Knowledge assistant</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ready
              </span>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              <div className="flex justify-end">
                <div className="max-w-[82%] rounded-2xl rounded-br-md bg-brand-600 px-4 py-3 text-sm leading-relaxed text-white shadow-sm">
                  How do I apply for leave?
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
                  <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="rounded-2xl rounded-tl-md border border-surface-200 bg-surface-50 px-4 py-3 text-sm leading-relaxed text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200">
                    You can apply through the <strong>HR Portal → My Leave</strong>. Full-time employees accrue 1.75 days per month.
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => navigate('/documents?id=1')} className="rounded-xl bg-surface-100 px-3 py-2 text-xs font-medium text-surface-700 transition-colors hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-200 dark:hover:bg-surface-700">
                      Open policy
                    </button>
                    <button onClick={() => navigate('/chat')} className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-700">
                      Apply for leave
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-surface-200 bg-surface-50 px-5 py-3 dark:border-surface-800 dark:bg-surface-950/50">
              <div className="flex items-center gap-2 rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-xs text-surface-400 dark:border-surface-700 dark:bg-surface-900">
                <Search className="h-3.5 w-3.5" /> Ask about a policy or workflow…
              </div>
            </div>
          </Card>
        </section>

        <section className="mt-20 border-t border-surface-200 pt-10 dark:border-surface-800">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">One workspace</p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-50">From question to done.</h3>
            </div>
            <button onClick={() => navigate('/chat')} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200">
              Start exploring <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {capabilities.map((item) => (
              <Card key={item.title} className="p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-float">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
                  <item.icon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                </div>
                <h4 className="mt-4 text-sm font-semibold text-surface-900 dark:text-surface-50">{item.title}</h4>
                <p className="mt-2 text-sm leading-6 text-surface-500 dark:text-surface-400">{item.description}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-surface-200 bg-white p-5 dark:border-surface-800 dark:bg-surface-900 sm:flex sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">Try a question to see Atlas in action</p>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">Preloaded demo knowledge keeps every flow ready for your next conversation.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 sm:mt-0 sm:justify-end">
            {examples.map((example) => (
              <button key={example} onClick={() => navigate(`/chat?prompt=${encodeURIComponent(example)}`)} className="rounded-xl border border-surface-200 px-3 py-2 text-xs font-medium text-surface-600 transition-colors hover:border-brand-300 hover:text-brand-700 dark:border-surface-700 dark:text-surface-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300">
                {example}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
