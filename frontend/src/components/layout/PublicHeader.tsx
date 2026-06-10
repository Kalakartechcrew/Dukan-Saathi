import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link to="/" className="flex items-center gap-3 shrink-0" aria-label="Dukan Saathi home">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-lg shadow-indigo-200">
            <span className="text-xl font-bold text-white">S</span>
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900">Dukan Saathi</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-x-10">
          <Link to="/features" className="text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600">Features</Link>
          <Link to="/pricing" className="text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600">Pricing</Link>
          <Link to="/blog" className="text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600">Blog</Link>
          <Link to="/faq" className="text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600">FAQ</Link>
        </nav>
        
        <div className="flex items-center gap-x-3">
          <Link to="/login" className="hidden sm:block">
            <Button variant="ghost" className="font-semibold text-slate-700 hover:bg-slate-100/80">Log in</Button>
          </Link>
          <Link to="/signup">
            <Button className="rounded-full bg-slate-900 px-6 font-semibold text-white transition-all hover:bg-slate-800 hover:shadow-lg active:scale-95 dark:bg-indigo-600 dark:hover:bg-indigo-500">
              Start Free
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
