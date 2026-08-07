import { Menu } from 'lucide-react'

export default function Navbar({ title, onMenuClick }) {
  return (
    <header className="flex items-center gap-3 px-5 py-4 border-b border-ink/5 bg-surface/80 backdrop-blur-sm sticky top-0 z-30">
      <button onClick={onMenuClick} className="md:hidden text-ink-soft">
        <Menu size={20} />
      </button>
      <h1 className="font-display font-semibold text-ink text-[15px]">{title}</h1>
    </header>
  )
}
