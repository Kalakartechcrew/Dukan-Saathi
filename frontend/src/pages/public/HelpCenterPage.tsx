import { PublicLayout } from '@/components/layout/PublicLayout'
import { SEO } from '@/components/seo/SEO'
import { motion } from 'framer-motion'
import { Mail, MessageSquare, Phone, BookOpen, Search, PlayCircle, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function HelpCenterPage() {
  const categories = [
    { title: 'Getting Started', icon: PlayCircle, articles: 5 },
    { title: 'Billing & Invoices', icon: BookOpen, articles: 12 },
    { title: 'Inventory Management', icon: Search, articles: 8 },
    { title: 'Account Settings', icon: MessageSquare, articles: 4 },
  ]

  return (
    <PublicLayout>
      <SEO 
        title="Help Center - Support & Learning Resources" 
        description="Need help with Dukan Saathi? Browse our guides, watch tutorials, or contact our support team for any questions regarding your shop management."
      />
      
      {/* Hero Search */}
      <section className="bg-slate-900 py-24 text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-black tracking-tight sm:text-6xl"
          >
            How can we help?
          </motion.h1>
          <div className="mx-auto mt-10 max-w-xl">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <Input 
                placeholder="Search for articles (e.g. 'how to add GST')" 
                className="pl-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:bg-white focus:text-slate-900"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            
            {/* Self-Service Categories */}
            <div className="lg:col-span-2 space-y-12">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Browse by Category</h2>
                <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {categories.map((cat) => (
                    <div key={cat.title} className="group relative flex items-center gap-x-6 rounded-2xl border border-slate-200 p-6 hover:border-indigo-500 hover:shadow-sm transition-all cursor-pointer">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-50 group-hover:bg-indigo-50">
                        <cat.icon className="h-6 w-6 text-slate-600 group-hover:text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{cat.title}</h3>
                        <p className="text-sm text-slate-500">{cat.articles} articles</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900">Getting Started Guide</h2>
                <div className="mt-8 space-y-6">
                  <div className="rounded-2xl bg-indigo-50 p-8 border border-indigo-100">
                    <h3 className="text-lg font-bold text-indigo-900">Step 1: Setting up your shop</h3>
                    <p className="mt-2 text-indigo-800">Enter your business name, address, and GST number (if any) in the settings panel to customize your invoices.</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-8 border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">Step 2: Adding your products</h3>
                    <p className="mt-2 text-slate-600">Use our bulk upload feature to import your inventory from an Excel sheet, or add items one by one with barcode scanning.</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-8 border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">Step 3: Creating your first bill</h3>
                    <p className="mt-2 text-slate-600">Go to the POS screen, search for an item, and click 'Checkout'. It's that simple!</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Support Sidebar */}
            <div className="space-y-8">
              <div className="rounded-3xl bg-slate-900 p-8 text-white">
                <h2 className="text-xl font-bold">Contact Support</h2>
                <p className="mt-4 text-slate-400 text-sm">Our support team is available Monday to Saturday, 9 AM to 8 PM.</p>
                
                <div className="mt-8 space-y-4">
                  <a href="mailto:support@dukansaathi.shop" className="flex items-center gap-x-3 text-sm hover:text-indigo-400 transition-colors">
                    <Mail className="h-5 w-5" />
                    support@dukansaathi.shop
                  </a>
                  <a href="tel:+911234567890" className="flex items-center gap-x-3 text-sm hover:text-indigo-400 transition-colors">
                    <Phone className="h-5 w-5" />
                    +91 12345 67890
                  </a>
                  <div className="flex items-center gap-x-3 text-sm">
                    <MessageSquare className="h-5 w-5" />
                    Live Chat (Available in-app)
                  </div>
                </div>

                <Button className="mt-8 w-full bg-indigo-500 text-white hover:bg-indigo-400">
                  Open a Ticket
                </Button>
              </div>

              <div className="rounded-3xl border border-slate-200 p-8">
                <h2 className="text-xl font-bold text-slate-900">Join our Community</h2>
                <p className="mt-4 text-slate-600 text-sm">Get tips from other shopkeepers and stay updated on new features.</p>
                <div className="mt-6 flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer hover:bg-indigo-50 hover:text-indigo-600">
                    <Users className="h-5 w-5" />
                  </div>
                  {/* Add more social icons here */}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
