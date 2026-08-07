import { useState } from 'react'
import { FileText, ChevronDown } from 'lucide-react'

export default function SourceCitation({ source, chunks = [] }) {
  const [open, setOpen] = useState(false)
  if (!source) return null

  return (
    <div className="mt-3 border-t border-ink/5 pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs font-medium text-brand-indigo hover:text-brand-violet transition-colors"
      >
        <FileText size={13} />
        <span>{source}</span>
        {chunks.length > 0 && (
          <>
            <ChevronDown
              size={13}
              className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
            <span className="text-ink-faint font-normal">
              {open ? 'Hide' : 'View'} {chunks.length} retrieved excerpt{chunks.length > 1 ? 's' : ''}
            </span>
          </>
        )}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2 animate-fadeInUp">
          {chunks.map((c, i) => (
            <div
              key={i}
              className="rounded-lg bg-canvas border border-ink/5 px-3 py-2.5 text-xs text-ink-soft"
            >
              <div className="flex items-center justify-between mb-1.5 font-mono text-[10px] text-ink-faint">
                <span>
                  {c.source} {c.page ? `· page ${c.page}` : ''}
                </span>
                <span className="rounded-full bg-brand-indigo/10 text-brand-indigo px-2 py-0.5">
                  {(c.score * 100).toFixed(0)}% match
                </span>
              </div>
              <p className="leading-relaxed line-clamp-4">{c.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
