const variants = {
  primary:
    'bg-brand-gradient text-white shadow-sm shadow-brand-indigo/20 hover:brightness-110 active:scale-[0.98]',
  secondary:
    'bg-white text-ink border border-ink-faint/30 hover:border-brand-indigo/50 hover:text-brand-indigo',
  ghost: 'bg-transparent text-ink-soft hover:bg-ink/5',
  danger: 'bg-white text-state-danger border border-state-danger/30 hover:bg-state-danger/5',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  disabled,
  className = '',
  ...props
}) {
  const sizeCls = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5 text-sm'
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium
        transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeCls} ${variants[variant]} ${className}`}
      {...props}
    >
      {Icon && <Icon size={16} strokeWidth={2.25} />}
      {children}
    </button>
  )
}
