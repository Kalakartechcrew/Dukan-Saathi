import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  tooltip?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, tooltip, title, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      title={tooltip || title || props['aria-label']}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
        variant === 'primary' && 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40',
        variant === 'secondary' && 'glass text-slate-700 dark:text-slate-200 hover:bg-white/90',
        variant === 'ghost' && 'hover:bg-slate-100 dark:hover:bg-slate-800',
        variant === 'danger' && 'bg-red-500 text-white hover:bg-red-600',
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2.5 text-sm',
        size === 'lg' && 'px-6 py-3 text-base',
        className
      )}
      {...props}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
