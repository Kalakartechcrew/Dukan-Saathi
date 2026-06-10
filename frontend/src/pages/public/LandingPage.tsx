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

  const faqs = [
    { q: "What is Dukan Saathi?", a: "Dukan Saathi is an all-in-one shop management software designed for modern retailers. It combines POS billing, inventory management, GST invoicing, and customer tracking into one easy-to-use platform." },
    { q: "Who should use Dukan Saathi?", a: "Our software is built for retail shop owners, grocery stores, pharmacies, electronic shops, garment stores, and any small to medium business that needs to track stock and sales." },
    { q: "Is Dukan Saathi GST-compliant?", a: "Yes, Dukan Saathi generates GST-ready invoices, tracks HSN codes, and provides reports that make GST filing easy for Indian businesses." },
    { q: "Does it work offline?", a: "The POS system is designed to handle temporary internet outages, allowing you to continue billing. Data syncs automatically once the connection is restored." },
    { q: "Can I use it on my mobile?", a: "Absolutely. Dukan Saathi is cloud-based and works perfectly on smartphones, tablets, and computers." },
    { q: "How do I share bills on WhatsApp?", a: "You can send professional PDF invoices directly to your customer's WhatsApp number with a single click, without even saving their contact." },
    { q: "Can I import my existing product data?", a: "Yes, you can easily bulk import your products from an Excel or CSV file in minutes." },
    { q: "Is my data secure?", a: "We use bank-level encryption and perform daily backups to ensure your business data is always safe and private." },
    { q: "Does it support barcode scanning?", a: "Yes, Dukan Saathi works with all standard USB and Bluetooth barcode scanners, as well as smartphone cameras." },
    { q: "Can I manage multiple shops?", a: "Yes, our Business plan allows you to manage multiple locations and view consolidated reports from a single dashboard." },
    { q: "How do low stock alerts work?", a: "You can set custom reorder levels for each product. The system will notify you when stock falls below those levels." },
    { q: "What kind of reports can I generate?", a: "You get 50+ reports including daily sales, profit/loss, expense tracking, stock value, and top-selling products." },
    { q: "Is there a free trial?", a: "Yes, we offer a 14-day free trial of our premium features. No credit card is required to sign up." },
    { q: "Can I track customer credit (Udhaar)?", a: "Yes, our integrated CRM tracks customer purchase history and outstanding balances with automated reminders." },
    { q: "What hardware do I need?", a: "Dukan Saathi runs on any device with a browser. It supports thermal receipt printers, laser printers, and barcode scanners." }
  ]

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a
      }
    }))
  }

  return (
    <PublicLayout>
      <SEO 
        title="Dukan Saathi | Inventory, Billing & Shop Management Software" 
        description="Manage inventory, billing, GST invoices, stock tracking and retail operations with Dukan Saathi. Built for modern shop owners and smart retailers."
        jsonLd={[faqSchema]}
      />

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
                    alt="Dukan Saathi Dashboard Preview"
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
              Stop juggling multiple apps. Dukan Saathi brings your inventory, POS, and customers into a single, beautiful dashboard.
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

      {/* SEO Content Section */}
      <section className="py-24 bg-white border-y border-slate-100">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Why Choose Dukan Saathi for Your Retail Business?</h2>
              <p className="text-slate-600 mb-4">
                Dukan Saathi is more than just billing software. It's a complete <strong>retail automation platform</strong> designed to give shopkeepers more time and better control over their business. From <strong>smart inventory management</strong> to <strong>instant WhatsApp billing</strong>, every feature is built with the Indian shop owner in mind.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-3 w-3 text-indigo-600" />
                  </div>
                  <span className="text-slate-700"><strong>GST Ready:</strong> Automate tax calculations and generate GST-compliant invoices effortlessly.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-3 w-3 text-indigo-600" />
                  </div>
                  <span className="text-slate-700"><strong>Stock Precision:</strong> Reduce losses with real-time stock tracking and low-stock alerts.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-3 w-3 text-indigo-600" />
                  </div>
                  <span className="text-slate-700"><strong>Customer Loyalty:</strong> Track customer history and manage credit (Udhaar) in one unified system.</span>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Built for Modern Smart Retailers</h2>
              <p className="text-slate-600 mb-4">
                Whether you run a <strong>grocery store (Kirana)</strong>, a <strong>pharmacy</strong>, or a <strong>garment showroom</strong>, Dukan Saathi adapts to your needs. Our cloud-based system ensures you can monitor your shop's performance from home or while traveling.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-indigo-600">50+ Reports</h4>
                  <p className="text-xs text-slate-500 mt-1">Detailed insights into sales, profit, and stock value.</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-indigo-600">Multi-User</h4>
                  <p className="text-xs text-slate-500 mt-1">Separate logins for staff with controlled permissions.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Frequently Asked Questions</h2>
            <p className="mt-4 text-slate-600">Find quick answers to common questions about Dukan Saathi.</p>
          </div>
          <div className="mx-auto max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {faqs.slice(0, 10).map((faq, i) => (
              <div key={i} className="flex flex-col">
                <dt className="font-bold text-slate-900 text-lg mb-2">{faq.q}</dt>
                <dd className="text-slate-600 leading-relaxed">{faq.a}</dd>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link to="/faq">
              <Button variant="ghost" className="text-indigo-600 font-bold hover:text-indigo-700">
                View All 50+ FAQs <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
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
