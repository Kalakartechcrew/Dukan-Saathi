import { Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, BarChart3, Boxes, CreditCard, FileText, QrCode, ShieldCheck, ShoppingCart, Users } from 'lucide-react'
import heroImage from '@/assets/hero.png'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { SEO } from '@/components/seo/SEO'
import { PublicLayout } from '@/components/layout/PublicLayout'

const modules = [
  { icon: ShoppingCart, title: 'Fast POS', text: 'Create bills quickly with product search, stock checks, split payments, and credit handling.' },
  { icon: Boxes, title: 'Inventory', text: 'Track products, SKU details, stock movements, and low-stock signals across every shop workspace.' },
  { icon: FileText, title: 'Billing', text: 'Generate clean invoices, downloadable PDFs, and QR bill links customers can scan from their phone.' },
  { icon: Users, title: 'Customers', text: 'Keep customer profiles, purchase history, dues, payments, and loyalty context in one place.' },
  { icon: BarChart3, title: 'Reports', text: 'View sales, profit, expenses, and operational trends without leaving the dashboard.' },
  { icon: ShieldCheck, title: 'Secure Workspace', text: 'Keep shop data protected with owner controls, active sessions, and subscription-based access.' },
]

const workflow = [
  'Add products and stock',
  'Bill from POS',
  'Share PDF or QR',
  'Track dues and reports',
]

export function LandingPage() {
  const isAuth = useAuthStore((s) => s.isAuthenticated())
  if (isAuth) return <Navigate to="/dashboard" replace />

  return (
    <PublicLayout>
      <SEO 
        title="Smart Inventory & Billing Management Software"
        description="Dukan Saathi is the all-in-one shop management platform for modern retailers. Manage inventory, billing, POS, and customers with ease."
      />
      <section
        className="relative min-h-[70svh] overflow-hidden bg-slate-950 text-white"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(2, 6, 23, 0.94), rgba(15, 23, 42, 0.78), rgba(15, 118, 110, 0.32)), url(${heroImage})`,
          backgroundPosition: 'center right 8%',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'min(520px, 78vw)',
        }}
      >
        <div className="mx-auto flex max-w-7xl px-6 pb-14 pt-10 lg:px-8 lg:pb-16 lg:pt-18">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="max-w-3xl"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">Multi-tenant shop management</p>
            <h1 className="mt-5 max-w-2xl text-5xl font-black leading-[1.02] sm:text-6xl lg:text-7xl">Dukan Saathi</h1>
            <p className="mt-5 max-w-2xl text-xl leading-8 text-slate-200">
              A modern POS, inventory, billing, CRM, and reporting system for retail teams that need everyday operations to feel simple, fast, and reliable.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup">
                <Button size="lg" className="bg-emerald-500 text-slate-950 shadow-none hover:bg-emerald-400">
                  Start your shop <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="secondary" className="border-white/20 bg-white/10 text-white hover:bg-white/15">
                  Login
                </Button>
              </Link>
            </div>
            <div className="mt-10 grid max-w-2xl grid-cols-2 gap-3 text-sm text-slate-200 sm:grid-cols-4">
              {workflow.map((item, index) => (
                <div key={item} className="rounded-lg border border-white/10 bg-white/5 px-3 py-3">
                  <span className="text-emerald-300">0{index + 1}</span>
                  <p className="mt-1 font-medium">{item}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-6 py-12 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/50 md:grid-cols-3">
          <div className="flex items-start gap-3 p-3">
            <CreditCard className="mt-1 h-5 w-5 text-emerald-600" />
            <div>
              <h2 className="font-bold text-slate-900">Checkout-ready POS</h2>
              <p className="mt-1 text-sm text-slate-600">Bill faster, accept cash/card/UPI, and keep stock synchronized.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3">
            <QrCode className="mt-1 h-5 w-5 text-indigo-600" />
            <div>
              <h2 className="font-bold text-slate-900">Printerless bills</h2>
              <p className="mt-1 text-sm text-slate-600">Share invoices as PDFs or scan-ready QR links from the counter.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3">
            <BarChart3 className="mt-1 h-5 w-5 text-amber-600" />
            <div>
              <h2 className="font-bold text-slate-900">Useful business insight</h2>
              <p className="mt-1 text-sm text-slate-600">Understand sales, dues, customers, and expense patterns daily.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-20 pt-4 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Built for real shop work</p>
            <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">Everything a growing retail business needs in one workspace.</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modules.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <Icon className="h-6 w-6 text-slate-900" />
                <h3 className="mt-4 font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-900 px-6 py-14 text-white lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl font-black">Open your shop dashboard with less friction.</h2>
            <p className="mt-2 max-w-2xl text-slate-300">Create a workspace for your shop, configure products and taxes, then start billing from the POS.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/signup">
              <Button className="bg-emerald-500 text-slate-950 shadow-none hover:bg-emerald-400">Sign up</Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" className="border-white/20 bg-white/10 text-white hover:bg-white/15">Login</Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
