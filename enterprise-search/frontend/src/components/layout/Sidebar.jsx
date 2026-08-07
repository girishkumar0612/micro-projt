import { NavLink } from 'react-router-dom'
import { MessageSquarePlus, FileStack, Home, ShieldCheck, ShieldOff, X } from 'lucide-react'
import { useState } from 'react'
import { useAdmin } from '../../context/AdminContext'
import Button from '../common/Button'

function NavItem({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors
        ${isActive ? 'bg-white/10 text-white' : 'text-ink-faint hover:bg-white/5 hover:text-white'}`
      }
    >
      <Icon size={17} strokeWidth={2} />
      {label}
    </NavLink>
  )
}

export default function Sidebar({ chatMessages = [], onNewChat, mobileOpen, onCloseMobile }) {
  const { isAdmin, unlock, lock } = useAdmin()
  const [tokenInput, setTokenInput] = useState('')
  const [showAdminForm, setShowAdminForm] = useState(false)

  const userTurns = chatMessages.filter((m) => m.role === 'user')

  const handleUnlock = (e) => {
    e.preventDefault()
    if (tokenInput.trim()) {
      unlock(tokenInput.trim())
      setShowAdminForm(false)
      setTokenInput('')
    }
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`fixed md:static z-50 md:z-auto top-0 left-0 h-full w-72 bg-deep text-white
          flex flex-col transition-transform duration-300 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 pt-6 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-brand-gradient flex items-center justify-center font-display font-bold text-sm">
              N
            </div>
            <span className="font-display font-semibold text-[15px] tracking-tight">Nexus</span>
          </div>
          <button onClick={onCloseMobile} className="md:hidden text-ink-faint">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="px-3 flex flex-col gap-1">
          <NavItem to="/" icon={Home} label="Home" onClick={onCloseMobile} />
          <NavItem to="/chat" icon={MessageSquarePlus} label="Ask a question" onClick={onCloseMobile} />
          <NavItem to="/documents" icon={FileStack} label="Documents" onClick={onCloseMobile} />
        </nav>

        {onNewChat && (
          <div className="px-3 mt-3">
            <Button variant="secondary" size="sm" className="w-full !bg-white/5 !text-white !border-white/10 hover:!border-brand-cyan/50" onClick={onNewChat}>
              + New chat
            </Button>
          </div>
        )}

        {/* Current session history */}
        <div className="flex-1 overflow-y-auto px-3 mt-5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-faint px-2 mb-2">
            This session
          </p>
          {userTurns.length === 0 ? (
            <p className="text-xs text-ink-faint px-2">No questions asked yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {userTurns.map((m) => (
                <li
                  key={m.id}
                  className="px-2.5 py-2 rounded-lg text-xs text-ink-faint hover:bg-white/5 hover:text-white truncate cursor-default"
                  title={m.text}
                >
                  {m.text}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Admin control */}
        <div className="border-t border-deep-border px-4 py-4">
          {isAdmin ? (
            <button
              onClick={lock}
              className="flex items-center gap-2 text-xs text-state-success hover:text-white transition-colors"
            >
              <ShieldCheck size={15} /> Admin mode active — lock
            </button>
          ) : showAdminForm ? (
            <form onSubmit={handleUnlock} className="flex flex-col gap-2">
              <input
                autoFocus
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Admin token"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs
                  text-white placeholder:text-ink-faint focus:outline-none focus:border-brand-indigo"
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="!text-xs !px-3 !py-1.5">
                  Unlock
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="!text-xs !px-3 !py-1.5 !text-ink-faint"
                  onClick={() => setShowAdminForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowAdminForm(true)}
              className="flex items-center gap-2 text-xs text-ink-faint hover:text-white transition-colors"
            >
              <ShieldOff size={15} /> Unlock admin mode
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
