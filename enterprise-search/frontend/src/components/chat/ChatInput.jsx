import { useState } from 'react'
import { SendHorizontal } from 'lucide-react'

export default function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!value.trim() || disabled) return
    onSend(value)
    setValue('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 rounded-2xl border border-ink/10 bg-white p-2.5 shadow-lg shadow-ink/5 focus-within:border-brand-indigo/50 transition-colors"
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder="Ask about your company documents..."
        disabled={disabled}
        className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink placeholder:text-ink-faint
          focus:outline-none max-h-32"
        style={{ minHeight: '40px' }}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="shrink-0 h-9 w-9 rounded-xl bg-brand-gradient text-white flex items-center justify-center
          disabled:opacity-40 hover:brightness-110 active:scale-95 transition-all"
      >
        <SendHorizontal size={16} />
      </button>
    </form>
  )
}
