import { PublicLayout } from '@/components/layout/PublicLayout'
import { SEO } from '@/components/seo/SEO'
import { motion } from 'framer-motion'
import { 
  CreditCard, 
  Package, 
  FileText, 
  BarChart3, 
  Users, 
  ShieldCheck,
  Smartphone,
  Cloud
} from 'lucide-react'

export function FeaturesPage() {
  const features = [
    {
      name: 'Advanced POS System',
      description: 'Speed up your checkout process with our lightning-fast Point of Sale. Supports barcode scanning, multiple payment modes, and split payments.',
      icon: CreditCard,
      details: [
        'Quick bill generation in under 10 seconds',
        'Works offline with automatic cloud sync',
        'Digital & thermal printer support',
        'Customizable bill formats'
      ]
    },
    {
      name: 'Inventory Management',
      description: 'Real-time stock tracking across all your products. Get notified before you run out of stock and manage batches/expiry with ease.',
      icon: Package,
      details: [
        'Bulk product upload via Excel/CSV',
        'Low stock alerts & reorder reminders',
        'Batch, serial number & expiry tracking',
        'Multiple warehouse management'
      ]
    },
    {
      name: 'GST & Regular Billing',
      description: 'Generate GST-compliant invoices effortlessly. Our system automatically handles tax calculations and HSN/SAC codes.',
      icon: FileText,
      details: [
        'Automated GST/IGST/CGST/SGST',
        'GSTR-1, 3B ready reports',
        'Proforma invoices & Quotations',
        'Tax-inclusive & exclusive billing'
      ]
    },
    {
      name: 'Smart Reports & Insights',
      description: 'Understand your business better with 50+ detailed reports. Track sales, profits, expenses, and customer behavior.',
      icon: BarChart3,
      details: [
        'Daily sales & profit summary',
        'Top selling products analysis',
        'Expense tracking by category',
        'Custom date range reporting'
      ]
    },
    {
      name: 'Customer & Supplier Management',
      description: 'Maintain healthy relationships. Track customer purchase history, manage credit (udhaar), and handle supplier payments.',
      icon: Users,
      details: [
        'Customer loyalty points & rewards',
        'Digital Bahi-Khata for credit tracking',
        'WhatsApp payment reminders',
        'Supplier ledger management'
      ]
    },
    {
      name: 'Secure & Reliable Cloud',
      description: 'Your data is safe with enterprise-grade encryption. Access your business information anytime, anywhere, on any device.',
      icon: ShieldCheck,
      details: [
        'Bank-level data encryption',
        'Automatic daily backups',
        'Multi-user access with permissions',
        '99.9% uptime guarantee'
      ]
    }
  ]

  return (
    <PublicLayout>
      <SEO 
        title="Features - Complete Retail Management Toolkit" 
        description="Explore the powerful features of Dukan Saathi including POS, Inventory, GST Billing, Reports, and Customer Management. Everything your shop needs."
      />
      
      <div className="bg-slate-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-base font-semibold leading-7 text-emerald-600"
            >
              Power Your Business
            </motion.h1>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Everything you need to manage your shop like a pro
            </p>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              Stop using multiple apps and paper ledgers. Dukan Saathi brings all your retail operations into one unified, easy-to-use platform.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.name} className="flex flex-col bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <dt className="flex items-center gap-x-3 text-lg font-bold leading-7 text-slate-900">
                    <feature.icon className="h-6 w-6 flex-none text-emerald-600" aria-hidden="true" />
                    {feature.name}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                    <p className="flex-auto">{feature.description}</p>
                    <ul className="mt-6 space-y-2">
                      {feature.details.map((detail) => (
                        <li key={detail} className="flex items-start gap-x-2 text-sm text-slate-500">
                          <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-emerald-500" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Deep Dive Sections */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Detailed POS & Quick Billing</h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Our POS is designed for speed. In a busy retail environment, every second counts. With keyboard shortcuts, barcode support, and a search-optimized interface, you can serve customers faster than ever.
              </p>
              <div className="mt-10 space-y-4">
                <div className="flex gap-4">
                  <div className="flex-none rounded-lg bg-emerald-50 p-2 h-10 w-10 flex items-center justify-center">
                    <Smartphone className="text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Mobile POS</h3>
                    <p className="text-slate-600">Walk around your store and bill customers on the spot using your smartphone or tablet.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-none rounded-lg bg-emerald-50 p-2 h-10 w-10 flex items-center justify-center">
                    <Cloud className="text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Offline Capability</h3>
                    <p className="text-slate-600">Internet down? No problem. Continue billing offline and let the data sync automatically when you're back online.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-slate-100 rounded-3xl aspect-video flex items-center justify-center border-2 border-dashed border-slate-300">
              <span className="text-slate-400 font-medium">Interactive POS Preview Graphic</span>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
