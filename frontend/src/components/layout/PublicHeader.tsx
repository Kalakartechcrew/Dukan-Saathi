import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function PublicHeader() {
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
      <Link to="/" className="flex items-center gap-3" aria-label="Dukan Saathi home">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500 text-lg font-black text-slate-950">S</span>
        <span className="text-xl font-bold text-slate-900">Dukan Saathi</span>
      </Link>
      <nav className="hidden md:flex items-center gap-8">
        <Link to="/features" className="text-sm font-semibold leading-6 text-slate-900 hover:text-emerald-600">Features</Link>
        <Link to="/pricing" className="text-sm font-semibold leading-6 text-slate-900 hover:text-emerald-600">Pricing</Link>
        <Link to="/blog" className="text-sm font-semibold leading-6 text-slate-900 hover:text-emerald-600">Blog</Link>
        <Link to="/faq" className="text-sm font-semibold leading-6 text-slate-900 hover:text-emerald-600">FAQ</Link>
      </nav>
      <div className="flex items-center gap-4">
        <Link to="/login">
          <Button variant="ghost" className="text-slate-900 hover:bg-slate-100">Login</Button>
        </Link>
        <Link to="/signup">
          <Button className="bg-emerald-600 text-white hover:bg-emerald-500">Sign up</Button>
        </Link>
      </div>
    </header>
  )
}
