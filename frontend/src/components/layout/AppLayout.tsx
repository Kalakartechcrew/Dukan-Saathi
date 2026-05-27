import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAuthStore } from '@/stores/authStore'

const INACTIVITY_LIMIT_MS = 24 * 60 * 60 * 1000
const ACTIVITY_EVENTS = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'] as const

export function AppLayout({ title }: { title?: string }) {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const touchActivity = useAuthStore((s) => s.touchActivity)
  const lastActivityAt = useAuthStore((s) => s.lastActivityAt)

  useEffect(() => {
    const now = Date.now()
    if (lastActivityAt && now - lastActivityAt >= INACTIVITY_LIMIT_MS) {
      logout()
      navigate('/', { replace: true })
      return
    }
    if (!lastActivityAt) touchActivity()

    const markActivity = () => touchActivity()
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, markActivity, { passive: true }))

    const timeout = window.setTimeout(() => {
      logout()
      navigate('/', { replace: true })
    }, Math.max(0, INACTIVITY_LIMIT_MS - (now - (lastActivityAt || now))))

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, markActivity))
      window.clearTimeout(timeout)
    }
  }, [lastActivityAt, logout, navigate, touchActivity])

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Sidebar />
      <div className="min-w-0 lg:pl-64">
        <Header title={title || 'Dashboard'} />
        <main className="min-w-0 px-3 py-4 pb-24 sm:px-4 md:px-6 lg:pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
