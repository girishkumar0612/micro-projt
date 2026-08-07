import { NavLink, useNavigate } from 'react-router-dom'
import { MessageSquarePlus, FileStack, Home, LogOut, ShieldCheck, User, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const ROLE_STYLES = {
  admin:    'bg-brand-indigo/10 text-brand-indigo',
  employee: 'bg-state-success/10 text-state-success',
  hr:       'bg-brand-violet/10 text-brand-violet',
  finance:  'bg-state-warning/10 text-state-warning',
  it:       'bg-brand-cyan/10 text-brand-cyan',
}

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
  const { currentUser, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const userTurns = chatMessages.filter((m) => m.role === 'user')

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
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

        {/* Nav — links differ by role */}
        <nav className="px-3 flex flex-col gap-1">
          {isAdmin ? (
            <>
              <NavItem to="/admin/documents" icon={FileStack} label="Manage Documents" onClick={onCloseMobile} />
              <NavItem to="/home" icon={Home} label="Home" onClick={onCloseMobile} />
            </>
          ) : (
            <>
              <NavItem to="/employee/chat" icon={MessageSquarePlus} label="Ask a question" onClick={onCloseMobile} />
              <NavItem to="/employee/documents" icon={FileStack} label="My Documents" onClick={onCloseMobile} />
              <NavItem to="/home" icon={Home} label="Home" onClick={onCloseMobile} />
            </>
          )}
        </nav>

        {/* New chat button (employee only) */}
        {!isAdmin && onNewChat && (
          <div className="px-3 mt-3">
            <button
              onClick={onNewChat}
              className="w-full rounded-xl border border-white/10 bg-white/5 text-white text-sm font-medium py-2 hover:border-brand-cyan/50 transition-colors"
            >
              + New chat
            </button>
          </div>
        )}

        {/* Session chat history (employee only) */}
        {!isAdmin && (
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
        )}

        {isAdmin && <div className="flex-1" />}

        {/* User identity + logout */}
        <div className="border-t border-deep-border px-4 py-4">
          {currentUser ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  {currentUser.role === 'admin'
                    ? <ShieldCheck size={15} className="text-brand-indigo" />
                    : <User size={15} className="text-ink-faint" />
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate">{currentUser.name}</p>
                  <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 mt-0.5 ${ROLE_STYLES[currentUser.role] || 'bg-white/10 text-white'}`}>
                    {currentUser.role}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="text-ink-faint hover:text-state-danger transition-colors p-1.5 rounded-lg hover:bg-state-danger/10 shrink-0"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  )
}
