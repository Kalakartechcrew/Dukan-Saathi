import type { ReactNode } from 'react'
import { PublicHeader } from './PublicHeader'
import { PublicFooter } from './PublicFooter'

interface PublicLayoutProps {
  children: ReactNode
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicHeader />
      <main className="flex-grow">
        {children}
      </main>
      <PublicFooter />
    </div>
  )
}
