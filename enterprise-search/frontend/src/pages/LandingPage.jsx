import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessageSquareText, ShieldCheck, FileSearch, ArrowRight } from 'lucide-react'
import Sidebar from '../components/layout/Sidebar'
import { useState } from 'react'
import { Menu } from 'lucide-react'

// Nodes represent document chunks scattered around; all connect into the
// central "answer" node — a direct visualization of the RAG pipeline.
const NODES = [
  { x: 90, y: 70 }, { x: 480, y: 60 }, { x: 60, y: 220 }, { x: 520, y: 240 },
  { x: 140, y: 340 }, { x: 440, y: 350 }, { x: 300, y: 40 }, { x: 300, y: 380 },
]
const CENTER = { x: 300, y: 210 }

function ConstellationHero() {
  return (
    <svg viewBox="0 0 600 420" className="w-full max-w-xl mx-auto" role="img" aria-label="Document fragments connecting into a single grounded answer">
      {NODES.map((n, i) => (
        <line
          key={i}
          x1={n.x} y1={n.y} x2={CENTER.x} y2={CENTER.y}
          stroke="url(#lineGrad)"
          strokeWidth="1.5"
          strokeDasharray="340"
          strokeDashoffset="340"
          className="animate-dash"
          style={{ animationDelay: `${0.15 * i}s` }}
        />
      ))}
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      {NODES.map((n, i) => (
        <g key={i} className="animate-floatSlow" style={{ animationDelay: `${0.2 * i}s` }}>
          <circle cx={n.x} cy={n.y} r="7" fill="#FFFFFF" stroke="#8B5CF6" strokeWidth="1.5" />
          <rect x={n.x - 10} y={n.y - 3} width="20" height="6" rx="1.5" fill="#C7D2FE" opacity="0.7" />
        </g>
      ))}
      <circle cx={CENTER.x} cy={CENTER.y} r="34" fill="url(#coreGrad)" className="animate-pulseGlow" />
      <circle cx={CENTER.x} cy={CENTER.y} r="16" fill="white" opacity="0.9" />
      <defs>
        <radialGradient id="coreGrad">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#06B6D4" />
        </radialGradient>
      </defs>
    </svg>
  )
}

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex-1 overflow-y-auto">
        <header className="flex items-center px-5 py-4 md:hidden">
          <button onClick={() => setMobileOpen(true)} className="text-ink-soft">
            <Menu size={20} />
          </button>
        </header>

        {/* Hero */}
        <section className="px-6 pt-10 md:pt-20 pb-16 max-w-6xl mx-auto text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block text-xs font-medium tracking-wide uppercase text-brand-indigo bg-brand-gradient-soft px-3 py-1 rounded-full mb-6"
          >
            Retrieval-Augmented Generation
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-display text-4xl md:text-6xl font-semibold text-ink tracking-tight leading-[1.1]"
          >
            Ask your company's
            <br />
            <span className="bg-brand-gradient bg-clip-text text-transparent">documents anything.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-5 text-ink-soft text-base md:text-lg max-w-xl mx-auto"
          >
            Nexus turns scattered PDFs — policies, handbooks, contracts — into one
            assistant that answers in plain language and always shows its source.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-8 flex items-center justify-center gap-3"
          >
            <Link
              to="/chat"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient text-white px-6 py-3 text-sm font-medium shadow-lg shadow-brand-indigo/20 hover:brightness-110 active:scale-[0.98] transition-all"
            >
              Launch assistant <ArrowRight size={16} />
            </Link>
            <Link
              to="/documents"
              className="inline-flex items-center gap-2 rounded-xl border border-ink/10 bg-white px-6 py-3 text-sm font-medium text-ink hover:border-brand-indigo/40 transition-all"
            >
              Manage documents
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-14"
          >
            <ConstellationHero />
          </motion.div>
        </section>

        {/* Features */}
        <section className="px-6 pb-20 max-w-5xl mx-auto grid gap-5 sm:grid-cols-3">
          {[
            {
              icon: MessageSquareText,
              title: 'Ask in natural language',
              desc: 'No search syntax. Type a real question and get a real answer, the way you\u2019d ask a colleague.',
            },
            {
              icon: FileSearch,
              title: 'Grounded, cited answers',
              desc: 'Every answer links back to the exact document and passage it came from — nothing invented.',
            },
            {
              icon: ShieldCheck,
              title: 'Enterprise-ready control',
              desc: 'Admins manage what\u2019s indexed; the assistant only ever answers from approved documents.',
            },
          ].map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl bg-white border border-ink/5 p-6 hover:border-brand-indigo/30 hover:shadow-lg hover:shadow-brand-indigo/5 transition-all"
            >
              <div className="h-10 w-10 rounded-xl bg-brand-gradient-soft flex items-center justify-center mb-4">
                <Icon size={18} className="text-brand-indigo" />
              </div>
              <h3 className="font-display font-semibold text-ink text-sm mb-1.5">{title}</h3>
              <p className="text-xs text-ink-soft leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </section>
      </div>
    </div>
  )
}
