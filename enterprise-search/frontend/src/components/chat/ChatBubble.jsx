import { motion } from 'framer-motion'
import { Sparkles, User, AlertTriangle, Lock } from 'lucide-react'
import SourceCitation from './SourceCitation'

export default function ChatBubble({ message }) {
  const isUser = message.role === 'user'
  const isAccessRestricted = message.errorCode === 'ACCESS_RESTRICTED'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <div
        className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center
          ${isUser ? 'bg-ink/10 text-ink-soft' : 'bg-brand-gradient text-white'}`}
      >
        {isUser ? <User size={15} /> : <Sparkles size={15} />}
      </div>

      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
          ${
            isUser
              ? 'bg-brand-gradient text-white rounded-tr-sm'
              : isAccessRestricted
              ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-tl-sm'
              : message.error
              ? 'bg-state-danger/5 border border-state-danger/20 text-state-danger rounded-tl-sm'
              : 'bg-white border border-ink/5 text-ink rounded-tl-sm'
          }`}
      >
        {isAccessRestricted ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 font-semibold text-amber-800">
              <Lock size={14} strokeWidth={2.5} />
              Access Restricted
            </div>
            <p className="text-amber-800/80 leading-relaxed">
              You do not have permission to access this document. Please contact your
              administrator if you believe you should have access.
            </p>
          </div>
        ) : (
          <>
            {message.error && (
              <div className="flex items-center gap-1.5 text-xs font-medium mb-1">
                <AlertTriangle size={12} /> Couldn't answer that
              </div>
            )}
            <p className="whitespace-pre-wrap">{message.text}</p>

            {!isUser && !message.error && (
              <SourceCitation source={message.source} chunks={message.chunks} />
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}
