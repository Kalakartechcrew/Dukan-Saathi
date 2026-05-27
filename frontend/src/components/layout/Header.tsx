import { Moon, Sun, Bell, Search, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import api from '@/lib/api'

export function Header({ title }: { title: string }) {
  const { theme, toggle } = useThemeStore()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications')).data,
    refetchInterval: 30_000,
  })
  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
  const unread = (notifications.data || []).filter((item: { read?: boolean }) => !item.read).length

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b border-slate-200/50 bg-white/75 px-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/75 sm:min-h-16 sm:px-4 lg:px-6">
      <h1 className="truncate text-base font-semibold text-slate-900 dark:text-white sm:text-xl">{title}</h1>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        {user?.role !== 'super_admin' && user?.role !== 'admin' && <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 lg:flex dark:border-slate-700 dark:bg-slate-900/80">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            placeholder="Search products, customers..."
            className="w-48 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>}
        <Button variant="ghost" size="sm" onClick={toggle} aria-label="Toggle theme" tooltip="Switch between light and dark mode.">
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>
        <div className="group relative">
          <Button variant="ghost" size="sm" aria-label="Notifications" tooltip="View business alerts and reminders.">
            <Bell className="h-5 w-5" />
            {unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />}
          </Button>
          <div className="invisible absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-900">
            <p className="mb-2 text-sm font-semibold">Notifications</p>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {(notifications.data || []).slice(0, 8).map((item: { id: string; title: string; message: string; read?: boolean }) => (
                <button
                  key={item.id}
                  onClick={() => markRead.mutate(item.id)}
                  title="Mark this notification as read."
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm ${item.read ? 'bg-slate-50 text-slate-500 dark:bg-slate-800/50' : 'bg-indigo-50 text-slate-800 dark:bg-indigo-500/10 dark:text-slate-100'}`}
                >
                  <span className="font-medium">{item.title}</span>
                  <span className="mt-1 block text-xs opacity-80">{item.message}</span>
                </button>
              ))}
              {!notifications.data?.length && <p className="py-6 text-center text-sm text-slate-400">No notifications</p>}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="Log out" tooltip="Log out and return to the landing page.">
          <LogOut className="h-5 w-5" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  )
}
