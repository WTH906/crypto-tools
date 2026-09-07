import { cn } from '../../lib/utils'

export default function Button({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) {
  const variants = {
    default:
      'bg-bg-elevated border border-border text-fg hover:bg-bg-hover hover:border-border-strong',
    primary:
      'bg-accent-bg border border-accent-dark text-accent hover:bg-accent-dark hover:text-bg',
    ghost: 'border border-transparent text-fg-muted hover:text-fg hover:bg-bg-elevated',
    danger:
      'bg-bg-elevated border border-border text-red-400 hover:border-red-900 hover:bg-red-950/30'
  }
  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-3 py-2 gap-2',
    lg: 'text-sm px-4 py-2.5 gap-2'
  }

  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-all duration-150 outline-none',
        'focus-visible:ring-2 focus-visible:ring-accent-dark focus-visible:ring-offset-1 focus-visible:ring-offset-bg',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  )
}
