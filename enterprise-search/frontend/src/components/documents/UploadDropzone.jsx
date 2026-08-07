import { useCallback, useRef, useState } from 'react'
import { UploadCloud, FileText, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function UploadDropzone({ onFileSelected, uploading, progress }) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) onFileSelected(file)
    },
    [onFileSelected],
  )

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = (e) => {
    // Only clear when leaving the entire zone, not a child element
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false)
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Upload PDF file"
      onKeyDown={(e) => e.key === 'Enter' && !uploading && inputRef.current?.click()}
      className={`
        relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-200 select-none
        ${uploading
          ? 'cursor-default border-brand-indigo/40 bg-brand-gradient-soft'
          : isDragging
            ? 'cursor-copy border-brand-indigo bg-brand-gradient-soft scale-[1.005] shadow-lg shadow-brand-indigo/10'
            : 'cursor-pointer border-ink/10 bg-white hover:border-brand-indigo/40 hover:bg-canvas/80 hover:shadow-sm'
        }
      `}
    >
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFileSelected(file)
          e.target.value = ''
        }}
      />

      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#131A2C 1px, transparent 1px), linear-gradient(90deg, #131A2C 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <AnimatePresence mode="wait">
        {uploading ? (
          /* ── Uploading state ───────────────────────────────────── */
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative px-8 py-10 flex flex-col items-center gap-4"
          >
            {/* Spinning ring */}
            <div className="relative h-16 w-16">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56">
                <circle
                  cx="28" cy="28" r="24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-ink/[0.07]"
                />
                <motion.circle
                  cx="28" cy="28" r="24"
                  fill="none"
                  stroke="url(#progressGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 24}`}
                  animate={{ strokeDashoffset: 2 * Math.PI * 24 * (1 - progress / 100) }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
                <defs>
                  <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4F46E5" />
                    <stop offset="100%" stopColor="#06B6D4" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-brand-indigo font-mono">{progress}%</span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm font-semibold text-ink">
                {progress < 100 ? 'Uploading…' : 'Indexing document…'}
              </p>
              <p className="text-xs text-ink-soft mt-1">
                {progress < 100
                  ? 'Transferring file to the server'
                  : 'Extracting text and building vector index'}
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-xs">
              <div className="h-1.5 rounded-full bg-ink/[0.07] overflow-hidden">
                <motion.div
                  className="h-full bg-brand-gradient rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
              </div>
            </div>
          </motion.div>
        ) : (
          /* ── Idle / dragging state ─────────────────────────────── */
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative px-8 py-10 flex flex-col items-center gap-4"
          >
            {/* Icon */}
            <motion.div
              animate={isDragging
                ? { scale: 1.15, rotate: -4 }
                : { scale: 1, rotate: 0 }
              }
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`h-16 w-16 rounded-2xl flex items-center justify-center shadow-md transition-colors duration-200
                ${isDragging ? 'bg-brand-gradient shadow-brand-indigo/30' : 'bg-brand-gradient shadow-brand-indigo/15'}`}
            >
              {isDragging
                ? <FileText size={26} className="text-white" />
                : <UploadCloud size={26} className="text-white" />
              }
            </motion.div>

            {/* Text */}
            <div className="text-center">
              <AnimatePresence mode="wait">
                {isDragging ? (
                  <motion.p
                    key="drop"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-sm font-semibold text-brand-indigo"
                  >
                    Release to select this file
                  </motion.p>
                ) : (
                  <motion.p
                    key="idle-text"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-sm font-semibold text-ink"
                  >
                    Drag & drop a PDF, or{' '}
                    <span className="text-brand-indigo underline underline-offset-2 decoration-dotted">
                      browse files
                    </span>
                  </motion.p>
                )}
              </AnimatePresence>
              <p className="text-xs text-ink-faint mt-1.5">PDF only · Maximum 20 MB</p>
            </div>

            {/* Supported format pill */}
            <div className="flex items-center gap-2 rounded-xl bg-ink/[0.04] border border-ink/[0.06] px-4 py-2">
              <CheckCircle2 size={12} className="text-state-success shrink-0" />
              <span className="text-[11px] text-ink-soft font-medium">
                Supports text-based PDFs · Auto-indexed with semantic embeddings
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
