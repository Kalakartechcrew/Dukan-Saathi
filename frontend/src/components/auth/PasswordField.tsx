import { Eye, EyeOff } from 'lucide-react'

interface PasswordFieldProps {
  label: string
  value?: string
  visible: boolean
  error?: string
  onToggle: () => void
  onChange?: (value: string) => void
  registration?: React.InputHTMLAttributes<HTMLInputElement>
}

export function PasswordField({ label, value, visible, error, onToggle, onChange, registration }: PasswordFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange ? (event) => onChange(event.target.value) : undefined}
          className={`w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 pr-11 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
          {...registration}
        />
        <button
          type="button"
          onClick={onToggle}
          title={visible ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
