import { PublicLayout } from '@/components/layout/PublicLayout'
import { SEO } from '@/components/seo/SEO'
import { motion } from 'framer-motion'
import { 
  ArrowRight, 
  BarChart3, 
  Package, 
  Receipt, 
  Smartphone, 
  Users, 
  ShieldCheck, 
  Zap,
  Globe,
  Clock,
  CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Link } from 'react-router-dom'

export function LandingPage() {
  const features = [
    {
      name: 'Smart POS Billing',
      description: 'Lightning fast billing with barcode support and multiple payment methods.',
      icon: Receipt,
      color: 'bg-indigo-500',
    },
    {
      name: 'Inventory Mastery',
      description: 'Automated stock tracking, low stock alerts, and bulk import/export.',
      icon: Package,
      color: 'bg-violet-500',
    },
    {
      name: 'Insightful Analytics',
      description: 'Visual reports on sales, profit, and customer trends to grow your business.',
      icon: BarChart3,
      color: 'bg-blue-500',
    },
    {
      name: 'WhatsApp Integrated',
      description: 'Share invoices and updates instantly via WhatsApp without saving contacts.',
      icon: Smartphone,
      color: 'bg-indigo-600',
    },
    {
      name: 'Customer CRM',
      description: 'Track customer credit, purchase history, and loyalty in one place.',
      icon: Users,
      color: 'bg-violet-600',
    },
    {
      name: 'Secure & Reliable',
      description: 'Cloud-synced data with enterprise-grade security and daily backups.',
      icon: ShieldCheck,
      color: 'bg-slate-700',
    },
  ]

  const stats = [
    { label: 'Live Shopkeepers', value: '1,000+', icon: Users },
    { label: 'Monthly Invoices', value: '250K+', icon: Zap },
    { label: 'Uptime', value: '99.9%', icon: Clock },
    { label: 'Countries', value: '5+', icon: Globe },
  ]

  return (
    <PublicLayout>
      <SEO title="Sathi — Smart POS & Inventory Management for Retail" />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 lg:pt-32 lg:pb-40">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-[10%] left-1/2 -z-10 h-[1000px] w-[1000px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.08)_0,transparent_70%)]" />
        </div>
        
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-4 py-1 text-sm font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                The future of retail management is here
              </span>
              <h1 className="mt-8 text-5xl font-extrabold tracking-tight text-slate-900 sm:text-7xl">
                Run your shop with <br />
                <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">effortless precision.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                The all-in-one POS, inventory, and billing software designed for modern Indian shopkeepers. 
                Fast, secure, and works on any device.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link to="/signup">
                  <Button size="lg" className="rounded-full bg-slate-900 px-8 py-6 text-lg font-bold transition-all hover:bg-slate-800 active:scale-95">
                    Start Your Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/features" className="text-sm font-bold leading-6 text-slate-900 hover:text-indigo-600">
                  See how it works <span aria-hidden="true">→</span>
                </Link>
              </div>
            </motion.div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-16 flow-root sm:mt-24"
          >
            <div className="mx-auto max-w-5xl">
              <div className="relative rounded-2xl bg-slate-900/5 p-2 ring-1 ring-inset ring-slate-900/10 lg:-m-4 lg:rounded-3xl lg:p-4">
                <div className="rounded-xl bg-white shadow-2xl ring-1 ring-slate-900/10 overflow-hidden">
                  <img
                    src="/ss2.png"
                    alt="Sathi Dashboard Preview"
                    className="w-full h-auto max-h-[640px] object-cover object-top"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust & Stats Section */}
      <section className="bg-slate-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-base font-semibold leading-7 text-indigo-600 uppercase tracking-wider">Trusted by Industry Leaders</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Powering 1,000+ smart retailers across India.
            </p>
          </div>
          
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, i) => (
              <motion.div 
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition-hover hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
                  <stat.icon className="h-6 w-6" />
                </div>
                <dt className="text-sm font-medium text-slate-500">{stat.label}</dt>
                <dd className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{stat.value}</dd>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 sm:py-32 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-indigo-600">Everything you need</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              One platform, endless possibilities.
            </p>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              Stop juggling multiple apps. Sathi brings your inventory, POS, and customers into a single, beautiful dashboard.
            </p>
          </div>
          
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {features.map((feature, i) => (
                <motion.div 
                  key={feature.name} 
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex flex-col"
                >
                  <dt className="flex items-center gap-x-3 text-lg font-bold leading-7 text-slate-900">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${feature.color} text-white shadow-lg`}>
                      <feature.icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    {feature.name}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                    <p className="flex-auto">{feature.description}</p>
                  </dd>
                </motion.div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Value Proposition / CTA */}
      <section className="relative isolate px-6 py-24 sm:py-32 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.indigo.100),white)] opacity-20" />
        <div className="mx-auto max-w-4xl rounded-4xl bg-slate-900 px-8 py-16 sm:px-16 sm:py-24 text-center shadow-2xl relative">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full" />
          <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-64 h-64 bg-violet-500/10 blur-3xl rounded-full" />
          
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Join 1,000+ smart shopkeepers today.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Start managing your inventory, tracking sales, and sharing invoices on WhatsApp in less than 5 minutes.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link to="/signup">
              <Button size="lg" className="rounded-full bg-white text-slate-900 hover:bg-slate-100 font-bold px-8">
                Get Started for Free
              </Button>
            </Link>
          </div>
          
          <div className="mt-12 flex items-center justify-center gap-8 border-t border-white/10 pt-10">
            {['No Credit Card', '7-Day Trial', 'Cancel Anytime'].map(item => (
              <div key={item} className="flex items-center text-slate-400 text-sm">
                <CheckCircle2 className="h-4 w-4 text-indigo-500 mr-2" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
